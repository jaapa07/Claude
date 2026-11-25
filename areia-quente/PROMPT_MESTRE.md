# AREIA QUENTE — Prompt-mestre para gerar o jogo completo

> **Como usar:** entregue este arquivo inteiro a um agente de IA de código (Claude Code ou similar) com a frase:
> *"Construa o projeto descrito neste documento, do zero até o fim, seguindo todas as regras. Não pare até a Definição de Pronto (seção 14) estar 100% cumprida."*
>
> Referência de estilo: um vídeo de gameplay de futebol de praia arcade 3D da era PS2 (câmera de transmissão lateral, areia, arquibancadas cheias, combos com pontos de estilo, jogadores brilhando em modo especial, bicicletas, replays). **Este jogo é original:** mesmo gênero e mesma sensação, mas nome, jogadores, logotipos, patrocinadores, arenas e arte são todos próprios. Não copie nenhum nome, personagem, logotipo, tela ou música de jogo existente.

---

## 0. Regras inegociáveis (leia antes de tudo)

1. **Não é um jogo genérico.** Tudo tem identidade: nome, logo, paleta, tipografia, narração em texto, times com personalidade, arenas com história. Se algo parecer "placeholder", não está pronto.
2. **Não é um jogo de canvas 2D.** Proibido desenhar o jogo com `CanvasRenderingContext2D` (`ctx.fillRect`, `ctx.arc`, etc.). O jogo é **3D de verdade**, renderizado por engine (Three.js/WebGL) com **modelos .glb, texturas, animações esqueléticas e sprites de efeito em arquivo**. Menus e HUD são **HTML/CSS** com imagens, não pintados em canvas.
3. **Pouquíssimo procedural.** Proibido montar jogadores, estádio, gol, torcida ou bola com `BoxGeometry`/`SphereGeometry`/`CylinderGeometry` em tempo de execução. Toda geometria visível vem de **arquivos de asset** (`.glb`). Procedural só é permitido para: posição de partículas, variação aleatória de torcida (escolher qual modelo/cor), ruído leve de câmera e física da bola.
4. **Assets reais, completos e versionados.** Modelos, texturas, sprites (flipbooks), ícones, fontes, músicas e efeitos sonoros ficam em `public/assets/` com um `ASSETS.md` listando **origem, autor e licença** de cada arquivo. Só licenças livres para uso: **CC0** de preferência, CC-BY com crédito, ou criado pelo próprio projeto.
5. **Completo = jogável do início ao fim:** tela de abertura → menu → seleção de time → carregamento → apresentação do estádio → partida de 3 períodos → comemorações → replay → fim de jogo → troféu/torneio. Sem botões mortos, sem "em breve", sem TODO.
6. **Sem marcas reais.** Patrocinadores, emblemas e placas de publicidade são **fictícios e criados para o jogo** (ex.: "Coco Gelado", "Maré Alta Surf", "Rádio Onda 98"). Seleções nacionais podem usar nome e bandeira do país; **os jogadores são fictícios**.
7. **Verificação visual obrigatória.** Ao final de cada fase, rode o jogo no navegador headless (Playwright), tire screenshots e confira contra a seção 13. Corrija antes de seguir.

---

## 1. Visão do jogo

**AREIA QUENTE** é um futebol de praia arcade 3D, 5 contra 5 (4 na linha + goleiro), com foco em **jogadas de efeito**: chapéus, bicicletas, voleios, cabeçadas de peixinho. Cada firula gera **pontos de estilo** que enchem o **Medidor de Calor**; cheio, o time entra em **Modo Fogo** (jogadores brilham, ficam mais rápidos e o chute ganha rastro de fogo).

- **Tom:** festivo, ensolarado, praia brasileira, gritos de torcida, batucada.
- **Ritmo:** partidas curtas e cheias de gols (placares de 7×3 são normais).
- **Plataforma:** navegador desktop (teclado + gamepad). 60 fps num notebook médio.

---

## 2. Stack técnica (obrigatória)

