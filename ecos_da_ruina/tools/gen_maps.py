#!/usr/bin/env python3
"""Desenha os mapas dos Capitulos 1, 2 e 3 (layouts manuais, nao procedurais de masmorra).
Saida: data/maps/*.json. Verifica alcancabilidade de entidades por BFS."""
import json, os, random, sys
from collections import deque

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "data", "maps")
os.makedirs(OUT, exist_ok=True)
SOLID = set("T~RhHcxFbDPoCvMLuJZXOAaI" + "nWUY^&*!i")
PASS_FOR_BFS = set(".,fprySwBgGkeDx" + "mQq=|jz%<I" + "lst+890E;!")  # portas/barreiras contam como abriveis
# entidades opcionais atras de rocha fissurada, passagem secreta ou trilho do Ferrunho
OPTIONAL_BEHIND = {"forja_bau_rocha", "veio_bau", "veio_placa", "veio_rocha", "trilhos_bau_ilha", "trilhos_bau_vapor",
                   "fa_bau_caldeira", "rito_mec1", "rito_mec2", "rito_mec3", "rito_altar2", "rito_placa_av",
                   # Região 3: atrás de roda d'água (Goturim), segredo, margem nova ou ponte espiritual
                   "passarela_bau_roda", "passarela_bau_sussurro", "lago_bau_reflexo", "lago_bau_roda", "lago_bau_margem",
                   "lago_inscricao", "rr_altar2", "rr_ponte2",
                   # Floresta: segredo do Santuário, ala avançada do Rito da Seiva (Raiz Viva) e toca da Grota
                   "a_bau_expedicao", "a_parede_musgo", "rs_av_raiz1", "rs_av_raiz2", "rs_av_raiz3", "rs_av_l1", "rs_av_l2",
                   "rs_altar2", "rs_placa_av", "semente_grota"}


class M:
    def __init__(self, mid, name, w, h, fill=".", music="floresta", region="floresta", safe=False):
        self.id, self.name, self.w, self.h = mid, name, w, h
        self.g = [[fill] * w for _ in range(h)]
        self.music, self.region, self.safe = music, region, safe
        self.spawns, self.ents, self.cond, self.puzzles = {}, [], [], {}
        self.bfs_flags = []   # flags de mecanismos locais aplicadas na verificacao (ex.: comporta que esvazia um canal)
        self.suspense = []  # zonas de trilha de suspense: [x, y, w, h, flag que desliga]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = c

    def rect(self, x, y, w, h, c):
        for j in range(h):
            for i in range(w):
                self.set(x + i, y + j, c)

    def border(self, t, c="T"):
        for j in range(self.h):
            for i in range(self.w):
                if i < t or j < t or i >= self.w - t or j >= self.h - t:
                    self.g[j][i] = c

    def scatter(self, rnd, chars):
        for j in range(self.h):
            for i in range(self.w):
                if self.g[j][i] == ".":
                    r = rnd.random()
                    acc = 0
                    for c, p in chars:
                        acc += p
                        if r < acc:
                            self.g[j][i] = c
                            break

    def room(self, x, y, w, h, floor="r"):
        """interior x..x+w-1; paredes R ao redor sobre vazio"""
        for j in range(y - 1, y + h + 1):
            for i in range(x - 1, x + w + 1):
                inside = x <= i < x + w and y <= j < y + h
                if inside:
                    self.set(i, j, floor)
                elif 0 <= i < self.w and 0 <= j < self.h and self.g[j][i] == "v":
                    self.set(i, j, "R")

    def corr(self, x, y, w, h, floor="r"):
        self.room(x, y, w, h, floor)

    def ent(self, **kw):
        self.ents.append(kw)

    def ascii(self):
        rows = ["".join(r) for r in self.g]
        return rows

    def to_json(self):
        return {"id": self.id, "name": self.name, "music": self.music, "region": self.region, "safe": self.safe,
                "w": self.w, "h": self.h, "tiles": self.ascii(), "spawns": self.spawns, "entities": self.ents,
                "conditional": self.cond, "puzzles": self.puzzles, **({"suspense": self.suspense} if self.suspense else {})}


def house(m, x, y, w):
    m.rect(x, y, w, 2, "H")
    m.rect(x, y + 2, w, 1, "h")


