# Rodrigo Hajime — O Arquiteto dos Dados

Animação 3D original em cinco episódios de 20 segundos (1 min 40 s no total), vertical 9:16 em 1080×1920, feita inteiramente em código: nenhuma imagem ou vídeo pronto, tudo é gerado no navegador.

| Episódio | Título | O que acontece |
|---|---|---|
| 1 | O Primeiro Código | Uma cidade de código se ergue no escuro; partículas formam Rodrigo diante de um terminal; o toque dispara os fluxos de dados; surge a inscrição luminosa. |
| 2 | O Caos dos Dados | Mensagens JSON, XML e HTTP voam sem controle; erros 500 e timeouts; Rodrigo organiza tudo em um fluxo no estilo do Apache NiFi. |
| 3 | A Arquitetura Invisível | A rede de empresas é revelada; ETL 3D e PostgreSQL; cada integração acende uma região; a rede vira um planeta. |
| 4 | A Era da Inteligência | Uma IA surge como esfera de 110 mil partículas; agentes se conectam; painéis preveem falhas e corrigem rotas; nasce uma nova cidade. |
| 5 | O Próximo Nível | A ponte holográfica; o código vira sistemas, robô, aplicação e IA; explosão de partículas forma o símbolo; letreiro final. |

O vídeo já renderizado está em `o-arquiteto-dos-dados.mp4`.

## Como executar

A aplicação usa módulos ES, então precisa ser servida por HTTP (abrir o `index.html` direto do disco não funciona). Não há build nem instalação: todas as bibliotecas estão em `vendor/`.

```bash
cd arquiteto-dos-dados
python3 -m http.server 8000
# abra http://localhost:8000
```

Qualquer servidor estático serve (`npx serve`, extensão Live Server etc.). Use um navegador com WebGL 2: Chrome, Edge, Firefox ou Safari recentes.

## Controles

| Ação | Como |
|---|---|
| Reproduzir / pausar | botão, clique no vídeo ou **espaço** |
| Ir para um episódio | botões **EP 1–5** ou teclas **1–5** |
| Avançar / voltar 5 s | **→** / **←**, ou arraste a barra de progresso |
| Tela cheia | **F** |
| Legendas | caixa "Legendas" ou **L** |
| Mudo | caixa "Trilha e efeitos" ou **M** |
| Narração, HUD, volume | caixas e controle no painel |
| Qualidade | Automática (reduz a resolução interna se cair abaixo de ~40 fps), 100%, 75% ou 50% |

## Captura e exportação

- **Capturar quadro (PNG):** salva o quadro atual em 1080×1920.
- **Gravar vídeo (WebM):** grava o filme do início ao fim em tempo real, com som, usando `MediaRecorder`. A fluidez depende da máquina.
- **Exportar quadros + áudio:** grava os 6000 quadros (60 fps) e o `audio.wav` numa pasta que você escolhe, mais o comando do `ffmpeg` para montar o MP4. Precisa da File System Access API (Chrome ou Edge).
- **Baixar trilha (WAV):** a mixagem completa (trilha, efeitos e narração).

Para um MP4 sem depender da velocidade da máquina, use o render determinístico (Node + Playwright com Chromium + ffmpeg):

```bash
node tools/render.js --at 3,28,57,72,96        # quadros avulsos em out/stills/
node tools/render.js --out out/video.mp4       # o filme inteiro, 60 fps, sem som
node tools/render.js --audio                   # out/audio.wav
ffmpeg -i out/video.mp4 -i out/audio.wav -c:v copy -c:a aac -b:a 192k o-arquiteto-dos-dados.mp4
node tools/smoke.js                            # teste rápido dos controles da página
```

`--from` e `--to` (em segundos) permitem renderizar trechos em paralelo e juntar depois.

## Narração

- Se existirem os arquivos `audio/ep*_*.mp3` e `audio/narracao.json`, a aplicação usa essa narração gravada (voz masculina pt-BR sintetizada localmente com o modelo aberto Kokoro, voz `pm_alex`). É o caso deste repositório.
- Sem esses arquivos, a narração é feita pela **Web Speech API** do navegador, com a voz pt-BR que o sistema tiver. Para forçar isso, apague `audio/narracao.json`.
- O texto e o instante de cada fala ficam em `roteiro.json`. Para regravar depois de editar: `pip install kokoro-onnx soundfile numpy && python3 tools/voice.py`.

## Como foi construído

| Arquivo | Papel |
|---|---|
| `index.html`, `style.css` | página e painel de controles |
| `roteiro.json` | títulos dos episódios e falas com seus tempos |
| `src/main.js` | carregamento, relógio do filme, controles, captura e exportação |
| `src/world.js` | renderer Three.js, bloom, passe GLSL final (aberração, glitch, alerta, distorção de transição), universo de fundo |
| `src/core.js` | peças compartilhadas: campo de código flutuante, cidade de código, fluxos de dados em Bézier, painéis holográficos, rótulos |
| `src/character.js` | o avatar articulado de Rodrigo e a nuvem de partículas que o forma |
| `src/episodes/ep1.js` … `ep5.js` | cada episódio: objetos, linha do tempo GSAP e atualização por quadro |
| `src/overlay.js` | camada 2D em Canvas: HUD, cartão do episódio, legendas palavra a palavra, letreiro final |
| `src/audio.js` | trilha eletrônica original, efeitos e mixagem com a Web Audio API |
| `tools/` | `render.js` (exportação quadro a quadro), `voice.py` (narração), `smoke.js` (teste da página) |

Decisões que valem saber:

- **Tudo é função do tempo.** `world.seek(T)` desenha qualquer instante do filme sempre igual: as linhas do tempo do GSAP ficam pausadas e são posicionadas em `T`, e os shaders recebem o mesmo `T`. Por isso pular, voltar e exportar quadro a quadro dão o mesmo resultado que tocar ao vivo.
- **As partículas rodam na GPU.** Posições, metamorfoses e fluxos são calculados nos vertex shaders (GLSL); o JavaScript só atualiza uniforms.
- **A trilha é sintetizada, não é um arquivo.** Os 100 s são gerados num `OfflineAudioContext` ao carregar (120 BPM, 10 compassos por episódio, em ré menor) e tocados como um buffer, o que mantém som e imagem alinhados em qualquer salto.

## Personalização

- **Aparência do personagem:** `APARENCIA` em `src/character.js` (tom de pele, cabelo, traje, cor das luzes e dos óculos). Não havia fotografia de referência no repositório, então o avatar é estilizado e genérico; com uma foto, esses são os valores a ajustar.
- **Textos e tempos das falas:** `roteiro.json`.
- **Cores:** `PAL` em `src/core.js`.
- **Trechos de código que flutuam nas cenas:** `CODE` em `src/core.js`.

## Limitações

- O avatar é feito de formas primitivas (cápsulas, esferas e caixas), não é um modelo esculpido nem tem rosto detalhado.
- Os 60 fps ao vivo dependem da placa de vídeo. Em máquinas sem GPU dedicada, use a qualidade Automática ou 50%; o MP4 exportado tem sempre 60 fps.
- A síntese da trilha leva alguns segundos ao carregar; se você der play antes, a imagem começa e o som entra quando ficar pronto.

## Créditos de terceiros

Three.js r160 (MIT), GSAP 3.12.5 (licença padrão GreenSock, gratuita), fontes Orbitron, Rajdhani e JetBrains Mono (SIL OFL), voz Kokoro-82M (Apache 2.0).