| Camada | Escolha |
|---|---|
| Build | **Vite + TypeScript** (strict) |
| Render 3D | **Three.js** (r160+) com `GLTFLoader`, `DRACOLoader`, `KTX2Loader` |
| Animação | `AnimationMixer` com clipes esqueléticos dos `.glb`; blend/crossfade entre estados |
| Física da bola | código próprio simples (gravidade, quique na areia com amortecimento alto, efeito/curva) — **não** usar engine de física pesada |
| UI / HUD / Menus | **HTML + CSS** (camada `#ui` sobre o viewport 3D), com imagens PNG/SVG de `public/assets/ui` |
| Áudio | **Howler.js** com sprites de áudio |
| Pós-processamento | `EffectComposer`: bloom (Modo Fogo, holofotes à noite), vinheta, motion blur leve no replay |
| Entrada | teclado + **Gamepad API** |
| Testes | Vitest (lógica) + Playwright (screenshots de fumaça) |

---

## 3. Estrutura de pastas

```
areia-quente/
├─ index.html
├─ package.json / tsconfig.json / vite.config.ts
├─ ASSETS.md                 # inventário + licenças (obrigatório)
├─ scripts/
│  ├─ fetch-assets.mjs       # baixa packs CC0 e organiza em public/assets
│  ├─ build-kits.py          # (Blender headless) aplica uniformes e exporta .glb por time
│  └─ build-atlas.mjs        # empacota sprites/flipbooks e sprite de áudio
├─ public/assets/
│  ├─ models/   players/ goalkeeper/ referee/ ball/ arena/ props/ crowd/ dancers/
│  ├─ textures/ sand/ kits/ boards/ sky/ (HDRI)
│  ├─ vfx/      (flipbooks PNG: poeira de areia, faísca, fogo, confete, rastro, brilho)
│  ├─ ui/       (logo, emblemas, bandeiras, ícones de botão, molduras de HUD, cartões)
│  ├─ fonts/
│  └─ audio/    music/ sfx/ crowd/ announcer/
├─ src/
│  ├─ main.ts
│  ├─ core/       Game.ts, Loop.ts, AssetManager.ts, SceneManager.ts, Input.ts, Audio.ts, Save.ts
│  ├─ scenes/     Boot, Title, MainMenu, TeamSelect, Loading, ArenaIntro, Match, HalfTime, Replay, Results, Tournament, Options, Training
│  ├─ match/      Ball.ts, Player.ts, Goalkeeper.ts, Team.ts, Referee.ts, Rules.ts, Clock.ts, StyleSystem.ts, HeatMeter.ts, Camera.ts, Celebration.ts
│  ├─ ai/         TeamAI.ts, PlayerAI.ts (máquina de estados), Formation.ts
│  ├─ vfx/        Flipbook.ts, ParticlePool.ts, Trails.ts, FootprintDecals.ts, Aura.ts
│  ├─ ui/         Hud.ts, Menus.ts, Popups.ts (textos "+25", "GOL!", "BICICLETA!")
│  └─ data/       teams.json, players.json, arenas.json, moves.json, tournament.json, strings.pt-BR.json
└─ tests/
```

---

## 4. Plano de assets (o coração do projeto)

**Regra:** a IA não deve inventar arquivos binários vazios. Ela deve **baixar packs reais com licença livre** pelo `scripts/fetch-assets.mjs` e, onde não houver pronto, **gerar arquivos reais via Blender headless** (script `bpy`) que ficam salvos no repositório. Geometria gerada *no build* e salva como `.glb` é aceitável; geometria gerada *em runtime* não.

### 4.1 Fontes sugeridas (todas CC0, verificar a licença no momento do download)
- **Personagens humanos rigados + animações:** Quaternius (*Ultimate Modular Men/Women*, *Universal Animation Library*), Kenney (*Animated Characters*).
- **Props / arena / praia:** Kenney (*Sports*, *Furniture*, *City*), Quaternius (*Ultimate Nature* para palmeiras), Poly Pizza (filtrar CC0).
- **Texturas PBR (areia, madeira, metal, lona):** ambientCG, Poly Haven.
- **Céu / iluminação:** HDRI de praia/céu aberto e de pôr do sol da Poly Haven.
- **VFX em flipbook:** Kenney *Particle Pack*; complementar renderizando no Blender (fumaça de areia, chama) e exportando como spritesheet PNG.
- **UI:** Kenney *UI Pack*; ícones de botão Kenney *Input Prompts*.
- **Áudio:** Kenney (*Interface Sounds*, *Impact Sounds*), Freesound **somente CC0** (torcida, apito, batucada, ondas, gaivotas).
- **Fontes:** Google Fonts (ex.: *Bungee* para títulos, *Rubik* para textos).
- **Mixamo** só se houver conta; não depender disso.

