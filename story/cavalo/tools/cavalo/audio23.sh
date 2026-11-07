#!/bin/sh
# The sound of ch02 and ch03 (parts 2 and 3), rerun after any narration change (from story/cavalo/). SKILL as in audio.sh.
set -e
: "${SKILL:?set SKILL to the papermorph skill folder}"
for C in ch02 ch03; do
  N=content/cavalo/$C/narration.pt.json; A=site/cavalo/$C/audio/pt
  PYTHONPATH="$SKILL/scripts" python3 tools/cavalo/tts_kokoro.py "$N" "$A"
  python3 "$SKILL/scripts/level.py" "$A"/[znv]*.mp3
  python3 "$SKILL/scripts/mouths.py" "$N" "$A"
done
python3 "$SKILL/scripts/join.py" site/cavalo/ch02/audio/pt --words content/cavalo/ch02/narration.pt.json \
  scene1=z1,v1,z2,v2 \
  scene2=z3,sign:2.2,v3,z4,v4,z5,v5,z6,v6 \
  scene3=n1,v7,n2,z7,n3,v8,walk:2.4 \
  scene4=n4,z8,n5,z9,stare:1.6,v9,z10,flush:3.6
python3 "$SKILL/scripts/join.py" site/cavalo/ch03/audio/pt --words content/cavalo/ch03/narration.pt.json \
  scene1=door:3.4,z1,v1,n1,z2,n2 \
  scene2=n3,v2,run:1.6,z3,v3 \
  scene3=z4,z4b,n4,n5,push:3.0 \
  scene4=n6,z5,v4,z6,hide:2.6,v5,tail:3.6
for C in ch02 ch03; do mkdir -p site/cavalo/$C/audio; rm -rf site/cavalo/$C/audio/sfx; cp -r site/cavalo/ch01/audio/sfx site/cavalo/$C/audio/sfx; done
