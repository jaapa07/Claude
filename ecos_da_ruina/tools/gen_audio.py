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


def write(name, data, sr=SR, ogg=True):
    data = np.clip(data, -1, 1)
    pcm = (data * 32767 * 0.9).astype(np.int16)
    wavp = os.path.join(OUT, name + ".wav")
    with wave.open(wavp, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wavp, "-c:a", "libvorbis", "-q:a", "3", os.path.join(OUT, name + ".ogg")], check=True)
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


if __name__ == "__main__":
    sfx()
    music()
    print("audio gerado em", OUT)
