#!/usr/bin/env python3
"""Desenha os mapas da Região 4 — Fortaleza do Eclipse (layouts manuais, sala a sala).
Saída: data/maps/<mapa>.json. Verifica alcançabilidade das entidades por BFS.
Caracteres de mapa da região: docs/REGIAO4_CONTRATO.md (tiles em assets/src/82_fortaleza.pxl).

Uso: python3 tools/gen_regiao4.py [--ascii [mapa ...]]"""
import json, os, sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_maps import M, OUT  # noqa: E402  (classe de mapa compartilhada com os capítulos 1 e 2)

REGION = "fortaleza"
# piso: β pedra azulada, γ dourado, ψ jardim, ξ ponte espiritual, ι grade aberta, ε escada, σ sombra, α luz, Λ/Σ plataformas, μ montanha, τ tapete
WALK = set("βγψξιεσαΛΣμτ")
# sólidos: ω muralha, Ω ameia, φ sebe, Φ canteiro, θ abismo, λ fissura, ζ grade, π pilar, Δ/Ψ plataformas apagadas, κ névoa, ρ telhado, ν casa, Μ rocha
SOLID = set("ωΩφΦθλζπΔΨκρνΜ")
# entidades que ficam de propósito atrás de obstáculos opcionais (névoa só do Ventisco, fissuras do Passo Umbral, ilha da hélice...)
OPTIONAL_BEHIND = {"refugio_bau_nicho", "refugio_bau_umbral", "refugio_fissura_volta", "jardins_bau_ilha", "muralha_bau_umbral", "muralha_fissura_volta",
                   "tb_bau_nevoa", "rito_av_espelho", "rito_av_receptor", "rito_av_lente", "rito_av_portal_a", "rito_av_portal_b", "rito_av_altar", "rito_fissura_volta",
                   "jardins_helice_ilha", "estrada_fissura_volta", "estrada_selo"}


def F(mid, name, w, h, fill="ω", music="fortaleza", safe=False):
    return M(mid, name, w, h, fill=fill, music=music, region=REGION, safe=safe)


def house(m, x, y, w):
    """casa do Refúgio: telhado de ardósia violeta (2 linhas) + parede de pedra com porta e janelas"""
    m.rect(x, y, w, 2, "ρ")
    m.rect(x, y + 2, w, 1, "ν")


def door(m, did, tiles, opens=None, closes=None, closed="ζ", open_char="β"):
    d = {"type": "door", "id": did, "tiles": tiles, "closed_char": closed, "open_char": open_char}
    if opens:
        d["open_flags"] = opens
    if closes:
        d["close_flags"] = closes
    m.ents.append(d)


# ================================================================== 1. PONTE ESPIRITUAL (transição; entrada da região)
def ponte():
    m = F("ponte_espiritual", "Ponte Espiritual", 40, 24, fill="Μ")
    m.rect(1, 6, 12, 13, "μ")                       # platô oeste (chegada do Pântano)
    m.rect(0, 11, 1, 3, "μ")                        # passagem oeste (gancho da Região 3)
    m.rect(13, 3, 14, 18, "θ")                      # abismo entre os picos
    m.rect(27, 6, 12, 13, "μ")                      # platô leste
    m.rect(39, 11, 1, 3, "μ")
    for (x, y) in ((3, 7), (10, 17), (30, 7), (36, 17)):
        m.set(x, y, "Μ")
    # a ponte só existe para quem tem o Olhar Velado (Eco da Região 3)
    m.cond.append({"eco": "olhar_velado", "rects": [[13, 11, 14, 2, "ξ"]]})
    m.spawns = {"default": [4, 12], "from_pantano": [2, 12], "from_refugio": [37, 12]}
    m.ent(type="shrine", id="ponte", x=5, y=9)
    m.ent(type="sign", id="placa_ponte", dialog="placa_ponte", x=11, y=10)
    m.ent(type="sign", id="placa_ponte_leste", dialog="placa_ponte_leste", x=29, y=10)
    m.ent(type="enemy", kind="arqueiro", id="pe_arq1", x=33, y=8, nivel=14)
    m.ent(type="chest", id="ponte_bau", x=36, y=15, loot={"pocao": 2, "selo_refinado": 2})
    m.ent(type="exit", x=39, y=11, w=1, h=3, to="refugio_muralha", spawn="from_ponte")
    m.ent(type="exit", x=0, y=11, w=1, h=3, to="porto_lanternas", spawn="from_muralha")   # volta ao Pântano (Região 3)
    return m


