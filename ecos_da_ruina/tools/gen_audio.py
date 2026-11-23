#!/usr/bin/env python3
"""Sintetiza efeitos sonoros e trilhas originais (numpy). Saida: assets/audio/*.ogg"""
import os, subprocess, wave
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "assets", "audio")
os.makedirs(OUT, exist_ok=True)
SR = 22050
rng = np.random.default_rng(42)


def env(n, a=0.005, d=0.1, s=0.6, r=0.1):
    t = np.arange(n) / SR
    e = np.ones(n)
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    e[:a_n] = np.linspace(0, 1, max(a_n, 1))
    e[a_n:a_n + d_n] = np.linspace(1, s, max(d_n, 1))[: max(0, n - a_n)][: len(e[a_n:a_n + d_n])]
    e[a_n + d_n:] = s
    if r_n > 0 and n > r_n:
        e[-r_n:] *= np.linspace(1, 0, r_n)
    return e


def tone(f, dur, kind="square", vol=0.5, **kw):
    n = int(dur * SR)
    t = np.arange(n) / SR
    if np.isscalar(f):
        ph = 2 * np.pi * f * t
    else:
        ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == "square":
        w = np.sign(np.sin(ph))
    elif kind == "tri":
        w = 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1
    elif kind == "saw":
        w = 2 * ((ph / (2 * np.pi)) % 1) - 1
    elif kind == "noise":
        w = rng.uniform(-1, 1, n)
    else:
        w = np.sin(ph)
    return w * env(n, **kw) * vol


def sweep(f0, f1, dur, kind="square", vol=0.5, **kw):
    n = int(dur * SR)
    f = np.linspace(f0, f1, n)
    return tone(f, dur, kind, vol, **kw)


def write(name, data, sr=SR, ogg=True, q=3):
    data = np.clip(data, -1, 1)
    pcm = (data * 32767 * 0.9).astype(np.int16)
    wavp = os.path.join(OUT, name + ".wav")
    with wave.open(wavp, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wavp, "-c:a", "libvorbis", "-q:a", str(q), os.path.join(OUT, name + ".ogg")], check=True)
    os.remove(wavp)


def cat(*parts):
    return np.concatenate(parts)


def mix(*parts):
    n = max(len(p) for p in parts)
    o = np.zeros(n)
    for p in parts:
        o[: len(p)] += p
    return o


def sfx():
    write("swing", sweep(900, 250, 0.12, "noise", 0.35, a=0.005, d=0.05, s=0.2, r=0.05) * 0.8 + sweep(600, 200, 0.12, "tri", 0.2))
    write("hit", mix(tone(0, 0.09, "noise", 0.6, a=0.001, d=0.05, s=0.1, r=0.03), sweep(220, 60, 0.12, "square", 0.4)))
    write("hurt", mix(sweep(400, 120, 0.22, "saw", 0.5), tone(0, 0.15, "noise", 0.3)))
    write("dodge", sweep(300, 900, 0.14, "noise", 0.3, a=0.01, d=0.08, s=0.2, r=0.04))
    write("guard", mix(tone(1200, 0.08, "square", 0.3, a=0.001, d=0.05, s=0.1), tone(0, 0.06, "noise", 0.4)))
    write("guard_break", mix(sweep(500, 80, 0.3, "saw", 0.5), tone(0, 0.2, "noise", 0.5)))
    write("skill", cat(sweep(300, 700, 0.1, "tri", 0.5), sweep(700, 1000, 0.12, "sine", 0.5)))
    write("telegraph", cat(tone(660, 0.08, "square", 0.3), tone(0, 0.04, "sine", 0), tone(880, 0.1, "square", 0.3)))
    write("capture_start", sweep(300, 800, 0.35, "tri", 0.4))
    write("capture_ok", cat(tone(523, 0.1, "square", 0.4), tone(659, 0.1, "square", 0.4), tone(784, 0.1, "square", 0.4), tone(1047, 0.35, "square", 0.4, d=0.2, s=0.4, r=0.15)))
    write("capture_fail", cat(tone(392, 0.12, "square", 0.4), tone(330, 0.12, "square", 0.4), tone(262, 0.35, "square", 0.4, r=0.2)))
    write("seal_throw", sweep(500, 1200, 0.15, "sine", 0.4))
    write("levelup", cat(*[tone(f, 0.09, "square", 0.35) for f in (392, 494, 587, 784)], tone(988, 0.3, "square", 0.35, r=0.2)))
    write("evolve", cat(*[sweep(300 + i * 80, 600 + i * 120, 0.18, "tri", 0.4) for i in range(6)], tone(1175, 0.5, "square", 0.35, r=0.3)))
    write("pickup", cat(tone(880, 0.06, "square", 0.3), tone(1320, 0.1, "square", 0.3)))
    write("ui_move", tone(700, 0.04, "square", 0.2, a=0.001, d=0.02, s=0.3, r=0.01))
    write("ui_ok", cat(tone(660, 0.05, "square", 0.25), tone(990, 0.08, "square", 0.25)))
    write("ui_back", cat(tone(660, 0.05, "square", 0.25), tone(440, 0.08, "square", 0.25)))
    write("door", mix(sweep(120, 60, 0.4, "saw", 0.4), tone(0, 0.4, "noise", 0.15)))
    write("lever", cat(tone(300, 0.05, "square", 0.4), tone(200, 0.1, "square", 0.4)))
    write("puzzle_ok", cat(tone(523, 0.08, "tri", 0.45), tone(659, 0.08, "tri", 0.45), tone(784, 0.08, "tri", 0.45), tone(1047, 0.25, "tri", 0.45, r=0.15)))
    write("puzzle_no", cat(tone(220, 0.15, "saw", 0.3), tone(196, 0.2, "saw", 0.3)))
    write("boss_roar", mix(sweep(120, 50, 0.9, "saw", 0.55, a=0.05, d=0.2, s=0.7, r=0.3), tone(0, 0.9, "noise", 0.2, a=0.05, d=0.2, s=0.5, r=0.3)))
    write("boss_die", mix(sweep(300, 40, 1.4, "saw", 0.5, a=0.01, d=0.4, s=0.5, r=0.4), tone(0, 1.4, "noise", 0.3, a=0.01, d=0.6, s=0.3, r=0.5)))
    write("thud", mix(sweep(150, 40, 0.25, "sine", 0.7, a=0.001), tone(0, 0.15, "noise", 0.4, a=0.001, d=0.06, s=0.1, r=0.05)))
    write("roots", sweep(100, 400, 0.3, "noise", 0.3, a=0.02, d=0.1, s=0.5, r=0.1))
    write("death", cat(sweep(440, 110, 0.6, "saw", 0.4, r=0.3)))
    write("bridge", cat(*[tone(300 + i * 60, 0.07, "tri", 0.4) for i in range(6)]))
    write("heal", cat(tone(523, 0.1, "sine", 0.4), tone(659, 0.1, "sine", 0.4), tone(784, 0.2, "sine", 0.4, r=0.1)))


# ---------------- musica: sequenciador simples
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def nf(name):
    # ex.: "A3", "C#4", "Bb2"
    n = NOTE[name[0]]
    i = 1
    if name[i] == "#": n += 1; i += 1
    elif name[i] == "b": n -= 1; i += 1
    octv = int(name[i:])
    midi = 12 * (octv + 1) + n
    return 440.0 * 2 ** ((midi - 69) / 12)


def song(name, bpm, melody, bass, chords, lead="square", bass_kind="tri", loops=2, drums=False, melvol=0.22):
    beat = 60.0 / bpm
    total_beats = max(sum(d for _, d in melody), sum(d for _, d in bass))
    n = int(total_beats * beat * SR) + SR
    out = np.zeros(n)

    def place(seq, kind, vol, **kw):
        t = 0.0
        for note, d in seq:
            if note != "-":
                s = tone(nf(note), d * beat * 0.95, kind, vol, **kw)
                i = int(t * beat * SR)
                out[i:i + len(s)] += s[: len(out) - i]
            t += d
    place(melody, lead, melvol, a=0.01, d=0.08, s=0.55, r=0.05)
    place(bass, bass_kind, 0.3, a=0.01, d=0.1, s=0.7, r=0.05)
    # acordes arpejados suaves
    t = 0.0
    for chord, d in chords:
        steps = int(d * 2)
        for k in range(steps):
            note = chord[k % len(chord)]
            s = tone(nf(note), beat * 0.45, "sine", 0.1, a=0.01, d=0.05, s=0.5, r=0.05)
            i = int((t + k * 0.5) * beat * SR)
            out[i:i + len(s)] += s[: len(out) - i]
        t += d
    if drums:
        nb = int(total_beats)
        for b in range(nb):
            i = int(b * beat * SR)
            k = sweep(160, 50, 0.1, "sine", 0.4, a=0.001)
            out[i:i + len(k)] += k[: len(out) - i]
            if b % 2 == 1:
                h = tone(0, 0.08, "noise", 0.25, a=0.001, d=0.04, s=0.1, r=0.02)
                out[i:i + len(h)] += h[: len(out) - i]
            h2 = tone(0, 0.03, "noise", 0.1, a=0.001, d=0.02, s=0.1, r=0.01)
            j = i + int(beat * SR / 2)
            out[j:j + len(h2)] += h2[: len(out) - j]
    length = int(total_beats * beat * SR)
    out = out[:length]
    out = out / max(1e-6, np.max(np.abs(out))) * 0.8
    write(name, out)


