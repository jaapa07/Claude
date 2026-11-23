#!/usr/bin/env python3
"""Desenha os mapas do Capitulo 1 (layouts manuais, nao procedurais de masmorra).
Saida: data/maps/*.json. Verifica alcancabilidade de entidades por BFS."""
import json, os, random, sys
from collections import deque

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "data", "maps")
os.makedirs(OUT, exist_ok=True)
SOLID = set("T~RhHcxFbDPoCv")
PASS_FOR_BFS = set(".,fprySwBgGkeDx")  # portas/barreiras contam como abriveis


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
    m.spawns = {"default": [21, 16], "from_bosque": [41, 15], "from_clareira": [21, 29], "from_desfiladeiro": [21, 3],
                "from_atalho": [3, 23], "from_santuario": [21, 15]}
    m.ent(type="shrine", id="vila", x=22, y=14)
    m.ent(type="npc", id="anciao", sprite="npc_elder", dialog="anciao", x=19, y=14, nome="Anciã Maru")
    m.ent(type="npc", id="ysa", sprite="npc_mother", dialog="ysa", x=26, y=15, nome="Ysa")
    m.ent(type="npc", id="guarda", sprite="npc_ranger", dialog="guarda", x=38, y=16, nome="Bram")
    m.ent(type="npc", id="pipo", sprite="npc_kid", dialog="pipo", x=16, y=11, nome="Pipo")
    m.ent(type="npc", id="mae", sprite="npc_corvelo", dialog="mae", x=26, y=18, nome="Dona Corvelo", if_flag="cervo_morto")
    m.ent(type="npc", id="tobi", sprite="npc_smith", dialog="ferreiro", x=30, y=20, nome="Tobi")
    m.ent(type="sign", id="treino", dialog="treino", x=10, y=11)
    m.ent(type="sign", id="placa_vila", dialog="placa_vila", x=19, y=18)
    m.ent(type="dummy", id="dummy1", x=11, y=10)
    m.ent(type="dummy", id="dummy2", x=14, y=10)
    m.ent(type="wild", id="brotisco_tutorial", species="brotisco", level=1, x=12, y=19, unique=True, garantida=True)
    m.ent(type="chest", id="vila_bau1", x=5, y=11, loot={"fragmentos": 25, "selo_basico": 2})
    m.ent(type="exit", x=42, y=14, w=2, h=4, to="bosque_lanternas", spawn="from_vila")
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
    m.ent(type="enemy", kind="lobo", id="b_lobo1", x=20, y=24)
    m.ent(type="enemy", kind="lobo", id="b_lobo2", x=30, y=18)
    m.ent(type="enemy", kind="lobo", id="b_lobo3", x=42, y=12)
    m.ent(type="enemy", kind="cogumelo", id="b_cog1", x=15, y=22)
    m.ent(type="enemy", kind="cogumelo", id="b_cog2", x=36, y=13)
    m.ent(type="flower", id="b_flor1", group="flores_b", x=22, y=15)
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
    m.ent(type="bridge_spot", id="ponte_minas", x=19, y=13, tiles=[[19, 8], [20, 8], [19, 9], [20, 9], [19, 10], [20, 10], [19, 11], [20, 11], [21, 8], [21, 9], [21, 10], [21, 11]], flag="ponte_minas", requires_eco="raiz_viva")
    m.cond.append({"if": "ponte_minas", "rects": [[19, 8, 3, 4, "B"]]})
    return m


def minas_entrada():
    m = M("minas_entrada", "Entrada das Minas da Brasa", 30, 20, fill="C", music="floresta", region="minas")
    m.rect(8, 4, 14, 14, "k"); m.rect(13, 0, 4, 18, "p"); m.rect(13, 17, 4, 3, "p")
    for (x, y) in ((9, 5), (20, 5), (9, 15), (20, 15)):
        m.set(x, y, "o")
    m.spawns = {"from_desfiladeiro": [15, 17]}
    m.ent(type="exit", x=13, y=19, w=4, h=1, to="desfiladeiro", spawn="from_minas")
    m.ent(type="sign", id="placa_minas", dialog="placa_minas", x=15, y=8)
    m.ent(type="chapter_end", id="fim_cap1", x=13, y=4, w=4, h=2)
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
        if ch in SOLID:
            msgs.append(f"  ! {m.id}: {t}/{e.get('id', e.get('kind', ''))} sobre tile solido '{ch}' em {p}")
        elif p not in seen and e.get("id") not in ("cipo_bosque_bau",) and t not in ("bond_stone",):
            if e.get("id") in ("bosque_bau_cipo", "bosque_bau1", "pedra_vinculo"):
                continue  # atras de cipo / ravina (opcional)
            msgs.append(f"  ! {m.id}: {t}/{e.get('id', e.get('kind', ''))} inalcancavel em {p}")
    return msgs


def main():
    maps = [vila(), bosque(), clareira(), santuario_a(), santuario_b(), santuario_c(), desfiladeiro(), minas_entrada()]
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
                    c = {"wild": "W", "enemy": "E", "chest": "C", "npc": "N", "shrine": "@", "lever": "L", "flower": "*", "plate": "_", "crate": "#", "sign": "?", "miniboss": "M", "boss": "B", "dummy": "d", "vine": "V", "bridge_spot": "&", "bond_stone": "$"}.get(e["type"], "!")
                    if 0 <= e["y"] < m.h and 0 <= e["x"] < m.w:
                        g[e["y"]][e["x"]] = c
            print("==", m.id, m.w, m.h)
            print("\n".join("".join(r) for r in g))


main()
