"""O Pastel Real — score (Korean-inspired, original), comic SFX and voices for one part → out/mix<part>.wav.
python mix.py <part>   (reads out/ev<part>.json written by core/render/events.mjs; run with the library's .venv python)"""
import sys, os, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or '/home/user/lemomo-ai/lemo-opuscar'
sys.path.insert(0, LIB)
from core.audio import sampler as SM
from core.audio import pluck as PL
from core.audio.sfx import SR, add, bp, lp, hp, noise, brown, norm, t_, env_exp, whoosh, thump, limit, pop as pop_, creak, step
from scipy.ndimage import uniform_filter1d, maximum_filter1d

PART = int(sys.argv[1]) if len(sys.argv) > 1 else 1
EV = json.load(open(os.path.join(HERE, 'out', f'ev{PART}.json')))
DUR = EV['dur']; E = EV['ev']
N = int(DUR * SR) + SR; tt = np.arange(N) / SR
rng = np.random.default_rng(PART); SM.seed(PART)
def db(x): return 10 ** (x / 20)
def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-12)
def sin(f, d, ph=0): return np.sin(2 * np.pi * f * t_(d) + ph)
def env_ad(d, a=.005, r=None): x = t_(d); e = np.minimum(1, x / max(a, 1e-4)); return e * (np.exp(-x / r) if r else 1)
def chirp(f0, f1, d, shape='lin'):
    x = t_(d); f = f0 + (f1 - f0) * (x / d if shape == 'lin' else (x / d) ** 2); return np.sin(2 * np.pi * np.cumsum(f) / SR)

# ———————————————— comic SFX (all synthesised) ————————————————
def janggu_deong(v=1.): d = .5; return norm(sin(70, d) * env_exp(d, .12) * 1.2 + lp(noise(d), 1200) * env_exp(d, .03) + hp(noise(d), 2500) * env_exp(d, .015) * .5) * v
def janggu_kung(v=1.): d = .4; return norm(sin(85 * 1, d) * env_exp(d, .1) + lp(noise(d), 700) * env_exp(d, .02) * .5) * v
def janggu_deok(v=1.): d = .15; return norm(hp(noise(d), 1800) * env_exp(d, .012) + sin(420, d) * env_exp(d, .01) * .4) * v
def kkwaeng(v=1.): d = .5; x = t_(d); s = sum(np.sin(2 * np.pi * f * x) * a for f, a in [(1150, 1), (1730, .7), (2480, .5), (3310, .3)]); return norm(s * env_exp(d, .09) + hp(noise(d), 4000) * env_exp(d, .01) * .4) * v
def jing(v=1., d=4.): x = t_(d); f = 110 * (1 - .02 * np.exp(-x * 2)); s = sum(np.sin(2 * np.pi * np.cumsum(f * r) / SR) * a * np.exp(-x / (d * k)) for r, a, k in [(1, 1, .5), (2.01, .4, .3), (2.76, .3, .25), (3.9, .15, .15)]); return norm(lp(s, 2500) * np.minimum(1, x / .02)) * v
def boing(v=1.): d = .6; x = t_(d); f = 220 + 160 * np.sin(2 * np.pi * 9 * x) * np.exp(-x * 4); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .25)) * v
def whistle(f0, f1, d=.7): return norm(chirp(f0, f1, d) * np.sin(np.pi * t_(d) / d) ** .5 * (1 + .1 * sin(6, d)))
def glint(): d = .5; return norm(sum(sin(f, d) / k for k, f in enumerate([2400, 3600, 4800], 1)) * env_exp(d, .12))
def sparkle(): out = np.zeros(int(.9 * SR)); [add1(out, glint() * .6, i * .08) for i in range(6)]; return norm(out)
def S_(*xs):
    n = max(len(x) for x in xs); return sum(np.pad(x, (0, n - len(x))) for x in xs)
