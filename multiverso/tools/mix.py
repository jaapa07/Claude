"""mix.py N : the episode soundtrack. Every sound effect and every bar of music is synthesised here in numpy (no samples,
no downloads), then mixed with the dub under a side-chain duck and mastered.
  in : episodes/epN/cues.json (SFX [[t, name, gain?]], MUSIC [[t, style, gain?]]), episodes/epN/timing.json + vo/*.wav
  out: episodes/epN/mix.wav (48 kHz stereo)"""
import json, os, sys
import numpy as np, soundfile as sf
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
rng = np.random.default_rng(7)

def T(d): return np.arange(int(d * SR)) / SR
def env(n, a=.005, r=.1, curve=4):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)); dur = n / SR
    return e * np.exp(-curve * np.maximum(0, t - a) / max(r, 1e-4) * (1 if r < dur else dur / r))
def adsr(n, a=.01, d=.1, s=.6, r=.2):
    t = np.arange(n) / SR; dur = n / SR; e = np.where(t < a, t / a, np.where(t < a + d, 1 - (1 - s) * (t - a) / d, s))
    return e * np.clip((dur - t) / r, 0, 1)
def sweep(f0, f1, d, kind='sin', curve='exp'):
    t = T(d); f = f0 * (f1 / f0) ** (t / d) if curve == 'exp' else f0 + (f1 - f0) * t / d
    ph = 2 * np.pi * np.cumsum(f) / SR
    return {'sin': np.sin(ph), 'saw': 2 * (ph / (2 * np.pi) % 1) - 1, 'sq': np.sign(np.sin(ph)), 'tri': 2 * np.abs(2 * (ph / (2 * np.pi) % 1) - 1) - 1}[kind]
def add(*xs):
    n = max(len(x) for x in xs); y = np.zeros(n)
    for x in xs: y[:len(x)] += x
    return y
def noise(d): return rng.standard_normal(int(d * SR))
def lp(x, f):                       # one-pole low-pass (run twice: 12 dB/oct)
    a = np.exp(-2 * np.pi * f / SR); y = np.empty_like(x); s = 0.
    for _ in range(2):
        y = np.empty_like(x); s = 0.
        from scipy.signal import lfilter  # noqa
        y = lfilter([1 - a], [1, -a], x); x = y
    return y
def hp(x, f): return x - lp(x, f)
def bp(x, f, q=4):
    from scipy.signal import butter, lfilter
    lo, hi = max(20, f / (1 + 1 / q)), min(SR / 2 - 100, f * (1 + 1 / q)); b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
def mixin(dst, src, at, g=1.):
    i = int(at * SR);
    if i >= len(dst) or i + len(src) <= 0: return
    s0 = max(0, -i); i = max(0, i); n = min(len(src) - s0, len(dst) - i)
    dst[i:i + n] += src[s0:s0 + n] * g

