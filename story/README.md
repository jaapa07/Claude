# story/: estúdio de vídeos de terror com stickmen

`story_video_prompt.md` é o sistema original. Esta pasta é ele rodando, com a série **Réveillon de 1999**.

| Pasta | O que tem |
|---|---|
| `part1/` | `part1.mp4` (60 s), `cover.jpg`, `post.md`, `story.md` (premissas, checklist, roteiro das 2 partes) |
| `part2/` | `part2.mp4` (60 s), `cover.jpg`, `post.md` |
| `engine/` | os 6 arquivos do motor + `render.js` |

## Como gerar de novo

```bash
pip install kokoro-onnx soundfile numpy pillow
python engine/fetch_vendor.py              # three.js, cannon-es e as fontes (do npm)
python engine/voice.py part1               # narração + timing.js (baixa o modelo Kokoro uma vez, ~350 MB)
node engine/render.js part1/film.html part1/stills --at 0,12,30   # stills de conferência
node engine/render.js part1/film.html part1/frames --from 0 --to 600   # rode 3 faixas em paralelo
python engine/sound.py part1 60
python engine/encode.py part1
node engine/render.js "part1/film.html#cover" part1/cover
```

## O que mudou em relação ao arquivo original (e por quê)

- **Português:** voz Kokoro `pm_alex` (narrador), `pf_dora` (Dona Cida) e `pm_santa` (síndico), com `"lang": "pt-br"` no `lines.json`. As legendas não terminam em palavras de função em português, e os rótulos da tela também estão em português (REGRA #, COMENTE ABAIXO, SIGA PARA A PARTE).
- **`render.js`** substitui o `render.py`: esta máquina tem o Playwright do Node, não o do Python. A linha de comando é a mesma.
- **Rede bloqueada para jsdelivr, HuggingFace e Mixkit:**
  - `fetch_vendor.py` baixa os pacotes do registro do npm.
  - O tempo das palavras é estimado pelas pausas reais do áudio (`"align": "estimate"`), sem o faster-whisper.
  - Todos os efeitos sonoros são gerados em código (`"mixkit": false`).
- **`sound.py`:** as convoluções longas viraram uma média móvel. O resultado é o mesmo, mas a mixagem caiu de dezenas de minutos para 9 s.