def add1(buf, x, at): s = int(at * SR); n = min(len(x), len(buf) - s); buf[s:s + n] += x[:n]
def meow(v=1.): d = .7; x = t_(d); f = 500 + 350 * np.sin(np.pi * x / d) - 150 * x; s = sum(np.sin(2 * np.pi * np.cumsum(f * h) / SR) / h for h in (1, 2, 3, 4)); return norm(bp(s, 400, 4000) * np.sin(np.pi * x / d) ** .7) * v
def purr(): d = 1.6; return norm(lp(noise(d), 300) * (.5 + .5 * np.sign(sin(25, d))) * np.sin(np.pi * t_(d) / d))
def crash(): d = 1.0; return norm(hp(noise(d), 800) * env_exp(d, .25) + lp(noise(d), 400) * env_exp(d, .08)) + norm(sum(sin(f, d) for f in [900, 1330, 2100]) * env_exp(d, .2)) * .4
def boom(): d = 1.6; return norm(lp(brown(d), 200) * env_exp(d, .4) * 2 + lp(noise(d), 1500) * env_exp(d, .12) + sin(45, d) * env_exp(d, .3))
def thud(v=1.): d = .4; return norm(sin(60, d) * env_exp(d, .08) + lp(noise(d), 500) * env_exp(d, .03)) * v
def splat(): d = .4; return norm(lp(noise(d), 1500) * env_exp(d, .05) * (1 + sin(30, d)))
def slide(d=1.2): x = t_(d); return norm(bp(noise(d), 600, 3000) * np.sin(np.pi * x / d) ** .5 * (.7 + .3 * sin(13, d)))
def scurry(d=1.2): out = np.zeros(int(d * SR)); [add1(out, hp(noise(.03), 2500) * env_exp(.03, .006), i * .07 + rng.uniform(0, .02)) for i in range(int(d / .07))]; return norm(out)
def run(d=2.): out = np.zeros(int(d * SR)); [add1(out, thud(.6), i * .2) for i in range(int(d / .2))]; return norm(out)
def fwoosh(): d = 1.6; x = t_(d); return norm(bp(noise(d), 200, 3000) * np.minimum(1, x / .08) * np.exp(-x / .6) + lp(brown(d), 150) * np.exp(-x / .5))
def sizzle(d=1.5): x = t_(d); return norm(hp(noise(d), 3000) * (.6 + .4 * np.abs(noise(d)) ** 4) * np.minimum(1, x / .1) * np.exp(-x / 1.2))
def ding(): d = 1.4; return norm((sin(1760, d) + .5 * sin(3520, d) + .3 * sin(5280 * 1.01, d)) * env_exp(d, .35))
def tick(): d = .06; return norm(hp(noise(d), 2000) * env_exp(d, .006) + sin(1800, d) * env_exp(d, .01) * .5)
def slap(): d = .2; return norm(hp(noise(d), 800) * env_exp(d, .02))
def crack(): d = .3; return norm(hp(noise(d), 1500) * env_exp(d, .015) + sin(2600, d) * env_exp(d, .03) * .6)
def scrape(d=.7): return norm(bp(noise(d), 2000, 6000) * (.5 + .5 * np.abs(sin(20, d))))
def clang(): d = 1.2; return norm(sum(sin(f, d) * a for f, a in [(520, 1), (1310, .6), (1900, .4), (2870, .3)]) * env_exp(d, .25) + hp(noise(d), 3000) * env_exp(d, .01))
def sneeze(): d = .9; x = t_(d); a = bp(noise(d), 500, 2500) * np.where(x < .45, (x / .45) ** 2 * .4, 0); b = bp(noise(d), 1000, 6000) * np.where(x >= .45, np.exp(-(x - .45) / .08), 0); return norm(a + b * 2)
def plop(): d = .25; return norm(chirp(600, 200, d) * env_exp(d, .05))
def squish(): d = .6; return norm(lp(noise(d), 800) * (.5 + .5 * sin(16, d)) * np.sin(np.pi * t_(d) / d))
def screech(): d = .8; return norm(bp(noise(d), 2500, 6000) * np.sin(np.pi * t_(d) / d) + chirp(3000, 2600, d) * .3 * np.sin(np.pi * t_(d) / d))
def gulp(): d = .4; return norm(chirp(300, 90, d, 'sq') * env_exp(d, .1) + chirp(500, 180, d) * env_exp(d, .05) * .5)
def crunch(): out = np.zeros(int(.5 * SR)); [add1(out, hp(noise(.04), 1200) * env_exp(.04, .01) * rng.uniform(.5, 1), rng.uniform(0, .3)) for i in range(14)]; return norm(out)
def bonk(): d = .35; return norm(sin(280, d) * env_exp(d, .07) + sin(560, d) * env_exp(d, .03) * .5 + lp(noise(d), 1000) * env_exp(d, .01))
def _sadtb():
    out = np.zeros(int(2.8 * SR))
    for i, (f, d) in enumerate([(233, .5), (220, .5), (208, .5), (196, 1.2)]):
        x = t_(d); vib = 1 + (.03 * np.sin(2 * np.pi * 6 * x) if i == 3 else 0); s = sum(np.sin(2 * np.pi * np.cumsum(f * h * vib) / SR) / h for h in range(1, 7)); add1(out, lp(s, 2000) * np.minimum(1, x / .03) * np.minimum(1, (d - x) / .1), i * .55)
    return norm(out)