Se um download falhar, a IA deve tentar outra fonte da lista e registrar a troca no `ASSETS.md`. **Nunca** substituir por cubos.

### 4.2 Inventário mínimo obrigatório

**Personagens (`.glb` rigados, ~3–8k tris cada):**
- 4 corpos-base de jogador (variação de porte e tom de pele), cabelos intercambiáveis (≥ 6), **descalços**, de bermuda e camisa.
- Goleiro (luvas, camisa de manga longa de cor distinta).
- Árbitro (camisa preta com detalhe laranja, apito).
- 4 dançarinas/dançarinos de comemoração (roupa de praia, coreografia própria).
- Torcida: 6–8 modelos low-poly **instanciados** (`InstancedMesh`) com 3 animações (sentado, de pé pulando, acenando bandeira).

**Animações (clipes nomeados, crossfade 0.1–0.2 s):**
`idle, idle_tired, run, sprint, strafe, pass_short, pass_lob, shot, volley, header, diving_header, bicycle_kick, scissor_kick, chest_control, juggle, sombrero_flick, slide_tackle, shoulder_charge, fall_hit, get_up, celebrate_1..4 (slide de joelho, dança, apontar pro céu, mortal), argue_ref, gk_idle, gk_dive_left, gk_dive_right, gk_catch, gk_punch, gk_throw, gk_kick, ref_whistle, ref_card, dance_1..3, crowd_cheer, crowd_sit, crowd_wave`.
Se faltar algum clipe no pack, criar no Blender por retarget/edição e exportar — **não** simular via rotação de ossos no código.

**Uniformes:** textura por time (camisa + bermuda + número + nome nas costas) em `textures/kits/<time>_home.png` e `_away.png`, aplicadas pelo `build-kits.py` ou por troca de material no runtime (troca de material é permitida; o arquivo de textura é real).

**Arena (cada uma um `.glb` próprio):**
- Campo de areia 37×28 m com linhas **azuis** (fitas), marca de pênalti, bandeirinhas de escanteio vermelhas.
- 2 gols **amarelos** com rede (malha de rede com shader de deformação quando a bola entra).
- Placas de publicidade **fictícias** ao redor (texturas próprias com ≥ 8 marcas inventadas).
- Arquibancadas em 3 lados, cabine de transmissão, bancos de reserva, cooler, guarda-sóis.
- Fundo: prédios à beira-mar / morros / mar com ondas animadas (shader de água simples sobre malha do arquivo), palmeiras, céu HDRI.

**3 arenas no lançamento (`arenas.json`):**
1. **Copacabana Sol** (Rio) — dia ensolarado, morros ao fundo, prédios.
2. **Lagoa Neon** (Florianópolis) — **noite** com holofotes, bloom, sombras longas.
3. **Dunas Douradas** (Natal) — pôr do sol alaranjado, dunas, coqueiros, vento levantando areia.

**Bola:** `.glb` com textura de bola de praia esportiva (painéis coloridos), sombra de contato (blob decal), rastro.

**VFX (flipbooks PNG + sistema de pool):**
- Poeira de areia em cada passada de sprint, carrinho, queda, quique da bola (**3 variações**).
- **Pegadas** como decals que somem em 8 s.
- Explosão de areia + estrelas no chute forte; onda de choque na bicicleta.
- Rastro da bola (normal = branco; Modo Fogo = chamas laranja/azul).
- **Aura do Modo Fogo:** brilho azul-elétrico/branco ao redor dos jogadores (como no vídeo de referência), com sprites de faísca.
- Confete + fumaça colorida na comemoração; fogos de artifício na arena noturna.
- Rede do gol tremendo; flash de câmera na torcida.

