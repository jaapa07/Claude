"""sound_bar.py : the whole soundtrack of "Sem Água", made here (no downloaded sounds).
narration.wav + beats.json (window.BEATS from film.html) + vo_extra/*.wav (Kokoro sigh and laughs) -> mix.wav at -14 LUFS.
Layers: the bar (crowd murmur, glass clinks, a samba on the bar radio), the mission music, the warm relief pad,
the dead silence with one cricket, the heavenly choir that goes out of tune, the street at night, the credits sting
and, after the black, a flush that finally works. needs: numpy, ffmpeg"""
import json, os, re, subprocess, wave
import numpy as np
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
B = json.load(open(os.path.join(HERE, "beats.json")))
TIMING = json.loads(re.sub(r"^\s*window\.TIMING\s*=\s*|;\s*$", "", open(os.path.join(HERE, "timing.js"), encoding="utf-8").read().strip()))
TOTAL = B["end"]; N = int(TOTAL * SR); t = np.arange(N) / SR
rng = np.random.default_rng(42)

def read(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768
def band(x, lo, hi):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f[(fr < lo) | (fr > hi)] = 0; return np.fft.irfft(f, len(x))
def env(n, a, d): u = np.arange(n) / SR; return np.minimum(1, u / max(a, 1e-4)) * np.exp(-u / d)
def tone(f, n, f_end=None):
    u = np.arange(n) / SR; fr = f if f_end is None else f * (f_end / f) ** (u / max(u[-1], 1e-9)); return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(fr, u.shape)) / SR)
def noise(n): return rng.standard_normal(n)
def L(s): return int(s * SR)
def place(buf, x, at, g=1.0):
    s = int(at * SR)
    if s >= len(buf): return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); buf[s:e] += g * x[:e - s]
def curve(points):
    """a level envelope from [(time, level), ...] (linear between points)"""
    pts = sorted(points); return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
def norm(x): return x / (np.abs(x).max() + 1e-9)
def movavg(x, n): c = np.concatenate([[0.0], np.cumsum(x)]); h = n // 2; i = np.arange(len(x)); a = np.clip(i - h, 0, len(x)); b = np.clip(i - h + n, 0, len(x)); return (c[b] - c[a]) / n
def pluck(f, dur, bright=0.5):
    """Karplus-Strong plucked string (the cavaquinho)"""
    n = L(dur); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]; buf[i % p] = 0.996 * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out
_pl = {}
def pl(f, dur=0.6):
    k = (round(f, 2), dur)
    if k not in _pl: _pl[k] = pluck(f, dur)
    return _pl[k]
NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)

# ================= the narration =================
voice = np.zeros(N); v = read(os.path.join(HERE, "narration.wav")); voice[:min(N, len(v))] = v[:N]
for ln in TIMING["lines"]:                                  # the whisper at the table: softer and a little thinner
    if ln["i"] == 10: a, b = L(ln["start"] - 0.05), L(ln["end"] + 0.1); voice[a:b] = 0.7 * voice[a:b] + 0.15 * band(voice[a:b], 2000, 8000)

# ================= the bar: murmur, clinks, radio samba =================
def murmur(n, seed):
    r = np.random.default_rng(seed); out = np.zeros(n)
    for k in range(9):                                      # nine distant talkers: band noise shaped by syllable envelopes
        rate = r.uniform(3.5, 6.5); ph = r.uniform(0, 6); u = np.arange(n) / SR
        syl = np.clip(np.sin(2 * np.pi * rate * u + ph) + 0.6 * np.sin(2 * np.pi * rate * 0.37 * u + ph * 2), 0, None) ** 1.5
        phr = (np.sin(2 * np.pi * r.uniform(0.08, 0.2) * u + ph) > -0.3).astype(float); phr = movavg(phr, L(0.2))
        lo = r.uniform(250, 450); out += band(r.standard_normal(n), lo, lo * r.uniform(3.5, 6)) * syl * phr
    return norm(out)
crowd = murmur(N, 3)
clinks = np.zeros(N)
for k in range(int(TOTAL / 2.3)):
    at = rng.uniform(0, TOTAL); n = L(0.35); x = sum(tone(f, n) * env(n, 0.0005, 0.06 + 0.04 * i) for i, f in enumerate(rng.uniform(2500, 5200, 3)))
    place(clinks, x * rng.uniform(0.2, 0.6), at)
