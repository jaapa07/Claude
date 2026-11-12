"""sound_meia.py : the soundtrack of "A Meia", all made here.
narration.wav (the dialogue) + beats.json (window.BEATS from film.html) + vo_extra/*.wav (sigh, laughs) -> mix.wav at -14 LUFS.
Layers: the street and the bar (murmur, clinks, a samba on the radio), comic tension for the door without a lock,
a warm pad for the relief that stops dead at the empty holder, the dramatic sock decision, harp plinks for the pocket,
the laugh, the car (engine, road, sniffs, the stink, the windows, the wind) and the farewell ballad for the sock.
needs: numpy, ffmpeg"""
import json, os, subprocess, wave
import numpy as np
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
B = json.load(open(os.path.join(HERE, "beats.json")))
TOTAL = B["end"]; N = int(TOTAL * SR); t = np.arange(N) / SR
rng = np.random.default_rng(11)

def read(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768
def band(x, lo, hi): f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); f[(fr < lo) | (fr > hi)] = 0; return np.fft.irfft(f, len(x))
def env(n, a, d): u = np.arange(n) / SR; return np.minimum(1, u / max(a, 1e-4)) * np.exp(-u / d)
def tone(f, n, f_end=None): u = np.arange(n) / SR; fr = f if f_end is None else f * (f_end / f) ** (u / max(u[-1], 1e-9)); return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(fr, u.shape)) / SR)
def noise(n): return rng.standard_normal(n)
def L(s): return int(s * SR)
def place(buf, x, at, g=1.0):
    s = int(at * SR)
    if s >= len(buf): return
    if s < 0: x = x[-s:]; s = 0
    e = min(len(buf), s + len(x)); buf[s:e] += g * x[:e - s]
def curve(points): pts = sorted(points); return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
def norm(x): return x / (np.abs(x).max() + 1e-9)
def movavg(x, n): c = np.concatenate([[0.0], np.cumsum(x)]); h = n // 2; i = np.arange(len(x)); a = np.clip(i - h, 0, len(x)); b = np.clip(i - h + n, 0, len(x)); return (c[b] - c[a]) / n
_pl = {}
def pl(f, dur=0.6):
    k = (round(f, 2), dur)
    if k not in _pl:
        n = L(dur); p = max(2, int(SR / f)); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
        for i in range(n): out[i] = buf[i % p]; buf[i % p] = 0.996 * 0.5 * (buf[i % p] + buf[(i + 1) % p])
        _pl[k] = out
    return _pl[k]
NOTE = lambda n: 440 * 2 ** ((n - 69) / 12)
def pad(notes, t0, t1, fade=0.6, bright=0.3):
    n = L(t1 - t0); u = np.arange(n) / SR; x = sum(np.sin(2 * np.pi * NOTE(m) * u) + bright * np.sin(4 * np.pi * NOTE(m) * u) for m in notes)
    return x * np.minimum(1, u / fade) * np.minimum(1, (u[-1] - u) / fade + 1e-3)

voice = np.zeros(N); v = read(os.path.join(HERE, "narration.wav")); voice[:min(N, len(v))] = v[:N]

# ================= the bar =================
def murmur(n, seed):
    r = np.random.default_rng(seed); out = np.zeros(n); u = np.arange(n) / SR
    for k in range(9):
        rate = r.uniform(3.5, 6.5); ph = r.uniform(0, 6)
        syl = np.clip(np.sin(2 * np.pi * rate * u + ph) + 0.6 * np.sin(2 * np.pi * rate * 0.37 * u + ph * 2), 0, None) ** 1.5
        phr = movavg((np.sin(2 * np.pi * r.uniform(0.08, 0.2) * u + ph) > -0.3).astype(float), L(0.2)); lo = r.uniform(250, 450)
        out += band(r.standard_normal(n), lo, lo * r.uniform(3.5, 6)) * syl * phr
    return norm(out)
