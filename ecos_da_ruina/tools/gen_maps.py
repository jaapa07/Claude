#!/usr/bin/env python3
"""Desenha os mapas dos Capitulos 1 e 2 (layouts manuais, nao procedurais de masmorra).
Saida: data/maps/*.json. Verifica alcancabilidade de entidades por BFS."""
import json, os, random, sys
from collections import deque

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "data", "maps")
os.makedirs(OUT, exist_ok=True)
SOLID = set("T~RhHcxFbDPoCvMLuJZXOAaI")
PASS_FOR_BFS = set(".,fprySwBgGkeDx" + "mQq=|jz%<I")  # portas/barreiras contam como abriveis
# entidades opcionais atras de rocha fissurada, passagem secreta ou trilho do Ferrunho
OPTIONAL_BEHIND = {"forja_bau_rocha", "veio_bau", "veio_placa", "veio_rocha", "trilhos_bau_ilha", "trilhos_bau_vapor",
                   "fa_bau_caldeira", "rito_mec1", "rito_mec2", "rito_mec3", "rito_altar2", "rito_placa_av"}


class M:
    def __init__(self, mid, name, w, h, fill=".", music="floresta", region="floresta", safe=False):
        self.id, self.name, self.w, self.h = mid, name, w, h
        self.g = [[fill] * w for _ in range(h)]
        self.music, self.region, self.safe = music, region, safe
        self.spawns, self.ents, self.cond, self.puzzles = {}, [], [], {}

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
                "conditional": self.cond, "puzzles": self.puzzles}


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
    return m


# ------------------------------------------------------------------ SANTUARIO DA SEIVA B
def santuario_b():
    m = M("santuario_b", "Santuário da Seiva — Câmaras Profundas", 48, 40, fill="v", music="santuario")
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
    m.spawns = {"from_a": [23, 2], "from_c": [45, 32]}
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
    return m


# ------------------------------------------------------------------ SANTUARIO DA SEIVA C (chefao)
def santuario_c():
    m = M("santuario_c", "Santuário da Seiva — Sala do Cervo", 52, 36, fill="v", music="santuario")
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
    return m


# ------------------------------------------------------------------ DESFILADEIRO
def desfiladeiro():
    m = M("desfiladeiro", "Desfiladeiro do Eco", 40, 24, fill="C", music="floresta")
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
    m = M("minas_entrada", "Entrada das Minas da Brasa", 30, 20, fill="C", music="floresta", region="minas")
    m.rect(8, 4, 14, 14, "k"); m.rect(13, 0, 4, 18, "p"); m.rect(13, 17, 4, 3, "p")
    for (x, y) in ((9, 5), (20, 5), (9, 15), (20, 15)):
        m.set(x, y, "o")
    # boca da mina ao norte: o caminho segue para a Forja de Cobre
    m.rect(9, 0, 12, 4, "M"); m.rect(13, 0, 4, 4, "m")
    m.set(12, 3, "u"); m.set(17, 3, "u")
    m.spawns = {"from_desfiladeiro": [15, 17], "from_forja": [15, 2]}
    m.ent(type="exit", x=13, y=19, w=4, h=1, to="desfiladeiro", spawn="from_minas")
    m.ent(type="exit", x=13, y=0, w=4, h=1, to="forja_cobre", spawn="from_entrada")
    m.ent(type="sign", id="placa_minas", dialog="placa_minas", x=15, y=8)
    m.ent(type="wild", id="m_faisquito_calor", species="faisquito", level=8, x=19, y=11, clima="calor")
    m.ent(type="chapter_end", id="fim_cap1", x=13, y=4, w=4, h=2)
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
    m = M("forja_cobre", "Forja de Cobre", 48, 36, fill="M", music="vila", region="minas", safe=True)
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
    m.ent(type="spirit_mark", id="forja_inscricao", x=17, y=13, requires_eco="olhar_velado",
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
    m = M("pedreira_oca", "Pedreira Oca", 56, 44, fill="J", music="floresta", region="minas")
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
    m = M("trilhos_fundidos", "Trilhos Fundidos", 56, 40, fill="M", music="floresta", region="minas")
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
    m = M("fundicao_a", "Fundição do Último Fogo — Grande Caldeira", 60, 44, fill="v", music="santuario", region="minas")
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
    m.ent(type="spirit_mark", id="fa_inscricao", x=5, y=26, requires_eco="olhar_velado",
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
    m = M("fundicao_b", "Fundição do Último Fogo — Pátio e Vigia", 60, 46, fill="v", music="santuario", region="minas")
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
    return m


# ------------------------------------------------------------------ FUNDIÇÃO C (chefão)
def fundicao_c():
    m = M("fundicao_c", "Fundição do Último Fogo — Coração da Forja", 56, 36, fill="v", music="santuario", region="minas")
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
    return m



# ------------------------------------------------------------------ RITO DA FORJA (prova antes do Ferreiro + ala avançada pós-chefão)
def rito():
    m = M("rito_forja", "Rito da Forja", 60, 30, fill="v", music="santuario", region="minas")
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

# ------------------------------------------------------------------ verificacao
def bfs_check(m):
    msgs = []
    starts = [tuple(s) for s in m.spawns.values()]
    seen = set()
    dq = deque()
    for s in starts:
        seen.add(s); dq.append(s)
    # tiles que viram transitaveis (pontes/cipos) so contam nas verificacoes especificas
    while dq:
        x, y = dq.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < m.w and 0 <= ny < m.h and (nx, ny) not in seen and m.g[ny][nx] in PASS_FOR_BFS:
                seen.add((nx, ny)); dq.append((nx, ny))
    for e in m.ents:
        t = e["type"]
        if t in ("exit", "door", "encounter", "boss", "miniboss", "chapter_end"):
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
    maps = [vila(), bosque(), clareira(), santuario_a(), santuario_b(), santuario_c(), desfiladeiro(), minas_entrada(),
            forja(), pedreira(), trilhos(), fundicao_a(), fundicao_b(), rito(), fundicao_c()]
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
                    c = {"wild": "W", "enemy": "E", "chest": "C", "npc": "N", "shrine": "@", "lever": "L", "flower": "*", "plate": "_", "crate": "#", "sign": "?", "miniboss": "M", "boss": "B", "dummy": "d", "vine": "V", "bridge_spot": "&", "bond_stone": "$", "valve": "V", "furnace": "F", "brazier": "f", "cart": "c", "rail_lever": "/", "ore": "o", "crack": "x", "draft": "~", "rail_marked": "&", "anvil": "n", "altar": "A", "rite_reset": "r", "spirit_mark": "s"}.get(e["type"], "!")
                    if 0 <= e["y"] < m.h and 0 <= e["x"] < m.w:
                        g[e["y"]][e["x"]] = c
            print("==", m.id, m.w, m.h)
            print("\n".join("".join(r) for r in g))


main()
