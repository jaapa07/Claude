#!/bin/bash
# bar_render_all.sh : render, encode and put the cover in front of every part of the two bar series
cd "$(dirname "$0")"
for d in bar_sem_agua/part1 bar_sem_agua/part2 bar_sem_agua/part3 bar_meia/part1 bar_meia/part2 bar_meia/part3 bar_meia/part4; do
  n=$(basename $d)
  [ -f $d/$n.mp4 ] && { echo "$d already done"; continue; }
  node engine/render.js "$d/film.html#cover" $d/cover > /dev/null && cp $d/cover/at_0.00.jpg $d/cover.jpg
  rm -rf $d/frames; node engine/render.js $d/film.html $d/frames --force > $d/render.log 2>&1 || { echo "$d render failed"; tail -3 $d/render.log; continue; }
  python3 engine/encode.py $d | grep -E "mp4|pacing"
  ffmpeg -v error -y -loop 1 -framerate 30 -t 0.5 -i $d/cover.jpg -f lavfi -t 0.5 -i anullsrc=r=48000:cl=stereo -i $d/$n.mp4 \
    -filter_complex "[0:v]format=yuv420p,setsar=1[c];[2:v]setsar=1[m];[2:a]aresample=48000,aformat=channel_layouts=stereo[ma];[c][1:a][m][ma]concat=n=2:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" -c:v libx264 -crf 23 -maxrate 1500k -bufsize 3000k -preset slow -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k -movflags +faststart $d/${n}_c.mp4 && mv $d/${n}_c.mp4 $d/$n.mp4
  echo "$d done $(date +%H:%M)"
done
