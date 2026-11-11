"""cues.json + silent.mp4 -> nifi.mp4. Efeitos sintetizados: whoosh nas trocas de cena, ticks, blips, batidas e um fundo grave."""
import json, subprocess, wave
from pathlib import Path
import numpy as np

D = Path(__file__).parent
SR = 48000
cues = json.loads((D / "cues.json").read_text())
n = int(cues["total"] * SR)
out = np.zeros(n + SR)
rng = np.random.default_rng(7)


def add(t, s, gain):
    i = int(t * SR)
    out[i:i + len(s)] += s * gain


def env(length, attack, decay):
    x = np.arange(int(length * SR)) / SR
    return np.minimum(x / attack, 1) * np.exp(-np.maximum(x - attack, 0) / decay)


def whoosh():
    e = env(0.5, 0.12, 0.09)
    noise = rng.standard_normal(len(e))
    k = np.exp(-np.linspace(-2, 2, 96) ** 2)  # passa-baixa suave
    return np.convolve(noise, k / k.sum(), "same") * e


def tone(freq, length, decay, sweep=1.0):
    e = env(length, 0.002, decay)
    f = freq * np.linspace(1, sweep, len(e))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e


for t in cues["whoosh"]:
    add(max(t - 0.12, 0), whoosh(), 0.55)
for t in cues["tick"]:
    add(t, tone(2200, 0.05, 0.008), 0.10)
for t in cues["blip"]:
    add(t, tone(880, 0.12, 0.03, 1.5), 0.16)
for t in cues["thud"]:
    add(t, tone(110, 0.5, 0.12, 0.5), 0.6)

x = np.arange(len(out)) / SR
out += 0.035 * np.sin(2 * np.pi * 55 * x) * (1 + 0.3 * np.sin(2 * np.pi * 0.25 * x))  # fundo
out = out[:n]
out[-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))
out = np.tanh(out * 1.2) * 0.8

with wave.open(str(D / "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())

subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(D / "silent.mp4"), "-i", str(D / "sfx.wav"),
                "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(D / "nifi.mp4")], check=True)
print("nifi.mp4 pronto")
