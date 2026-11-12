"""extra_voice.py : the sigh and the friends' laughs (Kokoro, pt-BR) -> vo_extra/*.wav, used by sound_bar.py"""
import os
from kokoro_onnx import Kokoro
import soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); M = os.path.join(HERE, "..", "engine", "models")
k = Kokoro(os.path.join(M, "kokoro-v1.0.onnx"), os.path.join(M, "voices-v1.0.bin"))
os.makedirs(os.path.join(HERE, "vo_extra"), exist_ok=True)
for name, (txt, v, sp) in {
    "sigh": ("Aaaaaaaaaah...", "pm_alex", 0.6),
    "laugh_beto": ("Rá! Rá rá rá rá rá! Rá rá rá!", "pm_santa", 1.25),
    "laugh_carla": ("Ai! Rí rí rí rí rí! Ai, gente! Rí rí rí!", "pf_dora", 1.3),
    "laugh_ze": ("Rá rá rá rá! Descarga! Rá rá rá rá!", "pm_alex", 1.35),
    "laugh_beto2": ("Rá rá rá rá rá rá!", "pm_santa", 1.2),
}.items():
    a, sr = k.create(txt, voice=v, speed=sp, lang="pt-br"); sf.write(os.path.join(HERE, "vo_extra", name + ".wav"), a, sr); print(name)
