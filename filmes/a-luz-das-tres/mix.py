"""A Luz das Três — score + foley + narration for the whole timeline → out/mix.wav.
python mix.py    (run with the library's .venv python; LIB = library folder)"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or '/home/user/lemomo-ai/lemo-opuscar'
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio import pluck as PL
from core.audio.sfx import SR, add, bp, lp, hp, noise, brown, norm, t_, env_exp, whoosh, thump, limit, pop, creak, step
from scipy.ndimage import uniform_filter1d, maximum_filter1d

TL = json.load(open(os.path.join(HERE, 'timeline.json')))
H, L, DUR = TL['HIT'], TL['L'], TL['DUR']
N = int(DUR * SR) + SR
tt = np.arange(N) / SR
S.seed(5); rng = np.random.default_rng(4)
def db(x): return 10 ** (x / 20)
def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
def env_lin(pts): xs, ys = zip(*pts); return np.interp(tt, xs, ys)
B = 60 / 72

# ———————————————— score ————————————————
ev = []                                  # sampled strings
def n(t, inst, p, d, v, pan=0., **k): ev.append(dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, **k))
mus = np.zeros((N, 2))
def pl(t, preset, p, v=.5, pan=0., g=1., **k):   # plucked / modelled (music box, harp, nylon guitar)
    x = PL.pluck(preset, p, vel=v, **k); add(mus, x, t, g, pan)

# 0–34: the music box alone (the window), then a harp under the street
TUNE = [('A5', 1), ('F#5', .5), ('E5', .5), ('D5', 1), ('E5', 1), ('F#5', 1.5), ('A5', .5), ('B5', 2),
        ('A5', 1), ('F#5', 1), ('D5', 1.5), ('E5', .5), ('D5', 3)]
def tune(a, preset='music_box', v=.5, g=1., oct=0, pan=.2):
    t = a
    for p, d in TUNE:
        if oct: p = p[:-1] + str(int(p[-1]) + oct)
        pl(t, preset, p, v, pan, g); t += d * B
    return t
pl(H['pin'], 'music_box', 'D6', .45, .1)
tune(2.2, g=.9)
CH = [['D3', 'A3', 'D4', 'F#4'], ['B2', 'F#3', 'B3', 'D4'], ['G2', 'D3', 'G3', 'B3'], ['A2', 'E3', 'A3', 'C#4']]
def arps(a, b, preset='harp', v=.42, g=.8, pat=(0, 2, 1, 3, 2, 1, 3, 2), pan=-.25):
    k = 0; t = a
    while t < b - .05:
        ch = CH[int((t - a) // (4 * B)) % 4]; pl(t, preset, ch[pat[k % len(pat)]], v * (1.12 if k % 8 == 0 else 1), pan, g); t += B / 2; k += 1
arps(10.0, 34.4)
tune(16.7, g=.75); tune(27.0, g=.7, oct=-1)
for p, v in [('D3', .2), ('A3', .18), ('F#4', .16)]: n(10.0, 'cellos' if p == 'D3' else 'violas', p, 24.0, v, 0, attack=2.5, release=1.0)
# 35–47: silence (the bells are diegetic); 46.5: low strings creep in under the knock
for p, v in [('D2', .22), ('A2', .2)]: n(46.4, 'cellos', p, 7.0, v, 0, attack=2.5, release=1.2)
for p, v in [('D3', .2), ('F#3', .18), ('A3', .18), ('D4', .16)]: n(51.6, 'violas' if p != 'D3' else 'cellos', p, 8.6, v, 0, attack=1.0, release=1.6)
for k, p in enumerate(['D5', 'F#5', 'A5']): pl(51.7 + k * .12, 'music_box', p, .4, .2, .7)
pl(57.6, 'music_box', 'A5', .38, .1, .7); pl(58.1, 'music_box', 'D6', .38, .15, .7)
# 60.2–73.6: the kitchen: nylon guitar fingerpicking, the tune on music box, strings under
arps(60.2, 73.4, 'nylon_guitar', .5, .9, (0, 2, 3, 2, 1, 2, 3, 2), -.15)
tune(63.5, g=.7, v=.45)
for k in range(4): ch = CH[k % 4]; n(60.2 + k * 4 * B, 'cellos', ch[0], 4 * B * .95, .2, -.1, attack=.3, release=.8)
for k, t in enumerate(H['strips']): pl(t, 'music_box', ['F#5', 'A5', 'B5', 'D6'][k], .42, .25, .8)
# 73.6–: today: one note per window rising, strings swell to the line, a held chord, then one last note on the title
UP = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'B5', 'D6', 'E6', 'F#6', 'A6']
for k, t in enumerate(H['wins']): pl(t, 'music_box', UP[k], .44 + .01 * k, -.3 + .045 * k, .85)
arps(73.8, 84.4, 'harp', .4, .75)
for p, v, pan in [('D3', .22, -.3), ('A3', .2, -.1), ('F#4', .2, .1), ('A4', .18, .25), ('D5', .17, .3)]:
    n(76.0, 'cellos' if p in ('D3', 'A3') else 'violas' if p == 'F#4' else 'violins', p, 8.6, v, pan, attack=3.5, release=2.2)
for k, p in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4', 'D5']): pl(80.2 + k * .07, 'harp', p, .5, -.2 + k * .07, .8)
pl(H['title'] + .1, 'music_box', 'D6', .5, 0, .9); pl(H['title'] + .1 + 1.5 * B, 'music_box', 'A5', .42, .1, .8); pl(H['title'] + .1 + 3 * B, 'music_box', 'D5', .4, .1, .8)

strings = S.render(ev, dur=DUR + 1); strings = np.pad(strings, ((0, max(0, N - len(strings))), (0, 0)))[:N]
music = mus + strings * db(-3)
music = S.room(music, size=.55, mix=.22); music = np.pad(music, ((0, max(0, N - len(music))), (0, 0)))[:N]
music *= env_lin([(0, 1), (34.2, 1), (35.1, 0), (46.3, 0), (46.4, 1), (DUR + 1, 1)])[:, None]

# ———————————————— foley ————————————————
fx = np.zeros((N, 2))
def tick(v=1.):
    d = .03; x = t_(d); return norm(hp(noise(d), 3000) * env_exp(d, .002) + np.sin(2 * np.pi * 2600 * x) * env_exp(d, .004) * .4) * v
def shimmer(d=1.2, f0=1800):
    x = t_(d); s = sum(np.sin(2 * np.pi * f0 * m * (1 + .2 * x / d) * x + m) / m for m in (1, 1.5, 2, 3)) * np.sin(np.pi * x / d) ** 2 * np.exp(-x / d); return norm(s)
def bell(f=196., d=6.):
    x = t_(d); s = sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x / (d * k)) for r, a, k in [(1, 1, .5), (2.0, .5, .35), (2.4, .4, .3), (3.0, .3, .2), (4.2, .2, .12), (.5, .4, .6)])
    return norm(lp(s, 3000))
def knock(v=1.):
    d = .16; x = t_(d); return norm(lp(noise(d), 900) * env_exp(d, .01) + np.sin(2 * np.pi * 120 * x) * env_exp(d, .035) * 1.2 + np.sin(2 * np.pi * 240 * x) * env_exp(d, .015) * .5) * v
def paper(d=.8):
    x = t_(d); return norm(bp(noise(d), 1500, 7000) * np.sin(np.pi * x / d) ** 1.5 * (.6 + .4 * np.abs(np.sin(2 * np.pi * 13 * x))))
def crickets(d):
    x = t_(d); out = np.zeros_like(x)
    for f, rate, ph in [(4300, 2.3, 0), (4700, 1.7, .4), (3900, 2.9, .8)]:
        gate = (np.sin(2 * np.pi * rate * x + ph * 6) > .55) * (np.sin(2 * np.pi * 28 * x) > 0)
        out += np.sin(2 * np.pi * f * x) * uniform_filter1d(gate.astype(float), 60)
    return out / 3
def crackle(d):
    x = np.zeros(int(d * SR)); idx = rng.integers(0, len(x), int(d * 40)); x[idx] = rng.uniform(-1, 1, len(idx)); return lp(hp(x, 1500), 7000) + lp(brown(d), 300) * .3
# beds: crickets outside; room tone in the dead night and inside; the oven crackle in the kitchen
cr = crickets(DUR + 1)[:N]
add(fx, cr * env_lin([(0, 0), (2, .5), (9, .9), (34, .9), (35.2, .5), (41.0, .4), (41.4, 0), (73.4, 0), (74.4, 1), (84, 1), (88, .3), (DUR + 1, 0)]) * db(-36), 0, 1, .3)
roomt = lp(brown(DUR + 1), 180)[:N]; add(fx, roomt * db(-44), 0, 1, 0)
wind = bp(noise(DUR + 1), 200, 1200)[:N] * (.6 + .4 * np.sin(2 * np.pi * tt / 5.1))
add(fx, wind * env_lin([(0, .5), (34, .6), (41.4, .5), (41.5, 0), (43.3, 0), (44.5, .5), (53, .5), (53.6, 0), (73.6, 0), (74.6, .5), (DUR + 1, .4)]) * db(-40), 0, 1, -.2)
ov = crackle(DUR + 1)[:N]
add(fx, ov * env_lin([(0, 0), (53, 0), (54, .35), (60, .4), (61, 1), (72.6, 1), (73.2, 1.6), (74.3, .4), (75.3, 0), (DUR + 1, 0)]) * db(-34), 0, 1, .4)   # L-cut over the flash into S7
# S1: the pinprick (a switch click + shimmer), the iris
add(fx, tick(), H['pin'] - .02, db(-28), 0); add(fx, shimmer(1.4), H['pin'], db(-36), 0)
add(fx, whoosh(1.8), H['iris'][0] + 1.6, db(-34), 0)
# S3: the nurse's steps, the bike (chain whirr), the bus (engine J-cut before it is seen, brakes)
for k in range(12):
    t = H['nurse'][0] + k * .0105 * 2 / .026; add(fx, step(.7), t, db(-35), -.3 + k * .03)
bkd = H['boy'][1] - H['boy'][0] + .6
add(fx, bp(noise(bkd), 3000, 8000) * (np.abs(np.sin(2 * np.pi * 7 * t_(bkd))) ** 6) * np.sin(np.pi * t_(bkd) / bkd), H['boy'][0] - .2, db(-36), .2)
add(fx, tick(.8), H['boy'][0] + .9, db(-32), .1); add(fx, tick(.8), H['boy'][0] + 1.05, db(-34), .1)   # the bell on the bike
eng_d = 35.4 - 28.6; ex = t_(eng_d)
eng = lp(np.sign(np.sin(2 * np.pi * (38 + 6 * np.sin(ex * .4)) * ex)) * .6 + brown(eng_d)[:len(ex)] * 2, 260)
add(fx, norm(eng) * np.interp(ex, [0, 1, 4.8, 5.6, eng_d], [0, .5, 1, .5, .3]), 28.6, db(-28), -.4)
add(fx, norm(bp(noise(1.4), 2500, 8000) * np.exp(-t_(1.4) / .5)), 33.2, db(-32), -.1)   # air brakes
# S4: three bells on the hill, far; then nothing; steps; the bike stops; he gets off
for k, t in enumerate(H['bells']): add(fx, bell(196 if k < 2 else 174.6), t, db(-24), .45)
for k in range(6): add(fx, step(.7), H['nurse2'][0] + k * .0105 * 2 / .032, db(-33), -.35 + k * .05)
add(fx, tick(.6), H['boy2'][1], db(-34), .25); add(fx, thump(.5, 110), H['boy2'][1] + .45, db(-34), .25)
# S5: three knocks (the first sound after the silence), the door slides, light
for t in H['knock']: add(fx, knock(), t, db(-18), -.05)
add(fx, creak(), H['open'], db(-28), 0); add(fx, whoosh(1.2), H['open'] + .1, db(-30), 0); add(fx, shimmer(1.6, 1400), H['open'] + .3, db(-36), 0)
# S6: the bread: dough balls on the tray, paper strips growing, the oven door and the blaze
for i in range(9): add(fx, pop(.5), 61.5 + i * .55, db(-36), .1)
for t in H['strips']: add(fx, paper(.9), t, db(-32), -.2)
add(fx, thump(.7, 90), H['oven'] - .1, db(-28), .4); add(fx, whoosh(1.4), H['oven'], db(-24), .4)
# S7: a click per window as it lights; the pull out; the title strip
for k, t in enumerate(H['wins']): add(fx, tick(.7), t, db(-36), -.3 + .045 * k)
add(fx, whoosh(2.5), H['pull'] + .5, db(-38), 0)
add(fx, paper(1.1), H['title'], db(-32), -.2)
fx *= env_lin([(0, 1), (DUR - .6, 1), (DUR, 0), (DUR + 1, 0)])[:, None]

# ———————————————— voice ————————————————
vo = np.zeros(N)
for i, l in L.items():
    w, sr = sf.read(os.path.join(HERE, 'voices', i + '.wav'), dtype='float32')
    if w.ndim > 1: w = w.mean(1)
    w = soxr.resample(w, sr, SR); s = int(l['at'] * SR); vo[s:s + len(w)] += w[:N - s]
vo = hp(vo, 80)
def comp(x, thr_db=-24, ratio=3.):
    e = np.sqrt(uniform_filter1d(x ** 2, int(.02 * SR)) + 1e-12); ed = 20 * np.log10(e)
    gdb = np.where(ed > thr_db, (thr_db - ed) * (1 - 1 / ratio), 0); gdb = uniform_filter1d(gdb, int(.01 * SR)); return x * db(gdb)
vo = comp(vo); act = np.abs(vo) > 1e-4; vo *= db(-18) / rms(vo[act])
mact = np.abs(music).max(1) > 1e-4; music *= db(-28) / rms(music[mact])
speak = uniform_filter1d(maximum_filter1d((np.abs(vo) > 1e-3).astype(float), int(.25 * SR)), int(.25 * SR))
music = music * db(-5.5 * speak)[:, None]
mix = music + fx + vo[:, None]
mix *= env_lin([(0, 1), (DUR - .6, 1), (DUR, 0), (DUR + 1, 0)])[:, None]
mix = np.stack([limit(mix[:, c], .89) for c in (0, 1)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix[:int(DUR * SR)].astype(np.float32), SR); print('full', DUR)
print('instruments', sorted({e['inst'] for e in ev}))
