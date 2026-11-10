#!/bin/sh
# One command: A Luz das Três (Paper-cut Lightbox), 90 s, 1920×1080, 24 fps, pt-BR
# Needs the Lemo-Opuscar library (LIB) with deps core + voice + music and the VSCO 2 CE samples.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"; FPS=24; WORKERS=${WORKERS:-4}
cd "$LIB"
[ -f "$HERE/voices/L17.wav" ] || "$PY" core/tts/tts.py "$HERE/voices/lines.json" "$HERE/voices"
python3 "$HERE/tools/timeline.py"
node core/render/video.mjs "$HERE" --fps $FPS --workers $WORKERS --q "ssaa=${SSAA:-1}" --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/a-luz-das-tres.mp4" $FPS 0
node core/render/still.mjs "$HERE" 81 --q "nosub=1" --out "$HERE/out/stills"
ffmpeg -loglevel error -y -i "$HERE/out/stills/t_81.jpg" -q:v 3 "$HERE/poster.jpg"
echo "→ $HERE/a-luz-das-tres.mp4"
