# Contrato da Região 5 — Catedral do Vazio (final)

Níveis 25–30 • núcleo **Acampamento da Aurora** • minichefe **Arauto Partido** • guardião final **Rei dos Ecos (Ivar)** • recompensa **Harmonia dos Ecos** •
paleta marfim, azul profundo e vermelho de energia. Este arquivo lista os nomes que a arte, os dados e o código da Região 5 usam e como ela se liga ao resto.

## Ligação com a Região 4
- `tools/gen_regiao4.py`, `estrada()`: uma linha nova — `exit (13, 0, 6, 1) -> acampamento_aurora / from_estrada`. A volta é a saída sul do Acampamento para `estrada_final / from_catedral`.
- O **selo externo** fica no sul do Acampamento (`ъ`, linha y=27): só o **Passo Umbral** o cruza (fissura `aurora_fissura`, grava `cruzou_selo_externo`).
- `placa_catedral` (selo da Estrada Final) deixou de dizer "em desenvolvimento".

## Mapas (`python3 tools/gen_regiao5.py [--ascii]`)
| Mapa | Papel |
|---|---|
| `acampamento_aurora` | núcleo seguro: Arquivista Sena, Mira (loja `aurora`), Caio, Vesna (`vesna_ok`), Bruna e Ravi, quadro de contratos, santuário, bigorna, nicho secreto, Eco de Ione 1, Arauto da Ordem; norte: portão da Catedral (atalho) e selo da Harmonia (pós-jogo) |
| `jardim_invertido` | rota 2: prismas e espelhos, escribas, Cristil (comum, fixo), anel de marcas (Velúnio, raro), estrela 2, Eco Perdido 2 |
| `escadaria_fragmentos` | rota 1: âncora com contrapeso (bloco + placa) ou Gravito, fragmentos, ponte de raiz, cristal (Ruptura), estrela 1, Eco Perdido 1 |
| `catedral_a` | 1 Nave (santuário, atalho ao Acampamento, elevador), 2 **Sala dos Prismas** (sala central), 3 Galeria dos Escribas (encontro), 4 Câmara das Raízes e Brasas |
| `catedral_b` | 5 Sala das Âncoras, 6 Coro Velado (marca + portal, estrela 3), 7 arena do **Arauto Partido**, 8 tesouro + santuário + alavanca do elevador |
| `rito_convergencia` | Rito da Convergência: raiz+brasa, visão+portal, os quatro Ecos, altar (Amuleto da Convergência) |
| `catedral_c` | 9 preparação (santuário), 10 **Câmara do Eco** (Ione presa: quatro elos), 11 **trono do Rei** |
| `salao_harmonia` | pós-jogo: três Provas da Harmonia (encontros) e o arquivo de Ivar |

Masmorra: 11 salas + Rito; atalhos: Nave ↔ Acampamento (alavanca na Nave), elevador Nave ↔ tesouro do andar das âncoras.

## Caracteres de mapa (TileSet fonte **5**, `Catedral.SOURCE_ID`)
| Char | Significado | Sólido |
|---|---|---|
| `д` / `л` / `ы` | piso de marfim / mosaico azul / runas vermelhas | não |
| `ш` `ц` `э` `я` | degraus / fragmento flutuante / ponte de raiz / caminho espiritual | não |
| `б` `г` `п` `ч` | jardim invertido / chão do acampamento / tapete vermelho / luz de vitral | não |
| `ж` | parede de marfim (topo, face e vitral automáticos) | sim |
| `ф` | vazio (a luz e os projéteis passam; ninguém anda) | sim |
| `щ` `ъ` `ю` | pilar / selo vermelho / rocha de cristal | sim |
| `в` `з` `и` `к` `ь` `м` | flores pendentes / lona de tenda / frente de tenda / paliçada / portão / rocha marfim | sim |
A fissura `λ` da Região 4 também é usada (Passo Umbral).

## Arte (`assets/src/87_catedral_tiles.pxl` … `91_catedral_chefes.pxl`, compilada com `python3 tools/pixc.py`)
Prefixos de quadro: `c5_ c5p_ c5f_ c5s_ c5i_ c5q_ c5c_ io_ cr_ pm_ gv_ mn_ vl_ av_ es_ sp_ fg_ ar_ rk_`; paletas `cat catobj ccria cinim cboss mestra_ione mestra_ione_cristal aurora_* ordem_arauto`.
| PNG | Conteúdo |
|---|---|
| `tiles_catedral.png` | 36 tiles 16x16 (ordem = `Catedral.NAMES`; vazio e selo animados) |
| `cat_props.png` | 16x16: `CatEnt.CPROPS` (prisma, seta, emissor, cristais, âncoras, elos, raiz, rachadura, marcas, anel, selo da Harmonia, estandarte, lanterna, vitral, fita, flores, pena "nome", feixe) |
| `cristil/gravito/velunio.png` (20x20) e `prismal/monolito/astraveu.png` (28x28) | criaturas, 9 colunas |
| `escriba.png` `sentinela_prisma.png` (24x32), `fragmento.png` (20x20) | inimigos, 9 colunas |
| `arauto.png` (48x48), `rei.png` (72x72, simétrico), `rei_foco.png` (24x32) | chefes e focos |
| `cristal_ione.png` (32x48 x2), `fx_selo_vazio.png` (32x32 x3), `icons_catedral.png`, `quadro_aurora.png`, `clima_catedral.png`, `clima_aurora_fitas.png`, `clima_aurora_brilho.png` | objetos, efeitos, ícones e clima |
| `npc_aurora1-3.png`, `npc_arauto.png`, `npc_ione.png` | moradores (paletas do herói; Ione e o Arauto com capa/capuz desenhados por cima) |

