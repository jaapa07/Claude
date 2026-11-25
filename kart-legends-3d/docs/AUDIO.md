# Áudio — Kart Legends 3D

As músicas, ambiências, loops e a maior parte dos efeitos são **originais e gerados por código do próprio
projeto**. A exceção são 19 efeitos curtos gravados (batidas, aterrissagens, vidro e sons de menu) dos pacotes
**Impact Sounds** e **Interface Sounds** da Kenney (CC0 1.0, https://kenney.nl), descritos em
"Gravações CC0 (Kenney)" abaixo. Não há trechos de músicas existentes.

- Autor: **Equipe Kart Legends 3D (síntese procedural própria)**
- Licença: **Original do projeto**
- Formato: Ogg Vorbis (`libvorbis -q:a 4`), 44,1 kHz, estéreo

## Como é gerado

```
npm run assets:audio          # = tsx scripts/build-audio.ts  (≈ 30 s, determinístico)
npx tsx scripts/build-audio.ts --only=menu,collision --verbose   # parcial, para desenvolvimento
```

`scripts/build-audio.ts` sintetiza cada som em TypeScript, grava um WAV float temporário, converte com
`ffmpeg` para `.ogg` e escreve `public/assets/audio/audio-manifest.json`
(`{ id, kind, file, durationSec, loop, bytes, peakDb, rmsDb, author, license }` por arquivo; `file` é relativo
a `public/assets`, isto é, o mesmo caminho que se passa a `assetUrl`). Requer um `ffmpeg` com `libvorbis`.

| Módulo | Conteúdo |
|---|---|
| `scripts/audio/dsp.ts` | RNG com semente, osciladores com PolyBLEP, filtro de variável de estado, reverb (Schroeder/Freeverb), eco ping-pong, chorus, compressor, limitador suave, normalização, escrita de WAV |
| `scripts/audio/instruments.ts` | Vozes subtrativas (ADSR + filtro com envelope + vibrato), vozes FM (sino, piano elétrico, marimba) e bateria sintetizada (bumbo, caixa, chimbais, palma, tons, prato, tímpano) |
| `scripts/audio/music.ts` | Sequenciador: notação de melodia em texto, cifras, estilos de baixo/arpejo/acordes/bateria, viradas, "pump" de sidechain, mixagem por barramentos e masterização |
| `scripts/audio/songs.ts` | As cinco composições (melodias e harmonias escritas à mão) |
| `scripts/audio/sfx.ts` | 31 efeitos, 5 loops de corrida e 8 ambiências |
| `src/game/audio/audioIds.ts` | Lista única de ids/caminhos, usada pelo jogo e pelo gerador |

Garantias verificadas pelo próprio script (ele **falha** se alguma não valer):

- nenhum arquivo mudo (RMS > −45 dBFS), com NaN, ou clipado (pico ≤ −0,9 dBFS);
- todo arquivo em loop emenda sem degrau (o salto entre a última e a primeira amostra não passa do maior salto
  normal entre amostras vizinhas);
- todos os ids do contrato são gerados; `.ogg` antigos fora da lista são removidos.

Determinismo: toda aleatoriedade vem de um RNG `mulberry32` cuja semente é derivada do id do arquivo, e o
`ffmpeg` roda com `+bitexact`; duas execuções seguidas produzem arquivos byte a byte idênticos.

### Níveis

| Tipo | Normalização no arquivo | Ganho em tempo de execução |
|---|---|---|
| Efeitos e loops | pico em −1 dBFS | tabela por id em `audioManager.ts` (`SFX_GAIN`, `LOOP_GAIN`) |
| Músicas | RMS em −16 a −19 dBFS com limitador suave de teto −1 dBFS (os picos ficam entre −2 e −5 dBFS) | `MUSIC_GAIN` |
| Ambiências | RMS em −25 dBFS | `AMBIENCE_GAIN` |

Ou seja, as músicas ficam deliberadamente mais baixas que os efeitos. Dentro de cada música, cada barramento
(bateria, baixo, pad, acordes, arpejo, melodia, dobra) é levado a um nível alvo antes da soma.

### Loops sem clique

- **Músicas**: terminam em compasso completo; a cauda de reverb/eco/release que passa do fim é renderizada e
  somada ao início (`foldTail`). O compressor do master é aquecido com o fim da faixa, e o limitador é sem memória.
- **Loops e ambiências**: ruído filtrado periódico (o filtro dá uma volta de aquecimento sobre o próprio buffer),
  modulações com número inteiro de ciclos e eventos (pássaros, pingos, estalos) misturados com "volta" no buffer.

## Músicas

| id | Título de trabalho | Forma | Tom / andamento |
|---|---|---|---|
| `menu` | Horizonte de Partida | introdução (4) · A (8) · B (8) · A variado (8) | Ré maior, 100 BPM |
| `race_aurora` | Sol na Pista | introdução (4) · A · A2 · B · ponte · A variado · B variado (8 cada) | Si♭ maior, 150 BPM |
| `race_eclipse` | Neon à Meia-Noite | introdução (4+4) · A · A2 · B · C · quebra (4) · A variado · B variado | Sol menor, 160 BPM |
| `victory` | — | fanfarra de metais em 5 compassos + cauda | Dó maior, 140 BPM |
| `defeat` | — | frase descendente que resolve em maior | Lá menor → Dó maior, 96 BPM |

## Arquivos gerados

Caminhos relativos a `public/assets/`.

### music (5, 4015 KB)

| id | arquivo | duração (s) | loop | KB |
|---|---|---:|:---:|---:|
| `menu` | `audio/music/menu.ogg` | 67.20 | sim | 1030 |
| `race_aurora` | `audio/music/race_aurora.ogg` | 83.20 | sim | 1299 |
| `race_eclipse` | `audio/music/race_eclipse.ogg` | 90.00 | sim | 1409 |
| `victory` | `audio/music/victory.ogg` | 10.17 | não | 156 |
| `defeat` | `audio/music/defeat.ogg` | 7.80 | não | 121 |

### sfx (35, 721 KB)

| id | arquivo | duração (s) | loop | KB |
|---|---|---:|:---:|---:|
| `ui_move` | `audio/sfx/ui_move.ogg` | 0.10 | não | 5 |
| `ui_select` | `audio/sfx/ui_select.ogg` | 0.35 | não | 8 |
| `ui_back` | `audio/sfx/ui_back.ogg` | 0.30 | não | 7 |
| `ui_error` | `audio/sfx/ui_error.ogg` | 0.26 | não | 8 |
| `countdown_beep` | `audio/sfx/countdown_beep.ogg` | 0.25 | não | 7 |
| `countdown_go` | `audio/sfx/countdown_go.ogg` | 1.50 | não | 23 |
| `finish` | `audio/sfx/finish.ogg` | 2.56 | não | 43 |
| `lap` | `audio/sfx/lap.ogg` | 1.30 | não | 20 |
| `final_lap` | `audio/sfx/final_lap.ogg` | 1.80 | não | 30 |
| `collision` | `audio/sfx/collision.ogg` | 0.25 | não | 6 |
| `collision_heavy` | `audio/sfx/collision_heavy.ogg` | 1.10 | não | 18 |
| `jump` | `audio/sfx/jump.ogg` | 0.38 | não | 8 |
| `land` | `audio/sfx/land.ogg` | 0.23 | não | 7 |
| `item_pickup` | `audio/sfx/item_pickup.ogg` | 1.00 | não | 19 |
| `item_roll` | `audio/sfx/item_roll.ogg` | 1.31 | não | 20 |
| `turbo_1` | `audio/sfx/turbo_1.ogg` | 1.00 | não | 18 |
| `turbo_2` | `audio/sfx/turbo_2.ogg` | 1.35 | não | 23 |
| `turbo_3` | `audio/sfx/turbo_3.ogg` | 1.85 | não | 30 |
| `boost_pad` | `audio/sfx/boost_pad.ogg` | 1.00 | não | 18 |
| `item_pulso` | `audio/sfx/item_pulso.ogg` | 0.90 | não | 17 |
| `item_bolha` | `audio/sfx/item_bolha.ogg` | 1.10 | não | 17 |
| `item_nevoa` | `audio/sfx/item_nevoa.ogg` | 1.90 | não | 29 |
| `item_faisca` | `audio/sfx/item_faisca.ogg` | 0.90 | não | 18 |
| `item_onda` | `audio/sfx/item_onda.ogg` | 1.70 | não | 27 |
| `item_cristal` | `audio/sfx/item_cristal.ogg` | 1.50 | não | 28 |
| `shield_break` | `audio/sfx/shield_break.ogg` | 1.20 | não | 25 |
| `spinout` | `audio/sfx/spinout.ogg` | 1.08 | não | 18 |
| `thunder` | `audio/sfx/thunder.ogg` | 4.20 | não | 52 |
| `unlock` | `audio/sfx/unlock.ogg` | 2.60 | não | 46 |
| `respawn` | `audio/sfx/respawn.ogg` | 1.50 | não | 26 |
| `splash` | `audio/sfx/splash.ogg` | 0.98 | não | 16 |
| `item_raio` | `audio/sfx/item_raio.ogg` | 1.10 | não | 19 |
| `zap` | `audio/sfx/zap.ogg` | 1.00 | não | 17 |
| `item_cometa` | `audio/sfx/item_cometa.ogg` | 2.00 | não | 33 |
| `comet_ram` | `audio/sfx/comet_ram.ogg` | 0.70 | não | 14 |

### loop (5, 212 KB)

| id | arquivo | duração (s) | loop | KB |
|---|---|---:|:---:|---:|
| `drift` | `audio/sfx/drift.ogg` | 2.00 | sim | 31 |
| `brake` | `audio/sfx/brake.ogg` | 1.50 | sim | 24 |
| `offroad` | `audio/sfx/offroad.ogg` | 3.00 | sim | 51 |
| `wind_speed` | `audio/sfx/wind_speed.ogg` | 4.00 | sim | 62 |
| `drift_sparks` | `audio/sfx/drift_sparks.ogg` | 2.00 | sim | 43 |

### ambience (8, 1902 KB)

| id | arquivo | duração (s) | loop | KB |
|---|---|---:|:---:|---:|
| `amb_sea` | `audio/sfx/amb_sea.ogg` | 16.00 | sim | 227 |
| `amb_forest` | `audio/sfx/amb_forest.ogg` | 16.00 | sim | 235 |
| `amb_meadow` | `audio/sfx/amb_meadow.ogg` | 16.00 | sim | 235 |
| `amb_desert` | `audio/sfx/amb_desert.ogg` | 16.00 | sim | 236 |
| `amb_city` | `audio/sfx/amb_city.ogg` | 16.00 | sim | 256 |
| `amb_blizzard` | `audio/sfx/amb_blizzard.ogg` | 16.00 | sim | 237 |
| `amb_sky` | `audio/sfx/amb_sky.ogg` | 16.00 | sim | 232 |
| `amb_storm` | `audio/sfx/amb_storm.ogg` | 16.00 | sim | 243 |

Total: **49 arquivos, ≈ 6,6 MB** (meta: < 12 MB).

## Gravações CC0 (Kenney)

`npx tsx scripts/build-kits.ts --only=audio` converte só os arquivos listados em `SAMPLE_SFX`
(`src/game/audio/audioIds.ts`) a partir dos pacotes extraídos em `.cache/kenney/` (fora do git): nível ajustado para
o **mesmo RMS** do efeito sintetizado que ele substitui (pico ≤ −1 dBFS; camadas 3 dB abaixo), 44,1 kHz estéreo,
Ogg Vorbis em `public/assets/audio/kenney/` e a cópia AAC para o Safari em `public/assets/audio/aac/kenney/`.
Origem, autor e licença de cada arquivo ficam no `sources.json` de cada uma dessas pastas.

| Efeito | Gravações (variação sorteada a cada disparo) | Uso |
|---|---|---|
| `ui_move` | `toggle_002` | substitui |
| `ui_select` | `select_002` | substitui |
| `ui_back` | `back_002` | substitui |
| `ui_error` | `error_004` | substitui |
| `purchase` (novo: compra na loja) | `confirmation_001` | só gravação |
| `unlock` | `maximize_006` | camada sobre o sintetizado (70 %) |
| `collision` | `impactPlate_medium_000..002` | substitui |
| `collision_heavy` | `impactMetal_heavy_000..002` | substitui |
| `land` | `impactSoft_heavy_000`, `_002` | substitui |
| `spinout` (atingido por item) | `impactPunch_heavy_000..001` | camada (80 %) |
| `shield_break` | `impactGlass_medium_000`, `_002` | camada (70 %) |
| `comet_ram` | `impactMetal_heavy_003` | camada (70 %) |

Os arquivos sintetizados que foram substituídos continuam sendo gerados por `build-audio.ts` (o contrato de ids não
mudou), mas não são baixados: `ALL_AUDIO_FILES` lista só o que cada efeito realmente toca.

## Em tempo de execução (`src/game/audio/`)

`audioManager.ts` exporta o singleton `audio` com a API do contrato (`docs/CONTRACTS.md`, seção 2), em Web Audio
API pura:

- **Contexto preguiçoso**: o `AudioContext` só é criado em `unlock()` ou `preload()`.
- **Autoplay**: `unlock()` (chamar no primeiro gesto) retoma o contexto. `playMusic`, `playAmbience`, `setLoop` e
  `engine.start()` chamados antes disso ficam guardados como intenção e passam a tocar no unlock. O mesmo vale
  para música pedida antes de o arquivo estar carregado.
- **Barramentos**: música, efeitos e ambiente têm `GainNode` próprios (`setVolumes`). Motor e loops entram num
  sub-barramento de corrida dentro do de efeitos. Há um limitador de segurança na saída.
- **`preload()`** carrega e decodifica os 49 arquivos via `assetUrl('audio/…')` e **rejeita** com uma mensagem
  que lista cada arquivo que falhou e o motivo (por exemplo `audio/sfx/collision.ogg (HTTP 404)`). Chamar de
  novo tenta só o que faltou. Sem Web Audio, resolve sem fazer nada.
- **`sfx()`**: polifonia limitada por id (a voz mais antiga é cortada com fade curto), `pan` com
  `StereoPannerNode`, e pequena variação aleatória de pitch em efeitos repetitivos quando `rate` não é passado.
- **`setLoop()`**: fonte em loop criada na primeira intensidade > 0; mudanças sempre em rampa.
- **Motor** (`engineSynth.ts`): sintetizado em tempo real — duas serras, uma quadrada, sub senoidal e ruído
  filtrado, com saturação leve e passa-baixas. A rotação e o corte do filtro sobem com `speed`, a carga com
  `throttle`, uma camada aguda entra com `boosting` e a rotação sobe cerca de 12 % com `airborne`. O estado é
  suavizado internamente e aplicado com `setTargetAtTime`, sem degraus.
- **`setPaused(true)`** zera o sub-barramento de corrida e a ambiência e reduz a música a 35 %.
- **`stopAllRaceSounds()`** para motor, loops, ambiência e efeitos em andamento (menos os `ui_*`), mantém a
  música e desfaz a pausa.
- `audio.debugState()` (extra, fora do contrato) devolve um resumo do estado para depuração e testes.

Testes: `npx vitest run src/game/audio` (ambiente node, com um `AudioContext` falso).

## Limitações honestas

- **A música é sintetizada por código, não gravada.** Soa como música de sintetizador/chiptune moderna: não há
  instrumentos acústicos reais, intérpretes, nem mixagem/masterização feita por ouvido humano. As composições
  foram escritas em notação de texto e balanceadas por medição (níveis RMS por barramento), não por audição.
- Os efeitos são aproximações sintéticas (ruído filtrado, FM, varreduras). Gaivotas, pássaros, grilos, chuva e
  trovão são estilizados, não realistas.
- O motor é um sintetizador simples; não simula marchas nem um motor específico.
- Ogg Vorbis toca em Chromium e Firefox. O carregamento e a reprodução foram verificados em Chromium headless;
  o **Firefox não foi testado** neste ambiente e o **Safari** só decodifica Ogg Vorbis em versões recentes — em
  navegadores sem suporte, `preload()` rejeita listando os arquivos.
- Vorbis é um codec com perdas: a emenda dos loops é validada no sinal antes da codificação e conferida depois
  de decodificada no Chromium (sem degrau), mas não foi avaliada por audição.
- `setPaused` silencia os barramentos de corrida por ganho; os osciladores do motor continuam rodando em silêncio.
