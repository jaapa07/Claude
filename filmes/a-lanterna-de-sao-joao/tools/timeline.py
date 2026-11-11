"""One timeline for picture, subtitles and mix: python3 tools/timeline.py → timeline.json + a-lanterna-de-sao-joao.srt"""
import json, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(HERE, 'voices')
dur = json.load(open(os.path.join(V, 'dur.json')))
lines = {l['id']: l for l in json.load(open(os.path.join(V, 'lines.json'), encoding='utf-8'))}
DUR = 120.0
AT = {'L1': 3.2, 'L2': 10.6, 'L3': 18.2, 'L4': 22.6, 'L5': 29.0, 'L6': 46.0, 'L7': 54.0, 'L8': 64.2, 'L9': 71.0,
      'L10a': 78.6, 'L10b': 84.4, 'L11': 90.0, 'L12': 97.6, 'L13': 106.0, 'L14': 111.8}
NOSUB = {'L3'}          # these words appear as paper on the envelope: never show the same words twice
L = {}
for k, t in AT.items():
    d = dur[k]; L[k] = {'at': t, 'dur': d, 'end': round(t + d, 3), 'text': lines[k]['sub']}
ids = list(AT)
for a, b in zip(ids, ids[1:]): assert L[a]['end'] + .25 < L[b]['at'], (a, b, L[a]['end'])
cues = []
for i, k in enumerate(ids):
    if k in NOSUB: continue
    t0 = L[k]['at'] - .15; t1 = max(L[k]['end'] + .6, t0 + 1.8)
    if i + 1 < len(ids): t1 = min(t1, L[ids[i + 1]]['at'] - .16)
    cues.append({'id': k, 't0': round(t0, 3), 't1': round(t1, 3), 'text': L[k]['text']})
HIT = {
  'cover': 2.2,
  'push': [4.4, 9.2], 'glint': 9.6, 'pick': 14.6,
  'addr': [18.2, 19.6, 21.0], 'stamp': 17.9,
  'ride': [28.0, 45.0], 'fires': [32.3, 36.9, 41.6],
  'row': [45.0, 62.5], 'strokes': [47.0, 49.2, 51.4, 53.6, 55.8, 58.0, 60.2],
  'knock': [63.0, 63.35], 'open': 64.0, 'hand': 68.6,
  'ink': [78.7, 80.2, 81.7, 84.5, 85.6], 'lanternDraw': 82.0,
  'dark': 90.0, 'light': 100.4, 'answer': 105.0, 'bridge': [108.4, 111.4], 'balloons': 110.0, 'pull': 114.8, 'end': 119.5,
}
SHOTS = [['S0', 0.0, None], ['S1', 2.2, 'dissolve'], ['S2', 17.4, 'dissolve'], ['S3', 28.0, 'dissolve'], ['S4', 45.0, 'dissolve'],
         ['S5', 62.5, 'dissolve'], ['S2b', 77.5, 'dissolve'], ['S6', 88.5, 'dissolve']]
json.dump({'DUR': DUR, 'L': L, 'cues': cues, 'HIT': HIT, 'SHOTS': SHOTS}, open(os.path.join(HERE, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
def ts(t): h, r = divmod(t, 3600); m, s = divmod(r, 60); return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}"
with open(os.path.join(HERE, 'a-lanterna-de-sao-joao.srt'), 'w', encoding='utf-8') as f:
    for i, c in enumerate(cues, 1): f.write(f"{i}\n{ts(c['t0'])} --> {ts(c['t1'])}\n{c['text']}\n\n")
print('timeline ok', len(cues), 'cues')