**UI (PNG/SVG):** logo do jogo, 8 emblemas de time, bandeiras, moldura do placar, marcador do jogador controlado (seta vermelha + "1P"/"2P"), indicador fora da tela, ícones de cartão amarelo/vermelho, barra de força, barra de fôlego, troféu, fundos dos menus (renders da arena).

**Áudio:**
- 4 faixas de música (menu, seleção, intervalo, vitória) — batucada/axé/surf rock instrumental, CC0 ou compostas no projeto.
- SFX: chute fraco/forte, quique na areia, trave, rede, apito (curto, longo, final), carrinho, queda, multidão (ambiente em loop + "uuh" + explosão de gol), ondas, gaivotas, UI (navegar, confirmar, voltar).
- **Locutor:** sem TTS robótico. Se não houver voz CC0, usar **gritos de torcida** + textos na tela. Nunca deixar silêncio.

---

## 5. Fluxo de telas (todas obrigatórias)

1. **Boot** — barra de progresso real do `AssetManager` (bytes carregados), logo animado.
2. **Título** — câmera passeando pela Copacabana Sol, logo grande, "Pressione START / ENTER", música.
3. **Menu Principal** — Amistoso · Copa Areia Quente (torneio) · Treino · Opções · Créditos. Fundo: render da arena desfocado + jogador em pose.
4. **Seleção de controle** — ícones de controle que o jogador arrasta entre **CASA | CPU | FORA** (1 ou 2 jogadores locais).
5. **Seleção de time** — carrossel de 8 seleções com bandeira, emblema, atributos (Ataque, Defesa, Técnica, Velocidade em estrelas), modelo 3D do capitão girando com o uniforme. Escolher uniforme casa/fora e arena.
6. **Carregamento** — "AMISTOSO — RIO", bandeiras "BRA vs ARG", jogador estrela em pose dinâmica, dica de jogo aleatória, barra de progresso.
7. **Apresentação da arena** — câmera cinematográfica: sobrevoo das arquibancadas → aquecimento individual (jogador fazendo embaixadinha com nome na tela) → time perfilado → árbitro → apito. Pulável com START.
8. **Partida** (seção 6).
9. **Intervalo** — entre períodos: dançarinas na areia, câmera da torcida, estatísticas (posse, chutes, estilo).
10. **Replay de gol** — automático após cada gol, câmera escolhida entre 3 ângulos, ícone "R" piscando, câmera lenta, motion blur, filtro levemente saturado. Pulável.
11. **Resultado** — placar final, craque da partida (modelo 3D comemorando), estatísticas, pontos de estilo.
12. **Copa (torneio)** — 8 times, chaveamento visual (quartas → semi → final), salvar progresso em `localStorage`, troféu 3D girando no fim com confete.
13. **Treino** — campo vazio com cones (asset) e desafios: 5 bicicletas, 3 chapéus, 5 gols de voleio.
14. **Opções** — volume (música/sfx/torcida), duração do período (2/3/5 min reais), dificuldade (Fácil/Normal/Craque), remapeamento de controles, qualidade gráfica (sombras, bloom, densidade da torcida).
15. **Créditos** — lista do `ASSETS.md` rolando com música.

Transições entre telas: fade preto curto ou wipe com textura de areia.

---

## 6. Regras da partida

- **5×5**, 3 períodos de 12 min de jogo (escalados para 3 min reais por padrão), relógio no HUD com número do período.
- **Sem impedimento.** Laterais podem ser cobrados com a mão ou com o pé.
- **Faltas:** carrinho por trás ou empurrão forte → falta; acúmulo → cartão amarelo (ícone ao lado do nome) → vermelho (2 min fora).
- **Tiro livre direto** (sem barreira, como no futebol de praia) com barra de força/direção.
- **Goleiro:** pode segurar a bola, lançar com a mão (lançamento longo vira o grito "LANÇAMENTO!") ou chutar.
- **Empate:** prorrogação de 3 min, depois **pênaltis** com cena própria (câmera atrás do batedor).
- **Bola na areia:** quica pouco e morre rápido — o jogo incentiva **bola no alto** (embaixadinha, chapéu, voleio).

---

## 7. Controles

