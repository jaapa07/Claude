# Relatório de QA final

Rodada sistemática sobre a versão com as 5 regiões e o ritmo de nível novo (faixas Floresta 1–5, Minas 5–9, Pântano 9–13,
Fortaleza 14–17, Catedral 18–22; técnicas do herói nos níveis 2/3/4/5).

Gravidade: **alta** (trava, teste instável, perde progresso), **média** (informação errada, ilegível ou escondida),
**baixa** (acabamento, ruído de log). Status: corrigido / pendente / ok.

Ferramentas novas:
- `-- --e2e --qa [--so-menus|--so-mapas]` (`tests/e2e_bot.gd`): abre cada menu no teclado **e no toque** e mede título e linhas cortadas,
  painel lateral vazio e marcador `{tecla}` sem troca; varre todos os textos dos dados (teclado e toque); checa estados presos
  (fechar fala com a tecla de interagir, caminhada por toque interrompida); percorre os 45 mapas com todas as condições abertas
  (spawns em parede ou dentro de saída, saída sem destino, entidades e saídas inalcançáveis — a busca segue fissuras do Passo
  Umbral, pares de portais e as plataformas de luz/sombra do eclipse). Com xvfb + `--rendering-driver opengl3` tira foto de cada
  menu, de cada mapa e uma visão geral do mapa inteiro (`$SHOTS_DIR`, padrão `/tmp/shots/qa_*.png`).
- `QA_TRACE=1` imprime, a cada verificação, quadro, estado do RNG de jogo, posição, vida e mapa; `QA_TRACE=2` imprime todo quadro
  (posições e vida de inimigos e companheiro). Comparar duas execuções com `diff` mostra o quadro exato em que divergiram.

## 1. Estabilidade dos testes (prioridade)

| Onde | O que | Gravidade | Status |
|---|---|---|---|
| `scripts/audio.gd` (`play`) | O tom aleatório de cada som usava o RNG **global**, mas só era sorteado se houvesse um canal livre — e um canal fica livre quando o som termina, no **relógio real** da thread de áudio. A quantidade de sorteios mudava de uma execução para outra e desviava todo o resto (passeio dos inimigos, flanqueio, quedas): é a causa das falhas em pontos diferentes (captura do Cascalito, fragmentos do chefão da R3, "combate vencido só pelo herói", Bruxa Afogada, Umbrel perdido na R4). Rastro mostrou a divergência já no quadro 2975 (Clareira). | alta | corrigido (`Game.fx_rng` separado só para aparência) |
| `scripts/player.gd` (corrida), `scripts/enemy_fortaleza.gd` (contra-ataque da armadura) | Janelas de tempo medidas com `Time.get_ticks_msec()` (relógio real): no teste sem limite de velocidade o resultado dependia da carga da máquina | alta | corrigido (`Game.clock_ms()`, contado em quadros de física) |
| `scripts/world.gd` (tremor de câmera, vapor, respingos), `scripts/fx.gd` | Efeitos visuais sorteavam no RNG global | baixa | corrigido (`Game.fx_rng`) |
| `scripts/boss_bruxa.gd` | Brilho do reflexo pelo relógio real | baixa | corrigido |
| `tests/e2e_bot.gd` | Saves/slots de execuções anteriores (4–9) ficavam no `user://` e podiam mudar o título e o fluxo | média | corrigido (bot apaga os slots 0–9 ao iniciar; `fx_rng` também semeado) |
| Resultado | `--e2e` 3 rodadas seguidas **idênticas** (mesmo rastro quadro a quadro) e verdes, 465/465; `--regiao4` 3 rodadas idênticas, 136/136 | — | ok |

## 2. Logs (todos os modos)

