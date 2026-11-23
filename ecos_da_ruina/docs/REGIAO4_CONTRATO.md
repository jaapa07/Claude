# Contrato da Região 4 — Fortaleza do Eclipse

Níveis 19–24 • núcleo **Refúgio da Muralha** • guardião **Cavaleiro Sem Rosto** • Eco **Passo Umbral** • paleta violeta, dourado e pedra azulada.
Este arquivo lista os nomes que a arte, os dados e o código da Região 4 usam, e **o ponto exato onde a Região 3 liga a sua saída**.

## Ligação com a Região 3 (Pântano dos Sussurros) — fazer no merge
A entrada da região é o mapa de transição **`ponte_espiritual`** (gerado por `tools/gen_regiao4.py`).

1. **Saída da Região 3 → Região 4.** No mapa da Região 3 de onde se sobe às montanhas (sugestão: **Porto das Lanternas**, borda norte/leste; ou o **Desfiladeiro do Eco**), acrescente:
   ```python
   m.ent(type="exit", x=..., y=..., w=..., h=..., to="ponte_espiritual", spawn="from_pantano")
   ```
   O spawn `from_pantano` fica em (2, 12), no platô oeste, ao lado do santuário `ponte`.
2. **Volta Região 4 → Região 3.** Em `tools/gen_regiao4.py`, função `ponte()`, a passagem oeste `(0, 11..13)` já está aberta no desenho; falta só a saída:
   ```python
   m.ent(type="exit", x=0, y=11, w=1, h=3, to="<mapa da Região 3>", spawn="<spawn da Região 3>")
   ```
   (Não foi criada aqui porque `Data.validate()` recusa saídas para mapas inexistentes.)
3. **O Olhar Velado.** A ponte (`ξ`) aparece pelo condicional `{"eco": "olhar_velado", "rects": [[13, 11, 14, 2, "ξ"]]}`: basta `Game.grant_eco("olhar_velado")` (ou a flag `eco_olhar_velado`). `world.gd` aceita a chave `"eco"` nos condicionais e redesenha os tiles quando um Eco é concedido (`Game.eco_changed`).
   - A Região 3 deve cadastrar a habilidade `olhar_velado` em `data/skills.json` (o teste `--regiao4` usa um placeholder só em `Game.ecos`, fora das teclas de Eco).
   - O teste monta o estado de fim do capítulo 3 com as flags `eco_olhar_velado`, `bruxa_morta` e `fim_cap3`; se a Região 3 usar outros nomes, troque-os em `r4_setup()` (`tests/e2e_bot.gd`).
4. **Missão principal.** `principal4` fica ativa com `visitou_ponte_espiritual`. `Game.objective_text()` agora percorre qualquer `principalN` (N ≥ 3) ativa e incompleta, então `principal3` da Região 3 aparece antes sem mudar código.
5. **Conflitos esperados no merge (triviais):** finais de `data/dialogs.json`, `items.json`, `skills.json`, `quests.json`, `contracts.json`, `bosses.json`, `enemies.json` (chaves novas acrescentadas no fim); `data/species.json` (blocos `umbrel/ventisco/brasardo` + evoluções inseridas depois de `brasardo`); `TRILHAS` em `tools/gen_audio.py`; dicionário `chefes`/`variantes` em `data/music.json`; zonas/mapas em `data/weather.json`.

## Regras para não colidir na arte
- Nomes de quadro (`frame`) são **globais** entre todos os `.pxl`. A Região 4 usa os prefixos `f_ fp_ fi_ fo_ ub_ uf_ vt_ vd_ bs_ sl_ ln_ aq_ am_ gm_ cs_` e as paletas `fort fortsombra fortobj fcria finim fboss fboss_b muralha_*`.
- Fonte do TileSet: **4** (`Fortaleza.SOURCE_ID`). A fonte 3 fica livre para o Pântano.

## Arquivos de arte (`assets/src/82_fortaleza*.pxl` → `assets/sprites/`)
| Arquivo | Quadro | Conteúdo |
|---|---|---|
| `tiles_fortaleza.png` | 16x16, 16 col. | tileset (ordem = `Fortaleza.NAMES`) |
| `fort_props.png` | 16x16 | `mirror_a mirror_b shutter_open shutter_closed receptor_off receptor_on sun_lens helice0-2 crank fresta_off fresta_on solar_cold solar_hot portal_off portal_on fissure_mark balestra eclipse_sun eclipse_moon beam_h beam_v beam_spark sym_muralha sym_espelho flecha` |
| `fort_rift.png` | 2 × 32x32 | portal de duelo da arena |
| `icons_fortaleza.png` | 16x16 | `pluma_vento lasca_umbral brasa_solar insignia_guarnicao diario_guarnicao amuleto_eclipse lente_observatorio manto_umbral` |
| `clima_fortaleza.png` | 16x16 | ícone do clima Ventania |
| `quadro_refugio.png` | 32x32 | quadro de contratos do Refúgio |
| `umbrel.png` `ventisco.png` `brasardo.png` | 20x20, 9 col. | criaturas (idle0-1 walk0-3 windup attack hurt) |
| `umbrafel.png` `vendraco.png` `solarco.png` | 28x28, 9 col. | evoluções |
| `lanceiro.png` `arqueiro.png` | 24x32, 9 col. | inimigos |
| `armadura.png` | 32x34, 9 col. | inimigo (windup = pose de contra-ataque) |
| `gemeo_ferro.png` `gemeo_ferro_b.png` | 40x40, 9 col. | minichefe (mesmo corpo, paletas diferentes) |
| `cavaleiro.png` | 64x64, 9 col. | guardião |
| `cavaleiro_posturas.png` | 64x64, 4 col. | `guarda`, `muralha`, `espelho`, `exausto` |
| `npc_muralha1-3.png` `npc_guarnicao.png` | 24x32, 7 col. | moradores (folha do herói com paletas) |

