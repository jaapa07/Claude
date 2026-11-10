"""One timeline for picture, subtitles and mix: python3 tools/timeline.py → timeline.json + a-luz-das-tres.srt"""
import json, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(HERE, 'voices')
dur = json.load(open(os.path.join(V, 'dur.json')))
lines = {l['id']: l for l in json.load(open(os.path.join(V, 'lines.json'), encoding='utf-8'))}
DUR = 90.0
AT = {'L1': 1.4, 'L2': 5.9, 'L3': 10.9, 'L4': 15.4, 'L5': 18.4, 'L6': 23.2, 'L7': 26.6, 'L8': 29.9,
      'L9': 37.6, 'L10': 43.8, 'L11': 49.4, 'L12': 54.0, 'L13': 57.0, 'L14': 61.0, 'L15': 65.6, 'L16': 80.2, 'L17': 85.2}
L = {}
for k, t in AT.items():
    d = dur[k]; L[k] = {'at': t, 'dur': d, 'end': round(t + d, 3), 'text': lines[k]['sub']}
ids = list(AT)
for a, b in zip(ids, ids[1:]): assert L[a]['end'] + .25 < L[b]['at'], (a, b)
cues = []
for i, k in enumerate(ids):
    t0 = L[k]['at'] - .15; t1 = max(L[k]['end'] + .6, t0 + 1.8)
    if i + 1 < len(ids): t1 = min(t1, L[ids[i + 1]]['at'] - .16)
    cues.append({'id': k, 't0': round(t0, 3), 't1': round(t1, 3), 'text': L[k]['text']})
HIT = {
  'pin': .5, 'iris': [4.6, 9.2],
  'nurse': [22.4, 28.6], 'boy': [26.0, 30.4], 'bus': [29.4, 35.5],
  'bells': [35.6, 36.4, 37.2], 'silence': [41.4, 43.6],
  'nurse2': [43.4, 46.2], 'boy2': [44.6, 47.0],
  'knock': [48.6, 48.95, 49.3], 'open': 51.6,
  'oven': 72.6, 'strips': [68.2, 69.4, 70.6, 71.8],
  'wins': [round(74.9 + i * .42, 3) for i in range(14)], 'pull': 82.8, 'title': 86.2, 'end': 89.4,
}
SHOTS = [['S1', 0.0, None], ['S2', 10.0, 'dissolve'], ['S3', 22.0, 'dissolve'], ['S4', 35.2, 'dark'], ['S5', 48.0, 'dissolve'],
         ['S5b', 53.0, 'dissolve'], ['S6', 60.2, 'dissolve'], ['S7', 73.6, 'flash']]
json.dump({'DUR': DUR, 'L': L, 'cues': cues, 'HIT': HIT, 'SHOTS': SHOTS}, open(os.path.join(HERE, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
def ts(t): h, r = divmod(t, 3600); m, s = divmod(r, 60); return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"
with open(os.path.join(HERE, 'a-luz-das-tres.srt'), 'w', encoding='utf-8') as f:
    for i, c in enumerate(cues, 1): f.write(f"{i}\n{ts(c['t0'])} --> {ts(c['t1'])}\n{c['text']}\n\n")
print('timeline ok', len(cues), 'cues')
