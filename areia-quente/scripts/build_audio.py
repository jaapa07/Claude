"""Áudio do AREIA QUENTE: converte e corta as fontes CC0 (OpenGameArt, Kenney) para public/assets/audio
e sintetiza os apitos de árbitro (não havia gravação CC0 disponível)."""
import os, subprocess, wave, struct, math, random
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, '.cache', 'src')
OUT = os.path.join(ROOT, 'public', 'assets', 'audio')
for d in ('music', 'sfx', 'crowd', 'ambient'):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)
OGA = os.path.join(SRC, 'oga')
KI = os.path.join(SRC, 'kenney', 'impact-sounds', 'Audio')
KU = os.path.join(SRC, 'kenney', 'interface-sounds', 'Audio')


def ff(src, dst, *args, br='128k', mono=False):
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', src, *args, '-ac', '1' if mono else '2', '-ar', '44100', '-b:a', br, dst]
    subprocess.run(cmd, check=True)


def music():
    m = os.path.join(OUT, 'music')
    ff(os.path.join(OGA, 'mad_bossa', 'Mad Bossa.ogg'), os.path.join(m, 'menu.mp3'), '-af', 'loudnorm=I=-16')
    ff(os.path.join(OGA, 'Of Far Different Nature - Funky House (CC0)_0.mp3'), os.path.join(m, 'select.mp3'), '-af', 'loudnorm=I=-16')
    ff(os.path.join(OGA, 'crystal_beach_0.mp3'), os.path.join(m, 'halftime.mp3'), '-t', '120', '-af', 'loudnorm=I=-17,afade=t=out:st=116:d=4')
    ff(os.path.join(OGA, 'fever_stadium_bpm165_0.ogg'), os.path.join(m, 'fire.mp3'), '-af', 'loudnorm=I=-15')
    ff(os.path.join(OGA, 'fever_stadium_climax_bpm180_0.ogg'), os.path.join(m, 'victory.mp3'), '-af', 'loudnorm=I=-15')


def crowd():
    c = os.path.join(OUT, 'crowd')
    ff(os.path.join(OGA, 'crowd_shouting_0.ogg'), os.path.join(c, 'ambience.mp3'), '-af', 'loudnorm=I=-22', br='96k')
    ff(os.path.join(OGA, 'oooooooooo.ogg'), os.path.join(c, 'ooh.mp3'), '-af', 'loudnorm=I=-16', br='96k')
    ff(os.path.join(OGA, 'applause-clapping-church-crowd-immersive.wav'), os.path.join(c, 'applause.mp3'), '-t', '9', '-af', 'loudnorm=I=-16,afade=t=out:st=7:d=2', br='96k')
    # explosão do gol: aplauso + gritaria somados, com ataque forte
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(OGA, 'applause-clapping-church-crowd-immersive.wav'),
                    '-i', os.path.join(OGA, 'crowd_shouting_0.ogg'), '-filter_complex',
                    '[0]atrim=0:7,volume=1.2[a];[1]atrim=2:9,volume=1.6[b];[a][b]amix=inputs=2:normalize=0,loudnorm=I=-13,afade=t=in:d=0.05,afade=t=out:st=5.5:d=1.5',
                    '-ac', '2', '-ar', '44100', '-b:a', '112k', os.path.join(c, 'goal.mp3')], check=True)


def ambient():
    a = os.path.join(OUT, 'ambient')
    ff(os.path.join(OGA, 'wave_01_cc0-18363__jasinski__alkaibeach.flac'), os.path.join(a, 'waves1.mp3'), br='96k')
    ff(os.path.join(OGA, 'wave_02_cc0-18363__jasinski__alkaibeach.flac'), os.path.join(a, 'waves2.mp3'), br='96k')
    ff(os.path.join(OGA, 'Seagull Ambient 1.wav'), os.path.join(a, 'gull1.mp3'), br='96k', mono=True)
    ff(os.path.join(OGA, 'Seagull Ambient 3.wav'), os.path.join(a, 'gull2.mp3'), br='96k', mono=True)


def sfx():
    s = os.path.join(OUT, 'sfx')
    pairs = {
        'kick_soft': (KI, 'impactSoft_medium_001.ogg'), 'kick': (KI, 'impactPunch_medium_002.ogg'),
        'kick_hard': (KI, 'impactPunch_heavy_003.ogg'), 'bounce': (KI, 'impactSoft_heavy_000.ogg'),
        'post': (KI, 'impactMetal_heavy_002.ogg'), 'net': (KI, 'impactSoft_heavy_004.ogg'),
        'tackle': (KI, 'footstep_snow_002.ogg'), 'body': (KI, 'impactPunch_medium_000.ogg'),
        'catch': (KI, 'impactSoft_medium_004.ogg'), 'step1': (KI, 'footstep_snow_000.ogg'), 'step2': (KI, 'footstep_snow_003.ogg'),
        'ui_move': (KU, 'switch_002.ogg'), 'ui_ok': (KU, 'confirmation_002.ogg'), 'ui_back': (KU, 'back_002.ogg'),
        'ui_error': (KU, 'error_004.ogg'), 'ui_tick': (KU, 'tick_002.ogg'), 'ui_pop': (KU, 'maximize_006.ogg'),
        'style': (KU, 'pluck_001.ogg'), 'combo': (KU, 'maximize_008.ogg'), 'fire_on': (KU, 'glitch_003.ogg'),
    }
    for k, (d, f) in pairs.items():
        ff(os.path.join(d, f), os.path.join(s, k + '.mp3'), br='96k', mono=True)
    ff(os.path.join(OGA, 'sand_footsteps_0.mp3'), os.path.join(s, 'sand_run.mp3'), '-t', '4', br='96k', mono=True)


def whistle_wav(path, pattern):
    """Apito de ervilha: tom ~2.9 kHz com trinado (modulação ~28 Hz) e ruído de sopro."""
    sr = 44100
    rnd = np.random.default_rng(7)
    out = []
    for dur, gap in pattern:
        n = int(sr * dur)
        t = np.arange(n) / sr
        trill = 0.5 + 0.5 * np.sin(2 * np.pi * 28 * t)
        f = 2900 + 140 * trill
        ph = 2 * np.pi * np.cumsum(f) / sr
        tone = np.sin(ph) * (0.55 + 0.45 * trill) + 0.25 * np.sin(2 * ph)
        noise = rnd.normal(0, 1, n)
        noise = np.convolve(noise, np.ones(6) / 6, 'same') * 0.12
        env = np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.05)
        out.append((tone + noise) * env * 0.5)
        out.append(np.zeros(int(sr * gap)))
    y = np.concatenate(out)
    y = (y / np.max(np.abs(y)) * 0.8 * 32767).astype(np.int16)
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes())


def whistles():
    s = os.path.join(OUT, 'sfx')
    tmp = os.path.join(ROOT, '.cache', 'build')
    os.makedirs(tmp, exist_ok=True)
    for name, pat in (('whistle_short', [(0.35, 0.05)]), ('whistle_long', [(1.1, 0.05)]),
                      ('whistle_end', [(0.5, 0.15), (0.5, 0.15), (1.4, 0.05)]), ('whistle_foul', [(0.25, 0.08), (0.45, 0.05)])):
        p = os.path.join(tmp, name + '.wav')
        whistle_wav(p, pat)
        ff(p, os.path.join(s, name + '.mp3'), br='96k', mono=True)


if __name__ == '__main__':
    music(); crowd(); ambient(); sfx(); whistles()
    print('audio ok')
