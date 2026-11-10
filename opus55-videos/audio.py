"""Soundtrack + Brazilian-Portuguese narration for the five videos.

Everything is synthesised in numpy (music, effects) or spoken by espeak-ng with the MBROLA
Brazilian voices (apt: espeak-ng mbrola mbrola-br3 mbrola-br4). Timings follow each page's
own timeline; the dice game's hits/rolls/results come from out/<name>.events.json written by
render.js.

Usage: python3 audio.py <video-id> <events-dir> <out.wav>
"""
import json, os, subprocess, sys, tempfile, wave
import numpy as np
try:
    from scipy.signal import lfilter
except ImportError:  # falls back to a slow pure-python filter
    lfilter = None

SR = 44100
rng = np.random.default_rng(5)


def buf(sec):
    return np.zeros((int(sec * SR), 2))


def add(dst, sig, t, gain=1.0, pan=0.0):
    """Mix mono or stereo `sig` into `dst` at time t (seconds)."""
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    i = int(t * SR)
    if i >= len(dst):
        return
    n = min(len(sig), len(dst) - i)
    dst[i:i + n] += sig[:n] * gain


def tt(sec):
    return np.arange(int(sec * SR)) / SR


def env(sec, a=0.005, d=0.2):
    t = tt(sec)
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def lp(x, cutoff):
    """One-pole low-pass; cutoff may be a scalar or per-sample array."""
    if np.ndim(cutoff) == 0 and lfilter is not None:
        a = 1 - np.exp(-2 * np.pi * cutoff / SR)
        return lfilter([a], [1, a - 1], x)
    c = np.broadcast_to(np.asarray(cutoff, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s)
        y[i] = s
    return y


def noise(sec):
    return rng.uniform(-1, 1, int(sec * SR))


def hp(x, cutoff):
    return x - lp(x, cutoff)


# ---------- instruments ----------
def kick(g=1.0):
    t = tt(0.45)
    f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * g


def snare():
    t = tt(0.25)
    return (hp(noise(0.25), 1200) * 0.8 + np.sin(2 * np.pi * 190 * t) * 0.4) * np.exp(-t * 18)


def hat(open_=False):
    d = 0.18 if open_ else 0.05
    return hp(noise(d + 0.02), 7000) * env(d + 0.02, 0.001, d / 3) * 0.5


def saw(f, sec):
    t = tt(sec)
    ph = (f * t) % 1
    return 2 * ph - 1


def bass(f, sec):
    s = saw(f, sec) + 0.5 * saw(f * 1.005, sec)
    return lp(s, 380 + 900 * np.exp(-tt(sec) * 9)) * env(sec, 0.003, sec * 0.6)


def pad(freqs, sec, bright=900):
    t = tt(sec)
    s = sum(np.sin(2 * np.pi * f * t + i) + 0.4 * np.sin(2 * np.pi * f * 1.004 * t) + 0.25 * np.sin(2 * np.pi * f * 2.003 * t)
            for i, f in enumerate(freqs)) / len(freqs)
    a = np.minimum(1, t / (sec * 0.35)) * np.minimum(1, (sec - t) / (sec * 0.35))
    return s * a


def pluck(f, sec=0.6, d=0.18):
    t = tt(sec)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)) * env(sec, 0.002, d)


def bell(f, sec=1.5):
    t = tt(sec)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6)) * env(sec, 0.002, 0.5)


def whoosh(sec=0.6, up=True):
    t = tt(sec)
    k = t / sec if up else 1 - t / sec
    c = 300 + 5000 * k ** 2
    return lp(noise(sec), c) * np.sin(np.pi * t / sec) ** 2 * 0.9


def impact():
    t = tt(1.2)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 80 * np.exp(-t * 12)) / SR) * np.exp(-t * 3)
    return boom + lp(noise(1.2), 2500) * np.exp(-t * 10) * 0.6


def click():
    t = tt(0.04)
    return np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 180) * 0.6 + hp(noise(0.04), 3000) * np.exp(-t * 250) * 0.4


def squish(a=1.0, pitch=1.0):
    t = tt(0.32)
    f = (260 + 260 * np.exp(-t * 22)) * pitch
    wob = 1 + 0.12 * np.sin(2 * np.pi * 26 * t)
    body = np.sin(2 * np.pi * np.cumsum(f * wob) / SR) * np.exp(-t * 13)
    wet = lp(noise(0.32), 1500) * np.exp(-t * 30) * 0.5
    return (body + wet) * a


