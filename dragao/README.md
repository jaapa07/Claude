# O DRAGÃO QUE TINHA MEDO DE FOGO

Minissérie de comédia em **5 episódios × 20 s** (100 s no total), vertical **1080×1920 (9:16)**, alvo de **60 FPS**, pensada para Reels, TikTok e Shorts.
Tudo é gerado em código e renderizado de forma determinística: personagens 3D, cenários, bolhas, fogo, gelo, física, câmera, trilha, efeitos sonoros, dublagem e legendas.

| Ep. | Título | O que acontece |
|---|---|---|
| 1 | O DRAGÃO DEFEITUOSO | Academia nas montanhas, dragões cospem fogo, Pipo faz cara de mau… e solta uma bolha que estoura no nariz do Brasa. Risadas, “máquina de lavar com asas”, um ATCHIM e o diretor vai embora flutuando numa bolha. |
| 2 | O PRIMEIRO DESASTRE | Começa no mesmo quadro: Pipo voa atrás do diretor, as asinhas desistem, ele cai no mercado (toldo-trampolim, barraca derrubada, frutas quicando) e fica com uma melancia na cabeça. Luna chega. A sombra cobre o reino e o Monstro de Gelo surge atrás do castelo. |
| 3 | O MONSTRO DE GELO | O sopro congelante transforma torres e árvores em gelo; o fogo do Brasa só alimenta o monstro (“NHAC!”); Pipo tropeça e prende o Rei Goran numa bolha gigante; o gelo não atravessa a bolha. |
| 4 | O HERÓI IMPROVÁVEL | Pipo cria uma cúpula de bolha sobre o castelo (o gelo se estilhaça), tem soluços, respira fundo até virar um balão e prende o monstro numa bolha que sobe para as nuvens. |
| 5 | O MAIOR DRAGÃO DO REINO | Numa nuvem quente o monstro derrete e revela um espírito de neve assustado; o rei condecora Pipo, Brasa pede desculpas, todos riem… e o ATCHIM final prende o rei de novo. Freeze frame: **SER DIFERENTE PODE SER SEU MAIOR PODER.** |

## Como executar

```bash
cd dragao
node server.mjs            # http://localhost:5173
```

Não precisa de `npm install`: three.js, GSAP, mp4-muxer e as fontes estão em `vendor/` e `assets/`. A primeira carga monta os cenários e pré-renderiza o áudio dos 5 episódios.

**Controles:** ▶/Espaço · barra de tempo (100 s) · botões/teclas **1–5** pulam para cada episódio · **Contínuo / Episódio único** · ←/→ (±1 s, com Shift ±1 quadro) · Legendas · Som · qualidade da prévia · **Frame** (PNG 1080×1920) · **Exportar MP4** (WebCodecs, quadro a quadro, H.264 + AAC, 60 fps).

## Exportação determinística (linha de comando)

```bash
node tools/export.mjs --all                         # out/ep1..ep5.mp4 + out/o-dragao-que-tinha-medo-de-fogo.mp4
node tools/export.mjs --ep 3 --fps 60               # um episódio
node tools/export.mjs --all --scale 0.5 --workers 3 # 3D a 50 % (saída 1080×1920), 3 navegadores em paralelo
node tools/export.mjs --stills 1:6.8,4:14.6         # quadros soltos
```
Requer Node 18+, Playwright (Chromium) e ffmpeg. Cada quadro é calculado no tempo exato `n/fps`; o áudio sai da mesma mixagem `OfflineAudioContext` do player.

## Dublagem

Vozes geradas localmente com o modelo aberto **Kokoro-82M** (PT-BR) e processadas com ffmpeg para dar uma identidade a cada personagem, mantida nos 5 episódios:

| Personagem | Base | Tratamento |
|---|---|---|
| PIPO | `pm_alex` | +24 % de tom, jovem e engraçado |
| BRASA | `pm_santa` | −10 % de tom, graves reforçados |
| LUNA | `pf_dora` | +20 % de tom, chorus leve (fada) |
| REI GORAN | `pm_santa` | vibrato dramático |
| DIRETOR | `pm_alex` | abafado e com eco (dentro da bolha) |
| MONSTRO | `pm_santa` | −28 % de tom, reverberação |
| NARRADOR | `pm_alex` | neutro |

Falas, horários e vozes ficam em `src/data/script.js`. Para regenerar: `pip install kokoro-onnx soundfile numpy && python tools/voice.py`.
As legendas mostram o nome de quem fala e destacam palavra por palavra no tempo do áudio.

## Arquitetura

```
src/
  core/        Engine (WebGL + bloom + passe de lente + composição 2D), Story (timeline 0–100 s), Exporter (WebCodecs), util
  characters/  Dragon (um rig paramétrico: Pipo, Brasa, dragões da academia, diretor), Cast (Luna, Rei Goran,
               Monstro de Gelo, Espírito de Neve), materials (material estilizado com rim light + máscara de congelamento)
  scenes/      World — academia, montanhas, castelos flutuantes, vale, mercado, casas, árvores e castelo real
  effects/     Bubbles (película iridescente em GLSL, bolha única, campo instanciado, estouro), Fire (jato de partículas
               GPU, também em versão gelo), Physics (projétil com quiques em forma fechada), Particles, glsl
  camera/      CameraRig — timeline GSAP pausada e posicionada com seek(t); zooms cômicos com expo.out/back.out
  audio/       Synth (caixa de ferramentas cômica: pop, boing, apito de êmbolo, trombone triste, soluço, marchinha…), Soundtrack
  overlay/     legendas com etiqueta do personagem, cartela de título com letras saltitantes, onomatopeias, linhas de velocidade, freeze frame
  episodes/    ep1…ep5 — cada um com build(), update(t) e sound(synth)
```

**Determinismo e física.** Nenhum quadro depende do relógio: bolhas (arrasto exponencial + empuxo + oscilação), frutas (quiques com restituição), estilhaços de gelo, gotas e o fogo são fórmulas fechadas no tempo, e as câmeras são timelines GSAP pausadas.

**Continuidade.** Cada episódio reconstrói o mundo do anterior e parte exatamente do seu último estado: o diretor na bolha (1→2), o monstro atrás do castelo (2→3), o close de Pipo olhando as patas (3→4) e a bolha do monstro subindo (4→5). Personagens e vozes saem dos mesmos presets em todos os episódios.

**Desempenho.** Sem GPU (renderização por software) cada quadro leva ~1–2 s; com GPU a prévia roda em tempo real. Bolhas de multidão são instanciadas, fogo e gelo são pontos na GPU, e a física é analítica, para manter o custo baixo sem cortar nenhum momento da história.

## Vídeos

Em `video/`: `ep1.mp4 … ep5.mp4` e `o-dragao-que-tinha-medo-de-fogo.mp4` (série completa), 1080×1920, 60 fps, H.264 + AAC, além de `contact-sheet.jpg`. São cópias comprimidas dos masters gerados com `--scale 0.5 --workers 3`.