# the radio samba: 100 bpm, surdo on 2, pandeiro sixteenths, cavaquinho chords C A7 Dm G7
samba = np.zeros(N); bpm = 100; beat = 60 / bpm
chords = [[60, 64, 67, 72], [57, 61, 64, 69], [62, 65, 69, 74], [55, 59, 62, 65]]
surdo = tone(62, L(0.5), 48) * env(L(0.5), 0.004, 0.18)
tap = lambda: band(noise(L(0.06)), 3000, 9000) * env(L(0.06), 0.0005, 0.012)
pandeiro = [tap() for _ in range(4)]
bar_n = int(TOTAL / (2 * beat)) + 1
for b_ in range(bar_n):
    t0 = b_ * 2 * beat
    place(samba, surdo, t0 + beat, 1.0); place(samba, surdo, t0, 0.35)
    for s in range(8): place(samba, pandeiro[s % 4], t0 + s * beat / 4, 0.55 if s % 4 == 0 else (0.35 if s % 2 else 0.25))
    ch = chords[(b_ // 1) % 4]
    for hit, g in [(0.0, 0.5), (0.75, 0.35), (1.25, 0.45), (1.75, 0.3)]:
        for j, nt in enumerate(ch): place(samba, pl(NOTE(nt + 12), 0.5), t0 + hit * beat + j * 0.008, g * 0.5)
    # a little bass line on the 7-string guitar
    for hit, nt in [(0, ch[0] - 12), (1.0, ch[2] - 24), (1.5, ch[0] - 12)]: place(samba, pl(NOTE(nt), 0.8), t0 + hit * beat, 0.6)
samba = band(norm(samba), 120, 4500)                       # through a small speaker

# ================= the mission (scene 3): suspense, exaggerated =================
mission = np.zeros(N); m0, m1 = B["stand"] + 0.3, B["slam"]
step = 60 / 150 / 2                                          # eighths at 150 bpm, a 7/8 ostinato in D minor
pattern = [50, 50, 53, 50, 50, 55, 52]
def string(f, dur): n = L(dur); u = np.arange(n) / SR; saw = 2 * ((f * u) % 1) - 1; return band(saw + 0.5 * (2 * ((f * 1.003 * u) % 1) - 1), 60, 2500) * env(n, 0.005, dur * 0.5)
k = 0; tt = m0
while tt < m1 - 0.05:
    nt = pattern[k % 7]; place(mission, string(NOTE(nt), 0.16), tt, 0.7); place(mission, string(NOTE(nt - 12), 0.16), tt, 0.5)
    if k % 7 == 0: place(mission, tone(55, L(0.7), 40) * env(L(0.7), 0.003, 0.25), tt, 1.3)       # timpani
    if k % 2 == 0: place(mission, band(noise(L(0.04)), 6000, 12000) * env(L(0.04), 0.0005, 0.01), tt, 0.25)
    k += 1; tt += step
# the high tremolo rising over the whole walk
n = L(m1 - m0); u = np.arange(n) / SR; fr = 587 * 2 ** (u / u[-1] * 7 / 12); trem = (0.5 + 0.5 * np.sin(2 * np.pi * 13 * u))
place(mission, band(np.sin(2 * np.pi * np.cumsum(fr) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(fr) / SR), 300, 5000) * trem * np.linspace(0.15, 0.6, n), m0)
place(mission, tone(110, L(1.4), 55) * env(L(1.4), 0.002, 0.5) + 0.6 * band(noise(L(1.4)), 40, 400) * env(L(1.4), 0.001, 0.3), m1, 1.2)  # the door slam ends it
mission = norm(mission)

# ================= relief: a warm major pad and a harp glissando =================
relief = np.zeros(N); r0, r1 = B["sigh"] + 0.3, B["flush1"]
n = L(r1 - r0); u = np.arange(n) / SR
pad = sum((np.sin(2 * np.pi * NOTE(nt) * u) + 0.3 * np.sin(4 * np.pi * NOTE(nt) * u)) for nt in (48, 55, 60, 64, 67, 72))
place(relief, pad * np.minimum(1, u / 1.2), r0)
for j, nt in enumerate([60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84]): place(relief, pl(NOTE(nt), 1.2), r0 + 0.05 + j * 0.06, 0.5)
relief = norm(relief); relief[L(r1):] = 0                   # the click cuts it dead

# ================= the choir: heavenly, then out of tune =================
choir = np.zeros(N); c0, c1, sour = B["holy"], B["puff"] + 1.0, B["puff"]
n = L(c1 - c0); u = np.arange(n) / SR; ts = u + c0
bend = np.where(ts < sour, 0.0, -np.minimum(1, (ts - sour) / 0.8) * 4.0)              # semitones down after the puff
for j, nt in enumerate((60, 64, 67, 72, 76)):
    det = np.where(ts < sour, 0.0, (j - 2) * 0.7 * np.minimum(1, (ts - sour) / 0.5))   # and each voice drifts apart
    f = NOTE(nt) * 2 ** ((bend + det) / 12) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * u + j))
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    choir[L(c0):L(c0) + n] += sum(band(saw, fc * 0.8, fc * 1.25) * g for fc, g in ((700, 1.0), (1150, 0.6), (2600, 0.25)))
ce = np.zeros(N); ce[L(c0):L(c0) + n] = np.minimum(1, u / 0.25) * np.where(ts < sour + 0.5, 1, np.maximum(0, 1 - (ts - sour - 0.5) / 0.5))
choir = choir * ce
for d, g in ((0.11, 0.5), (0.23, 0.35), (0.37, 0.25)): choir[L(d):] += g * choir[:-L(d)]   # a church-sized echo
choir = norm(choir)