| Ação | Teclado | Gamepad |
|---|---|---|
| Mover | WASD / setas | analógico esquerdo |
| Passe rasteiro / trocar jogador (defesa) | J | A / X |
| Chute (segurar = força) | K | B / ○ |
| Lençol / passe pelo alto | L | X / □ |
| Firula (chapéu, embaixadinha, levantar pra si) | I | Y / △ |
| Sprint | Shift | RT / R2 |
| Carrinho / pressão | Espaço | LT / L2 |
| Ativar Modo Fogo (medidor cheio) | E | RB / R1 |
| Pausa | Esc | Start |

**Combos contextuais (essenciais):**
- Bola no ar + Chute de costas pro gol → **BICICLETA**.
- Bola no ar + Chute de lado → **VOLEIO / TESOURA**.
- Bola no ar na altura da cabeça + Chute → **CABEÇADA**; correndo → **PEIXINHO**.
- Firula com adversário à frente → **CHAPÉU** (passa a bola por cima e recupera).
- Firula parado → **embaixadinhas** (cada toque = pontos).

---

## 8. Sistema de estilo e Medidor de Calor

- Cada ação gera pontos que **saltam na tela** em amarelo com contorno (`+5`, `+10`, `+25`, `+45`), perto do emblema do time.
- Encadear ações sem perder a bola cria **multiplicador** (`x2`, `x3`…), exibido ao lado do placar.
- Tabela base em `moves.json`: passe certo +5, embaixadinha +5/toque, chapéu +15, voleio +25, cabeçada de peixinho +25, bicicleta +45, gol +100 (× multiplicador).
- O **emblema do time no placar** é o medidor: começa **azul** e vai ficando **dourado** conforme enche (como na referência, a ave do placar muda de cor).
- **Modo Fogo** (10 s): aura azul-branca nos jogadores, +20% velocidade, chutes com rastro de fogo e explosão de areia, bloom intenso, trilha sonora com batucada acelerada.
- Popups de texto grandes no centro: **"GOL!"**, **"BICICLETA!"**, **"CHAPÉU!"**, **"LANÇAMENTO!"**, **"MODO FOGO!"** — fonte de título, animação de escala + tremida.

---

## 9. HUD (HTML/CSS sobre o 3D)

- **Topo:** placar estilizado — emblema do time da casa (medidor) | bandeira | gols (2 dígitos) | centro: número do período + relógio | gols | bandeira | emblema visitante. Moldura com asas/ondas, gradiente azul.
- **Base esquerda:** nome do jogador controlado + barra de fôlego + ícone de cartão.
- **Base direita:** nome do adversário mais próximo + barra de fôlego.
- **Sobre o jogador controlado:** seta vermelha flutuante; acima, "1P"/"2P" quando relevante.
- **Bordas da tela:** setas indicando jogadores/bola fora de quadro.
- **Barra de força** aparece sob o jogador ao segurar o chute.
- **Pausa:** menu translúcido com Continuar, Táticas (formação 1-2-1 / 2-2 / 1-1-2), Substituições, Opções, Sair.

---

## 10. Câmera

- **Padrão:** câmera de transmissão lateral, alta, acompanhando a bola com suavização e leve antecipação na direção do ataque (como TV).
- **Cinematográfica:** close no jogador ao fazer gol de bicicleta (corte de 1 s em câmera lenta) e na comemoração.
- **Replay:** 3 ângulos (atrás do gol, lateral baixa, órbita no jogador).
- **Pênalti:** atrás do batedor.
- Tremida leve no chute forte e no gol.

---

## 11. Inteligência artificial

- Máquina de estados por jogador: `ApoiarAtaque`, `Marcar`, `PressionarBola`, `Cobrir`, `VoltarPosição`, `Comemorar`.
- Time com formação dinâmica (`Formation.ts`) que se desloca conforme a bola.
- CPU **também faz firulas** e bicicletas (com probabilidade por dificuldade e pelo atributo Técnica), senão o jogo fica sem graça.
- Goleiro: posicionamento pelo ângulo da bola, mergulho com tempo de reação por dificuldade, sai do gol em bola alta.
- Dificuldade altera: tempo de reação, precisão, agressividade de marcação, frequência de firula.

