"""The season's own sound recipes for sfx.py (--recipes tools/guerra/sfx_guerra.py)."""
import numpy as np
from sfx import SR, t_of, unit, place, lp1, hp1, bpf, noise


def flush():
    """A toilet flush, 2.4 s: the lever clack, a rising rush of water, a gurgle and the cistern refilling."""
    t = t_of(2.4); y = np.zeros(len(t))
    c = t_of(.05); place(y, unit(hp1(noise(len(c)), 1500) * np.exp(-c / .006)) * .6, 0)
    y += unit(lp1(noise(len(t)), 1800) * np.minimum(np.maximum(t - .08, 0) / .25, 1) * np.exp(-np.maximum(t - .9, 0) / .5)) * .7
    for k in range(9):
        d = t_of(.09); f = np.linspace(260, 520, len(d))
        place(y, unit(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-d / .03)) * .25, .9 + .11 * k)
    return y + unit(bpf(noise(len(t)), 3000, q=1) * np.clip((t - 1.4) / .3, 0, 1) * np.exp(-np.maximum(t - 1.7, 0) / .4)) * .15


def bigflush():
    """The protocol: a huge flush that roars for 3 s (low rush, swirl, a deep gulp at the end)."""
    t = t_of(3.2)
    rush = unit(lp1(noise(len(t)), 900) * np.minimum(t / .3, 1) * np.exp(-np.maximum(t - 2.4, 0) / .3))
    swirl = unit(bpf(noise(len(t)), 600 + 400 * np.sin(2 * np.pi * 3 * t), q=2) * np.minimum(t / .5, 1)) * .4
    y = rush + swirl
    g = t_of(.5); f = 160 * np.exp(-g * 3)
    place(y, unit(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-g / .18)) * .9, 2.6)
    return y


def fart():
    """A cartoon fart, 1.1 s: a buzzy low tone that wobbles and drops, with a flutter."""
    t = t_of(1.1); f0 = 110 * (1 - .35 * t) * (1 + .12 * np.sin(2 * np.pi * 7 * t))
    ph = 2 * np.pi * np.cumsum(f0) / SR; buzz = np.sign(np.sin(ph)) * .6 + np.sin(2 * ph) * .3
    flutter = .6 + .4 * np.sign(np.sin(2 * np.pi * 24 * t))
    return unit(lp1(buzz * flutter, 1400) * np.minimum(t / .03, 1) * np.exp(-np.maximum(t - .8, 0) / .1)) + unit(lp1(noise(len(t)), 500)) * .08


def fartsqueak():
    """A short squeaky fart, 0.5 s, rising."""
    t = t_of(.5); f0 = 260 + 380 * t
    ph = 2 * np.pi * np.cumsum(f0) / SR
    return unit(lp1(np.sign(np.sin(ph)) * (.7 + .3 * np.sin(2 * np.pi * 30 * t)), 2500) * np.sin(np.pi * t / .5) ** .6)


def siren():
    """An alarm siren, 3 s: two tones swapping, a little rough."""
    t = t_of(3.0); f = np.where((t * 2.5) % 1 < .5, 880, 660)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return unit((np.sign(np.sin(ph)) * .4 + np.sin(ph) * .6) * np.minimum(t / .05, 1) * np.minimum((3 - t) / .1, 1)) * .8


def bigboom():
    """A big explosion, 2.2 s: a hard crack, a deep rumble, debris."""
    t = t_of(2.2)
    y = unit(lp1(noise(len(t)), 220) * np.exp(-t / .6)) + unit(hp1(noise(len(t)), 1200) * np.exp(-t / .05)) * .7
    y += unit(np.sin(2 * np.pi * np.cumsum(55 * np.exp(-t)) / SR) * np.exp(-t / .5)) * .8
    return y


def gavel():
    """Two gavel knocks on a wooden bench, 0.9 s."""
    y = np.zeros(int(.9 * SR))
    for at in (0, .38):
        d = t_of(.2); place(y, unit(bpf(noise(len(d)), 900, q=3) * np.exp(-d / .02)) * .8 + unit(np.sin(2 * np.pi * 180 * d) * np.exp(-d / .04)) * .6, at)
    return y


def cheer():
    """A crowd cheering, 2.5 s: many voiced vowels and a noise bed."""
    t = t_of(2.5); y = unit(bpf(noise(len(t)), 1200, q=.6)) * .5
    for k in range(18):
        f = np.random.uniform(180, 420); a = np.random.uniform(0, .8); d = t_of(np.random.uniform(.6, 1.4))
        v = np.sin(2 * np.pi * np.cumsum(f * (1 + .05 * np.sin(2 * np.pi * 5 * d))) / SR)
        place(y, unit(bpf(v + .3 * np.sign(v), 900, q=1)) * np.sin(np.pi * d / d[-1]) * .35, a)
    return y * np.minimum(t / .2, 1) * np.minimum((2.5 - t) / .5, 1)


def rolling():
    """Something rolling along a tiled floor, 2.6 s: soft regular bumps on the tile joints."""
    y = np.zeros(int(2.6 * SR))
    for k in range(14):
        d = t_of(.06); place(y, unit(bpf(noise(len(d)), 500, q=2) * np.exp(-d / .015)) * .5, .1 + k * .17)
    return y + unit(lp1(noise(len(y)), 300)) * .1


def squeak():
    """A rat's squeak, 0.25 s."""
    t = t_of(.25); f = 2400 + 900 * np.sin(np.pi * t / .25)
    return unit(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / .25))


def marcha():
    """A silly military march loop, 9.6 s at 100 bpm (tiles every 9.6 s): tuba oom-pah, snare rolls, a glockenspiel tune."""
    beat = .6; bars = 4; total = bars * 4 * beat
    y = np.zeros(int((total + 1) * SR))
    bass = [98, 73.4, 98, 73.4, 87.3, 65.4, 87.3, 65.4, 98, 73.4, 98, 73.4, 110, 82.4, 98, 73.4]
    for i, f in enumerate(bass):
        d = t_of(.35); place(y, unit(np.sin(2 * np.pi * f * d) + .4 * np.sin(4 * np.pi * f * d)) * np.exp(-d / .2) * .7, i * beat)
    for i in range(16):
        d = t_of(.12); place(y, unit(bpf(noise(len(d)), 2600, q=1) * np.exp(-d / .04)) * (.5 if i % 2 else .25), i * beat + beat / 2)
        if i % 4 == 3:
            for r in range(6): place(y, unit(bpf(noise(len(d)), 2600, q=1) * np.exp(-d / .02)) * .2, i * beat + r * beat / 8)
    tune = [784, 784, 880, 784, 1047, 988, 0, 784, 784, 880, 784, 1175, 1047, 0, 0, 0]
    for i, f in enumerate(tune):
        if f: d = t_of(.4); place(y, unit(np.sin(2 * np.pi * f * d) + .3 * np.sin(2 * np.pi * 2.76 * f * d)) * np.exp(-d / .15) * .3, i * beat)
    tail = y[int(total * SR):].copy(); y = y[:int(total * SR)]; y[:len(tail)] += tail
    return lp1(y, 7000)