## Código (arquivos novos) e ganchos de uma linha
- `scripts/catedral.gd` (`Catedral`): tileset, caracteres, `attach`, chegada ao Acampamento e cena do Arauto, ecos sobre mecanismos (`on_eco`), resgate de Ione, nome de Ivar (linha da equipe), epílogo (`epilogue`), créditos, Harmonia, bestiário, clima aurora, habilidade `perfura`.
- `scripts/cat_ent.gd` (`CatEnt extends FortEnt`): `prisma emissor cristal ancora elo raiz cristal_eco marca circulo selo_harmonia adorno cristal_ione nome eco_ione`.
- `scripts/enemy_catedral.gd` (escriba, sentinela_prisma, fragmento), `scripts/cat_selo.gd` (selo no chão, grupo `selos`),
  `scripts/boss_arauto.gd`, `scripts/boss_rei.gd`, `scripts/boss_rei_foco.gd`.
- Ganchos: `world.gd` (`Catedral.attach/add_source`, `_tc/_src/_cell_tiles/is_solid_char/blocks_projectile`, `CatEnt` no `_spawn_def`, `Catedral.on_eco` em Raiz Viva/Ruptura/Olhar), `fortaleza.gd` (`new_enemy`), `fort_ent.gd` (prisma no feixe; o vazio deixa passar a luz), `companion.gd` (exec `perfura`, cores de ação), `player.gd` (tecla do Eco `harmonia`), `ui.gd` (notas da Harmonia no bestiário), `weather_fx.gd` (`Catedral.build_aurora`), `gen_regiao4.py` (saída da Estrada).

## Dados (`python3 tools/dados_regiao5.py`, idempotente)
Espécies (cristil→prismal, gravito→monolito, velunio→astraveu), habilidades (`barreira_prisma centelha_prisma refracao aurora_prisma pulso_gravitacional orbita_pedra estilhaco colapso monolito_vivo dardo_veu asa_veu nevoa_astral chuva_astral lanca_astral harmonia`),
inimigos/chefes (`escriba sentinela_prisma fragmento arauto rei foco_rei`), itens, missões (`principal5 vozes estrelas provas_harmonia bestiario_completo`), contratos (`caca_escribas`, trio `ultimas_correntes`), loja `aurora`, diálogos, `story.json` (`memorias.arauto_morto/rei_morto`, `resgate_ione`, `nome_ivar`, `epilogo`), `regions.json` (catedral jogável), `music.json` (`chefes.arauto=chefe_catedral`, `chefes.rei=rei`, variante do Acampamento). Clima: zona `catedral` e clima `aurora` em `weather.json`.
Música (`python3 tools/gen_audio.py --trilhas catedral aurora chefe_catedral rei`): `music_catedral`, `music_aurora`, `music_chefe_catedral`, `music_rei`.

## História (para o merge com o sistema de artefatos)
- **Amnésia do herói / artefatos:** o quinto artefato é o item `artefato_rei` (tipo `historia`, `"artefato": true`), entregue pela memória `rei_morto`; ao recebê-lo o jogo grava as flags `artefato_rei` e `lembranca_5` (`Catedral._on_flag`, quando `mem_rei_morto` é marcado). Se `data/story.json → "artefatos"` existir no merge, acrescente lá `{"id": "rei", "item": "artefato_rei", "flag": "artefato_rei", "lembranca": 5, "chefe": "rei_morto"}` no formato dos outros quatro.
- **Revelação final** (`story.json → epilogo.abertura`): com os cinco artefatos o herói lembra — fazia parte da expedição; Ione selou suas memórias para protegê-lo da corrente da Ordem quando a fenda se abriu; ele acordou perto de Lúmen. O paralelo com Ivar sustenta o clímax (`nome_ivar`: "Eu sei como é acordar sem saber quem se é").
- **Eco de Ione:** figura azul translúcida (`eco_ione`, `npc_ione` com modulação) em quatro pontos (Acampamento, Nave, tesouro, preparação), cada um com falas curtas e o herói respondendo.
- **Arauto da Ordem do Vazio:** mensageiro de manto branco com olho fechado (`npc_arauto`); cena no Acampamento (`arauto_aurora`) e na Nave (`arauto_nave`); é o mesmo que vira o **Arauto Partido** (minichefe). Mantido o nome "Arauto" para as aparições nas Regiões 1–4.
- **Clímax:** o Rei hesita a 6%; a entidade `nome` (pena dourada) abre o diálogo; a linha `{EQUIPE}` cita as criaturas da equipe e os vínculos (flag `climax_equipe`); Ione e o herói dizem "Ivar"; o Rei se desfaz em paz.
- **Epílogo:** cinco paradas (Vila Lúmen, Forja de Cobre, Porto, Refúgio, Acampamento) com moradores/decoração novos injetados em tempo de execução (`epilogo.mudancas`, sem editar os mapas das outras regiões), falas finais de Bruna, Ravi e Vesna, créditos (tela própria) e a Harmonia dos Ecos.

## Testes
`-- --e2e --regiao5` (atalhos `--r5de=6|7|8|9`): monta o fim do Capítulo 4 e joga a região toda (112 verificações), incluindo derrota e reinício do Rei, resgate de Ione, `rei_morto`, Jornada 5/5, epílogo, créditos, Harmonia e save/load.
