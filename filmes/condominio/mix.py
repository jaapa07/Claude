"""O Condomínio dos Desgraçados — score (synthesised, original), SFX and voices for one episode → out/mix<ep>.wav.
python mix.py <ep>   (reads out/ev<ep>.json written by core/render/events.mjs; run with the library's .venv python)"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or '/home/user/lemomo-ai/lemo-opuscar'
sys.path.insert(0, LIB)
from core.audio import pluck as PL
from core.audio.sfx import SR, add, bp, lp, hp, noise, brown, norm, t_, env_exp, whoosh, limit
from scipy.ndimage import uniform_filter1d, maximum_filter1d

EP = int(sys.argv[1]) if len(sys.argv) > 1 else 1
EVJ = json.load(open(os.path.join(HERE, 'out', f'ev{EP}.json'))); DUR = EVJ['dur']; E = EVJ['ev']
N = int(DUR * SR) + SR
rng = np.random.default_rng(EP)
def db(x): return 10 ** (x / 20)
def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
def sin(f, d, ph=0): return np.sin(2 * np.pi * f * t_(d) + ph)
def chirp(f0, f1, d, p=1.):
    x = t_(d); f = f0 + (f1 - f0) * (x / d) ** p; return np.sin(2 * np.pi * np.cumsum(f) / SR)
def S_(*xs): n = max(len(x) for x in xs); return sum(np.pad(x, (0, n - len(x))) for x in xs)
def at(buf, x, t): s = int(t * SR); n = min(len(x), len(buf) - s); buf[s:s + n] += x[:n]
def seq(parts):   # [(time, array)] → one array
    n = max(int(tt * SR) + len(x) for tt, x in parts); o = np.zeros(n); [at(o, x, tt) for tt, x in parts]; return o
def hz(m): return 440 * 2 ** ((m - 69) / 12)

# ———————————————— SFX (all synthesised) ————————————————
def thud(v=1., f=60): d = .4; return norm(sin(f, d) * env_exp(d, .08) + lp(noise(d), 500) * env_exp(d, .03)) * v
def click(f=1800): d = .05; return norm(hp(noise(d), 2000) * env_exp(d, .006) + sin(f, d) * env_exp(d, .01) * .5)
def boing(): d = .7; x = t_(d); f = 200 + 180 * np.sin(2 * np.pi * 10 * x) * np.exp(-x * 4); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .25))
def whistle(f0, f1, d=.6): return norm(chirp(f0, f1, d) * np.sin(np.pi * t_(d) / d) ** .5)
def pop(): d = .15; return norm(chirp(900, 300, d) * env_exp(d, .03))
def splat(): d = .45; return norm(lp(noise(d), 1400) * env_exp(d, .06) * (1 + sin(28, d)))
def creak(): d = 1.0; x = t_(d); f = 300 + 120 * np.sin(2 * np.pi * 1.5 * x); s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (np.sin(2 * np.pi * 37 * x) > 0); return norm(bp(s, 400, 2500) * np.sin(np.pi * x / d))
def rattle(d=1.4): o = np.zeros(int(d * SR)); [at(o, click(900 + rng.integers(0, 600)) * rng.uniform(.4, 1), i * .045) for i in range(int(d / .045))]; return norm(o)
def thunder(): d = 2.4; x = t_(d); return norm(lp(brown(d), 300) * np.minimum(1, x / .02) * np.exp(-x / .9) * (1 + .6 * np.abs(np.sin(2 * np.pi * 3 * x))) + hp(noise(d), 1500) * env_exp(d, .05))
def bonk(): d = .35; return norm(sin(300, d) * env_exp(d, .07) + sin(620, d) * env_exp(d, .03) * .5 + lp(noise(d), 1000) * env_exp(d, .01))
def holo(): d = .8; return norm(chirp(300, 2000, d, .5) * np.sin(np.pi * t_(d) / d) * .5 + sin(1200, d) * np.sin(np.pi * t_(d) / d) * .2 * (sin(30, d) > 0))
def sob(): o = np.zeros(int(1.4 * SR)); [at(o, bp(noise(.18), 600, 2500) * np.sin(np.pi * t_(.18) / .18), i * .22) for i in range(5)]; return norm(o)
def flush(): d = 2.2; x = t_(d); return norm(bp(noise(d), 200, 3000) * np.minimum(1, x / .15) * np.exp(-x / 1.1) * (1 + .4 * np.sin(2 * np.pi * 7 * x)) + lp(brown(d), 200) * np.exp(-x / .8) * .8 + chirp(200, 80, d) * .2 * np.exp(-x))
def cash(): return norm(S_(sin(2600, .5) * env_exp(.5, .12), np.pad(sin(3300, .5) * env_exp(.5, .1), (int(.08 * SR), 0))))
def door_slam(): d = .7; return norm(lp(noise(d), 600) * env_exp(d, .06) + sin(70, d) * env_exp(d, .15))
def camera(): return norm(S_(click(3000), np.pad(hp(noise(.08), 4000) * env_exp(.08, .02), (int(.06 * SR), 0))))
def glass_crack(): o = np.zeros(int(.6 * SR)); [at(o, hp(noise(.03), 3000) * env_exp(.03, .008) * rng.uniform(.4, 1), rng.uniform(0, .3)) for i in range(16)]; return norm(o)
def faint_whistle(): return whistle(1600, 300, 1.1)
def tiptoe(): d = .12; return norm(sin(900, d) * env_exp(d, .02) * .6 + hp(noise(d), 3000) * env_exp(d, .01))
def sting_short(): d = 1.0; return norm(sum(sin(hz(m), d) for m in [61, 64, 67, 70]) * env_exp(d, .3) * np.minimum(1, t_(d) / .01))
def unplug(): return norm(S_(pop(), np.pad(thud(.4, 200), (int(.05 * SR), 0))))
def zap(): d = .5; x = t_(d); return norm(np.sign(np.sin(2 * np.pi * 120 * x)) * hp(noise(d), 800) * env_exp(d, .15))
def paws(): return norm(S_(thud(.5, 140), np.pad(thud(.4, 160), (int(.18 * SR), 0))))
def steam(): d = 1.2; return norm(hp(noise(d), 2500) * np.sin(np.pi * t_(d) / d))
def fly(): d = 3.0; x = t_(d); f = 220 + 40 * np.sin(2 * np.pi * 3 * x) + 20 * np.sin(2 * np.pi * 11 * x); return norm(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .3 * np.sin(np.pi * x / d) ** .3)
def cricket(): d = 1.6; x = t_(d); return norm(sin(4400, d) * (np.sin(2 * np.pi * 3 * x) > .6) * (sin(30, d) > 0))
def alarm(): d = 2.4; x = t_(d); f = 700 + 300 * (np.sin(2 * np.pi * 2 * x) > 0); return norm(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .5)
def rumble(d=2.5): x = t_(d); return norm(lp(brown(d), 120) * np.minimum(1, x / .5))
def beep(): d = .25; return norm(sin(1400, d) * (t_(d) < .18))
def kaboom(): d = 2.4; x = t_(d); return norm(lp(brown(d), 180) * 2 * np.exp(-x / .7) + lp(noise(d), 1500) * env_exp(d, .15) + sin(40, d) * np.exp(-x / .5))
def goo(): d = 1.2; x = t_(d); o = np.zeros(len(x)); [at(o, chirp(rng.uniform(150, 400), rng.uniform(500, 900), .1) * env_exp(.1, .03), rng.uniform(0, 1.0)) for i in range(10)]; return norm(o + lp(noise(d), 400) * .4 * np.sin(np.pi * x / d))
def ding(): d = 1.6; return norm((sin(1318, d) + .5 * sin(2637, d)) * env_exp(d, .5) + np.pad((sin(1046, d - .25) + .5 * sin(2093, d - .25)) * env_exp(d - .25, .5), (int(.25 * SR), 0)))
def lift_open(): d = 1.6; return norm(bp(noise(d), 200, 1200) * np.sin(np.pi * t_(d) / d) * .6 + sin(90, d) * .3 * np.sin(np.pi * t_(d) / d))
def squelch(): o = np.zeros(int(1.2 * SR)); [at(o, lp(noise(.12), 900) * np.sin(np.pi * t_(.12) / .12), i * .3) for i in range(4)]; return norm(o)
def flipflop(): d = .1; return norm(hp(noise(d), 1200) * env_exp(d, .012) + sin(500, d) * env_exp(d, .015) * .6)
def snap(): d = .3; return norm(S_(hp(noise(.05), 2000) * env_exp(.05, .01), boing()[:int(.3 * SR)] * .3))
def scream_crowd(): d = 2.0; x = t_(d); return norm(sum(bp(noise(d), 500 + k * 200, 900 + k * 300) * (1 + .3 * np.sin(2 * np.pi * (5 + k) * x)) for k in range(5)) * np.minimum(1, x / .1) * np.exp(-x / 1.2))
def gavel(): return norm(S_(thud(1, 180), click(1500)))
def crash(): d = 1.4; return norm(hp(noise(d), 600) * env_exp(d, .3) + lp(noise(d), 300) * env_exp(d, .1) + sum(sin(f, d) for f in [700, 1130, 1800]) * env_exp(d, .25) * .3)
def fall(): return whistle(1500, 200, 2.0)
def elevator_music(): return np.zeros(10)
def hell(): d = 3.0; x = t_(d); return norm(lp(brown(d), 200) * (.6 + .4 * np.sin(2 * np.pi * .5 * x)) + bp(noise(d), 300, 900) * .3)
def typing(d=2.0): o = np.zeros(int(d * SR)); [at(o, click(rng.uniform(1500, 2500)) * .6, i * .09 + rng.uniform(0, .03)) for i in range(int(d / .09))]; return norm(o)
def stamp(): return norm(S_(thud(.9, 120), hp(noise(.05), 1500) * env_exp(.05, .01)))
def printer(): d = 2.0; x = t_(d); return norm(np.sign(np.sin(2 * np.pi * 180 * x)) * .4 * (np.sin(2 * np.pi * 6 * x) > 0) + bp(noise(d), 1000, 3000) * .3)
def glitch(): d = .6; x = t_(d); return norm(np.sign(np.sin(2 * np.pi * (200 + 2000 * (np.floor(x * 30) % 5) / 5) * x)) * .5 * (rng.random(len(x)) > .3))
def power_down(): return norm(chirp(800, 40, 1.4) * np.exp(-t_(1.4) / .8))
def power_up(): return norm(chirp(60, 900, 1.2) * np.minimum(1, t_(1.2) / .1))
def crowd_gasp(): d = 1.2; return norm(bp(noise(d), 400, 2500) * np.minimum(1, t_(d) / .05) * np.exp(-t_(d) / .5))
def heartbeat(): o = np.zeros(int(1.6 * SR)); [at(o, thud(1, 55), a) for a in (0, .25, .8, 1.05)]; return norm(o)
def boop(): d = .3; return norm(sin(660, d) * env_exp(d, .1))
def swoosh_up(): return norm(chirp(200, 2000, .5) * np.sin(np.pi * t_(.5) / .5))
def dial(): d = 1.0; return norm(sin(425, d) * (np.sin(2 * np.pi * 2 * t_(d)) > 0))
def silence(): return np.zeros(10)
FX = {k: v for k, v in globals().items() if callable(v) and k not in ('db', 'rms', 'sin', 'chirp', 'S_', 'at', 'seq', 'hz', 'add', 'bp', 'lp', 'hp', 'noise', 'brown', 'norm', 't_', 'env_exp', 'limit', 'uniform_filter1d', 'maximum_filter1d')}
FX['whoosh'] = lambda: whoosh(.6); FX['eyes_open'] = lambda: norm(chirp(400, 1400, .4) * np.sin(np.pi * t_(.4) / .4))
FX['whistle_up'] = lambda: whistle(500, 1900, .7); FX['whistle_down'] = lambda: whistle(1800, 400, .9)

# ———————————————— score ————————————————
# a samba-ish comedy groove (surdo, pandeiro, tamborim, cavaquinho strums, bass), a lounge for deadpan, drones and theremin for dread
def surdo(v=1.): d = .6; return norm(sin(58, d) * env_exp(d, .18) + lp(noise(d), 300) * env_exp(d, .02) * .4) * v
def pand(v=1.): d = .12; return norm(hp(noise(d), 5000) * env_exp(d, .03) + bp(noise(d), 300, 900) * env_exp(d, .01) * .4) * v
def tamb(v=1.): d = .08; return norm(hp(noise(d), 2500) * env_exp(d, .01) + sin(1900, d) * env_exp(d, .01) * .5) * v
def bass(m, d=.4, v=1.): x = t_(d); f = hz(m); return norm((np.sin(2 * np.pi * f * x) + .4 * np.sin(4 * np.pi * f * x) + .2 * np.sin(6 * np.pi * f * x)) * np.exp(-x / .25) * np.minimum(1, x / .005)) * v
def ther(notes):   # [(midi, dur)] → a gliding sine with vibrato
    f = np.concatenate([np.full(int(d * SR), hz(m)) for m, d in notes]); f = uniform_filter1d(f, int(.08 * SR)); x = np.arange(len(f)) / SR
    s = np.sin(2 * np.pi * np.cumsum(f * (1 + .012 * np.sin(2 * np.pi * 5.5 * x))) / SR); env = np.minimum(1, x / .2) * np.minimum(1, (x[-1] - x) / .3); return s * env
def drone(d, m=38): x = t_(d); return (np.sin(2 * np.pi * hz(m) * x) + .5 * np.sin(2 * np.pi * hz(m + 7) * x * 1.003)) * np.minimum(1, x / .8) * np.minimum(1, (d - x) / .4)
CH = [[62, 66, 69, 72], [67, 71, 74, 77], [64, 67, 71, 74], [69, 73, 76, 79]]   # D7, G7, Em7, A7 — a sitcom samba turnaround
def cav(chord, v=.6):
    o = np.zeros(int(.6 * SR))
    for i, m in enumerate(chord): at(o, PL.pluck('acoustic_guitar', m + 12, vel=v) * .7, i * .012)
    return o
STY = {'comic': 'samba', 'chaos': 'samba_fast', 'dog': 'blues', 'deadpan': 'lounge', 'pause': '', 'ominous': 'drone', 'creepy': 'ther', 'shock': 'sting', 'gossip': 'sneak',
       'reveal': 'sneak', 'burn': 'samba', 'alarm': 'alarm', 'boom': '', 'eerie': 'ther', 'hell': 'drone', 'court': 'march', 'lab': 'synth', 'ai': 'synth', 'karaoke': 'karaoke', 'space': 'synth', 'normal': 'lounge', 'end': ''}
beats = [e for e in E if e['type'] == 'beat']; segs = []
for b in beats:
    if segs and segs[-1]['mood'] == b['mood']: segs[-1]['t1'] = b['t'] + b['d']
    else: segs.append({'mood': b['mood'], 't0': b['t'], 't1': b['t'] + b['d']})
mus = np.zeros(N)
for si, sg in enumerate(segs):
    st = STY.get(sg['mood'], 'samba'); t0, t1 = sg['t0'], sg['t1']; d = t1 - t0
    if not st: continue
    r = np.random.default_rng(si + EP * 17)
    if st in ('samba', 'samba_fast', 'lounge', 'blues', 'march', 'synth', 'sneak', 'karaoke'):
        bpm = {'samba': 104, 'samba_fast': 126, 'lounge': 84, 'blues': 70, 'march': 96, 'synth': 110, 'sneak': 92, 'karaoke': 112}[st]; B = 60 / bpm; k = 0; t = t0
        while t < t1 - .05:
            ch = CH[(k // 8) % 4]; root = ch[0] - 24; sub = k % 4
            if st in ('samba', 'samba_fast', 'karaoke'):
                if sub == 0: at(mus, surdo(.9 if (k // 4) % 2 else .6), t)
                at(mus, pand(.5 + .3 * (sub == 0)) * .5, t)
                if sub in (1, 3) or (sub == 2 and r.random() < .5): at(mus, tamb(.6) * .35, t + B / 4 * (r.random() < .3))
                if sub in (0, 3) and k % 8 != 7: at(mus, cav(ch, .55) * .55, t)
                if sub in (0, 2): at(mus, bass(root + (7 if sub == 2 else 0), B * .9, .9) * .8, t)
            elif st == 'lounge':
                if sub == 0: at(mus, bass(root, B * 1.8, .8) * .6, t)
                if sub == 2: at(mus, cav(ch, .35) * .35, t)
                at(mus, pand(.3) * .15, t + B / 2)
            elif st == 'blues':   # a tired dog walks in: slow bass walk + a wah "trombone"
                at(mus, bass([38, 42, 45, 47][sub], B * .9, .9) * .8, t)
                if sub == 0 and (k // 4) % 2 == 0: at(mus, ther([(57, B * 1.5), (55, B * 1.5)]) * .25, t)
            elif st == 'march':
                if sub in (0, 2): at(mus, surdo(.8), t)
                at(mus, tamb(.5) * .3, t); at(mus, bass(root, B * .8) * .6, t) if sub == 0 else None
            elif st == 'synth':   # an arpeggiator for the lab and the AI
                m = ch[(k * 3) % 4] - 12 + 12 * (k % 8 > 3); x = t_(B * .45); at(mus, np.sign(np.sin(2 * np.pi * hz(m) * x)) * .25 * np.exp(-x / .15), t)
                if sub == 0: at(mus, bass(root, B * .9) * .7, t)
            elif st == 'sneak':   # tip-toe pizzicato
                if sub in (0, 2): at(mus, PL.pluck('upright_bass_pizz', [38, 41, 45, 44][(k // 2) % 4], vel=.7) * .9, t)
                if sub == 3: at(mus, tamb(.4) * .3, t)
            t += B / 2 if st in ('samba', 'samba_fast', 'karaoke', 'synth') else B; k += 1
    elif st in ('drone', 'ther', 'alarm'):
        x = drone(d, 36 if st != 'alarm' else 40) * (.5 if st == 'drone' else .35); at(mus, x, t0)
        if st == 'ther': at(mus, ther([(r.integers(60, 72), r.uniform(.6, 1.2)) for _ in range(int(d) + 1)])[:int(d * SR)] * .3, t0)
    elif st == 'sting':
        at(mus, sum(sin(hz(m), 1.4) for m in (50, 53, 56, 59)) * env_exp(1.4, .5) * .35, t0)
# fades at every cue change
g = np.ones(N)
for sg in segs:
    if not STY.get(sg['mood'], 'samba'): g[int(sg['t0'] * SR):int(sg['t1'] * SR)] = 0
mus *= uniform_filter1d(g, int(.1 * SR)); mus = mus + .25 * np.roll(lp(mus, 3000), int(.03 * SR))

# ———————————————— sfx ————————————————
fx = np.zeros((N, 2))
for e in E:
    if e['type'] != 'sfx': continue
    f = FX.get(e['name'])
    if f is None: print('missing sfx', e['name']); continue
    x = np.asarray(f(), dtype=float)
    if len(x) < 2: continue
    add(fx, x, e['t'], db(-14 + e['g']), e['pan'])
add(fx, lp(brown(DUR + 1), 220)[:N], 0, db(-50), 0)

# ———————————————— voices ————————————————
vo = np.zeros(N)
for e in E:
    if e['type'] != 'line': continue
    w, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'), dtype='float32'); w = w if w.ndim == 1 else w.mean(1)
    w = soxr.resample(w, sr, SR); s = int(e['t'] * SR); n = min(len(w), N - s); vo[s:s + n] += w[:n]
extra = os.path.join(HERE, 'out', f'karaoke{EP}.npy')
if os.path.exists(extra): k = np.load(extra); vo[:len(k)] += k[:N]
vo = hp(vo, 90)
def comp(x, thr_db=-22, ratio=3.):
    e = np.sqrt(uniform_filter1d(x ** 2, int(.02 * SR)) + 1e-12); ed = 20 * np.log10(e)
    gdb = np.where(ed > thr_db, (thr_db - ed) * (1 - 1 / ratio), 0); gdb = uniform_filter1d(gdb, int(.01 * SR)); return x * db(gdb)
vo = comp(vo); act = np.abs(vo) > 1e-4; vo *= db(-15) / rms(vo[act])
ma = np.abs(mus) > 1e-4; mus *= db(-26) / rms(mus[ma]) if ma.any() else 1
fa = np.abs(fx).max(1) > 1e-4; fx *= db(-20) / rms(fx[fa])
speak = uniform_filter1d(maximum_filter1d((np.abs(vo) > 1e-3).astype(float), int(.25 * SR)), int(.2 * SR))
mus *= db(-7 * speak); fx *= db(-3 * speak)[:, None]
mix = np.stack([mus * .95 + fx[:, 0] + vo, mus * 1.0 + fx[:, 1] + vo], 1)
mix[-SR:] = 0
mix = np.stack([limit(mix[:, c], .89) for c in (0, 1)], 1)
sf.write(os.path.join(HERE, 'out', f'mix{EP}.wav'), mix[:int(round(DUR * SR))].astype(np.float32), SR)
print('mix', EP, round(DUR, 2), 'cues', len(segs))
