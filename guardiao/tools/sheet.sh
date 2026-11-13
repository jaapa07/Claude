#!/bin/sh
# folha de contato: tools/sheet.sh <t1,t2,...> [colunas] [escala]
cd "$(dirname "$0")/.." && rm -rf out/stills && node tools/stills.mjs $1 out/stills ${3:-0.5} || exit 1; n=$(ls out/stills/t_*.jpg | wc -l); c=${2:-6}
ffmpeg -y -loglevel error -pattern_type glob -i "out/stills/t_*.jpg" -vf "scale=400:-1,tile=${c}x$(( (n + c - 1) / c ))" -frames:v 1 -update 1 out/sheet.jpg