crowd = murmur(N, 5)
clinks = np.zeros(N)
for k in range(int(TOTAL / 2.3)):
    n = L(0.35); place(clinks, sum(tone(f, n) * env(n, 0.0005, 0.06 + 0.04 * i) for i, f in enumerate(rng.uniform(2500, 5200, 3))) * rng.uniform(0.2, 0.6), rng.uniform(0, TOTAL))
samba = np.zeros(N); beat = 60 / 102
chords = [[62, 66, 69, 74], [59, 62, 66, 71], [64, 67, 71, 76], [57, 61, 64, 69]]
surdo = tone(62, L(0.5), 48) * env(L(0.5), 0.004, 0.18); tap = [band(noise(L(0.06)), 3000, 9000) * env(L(0.06), 0.0005, 0.012) for _ in range(4)]
for b_ in range(int(TOTAL / (2 * beat)) + 1):
    t0 = b_ * 2 * beat; place(samba, surdo, t0 + beat, 1.0); place(samba, surdo, t0, 0.35)
    for s_ in range(8): place(samba, tap[s_ % 4], t0 + s_ * beat / 4, 0.55 if s_ % 4 == 0 else (0.35 if s_ % 2 else 0.25))
    ch = chords[b_ % 4]
    for hit, g in [(0.0, 0.5), (0.75, 0.35), (1.25, 0.45), (1.75, 0.3)]:
        for j, nt in enumerate(ch): place(samba, pl(NOTE(nt + 12), 0.5), t0 + hit * beat + j * 0.008, g * 0.5)
    for hit, nt in [(0, ch[0] - 12), (1.0, ch[2] - 24), (1.5, ch[0] - 12)]: place(samba, pl(NOTE(nt), 0.8), t0 + hit * beat, 0.6)
samba = band(norm(samba), 120, 4500)

# ================= music cues =================
mus = np.zeros(N)
# the door without a lock: a comic bassoon-ish staccato, from "modo expresso" until the knock
def honk(f, d): n = L(d); u = np.arange(n) / SR; saw = 2 * ((f * u) % 1) - 1; return band(saw, 80, 1800) * env(n, 0.006, d * 0.45)
tt, k = B["hold"] - 0.4, 0
pattern = [50, 53, 50, 55, 50, 53, 57, 55]
while tt < B["knock1"] - 0.1: place(mus, honk(NOTE(pattern[k % 8]), 0.16), tt, 0.7); k += 1; tt += 0.24
# relief: warm major pad, cut dead at the holder
place(mus, pad([48, 55, 60, 64, 67], B["sigh"] + 0.2, B["stop"], 0.8) * 0.18, B["sigh"] + 0.2)
mus[L(B["stop"]):L(B["stop"]) + L(0.3)] *= 0
# the decision: dramatic minor strings, a timpani roll, a low choir 'ah' (from the sock close to the sock in the pocket)
d0, d1 = B["drama"], B["pocket"] + 0.3
for k, (notes, a) in enumerate([([45, 52, 57, 60, 64], 0), ([41, 53, 57, 60, 65], 1.6), ([43, 50, 55, 59, 62], 3.2), ([45, 52, 57, 61, 64], 4.8)]):
    s0 = d0 + a
    if s0 >= d1: break
    place(mus, pad(notes, s0, min(d1, s0 + 1.9), 0.3, 0.5) * 0.16, s0)
n = L(1.4); u = np.arange(n) / SR; roll = band(noise(n), 40, 220) * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * u)) * np.linspace(0.2, 1, n)
place(mus, roll, d0, 0.9); place(mus, tone(55, L(1.5), 40) * env(L(1.5), 0.003, 0.5), d0 + 1.4, 1.2)
place(mus, tone(49, L(2.0), 36) * env(L(2.0), 0.003, 0.7), B["remove"], 1.3)      # the big hit as the sock comes off
# the pocket: careful harp plinks going up
for j, nt in enumerate([72, 76, 79, 84, 88]): place(mus, pl(NOTE(nt), 0.6), B["pocket"] + 0.2 + j * 0.25, 0.5)
# the farewell ballad: piano arpeggios over strings, major, swelling, from the throw to the end
f0, f1 = B["fly"] - 0.2, TOTAL
prog = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]
seg = 1.6
for k in range(int((f1 - f0) / seg) + 1):
    s0 = f0 + k * seg; ch = prog[k % 4]
    place(mus, pad([ch[0] - 12] + ch, s0, min(f1, s0 + seg + 0.4), 0.4, 0.2) * 0.12, s0)
    for j, nt in enumerate([ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]]): place(mus, pl(NOTE(nt + 12), 0.9), s0 + j * seg / 6, 0.45)
