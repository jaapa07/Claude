# GAME_SPEC.md — "GRAND SLAM ARCADE: Circuito de Ouro"

> **Como usar:** entregue este arquivo inteiro a uma IA de código com a instrução:
> *"Implemente o projeto completo descrito em GAME_SPEC.md, seguindo todas as regras. Não pare antes de cumprir a Definição de Pronto (seção 16)."*

---

## 0. Missão

Construir um **jogo de tênis arcade 3D completo, jogável do início ao fim**, com a sensação dos jogos de tênis de arcade do fim dos anos 90 (câmera atrás do jogador, rallies rápidos, golpes carregados, replays dramáticos), **mas com identidade 100% original**: nome, tenistas, torneios, patrocinadores, logos, interface, músicas e arte próprios.

O resultado tem de parecer um **produto**, não um protótipo: modelos 3D animados, texturas reais, efeitos visuais, som, música, menus, modos de jogo, replays, telas de resultado e progressão.

---

## 1. Regras inegociáveis (ler antes de tudo)

| # | Regra |
|---|-------|
| R1 | **Nada de Canvas 2D.** É proibido desenhar o jogo com `CanvasRenderingContext2D` (`fillRect`, `arc`, `drawImage` etc.). A renderização é **3D por WebGL via Three.js**. (O WebGL usa um elemento `<canvas>` como superfície da GPU; isso é permitido e inevitável. O que é proibido é o desenho 2D à mão.) |
| R2 | **Interface 100% em HTML/CSS (DOM)** sobreposta à cena 3D: menus, HUD, placar, medidor de força, legendas e telas de resultado. Nada de texto desenhado em canvas. |
| R3 | **Assets reais, não procedurais.** Tenistas, juiz de cadeira, boleiros, público, raquete, bola, rede, arquibancadas, cadeira do juiz, placas de patrocínio, árvores/vasos e piso das quadras vêm de **arquivos de asset** (`.glb`, `.png`, `.ktx2`, `.ogg`, `.woff2`). Veja na seção 9 o que pode ser procedural. |
| R4 | **Nada genérico.** Proibidos: cubos/cápsulas como personagens, cores lisas sem textura, fonte padrão do navegador, beeps de oscilador como efeito sonoro, menus sem arte. |
| R5 | **Nada de propriedade de terceiros.** Proibido usar nomes de jogos, marcas, tenistas reais, torneios reais (Wimbledon, Roland Garros etc.), logos ou músicas existentes. Tudo é fictício e original (seção 3). |
| R6 | **Todo asset tem licença registrada** em `assets/CREDITS.md` (fonte, autor, licença, URL). Somente CC0, CC-BY (com crédito) ou criado pela própria IA. |
| R7 | **Completo significa jogável do boot aos créditos** — sem `TODO`, sem botão morto, sem tela placeholder. |
| R8 | **60 FPS** em notebook comum (GPU integrada) a 1080p, com opção de qualidade Baixa/Média/Alta. |

---

## 2. Stack técnica obrigatória

- **Linguagem:** TypeScript (strict).
- **Build:** Vite.
- **3D:** Three.js (r160+) com `GLTFLoader`, `DRACOLoader`, `KTX2Loader`, `AnimationMixer`.
- **Pós-processamento:** `postprocessing` (pmndrs): Bloom suave, SMAA, Vignette, ToneMapping ACES.
- **Física da bola:** implementação própria e determinística (seção 6). **Não** usar motor de física genérico para a bola.
- **Áudio:** Howler.js (sprites de áudio, música em loop com crossfade).
- **UI:** HTML + CSS (pode usar Preact ou Lit para componentes; nada de canvas).
- **Animação de UI:** GSAP.
- **Estado/persistência:** `localStorage` para save (progresso, opções, recordes).
- **Entrada:** teclado, gamepad (Gamepad API) e toque (botões virtuais em DOM no celular).

### Estrutura de pastas

