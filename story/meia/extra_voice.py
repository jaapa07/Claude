"""extra_voice.py : Reny's sigh and the friends' laughs (Kokoro, pt-BR; Léo is pm_alex pitched down, like his lines) -> vo_extra/*.wav"""
import os, subprocess
from kokoro_onnx import Kokoro
import soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); M = os.path.join(HERE, "..", "engine", "models")
k = Kokoro(os.path.join(M, "kokoro-v1.0.onnx"), os.path.join(M, "voices-v1.0.bin"))
os.makedirs(os.path.join(HERE, "vo_extra"), exist_ok=True)
for name, (txt, v, sp, pitch) in {
    "sigh": ("Aaaaaaaaaah...", "pm_alex", 0.6, 1.0),
    "laugh_dudu": ("Rá! Rá rá rá rá rá! Rá rá rá!", "pm_santa", 1.25, 1.0),
    "laugh_dudu2": ("Rá rá rá rá rá rá! Ai, ai!", "pm_santa", 1.2, 1.0),
    "laugh_leo": ("Rá rá rá rá! Meia! Rá rá rá rá!", "pm_alex", 1.3, 0.84),
    "laugh_leo2": ("Rá rá rá rá rá!", "pm_alex", 1.2, 0.84),
}.items():
    a, sr = k.create(txt, voice=v, speed=sp, lang="pt-br"); p = os.path.join(HERE, "vo_extra", name + ".wav"); sf.write(p, a, sr)
    if pitch != 1.0: subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", p, "-af", f"asetrate={sr}*{pitch},aresample={sr},atempo={1 / pitch:.4f}", p + ".tmp.wav"], check=True); os.replace(p + ".tmp.wav", p)
    print(name)
