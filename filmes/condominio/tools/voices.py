"""Cast voices (Kokoro, pt-BR only) with per-character pitch and processing → voices/<id>.wav, dur.json, lines.json.
python tools/voices.py   (run with the library's .venv python; LIB = library folder)
Kokoro has three pt-BR voices (pf_dora, pm_alex, pm_santa); characters are told apart by pitch (resampling, with the
speaking rate compensated beforehand), timbre filters and effects (robot ring-modulation, demon distortion, intercom)."""
import os, sys, json, numpy as np, soundfile as sf, soxr
from scipy.signal import butter, sosfilt
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(HERE, 'voices')
LIB = os.environ.get('LIB') or '/home/user/lemomo-ai/lemo-opuscar'
from kokoro_onnx import Kokoro
K = Kokoro(os.path.join(LIB, 'core/tts/kokoro-v1.0.onnx'), os.path.join(LIB, 'core/tts/voices-v1.0.bin'))
SR = 24000
# character → (kokoro voice, pitch factor, speaking speed, effect)
CAST = {
  'jun':   ('pm_alex', 1.00, 1.08, 'dry'),
  'osv':   ('pm_santa', .84, 1.02, 'boom'),
  'cle':   ('pf_dora', 1.30, 1.10, 'nasal'),
  'car':   ('pm_alex', .70, .92, 'tired'),
  'vaso':  ('pm_santa', 1.06, 1.0, 'robot'),
  'elev':  ('pf_dora', .96, .98, 'intercom'),
  'dem':   ('pm_santa', .62, .95, 'demon'),
  'ia':    ('pf_dora', 1.04, 1.0, 'ai'),
  'chefe': ('pm_santa', 1.18, 1.0, 'dry'),
}
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def trim(a, th=.01):
    i = np.where(np.abs(a) > th)[0]; return a[max(0, i[0] - 240):i[-1] + 480] if len(i) else a
def fx(a, kind):
    t = np.arange(len(a)) / SR
    if kind == 'boom': a = a + .5 * lp(a, 300)
    elif kind == 'nasal': a = a + .9 * bp(a, 1200, 3200) - .4 * lp(a, 250)
    elif kind == 'tired': a = lp(a, 3800) + .3 * lp(a, 200)
    elif kind == 'robot':
        a = a * (.55 + .45 * np.sin(2 * np.pi * 55 * t)); q = 24.; a = np.round(a * q) / q; a = a + .25 * np.roll(a, int(.012 * SR))
    elif kind == 'intercom': a = bp(a, 400, 3400) * 1.6; a = np.tanh(a * 2) * .6
    elif kind == 'demon':
        a = np.tanh(a * 4) * .5 + .5 * lp(a, 400)
        d = np.zeros_like(a)
        for dl, g in [(.045, .5), (.09, .35), (.16, .25)]: k = int(dl * SR); d[k:] += a[:-k] * g
        a = a + d
    elif kind == 'ai':
        a = a * (.6 + .4 * np.sin(2 * np.pi * 90 * t)); a = a + .4 * np.roll(a, int(.007 * SR)) + .3 * np.roll(a, int(.019 * SR))
    return a
lines, dur = [], {}
for row in open(os.path.join(V, 'script.tsv'), encoding='utf-8'):
    row = row.rstrip('\n')
    if not row: continue
    f = row.split('\t'); lid, who, ep, sub = f[:4]; say = f[4] if len(f) > 4 else sub
    voice, p, spd, kind = CAST[who]
    out = os.path.join(V, lid + '.wav')
    lines.append({'id': lid, 'who': who, 'ep': int(ep), 'sub': sub})
    if os.path.exists(out) and '--force' not in sys.argv:
        dur[lid] = round(sf.info(out).duration, 3); continue
    a, sr = K.create(say, voice=voice, speed=min(4, max(.5, spd / p)), lang='pt-br')
    a = soxr.resample(a.astype(np.float64), sr, sr / p)          # played back at sr → pitch × p, duration ÷ p
    a = trim(fx(trim(a), kind)); a = a / (np.abs(a).max() + 1e-9) * .9
    sf.write(out, a.astype(np.float32), SR); dur[lid] = round(len(a) / SR, 3)
    print(lid, who, dur[lid], sub)
json.dump(dur, open(os.path.join(V, 'dur.json'), 'w'), indent=0)
json.dump(lines, open(os.path.join(V, 'lines.json'), 'w'), ensure_ascii=False, indent=0)
print('voices', len(lines), 'total', round(sum(dur.values()), 1), 's')