# ================================================================== 2. REFÚGIO DA MURALHA (núcleo seguro)
def refugio():
    m = F("refugio_muralha", "Refúgio da Muralha", 48, 36, safe=True)
    m.rect(3, 3, 41, 30, "β")                       # pátio (x 3..43, y 3..32)
    m.rect(3, 2, 41, 1, "Ω")                        # ameias do muro norte
    m.rect(22, 0, 4, 3, "β")                        # portão norte: Estrada Final
    m.rect(0, 16, 3, 3, "β")                        # portão oeste: Ponte Espiritual
    m.rect(44, 16, 4, 3, "β")                       # portão leste: Muralha Partida
    m.rect(22, 33, 4, 3, "β")                       # portão sul: Jardins Suspensos
    m.rect(0, 6, 3, 2, "β")                         # passagem da torre (atalho; abre por dentro da torre)
    m.rect(17, 13, 14, 10, "γ")                     # praça dourada
    for (x, y) in ((17, 13), (30, 13), (17, 22), (30, 22)):
        m.set(x, y, "π")
    house(m, 5, 4, 7)                               # casa da Capitã
    house(m, 14, 4, 6)                              # casa da Tália e do Lume
    house(m, 34, 4, 8)                              # quartel da guarnição
    m.rect(5, 24, 10, 7, "ψ")                       # jardim da Tália
    for x in (5, 14):
        for y in range(24, 31):
            m.set(x, y, "φ")
    m.set(5, 27, "ψ"); m.set(14, 27, "ψ")
    m.set(7, 24, "Φ"); m.set(12, 24, "Φ")
    m.rect(17, 30, 4, 2, "τ")
    # nicho escondido no muro leste (segredo por observação: o ar frio entre as pedras)
    m.rect(0, 27, 2, 3, "β")
    m.cond.append({"if": "refugio_nicho", "rects": [[2, 28, 1, 1, "β"]]})
    # sala lacrada por uma fissura (segredo de revisita: Passo Umbral)
    m.rect(37, 26, 7, 1, "ω"); m.rect(37, 27, 1, 5, "ω")
    m.rect(38, 27, 6, 5, "σ")
    m.rect(37, 32, 7, 1, "ω")
    m.set(40, 26, "λ")
    m.spawns = {"default": [24, 25], "from_ponte": [2, 17], "from_jardins": [23, 31], "from_muralha": [45, 17], "from_estrada": [23, 2],
                "from_torre": [3, 7], "from_vitoria": [24, 25]}
    m.ent(type="shrine", id="refugio", x=24, y=17)
    m.ent(type="sign", id="placa_refugio", dialog="placa_refugio", x=20, y=24)
    m.ent(type="prop", id="quadro_refugio", sheet="quadro_refugio", frame=0, x=32, y=16, solid=True, contratos=True)
    # rotinas: a Capitã muda de lugar quando a guarnição volta
    m.ent(type="npc", id="ilse", sprite="npc_muralha1", dialog="ilse", x=22, y=15, nome="Capitã Ilse", unless_flag="cavaleiro_morto")
    m.ent(type="npc", id="ilse_portao", sprite="npc_muralha1", dialog="ilse", x=21, y=4, nome="Capitã Ilse", if_flag="cavaleiro_morto")
    m.ent(type="npc", id="talia", sprite="npc_muralha2", dialog="talia", x=9, y=26, nome="Tália")
    m.ent(type="npc", id="lume", sprite="npc_muralha3", dialog="lume", x=27, y=20, nome="Lume", unless_flag="recado_entregue")
    m.ent(type="npc", id="lume_quartel", sprite="npc_muralha3", dialog="lume", x=38, y=8, nome="Lume", if_flag="recado_entregue")
    m.ent(type="npc", id="odo", sprite="npc_forja2", dialog="odo", x=12, y=17, nome="Odo, o mascate")
    m.ent(type="npc", id="soldado1", sprite="npc_guarnicao", dialog="soldado", x=19, y=9, nome="Soldado da guarnição", if_flag="cavaleiro_morto")
    m.ent(type="npc", id="soldado2", sprite="npc_guarnicao", dialog="soldado2", x=28, y=9, nome="Soldado da guarnição", if_flag="cavaleiro_morto")
    m.ent(type="npc", id="soldado3", sprite="npc_guarnicao", dialog="soldado", x=40, y=12, nome="Soldado da guarnição", if_flag="cavaleiro_morto")
    m.ent(type="anvil", id="refugio_bigorna", x=9, y=8)
    m.ent(type="segredo", id="refugio_ar_frio", x=3, y=28, flag="refugio_nicho",
          msg="Um fio de ar frio sai entre duas pedras da muralha. Você empurra a pedra solta: um nicho escondido!")
    m.ent(type="chest", id="refugio_bau_nicho", x=1, y=28, loot={"semente_vida": 1, "lente_observatorio": 1})
    m.ent(type="fissura", id="refugio_fissura", x=40, y=25, to=[40, 28])
    m.ent(type="fissura", id="refugio_fissura_volta", x=41, y=27, to=[41, 25])
    m.ent(type="chest", id="refugio_bau_umbral", x=42, y=30, loot={"brasa_solar": 2, "essencia_roxa": 1, "selo_refinado": 2})
    door(m, "portao_estrada", [[22, 1], [23, 1], [24, 1], [25, 1]], opens=["cavaleiro_morto"])
    door(m, "portao_torre", [[2, 6], [2, 7]], opens=["torre_atalho"])
    m.ent(type="exit", x=22, y=0, w=4, h=1, to="estrada_final", spawn="from_refugio", if_flag="cavaleiro_morto")
    m.ent(type="exit", x=0, y=16, w=1, h=3, to="ponte_espiritual", spawn="from_refugio")
    m.ent(type="exit", x=47, y=16, w=1, h=3, to="muralha_partida", spawn="from_refugio")
    m.ent(type="exit", x=22, y=35, w=4, h=1, to="jardins_suspensos", spawn="from_refugio")
    m.ent(type="exit", x=0, y=6, w=1, h=2, to="torre_a", spawn="from_atalho", if_flag="torre_atalho")
    return m