```
/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ scripts/
│  ├─ fetch-assets.mjs        # baixa os pacotes CC0 da seção 9
│  └─ optimize-assets.mjs     # gltf-transform: draco + ktx2 + resize
├─ assets/
│  ├─ CREDITS.md
│  ├─ models/   (players/, umpire/, ballkids/, crowd/, props/, venues/)
│  ├─ anims/    (golpes, locomoção, comemoração)
│  ├─ textures/ (courts/, ads/, ui/, fx/)
│  ├─ audio/    (sfx/, voice/, music/, ambience/)
│  ├─ fonts/
│  └─ portraits/ (retratos 2D dos tenistas para menus)
└─ src/
   ├─ main.ts
   ├─ core/      (Game, StateMachine, Loop, AssetManager, Save)
   ├─ render/    (Renderer, CameraDirector, PostFX, Lighting)
   ├─ world/     (Court, Venue, Crowd, Umpire, BallKids)
   ├─ gameplay/  (Ball, BallPhysics, Player, ShotSystem, Serve, AI, Rules, Scoring)
   ├─ fx/        (Particles, Trails, Decals, ScreenShake)
   ├─ replay/    (Recorder, ReplayDirector)
   ├─ audio/     (AudioManager, Commentary)
   ├─ input/     (Keyboard, Gamepad, Touch, InputMap)
   ├─ ui/        (screens/*, hud/*, components/*, styles/*.css)
   └─ data/      (players.json, venues.json, circuit.json, minigames.json)
```

---

## 3. Identidade original

### 3.1 Nome e marca
- Título: **GRAND SLAM ARCADE — Circuito de Ouro** (logo próprio em SVG, com bola estilizada e faixa dourada).
- Liga fictícia: **GOLD CIRCUIT TOUR (GCT)**.
- Patrocinadores fictícios (para placas e HUD): *Volta Sports, Nimbus Water, Kairo Watches, Pulse Energy, Ardent Motors, Lumen Air*. Cada um com logo próprio em SVG/PNG.

### 3.2 Elenco (8 tenistas + 2 desbloqueáveis)
Cada tenista tem: nome, país fictício ou real, estilo, 5 atributos (0-100), cor de uniforme, raquete, retrato, animação de vitória própria e uma frase de efeito.

| Nome | País | Estilo | Força | Velocidade | Saque | Voleio | Técnica |
|---|---|---|---|---|---|---|---|
| Rafa Montenegro | BRA | Baseliner agressivo | 85 | 75 | 70 | 55 | 80 |
| Kenji Arakawa | JPN | Contra-atacante | 65 | 92 | 60 | 65 | 85 |
| Lukas Brenner | GER | Sacador-voleador | 80 | 65 | 92 | 88 | 60 |
| Dmitri Volkov | RUS | Big server | 90 | 60 | 95 | 60 | 60 |
| Mateo Ruiz | ARG | Saibro / top spin | 75 | 80 | 65 | 55 | 88 |
| Amara Okafor | NGA | All-round | 78 | 82 | 75 | 75 | 75 |
| Liam O'Hare | IRL | Voleador | 65 | 78 | 72 | 92 | 70 |
| Viktor Lund | SWE | Defensivo | 60 | 90 | 60 | 60 | 90 |
| **"El Muro"** (desbloq.) | ??? | Chefe final | 92 | 92 | 90 | 85 | 92 |
| **Rookie** (desbloq.) | criado pelo jogador | Ajustável | — | — | — | — | — |

### 3.3 Arenas (4 superfícies, cada uma com identidade visual própria)

| Torneio fictício | Superfície | Comportamento da bola | Ambientação |
|---|---|---|---|
| Harbor Open (Sydney-like) | Dura (azul/verde) | quique médio, velocidade média | sol forte, céu azul, arquibancada metálica, flores tropicais |
| Terre Rouge Cup (Paris-like) | Saibro | quique alto, bola lenta, **marca da bola no chão**, poeira | fim de tarde dourado, arquibancada de concreto, placas verdes |
| Royal Lawn Classic (Londres-like) | Grama | quique baixo, bola rápida, **desgaste da grama na linha de base** | céu nublado, hera nas paredes, placar de madeira |
| Neon Arena Finals (indoor) | Carpete/sintético | rápido e baixo | noite, holofotes, telão, luzes coloridas, fumaça leve |

Os nomes de torneio acima são os fictícios; **não** usar nomes de cidades nos logos.

---

## 4. Telas e fluxo (o que o vídeo de referência mostra, reinterpretado)