## Tileset `tiles_fortaleza.png` (índice → nome)
```
0 f_floor0  1 f_floor1  2 f_floor_edge_n  3 f_wall_front  4 f_wall_top  5 f_crenel  6 f_gold_floor  7 f_garden
8 f_garden_flowers  9 f_hedge  10 f_planter  11 f_abyss  12 f_abyss_lip  13 f_spirit_bridge  14 f_fissure  15 f_gate_closed
16 f_gate_open  17 f_stairs  18 f_pillar  19 f_light_floor  20 f_shadow_floor  21 f_light_plat  22 f_light_ghost  23 f_shadow_plat
24 f_shadow_ghost  25 f_fog0  26 f_fog1  27 f_roof_l  28 f_roof_m  29 f_roof_r  30 f_house_wall  31 f_house_window
32 f_house_door  33 f_mountain  34 f_rock_front  35 f_rock_top  36 f_carpet  37 f_banner  38 f_gold_plain
```

## Caracteres de mapa (Região 4)
| Char | Significado | Sólido |
|---|---|---|
| `β` | piso de pedra azulada | não |
| `ω` | muralha (topo/face automáticos, estandarte às vezes) | sim |
| `Ω` | ameias | sim |
| `γ` | piso dourado (salões/arenas) | não |
| `ψ` | jardim suspenso | não |
| `φ` / `Φ` | sebe / canteiro | sim |
| `θ` | abismo (céu sob as muralhas; a luz e os projéteis passam) | sim |
| `ξ` | ponte espiritual (só com o Olhar Velado) | não |
| `λ` | fissura violeta (só o Passo Umbral atravessa) | sim |
| `ζ` / `ι` | grade levadiça fechada / aberta | sim / não |
| `ε` | escada | não |
| `π` | pilar | sim |
| `σ` / `α` | piso na sombra / piso iluminado | não |
| `Λ` / `Δ` | plataforma de luz ativa / apagada | não / sim |
| `Σ` / `Ψ` | plataforma de sombra ativa / apagada | não / sim |
| `κ` | névoa cortante (barreira; porta com `closed_char: "κ"`) | sim |
| `ρ` / `ν` | telhado / parede das casas do Refúgio | sim |
| `μ` / `Μ` | chão / rocha da montanha | não / sim |
| `τ` | tapete violeta | não |

## Entidades novas (`scripts/fort_ent.gd`)
`espelho` (ori `a`="/" ou `b`="\"), `persiana` (`aberta`), `lente` (`dir`, `fase` sol/lua + `eclipse`), `receptor` (`group`, `ativa`: luz | disparo | vento), `helice` (`flag`), `manivela` (`helice` = flag), `nevoa` (`flag`), `fresta` (`flag`), `solar` (`flag`), `balestra` (`dir`), `eclipse` (`flag`), `portal` (`par`), `fissura` (`to`), `segredo` (`flag`, `msg`). Grupos de receptores: `puzzles[g] = {"type": "receptores", "flag": ..., "dica_apos", "dica"}`.

## Mapas (`tools/gen_regiao4.py`)
`ponte_espiritual` → `refugio_muralha` (núcleo) → rotas `jardins_suspensos` e `muralha_partida` → Torre das Duas Sombras: `torre_a` (átrio, Salão do Eclipse, Galeria dos Lanceiros, Ala da Sombra + atalho ao Refúgio), `torre_b` (Câmara das Hélices, Sala dos Receptores, arena dos Gêmeos de Ferro, tesouro), `rito_eclipse` (rito + ala avançada), `torre_c` (preparação + arena do Cavaleiro) → `estrada_final`.

## Gancho da Região 5 (Catedral do Vazio)
`estrada_final` termina no selo da Catedral, atrás de uma fissura (Passo Umbral). O spawn `from_catedral` (15, 1) já existe; a Região 5 só precisa de `m.ent(type="exit", x=13, y=0, w=6, h=1, to="<mapa>", spawn="...")` em `estrada()` e da volta para `estrada_final`/`from_catedral`.

## Ganchos de uma linha no código comum
- `world.gd`: `Fortaleza.attach(self)`, `Fortaleza.add_source(ts)`, `_tc`/`_src`/`_cell_tiles`/`is_solid_char`, chave `"eco"` nos condicionais, `Fortaleza.new_enemy()` (inimigos e contratos), ramo `_:` em `_spawn_def` para `FortEnt`, `FortEnt.heat_area` em `fire_area`, mecanismos da Região 4 na pedra de reinício.
- `companion.gd`: Rajada (`"vento": true` em habilidades `cone`), Investida Umbral (`"umbral": true` em `avanco`), salto com explosão (`"explosao"`), cores das ações `fresta/helice/calor`.
- `player.gd`: `passo_umbral` na tecla do Eco. `game.gd`: objetivo de `principalN`. `weather_fx.gd`: ícone de clima com `"folha"`.
- `tools/gen_maps.py`: uma linha (`if __name__ == "__main__": main()`) para o gerador da região poder importar `M`.