# ================================================================== 3. JARDINS SUSPENSOS (rota 1: hélices, névoa, Ventisco)
def jardins():
    m = F("jardins_suspensos", "Jardins Suspensos", 56, 40, fill="θ")
    m.rect(22, 0, 10, 8, "ψ")                       # T1: terraço de chegada
    m.rect(24, 0, 6, 8, "β")
    m.rect(26, 8, 2, 3, "ε")                        # escada
    m.rect(16, 11, 22, 9, "ψ")                      # T2: Ninho dos Ventos
    m.rect(24, 11, 6, 9, "β")
    for (x, y) in ((16, 11), (37, 11), (16, 19), (37, 19)):
        m.set(x, y, "Φ")
    for x in range(18, 23):
        m.set(x, 13, "φ")
    m.rect(24, 20, 6, 2, "κ")                       # névoa cortante (barreira)
    m.rect(14, 22, 26, 10, "ψ")                     # T3: terraço dos arqueiros
    m.rect(14, 26, 26, 3, "β")
    m.set(14, 22, "Φ"); m.set(39, 22, "Φ"); m.set(39, 31, "Φ")
    m.rect(4, 28, 10, 4, "β")                       # passarela para a torre
    m.rect(0, 28, 4, 4, "β")
    m.rect(44, 15, 6, 6, "ψ")                       # ilha da hélice (opcional: só o vento a alcança)
    m.cond.append({"if": "jardins_ilha", "rects": [[38, 18, 6, 2, "β"]]})
    m.spawns = {"default": [26, 3], "from_refugio": [26, 1], "from_torre": [2, 29]}
    m.ent(type="exit", x=24, y=0, w=6, h=1, to="refugio_muralha", spawn="from_jardins")
    m.ent(type="exit", x=0, y=28, w=1, h=4, to="torre_a", spawn="from_jardins")
    m.ent(type="sign", id="placa_jardins", dialog="placa_jardins", x=23, y=5)
    m.ent(type="sign", id="placa_helices", dialog="placa_helices", x=22, y=17)
    # hélice + manivela: o vento dos dutos dispersa a névoa; o Ventisco também dispersa direto
    m.ent(type="helice", id="jardins_helice", x=19, y=18, flag="jardins_vento", msg="A hélice gira e o vento sopra a névoa cortante para fora do terraço!")
    m.ent(type="manivela", id="jardins_manivela", x=21, y=18, helice="jardins_vento")
    m.ent(type="nevoa", id="jardins_nevoa", x=27, y=19, flag="jardins_vento")
    m.ent(type="manivela", id="jardins_manivela_sul", x=22, y=23, helice="jardins_vento")   # quem chega pela torre gira do lado de baixo
    door(m, "jardins_nevoa_d", [[x, y] for y in (20, 21) for x in range(24, 30)], opens=["jardins_vento"], closed="κ")
    # Ventisco: habitat fixo no Ninho dos Ventos (reaparece ao descansar)
    m.ent(type="wild", id="j_ventisco1", species="ventisco", level=14, x=32, y=14)
    m.ent(type="wild", id="j_ventisco2", species="ventisco", level=14, x=34, y=16)
    m.ent(type="wild", id="j_ventisco3", species="ventisco", level=15, x=31, y=17)
    # descoberta de criatura: o anel de flores onde os Ventiscos dançam
    m.ent(type="segredo", id="jardins_anel", x=20, y=15, flag="jardins_flores",
          msg="As flores deste canteiro formam um anel perfeito, e as penas giram sobre ele sem vento... Um Ventisco mais velho pousa no centro!")
    m.ent(type="wild", id="j_ventisco_anel", species="ventisco", level=16, x=20, y=16, if_flag="jardins_flores")
    m.ent(type="pickup", id="pluma1", item="pluma_vento", sheet="icons_fortaleza", frame=0, flag="pluma1_pega", x=35, y=12, unless_flag="pluma1_pega")
    m.ent(type="pickup", id="pluma2", item="pluma_vento", sheet="icons_fortaleza", frame=0, flag="pluma2_pega", x=37, y=30, unless_flag="pluma2_pega")
    m.ent(type="pickup", id="pluma3", item="pluma_vento", sheet="icons_fortaleza", frame=0, flag="pluma3_pega", x=16, y=30, unless_flag="pluma3_pega")
    m.ent(type="enemy", kind="arqueiro", id="j_arq1", x=18, y=24, nivel=15)
    m.ent(type="enemy", kind="arqueiro", id="j_arq2", x=36, y=24, nivel=15)
    m.ent(type="enemy", kind="lanceiro", id="j_lan1", x=10, y=29, nivel=15, posto=[1, 0])
    # hélice da ilha: longe demais para a mão, perto o bastante para uma rajada
    m.ent(type="helice", id="jardins_helice_ilha", x=40, y=16, flag="jardins_ilha", msg="A rajada gira a hélice da ilha: uma passarela de pedra se ergue do abismo!")
    m.ent(type="chest", id="jardins_bau_ilha", x=47, y=17, loot={"pena_lumen": 1, "selo_refinado": 2, "essencia_roxa": 1})
    m.ent(type="chest", id="jardins_bau1", x=15, y=23, loot={"pocao": 2, "fragmentos": 80})
    # bilhete ambiental (docs/HISTORIA.md)
    m.ent(type="decor", id="bilhete_jardineira", sheet="bilhetes", frame=2, dialog="bilhete_jardineira", x=30, y=5)
    return m


