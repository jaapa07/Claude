# O Último Guardião das Estrelas

Curta animado original de **90 segundos**, em cinco sequências de 18 s, feito inteiramente em código.
Formato vertical nativo **9:16, 1080 × 1920, 60 fps**, em português do Brasil.

| # | Tempo | Sequência | O que acontece |
|---|---|---|---|
| 1 | 0–18 s | A noite em que o céu morreu | Uma estrela explode em silêncio, as constelações se apagam, Lumi sai do cristal de Kaito e Astra emerge do mar de nuvens |
| 2 | 18–36 s | O oceano acima das nuvens | Voo sobre o oceano suspenso, mergulho na esfera de água, a cidade antiga vira constelação, o portal dourado e a dobra do espaço |
| 3 | 36–54 s | O templo dos mil universos | Deserto de areia luminosa, o templo-mecanismo e o coração de cristal, a queda pelo túnel de galáxias e os fragmentos de realidade |
| 4 | 54–72 s | O despertar da última estrela | Kaito desperta, planetas acordam, nebulosas florescem, o voo pelo corredor de constelações e a explosão que devolve as estrelas |
| 5 | 72–90 s | Quando o universo voltou a respirar | O mundo renascido, a volta à vila, Lumi no ombro de Kaito e a subida até o planeta visto do espaço |

Os vídeos prontos estão em [`videos/`](videos/): `guardiao-das-estrelas.mp4` (filme completo), `seq1.mp4` … `seq5.mp4` e `capa.jpg`.

## Rodar

Precisa de Node 20+ (testado no 22).

```bash
cd guardiao
npm install
npm run dev          # abre em http://localhost:5173
```

O painel tem reprodução e pausa, linha do tempo de 90 s com as marcas das sequências, seleção de sequência,
volume, repetição, qualidade da prévia (resolução interna) e download do áudio em WAV.
Atalhos: `espaço` play/pausa, `←` `→` pula 1 s, `1`–`5` vai para a sequência.

Parâmetros de URL: `?t=45` abre num instante, `?scale=0.75` muda a resolução interna, `?autoplay` começa tocando.

`npm run build` gera a versão estática em `dist/`.

A prévia toca a trilha já mixada em `public/audio/trilha.mp3`, que carrega em instantes. Sem esse arquivo o app
sintetiza os 90 s ao vivo antes de tocar, o que pode levar perto de um minuto. Depois de mexer em `src/audio/` ou em
`public/script.json`, rode `npm run audio` para regravar o arquivo. A exportação sempre usa a síntese, não o arquivo.

## Exportar MP4

Precisa de `ffmpeg` no PATH e do Playwright com Chromium
(`npm i -D playwright && npx playwright install chromium`, se ainda não tiver).

```bash
npm run export                 # filme completo → out/guardiao-das-estrelas.mp4
npm run export -- --split      # filme completo + as cinco sequências (out/seq1.mp4 …)
npm run export -- --seq 3      # só a sequência 3
npm run export -- --audio      # refaz só o áudio do MP4 já renderizado
npm run export -- --resume     # continua um render interrompido
npm run export -- --gpu        # usa a GPU da máquina (bem mais rápido)
npm run verify                 # prova de determinismo
npm run stills -- 5,22.5,61    # stills em out/stills (tempos em segundos)
npm run cover                  # capa em videos/capa.jpg
```

Outras opções: `--workers 4`, `--crf 20`, `--from <quadro> --to <quadro>`, `--keep` (mantém os JPEG).

A exportação abre o próprio app em navegadores sem interface, pede cada quadro por número e captura a tela;
depois o FFmpeg junta os quadros ao áudio. Sem GPU (renderização por software) ela faz cerca de 1 quadro por segundo:
o filme inteiro leva perto de uma hora e meia. Se o `ffmpeg` ou o Playwright faltarem, a ferramenta avisa e para;
a prévia no navegador continua funcionando.

## Como o determinismo funciona

Tudo o que aparece na tela é função pura do tempo absoluto `T`:

- A exportação chama `renderFrame(n)` com `T = n / 60`. Nada usa `Math.random`, `Date` ou o relógio do sistema.
- As timelines GSAP ficam pausadas e são posicionadas a cada quadro; cada plano de câmera define início e fim explícitos.
- Trajetórias (baleia, Lumi, câmeras amarradas) são curvas por pontos-chave avaliadas em `T`.
- Partículas são em forma fechada. Os rastros (cauda da Lumi, esteira de Astra) são reconstruídos do passado da trajetória:
  a partícula `i` nasceu em `T − idade` na posição `path(T − idade)`. Nada é acumulado entre quadros.
- O áudio dos 90 s é renderizado num `OfflineAudioContext` com ruído de semente fixa; o mesmo buffer toca na prévia e vai para o MP4.

`npm run verify` renderiza os mesmos quadros em dois navegadores, em ordens opostas, e compara os hashes dos pixels.

Duas armadilhas encontradas e corrigidas, caso você estenda o projeto:

- O Three.js ordena objetos transparentes pelo centro da esfera envolvente da geometria, calculada só no primeiro uso.
  Geometrias que mudam a cada quadro precisam de uma esfera fixa (veja `particles/trail.js`).
- Efeitos que projetam um ponto na tela (raios, ondas) e tudo o que olha para a câmera devem ser chamados
  **depois** de a sequência posicionar a câmera daquele quadro.

## Arquitetura

```
index.html, vite.config.js
public/script.json            falas: quem, quando, texto (fonte das legendas e da dublagem)
public/voice/                 dublagem pt-BR gerada (mp3 + durações)
src/
  main.jsx, styles.css
  components/   App.jsx, Controls.jsx   interface React (palco 9:16 + painel)
                overlay.js              legendas e texto final (DOM em função de T; entram no quadro exportado)
  timeline/     master.js               timeline principal de 90 s e as cinco de 18 s
                player.js               relógio da prévia (sincronizado ao áudio)
                util.js                 easing, ruído e RNG com semente
  rendering/    stage.js                renderer 9:16, bloom, pós-processamento
                film.js                 o mundo compartilhado pelas cinco sequências
                engine.js               inicialização e draw(T)
  camera/       director.js             planos sobre GSAP, trajetórias por pontos-chave
  characters/   humanoid.js             rig, poses em camadas, expressões
                kaito.js, lumi.js       Kaito (capa de tecido, cristal, símbolos) e Lumi
  creatures/    astra.js                a baleia celestial
  environments/ islands.js              ilhas flutuantes, cachoeiras, castelo, mar de nuvens, planetas
                ocean.js                oceano suspenso, esfera de água, ruínas, águas-vivas, cidade
                desert.js               deserto, templo, coração de cristal, túnel de galáxias, fragmentos
                cosmos.js               planetas que despertam, flores de nebulosa, corredor de constelações, Terra
  shaders/      sky.js                  céu cósmico: nebulosas, estrelas que morrem e renascem
                post.js                 distorção, dobra espacial, raios volumétricos, flash
                energy.js               portal, ondas de choque, feixes
                dissolve.js             dissolução por ruído 3D
  particles/    particles.js, trail.js, starmap.js
  audio/        engine.js               sintetizador, mixagem, vozes, WAV
                cues.js                 trilha e efeitos em tempo absoluto
  episodes/     seq1.js … seq5.js       decupagem de cada sequência
  export/       api.js                  renderFrame(n) e áudio expostos à página
tools/          export.mjs, verify.mjs, stills.mjs, cover.mjs, audio.mjs, voice.py
```

### Personagens e continuidade

- **Kaito**: mesma ficha de cores em todo o filme (`KAITO` em `kaito.js`). A capa é uma malha ondulada a cada quadro em função do tempo e do vento.
- **Lumi**: esfera de luz com olhos, orelhas e cauda de partículas; na sequência 4 cresce até virar um pequeno sol.
- **Astra**: 260 m de comprimento (Kaito tem 1,7 m). As constelações sob a pele e o nado são calculados em GLSL.
- As passagens entre sequências emendam o movimento: a câmera entra numa constelação da baleia (1→2),
  o oceano se dobra no portal (2→3), os fragmentos convergem em luz (3→4) e a onda de luz chega à Terra (4→5).

### Áudio

Trilha, efeitos e ambiência são sintetizados em Web Audio: cordas, coro, harpa, flauta e percussão em ré menor,
com um tema que volta em quatro momentos e resolve em fá maior no final. Os primeiros três segundos não têm música:
a estrela morre em silêncio.

As vozes foram geradas com o Kokoro-82M (modelo aberto, roda local em CPU): narrador `pm_alex` mais grave,
Kaito `pm_santa`, Lumi `pf_dora` mais aguda, voz misteriosa `pm_alex` grave com eco. Para refazer:

```bash
pip install kokoro-onnx soundfile numpy
npm run voice        # baixa o modelo (~350 MB) na primeira vez
```

Se os arquivos de voz não existirem, o player segue com legendas e trilha.

## Técnicas e referências

A lista [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) serviu de referência de técnica, não de conteúdo:
render quadro a quadro com Playwright, Three.js + GSAP com timeline pausada, mundos procedurais sem assets externos,
shaders de pós-processamento e áudio sintetizado em código.

## Limitações conhecidas

- Os personagens são feitos de primitivas: o estilo é low-poly estilizado, não modelagem esculpida.
- Não há sincronia labial por fonema; a boca abre e fecha no ritmo da fala.
- As vozes são de TTS aberto; não chegam à naturalidade de um ator. Trocar é substituir os mp3 em `public/voice/` e ajustar `at` em `script.json`.
- As "milhares de versões de Kaito" nos fragmentos de realidade são retratos desenhados em Canvas (quatro poses), não o modelo 3D replicado.
- A subida final atravessa as nuvens com um clarão que cobre a troca de cenário (da vila para o planeta visto do espaço).
