#!/bin/sh
# folha de contato: tools/sheet.sh <ep> <t1,t2,...> [colunas]
cd "$(dirname "$0")/.." && rm -f out/stills/ep$1_*.jpg && node tools/stills.mjs $1 $2 out/stills ${4:-0.5} | grep -v "^ep" ; n=$(ls out/stills/ep$1_*.jpg | wc -l); c=${3:-5}
ffmpeg -y -loglevel error -pattern_type glob -i "out/stills/ep$1_*.jpg" -vf "scale=400:-1,tile=${c}x$(( (n + c - 1) / c ))" -frames:v 1 -update 1 out/stills/sheet$1.jpg