# ================= street =================
street = band(noise(N), 60, 600) * (0.7 + 0.3 * np.sin(2 * np.pi * t / 9)); street = norm(street)
for at in (B["out"] + 1.5, B["out"] + 4.5): place(street, band(noise(L(2.5)), 300, 1500) * np.sin(np.linspace(0, np.pi, L(2.5))) * 0.8, at)   # a car passing

# ================= effects =================
fx = np.zeros(N)
def growl(dur, f0=90):
    n = L(dur); u = np.arange(n) / SR; f = f0 + 25 * np.sin(2 * np.pi * 2.3 * u) + 15 * np.sin(2 * np.pi * 7 * u)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1; gurg = 0.6 + 0.4 * np.sin(2 * np.pi * 11 * u + 3 * np.sin(2 * np.pi * 1.7 * u))
    return band(saw, 50, 700) * gurg * np.sin(np.linspace(0, np.pi, n)) ** 0.7
place(fx, growl(1.3), B["growl"], 1.3); place(fx, growl(0.8, 110), B["m"][1] + 0.6, 0.6); place(fx, growl(0.9, 80), B["reply"] + 1.7, 0.7)
place(fx, sum(tone(f, L(0.9)) * env(L(0.9), 0.0005, 0.25) for f in (2350, 3120, 4020)) / 2, B["clink"], 0.9)        # the toast
place(fx, band(noise(L(0.7)), 500, 4000) * np.sin(np.linspace(0, np.pi, L(0.7))) ** 2, B["fuga"] - 0.25, 0.6)          # whoosh on "fuga"
for k, m in enumerate(B["m"]):                                                                                           # the clock montage
    place(fx, band(noise(L(0.5)), 300, 3000) * np.sin(np.linspace(0, np.pi, L(0.5))) ** 2, m - 0.2, 0.45)
    for j in range(3): place(fx, band(noise(L(0.05)), 1500, 6000) * env(L(0.05), 0.0003, 0.01) + 0.6 * tone(1100 if j % 2 else 800, L(0.05)) * env(L(0.05), 0.0003, 0.015), m + j * 0.42, 1.0)
for j in range(4):                                                                                                       # heartbeat under "um único músculo"
    one = tone(55, L(0.3), 38) * env(L(0.3), 0.004, 0.08); place(fx, one, B["muscle"] + j * 0.7, 1.0); place(fx, one, B["muscle"] + j * 0.7 + 0.26, 0.7)
place(fx, band(noise(L(0.5)), 200, 2500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 40 * np.arange(L(0.5)) / SR))) * env(L(0.5), 0.01, 0.2), B["stand"] + 0.1, 0.7)   # the chair scrapes
tt = B["stand"] + 1.2
while tt < B["slam"] - 0.3:                                                                                              # tiny fast steps
    place(fx, band(noise(L(0.05)), 300, 3000) * env(L(0.05), 0.001, 0.015), tt, 0.35); tt += np.pi / 11