---

## 12. Conteúdo (`data/*.json`)

- **8 seleções:** Brasil, Argentina, Portugal, Espanha, Itália, França, Japão, Senegal. Cada uma com **10 jogadores fictícios** (nome, apelido curto para o HUD, número, posição, 4 atributos, tom de pele, cabelo), emblema próprio, uniforme casa/fora e um "estilo" de IA (ex.: Brasil = muitas firulas; Itália = defesa).
- **3 arenas** (seção 4.2).
- **20 dicas** para a tela de carregamento.
- Todos os textos em `strings.pt-BR.json` (nada de texto fixo no código).

---

## 13. Barra de qualidade visual (checar por screenshot)

- [ ] A areia tem textura PBR com relevo, **pegadas** e poeira — não é uma cor lisa.
- [ ] Jogadores são **modelos animados** com uniforme, número e cabelo — nenhuma cápsula, cubo ou esfera.
- [ ] Arquibancadas cheias de torcida animada e colorida.
- [ ] Gols amarelos com rede; placas fictícias legíveis; céu/HDRI e fundo da cidade/mar visíveis.
- [ ] HUD idêntico à especificação da seção 9 e legível em 1280×720.
- [ ] Popups "+25", "GOL!" e multiplicador aparecem na hora certa.
- [ ] Modo Fogo mostra aura e rastro claramente.
- [ ] Arena noturna tem holofotes e bloom; arena de pôr do sol tem luz quente.
- [ ] Replay com ícone "R", câmera lenta e ângulo diferente.
- [ ] Nenhum texto em inglês esquecido, nenhum "TODO", nenhum quadro rosa/preto de textura faltando.

---

## 14. Definição de Pronto

1. `npm install && npm run dev` abre o jogo; `npm run build` gera `dist/` sem erros nem warnings de TypeScript.
2. É possível, só com teclado **e** só com gamepad: abrir o jogo → jogar um amistoso inteiro de 3 períodos → ver replay de gol → ver tela de resultado → voltar ao menu.
3. É possível vencer uma **Copa** de 8 times com o progresso salvo entre recarregamentos.
4. Treino com os 3 desafios funcionando.
5. As 3 arenas carregam e são visivelmente diferentes.
6. Todos os itens da seção 13 conferidos por **screenshots do Playwright** salvos em `docs/screenshots/` (título, menu, seleção, carregamento, intro, partida dia, partida noite, Modo Fogo, replay, intervalo, resultado, troféu).
7. `ASSETS.md` completo: todo arquivo em `public/assets` listado com origem e licença.
8. Varredura automática: `grep` no `src/` não encontra `getContext('2d')`, `BoxGeometry`, `SphereGeometry`, `CapsuleGeometry` nem `CylinderGeometry` usados para personagens, bola, gol ou estádio.
9. 60 fps estáveis em 1080p com qualidade "Média" (medir com `stats.js` e anotar no README).
10. `README.md` com como rodar, controles, estrutura e créditos.

---

## 15. Ordem de execução sugerida para a IA

1. Scaffold Vite + TS + Three + Howler; `AssetManager` com barra de progresso.
2. `fetch-assets.mjs` → baixar e organizar **todos** os packs; gerar `ASSETS.md`. Sem isso não seguir.
3. Pipeline Blender (`build-kits.py`): uniformes dos 8 times, montar a arena 1 a partir dos props e exportar `.glb`.
4. Cena da partida: arena 1, bola com física, 1 jogador controlável com todas as animações.
5. 5×5 + goleiros + árbitro + regras + relógio + HUD.
6. IA, sistema de estilo, Medidor de Calor, Modo Fogo, VFX.
7. Câmeras, replay, comemorações, intervalo com dançarinas.
8. Todas as telas de menu, seleção, carregamento, intro, resultado.
9. Arenas 2 e 3, Copa, Treino, Opções, Créditos.
10. Áudio completo e mixagem.
11. Polimento, performance, screenshots, checklist das seções 13 e 14.

**Não pule etapas, não entregue parcial, não substitua assets por formas geométricas. Se algo for impossível, documente no README o motivo e a solução alternativa aplicada.**