```
Boot (logos) → Tela de título (attract mode: demo da IA jogando) → Menu principal
   ├─ ARCADE        → seleção de tenista → 5 partidas em sequência + chefe final → final + créditos
   ├─ EXIBIÇÃO      → regras livres: games, sets, superfície, dificuldade, simples/duplas
   ├─ CIRCUITO      → modo carreira (seção 8)
   ├─ TREINO        → minigames (seção 8.3)
   ├─ OPÇÕES        → controles, áudio, gráficos, idioma (PT-BR/EN)
   └─ CRÉDITOS
```

Requisitos de cada tela:
- **Menu principal:** fundo com a cena 3D de uma quadra vazia em câmera lenta (órbita) + itens grandes inclinados em itálico, com faixa diagonal colorida e brilho no item ativo, som de navegação/confirmação/cancelamento.
- **Seleção de tenista:** grade de retratos; ao focar, o modelo 3D do tenista aparece girando com a animação de "idle" própria, barras de atributos animadas e bandeira.
- **Tela "VS" pré-partida:** dois retratos, nomes, países, nome do torneio, superfície, logo do torneio. Transição com corte diagonal.
- **Intro da partida:** câmera cinematográfica passa pelo público, pelo juiz e pelos dois tenistas (3 tomadas, ~6 s, pulável).
- **Pausa:** continuar, controles, opções, desistir.
- **Resultado:** placar por set, tempo de jogo, aces, winners, smashes, pontos na rede, velocidade máxima de saque, erros não forçados. Retrato do vencedor com animação.

---

## 5. HUD in-game (DOM)

Baseado na leitura do vídeo de referência, mas com arte própria:
- **Topo esquerdo/direito:** faixa com "1P"/"COM" (ou "2P"), nome do tenista e indicador de games por set.
- **Inferior esquerdo:** placar do game atual (0/15/30/40/AD), com ícone de quem saca.
- **Inferior direito:** velocímetro do último golpe em **km/h**.
- **Pop-ups centrais animados:** `OUT`, `FAULT`, `DOUBLE FAULT`, `LET`, `ACE!`, `NET`, `DEUCE`, `ADVANTAGE`, `BREAK POINT`, `SET POINT`, `MATCH POINT`, `GAME`, `SET`, `GAME, SET AND MATCH`.
- **Medidor de força** acima do tenista (projetado do 3D para a tela) enquanto o golpe é carregado.
- **Marcador do alvo** do saque (seta no chão em 3D) durante a mira.
- **Indicador "COM"/"1P"** com seta sobre o tenista no início de cada ponto.
- Cor e tipografia da faixa mudam por torneio (tema por arena).

---

## 6. Gameplay — regras e física

### 6.1 Controles
| Ação | Teclado | Gamepad |
|---|---|---|
| Mover | WASD / setas | analógico esquerdo |
| Golpe normal (top spin) | J | A |
| Slice / defensivo | K | B |
| Lob | L | X |
| Saque | J (segurar = força, soltar = bate) | A |
| Direção do golpe | direção pressionada no momento do contato | analógico |
| Pausa | Esc | Start |

### 6.2 Sistema de golpe (núcleo do "feel")
- **Auto-posicionamento parcial:** o jogador move o tenista; ao apertar o botão **antes** da bola chegar, o tenista "trava" e começa a carregar. Quanto mais cedo apertar, **mais força e precisão**. Apertar tarde = golpe fraco e defensivo ("estica" com animação de alcance).
- **Direção:** decidida pela direção pressionada **no contato**, mais o timing (adiantado puxa para a diagonal, atrasado empurra para a paralela).
- **Tipos:** top spin, slice, lob, drop shot (slice + para trás), smash (automático quando a bola alta está acima da cabeça), voleio (perto da rede), **mergulho** (bola fora de alcance + golpe = animação de mergulho, com levantar lento).
- **Saque:** lançamento da bola → medidor sobe e desce → acertar o pico = saque máximo (até ~220 km/h para os melhores sacadores). Mira com direcional durante o lançamento. Primeiro e segundo saque, falta, dupla falta, let.