def rain(d=2.6): return norm(hp(noise(d), 1500) * np.sin(np.pi * t_(d) / d) ** .3)
def sigh(): d = 1.4; x = t_(d); return norm(bp(noise(d), 300, 2000) * np.sin(np.pi * x / d) ** 2)
def cricket(): d = 2.2; x = t_(d); return norm(sin(4400, d) * (np.sin(2 * np.pi * 3 * x) > .6) * (sin(30, d) > 0))
def fanfare():
    out = np.zeros(int(2.4 * SR))
    for i, (p, a, d) in enumerate([('G4', 0, .2), ('C5', .2, .2), ('D5', .4, .2), ('G5', .6, 1.4)]):
        add1(out, PL.pluck('koto', p, vel=.9), a)
    return norm(out)
def harp_up(): out = np.zeros(int(1.6 * SR)); [add1(out, PL.pluck('koto', p, vel=.7), i * .07) for i, p in enumerate(['G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6'])]; return norm(out)
def nom(): out = np.zeros(int(.7 * SR)); [add1(out, lp(noise(.08), 900) * env_exp(.08, .02), i * .18) for i in range(3)]; return norm(out)
def chime(): out = np.zeros(int(2.0 * SR)); [add1(out, glint(), i * .15) for i in range(5)]; return norm(out)
def firework(): d = 2.0; x = t_(d); out = np.where(x < .5, hp(noise(d), 3000) * (x / .5) * .3, 0); out = out + np.where(x >= .5, lp(noise(d), 300) * np.exp(-(x - .5) / .3), 0) * 1.5; cr = np.zeros(int(d * SR)); [add1(cr, hp(noise(.02), 3000) * .5, .6 + rng.uniform(0, 1.2)) for i in range(40)]; return norm(out + cr)
def laugh(): out = np.zeros(int(1.6 * SR)); [add1(out, bp(noise(.12), 500, 2200) * np.sin(np.pi * t_(.12) / .12) * (1 - i * .08), i * .16) for i in range(8)]; return norm(out)
def shiver(): d = 1.6; return norm(bp(noise(d), 200, 800) * (.5 + .5 * np.sign(sin(14, d))) * .6)
def kettle(): d = 1.6; return norm(sin(2200, d) * np.minimum(1, t_(d) / .4) * (1 + .1 * sin(9, d)) + hp(noise(d), 3000) * .2)
def birds(): out = np.zeros(int(1.6 * SR)); [add1(out, chirp(3000, 4200, .12) * env_exp(.12, .05), i * .2) for i in range(7)]; return norm(out)
def drums(): out = np.zeros(int(3.0 * SR)); [add1(out, S_(jing(1, .8) * .3, janggu_deong()), i * .57) for i in range(5)]; return norm(out)
def shock(): d = 1.0; return norm(jing(1, 1.0) * .6 + chirp(1200, 300, d) * env_exp(d, .3) * .3)
def sting(): return norm(jing(1, 3.5) + np.pad(janggu_deong(), (0, int(3.5 * SR) - int(.5 * SR))) * .8)
def tension(): d = 2.5; x = t_(d); return norm(sum(np.sin(2 * np.pi * f * x) for f in [110, 116.5]) * np.minimum(1, x / 1.5))
def freeze(): d = 1.4; return norm(np.pad(glint(), (0, int(d * SR) - int(.5 * SR))) + hp(noise(d), 5000) * env_exp(d, .4) * .3)
def zoom_in(): d = .6; return norm(chirp(300, 1600, d) * np.sin(np.pi * t_(d) / d) * .6 + bp(noise(d), 1000, 4000) * np.sin(np.pi * t_(d) / d))
def cry(): d = 2.0; x = t_(d); f = 600 + 200 * np.sin(2 * np.pi * 2.5 * x); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / d) ** .5 * (.6 + .4 * np.sin(2 * np.pi * 5 * x)))
def title(): out = np.zeros(int(3.0 * SR)); add1(out, jing(1, 3), 0); [add1(out, PL.pluck('koto', p, vel=.8) * .6, .1 + i * .06) for i, p in enumerate(['G4', 'A4', 'C5', 'D5', 'E5', 'G5'])]; return norm(out)
def dance(): return np.zeros(10)
def unroll(): d = 1.4; x = t_(d); return norm(bp(noise(d), 800, 5000) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 9 * x))) * np.exp(-x / 1.0))
def grab(): d = .3; return norm(bp(noise(d), 300, 2500) * env_exp(d, .05))
def lid(): d = .4; return norm(sum(sin(f, d) for f in [400, 820, 1270]) * env_exp(d, .06) + lp(noise(d), 800) * env_exp(d, .02))
def fire_breath(): d = 1.6; x = t_(d); return norm(bp(noise(d), 150, 1800) * np.minimum(1, x / .05) * np.exp(-x / .8) + lp(brown(d), 200) * np.exp(-x / .6))
FX = dict(boom=boom, whistle_down=lambda: whistle(1800, 400, .9), whistle_up=lambda: whistle(500, 1900, .7), crash=crash, birds=birds, title=title,
          door=lambda: norm(S_(slide(.5), thud(.5))), steps=lambda: run(1.0), unroll=unroll, boing=boing, sparkle=sparkle, tick=tick, knead=lambda: thud(.7),
          pop=lambda: pop_(1.0), splat=splat, meow=meow, glint=glint, jump=lambda: whistle(400, 1100, .35), land_soft=lambda: thud(.4), clink=lambda: norm(sin(2600, .3) * env_exp(.3, .05)),
          scurry=scurry, run=run, slip=lambda: norm(S_(whistle(1500, 300, .5), slide(.5))), whoosh=lambda: whoosh(.6), fwoosh=fwoosh, thud=thud, sizzle=sizzle, shock=shock, ding=ding,
          slap=slap, scrape=scrape, crack=crack, drums=drums, sting=sting, grab=grab, lid=lid, sneeze=sneeze, plop=plop, fire_breath=fire_breath, squish=squish, slide=slide,
          clang=clang, land=lambda: thud(1.0), screech=screech, silence=lambda: np.zeros(10), gulp=gulp, tension=tension, crunch=crunch, freeze=freeze, sad_trombone=_sadtb,
          rain=rain, bonk=bonk, sigh=sigh, cricket=cricket, zoom_in=zoom_in, fanfare=fanfare, dance=dance, cry=cry, harp_up=harp_up, nom=nom, purr=purr, chime=chime,
          firework=firework, laugh=laugh, shiver=shiver, whistle_kettle=kettle)

