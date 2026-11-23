#!/usr/bin/env python3
"""Desenha os mapas da Região 5 — Catedral do Vazio (layouts manuais, sala a sala).
Saída: data/maps/<mapa>.json. Verifica alcançabilidade das entidades por BFS.
Caracteres de mapa da região: docs/REGIAO5_CONTRATO.md (tiles em assets/src/87_catedral_tiles.pxl).

Uso: python3 tools/gen_regiao5.py [--ascii [mapa ...]]"""
import json, os, sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_maps import M, OUT  # noqa: E402  (classe de mapa compartilhada com as outras regiões)

REGION = "catedral"
# piso: д marfim, л mosaico azul, ы runas vermelhas, ш degraus, ц fragmento flutuante, э ponte de raiz, я caminho espiritual,
#       б jardim invertido, г chão do acampamento, п tapete vermelho, ч luz de vitral
WALK = set("длышцэябгпч")
# sólidos: ж parede de marfim, ф vazio (a luz e os projéteis passam), щ pilar, ъ selo vermelho, ю rocha de cristal (Ruptura),
#          в flores pendentes, з lona de tenda, и frente de tenda, к paliçada, ь portão da catedral, м rocha marfim, λ fissura (Região 4)
SOLID = set("жфщъювзикьмλ")
# entidades atrás de obstáculos opcionais (Raiz Viva, Ruptura, Olhar Velado, Passo Umbral, segredos, criatura rara)
OPTIONAL_BEHIND = {"aurora_bau_nicho", "esc_bau_raiz", "esc_bau_cristal", "jard_bau_marca", "jard_velunio", "jard_velunio2", "ca_bau_prisma",
                   "ca_bau_prisma2"}


def C(mid, name, w, h, fill="ж", music="catedral", safe=False):
    return M(mid, name, w, h, fill=fill, music=music, region=REGION, safe=safe)


def tent(m, x, y, w):
    """tenda do acampamento: lona (2 linhas) + frente com a entrada no meio"""
    m.rect(x, y, w, 2, "з")
    m.rect(x, y + 2, w, 1, "и")


def door(m, did, tiles, opens=None, closes=None, closed="ь", open_char="д"):
    d = {"type": "door", "id": did, "tiles": tiles, "closed_char": closed, "open_char": open_char}
    if opens:
        d["open_flags"] = opens
    if closes:
        d["close_flags"] = closes
    m.ents.append(d)


# ================================================================== 1. ACAMPAMENTO DA AURORA (núcleo seguro; selo externo ao sul)
def acampamento():
    m = C("acampamento_aurora", "Acampamento da Aurora", 48, 40, fill="м", music="aurora", safe=True)
    m.rect(4, 3, 40, 24, "г")                       # platô do acampamento (y 3..26)
    m.rect(0, 14, 4, 3, "г")                        # saída oeste: Escadaria dos Fragmentos
    m.rect(44, 14, 4, 3, "г")                       # saída leste: Jardim Invertido
    m.rect(21, 0, 6, 3, "г")                        # portão norte: Catedral (atalho, abre por dentro)
    m.rect(37, 0, 4, 3, "г")                        # selo da Harmonia (pós-jogo)
    m.rect(14, 27, 20, 1, "ъ")                      # SELO EXTERNO (só o Passo Umbral cruza)
    m.rect(14, 28, 20, 9, "г")                      # platô de chegada (y 28..36)
    m.rect(21, 37, 6, 3, "г")                       # trilha da Estrada Final
    for (x, y) in ((15, 29), (32, 29), (15, 35), (32, 35)):
        m.set(x, y, "щ")                            # obeliscos do selo
    tent(m, 6, 5, 7)                                # tenda da Arquivista
    tent(m, 33, 5, 8)                               # tenda de suprimentos (Mira)
    tent(m, 6, 18, 6)                               # enfermaria (Caio)
    tent(m, 36, 18, 6)                              # tenda de Ione (vazia até o resgate)
    m.rect(19, 10, 10, 9, "ы")                      # círculo de runas da fogueira
    for x in range(15, 18):
        m.set(x, 23, "к")
    for x in range(30, 33):
        m.set(x, 23, "к")
    # nicho escondido na rocha oeste (segredo por observação: a pedra mais limpa)
    m.rect(1, 9, 2, 3, "г")
    m.cond.append({"if": "aurora_nicho", "rects": [[3, 10, 1, 1, "г"]]})
    m.spawns = {"default": [24, 21], "from_estrada": [24, 38], "from_escadaria": [2, 15], "from_jardim": [45, 15], "from_catedral": [24, 4],
                "from_harmonia": [39, 4], "from_epilogo": [24, 21]}
    m.ent(type="exit", x=21, y=39, w=6, h=1, to="estrada_final", spawn="from_catedral")
    m.ent(type="exit", x=0, y=14, w=1, h=3, to="escadaria_fragmentos", spawn="from_acampamento")
    m.ent(type="exit", x=47, y=14, w=1, h=3, to="jardim_invertido", spawn="from_acampamento")
    m.ent(type="exit", x=21, y=0, w=6, h=1, to="catedral_a", spawn="from_acampamento", if_flag="catedral_atalho")
    m.ent(type="exit", x=37, y=0, w=4, h=1, to="salao_harmonia", spawn="from_acampamento", if_flag="harmonia_aberta")
    door(m, "portao_catedral", [[x, 1] for x in range(21, 27)], opens=["catedral_atalho"], open_char="г")
    door(m, "portao_harmonia", [[x, 1] for x in range(37, 41)], opens=["harmonia_aberta"], closed="ъ", open_char="г")
    # selo externo: fissura no selo (Passo Umbral) e a volta
    m.ent(type="sign", id="placa_selo_externo", dialog="placa_selo_externo", x=21, y=30)
    m.ent(type="fissura", id="aurora_fissura", x=23, y=28, to=[23, 26], set_flag="cruzou_selo_externo")
    m.ent(type="fissura", id="aurora_fissura_volta", x=24, y=26, to=[24, 28])
    # coração do acampamento
    m.ent(type="shrine", id="aurora", x=24, y=12)
    m.ent(type="brazier", id="fogueira_aurora", x=24, y=15)
    m.ent(type="sign", id="placa_aurora", dialog="placa_aurora", x=20, y=20)
    m.ent(type="prop", id="quadro_aurora", sheet="quadro_aurora", frame=0, x=30, y=12, solid=True, contratos=True)
    m.ent(type="anvil", id="aurora_bigorna", x=13, y=10)
    m.ent(type="npc", id="sena", sprite="npc_aurora1", dialog="sena", x=21, y=13, nome="Arquivista Sena", unless_flag="rei_morto")
    m.ent(type="npc", id="sena_festa", sprite="npc_aurora1", dialog="sena", x=26, y=9, nome="Arquivista Sena", if_flag="rei_morto")
    m.ent(type="npc", id="mira", sprite="npc_aurora2", dialog="mira", x=37, y=9, nome="Mira, a cartógrafa")
    m.ent(type="npc", id="caio", sprite="npc_aurora3", dialog="caio", x=9, y=22, nome="Caio, o noviço")
    m.ent(type="npc", id="vesna_aurora", sprite="vesna", human=True, dialog="vesna_aurora", x=34, y=14, nome="Vesna", if_flag="vesna_ok")
    m.ent(type="npc", id="bruna_aurora", sprite="aliada_bruna", human=True, dialog="bruna", x=17, y=16, nome="Bruna", party_id="bruna", if_flag="saqueadores_ok")
    m.ent(type="npc", id="ravi_aurora", sprite="aliado_ravi", human=True, dialog="ravi", x=15, y=14, nome="Ravi", party_id="ravi", if_flag="saqueadores_ok")
    m.ent(type="npc", id="ione_aurora", sprite="npc_ione", dialog="ione", x=39, y=22, nome="Mestra Ione", if_flag="rei_morto")
    # o Arauto da Ordem do Vazio (manto branco, olho fechado) e o Eco de Ione, sempre um passo à frente
    m.ent(type="npc", id="arauto_aurora", sprite="npc_arauto", dialog="arauto_aurora", x=24, y=5, nome="Arauto da Ordem", unless_flag="arauto_partiu")
    m.ent(type="eco_ione", id="eco_ione_1", dialog="eco_ione_1", x=27, y=4, unless_flag="eco_ione_1_visto")
    m.ent(type="adorno", id="aurora_estandarte1", frame="estandarte", x=18, y=10)
    m.ent(type="adorno", id="aurora_estandarte2", frame="estandarte", x=30, y=17)
    m.ent(type="adorno", id="aurora_festa1", frame="lanterna_festa", x=22, y=9, if_flag="rei_morto")
    m.ent(type="adorno", id="aurora_festa2", frame="lanterna_festa", x=27, y=19, if_flag="rei_morto")
    m.ent(type="segredo", id="aurora_pedra", x=4, y=10, flag="aurora_nicho",
          msg="Uma pedra de marfim mais limpa que as outras: alguém a empurra sempre. Atrás dela, um nicho escondido!")
    m.ent(type="chest", id="aurora_bau_nicho", x=1, y=10, loot={"semente_vida": 1, "selo_refinado": 3})
    m.ent(type="chest", id="aurora_bau", x=42, y=24, loot={"pocao": 3, "fragmento_prisma": 2})
    # Harmonia dos Ecos: o selo do salão de provas só responde ao Eco final
    m.ent(type="selo_harmonia", id="aurora_selo_harmonia", x=38, y=3, flag="harmonia_aberta")
    return m


