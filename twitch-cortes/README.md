# Cortes automáticos da Twitch (ex.: alanzoka)

Detecta os melhores momentos de uma live/VOD e gera os cortes em MP4 (16:9 ou 9:16 para Shorts/Reels/TikTok).

**Como detecta**
- **Chat**: picos de mensagens por segundo, com peso extra para hype (`KKKK`, `LUL`, `KEKW`, `CLIP`, `???`…), comparados com a média local da live (z-score robusto). O sinal é deslocado ~6 s para trás, porque o chat reage depois do momento.
- **Áudio** (modo `local`): picos de volume (gritos, risadas, explosões).
- Pega os N maiores picos com distância mínima entre eles e corta `--pre` s antes e `--post` s depois.

## Instalação
```bash
pip install -r requirements.txt   # yt-dlp + chat-downloader; precisa de ffmpeg no PATH
```

## Uso
```bash
# VOD: baixa só o chat, acha os picos e baixa apenas os trechos escolhidos
python cortes.py vod https://www.twitch.tv/videos/<ID> --top 15 --vertical

# Live em andamento: grava em segmentos e corta sozinho quando o chat explode (Ctrl+C para parar)
python cortes.py live alanzoka --vertical

# Vídeo já baixado (+ chat JSON do chat-downloader ou do TwitchDownloader)
python cortes.py local live.mp4 --chat chat.json
```
Saída: `cortes/corte_XX_HH-MM-SS.mp4` + `cortes/cortes.json` (início, fim, score).

Ajustes úteis: `--min-score` (sensibilidade, padrão 6), `--gap` (s entre cortes), `--chat-lag`, `--pre/--post`.

Projetos open source em que esta abordagem se inspira: `yt-dlp`, `xenova/chat-downloader`, `lay295/TwitchDownloader` (chat JSON compatível).

> Respeite os direitos do criador: publique cortes conforme as regras do canal/Twitch.
