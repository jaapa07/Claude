# O Samurai que Roubou o Tempo

Minissérie animada original em **5 episódios de 20 segundos**, feita inteiramente em código.
Formato vertical nativo **9:16, 1080 × 1920, 60 fps** (Reels, TikTok, Shorts).

| # | Episódio | O que acontece |
|---|---|---|
| 1 | A Espada Proibida | A vila ao amanhecer, o chão se abre, Akio toca a katana e o mundo congela |
| 2 | O Preço do Poder | Os ponteiros do relógio se quebram, a batalha congelada, uma casa some, a montanha começa a se desfazer |
| 3 | O Guerreiro do Futuro | A montanha vira milhares de relógios, o portal, o duelo e a máscara que se parte |
| 4 | A Última Batalha | Estações e horas trocam a cada golpe, a flecha de Yuna, o abraço e a explosão de luz azul |
| 5 | Um Novo Amanhecer | O futuro se desfaz em pétalas, a katana é quebrada, o mundo se reconstrói |

Os vídeos prontos estão em [`videos/`](videos/): `ep1.mp4` … `ep5.mp4` (1080 × 1920, 60 fps, H.264 + AAC).
A exportação escreve os originais em `out/`, que fica fora do git.

## Rodar

Precisa de Node 18+ (testado no 22). Não há etapa de build.

```bash
cd samurai
npm install
npm start            # abre em http://localhost:5173
```

Controles do player: lista de episódios, play/pausa, barra de tempo, reprodução contínua dos cinco episódios,
som, qualidade da prévia (resolução interna) e download do áudio em WAV.
Atalhos: `espaço` play/pausa, `←` `→` pula 1 s, `1`–`5` troca de episódio.

Parâmetros de URL: `?ep=3&t=12.5` abre num ponto, `?scale=0.75` muda a resolução interna, `?autoplay` começa tocando.

## Exportar MP4

Precisa de `ffmpeg` no PATH e do Playwright com Chromium
(`npm i -D playwright && npx playwright install chromium`, se ainda não tiver).

```bash
npm run export                    # os 5 episódios → out/ep1.mp4 … ep5.mp4
npm run export -- --ep 3          # só o episódio 3
npm run export -- --series        # também junta em out/serie-completa.mp4
npm run export -- --audio         # refaz só o áudio dos MP4 existentes
npm run export -- --gpu           # usa a GPU da máquina (bem mais rápido)
npm run verify -- 2               # prova de determinismo do episódio 2
npm run stills -- 4 1,5.5,12      # stills de conferência em out/stills
```

Outras opções: `--workers 4`, `--crf 20`, `--from 0 --to 1200` (faixa de frames), `--keep` (mantém os JPEG).

Sem GPU (renderização por software), a exportação faz cerca de 1 frame por segundo: os cinco episódios levam perto de duas horas.
Com `--gpu` numa máquina com placa de vídeo o tempo cai muito, mas os pixels deixam de ser comparáveis entre máquinas diferentes.

Se o `ffmpeg` ou o Playwright não estiverem instalados, a ferramenta avisa e para; a prévia no navegador continua funcionando.

## Como o determinismo funciona

Tudo o que aparece na tela é função pura de `(episódio, t)`:

- A exportação chama `renderFrame(ep, frame)` com `t = frame / 60`. Nada usa `Math.random`, `Date` ou o relógio do sistema.
- As timelines GSAP ficam pausadas e são posicionadas com `timeline.time(t)`. Cada plano de câmera define início e fim explícitos.
- A física das partículas é em forma fechada: a posição de cada pétala, gota ou fragmento sai de `(semente, tempo do mundo)`, sem simulação acumulada.
- O "tempo do mundo" é uma integral da taxa de tempo (`makeTau`). Congelar o tempo é só levar a taxa a zero: chuva, pétalas e pássaros param juntos.
- O áudio de cada episódio é renderizado num `OfflineAudioContext` com ruído de semente fixa. O mesmo buffer toca na prévia e vai para o MP4.

