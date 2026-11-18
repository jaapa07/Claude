# Cortes automáticos da Twitch (ex.: alanzoka)

Detecta os melhores momentos de uma live/VOD e gera os cortes em MP4 (16:9 ou 9:16 para Shorts/Reels/TikTok).

**Como detecta**
- **Chat**: picos de mensagens por segundo, com peso extra para hype (`KKKK`, `LUL`, `KEKW`, `CLIP`, `???`…), comparados com a média local da live (z-score robusto). O sinal é deslocado ~6 s para trás, porque o chat reage depois do momento.
- **Áudio** (modo `local`): picos de volume (gritos, risadas, explosões).
- Pega os N maiores picos com distância mínima entre eles e corta `--pre` s antes e `--post` s depois.

## Instalação
```bash
pip install -r requirements.txt   # yt-dlp, chat-downloader (VOD), websocket-client (chat ao vivo); precisa de ffmpeg
```

## Uso
```bash
# VOD: baixa só o chat, acha os picos e baixa apenas os trechos escolhidos
python cortes.py vod https://www.twitch.tv/videos/<ID> --top 15 --vertical

# Live em andamento: grava em segmentos e corta sozinho quando o chat explode (Ctrl+C para parar)
python cortes.py live alanzoka --vertical

# YouTube (live em andamento ou vídeo gravado com replay do chat)
python cortes.py live "https://www.youtube.com/watch?v=<ID>" --vertical --saida cortes_yt

# Vídeo já baixado (+ chat JSON do chat-downloader ou do TwitchDownloader)
python cortes.py local live.mp4 --chat chat.json
```
Saída: `cortes/corte_XX_HH-MM-SS.mp4` + `cortes/cortes.json` (início, fim, score).

Ajustes úteis: `--min-score` (sensibilidade, padrão 6; numa live movimentada 4 já pega bons picos), `--gap` (s entre cortes), `--chat-lag`, `--pre/--post`, `--duracao` (live: para após N s).

Funciona atrás de proxy HTTP (`HTTPS_PROXY`): o chat ao vivo usa WebSocket na porta 443 e o ffmpeg recebe `-http_proxy`.

## Vigiar o canal sem parar
```bash
./vigiar.sh alanzoka cortes_alanzoka models   # grava, corta (9:16) e legenda cada pico do chat
```
Reinicia se a live cair, espera o canal voltar se estiver offline e apaga segmentos com mais de 5 min (disco fica estável). Ajuste com `MIN_SCORE=5 GAP=120 ./vigiar.sh ...`; `SO_SRT=1 ./vigiar.sh ...` gera só o vídeo limpo + `.srt` (sem queimar legenda).

## Legendas estilo TikTok/Reels
`legendas.py` transcreve offline (Whisper turbo ou small multilíngue via `sherpa-onnx` + VAD Silero) e queima legendas grandes, 3 palavras por vez, alternando branco/amarelo, logo abaixo da faixa do vídeo no 9:16. 
- **Só o streamer**: cada trecho de fala passa por identificação de idioma (Whisper small); o que não é português (diálogo do jogo) é descartado, em vez de traduzido. Por isso a pasta de modelos precisa do `sherpa-onnx-whisper-small` além do turbo. Testei impressão vocal (wespeaker/3D-Speaker), mas com o som do jogo misturado ela agrupa por cena, não por pessoa.
- **Gritos**: blocos 5 dB acima da fala normal do corte saem maiores, em vermelho, com tremida e "!".
- **Sincronia**: palavras distribuídas só nos quadros com voz (pausas não atrasam a legenda).
- Gera também `corte.srt` (frases de até ~8 palavras, máx. 2 linhas, mesmos tempos) para subir como legenda editável no YouTube/TikTok/Instagram/CapCut.
- No 9:16 a legenda fica ancorada logo abaixo da faixa do vídeo (nunca cobre o jogo).
```bash
pip install sherpa-onnx numpy
mkdir models && cd models
curl -LO https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx && mv silero_vad.onnx vad.onnx
curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2 | tar xj   # melhor; "small" é mais leve
cd .. && python legendas.py --modelos models cortes/*.mp4   # → *_legendado.mp4 + .srt + .ass
```

Projetos open source em que esta abordagem se inspira: `yt-dlp`, `xenova/chat-downloader`, `lay295/TwitchDownloader` (chat JSON compatível).

> Respeite os direitos do criador: publique cortes conforme as regras do canal/Twitch.