# ================================================================== 2. ESCADARIA DOS FRAGMENTOS (rota 1: âncoras, fragmentos, Gravito)
def escadaria():
    m = C("escadaria_fragmentos", "Escadaria dos Fragmentos", 40, 50, fill="ф")
    m.rect(30, 40, 9, 7, "д")                       # patamar de chegada (leste)
    m.rect(39, 42, 1, 3, "д")
    m.rect(22, 42, 8, 2, "ц")                       # fragmentos que flutuam até o patamar A
    m.rect(10, 36, 12, 10, "д")                     # patamar A (âncora + Gravito)
    m.rect(14, 35, 4, 1, "ш")
    # trecho quebrado da escada: a âncora gravitacional o segura no lugar
    m.cond.append({"if": "escadaria_ancora", "rects": [[14, 28, 4, 7, "ц"]]})
    m.rect(8, 18, 16, 10, "д")                      # patamar B (fragmentos errantes)
    m.rect(14, 27, 4, 1, "ш")
    m.rect(0, 20, 3, 6, "д")                        # ilhota oeste (ponte de raiz)
    m.cond.append({"if": "escadaria_raiz", "rects": [[3, 22, 5, 2, "э"]]})
    m.rect(14, 12, 4, 6, "ш")                       # degraus até o patamar C
    m.rect(6, 4, 20, 8, "д")                        # patamar C (sentinela)
    m.rect(26, 7, 1, 1, "ю")                        # rocha de cristal (Ruptura Ígnea)
    m.rect(27, 5, 4, 5, "д")                        # alcova atrás do cristal
    m.cond.append({"if": "escadaria_cristal", "rects": [[26, 7, 1, 1, "д"]]})
    m.rect(10, 0, 4, 4, "д")                        # saída norte: Catedral
    for (x, y) in ((10, 38), (21, 38), (8, 19), (23, 19), (6, 5), (25, 5)):
        m.set(x, y, "щ")
    m.spawns = {"default": [36, 43], "from_acampamento": [37, 43], "from_catedral": [11, 1]}
    m.ent(type="exit", x=39, y=42, w=1, h=3, to="acampamento_aurora", spawn="from_escadaria")
    m.ent(type="exit", x=10, y=0, w=4, h=1, to="catedral_a", spawn="from_escadaria")
    m.ent(type="sign", id="placa_escadaria", dialog="placa_escadaria", x=33, y=41)
    m.ent(type="enemy", kind="fragmento", id="e_frag1", x=26, y=42, nivel=25)
    # patamar A: âncora gravitacional — contrapeso local (bloco na placa) ou um Gravito a sustenta
    m.ent(type="sign", id="placa_ancora", dialog="placa_ancora", x=12, y=44)
    m.ent(type="ancora", id="esc_ancora", x=16, y=37, flag="escadaria_ancora")
    m.ent(type="crate", id="esc_bloco", x=13, y=41)
    m.ent(type="plate", id="esc_placa", group="esc_contrapeso", x=17, y=41)
    m.puzzles["esc_contrapeso"] = {"type": "plates", "flag": "escadaria_ancora"}
    m.ent(type="wild", id="e_gravito1", species="gravito", level=25, x=19, y=43)
    m.ent(type="wild", id="e_gravito2", species="gravito", level=25, x=11, y=44)
    m.ent(type="wild", id="e_gravito3", species="gravito", level=26, x=20, y=39)
    m.ent(type="pickup", id="eco_perdido1", item="eco_perdido", sheet="icons_catedral", frame=0, flag="eco_perdido1_pego", x=11, y=37, unless_flag="eco_perdido1_pego")
    # patamar B: fragmentos errantes; suporte de raiz para a ilhota oeste (Raiz Viva)
    m.ent(type="enemy", kind="fragmento", id="e_frag2", x=12, y=21, nivel=25)
    m.ent(type="enemy", kind="fragmento", id="e_frag3", x=20, y=24, nivel=26)
    m.ent(type="raiz", id="esc_raiz", x=8, y=22, flag="escadaria_raiz")
    m.ent(type="chest", id="esc_bau_raiz", x=1, y=22, loot={"essencia_roxa": 1, "fragmento_prisma": 2, "tonico_criatura": 1})
    m.ent(type="segredo", id="esc_estrela", x=22, y=26, flag="estrela_1",
          msg="Entre os fragmentos que flutuam, três pedras giram sempre na mesma ordem — como as estrelas do mapa da Mira. Você anota o desenho.")
    # patamar C: sentinela prismática; cristal rachado (Ruptura Ígnea)
    m.ent(type="enemy", kind="sentinela_prisma", id="e_sent1", x=18, y=6, nivel=26)
    m.ent(type="cristal_eco", id="esc_cristal", x=25, y=7, flag="escadaria_cristal")
    m.ent(type="chest", id="esc_bau_cristal", x=29, y=7, loot={"semente_vida": 1, "essencia_laranja": 1})
    m.ent(type="chest", id="esc_bau", x=7, y=10, loot={"pocao": 2, "fragmentos": 120})
    return m