def carve_path(m, pts, wd=3, c="p"):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        for t in range(0, 101):
            x = round(x0 + (x1 - x0) * t / 100)
            y = round(y0 + (y1 - y0) * t / 100)
            for dy in range(-(wd // 2), wd - wd // 2):
                for dx in range(-(wd // 2), wd - wd // 2):
                    xx, yy = x + dx, y + dy
                    if 2 <= xx < m.w - 2 and 2 <= yy < m.h - 2:
                        m.g[yy][xx] = c


def clearing(m, cx, cy, rx, ry, c="."):
    for j in range(cy - ry, cy + ry + 1):
        for i in range(cx - rx, cx + rx + 1):
            if ((i - cx) / max(rx, 1)) ** 2 + ((j - cy) / max(ry, 1)) ** 2 <= 1 and 2 <= i < m.w - 2 and 2 <= j < m.h - 2:
                if m.g[j][i] in "TbFo":
                    m.g[j][i] = c


# ------------------------------------------------------------------ VILA LUMEN
def vila():
    m = M("vila_lumen", "Vila Lúmen", 44, 32, music="vila", safe=True)
    rnd = random.Random(11)
    m.scatter(rnd, [(",", .12), ("f", .05)])
    m.border(2)
    m.rect(17, 12, 12, 8, "p")                      # praca
    m.rect(8, 13, 10, 2, "p")                       # caminho ao treino
    m.rect(28, 14, 16, 4, "p")                      # leste
    m.rect(20, 19, 4, 13, "p")                      # sul
    m.rect(20, 0, 4, 13, "x")                       # norte (raizes ate o Cervo cair)
    m.rect(20, 11, 4, 2, "p")
    m.rect(0, 22, 18, 3, "p"); m.rect(17, 22, 4, 3, "p")  # oeste
    m.rect(0, 22, 2, 3, "x")                        # portao oeste (atalho do santuario)
    house(m, 6, 5, 5); house(m, 32, 4, 6); house(m, 8, 26, 5); house(m, 33, 22, 6)
    # portas das casas (passagem para os interiores)
    for (dx, dy) in ((8, 7), (35, 6), (10, 28), (36, 24)):
        m.set(dx, dy, "d")
    m.rect(31, 9, 6, 3, "~")
    for (x, y) in ((30, 9), (30, 10), (30, 11), (37, 9), (37, 10), (31, 12), (36, 12), (34, 8)):
        m.set(x, y, "b")
    # cercado do Brotisco
    for i in range(8, 16):
        m.set(i, 16, "F"); m.set(i, 21, "F")
    for j in range(16, 22):
        m.set(8, j, "F"); m.set(15, j, "F")
    m.set(11, 16, "."); m.set(12, 16, ".")
    m.rect(9, 17, 6, 4, ".")
    for x, y in ((4, 14), (3, 19), (14, 28), (28, 26), (40, 27), (4, 28)):
        m.set(x, y, "b")
    for x, y in ((26, 24), (12, 8), (38, 20)):
        m.set(x, y, "o")
    m.spawns = {"from_casa_maru": [8, 9], "from_loja_ysa": [35, 8], "from_casa_corvelo": [10, 29], "from_casa_tobi": [36, 26], "default": [21, 16], "from_bosque": [41, 15], "from_clareira": [21, 29], "from_desfiladeiro": [21, 3],
                "from_atalho": [3, 23], "from_santuario": [21, 15]}
    m.ent(type="shrine", id="vila", x=22, y=14)
    m.ent(type="npc", id="anciao", sprite="npc_elder", dialog="anciao", x=19, y=14, nome="Anciã Maru")
    m.ent(type="npc", id="ysa", sprite="npc_mother", dialog="ysa", x=26, y=15, nome="Ysa")
    m.ent(type="npc", id="guarda", sprite="npc_ranger", dialog="guarda", x=38, y=16, nome="Bram")
    m.ent(type="npc", id="pipo", sprite="npc_kid", dialog="pipo", x=16, y=11, nome="Pipo")
    m.ent(type="npc", id="mae", sprite="npc_corvelo", dialog="mae", x=26, y=18, nome="Dona Corvelo", if_flag="cervo_morto")
    m.ent(type="npc", id="tobi", sprite="npc_smith", dialog="ferreiro", x=30, y=20, nome="Tobi")
    m.ent(type="sign", id="treino", dialog="treino", x=10, y=11)
    # contratos em grupo: quadro e aliados (somem do mapa quando estão no grupo do herói)
    m.ent(type="pickup", id="semente_vila", item="semente_vida", sheet="icons_chave", frame=3, flag="semente_vila_pega", x=12, y=8, if_flag="rocha_vila_lumen_12_8", unless_flag="semente_vila_pega")
    m.ent(type="prop", id="quadro_vila", sheet="quadro_contratos", frame=0, x=29, y=13, solid=True, contratos=True)
    m.ent(type="npc", id="bruna", sprite="aliada_bruna", human=True, dialog="bruna", x=31, y=13, nome="Bruna", party_id="bruna")
    m.ent(type="npc", id="ravi", sprite="aliado_ravi", human=True, dialog="ravi", x=28, y=15, nome="Ravi", party_id="ravi", if_flag="saqueadores_ok")
    m.ent(type="sign", id="placa_vila", dialog="placa_vila", x=19, y=18)
    m.ent(type="spirit_mark", id="vila_inscricao", x=24, y=12, requires_eco="olhar_velado", dialog="inscricao_vila",
          msg="Perto do santuário, letras finas brilham e somem como orvalho. (Olhar Velado — volte depois)")
    m.ent(type="dummy", id="dummy1", x=11, y=10)
    m.ent(type="dummy", id="dummy2", x=14, y=10)
    m.ent(type="wild", id="brotisco_tutorial", species="brotisco", level=1, x=12, y=19, unique=True, garantida=True)
    m.ent(type="chest", id="vila_bau1", x=5, y=11, loot={"fragmentos": 25, "selo_basico": 2})
    m.ent(type="exit", x=42, y=14, w=2, h=4, to="bosque_lanternas", spawn="from_vila")
    m.ent(type="exit", x=8, y=7, w=1, h=1, to="casa_maru", spawn="entrada")
    m.ent(type="exit", x=35, y=6, w=1, h=1, to="loja_ysa", spawn="entrada")
    m.ent(type="exit", x=10, y=28, w=1, h=1, to="casa_corvelo", spawn="entrada")
    m.ent(type="exit", x=36, y=24, w=1, h=1, to="casa_tobi", spawn="entrada")
    m.ent(type="exit", x=20, y=30, w=4, h=2, to="clareira_raizes", spawn="from_vila")
    m.ent(type="exit", x=20, y=0, w=4, h=1, to="desfiladeiro", spawn="from_vila", if_flag="cervo_morto")
    m.ent(type="exit", x=0, y=22, w=1, h=3, to="santuario_a", spawn="from_atalho", if_flag="atalho_vila_aberto")
    m.cond.append({"if": "cervo_morto", "rects": [[20, 0, 4, 12, "p"]],
                   "chars": {".": "g", ",": "g", "f": "G"}})
    m.cond.append({"if": "atalho_vila_aberto", "rects": [[0, 22, 2, 3, "p"]]})
    return m


# ------------------------------------------------------------------ BOSQUE DAS LANTERNAS
def bosque():
    m = M("bosque_lanternas", "Bosque das Lanternas", 56, 36, music="floresta")
    rnd = random.Random(21)
    m.scatter(rnd, [("T", .26), (",", .10), ("f", .04), ("b", .03)])
    m.border(2)
    path = [(2, 17), (14, 17), (14, 24), (30, 24), (30, 12), (48, 12), (52, 7)]
    carve_path(m, path, 3)
    carve_path(m, [(2, 17), (4, 17)], 4)
    carve_path(m, [(14, 24), (16, 30), (24, 30)], 3)                # ramal sul (Lumipim)
    carve_path(m, [(14, 17), (14, 10), (24, 10)], 3)                # atalho norte
    carve_path(m, [(27, 10), (38, 10), (38, 12)], 3)
    carve_path(m, [(30, 24), (38, 26)], 3)                          # ramal da ravina
    clearing(m, 9, 21, 5, 3); clearing(m, 22, 30, 5, 3); clearing(m, 22, 15, 3, 2); clearing(m, 41, 15, 3, 2)
    clearing(m, 46, 10, 4, 3); clearing(m, 34, 20, 3, 2)
    for y in range(8, 13):                                          # fenda do atalho do cipo
        for x in (25, 26):
            if m.g[y][x] != "T":
                pass
    m.rect(25, 9, 2, 3, "c")
    # ravina da clareira de vinculo
    m.rect(40, 22, 3, 10, "c")
    clearing(m, 47, 27, 5, 4); m.rect(43, 24, 8, 6, ".")
    carve_path(m, [(38, 26), (39, 26)], 2)
    for x in (39,):
        m.rect(x, 25, 1, 3, "p")
    m.rect(43, 25, 1, 3, "p")
    # portao do santuario
    m.rect(50, 6, 2, 3, "p"); m.rect(52, 6, 1, 3, "D"); m.rect(53, 6, 3, 3, "r")
    m.rect(0, 15, 2, 5, "p")
    m.spawns = {"from_vila": [4, 17], "from_santuario": [50, 7]}
    m.ent(type="npc", id="guarda_b", sprite="npc_ranger", dialog="guarda", x=6, y=18, nome="Bram")
    m.ent(type="sign", id="placa_bosque", dialog="placa_bosque", x=48, y=9)
    m.ent(type="wild", id="b_brotisco1", species="brotisco", level=2, x=9, y=21)
    m.ent(type="wild", id="b_brotisco2", species="brotisco", level=2, x=11, y=23)
    m.ent(type="wild", id="b_brotisco3", species="brotisco", level=3, x=8, y=19)
    m.ent(type="wild", id="b_lumipim1", species="lumipim", level=3, x=22, y=30)
    m.ent(type="wild", id="b_lumipim2", species="lumipim", level=3, x=24, y=29)
    # criaturas que só aparecem com certo clima (data/weather.json)
    m.ent(type="wild", id="b_brotisco_chuva", species="brotisco", level=4, x=6, y=20, clima="chuva")
    m.ent(type="wild", id="b_lumipim_neblina", species="lumipim", level=4, x=25, y=30, clima="neblina")
    m.ent(type="enemy", kind="lobo", id="b_lobo1", x=20, y=24)
    m.ent(type="enemy", kind="lobo", id="b_lobo2", x=30, y=18)
    m.ent(type="enemy", kind="lobo", id="b_lobo3", x=42, y=12)
    m.ent(type="enemy", kind="cogumelo", id="b_cog1", x=15, y=22)
    m.ent(type="enemy", kind="cogumelo", id="b_cog2", x=36, y=13)
    m.ent(type="flower", id="b_flor1", group="flores_b", x=22, y=15)
    m.ent(type="pickup", id="folha1", item="folha_lanterna", frame=0, flag="folha1_pega", x=23, y=16, unless_flag="folha1_pega")
    m.ent(type="pickup", id="folha2", item="folha_lanterna", frame=0, flag="folha2_pega", x=45, y=11, unless_flag="folha2_pega")
    m.ent(type="pickup", id="brinquedo", item="brinquedo_madeira", frame=1, flag="brinquedo_pego", x=21, y=31, unless_flag="brinquedo_pego")
    m.ent(type="flower", id="b_flor2", group="flores_b", x=41, y=15)
    m.ent(type="flower", id="b_flor3", group="flores_b", x=46, y=10)
    m.puzzles["flores_b"] = {"type": "flowers", "flag": "bosque_flores"}
    m.ent(type="door", id="portao_bosque", tiles=[[52, 6], [52, 7], [52, 8]], open_flags=["bosque_flores"], closed_char="D")
    m.ent(type="exit", x=54, y=6, w=2, h=3, to="santuario_a", spawn="from_bosque")
    m.ent(type="exit", x=0, y=15, w=2, h=5, to="vila_lumen", spawn="from_bosque")
    m.ent(type="chest", id="bosque_bau1", x=44, y=29, loot={"fragmentos": 40, "selo_refinado": 1})
    m.ent(type="vine", id="cipo_norte", x=24, y=10, tiles=[[25, 9], [26, 9], [25, 10], [26, 10], [25, 11], [26, 11]], species="brotisco", flag="cipo_bosque")
    m.ent(type="chest", id="bosque_bau_cipo", x=36, y=10, loot={"fragmentos": 30, "pocao": 2})
    m.ent(type="bridge_spot", id="ponte_vinculo", x=39, y=26, tiles=[[40, 26], [41, 26], [42, 26], [40, 27], [41, 27], [42, 27]], flag="clareira_vinculo_ponte")
    m.ent(type="bond_stone", id="pedra_vinculo", x=47, y=27, flag="clareira_vinculo", if_flag="clareira_vinculo_ponte")
    m.cond.append({"if": "cervo_morto", "chars": {".": "g", ",": "g", "f": "G"}})
    m.cond.append({"if": "clareira_vinculo_ponte", "rects": [[40, 26, 3, 2, "B"]]})
    m.cond.append({"if": "cipo_bosque", "rects": [[25, 9, 2, 3, "B"]]})
    # descoberta de criatura: anel de flores incomum (sudoeste). Na neblina, ou com um Lumipim na equipe,
    # os Lumipins giram sobre ele e um Lumipim mais velho aparece.
    clearing(m, 7, 30, 4, 2); m.rect(10, 29, 4, 1, ".")
    m.rect(6, 29, 3, 3, ".")
    for (x, y) in ((6, 28), (7, 28), (8, 28), (5, 29), (9, 29), (5, 30), (9, 30), (5, 31), (9, 31), (6, 32), (7, 32), (8, 32)):
        m.set(x, y, "f")
    m.ent(type="anel_flores", id="b_anel", x=7, y=30, flag="bosque_anel")
    m.ent(type="wild", id="b_lumipim_anel", species="lumipim", level=8, x=7, y=29, if_flag="bosque_anel", unique=True)
    return m


# ------------------------------------------------------------------ CLAREIRA DAS RAIZES
def clareira():
    m = M("clareira_raizes", "Clareira das Raízes", 48, 38, music="floresta")
    rnd = random.Random(31)
    m.scatter(rnd, [("T", .24), (",", .10), ("f", .05), ("o", .03)])
    m.border(2)
    carve_path(m, [(23, 1), (23, 8), (22, 14), (22, 20)], 3)
    clearing(m, 23, 11, 8, 4)
    carve_path(m, [(22, 14), (10, 18)], 3); clearing(m, 9, 19, 5, 3)
    carve_path(m, [(24, 14), (38, 20)], 3); clearing(m, 38, 20, 4, 3)
    carve_path(m, [(10, 20), (10, 28)], 3); clearing(m, 10, 29, 4, 3)
    # patio de ruinas com placas
    m.rect(12, 21, 22, 12, "r")
    for i in range(12, 34):
        m.set(i, 21, "R"); m.set(i, 32, "R")
    for j in range(21, 33):
        m.set(12, j, "R"); m.set(33, j, "R")
    m.rect(21, 21, 3, 1, "r")                       # entrada norte
    m.rect(12, 26, 1, 2, "r")                       # entrada oeste
    for (x, y) in ((16, 24), (29, 24), (16, 29), (29, 29)):
        m.set(x, y, "P")
    m.rect(21, 32, 4, 1, "x")                       # barreira de raizes ao sul
    carve_path(m, [(23, 33), (23, 36)], 4, "p")
    m.rect(21, 36, 4, 2, "p"); m.rect(21, 0, 4, 2, "p")
    m.spawns = {"from_vila": [23, 3], "from_santuario": [23, 35]}
    m.ent(type="sign", id="placa_clareira", dialog="placa_clareira", x=22, y=23)
    m.ent(type="pickup", id="semente_clareira", item="semente_vida", sheet="icons_chave", frame=3, flag="semente_clareira_pega", x=9, y=3, if_flag="rocha_clareira_raizes_9_3", unless_flag="semente_clareira_pega")
    m.ent(type="pickup", id="semente_clareira2", item="semente_vida", sheet="icons_chave", frame=3, flag="semente_clareira2_pega", x=35, y=10, if_flag="rocha_clareira_raizes_35_10", unless_flag="semente_clareira2_pega")
    m.ent(type="pickup", id="folha3", item="folha_lanterna", frame=0, flag="folha3_pega", x=38, y=19, unless_flag="folha3_pega")
    m.ent(type="plate", id="c_placa1", group="placas_c", x=15, y=28)
    m.ent(type="plate", id="c_placa2", group="placas_c", x=30, y=28)
    m.ent(type="crate", id="c_caixa1", x=19, y=26)
    m.ent(type="crate", id="c_caixa2", x=26, y=26)
    m.puzzles["placas_c"] = {"type": "plates", "flag": "clareira_placas"}
    m.ent(type="door", id="portao_clareira", tiles=[[21, 32], [22, 32], [23, 32], [24, 32]], open_flags=["clareira_placas"], closed_char="x")
    m.ent(type="wild", id="c_casc1", species="cascalito", level=3, x=8, y=19)
    m.ent(type="wild", id="c_casc2", species="cascalito", level=3, x=38, y=20)
    m.ent(type="wild", id="c_casc3", species="cascalito", level=4, x=10, y=30)
    m.ent(type="wild", id="c_brotisco1", species="brotisco", level=2, x=24, y=11)
    m.ent(type="wild", id="c_brotisco_chuva", species="brotisco", level=4, x=27, y=8, clima="chuva")
    m.ent(type="enemy", kind="sentinela", id="c_sent1", x=20, y=10)
    m.ent(type="enemy", kind="sentinela", id="c_sent2", x=28, y=12)
    m.ent(type="enemy", kind="lobo", id="c_lobo1", x=37, y=21)
    m.ent(type="enemy", kind="lobo", id="c_lobo2", x=11, y=26)
    m.ent(type="enemy", kind="cogumelo", id="c_cog1", x=26, y=14)
    m.ent(type="chest", id="clareira_bau1", x=40, y=17, loot={"fragmentos": 35, "couraca_fibra": 1})
    m.ent(type="exit", x=21, y=0, w=4, h=1, to="vila_lumen", spawn="from_clareira")
    m.ent(type="exit", x=21, y=36, w=4, h=2, to="santuario_a", spawn="from_clareira")
    m.cond.append({"if": "cervo_morto", "chars": {".": "g", ",": "g", "f": "G"}})
    # trilha leste: raízes antigas fecham a Grota até o Cervo descansar
    m.rect(41, 18, 7, 3, "p"); m.rect(44, 18, 2, 3, "x")
    m.spawns["from_grota"] = [43, 19]
    m.ent(type="sign", id="placa_grota_raizes", dialog="placa_grota_raizes", x=42, y=17)
    m.cond.append({"if": "cervo_morto", "rects": [[44, 18, 2, 3, "p"]]})
    m.ent(type="exit", x=47, y=18, w=1, h=3, to="grota_seiva", spawn="from_clareira", if_flag="cervo_morto")
    return m


# ------------------------------------------------------------------ SANTUARIO DA SEIVA A
def santuario_a():
    m = M("santuario_a", "Santuário da Seiva — Átrio e Galerias", 64, 40, fill="v", music="santuario")
    # Atrio (sala 1: seguro) e corredores de acesso
    m.room(22, 28, 12, 8)
    m.corr(0, 31, 22, 2); m.corr(27, 36, 2, 4)
    # Salao das Flores (sala 2: introduz mecanica de luz)
    m.corr(27, 25, 2, 3)
    m.room(20, 16, 16, 9)
    # Galeria dos Lobos (sala 3: combate)
    m.corr(27, 13, 2, 3)
    m.room(16, 4, 24, 9)
    # Canais de Seiva (sala 4: enigma)
    m.corr(40, 7, 4, 2)
    m.room(44, 3, 16, 12)
    # Tesouro e atalho (sala 5: recompensa / atalho)
    m.corr(51, 15, 2, 4)
    m.room(46, 19, 12, 8)
    m.corr(58, 22, 6, 2)
    m.corr(51, 27, 2, 13)
    for (x, y) in ((23, 29), (32, 29), (23, 34), (32, 34), (22, 18), (33, 18), (22, 23), (33, 23)):
        m.set(x, y, "P")
    for (x, y) in ((18, 6), (37, 6), (18, 10), (37, 10)):
        m.set(x, y, "P")
    m.rect(45, 9, 14, 1, "S"); m.rect(51, 4, 2, 5, "S")
    for (x, y) in ((24, 33), (31, 31), (21, 19), (34, 22), (20, 5), (38, 11)):
        m.set(x, y, "y")
    m.spawns = {"from_bosque": [3, 31], "from_clareira": [27, 36], "from_atalho": [60, 22], "from_b": [51, 37]}
    m.ent(type="shrine", id="santuario_a_atrio", x=28, y=30)
    m.ent(type="exit", x=0, y=31, w=1, h=2, to="bosque_lanternas", spawn="from_santuario")
    m.ent(type="exit", x=27, y=39, w=2, h=1, to="clareira_raizes", spawn="from_santuario")
    # salao das flores
    m.ent(type="flower", id="a_flor1", group="flores_a", x=22, y=20)
    m.ent(type="flower", id="a_flor2", group="flores_a", x=33, y=20)
    m.ent(type="flower", id="a_flor3", group="flores_a", x=27, y=17)
    m.puzzles["flores_a"] = {"type": "flowers", "flag": "salao_flores"}
    m.ent(type="door", id="d_flores", tiles=[[27, 15], [28, 15]], open_flags=["salao_flores"], closed_char="D")
    m.ent(type="wild", id="a_lumipim_salao", species="lumipim", level=3, x=30, y=22)
    # galeria
    m.ent(type="enemy", kind="lobo", id="a_lobo1", x=20, y=7, enc="galeria")
    m.ent(type="enemy", kind="lobo", id="a_lobo2", x=35, y=9, enc="galeria")
    m.ent(type="enemy", kind="cogumelo", id="a_cog1", x=27, y=6, enc="galeria")
    m.ent(type="enemy", kind="sentinela", id="a_sent1", x=30, y=9, enc="galeria")
    m.ent(type="encounter", id="galeria", x=16, y=4, w=24, h=9, flag_done="enc_galeria_ok", flag_active="tmp_enc_galeria_ativo")
    m.ent(type="door", id="d_gal_in", tiles=[[27, 13], [28, 13]], close_flags=["tmp_enc_galeria_ativo"], closed_char="D")
    m.ent(type="door", id="d_gal_out", tiles=[[40, 7], [40, 8]], open_flags=["enc_galeria_ok"], closed_char="D")
    # canais de seiva
    m.ent(type="sign", id="placa_canais", dialog="placa_canais", x=49, y=6)
    m.ent(type="lever", id="l1", group="seiva", idx=0, x=48, y=12)
    m.ent(type="lever", id="l2", group="seiva", idx=1, x=52, y=12)
    m.ent(type="lever", id="l3", group="seiva", idx=2, x=56, y=12)
    m.puzzles["seiva"] = {"type": "levers", "toggles": [[0, 1], [1, 2], [2]], "start": [0, 0, 0], "goal": [1, 1, 1], "flag": "canais_ok", "dica_apos": 3,
                          "dica": "Dica: erga a primeira e depois a terceira alavanca."}
    m.ent(type="door", id="d_canais", tiles=[[51, 15], [52, 15]], open_flags=["canais_ok"], closed_char="D")
    # tesouro e atalho
    m.ent(type="chest", id="a_bau_tesouro", x=48, y=21, loot={"amuleto_seiva": 1, "pocao": 2, "fragmentos": 50})
    m.ent(type="shrine", id="santuario_a_tesouro", x=55, y=21)
    m.ent(type="sign", id="placa_atalho", dialog="placa_atalho", x=56, y=24)
    m.ent(type="exit", x=63, y=22, w=1, h=2, to="vila_lumen", spawn="from_atalho", set_flag="atalho_vila_aberto")
    m.ent(type="exit", x=51, y=39, w=2, h=1, to="santuario_b", spawn="from_a")
    # segredo por observação: musgo pálido numa parede rachada do corredor de entrada; a inscrição de raízes
    # (legível com a luz do Lumipim) aponta para ela; o golpe carregado a rompe.
    m.room(5, 25, 7, 4)
    for (x, y) in ((6, 25), (10, 27), (7, 28)):
        m.set(x, y, "y")
    m.ent(type="inscricao_seiva", id="a_inscricao", x=14, y=32, parede="a_parede_musgo")
    m.ent(type="parede_musgo", id="a_parede_musgo", x=8, y=30, flag="santuario_parede")
    m.cond.append({"if": "santuario_parede", "rects": [[8, 29, 1, 2, "r"]]})
    m.ent(type="chest", id="a_bau_expedicao", x=8, y=26, loot={"diario_expedicao_1": 1, "selo_refinado": 1})
    return m


# ------------------------------------------------------------------ SANTUARIO DA SEIVA B
def santuario_b():
    m = M("santuario_b", "Santuário da Seiva — Câmaras Profundas", 48, 40, fill="v", music="masmorra")
    m.corr(23, 0, 2, 4)
    m.room(12, 4, 24, 12)                           # camara dos pesos
    m.corr(23, 16, 2, 3)
    m.room(18, 19, 12, 6)                           # preparacao
    m.corr(23, 25, 2, 2)
    m.room(10, 27, 28, 12)                          # arena do Lenhador
    m.corr(38, 32, 10, 2)
    for (x, y) in ((14, 6), (33, 6), (14, 13), (33, 13)):
        m.set(x, y, "P")
    for (x, y) in ((12, 29), (35, 29), (12, 36), (35, 36)):
        m.set(x, y, "P")
    m.rect(14, 8, 1, 1, "y")
    m.corr(0, 9, 12, 2)                             # corredor oeste: Rito da Seiva (prova antes do Cervo)
    m.spawns = {"from_a": [23, 2], "from_c": [45, 32], "from_rito": [2, 9]}
    m.ent(type="sign", id="placa_rito_seiva", dialog="placa_rito_seiva", x=7, y=10)
    m.ent(type="exit", x=0, y=9, w=1, h=2, to="rito_seiva", spawn="from_b")
    m.ent(type="exit", x=23, y=0, w=2, h=1, to="santuario_a", spawn="from_b")
    m.ent(type="sign", id="placa_pesos", dialog="placa_pesos", x=24, y=6)
    m.ent(type="plate", id="b_placa1", group="pesos", x=16, y=12)
    m.ent(type="plate", id="b_placa2", group="pesos", x=31, y=12)
    m.ent(type="crate", id="b_caixa1", x=20, y=8)
    m.ent(type="crate", id="b_caixa2", x=27, y=8)
    m.puzzles["pesos"] = {"type": "plates", "flag": "pesos_ok"}
    m.ent(type="door", id="d_pesos", tiles=[[23, 16], [24, 16]], open_flags=["pesos_ok"], closed_char="D")
    m.ent(type="shrine", id="santuario_b_prep", x=20, y=21)
    m.ent(type="chest", id="b_bau_prep", x=27, y=21, loot={"pocao": 2, "selo_refinado": 2, "tonico_criatura": 1})
    m.ent(type="miniboss", id="lenhador", x=27, y=33, x0=10, y0=27, w=28, h=12, flag_done="lenhador_morto", flag_active="tmp_lenhador_ativo")
    m.ent(type="door", id="d_len_in", tiles=[[23, 26], [24, 26]], close_flags=["tmp_lenhador_ativo"], closed_char="D")
    m.ent(type="door", id="d_len_out", tiles=[[38, 32], [38, 33]], open_flags=["lenhador_morto"], closed_char="D")
    m.ent(type="exit", x=47, y=32, w=1, h=2, to="santuario_c", spawn="from_b")
    m.suspense = [[18, 19, 12, 8, "lenhador_morto"]]   # preparação + corredor da arena do Lenhador
    return m


# ------------------------------------------------------------------ SANTUARIO DA SEIVA C (chefao)
def santuario_c():
    m = M("santuario_c", "Santuário da Seiva — Sala do Cervo", 52, 36, fill="v", music="masmorra")
    m.room(2, 15, 12, 8)                            # preparacao
    m.corr(0, 18, 3, 2)
    m.corr(14, 18, 6, 2)
    m.room(20, 10, 24, 16)                          # arena
    m.corr(44, 18, 8, 2)
    for (x, y) in ((25, 14), (38, 14), (25, 21), (38, 21)):
        m.set(x, y, "P")
    m.spawns = {"from_b": [3, 18], "from_vila": [3, 18]}
    m.ent(type="exit", x=0, y=18, w=1, h=2, to="santuario_b", spawn="from_c")
    m.ent(type="shrine", id="santuario_c_prep", x=6, y=18)
    m.ent(type="sign", id="placa_cervo", dialog="placa_cervo", x=10, y=17)
    m.ent(type="door", id="d_cervo", tiles=[[19, 18], [19, 19]], close_flags=["tmp_cervo_ativo"], closed_char="D")
    m.ent(type="boss", id="cervo", x=38, y=18, x0=20, y0=10, w=24, h=16, flag_done="cervo_morto", flag_active="tmp_cervo_ativo")
    m.ent(type="door", id="d_cervo_out", tiles=[[44, 18], [44, 19]], open_flags=["cervo_morto"], closed_char="D")
    m.ent(type="exit", x=51, y=18, w=1, h=2, to="vila_lumen", spawn="from_santuario")
    m.suspense = [[0, 15, 20, 8, "cervo_morto"]]       # preparação + corredor até a Sala do Cervo
    return m


# ------------------------------------------------------------------ DESFILADEIRO
def desfiladeiro():
    m = M("desfiladeiro", "Desfiladeiro do Eco", 40, 24, fill="C", music="desfiladeiro")
    for j in range(24):
        for i in range(40):
            if j < 8:
                if 14 <= i <= 25: m.g[j][i] = "p"
                elif 8 <= i <= 31: m.g[j][i] = "k"
            elif 8 <= j < 12:
                if 8 <= i <= 31: m.g[j][i] = "c"
            else:
                if 14 <= i <= 25: m.g[j][i] = "p"
                elif 8 <= i <= 31: m.g[j][i] = "k"
    for (x, y) in ((10, 4), (29, 5), (10, 18), (29, 20)):
        m.set(x, y, "o")
    for x in range(4, 36):
        m.set(x, 12, "C") if m.g[12][x] == "C" else None
    m.spawns = {"from_vila": [20, 21], "from_minas": [20, 3]}
    m.ent(type="exit", x=16, y=23, w=8, h=1, to="vila_lumen", spawn="from_desfiladeiro")
    m.ent(type="exit", x=16, y=0, w=8, h=1, to="minas_entrada", spawn="from_desfiladeiro")
    m.ent(type="sign", id="placa_ravina", dialog="placa_ravina", x=18, y=14)
    m.ent(type="wild", id="d_cascalito_neve", species="cascalito", level=5, x=11, y=16, clima=["neve", "frio"])
    m.ent(type="bridge_spot", id="ponte_minas", x=19, y=13, tiles=[[19, 8], [20, 8], [19, 9], [20, 9], [19, 10], [20, 10], [19, 11], [20, 11], [21, 8], [21, 9], [21, 10], [21, 11]], flag="ponte_minas", requires_eco="raiz_viva")
    m.cond.append({"if": "ponte_minas", "rects": [[19, 8, 3, 4, "B"]]})
    return m


def minas_entrada():
    m = M("minas_entrada", "Entrada das Minas da Brasa", 30, 20, fill="C", music="minas", region="minas")
    m.rect(8, 4, 14, 14, "k"); m.rect(13, 0, 4, 18, "p"); m.rect(13, 17, 4, 3, "p")
    for (x, y) in ((9, 5), (20, 5), (9, 15), (20, 15)):
        m.set(x, y, "o")
    # boca da mina ao norte: o caminho segue para a Forja de Cobre
    m.rect(9, 0, 12, 4, "M"); m.rect(13, 0, 4, 4, "m")
    m.set(12, 3, "u"); m.set(17, 3, "u")
    m.rect(22, 13, 8, 3, "k")                       # Passagem Sul (encosta sudeste) para o Pântano
    m.rect(24, 13, 2, 3, "X")                       # bloqueio de pedra fissurada (Ruptura Ígnea)
    m.set(23, 12, "o"); m.set(27, 16, "o")
    m.spawns = {"from_desfiladeiro": [15, 17], "from_forja": [15, 2], "from_pantano": [27, 14]}
    m.ent(type="sign", id="placa_passagem_sul", dialog="placa_passagem_sul", x=21, y=12)
    m.ent(type="crack", id="passagem_sul", x=23, y=14, flag="pantano_passagem")
    m.cond.append({"if": "pantano_passagem", "rects": [[24, 13, 2, 3, "k"]]})
    m.ent(type="exit", x=29, y=13, w=1, h=3, to="porto_lanternas", spawn="from_minas")
    m.ent(type="exit", x=13, y=19, w=4, h=1, to="desfiladeiro", spawn="from_minas")
    m.ent(type="exit", x=13, y=0, w=4, h=1, to="forja_cobre", spawn="from_entrada")
    m.ent(type="sign", id="placa_minas", dialog="placa_minas", x=15, y=8)
    m.ent(type="wild", id="m_faisquito_calor", species="faisquito", level=8, x=19, y=11, clima="calor")
    m.ent(type="chapter_end", id="fim_cap1", x=13, y=4, w=4, h=2)
    return m


# ------------------------------------------------------------------ RITO DA SEIVA (prova antes do Cervo + ala avançada pós-Cervo)
def rito_seiva():
    m = M("rito_seiva", "Rito da Seiva", 60, 32, fill="v", music="santuario")
    m.room(2, 13, 11, 12)                           # 1. apresentação segura: um canal
    m.room(16, 9, 14, 20)                           # 2. aplicação: pesos e plataformas conectadas
    m.room(33, 9, 16, 20)                           # 3. combinação: canais + peso + plataformas
    m.room(52, 10, 6, 14)                           # 4. conclusão (altar)
    m.room(38, 2, 20, 4)                            # 5. rito avançado (Raiz Viva em sequência com os canais)
    m.corr(0, 18, 2, 2); m.corr(13, 18, 3, 2); m.corr(30, 18, 3, 2); m.corr(49, 18, 3, 2)
    m.rect(9, 13, 2, 12, "c")                       # canal seco da sala 1
    m.rect(20, 9, 6, 20, "c"); m.rect(22, 16, 2, 6, "r")    # fosso da sala 2 com a ilha
    m.rect(38, 9, 2, 20, "c"); m.rect(44, 9, 2, 20, "c")    # canais A e B da sala 3
    m.rect(54, 6, 2, 4, "c")                        # canal seco entre o altar e a ala avançada
    m.rect(50, 2, 2, 4, "c"); m.rect(44, 2, 2, 4, "c")      # canais da ala avançada
    m.rect(7, 21, 2, 1, "y"); m.rect(36, 12, 2, 1, "y")      # sulcos secos que ligam alavancas aos canais (a seiva os enche)
    for (x, y) in ((4, 15), (11, 23), (17, 26), (28, 11), (47, 26), (34, 27), (56, 22)):
        m.set(x, y, "y")
    for (x, y) in ((3, 14), (3, 23), (27, 10), (27, 27), (53, 11), (56, 11)):
        m.set(x, y, "P")
    m.spawns = {"from_b": [2, 18]}
    m.bfs_flags = ["rs1_ok", "rs2a_ok", "rs2b_ok", "rs3_canal", "rs3_ok"]
    m.ent(type="exit", x=0, y=18, w=1, h=2, to="santuario_b", spawn="from_rito")
    # 1. apresentação: a alavanca faz a seiva subir e uma plataforma boiar no canal
    m.ent(type="sign", id="rs_placa1", dialog="rs_placa1", x=5, y=14)
    m.ent(type="lever", id="rs_l1", group="rs1", idx=0, x=6, y=21)
    m.puzzles["rs1"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "rs1_ok", "dica_apos": 9, "dica": ""}
    m.cond.append({"if": "rs1_ok", "rects": [[9, 18, 2, 2, "B"], [7, 21, 2, 1, "S"]]})
    m.ent(type="deco_seiva", id="rs_bacia1", x=11, y=14, cheia="rs1_ok")
    # 2. aplicação: cada placa ergue um trecho da passarela (a segunda fica na ilha)
    m.ent(type="sign", id="rs_placa2", dialog="rs_placa2", x=17, y=24)
    m.ent(type="rite_reset", id="rs_reset2", x=17, y=27)
    m.ent(type="dica_rito", id="rs_dica2", x=19, y=27, dica="rs_dica2")
    m.ent(type="plate", id="rs_placa_a", group="rs2a", x=18, y=12)
    m.ent(type="crate", id="rs_caixa1", x=18, y=15)
    m.ent(type="crate", id="rs_caixa2", x=19, y=19)
    m.ent(type="plate", id="rs_placa_b", group="rs2b", x=23, y=19)
    m.ent(type="vine", id="rs_cipo", x=23, y=17, species="brotisco", flag="rs_cipo")
    m.puzzles["rs2a"] = {"type": "plates", "flag": "rs2a_ok"}
    m.puzzles["rs2b"] = {"type": "plates", "flag": "rs2b_ok"}
    m.cond.append({"if": "rs2a_ok", "rects": [[20, 18, 2, 2, "B"]]})
    m.cond.append({"if": "rs2b_ok", "rects": [[24, 18, 2, 2, "B"]]})
    m.cond.append({"if": "rs_cipo", "rects": [[24, 18, 2, 2, "B"]]})
    # 3. combinação: alavancas em cascata enchem o canal A; a caixa atravessa e pesa a placa que ergue o B
    m.ent(type="sign", id="rs_placa3", dialog="rs_placa3", x=34, y=26)
    m.ent(type="rite_reset", id="rs_reset3", x=36, y=27)
    m.ent(type="lever", id="rs_l3a", group="rs3", idx=0, x=35, y=11)
    m.ent(type="lever", id="rs_l3b", group="rs3", idx=1, x=35, y=14)
    m.ent(type="lever", id="rs_l3c", group="rs3", idx=2, x=35, y=23)
    m.puzzles["rs3"] = {"type": "levers", "toggles": [[0, 1], [1, 2], [2]], "start": [0, 0, 0], "goal": [1, 0, 1], "flag": "rs3_canal", "dica_apos": 3,
                        "dica": "Dica: a seiva desce em cascata. Puxe a alavanca de cima e depois a do meio; a de baixo desfaz o que a do meio fez."}
    m.cond.append({"if": "rs3_canal", "rects": [[38, 18, 2, 2, "B"], [36, 12, 2, 1, "S"]]})
    m.ent(type="deco_seiva", id="rs_bacia3", x=37, y=10, cheia="rs3_canal")
    m.ent(type="deco_seiva", id="rs_bacia3b", x=43, y=27, cheia="rs3_ok")
    m.ent(type="crate", id="rs_caixa3", x=36, y=19)
    m.ent(type="plate", id="rs_placa_c", group="rs3b", x=42, y=19)
    m.puzzles["rs3b"] = {"type": "plates", "flag": "rs3_ok"}
    m.cond.append({"if": "rs3_ok", "rects": [[44, 18, 2, 2, "B"]]})
    # 4. conclusão
    m.ent(type="altar", id="rs_altar", x=55, y=16, flag="rito_seiva_ok", requires="rs3_ok", bond="missao:rito_seiva", fx="roots", folha="altar_seiva",
          msg_falta="O altar espera a seiva correr por todos os canais do rito.",
          loot={"golpe_enraizado": 1}, lines=["A seiva sobe pelos canais e o altar se cobre de brotos.",
          "Uma voz antiga, grave como madeira velha: \"Quem guia a seiva sem quebrá-la aprende a prender sem ferir.\"",
          "Você aprendeu o GOLPE ENRAIZADO: o golpe carregado (segure {atacar}) prende inimigos pequenos com raízes."])
    # 5. rito avançado (opcional, depois do Cervo): Raiz Viva em sequência com os canais
    m.ent(type="raiz_seiva", id="rs_av_raiz1", x=55, y=10, flag="rs_av1")
    m.cond.append({"if": "rs_av1", "rects": [[54, 6, 2, 4, "B"]]})
    m.ent(type="sign", id="rs_placa_av", dialog="rs_placa_av", x=57, y=5)
    m.ent(type="lever", id="rs_av_l1", group="rs_av1", idx=0, x=57, y=2)
    m.puzzles["rs_av1"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "rs_av_s1", "dica_apos": 9, "dica": ""}
    m.cond.append({"if": "rs_av_s1", "rects": [[52, 2, 4, 1, "S"]]})
    m.ent(type="raiz_seiva", id="rs_av_raiz2", x=52, y=4, flag="rs_av2", requires="rs_av_s1")
    m.cond.append({"if": "rs_av2", "rects": [[50, 3, 2, 2, "B"]]})
    m.ent(type="lever", id="rs_av_l2", group="rs_av2", idx=0, x=48, y=2)
    m.puzzles["rs_av2"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "rs_av_s2", "dica_apos": 9, "dica": ""}
    m.cond.append({"if": "rs_av_s2", "rects": [[46, 2, 2, 1, "S"]]})
    m.ent(type="raiz_seiva", id="rs_av_raiz3", x=46, y=4, flag="rs_av3", requires="rs_av_s2")
    m.cond.append({"if": "rs_av3", "rects": [[44, 3, 2, 2, "B"]]})
    m.ent(type="altar", id="rs_altar2", x=40, y=3, flag="rito_seiva_av_ok", requires="rs_av3", fx="roots", folha="altar_seiva",
          msg_falta="O altar avançado espera raízes vivas sobre os dois canais.",
          loot={"amuleto_seiva_viva": 1}, lines=["As raízes bebem a seiva dos dois canais e se fecham sobre o altar como uma mão.",
          "\"A raiz que você trouxe do Cervo agora sabe o caminho da seiva.\"",
          "Você recebeu o AMULETO DE SEIVA VIVA: o vigor se recupera bem mais rápido."])
    return m


# ------------------------------------------------------------------ GROTA DAS RAÍZES ANTIGAS (aberta depois do Cervo)
def grota():
    m = M("grota_seiva", "Grota das Raízes Antigas", 46, 32, music="floresta")
    rnd = random.Random(47)
    m.scatter(rnd, [("T", .24), (",", .12), ("f", .05), ("b", .03), ("o", .02)])
    m.border(2)
    carve_path(m, [(2, 15), (11, 15), (17, 10), (27, 10), (33, 16), (39, 20)], 3)
    carve_path(m, [(17, 10), (17, 22), (25, 24)], 3)
    carve_path(m, [(17, 21), (13, 21)], 3)
    clearing(m, 27, 9, 5, 3); clearing(m, 24, 24, 5, 3); clearing(m, 38, 20, 4, 4); clearing(m, 31, 27, 3, 2)
    m.rect(0, 14, 2, 3, "p")
    # raízes antigas (sólidas) em volta da clareira leste, onde o velho tronco guardava a seiva
    for (x, y) in ((34, 17), (35, 16), (41, 17), (42, 18), (34, 23), (35, 24), (41, 23), (42, 22)):
        m.set(x, y, "x")
    # toca escondida (segredo): fechada por árvores; o tronco oco é a única passagem
    m.rect(5, 18, 8, 7, "T"); m.rect(6, 19, 5, 5, "."); m.rect(11, 21, 2, 1, ".")
    for (x, y) in ((7, 20), (9, 22), (8, 19)):
        m.set(x, y, "f")
    m.spawns = {"from_clareira": [3, 15]}
    m.ent(type="exit", x=0, y=14, w=1, h=3, to="clareira_raizes", spawn="from_grota")
    m.ent(type="sign", id="placa_grota", dialog="placa_grota", x=4, y=13)
    m.ent(type="wild", id="g_brotisco", species="brotisco", level=6, x=12, y=16)
    m.ent(type="wild", id="g_cascalito", species="cascalito", level=6, x=28, y=8)
    m.ent(type="wild", id="g_lumipim", species="lumipim", level=6, x=23, y=25)
    m.ent(type="wild", id="g_lumipim_neblina", species="lumipim", level=7, x=26, y=23, clima="neblina")
    m.ent(type="enemy", kind="lobo", id="g_lobo1", x=30, y=12)
    m.ent(type="enemy", kind="lobo", id="g_lobo2", x=37, y=22)
    m.ent(type="enemy", kind="cogumelo", id="g_cog1", x=21, y=10)
    m.ent(type="enemy", kind="cogumelo", id="g_cog2", x=31, y=27)
    m.ent(type="enemy", kind="sentinela", id="g_sent1", x=25, y=23)
    m.ent(type="chest", id="grota_bau", x=38, y=19, loot={"diario_expedicao_2": 1, "selo_refinado": 2, "tonico_criatura": 1, "fragmentos": 50})
    m.ent(type="tronco_oco", id="g_tronco", x=11, y=21, flag="grota_tronco")
    m.ent(type="pickup", id="semente_grota", item="semente_vida", sheet="icons_chave", frame=3, flag="semente_grota_pega", x=7, y=21, unless_flag="semente_grota_pega")
    return m


# ================================================================== CAPITULO 2 — MINAS DA BRASA
def mroom(m, x, y, w, h, floor="z", wall="Z"):
    """interior x..x+w-1; paredes `wall` ao redor sobre vazio"""
    for j in range(y - 1, y + h + 1):
        for i in range(x - 1, x + w + 1):
            if x <= i < x + w and y <= j < y + h:
                m.set(i, j, floor)
            elif 0 <= i < m.w and 0 <= j < m.h and m.g[j][i] == "v":
                m.set(i, j, wall)


def fhouse(m, x, y, w):
    """casa da Forja de Cobre: telhado de cobre (2 linhas) + parede com porta e janelas"""
    m.rect(x, y, w, 2, "A")
    m.rect(x, y + 2, w, 1, "a")


# ------------------------------------------------------------------ FORJA DE COBRE (núcleo seguro)
def forja():
    m = M("forja_cobre", "Forja de Cobre", 48, 36, fill="M", music="minas", region="minas", safe=True)
    m.rect(3, 3, 42, 30, "m")
    m.rect(15, 12, 18, 11, "z")                     # praça
    fhouse(m, 5, 4, 6)                              # casa da Tessa
    fhouse(m, 13, 4, 5)                             # casa do Nino
    fhouse(m, 5, 26, 7)                             # armazém do Bento
    fhouse(m, 36, 26, 6)                            # casa dos Ruivo
    m.rect(30, 4, 12, 2, "A"); m.rect(30, 6, 12, 1, "a")   # a grande forja (chaminé na ponta)
    m.rect(30, 7, 12, 4, "z")                       # pátio da forja
    m.set(33, 10, "O"); m.set(38, 10, "O")           # escória fria antes do chefão
    m.rect(43, 4, 2, 6, "L")                        # canal de lava
    m.rect(33, 18, 12, 1, "=")                      # trilhos decorativos para leste
    m.rect(22, 0, 4, 3, "m")                        # portão norte (passagem de carga da Fundição)
    m.rect(22, 33, 4, 3, "m")                       # sul: entrada das minas
    m.rect(0, 17, 3, 3, "m")                        # oeste: Pedreira Oca
    m.rect(45, 17, 3, 3, "m")                       # leste: Trilhos Fundidos
    m.rect(39, 22, 3, 2, "%")                       # plataforma do elevador
    m.rect(44, 28, 1, 3, "X"); m.rect(45, 28, 2, 3, "m")    # rocha fissurada do muro leste (segredo pós-chefão)
    for (x, y) in ((4, 12), (4, 22), (43, 13), (12, 31), (34, 31)):
        m.set(x, y, "u")
    m.spawns = {"default": [23, 30], "from_entrada": [23, 31], "from_pedreira": [4, 18], "from_trilhos": [43, 18],
                "from_fundicao": [23, 4], "from_elevador": [40, 21]}
    m.ent(type="shrine", id="forja", x=24, y=15)
    m.ent(type="sign", id="placa_forja", dialog="placa_forja", x=21, y=21)
    m.ent(type="prop", id="quadro_forja", sheet="quadro_contratos", frame=0, x=30, y=15, solid=True, contratos=True)
    # rotinas: os moradores mudam de lugar conforme o progresso
    m.ent(type="npc", id="doran", sprite="npc_forja2", dialog="doran", x=20, y=16, nome="Doran", unless_flag="ferreiro_morto")
    m.ent(type="npc", id="doran_forja", sprite="npc_forja2", dialog="doran", x=33, y=12, nome="Doran", if_flag="ferreiro_morto")
    m.ent(type="npc", id="ilda", sprite="npc_forja1", dialog="ilda", x=35, y=8, nome="Mestra Ilda")
    m.ent(type="npc", id="joca", sprite="npc_forja2", dialog="joca", x=28, y=21, nome="Joca", if_flag="ferreiro_morto")
    m.ent(type="spirit_mark", id="forja_inscricao", x=17, y=13, requires_eco="olhar_velado", dialog="inscricao_forja",
          msg="Sob a fuligem do chão da praça há letras que somem quando você as encara. Algo oculto... (Olhar Velado — volte depois)")
    m.ent(type="anvil", id="bigorna", x=37, y=8)
    m.ent(type="furnace", id="forja_f1", x=32, y=8, lit_flag="ferreiro_morto")
    m.ent(type="furnace", id="forja_f2", x=40, y=8, lit_flag="ferreiro_morto")
    m.ent(type="npc", id="bento", sprite="npc_elder", dialog="bento", x=8, y=29, nome="Bento")
    m.ent(type="npc", id="tessa", sprite="npc_ranger", dialog="tessa", x=7, y=8, nome="Tessa", unless_flag="ferramentas_entregue")
    m.ent(type="npc", id="tessa_mina", sprite="npc_ranger", dialog="tessa", x=4, y=16, nome="Tessa", if_flag="ferramentas_entregue")
    m.ent(type="npc", id="nino", sprite="npc_forja3", dialog="nino", x=15, y=8, nome="Nino", unless_flag="vigia_morto")
    m.ent(type="npc", id="nino_praca", sprite="npc_forja3", dialog="nino", x=26, y=19, nome="Nino", if_flag="vigia_morto")
    m.ent(type="npc", id="ruivo", sprite="npc_corvelo", dialog="ruivo", x=38, y=30, nome="Sra. Ruivo", if_flag="ferreiro_morto")
    m.ent(type="sign", id="placa_elevador", dialog="placa_elevador", x=38, y=21)
    m.ent(type="crack", id="forja_rocha", x=43, y=29, flag="forja_rocha")
    m.ent(type="chest", id="forja_bau_rocha", x=46, y=29, loot={"lingote": 2, "selo_refinado": 2, "diario_ilda": 1})
    m.ent(type="door", id="portao_fundicao", tiles=[[22, 2], [23, 2], [24, 2], [25, 2]], open_flags=["atalho_fundicao_aberto"], closed_char="I")
    m.ent(type="exit", x=22, y=35, w=4, h=1, to="minas_entrada", spawn="from_forja")
    m.ent(type="exit", x=0, y=17, w=1, h=3, to="pedreira_oca", spawn="from_forja")
    m.ent(type="exit", x=47, y=17, w=1, h=3, to="trilhos_fundidos", spawn="from_forja")
    m.ent(type="exit", x=22, y=0, w=4, h=1, to="fundicao_b", spawn="from_forja")
    m.ent(type="exit", x=39, y=22, w=3, h=2, to="pedreira_oca", spawn="from_elevador", if_flag="ferreiro_morto")
    m.cond.append({"if": "ferreiro_morto", "rects": [[33, 10, 1, 1, "z"], [38, 10, 1, 1, "z"]], "area": [3, 3, 42, 30], "chars": {"m": "z"}})
    m.cond.append({"if": "forja_rocha", "rects": [[44, 28, 1, 3, "m"]]})
    return m


# ------------------------------------------------------------------ PEDREIRA OCA (rota 1)
def pedreira():
    m = M("pedreira_oca", "Pedreira Oca", 56, 44, fill="J", music="minas", region="minas")
    m.rect(48, 18, 8, 3, "j")                       # entrada leste (da Forja)
    m.rect(30, 10, 18, 20, "j")                     # pedreira central
    m.rect(34, 30, 12, 6, "j")                      # bolsão quente (Faisquito)
    m.rect(41, 32, 4, 3, "Q"); m.set(45, 33, "L"); m.set(45, 34, "L")
    m.rect(16, 14, 14, 3, "Q")                      # galeria quente (válvula)
    m.rect(4, 8, 12, 14, "m")                       # minas a oeste
    m.rect(8, 22, 3, 2, "m")
    m.rect(4, 24, 12, 8, "m")                       # galeria escura (Fuligin)
    m.rect(8, 0, 4, 8, "j")                         # saída norte (Fundição)
    m.rect(42, 3, 6, 5, "j"); m.rect(44, 8, 2, 2, "j")      # nicho do elevador
    m.rect(44, 4, 2, 2, "%")
    m.rect(6, 34, 8, 3, "m"); m.rect(9, 37, 2, 1, "X"); m.rect(6, 38, 8, 3, "m")   # veio esquecido (segredo)
    for (x, y) in ((31, 11), (46, 13), (14, 9), (33, 27), (5, 30)):
        m.set(x, y, "O")
    for (x, y) in ((36, 12), (40, 24), (6, 10), (13, 20)):
        m.set(x, y, "u")
    m.spawns = {"from_forja": [53, 19], "from_fundicao": [9, 2], "from_elevador": [45, 6]}
    m.ent(type="exit", x=55, y=18, w=1, h=3, to="forja_cobre", spawn="from_pedreira")
    m.ent(type="exit", x=8, y=0, w=4, h=1, to="fundicao_a", spawn="from_pedreira")
    m.ent(type="exit", x=44, y=4, w=2, h=2, to="forja_cobre", spawn="from_elevador", if_flag="ferreiro_morto")
    m.ent(type="sign", id="placa_pedreira", dialog="placa_pedreira", x=46, y=16)
    m.ent(type="valve", id="pedreira_valvula", x=31, y=13, flag="pedreira_valv")
    m.cond.append({"if": "pedreira_valv", "area": [16, 14, 14, 3], "chars": {"Q": "q"}})
    m.ent(type="wild", id="p_faisquito1", species="faisquito", level=8, x=37, y=32)
    m.ent(type="wild", id="p_faisquito2", species="faisquito", level=8, x=39, y=34)
    m.ent(type="furnace", id="p_ninho_forn", group="ninho", x=43, y=31)
    m.ent(type="brazier", id="p_ninho_brasa", x=35, y=31)
    m.puzzles["ninho"] = {"type": "furnaces", "flag": "ninho_aceso", "msg": "A fornalha velha acendeu... e fagulhas curiosas saem das frestas: um ninho de Faisquitos!"}
    m.ent(type="wild", id="p_faisquito_ninho1", species="faisquito", level=9, x=40, y=34, if_flag="ninho_aceso")
    m.ent(type="wild", id="p_faisquito_ninho2", species="faisquito", level=10, x=43, y=34, if_flag="ninho_aceso")
    m.ent(type="wild", id="p_fuligin1", species="fuligin", level=8, x=8, y=27)
    m.ent(type="wild", id="p_fuligin2", species="fuligin", level=9, x=12, y=29)
    m.ent(type="enemy", kind="mineiro", id="p_min1", x=36, y=15)
    m.ent(type="enemy", kind="mineiro", id="p_min2", x=42, y=22)
    m.ent(type="enemy", kind="mineiro", id="p_min3", x=10, y=12)
    m.ent(type="enemy", kind="lesma", id="p_lesma1", x=38, y=26)
    m.ent(type="enemy", kind="lesma", id="p_lesma2", x=12, y=17)
    m.ent(type="ore", id="p_veio1", x=32, y=11, loot={"minerio_cobre": 2})
    m.ent(type="ore", id="p_veio2", x=45, y=13, loot={"minerio_cobre": 2})
    m.ent(type="ore", id="p_veio3", x=14, y=10, loot={"minerio_cobre": 1, "brasa_viva": 1})
    m.ent(type="chest", id="pedreira_bau1", x=46, y=4, loot={"minerio_cobre": 2, "selo_refinado": 1, "diario_elevador": 1})
    # segredo: a fumaça do Fuligin revela a fresta; a Ruptura Ígnea quebra a rocha do veio
    m.ent(type="sign", id="placa_veio", dialog="placa_veio", x=5, y=25)
    m.ent(type="draft", id="fresta_veio", x=9, y=31, flag="veio_revelado", tiles=[[9, 32], [10, 32], [9, 33], [10, 33]])
    m.cond.append({"if": "veio_revelado", "rects": [[9, 32, 2, 2, "m"]]})
    m.ent(type="sign", id="veio_placa", dialog="placa_veio_rocha", x=12, y=35)
    m.ent(type="crack", id="veio_rocha", x=9, y=36, flag="veio_rocha")
    m.cond.append({"if": "veio_rocha", "rects": [[9, 37, 2, 1, "m"]]})
    m.ent(type="chest", id="veio_bau", x=9, y=39, loot={"placa_cobre": 1, "lingote": 2, "selo_refinado": 2}, set_flag="veio_tesouro")
    return m


# ------------------------------------------------------------------ TRILHOS FUNDIDOS (rota 2)
def trilhos():
    m = M("trilhos_fundidos", "Trilhos Fundidos", 56, 40, fill="M", music="minas", region="minas")
    m.rect(0, 18, 4, 3, "m")                        # entrada oeste (da Forja)
    m.rect(4, 12, 14, 16, "m")                      # pátio oeste
    m.rect(9, 28, 3, 1, "m"); m.rect(5, 29, 12, 6, "m")     # sucata (Ferrunho)
    m.rect(18, 16, 26, 9, "m")                      # pátio dos trilhos
    m.rect(24, 16, 2, 9, "L")                       # canal de lava (só o trilho atravessa)
    m.rect(19, 20, 19, 1, "=")                      # linha principal (x 19..37)
    m.rect(30, 21, 1, 3, "|")                       # ramal sul (beco)
    m.rect(38, 17, 1, 4, "|")                       # subida até o batente
    m.rect(38, 10, 6, 5, "Q")                       # ala quente 1
    m.rect(38, 8, 6, 2, "m")                        # plataforma
    m.rect(38, 3, 6, 5, "Q")                        # ala quente 2
    m.rect(40, 0, 2, 3, "m")                        # saída norte (Fundição)
    m.rect(40, 15, 2, 1, "m")                       # portão (porta de metal)
    m.rect(22, 25, 2, 1, "m"); m.rect(20, 26, 10, 5, "m")   # veio quente (Faisquito)
    m.rect(27, 27, 2, 2, "Q")
    m.rect(44, 19, 2, 2, "m"); m.rect(46, 18, 3, 4, "L"); m.rect(49, 18, 4, 4, "m")   # ilha do trilho marcado
    for (x, y) in ((17, 12), (6, 33), (15, 30)):
        m.set(x, y, "O")
    for (x, y) in ((5, 13), (16, 26), (19, 24), (43, 24)):
        m.set(x, y, "u")
    m.spawns = {"from_forja": [2, 19], "from_fundicao": [40, 2]}
    m.ent(type="exit", x=0, y=18, w=1, h=3, to="forja_cobre", spawn="from_trilhos")
    m.ent(type="exit", x=40, y=0, w=2, h=1, to="fundicao_a", spawn="from_trilhos")
    m.ent(type="sign", id="placa_trilhos", dialog="placa_trilhos", x=19, y=17)
    m.ent(type="cart", id="t_carrinho", x=20, y=20, goal=[38, 17])
    m.ent(type="rail_lever", id="t_desvio", x=29, y=22, at=[30, 20], a=[1, 0], b=[0, 1], start="b")
    m.ent(type="plate", id="t_batente", group="carro_t", x=38, y=17, so_carrinho=True)
    m.puzzles["carro_t"] = {"type": "plates", "flag": "trilhos_carrinho"}
    m.ent(type="door", id="t_portao", tiles=[[40, 15], [41, 15]], open_flags=["trilhos_carrinho"], closed_char="I")
    m.ent(type="valve", id="t_valvula1", x=42, y=16, flag="tri_alterna")
    m.ent(type="valve", id="t_valvula2", x=43, y=8, flag="tri_alterna")
    m.cond.append({"if": "tri_alterna", "area": [38, 10, 6, 5], "chars": {"Q": "q"}})
    m.cond.append({"unless": "tri_alterna", "area": [38, 3, 6, 5], "chars": {"Q": "q"}})
    m.ent(type="wild", id="t_ferrunho1", species="ferrunho", level=8, x=8, y=31)
    m.ent(type="wild", id="t_ferrunho2", species="ferrunho", level=9, x=13, y=32)
    m.ent(type="wild", id="t_faisquito1", species="faisquito", level=8, x=23, y=28)
    m.ent(type="enemy", kind="mineiro", id="t_min1", x=10, y=15)
    m.ent(type="enemy", kind="mineiro", id="t_min2", x=14, y=24)
    m.ent(type="enemy", kind="automato", id="t_aut1", x=35, y=23)
    m.ent(type="enemy", kind="lesma", id="t_lesma1", x=26, y=29)
    m.ent(type="ore", id="t_veio1", x=16, y=12, loot={"minerio_cobre": 2})
    m.ent(type="chest", id="trilhos_bau1", x=42, y=23, loot={"brasa_viva": 2, "minerio_cobre": 2, "pocao": 1})
    m.ent(type="draft", id="t_vapor", x=17, y=13, flag="trilhos_vapor", hero=True,
          msg="O vapor vazava por uma placa de metal solta. Atrás dela, um depósito esquecido!")
    m.cond.append({"if": "trilhos_vapor", "rects": [[18, 12, 4, 3, "m"]]})
    m.ent(type="chest", id="trilhos_bau_vapor", x=20, y=13, loot={"diario_tessa": 1, "brasa_viva": 1})
    m.ent(type="rail_marked", id="t_trilho_marcado", x=45, y=20, flag="trilho_ferrunho")
    m.cond.append({"if": "trilho_ferrunho", "rects": [[46, 20, 3, 1, "="]]})
    m.ent(type="chest", id="trilhos_bau_ilha", x=51, y=19, loot={"lingote": 1, "selo_refinado": 2, "tonico_criatura": 1})
    return m


# ------------------------------------------------------------------ FUNDIÇÃO DO ÚLTIMO FOGO A
def fundicao_a():
    m = M("fundicao_a", "Fundição do Último Fogo — Grande Caldeira", 60, 44, fill="v", music="masmorra", region="minas")
    mroom(m, 24, 32, 12, 8)                         # 1. átrio (seguro)
    mroom(m, 22, 20, 16, 10)                        # 2. Grande Caldeira (sala central: válvula, lava que baixa)
    m.rect(22, 22, 16, 6, "Q")
    m.rect(27, 22, 6, 5, "L"); m.rect(29, 23, 2, 3, "z")    # caldeira de lava com ilha (baú visível)
    mroom(m, 4, 20, 12, 8)                          # ala de escória (ramificação opcional)
    mroom(m, 16, 24, 6, 2, floor="Q")               # passagem quente: resfriada pela válvula da galeria
    m.set(6, 21, "O"); m.set(13, 26, "O")
    mroom(m, 16, 7, 28, 10)                         # 3. galeria das bigornas (combate)
    mroom(m, 46, 4, 12, 14)                         # 4. câmara das fornalhas (enigma)
    mroom(m, 0, 35, 24, 2); mroom(m, 36, 35, 24, 2)  # corredores das duas rotas
    mroom(m, 29, 30, 2, 2); mroom(m, 29, 17, 2, 3); mroom(m, 44, 11, 2, 2); mroom(m, 58, 10, 2, 2)
    for (x, y) in ((25, 33), (34, 33), (25, 38), (34, 38)):
        m.set(x, y, "u")
    for (x, y) in ((18, 8), (41, 8), (18, 15), (41, 15)):
        m.set(x, y, "u")
    m.spawns = {"from_pedreira": [2, 35], "from_trilhos": [57, 35], "from_b": [57, 10]}
    m.ent(type="exit", x=0, y=35, w=1, h=2, to="pedreira_oca", spawn="from_fundicao")
    m.ent(type="exit", x=59, y=35, w=1, h=2, to="trilhos_fundidos", spawn="from_fundicao")
    m.ent(type="shrine", id="fa_atrio", x=30, y=34)
    # sala das válvulas
    m.ent(type="sign", id="placa_valvulas", dialog="placa_valvulas", x=34, y=28)
    m.ent(type="chest", id="fa_bau_caldeira", x=29, y=24, loot={"diario_fundidor": 1, "brasa_viva": 2, "lingote": 1})
    m.cond.append({"if": "fa_fornalhas", "rects": [[27, 22, 6, 5, "z"]]})      # acender as fornalhas baixa a lava da caldeira
    m.ent(type="valve", id="fa_valvula_oeste", x=17, y=12, flag="fa_valv_oeste")
    m.cond.append({"if": "fa_valv_oeste", "area": [16, 24, 6, 2], "chars": {"Q": "q"}})
    m.ent(type="chest", id="fa_bau_escoria", x=9, y=21, loot={"diario_mineiro": 1, "minerio_cobre": 2})
    m.ent(type="ore", id="fa_veio1", x=7, y=21, loot={"minerio_cobre": 2})
    m.ent(type="enemy", kind="lesma", id="fa_lesma_ala", x=11, y=25)
    m.ent(type="spirit_mark", id="fa_inscricao", x=5, y=26, requires_eco="olhar_velado", dialog="inscricao_fundicao",
          msg="Riscos no tijolo formam um mapa incompleto; parte dele parece existir só para outros olhos. (Olhar Velado — volte depois)")
    m.ent(type="valve", id="fa_valvula", x=25, y=28, flag="fa_valvula1")
    m.cond.append({"if": "fa_valvula1", "area": [22, 22, 16, 6], "chars": {"Q": "q"}})
    # galeria das bigornas
    m.ent(type="enemy", kind="mineiro", id="fa_min1", x=20, y=10, enc="bigornas")
    m.ent(type="enemy", kind="mineiro", id="fa_min2", x=39, y=10, enc="bigornas")
    m.ent(type="enemy", kind="automato", id="fa_aut1", x=30, y=9, enc="bigornas")
    m.ent(type="enemy", kind="lesma", id="fa_lesma1", x=25, y=14, enc="bigornas")
    m.ent(type="encounter", id="bigornas", x=16, y=7, w=28, h=10, flag_done="enc_bigornas_ok", flag_active="tmp_enc_bigornas")
    m.ent(type="door", id="fa_d_in", tiles=[[29, 17], [30, 17]], close_flags=["tmp_enc_bigornas"], closed_char="I")
    m.ent(type="door", id="fa_d_out", tiles=[[44, 11], [44, 12]], open_flags=["enc_bigornas_ok"], closed_char="I")
    m.ent(type="chest", id="fa_bau_bigornas", x=42, y=8, loot={"minerio_cobre": 3, "brasa_viva": 1, "pocao": 1})
    # câmara das fornalhas
    m.ent(type="sign", id="placa_fornalhas", dialog="placa_fornalhas", x=47, y=13)
    m.ent(type="brazier", id="fa_braseiro", x=51, y=15)
    m.ent(type="furnace", id="fa_forn1", group="fornalhas", x=48, y=5, dura=22.0)
    m.ent(type="furnace", id="fa_forn2", group="fornalhas", x=55, y=5, dura=22.0)
    m.ent(type="furnace", id="fa_forn3", group="fornalhas", x=56, y=14, dura=22.0)
    m.puzzles["fornalhas"] = {"type": "furnaces", "flag": "fa_fornalhas", "dica_apos": 3,
                              "dica": "Dica: pegue a chama no braseiro e acenda cada fornalha sem demorar; elas ficam acesas por 22 s."}
    m.ent(type="door", id="fa_d_forn", tiles=[[58, 10], [58, 11]], open_flags=["fa_fornalhas"], closed_char="I")
    m.ent(type="exit", x=59, y=10, w=1, h=2, to="fundicao_b", spawn="from_a")
    return m


# ------------------------------------------------------------------ FUNDIÇÃO B
def fundicao_b():
    m = M("fundicao_b", "Fundição do Último Fogo — Pátio e Vigia", 60, 46, fill="v", music="masmorra", region="minas")
    mroom(m, 2, 3, 26, 17)                          # 5. pátio dos carrinhos (enigma)
    mroom(m, 30, 4, 12, 10)                         # 6. tesouro
    mroom(m, 31, 1, 8, 2)                           # 7. passagem de carga (atalho à Forja)
    mroom(m, 14, 24, 32, 16)                        # 8. arena do Vigia de Escória
    mroom(m, 0, 10, 2, 2); mroom(m, 28, 7, 2, 2); mroom(m, 35, 3, 2, 1); mroom(m, 28, 1, 3, 2)
    mroom(m, 35, 14, 2, 10); mroom(m, 46, 31, 14, 2)
    # pátio: trilhos, desvio na ilha quente e válvula
    m.rect(4, 16, 17, 1, "=")                       # linha (x 4..20), desvio em (14,16)
    m.rect(14, 5, 1, 11, "|")                       # subida até o batente (14,5)
    m.rect(10, 7, 8, 5, "Q")                        # ilha quente
    m.set(14, 7, "|"); m.set(14, 8, "|"); m.set(14, 9, "|"); m.set(14, 10, "|"); m.set(14, 11, "|")
    for (x, y) in ((3, 4), (26, 4), (26, 18)):
        m.set(x, y, "u")
    # arena do Vigia: duas grades de vapor (respiros)
    m.rect(16, 28, 6, 6, "%"); m.rect(38, 28, 6, 6, "%")
    for (x, y) in ((15, 25), (44, 25), (15, 38), (44, 38)):
        m.set(x, y, "u")
    m.spawns = {"from_a": [2, 10], "from_forja": [32, 1], "from_rito": [57, 31]}
    m.ent(type="exit", x=0, y=10, w=1, h=2, to="fundicao_a", spawn="from_b")
    m.ent(type="sign", id="placa_carrinhos", dialog="placa_carrinhos", x=4, y=5)
    m.ent(type="cart", id="fb_carrinho", x=5, y=16, goal=[14, 5])
    m.ent(type="rail_lever", id="fb_desvio", x=16, y=9, at=[14, 16], a=[0, -1], b=[1, 0], start="b")
    m.ent(type="valve", id="fb_valvula", x=8, y=12, flag="fb_valv")
    m.cond.append({"if": "fb_valv", "area": [10, 7, 8, 5], "chars": {"Q": "q"}})
    m.ent(type="plate", id="fb_batente", group="carro_b", x=14, y=5, so_carrinho=True)
    m.puzzles["carro_b"] = {"type": "plates", "flag": "fb_carrinho"}
    m.ent(type="door", id="fb_d_tesouro", tiles=[[28, 7], [28, 8]], open_flags=["fb_carrinho"], closed_char="I")
    # tesouro + santuário
    m.ent(type="chest", id="fb_bau_tesouro", x=33, y=6, loot={"lanca_cobre": 1, "lingote": 1, "brasa_viva": 2, "fragmentos": 60})
    m.ent(type="shrine", id="fb_tesouro", x=39, y=6)
    # passagem de carga: a alavanca abre o portão da Forja por dentro
    m.ent(type="sign", id="placa_atalho_forja", dialog="placa_atalho_forja", x=38, y=2)
    m.ent(type="lever", id="fb_alavanca_atalho", group="atalho", idx=0, x=36, y=1)
    m.puzzles["atalho"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "atalho_fundicao_aberto", "dica_apos": 9, "dica": ""}
    m.ent(type="door", id="fb_portao_forja", tiles=[[30, 1], [30, 2]], open_flags=["atalho_fundicao_aberto"], closed_char="I")
    m.ent(type="exit", x=28, y=1, w=1, h=2, to="forja_cobre", spawn="from_fundicao")
    # arena do Vigia
    m.ent(type="sign", id="placa_vigia", dialog="placa_vigia", x=37, y=12)
    m.ent(type="door", id="fb_d_vigia", tiles=[[35, 23], [36, 23]], close_flags=["tmp_vigia_ativo"], closed_char="I")
    m.ent(type="miniboss", boss="vigia", id="vigia", x=30, y=32, x0=14, y0=24, w=32, h=16, flag_done="vigia_morto", flag_active="tmp_vigia_ativo")
    m.ent(type="valve", id="fb_vv_oeste", x=15, y=30, boss=True, vent=[16, 28, 6, 6])
    m.ent(type="valve", id="fb_vv_leste", x=44, y=30, boss=True, vent=[38, 28, 6, 6])
    m.ent(type="door", id="fb_d_vigia_out", tiles=[[46, 31], [46, 32]], open_flags=["vigia_morto"], closed_char="I")
    m.ent(type="exit", x=59, y=31, w=1, h=2, to="rito_forja", spawn="from_b")
    m.suspense = [[35, 14, 2, 10, "vigia_morto"]]      # corredor que desce à arena do Vigia
    return m


# ------------------------------------------------------------------ FUNDIÇÃO C (chefão)
def fundicao_c():
    m = M("fundicao_c", "Fundição do Último Fogo — Coração da Forja", 56, 36, fill="v", music="masmorra", region="minas")
    mroom(m, 2, 14, 12, 8)                          # 9. preparação
    mroom(m, 18, 6, 28, 22)                         # 10. arena do Ferreiro Devorador
    mroom(m, 0, 17, 2, 2); mroom(m, 14, 17, 4, 2); mroom(m, 46, 16, 10, 2)
    for (x, y) in ((23, 10), (40, 10), (23, 23), (40, 23)):
        m.set(x, y, "%")
    m.spawns = {"from_rito": [2, 17]}
    m.ent(type="exit", x=0, y=17, w=1, h=2, to="rito_forja", spawn="from_c")
    m.ent(type="shrine", id="fc_prep", x=7, y=16)
    m.ent(type="chest", id="fc_bau_prep", x=11, y=15, loot={"pocao": 2, "tonico_criatura": 1})
    m.ent(type="sign", id="placa_ferreiro", dialog="placa_ferreiro", x=4, y=20)
    m.ent(type="door", id="fc_d_in", tiles=[[17, 17], [17, 18]], close_flags=["tmp_ferreiro_ativo"], closed_char="I")
    m.ent(type="boss", boss="ferreiro", id="ferreiro", x=36, y=16, x0=18, y0=6, w=28, h=22, flag_done="ferreiro_morto", flag_active="tmp_ferreiro_ativo",
          quebra=[[29, 8, 6, 6], [29, 20, 6, 6]])
    m.ent(type="valve", id="fc_vv_no", x=19, y=7, boss=True, vent=[20, 8, 9, 7])
    m.ent(type="valve", id="fc_vv_ne", x=44, y=7, boss=True, vent=[35, 8, 9, 7])
    m.ent(type="valve", id="fc_vv_so", x=19, y=26, boss=True, vent=[20, 19, 9, 7])
    m.ent(type="valve", id="fc_vv_se", x=44, y=26, boss=True, vent=[35, 19, 9, 7])
    m.cond.append({"if": "tmp_ferreiro_piso", "rects": [[29, 8, 6, 6, "L"], [29, 20, 6, 6, "L"]]})
    m.ent(type="door", id="fc_d_out", tiles=[[46, 16], [46, 17]], open_flags=["ferreiro_morto"], closed_char="I")
    m.ent(type="exit", x=55, y=16, w=1, h=2, to="forja_cobre", spawn="from_fundicao")
    m.suspense = [[0, 14, 18, 8, "ferreiro_morto"]]    # preparação + corredor do Coração da Forja
    return m



# ------------------------------------------------------------------ RITO DA FORJA (prova antes do Ferreiro + ala avançada pós-chefão)
def rito():
    m = M("rito_forja", "Rito da Forja", 60, 30, fill="v", music="masmorra", region="minas")
    mroom(m, 2, 10, 12, 10)                         # 1. apresentação segura
    mroom(m, 16, 6, 14, 18)                         # 2. aplicação: calor + chama
    mroom(m, 33, 6, 16, 18)                         # 3. combinação: válvula temporizada + três fornalhas
    mroom(m, 52, 10, 6, 10)                         # 4. conclusão (altar)
    mroom(m, 50, 2, 9, 5)                           # 5. rito avançado (opcional, pós-chefão)
    mroom(m, 0, 14, 2, 2); mroom(m, 14, 14, 2, 2); mroom(m, 30, 14, 3, 2); mroom(m, 49, 14, 3, 2); mroom(m, 58, 14, 2, 2)
    m.rect(6, 12, 4, 2, "Q")                        # faixa de demonstração (fora do caminho)
    m.rect(21, 6, 3, 18, "Q")                       # faixa quente da sala 2
    m.rect(37, 6, 2, 18, "Q"); m.rect(43, 6, 2, 18, "Q")    # duas faixas da sala 3
    m.rect(54, 7, 2, 3, "X")                        # rocha fissurada: ala avançada
    m.rect(52, 3, 2, 3, "L"); m.rect(56, 3, 1, 3, "L")
    m.spawns = {"from_b": [2, 14], "from_c": [57, 14]}
    m.ent(type="exit", x=0, y=14, w=1, h=2, to="fundicao_b", spawn="from_rito")
    m.ent(type="exit", x=59, y=14, w=1, h=2, to="fundicao_c", spawn="from_rito")
    # 1. apresentação
    m.ent(type="sign", id="rito_placa1", dialog="rito_placa1", x=4, y=11)
    m.ent(type="valve", id="rito_v1", x=5, y=17, flag="rito_v1")
    m.cond.append({"if": "rito_v1", "area": [6, 12, 4, 2], "chars": {"Q": "q"}})
    m.ent(type="brazier", id="rito_b1", x=10, y=17)
    m.ent(type="furnace", id="rito_f1", group="rito1", x=12, y=17)
    m.puzzles["rito1"] = {"type": "furnaces", "flag": "rito_f1_ok", "msg": "A primeira chama do rito acendeu."}
    m.ent(type="door", id="rito_d1", tiles=[[14, 14], [14, 15]], open_flags=["rito_v1", "rito_f1_ok"], closed_char="I")
    # 2. aplicação
    m.ent(type="sign", id="rito_placa2", dialog="rito_placa2", x=17, y=17)
    m.ent(type="rite_reset", id="rito_reset2", x=17, y=12)
    m.ent(type="valve", id="rito_v2", x=18, y=7, flag="rito_v2")
    m.cond.append({"if": "rito_v2", "area": [21, 6, 3, 18], "chars": {"Q": "q"}})
    m.ent(type="brazier", id="rito_b2", x=18, y=21)
    m.ent(type="furnace", id="rito_f2a", group="rito2", x=27, y=8, dura=30.0)
    m.ent(type="furnace", id="rito_f2b", group="rito2", x=27, y=21, dura=30.0)
    m.puzzles["rito2"] = {"type": "furnaces", "flag": "rito_f2_ok", "dica_apos": 3, "msg": "As duas fornalhas ardem: a porta do rito cede.",
                          "dica": "Dica: resfrie a faixa com a válvula, pegue a chama e acenda uma fornalha por vez; cada uma fica acesa 30 s."}
    m.ent(type="door", id="rito_d2", tiles=[[30, 14], [30, 15]], open_flags=["rito_f2_ok"], closed_char="I")
    # 3. combinação e sincronização
    m.ent(type="sign", id="rito_placa3", dialog="rito_placa3", x=34, y=17)
    m.ent(type="rite_reset", id="rito_reset3", x=34, y=12)
    m.ent(type="valve", id="rito_v3", x=35, y=8, flag="tmp_rito_v3", dura=16.0, group="rito3")
    m.cond.append({"if": "tmp_rito_v3", "area": [37, 6, 8, 18], "chars": {"Q": "q"}})
    m.ent(type="brazier", id="rito_b3", x=35, y=21)
    m.ent(type="brazier", id="rito_b3b", x=41, y=21)
    m.ent(type="furnace", id="rito_f3a", group="rito3", x=40, y=8, dura=34.0)
    m.ent(type="furnace", id="rito_f3b", group="rito3", x=47, y=8, dura=34.0)
    m.ent(type="furnace", id="rito_f3c", group="rito3", x=47, y=21, dura=34.0)
    m.puzzles["rito3"] = {"type": "furnaces", "flag": "rito_f3_ok", "dica_apos": 3, "msg": "Três fornalhas em uníssono! O altar desperta.",
                          "dica": "Dica: gire a válvula logo antes de atravessar; o braseiro entre as faixas encurta o caminho. Acenda as três em até 34 s."}
    m.ent(type="door", id="rito_d3", tiles=[[49, 14], [49, 15]], open_flags=["rito_f3_ok"], closed_char="I")
    # 4. conclusão
    m.ent(type="altar", id="rito_altar", x=55, y=12, flag="rito_ok", requires="rito_f3_ok", bond="missao:rito_forja",
          loot={"luvas_termicas": 1}, lines=["As três chamas sobem pelos dutos e o altar devolve o calor em silêncio.",
          "Uma voz antiga, de ferreiros que já se foram: \"Quem domina o fogo e o frio pode encarar o Devorador.\"",
          "Você recebeu as LUVAS TÉRMICAS: o piso em brasa fere metade."])
    m.ent(type="furnace", id="rito_f4a", x=53, y=18, lit_flag="rito_ok")
    m.ent(type="furnace", id="rito_f4b", x=56, y=18, lit_flag="rito_ok")
    m.ent(type="door", id="rito_d4", tiles=[[58, 14], [58, 15]], open_flags=["rito_ok"], closed_char="I")
    # 5. rito avançado (Ruptura Ígnea; opcional, depois do Ferreiro)
    m.ent(type="crack", id="rito_rocha", x=55, y=11, flag="rito_rocha")
    m.cond.append({"if": "rito_rocha", "rects": [[54, 7, 2, 3, "z"]]})
    m.ent(type="sign", id="rito_placa_av", dialog="rito_placa_av", x=50, y=6)
    m.ent(type="furnace", id="rito_mec1", group="rito_av", x=51, y=3, so_ruptura=True, dura=15.0)
    m.ent(type="furnace", id="rito_mec2", group="rito_av", x=51, y=5, so_ruptura=True, dura=15.0)
    m.ent(type="furnace", id="rito_mec3", group="rito_av", x=58, y=4, so_ruptura=True, dura=15.0)
    m.puzzles["rito_av"] = {"type": "furnaces", "flag": "rito_av_mec", "dica_apos": 3, "msg": "Os mecanismos térmicos ardem juntos!",
                            "dica": "Dica: uma só Ruptura pode acender os dois mecanismos do oeste; depois corra ao terceiro antes de 15 s."}
    m.ent(type="altar", id="rito_altar2", x=58, y=6, flag="rito_avancado_ok", requires="rito_av_mec",
          msg_falta="O altar avançado espera os três mecanismos térmicos acesos ao mesmo tempo.",
          loot={"amuleto_brasa": 1}, lines=["O altar avançado ruge. Você domina o fogo que quebra a pedra.", "Você recebeu o AMULETO DA BRASA."])
    return m

# ================================================================== CAPITULO 3 — PÂNTANO DOS SUSSURROS
# Caracteres (docs/REGIAO3_CONTRATO.md): l lodo, s capim, n juncos*, W agua funda*, t agua rasa, + passarela,
# U lodo instavel*, 8 lodo firme, Y parede do templo*, 9 piso do templo, 0 piso alagado, E ponte espiritual,
# ^ telhado de palha*, & parede de palafita*, * poste de lanterna*, ! porta do templo*, i pilar submerso*, ; degraus
def proom(m, x, y, w, h, floor="9", wall="Y"):
    mroom(m, x, y, w, h, floor, wall)


def palafita(m, x, y, w):
    """casa de palafita do Porto: telhado de palha (2 linhas) + parede de tábuas com porta"""
    m.rect(x, y, w, 2, "^")
    m.rect(x, y + 2, w, 1, "&")


# ------------------------------------------------------------------ PORTO DAS LANTERNAS (núcleo seguro)
def porto():
    m = M("porto_lanternas", "Porto das Lanternas", 48, 36, fill="W", music="pantano", region="pantano", safe=True)
    rnd = random.Random(301)
    m.rect(10, 8, 28, 20, "s")                      # ilha do porto
    for (x, y) in ((10, 8), (11, 8), (10, 9), (37, 8), (36, 8), (37, 9), (10, 27), (11, 27), (10, 26), (37, 27), (36, 27), (37, 26)):
        m.set(x, y, "W")
    for j in range(8, 28):
        for i in range(10, 38):
            if m.g[j][i] == "s" and rnd.random() < 0.18:
                m.g[j][i] = "l"
    m.rect(17, 13, 14, 9, "+")                      # praça de tábuas
    m.rect(0, 16, 10, 3, "+")                       # oeste: Passagem Sul (Minas)
    m.rect(22, 0, 4, 8, "+")                        # norte: Passarela dos Ecos
    m.rect(38, 16, 10, 3, "+")                      # leste: Lago dos Reflexos
    m.rect(22, 28, 4, 8, "+")                       # sul: Canal Submerso (atalho do templo)
    m.rect(17, 26, 2, 5, "+"); m.rect(29, 26, 2, 5, "+")    # píeres
    palafita(m, 11, 9, 6)                           # casa da Iara (farol)
    palafita(m, 31, 9, 6)                           # casa do Arão
    palafita(m, 11, 23, 5)                          # casa da Dalva
    palafita(m, 32, 23, 5)                          # casa do Tito
    for (x, y) in ((16, 12), (31, 12), (16, 22), (31, 22), (21, 8), (26, 8)):
        m.set(x, y, "*")
    m.rect(19, 24, 2, 2, "n"); m.set(27, 25, "n"); m.set(13, 19, "n"); m.set(35, 19, "n")
    # margem nova e trilha da Muralha (gancho da Região 4): ponte espiritual a nordeste
    m.rect(44, 3, 4, 7, "s")
    m.rect(34, 6, 3, 2, "+")                        # cais da ponte espiritual
    m.spawns = {"default": [24, 18], "from_minas": [2, 17], "from_passarela": [23, 2], "from_lago": [45, 17], "from_templo": [23, 33],
                "from_templo_c": [24, 18], "from_muralha": [45, 6]}
    m.ent(type="shrine", id="porto", x=24, y=15)
    m.ent(type="sign", id="placa_porto", dialog="placa_porto", x=19, y=20)
    m.ent(type="prop", id="quadro_porto", sheet="quadro_porto", frame=0, x=28, y=12, solid=True, contratos=True)
    # moradores (rotinas: mudam de lugar com o progresso e com o tempo)
    m.ent(type="npc", id="arao", sprite="npc_porto1", dialog="arao", x=21, y=15, nome="Arão", unless_flag="bruxa_morta")
    m.ent(type="npc", id="arao_cais", sprite="npc_porto1", dialog="arao", x=24, y=26, nome="Arão", if_flag="bruxa_morta")
    m.ent(type="npc", id="iara", sprite="npc_porto2", dialog="iara", x=14, y=13, nome="Iara")
    m.ent(type="npc", id="tito", sprite="npc_porto3", dialog="tito", x=6, y=18, nome="Tito", clima=["sol", "neblina"], unless_flag="bruxa_morta")
    m.ent(type="npc", id="tito_abrigo", sprite="npc_porto3", dialog="tito", x=34, y=27, nome="Tito", clima="chuva", unless_flag="bruxa_morta")
    m.ent(type="npc", id="tito_pier", sprite="npc_porto3", dialog="tito", x=30, y=27, nome="Tito", if_flag="bruxa_morta")
    m.ent(type="npc", id="nina", sprite="npc_kid", dialog="nina", x=27, y=19, nome="Nina")
    m.ent(type="npc", id="dalva", sprite="npc_porto4", dialog="dalva", x=13, y=26, nome="Dalva")
    m.ent(type="npc", id="cora", sprite="npc_porto4", dialog="cora", x=18, y=27, nome="Cora", if_flag="bruxa_morta")
    m.ent(type="decor", id="porto_barco1", frame="barco", x=19, y=29)
    m.ent(type="decor", id="porto_barco2", frame="barco", x=31, y=29, if_flag="bruxa_morta")
    m.ent(type="decor", id="porto_cesto1", frame="cesto", x=20, y=21)
    m.ent(type="decor", id="porto_cesto2", frame="cesto", x=33, y=13)
    m.ent(type="sign", id="placa_canal", dialog="placa_canal", x=21, y=27)
    m.ent(type="door", id="porto_comporta", tiles=[[22, 29], [23, 29], [24, 29], [25, 29]], open_flags=["atalho_porto_aberto"], closed_char="!", open_char="+")
    m.ent(type="spirit_bridge", id="ponte_muralha", x=36, y=7, flag="ponte_muralha", requires_eco="olhar_velado",
          msg="Tábuas de luz tremulam sobre a água rumo ao nordeste e somem quando você as encara. (Olhar Velado — volte depois)",
          msg_ok="O Olhar Velado revela a ponte espiritual da Trilha da Muralha!")
    m.cond.append({"if": "ponte_muralha", "rects": [[37, 6, 7, 1, "E"]]})
    m.ent(type="sign", id="placa_muralha", dialog="placa_muralha", x=46, y=8)
    m.ent(type="chapter_end", id="fim_cap3", x=44, y=3, w=2, h=7, flag="fim_cap3", if_flag="ponte_muralha",
          lines=["FIM DO CAPÍTULO 3 — Pântano dos Sussurros.",
                 "A ponte espiritual leva à Trilha da Muralha e às montanhas da Fortaleza do Eclipse.",
                 "CAPÍTULO 4 — Fortaleza do Eclipse. Siga a trilha para leste, até a Ponte Espiritual."])
    m.ent(type="exit", x=47, y=3, w=1, h=7, to="ponte_espiritual", spawn="from_pantano", if_flag="ponte_muralha")
    m.ent(type="exit", x=0, y=16, w=1, h=3, to="minas_entrada", spawn="from_pantano")
    m.ent(type="exit", x=22, y=0, w=4, h=1, to="passarela_ecos", spawn="from_porto")
    m.ent(type="exit", x=47, y=16, w=1, h=3, to="lago_reflexos", spawn="from_porto")
    m.ent(type="exit", x=22, y=35, w=4, h=1, to="templo_b", spawn="from_porto")
    return m


# ------------------------------------------------------------------ PASSARELA DOS ECOS (rota 1)
def passarela():
    m = M("passarela_ecos", "Passarela dos Ecos", 56, 40, fill="W", music="pantano", region="pantano")
    rnd = random.Random(311)
    m.rect(22, 30, 4, 10, "+")                      # entrada sul (do Porto)
    m.rect(14, 24, 20, 6, "l")                      # 1. ilha do meio
    m.rect(2, 18, 10, 12, "l")                      # 2. ilha oeste (lodo do Brejugo)
    m.rect(6, 26, 8, 2, "+")
    m.rect(26, 14, 3, 10, "+")                      # passarela norte
    m.rect(29, 14, 3, 3, "l")                       # plataforma das estacas
    m.rect(26, 10, 3, 4, "U")                       # lodo instável (caminho principal: estacas)
    m.rect(20, 3, 16, 7, "l")                       # 3. ilha norte
    m.rect(26, 0, 4, 3, "+")                        # saída ao Templo Submerso
    m.rect(34, 26, 10, 2, "+")                      # passarela leste
    m.rect(44, 20, 10, 10, "l")                     # 4. ilha leste (Goturim)
    m.rect(46, 22, 6, 5, "t")
    m.rect(2, 4, 10, 8, "l")                        # 5. ilha noroeste (atalho do Brejugo)
    m.rect(4, 12, 3, 6, "U")
    m.rect(12, 8, 8, 2, "+")                        # tábuas da ilha noroeste até a ilha norte
    m.rect(44, 4, 8, 6, "l")                        # 6. ilhota do canal (roda d'água)
    m.rect(47, 10, 3, 10, "W")
    m.rect(14, 3, 3, 3, "l")                        # nicho dos juncos sussurrantes
    m.rect(17, 3, 3, 3, "n")
    for (x0, y0, w0, h0) in ((14, 24, 20, 6), (2, 18, 10, 12), (20, 3, 16, 7), (44, 20, 10, 10), (2, 4, 10, 8), (44, 4, 8, 6)):
        for j in range(y0, y0 + h0):
            for i in range(x0, x0 + w0):
                if m.g[j][i] == "l" and rnd.random() < 0.3:
                    m.g[j][i] = "s"
    for (x, y) in ((15, 28), (32, 24), (3, 19), (10, 28), (21, 8), (34, 4), (52, 21), (45, 28), (3, 10), (22, 3)):
        m.set(x, y, "n")
    m.set(6, 6, "n"); m.set(7, 6, "n"); m.set(6, 7, "n"); m.set(22, 4, "s")
    m.spawns = {"from_porto": [23, 38], "from_templo": [27, 1]}
    m.ent(type="exit", x=22, y=39, w=4, h=1, to="porto_lanternas", spawn="from_passarela")
    m.ent(type="exit", x=26, y=0, w=4, h=1, to="templo_a", spawn="from_passarela")
    m.ent(type="sign", id="placa_passarela", dialog="placa_passarela", x=21, y=28)
    m.ent(type="lantern", id="guia1", group="guias", x=19, y=25, msg="Uma lanterna-guia acesa. (Iara pediu três)")
    m.ent(type="lantern", id="guia2", group="guias", x=31, y=16, msg="Mais uma lanterna-guia acesa.")
    m.ent(type="lantern", id="guia3", group="guias", x=24, y=5, msg="Uma lanterna-guia acesa.")
    m.puzzles["guias"] = {"type": "lanterns", "flag": "lanternas_ok", "msg": "As três lanternas-guia brilham: a passarela inteira se acende! Volte à Iara."}
    # lodo instável do caminho principal: estacas locais
    m.ent(type="sign", id="placa_estacas", dialog="placa_estacas", x=30, y=14)
    m.ent(type="stakes", id="estacas_norte", x=29, y=15, flag="passarela_estacas")
    m.cond.append({"if": "passarela_estacas", "area": [26, 10, 3, 4], "chars": {"U": "8"}})
    # atalho do Brejugo: lodo marcado entre a ilha oeste e a ilha noroeste
    m.ent(type="mud_mark", id="marca_noroeste", x=5, y=18, flag="passarela_lodo_brejugo")
    m.cond.append({"if": "passarela_lodo_brejugo", "area": [4, 12, 3, 6], "chars": {"U": "8"}})
    m.ent(type="chest", id="passarela_bau_noroeste", x=8, y=5, loot={"semente_vida": 1, "selo_refinado": 2})
    # roda d'água do Goturim: escoa o canal até a ilhota
    m.ent(type="wheel", id="roda_passarela", x=48, y=20, flag="passarela_roda")
    m.cond.append({"if": "passarela_roda", "area": [47, 10, 3, 10], "chars": {"W": "t"}})
    m.ent(type="chest", id="passarela_bau_roda", x=48, y=6, loot={"perola_brejo": 2, "tonico_criatura": 1, "fragmentos": 60})
    # segredo por observação: juncos que sussurram escondem um nicho
    m.ent(type="ripple", id="juncos_sussurro", x=20, y=4, flag="passarela_sussurro", prompt="Ouvir os juncos",
          msg="Os juncos sussurram com voz de gente... Você os afasta e encontra um nicho escondido!")
    m.cond.append({"if": "passarela_sussurro", "rects": [[17, 3, 3, 3, "l"]]})
    m.ent(type="chest", id="passarela_bau_sussurro", x=15, y=4, loot={"diario_faroleira": 1, "essencia_azul": 1})
    m.ent(type="chest", id="passarela_bau1", x=32, y=25, loot={"pocao": 2, "perola_brejo": 1})
    # criaturas (habitats fixos)
    m.ent(type="wild", id="pa_brejugo1", species="brejugo", level=13, x=5, y=22)
    m.ent(type="wild", id="pa_brejugo2", species="brejugo", level=14, x=8, y=26)
    m.ent(type="wild", id="pa_goturim1", species="goturim", level=13, x=48, y=24)
    m.ent(type="wild", id="pa_goturim2", species="goturim", level=14, x=50, y=25)
    m.ent(type="wild", id="pa_goturim_chuva", species="goturim", level=15, x=17, y=26, clima="chuva")
    m.ent(type="wild", id="pa_brejugo_neblina", species="brejugo", level=15, x=30, y=6, clima="neblina")
    # inimigos
    m.ent(type="enemy", kind="sapo", id="pa_sapo1", x=28, y=26)
    m.ent(type="enemy", kind="sapo", id="pa_sapo2", x=46, y=27)
    m.ent(type="enemy", kind="sapo", id="pa_sapo3", x=31, y=7)
    m.ent(type="enemy", kind="planta", id="pa_planta1", x=18, y=26)
    m.ent(type="enemy", kind="planta", id="pa_planta2", x=33, y=5)
    m.ent(type="enemy", kind="sapo", id="pa_sapo4", x=9, y=21)
    return m


# ------------------------------------------------------------------ LAGO DOS REFLEXOS (rota 2)
def lago():
    m = M("lago_reflexos", "Lago dos Reflexos", 56, 40, fill="W", music="pantano", region="pantano")
    m.bfs_flags = ["lago_c1"]
    rnd = random.Random(321)
    m.rect(0, 14, 10, 12, "s")                      # margem oeste
    m.rect(0, 17, 3, 3, "+")
    m.rect(2, 22, 5, 3, "t")                        # poça rasa (Goturim)
    m.rect(20, 15, 10, 9, "l")                      # ilha da comporta
    m.rect(14, 1, 28, 4, "s")                       # margem norte (templo)
    m.rect(26, 0, 4, 1, "+")
    m.rect(32, 5, 4, 2, "t")                        # enseada rasa do reflexo
    m.rect(30, 20, 10, 2, "+")                      # tábuas até a ilha leste
    m.rect(40, 18, 10, 10, "l")                     # ilha leste (anel de lanternas)
    m.rect(46, 3, 8, 6, "l")                        # ilhota do canal leste (roda do Goturim)
    # margem nova (aparece quando a água clareia, depois da Bruxa)
    for (x0, y0, w0, h0) in ((0, 14, 10, 12), (20, 15, 10, 9), (14, 1, 28, 4), (40, 18, 10, 10), (46, 3, 8, 6)):
        for j in range(y0, y0 + h0):
            for i in range(x0, x0 + w0):
                if m.g[j][i] in "sl" and rnd.random() < 0.25:
                    m.g[j][i] = "l" if m.g[j][i] == "s" else "s"
    for (x, y) in ((9, 14), (9, 25), (21, 22), (14, 4), (41, 4), (49, 27), (40, 27)):
        m.set(x, y, "n")
    for (x, y) in ((14, 10), (36, 12), (12, 30), (44, 33)):
        m.set(x, y, "i")
    m.spawns = {"from_porto": [2, 18], "from_templo": [27, 1]}
    m.ent(type="exit", x=0, y=17, w=1, h=3, to="porto_lanternas", spawn="from_lago")
    m.ent(type="exit", x=26, y=0, w=4, h=1, to="templo_a", spawn="from_lago")
    m.ent(type="sign", id="placa_lago", dialog="placa_lago", x=6, y=15)
    # comportas: a da margem esvazia o canal A; a da ilha esvazia o caminho B e devolve a água ao canal A
    m.ent(type="sluice", id="comporta_margem", x=8, y=17, flag="lago_c1",
          msg_on="A comporta range e a água do canal escoa: um caminho raso surge até a ilha.", msg_off="A comporta fecha: o canal volta a encher.")
    m.ent(type="sluice", id="comporta_ilha", x=25, y=16, flag="lago_c2",
          msg_on="A comporta da ilha desvia a água para o lago fundo: o caminho de pedras até o templo aparece.",
          msg_off="A comporta da ilha volta: o caminho ao templo afunda de novo.")
    m.cond.append({"if": "lago_c1", "area": [10, 18, 10, 3], "chars": {"W": "t"}})
    m.cond.append({"if": "lago_c2", "area": [26, 5, 3, 10], "chars": {"W": "t"}})
    # anel de lanternas da ilha leste: acesas, atraem o Nimbelo (descoberta ligada à criatura)
    m.ent(type="lantern", id="anel1", group="anel", x=42, y=19)
    m.ent(type="lantern", id="anel2", group="anel", x=47, y=21)
    m.ent(type="lantern", id="anel3", group="anel", x=44, y=26)
    m.puzzles["anel"] = {"type": "lanterns", "flag": "lago_anel", "msg": "O anel de lanternas brilha... uma nuvenzinha curiosa desce da neblina!"}
    m.ent(type="wild", id="la_nimbelo", species="nimbelo", level=14, x=45, y=22, if_flag="lago_anel")
    m.ent(type="pickup", id="rede_tito", item="rede_pesca", sheet="icons_pantano", frame=6, flag="rede_pega", x=48, y=26, unless_flag="rede_pega")
    # segredo por observação: o reflexo da estátua mostra uma lanterna que ela não tem
    m.ent(type="decor", id="lago_estatua", frame="estatua", x=34, y=3, solid=True)
    m.ent(type="sign", id="placa_reflexo_lago", dialog="placa_reflexo_lago", x=31, y=3)
    m.ent(type="ripple", id="lago_reflexo", x=34, y=6, flag="lago_reflexo", prompt="Tatear o reflexo",
          msg="O reflexo da estátua brilhava onde a estátua não tem lanterna. Você tateia o fundo... um baú afundado!")
    m.ent(type="chest", id="lago_bau_reflexo", x=33, y=6, loot={"manto_juncos": 1, "fragmentos": 50}, if_flag="lago_reflexo", set_flag="lago_bau_reflexo_aberto")
    # roda d'água do Goturim (caminho opcional)
    m.ent(type="wheel", id="roda_lago", x=46, y=18, flag="lago_roda")
    m.cond.append({"if": "lago_roda", "area": [47, 9, 3, 9], "chars": {"W": "t"}})
    m.ent(type="chest", id="lago_bau_roda", x=49, y=5, loot={"semente_vida": 1, "essencia_roxa": 1})
    # margem nova (depois da Bruxa): a água baixa e revela a enseada sul
    m.cond.append({"if": "pantano_livre", "rects": [[18, 30, 16, 6, "s"], [24, 24, 3, 6, "t"]]})
    m.ent(type="chest", id="lago_bau_margem", x=26, y=33, loot={"essencia_laranja": 1, "diario_barqueiro": 1}, if_flag="pantano_livre")
    m.ent(type="spirit_mark", id="lago_inscricao", x=30, y=32, requires_eco="olhar_velado", dialog="inscricao_generica", if_flag="pantano_livre",
          msg="Letras tremulam na pedra molhada. (Olhar Velado)")
    # criaturas e inimigos
    m.ent(type="wild", id="la_goturim1", species="goturim", level=13, x=4, y=23)
    m.ent(type="wild", id="la_goturim2", species="goturim", level=14, x=5, y=24)
    m.ent(type="enemy", kind="espectro", id="la_esp1", x=24, y=20)
    m.ent(type="enemy", kind="espectro", id="la_esp2", x=20, y=3)
    m.ent(type="enemy", kind="espectro", id="la_esp3", x=45, y=24)
    m.ent(type="enemy", kind="sapo", id="la_sapo1", x=37, y=2)
    m.ent(type="enemy", kind="planta", id="la_planta1", x=28, y=22)
    return m


# ------------------------------------------------------------------ TEMPLO SUBMERSO A (átrio, Sala das Marés, Galeria, Espelhos)
def templo_a():
    m = M("templo_a", "Templo Submerso — Sala das Marés", 60, 44, fill="v", music="pantano", region="pantano")
    proom(m, 26, 32, 10, 8)                         # 1. átrio (seguro)
    proom(m, 30, 40, 2, 4); proom(m, 0, 35, 26, 2)  # entradas: lago (sul) e passarela (oeste)
    proom(m, 20, 16, 22, 12)                        # 2. Sala das Marés (sala central)
    m.rect(20, 21, 22, 3, "W")                      # canal central
    for (x, y) in ((23, 18), (38, 18), (23, 25), (38, 25)):
        m.set(x, y, "i")
    proom(m, 30, 28, 2, 4)
    proom(m, 2, 18, 12, 12, floor="0")              # 3. Galeria dos Sapos (combate)
    proom(m, 14, 25, 6, 2)
    proom(m, 42, 17, 4, 2)
    proom(m, 46, 8, 12, 16)                         # 4. Sala dos Espelhos
    proom(m, 51, 0, 2, 8)
    for (x, y) in ((27, 33), (34, 33), (27, 38), (34, 38)):
        m.set(x, y, "i")
    m.set(3, 28, "i"); m.set(12, 28, "i")
    m.spawns = {"from_lago": [30, 42], "from_passarela": [1, 35], "from_b": [51, 1]}
    m.ent(type="exit", x=30, y=43, w=2, h=1, to="lago_reflexos", spawn="from_templo")
    m.ent(type="exit", x=0, y=35, w=1, h=2, to="passarela_ecos", spawn="from_templo")
    m.ent(type="exit", x=51, y=0, w=2, h=1, to="templo_b", spawn="from_a")
    m.ent(type="shrine", id="ta_atrio", x=30, y=34)
    m.ent(type="sign", id="placa_templo", dialog="placa_templo", x=34, y=36)
    m.ent(type="chest", id="ta_bau_atrio", x=27, y=36, loot={"pocao": 2, "selo_refinado": 1})
    # Sala das Marés: a comporta da Galeria esvazia o canal central (efeito entre salas)
    m.ent(type="sign", id="placa_canal_central", dialog="placa_canal_central", x=33, y=26)
    m.cond.append({"if": "ta_canal", "area": [20, 21, 22, 3], "chars": {"W": "0"}})
    # Galeria dos Sapos (portas fecham)
    m.ent(type="enemy", kind="sapo", id="ta_sapo1", x=5, y=21, enc="galeria_sapos")
    m.ent(type="enemy", kind="sapo", id="ta_sapo2", x=10, y=24, enc="galeria_sapos")
    m.ent(type="enemy", kind="planta", id="ta_planta1", x=4, y=27, enc="galeria_sapos")
    m.ent(type="enemy", kind="espectro", id="ta_esp1", x=9, y=20, enc="galeria_sapos")
    m.ent(type="encounter", id="galeria_sapos", x=2, y=18, w=12, h=12, flag_done="enc_sapos_ok", flag_active="tmp_enc_sapos")
    m.ent(type="door", id="ta_d_galeria", tiles=[[14, 25], [14, 26]], close_flags=["tmp_enc_sapos"], closed_char="!")
    m.ent(type="sluice", id="ta_comporta", x=7, y=19, flag="ta_canal",
          msg_on="A comporta da Galeria gira: ouve-se a água escoar na Sala das Marés!", msg_off="A comporta volta: o canal central enche de novo.")
    m.ent(type="chest", id="ta_bau_galeria", x=11, y=19, loot={"perola_brejo": 2, "selo_refinado": 2})
    # Sala dos Espelhos: feixe do oeste, três espelhos, cristal ao norte
    m.ent(type="sign", id="placa_espelhos", dialog="placa_espelhos", x=47, y=22)
    m.ent(type="beam_source", id="ta_emissor", x=47, y=20, dir=[1, 0])
    m.ent(type="mirror", id="ta_espelho1", group="espelhos", x=55, y=20, start="b", goal="a")
    m.ent(type="mirror", id="ta_espelho2", group="espelhos", x=55, y=12, start="a", goal="b")
    m.ent(type="mirror", id="ta_espelho3", group="espelhos", x=49, y=12, start="a", goal="b")
    m.ent(type="beam_target", id="ta_cristal", group="espelhos", x=49, y=9)
    m.puzzles["espelhos"] = {"type": "beam", "flag": "ta_espelhos", "dica_apos": 6, "msg": "O feixe acende o cristal: a porta norte se abre!",
                             "dica": "Dica: a luz vai ao leste, sobe pela coluna leste, volta para oeste e só então sobe até o cristal."}
    m.ent(type="door", id="ta_d_espelhos", tiles=[[51, 7], [52, 7]], open_flags=["ta_espelhos"], closed_char="!")
    m.ent(type="chest", id="ta_bau_espelhos", x=56, y=22, loot={"diario_templo": 1, "essencia_azul": 1})
    m.ent(type="enemy", kind="espectro", id="ta_esp2", x=33, y=17)
    return m


# ------------------------------------------------------------------ TEMPLO SUBMERSO B (Câmara do Lodo, tesouro, atalho, Barqueiro)
def templo_b():
    m = M("templo_b", "Templo Submerso — Câmara do Lodo", 60, 46, fill="v", music="pantano", region="pantano")
    proom(m, 34, 3, 22, 14)                         # 5. Câmara do Lodo
    m.rect(40, 3, 4, 14, "U")                       # faixa de lodo instável
    proom(m, 56, 6, 4, 2)                           # entrada (do templo A)
    proom(m, 26, 8, 8, 2)
    proom(m, 14, 4, 12, 10)                         # 6. tesouro + santuário
    proom(m, 18, 0, 2, 4)                           # 7. Canal Submerso (atalho ao Porto)
    proom(m, 19, 14, 2, 8)
    proom(m, 14, 22, 32, 18)                        # 8. arena do Barqueiro Sem Sombra
    m.rect(22, 27, 16, 8, "W")                      # lago central (plataformas largas em volta)
    proom(m, 46, 30, 14, 2)
    for (x, y) in ((15, 23), (44, 23), (15, 38), (44, 38)):
        m.set(x, y, "i")
    m.spawns = {"from_a": [57, 6], "from_porto": [18, 1], "from_rito": [57, 30]}
    m.ent(type="exit", x=59, y=6, w=1, h=2, to="templo_a", spawn="from_b")
    m.ent(type="sign", id="placa_lodo_templo", dialog="placa_lodo_templo", x=54, y=4)
    m.ent(type="stakes", id="tb_estacas", x=46, y=12, flag="tb_lodo")
    m.ent(type="mud_mark", id="tb_marca", x=44, y=5, flag="tb_lodo", opcional=False)
    m.cond.append({"if": "tb_lodo", "area": [40, 3, 4, 14], "chars": {"U": "8"}})
    m.ent(type="enemy", kind="planta", id="tb_planta1", x=36, y=5)
    m.ent(type="enemy", kind="planta", id="tb_planta2", x=36, y=14)
    m.ent(type="enemy", kind="sapo", id="tb_sapo1", x=50, y=9)
    m.ent(type="enemy", kind="espectro", id="tb_esp1", x=37, y=10)
    # tesouro + santuário + atalho
    m.ent(type="shrine", id="tb_tesouro", x=22, y=6)
    m.ent(type="chest", id="tb_bau_tesouro", x=16, y=6, loot={"remo_barqueiro": 1, "perola_brejo": 1, "fragmentos": 70})
    m.ent(type="sign", id="placa_atalho_porto", dialog="placa_atalho_porto", x=21, y=5)
    m.ent(type="lever", id="tb_alavanca_canal", group="canal", idx=0, x=17, y=5)
    m.puzzles["canal"] = {"type": "levers", "toggles": [[0]], "start": [0], "goal": [1], "flag": "atalho_porto_aberto", "dica_apos": 9, "dica": ""}
    m.ent(type="door", id="tb_comporta_canal", tiles=[[18, 3], [19, 3]], open_flags=["atalho_porto_aberto"], closed_char="!")
    m.ent(type="exit", x=18, y=0, w=2, h=1, to="porto_lanternas", spawn="from_templo")
    # arena do Barqueiro
    m.ent(type="sign", id="placa_barqueiro", dialog="placa_barqueiro", x=21, y=13)
    m.ent(type="door", id="tb_d_barqueiro", tiles=[[19, 21], [20, 21]], close_flags=["tmp_barqueiro_ativo"], closed_char="!")
    m.ent(type="miniboss", boss="barqueiro", id="barqueiro", x=30, y=30, x0=14, y0=22, w=32, h=18, flag_done="barqueiro_morto",
          flag_active="tmp_barqueiro_ativo", lago=[22, 27, 16, 8])
    for (i, (x, y)) in enumerate(((21, 26), (38, 26), (21, 35), (38, 35))):
        m.ent(type="lantern", id="tb_lanterna%d" % (i + 1), x=x, y=y, boss=True)
    m.ent(type="door", id="tb_d_barqueiro_out", tiles=[[46, 30], [46, 31]], open_flags=["barqueiro_morto"], closed_char="!")
    m.ent(type="exit", x=59, y=30, w=1, h=2, to="rito_reflexos", spawn="from_b")
    return m


# ------------------------------------------------------------------ RITO DOS REFLEXOS (prova antes da Bruxa + ala avançada)
def rito_reflexos():
    m = M("rito_reflexos", "Rito dos Reflexos", 60, 30, fill="v", music="pantano", region="pantano")
    proom(m, 2, 10, 12, 10)                         # 1. apresentação segura
    proom(m, 16, 6, 14, 18)                         # 2. aplicação
    proom(m, 33, 6, 16, 18)                         # 3. combinação (nível da água + reflexo)
    proom(m, 52, 10, 6, 10)                         # 4. conclusão (altar)
    proom(m, 50, 1, 9, 5)                           # 5. rito avançado (Olhar Velado)
    proom(m, 0, 14, 2, 2); proom(m, 14, 14, 2, 2); proom(m, 30, 14, 3, 2); proom(m, 49, 14, 3, 2); proom(m, 58, 14, 2, 2)
    m.rect(3, 16, 10, 2, "0")                       # espelho d'água da apresentação
    m.rect(17, 9, 12, 2, "0")                       # espelho d'água da sala 2
    m.rect(34, 9, 14, 2, "9")                       # sala 3: tanque seco (a comporta enche)
    m.rect(54, 6, 2, 4, "W")                        # fosso até a ala avançada (ponte espiritual)
    m.rect(50, 3, 9, 1, "W")                        # fosso interno da ala avançada
    m.spawns = {"from_b": [1, 14], "from_c": [58, 14]}
    m.ent(type="exit", x=0, y=14, w=1, h=2, to="templo_b", spawn="from_rito")
    m.ent(type="exit", x=59, y=14, w=1, h=2, to="templo_c", spawn="from_rito")
    # 1. apresentação: uma estátua verdadeira e uma falsa, sem castigo
    m.ent(type="sign", id="rito_r_placa1", dialog="rito_r_placa1", x=4, y=11)
    m.ent(type="statue", id="rr_demo_v", x=5, y=15, demo=True, demo_verdadeira=True, flag="rr_demo1",
          msg="Lanterna na mão esquerda... e no reflexo também, do mesmo lado. Este reflexo é verdadeiro.")
    m.ent(type="statue", id="rr_demo_f", x=10, y=15, demo=True, flag="rr_demo2",
          msg="A estátua segura a lanterna na esquerda, mas o reflexo a mostra do outro lado: reflexo falso!")
    m.ent(type="door", id="rr_d1", tiles=[[14, 14], [14, 15]], open_flags=["rr_demo1", "rr_demo2"], closed_char="!")
    # 2. aplicação: uma verdadeira entre três
    m.ent(type="sign", id="rito_r_placa2", dialog="rito_r_placa2", x=17, y=21)
    m.ent(type="rite_reset", id="rr_reset2", x=17, y=13)
    m.ent(type="statue", id="rr_s2a", group="rr2", x=19, y=8)
    m.ent(type="statue", id="rr_s2b", group="rr2", x=23, y=8, verdadeira=True)
    m.ent(type="statue", id="rr_s2c", group="rr2", x=27, y=8)
    m.puzzles["rr2"] = {"type": "statues", "flag": "rr2_ok", "dica_apos": 3, "msg": "A estátua do meio brilha: o reflexo dela acompanha a lanterna. A porta cede.",
                        "dica": "Dica: olhe de que lado está a lanterna na estátua e de que lado ela aparece no reflexo."}
    m.ent(type="door", id="rr_d2", tiles=[[30, 14], [30, 15]], open_flags=["rr2_ok"], closed_char="!")
    # 3. combinação: a comporta enche o tanque (sem água, sem reflexo) e então se escolhe entre quatro
    m.ent(type="sign", id="rito_r_placa3", dialog="rito_r_placa3", x=34, y=21)
    m.ent(type="sign", id="rr_inscricao_falsa", dialog="rito_r_falsa", x=46, y=21)
    m.ent(type="rite_reset", id="rr_reset3", x=34, y=13)
    m.ent(type="sluice", id="rr_comporta", x=36, y=17, flag="rr_agua",
          msg_on="A comporta abre: o tanque enche e as estátuas ganham reflexo.", msg_off="A comporta fecha: o tanque esvazia.")
    m.cond.append({"if": "rr_agua", "area": [34, 9, 14, 2], "chars": {"9": "0"}})
    for (i, (x, v)) in enumerate(((35, False), (39, False), (43, True), (47, False))):
        m.ent(type="statue", id="rr_s3%s" % "abcd"[i], group="rr3", x=x, y=8, verdadeira=v)
    m.puzzles["rr3"] = {"type": "statues", "flag": "rr3_ok", "dica_apos": 3, "msg": "Água e reflexo concordam: o altar desperta!",
                        "dica": "Dica: abra a comporta para encher o tanque; só então os reflexos aparecem."}
    m.ent(type="door", id="rr_d3", tiles=[[49, 14], [49, 15]], open_flags=["rr3_ok"], closed_char="!")
    # 4. conclusão
    m.ent(type="altar", id="rr_altar", x=55, y=16, flag="rito_reflexos_ok", requires="rr3_ok", bond="missao:rito_reflexos",
          loot={"lente_orvalho": 1}, lines=["A água do altar fica parada como vidro e mostra você, sem mentira nenhuma.",
          "Uma voz antiga, de quem guardava estas águas: \"Quem lê o reflexo não se perde nas cópias.\"",
          "Você recebeu a LENTE DE ORVALHO: espectros refletidos ficam visíveis quando chegam perto."])
    m.ent(type="door", id="rr_d4", tiles=[[58, 14], [58, 15]], open_flags=["rito_reflexos_ok"], closed_char="!")
    # 5. avançado (depois da Bruxa): duas pontes espirituais em sequência
    m.ent(type="sign", id="rito_r_placa_av", dialog="rito_r_placa_av", x=56, y=11)
    m.ent(type="spirit_bridge", id="rr_ponte1", x=55, y=10, flag="rr_ponte1", requires_eco="olhar_velado")
    m.cond.append({"if": "rr_ponte1", "rects": [[54, 6, 2, 4, "E"]]})
    m.ent(type="spirit_bridge", id="rr_ponte2", x=54, y=4, flag="rr_ponte2", requires_eco="olhar_velado")
    m.cond.append({"if": "rr_ponte2", "rects": [[53, 3, 2, 1, "E"]]})
    m.ent(type="altar", id="rr_altar2", x=53, y=2, flag="rito_reflexos_av_ok", requires="rr_ponte2",
          msg_falta="O altar avançado está além da água.",
          loot={"amuleto_reflexo": 1}, lines=["Sobre tábuas que só os olhos velados enxergam, o altar avançado acende em lilás.",
                                              "Você recebeu o AMULETO DO REFLEXO."])
    return m


# ------------------------------------------------------------------ TEMPLO SUBMERSO C (Bruxa Afogada)
def templo_c():
    m = M("templo_c", "Templo Submerso — Coração Afogado", 56, 36, fill="v", music="pantano", region="pantano")
    proom(m, 2, 14, 12, 8)                          # 9. preparação
    proom(m, 18, 6, 28, 22, floor="0")              # 10. arena da Bruxa (piso alagado: reflexos)
    proom(m, 0, 17, 2, 2); proom(m, 14, 17, 4, 2); proom(m, 46, 16, 10, 2)
    m.rect(18, 16, 28, 2, "9"); m.rect(31, 6, 2, 22, "9")          # cruz de pedra (sempre firme)
    for (x, y) in ((21, 9), (42, 9), (21, 24), (42, 24)):
        m.set(x, y, "i")
    m.spawns = {"from_rito": [2, 17]}
    m.ent(type="exit", x=0, y=17, w=1, h=2, to="rito_reflexos", spawn="from_c")
    m.ent(type="shrine", id="tc_prep", x=7, y=16)
    m.ent(type="chest", id="tc_bau_prep", x=11, y=15, loot={"pocao": 2, "tonico_criatura": 1})
    m.ent(type="sign", id="placa_bruxa", dialog="placa_bruxa", x=4, y=20)
    m.ent(type="door", id="tc_d_in", tiles=[[17, 17], [17, 18]], close_flags=["tmp_bruxa_ativo"], closed_char="!")
    # fase 3: a água sobe (alagado vira água funda) e só as plataformas do padrão atual ficam firmes
    plats = {"A": [19, 8, 12, 6], "B": [33, 8, 12, 6], "C": [19, 20, 12, 6], "D": [33, 20, 12, 6]}
    m.ent(type="boss", boss="bruxa", id="bruxa", x=32, y=10, x0=18, y0=6, w=28, h=22, flag_done="bruxa_morta", flag_active="tmp_bruxa_ativo",
          plataformas=plats, padroes=[["A", "B", "C"], ["B", "D", "C"], ["A", "D", "C"]])
    m.cond.append({"if": "tmp_bruxa_cheia", "area": [18, 6, 28, 22], "chars": {"0": "W"}})
    for (pi, pat) in enumerate([["A", "B", "C"], ["B", "D", "C"], ["A", "D", "C"]]):
        m.cond.append({"if": "tmp_bruxa_p%d" % pi, "rects": [plats[k] + ["0"] for k in pat]})
    m.ent(type="door", id="tc_d_out", tiles=[[46, 16], [46, 17]], open_flags=["bruxa_morta"], closed_char="!")
    m.ent(type="exit", x=55, y=16, w=1, h=2, to="porto_lanternas", spawn="from_templo_c")
    return m


# ------------------------------------------------------------------ verificacao
def bfs_check(m):
    msgs = []
    starts = [tuple(s) for s in m.spawns.values()]
    seen = set()
    dq = deque()
    g = [r[:] for r in m.g]
    for c in m.cond:
        if c.get("if") in m.bfs_flags and c.get("unless") not in m.bfs_flags:
            for r in c.get("rects", []):
                for j in range(r[3]):
                    for i in range(r[2]):
                        g[r[1] + j][r[0] + i] = r[4]
            if c.get("chars"):
                ax, ay, aw, ah = c.get("area", [0, 0, m.w, m.h])
                for j in range(ay, ay + ah):
                    for i in range(ax, ax + aw):
                        if g[j][i] in c["chars"]:
                            g[j][i] = c["chars"][g[j][i]]
    for s in starts:
        seen.add(s); dq.append(s)
    # tiles que viram transitaveis (pontes/cipos) so contam nas verificacoes especificas
    while dq:
        x, y = dq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < m.w and 0 <= ny < m.h and (nx, ny) not in seen and g[ny][nx] in PASS_FOR_BFS:
                seen.add((nx, ny)); dq.append((nx, ny))
    for e in m.ents:
        t = e["type"]
        if t in ("exit", "door", "encounter", "boss", "miniboss", "chapter_end", "decor"):
            continue
        p = (e["x"], e["y"])
        ch = m.g[p[1]][p[0]]
        if ch in SOLID and e.get("id") not in OPTIONAL_BEHIND:
            msgs.append(f"  ! {m.id}: {t}/{e.get('id', e.get('kind', ''))} sobre tile solido '{ch}' em {p}")
        elif p not in seen and e.get("id") not in ("cipo_bosque_bau",) and t not in ("bond_stone",):
            if e.get("id") in ("bosque_bau_cipo", "bosque_bau1", "pedra_vinculo") or e.get("id") in OPTIONAL_BEHIND:
                continue  # atras de cipo / ravina (opcional)
            msgs.append(f"  ! {m.id}: {t}/{e.get('id', e.get('kind', ''))} inalcancavel em {p}")
    return msgs


def main():
    maps = [vila(), bosque(), clareira(), santuario_a(), santuario_b(), rito_seiva(), santuario_c(), grota(), desfiladeiro(), minas_entrada(),
            forja(), pedreira(), trilhos(), fundicao_a(), fundicao_b(), rito(), fundicao_c(),
            porto(), passarela(), lago(), templo_a(), templo_b(), rito_reflexos(), templo_c()]
    bad = []
    for m in maps:
        for row in m.g:
            assert len(row) == m.w
        with open(os.path.join(OUT, m.id + ".json"), "w", encoding="utf-8") as f:
            json.dump(m.to_json(), f, ensure_ascii=False)
        bad += bfs_check(m)
    print("\n".join(bad) if bad else "mapas ok (alcancabilidade)")
    if "--ascii" in sys.argv:
        for m in maps:
            if len(sys.argv) > 2 and m.id not in sys.argv[2:]:
                continue
            g = [r[:] for r in m.g]
            for e in m.ents:
                if "x" in e and e["type"] not in ("exit", "door", "encounter"):
                    c = {"wild": "W", "enemy": "E", "chest": "C", "npc": "N", "shrine": "@", "lever": "L", "flower": "*", "plate": "_", "crate": "#", "sign": "?", "miniboss": "M", "boss": "B", "dummy": "d", "vine": "V", "bridge_spot": "&", "bond_stone": "$", "valve": "V", "furnace": "F", "brazier": "f", "cart": "c", "rail_lever": "/", "ore": "o", "crack": "x", "draft": "~", "rail_marked": "&", "anvil": "n", "altar": "A", "rite_reset": "r", "spirit_mark": "s",
                         "lantern": "*", "sluice": "V", "wheel": "O", "stakes": "#", "mud_mark": "%", "mirror": "/", "beam_source": ">",
                         "beam_target": "@", "statue": "S", "ripple": "~", "spirit_bridge": "&", "decor": "d", "pickup": "p"}.get(e["type"], "!")
                    if 0 <= e["y"] < m.h and 0 <= e["x"] < m.w:
                        g[e["y"]][e["x"]] = c
            print("==", m.id, m.w, m.h)
            print("\n".join("".join(r) for r in g))


if __name__ == "__main__":  main()