# ================================================================== 4. MURALHA PARTIDA (rota 2: lanceiros, frestas, mecanismos antigos, balestra)
def muralha():
    m = F("muralha_partida", "Muralha Partida", 56, 40, fill="θ")
    m.rect(0, 18, 20, 4, "β")                       # W1: passarela oeste
    m.rect(0, 17, 20, 1, "Ω"); m.rect(0, 22, 20, 1, "Ω")
    m.set(12, 22, "β")
    m.rect(8, 23, 8, 5, "β")                        # respiros quentes da forja antiga (Brasardo)
    m.rect(20, 17, 4, 6, "θ")                       # brecha da muralha (ponte levadiça)
    m.cond.append({"if": "muralha_ponte", "rects": [[20, 19, 4, 2, "β"]]})
    m.rect(24, 16, 14, 8, "β")                      # W2: pátio das ameias
    m.rect(24, 15, 14, 1, "Ω")
    m.rect(24, 22, 9, 2, "σ")                       # sombra das ameias (Umbrel)
    m.rect(27, 24, 2, 4, "ε")                       # escada para a plataforma sul
    m.rect(24, 28, 16, 6, "β")                      # plataforma sul (desvio da alavanca)
    m.rect(38, 16, 1, 8, "ω")                       # muro com grade e fresta
    door(m, "muralha_grade", [[38, 18], [38, 19], [38, 20], [38, 21]], opens=["muralha_portao"])
    m.rect(39, 14, 14, 10, "β")                     # W3: bastião leste
    m.rect(47, 16, 4, 4, "θ")                       # fosso do bastião
    m.rect(46, 0, 4, 14, "β")                       # subida para a torre
    m.rect(45, 0, 1, 14, "Ω"); m.rect(50, 0, 1, 14, "Ω")
    door(m, "muralha_portao_torre", [[46, 13], [47, 13], [48, 13], [49, 13]], opens=["muralha_receptor"])
    m.ent(type="lever", id="muralha_alavanca_norte", group="muralha_norte", idx=0, x=47, y=11)   # do lado da torre, a grade abre por dentro
    m.puzzles["muralha_norte"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "muralha_receptor", "dica_apos": 9, "dica": ""}
    # sala atrás da fissura (segredo de revisita)
    m.rect(40, 28, 1, 6, "ω"); m.rect(41, 28, 1, 6, "λ")
    m.rect(42, 28, 5, 5, "σ")
    m.spawns = {"default": [3, 19], "from_refugio": [1, 19], "from_torre": [47, 1]}
    m.ent(type="exit", x=0, y=18, w=1, h=4, to="refugio_muralha", spawn="from_muralha")
    m.ent(type="exit", x=46, y=0, w=4, h=1, to="torre_a", spawn="from_muralha")
    m.ent(type="sign", id="placa_muralha", dialog="placa_muralha", x=4, y=20)
    m.ent(type="enemy", kind="lanceiro", id="m_lan1", x=16, y=19, nivel=15, posto=[-1, 0])
    # ponte levadiça: mecanismo antigo frio (braseiro ao lado; Brasardo reaquece direto)
    m.ent(type="solar", id="muralha_solar", x=18, y=21, flag="muralha_ponte", msg="O mecanismo antigo range, aquecido: a ponte levadiça desce sobre a brecha!")
    m.ent(type="brazier", id="muralha_braseiro", x=12, y=24)
    m.ent(type="sign", id="placa_solar", dialog="placa_solar", x=15, y=23)
    m.ent(type="wild", id="m_brasardo1", species="brasardo", level=14, x=10, y=25)
    m.ent(type="wild", id="m_brasardo2", species="brasardo", level=15, x=13, y=26)
    m.ent(type="wild", id="m_umbrel1", species="umbrel", level=14, x=26, y=23)
    m.ent(type="wild", id="m_umbrel2", species="umbrel", level=15, x=29, y=22)
    m.ent(type="wild", id="m_umbrel3", species="umbrel", level=14, x=31, y=23)
    m.ent(type="enemy", kind="arqueiro", id="m_arq1", x=34, y=17, nivel=15)
    # fresta: o Umbrel entra e aciona a grade por dentro; sem ele, a alavanca no fim da plataforma sul
    m.ent(type="fresta", id="muralha_fresta", x=38, y=17, flag="muralha_portao")
    m.ent(type="sign", id="placa_fresta", dialog="placa_fresta", x=35, y=20)
    m.ent(type="lever", id="muralha_alavanca", group="muralha_grade", idx=0, x=37, y=32)
    m.puzzles["muralha_grade"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "muralha_portao", "dica_apos": 9, "dica": ""}
    m.ent(type="enemy", kind="armadura", id="m_arm1", x=32, y=30, nivel=16)
    m.ent(type="enemy", kind="lanceiro", id="m_lan2", x=29, y=31, nivel=15, posto=[0, -1])
    m.ent(type="chest", id="muralha_bau_diario", x=25, y=32, loot={"diario_guarnicao": 1, "pocao": 2})
    # bastião: balestra e receptor de disparo do outro lado do fosso
    m.ent(type="balestra", id="muralha_balestra", x=41, y=18, dir=[1, 0])
    m.ent(type="receptor", id="muralha_receptor", group="bastiao", ativa="disparo", x=52, y=18)
    m.puzzles["bastiao"] = {"type": "receptores", "flag": "muralha_receptor", "msg": "O virote acerta o receptor: a grade da subida para a torre se ergue!"}
    m.ent(type="sign", id="placa_balestra", dialog="placa_balestra", x=42, y=21)
    m.ent(type="enemy", kind="arqueiro", id="m_arq2", x=44, y=22, nivel=16)
    m.ent(type="fissura", id="muralha_fissura", x=39, y=30, to=[43, 30])
    m.ent(type="fissura", id="muralha_fissura_volta", x=42, y=31, to=[39, 31])
    m.ent(type="chest", id="muralha_bau_umbral", x=45, y=29, loot={"essencia_laranja": 1, "brasa_solar": 1, "semente_vida": 1})
    # bilhete ambiental (docs/HISTORIA.md)
    m.ent(type="decor", id="bilhete_soldado", sheet="bilhetes", frame=0, dialog="bilhete_soldado", x=9, y=18)
    return m


