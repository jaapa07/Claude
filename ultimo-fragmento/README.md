# O ÚLTIMO FRAGMENTO

Minissérie animada original em **5 episódios × 20 s** (100 s no total), vertical **1080×1920 (9:16)**, alvo de **60 FPS**.
Tudo é gerado em código: personagens, cenários, partículas, shaders, trilha, efeitos sonoros, legendas e narração.

| Ep. | Título | O que acontece |
|---|---|---|
| 1 | O DESPERTAR | A cidade se materializa em partículas, NEO encontra o cristal roxo, o tempo congela, o céu falha e um olho vermelho se abre. |
| 2 | A PERSEGUIÇÃO | Começa no mesmo quadro do ep. 1: o olho se estilhaça em centenas de drones, prédios desabam, o chão se rompe sobre um abismo digital, NEO salta e fica suspenso. |
| 3 | O MUNDO INVERTIDO | A queda, a câmera gira 180°, a gravidade se inverte: ilhas flutuantes, relógios desmontados, oceanos suspensos e o Guardião de partículas douradas. |
| 4 | A VERDADE | O portal vira um túnel de memórias holográficas, milhares de telas mostram outros NEOs, a máquina se abre e revela o núcleo. |
| 5 | A ESCOLHA FINAL | NEO retira o próprio núcleo, a luz reconstrói florestas, oceanos, cidades e estrelas, NEO se desfaz em partículas e uma luz azul acende num novo robô. |

## Como executar

```bash
cd ultimo-fragmento
node server.mjs            # http://localhost:5173
```

Não precisa de `npm install` para assistir: three.js, GSAP, mp4-muxer e as fontes já estão em `vendor/` e `assets/`.
Use um navegador com WebGL2 (Chrome/Edge/Firefox recentes). A primeira carga compila os shaders e pré-renderiza o áudio dos 5 episódios (alguns segundos).

### Controles do player

| Controle | Função |
|---|---|
| ▶ / **Espaço** | reproduzir / pausar |
| barra de tempo | navegar pelos 100 s (cada episódio tem a própria timeline de 20 s) |
| botões **1–5** (ou teclas 1–5) | ir para o início de um episódio |
| **Contínuo / Episódio único** | toca os 5 episódios em sequência ou só o atual |
| **← / →** | ±1 s · com **Shift**: ±1 quadro (1/60 s) |
| **Legendas**, **Som** | liga/desliga |
| **Prévia 35–100 %** | resolução interna do 3D na prévia (a saída é sempre 1080×1920) |
| **Frame** | salva o quadro atual em PNG 1080×1920 |
| **Exportar MP4** | exporta o episódio atual (ou a série, no modo contínuo) quadro a quadro em H.264 + AAC, 60 fps, pelo próprio navegador (WebCodecs) |

## Exportação por linha de comando (determinística)

Requer Node 18+, Playwright (Chromium) e ffmpeg.

```bash
node tools/export.mjs --ep 1                       # out/ep1.mp4
node tools/export.mjs --all                        # out/ep1..ep5.mp4 + out/o-ultimo-fragmento.mp4
node tools/export.mjs --all --scale 0.5 --workers 3   # 3D a 50 % (saída continua 1080×1920), 3 navegadores em paralelo
node tools/export.mjs --ep 3 --from 10 --to 15 --fps 30   # trecho / rascunho
node tools/export.mjs --stills 1:0,1:11,2:0,5:19.7       # quadros soltos em out/stills
```

Cada quadro é renderizado no seu tempo exato (`T = n / fps`), nunca em tempo real, então o vídeo é idêntico ao player e independe da velocidade da máquina.
O áudio vem da mesma mixagem do player (`OfflineAudioContext`) e é multiplexado pelo ffmpeg.

## Narração

A narração em português brasileiro é sintetizada **localmente** com o modelo aberto Kokoro-82M (`pm_alex` narrador, `pm_santa` grave para o Guardião, `pf_dora` processada para a Voz do Núcleo). Os WAVs já estão em `assets/voice/`. Para regenerar depois de editar `src/data/script.js`:

