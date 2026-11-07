#!/bin/sh
# The whole sound of ch01, rerun after any change to the narration (from story/cavalo/).
# SKILL is Papermorph's skill folder (.claude/skills/papermorph in a checkout of DozenTwelve/Papermorph).
set -e
: "${SKILL:?set SKILL to the papermorph skill folder}"
N=content/cavalo/ch01/narration.pt.json; A=site/cavalo/ch01/audio/pt; X=site/cavalo/ch01/audio/sfx
PYTHONPATH="$SKILL/scripts" python3 tools/cavalo/tts_kokoro.py "$N" "$A"
python3 "$SKILL/scripts/level.py" "$A"/[znv]*.mp3
python3 "$SKILL/scripts/mouths.py" "$N" "$A"
python3 "$SKILL/scripts/join.py" "$A" --words "$N" \
  scene1=z1,v1,z2,v2,z3,v3 \
  scene2=z4,v4,z5,v5,tug:2.6,v6 \
  scene3=n1,z6,n2,v7,n3 \
  scene4=v8,z7,slide:4.2,v9,z8,v10,z9 \
  scene5=n4,z10,n5,v11,n6,z11,n7,n8,v12,n9,flush:2.4 \
  scene6=v13,tail:3.4
uv run -q --with numpy python "$SKILL/scripts/sfx.py" "$X" clop crash bang thud bell door splash whoosh laugh slurp coin beep room bonk scrape sting clack creak pop boing latch yip \
  --recipes tools/cavalo/sfx_cavalo.py
uv run -q --with numpy python "$SKILL/scripts/sfx.py" "$X" neigh flush sizzle samba --recipes tools/cavalo/sfx_cavalo.py