place(fx, read(os.path.join(HERE, "vo_extra", "sigh.wav")), B["sigh"], 0.55)                                            # the sigh
place(fx, band(noise(L(1.2)), 200, 2000) * np.exp(-np.linspace(0, 3, L(1.2))) * np.minimum(1, np.arange(L(1.2)) / L(0.05)), B["sigh"], 0.35)
def clack(): n = L(0.25); return 0.8 * tone(1600, n, 900) * env(n, 0.0003, 0.012) + 0.7 * tone(140, n, 90) * env(n, 0.002, 0.05) + 0.4 * band(noise(n), 1000, 6000) * env(n, 0.0003, 0.02)
place(fx, clack(), B["flush1"], 0.9)
for j in range(3): place(fx, clack(), B["flush2"] + j * 0.3, 0.8)
n = L(0.06); chirp = sum(tone(4300, n) * (np.sin(2 * np.pi * 30 * np.arange(n) / SR) > 0) * np.sin(np.linspace(0, np.pi, n)) for _ in range(1))
for j in range(3): place(fx, chirp, B["flush2"] + 1.6 + j * 0.13, 0.25)                                                 # one cricket in the silence
place(fx, band(noise(L(0.3)), 400, 3000) * env(L(0.3), 0.002, 0.08), B["grab"], 0.5)                                    # the bucket handle
n = L(0.35); u = np.arange(n) / SR; place(fx, 0.3 * band(2 * ((np.cumsum(900 + 400 * u / u[-1]) / SR) % 1) - 1, 600, 4000) * np.sin(np.linspace(0, np.pi, n)), B["tap"], 0.6)   # the tap squeaks
n = L(0.7); u = np.arange(n) / SR; puff = band(noise(n), 300, 5000) * env(n, 0.005, 0.15) * (0.6 + 0.4 * (np.sin(2 * np.pi * 23 * u) > 0))
place(fx, puff + 0.4 * tone(180, n, 70) * env(n, 0.003, 0.05), B["puff"], 0.9)                                          # the dry puff
n = L(1.4); u = np.arange(n) / SR; breath = band(noise(n), 400, 3500) * np.where(u < 0.75, np.sin(u / 0.75 * np.pi / 2) ** 2 * 0.6, np.exp(-(u - 0.75) / 0.25))
place(fx, breath, B["breath"], 0.5)
n = L(0.9); u = np.arange(n) / SR; creak = 0.35 * band(2 * ((np.cumsum(170 + 60 * np.sin(2 * np.pi * 1.4 * u)) / SR) % 1) - 1, 250, 2500) * np.sin(np.linspace(0, np.pi, n))
place(fx, creak, B["open"] + 0.05, 0.7)
place(fx, tone(90, L(0.6), 50) * env(L(0.6), 0.002, 0.12) + 0.5 * band(noise(L(0.6)), 80, 900) * env(L(0.6), 0.001, 0.05), B["doorShut"], 0.8)
tt = B["leave"]
while tt < B["leave"] + 1.4: place(fx, band(noise(L(0.05)), 300, 3000) * env(L(0.05), 0.001, 0.015), tt, 0.3); tt += np.pi / 11
# the laugh: three friends at once, table slaps
for name, at, g in (("laugh_beto", 0.0, 0.8), ("laugh_carla", 0.15, 0.7), ("laugh_ze", 0.35, 0.6), ("laugh_beto2", 1.8, 0.6), ("laugh_carla", 2.3, 0.45), ("laugh_ze", 3.2, 0.35), ("laugh_beto", 4.4, 0.3), ("laugh_carla", 5.6, 0.25)):
    place(fx, read(os.path.join(HERE, "vo_extra", name + ".wav")), B["laugh"] + at, g)
for at in (0.3, 0.75, 1.3, 2.0): place(fx, tone(80, L(0.4), 50) * env(L(0.4), 0.002, 0.07) + 0.5 * band(noise(L(0.4)), 100, 2000) * env(L(0.4), 0.001, 0.03), B["laugh"] + at, 0.6)
tt = B["out"]                                                                                                            # the uneven street steps
while tt < B["credits"] - 0.5:
    place(fx, band(noise(L(0.09)), 150, 2000) * env(L(0.09), 0.002, 0.03), tt, 0.4); tt += 0.48
place(fx, band(noise(L(0.35)), 1500, 7000) * env(L(0.35), 0.002, 0.12), B["interd"] + 0.15, 0.5)                       # tape
# the credits sting: a cavaquinho ending, V7 - I
for j, nt in enumerate([67, 71, 74, 77]): place(fx, pl(NOTE(nt), 0.9), B["credits"] + 0.1 + j * 0.05, 0.35)
for j, nt in enumerate([60, 64, 67, 72, 76]): place(fx, pl(NOTE(nt), 1.6), B["credits"] + 0.75 + j * 0.04, 0.4)
place(fx, tone(62, L(0.5), 48) * env(L(0.5), 0.004, 0.18), B["credits"] + 0.75, 0.6)
# after the black: a flush that works (rush, swirl, gurgle, refill hiss)
n = L(2.2); u = np.arange(n) / SR; swirl = 0.6 + 0.4 * np.sin(2 * np.pi * (3 + 2 * u) * u)
rush = band(noise(n), 150, 3500) * swirl * np.minimum(1, u / 0.08) * np.exp(-u / 0.9)
gurgle = sum(tone(rng.uniform(180, 420), L(0.08)) * env(L(0.08), 0.002, 0.02) for _ in range(1))
place(fx, rush, B["flushOK"], 1.2); place(fx, tone(60, L(1.2), 35) * env(L(1.2), 0.01, 0.4), B["flushOK"], 0.6)
for j in range(7): place(fx, tone(rng.uniform(200, 500), L(0.08), rng.uniform(500, 900)) * env(L(0.08), 0.002, 0.025), B["flushOK"] + 1.0 + j * 0.13, 0.5)
place(fx, band(noise(L(1.0)), 3000, 9000) * np.linspace(0.3, 0, L(1.0)), B["flushOK"] + 1.3, 0.3)