# ================================================================== 3. JARDIM INVERTIDO (rota 2: prismas, escribas, Cristil, Velúnio)
def jardim():
    m = C("jardim_invertido", "Jardim Invertido", 48, 40, fill="ф")
    m.rect(0, 18, 6, 4, "б")                        # chegada (oeste)
    m.rect(6, 12, 14, 14, "б")                      # terraço 1 (Cristil)
    for (x, y) in ((6, 12), (19, 12), (6, 25), (19, 25)):
        m.set(x, y, "в")
    for x in range(9, 13):
        m.set(x, 14, "в")
    m.rect(8, 28, 10, 7, "б")                       # terraço baixo (marcas espirituais; Velúnio)
    m.cond.append({"if": "jardim_marca", "rects": [[12, 26, 2, 2, "я"]]})
    m.rect(20, 17, 2, 3, "д")                       # passagem para o terraço 2
    m.rect(22, 6, 20, 22, "б")                      # terraço 2 (sala dos prismas)
    m.rect(22, 6, 20, 1, "в")
    m.rect(30, 13, 4, 6, "д")
    m.rect(28, 0, 4, 6, "д")                        # saída norte: Catedral
    m.rect(28, 6, 4, 1, "б")
    m.rect(43, 21, 4, 5, "б")                       # mirante leste (baú do prisma)
    m.spawns = {"default": [3, 19], "from_acampamento": [1, 19], "from_catedral": [29, 1]}
    m.ent(type="exit", x=0, y=18, w=1, h=4, to="acampamento_aurora", spawn="from_jardim")
    m.ent(type="exit", x=28, y=0, w=4, h=1, to="catedral_a", spawn="from_jardim")
    m.ent(type="sign", id="placa_jardim", dialog="placa_jardim", x=4, y=21)
    m.ent(type="wild", id="j_cristil1", species="cristil", level=25, x=10, y=17)
    m.ent(type="wild", id="j_cristil2", species="cristil", level=25, x=15, y=21)
    m.ent(type="wild", id="j_cristil3", species="cristil", level=26, x=13, y=23)
    m.ent(type="enemy", kind="escriba", id="j_escriba1", x=26, y=22, nivel=25)
    m.ent(type="enemy", kind="escriba", id="j_escriba2", x=38, y=16, nivel=26)
    m.ent(type="segredo", id="jard_estrela", x=17, y=13, flag="estrela_2",
          msg="As flores pendem para cima, para o vazio — menos uma, que aponta sempre para o mesmo ponto do céu. Você anota a estrela.")
    m.ent(type="pickup", id="eco_perdido2", item="eco_perdido", sheet="icons_catedral", frame=0, flag="eco_perdido2_pego", x=7, y=24, unless_flag="eco_perdido2_pego")
    # sala dos prismas: emissor -> espelho -> espelho -> cristal (portão); o prisma (Cristil) leva a luz ao mirante
    m.ent(type="sign", id="placa_prismas", dialog="placa_prismas", x=24, y=26)
    m.ent(type="emissor", id="jp_emissor", x=23, y=9, dir=[1, 0])
    m.ent(type="prisma", id="jp_prisma", x=27, y=9, dir=[1, 0])
    m.ent(type="espelho", id="jp_espelho1", x=36, y=9, ori="a", dica_grupo="jardim_luz")
    m.ent(type="espelho", id="jp_espelho2", x=36, y=24, ori="a", dica_grupo="jardim_luz")
    m.ent(type="cristal", id="jp_cristal", group="jardim_luz", x=40, y=24)
    m.puzzles["jardim_luz"] = {"type": "receptores", "flag": "jardim_luz", "msg": "A luz alcança o cristal do portão: o selo vermelho se desfaz!", "dica_apos": 4,
                               "dica": "Dica: o primeiro espelho manda a luz para baixo; o segundo, para a direita, até o cristal."}
    m.ent(type="cristal", id="jp_cristal_prisma", group="jardim_prisma", x=27, y=26)
    m.puzzles["jardim_prisma"] = {"type": "receptores", "flag": "jardim_prisma", "msg": "O prisma dobra a luz até o cristal do mirante: uma passagem de pedra se ergue!"}
    m.cond.append({"if": "jardim_prisma", "rects": [[42, 23, 1, 1, "д"]]})
    m.ent(type="chest", id="ca_bau_prisma", x=45, y=23, loot={"fragmento_prisma": 3, "essencia_roxa": 1, "selo_refinado": 2})
    door(m, "jardim_portao", [[x, 5] for x in range(28, 32)], opens=["jardim_luz"], closed="ъ")
    # terraço baixo: a ponte espiritual aparece com o Olhar Velado (ou com um Velúnio)
    m.ent(type="marca", id="jard_marca", x=12, y=25, flag="jardim_marca")
    m.ent(type="circulo", id="jard_circulo", x=12, y=31, flag="jardim_circulo")
    m.ent(type="wild", id="jard_velunio", species="velunio", level=26, x=13, y=31, if_flag="jardim_circulo", unique=True)
    m.ent(type="wild", id="jard_velunio2", species="velunio", level=27, x=10, y=32, if_flag="jardim_circulo", clima="aurora")
    m.ent(type="chest", id="jard_bau_marca", x=16, y=33, loot={"semente_vida": 1, "fragmento_prisma": 1})
    m.ent(type="enemy", kind="sentinela_prisma", id="j_sent1", x=33, y=11, nivel=26)
    return m