# ================================================================== 5. TORRE DAS DUAS SOMBRAS — BASE (salas 1–4)
def torre_a():
    m = F("torre_a", "Torre das Duas Sombras — Salão do Eclipse", 60, 44, music="masmorra")
    m.rect(24, 32, 12, 8, "β")                      # 1. átrio (seguro)
    m.rect(0, 35, 24, 2, "β"); m.rect(36, 35, 24, 2, "β")
    m.rect(29, 28, 2, 4, "β")
    m.rect(18, 14, 24, 14, "γ")                     # 2. Salão do Eclipse (sala central)
    m.rect(28, 14, 4, 14, "τ")
    for (x, y) in ((21, 18), (38, 18), (21, 23), (38, 23)):
        m.set(x, y, "π")
    m.rect(19, 26, 3, 1, "α"); m.rect(33, 15, 3, 1, "α")
    m.rect(29, 12, 2, 2, "β")                       # corredor para a galeria
    m.rect(18, 2, 24, 10, "β")                      # 3. Galeria dos Lanceiros (encontro)
    m.rect(29, 0, 2, 2, "β")
    for (x, y) in ((20, 4), (39, 4), (20, 9), (39, 9)):
        m.set(x, y, "π")
    m.rect(16, 20, 2, 2, "β")                       # 4. Ala da Sombra (oeste)
    m.rect(2, 13, 14, 15, "θ")
    m.rect(14, 19, 2, 4, "β")                       # beirada leste
    m.rect(8, 19, 3, 3, "β")                        # ilhota central
    m.rect(3, 14, 8, 2, "β")                        # beirada oeste (alavanca do atalho)
    m.rect(0, 14, 3, 2, "β")                        # passagem do atalho ao Refúgio
    # plataformas: de luz com o sol (sem eclipse), de sombra com a lua (eclipse)
    m.rect(11, 20, 3, 1, "Λ")
    m.rect(9, 16, 1, 3, "Ψ")
    m.cond.append({"if": "torre_eclipse", "rects": [[11, 20, 3, 1, "Δ"], [9, 16, 1, 3, "Σ"]]})
    m.spawns = {"default": [30, 37], "from_jardins": [1, 35], "from_muralha": [58, 35], "from_b": [29, 1], "from_atalho": [1, 14]}
    m.ent(type="exit", x=0, y=35, w=1, h=2, to="jardins_suspensos", spawn="from_torre")
    m.ent(type="exit", x=59, y=35, w=1, h=2, to="muralha_partida", spawn="from_torre")
    m.ent(type="shrine", id="torre_atrio", x=30, y=34)
    m.ent(type="sign", id="placa_torre", dialog="placa_torre", x=26, y=33)
    # 2. salão: feixe da lente -> espelho -> espelho -> persiana -> receptor
    m.ent(type="sign", id="placa_espelhos", dialog="placa_espelhos", x=33, y=26)
    m.ent(type="lente", id="ta_lente", x=19, y=16, dir=[1, 0])
    m.ent(type="espelho", id="ta_espelho1", x=27, y=16, ori="a")
    m.ent(type="espelho", id="ta_espelho2", x=27, y=24, ori="a")
    m.ent(type="persiana", id="ta_persiana", x=33, y=24, aberta=False)
    m.ent(type="receptor", id="ta_receptor", group="salao", x=40, y=24)
    m.puzzles["salao"] = {"type": "receptores", "flag": "salao_luz", "msg": "A luz alcança o cristal do salão: a porta norte se ergue!"}
    door(m, "ta_porta_salao", [[29, 13], [30, 13]], opens=["salao_luz"])
    # 3. galeria
    m.ent(type="enemy", kind="lanceiro", id="ta_lan1", x=24, y=6, enc="galeria_t", nivel=16)
    m.ent(type="enemy", kind="lanceiro", id="ta_lan2", x=35, y=6, enc="galeria_t", nivel=16)
    m.ent(type="enemy", kind="arqueiro", id="ta_arq1", x=30, y=3, enc="galeria_t", nivel=16)
    m.ent(type="encounter", id="galeria_t", x=18, y=2, w=24, h=10, flag_done="enc_galeria_t_ok", flag_active="tmp_enc_galeria_t")
    door(m, "ta_porta_gal_in", [[29, 12], [30, 12]], closes=["tmp_enc_galeria_t"])
    door(m, "ta_porta_gal_out", [[29, 1], [30, 1]], opens=["enc_galeria_t_ok"])
    m.ent(type="chest", id="ta_bau_galeria", x=40, y=3, loot={"lasca_umbral": 2, "pocao": 1})
    m.ent(type="exit", x=29, y=0, w=2, h=1, to="torre_b", spawn="from_a")
    # 4. ala da sombra: alternar sol e lua para atravessar; alavanca do atalho ao Refúgio
    m.ent(type="sign", id="placa_ala_sombra", dialog="placa_ala_sombra", x=15, y=22)
    m.ent(type="eclipse", id="ta_eclipse1", x=14, y=22, flag="torre_eclipse")
    m.ent(type="eclipse", id="ta_eclipse2", x=8, y=21, flag="torre_eclipse")
    m.ent(type="lever", id="ta_alavanca_atalho", group="atalho_torre", idx=0, x=4, y=14)
    m.puzzles["atalho_torre"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "torre_atalho", "dica_apos": 9, "dica": ""}
    door(m, "ta_porta_atalho", [[2, 14], [2, 15]], opens=["torre_atalho"])
    m.ent(type="chest", id="ta_bau_sombra", x=8, y=14, loot={"tonico_criatura": 2, "essencia_roxa": 1, "fragmentos": 90})
    m.ent(type="exit", x=0, y=14, w=1, h=2, to="refugio_muralha", spawn="from_torre", if_flag="torre_atalho")
    return m


