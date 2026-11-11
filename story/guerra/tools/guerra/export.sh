#!/bin/sh
# Export episodes: sh tools/guerra/export.sh 1 2 … (from story/guerra/, preview server on 8766). SKILL as in audio.sh.
# Writes videos/epN.mp4 (captions burned in, for the feeds) and videos/epN.srt.
set -e
: "${SKILL:?set SKILL to the papermorph skill folder}"
mkdir -p videos
for n in "$@"; do
  C=ch0$n
  uv run -q --with playwright --with numpy python "$SKILL/scripts/export.py" $C --url http://localhost:8766/guerra/ --out books/guerra/export --no-tags --lufs -14 --timeout 300
  ffmpeg -v error -y -i books/guerra/export/$C.mp4 -vf "subtitles=books/guerra/export/$C.srt:force_style='FontName=DejaVu Sans,Bold=1,FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=60,Alignment=2'" \
    -c:v libx264 -crf 21 -preset medium -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart videos/ep$n.mp4
  cp books/guerra/export/$C.srt videos/ep$n.srt
  echo "done ep$n"
done
