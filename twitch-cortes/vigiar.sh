#!/usr/bin/env bash
# Vigia um canal sem parar: quando está ao vivo grava e corta (9:16 + legenda);
# se a live cair, reinicia; se estiver offline, checa de novo a cada 5 min.
#   ./vigiar.sh alanzoka ./cortes_alanzoka ./models
set -u
CANAL=${1:?canal}; SAIDA=${2:-cortes_$CANAL}; MODELOS=${3:-}
DIR=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$SAIDA"
while true; do
  if yt-dlp -q --simulate "https://www.twitch.tv/$CANAL" >/dev/null 2>&1; then
    RUN="$SAIDA/$(date +%Y%m%d_%H%M%S)"
    echo "[$(date +%T)] $CANAL ao vivo – sessão $RUN"
    python3 -u "$DIR/cortes.py" live "$CANAL" --vertical --saida "$RUN" \
      --qualidade "best[height<=720]/best" --min-score "${MIN_SCORE:-4}" --gap "${GAP:-90}" \
      ${MODELOS:+--legendas "$MODELOS"}
    sleep 5
  else
    echo "[$(date +%T)] $CANAL offline, checando de novo em 5 min"
    sleep 300
  fi
done