# ---------------- the cartoon SFX library ----------------
def sfx(name):
    if name == 'click': return noise(.02) * env(int(.02 * SR), .0005, .005) * .7 + sweep(3000, 1500, .02) * env(int(.02 * SR), .0005, .01) * .5
    if name == 'beep': return np.sin(2 * np.pi * 1320 * T(.12)) * adsr(int(.12 * SR), .005, .02, .8, .03) * .5
    if name == 'boop': return sweep(900, 400, .14, 'tri') * adsr(int(.14 * SR), .005, .03, .7, .05) * .6
    if name == 'pop': return sweep(1200, 300, .07) * env(int(.07 * SR), .001, .03) * .9
    if name == 'plop': return add(sweep(180, 900, .12) * env(int(.12 * SR), .002, .05) * .9, sweep(600, 200, .1) * env(int(.1 * SR), .001, .03) * .3)
    if name == 'squish':
        x = bp(noise(.35), 700, 1.5) * env(int(.35 * SR), .02, .12) * 2; return x + sweep(300, 120, .35, 'tri') * env(int(.35 * SR), .01, .1) * .4
    if name == 'fart':
        d = .9; t = T(d); f = 70 + 30 * np.sin(2 * np.pi * 7 * t) + 25 * np.sin(2 * np.pi * 2.3 * t) - 20 * t
        ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sign(np.sin(ph)) * .5 + (2 * (ph / (2 * np.pi) % 1) - 1) * .5
        x = lp(x * (1 + .5 * noise(d)), 900) * adsr(len(t), .02, .1, .8, .25); return x * 1.6
    if name == 'boing':
        d = .7; t = T(d); f = 220 * (1 + .6 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 4)) * (1 + t * .5)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .002, .35) * .7
    if name == 'slap':   # chinelada
        x = hp(noise(.18), 1200) * env(int(.18 * SR), .0005, .03) * 1.4 + sweep(160, 60, .18) * env(int(.18 * SR), .001, .06) * 1.2; return x
    if name == 'bigslap':
        x = sfx('slap') ; y = np.zeros(int(1.2 * SR)); mixin(y, x * 1.4, 0); mixin(y, sweep(90, 30, 1.0) * env(int(1. * SR), .002, .4), 0, 1.)
        for i, dl in enumerate([.09, .19, .31]): mixin(y, x * .35 / (i + 1), dl)
        return y
    if name == 'whoosh': return bp(noise(.5), 900, 1.2) * np.sin(np.pi * T(.5) / .5) ** 2 * 1.6
    if name == 'swoosh_up': return bp(noise(.6), 1400, 1.5) * np.sin(np.pi * T(.6) / .6) ** 2 * 1.4 + sweep(300, 1200, .6, 'sin') * .08
    if name == 'thud': return sweep(120, 40, .3) * env(int(.3 * SR), .002, .1) * 1.3 + lp(noise(.3), 400) * env(int(.3 * SR), .001, .04)
    if name == 'crash':
        d = 1.2; x = hp(noise(d), 500) * env(int(d * SR), .002, .35) * .9
        for i in range(14): mixin(x, sweep(2000 + 300 * i, 800, .08) * env(int(.08 * SR), .001, .03) * .4, rng.uniform(0, .5))
        return add(x, sweep(110, 50, .5) * env(int(.5 * SR), .002, .15) * 1.2)
    if name == 'explosion':
        d = 2.4; x = lp(noise(d), 900) * env(int(d * SR), .01, .9) * 2.2 + sweep(70, 25, d) * env(int(d * SR), .005, .7) * 1.6
        return x + hp(noise(d), 3000) * env(int(d * SR), .001, .12) * .5
    if name == 'rumble': d = 4.; return lp(noise(d), 120) * adsr(int(d * SR), .5, .1, 1, .6) * 3 * (1 + .4 * np.sin(2 * np.pi * 6 * T(d)))
    if name == 'choir':   # "aaaah" chord with vowel formants
        d = 3.2; x = np.zeros(int(d * SR))
        for f in (220, 277.2, 329.6, 440, 554.4):
            ph = 2 * np.pi * np.cumsum(f * (1 + .004 * np.sin(2 * np.pi * 5.2 * T(d) + f))) / SR; x += (2 * (ph / (2 * np.pi) % 1) - 1)
        y = bp(x, 800, 3) * 1.4 + bp(x, 1200, 4) * .9 + bp(x, 2600, 5) * .3
        return y * adsr(len(x), .6, .3, .8, .8) * .5
    if name == 'fanfare':
        x = np.zeros(int(2.2 * SR))
        for i, (f, t0, d) in enumerate([(523.3, 0, .14), (659.3, .14, .14), (784, .28, .14), (1046.5, .42, 1.2)]):
            n = sweep(f, f, d, 'saw') + sweep(f * 1.005, f * 1.005, d, 'saw'); mixin(x, lp(n, 3000) * adsr(len(n), .01, .05, .7, .2) * .3, t0)
        return x
    if name == 'alarm': x = np.zeros(int(2. * SR)); [mixin(x, sweep(700, 1100, .25, 'sq') * .18, i * .5) for i in range(4)]; return lp(x, 4000)
    if name == 'laser': return sweep(2400, 300, .25, 'sq') * env(int(.25 * SR), .002, .12) * .3
    if name == 'zap': return (sweep(3000, 200, .18, 'saw') * env(int(.18 * SR), .001, .08) + hp(noise(.18), 2000) * env(int(.18 * SR), .001, .04)) * .4
    if name == 'warp':
        d = 1.6; t = T(d); f = 200 * (1 + 3 * t / d) * (1 + .1 * np.sin(2 * np.pi * 9 * t))
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .4 + bp(noise(d), 1500, 2) * .6) * np.sin(np.pi * t / d) * .8
    if name == 'flush':
        d = 2.2; t = T(d); x = bp(noise(d), 600 + 400 * np.sin(2 * np.pi * 1.1 * t).mean(), 1.2) * adsr(len(t), .05, .3, .7, .8) * 1.6
        return x + lp(noise(d), 200) * adsr(len(t), .2, .3, .6, .8) * 1.2
    if name == 'splash': d = .8; return add(hp(noise(d), 800) * env(int(d * SR), .004, .25) * 1.1, sweep(400, 120, .2) * env(int(.2 * SR), .001, .05) * .5)
    if name == 'rimshot':
        x = np.zeros(int(1.4 * SR)); sn = lambda: add(hp(noise(.15), 1500) * env(int(.15 * SR), .001, .05) * .8, sweep(220, 180, .15) * env(int(.15 * SR), .001, .04) * .5)
        mixin(x, sn(), 0); mixin(x, sn(), .22); mixin(x, hp(noise(1.), 6000) * env(int(1. * SR), .001, .4) * .6, .44); return x
    if name == 'scratch':
        d = .5; t = T(d); f = 300 + 900 * np.abs(np.sin(2 * np.pi * 2.5 * t)); x = (2 * ((np.cumsum(f) / SR) % 1) - 1) * .3 + bp(noise(d), 1800, 1) * .6
        return x * env(len(t), .005, .3)
    if name == 'crickets':
        d = 3.; x = np.zeros(int(d * SR))
        for k in range(6):
            c = np.sin(2 * np.pi * 4300 * T(.08)) * (np.sin(2 * np.pi * 50 * T(.08)) > 0) * env(int(.08 * SR), .005, .05)
            for j in range(3): mixin(x, c * .14, k * .5 + j * .09)
        return x
    if name == 'gulp': return sweep(300, 90, .18, 'tri') * env(int(.18 * SR), .005, .08) * .7
    if name == 'sparkle':
        x = np.zeros(int(1. * SR))
        for i in range(10): mixin(x, np.sin(2 * np.pi * (2000 + 220 * i) * T(.2)) * env(int(.2 * SR), .001, .08) * .15, i * .06)
        return x
    if name == 'power_up': return (sweep(200, 1600, .9, 'sq') * .15 + sweep(400, 3200, .9, 'sin') * .2) * adsr(int(.9 * SR), .02, .1, .9, .1)
    if name == 'power_down': return (sweep(1200, 80, 1.1, 'sq') * .15 + sweep(600, 40, 1.1, 'saw') * .15) * adsr(int(1.1 * SR), .01, .1, .9, .3)
    if name == 'honk':
        d = .35; return lp(sweep(330, 300, d, 'sq') + sweep(415, 390, d, 'sq'), 2200) * adsr(int(d * SR), .01, .05, .8, .05) * .3
    if name == 'apito':   # referee whistle
        d = .7; t = T(d); f = 2800 * (1 + .03 * np.sign(np.sin(2 * np.pi * 28 * t))); return np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(len(t), .01, .05, .8, .1) * .25
    if name == 'cuica':   # the Brazilian friction drum "laugh"
        x = np.zeros(int(1.6 * SR))
        for i in range(5):
            d = .22; f = sweep(380, 720, d * .5, 'sin', 'lin'); g = sweep(720, 380, d * .5, 'sin', 'lin'); s = np.concatenate([f, g]) * adsr(int(d * SR) // 2 * 2, .01, .05, .8, .05)
            mixin(x, lp(s, 1400) * .5, i * .28)
        return x
    if name == 'gol':     # stadium crowd "GOOOL"
        d = 3.; x = bp(noise(d), 700, 1.) * 1.2 + bp(noise(d), 1500, 1.5) * .6; return x * adsr(int(d * SR), .2, .4, .8, 1.)
    if name == 'gasp': d = .6; return bp(noise(d), 1200, 1.2) * adsr(int(d * SR), .05, .1, .7, .3) * 1.2
    if name == 'kiss': return sweep(600, 2400, .08) * env(int(.08 * SR), .001, .03) * .5
    if name == 'slide_up': return sweep(300, 1800, .6, 'sin', 'lin') * adsr(int(.6 * SR), .01, .05, .8, .05) * .35
    if name == 'slide_down': return sweep(1800, 250, .7, 'sin', 'lin') * adsr(int(.7 * SR), .01, .05, .8, .05) * .35
    if name == 'hum':     # spaceship drone
        d = 4.; t = T(d); x = sweep(55, 55, d, 'saw') + sweep(55.4, 55.4, d, 'saw') + sweep(110.3, 110.3, d, 'saw') * .5
        return lp(x, 400) * adsr(len(t), .8, .1, 1, 1.) * .4
    if name == 'cry':     # comic sobbing
        x = np.zeros(int(2. * SR))
        for i in range(4): mixin(x, sweep(520, 380, .35, 'tri') * (1 + .3 * np.sin(2 * np.pi * 11 * T(.35))) * adsr(int(.35 * SR), .02, .05, .8, .1) * .3, i * .45)
        return x
    if name == 'drumroll':
        d = 2.; x = np.zeros(int(d * SR))
        for i in range(int(d * 22)): mixin(x, hp(noise(.05), 900) * env(int(.05 * SR), .001, .02) * (.2 + .5 * i / (d * 22)), i / 22)
        return x
    if name == 'ding': return (np.sin(2 * np.pi * 1760 * T(1.)) + .4 * np.sin(2 * np.pi * 3520 * T(1.))) * env(int(1. * SR), .001, .5) * .35
    if name == 'tick': return hp(noise(.01), 3000) * env(int(.01 * SR), .0005, .004) * .6
    if name == 'thunder': d = 3.; return lp(noise(d), 300) * env(int(d * SR), .02, 1.4) * 3 + hp(noise(d), 2000) * env(int(d * SR), .002, .2) * .8
    if name == 'glitch':
        d = .6; x = np.zeros(int(d * SR))
        for i in range(12): mixin(x, sweep(rng.uniform(200, 3000), rng.uniform(100, 3000), .04, 'sq') * .2, i * .05)
        return x
    if name == 'magic': return sfx('sparkle') + np.pad(sweep(400, 2400, .8, 'sin') * adsr(int(.8 * SR), .05, .1, .6, .3) * .2, (0, int(.2 * SR)))
    if name == 'step': return sweep(140, 80, .06) * env(int(.06 * SR), .001, .02) * .5
    raise KeyError(name)

# ---------------- music: small synth band, one groove per style ----------------
BPM = {'funk': 130, 'tension': 90, 'space': 84, 'epic': 140, 'sad': 70, 'lounge': 100, 'chase': 160, 'glory': 110}
def note(f, d, kind='saw', a=.005, r=.08, cut=2500):
    x = sweep(f, f, d, kind); return lp(x, cut) * adsr(len(x), a, .05, .7, r)
def kick(): return sweep(140, 45, .25) * env(int(.25 * SR), .001, .12) * 1.3
def snare(): return add(hp(noise(.18), 1200) * env(int(.18 * SR), .001, .06) * .7, sweep(200, 160, .1) * env(int(.1 * SR), .001, .04) * .4)
def hat(): return hp(noise(.04), 7000) * env(int(.04 * SR), .0005, .015) * .35
def clap(): x = np.zeros(int(.2 * SR)); [mixin(x, bp(noise(.12), 1500, 1.5) * env(int(.12 * SR), .001, .04), i * .011) for i in range(3)]; return x * .9
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def groove(style, d):
    out = np.zeros(int(d * SR) + SR); b = 60 / BPM[style]; s16 = b / 4; bars = int(d / (b * 4)) + 1
    prog = {'funk': [45, 45, 48, 43], 'tension': [40, 41, 40, 43], 'space': [50, 46, 43, 45], 'epic': [38, 34, 36, 33], 'sad': [45, 41, 36, 43], 'lounge': [50, 55, 52, 57], 'chase': [40, 40, 43, 38], 'glory': [48, 43, 45, 41]}[style]
    for bar in range(bars):
        t0 = bar * b * 4; root = prog[bar % 4]
        if style == 'funk':     # tamborzão-ish
            for st in (0, 3, 6, 10, 12, 14): mixin(out, kick(), t0 + st * s16, .9)
            for st in (4, 12): mixin(out, clap(), t0 + st * s16, .8)
            for st in range(16): mixin(out, hat(), t0 + st * s16, .6 if st % 2 else .3)
            for st, m in ((0, 0), (3, 0), (6, 12), (8, 7), (10, 0), (14, 10)): mixin(out, note(mtof(root + m - 12), s16 * 1.6, 'sq', r=.05, cut=900), t0 + st * s16, .35)
            for st in (2, 10): mixin(out, note(mtof(root + 24 + 7), s16 * .8, 'tri', r=.04, cut=4000), t0 + st * s16, .12)
        elif style == 'tension':
            mixin(out, note(mtof(root - 12), b * 4, 'saw', a=.3, r=.5, cut=300), t0, .5)
            for st in range(0, 16, 2): mixin(out, note(mtof(root + 12), s16 * .5, 'sq', r=.03, cut=1500), t0 + st * s16, .06 + .04 * (st % 4 == 0))
            for st in (0, 8): mixin(out, kick(), t0 + st * s16, .5)
        elif style == 'space':
            for m in (0, 7, 12, 16): mixin(out, note(mtof(root + m), b * 4.2, 'tri', a=.6, r=1., cut=1800), t0, .09)
            for st in range(0, 16, 2): mixin(out, note(mtof(root + 24 + [0, 7, 12, 19, 16, 12, 7, 4][st // 2]), s16 * 1.5, 'sin', r=.2), t0 + st * s16, .08)
        elif style in ('epic', 'chase'):
            for st in range(0, 16, 2 if style == 'epic' else 1): mixin(out, note(mtof(root - 12), s16 * .9, 'saw', r=.03, cut=700), t0 + st * s16, .22)
            for st in (0, 4, 8, 12) if style == 'chase' else (0, 6, 8, 14): mixin(out, kick(), t0 + st * s16, .9)
            for st in (4, 12): mixin(out, snare(), t0 + st * s16, .8)
            for st in range(0, 16, 2): mixin(out, hat(), t0 + st * s16, .5)
            if style == 'epic':
                for m in (0, 3, 7): mixin(out, note(mtof(root + 12 + m), b * 1.5, 'saw', a=.02, r=.2, cut=2400), t0, .08); mixin(out, note(mtof(root + 12 + m + 2), b, 'saw', a=.02, r=.2, cut=2400), t0 + b * 2.5, .07)
        elif style == 'sad':
            for m in (0, 3, 7): mixin(out, note(mtof(root + m), b * 4, 'tri', a=.4, r=.8, cut=1500), t0, .1)
            for i, m in enumerate((12, 15, 14, 10)): mixin(out, note(mtof(root + 12 + m) * (1 + .006 * np.sin(1)), b * .95, 'saw', a=.15, r=.2, cut=2000), t0 + i * b, .06)
        elif style == 'lounge':
            for st in (0, 6, 8): mixin(out, kick(), t0 + st * s16, .5)
            for st in range(0, 16, 2): mixin(out, hat(), t0 + st * s16, .4)
            for m in (0, 4, 7, 11): mixin(out, note(mtof(root + m), b * 1.8, 'tri', a=.02, r=.3, cut=2500), t0 + b * (0 if m < 7 else 2), .07)
            for st, m in ((0, 0), (6, 7), (8, 12), (14, 7)): mixin(out, note(mtof(root - 12 + m), s16 * 2, 'tri', r=.1, cut=700), t0 + st * s16, .3)
        elif style == 'glory':
            for m in (0, 4, 7, 12): mixin(out, note(mtof(root + m), b * 4, 'saw', a=.1, r=.5, cut=2200), t0, .07)
            for st in (0, 4, 8, 12): mixin(out, kick(), t0 + st * s16, .7)
            mixin(out, snare(), t0 + 12 * s16, .6); mixin(out, snare(), t0 + 14 * s16, .4)
            for i, m in enumerate((12, 16, 19, 24)): mixin(out, note(mtof(root + 12 + m), b * .9, 'sq', r=.15, cut=3000), t0 + i * b, .05)
    out = out[:int(d * SR)]
    return out * (.16 / (np.sqrt(np.mean(out ** 2)) + 1e-9))

def main():
    ep = sys.argv[1]; d = os.path.join(ROOT, 'episodes', f'ep{ep}')
    cues = json.load(open(os.path.join(d, 'cues.json'), encoding='utf-8')); total = cues['total']
    N = int(total * SR); vo = np.zeros(N); fx = np.zeros(N); mu = np.zeros(N)
    timing = json.load(open(os.path.join(d, 'timing.json'), encoding='utf-8'))
    for l in timing['lines']:
        x, sr = sf.read(os.path.join(d, 'vo', l['id'] + '.wav')); x = x if x.ndim == 1 else x.mean(1)
        mixin(vo, x, l['start'], 1.0)
    cache = {}
    for c in cues['sfx']:
        t, name = c[0], c[1]; gain = c[2] if len(c) > 2 else 1.
        if name not in cache: cache[name] = sfx(name)
        mixin(fx, cache[name], t, gain * .8)
    mus = sorted(cues.get('music', []), key=lambda m: m[0])
    for i, m in enumerate(mus):
        t0, style = m[0], m[1]; gain = m[2] if len(m) > 2 else 1.; t1 = mus[i + 1][0] if i + 1 < len(mus) else total
        if style == 'none' or t1 <= t0: continue
        x = groove(style, t1 - t0 + .4); n = len(x); fade = np.ones(n); fi = int(.05 * SR); fo = int(.4 * SR)
        fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo); mixin(mu, x * fade, t0, gain * .55)
    # side-chain duck: music dips under the voices
    from scipy.ndimage import maximum_filter1d, uniform_filter1d
    lev = uniform_filter1d(maximum_filter1d(np.abs(vo), int(.15 * SR)), int(.12 * SR))
    duck = 1 - .6 * np.clip(lev / .15, 0, 1)
    mix = vo * 1.3 + fx * .6 + mu * duck * .9
    # stereo: a gentle width on fx and music, voices centred
    L = mix + (fx * .08 + mu * .06) * np.sin(np.arange(N) / SR * 1.3); R = mix - (fx * .08 + mu * .06) * np.sin(np.arange(N) / SR * 1.3)
    st = np.stack([L, R], 1)
    rms = np.sqrt(np.mean(st ** 2)); st *= (10 ** (-15.5 / 20)) / (rms + 1e-9)
    st = np.tanh(st * 1.1) / np.tanh(1.1)            # soft limiter
    pk = np.max(np.abs(st)); st *= min(1, .97 / pk)
    sf.write(os.path.join(d, 'mix.wav'), st.astype(np.float32), SR, subtype='PCM_16')
    print(f"mix -> {d}/mix.wav  {total:.1f}s  peak {20 * np.log10(np.max(np.abs(st))):.1f} dBFS  rms {20 * np.log10(np.sqrt(np.mean(st ** 2))):.1f} dBFS  sfx {len(cues['sfx'])}  music cues {len(mus)}")

if __name__ == '__main__': main()