| Onde | O que | Gravidade | Status |
|---|---|---|---|
| `scripts/seal.gd` | `ERROR: Resource file not found: res://assets/sprites/seal.png` a cada selo lançado — o selo voava **invisível** | média | corrigido (1º quadro de `fx_seal.png`) |
| `scripts/companion.gd` (disparo à distância) | `Lambda capture at index 0 was freed` quando o alvo sumia com o disparo no ar | baixa | corrigido (referência fraca) |
| `scripts/save_system.gd` | Save corrompido imprimia `ERROR: Parse JSON failed` (caso esperado, o backup é usado) | baixa | corrigido (leitura sem erro do motor) |
| `tests/e2e_bot.gd` | ~100 `WARNING: sem caminho` do próprio bot nas lutas (pontos sobre água) | baixa | corrigido (vira `[info]`) |
| Saída dos testes | `ObjectDB instances leaked` / `N resources still in use` (sons tocando e temporizadores ao sair) | baixa | corrigido (bot para os sons e espera antes de sair) |
| Saída de alguns modos (`--e2e`, `--habilidades`, às vezes) | Ainda aparece 1 vazamento do script `ui.gd` ao encerrar o processo | baixa | pendente (só na saída; não afeta o jogo) |
| Erro de script do bot em `r4_step` com inimigo liberado | Não reproduziu nesta versão (3 rodadas de `--regiao4` sem nenhum ERROR/WARNING) | — | ok |

## 3. Interface (480x270 e toque)

| Onde | O que | Gravidade | Status |
|---|---|---|---|
| `Game.k` (marcadores `{atacar}`, `{interagir}`…) | Mostravam sempre a tecla padrão, mesmo depois de remapear nas Opções | média | corrigido (`Game.key_label` lê o remapeamento) |
| `data/dialogs.json` (18 falas), `data/items.json` (2), `scripts/game.gd`, `hud.gd`, `ui.gd`, `world.gd`, `hero_powers.gd`, tela de título | Teclas escritas à mão: "(E)", "(Q)", "Aperte E", "Tecla R", "Tecla C", "(I)", "Q pronto", "tecla F", "Espaço → J", "K + Q", "menu I" — erradas no toque e após remapear | média | corrigido (marcadores / tecla atual) |
| Avisos (`hud.add_toast`) | Aviso longo quebrava numa largura maior que o painel: texto saindo pela direita ("…atalhos em Inventá") | média | corrigido (quebra própria pela largura da fonte monoespaçada) |
| `MenuScreen` (todas as listas) | Linha cortada com "…" não tinha como ser lida (valores das Opções no toque, nomes longos no Inventário, Jornada) | média | corrigido (a linha selecionada cortada aparece inteira no topo do painel lateral) |
| Mapa | Região "(jogavel)" sem acento; bloqueios de 30–90 letras cortados na linha; "inscrição oculta — Olhar Velado" continuava listada depois de ganhar o Olhar Velado | média | corrigido (linha mostra ⚠; o painel lista cada bloqueio) |
| Títulos (Montar, Forja, Contratos, Bestiário, Mapa) | Cortados com "…" | baixa | corrigido (títulos curtos; contagem do bestiário no painel) |
| Pausa, Santuário, Inventário, lojas | "Reiniciar enigmas da sala", "Reespecializar talentos (50)", "Reespecializar (50 fragmentos)", "Vida … Ataque … Redução …", "Néctar de Vínculo  — 30" cortados | baixa | corrigido (rótulos curtos, ordem dos itens mantida; detalhe no painel) |
| Faixa com o nome do mapa | Cobria a linha "Modo: Preservar (C)" | baixa | corrigido (desce 6 px) |
| Opções, Jornada, Inventário no toque (lista mais estreita por causa das setas) | Algumas linhas ainda saem cortadas na lista | baixa | pendente (mitigado: o texto inteiro aparece no painel ao selecionar) |
| Fonte Press Start 2P | Maiúsculas acentuadas (Ú) desenhadas como minúsculas ("última página") | baixa | pendente (limite da fonte) |
| Retratos, molduras, barra de chefe, clima | Conferidos nas fotos do `--qa` e do `--interface` | — | ok |

## 4. Mapas (45)