# ================================================================== 6. TORRE — ANDAR MÉDIO (salas 5–8)
def torre_b():
    m = F("torre_b", "Torre das Duas Sombras — Hélices e Gêmeos", 56, 44, music="masmorra")
    m.rect(22, 34, 12, 8, "β")                      # 5. Câmara das Hélices
    m.rect(27, 42, 2, 2, "β")
    m.rect(27, 30, 2, 4, "β")
    door(m, "tb_nevoa", [[27, 32], [28, 32], [27, 33], [28, 33]], opens=["torre_vento"], closed="κ")
    m.rect(34, 37, 2, 1, "β")                       # passagem lateral (névoa só do Ventisco)
    m.rect(36, 35, 6, 4, "β")
    door(m, "tb_nevoa2", [[34, 37], [35, 37]], opens=["torre_vento2"], closed="κ")
    m.rect(14, 18, 28, 12, "β")                     # 6. Sala dos Receptores
    m.rect(14, 23, 28, 2, "τ")
    for (x, y) in ((20, 22), (35, 22), (20, 26), (35, 26)):
        m.set(x, y, "π")
    m.rect(27, 15, 2, 3, "β")                       # corredor para a arena
    m.rect(14, 2, 28, 13, "γ")                      # 7. Arena dos Gêmeos de Ferro
    m.rect(42, 7, 2, 2, "β")
    m.rect(44, 3, 10, 9, "β")                       # 8. Tesouro e santuário
    m.rect(54, 7, 2, 2, "β")
    m.spawns = {"default": [27, 40], "from_a": [27, 41], "from_rito": [53, 7]}
    m.ent(type="exit", x=27, y=43, w=2, h=1, to="torre_a", spawn="from_b")
    m.ent(type="sign", id="placa_helices_torre", dialog="placa_helices_torre", x=23, y=40)
    m.ent(type="helice", id="tb_helice", x=24, y=35, flag="torre_vento", msg="As pás da torre giram: o vento dos dutos rasga a névoa do corredor norte!")
    m.ent(type="manivela", id="tb_manivela", x=26, y=36, helice="torre_vento")
    m.ent(type="nevoa", id="tb_nevoa_ent", x=28, y=34, flag="torre_vento")
    m.ent(type="nevoa", id="tb_nevoa_lado", x=33, y=37, flag="torre_vento2")
    m.ent(type="chest", id="tb_bau_nevoa", x=40, y=36, loot={"guizo_eco": 1, "essencia_roxa": 1, "selo_refinado": 2})
    # 6. receptores: um de luz (persiana) e um de disparo (balestra) — os dois abrem a porta da arena
    m.ent(type="sign", id="placa_receptores", dialog="placa_receptores", x=16, y=28)
    m.ent(type="balestra", id="tb_balestra", x=15, y=20, dir=[1, 0])
    m.ent(type="receptor", id="tb_rec_disparo", group="receptores_tb", ativa="disparo", x=40, y=20)
    m.ent(type="lente", id="tb_lente", x=15, y=27, dir=[1, 0])
    m.ent(type="persiana", id="tb_persiana", x=28, y=27, aberta=False)
    m.ent(type="receptor", id="tb_rec_luz", group="receptores_tb", x=40, y=27)
    m.puzzles["receptores_tb"] = {"type": "receptores", "flag": "torre_receptores", "msg": "Os dois cristais brilham: a grade para a arena dos Gêmeos se ergue!"}
    m.ent(type="enemy", kind="armadura", id="tb_arm1", x=24, y=21, nivel=16)
    m.ent(type="enemy", kind="armadura", id="tb_arm2", x=33, y=27, nivel=16)
    door(m, "tb_porta_receptores", [[27, 17], [28, 17]], opens=["torre_receptores"])
    # 7. arena
    m.ent(type="sign", id="placa_gemeos", dialog="placa_gemeos", x=25, y=19)
    door(m, "tb_porta_arena", [[27, 15], [28, 15]], closes=["tmp_gemeos_ativo"])
    m.ent(type="miniboss", boss="gemeos", id="gemeos", x=22, y=8, gemeo=[34, 8], x0=14, y0=2, w=28, h=13,
          flag_done="gemeos_morto", flag_active="tmp_gemeos_ativo")
    door(m, "tb_porta_arena_out", [[42, 7], [42, 8]], opens=["gemeos_morto"])
    # 8. tesouro
    m.ent(type="chest", id="tb_bau_tesouro", x=46, y=5, loot={"pocao": 3, "lasca_umbral": 2, "essencia_laranja": 1, "fragmentos": 150})
    m.ent(type="shrine", id="torre_tesouro", x=50, y=5)
    m.ent(type="exit", x=55, y=7, w=1, h=2, to="rito_eclipse", spawn="from_b")
    m.suspense = [[27, 15, 2, 3, "gemeos_morto"]]
    return m


