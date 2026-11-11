"""Mouth-open envelopes for lip sync: voices/<id>.wav → voices/mouth.json (30 values per second, 0..1)."""
import json, os, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); V = os.path.join(HERE, 'voices')
out = {}
for l in json.load(open(os.path.join(V, 'lines.json'))):
    a, sr = sf.read(os.path.join(V, l['id'] + '.wav'), dtype='float32'); a = a if a.ndim == 1 else a.mean(1)
    hop = sr // 30; n = len(a) // hop + 1
    e = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2) + 1e-9) for i in range(n)])
    e = np.clip((20 * np.log10(e) + 42) / 26, 0, 1)
    # snappier: open on syllables, close between them
    e = np.where(e > .15, e, 0); out[l['id']] = [round(float(x), 2) for x in e]
json.dump(out, open(os.path.join(V, 'mouth.json'), 'w'))
print('mouth ok', len(out))