# ———————————————— score: one cue per run of beats sharing a mood ————————————————
BRIGHT = ['G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5']          # sol-mode pentatonic (pyeongjo-like)
DARK = ['A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5']                       # la-mode (gyemyeonjo-like)
STYLE = {   # mood → (tempo of a 3-pulse beat in s, scale, density, which voices)
  'comic': (.66, BRIGHT, .7, 'gay piri jang'), 'proud': (.66, BRIGHT, .8, 'gay piri jang kkw'), 'cook': (.5, BRIGHT, .9, 'gay jang kkw flute'), 'title': (.66, BRIGHT, .8, 'gay jang flute'),
  'sneaky': (.8, DARK, .5, 'pizz gay'), 'chase': (.42, BRIGHT, 1., 'gay jang kkw flute'), 'shock': (0, DARK, 0, ''), 'sheepish': (.8, BRIGHT, .4, 'gay'), 'drums': (0, DARK, 0, ''),
  'cliff': (0, DARK, 0, ''), 'boom': (0, BRIGHT, 0, ''), 'urgent': (.45, DARK, .9, 'gay jang piri'), 'idea': (.6, BRIGHT, .7, 'gay flute jang'), 'sad': (1.0, DARK, .4, 'haeg gay'),
  'court': (1.1, DARK, .4, 'flute gay'), 'freeze': (0, DARK, 0, ''), 'tense': (1.0, DARK, .35, 'pizz'), 'joy': (.6, BRIGHT, .9, 'gay piri jang kkw flute'),
  'warm': (.85, BRIGHT, .6, 'gay haeg flute'), 'party': (.55, BRIGHT, 1., 'gay piri jang kkw flute'),
}
beats = [e for e in E if e['type'] == 'beat']
segs = []
for b in beats:
    if segs and segs[-1]['mood'] == b['mood']: segs[-1]['t1'] = b['t'] + b['d']
    else: segs.append({'mood': b['mood'], 't0': b['t'], 't1': b['t'] + b['d']})