### 6.3 Física da bola (determinística, passo fixo de 1/120 s)
- Gravidade, arrasto do ar, **efeito Magnus** (spin altera a trajetória: top cai rápido, slice flutua e desliza).
- Quique depende da superfície: coeficiente de restituição e atrito por arena (tabela em `venues.json`).
- Colisão com a rede (fita): passa raspando, para ou "let".
- **Linhas oficiais** e checagem de dentro/fora pelo ponto de contato da bola no chão (raio da bola considerado), com decalque da marca no saibro.
- O cálculo do golpe usa **resolução inversa**: dado alvo + altura sobre a rede + spin, calcular velocidade inicial (garante que a IA e o jogador acertem onde miram, com erro proporcional ao timing e aos atributos).

### 6.4 Regras do tênis (completas)
- Pontuação 0-15-30-40, deuce/vantagem, games, sets (1, 3 ou 5), **tie-break** em 6-6.
- Troca de lado nos games ímpares (com a câmera e o HUD acompanhando).
- Alternância do lado de saque (direita/esquerda).
- Duplas: regras de rodízio de saque e corredores laterais válidos.

### 6.5 IA (3 níveis + chefe)
- Máquina de estados: posicionar → antecipar → escolher golpe → recuperar o centro.
- Decide o golpe pela situação: sobe à rede depois de golpe profundo, passa o voleador, lob se o rival está colado na rede, slice quando pressionada.
- Erros proporcionais à dificuldade e à pressão (break point, match point).
- Personalidade por tenista (sacador-voleador sobe mais, defensivo devolve tudo).

---

## 7. Câmera, apresentação e replays

- **Câmera de jogo:** atrás e acima do jogador humano (como no vídeo), com leve acompanhamento lateral da bola e suavização; troca de lado nas viradas.
- **Câmeras de transição** entre pontos: close do tenista comemorando ou lamentando, juiz anunciando, boleiro recolhendo a bola, público.
- **Replay automático** dos pontos marcantes (ace, winner, mergulho, rally com mais de 10 trocas, match point): gravador de 10 s com o estado de todos os atores a cada frame; reprodução com **câmera lenta**, 2 a 3 ângulos cinematográficos, faixa "REPLAY" animada e opção de pular.
- **Comemorações:** pelo menos 6 animações distintas (punho cerrado, braços abertos, ajoelhar no match point, raquete no ar, frustração, bater a raquete na perna).

---

## 8. Modos de jogo

### 8.1 Arcade
5 partidas (1 set curto, 2 games por padrão), cada uma em uma arena; a sexta é o chefe "El Muro" na Neon Arena. Continue limitado. Final com animação de troféu e créditos.

### 8.2 Circuito (carreira)
- Crie o **Rookie** (nome, país, cor de uniforme, cabelo e pele entre opções prontas de modelo/textura).
- **Calendário** com 12 torneios fictícios nas 4 arenas, ranking de 0 a 100, dinheiro.
- Dinheiro compra **raquetes, tênis e uniformes** (troca real de textura/modelo, mais pequenos bônus de atributo).
- Atributos sobem por meio dos minigames de treino.
- Save automático.

### 8.3 Minigames de treino (6)
1. **Alvo:** acertar alvos 3D (placas que explodem em partículas) no fundo da quadra.
2. **Canhão:** devolver bolas de uma máquina lançadora dentro de zonas iluminadas.
3. **Saque de precisão:** derrubar pinos de boliche gigantes posicionados na área de saque.
4. **Voleio relâmpago:** voleios seguidos contra duas máquinas.
5. **Corrida da bola:** coletar bolas gigantes pela quadra desviando de bolas rolando (agilidade).
6. **Muro:** rally contra um paredão com zonas de pontuação.

Cada minigame: tela de instrução ilustrada, timer, recorde, medalhas bronze/prata/ouro.

---

## 9. Pipeline de assets (pouco procedural)