def drop_plop(pitch=1.0):
    t = tt(0.22)
    f = (500 + 900 * t / 0.22) * pitch
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(0.22, 0.002, 0.05)


def clink(f):
    t = tt(0.5)
    return (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f * 1.51 * t)) * env(0.5, 0.0005, 0.07)


def pour(sec):
    t = tt(sec)
    a = np.minimum(1, t / 0.15) * np.minimum(1, (sec - t) / 0.2)
    gurgle = 1 + 0.5 * np.sin(2 * np.pi * 7 * t + np.sin(2 * np.pi * 1.3 * t) * 3)
    return lp(hp(noise(sec), 400), 2600) * a * gurgle * 0.5


def rustle(sec):
    n = noise(sec)
    crackle = (rng.uniform(0, 1, len(n)) > 0.997) * rng.uniform(-1, 1, len(n))
    t = tt(sec)
    return (hp(lp(n, 5000), 1500) * 0.35 + lp(crackle, 4000) * 3) * np.sin(np.pi * t / sec)


def ocean(sec):
    t = tt(sec)
    b = lp(noise(sec), 350)
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 6.5) ** 2
    return b * swell * 3


def foghorn(sec=2.6, f=82):
    t = tt(sec)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (sec - t) / 0.5)
    return lp(saw(f, sec) + saw(f * 1.5, sec) * 0.4, 600) * a * 0.6


# ---------- narration ----------
def say(text, voice="mb-br3", speed=150, pitch=50):
    with tempfile.TemporaryDirectory() as d:
        raw, wav = os.path.join(d, "a.wav"), os.path.join(d, "b.wav")
        subprocess.run(["espeak-ng", "-v", voice, "-s", str(speed), "-p", str(pitch), "-w", raw, text], check=True, capture_output=True)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-ar", str(SR), "-ac", "1", wav], check=True)
        with wave.open(wav) as w:
            s = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    s = s / (np.abs(s).max() + 1e-9) * 0.9
    # a touch of warmth + short room
    s = lp(s, 7000)
    room = np.zeros(len(s) + int(0.09 * SR))
    room[:len(s)] += s
    room[int(0.045 * SR):int(0.045 * SR) + len(s)] += s * 0.12
    room[int(0.09 * SR):int(0.09 * SR) + len(s)] += s * 0.05
    return room


def narrate(dst, lines, voice="mb-br3", speed=150, gain=1.0, duck=None):
    for t, text in lines:
        v = say(text, voice, speed)
        add(dst, v, t, gain)
        if duck is not None:  # duck the music bed under the voice
            i0, i1 = int(t * SR), min(len(duck), int(t * SR) + len(v))
            ramp = np.ones(i1 - i0) * 0.45
            duck[i0:i1] = np.minimum(duck[i0:i1], ramp)


def note(n):  # MIDI -> Hz
    return 440 * 2 ** ((n - 69) / 12)


