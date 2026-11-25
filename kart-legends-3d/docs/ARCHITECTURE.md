# Arquitetura — KART LEGENDS 3D

## Visão geral

```
Interface (React/DOM)            Cena 3D (React Three Fiber)              Simulação (TypeScript puro + Rapier)
src/components/ui, hud   ←─────  src/scenes/GameCanvas                    src/game/racing/raceSim.ts
        │  lê/escreve                   │ lê o fluxo, nunca o conduz              ▲  passo fixo de 1/60 s
        ▼                               ▼                                         │
src/app/gameStore.ts (fluxo)     RaceScene: acumulador de tempo ────────── sim.step() ── eventos ──► áudio + VFX
src/app/settingsStore.ts         interpola e desenha                      sim.hud() ──► src/game/core/hudStore
src/game/save (progresso)                                                 sim.result() ──► gameStore.finishRace
```

Três camadas com responsabilidades separadas:

1. **Simulação** (`src/game/**`, sem React e sem DOM). `RaceSim` recebe o módulo Rapier, um `World`, os dados da
   pista e a configuração da corrida. Avança em passo fixo (`PHYS.dt = 1/60 s`), é determinística para uma mesma
   semente e é exatamente a mesma classe usada no jogo e nos testes sem navegador.
2. **Cena** (`src/scenes/**`). O `GameCanvas` é um único `<Canvas>` em tela cheia que mostra a vitrine dos menus,
   a corrida ou o pódio conforme o store de fluxo. A `RaceScene` cria o mundo com `<Physics paused>` de
   `@react-three/rapier`, roda o acumulador de tempo, interpola as posições entre dois passos e traduz os eventos
   da simulação em som e partículas.
3. **Interface** (`src/components/**`, `src/app/**`). Telas e HUD em React/CSS. O HUD lê um snapshot publicado
   ~15 vezes por segundo; os menus conduzem o fluxo pelo `gameStore`.

## Pastas

| Pasta | Conteúdo |
|---|---|
| `src/data/` | Dados declarativos: pilotos, karts (atributos), pistas, copas, itens, regras de desbloqueio |
| `src/game/core/` | Tipos compartilhados, RNG determinístico, ponte do HUD, resolução de caminhos de assets |
| `src/game/physics/` | Colisores estáticos da pista (leito, terreno, muros, rampas, cenário) e grupos de colisão |
| `src/game/vehicles/` | Atributos → parâmetros físicos, estado do kart, física arcade, modelo visual do kart |
| `src/game/racing/` | `RaceSim`, progresso/checkpoints/voltas/classificação, obstáculos móveis, eventos |
| `src/game/ai/` | Piloto de IA e perfis de dificuldade |
| `src/game/items/` | Caixas, sorteio por posição, os oito itens, perigos, projéteis, raios em cadeia e o piloto automático do Cometa Guia |
| `src/game/tracks/` | Tipos dos dados de pista, consultas em tempo de execução, ambientes (céu/luz/clima) |
| `src/game/characters/` | Máquina de estados de animação e expressões faciais |
| `src/game/camera/` | Câmera de perseguição, apresentação, largada e chegada |
| `src/game/vfx/` | Sistema de partículas em pool e efeitos da corrida |
| `src/game/audio/` | Gerenciador de áudio (Web Audio) e motor sintetizado |
| `src/game/input/` | Teclado, Gamepad API, remapeamento, sensibilidade |
| `src/game/save/` | Progresso versionado em localStorage, migração e recuperação |
| `src/scenes/` | Canvas, cena de corrida, vitrine, pódio, céu e luzes, perfis de qualidade |
| `src/shaders/` | GLSL: céu (degradê, sol, estrelas, nuvens, aurora) e riscos de velocidade |
| `src/tests/` | Testes de simulação (Vitest) |
| `scripts/` | Autoria e exportação de assets, validação, ferramentas de medição |
| `e2e/` | Testes de ponta a ponta (Playwright) |

## Física do kart

