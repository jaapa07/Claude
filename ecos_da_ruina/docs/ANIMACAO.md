# Animação e efeitos — passe de polimento

Objetivo: dar vida a tudo o que aparece na tela sem mudar jogabilidade, números de dano/vida nem a ordem dos menus.
Regra mantida: **nenhuma forma é desenhada por código**. Toda arte nova é pixel art feita à mão em `.pxl`
(`assets/src/92_animacao.pxl`, mais quadros extras em `50_tiles.pxl` e `82_fortaleza.pxl`). O código só move, escala,
tinge e espalha esses sprites (tween, shader de cor e `CPUParticles2D`).

## Antes → depois

| Área | Antes | Depois |
|---|---|---|
| **Clarão de dano** (todos: herói, criatura parceira, aliados, feras, inimigos, chefes) | `modulate` rosado (2.0, 1.6, 1.6) | Silhueta **branca pura** por shader (`scripts/juice.gd`), esmaecendo em ~0,1 s; invulnerabilidade pisca na transparência em vez de ficar rosada. |
| **Impacto do golpe** | `fx_hit` genérico | Estrela de impacto `fx_impacto.png` (5 quadros) **tingida pela afinidade** do atacante (água, brasa, flora, luz, pedra, sombra, vento; espada = branco quente), maior em golpes fortes, mais **lascas** (`fx_lasca.png`) voando na direção do golpe. Golpe no herói usa tom avermelhado. |
| **Corpo das criaturas e inimigos** | Quadros fixos da folha (9 colunas) | Animação procedural por cima dos quadros, lida da animação em curso: **respiração de exatamente 1 pixel** no idle (fase própria por indivíduo, sem sincronia), passada de 1 px no walk, **antecipação** no windup (agacha, treme 1 px e o corpo **acende em laranja pulsante** — telegrafia mais legível), **ataque** que estica e avança 3 px na direção do golpe, **dano** que achata (squash) e recua com mola elástica. |
| **Morte de inimigos** | Achatava e sumia em 0,5 s | Clarão branco → **desintegração em pontilhado** (matriz 4x4 desenhada à mão, `fx_bayer.png`) tingindo-se de ciano → **fragmentos de Eco** (`fx_fragmento.png`, 4 quadros girando) subindo. Mesmo tempo de 0,5 s (os testes e a lógica não mudam). Chefes soltam ~3x mais fragmentos; o Rei se desfaz durante a subida de 1,6 s. |
| **Chefes — fases** | Rugido + tremor | Além disso: clarão, deformação, pulso de luz e **anel de fragmentos** na cor da afinidade, disparado automaticamente quando a variável `phase` do chefe aumenta (Cervo, Ferreiro, Bruxa, Cavaleiro, Rei, Arauto). |
| **Herói** | Quadros desenhados (idle com respiração/piscar, walk 6, ataque 3, rolagem 4) | Mantidos, com: **poeira de passo** (`fx_passo.png`) nos quadros de contato do pé (alternando o lado; tingida de verde na grama) e **ondinha** (`fx_ondinha.png`) na água rasa/poças; impulso de estica-e-achata no golpe ativo, no início e na **aterrissagem da rolagem**; recuo com achatamento no dano. Espada (`_update_sword`) inalterada — o sprite do corpo só se desloca 1–2 px. |
| **Captura** | Criatura encolhia | Clarão + **anel de selo** (`fx_selo_anel.png`, 3 quadros) apertando em volta da criatura enquanto ela encolhe. |
| **Cura** (tônico) | Só o número | Cruzes verdes subindo (`fx_cura.png`) + clarão verde no corpo. |
| **Subida de nível** (herói e criatura ativa) | Nada no mundo | Divisas douradas subindo (`fx_nivel.png`), pulso dourado, clarão e pulinho. |
| **Evolução** | Faísca ao trocar o sprite | Clarão branco longo, dois pulsos de luz e rajada de fragmentos ao redor da forma nova. |
| **Transição de mapa** (e descanso no santuário) | Fade preto liso | **Cortina em pontilhado** (blocos de 2x2 px seguindo a matriz `fx_bayer.png`) varrendo a tela na diagonal, na cor do fundo do jogo. `fade_a` continua com o mesmo significado. |
| **Letreiro da região** | Aparecia e esmaecia | Desce com um leve quique ao entrar e sobe ao sair. |
| **Flores** (Floresta) | Estáticas | Tiles `flowers0` e `bloom0` **balançam ao vento** (base → direita → base → esquerda), quadros extras desenhados à mão; cada célula começa num instante sorteado pelo próprio TileSet (`RANDOM_START_TIMES`), então o campo não balança em uníssono. |
| **Estandartes** (Fortaleza) | Estáticos | Tile `f_banner` com **ondulação descendo pelo pano** (3 quadros). |
| **Ambiente por região** | Só o clima | Poucas partículas leves por mapa (`scripts/ambient.gd`): **folhas secas caindo** na Floresta, **brasas** subindo nas Minas, **vagalumes** piscando no Pântano, **poeira dourada** na Fortaleza, **partículas do vazio** na Catedral, poeira no ar dos interiores e **brilhos na água** em qualquer mapa com água (pontos de emissão nas próprias células de água). As partículas ficam no mundo (não grudam na tela ao andar). |
| **Moradores** | Viravam para o herói por perto | Mantido, com respiração de 1 px nos moradores de folha simples e um **sobressalto de atenção** ao serem chamados para conversar. |
| Tochas, braseiros, água, lava | Já animados (`fx_fire`, tiles de 2 quadros) | Mantidos; a água ganhou os brilhos acima. |