Por isso vários navegadores renderizam faixas diferentes em paralelo e o resultado é idêntico.
`npm run verify` confere isso: renderiza os mesmos frames em dois navegadores, em ordens opostas, e compara os hashes.

## Arquitetura

```
index.html, styles.css      página, player e estilos do HUD
server.mjs                  servidor estático (sem build)
public/script.json          falas: quem, quando, texto (fonte das legendas e da dublagem)
public/voice/               dublagem pt-BR gerada (mp3 + durações)
src/
  main.js                   player, sincronismo com o áudio, API de renderização
  core/       stage.js      renderer 9:16, pós-processamento
              production.js o mundo compartilhado pelos 5 episódios
              util.js       easing, ruído e RNG com semente, relógio do mundo
  camera/     director.js   planos de câmera sobre timelines GSAP
  characters/ humanoid.js   rig, poses em camadas, expressões faciais
              cast.js       Akio, Yuna, Senhor das Horas, coadjuvantes, katana, arco
  world/      atmosphere.js céu procedural, sol, névoa, paletas
              village.js    vila, cerejeiras, montanhas, poço do templo
              sets.js       templo subterrâneo e arena temporal
              clock.js      mostrador de relógio em GLSL
  shaders/    post.js       distorção temporal, congelamento, raios volumétricos
              portal.js     portal, arcos de corte, ondas de choque, feixes
              dissolve.js   dissolução por ruído 3D
  fx/         particles.js  pétalas, chuva, poeira, fragmentos, pássaros
  audio/      engine.js     sintetizador, mixagem, vozes, WAV
              cues.js       trilha e efeitos de cada episódio
  hud/        hud.js        legendas, cartela de título, emblema-relógio (SVG + DOM)
  episodes/   ep1.js … ep5.js   decupagem de cada episódio
tools/
  export.mjs                exportação MP4 em paralelo
  verify.mjs                prova de determinismo
  stills.mjs, sheet.sh      stills e folhas de contato
  voice.py                  gera a dublagem
```

### Continuidade

- Os três personagens principais saem do mesmo rig e da mesma ficha de cores (`COLORS` em `cast.js`).
  O Senhor das Horas é literalmente o modelo de Akio envelhecido, com armadura preta e máscara por cima.
- Cada episódio exporta o estado do seu último frame (`SKY_END`, `MOUNT_END`, `DUEL_END`, `HUG`) e o seguinte começa dele:
  mesma câmera, mesma posição dos personagens, mesmo estado do relógio ou da montanha.
- O pátio continua aberto do episódio 1 ao 4 e só se fecha quando o mundo é reconstruído no 5.

### Áudio

Trilha, efeitos e ambiência são sintetizados em Web Audio: koto, flauta, taiko e pad em escalas japonesas
(hirajoshi e in-sen nos episódios sombrios, yo no final), com um leitmotiv que volta em toda a série.

As vozes foram geradas com o Kokoro-82M (modelo aberto, roda local em CPU): narrador `pm_alex`, Yuna `pf_dora`,
Akio `pm_santa`. O Senhor das Horas usa a **mesma voz de Akio**, mais grave e lenta. Para refazer:

```bash
pip install kokoro-onnx soundfile numpy
npm run voice        # baixa o modelo (~350 MB) na primeira vez
```

Se os arquivos de voz não existirem, o player segue com legendas e trilha.

## Técnicas e referências

A lista [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) serviu de referência de técnica, não de conteúdo.
O que foi aproveitado dela: renderização frame a frame com Playwright, Three.js + GSAP com timeline pausada,
mundos 3D procedurais sem assets externos, shaders de pós-processamento, áudio sintetizado em código e legenda sincronizada à voz.

## Limitações conhecidas

- Os personagens são feitos de primitivas: o estilo é low-poly estilizado, não modelagem esculpida.
- Não há sincronia labial por fonema; a boca abre e fecha no ritmo da fala.
- As vozes são de TTS aberto. Trocar por vozes gravadas é só substituir os mp3 em `public/voice/` e ajustar `at` em `script.json`.