place(mus, pad([48, 55, 60, 64, 67, 72], B["endText"], TOTAL, 0.2, 0.3) * 0.2, B["endText"])
mus = norm(mus)

# ================= effects =================
fx = np.zeros(N)
def growl(dur, f0=90):
    n = L(dur); u = np.arange(n) / SR; f = f0 + 25 * np.sin(2 * np.pi * 2.3 * u) + 15 * np.sin(2 * np.pi * 7 * u)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1; return band(saw, 50, 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * u + 3 * np.sin(2 * np.pi * 1.7 * u))) * np.sin(np.linspace(0, np.pi, n)) ** 0.7
def knock(nk=3, gap=0.22, g=1.0):
    one = 0.9 * tone(120, L(0.25), 80) * env(L(0.25), 0.001, 0.05) + 0.5 * band(noise(L(0.25)), 300, 2500) * env(L(0.25), 0.0005, 0.015); out = np.zeros(L(gap * nk + 0.3))
    for k in range(nk): out[L(gap * k):L(gap * k) + len(one)] += one * g
    return out
def steps(t0, t1, every, g=0.35):
    tt = t0
    while tt < t1: place(fx, band(noise(L(0.05)), 300, 3000) * env(L(0.05), 0.001, 0.015), tt, g); tt += every
