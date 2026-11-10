# 5 vídeos, 5 tipos — a partir do awesome-opus5-5-videos

Um vídeo por tipo, cada um feito a partir de um prompt real do repositório
[yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos).
Todo o texto na tela está em português, e cada vídeo tem trilha e efeitos sonoros
sincronizados. Quatro deles também têm narração em português do Brasil.

| # | Tipo | Vídeo | Prompt original |
|---|------|-------|-----------------|
| 1 | Motion graphics | [`out/01-motion-reel.mp4`](out/01-motion-reel.mp4) (15 s) | @reflex_cloud — reel de 15 s de um motion designer, cortado no ritmo |
| 2 | Explicativo | [`out/02-explainer-cocktail.mp4`](out/02-explainer-cocktail.mp4) (24 s) | @Ror_Fly — receita animada, do copo vazio ao drink pronto |
| 3 | Cena 3D | [`out/03-3d-bridge.mp4`](out/03-3d-bridge.mp4) (16 s) | @MondemSuraj — Golden Gate em Three.js com neblina, água e trânsito |
| 4 | Jogo / interativo | [`out/04-game-jelly-dice.mp4`](out/04-game-jelly-dice.mp4) (19 s) | @SpacyApps — "Jelly Dice", dados de goma com corpo macio |
| 5 | Arte em shader | [`out/05-shader-paper-fractal.mp4`](out/05-shader-paper-fractal.mp4) (16 s) | @jrayon — fractais com visual de papel recortado e pós-processamento cinematográfico |

O repositório agrupa os vídeos em quatro categorias (motion, explicativo, 3D, interativo).
O quinto tipo aqui é arte em shader GLSL, uma das técnicas mais usadas nele.

## Som

- **Trilha e efeitos:** sintetizados em numpy por `audio.py`, sem samples. Exemplos: bateria a
  120 BPM no reel, líquido sendo servido e gelo batendo no drink, mar, buzina de neblina e
  trânsito na ponte, dados "squish" nos quiques, papel rasgando no fractal.
- **Narração:** espeak-ng com as vozes brasileiras MBROLA (`mb-br3` masculina, `mb-br4` feminina).
  É voz sintética e soa robótica. O reel não tem narração, só música.
- **Jogo:** os quiques, as jogadas e os resultados vêm de `out/04-game-jelly-dice.events.json`,
  que o `render.js` grava durante a renderização. Por isso o som acompanha a física, e a voz
  anuncia o total de cada jogada.

## Notas

- O reel usa um nome de estúdio inventado ("kinetic") em vez da marca citada no prompt original.
- Jelly Dice usa Three.js/WebGL em vez de WebGPU puro para poder ser gravado sem tela; os cliques
  em ROLAR são roteirizados.

## Renderizar de novo

```bash
npm i -g playwright                    # three.min.js já está em src/
sudo apt install espeak-ng mbrola mbrola-br3 mbrola-br4
node render.js src/04-game-jelly-dice.html silent/04-game-jelly-dice.mp4    # vídeo mudo + events.json
python3 audio.py 04 silent out/04.wav                                       # trilha + narração
ffmpeg -i silent/04-game-jelly-dice.mp4 -i out/04.wav -c:v copy -c:a aac -b:a 160k -shortest out/04-game-jelly-dice.mp4
```

Cada página expõe `window.DURATION` e `window.renderFrame(t)`. Dá para abrir qualquer arquivo
de `src/` no navegador e chamar `renderFrame` para navegar pelo vídeo.
