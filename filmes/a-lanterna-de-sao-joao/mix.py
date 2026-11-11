"""A Lanterna de São João — score + foley + narration for the whole timeline → out/mix.wav.
python mix.py    (run with the library's .venv python; LIB = library folder)"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or '/home/user/lemomo-ai/lemo-opuscar'
sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio import pluck as PL
from core.audio.sfx import SR, add, bp, lp, hp, noise, brown, norm, t_, env_exp, whoosh, thump, limit, creak, step
from scipy.ndimage import uniform_filter1d, maximum_filter1d

TL = json.load(open(os.path.join(HERE, 'timeline.json')))
H, L, DUR = TL['HIT'], TL['L'], TL['DUR']
N = int(DUR * SR) + SR
tt = np.arange(N) / SR
S.seed(7); rng = np.random.default_rng(9)
def db(x): return 10 ** (x / 20)
def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
def env_lin(pts): xs, ys = zip(*pts); return np.interp(tt, xs, ys)

# ———————————————— score ————————————————
ev = []                                  # sampled: accordion, strings
def n(t, inst, p, d, v, pan=0., **k): ev.append(dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, **k))
mus = np.zeros((N, 2))
def pl(t, preset, p, v=.5, pan=0., g=1., **k): add(mus, PL.pluck(preset, p, vel=v, **k), t, g, pan)
# the letter's theme (D mixolydian: the C natural is the baião colour)
THEME = [('A4', 1), ('D5', 1), ('F#5', 1.5), ('E5', .5), ('D5', 1), ('C5', 1), ('B4', 1.5), ('A4', .5), ('G4', 1), ('B4', 1), ('A4', 2)]
def theme_pl(a, B, preset='music_box', v=.5, g=1., oct=0, pan=.2):
    t = a
    for p, d in THEME:
        if oct: p = p[:-1] + str(int(p[-1]) + oct)
        pl(t, preset, p, v, pan, g); t += d * B
    return t
def theme_acc(a, B, v=.4, oct=0, pan=.15, inst='accordion'):
    t = a
    for p, d in THEME:
        if oct: p = p[:-1] + str(int(p[-1]) + oct)
        n(t, inst, p, d * B * .96, v, pan, attack=.05, release=.25); t += d * B
    return t
CH = [['D3', 'A3', 'D4', 'F#4'], ['C3', 'G3', 'C4', 'E4'], ['G2', 'D3', 'G3', 'B3'], ['D3', 'A3', 'D4', 'F#4']]
# cover: a harp run up to one music-box note
for k, p in enumerate(['D4', 'F#4', 'A4', 'D5', 'F#5']): pl(.15 + k * .08, 'harp', p, .45, -.2 + k * .1, .8)
pl(.75, 'music_box', 'A5', .5, .1, .9)
# the post office: a few lazy guitar notes
for t, p in [(2.6, 'D3'), (3.6, 'A3'), (5.2, 'F#3'), (9.9, 'D3'), (10.4, 'A3'), (10.9, 'D4'), (13.0, 'C4'), (15.2, 'A3'), (16.0, 'D4')]: pl(t, 'nylon_guitar', p, .45, -.15, .8)
# the envelope: the theme on the music box, a cello under it
theme_pl(18.0, .76, g=.9)
for p, v in [('D2', .2), ('A2', .18)]: n(17.6, 'cellos', p, 10.0, v, 0, attack=2.0, release=1.5)
# the ride: baião. zabumba 3+3+2, triangle on every sixteenth, guitar chords, then the accordion takes the theme
B = .6; S16 = B / 4
def zab_lo(v=1.): d = .45; x = t_(d); return norm(np.sin(2 * np.pi * 62 * x) * env_exp(d, .11) + lp(noise(d), 400) * env_exp(d, .02) * .5) * v
def zab_hi(v=1.): d = .14; return norm(hp(noise(d), 1500) * env_exp(d, .012) + np.sin(2 * np.pi * 330 * t_(d)) * env_exp(d, .015) * .5) * v
def tri(v=1., open_=False): d = .5 if open_ else .09; x = t_(d); return norm(sum(np.sin(2 * np.pi * f * x) * a for f, a in [(4100, 1), (5600, .7), (7300, .5)]) * env_exp(d, .18 if open_ else .02)) * v
R0, R1 = H['ride'][0] - .6, H['ride'][1] + .2
k, t = 0, R0
while t < R1:
    bar, s = k // 8, k % 8; g = np.interp(t, [R0, R0 + 1.2, 34.0, 34.4, R1 - 2.5, R1], [0, .7, .7, 1, 1, .15])
    if s in (0, 3): add(mus, zab_lo(.9 if s == 0 else .7), t, .55 * g, -.1)
    if s == 6: add(mus, zab_hi(.8), t, .3 * g, -.1)
    add(mus, tri(.6 + .3 * (s % 4 == 2), s % 4 == 2), t, .1 * g, .45)
    if s in (0, 3, 6): ch = CH[bar % 4]; [pl(t + j * .012, 'nylon_guitar', p, .4, -.25, .45 * g) for j, p in enumerate(ch[1:])]
    if s == 0: pl(t, 'nylon_guitar', CH[bar % 4][0], .6, -.25, .6 * g)
    t += S16; k += 1
theme_acc(34.4, B, .42); theme_acc(34.4 + 12 * B, B, .4, oct=0)
# the river: the band is left behind; slow harp, a low cello, the accordion far away
for i, t in enumerate(np.arange(46.0, 62.0, 1.35)):
    ch = CH[(i // 4) % 4]; pl(t, 'harp', ch[[0, 2, 1, 3][i % 4]], .38, -.2 + .1 * (i % 4), .7)
for p, v in [('D2', .22), ('A2', .18)]: n(45.4, 'cellos', p, 17.0, v, 0, attack=3.0, release=2.0)
n(52.0, 'accordion', 'A4', 2.6, .16, .5, attack=.4, release=.8); n(58.4, 'accordion', 'D5', 3.0, .14, .5, attack=.5, release=1.0)
# the door: soft strings once it opens
for p, v in [('D3', .2), ('F#3', .18), ('A3', .18)]: n(H['open'] + .2, 'violas' if p != 'D3' else 'cellos', p, 12.6, v, 0, attack=1.5, release=1.6)
pl(H['hand'], 'music_box', 'A5', .4, .1, .7); pl(H['hand'] + .5, 'music_box', 'D6', .38, .15, .7)
# the letter: the theme again, lower strings
theme_pl(78.4, .82, g=.85)
for p, v in [('D2', .2), ('A2', .18), ('F#3', .16)]: n(77.8, 'cellos' if p != 'F#3' else 'violas', p, 10.4, v, 0, attack=2.0, release=1.6)
pl(H['lanternDraw'] + .2, 'harp', 'D5', .4, .3, .7)
# forty São Joãos: one low held note; she lights it: one harp note; then nothing
n(89.6, 'cellos', 'D2', 10.2, .17, 0, attack=3.0, release=.6)
pl(H['light'] + .1, 'harp', 'D5', .5, -.2, .9); pl(H['light'] + .35, 'harp', 'A5', .4, -.1, .7)
# the answer: the accordion alone, slowly; strings join; the light crosses the water one harp note per streak; a last chord
theme_acc(H['answer'] + .3, .86, .34, pan=.3)
for p, v, pan in [('D3', .22, -.3), ('A3', .2, -.1), ('F#4', .2, .1), ('A4', .18, .25), ('D5', .16, .3)]:
    n(108.0, 'cellos' if p in ('D3', 'A3') else 'violas' if p == 'F#4' else 'violins', p, 10.6, v, pan, attack=3.2, release=2.4)
BR = ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5']
for i, p in enumerate(BR): pl(H['bridge'][0] + (H['bridge'][1] - H['bridge'][0]) * i / 9 + .1, 'harp', p, .42 + .01 * i, .3 - .07 * i, .8)
for k2, p in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4', 'D5']): pl(H['pull'] + k2 * .08, 'harp', p, .5, -.2 + k2 * .07, .8)
pl(117.4, 'music_box', 'A5', .5, 0, .9); pl(118.1, 'music_box', 'D6', .45, .1, .8)

smp = S.render(ev, dur=DUR + 1); smp = np.pad(smp, ((0, max(0, N - len(smp))), (0, 0)))[:N]
music = mus + smp * db(-2)
music = S.room(music, size=.55, mix=.22); music = np.pad(music, ((0, max(0, N - len(music))), (0, 0)))[:N]
# the real silence between her lantern and his
music *= env_lin([(0, 1), (H['light'] + 1.4, 1), (H['light'] + 2.2, 0), (H['answer'] + .2, 0), (H['answer'] + .3, 1), (DUR + 1, 1)])[:, None]

# ———————————————— foley ————————————————
fx = np.zeros((N, 2))
def tick(v=1.): d = .03; x = t_(d); return norm(hp(noise(d), 3000) * env_exp(d, .002) + np.sin(2 * np.pi * 2600 * x) * env_exp(d, .004) * .4) * v
def shimmer(d=1.2, f0=1800): x = t_(d); s = sum(np.sin(2 * np.pi * f0 * m * (1 + .2 * x / d) * x + m) / m for m in (1, 1.5, 2, 3)) * np.sin(np.pi * x / d) ** 2 * np.exp(-x / d); return norm(s)
def knock(v=1.): d = .16; x = t_(d); return norm(lp(noise(d), 900) * env_exp(d, .01) + np.sin(2 * np.pi * 120 * x) * env_exp(d, .035) * 1.2 + np.sin(2 * np.pi * 240 * x) * env_exp(d, .015) * .5) * v
def paper(d=.8): x = t_(d); return norm(bp(noise(d), 1500, 7000) * np.sin(np.pi * x / d) ** 1.5 * (.6 + .4 * np.abs(np.sin(2 * np.pi * 13 * x))))
def drag(d=1.5): x = t_(d); return norm(lp(brown(d), 300) * np.sin(np.pi * x / d) ** .6 * (1 + .5 * np.sin(2 * np.pi * 9 * x)) + bp(noise(d), 300, 1200) * .3 * np.sin(np.pi * x / d) * (np.sin(2 * np.pi * 17 * x) > 0))
def scratch(d=1.2): x = t_(d); return norm(bp(noise(d), 2500, 7000) * (.4 + .6 * np.abs(np.sin(2 * np.pi * 6.5 * x))) * np.minimum(1, x / .05) * np.minimum(1, (d - x) / .1))
def splash(v=1.): d = .7; x = t_(d); return norm(bp(noise(d), 500, 4000) * np.minimum(1, x / .04) * np.exp(-x / .22) + lp(noise(d), 500) * env_exp(d, .08) * .6) * v
def match(): d = .9; x = t_(d); return norm(hp(noise(d), 3500) * (np.exp(-x / .05) + .5 * np.exp(-((x - .25) / .12) ** 2)) + bp(noise(d), 400, 1500) * .3 * np.exp(-((x - .35) / .2) ** 2))
def rojao(v=1.): d = 1.6; x = t_(d); return norm(hp(noise(d), 2500) * np.where(x < .5, x / .5 * .25, 0) + lp(noise(d), 350) * np.where(x >= .5, np.exp(-(x - .5) / .25), 0) * 1.4) * v
def bell(): d = .5; x = t_(d); return norm((np.sin(2 * np.pi * 2300 * x) + .6 * np.sin(2 * np.pi * 3450 * x)) * env_exp(d, .12))
def crickets(d):
    x = t_(d); out = np.zeros_like(x)
    for f, rate, ph in [(4300, 2.3, 0), (4700, 1.7, .4), (3900, 2.9, .8)]:
        gate = (np.sin(2 * np.pi * rate * x + ph * 6) > .55) * (np.sin(2 * np.pi * 28 * x) > 0); out += np.sin(2 * np.pi * f * x) * uniform_filter1d(gate.astype(float), 60)
    return out / 3
def crackle(d): x = np.zeros(int(d * SR)); idx = rng.integers(0, len(x), int(d * 45)); x[idx] = rng.uniform(-1, 1, len(idx)); return lp(hp(x, 1500), 7000) + lp(brown(d), 300) * .3
# beds
roomt = lp(brown(DUR + 1), 180)[:N]; add(fx, roomt * db(-44), 0, 1, 0)
cr = crickets(DUR + 1)[:N]
add(fx, cr * env_lin([(0, 0), (27, 0), (29, .5), (45, .5), (47, .25), (62, .3), (63, .8), (77, .8), (78, 0), (88, 0), (89.5, .8), (100, .6), (101.5, .25), (105, .25), (108, .7), (115, .7), (119, .2), (DUR + 1, 0)]) * db(-37), 0, 1, .3)
water = bp(brown(DUR + 1), 150, 1800)[:N] * (.55 + .45 * np.sin(2 * np.pi * tt / 3.7) ** 2) * (.8 + .2 * np.sin(2 * np.pi * tt / 1.3))
add(fx, water * env_lin([(0, 0), (43.5, 0), (45.5, 1), (62, 1), (63.5, .35), (77, .35), (78, 0), (88, 0), (89.5, .7), (115, .7), (119, .2), (DUR + 1, 0)]) * db(-33), 0, 1, -.2)
festa = bp(noise(DUR + 1), 300, 1500)[:N] * (.6 + .4 * np.sin(2 * np.pi * tt / 2.9))          # the far murmur of the festival
add(fx, festa * env_lin([(0, 0), (27, 0), (29, .8), (44, .8), (47, .3), (60, .1), (63, 0), (DUR + 1, 0)]) * db(-41), 0, 1, .1)
fire = crackle(DUR + 1)[:N]; fenv = np.zeros(N)
for ft in H['fires']: fenv = np.maximum(fenv, np.exp(-((tt - ft) / 1.3) ** 2))
add(fx, fire * fenv * db(-27), 0, 1, .3)
clock = np.zeros(N)
for k3 in range(int((17.4 - 2.2) / .5)): s0 = int((2.4 + k3 * .5) * SR); x = tick(.5 if k3 % 2 else .35); clock[s0:s0 + len(x)] += x
add(fx, clock * db(-40), 0, 1, -.5)
# cover + post office
add(fx, paper(.9), .1, db(-30), -.1)
for k3 in range(5): add(fx, step(.7), 2.5 + k3 * .38, db(-34), -.3 + k3 * .1)
for k3 in range(3): add(fx, drag(1.5), H['push'][0] + k3 * (H['push'][1] - H['push'][0]) / 3, db(-22), .2); add(fx, creak(), H['push'][0] + k3 * 1.6 + .2, db(-32), .2)
add(fx, thump(.6, 80), H['push'][1], db(-26), .25)
add(fx, shimmer(1.4), H['glint'], db(-32), .15); add(fx, paper(.7), H['pick'] - .1, db(-30), .1)
# the envelope: three strips of paper sliding out
for t in H['addr']: add(fx, paper(1.0), t, db(-31), -.1)
# the ride: bell, chain, rockets far away
add(fx, bell(), H['ride'][0] + .25, db(-28), -.2); add(fx, bell(), H['ride'][0] + .5, db(-30), -.2)
rd = H['ride'][1] - H['ride'][0]; x = t_(rd); add(fx, bp(noise(rd), 3000, 8000) * (np.abs(np.sin(2 * np.pi * 8 * x)) ** 6) * np.minimum(1, x / 1) * np.minimum(1, (rd - x) / 1), H['ride'][0], db(-38), 0)
for t, v in [(31.2, .8), (36.2, .6), (39.4, .9), (43.0, .6), (50.5, .35), (57.0, .25)]: add(fx, rojao(v), t, db(-27), rng.uniform(-.5, .5))
# the river: one splash per stroke
for t in H['strokes']: add(fx, splash(.8), t + .55, db(-27), -.1); add(fx, creak(), t, db(-40), -.1)
add(fx, thump(.5, 90), H['row'][1] - .3, db(-30), .3)                                  # the canoe touches the pier
# the door
for k3 in range(4): add(fx, step(.7), 62.4 + k3 * .16, db(-33), .1)
for t in H['knock']: add(fx, knock(), t, db(-19), -.05)
add(fx, creak(), H['open'], db(-27), -.1); add(fx, shimmer(1.4, 1400), H['open'] + .3, db(-38), -.1); add(fx, paper(.8), H['hand'] - .1, db(-30), 0)
# the letter: the pen
for t in H['ink']: add(fx, scratch(1.3), t, db(-31), -.1)
add(fx, shimmer(1.6), H['lanternDraw'], db(-34), .3)
# the lanterns: a match, a small flare; then, far away, the same
add(fx, match(), H['light'] - .5, db(-22), -.15); add(fx, shimmer(1.6, 1500), H['light'], db(-33), -.15)
add(fx, match(), H['answer'] - .1, db(-36), .3); add(fx, shimmer(2.4, 1300), H['answer'] + .4, db(-36), .3)
for i in range(9): add(fx, tick(.5), H['bridge'][0] + (H['bridge'][1] - H['bridge'][0]) * i / 9, db(-40), .3 - .07 * i)
add(fx, whoosh(2.5), H['pull'] + .4, db(-38), 0)
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
mact = np.abs(music).max(1) > 1e-4; music *= db(-27) / rms(music[mact])
speak = uniform_filter1d(maximum_filter1d((np.abs(vo) > 1e-3).astype(float), int(.25 * SR)), int(.25 * SR))
music = music * db(-5.5 * speak)[:, None]
mix = music + fx + vo[:, None]
mix *= env_lin([(0, 1), (DUR - .5, 1), (DUR, 0), (DUR + 1, 0)])[:, None]
mix = np.stack([limit(mix[:, c], .89) for c in (0, 1)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix[:int(DUR * SR)].astype(np.float32), SR); print('full', DUR)
print('instruments', sorted({e['inst'] for e in ev}))
