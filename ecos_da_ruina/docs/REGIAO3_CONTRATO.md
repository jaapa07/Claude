# Contrato da Região 3 — Pântano dos Sussurros (arte ↔ conteúdo)

Níveis 13–18. Núcleo: **Porto das Lanternas**. Guardião: **Bruxa Afogada** → Eco **Olhar Velado**. Paleta: azul petróleo, verde frio e lilás.
Segue o mesmo padrão do `docs/REGIAO2_CONTRATO.md`: nomes e tamanhos abaixo são o que a arte produz e o que o código usa.

## Acesso e mapas
| Mapa | Papel | Ligações |
|---|---|---|
| `minas_entrada` (Região 2) | **Passagem Sul**: corredor na encosta sudeste da Entrada das Minas, fechado por rocha fissurada (`X`, entidade `crack` `passagem_sul`, flag `pantano_passagem`). Visível desde o Capítulo 1; só a Ruptura Ígnea abre. | leste → Porto |
| `porto_lanternas` | núcleo seguro (santuário, quadro de contratos, loja da Dalva, moradores com rotina) | oeste: Minas • norte: Passarela • leste: Lago • sul: Canal Submerso (atalho, abre por dentro do templo) • nordeste: ponte espiritual → `ponte_espiritual` (Região 4) |
| `passarela_ecos` | rota 1: tábuas, lodo instável, lanternas-guia, Brejugo e Goturim | sul: Porto • norte: Templo A |
| `lago_reflexos` | rota 2: comportas (nível da água), anel de lanternas (Nimbelo), segredo do reflexo | oeste: Porto • norte: Templo A |
| `templo_a` | 1 átrio, 2 **Sala das Marés** (sala central), 3 Galeria dos Sapos (encontro), 4 Sala dos Espelhos | Passarela, Lago, Templo B |
| `templo_b` | 5 Câmara do Lodo, 6 tesouro + santuário, 7 Canal Submerso (atalho ao Porto), 8 arena do Barqueiro | Templo A, Porto, Rito |
| `rito_reflexos` | Rito dos Reflexos: apresentação → aplicação → combinação → altar; ala avançada (Olhar Velado) | Templo B, Templo C |
| `templo_c` | 9 preparação, 10 arena da Bruxa Afogada | Rito, Porto (saída pós-chefe) |

Total do templo: 12 salas com sala central reconhecível, efeitos entre salas (a comporta da Galeria esvazia o canal da Sala das Marés) e dois atalhos (Canal Submerso e saída do Coração Afogado para o Porto).

## Caracteres de mapa novos (Região 3, TileSet fonte 3)
| Char | Significado | Sólido | Tile |
|---|---|---|---|
| `l` | lodo (chão do pântano) | não | lodo0/1 |
| `s` | capim do brejo | não | capim0/1 |
| `n` | juncos | sim | juncos |
| `W` | água funda | sim | agua_funda0 (animada) + margens; `agua_clara0` depois da Bruxa |
| `t` | água rasa | não | agua_rasa |
| `+` | passarela de tábuas | não | passarela_h / passarela_v (pela direção) |
| `U` | lodo instável | sim | lodo_instavel |
| `8` | lodo firmado (estacas ou Brejugo) | não | lodo_firme |
| `Y` | parede do templo | sim | templo_parede_topo / _frente |
| `9` | piso do templo | não | templo_piso |
| `0` | piso alagado (mostra reflexos) | não | templo_alagado |
| `E` | ponte espiritual (Olhar Velado) | não | ponte_espiritual |
| `^` / `&` | telhado de palha / parede de palafita | sim | telhado_l/m/r, palafita_parede/janela/porta |
| `*` | poste de lanterna | sim | poste_lanterna |
| `!` | porta do templo (abre como `9`) | sim | porta_templo |
| `i` | pilar submerso | sim | pilar_submerso |
| `;` | degraus | não | degraus |

