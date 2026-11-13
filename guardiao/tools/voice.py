"""Gera a dublagem pt-BR (Kokoro-82M, local) a partir de public/script.json.
uso: python tools/voice.py [pasta_dos_modelos]
saída: public/voice/<id>.mp3 + public/voice/manifest.json (duração real de cada fala, usada pelas legendas)
requer: pip install kokoro-onnx soundfile numpy ; ffmpeg no PATH
"""
import json, os, subprocess, sys, urllib.request
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "tools", "models")
URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
os.makedirs(MODELS, exist_ok=True)
for n in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
    p = os.path.join(MODELS, n)
    if not os.path.exists(p):
        print("baixando", n); urllib.request.urlretrieve(URL + n, p)
k = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
spec = json.load(open(os.path.join(ROOT, "public", "script.json"), encoding="utf-8"))
out = os.path.join(ROOT, "public", "voice"); os.makedirs(out, exist_ok=True)
manifest = {}
for ln in spec["lines"]:
    v = spec["voices"][ln["who"]]
    wav, sr = k.create(ln.get("say", ln["text"]), voice=v["kokoro"], speed=v["speed"], lang="pt-br")
    wav = np.asarray(wav, dtype=np.float32)
    loud = np.where(np.abs(wav) > 0.01)[0]                       # corta silêncio das pontas
    wav = wav[max(0, loud[0] - sr // 50): loud[-1] + sr // 10]
    tmp = os.path.join(out, ln["id"] + ".wav"); sf.write(tmp, wav, sr)
    pitch = v.get("pitch", 1.0)                                  # muda o timbre sem mudar a duração
    af = f"asetrate={sr}*{pitch},aresample=48000,atempo={1/pitch:.5f}"
    if ln.get("fx") == "whisper":
        af += ",highpass=f=300,treble=g=6:f=3500"
    af += ",loudnorm=I=-16:TP=-1.5:LRA=7"
    mp3 = os.path.join(out, ln["id"] + ".mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", af, "-ar", "48000", "-ac", "1", "-b:a", "128k", mp3], check=True)
    os.remove(tmp)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], capture_output=True, text=True).stdout)
    manifest[ln["id"]] = round(dur, 3)
    print(f'{ln["id"]:5s} {dur:5.2f}s  @{ln["at"]}  fim={ln["at"] + dur:5.2f}')
json.dump(manifest, open(os.path.join(out, "manifest.json"), "w"), indent=1)
