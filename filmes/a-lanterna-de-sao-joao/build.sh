#!/bin/sh
# One command: A Lanterna de São João (Paper-cut Lightbox), 120 s, 1920×1080, 24 fps, pt-BR
# Needs the Lemo-Opuscar library (LIB) with deps core + voice + music, the VSCO 2 CE and FreePats samples, ffmpeg 7+.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}; export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"; FPS=24; WORKERS=${WORKERS:-4}
cd "$LIB"
[ -f "$HERE/voices/L14.wav" ] || "$PY" core/tts/tts.py "$HERE/voices/lines.json" "$HERE/voices"
python3 "$HERE/tools/timeline.py"
node core/render/video.mjs "$HERE" --fps $FPS --workers $WORKERS --q "ssaa=${SSAA:-1}" --out "$HERE/out/video.mp4"
"$PY" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/a-lanterna-de-sao-joao.mp4" $FPS 0
ffmpeg -loglevel error -y -i "$HERE/a-lanterna-de-sao-joao.mp4" -frames:v 1 -q:v 2 "$HERE/capa.jpg"
ffmpeg -loglevel error -y -ss 113 -i "$HERE/a-lanterna-de-sao-joao.mp4" -frames:v 1 -q:v 3 "$HERE/poster.jpg"
echo "→ $HERE/a-lanterna-de-sao-joao.mp4"