def music():
    # Vila Lumen: calorosa, maior
    mel = [("E4", 1), ("G4", 1), ("A4", 2), ("G4", 1), ("E4", 1), ("D4", 2),
           ("C4", 1), ("E4", 1), ("G4", 2), ("A4", 1), ("G4", 1), ("E4", 2),
           ("F4", 1), ("A4", 1), ("C5", 2), ("B4", 1), ("A4", 1), ("G4", 2),
           ("E4", 1), ("D4", 1), ("C4", 1), ("D4", 1), ("E4", 4)]
    bas = [("C2", 4), ("G2", 4), ("A2", 4), ("E2", 4), ("F2", 4), ("C2", 4), ("G2", 4), ("C2", 4)]
    ch = [(["C3", "E3", "G3"], 8), (["A2", "C3", "E3"], 8), (["F2", "A2", "C3"], 8), (["G2", "B2", "D3"], 4), (["C3", "E3", "G3"], 4)]
    song("music_vila", 96, mel, bas, ch, "tri", "tri", melvol=0.3)
    # Floresta: misteriosa, menor suave
    mel = [("A3", 2), ("C4", 1), ("E4", 1), ("D4", 2), ("C4", 2), ("B3", 2), ("A3", 1), ("E3", 1), ("A3", 4),
           ("F3", 2), ("A3", 1), ("C4", 1), ("B3", 2), ("G3", 2), ("E3", 2), ("G3", 1), ("B3", 1), ("A3", 4)]
    bas = [("A2", 4), ("A2", 4), ("F2", 4), ("G2", 4), ("A2", 4), ("A2", 4), ("F2", 4), ("E2", 4)]
    ch = [(["A2", "C3", "E3"], 8), (["F2", "A2", "C3"], 4), (["G2", "B2", "D3"], 4), (["A2", "C3", "E3"], 8), (["F2", "A2", "C3"], 4), (["E2", "G#2", "B2"], 4)]
    song("music_floresta", 84, mel, bas, ch, "square", "tri", melvol=0.16)
    # Santuario: sombrio, lento
    mel = [("D4", 3), ("F4", 1), ("E4", 2), ("A3", 2), ("D4", 3), ("C4", 1), ("A3", 4),
           ("Bb3", 3), ("D4", 1), ("C4", 2), ("F3", 2), ("A3", 2), ("C4", 2), ("D4", 4)]
    bas = [("D2", 8), ("D2", 8), ("Bb1", 8), ("A1", 8)]
    ch = [(["D3", "F3", "A3"], 8), (["D3", "F3", "A3"], 8), (["Bb2", "D3", "F3"], 8), (["A2", "C#3", "E3"], 8)]
    song("music_santuario", 72, mel, bas, ch, "tri", "saw", melvol=0.25)
    # Chefao: urgente
    mel = [("E4", 1), ("E4", 1), ("G4", 1), ("E4", 1), ("B4", 2), ("A4", 1), ("G4", 1),
           ("E4", 1), ("E4", 1), ("G4", 1), ("E4", 1), ("D5", 2), ("B4", 1), ("A4", 1),
           ("C5", 1), ("C5", 1), ("B4", 1), ("A4", 1), ("G4", 2), ("A4", 1), ("B4", 1),
           ("E4", 2), ("G4", 1), ("A4", 1), ("B4", 4)]
    bas = [("E2", 1), ("E2", 1), ("E3", 1), ("E2", 1)] * 2 + [("C2", 1), ("C2", 1), ("C3", 1), ("C2", 1)] * 2 + [("A1", 1), ("A1", 1), ("A2", 1), ("A1", 1)] * 2 + [("E2", 1), ("E2", 1), ("E3", 1), ("E2", 1)] * 2
    ch = [(["E3", "G3", "B3"], 8), (["C3", "E3", "G3"], 8), (["A2", "C3", "E3"], 8), (["E3", "G3", "B3"], 8)]
    song("music_chefao", 150, mel, bas, ch, "square", "saw", drums=True, melvol=0.2)
    # Titulo
    mel = [("A3", 2), ("E4", 2), ("C5", 3), ("B4", 1), ("A4", 2), ("E4", 2), ("F4", 3), ("E4", 1),
           ("D4", 2), ("F4", 2), ("A4", 3), ("G4", 1), ("E4", 8)]
    bas = [("A2", 8), ("F2", 8), ("D2", 8), ("E2", 8)]
    ch = [(["A2", "C3", "E3"], 8), (["F2", "A2", "C3"], 8), (["D3", "F3", "A3"], 8), (["E3", "G#3", "B3"], 8)]
    song("music_titulo", 80, mel, bas, ch, "tri", "tri", melvol=0.3)


# ================================================================ TRILHAS DINAMICAS (v2)
# Motor um pouco mais rico que o sequenciador acima: instrumentos aditivos (sem aliasing),
# envelopes ADSR, filtros por FFT, bateria leve, eco sincronizado e sala por convolucao.
# Loops: tudo que passa do fim volta para o inicio (cauda dobrada) e o reverb/eco sao circulares,
# entao a emenda do loop fica sem clique. Todas as melodias e harmonias abaixo sao autorais.
trng = np.random.default_rng(7)


def _tt(n):
    return np.arange(n) / SR


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.1):
    dur = n / SR
    a = min(a, dur * 0.5)
    r = min(r, max(0.0, dur - a))
    d = min(d, max(0.0, dur - a - r))
    xs = [0.0, a, a + d, max(a + d, dur - r), dur]
    ys = [0.0, 1.0, s, s, 0.0]
    return np.interp(_tt(n), xs, ys)


def _spec_filter(x, H):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1.0 / SR)
    return np.fft.irfft(X * H(f), len(x))


def lowpass(x, fc, order=2):
    return _spec_filter(x, lambda f: 1.0 / np.sqrt(1.0 + (f / fc) ** (2 * order)))


def highpass(x, fc, order=2):
    return _spec_filter(x, lambda f: 1.0 / np.sqrt(1.0 + (fc / np.maximum(f, 1e-3)) ** (2 * order)))


def bandpass(x, fc, q=2.0):
    return _spec_filter(x, lambda f: 1.0 / np.sqrt(1.0 + (q * (f / fc - fc / np.maximum(f, 1e-3))) ** 2))


def _phase(f, n, vib=0.0, vib_rate=5.0, vib_delay=0.15):
    t = _tt(n)
    fr = np.full(n, float(f))
    if vib > 0:
        depth = np.clip((t - vib_delay) / 0.3, 0, 1) * vib
        fr = fr * (1.0 + depth * np.sin(2 * np.pi * vib_rate * t))
    return 2 * np.pi * np.cumsum(fr) / SR


def additive(f, n, amps, vib=0.0, detune=0.0, vib_rate=5.0):
    ph = _phase(f * (1.0 + detune), n, vib, vib_rate)
    o = np.zeros(n)
    for k, a in enumerate(amps, 1):
        if a == 0 or f * k > SR * 0.45:
            continue
        o += a * np.sin(k * ph)
    return o


def saw_amps(k=24):
    return [1.0 / i for i in range(1, k + 1)]


def sq_amps(k=24):
    return [(1.0 / i if i % 2 else 0.0) for i in range(1, k + 1)]


# ---------------------------------------------------------------- instrumentos
def i_pluck(f, dur, bright=1.0):
    """harpa/violao: parciais que decaem mais rapido quanto mais agudos"""
    n = int((dur + 0.6) * SR)
    t = _tt(n)
    o = np.zeros(n)
    for k in range(1, 13):
        if f * k > SR * 0.45:
            break
        o += (1.0 / k ** 1.3) * np.sin(2 * np.pi * f * k * t + k) * np.exp(-t * (1.2 + k * 0.9 / bright))
    return o * adsr(n, 0.003, 0.05, 1.0, 0.05)


def i_bell(f, dur, decay=1.6):
    """celesta/sino: parciais levemente inarmonicos"""
    n = int((dur + decay) * SR)
    t = _tt(n)
    o = np.zeros(n)
    for ratio, a, dk in ((1.0, 1.0, 1.0), (2.0, 0.45, 1.8), (3.01, 0.22, 2.6), (4.17, 0.12, 3.5), (5.43, 0.07, 4.5)):
        if f * ratio < SR * 0.45:
            o += a * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * dk / decay * 2.2)
    return o * adsr(n, 0.002, 0.02, 1.0, 0.05)