### 9.1 Fontes permitidas (CC0 / CC-BY)
O script `scripts/fetch-assets.mjs` baixa, extrai e organiza:
- **Personagens humanos rigados + animações:** Quaternius (*Universal Animation Library*, *Ultimate Modular Men/Women*, CC0). Recolorir uniformes via textura/material por tenista.
- **Props (raquete, bola, cadeira, rede, banco, vasos, árvores):** Kenney, Quaternius, Poly Pizza (filtrar CC0/CC-BY).
- **Texturas PBR (saibro, grama, concreto, metal, madeira):** ambientCG e Poly Haven (CC0).
- **HDRIs de céu:** Poly Haven (diurno, fim de tarde, nublado, indoor).
- **Efeitos sonoros:** Kenney Audio, Sonniss GDC bundles (licença royalty-free), Freesound (somente CC0): impacto de raquete (3 intensidades), quique por superfície, passos por superfície, rede, público (murmúrio, aplausos, "ooh", vaia leve), juiz.
- **Música:** faixas CC0/CC-BY de OpenGameArt ou Incompetech (com crédito), ou trilha **composta pela IA** como arquivos MIDI→OGG via um sintetizador offline (Tone.js Offline + samples SFZ CC0) renderizados **no build**, nunca em tempo real.
- **Fontes:** Google Fonts (licença OFL), por exemplo *Anton* ou *Bebas Neue* para títulos e *Rajdhani* ou *Barlow Condensed* para HUD.
- **Voz do juiz/locutor:** gravar ou gerar por TTS **no build** e salvar em `.ogg` ("Out!", "Fault!", "Let!", "Deuce", "Advantage", placares, nomes dos tenistas, "Game, set and match").

### 9.2 Assets criados pela própria IA (arquivos, não código em tempo real)
- Logos (jogo, liga, torneios, patrocinadores) em **SVG** escritos à mão e exportados para PNG/KTX2.
- Arte de placas publicitárias, faixas de HUD, ícones e molduras de menu em SVG.
- Retratos dos tenistas: render do próprio modelo 3D em pose (script `scripts/render-portraits.mjs` com Three.js headless/Playwright) e salvar como PNG.
- Textura das linhas da quadra: PNG de alta resolução por superfície (com sujeira/desgaste pintados).

### 9.3 O que **pode** ser procedural (lista fechada)
- Sistemas de partículas (poeira, grama, faíscas do golpe forte, confete).
- Rastro da bola (trail) e motion blur do golpe.
- Distribuição do público nas arquibancadas (instâncias de modelos reais, com variação de cor e animação por shader).
- Câmera e easing.
- Sombras e iluminação.

Todo o resto é asset em arquivo.

### 9.4 Otimização
- `gltf-transform`: Draco nos modelos, texturas para KTX2 (ETC1S/UASTC), no máximo 2048 px.
- Público com `InstancedMesh` e impostores (sprites de cartaz 3D) a distância.
- Carregamento por arena com tela de loading ilustrada (dica de jogo + barra de progresso).

---

## 10. Efeitos visuais (VFX) obrigatórios

- Rastro da bola com cor por tipo de golpe (top = laranja, slice = azul, lob = branco) e intensidade pela velocidade.
- Flash/impacto no contato da raquete (sprite animado + leve *hit-stop* de 40 ms nos golpes perfeitos).
- **Golpe perfeito:** brilho na raquete, partículas douradas, som especial.
- Poeira no saibro (quique, freada, mergulho) + **marca da bola** que permanece até o fim do ponto.
- Fiapos de grama na grama; desgaste visível da linha de base em partidas longas.
- Sombra de contato da bola (*blob shadow*) sempre visível para leitura de profundidade.
- Bandeiras e lonas balançando (animação no vertex shader).
- Flashes de câmera no público nos match points.
- Confete e chuva de papel na final.
- Pós-processamento: bloom nas luzes da arena indoor, vinheta, correção de cor por arena (LUT).

---

## 11. Áudio

- Mixagem em canais: música, efeitos, voz, ambiente (sliders em Opções).
- O som do golpe varia por força e por tipo (top/slice/lob/smash).
- Quique e passos variam por superfície.
- O público reage ao contexto: silêncio no saque, "ooh" no ponto apertado, aplauso proporcional ao rally, explosão no match point.
- Música: tema do menu, tema da seleção, 4 temas de arena (um por superfície), jingle de vitória, jingle de derrota, tema dos créditos.
- Juiz e locutor anunciam o placar com as gravações.

---

## 12. Atores da quadra (vida no cenário)

- **Juiz de cadeira:** sentado, vira a cabeça seguindo a bola, gesticula ao anunciar.
- **Juízes de linha:** levantam o braço no "out".
- **4 boleiros:** correm para pegar a bola após o ponto e entregam ao sacador (animações de corrida, agachar, lançar).
- **Público:** pelo menos 3 modelos × variações de cor, animações de sentar, aplaudir, levantar e ola (rara).
- **Fotógrafos** atrás da quadra.