# ================================================================== 7. RITO DO ECLIPSE (prova antes do Cavaleiro + ala avançada pós-chefão)
def rito():
    m = F("rito_eclipse", "Rito do Eclipse", 60, 30, music="masmorra")
    m.rect(2, 10, 12, 10, "β")                      # 1. apresentação segura
    m.rect(0, 14, 2, 2, "β"); m.rect(14, 14, 2, 2, "β")
    m.rect(16, 6, 14, 18, "β")                      # 2. aplicação: espelhos
    m.rect(30, 14, 3, 2, "β")
    m.rect(33, 6, 16, 18, "β")                      # 3. combinação: luz, sombra e plataformas
    m.rect(37, 8, 8, 14, "θ")
    m.rect(40, 13, 3, 3, "β")                       # ilhota no abismo
    m.rect(37, 15, 3, 1, "Λ")
    m.rect(43, 15, 2, 1, "Ψ")
    m.cond.append({"if": "tmp_rito_lua", "rects": [[37, 15, 3, 1, "Δ"], [43, 15, 2, 1, "Σ"]]})
    m.rect(49, 14, 2, 2, "β")
    m.rect(51, 10, 7, 10, "γ")                      # 4. conclusão (altar)
    m.rect(58, 14, 2, 2, "β")
    m.rect(50, 2, 9, 5, "σ")                        # 5. rito avançado (fissura; Passo Umbral)
    m.rect(55, 2, 1, 5, "ω")
    m.set(54, 7, "λ"); m.set(54, 8, "λ"); m.set(54, 9, "λ")
    m.spawns = {"from_b": [1, 14], "from_c": [58, 14]}
    m.ent(type="exit", x=0, y=14, w=1, h=2, to="torre_b", spawn="from_rito")
    m.ent(type="exit", x=59, y=14, w=1, h=2, to="torre_c", spawn="from_rito")
    # 1. apresentação: um feixe, uma persiana, um receptor
    m.ent(type="sign", id="rito_e_placa1", dialog="rito_e_placa1", x=4, y=17)
    m.ent(type="lente", id="re_lente1", x=3, y=12, dir=[1, 0])
    m.ent(type="persiana", id="re_persiana1", x=8, y=12, aberta=False)
    m.ent(type="receptor", id="re_receptor1", group="rito_e1", x=12, y=12)
    m.puzzles["rito_e1"] = {"type": "receptores", "flag": "rito_e1_ok", "msg": "O primeiro cristal do rito acende."}
    door(m, "re_porta1", [[14, 14], [14, 15]], opens=["rito_e1_ok"])
    # 2. aplicação: dois espelhos levam o feixe à volta da sala
    m.ent(type="sign", id="rito_e_placa2", dialog="rito_e_placa2", x=17, y=17)
    m.ent(type="rite_reset", id="re_reset2", x=17, y=13)
    m.ent(type="lente", id="re_lente2", x=17, y=7, dir=[1, 0])
    m.ent(type="espelho", id="re_espelho2a", x=27, y=7, ori="a", dica_grupo="rito_e2")
    m.ent(type="espelho", id="re_espelho2b", x=27, y=21, ori="b", dica_grupo="rito_e2")
    m.ent(type="receptor", id="re_receptor2", group="rito_e2", x=18, y=21)
    m.puzzles["rito_e2"] = {"type": "receptores", "flag": "rito_e2_ok", "msg": "Os espelhos levam a luz ao cristal: a porta do rito cede.", "dica_apos": 3,
                            "dica": "Dica: o primeiro espelho deve mandar a luz para baixo; o segundo, para a esquerda."}
    door(m, "re_porta2", [[30, 14], [30, 15]], opens=["rito_e2_ok"])
    # 3. combinação: com sol, as plataformas de luz levam à ilhota (abra a persiana); com lua, as de sombra levam à saída
    m.ent(type="sign", id="rito_e_placa3", dialog="rito_e_placa3", x=34, y=17)
    m.ent(type="rite_reset", id="re_reset3", x=34, y=10)
    m.ent(type="lente", id="re_lente3", x=34, y=14, dir=[1, 0], fase="sol", eclipse="tmp_rito_lua")
    m.ent(type="persiana", id="re_persiana3", x=41, y=14, aberta=False, dica_grupo="rito_e3")
    m.ent(type="eclipse", id="re_eclipse3", x=42, y=13, flag="tmp_rito_lua", dica_grupo="rito_e3")
    m.ent(type="eclipse", id="re_eclipse3b", x=35, y=12, flag="tmp_rito_lua", dica_grupo="rito_e3")
    m.ent(type="receptor", id="re_receptor3", group="rito_e3", x=46, y=14)
    m.puzzles["rito_e3"] = {"type": "receptores", "flag": "rito_e3_ok", "msg": "A luz atravessa o abismo e acende o cristal! Agora a lua mostra o caminho.", "dica_apos": 3,
                            "dica": "Dica: com sol, vá à ilhota pelas plataformas douradas e abra a persiana; depois puxe o eclipse e siga pelas de sombra."}
    door(m, "re_porta3", [[49, 14], [49, 15]], opens=["rito_e3_ok"])
    # 4. conclusão
    m.ent(type="altar", id="re_altar", x=54, y=12, flag="rito_eclipse_ok", requires="rito_e3_ok", bond="missao:rito_eclipse",
          loot={"manto_umbral": 1}, lines=["A luz e a sombra se encontram sobre o altar, e o salão fica em silêncio.",
          "Uma voz antiga, de sentinelas que já se foram: \"Quem caminha entre o sol e a lua pode encarar quem perdeu o rosto.\"",
          "Você recebeu o MANTO UMBRAL: reduz o dano recebido (equipe no inventário)."])
    door(m, "re_porta4", [[58, 14], [58, 15]], opens=["rito_eclipse_ok"])
    # 5. rito avançado: entre por uma fissura, cruze por portais e leve a luz ao cristal escondido
    m.ent(type="fissura", id="rito_fissura", x=54, y=10, to=[53, 5])
    m.ent(type="fissura", id="rito_fissura_volta", x=53, y=6, to=[53, 11])
    m.ent(type="sign", id="rito_e_placa_av", dialog="rito_e_placa_av", x=56, y=12)
    m.ent(type="portal", id="rito_av_portal_a", x=51, y=5, par="rito_av_portal_b")
    m.ent(type="portal", id="rito_av_portal_b", x=57, y=5, par="rito_av_portal_a")
    m.ent(type="lente", id="rito_av_lente", x=58, y=3, dir=[-1, 0])
    m.ent(type="espelho", id="rito_av_espelho", x=56, y=3, ori="b")
    m.ent(type="receptor", id="rito_av_receptor", group="rito_av", x=56, y=6)
    m.puzzles["rito_av"] = {"type": "receptores", "flag": "rito_av_luz", "msg": "O cristal escondido acende do outro lado da parede!"}
    m.ent(type="altar", id="rito_av_altar", x=51, y=3, flag="rito_eclipse_avancado_ok", requires="rito_av_luz",
          msg_falta="O altar avançado espera a luz do cristal escondido atrás da parede.",
          loot={"amuleto_eclipse": 1}, lines=["O altar avançado responde: você caminhou por onde a sombra não deixa ninguém passar.", "Você recebeu o AMULETO DO ECLIPSE."])
    return m