def i_piano(f, dur):
    """piano suave (aditivo com martelo leve e decaimento duplo)"""
    n = int((dur + 1.2) * SR)
    t = _tt(n)
    o = np.zeros(n)
    for k in range(1, 9):
        if f * k * 1.0005 > SR * 0.45:
            break
        fk = f * k * (1 + 0.0004 * k * k)
        o += (0.9 / k ** 1.6) * np.sin(2 * np.pi * fk * t) * (0.6 * np.exp(-t * (2.5 + k)) + 0.4 * np.exp(-t * (0.5 + 0.2 * k)))
    rel = np.ones(n)
    m = int(dur * SR)
    if m < n:
        rel[m:] = np.exp(-_tt(n - m) * 7.0)
    return o * rel * adsr(n, 0.004, 0.03, 1.0, 0.02)


def i_strings(f, dur, bright=2400.0, att=0.25, vib=0.004, trem=0.0):
    n = int((dur + 0.35) * SR)
    o = sum(additive(f, n, saw_amps(20), vib=vib, detune=dt, vib_rate=5.2 + dt * 300) for dt in (-0.004, 0.0, 0.0045))
    o = lowpass(o, bright)
    if trem > 0:
        o *= 1.0 - 0.5 * (1 + np.sin(2 * np.pi * trem * _tt(n))) * 0.6
    return o * adsr(n, att, 0.2, 0.85, 0.35) * 0.45


def i_pad(f, dur, cutoff=900.0, att=0.7):
    n = int((dur + 0.8) * SR)
    o = sum(additive(f, n, saw_amps(14), detune=dt) for dt in (-0.006, 0.0, 0.006))
    return lowpass(o, cutoff) * adsr(n, att, 0.4, 0.8, 0.8) * 0.4


def i_flute(f, dur, vib=0.006):
    n = int((dur + 0.15) * SR)
    o = additive(f, n, [1.0, 0.28, 0.1, 0.04], vib=vib, vib_rate=5.0)
    breath = highpass(trng.uniform(-1, 1, n), 2500) * 0.035
    return (o + breath) * adsr(n, 0.06, 0.1, 0.8, 0.12)


def i_brass(f, dur, cutoff=1800.0):
    n = int((dur + 0.2) * SR)
    t = _tt(n)
    scoop = 1.0 - 0.02 * np.exp(-t * 30)  # leve "subida" de ataque
    ph = 2 * np.pi * np.cumsum(np.full(n, f) * scoop) / SR
    o = np.zeros(n)
    for k in range(1, 22):
        if f * k > SR * 0.45:
            break
        o += np.sin(k * ph) / k
    return lowpass(o, cutoff) * adsr(n, 0.035, 0.12, 0.75, 0.15)


def i_lead(f, dur, cutoff=3200.0):
    n = int((dur + 0.08) * SR)
    o = additive(f, n, sq_amps(15), vib=0.005, vib_rate=6.0)
    return lowpass(o, cutoff) * adsr(n, 0.008, 0.08, 0.6, 0.06) * 0.6


def i_bass(f, dur, bite=0.3):
    n = int((dur + 0.08) * SR)
    o = additive(f, n, [1.0, bite, bite * 0.5, bite * 0.2])
    return o * adsr(n, 0.006, 0.12, 0.7, 0.06)


def i_choir(f, dur, att=0.5):
    """coro "ah": harmonicos pesados por formantes"""
    n = int((dur + 0.5) * SR)
    amps = []
    for k in range(1, 30):
        fk = f * k
        w = sum(g * np.exp(-((fk - fo) / bw) ** 2) for fo, g, bw in ((750, 1.0, 160), (1150, 0.6, 200), (2600, 0.25, 300)))
        amps.append(w / k ** 0.3 + 0.02 / k)
    o = sum(additive(f, n, amps, vib=0.005, detune=dt, vib_rate=4.6 + dt * 200) for dt in (-0.005, 0.0, 0.005))
    return o * adsr(n, att, 0.3, 0.85, 0.5) * 0.4


def i_glass(f, dur):
    """harmonico vitreo para o suspense"""
    n = int((dur + 0.6) * SR)
    o = additive(f, n, [1.0, 0.0, 0.08], vib=0.003, vib_rate=3.0)
    return o * adsr(n, dur * 0.45, 0.1, 0.9, 0.6)


# ---------------------------------------------------------------- percussao
def d_kick(vol=1.0, low=48.0):
    n = int(0.35 * SR)
    t = _tt(n)
    f = low + 90 * np.exp(-t * 28)
    o = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    o += highpass(trng.uniform(-1, 1, n), 2000) * np.exp(-t * 200) * 0.3
    return o * vol


def d_snare(vol=1.0):
    n = int(0.25 * SR)
    t = _tt(n)
    nz = bandpass(trng.uniform(-1, 1, n), 3000, 0.7) * np.exp(-t * 18)
    tn = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (nz * 0.9 + tn * 0.6) * vol


def d_hat(vol=1.0, open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    t = _tt(n)
    return highpass(trng.uniform(-1, 1, n), 7000) * np.exp(-t * (14 if open_ else 80)) * vol


def d_shaker(vol=1.0):
    n = int(0.07 * SR)
    return bandpass(trng.uniform(-1, 1, n), 5500, 1.5) * adsr(n, 0.015, 0.02, 0.4, 0.03) * vol


def d_clap(vol=1.0):
    n = int(0.2 * SR)
    t = _tt(n)
    e = np.zeros(n)
    for k, off in enumerate((0.0, 0.011, 0.022)):
        i = int(off * SR)
        e[i:] += np.exp(-(t[: n - i]) * (90 if k < 2 else 20))
    return bandpass(trng.uniform(-1, 1, n), 1300, 1.0) * e * vol


def d_tom(vol=1.0, f0=110.0):
    n = int(0.6 * SR)
    t = _tt(n)
    f = f0 * (1 + 0.5 * np.exp(-t * 18))
    o = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.5)
    o += bandpass(trng.uniform(-1, 1, n), 600, 1.0) * np.exp(-t * 30) * 0.2
    return o * vol


def d_timpani(f=73.4, vol=1.0, dec=1.4):
    n = int((dec + 0.3) * SR)
    t = _tt(n)
    o = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * (1.6 + r) / dec) for r, a in ((1.0, 1.0), (1.5, 0.5), (1.99, 0.3), (2.44, 0.15)))
    o += lowpass(trng.uniform(-1, 1, n), 400) * np.exp(-t * 25) * 0.5
    return o * vol


def d_anvil(vol=1.0, f=820.0):
    """bigorna: parciais inarmonicos de metal"""
    n = int(1.4 * SR)
    t = _tt(n)
    o = np.zeros(n)
    for r, a, dk in ((1.0, 1.0, 3.0), (2.76, 0.6, 4.0), (5.40, 0.35, 6.0), (8.93, 0.2, 9.0)):
        if f * r < SR * 0.45:
            o += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dk)
    o += highpass(trng.uniform(-1, 1, n), 3000) * np.exp(-t * 120) * 0.6
    return o * vol * 0.6