def creak(d, f=170): n = L(d); u = np.arange(n) / SR; return 0.35 * band(2 * ((np.cumsum(f + 60 * np.sin(2 * np.pi * 0.8 * u)) / SR) % 1) - 1, 250, 2500) * np.sin(np.linspace(0, np.pi, n))
def thud(g=1): n = L(0.6); return g * (tone(90, n, 50) * env(n, 0.002, 0.12) + 0.5 * band(noise(n), 80, 900) * env(n, 0.001, 0.05))
place(fx, sum(tone(f, L(0.9)) * env(L(0.9), 0.0005, 0.25) for f in (2350, 3120, 4020)) / 2, B["clink"], 0.9)
for at, name, g in ((B["inside"] + 0.2, "laugh_dudu2", 0.35), (B["clink"] + 2.1, "laugh_dudu", 0.4), (B["clink"] + 2.4, "laugh_leo2", 0.3)): place(fx, read(os.path.join(HERE, "vo_extra", name + ".wav")), at, g)
place(fx, growl(1.4), B["growl"], 1.4)
place(fx, band(noise(L(0.5)), 200, 2500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 40 * np.arange(L(0.5)) / SR))) * env(L(0.5), 0.01, 0.2), B["stand"], 0.7)
steps(B["stand"] + 0.5, B["enter"] + 0.5, np.pi / 11)
place(fx, thud(0.9), B["enter"] + 0.62)                                                                 # the door shuts
place(fx, tone(311, L(0.4)) * env(L(0.4), 0.005, 0.15), B["noLock"] + 0.15, 0.4); place(fx, tone(277, L(1.0)) * env(L(1.0), 0.005, 0.4), B["noLock"] + 0.55, 0.45)   # "dun-dun": no lock
place(fx, creak(1.7, 150), B["creak"], 0.9)
steps(B["queue"], B["queue"] + 1.4, 0.32, 0.3)
place(fx, knock(3, 0.2), B["knock1"], 0.9)
place(fx, read(os.path.join(HERE, "vo_extra", "sigh.wav")), B["sigh"], 0.55)
place(fx, tone(1800, L(0.1)) * env(L(0.1), 0.002, 0.03), B["holder"] + 0.5, 0.0)
for j in range(3): place(fx, tone(900, L(0.25), 1800) * env(L(0.25), 0.001, 0.04), B["zoom"] + 0.6 + j * 0.9, 0.25)  # a slow drip in the silence
place(fx, band(noise(L(0.3)), 400, 3000) * env(L(0.3), 0.002, 0.08), B["pockets"] + 0.1, 0.4); place(fx, band(noise(L(0.3)), 400, 3000) * env(L(0.3), 0.002, 0.08), B["pockets"] + 0.6, 0.4)
place(fx, sum(tone(f, L(0.4)) * env(L(0.4), 0.002, 0.12) for f in (1318, 1760)) * 0.5, B["phone"] + 0.2, 0.5)      # the phone wakes
place(fx, knock(2, 0.18, 1.4), B["knock2"], 1.0)
n = L(0.6); place(fx, tone(500, n, 1400) * env(n, 0.002, 0.15) * 0.5, B["knock2"] + 0.1, 0.4)                      # the startle "boing"
n = L(0.7); place(fx, band(noise(n), 800, 6000) * np.sin(np.linspace(0, np.pi, n)) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * np.arange(n) / SR)), B["remove"] + 0.4, 0.6)   # cloth sliding off
n = L(1.4); u = np.arange(n) / SR; place(fx, band(noise(n), 400, 3500) * np.where(u < 0.75, np.sin(u / 0.75 * np.pi / 2) ** 2 * 0.6, np.exp(-(u - 0.75) / 0.25)), B["breath"], 0.5)
place(fx, creak(0.9), B["exit"], 0.6); steps(B["exit"] + 0.3, B["sit"] + 0.5, 0.33)
place(fx, band(noise(L(0.4)), 200, 2500) * env(L(0.4), 0.01, 0.15), B["sit"] + 0.2, 0.5)
n = L(0.6); u = np.arange(n) / SR; place(fx, 0.6 * band(2 * ((np.cumsum(np.linspace(300, 40, n)) / SR) % 1) - 1, 60, 3000) * np.linspace(1, 0, n), B["blank"], 0.7)   # record stop
for name, at, g in (("laugh_dudu", 0.0, 0.8), ("laugh_leo", 0.15, 0.75), ("laugh_dudu2", 1.6, 0.45), ("laugh_leo2", 2.0, 0.4)): place(fx, read(os.path.join(HERE, "vo_extra", name + ".wav")), B["laugh"] + at, g)
for at in (0.2, 0.6): place(fx, thud(0.6), B["laugh"] + at)
for d in (0.0, 0.05): place(fx, band(noise(L(0.45)), 150, 2500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 35 * np.arange(L(0.45)) / SR))) * env(L(0.45), 0.005, 0.15), B["chairs"] + d, 0.8)
place(fx, tone(700, L(0.5), 260) * env(L(0.5), 0.003, 0.2), B["chairs"], 0.35)
# the car
engine = np.zeros(N); u = t
rpm = 32 + 3 * np.sin(2 * np.pi * u / 7); ph = 2 * np.pi * np.cumsum(rpm) / SR; saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
engine = norm(band(saw + 0.4 * np.sin(2 * ph), 30, 600)) * 0.5 + norm(band(noise(N), 60, 900)) * 0.5
for k in range(3): n = L(0.35); place(fx, band(noise(n), 1500, 6000) * np.sin(np.linspace(0, np.pi, n)) ** 2, B["sniff"] + 0.1 + k * 0.42, 0.55)    # sniff sniff
n = L(1.6); u = np.arange(n) / SR; place(fx, 0.5 * np.sin(2 * np.pi * np.cumsum(220 * 2 ** (-u * 1.2) * (1 + 0.06 * np.sin(2 * np.pi * 7 * u))) / SR) * np.sin(np.linspace(0, np.pi, n)), B["cloud"] + 0.1, 0.6)   # the stink: a sagging wobble
n = L(1.0); u = np.arange(n) / SR; place(fx, 0.4 * band(2 * ((np.cumsum(np.full(n, 140.0)) / SR) % 1) - 1, 100, 1500) * np.sin(np.linspace(0, np.pi, n)), B["windows"], 0.6)   # window motors
wind = norm(band(noise(N), 150, 3500)) * (0.65 + 0.35 * np.sin(2 * np.pi * t / 2.7) * np.sin(2 * np.pi * t / 1.3))
place(fx, band(noise(L(0.7)), 400, 3000) * np.sin(np.linspace(0, np.pi, L(0.7))) ** 2, B["throw"], 0.8)                # the throw
n = L(2.6); place(fx, band(noise(n), 200, 1200) * np.sin(np.linspace(0, np.pi, n)) ** 2, B["fly"], 0.35)                # slow-motion air