| Onde | O que | Gravidade | Status |
|---|---|---|---|
| `catedral_c` (`from_vitoria`) | Spawn dentro da parede (29,26); o corredor é 27–28 | baixa | corrigido (mapa e `tools/gen_regiao5.py`) |
| `jardins_suspensos` | Hélice da ilha sobre o abismo | — | ok (feita para a Rajada de longe) |
| Todos | Nenhum spawn em parede/dentro de saída, toda saída com mapa e spawn de destino, todas as entidades e saídas alcançáveis (seguindo fissuras, portais e eclipse) | — | ok |

## 5. Textos e história

| Onde | O que | Gravidade | Status |
|---|---|---|---|
| `README.md` | Fortaleza "Níveis 19–24" e Catedral "Níveis 25–30" (ritmo antigo); Lumipim do anel "Nv. 8" (é 5) | média | corrigido (14–17, 18–22, Nv. 5) |
| `docs/KNOWN_ISSUES.md` | Lumipim do anel "Nv. 8" | baixa | corrigido |
| `web/jogar.html` | Técnicas do herói nos níveis 2/4/6/8 | média | corrigido (2/3/4/5) |
| Contratos, regiões, chefes | Níveis dentro das faixas novas | — | ok |
| Termos (Mestra Ione, Anciã Maru, Rei dos Ecos, Ordem do Vazio, Arauto, Ecos, fragmentos) e amnésia/artefatos | Sem variantes nem contradição com `docs/HISTORIA.md` | — | ok |

## 6. Jogabilidade

| Onde | O que | Gravidade | Status |
|---|---|---|---|
| `scripts/player.gd` + `ui.gd` | Fechar a fala com a tecla de **interagir** (E, ou o botão E no toque) reabria a mesma conversa no quadro seguinte: com a Maru, um laço sem fim | alta | corrigido (`ui.input_guarded()`: a tecla que fecha fala/menu não vira comando do herói) |
| `scripts/player.gd` (toque num objeto) | A caminhada automática continuava depois de uma fala, menu, golpe ou esquiva: o herói "andava sozinho" | média | corrigido |
| `scripts/world.gd` (morte) | Morte com uma fala aberta (golpe final junto com a queda do chefe) levava ao santuário antes da fala fechar | baixa | corrigido (o retorno espera a fala) |
| Recompensas (baús, contratos, ritos, chefes) | Idempotentes (flags) | — | ok |
| Save | Guarda equipe, santuário, aliados/contrato, acessórios e habilidades (no indivíduo), clima, flags de jornada/memórias/artefatos; opções em arquivo próprio | — | ok |

## 7. Celular (Playwright, Chromium, iPhone 13 deitado)

| Onde | O que | Gravidade | Status |
|---|---|---|---|
| `scripts/main.gd` (escala) | Com escala inteira o jogo ficava em 480x270 pontos numa tela de 750x342: faixas pretas largas dos lados e em cima/embaixo | média | corrigido (no navegador com toque a escala é fracionária e o jogo ocupa a altura toda) |
| Fluxo | Título → Novo jogo pelas setas ▲▼ e OK, slot, falas só com OK, legenda dos botões, analógico (anda nos dois eixos), tocar na Maru (o herói vai até ela e conversa), pausa → setas → Inventário → Voltar, andar depois do menu | — | ok |
| Botão OK das falas | Fica sobre a Espada: toques a mais depois da última fala viram ataques (o herói avança alguns passos) | baixa | pendente (escolha de layout) |

## Resumo
29 achados: 24 corrigidos, 4 pendentes (baixa), 1 ok/informativo.

Bateria final (um teste por vez, depois do merge de `claude/clever-brown-jt3sky`): `--e2e` 3x 465/465 (idênticas), `--unit` 68/68,
`--regiao5` 112/112, `--regiao4` 3x 136/136 (idênticas), `--historia` 50/50, `--floresta` 67/67, `--grupo` 34/34,
`--habilidades` 31/31, `--powers` 12/12, `--interface` 20/20, `--casas` 15/15, `--clima` 38/38, `--musica` 32/32, `--equip` 12/12,
`--qa` 3/3 (0 achados objetivos).
