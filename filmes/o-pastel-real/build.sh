#!/bin/sh
# O Pastel Real — três partes de 70 s, 1080×1920, 24 fps, pt-BR. Uso: sh build.sh [1|2|3]  (padrão: as três)
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-$HOME/lemo-opuscar}; export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"; cd "$LIB"
[ -f "$HERE/voices/K8.wav" ] || "$PY" core/tts/tts.py "$HERE/voices/lines.json" "$HERE/voices"
"$PY" "$HERE/tools/mouth.py"
for p in ${1:-1 2 3}; do
  node core/render/events.mjs "$HERE" --q part=$p --out "$HERE/out/ev$p.json"
  node core/render/video.mjs "$HERE" --fps 24 --workers 4 --size 1080x1920 --q part=$p --out "$HERE/out/video$p.mp4"
  "$PY" "$HERE/mix.py" $p
  sh core/render/mux.sh "$HERE/out/video$p.mp4" "$HERE/out/mix$p.wav" "$HERE/o-pastel-real-parte-$p.mp4" 24 0
done