Corpo rígido dinâmico do Rapier (esfera, rotação travada, gravidade própria). A cada passo fixo:
um raio para baixo lê o chão e a normal; a velocidade é decomposta em frente/lateral sobre o plano do chão;
aplicam-se aceleração progressiva, arrasto, frenagem/ré, limite de velocidade por superfície, aderência lateral
(amortecimento exponencial, muito menor no gelo e durante o drift) e a correção de altura (suspensão). O Rapier
resolve as colisões com muros, cenário, obstáculos e outros karts; depois do passo, a velocidade resolvida é
lida de volta, o que faz os impactos custarem velocidade de verdade. No ar valem gravidade e um leve controle.

**Drift:** Espaço + direção acima de ~42% da velocidade máxima trava o lado da curva; o kart gira a uma taxa
própria (apertável/abrível com a direção), a aderência cai e ele é empurrado para fora. A carga acumula mais
rápido esterçando para dentro e pela eficiência de drift do kart; passa pelos níveis 1, 2 e 3 e, ao soltar,
vira um miniturbo de duração crescente. Colisão forte, queda de velocidade ou muito tempo no ar cancelam.

## Corrida, checkpoints e classificação

A posição ao longo da pista é uma busca **incremental** numa janela ao redor do índice anterior (por isso
viadutos e cortes pelo miolo não confundem o progresso). Há 12 checkpoints por volta; uma volta só conta se
todos forem cruzados em ordem, para a frente e perto da pista. A classificação usa volta, último checkpoint
validado e avanço desde ele (limitado ao próximo checkpoint), nunca a distância até a chegada. Atalhos são
caminhos próprios com mapeamento para o progresso da pista principal.

## Tela dividida (2 jogadores)

`RacerSetup.slot` marca os humanos (0 = Jogador 1, 1 = Jogador 2). `RaceSim`/`BattleSim` expõem `players`
(`player` continua sendo o Jogador 1), leem `playerInput(slot)`, guardam alertas por jogador e publicam
`hud(slot)`; `result().players` traz a colocação e as estatísticas de cada um. A entrada tem um leitor por
jogador (`inputManager.readPlayer(slot)`, teclas fixas `TWO_PLAYER_KEYS`, gamepads por `assignPads`); `read()`
segue sendo o caminho de 1 jogador (remapeamento e toque). Na cena, cada humano tem uma `ChaseCamera`;
`SplitRenderer` (`src/scenes/split.tsx`) desenha as duas metades com scissor e `splitQuality` limita a qualidade.
O HUD usa `HudSlotContext` para ler `hud`/`hud2` dos stores.

## IA

Os adversários produzem os **mesmos comandos** que o jogador (acelerador, freio, direção, drift, item) e passam
pela mesma física. Seguem a linha de corrida e as velocidades-alvo gravadas nos dados da pista, antecipam
frenagens, derrapam em curvas que comportam, ultrapassam pelo lado livre, desviam de obstáculos móveis e névoas
prevendo onde estarão, decidem atalhos e usam itens conforme a situação. A dificuldade muda só a pilotagem
(ritmo, precisão, reação, uso de drift e atalhos): não há teletransporte, elástico nem velocidade extra.

## Assets e pistas

Tudo o que é desenhado vem de arquivos GLB/WebP/OGG em `public/assets`, gerados por `scripts/` e registrados em
`public/assets/manifest.json`. Uma pista é um traçado autorado à mão (`scripts/tracks/defs`) transformado em:
malha GLB em setores (pista, zebras, muros, pontes, terreno, cenário fundido por material) e um JSON de corrida
(amostras do traçado, checkpoints, grid, linha de corrida, atalhos, itens, placas, rampas, obstáculos, terreno,
colisores de cenário, câmeras de apresentação, minimapa).

## Otimização e memória

- Malha das pistas em setores e o terreno em ladrilhos → frustum culling por parte.
- Cenário estático fundido por material dentro de cada setor (poucas chamadas de desenho); geometria com
  quantização e compressão meshopt; texturas WebP.
- Partículas em dois sistemas com pool fixo (sem alocação por quadro); HUD atualizado a 15 Hz.
- Karts distantes não são animados; efeitos só perto da câmera.
- Perfis Baixa/Média/Alta controlam resolução, sombras, densidade de partículas/clima e pós-processamento.
- Ao sair de uma corrida, modelos, mixers, materiais próprios, partículas e sons são liberados; o mundo físico
  é destruído com o componente `<Physics>`.