def d_heart(vol=1.0):
    """batida dupla de coracao (lub-dub)"""
    n = int(0.6 * SR)
    t = _tt(n)
    o = np.zeros(n)
    for off, a in ((0.0, 1.0), (0.22, 0.7)):
        i = int(off * SR)
        tt = t[: n - i]
        o[i:] += a * np.sin(2 * np.pi * (45 + 25 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 16)
    return lowpass(o, 300) * vol


def d_crackle(n_ev, length, vol=0.15):
    """estalos de lareira espalhados"""
    o = np.zeros(length)
    for _ in range(n_ev):
        i = int(trng.uniform(0, length - 2000))
        m = int(trng.uniform(80, 400))
        o[i:i + m] += highpass(trng.uniform(-1, 1, m), 2500) * np.exp(-_tt(m) * 400) * trng.uniform(0.3, 1.0)
    return o * vol


# ---------------------------------------------------------------- partitura
class Score:
    """Linha do tempo em tempos (beats). Cada nota vai para o bus seco e, opcionalmente, para sala e eco."""

    def __init__(self, bpm, beats, loop=True, tail=2.5):
        self.bpm, self.spb, self.loop = bpm, 60.0 / bpm, loop
        self.N = int(round(beats * self.spb * SR))
        self.T = int(tail * SR)
        self.dry = np.zeros(self.N + self.T + 4 * SR)
        self.rev = np.zeros_like(self.dry)
        self.ech = np.zeros_like(self.dry)

    def put(self, sig, beat, g=1.0, rev=0.25, echo=0.0):
        i = int(round(beat * self.spb * SR))
        sig = sig[: len(self.dry) - i]
        self.dry[i:i + len(sig)] += sig * g
        if rev:
            self.rev[i:i + len(sig)] += sig * g * rev
        if echo:
            self.ech[i:i + len(sig)] += sig * g * echo

    def seq(self, inst, notes, start=0.0, g=1.0, rev=0.25, echo=0.0, legato=0.95, octave=0, **kw):
        """notes: [(nome | [acorde] | "-", tempos)]"""
        b = start
        for note, d in notes:
            if note != "-":
                names = note if isinstance(note, (list, tuple)) else [note]
                for nm in names:
                    f = nf(nm) * (2 ** octave)
                    self.put(inst(f, d * self.spb * legato, **kw), b, g / max(1, len(names) ** 0.5), rev, echo)
            b += d
        return b

    def drums(self, pattern, inst, bars, start_bar=0, beats_per_bar=4, g=1.0, rev=0.1, echo=0.0, swing=0.0, every=1, skip=(), **kw):
        """pattern: string de passos por compasso ("x" forte, "o" fraco, "." nada)"""
        steps = len(pattern)
        for bar in range(start_bar, start_bar + bars):
            if (bar - start_bar) % every or bar in skip:
                continue
            for s, c in enumerate(pattern):
                if c == ".":
                    continue
                pos = bar * beats_per_bar + s * beats_per_bar / steps
                if swing and s % 2 == 1:
                    pos += swing * beats_per_bar / steps
                self.put(inst(**kw), pos, g * (1.0 if c == "x" else 0.45), rev, echo)

    def _fold(self, x):
        if not self.loop:
            return x
        y = x[: self.N].copy()
        rest = x[self.N:]
        for k in range(0, len(rest), self.N):
            seg = rest[k:k + self.N]
            y[: len(seg)] += seg
        return y

    def render(self, name, room=1.6, room_mix=0.35, echo_beats=0.75, echo_fb=0.38, echo_taps=4, rms=0.13, q=2, fade_out=1.2):
        dry, rv, ec = self._fold(self.dry), self._fold(self.rev), self._fold(self.ech)
        L = len(dry)
        # eco: copias atrasadas e cada vez mais escuras (circular no loop)
        D = int(round(echo_beats * self.spb * SR))
        wet_e = np.zeros(L)
        tap = ec
        for k in range(1, echo_taps + 1):
            tap = lowpass(tap, 3500)
            if self.loop:
                wet_e += np.roll(tap, k * D) * echo_fb ** k
            elif k * D < L:
                wet_e[k * D:] += tap[: L - k * D] * echo_fb ** k
        # sala: resposta ao impulso de ruido decaindo (convolucao por FFT; circular no loop)
        m = int(room * SR)
        ir = trng.uniform(-1, 1, m) * np.exp(-_tt(m) * 6.9 / room)
        ir = lowpass(ir, 4200)
        ir[: int(0.012 * SR)] = 0.0  # pre-delay
        ir /= np.sqrt(np.sum(ir ** 2))
        src = rv + wet_e * 0.5
        if self.loop:
            size = L
            wet_r = np.fft.irfft(np.fft.rfft(src, size) * np.fft.rfft(ir, size), size)
        else:
            size = L + m
            wet_r = np.fft.irfft(np.fft.rfft(src, size) * np.fft.rfft(ir, size), size)[:L]
        out = dry + wet_e + wet_r * room_mix * 4.0
        out -= np.mean(out)
        if not self.loop:
            nz = np.nonzero(np.abs(out) > np.max(np.abs(out)) * 0.006)[0]
            end = min(L, (nz[-1] + 1) if len(nz) else L)
            out = out[:end]
            fo = min(len(out), int(fade_out * SR))
            out[-fo:] *= np.linspace(1, 0, fo) ** 2
        out *= rms / max(1e-9, np.sqrt(np.mean(out ** 2)))
        out = np.tanh(out * 1.1) / np.tanh(1.1)  # limitador suave
        write(name, out * 0.98, q=q)
        return len(out) / SR


def bar_chords(prog, beats_per_bar=4):
    """[(acorde, compassos)] -> [(acorde, tempos)]"""
    return [(c, n * beats_per_bar) for c, n in prog]


def arp(prog, pattern, step, beats_per_bar=4):
    """arpejo: para cada acorde de [(notas, compassos)], percorre os indices de pattern (passo em tempos)"""
    out = []
    for chord, bars in prog:
        n = int(round(bars * beats_per_bar / step))
        for k in range(n):
            idx = pattern[k % len(pattern)]
            if idx is None:
                out.append(("-", step))
            else:
                nm = chord[idx % len(chord)]
                if idx >= len(chord):
                    nm = nm[:-1] + str(int(nm[-1]) + 1)
                out.append((nm, step))
    return out


def roots(prog, beats_per_bar=4, octave_name=None, rhythm=None):
    out = []
    for chord, bars in prog:
        r = chord[0]
        if rhythm is None:
            out.append((r, bars * beats_per_bar))
        else:
            for _ in range(bars):
                for nm, d in rhythm:
                    if nm == "-":
                        out.append(("-", d))
                    elif nm == "R":
                        out.append((r, d))
                    elif nm == "O":  # oitava acima
                        out.append((r[:-1] + str(int(r[-1]) + 1), d))
                    elif nm == "5":
                        out.append((chord[2 if len(chord) > 2 else -1], d))
                    else:
                        out.append((nm, d))
    return out


# ---------------------------------------------------------------- composicoes
def t_minas():
    """Minas da Brasa: forja industrial, compasso pesado, Re menor com segunda frigia."""
    s = Score(88, 64)
    prog = [(["D2", "F2", "A2"], 2), (["Eb2", "G2", "Bb2"], 2), (["D2", "F2", "A2"], 2), (["C2", "E2", "G2"], 2),
            (["Bb1", "D2", "F2"], 2), (["G1", "Bb1", "D2"], 2), (["A1", "C#2", "E2"], 2), (["A1", "C#2", "E2"], 2)]
    s.seq(i_bass, roots(prog, rhythm=[("R", 0.75), ("R", 0.25), ("-", 0.5), ("R", 0.5), ("O", 0.5), ("R", 0.5), ("5", 0.5), ("R", 0.5)]), g=0.55, rev=0.05, bite=0.5)
    s.drums("x.....x.x.......", d_kick, 16, g=0.9, rev=0.08, low=44)
    s.drums("....x.......x...", d_anvil, 16, g=0.32, rev=0.3, echo=0.35, f=840)
    s.drums("..o...o...o...o.", d_shaker, 16, g=0.25, rev=0.05)
    s.drums("x", d_timpani, 16, every=4, g=0.7, rev=0.4, f=73.4)
    pads = [([c[0][:-1] + "3", c[1][:-1] + "3", c[2][:-1] + "3"], n * 4) for c, n in prog]
    s.seq(i_strings, pads, g=0.3, rev=0.5, legato=1.0, bright=1500, att=0.6)
    mel = [("-", 8),
           ("G3", 2), ("Bb3", 1), ("Eb4", 1), ("D4", 2), ("Bb3", 2),
           ("A3", 3), ("F3", 1), ("D3", 1), ("F3", 1), ("A3", 1), ("C4", 1),
           ("G3", 2), ("E3", 1), ("C4", 1), ("Bb3", 2), ("A3", 1), ("G3", 1),
           ("F4", 2), ("D4", 1), ("Bb3", 1), ("C4", 1), ("D4", 1), ("F4", 2),
           ("G4", 3), ("F4", 1), ("D4", 2), ("Bb3", 2),
           ("A3", 1), ("C#4", 1), ("E4", 2), ("G4", 2), ("F4", 1), ("E4", 1),
           ("C#4", 3), ("E4", 1), ("A3", 4)]
    s.seq(i_brass, mel, g=0.42, rev=0.4, echo=0.15, cutoff=1300)
    s.seq(i_choir, [("-", 32), (["D4", "F4", "A4"], 8), (["Bb3", "D4", "G4"], 8), (["A3", "C#4", "E4"], 16)], g=0.22, rev=0.6, legato=1.0)
    return s.render("music_minas", room=1.8, echo_beats=0.75)


def t_casa():
    """Interiores: lareira, valsa suave em Fa maior."""
    s = Score(80, 48)
    prog = [(["F3", "A3", "C4"], 1), (["C3", "E3", "G3"], 1), (["D3", "F3", "A3"], 1), (["Bb2", "D3", "F3"], 1),
            (["F3", "A3", "C4"], 1), (["G3", "Bb3", "D4"], 1), (["C3", "E3", "G3"], 1), (["C3", "E3", "Bb3"], 1),
            (["D3", "F3", "A3"], 1), (["A2", "C3", "E3"], 1), (["Bb2", "D3", "F3"], 1), (["F3", "A3", "C4"], 1),
            (["G3", "Bb3", "D4"], 1), (["C3", "E3", "G3"], 1), (["F3", "A3", "C4"], 1), (["F3", "A3", "C4"], 1)]
    s.seq(i_pluck, arp(prog, [0, 1, 2, 3, 2, 1], 0.5, 3), g=0.32, rev=0.35, legato=1.6)
    s.seq(i_bass, [(c[0][:-1] + "2", 3) for c, _ in prog], g=0.35, rev=0.1, legato=0.9, bite=0.12)
    s.seq(i_pad, [(c, 3) for c, _ in prog], g=0.16, rev=0.4, legato=1.0, cutoff=700)
    mel = [("A4", 2), ("C5", 1), ("G4", 2), ("E4", 1), ("F4", 1.5), ("E4", 0.5), ("D4", 1), ("D4", 2), ("F4", 1),
           ("C5", 2), ("A4", 1), ("Bb4", 1.5), ("A4", 0.5), ("G4", 1), ("E4", 1), ("G4", 1), ("C5", 1), ("Bb4", 3),
           ("A4", 2), ("F4", 1), ("E4", 2), ("C4", 1), ("D4", 1), ("F4", 1), ("Bb4", 1), ("A4", 3),
           ("G4", 1.5), ("A4", 0.5), ("Bb4", 1), ("C5", 1), ("Bb4", 1), ("G4", 1), ("A4", 2), ("G4", 0.5), ("F4", 0.5), ("F4", 3)]
    s.seq(i_flute, mel, g=0.33, rev=0.45, echo=0.12)
    s.put(d_crackle(70, s.N), 0, 1.0, rev=0.05)
    return s.render("music_casa", room=1.4, echo_beats=1.5, echo_fb=0.3)


def t_masmorra():
    """Masmorra/santuario profundo: misterio, celesta com eco sobre drone e acordes ambiguos."""
    s = Score(64, 48)
    prog = [(["A2", "C3", "E3"], 2), (["F2", "A2", "C3", "B3"], 2), (["A2", "C3", "E3"], 1), (["G#2", "B2", "D3", "F3"], 1),
            (["D3", "F3", "A3", "E4"], 1), (["Bb2", "D3", "F3"], 1), (["A2", "C3", "E3"], 1), (["F2", "A2", "C3", "B3"], 1), (["E2", "G#2", "B2"], 2)]
    s.seq(i_pad, [("A1", 48)], g=0.4, rev=0.3, legato=1.0, cutoff=500, att=2.0)
    s.seq(i_pad, [("E2", 48)], g=0.22, rev=0.3, legato=1.0, cutoff=500, att=2.0)
    s.seq(i_strings, [(c, n * 4) for c, n in prog], g=0.2, rev=0.6, legato=1.0, bright=1100, att=1.2)
    mel = [("E5", 1), ("C5", 1), ("B4", 1), ("-", 1), ("-", 2), ("A4", 1), ("B4", 1),
           ("C5", 2), ("-", 1), ("B4", 1), ("A4", 1), ("F4", 1), ("-", 2),
           ("E5", 1), ("C5", 1), ("B4", 1), ("-", 1), ("G#4", 1), ("B4", 1), ("D5", 1), ("F5", 1),
           ("E5", 2), ("D5", 1), ("A4", 1), ("Bb4", 2), ("D5", 1), ("F5", 1),
           ("E5", 1), ("C5", 1), ("B4", 1), ("A4", 1), ("C5", 1), ("-", 1), ("B4", 1), ("A4", 1),
           ("G#4", 2), ("B4", 1), ("E5", 1), ("-", 4)]
    s.seq(i_bell, mel, g=0.3, rev=0.5, echo=0.5, decay=2.2)
    s.drums("x", d_timpani, 12, g=0.4, rev=0.5, f=55.0, dec=2.0)
    # gotas d'agua: notas agudas curtas em lugares fixos (semente fixa)
    for k in range(14):
        b = float(trng.uniform(0, 47))
        s.put(i_bell(nf(["A5", "E6", "B5", "C6"][k % 4]), 0.05, decay=0.4), b, 0.08, rev=0.7, echo=0.3)
    return s.render("music_masmorra", room=2.6, room_mix=0.45, echo_beats=0.75, echo_fb=0.45, echo_taps=5)


def t_desfiladeiro():
    """Desfiladeiro: vento, quintas abertas, flauta alta sobre Re mixolidio/lidio."""
    s = Score(80, 64)
    L = s.N
    # vento: ruido em banda com centro e volume variando lentamente (periodos que dividem o loop)
    t = _tt(L)
    nz = trng.uniform(-1, 1, L)
    w1 = bandpass(nz, 500, 1.2)
    w2 = bandpass(nz, 1400, 2.0)
    lfo1 = 0.5 + 0.5 * np.sin(2 * np.pi * 2 * t / (L / SR))
    lfo2 = 0.5 + 0.5 * np.sin(2 * np.pi * 3 * t / (L / SR) + 1.3)
    s.put((w1 * lfo1 + w2 * lfo2 * 0.6) * 0.5, 0, 1.0, rev=0.2)
    prog = [(["D3", "A3", "E4"], 2), (["C3", "G3", "D4"], 1), (["G2", "D3", "B3"], 1), (["B2", "F#3", "D4"], 1), (["G2", "D3", "B3"], 1),
            (["A2", "E3", "C#4"], 2), (["D3", "A3", "F#4"], 1), (["E3", "B3", "G#4"], 1), (["B2", "F#3", "D4"], 1), (["G2", "D3", "B3"], 1),
            (["E3", "B3", "G4"], 1), (["A2", "E3", "C#4"], 1), (["D3", "A3", "F#4"], 2)]
    s.seq(i_strings, [(c, n * 4) for c, n in prog], g=0.25, rev=0.6, legato=1.0, bright=1600, att=1.0)
    s.seq(i_bass, [(c[0][:-1] + "2", n * 4) for c, n in prog], g=0.25, rev=0.3, legato=0.98, bite=0.1)
    s.seq(i_pluck, arp(prog, [0, 1, 2, 1], 0.5), g=0.14, rev=0.45, echo=0.3, legato=1.2)
    mel = [("-", 4), ("-", 2), ("A4", 1), ("D5", 1),
           ("E5", 3), ("G5", 1), ("D5", 4),
           ("F#5", 2), ("E5", 1), ("D5", 1), ("B4", 3), ("D5", 1),
           ("E5", 2), ("C#5", 1), ("A4", 1), ("A4", 4),
           ("F#5", 3), ("A5", 1), ("G#5", 2), ("F#5", 1), ("E5", 1),
           ("D5", 2), ("F#5", 2), ("B5", 3), ("A5", 1),
           ("G5", 2), ("F#5", 1), ("E5", 1), ("C#5", 2), ("E5", 2),
           ("D5", 4), ("-", 4)]
    s.seq(i_flute, mel, g=0.32, rev=0.6, echo=0.35, vib=0.008)
    s.drums("x.......x...o...", d_tom, 16, every=2, g=0.35, rev=0.6, f0=82.0)
    return s.render("music_desfiladeiro", room=2.4, room_mix=0.45, echo_beats=1.5, echo_fb=0.4)


def t_suspense():
    """Suspense: pulsacao de coracao, cordas graves com tremolo e harmonicos dissonantes."""
    s = Score(60, 48)
    s.drums("x", d_heart, 4, g=0.5, rev=0.15)
    s.drums("x", d_heart, 8, start_bar=4, g=0.75, rev=0.15)
    s.drums("..x.", d_heart, 4, start_bar=8, g=0.45, rev=0.15)
    cello = [("C2", 16), ("Db2", 8), ("C2", 8), ("B1", 8), ("C2", 8)]
    s.seq(i_strings, cello, g=0.5, rev=0.3, legato=1.0, bright=900, att=1.5, trem=7.0)
    s.seq(i_strings, [("C3", 48)], g=0.15, rev=0.4, legato=1.0, bright=700, att=3.0)
    # cluster de violas que respira a cada dois compassos
    for b in range(0, 48, 8):
        s.put(i_strings(nf("G3"), 6.5, bright=1300, att=3.0), b, 0.18, rev=0.6)
        s.put(i_strings(nf("Ab3"), 6.5, bright=1300, att=3.0), b + 0.5, 0.15, rev=0.6)
    glass = [("-", 5), ("F#5", 3), ("-", 7), ("Db6", 3), ("-", 6), (["B5", "C6"], 4), ("-", 4), ("E5", 2), ("Eb5", 2),
             ("-", 4), ("Ab5", 3), ("-", 3), ("F#5", 2)]
    s.seq(i_glass, glass, g=0.2, rev=0.6, echo=0.4, legato=1.0)
    # pizzicato grave isolado
    for b in (10.5, 26.5, 42.5):
        s.put(i_pluck(nf("C2"), 0.4, bright=0.6), b, 0.5, rev=0.4, echo=0.3)
        s.put(i_pluck(nf("F#2"), 0.4, bright=0.6), b + 0.75, 0.35, rev=0.4, echo=0.3)
    # ar subindo no fim do ciclo
    n = int(4 * SR)
    sw = highpass(trng.uniform(-1, 1, n), 2500) * np.linspace(0, 1, n) ** 3 * 0.12
    s.put(sw, 44, 1.0, rev=0.4)
    return s.render("music_suspense", room=2.2, room_mix=0.4, echo_beats=0.75, echo_fb=0.42, rms=0.11)


def t_combate():
    """Combate comum: energia, Mi menor, laco curto."""
    s = Score(144, 64)
    prog = [(["E2", "G2", "B2"], 2), (["C2", "E2", "G2"], 1), (["D2", "F#2", "A2"], 1), (["E2", "G2", "B2"], 2), (["A1", "C2", "E2"], 1), (["B1", "D#2", "F#2"], 1),
            (["E2", "G2", "B2"], 1), (["G1", "B1", "D2"], 1), (["C2", "E2", "G2"], 1), (["D2", "F#2", "A2"], 1), (["A1", "C2", "E2"], 1), (["C2", "E2", "G2"], 1), (["B1", "D#2", "F#2"], 2)]
    s.seq(i_bass, roots(prog, rhythm=[("R", 0.5), ("R", 0.5), ("O", 0.5), ("R", 0.5), ("R", 0.5), ("5", 0.5), ("O", 0.5), ("R", 0.5)]), g=0.5, rev=0.05, legato=0.8, bite=0.6)
    s.drums("x.....x.x.......", d_kick, 16, g=0.85, rev=0.05)
    s.drums("....x.......x...", d_snare, 16, g=0.5, rev=0.2, skip=(7, 15))
    s.drums("x.x.x.x.x.x.x.x.", d_hat, 16, g=0.25, rev=0.05)
    for bar in (7, 15):
        for k, f0 in enumerate((180, 150, 120, 95)):
            s.put(d_tom(f0=f0), bar * 4 + k, 0.5, rev=0.3)
        s.put(d_snare(), bar * 4 + 3.5, 0.4, rev=0.2)
    mel = [("E4", 0.5), ("G4", 0.5), ("B4", 1), ("A4", 0.5), ("G4", 0.5), ("F#4", 1), ("E4", 1.5), ("D4", 0.5), ("E4", 2),
           ("G4", 0.5), ("A4", 0.5), ("B4", 1), ("C5", 1), ("B4", 1), ("A4", 1.5), ("F#4", 0.5), ("D4", 2),
           ("E4", 0.5), ("G4", 0.5), ("B4", 1), ("E5", 1), ("D5", 0.5), ("B4", 0.5), ("C5", 1), ("B4", 1), ("G4", 2),
           ("A4", 0.5), ("C5", 0.5), ("E5", 1), ("D5", 0.5), ("C5", 0.5), ("B4", 1), ("D#5", 2), ("B4", 2),
           ("E5", 1), ("B4", 0.5), ("E5", 0.5), ("G5", 1), ("F#5", 1), ("D5", 1.5), ("B4", 0.5), ("G4", 2),
           ("E5", 1), ("C5", 0.5), ("E5", 0.5), ("G5", 1), ("E5", 1), ("F#5", 1.5), ("E5", 0.5), ("D5", 2),
           ("C5", 1), ("A4", 1), ("E5", 1), ("C5", 1), ("G5", 1), ("E5", 1), ("C5", 2),
           ("B4", 0.5), ("C5", 0.5), ("D#5", 1), ("F#5", 1), ("A5", 1), ("B5", 2), ("-", 2)]
    s.seq(i_lead, mel, g=0.34, rev=0.2, echo=0.15, legato=0.9)
    stabs = []
    for c, n in prog[6:]:
        up = [x[:-1] + str(int(x[-1]) + 2) for x in c]
        for _ in range(n):
            stabs += [("-", 0.5), (up, 0.5), ("-", 1.0), ("-", 0.5), (up, 0.5), ("-", 1.0)]
    s.seq(i_brass, stabs, start=32, g=0.3, rev=0.25, legato=0.7, cutoff=2400)
    return s.render("music_combate", room=1.1, room_mix=0.25, echo_beats=0.5, echo_fb=0.3, rms=0.14)


def t_chefe_minas():
    """Chefe das Minas: martelo e coro, Fa menor frigio, acentos 3+3+2."""
    s = Score(120, 64)
    prog = [(["F2", "Ab2", "C3"], 2), (["Gb2", "Bb2", "Db3"], 1), (["F2", "Ab2", "C3"], 1), (["Db2", "F2", "Ab2"], 1), (["Eb2", "G2", "Bb2"], 1),
            (["C2", "E2", "G2"], 2), (["F2", "Ab2", "C3"], 2), (["Gb2", "Bb2", "Db3"], 2), (["Db2", "F2", "Ab2"], 1), (["Bb1", "Db2", "F2"], 1), (["C2", "E2", "G2"], 2)]
    s.seq(i_bass, roots(prog, rhythm=[("R", 0.75), ("R", 0.75), ("O", 0.5), ("R", 0.75), ("R", 0.75), ("5", 0.5)]), g=0.55, rev=0.05, legato=0.85, bite=0.7)
    s.drums("x..x..x.x..x..x.", d_kick, 16, g=0.9, rev=0.05, low=42)
    s.drums("....x.......x...", d_anvil, 16, g=0.38, rev=0.3, echo=0.25, f=760)
    s.drums("x.......", d_tom, 16, g=0.5, rev=0.4, f0=70.0)
    s.drums("..o..o.o..o..o.o", d_hat, 16, g=0.22, rev=0.05)
    s.drums("x", d_timpani, 16, every=4, g=0.8, rev=0.5, f=87.3)
    s.seq(i_choir, [([c[0][:-1] + "3", c[1][:-1] + "3", c[2][:-1] + "4"], n * 4) for c, n in prog], g=0.3, rev=0.6, legato=1.0, att=0.3)
    mel = [("F3", 1.5), ("Ab3", 1.5), ("C4", 1), ("Db4", 2), ("C4", 2),
           ("Bb3", 1.5), ("Db4", 1.5), ("Gb4", 1), ("F4", 3), ("-", 1),
           ("Ab3", 1.5), ("Db4", 1.5), ("F4", 1), ("G4", 1.5), ("F4", 1.5), ("Eb4", 1),
           ("E4", 1.5), ("G4", 1.5), ("Bb4", 1), ("C5", 3), ("-", 1),
           ("F4", 1.5), ("G4", 1.5), ("Ab4", 1), ("C5", 2), ("Bb4", 1), ("Ab4", 1),
           ("Bb4", 1.5), ("Ab4", 1.5), ("Gb4", 1), ("Db5", 3), ("-", 1),
           ("F4", 1.5), ("Ab4", 1.5), ("Db5", 1), ("Bb4", 1.5), ("F4", 1.5), ("Db4", 1),
           ("E4", 1), ("G4", 1), ("C5", 1), ("E5", 1), ("Db5", 2), ("C5", 2)]
    s.seq(i_brass, mel, g=0.45, rev=0.35, echo=0.12, cutoff=1600)
    s.seq(i_strings, arp([([c[0][:-1] + "4", c[1][:-1] + "4", c[2][:-1] + "4"], n) for c, n in prog], [0, 2, 3, 2], 0.5), g=0.12, rev=0.3, legato=0.5, bright=3000, att=0.01)
    return s.render("music_chefe_minas", room=1.6, room_mix=0.3, echo_beats=0.75, echo_fb=0.3, rms=0.14)


def t_memoria():
    """Tristeza/memoria: piano e cordas, Re menor."""
    s = Score(66, 48)
    prog = [(["D3", "A3", "F4"], 1), (["Bb2", "F3", "D4"], 1), (["F2", "C3", "A3"], 1), (["C3", "G3", "E4"], 1),
            (["G2", "D3", "Bb3"], 1), (["D3", "A3", "F4"], 1), (["Bb2", "F3", "D4"], 1), (["A2", "E3", "C#4"], 1),
            (["D3", "A3", "F4"], 1), (["G2", "D3", "Bb3"], 1), (["Bb2", "F3", "D4"], 1), (["A2", "E3", "C#4"], 1)]
    s.seq(i_piano, arp(prog, [0, 1, 2, 1, 3, 1, 2, 1], 0.5), g=0.3, rev=0.5, legato=1.8)
    s.seq(i_strings, [(c, n * 4) for c, n in prog], g=0.15, rev=0.6, legato=1.0, bright=1200, att=1.2)
    mel = [("A4", 3), ("G4", 0.5), ("F4", 0.5), ("F4", 2), ("D4", 2),
           ("C5", 3), ("Bb4", 0.5), ("A4", 0.5), ("G4", 4),
           ("Bb4", 2), ("A4", 1), ("G4", 1), ("F4", 2), ("A4", 2),
           ("D5", 2), ("C5", 1), ("Bb4", 1), ("A4", 2), ("C#5", 2),
           ("D5", 3), ("E5", 0.5), ("F5", 0.5), ("D5", 2), ("Bb4", 2),
           ("A4", 1), ("G4", 1), ("F4", 1), ("D4", 1), ("E4", 2), ("C#4", 1), ("-", 1)]
    s.seq(i_strings, mel, octave=0, g=0.42, rev=0.55, echo=0.15, legato=1.0, bright=2600, att=0.25, vib=0.006)
    return s.render("music_memoria", room=2.4, room_mix=0.45, echo_beats=1.0, echo_fb=0.3, rms=0.11)


def t_vila_festa():
    """Vila em festa: o tema da Vila Lumen (deste projeto) rearranjado com percussao e sanfona."""
    s = Score(116, 64)
    mel = [("E4", 1), ("G4", 1), ("A4", 2), ("G4", 1), ("E4", 1), ("D4", 2),
           ("C4", 1), ("E4", 1), ("G4", 2), ("A4", 1), ("G4", 1), ("E4", 2),
           ("F4", 1), ("A4", 1), ("C5", 2), ("B4", 1), ("A4", 1), ("G4", 2),
           ("E4", 1), ("D4", 1), ("C4", 1), ("D4", 1), ("E4", 4)]
    # segunda volta: o mesmo tema uma oitava acima com variacao ritmica
    mel2 = [("E5", 0.5), ("E5", 0.5), ("G5", 1), ("A5", 1.5), ("G5", 0.5), ("E5", 1), ("G5", 1), ("D5", 2),
            ("C5", 0.5), ("D5", 0.5), ("E5", 1), ("G5", 1.5), ("A5", 0.5), ("G5", 1), ("E5", 1), ("E5", 2),
            ("F5", 0.5), ("G5", 0.5), ("A5", 1), ("C6", 1.5), ("B5", 0.5), ("A5", 1), ("B5", 1), ("G5", 2),
            ("E5", 1), ("D5", 1), ("C5", 0.5), ("D5", 0.5), ("E5", 1), ("C5", 4)]
    prog = [(["C3", "E3", "G3"], 2), (["A2", "C3", "E3"], 2), (["F2", "A2", "C3"], 2), (["G2", "B2", "D3"], 1), (["C3", "E3", "G3"], 1)] * 2
    s.seq(i_lead, mel, g=0.32, rev=0.25, echo=0.1, cutoff=2600)
    s.seq(i_lead, mel2, start=32, g=0.28, rev=0.25, echo=0.1, cutoff=3000)
    s.seq(i_flute, mel, start=32, octave=-1, g=0.2, rev=0.3)
    s.seq(i_bass, roots(prog, rhythm=[("R", 1), ("5", 1), ("R", 1), ("5", 1)]), g=0.45, rev=0.05, legato=0.6, bite=0.35)
    strum = []
    for c, n in prog:
        up = [x[:-1] + str(int(x[-1]) + 1) for x in c]
        strum += [("-", 0.5), (up, 0.5)] * (4 * n)
    s.seq(i_pluck, strum, g=0.3, rev=0.2, legato=0.6)
    s.drums("x.......x.......", d_kick, 16, g=0.7, rev=0.05)
    s.drums("....x.......x...", d_clap, 16, g=0.4, rev=0.25)
    s.drums("xoxoxoxoxoxoxoxo", d_shaker, 16, g=0.25, rev=0.05)
    s.seq(i_bell, [("-", 32)] + [(c[2][:-1] + "5", 1) for c, n in prog[5:] for _ in range(n * 4)], g=0.08, rev=0.4, echo=0.3, decay=0.8)
    return s.render("music_vila_festa", room=1.3, room_mix=0.3, echo_beats=0.75, echo_fb=0.25, rms=0.13)


def j_vitoria():
    """Jingle de vitoria (nao faz loop)."""
    s = Score(128, 9, loop=False, tail=3.0)
    top = [("C5", 0.25), ("E5", 0.25), ("G5", 0.5), ("E5", 0.25), ("G5", 0.25), ("C6", 1.0), ("Ab5", 0.75), ("Bb5", 0.75), ("C6", 3.0)]
    s.seq(i_brass, top, g=0.5, rev=0.35, cutoff=2600)
    s.seq(i_brass, [("-", 2.5), (["Ab3", "C4", "Eb4"], 0.75), (["Bb3", "D4", "F4"], 0.75), (["C4", "E4", "G4", "C5"], 3.0)], g=0.45, rev=0.35, cutoff=2000)
    s.seq(i_strings, [("-", 4), (["C3", "G3", "E4"], 3.0)], g=0.3, rev=0.5, att=0.1)
    s.seq(i_bass, [("C2", 0.5), ("-", 2.0), ("Ab1", 0.75), ("Bb1", 0.75), ("C2", 3.0)], g=0.5, rev=0.1)
    for k in range(8):
        s.put(d_snare(0.5 + k * 0.06), 3.0 + k * 0.125, 0.5, rev=0.2)
    s.put(d_timpani(65.4, 1.0, 1.8), 4.0, 0.9, rev=0.4)
    s.put(d_hat(open_=True), 4.0, 0.6, rev=0.5)
    s.put(d_kick(), 0, 0.7)
    return s.render("music_vitoria", room=1.8, room_mix=0.35, echo_beats=0.5, echo_fb=0.2, rms=0.15, fade_out=1.0)


def j_descoberta():
    """Jingle de descoberta: sinos subindo e acorde aberto."""
    s = Score(100, 6, loop=False, tail=2.5)
    up = [("D5", 0.25), ("G5", 0.25), ("B5", 0.25), ("D6", 0.25), ("F#6", 0.5), ("-", 0.25), ("G6", 1.5)]
    s.seq(i_bell, up, g=0.45, rev=0.5, echo=0.4, decay=1.5)
    s.seq(i_pluck, [(x, 0.125) for x in ("G3", "B3", "D4", "F#4", "A4", "B4", "D5", "F#5")], g=0.25, rev=0.4)
    s.seq(i_pad, [("-", 1.0), (["G3", "B3", "D4", "F#4", "A4"], 2.5)], g=0.35, rev=0.6, att=0.3, cutoff=1800)
    s.seq(i_bass, [("-", 1.0), ("G2", 2.5)], g=0.3, rev=0.2)
    return s.render("music_descoberta", room=2.0, room_mix=0.4, echo_beats=0.5, echo_fb=0.35, rms=0.12, fade_out=1.2)


def t_fortaleza():
    """Fortaleza do Eclipse (Regiao 4): vento nas ameias, metais solenes e sinos; Mi eolio com sexta dorica (violeta e dourado)."""
    s = Score(76, 64)
    L = s.N
    tt = _tt(L)
    nz = trng.uniform(-1, 1, L)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 4 * tt / (L / SR) + 0.7)
    s.put(bandpass(nz, 700, 1.4) * lfo * 0.35, 0, 1.0, rev=0.2)
    prog = [(["E2", "B2", "G3"], 2), (["C2", "G2", "E3"], 2), (["D2", "A2", "F#3"], 2), (["E2", "B2", "G3"], 2),
            (["A1", "E2", "C#3"], 2), (["C2", "G2", "E3"], 2), (["B1", "F#2", "D#3"], 2), (["B1", "F#2", "D#3"], 2)]
    s.seq(i_strings, [([c[0][:-1] + "3", c[1][:-1] + "3", c[2]], n * 4) for c, n in prog], g=0.24, rev=0.6, legato=1.0, bright=1500, att=0.8)
    s.seq(i_bass, roots(prog, rhythm=[("R", 1.5), ("R", 0.5), ("5", 1), ("R", 1)]), g=0.4, rev=0.1, legato=0.9, bite=0.2)
    s.drums("x.......x.......", d_timpani, 16, g=0.45, rev=0.5, f=82.4, dec=1.6)
    s.drums("....o.......o...", d_tom, 16, g=0.25, rev=0.4, f0=98.0)
    mel = [("-", 8),
           ("B3", 2), ("E4", 1), ("F#4", 1), ("G4", 3), ("F#4", 1),
           ("E4", 2), ("C#4", 2), ("D4", 2), ("A3", 2),
           ("B3", 2), ("E4", 1), ("G4", 1), ("B4", 3), ("A4", 1),
           ("G4", 2), ("F#4", 1), ("E4", 1), ("D#4", 4),
           ("E4", 2), ("G4", 1), ("B4", 1), ("C5", 3), ("B4", 1),
           ("A4", 2), ("F#4", 2), ("G4", 2), ("E4", 2),
           ("F#4", 3), ("D#4", 1), ("B3", 4)]
    s.seq(i_brass, mel, g=0.4, rev=0.45, echo=0.15, cutoff=1500)
    s.seq(i_bell, arp([([c[0][:-1] + "5", c[1][:-1] + "5", c[2][:-1] + "5"], n) for c, n in prog], [0, None, 2, None, 1, None, None, None], 0.5),
          g=0.1, rev=0.5, echo=0.4, decay=1.4)
    s.seq(i_choir, [("-", 32), (["E3", "B3", "G4"], 8), (["C3", "G3", "E4"], 8), (["B2", "F#3", "D#4"], 16)], g=0.2, rev=0.6, legato=1.0)
    return s.render("music_fortaleza", room=2.2, room_mix=0.4, echo_beats=1.0, echo_fb=0.35)


