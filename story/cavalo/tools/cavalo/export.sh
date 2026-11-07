#!/bin/sh
# Export the parts to upright MP4s with captions burned in (from story/cavalo/, preview server on 8765). SKILL as in audio.sh.
set -e
: "${SKILL:?set SKILL to the papermorph skill folder}"
for n in "$@"; do
  C=ch0$n
  uv run -q --with playwright --with numpy python "$SKILL/scripts/export.py" $C --url http://localhost:8765/cavalo/ --out books/cavalo/export --no-tags --lufs -14 --timeout 300
  ffmpeg -v error -y -i books/cavalo/export/$C.mp4 -vf "subtitles=books/cavalo/export/$C.srt:force_style='FontName=DejaVu Sans,Bold=1,FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=70,Alignment=2'" \
    -c:v libx264 -crf 21 -preset medium -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart parte$n.mp4
  cp books/cavalo/export/$C.srt parte$n.srt
  echo "done parte$n"
done