## Arquivos de arte (todos desenhados à mão em `.pxl`, compilados com `python3 tools/pixc.py`)
| Fonte | PNG | Quadro | Conteúdo |
|---|---|---|---|
| `81_pantano_tiles.pxl` | `tiles_pantano.png` | 16x16, 33 tiles | ordem: `lodo0 lodo1 capim0 capim1 juncos agua_funda0 agua_funda1 agua_rasa passarela_h passarela_v lodo_instavel lodo_firme templo_parede_frente templo_parede_topo templo_piso templo_alagado margem_n margem_s margem_w margem_e ponte_espiritual telhado_l telhado_m telhado_r palafita_parede palafita_janela palafita_porta poste_lanterna porta_templo agua_clara0 agua_clara1 pilar_submerso degraus` |
| `82_pantano_objetos.pxl` | `pantano_props.png` | 16x16 | `lanterna_off lanterna_on roda0 roda1 comporta_fechada comporta_aberta estacas marca_lodo espelho_a espelho_b receptor_off receptor_on feixe_h feixe_v estatua emissor bolhas0 bolhas1 barco sussurro cesto` |
| `83_pantano_criaturas.pxl` | `goturim/brejugo/nimbelo.png` (20x20), `marulume/musgoral/nimbelio.png` (28x28) | 9 colunas | idle0 idle1 walk0-3 windup attack hurt |
| `84_pantano_inimigos.pxl` | `sapo_lodo.png` 24x24, `espectro.png` 24x28, `planta_semente.png` 24x24 | 9 colunas | + `semente.png` (8x8 x2), `orbe.png` (12x12 x3), `fx_splash.png` (16x16 x4), `fx_onda.png` (24x24 x3) |
| `85_pantano_chefes.pxl` | `barqueiro.png` 48x48, `bruxa.png` 72x72 | 9 colunas | windup = remo erguido / lanterna erguida; attack = remo varrendo / lanterna à frente |
| `86_pantano_porto.pxl` | `npc_porto1..4.png` (24x32, paletas do herói), `icons_pantano.png` (16x16 x8), `quadro_porto.png` (32x32) | | ícones: `junco_trancado perola_brejo lente_orvalho remo_barqueiro manto_juncos amuleto_mare rede_pesca amuleto_reflexo` |

Os quadros grandes dos chefes foram digitados à mão em trechos alinhados numa grade (auxiliar de alinhamento descrito no cabeçalho do `.pxl`); não há `_draw` nem formas geradas. Os reflexos (estátuas, Bruxa) são o próprio quadro espelhado na vertical pelo jogo, com tom de água.