def t_chefe_fortaleza():
    """Chefes da Fortaleza (Gemeos de Ferro, Cavaleiro Sem Rosto): duelo marcial em Si menor com tritono, coro e caixa."""
    s = Score(128, 64)
    prog = [(["B1", "D2", "F#2"], 2), (["C2", "E2", "G2"], 1), (["B1", "D2", "F#2"], 1), (["G1", "B1", "D2"], 2), (["F1", "A1", "C2"], 2),
            (["B1", "D2", "F#2"], 2), (["E2", "G2", "B2"], 2), (["F#1", "A#1", "C#2"], 2), (["F#1", "A#1", "C#2"], 2)]
    s.seq(i_bass, roots(prog, rhythm=[("R", 0.5), ("R", 0.5), ("O", 0.5), ("R", 0.5), ("5", 0.5), ("R", 0.5), ("O", 0.5), ("5", 0.5)]), g=0.5, rev=0.05, legato=0.8, bite=0.6)
    s.drums("x...x...x.x.x...", d_kick, 16, g=0.85, rev=0.05, low=44)
    s.drums("....x.......x..x", d_snare, 16, g=0.4, rev=0.2)
    s.drums("x.x.x.x.x.x.x.x.", d_hat, 16, g=0.18, rev=0.05)
    s.drums("x", d_timpani, 16, every=2, g=0.75, rev=0.5, f=61.7)
    s.seq(i_choir, [([c[0][:-1] + "3", c[1][:-1] + "3", c[2][:-1] + "4"], n * 4) for c, n in prog], g=0.28, rev=0.6, legato=1.0, att=0.3)
    mel = [("B3", 1), ("D4", 1), ("F#4", 2), ("G4", 1), ("F#4", 1), ("E4", 2),
           ("D4", 1), ("F4", 1), ("B4", 2), ("A4", 1), ("G4", 1), ("F4", 2),
           ("F#4", 1), ("B4", 1), ("D5", 2), ("C5", 1), ("B4", 1), ("G4", 2),
           ("E4", 1), ("G4", 1), ("B4", 2), ("A#4", 2), ("C#5", 2),
           ("B4", 1), ("D5", 1), ("F#5", 2), ("G5", 1), ("F#5", 1), ("E5", 2),
           ("D5", 1), ("F5", 1), ("B5", 2), ("A5", 1), ("G5", 1), ("F5", 2),
           ("F#5", 2), ("D5", 2), ("E5", 2), ("C#5", 2),
           ("A#4", 2), ("C#5", 2), ("F#5", 4)]
    s.seq(i_brass, mel, g=0.42, rev=0.35, echo=0.1, cutoff=1800)
    s.seq(i_strings, arp([([c[0][:-1] + "4", c[1][:-1] + "4", c[2][:-1] + "4"], n) for c, n in prog], [0, 1, 2, 1], 0.25), g=0.1, rev=0.3, legato=0.5, bright=3200, att=0.01)
    return s.render("music_chefe_fortaleza", room=1.6, room_mix=0.3, echo_beats=0.75, echo_fb=0.3, rms=0.14)