# ================================================================== 8. TORRE — TOPO (preparação + arena do Cavaleiro)
def torre_c():
    m = F("torre_c", "Torre das Duas Sombras — Trono Sem Rosto", 56, 36, music="masmorra")
    m.rect(2, 14, 12, 8, "β")                       # 9. preparação
    m.rect(0, 17, 2, 2, "β"); m.rect(14, 17, 4, 2, "β")
    m.rect(18, 6, 28, 22, "γ")                      # 10. arena
    for (x, y) in ((24, 11), (39, 11), (24, 22), (39, 22)):
        m.set(x, y, "π")
    m.rect(46, 16, 10, 2, "β")
    m.spawns = {"from_rito": [1, 17]}
    m.ent(type="exit", x=0, y=17, w=1, h=2, to="rito_eclipse", spawn="from_c")
    m.ent(type="shrine", id="torre_topo", x=6, y=16)
    m.ent(type="chest", id="tc_bau_prep", x=11, y=15, loot={"pocao": 3, "tonico_criatura": 2})
    m.ent(type="sign", id="placa_cavaleiro", dialog="placa_cavaleiro", x=4, y=20)
    door(m, "tc_porta_in", [[17, 17], [17, 18]], closes=["tmp_cavaleiro_ativo"])
    m.ent(type="boss", boss="cavaleiro", id="cavaleiro", x=38, y=17, x0=18, y0=6, w=28, h=22, flag_done="cavaleiro_morto", flag_active="tmp_cavaleiro_ativo",
          portais=[[21, 9], [42, 9], [21, 24], [42, 24]])
    m.ent(type="balestra", id="tc_balestra_o", x=19, y=15, dir=[1, 0])
    m.ent(type="balestra", id="tc_balestra_l", x=44, y=20, dir=[-1, 0])
    door(m, "tc_porta_out", [[46, 16], [46, 17]], opens=["cavaleiro_morto"])
    m.ent(type="exit", x=55, y=16, w=1, h=2, to="refugio_muralha", spawn="from_vitoria")
    m.suspense = [[0, 14, 18, 8, "cavaleiro_morto"]]
    return m


# ================================================================== 9. ESTRADA FINAL (gancho da Região 5)
def estrada():
    m = F("estrada_final", "Estrada Final", 32, 24, fill="Μ")
    m.rect(12, 9, 8, 15, "μ")
    m.rect(13, 0, 6, 8, "μ")
    m.rect(12, 8, 8, 1, "Μ"); m.rect(14, 8, 4, 1, "λ")
    m.spawns = {"default": [15, 21], "from_refugio": [15, 22], "from_catedral": [15, 1]}
    m.ent(type="exit", x=12, y=23, w=8, h=1, to="refugio_muralha", spawn="from_estrada")
    m.ent(type="sign", id="placa_estrada", dialog="placa_estrada", x=13, y=12)
    m.ent(type="fissura", id="estrada_fissura", x=15, y=9, to=[15, 6])
    m.ent(type="fissura", id="estrada_fissura_volta", x=16, y=7, to=[16, 10])
    m.ent(type="sign", id="estrada_selo", dialog="placa_catedral", x=15, y=3)
    m.ent(type="exit", x=13, y=0, w=6, h=1, to="acampamento_aurora", spawn="from_estrada")   # Região 5: selo externo da Catedral
    return m


# ------------------------------------------------------------------ verificação
def bfs_check(m):
    msgs = []
    doors = set()
    for e in m.ents:
        if e["type"] == "door":
            for t in e["tiles"]:
                doors.add(tuple(t))
    seen = set()
    dq = deque()
    for s in m.spawns.values():
        seen.add(tuple(s)); dq.append(tuple(s))
    while dq:
        x, y = dq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < m.w and 0 <= ny < m.h and (nx, ny) not in seen:
                c = m.g[ny][nx]
                if c in WALK or (nx, ny) in doors or c in "ΔΨ":  # portas abríveis e plataformas alternadas contam
                    seen.add((nx, ny)); dq.append((nx, ny))
    for e in m.ents:
        t = e["type"]
        if t in ("exit", "door", "encounter", "boss", "miniboss"):
            continue
        p = (e["x"], e["y"])
        ch = m.g[p[1]][p[0]]
        if e.get("id") in OPTIONAL_BEHIND or t in ("helice", "fresta", "receptor", "lente", "segredo") and ch in SOLID:
            continue
        if ch in SOLID:
            msgs.append(f"  ! {m.id}: {t}/{e.get('id', e.get('kind', ''))} sobre tile sólido '{ch}' em {p}")
            continue
        near = any((p[0] + dx, p[1] + dy) in seen for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)))
        if not near:
            msgs.append(f"  ! {m.id}: {t}/{e.get('id', e.get('kind', ''))} inalcançável em {p}")
    for c in m.cond:
        for r in c.get("rects", []):
            assert 0 <= r[0] and r[0] + r[2] <= m.w and 0 <= r[1] and r[1] + r[3] <= m.h, (m.id, r)
    return msgs


MAPS = [ponte, refugio, jardins, muralha, torre_a, torre_b, rito, torre_c, estrada]


def main():
    maps = [f() for f in MAPS]
    bad = []
    for m in maps:
        for row in m.g:
            assert len(row) == m.w
        with open(os.path.join(OUT, m.id + ".json"), "w", encoding="utf-8") as f:
            json.dump(m.to_json(), f, ensure_ascii=False)
        bad += bfs_check(m)
    print("\n".join(bad) if bad else "mapas da Região 4 ok (alcançabilidade)")
    if "--ascii" in sys.argv:
        for m in maps:
            if len(sys.argv) > 2 and m.id not in sys.argv[2:]:
                continue
            g = [r[:] for r in m.g]
            for e in m.ents:
                if "x" in e and e["type"] not in ("exit", "door", "encounter"):
                    c = {"wild": "W", "enemy": "E", "chest": "C", "npc": "N", "shrine": "@", "lever": "L", "sign": "?", "miniboss": "M", "boss": "B",
                         "espelho": "/", "persiana": "#", "receptor": "o", "lente": "*", "helice": "H", "manivela": "h", "nevoa": "~", "fresta": "f",
                         "solar": "S", "balestra": ">", "eclipse": "e", "portal": "O", "fissura": "x", "segredo": "!", "altar": "A", "rite_reset": "r",
                         "brazier": "b", "pickup": "p", "prop": "Q", "anvil": "n"}.get(e["type"], "!")
                    if 0 <= e["y"] < m.h and 0 <= e["x"] < m.w:
                        g[e["y"]][e["x"]] = c
            print("==", m.id, m.w, m.h)
            print("\n".join("".join(r) for r in g))


if __name__ == "__main__":
    main()