## Mecânicas (entidades novas em `scripts/entity.gd` / `scripts/world.gd`)
| Entidade | Uso | Quem resolve |
|---|---|---|
| `lantern` | acende (E); grupos `lanterns` (guias da Passarela, anel do Lago) ficam acesas para sempre (`lit_<id>`); `boss: true` = lanterna temporária da arena do Barqueiro | herói |
| `sluice` (comporta) | alterna uma flag; condicionais de área trocam `W`↔`t` (nível da água), `9`→`0` no rito | herói (mecanismo local) |
| `stakes` (estacas) | firma o lodo instável (`U`→`8`) | herói (mecanismo local) |
| `mud_mark` | idem, só com **Brejugo/Musgoral** ativo (`acao_id: lodo`) | criatura (atalho/alternativa) |
| `wheel` (roda d'água) | escoa um canal (`W`→`t`), só com **Goturim/Marulume** (`acao_id: roda`) | criatura (caminho opcional) |
| `mirror`, `beam_source`, `beam_target` | feixe em grade; espelho `a` (/) e `b` (\\); puzzle `beam` | herói |
| `statue` | reflexo verdadeiro repete o lado da lanterna, o falso troca de lado; só aparece com água aos pés; tocar a falsa vira espectro; **Nimbelo** faz as falsas tremularem | observação (Nimbelo ajuda) |
| `ripple` | segredo por observação (juncos que sussurram, reflexo que não bate) | herói |
| `spirit_bridge` / `spirit_mark` | só com o **Olhar Velado** (`W`→`E`, inscrições legíveis) | Eco |
| `decor` | barcos, cestos, estátua do lago | — |

Hazards novos: `poca` (poça amaldiçoada da Bruxa, fere o herói) e `lodo` (campo do Brejugo, inimigos lentos). Projéteis novos: `semente`, `orbe` (voam sobre água e juncos) e onda do Barqueiro (`quake` com `over_water`).

## Inimigos e chefes
- **Sapo de Lodo** (`ataque: salto`): círculo de aviso no ponto de queda, salto em arco, onda de lodo ao cair.
- **Espectro Refletido** (`espiritual: true`): quase invisível e intocável; fica vulnerável ao atacar (aviso/golpe/recuperação), quando revelado (Olhar Velado, Clarão do Nimbelo, passiva do Nimbelo) ou perto do herói com a **Lente de Orvalho**.
- **Planta Sementeira** (`ataque: sementes`): enraizada, linha de aviso e leque de 3 sementes.
- **Barqueiro Sem Sombra** (`scripts/boss_barqueiro.gd`, minichefe): desliza pelo lago central, emerge na borda (golpe de remo em arco anunciado, ondas anunciadas). Sem sombra recebe 20% do dano; uma lanterna da plataforma acesa perto dele prende a sombra (cambaleia, recebe 160%). Plataformas largas em volta do lago: não há queda.
- **Bruxa Afogada** (`scripts/boss_bruxa.gd` + `boss_bruxa_copia.gd`): fase 1 leques de orbes (linhas) e poças (círculos); fase 2 (60%) divide-se em quatro — só a verdadeira tem reflexo consistente; Nimbelo ativo a marca na hora; golpe numa cópia a desfaz e provoca uma poça; reembaralha a cada 10% de dano ou 14 s. Fase 3 (25%): a água sobe (`0`→`W`), ficam a cruz de pedra (sempre firme) e três plataformas do padrão atual; a troca é anunciada 2,2 s antes (decalques); quem estiver numa plataforma que afunda vai para o chão firme mais próximo (8 de dano, nunca morte por queda). Vitória: `bruxa_morta`, `pantano_livre`, `eco_olhar_velado` e o Eco **Olhar Velado**.

## Criaturas
| Espécie | Afinidade/papel | Habilidades (nível) | Ação ambiental | Habitat |
|---|---|---|---|---|
| Goturim → Marulume (17) | água / suporte | Onda 1 (empurra leves), Garoa 14, Bolha 16; Marulume: Maré 17, Redemoinho 20 | gira rodas d'água | água rasa da Passarela e do Lago (fixo, comum) |
| Brejugo → Musgoral (17) | flora / controle | Lodo Pegajoso 1 (campo que desacelera), Raízes 14, Cuspe de Lodo 16; Musgoral: Pântano Vivo 17, Musgo Protetor 20 | firma lodo marcado | ilha oeste da Passarela (fixo) |
| Nimbelo → Nimbélio (18) | luz / reconhecimento (rara) | Clarão de Orvalho 1 (revela espectros), Lampejo 15, Luz Serena 17; Nimbélio: Aurora 18, Halo Dourado 21 | revela espectros por perto, distingue estátuas/reflexos falsos | anel de lanternas do Lago (aparece ao acender as três) |

Nenhuma captura é exigida: comportas, estacas, espelhos e reflexos (observação) resolvem tudo; rodas e lodo marcado são opcionais; o lodo do templo tem estacas e marca de Brejugo para a mesma flag.

## Mundo vivo, missões e contratos
- Moradores (`npc_porto1..4`): Arão (mestre do porto; vai ao cais depois da Bruxa), Iara (faroleira), Tito (pescador: no píer com sol/neblina, sob o telhado com chuva; no píer novo depois da Bruxa), Nina, Dalva (loja `dalva`), Cora (barqueira, volta à travessia depois da Bruxa).
- Missões: principal `principal3` (Sussurros do Pântano); secundárias `lanternas` (Iara → Amuleto da Maré + vínculo da equipe) e `rede` (Tito); segredo `reflexo`.
- Contratos: caçada `caca_sapos` (4 Sapos de Lodo) e dupla `contrabando` (com Ravi, domadores e feras Goturim/Brejugo no Lago).
- Clima: zona `pantano` (chuva 4, neblina 4, sol 2) no Porto, Passarela e Lago; Goturim extra com chuva e Brejugo extra com neblina.
- Música: todos os mapas usam `"music": "pantano"` (sem o arquivo, a trilha anterior continua).

## Recompensas
Remo Ancestral (tesouro do templo), Manto de Juncos (segredo do reflexo), Amuleto da Maré (Iara), Lente de Orvalho (Rito dos Reflexos), Amuleto do Reflexo (rito avançado, Olhar Velado), Sementes de Vida (rodas, Brejugo, revisita), diários (Faroleira, Templo, Barqueiro), Pérolas do Brejo e Juncos Trançados (materiais/venda).

## Depois da Bruxa (mudança regional)
Água clara em todos os mapas do pântano; cena de retorno no Porto; Cora e o barco novo retomam a travessia; Arão vai ao cais; margem nova no Lago (enseada sul com baú e inscrição); ponte espiritual do nordeste do Porto → `fim_cap3` → `ponte_espiritual` (Região 4, spawn `from_pantano`; volta pela saída oeste da ponte para o spawn `from_muralha`). Revisitas com o Olhar Velado: inscrições da Forja (`inscricao_forja`), da Fundição (`inscricao_fundicao`), da Vila Lúmen (`inscricao_vila`) e o rito avançado.

## Testes
`-- --e2e` roda os estágios `r3_*` depois do Capítulo 2 (passagem, Porto, Passarela, retorno ao Porto, Lago, Templo A, Templo B e atalho, Barqueiro com derrota e reinício, Rito dos Reflexos, Bruxa com derrota nas fases 1 e 3 e luta real, pós-chefe, salvar/carregar). Atalhos de desenvolvimento: `-- --e2e --r3` (monta o fim do Capítulo 2) e `-- --e2e --r3 --r3boss` (começa no Barqueiro).