# ================================================================== 4. CATEDRAL — NAVE (salas 1–4)
def catedral_a():
    m = C("catedral_a", "Catedral do Vazio — Nave dos Prismas", 60, 46)
    m.rect(24, 34, 12, 9, "л")                      # 1. nave de entrada (segura)
    m.rect(24, 34, 12, 1, "д")
    m.rect(0, 37, 24, 2, "д"); m.rect(36, 37, 24, 2, "д")
    m.rect(29, 43, 2, 3, "д")                       # atalho ao Acampamento (abre por dentro)
    m.rect(29, 30, 2, 4, "д")
    m.rect(18, 16, 24, 14, "д")                     # 2. Sala dos Prismas (sala central)
    m.rect(26, 20, 8, 6, "ч")
    for (x, y) in ((21, 19), (38, 19), (21, 26), (38, 26)):
        m.set(x, y, "щ")
    m.rect(29, 13, 2, 3, "д")
    m.rect(18, 2, 24, 11, "л")                      # 3. Galeria dos Escribas (encontro)
    for (x, y) in ((20, 4), (39, 4), (20, 10), (39, 10)):
        m.set(x, y, "щ")
    m.rect(15, 4, 3, 2, "д")                        # corredor para a Câmara das Raízes
    m.rect(2, 2, 13, 28, "д")                       # 4. Câmara das Raízes e Brasas
    m.rect(2, 13, 13, 3, "ф")                       # fosso do vazio
    m.cond.append({"if": "catedral_raiz", "rects": [[8, 13, 2, 3, "э"]]})
    m.rect(0, 24, 2, 2, "д")                        # saída oeste: andar das âncoras
    m.rect(36, 35, 6, 2, "д")                       # elevador de fragmentos (atalho para o tesouro)
    m.spawns = {"default": [30, 40], "from_escadaria": [1, 37], "from_jardim": [58, 37], "from_acampamento": [30, 44], "from_b": [1, 24],
                "from_elevador": [38, 35]}
    m.ent(type="exit", x=0, y=37, w=1, h=2, to="escadaria_fragmentos", spawn="from_catedral")
    m.ent(type="exit", x=59, y=37, w=1, h=2, to="jardim_invertido", spawn="from_catedral")
    m.ent(type="exit", x=29, y=45, w=2, h=1, to="acampamento_aurora", spawn="from_catedral", if_flag="catedral_atalho")
    door(m, "ca_portao_atalho", [[29, 43], [30, 43]], opens=["catedral_atalho"])
    m.ent(type="lever", id="ca_alavanca_atalho", group="atalho_catedral", idx=0, x=27, y=41)
    m.puzzles["atalho_catedral"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "catedral_atalho", "dica_apos": 9, "dica": ""}
    m.ent(type="shrine", id="catedral_nave", x=30, y=36)
    m.ent(type="sign", id="placa_catedral_nave", dialog="placa_catedral_nave", x=26, y=35)
    m.ent(type="npc", id="arauto_nave", sprite="npc_arauto", dialog="arauto_nave", x=30, y=31, nome="Arauto da Ordem", unless_flag="arauto_nave_partiu")
    m.ent(type="eco_ione", id="eco_ione_2", dialog="eco_ione_2", x=30, y=24, unless_flag="eco_ione_2_visto")
    m.ent(type="spirit_mark", id="ca_inscricao", dialog="inscricao_catedral", x=33, y=35)
    m.ent(type="adorno", id="ca_vitral1", frame="vitral", x=25, y=34, solid=False)
    m.ent(type="adorno", id="ca_vitral2", frame="vitral", x=34, y=34, solid=False)
    # elevador de fragmentos: liga a nave ao tesouro do andar das âncoras (abre pelo outro lado)
    m.ent(type="exit", x=41, y=35, w=1, h=2, to="catedral_b", spawn="from_elevador", if_flag="catedral_elevador")
    door(m, "ca_elevador", [[36, 35], [36, 36]], opens=["catedral_elevador"])
    m.ent(type="sign", id="placa_elevador", dialog="placa_elevador", x=34, y=38)
    # 2. prismas: emissor -> espelho (desce) -> espelho (direita) -> cristal; o prisma (Cristil) leva a luz ao nicho
    m.ent(type="sign", id="placa_sala_prismas", dialog="placa_sala_prismas", x=33, y=28)
    m.ent(type="emissor", id="ca_emissor", x=19, y=17, dir=[1, 0])
    m.ent(type="espelho", id="ca_espelho1", x=25, y=17, ori="a", dica_grupo="ca_luz")
    m.ent(type="espelho", id="ca_espelho2", x=25, y=27, ori="a", dica_grupo="ca_luz")
    m.ent(type="prisma", id="ca_prisma", x=33, y=27, dir=[1, 0])
    m.ent(type="cristal", id="ca_cristal", group="ca_luz", x=40, y=27)
    m.puzzles["ca_luz"] = {"type": "receptores", "flag": "catedral_luz", "msg": "A luz atravessa a sala e acende o cristal: o portão norte se ergue!", "dica_apos": 4,
                           "dica": "Dica: o espelho de cima deve mandar a luz para baixo; o de baixo, para a direita."}
    m.ent(type="cristal", id="ca_cristal_nicho", group="ca_nicho", x=33, y=17)
    m.puzzles["ca_nicho"] = {"type": "receptores", "flag": "catedral_nicho", "msg": "O prisma ergue a luz até o cristal alto: um nicho se abre na parede!"}
    m.rect(43, 21, 2, 3, "д")
    m.cond.append({"if": "catedral_nicho", "rects": [[42, 22, 1, 1, "д"]]})
    m.ent(type="chest", id="ca_bau_prisma2", x=44, y=22, loot={"fragmento_prisma": 2, "tonico_criatura": 2})
    m.ent(type="enemy", kind="sentinela_prisma", id="ca_sent1", x=36, y=21, nivel=26)
    door(m, "ca_portao_norte", [[29, 15], [30, 15]], opens=["catedral_luz"])
    # 3. galeria (encontro)
    m.ent(type="enemy", kind="escriba", id="ca_esc1", x=23, y=6, enc="galeria_c", nivel=26)
    m.ent(type="enemy", kind="escriba", id="ca_esc2", x=36, y=6, enc="galeria_c", nivel=26)
    m.ent(type="enemy", kind="fragmento", id="ca_frag1", x=30, y=4, enc="galeria_c", nivel=26)
    m.ent(type="encounter", id="galeria_c", x=18, y=2, w=24, h=11, flag_done="enc_galeria_c_ok", flag_active="tmp_enc_galeria_c")
    door(m, "ca_porta_gal_in", [[29, 13], [30, 13]], closes=["tmp_enc_galeria_c"])
    door(m, "ca_porta_gal_out", [[17, 4], [17, 5]], opens=["enc_galeria_c_ok"])
    m.ent(type="pickup", id="eco_perdido3", item="eco_perdido", sheet="icons_catedral", frame=0, flag="eco_perdido3_pego", x=19, y=11, unless_flag="eco_perdido3_pego")
    m.ent(type="chest", id="ca_bau_galeria", x=40, y=3, loot={"pocao": 2, "fragmento_prisma": 1, "fragmentos": 100})
    # 4. raízes e brasas: Raiz Viva ergue a ponte; a chama do braseiro (ou a Ruptura Ígnea) reaquece o mecanismo
    m.ent(type="sign", id="placa_raizes", dialog="placa_raizes", x=13, y=6)
    m.ent(type="brazier", id="ca_braseiro", x=4, y=6)
    m.ent(type="raiz", id="ca_raiz", x=8, y=12, flag="catedral_raiz")
    m.ent(type="solar", id="ca_solar", x=8, y=22, flag="catedral_calor", msg="O mecanismo antigo se aquece: o selo da saída oeste se desfaz!")
    door(m, "ca_porta_oeste", [[1, 24], [1, 25]], opens=["catedral_calor"])
    m.ent(type="exit", x=0, y=24, w=1, h=2, to="catedral_b", spawn="from_a")
    m.ent(type="chest", id="ca_bau_raizes", x=12, y=27, loot={"semente_vida": 1, "essencia_laranja": 1})
    m.ent(type="enemy", kind="fragmento", id="ca_frag2", x=6, y=26, nivel=26)
    return m


