#!/bin/sh
# The sound of one episode: sh tools/guerra/audio.sh N (from story/guerra/). SKILL is Papermorph's skill folder.
set -e
: "${SKILL:?set SKILL to the papermorph skill folder}"
C=ch0$1; N=content/guerra/$C/narration.pt.json; A=site/guerra/$C/audio/pt
PYTHONPATH="$SKILL/scripts" python3 tools/guerra/tts_kokoro.py "$N" "$A"
python3 "$SKILL/scripts/level.py" "$A"/[a-z][0-9]*.mp3
# lines heard through a pipe or a recording: an echo (the clip keeps its length, so its word times stay)
for x in $(python3 -c "import json;print(' '.join(json.load(open('tools/guerra/echo.json')).get('$C',[])))"); do
  ffmpeg -v error -y -i "$A/$x.mp3" -af "aecho=0.8:0.7:120|260:0.45|0.3,highpass=f=250" -b:a 96k "$A/$x.e.mp3" && mv "$A/$x.e.mp3" "$A/$x.mp3"; done
python3 "$SKILL/scripts/mouths.py" "$N" "$A"
python3 "$SKILL/scripts/join.py" "$A" --words "$N" $(python3 -c "import json;print(' '.join(json.load(open('tools/guerra/joins.json'))['$C']))")
mkdir -p site/guerra/$C/audio/sfx && cp site/guerra/audio/sfx/*.mp3 site/guerra/$C/audio/sfx/