# ================= levels over time =================
inbar = curve([(0, 1), (B["stand"] + 0.5, 1), (B["stand"] + 1.5, 0.8), (B["stand"] + 5.0, 0.5), (B["slam"], 0.0), (B["open"], 0.0), (B["open"] + 0.3, 0.25), (B["doorShut"] + 0.2, 0.25), (B["whisper"] - 0.3, 0.25), (B["whisper"], 1.0), (B["out"] - 0.1, 1.0), (B["out"], 0.0), (TOTAL, 0)])
bathroom = curve([(0, 0), (B["slam"], 0), (B["slam"] + 0.05, 0.18), (B["flush1"], 0.18), (B["flush1"] + 0.02, 0.0), (B["holy"], 0.0), (B["holy"] + 0.5, 0.1), (B["open"], 0.1), (B["open"] + 0.1, 0), (TOTAL, 0)])
samba_lv = curve([(0, 0.55), (B["growl"] - 0.05, 0.55), (B["growl"] + 0.05, 0.12), (B["stand"], 0.12), (B["stand"] + 0.5, 0.0), (B["whisper"] - 0.3, 0.0), (B["whisper"], 0.18), (B["laugh"], 0.18), (B["laugh"] + 0.4, 0.45), (B["out"] - 0.1, 0.45), (B["out"], 0.18), (B["credits"] - 0.3, 0.05), (B["credits"], 0.0), (TOTAL, 0)])
street_lv = curve([(0, 0), (B["out"] - 0.05, 0), (B["out"], 1.0), (B["interd"] - 0.05, 1.0), (B["interd"], 0.0), (TOTAL, 0)])
silence = np.ones(N); silence[L(B["black"]):] = 0                                                        # the black is truly black until the flush
dead = curve([(0, 1), (B["flush1"], 1), (B["flush1"] + 0.01, 0.0), (B["holy"] - 0.01, 0.0), (B["holy"], 1), (TOTAL, 1)])
vslow = movavg(np.abs(voice), SR // 4); duck = 1 - 0.55 * np.clip(vslow / 0.03, 0, 1)
amb = (0.20 * crowd + 0.25 * clinks) * inbar * dead + 0.06 * band(crowd, 0, 500) * bathroom
corridor_far = curve([(0, 0), (B["open"], 0), (B["open"] + 0.3, 1), (B["doorShut"] + 0.3, 1), (B["whisper"] - 0.3, 0), (TOTAL, 0)])
amb += 0.07 * band(crowd + samba, 0, 900) * corridor_far
music = 0.28 * samba * samba_lv + 0.5 * mission + 0.30 * relief + 0.45 * choir + 0.1 * band(samba, 0, 700) * street_lv * 0.6
mix = voice + amb * duck + music * (0.6 + 0.4 * duck) + 0.12 * street * street_lv + 0.5 * fx
mix[L(B["credits"]):L(B["black"])] = 0.5 * fx[L(B["credits"]):L(B["black"])] + 0.0
mix[L(B["black"]):] = 0.5 * fx[L(B["black"]):]
mix /= max(1.0, np.abs(mix).max() / 0.98)
raw = os.path.join(HERE, "mix_raw.wav")
with wave.open(raw, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
def measure(p):
    m = subprocess.run(["ffmpeg", "-hide_banner", "-i", p, "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(json.loads(m[m.rindex("{"):m.rindex("}") + 1])["input_i"])
li = measure(raw); out = os.path.join(HERE, "mix.wav"); gain = -14 - li
for k in range(2):
    if k: gain += -14 - measure(out)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.84:level=false", "-ar", str(SR), "-ac", "2", out], check=True)
os.remove(raw)
print(f"mix.wav: {TOTAL:.2f} s, {measure(out):.1f} LUFS")
