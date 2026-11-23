# Contrato da Região 2 — Minas da Brasa (arte ↔ conteúdo)

Este arquivo define os nomes e tamanhos que a arte e o código da Região 2 usam. Quem desenha produz exatamente estes arquivos; quem programa usa exatamente estes nomes.

## Regras gerais de arte (valem para tudo)
- Pixel art **autoral, desenhada pixel a pixel** em arquivos `.pxl` (formato em `tools/pixc.py`, exemplos em `assets/src/*.pxl`). Nada de formas geradas por código, nada de assets de terceiros.
- Compilar com `python3 tools/pixc.py` (gera `assets/sprites/*.png`).
- Contorno `#1b1626`, luz vinda de cima/esquerda, paleta da região: **cobre, carvão, laranja de brasa** (ex.: `#c0703a`, `#8a4a24`, `#2a2230`, `#3a3448`, `#ff9a40`, `#ffd060`, `#e85030`), com azul-aço frio para válvulas/áreas resfriadas (`#5aa8e8`, `#bfe9ff`).
- Criaturas, inimigos e chefes ficam **voltados para a direita**. Folhas de **9 colunas** numa linha: `idle0 idle1 walk0 walk1 walk2 walk3 windup attack hurt`.
- Moradores usam a folha do herói com paletas (veja `10_heroi.pxl`, seção "moradores"): 7 colunas `idle frente(2) esquerda(2) direita(2) costas(1)`, 24x32.

## Arquivos de arte (sprites)

| Arquivo PNG | Quadro (LxA) | Conteúdo |
|---|---|---|
| `faisquito.png` | 20x20 | Faisquito (brasa, dano) |
| `brasejante.png` | 28x28 | evolução |
| `ferrunho.png` | 20x20 | Ferrunho (pedra/metal, proteção) |
| `ferragor.png` | 28x28 | evolução |
| `fuligin.png` | 20x20 | Fuligin (sombra/fumaça, evasão) |
| `cinzaveu.png` | 28x28 | evolução |
| `mineiro.png` | 24x32 | Mineiro corrompido (arremessa ferramentas) |
| `lesma_escoria.png` | 24x16 | Lesma de escória (lenta, deixa rastro quente) |
| `automato.png` | 32x34 | Autômato de martelo (golpe anunciado, pesado) |
| `vigia.png` | 48x48 | Vigia de Escória (minichefe) |
| `ferreiro.png` | 72x72 | Ferreiro Devorador (chefão) — `hurt` pode ser a pose de armadura superaquecida |
| `npc_forja1.png`, `npc_forja2.png`, `npc_forja3.png` | 24x32 | Moradores da Forja de Cobre (paletas do herói) |
| `ferramenta.png` | 2 quadros 12x12 | projétil: picareta girando |
| `minas_props.png` | 16x16 cada, 1 linha | ordem: `valve_closed valve_open furnace_off furnace_on cart lever_rail_a lever_rail_b ore_chunk anvil steam0 steam1 cracked_rock_debris` |
| `icons_minas.png` | 16x16 cada | ordem: `minerio_cobre brasa_viva lingote placa_cobre` |
| `fx_fire.png` | 4 quadros 16x16 | chamas (fornalha acesa, cone de fogo do Faisquito) |
| `fx_quake.png` | 3 quadros 48x16 | onda de choque do martelo no chão |

## Tileset da região: `tiles_minas.png` (16x16, 16 colunas; a ordem abaixo é o índice)
```
0 mfloor0        1 mfloor1        2 mwall_front    3 mwall_top      4 rail_h         5 rail_v
6 lava0          7 lava1          8 hot_floor      9 cool_floor     10 support       11 qfloor
12 qwall_front   13 qwall_top     14 brick_front   15 brick_top     16 forge_floor   17 metal_door
18 metal_open    19 cracked       20 ore_rock      21 coal          22 grate         23 stairs
24 mfloor_edge_n 25 copper_roof_l 26 copper_roof_m 27 copper_roof_r 28 forge_wall    29 forge_window
30 forge_door    31 chimney
```
`lava0/lava1` formam animação de 2 quadros (como `water0/water1`).

## Caracteres de mapa novos (Região 2)
| Char | Significado | Sólido | Tile |
|---|---|---|---|
| `m` | piso de mina | não | mfloor0/1 (variação) |
| `M` | parede de mina | sim | mwall_top se abaixo é `M`, senão mwall_front |
| `L` | lava | sim | lava0 (animada) |
| `Q` | piso quente (fere sem resfriar) | não | hot_floor |
| `q` | piso resfriado | não | cool_floor |
| `=` | trilho horizontal | não | rail_h |
| `|` | trilho vertical | não | rail_v |
| `u` | escora de madeira | sim | support |
| `j` | piso de ruína da pedreira | não | qfloor |
| `J` | parede de ruína da pedreira | sim | qwall_top/qwall_front |
| `Z` | parede de tijolo da fundição | sim | brick_top/brick_front |
| `z` | piso da forja/fundição | não | forge_floor |
| `X` | rocha fissurada (quebra com Ruptura Ígnea) | sim | cracked |
| `O` | rocha de minério | sim | ore_rock |
| `%` | grade sobre fosso | não | grate |
| `<` | escada | não | stairs |
| `A` | telhado de cobre (casas da Forja) | sim | copper_roof_l/m/r |
| `a` | parede de casa da Forja | sim | forge_wall/forge_window/forge_door |
Portas de metal: entidade `door` com `closed_char: "I"`; `I` = metal_door (sólido), aberta vira `z`.

## Divisão de trabalho
- **Arte**: só cria `assets/src/70_minas.pxl` (pode dividir em `71_..`, `72_..`) e os PNGs compilados. Não edita código, dados nem mapas.
- **Conteúdo**: código (`scripts/`), dados (`data/`), mapas (`tools/gen_maps.py` → `data/maps/`), testes (`tests/`). Não edita `assets/src/`. Enquanto um sprite não existir, pode usar temporariamente uma folha existente com o mesmo tamanho (anotar em `docs/KNOWN_ISSUES.md`), trocando pelo nome do contrato no final.
