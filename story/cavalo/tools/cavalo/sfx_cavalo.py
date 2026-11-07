"""The book's own sound recipes for sfx.py (--recipes tools/cavalo/sfx_cavalo.py)."""
import numpy as np
from sfx import SR, t_of, unit, place, lp1, hp1, bpf, noise


def neigh():
    """A horse's whinny, 1.5 s: a bright voiced cry that wobbles fast and falls, through nasal formants, a snort at the end."""
    t = t_of(1.5)
    f0 = 520 * np.exp(-t / 1.1) + 260
    trem = 1 + .18 * np.sin(2 * np.pi * (11 + 6 * t) * t)
    ph = 2 * np.pi * np.cumsum(f0 * trem) / SR
    src = sum(np.sin(k * ph) / k ** .8 for k in range(1, 9))
    env = np.minimum(t / .05, 1) * np.exp(-np.maximum(t - .9, 0) / .18) * (t < 1.25)
    voice = bpf(src, 900, q=1.3) + .6 * bpf(src, 2300, q=2) + .3 * src
    y = unit(voice * env) * .9 + unit(hp1(noise(len(t)), 900) * env) * .08
    s = t_of(.25)
    place(y, unit(bpf(noise(len(s)), 700, q=1) * np.exp(-s / .07)) * .45, 1.25)
    return y


def flush():
    """A toilet flush, 2.4 s: the lever clack, a rising rush of water, a gurgle and the cistern refilling."""
    t = t_of(2.4)
    y = np.zeros(len(t))
    c = t_of(.05); place(y, unit(hp1(noise(len(c)), 1500) * np.exp(-c / .006)) * .6, 0)
    rush = lp1(noise(len(t)), 1800) * np.minimum(np.maximum(t - .08, 0) / .25, 1) * np.exp(-np.maximum(t - .9, 0) / .5)
    y += unit(rush) * .7
    for k in range(9):
        d = t_of(.09); f = np.linspace(260, 520, len(d)) * (1 + .1 * k % 3)
        place(y, unit(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-d / .03)) * .25, .9 + .11 * k)
    hiss = bpf(noise(len(t)), 3000, q=1) * np.clip((t - 1.4) / .3, 0, 1) * np.exp(-np.maximum(t - 1.7, 0) / .4)
    return y + unit(hiss) * .15


def sizzle():
    """Hot oil poured out, 1.8 s: a splash, then crackling pops over a hiss."""
    t = t_of(1.8)
    y = unit(bpf(noise(len(t)), 5000, q=.7) * np.minimum(t / .05, 1) * np.exp(-t / .9)) * .35
    for _ in range(70):
        at = np.random.uniform(0, 1.6); d = t_of(.008)
        place(y, unit(hp1(noise(len(d)), 2500)) * np.random.uniform(.2, .6) * np.exp(-at / 1.2), at)
    s = t_of(.3); place(y, unit(lp1(noise(len(s)), 900) * np.exp(-s / .08)) * .5, 0)
    return y


def samba():
    """A boteco pagode groove, 8 s at 100 bpm (tiles every 4.8 s): surdo on the 2, pandeiro sixteenths, tamborim."""
    beat = 60 / 100; bar = 2 * beat; total = 4 * bar
    y = np.zeros(int((total + 1.2) * SR))
    for b in range(4):
        b0 = b * bar
        for k, at, g in ((0, 0, .45), (1, beat, 1)):        # surdo: muffled on 1, open on 2
            d = t_of(.5); f = 70 - 20 * d
            place(y, unit(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-d / (.08 if k == 0 else .22))) * .9 * g, b0 + at)
        for i in range(8):                                     # pandeiro: thumb, tip, heel, tip; jingles on all
            at = b0 + i * beat / 4; acc = 1 if i % 4 == 3 else .55
            d = t_of(.09)
            place(y, unit(bpf(noise(len(d)), 7000, q=1.5) * np.exp(-d / .025)) * .25 * acc, at)
            if i % 4 == 0:
                place(y, unit(np.sin(2 * np.pi * 180 * d) * np.exp(-d / .03)) * .35, at)
        for at in (0, .75, 1.5, 2.25, 3, 3.5):                 # tamborim, in sixteenths
            d = t_of(.06)
            place(y, unit(bpf(noise(len(d)), 2600, q=6) * np.exp(-d / .012)) * .3, b0 + at * beat / 2)
    tail = y[int(total * SR):].copy(); y = y[:int(total * SR)]; y[:len(tail)] += tail
    return lp1(y, 9000)