# ================= levels =================
street_lv = curve([(0, 1.0), (B["inside"] - 0.05, 1.0), (B["inside"], 0), (TOTAL, 0)])
bar_lv = curve([(0, 0.15), (B["inside"] - 0.05, 0.15), (B["inside"], 1.0), (B["enter"] + 0.5, 1.0), (B["enter"] + 0.65, 0.2), (B["exit"], 0.2), (B["exit"] + 0.3, 0.6), (B["sit"], 1.0), (B["car"] - 0.05, 1.0), (B["car"], 0), (TOTAL, 0)])
muffle = curve([(0, 0), (B["enter"] + 0.6, 0), (B["enter"] + 0.65, 1), (B["exit"], 1), (B["exit"] + 0.3, 0), (TOTAL, 0)])
samba_lv = curve([(0, 0.25), (B["inside"], 0.55), (B["growl"] - 0.05, 0.55), (B["growl"] + 0.05, 0.15), (B["enter"] + 0.6, 0.15), (B["sit"], 0.4), (B["blank"] - 0.02, 0.4), (B["blank"] + 0.3, 0.0), (B["laugh"], 0.0), (B["laugh"] + 0.3, 0.45), (B["car"] - 0.05, 0.45), (B["car"], 0), (TOTAL, 0)])
silence_lv = curve([(0, 1), (B["stop"], 1), (B["stop"] + 0.02, 0.15), (B["knock2"], 0.15), (B["knock2"] + 0.05, 1), (TOTAL, 1)])
car_lv = curve([(0, 0), (B["car"] - 0.02, 0), (B["car"], 0.9), (B["carIn"] - 0.02, 0.9), (B["carIn"], 0.4), (B["windows"], 0.4), (B["windows"] + 0.6, 0.7), (B["carOut"], 0.9), (B["grab"], 0.6), (B["fly"], 0.15), (B["watch"], 0.35), (B["foot"], 0.3), (TOTAL - 1, 0.0), (TOTAL, 0)])
wind_lv = curve([(0, 0), (B["windows"] + 0.2, 0), (B["windows"] + 0.9, 1.0), (B["fly"], 1.0), (B["fly"] + 0.2, 0.25), (B["watch"], 0.5), (B["foot"], 0.35), (TOTAL - 0.5, 0), (TOTAL, 0)])
vslow = movavg(np.abs(voice), SR // 4); duck = 1 - 0.55 * np.clip(vslow / 0.03, 0, 1)
street = norm(band(noise(N), 60, 600)) * 0.5
amb = (0.2 * crowd + 0.25 * clinks) * bar_lv * (1 - muffle) + 0.08 * band(crowd + samba, 0, 600) * muffle
music = 0.28 * samba * samba_lv * (1 - muffle) + 0.45 * mus
mix = voice + (amb + 0.08 * street * street_lv + 0.1 * engine * car_lv + 0.18 * wind * wind_lv) * duck * silence_lv + music * (0.55 + 0.45 * duck) + 0.5 * fx
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