# ---------- per-video soundtracks ----------
def v01():
    D = 15; out = buf(D); mus = buf(D)
    B = 0.5
    # hook
    add(out, impact(), 0.0, 0.9)
    add(out, whoosh(0.5, False), 0.0, 0.3)
    prog = [45, 45, 41, 43]  # A A F G
    for b in range(2, 30):
        t = b * B
        if t >= 12.5:
            break
        add(mus, kick(), t, 0.9)
        if b % 2 == 1:
            add(mus, snare(), t, 0.45)
        for h in (0, 0.25):
            add(mus, hat(h == 0.25 and b % 4 == 3), t + h * 1, 0.25, 0.3)
        root = prog[(b // 4) % 4]
        add(mus, bass(note(root - 12), 0.45), t, 0.35)
        add(mus, bass(note(root - 12), 0.2), t + 0.25, 0.22)
        if b % 2 == 0:
            for k, iv in enumerate((0, 7, 12, 15)):
                add(mus, pluck(note(root + 12 + iv), 0.3, 0.07), t + k * 0.0625 * 2, 0.08, -0.4 + k * 0.25)
    # cuts: whoosh into each section + hit on the cut
    for c in (1, 4.5, 7.5, 10.5, 12.5):
        add(out, whoosh(0.45), c - 0.42, 0.35)
        add(out, impact(), c, 0.35)
    # tunnel riser
    add(out, whoosh(3.0), 7.5, 0.25)
    # outro: clean chord + bell
    add(mus, pad([note(57), note(61), note(64), note(69)], 2.6), 12.5, 0.35)
    add(out, bell(note(81)), 12.55, 0.25)
    add(out, bell(note(76)), 12.9, 0.18)
    return out + mus


def v02():
    D = 24; out = buf(D); mus = buf(D)
    # light bossa-ish bed: soft plucked chords, shaker
    chords = [[57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71]]
    beat = 0.6
    for b in range(int(D / beat)):
        t = b * beat
        ch = chords[(b // 4) % 4]
        if b % 2 == 0:
            add(mus, pluck(note(ch[0] - 12), 0.8, 0.25), t, 0.25)
        for k, n in enumerate(ch[1:]):
            if b % 4 in (1, 3):
                add(mus, pluck(note(n), 0.4, 0.09), t + k * 0.02, 0.07, 0.3)
        add(mus, hat(), t + 0.3, 0.08, -0.2)
    # effects tied to the steps on screen
    for i in range(8):
        add(out, rustle(0.12), 2.3 + i * 0.3 + 0.6, 0.25)
    for i in range(2):
        add(out, drop_plop(0.7), 5.5 + i * 0.8 + 0.55, 0.4)
    add(out, pour(2.2), 8.3, 0.6)
    for k in range(5):
        add(out, kick(0.5) * 0.6 + lp(noise(0.45), 900) * env(0.45, 0.001, 0.05), 11 + k * 0.5 + 0.25, 0.35)
    add(out, pour(2.4), 13.8, 0.65)
    for i in range(34):
        add(out, clink(2400 + (i * 397) % 1800), 16.7 + i * 0.05 + 0.45, 0.12, ((i * 37) % 11 - 5) / 6)
    add(out, pour(1.9), 19.3, 0.5)
    for i in range(60):  # fizz
        add(out, clink(4000 + (i * 911) % 3000) * 0.3, 19.6 + (i * 0.073) % 4.2, 0.08, ((i * 13) % 9 - 4) / 5)
    add(out, bell(note(84)), 22.4, 0.25)
    add(out, bell(note(88)), 22.6, 0.2)
    duck = np.ones(len(mus))
    narrate(out, [
        (0.25, "Como preparar um mojito."),
        (2.15, "Oito folhas de hortelã."),
        (5.1, "Dois gomos de limão."),
        (8.05, "Vinte mililitros de xarope."),
        (11.05, "Macere tudo, cinco vezes."),
        (13.6, "Cinquenta de rum branco."),
        (16.6, "Encha com gelo picado."),
        (19.1, "Complete com água com gás."),
        (22.1, "Pronto! Saúde!"),
    ], voice="mb-br4", speed=155, duck=duck)
    duck = lp(duck, 6)
    return out + mus * duck[:, None]


def v03():
    D = 16; out = buf(D); mus = buf(D)
    add(out, np.stack([ocean(D), ocean(D)], 1), 0, 0.35)
    # wind gusts
    add(out, lp(noise(D), 600) * (0.3 + 0.7 * np.sin(np.pi * tt(D) / 8) ** 4), 0, 0.25, 0.4)
    add(out, foghorn(), 0.6, 0.35, -0.3)
    add(out, foghorn(2.2, 73), 6.5, 0.25, 0.3)
    # traffic hum swelling as the camera reaches the deck (9–12.5 s)
    t = tt(D)
    near = np.clip(1 - np.abs(t - 10.8) / 2.4, 0, 1) ** 1.5
    hum = lp(saw(55, D) + saw(57.3, D) + noise(D) * 0.6, 420) * (0.15 + near)
    add(out, hum, 0, 0.18)
    for k in range(6):  # car pass-bys
        tp = 9.3 + k * 0.55
        add(out, whoosh(0.7) + whoosh(0.7, False), tp, 0.18, (-1) ** k * 0.6)
    # cinematic pad, D major-ish
    seq = [([50, 57, 62, 66], 0, 5.5), ([47, 54, 59, 62], 5, 5.5), ([43, 50, 55, 59], 10, 6)]
    for ch, s, d in seq:
        add(mus, pad([note(n) for n in ch], d), s, 0.22)
    add(mus, bell(note(74), 3), 12.6, 0.15)
    duck = np.ones(len(mus))
    narrate(out, [
        (0.9, "Uma ponte inteira, feita só com código."),
        (4.6, "Sem modelos, sem texturas. Só neblina e luz."),
        (12.7, "Mil duzentos e oitenta metros de vão central."),
    ], voice="mb-br3", speed=145, duck=duck)
    return out + mus * lp(duck, 6)[:, None]


def v04(events):
    D = 19; out = buf(D); mus = buf(D)
    # bouncy candy-pop loop
    beat = 60 / 112
    scale = [60, 62, 64, 67, 69, 72]
    for b in range(int(D / beat)):
        t = b * beat
        add(mus, kick(0.6), t, 0.35)
        if b % 2:
            add(mus, snare(), t, 0.15)
        add(mus, hat(), t + beat / 2, 0.12, 0.3)
        root = [48, 45, 41, 43][(b // 4) % 4]
        add(mus, bass(note(root), beat * 0.9), t, 0.18)
        if b % 2 == 0:
            add(mus, pluck(note(scale[(b * 3) % 6] + 12), 0.3, 0.08), t + beat / 2, 0.07, -0.3)
    for e in events:
        if e["type"] == "roll":
            add(out, click(), e["t"] - 0.12, 0.6)
            add(out, whoosh(0.5), e["t"] - 0.05, 0.45)
        elif e["type"] == "hit":
            add(out, squish(e["a"], 0.8 + 0.12 * e["i"]), e["t"], 0.55, (e["i"] - 2) / 3)
    duck = np.ones(len(mus))
    lines = []
    for e in events:
        if e["type"] == "result":
            add(out, bell(note(79)), e["t"], 0.25)
            add(out, bell(note(84)), e["t"] + 0.12, 0.2)
            lines.append((e["t"] + 0.25, f"{e['v']} pontos!"))
    narrate(out, [(0.3, "Dados de goma. Toque para rolar.")] + lines, voice="mb-br4", speed=160, duck=duck)
    return out + mus * lp(duck, 6)[:, None]


def v05():
    D = 16; out = buf(D); mus = buf(D)
    # music-box arpeggio over a warm drone
    add(mus, pad([note(45), note(52), note(57)], D), 0, 0.25)
    arp = [69, 72, 76, 79, 76, 72]
    arp2 = [69, 74, 77, 81, 77, 74]
    step = 0.32
    for i in range(int(D / step)):
        t = i * step
        a = arp if t < 9.6 else arp2
        add(mus, bell(note(a[i % 6]), 1.0) * 0.6, t, 0.12, np.sin(i) * 0.5)
    # paper sounds: layers being laid as the zoom deepens, the big tear at the transition
    for k in range(14):
        add(out, rustle(0.25), 2.8 + k * 0.5, 0.12, np.sin(k) * 0.6)
    add(out, rustle(2.0) * 1.6, 9.5, 0.55)
    add(out, whoosh(1.6), 9.4, 0.25)
    add(out, impact() * 0.5, 13.6, 0.25)
    duck = np.ones(len(mus))
    narrate(out, [
        (3.0, "Um fractal, recortado em papel."),
        (6.6, "Quanto mais perto, mais camadas."),
        (10.2, "Um rasgo, e chegamos ao conjunto de Julia."),
        (13.8, "Dobre. Corte. Repita."),
    ], voice="mb-br3", speed=140, duck=duck)
    return out + mus * lp(duck, 6)[:, None]


def master(x):
    # gentle limiter + fades
    x = np.tanh(x * 1.1) / np.tanh(1.1)
    x = x / max(1e-9, np.abs(x).max()) * 0.89
    n = len(x); f = int(0.03 * SR)
    x[:f] *= np.linspace(0, 1, f)[:, None]
    x[-int(0.4 * SR):] *= np.linspace(1, 0, int(0.4 * SR))[:, None]
    return x


if __name__ == "__main__":
    vid, evdir, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    if vid == "04":
        ev = json.load(open(os.path.join(evdir, "04-game-jelly-dice.events.json")))
        x = v04(ev)
    else:
        x = {"01": v01, "02": v02, "03": v03, "05": v05}[vid]()
    x = master(x)
    with wave.open(dst, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    print("wrote", dst, round(len(x) / SR, 2), "s")
