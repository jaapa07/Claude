"""voice.py N : dub episode N in Brazilian Portuguese.
Reads episodes/epN/cues.json (dumped from the page by `node tools/render.js N episodes/epN --cues`), speaks every line with
Kokoro-82M (local, free; PT-BR voices pf_dora, pm_alex, pm_santa), gives each character its own voice through an ffmpeg chain
(pitch, speed, robot/echo/phaser), and writes:
  episodes/epN/vo/<id>.wav      one file per line, 48 kHz mono, trimmed
  episodes/epN/timing.json      start, duration and a 50 Hz loudness envelope per line (drives lip-sync and captions)
  episodes/epN/tts_input.json   the exact text/voice/start of every line, for swapping in another TTS later
needs: pip install kokoro-onnx soundfile numpy ; model files in $KOKORO_DIR (kokoro-v1.0.onnx, voices-v1.0.bin)"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
SR = 48000
# who -> Kokoro voice, speed, pitch shift (semitones), ffmpeg effect chain
VOICES = {
    'juninho':   dict(voice='pm_alex',  speed=1.12, pitch=1.0,  fx=''),
    'cleide':    dict(voice='pf_dora',  speed=1.18, pitch=-1.0, fx='acompressor=threshold=-18dB:ratio=4,volume=1.4'),
    'controle':  dict(voice='pm_santa', speed=1.0,  pitch=-1.0, fx='flanger=delay=2:depth=2:speed=8,acrusher=bits=7:mode=log:aa=1,aecho=0.6:0.5:18:0.4'),
    'ze':        dict(voice='pm_santa', speed=.92,  pitch=-2.5, fx='lowpass=f=5200'),
    'coco':      dict(voice='pm_alex',  speed=1.15, pitch=6.0,  fx='aecho=0.7:0.4:30:0.25'),
    'cocozinho': dict(voice='pm_alex',  speed=1.25, pitch=10.0, fx=''),
    'cafe':      dict(voice='pf_dora',  speed=1.1,  pitch=-4.0, fx='vibrato=f=9:d=0.35'),
    'alien':     dict(voice='pm_santa', speed=1.0,  pitch=-5.0, fx='aphaser=type=t:speed=0.8,aecho=0.6:0.4:40:0.3'),
    'imperador': dict(voice='pm_alex',  speed=.95,  pitch=-7.0, fx='aecho=0.8:0.6:80|160:0.4|0.25,volume=1.3'),
    'coxinha':   dict(voice='pf_dora',  speed=1.12, pitch=3.0,  fx='aecho=0.6:0.4:60:0.3'),
    'voz':       dict(voice='pm_santa', speed=.85,  pitch=-9.0, fx='aecho=0.8:0.7:120|240:0.5|0.3,lowpass=f=3500'),
    'todos':     dict(voice='pm_alex',  speed=1.1,  pitch=0.0,  fx='chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3'),
}
KDIR = os.environ.get('KOKORO_DIR', os.path.join(ROOT, 'models'))

def spoken(text):
    """caption text -> what the TTS should say: shouting in caps would be spelled out letter by letter, so lower it"""
    s = text.replace('…', '...').replace('—', ', ')
    def low(m): return m.group(0).lower()
    s = re.sub(r"[A-ZÁÉÍÓÚÂÊÔÃÕÇÀ]{2,}", low, s)
    s = s[0].upper() + s[1:] if s else s
    return s

def ff(inp, out, chain):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', inp, '-af', chain, '-ac', '1', '-ar', str(SR), out], check=True)

def main():
    ep = sys.argv[1]; d = os.path.join(ROOT, 'episodes', f'ep{ep}')
    cues = json.load(open(os.path.join(d, 'cues.json'), encoding='utf-8'))
    os.makedirs(os.path.join(d, 'vo'), exist_ok=True)
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(KDIR, 'kokoro-v1.0.onnx'), os.path.join(KDIR, 'voices-v1.0.bin'))
    out, tts = [], []
    for ln in cues['lines']:
        v = {**VOICES.get(ln['who'], VOICES['juninho']), **ln.get('voice', {})}
        say = ln.get('say') or spoken(ln['text'])
        raw = os.path.join(d, 'vo', ln['id'] + '_raw.wav'); fin = os.path.join(d, 'vo', ln['id'] + '.wav')
        a, sr = k.create(say, voice=v['voice'], speed=float(v['speed']), lang='pt-br')
        sf.write(raw, a, sr)
        chain = []
        if v['pitch']: chain.append(f"rubberband=pitch={2 ** (v['pitch'] / 12):.4f}:formant=preserved" if abs(v['pitch']) < 4 else f"rubberband=pitch={2 ** (v['pitch'] / 12):.4f}")
        if v['fx']: chain.append(v['fx'])
        chain.append('silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.25')
        chain.append('loudnorm=I=-16:TP=-1.5:LRA=7')
        ff(raw, fin, ','.join(chain)); os.remove(raw)
        x, _ = sf.read(fin); x = x if x.ndim == 1 else x.mean(1)
        dur = len(x) / SR; hop = SR // 50
        env = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x), hop)])
        env = np.clip(env / (np.percentile(env, 95) + 1e-6), 0, 1)
        env = np.where(env < .12, 0, env)
        out.append({'id': ln['id'], 'who': ln['who'], 'start': ln['at'], 'dur': round(dur, 3), 'env': [round(float(e), 2) for e in env]})
        tts.append({'id': ln['id'], 'who': ln['who'], 'start': ln['at'], 'caption': ln['text'], 'say': say, **{kk: v[kk] for kk in ('voice', 'speed', 'pitch', 'fx')}})
        print(f"{ln['id']:>6} {ln['who']:>10} @{ln['at']:6.2f}s  {dur:4.2f}s  {ln['text'][:60]}")
    # overlap check: a line that runs into the next line of the same scene
    srt = sorted(out, key=lambda l: l['start'])
    for a_, b_ in zip(srt, srt[1:]):
        if a_['start'] + a_['dur'] > b_['start'] + .05:
            print(f"OVERLAP: {a_['id']} ends {a_['start'] + a_['dur']:.2f}s but {b_['id']} starts {b_['start']:.2f}s ({a_['start'] + a_['dur'] - b_['start']:.2f}s)")
    if srt and srt[-1]['start'] + srt[-1]['dur'] > cues['total']: print('LAST LINE RUNS PAST THE END')
    json.dump({'lines': out}, open(os.path.join(d, 'timing.json'), 'w', encoding='utf-8'))
    json.dump(tts, open(os.path.join(d, 'tts_input.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # subtitles (.srt) for platforms that take a separate file
    def ts(s): h, r = divmod(s, 3600); m, r = divmod(r, 60); return f"{int(h):02d}:{int(m):02d}:{int(r):02d},{int((r % 1) * 1000):03d}"
    with open(os.path.join(d, f'ep{ep}.srt'), 'w', encoding='utf-8') as f:
        names = {'juninho': 'JUNINHO', 'cleide': 'DONA CLEIDE', 'controle': 'CONTROLE', 'ze': 'ZÉ', 'coco': 'COCÔ', 'cocozinho': 'COCOZINHO', 'cafe': 'CAFÉ', 'alien': 'ZORGNAK', 'imperador': 'IMPERADOR', 'coxinha': 'COXINHA', 'voz': '???', 'todos': 'TODOS'}
        lines = {l['id']: l for l in cues['lines']}
        for i, l in enumerate(srt, 1): f.write(f"{i}\n{ts(l['start'])} --> {ts(l['start'] + l['dur'] + .2)}\n{names.get(l['who'], l['who'])}: {lines[l['id']]['text']}\n\n")
    print(f'timing -> {d}/timing.json ({len(out)} lines)')

main()