def t_pantano():
    """Pantano dos Sussurros (Regiao 3): nevoa sobre a agua, Re dorico lento, gotas e flauta grave; azul petroleo e lilas."""
    s = Score(66, 48)
    L = s.N
    tt = _tt(L)
    nz = trng.uniform(-1, 1, L)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 3 * tt / (L / SR) + 0.4)
    s.put(bandpass(nz, 300, 0.8) * lfo * 0.22, 0, 1.0, rev=0.3)
    prog = [(["D3", "F3", "A3", "C4"], 2), (["G2", "B2", "D3", "F3"], 2), (["D3", "F3", "A3", "E4"], 2), (["C3", "E3", "G3", "B3"], 2),
            (["Bb2", "D3", "F3", "A3"], 2), (["G2", "B2", "D3", "E3"], 1), (["A2", "C#3", "E3", "G3"], 1)]
    s.seq(i_pad, [(c, n * 4) for c, n in prog], g=0.22, rev=0.6, legato=1.0, cutoff=900, att=1.8)
    s.seq(i_bass, [(c[0][:-1] + "2", n * 4) for c, n in prog], g=0.22, rev=0.3, legato=0.95, bite=0.05)
    s.seq(i_pluck, arp(prog, [0, 2, 1, 3, 2, 1], 0.5), g=0.1, rev=0.5, echo=0.4, legato=1.3)
    mel = [("-", 4), ("A4", 2), ("C5", 1), ("D5", 1),
           ("E5", 3), ("D5", 1), ("C5", 2), ("A4", 2),
           ("B4", 3), ("G4", 1), ("A4", 4),
           ("F5", 2), ("E5", 1), ("D5", 1), ("C5", 2), ("E5", 2),
           ("D5", 3), ("B4", 1), ("G4", 4),
           ("E5", 2), ("C#5", 2), ("D5", 4)]
    s.seq(i_flute, mel, g=0.28, rev=0.65, echo=0.4, vib=0.012)
    s.drums("x.......", d_timpani, 8, every=2, g=0.22, rev=0.6, f=73.4, dec=1.8)
    for k in range(18):
        b = float(trng.uniform(0, 47))
        s.put(i_bell(nf(["D6", "A5", "F6", "C6", "E6"][k % 5]), 0.04, decay=0.35), b, 0.07, rev=0.7, echo=0.35)
    return s.render("music_pantano", room=2.8, room_mix=0.5, echo_beats=1.0, echo_fb=0.45, echo_taps=5)


