#!/usr/bin/env python3
"""Authored tennis sound effects (physically inspired modal synthesis), rendered to mp3.

A racket hit is a short noise click (strings biting the felt), the string bed "pock"
(a few damped modes with a small downward pitch glide), the ball's hollow body and a
low thump, plus a faint stadium reverb. Bounces differ per surface: a dry slap on hard
courts, a muffled thud with grit on clay, a soft dull thump on grass.

Run: python3 scripts/build-tennis-sfx.py   (writes public/assets/audio/*.mp3 and updates manifest.json)
"""
import json, os, subprocess, tempfile, wave
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'audio')
rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def hp(x, fc):
    return x - onepole_lp(x, fc)


def band(x, lo, hi):
    return onepole_lp(hp(x, lo), hi)


def mode(t, f, decay, amp=1.0, glide=0.0, glide_t=0.01, phase=0.0):
    freq = f * (1 + glide * np.exp(-t / glide_t))
    ph = 2 * np.pi * np.cumsum(freq) / SR + phase
    return amp * np.sin(ph) * np.exp(-t / decay)


def reverb(x, length=0.45, decay=0.28, mix=0.12, predelay=0.018, lp=3500):
    t = t_axis(length)
    ir = rng.standard_normal(len(t)) * np.exp(-t / decay)
    ir = onepole_lp(ir, lp)
    ir[: int(predelay * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    n = len(x) + len(ir)
    wet = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: n]
    y = np.zeros(n)
    y[: len(x)] += x
    return y + mix * wet * (np.max(np.abs(x)) / (np.max(np.abs(wet)) + 1e-9))


def finish(x, peak=0.89):
    # gentle fade-out and a soft limiter, then normalise
    fade = int(0.03 * SR)
    x[-fade:] *= np.linspace(1, 0, fade)
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def racket(power=0.7, brush=0.0, f0=560.0, dry=False):
    """power 0..1 (soft block .. serve), brush 0..1 (slice/top-spin string brush)."""
    t = t_axis(0.42)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.0011) * (0.15 + 1.25 * power)
    strings = (mode(t, f0, 0.030 + 0.01 * power, 1.0, glide=0.09)
               + mode(t, f0 * 2.31, 0.018, 0.5, glide=0.06)
               + mode(t, f0 * 3.87, 0.010, 0.28, glide=0.05))
    shell = mode(t, 1250 + 180 * rng.random(), 0.012, 0.45)
    thump = mode(t, 150 + 40 * power, 0.018 + 0.01 * power, 0.55 + 0.7 * power)
    fric = onepole_lp(onepole_lp(band(rng.standard_normal(len(t)), 600, 1800), 2000), 2400) * np.exp(-t / (0.010 + 0.022 * brush)) * 0.22 * brush
    x = click + strings * (0.8 + 0.4 * power) + shell + thump + fric
    x *= 1 - np.exp(-t / 0.0004)  # tiny attack ramp, no digital click
    return finish(reverb(x, mix=0.03 if dry else 0.06, decay=0.18))


def bounce(surface):
    t = t_axis(0.35)
    if surface == 'hard':
        x = (mode(t, 135 + 20 * rng.random(), 0.028, 1.0)
             + mode(t, 390 + 40 * rng.random(), 0.016, 0.55)
             + mode(t, 980, 0.006, 0.25)
             + band(rng.standard_normal(len(t)), 1200, 4000) * np.exp(-t / 0.0022) * 1.5)
        mix = 0.05
    elif surface == 'clay':
        grit = onepole_lp(onepole_lp(onepole_lp(hp(rng.standard_normal(len(t)), 120), 420), 500), 600) * np.exp(-t / 0.04) * 1.4
        grit *= 1 + 0.6 * np.sin(2 * np.pi * 37 * t)  # granular crunch
        x = (mode(t, 105 + 15 * rng.random(), 0.034, 1.0)
             + mode(t, 320, 0.012, 0.3)
             + grit
             + onepole_lp(band(rng.standard_normal(len(t)), 300, 700), 800) * np.exp(-t / 0.003) * 0.3)
        mix = 0.04
    elif surface == 'grass':
        x = (mode(t, 92 + 12 * rng.random(), 0.040, 1.0)
             + mode(t, 260, 0.014, 0.25)
             + onepole_lp(onepole_lp(rng.standard_normal(len(t)), 450), 600) * np.exp(-t / 0.02) * 0.35)
        mix = 0.03
    else:  # carpet, indoor: like hard but softer top and a bigger room
        x = (mode(t, 125 + 15 * rng.random(), 0.030, 1.0)
             + mode(t, 360, 0.014, 0.45)
             + band(rng.standard_normal(len(t)), 900, 2600) * np.exp(-t / 0.0025) * 0.5)
        mix = 0.1
    x *= 1 - np.exp(-t / 0.0004)
    return finish(reverb(x, mix=mix, decay=0.32 if surface == 'carpet' else 0.16))


def write_mp3(name, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', '112k', os.path.join(OUT, name + '.mp3')], check=True)
    os.remove(tmp)


def main():
    made = {}
    for i in range(4):
        made[f'hit_flat{i}'] = racket(power=0.65 + 0.1 * rng.random(), brush=0.25, f0=540 + 50 * rng.random())
        made[f'hit_power{i}'] = racket(power=1.0, brush=0.15, f0=600 + 50 * rng.random())
    for i in range(3):
        made[f'hit_slice{i}'] = racket(power=0.35, brush=0.9, f0=500 + 40 * rng.random())
        made[f'hit_volley{i}'] = racket(power=0.45, brush=0.05, f0=620 + 60 * rng.random(), dry=True)
        for s in ('hard', 'clay', 'grass', 'carpet'):
            made[f'bounce_{s}{i}'] = bounce(s)
    for name, x in made.items():
        write_mp3(name, x)
    mpath = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(mpath))
    for name in made:
        manifest[name] = f'assets/audio/{name}.mp3'
    json.dump(manifest, open(mpath, 'w'), indent=1)
    print('wrote', len(made), 'sounds')


if __name__ == '__main__':
    main()