# ================================================================== 5. CATEDRAL — ANDAR DAS ÂNCORAS (salas 5–8)
def catedral_b():
    m = C("catedral_b", "Catedral do Vazio — Âncoras e Coro", 56, 44)
    m.rect(34, 22, 20, 14, "д")                     # 5. Sala das Âncoras
    m.rect(34, 26, 20, 6, "ф")                      # vazio entre as bordas
    m.cond.append({"if": "anc_a", "rects": [[42, 29, 3, 3, "ц"]]})
    m.cond.append({"if": "anc_b", "rects": [[42, 26, 3, 3, "ц"]]})
    m.rect(54, 32, 2, 2, "д")
    m.rect(32, 23, 2, 2, "д")                       # corredor para o Coro
    m.rect(12, 20, 20, 16, "л")                     # 6. Coro Velado
    m.rect(17, 20, 11, 16, "ф")                     # fenda do vazio
    m.rect(21, 26, 3, 4, "ы")                       # ilha do portal
    m.cond.append({"if": "coro_marca", "rects": [[24, 27, 4, 1, "я"]]})
    m.rect(14, 16, 2, 4, "д")                       # corredor para a arena
    m.rect(4, 2, 26, 14, "л")                       # 7. arena do Arauto Partido
    m.rect(4, 2, 26, 1, "д")
    for (x, y) in ((8, 5), (25, 5), (8, 12), (25, 12)):
        m.set(x, y, "щ")
    m.rect(30, 8, 4, 2, "д")
    m.rect(34, 4, 14, 10, "д")                      # 8. tesouro + santuário
    m.rect(48, 8, 8, 2, "д")
    m.spawns = {"default": [52, 33], "from_a": [54, 33], "from_rito": [54, 8], "from_elevador": [35, 12]}
    m.ent(type="exit", x=55, y=32, w=1, h=2, to="catedral_a", spawn="from_b")
    m.ent(type="sign", id="placa_ancoras", dialog="placa_ancoras", x=42, y=34)
    # 5. âncoras: cada uma segura metade da ponte de fragmentos (contrapeso local ou Gravito)
    m.ent(type="ancora", id="cb_ancora_a", x=46, y=33, flag="anc_a")
    m.ent(type="crate", id="cb_bloco_a", x=38, y=34)
    m.ent(type="plate", id="cb_placa_a", group="cb_anc_a", x=38, y=32)
    m.puzzles["cb_anc_a"] = {"type": "plates", "flag": "anc_a"}
    m.ent(type="ancora", id="cb_ancora_b", x=49, y=33, flag="anc_b")
    m.ent(type="crate", id="cb_bloco_b", x=51, y=34)
    m.ent(type="plate", id="cb_placa_b", group="cb_anc_b", x=51, y=32)
    m.puzzles["cb_anc_b"] = {"type": "plates", "flag": "anc_b"}
    m.ent(type="enemy", kind="sentinela_prisma", id="cb_sent1", x=44, y=23, nivel=27)
    m.ent(type="chest", id="cb_bau_ancoras", x=52, y=23, loot={"pocao": 2, "fragmento_prisma": 2})
    # 6. coro velado: o Olhar Velado materializa o caminho; o portal marcado cruza o selo
    m.ent(type="sign", id="placa_coro", dialog="placa_coro", x=30, y=30)
    m.ent(type="marca", id="coro_marca", x=28, y=27, flag="coro_marca")
    m.ent(type="portal", id="coro_portal_a", x=22, y=27, par="coro_portal_b")
    m.ent(type="portal", id="coro_portal_b", x=15, y=27, par="coro_portal_a")
    m.ent(type="enemy", kind="escriba", id="cb_esc1", x=14, y=31, nivel=27)
    m.ent(type="segredo", id="coro_estrela", x=30, y=34, flag="estrela_3",
          msg="Pelo vitral quebrado do coro, uma estrela brilha embaixo do chão, no vazio. É a terceira estrela invertida da Mira.")
    m.ent(type="chest", id="cb_bau_coro", x=13, y=34, loot={"essencia_roxa": 1, "tonico_criatura": 1, "fragmentos": 140})
    # 7. arena do Arauto Partido
    m.ent(type="sign", id="placa_arauto", dialog="placa_arauto", x=13, y=22)
    door(m, "cb_porta_arena", [[14, 16], [15, 16]], closes=["tmp_arauto_ativo"])
    m.ent(type="miniboss", boss="arauto", id="arauto", x=17, y=8, x0=4, y0=2, w=26, h=14, flag_done="arauto_morto", flag_active="tmp_arauto_ativo",
          portais=[[7, 4], [26, 4], [7, 13], [26, 13]])
    door(m, "cb_porta_arena_out", [[30, 8], [30, 9]], opens=["arauto_morto"])
    # 8. tesouro + santuário + alavanca do elevador (atalho até a nave)
    m.ent(type="chest", id="cb_bau_tesouro", x=36, y=5, loot={"pocao": 3, "fragmento_prisma": 2, "essencia_laranja": 1, "fragmentos": 180})
    m.ent(type="shrine", id="catedral_tesouro", x=41, y=6)
    m.ent(type="eco_ione", id="eco_ione_3", dialog="eco_ione_3", x=46, y=9, unless_flag="eco_ione_3_visto")
    m.ent(type="lever", id="cb_alavanca_elevador", group="elevador", idx=0, x=45, y=12)
    m.puzzles["elevador"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "catedral_elevador", "dica_apos": 9, "dica": ""}
    m.ent(type="sign", id="placa_elevador_b", dialog="placa_elevador_b", x=38, y=12)
    m.rect(34, 14, 2, 1, "д")
    m.ent(type="exit", x=34, y=14, w=2, h=1, to="catedral_a", spawn="from_elevador", if_flag="catedral_elevador")
    m.ent(type="exit", x=55, y=8, w=1, h=2, to="rito_convergencia", spawn="from_b")
    m.suspense = [[14, 16, 2, 4, "arauto_morto"]]
    return m