```bash
pip install kokoro-onnx soundfile numpy
python tools/voice.py          # baixa o modelo uma vez (~350 MB) para tools/models/
```

Se algum WAV faltar, o player usa a voz sintética do navegador (`speechSynthesis`, pt-BR) como alternativa.
As legendas destacam palavra por palavra com tempos medidos no próprio áudio (`assets/voice/manifest.json`).

## Arquitetura

```
src/
  core/        Engine (WebGL + pós-processamento + composição 2D), Story (timeline global 0–100 s), Exporter (WebCodecs), util (PRNG, easing)
  characters/  Neo (único arquivo que define o NEO: 0,60 m, branco, detalhes azuis, olhos em shader, núcleo removível),
               Drone (enxame instanciado), GoldenGiant (Guardião de partículas)
  scenes/      City (cidade abandonada, mesma semente nos ep. 1–2), Abyss, InvertedWorld, Memory (atlas + telas), Machine, Rebirth
  effects/     glsl (ruído), Particles (nuvens que se transformam na GPU), Sky (céu com falha digital), Eye, Crystal/Shockwave, Portal, Debris
  camera/      CameraRig — timeline GSAP pausada, avançada por seek(t)
  audio/       Synth (sons originais só com nós Web Audio), Soundtrack (mixagem offline + voz + ducking)
  overlay/     legendas sincronizadas, cartela de título, HUD holográfico (Canvas), cartela final
  episodes/    ep1…ep5: cada um é { build(), update(t) → câmera/pós/overlay, sound(synth) }
  data/        script.js — falas, horários e vozes
tools/         export.mjs (Playwright + ffmpeg), voice.py (Kokoro)
```

**Determinismo.** Nada usa `Math.random` nem o relógio: cada episódio é uma função pura de `t ∈ [0, 20)`. Partículas e destroços usam fórmulas fechadas (ex.: `p(τ) = p₀ + v·τ + ½·g·τ²`), a câmera e os movimentos são timelines GSAP pausadas e posicionadas com `seek(t)`, e os ruídos usam PRNG com semente.

**Continuidade.** O episódio 2 reconstrói o mundo do episódio 1 e o continua a partir de `t = 20`, então o último quadro do ep. 1 e o primeiro do ep. 2 batem quadro a quadro (corte no olho vermelho). O ep. 3 continua o ep. 2 do mesmo jeito (NEO suspenso → queda). O ep. 4 reconstrói o último estado do mundo invertido e o ep. 5 começa na câmara do núcleo onde o ep. 4 termina. As poses e enquadramentos de passagem ficam em constantes exportadas (`CAM_END`, `NEO2_END`, `CAM3_END`, `CAM4_END`…).

**Técnicas por cena.** Materialização por partículas (MorphPoints na GPU) e scanline de revelação no shader dos prédios · onda de choque + distorção em tela + congelamento do tempo (pós-processamento) · céu com falha digital em GLSL · prédios que viram cubos (InstancedMesh balístico) · olho procedural que se estilhaça em drones · desabamento procedural e chão que se abre (discard por shader) · abismo de grades infinitas e poliedros em wireframe · rotação de câmera de 180° com inversão de gravidade · Guardião de 55 mil partículas · portal em espiral (GLSL) · túnel e esfera com ~2.900 telas instanciadas a partir de um atlas desenhado em Canvas · máquina com pétalas articuladas e núcleo de plasma · dissolução do NEO por ruído com borda luminosa · paisagem que renasce em sequência (floresta → oceano → cidade → estrelas).

**Desempenho.** Sem GPU (renderização por software) cada quadro leva ~1 s; com GPU a prévia roda em tempo real. Os pontos mais pesados têm alternativas otimizadas sem perder o momento narrativo: pontos aditivos em vez de volumes, cubos instanciados em vez de física, e um único passe de bloom compartilhado.

## Arquivos gerados

`out/ep1.mp4 … out/ep5.mp4` e `out/o-ultimo-fragmento.mp4` (série completa), 1080×1920, 60 fps, H.264 + AAC.
