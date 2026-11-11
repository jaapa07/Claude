#!/bin/sh
# O Condomínio dos Desgraçados — 5 episódios × 90 s, 1080×1920, 30 fps, pt-BR. Uso: sh build.sh [ep...]  (padrão: 1 2 3 4 5)
# Precisa da biblioteca Lemo-Opuscar (LIB) com deps core + voice + music e ffmpeg 7+ (FFMPEG).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-$HOME/lemo-opuscar}; export LIB; FF=${FFMPEG:-ffmpeg}
PY="$LIB/.venv/bin/python"; cd "$LIB"
"$PY" "$HERE/tools/voices.py"; "$PY" "$HERE/tools/mouth.py"
for e in ${*:-1 2 3 4 5}; do
  node core/render/events.mjs "$HERE" --q ep=$e --out "$HERE/out/ev$e.json"
  node core/render/video.mjs "$HERE" --fps 30 --workers 4 --size 1080x1920 --q ep=$e --out "$HERE/out/video$e.mp4"
  "$PY" "$HERE/mix.py" $e
  sh core/render/mux.sh "$HERE/out/video$e.mp4" "$HERE/out/mix$e.wav" "$HERE/out/mux$e.mp4" 30 0
  "$FF" -v error -y -i "$HERE/out/mux$e.mp4" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -force_key_frames "expr:eq(n,0)+eq(n,39)+eq(n,2699)" -x264-params keyint=90 -c:a copy -movflags +faststart "$HERE/ep$e.mp4"
done
cd "$HERE"; python3 tools/srt.py
printf "file '../ep1.mp4'\nfile '../ep2.mp4'\nfile '../ep3.mp4'\nfile '../ep4.mp4'\nfile '../ep5.mp4'\n" > out/concat.txt
"$FF" -v error -y -f concat -safe 0 -i out/concat.txt -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -force_key_frames "expr:eq(mod(n,2700),0)+eq(mod(n,2700),39)+eq(mod(n,2700),2699)" -x264-params keyint=90 -c:a aac -b:a 160k -movflags +faststart serie-completa.mp4
FFMPEG="$FF" "$PY" tools/validate.py