def t_chefe_pantano():
    """Chefes do Pantano (Barqueiro Sem Sombra, Bruxa Afogada): valsa sombria em Fa# menor, coro afogado e sinos."""
    s = Score(138, 48)
    prog = [(["F#2", "A2", "C#3"], 2), (["D2", "F#2", "A2"], 2), (["E2", "G#2", "B2"], 2), (["C#2", "E#2", "G#2"], 2),
            (["F#2", "A2", "C#3"], 2), (["B1", "D2", "F#2"], 2), (["G2", "B2", "D3"], 2), (["C#2", "E#2", "G#2"], 2)]
    s.seq(i_bass, roots(prog, beats_per_bar=3, rhythm=[("R", 1), ("5", 1), ("5", 1)]), g=0.45, rev=0.1, legato=0.85, bite=0.4)
    s.drums("x..x..x..x..", d_kick, 12, g=0.6, rev=0.1, low=46)
    s.drums("...x.x...x.x", d_hat, 12, g=0.14, rev=0.1)
    s.drums("x", d_timpani, 12, every=2, g=0.6, rev=0.5, f=92.5)
    s.seq(i_choir, [([c[0][:-1] + "3", c[1][:-1] + "3", c[2][:-1] + "4"], n * 3) for c, n in prog], g=0.26, rev=0.7, legato=1.0, att=0.4)
    mel = [("C#5", 1), ("F#5", 1), ("A5", 1), ("G#5", 2), ("F#5", 1),
           ("D5", 1), ("F#5", 1), ("A5", 1), ("C#6", 3),
           ("B5", 1), ("G#5", 1), ("E5", 1), ("G#5", 2), ("B5", 1),
           ("E#5", 3), ("C#5", 3),
           ("C#5", 1), ("F#5", 1), ("A5", 1), ("C#6", 2), ("B5", 1),
           ("A5", 1), ("F#5", 1), ("D5", 1), ("B4", 3),
           ("D5", 1), ("G5", 1), ("B5", 1), ("A5", 2), ("G5", 1),
           ("G#5", 3), ("E#5", 3)]
    s.seq(i_strings, mel, g=0.3, rev=0.45, legato=0.95, bright=2600, att=0.05)
    s.seq(i_bell, arp([([c[0][:-1] + "5", c[1][:-1] + "5", c[2][:-1] + "5"], n) for c, n in prog], [0, 1, 2], 1.0, beats_per_bar=3), g=0.08, rev=0.6, echo=0.4, decay=1.2)
    return s.render("music_chefe_pantano", room=2.0, room_mix=0.4, echo_beats=0.75, echo_fb=0.35, rms=0.13)


TRILHAS = {"minas": t_minas, "casa": t_casa, "masmorra": t_masmorra, "desfiladeiro": t_desfiladeiro, "suspense": t_suspense,
           "combate": t_combate, "chefe_minas": t_chefe_minas, "memoria": t_memoria, "vila_festa": t_vila_festa,
           "vitoria": j_vitoria, "descoberta": j_descoberta,
           "fortaleza": t_fortaleza, "chefe_fortaleza": t_chefe_fortaleza,
           "pantano": t_pantano, "chefe_pantano": t_chefe_pantano}


def trilhas(only=None):
    for k, fn in TRILHAS.items():
        if only and k not in only:
            continue
        dur = fn()
        size = os.path.getsize(os.path.join(OUT, "music_%s.ogg" % k))
        print("music_%-14s %5.1f s  %4d KB" % (k, dur, size // 1024))


if __name__ == "__main__":
    import sys
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if "--trilhas" in sys.argv:
        # so as trilhas dinamicas (nao regrava efeitos nem as trilhas antigas)
        trilhas(args)
    else:
        sfx()
        music()
        trilhas(args)
    print("audio gerado em", OUT)
