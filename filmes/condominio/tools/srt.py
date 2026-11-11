"""Subtitles from the timeline: out/ev<ep>.json → ep<ep>.srt / ep<ep>.vtt, and the full series → serie-completa.srt/.vtt (offset 90 s per episode)."""
import json, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ts(t, sep=','): h, r = divmod(max(0, t), 3600); m, s = divmod(r, 60); return f"{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s % 1) * 1000)) % 1000:03d}"
def cues(ep):
    ev = json.load(open(os.path.join(HERE, 'out', f'ev{ep}.json')))
    L = sorted([e for e in ev['ev'] if e['type'] == 'line'], key=lambda e: e['t']); out = []
    for i, l in enumerate(L):
        t0 = l['t'] - .05; t1 = l['t'] + max(l['d'] + .45, 1.5)
        if i + 1 < len(L): t1 = min(t1, L[i + 1]['t'] - .06)
        t1 = min(t1, ev['dur'])
        out.append((t0, t1, l['text']))
    return out, ev['dur']
def write(path, cs, vtt=False):
    with open(path, 'w', encoding='utf-8') as f:
        if vtt: f.write('WEBVTT\n\n')
        for i, (a, b, s) in enumerate(cs, 1):
            f.write(('' if vtt else f'{i}\n') + f"{ts(a, '.' if vtt else ',')} --> {ts(b, '.' if vtt else ',')}\n{s}\n\n")
allc, off = [], 0
for ep in range(1, 6):
    cs, d = cues(ep); write(os.path.join(HERE, f'ep{ep}.srt'), cs); write(os.path.join(HERE, f'ep{ep}.vtt'), cs, True)
    allc += [(a + off, b + off, s) for a, b, s in cs]; off += d
write(os.path.join(HERE, 'serie-completa.srt'), allc); write(os.path.join(HERE, 'serie-completa.vtt'), allc, True)
print('srt ok', len(allc), 'cues')
