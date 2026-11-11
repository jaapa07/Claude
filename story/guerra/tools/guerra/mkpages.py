"""Writes site/guerra/chNN/index.html for every episode from one template (from story/guerra/)."""
import json, pathlib
EP = json.load(open('tools/guerra/episodes.json', encoding='utf-8'))
for n, ep in EP.items():
    scenes = ep['scenes']; nxt = f", next: '../ch0{int(n) + 1}/'" if int(n) < len(EP) else ''
    S = '\n'.join(f'<script src="scene{i + 1}.js"></script>' for i in range(len(scenes)))
    B = '\n'.join(f"  ['scene{i + 1}', {json.dumps(t, ensure_ascii=False)}, (m, D) => scene{i + 1}(panel(0), D, m), {{ lead: false, pre: PRE{i + 1} }}]," for i, t in enumerate(scenes))
    page = f'''<!doctype html>
<html lang="pt-BR" data-stage="portrait">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{ep['title']} · A Grande Guerra do Cocô</title>
<link rel="stylesheet" href="../lib/engine.css">
<link rel="expect" href="#bar" blocking="render">
</head>
<body>
<script src="../lib/engine.js"></script>
<script src="../img/sets/sets.js"></script>
<script src="../img/puppets/baked.js" onerror="0"></script>
<script src="../lib/paper.js"></script>
<script src="../lib/cast.js"></script>
<script src="../lib/toons.js"></script>
<script src="../lib/fx.js"></script>
<script src="audio/pt/timings.js"></script>
<script src="audio/pt/mouths.js"></script>
<script src="audio/pt/shots.js"></script>
<script src="../lib/shared.js"></script>
<script src="../lib/guerra.js"></script>
{S}
<script>
'use strict';
const CHAPTER = {{ number: {n}, title: {json.dumps(ep['title'], ensure_ascii=False)}, minutes: 1, language: 'pt', film: true{nxt} }};
try {{ if (localStorage.getItem('captions') === null) setCaptions(true, false); }} catch {{}}
const BEATS = [
{B}
].map(([id, title, run, extra]) => ({{ id, title, run, ...extra }}));
music('audio/sfx/marcha.mp3', undefined, .16);
paperWarm(g => {{ {ep['warm']} }});
boot();
</script>
</body>
</html>
'''
    pathlib.Path(f'site/guerra/ch0{n}/index.html').write_text(page, encoding='utf-8')
print('pages written')