---

## 13. Opções e acessibilidade

- Gráficos: qualidade (sombras, pós-processamento, densidade do público), resolução interna, limite de FPS.
- Áudio: 4 sliders.
- Controles: remapeamento de teclado e gamepad.
- Idioma: PT-BR e EN (todos os textos em `i18n/*.json`).
- Acessibilidade: modo daltônico (marcadores com formas e não só cores), tamanho do HUD, desligar o tremor de tela, "assistência de golpe" (posicionamento automático mais forte).

---

## 14. Qualidade de código

- Arquitetura por sistemas (ECS leve ou componentes), sem *god class*.
- Loop com **passo fixo** para física e IA e **interpolação** na renderização.
- Todos os dados de balanceamento em JSON (`data/`), nunca *hardcoded*.
- Testes unitários (Vitest) para: pontuação/regras (deuce, tie-break, troca de lado, duplas), física (o quique bate com o coeficiente; o alvo de golpe é atingido com erro ≤ 5 cm sem ruído).
- Testes de ponta a ponta (Playwright): boot → menu → exibição → jogar um game com input simulado → tela de resultado.
- ESLint e Prettier sem erros; `npm run build` sem warnings.

---

## 15. Ordem de implementação (a IA deve seguir)

1. Scaffold, `fetch-assets`, `optimize-assets`, `CREDITS.md`.
2. AssetManager e carregamento de uma arena completa com iluminação e HDRI.
3. Física da bola e testes.
4. Tenista com animações e movimento, sistema de golpe e saque.
5. Regras e pontuação, com testes.
6. IA.
7. HUD e pop-ups.
8. Câmera de jogo, câmeras de transição e replays.
9. VFX e áudio.
10. Atores da quadra (juiz, boleiros, público).
11. As outras 3 arenas.
12. Menus, seleção, tela VS, resultado.
13. Modos Arcade, Exibição, Treino (6 minigames), Circuito.
14. Opções, i18n, acessibilidade, save.
15. Otimização, testes E2E, polimento, README.

---

## 16. Definição de pronto (checklist final)

- [ ] `npm install && npm run fetch-assets && npm run dev` abre o jogo sem erro no console.
- [ ] Nenhum uso de `getContext('2d')` no código do jogo (verificar com grep).
- [ ] Nenhum personagem ou prop feito de primitiva geométrica; todos carregados de `.glb`.
- [ ] 4 arenas com visual, som e física distintos.
- [ ] 8 tenistas jogáveis + 2 desbloqueáveis, cada um com retrato, atributos e comemoração própria.
- [ ] Partida completa com regras oficiais, incluindo tie-break e troca de lado.
- [ ] Simples e duplas (2P local no mesmo teclado/gamepads).
- [ ] Replay automático com câmera lenta e múltiplos ângulos.
- [ ] Modos Arcade, Exibição, Circuito e Treino (6 minigames) completos.
- [ ] Juiz, boleiros e público animados.
- [ ] Todos os VFX da seção 10 e o áudio da seção 11 presentes.
- [ ] Save/load funcionando; opções persistem.
- [ ] 60 FPS em qualidade média numa GPU integrada.
- [ ] `assets/CREDITS.md` completo; nenhum nome, marca ou personagem real ou de outro jogo.
- [ ] Testes unitários e E2E passando.
- [ ] README com como rodar, controles e créditos.

---

## 17. Referência de estilo (o que capturar do vídeo, sem copiar)

Do vídeo de referência (tênis arcade de 1999) extraímos **apenas sensações e convenções de gênero**:
- Câmera alta atrás do jogador, quadra inteira visível, ritmo rápido.
- Menu com itens grandes em itálico sobre faixas coloridas diagonais.
- Tela "VS" com retratos lado a lado antes da partida.
- Pop-ups grandes de chamada ("Out", "Match Point", "1P Loses").
- Placar compacto no canto inferior e velocímetro de saque.
- Superfícies muito distintas (dura azulada, saibro laranja com marcas, grama com desgaste).
- Close dramático do tenista entre os pontos e replay em câmera lenta.
- Tela de resultados com estatísticas (tempo, aces, smashes, pontos na rede).

**Não** reproduzir: logos, nomes, layouts exatos, paleta da HUD, patrocinadores, tenistas ou música do jogo original.