# ================================================================== 6. RITO DA CONVERGÊNCIA (prova antes do Rei: os quatro Ecos em salas legíveis)
def rito():
    m = C("rito_convergencia", "Rito da Convergência", 64, 30)
    m.rect(2, 9, 12, 12, "д")                       # 1. apresentação: raiz + brasa
    m.rect(0, 14, 2, 2, "д")
    m.rect(7, 9, 2, 12, "ф")                        # fosso que divide a sala
    m.cond.append({"if": "rc_raiz", "rects": [[7, 14, 2, 2, "э"]]})
    m.rect(14, 14, 1, 2, "ю")                       # cristal na porta (Ruptura Ígnea)
    m.cond.append({"if": "rc_brasa", "rects": [[14, 14, 1, 2, "д"]]})
    m.rect(15, 6, 14, 18, "л")                      # 2. aplicação: visão + portais
    m.rect(20, 6, 4, 18, "ф")                       # fenda
    m.cond.append({"if": "rc_marca", "rects": [[20, 10, 4, 1, "я"]]})
    m.rect(25, 6, 1, 18, "ъ")                       # selo entre a ilha e a saída
    m.rect(24, 6, 1, 18, "л")
    m.rect(29, 14, 3, 2, "д")
    m.rect(32, 4, 18, 22, "д")                      # 3. combinação: os quatro Ecos
    m.rect(36, 4, 10, 22, "ф")                      # vazio que divide a sala
    m.rect(39, 12, 4, 5, "д")                       # ilha central (raiz -> brasa -> visão -> passo)
    m.cond.append({"if": "rc3_raiz", "rects": [[36, 14, 3, 2, "э"]]})
    m.cond.append({"if": "rc3_marca", "rects": [[43, 14, 3, 2, "я"]]})
    m.rect(46, 4, 1, 22, "ж")
    m.rect(46, 14, 1, 2, "λ")                       # fissura (Passo Umbral)
    m.rect(50, 14, 2, 2, "д")
    m.rect(52, 9, 10, 12, "п")                      # 4. altar da Convergência
    m.rect(62, 14, 2, 2, "д")
    m.spawns = {"from_b": [1, 14], "from_c": [62, 14]}
    m.ent(type="exit", x=0, y=14, w=1, h=2, to="catedral_b", spawn="from_rito")
    m.ent(type="exit", x=63, y=14, w=1, h=2, to="catedral_c", spawn="from_rito")
    # 1. apresentação
    m.ent(type="sign", id="rc_placa1", dialog="rc_placa1", x=4, y=11)
    m.ent(type="raiz", id="rc_raiz1", x=6, y=15, flag="rc_raiz")
    m.ent(type="cristal_eco", id="rc_cristal1", x=13, y=15, flag="rc_brasa")
    # 2. visão + portais
    m.ent(type="sign", id="rc_placa2", dialog="rc_placa2", x=17, y=18)
    m.ent(type="rite_reset", id="rc_reset2", x=17, y=8)
    m.ent(type="marca", id="rc_marca2", x=19, y=10, flag="rc_marca", dica_grupo="rc2")
    m.ent(type="portal", id="rc_portal_a", x=24, y=12, par="rc_portal_b")
    m.ent(type="portal", id="rc_portal_b", x=27, y=12, par="rc_portal_a")
    m.ent(type="lever", id="rc_alavanca2", group="rc2", idx=0, x=27, y=20)
    m.puzzles["rc2"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "rc2_ok", "dica_apos": 9,
                        "dica": "Dica: o Olhar Velado mostra o caminho até a ilha; o portal marcado cruza o selo."}
    door(m, "rc_porta2", [[29, 14], [29, 15]], opens=["rc2_ok"])
    # 3. combinação: raiz até a ilha, cristal com brasa, visão até a borda, passo pela fissura
    m.ent(type="sign", id="rc_placa3", dialog="rc_placa3", x=34, y=18)
    m.ent(type="rite_reset", id="rc_reset3", x=34, y=6)
    m.ent(type="raiz", id="rc3_raiz", x=35, y=14, flag="rc3_raiz", dica_grupo="rc3")
    m.ent(type="cristal_eco", id="rc3_cristal", x=41, y=13, flag="rc3_brasa", dica_grupo="rc3")
    m.ent(type="marca", id="rc3_marca", x=42, y=15, flag="rc3_marca", requires="rc3_brasa", dica_grupo="rc3")
    m.ent(type="fissura", id="rc3_fissura", x=45, y=14, to=[47, 14])
    m.ent(type="fissura", id="rc3_fissura_volta", x=47, y=15, to=[45, 15])
    m.ent(type="lever", id="rc_alavanca3", group="rc3", idx=0, x=48, y=10)
    m.puzzles["rc3"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "rc3_ok", "dica_apos": 9,
                        "dica": "Dica: raiz até a ilha; a brasa quebra o cristal que esconde a marca; a visão a materializa; o passo cruza a fissura."}
    door(m, "rc_porta3", [[50, 14], [50, 15]], opens=["rc3_ok"])
    # 4. altar
    m.ent(type="altar", id="rc_altar", x=57, y=11, flag="rito_convergencia_ok", requires="rc3_ok", bond="missao:rito_convergencia",
          loot={"amuleto_convergencia": 1}, lines=["As quatro marcas do altar acendem juntas: raiz, brasa, véu e sombra.",
          "Uma voz que você já ouviu em sonho: \"Quem reúne os Ecos pode devolver o que foi tomado.\"",
          "Você recebeu o AMULETO DA CONVERGÊNCIA: +40 de vida máxima (equipe no inventário)."])
    door(m, "rc_porta4", [[62, 14], [62, 15]], opens=["rito_convergencia_ok"])
    m.ent(type="chest", id="rc_bau_av", x=60, y=19, loot={"semente_vida": 1, "fragmento_prisma": 2})
    return m


