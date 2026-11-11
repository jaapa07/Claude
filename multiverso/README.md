# O MULTIVERSO DA BURRICE

Uma série animada original de comédia absurda em português brasileiro: 5 episódios de 90 s cada (7 min 30 s no total),
em formato vertical 9:16 (1080×1920, 30 fps), com dublagem PT-BR, legendas, efeitos sonoros e trilha.
Tudo foi feito em código: HTML, Canvas 2D, Three.js, GLSL e GSAP. A série não usa imagem gerada, vídeo gerado nem samples.

| Arquivo | O que é |
|---|---|
| `out/ep1.mp4` … `out/ep5.mp4` | os episódios exportados, cada um com capa de 2,5 s + 90 s de episódio (H.264 + AAC 48 kHz, verificados) |
| `out/capas/capa_epN.jpg` | a capa de cada episódio (também serve de thumbnail) |
| `out/corpo/epN.mp4` | só os 90 s do episódio, sem a capa |
| `out/temporada_completa.mp4` | a temporada inteira, com as 5 capas (462,5 s) |
| `out/epN_sheet.jpg` | folha de contato: um quadro a cada 3 s |
| `player.html` | player com seleção de episódio, play/pausa, timeline com as falas marcadas e passo por quadro. O modo "Ao vivo" desenha pelo motor e o modo "MP4" toca o exportado |
| `film.html?ep=N` | a página de um episódio, controlada só por `window.seek(t)` |
| `STORYBOARD.md` | elenco travado e storyboard dos 5 episódios |
| `episodes/epN/scene.js` | o episódio: batidas (`T`), falas (`LINES`), efeitos (`SFX`), trilha (`MUSIC`) e planos |
| `episodes/epN/tts_input.json`, `epN.srt`, `vo/*.wav` | as falas com marcação de tempo (entrada para outro TTS), as legendas e as vozes |

## Como funciona

- **Timeline determinística:** cada quadro é uma função pura do tempo absoluto `t`. O motor não usa relógio nem `Math.random`.
  A física (mitose dos cocôs, gravidade zero) é re-simulada em passo fixo a partir do início do plano, e as animações são
  timelines GSAP pausadas, construídas com `fromTo` (`lib/core.js` → `K()`), que dão o mesmo resultado em qualquer ordem
  de busca. Por isso o render pode ser dividido em fatias paralelas.
- **Módulos:** `lib/chars.js` e `lib/chars2.js` (elenco com squash & stretch, expressões e lip-sync), `lib/sets.js` (cenários),
  `lib/fx.js` (onomatopeias, transições, partículas, cartões), `lib/world3d.js` (Three.js: Terra procedural em GLSL, céu,
  casa, casa-cubo-mágico, frota em InstancedMesh, nave-mãe, planeta-salsicha, buraco negro, portal, e o passe de pós-processamento GLSL
  com wobble, glitch, swirl, cubos e aberração cromática) e `lib/stage.js` (contrato da página, legendas PT-BR, lip-sync).
- **Dublagem:** Kokoro-82M roda localmente com as vozes PT-BR `pf_dora`, `pm_alex` e `pm_santa`. Cada personagem ganha sua
  própria cadeia de efeitos no ffmpeg: pitch com rubberband, eco, flanger, bitcrush (`tools/voice.py`). O envelope de volume de cada fala
  move a boca do personagem.
- **Som:** os 48 efeitos cartunescos e os 8 estilos de trilha são sintetizados em numpy (`tools/mix.py`). A trilha abaixa
  automaticamente sob as vozes (side-chain).

## Gerar de novo

```bash
pip install kokoro-onnx soundfile numpy scipy    # + Playwright (Node) e ffmpeg
# modelos Kokoro em ./models: kokoro-v1.0.onnx e voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx, releases)
bash tools/build.sh 1 4          # falas -> voz -> 2700 quadros em 4 processos -> mixagem -> MP4 verificado
python3 tools/cover.py 1          # capa (lib/cover.js) + locução do Controle na frente -> out/ep1.mp4
python3 tools/encode.py season   # junta os 5 episódios
node tools/render.js 1 /tmp/st --at 3,14.5   # só alguns quadros, para conferir
```

Para trocar a voz por outro TTS PT-BR, use `episodes/epN/tts_input.json`: ele traz o texto falado, o personagem e o
início de cada fala. Gere `vo/<id>.wav` com o novo TTS e rode de novo a partir de `voice.py`, ou ajuste a duração no
`timing.json`.