mus = np.zeros((N, 2)); ev = []
def place(x, at, g, pan):
    if x.ndim == 1: add(mus, x, at, g, pan)
    else: s = int(at * SR); n = min(len(x), N - s); mus[s:s + n] += x[:n] * g
for si, sg in enumerate(segs):
    T, SC, dens, voices = STYLE.get(sg['mood'], STYLE['comic']); t0, t1 = sg['t0'], sg['t1']
    if T == 0: continue
    r = np.random.default_rng(si * 7 + PART * 31); pulse = T / 3
    k, t, idx = 0, t0, len(SC) // 2
    while t < t1 - .05:
        beat_i, sub = k // 3, k % 3
        if 'jang' in voices:   # janggu: deong on the downbeat, kung/deok in between (a jajinmori-like feel)
            if sub == 0 and beat_i % 4 == 0: place(janggu_deong(.9), t, db(-8), 0)
            elif sub == 0: place(janggu_kung(.8), t, db(-11), -.2)
            elif sub == 2: place(janggu_deok(.7), t, db(-14), .25)
        if 'kkw' in voices and sub == 0 and beat_i % 2 == 0: place(kkwaeng(.6), t, db(-22), .4)
        if 'gay' in voices and r.random() < dens * (1 if sub != 1 else .5):   # gayageum: a stepwise walk on the pentatonic, with a little bend
            idx = int(np.clip(idx + r.choice([-2, -1, -1, 1, 1, 2]), 0, len(SC) - 1))
            bend = [(0, 0), (.08, 1), (.25, 0)] if r.random() < .15 else None
            place(PL.pluck('koto', SC[idx], vel=.55 + .3 * (sub == 0), **({'bend': bend} if bend else {})), t, db(-9), -.25)
        if 'pizz' in voices and sub == 0: place(SM.note('violin_pizz', SC[int(r.integers(0, 4))], .4, vel=.5), t, db(-12), 0)
        if sub == 0 and beat_i % 8 == 0:   # a phrase every 8 beats for a wind or the haegeum
            for inst, key in (('oboe', 'piri'), ('flute', 'flute'), ('violin', 'haeg')):
                if key in voices and (beat_i // 8) % (2 if key != 'haeg' else 1) == (0 if key == 'piri' else 1 if key == 'flute' else 0):
                    tt0 = t
                    for j in range(4):
                        p = SC[int(np.clip(idx + 2 + j * r.choice([-1, 1]), 0, len(SC) - 1))]
                        if inst == 'flute': p = p[:-1] + str(int(p[-1]) + 1)
                        ln = T * (1.5 if j < 3 else 3.0)
                        if tt0 + ln > t1: break
                        ev.append(dict(t=tt0, inst=inst, pitch=p, dur=ln * .95, vel=.5, pan=.2, attack=.04)); tt0 += ln
        t += pulse; k += 1
sam = SM.render(ev, dur=DUR + 1) if ev else np.zeros((N, 2)); sam = np.pad(sam, ((0, max(0, N - len(sam))), (0, 0)))[:N]
mus = mus + sam * db(-4)
mus = SM.room(mus, size=.35, mix=.15); mus = np.pad(mus, ((0, max(0, N - len(mus))), (0, 0)))[:N]
# short fades at every cue boundary so a mood change reads as a cut in the music
g = np.ones(N)
for sg in segs:
    if STYLE.get(sg['mood'], (1,))[0] == 0: g[int(sg['t0'] * SR):int(sg['t1'] * SR)] = 0
gs = uniform_filter1d(g, int(.12 * SR)); mus *= gs[:, None]

# ———————————————— sfx ————————————————
fx = np.zeros((N, 2))
for e in E:
    if e['type'] != 'sfx': continue
    f = FX.get(e['name'])
    if f is None: print('missing sfx', e['name']); continue
    x = f()
    if x is None or len(x) < 2: continue
    x = np.asarray(x, dtype=float); x = x if x.ndim == 1 else x.mean(1)
    add(fx, x, e['t'], db(-14 + e['g']), e['pan'])
# room tone
add(fx, lp(brown(DUR + 1), 200)[:N], 0, db(-48), 0)

# ———————————————— voices ————————————————
vo = np.zeros(N)
for e in E:
    if e['type'] != 'line': continue
    w, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'), dtype='float32'); w = w if w.ndim == 1 else w.mean(1)
    w = soxr.resample(w, sr, SR); s = int(e['t'] * SR); n = min(len(w), N - s); vo[s:s + n] += w[:n]
vo = hp(vo, 90)
def comp(x, thr_db=-22, ratio=3.):
    e = np.sqrt(uniform_filter1d(x ** 2, int(.02 * SR)) + 1e-12); ed = 20 * np.log10(e)
    gdb = np.where(ed > thr_db, (thr_db - ed) * (1 - 1 / ratio), 0); gdb = uniform_filter1d(gdb, int(.01 * SR)); return x * db(gdb)
vo = comp(vo); act = np.abs(vo) > 1e-4; vo *= db(-16) / rms(vo[act])
ma = np.abs(mus).max(1) > 1e-4; mus *= db(-25) / rms(mus[ma])
fa = np.abs(fx).max(1) > 1e-4; fx *= db(-21) / rms(fx[fa])
speak = uniform_filter1d(maximum_filter1d((np.abs(vo) > 1e-3).astype(float), int(.25 * SR)), int(.2 * SR))
mus *= db(-7 * speak)[:, None]; fx *= db(-3 * speak)[:, None]
mix = mus + fx + vo[:, None]
f = int(.4 * SR); mix[-f - SR:-SR] *= np.linspace(1, 0, f)[:, None]; mix[-SR:] = 0
mix = np.stack([limit(mix[:, c], .89) for c in (0, 1)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', f'mix{PART}.wav'), mix[:int(DUR * SR)].astype(np.float32), SR)
print('mix', PART, round(DUR, 2), 'cues', len(segs), 'notes', len(ev))