# ================================================================== 7. CATEDRAL — CORAÇÃO (preparação, Câmara do Eco, trono do Rei)
def catedral_c():
    m = C("catedral_c", "Catedral do Vazio — Coração do Eco", 60, 46)
    m.rect(2, 32, 12, 9, "д")                       # 9. preparação
    m.rect(0, 35, 2, 2, "д")
    m.rect(14, 35, 4, 2, "д")
    m.rect(18, 28, 20, 15, "л")                     # 10. Câmara do Eco (Ione)
    m.rect(26, 33, 4, 5, "ы")
    m.rect(38, 33, 1, 5, "λ")                       # fissura para a alcova do elo umbral
    m.rect(39, 33, 4, 5, "л")
    m.rect(27, 24, 2, 4, "д")                       # escada para o trono
    m.rect(12, 2, 36, 22, "л")                      # 11. trono do Rei dos Ecos (arena)
    m.rect(28, 2, 4, 22, "п")
    m.rect(12, 12, 36, 2, "п")
    for (x, y) in ((16, 5), (43, 5), (16, 20), (43, 20)):
        m.set(x, y, "щ")
    m.spawns = {"from_rito": [1, 35], "default": [6, 36], "from_vitoria": [29, 26]}
    m.ent(type="exit", x=0, y=35, w=1, h=2, to="rito_convergencia", spawn="from_c")
    m.ent(type="shrine", id="catedral_coracao", x=6, y=34)
    m.ent(type="chest", id="cc_bau_prep", x=11, y=33, loot={"pocao": 3, "tonico_criatura": 2})
    m.ent(type="sign", id="placa_coracao", dialog="placa_coracao", x=4, y=39)
    m.ent(type="eco_ione", id="eco_ione_4", dialog="eco_ione_4", x=16, y=35, unless_flag="eco_ione_4_visto")
    # 10. Câmara do Eco: Ione presa num cristal, quatro elos, cada um cede a um Eco
    m.ent(type="sign", id="placa_elos", dialog="placa_elos", x=20, y=41)
    m.ent(type="cristal_ione", id="cc_cristal_ione", x=28, y=35)
    m.ent(type="elo", id="cc_elo_raiz", eco="raiz_viva", x=22, y=31, flag="elo_raiz")
    m.ent(type="elo", id="cc_elo_brasa", eco="ruptura_ignea", x=34, y=31, flag="elo_brasa")
    m.ent(type="elo", id="cc_elo_velado", eco="olhar_velado", x=22, y=39, flag="elo_velado")
    m.ent(type="elo", id="cc_elo_umbral", eco="passo_umbral", x=41, y=35, flag="elo_umbral")
    m.ent(type="fissura", id="cc_fissura", x=37, y=35, to=[39, 35])
    m.ent(type="fissura", id="cc_fissura_volta", x=39, y=36, to=[37, 36])
    m.ent(type="npc", id="ione_camara", sprite="npc_ione", dialog="ione_camara", x=29, y=38, nome="Mestra Ione", if_flag="ione_livre", unless_flag="rei_morto")
    door(m, "cc_porta_trono", [[27, 27], [28, 27]], opens=["ione_livre"])
    # 11. arena do Rei
    door(m, "cc_porta_arena", [[27, 24], [28, 24]], closes=["tmp_rei_ativo"])
    ruinas = [[[12, 2, 10, 9], [38, 15, 10, 9]], [[38, 2, 10, 9], [12, 15, 10, 9]], [[12, 2, 10, 9], [38, 2, 10, 9], [12, 15, 10, 9], [38, 15, 10, 9]]]
    m.ent(type="boss", boss="rei", id="rei", x=29, y=8, x0=12, y0=2, w=36, h=22, flag_done="rei_morto", flag_active="tmp_rei_ativo",
          focos=[[15, 12], [44, 12]], ruinas=ruinas, firme=[[22, 2, 16, 22], [12, 11, 36, 4]])
    # fase 3: os cantos da arena caem no vazio (flags temporárias do chefe); a cruz central nunca cai
    for i, pat in enumerate(ruinas):
        m.cond.append({"if": "tmp_rei_ruina%d" % i, "rects": [list(r) + ["ф"] for r in pat]})
    m.ent(type="npc", id="ione_arena", sprite="npc_ione", dialog="ione_arena", x=24, y=22, nome="Mestra Ione", if_flag="ione_livre", unless_flag="rei_morto")
    m.suspense = [[18, 28, 20, 15, "ione_livre"]]
    return m


