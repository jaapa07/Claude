#!/bin/bash
# build.sh N [JOBS] : cues -> voice -> frames (JOBS parallel slices) -> mix -> mp4 (verified). Run from multiverso/.
set -e
N=$1; J=${2:-4}; D=episodes/ep$N
node tools/render.js $N $D --cues
[ -f $D/timing.json ] && [ "$REVOICE" != "1" ] || KOKORO_DIR=${KOKORO_DIR:-$PWD/models} python3 tools/voice.py $N
rm -rf $D/frames; mkdir -p $D/frames
TOTAL=2700; STEP=$(( (TOTAL + J - 1) / J ))
for i in $(seq 0 $((J-1))); do node tools/render.js $N $D/frames --from $((i*STEP)) --to $(((i+1)*STEP)) > $D/render_$i.log 2>&1 & done
wait; grep -h "done\|ERROR" $D/render_*.log; rm -f $D/render_*.log
python3 tools/mix.py $N
python3 tools/encode.py $N