## Peças

- `scripts/juice.gd` (`Juice`): nó filho que anima o sprite de uma entidade lendo `animation`, `flash`, `phase`,
  `attack_dir`/`aim_dir` do dono — sem acoplamento com a IA. Shader único (clarão, brilho de antecipação,
  desintegração). Ligado em `enemy.gd` (todos os inimigos, criaturas selvagens e chefes herdam), `companion.gd`,
  `ally.gd`, `ally_beast.gd`, `player.gd` (sem respiração procedural: o herói já respira nos quadros) e moradores.
  A fase de respiração vem do id da instância (não consome o gerador aleatório global).
- `scripts/ambient.gd` (`Ambient`): emissores por região, recriados a cada `load_map`.
- `scripts/world.gd`: `impact()`, `burst()`, `step_fx()`, `heal_fx()`, `levelup_fx()`, `evolve_fx()`,
  `_sway_tiles()`; `deco_ok()` desliga as partículas decorativas nos testes automáticos (elas sorteiam números e
  mudariam a sequência com semente fixa dos testes) — a vitrine `--anim` liga de volta.
- `scripts/hud.gd`: shader da cortina em pontilhado e movimento do letreiro.
- Animações de tile com quadros na **mesma coluna, linhas abaixo** (`animation_columns = 1`, separação em células),
  para não mexer na ordem/índice de nenhum tile existente.

## Desempenho (iPhone)

Sem `_draw`, sem shaders de tela cheia além da cortina (só durante a transição). Partículas: 6–16 no ar por mapa,
até 40 brilhos de água, rajadas de 6–34 partículas de vida curta. Tudo `CPUParticles2D` (compatível com
`gl_compatibility`/web).

## Vitrine para conferir

`xvfb-run -a -s "-screen 0 1280x720x24" godot --rendering-driver opengl3 --fixed-fps 60 --path . -- --e2e --anim [--anim=hero|enemy|fx|amb|trans]`
grava sequências em `/tmp/anim_shots` (recortes em volta do herói/inimigo) para montar tiras e conferir quadro a quadro.
Exemplos: `docs/screenshots/anim_golpe_desintegracao.png`, `anim_impacto_afinidades.png`, `anim_transicao_pontilhado.png`.

## Não feito neste passe (ideias seguintes)

- Quadros desenhados novos para o herói (capa/cabelo balançando na caminhada) e para as ~40 criaturas (piscar);
  o `Juice` cobre a respiração/peso, mas piscar exige um quadro por espécie. `Art.creature_frames` pode ganhar
  colunas opcionais (detectadas pela largura da folha) quando esses quadros existirem.
