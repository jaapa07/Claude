"""tts_kokoro.py NARRATION AUDIO_DIR — Papermorph's tts.py with its Kokoro step done by kokoro-onnx (models from the
kokoro-onnx GitHub release, in tools/cavalo/models/), because this machine cannot reach HuggingFace or Edge.
Word times are estimated from the clip's real pauses, shared by syllables (Kokoro-onnx gives none); they are heard
times, so the cache gets "lag": 0 for mouths.py and join.py. Run with SKILL/scripts on PYTHONPATH."""
import asyncio, json, os, re, subprocess, sys
from pathlib import Path
import numpy as np
import tts

HERE = Path(__file__).resolve().parent
SR = 24000
_k = None

def kokoro():
    global _k
    if _k is None:
        from kokoro_onnx import Kokoro
        _k = Kokoro(str(HERE / "models/kokoro-v1.0.onnx"), str(HERE / "models/voices-v1.0.bin"))
    return _k

def estimate(text, x):
    """[(start, word)]: the voiced part split at its pauses (matched to punctuation), each piece shared by syllables."""
    a_ = np.abs(x.astype(np.float32)); hop = SR // 100
    env = np.array([a_[i:i + hop].mean() for i in range(0, len(a_) - hop, hop)])
    loud = env > max(250.0, env.max() * .06); idx = np.where(loud)[0]
    a, b = idx[0], idx[-1] + 1
    gaps, run = [], None
    for i in range(a, b):
        if not loud[i] and run is None: run = i
        if loud[i] and run is not None:
            if i - run >= 7: gaps.append((run, i))
            run = None
    ws = text.split()
    brk = [i for i, w in enumerate(ws[:-1]) if re.search(r"[.,;:!?]$", w)]
    syl = lambda w: max(1, len(re.findall(r"[aeiouáéíóúâêôãõàAEIOUÁÉÍÓÚÂÊÔÃÕ]+", w)))
    cum = np.cumsum([syl(w) for w in ws]); keep, use, last = [], [], a
    for i in brk:
        exp = a + (b - a) * cum[i] / cum[-1]
        cand = [g for g in gaps if g[0] > last and g not in use]
        if not cand: continue
        g = min(cand, key=lambda g: abs((g[0] + g[1]) / 2 - exp) - .3 * (g[1] - g[0]))
        if abs((g[0] + g[1]) / 2 - exp) > .3 * (b - a): continue
        keep.append(i); use.append(g); last = g[1]
    cuts = [-1] + keep + [len(ws) - 1]
    edges = [a] + [v for g in use for v in g] + [b]
    out = []
    for k in range(len(cuts) - 1):
        seg = ws[cuts[k] + 1:cuts[k + 1] + 1]; s0, s1 = edges[2 * k] / 100, edges[2 * k + 1] / 100
        wts = [syl(w) for w in seg]; tot = sum(wts); t = s0
        for w, n in zip(seg, wts):
            out.append((round(t, 3), w)); t += (s1 - s0) * n / tot
    return out

def kokoro_beat(text, voice, rate, mp3_path):
    """voice may carry a pitch factor, "pm_santa@0.86": the clip is synthesized at speed / f and played back f times
    faster (resampled), so its pitch moves by f while its speed stays the one the rate asks for."""
    speed = 1 + float(rate.rstrip("%")) / 100 if rate else 1
    name, _, pf = voice.partition("@"); f = float(pf) if pf else 1.0
    audio, sr = kokoro().create(text, voice=name, speed=max(.5, min(2.0, speed / f)), lang="pt-br")
    if f != 1.0:
        n = int(len(audio) / f); audio = np.interp(np.arange(n) * f, np.arange(len(audio)), audio).astype(np.float32)
    pad = np.zeros(int(.08 * sr), np.float32)
    audio = np.concatenate([pad, audio, pad])
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(sr), "-ac", "1", "-i", "-",
                    "-b:a", "96k", str(mp3_path)], input=pcm.tobytes(), check=True)
    return estimate(text, pcm)

tts.kokoro_beat = kokoro_beat
src, out = sys.argv[1:3]
asyncio.run(tts.main(src, out))
cache = Path(src).with_suffix(".timings.json")
c = json.loads(cache.read_text(encoding="utf-8"))
for v in c.values(): v["lag"] = 0
cache.write_text(json.dumps(c, indent=1), encoding="utf-8")