# ================================================================== 8. SALÃO DA HARMONIA (pós-jogo: provas opcionais)
def salao():
    m = C("salao_harmonia", "Salão da Harmonia", 40, 46, music="catedral")
    m.rect(16, 40, 8, 6, "д")                       # entrada (do Acampamento)
    m.rect(8, 28, 24, 11, "л")                      # prova 1: Floresta e Minas
    m.rect(18, 39, 4, 1, "д")
    m.rect(18, 26, 4, 2, "д")
    m.rect(8, 15, 24, 11, "л")                      # prova 2: Pântano e Fortaleza
    m.rect(18, 13, 4, 2, "д")
    m.rect(8, 2, 24, 11, "ы")                       # prova 3: o Vazio
    m.rect(32, 5, 6, 4, "п")                        # arquivo (recompensa)
    m.spawns = {"from_acampamento": [19, 44], "default": [19, 43]}
    m.ent(type="exit", x=16, y=45, w=8, h=1, to="acampamento_aurora", spawn="from_harmonia")
    m.ent(type="sign", id="placa_harmonia", dialog="placa_harmonia", x=17, y=41)
    for i, (y0, ens) in enumerate([(28, [("lobo", 12, 31), ("lobo", 27, 31), ("mineiro", 14, 35), ("automato", 25, 35)]),
                                    (15, [("sapo", 12, 18), ("espectro", 27, 18), ("lanceiro", 14, 22), ("arqueiro", 25, 22)]),
                                    (2, [("escriba", 12, 5), ("escriba", 27, 5), ("sentinela_prisma", 19, 4), ("fragmento", 14, 9), ("armadura", 25, 9)])]):
        enc = "prova%d" % (i + 1)
        for k, (kind, x, y) in enumerate(ens):
            m.ent(type="enemy", kind=kind, id="%s_%d" % (enc, k), x=x, y=y, enc=enc, nivel=28 + i)
        m.ent(type="encounter", id=enc, x=8, y=y0, w=24, h=11, flag_done="prova%d_ok" % (i + 1), flag_active="tmp_prova%d" % (i + 1))
    door(m, "sh_porta1_in", [[18, 39], [19, 39], [20, 39], [21, 39]], closes=["tmp_prova1"])
    door(m, "sh_porta1_out", [[18, 27], [19, 27], [20, 27], [21, 27]], opens=["prova1_ok"])
    door(m, "sh_porta2_out", [[18, 14], [19, 14], [20, 14], [21, 14]], opens=["prova2_ok"])
    door(m, "sh_porta3_out", [[32, 6], [32, 7]], opens=["prova3_ok"], open_char="п")
    m.ent(type="chest", id="sh_bau1", x=30, y=37, loot={"pocao": 2, "essencia_roxa": 1})
    m.ent(type="chest", id="sh_bau2", x=30, y=24, loot={"semente_vida": 1, "essencia_laranja": 1})
    m.ent(type="chest", id="sh_bau3", x=36, y=6, loot={"coroa_harmonia": 1, "fragmentos": 400})
    m.ent(type="spirit_mark", id="sh_arquivo", dialog="arquivo_harmonia", x=35, y=8)
    return m


# ------------------------------------------------------------------ verificação
def bfs_check(m):
    msgs = []
    doors = set()
    for e in m.ents:
        if e["type"] == "door":
            for t in e["tiles"]:
                doors.add(tuple(t))
    # tiles que mecanismos locais podem abrir (condicionais com flag) contam como passáveis
    cond_walk = set()
    for c in m.cond:
        for r in c.get("rects", []):
            if r[4] in WALK:
                for j in range(r[3]):
                    for i in range(r[2]):
                        cond_walk.add((r[0] + i, r[1] + j))
    # travessias do Passo Umbral: fissura -> destino; portal -> um tile abaixo do par
    tele = {}
    byid = {e.get("id"): e for e in m.ents}
    for e in m.ents:
        dest = None
        if e["type"] == "fissura":
            dest = tuple(e["to"])
        elif e["type"] == "portal" and e.get("par") in byid:
            q = byid[e["par"]]
            dest = (q["x"], q["y"] + 1)
        if dest:
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                tele.setdefault((e["x"] + dx, e["y"] + dy), []).append(dest)
    seen = set()
    dq = deque()
    for s in m.spawns.values():
        seen.add(tuple(s)); dq.append(tuple(s))
    while dq:
        x, y = dq.popleft()
        for d in tele.get((x, y), []):
            if d not in seen:
                seen.add(d); dq.append(d)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < m.w and 0 <= ny < m.h and (nx, ny) not in seen:
                c = m.g[ny][nx]
                if c in WALK or (nx, ny) in doors or (nx, ny) in cond_walk:
                    seen.add((nx, ny)); dq.append((nx, ny))
    for e in m.ents:
        t = e["type"]
        if t in ("exit", "door", "encounter", "boss", "miniboss"):
            continue
        p = (e["x"], e["y"])
        ch = m.g[p[1]][p[0]]
        if e.get("id") in OPTIONAL_BEHIND:
            continue
        if ch in SOLID and p not in cond_walk:
            msgs.append(f"  ! {m.id}: {t}/{e.get('id', e.get('kind', ''))} sobre tile sólido '{ch}' em {p}")
            continue
        near = any((p[0] + dx, p[1] + dy) in seen for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)))
        if not near:
            msgs.append(f"  ! {m.id}: {t}/{e.get('id', e.get('kind', ''))} inalcançável em {p}")
    for c in m.cond:
        for r in c.get("rects", []):
            assert 0 <= r[0] and r[0] + r[2] <= m.w and 0 <= r[1] and r[1] + r[3] <= m.h, (m.id, r)
    return msgs


MAPS = [acampamento, escadaria, jardim, catedral_a, catedral_b, rito, catedral_c, salao]


def main():
    maps = [f() for f in MAPS]
    bad = []
    for m in maps:
        for row in m.g:
            assert len(row) == m.w
        with open(os.path.join(OUT, m.id + ".json"), "w", encoding="utf-8") as f:
            json.dump(m.to_json(), f, ensure_ascii=False)
        bad += bfs_check(m)
    print("\n".join(bad) if bad else "mapas da Região 5 ok (alcançabilidade)")
    if "--ascii" in sys.argv:
        for m in maps:
            if len(sys.argv) > 2 and m.id not in sys.argv[2:]:
                continue
            g = [r[:] for r in m.g]
            for e in m.ents:
                if "x" in e and e["type"] not in ("exit", "door", "encounter"):
                    c = {"wild": "W", "enemy": "E", "chest": "C", "npc": "N", "shrine": "@", "lever": "L", "sign": "?", "miniboss": "M", "boss": "B",
                         "espelho": "/", "prisma": "P", "emissor": "*", "cristal": "o", "ancora": "A", "raiz": "R", "cristal_eco": "X", "marca": "~",
                         "circulo": "O", "elo": "&", "cristal_ione": "I", "portal": "0", "fissura": "x", "segredo": "!", "altar": "T", "rite_reset": "r",
                         "brazier": "b", "pickup": "p", "prop": "Q", "anvil": "n", "solar": "S", "crate": "#", "plate": "_", "adorno": "'",
                         "selo_harmonia": "H", "spirit_mark": "$"}.get(e["type"], "!")
                    if 0 <= e["y"] < m.h and 0 <= e["x"] < m.w:
                        g[e["y"]][e["x"]] = c
            print("==", m.id, m.w, m.h)
            print("\n".join("".join(r) for r in g))


if __name__ == "__main__":
    main()
