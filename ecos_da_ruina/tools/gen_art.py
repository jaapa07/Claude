#!/usr/bin/env python3
"""Gerador de arte pixel original de Ecos da Ruina (procedural, sem assets de terceiros).
Uso: python3 tools/gen_art.py   -> escreve em assets/sprites e assets/tilesets
Todos os desenhos sao feitos pixel a pixel por este script (ver docs/ASSET_LICENSES.md)."""
import os, random
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SPR = os.path.join(ROOT, "assets", "sprites")
TIL = os.path.join(ROOT, "assets", "tilesets")
os.makedirs(SPR, exist_ok=True)
os.makedirs(TIL, exist_ok=True)


def hx(s):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


def shade(c, f):
    return (max(0, min(255, int(c[0] * f))), max(0, min(255, int(c[1] * f))), max(0, min(255, int(c[2] * f))), c[3] if len(c) > 3 else 255)


OUT = hx("1b1626")  # contorno comum


class Canvas:
    def __init__(self, w, h):
        self.im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        self.w, self.h = w, h

    def p(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((int(x), int(y)), c)

    def r(self, x, y, w, h, c):
        for j in range(int(h)):
            for i in range(int(w)):
                self.p(x + i, y + j, c)

    def ell(self, cx, cy, rx, ry, c):
        for j in range(int(cy - ry - 1), int(cy + ry + 2)):
            for i in range(int(cx - rx - 1), int(cx + rx + 2)):
                if ((i - cx) / max(rx, 0.5)) ** 2 + ((j - cy) / max(ry, 0.5)) ** 2 <= 1.0:
                    self.p(i, j, c)

    def line(self, x0, y0, x1, y1, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for k in range(n + 1):
            t = k / max(n, 1)
            self.p(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), c)

    def outline(self, col=OUT):
        src = self.im.copy()
        for y in range(self.h):
            for x in range(self.w):
                if src.getpixel((x, y))[3] == 0:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < self.w and 0 <= ny < self.h and src.getpixel((nx, ny))[3] > 0:
                            self.im.putpixel((x, y), col)
                            break


def flip(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


def save(im, name, folder=SPR):
    im.save(os.path.join(folder, name))


# ------------------------------------------------------------------ TILES
TILE_ORDER = ".,fpT~rRhHwcxFbSDPoCgGvkeBy"  # indice = posicao (ver scripts/map_grid.gd)


def noise_tile(base, specks, seed, n=14, size=16):
    rnd = random.Random(seed)
    c = Canvas(size, size)
    c.r(0, 0, size, size, base)
    for _ in range(n):
        c.p(rnd.randrange(size), rnd.randrange(size), rnd.choice(specks))
    return c


def make_tiles():
    S = 16
    sheet = Image.new("RGBA", (S * len(TILE_ORDER), S), (0, 0, 0, 0))
    G1, G2, G3 = hx("4e8a3a"), hx("5fa047"), hx("3a6f34")
    tiles = {}
    # grama
    c = noise_tile(G1, [G2, G3, G2], 1, 18)
    tiles["."] = c
    c = noise_tile(G3, [G1, shade(G3, .8)], 2, 20)
    tiles[","] = c
    c = noise_tile(G1, [G2, G3], 3, 10)
    for (x, y, col) in ((3, 4, hx("f2e6c8")), (10, 3, hx("e8a838")), (7, 11, hx("f2e6c8")), (13, 12, hx("d86a5a"))):
        c.p(x, y, col); c.p(x, y - 1, hx("fff2cc")) if col[0] > 220 else None
        c.p(x + 1, y, shade(col, .8)); c.p(x, y + 1, hx("2f5a2a"))
    tiles["f"] = c
    # caminho
    D1, D2 = hx("b98f5a"), hx("a07848")
    c = noise_tile(D1, [D2, hx("c9a66e")], 4, 22)
    tiles["p"] = c
    # arvore (solida) - copa densa com tronco
    c = Canvas(S, S)
    c.r(0, 0, S, S, G3)
    c.ell(8, 7, 8, 7, hx("2d6a35"))
    c.ell(6, 5, 4, 3, hx("3f8a3f")); c.ell(11, 6, 3, 3, hx("3a7f3c"))
    c.p(5, 4, hx("7fc060")); c.p(6, 4, hx("7fc060")); c.p(10, 5, hx("7fc060"))
    c.r(7, 12, 3, 4, hx("6b4528")); c.r(6, 15, 5, 1, hx("4e3220"))
    tiles["T"] = c
    # agua
    c = noise_tile(hx("3a78b8"), [hx("5aa0d8"), hx("2f66a0")], 5, 16)
    for x in range(2, 14):
        c.p(x, 5, hx("7fb8e8")) if x % 4 < 2 else None
        c.p(x, 11, hx("7fb8e8")) if x % 4 >= 2 else None
    tiles["~"] = c
    # piso de ruina
    R1, R2 = hx("c9c2a8"), hx("b0a98e")
    c = noise_tile(R1, [R2, hx("d8d2bb")], 6, 14)
    c.r(0, 0, S, 1, R2); c.r(0, 0, 1, S, R2); c.r(8, 8, 8, 1, R2); c.r(8, 0, 1, 8, R2)
    tiles["r"] = c
    # parede de ruina
    c = Canvas(S, S)
    c.r(0, 0, S, S, hx("8a8670"))
    for row in range(4):
        y = row * 4
        c.r(0, y, S, 1, hx("6e6a58"))
        off = 0 if row % 2 == 0 else 4
        for x in range(off, S, 8):
            c.r(x, y, 1, 4, hx("6e6a58"))
    c.r(0, 0, S, 2, hx("a8a48c")); c.r(2, 5, 3, 1, hx("5f8f4a")); c.r(10, 9, 4, 1, hx("5f8f4a"))
    tiles["R"] = c
    # parede de casa
    c = Canvas(S, S)
    c.r(0, 0, S, S, hx("e0c89a"))
    for x in range(0, S, 4):
        c.r(x, 0, 1, S, hx("c9ae7c"))
    c.r(0, 14, S, 2, hx("8a6a44"))
    c.r(5, 4, 6, 6, hx("3a5a8a")); c.r(5, 4, 6, 1, hx("6b4528")); c.r(5, 9, 6, 1, hx("6b4528")); c.r(7, 4, 1, 6, hx("6b4528")); c.r(8, 5, 2, 2, hx("9bd0f0"))
    tiles["h"] = c
    # telhado
    c = Canvas(S, S)
    c.r(0, 0, S, S, hx("b5503c"))
    for row in range(0, S, 4):
        c.r(0, row + 3, S, 1, hx("8a3a2c"))
        for x in range((row // 4 % 2) * 4, S, 8):
            c.r(x, row, 1, 3, hx("8a3a2c"))
    c.r(0, 0, S, 1, hx("d46a50"))
    tiles["H"] = c
    # piso de madeira
    c = Canvas(S, S)
    c.r(0, 0, S, S, hx("a8764a"))
    for y in range(0, S, 4):
        c.r(0, y, S, 1, hx("8a5a38"))
    for x, y in ((3, 1), (11, 5), (6, 9), (13, 13)):
        c.p(x, y, hx("6b4528"))
    tiles["w"] = c
    # abismo
    c = Canvas(S, S)
    c.r(0, 0, S, S, hx("1a1628"))
    c.r(0, 0, S, 2, hx("4a3a5a")); c.r(0, 2, S, 2, hx("2a2238"))
    for x, y in ((3, 7), (10, 10), (13, 6), (5, 13)):
        c.p(x, y, hx("322a44"))
    tiles["c"] = c
    # barreira de raizes espinhosas
    c = Canvas(S, S)
    c.r(0, 0, S, S, G3)
    for sx in (3, 8, 12):
        c.line(sx, 15, sx + (2 if sx < 8 else -2), 1, hx("5a3a24"))
        c.line(sx + 1, 15, sx + (3 if sx < 8 else -1), 1, hx("7a5232"))
    c.line(0, 6, 15, 9, hx("5a3a24")); c.line(0, 12, 15, 4, hx("5a3a24"))
    for x, y in ((2, 5), (6, 8), (10, 4), (13, 10), (5, 12), (9, 13)):
        c.p(x, y, hx("d8d0a0")); c.p(x, y - 1, hx("d8d0a0"))
    tiles["x"] = c
    # cerca
    c = noise_tile(G1, [G2, G3], 7, 10)
    c.r(0, 6, S, 2, hx("8a6a44")); c.r(0, 11, S, 2, hx("8a6a44"))
    for x in (1, 7, 13):
        c.r(x, 3, 2, 12, hx("a8825a")); c.r(x, 3, 2, 1, hx("c9a070"))
    tiles["F"] = c
    # arbusto
    c = noise_tile(G1, [G2, G3], 8, 8)
    c.ell(8, 9, 7, 5, hx("2f7a3a")); c.ell(6, 8, 3, 2, hx("4a9a48")); c.ell(11, 10, 3, 2, hx("3f8a40"))
    c.p(5, 7, hx("e8a838")); c.p(11, 9, hx("d86a5a"))
    tiles["b"] = c
    # canal de seiva (piso de ruina com brilho)
    c = noise_tile(R1, [R2], 9, 8)
    c.r(0, 6, S, 4, hx("5a8a4a")); c.r(0, 7, S, 2, hx("c8f080")); c.r(0, 6, S, 1, hx("3f6a38")); c.r(0, 9, S, 1, hx("3f6a38"))
    tiles["S"] = c
    # porta fechada (raizes e pedra)
    c = Canvas(S, S)
    c.r(0, 0, S, S, hx("6e6a58"))
    c.r(2, 1, 12, 15, hx("4a3a28")); c.r(2, 1, 12, 1, hx("7a5a3a"))
    for x in (5, 8, 11):
        c.r(x, 1, 1, 15, hx("3a2c1e"))
    c.r(6, 8, 4, 3, hx("c9a038")); c.p(7, 9, OUT)
    tiles["D"] = c
    # pilar
    c = Canvas(S, S)
    c.r(0, 0, S, S, R1)
    c.r(3, 1, 10, 14, hx("9a9680")); c.r(3, 1, 10, 2, hx("c0bca6")); c.r(3, 13, 10, 2, hx("6e6a58"))
    c.r(7, 4, 2, 7, hx("7a7660")); c.p(5, 6, hx("5f8f4a")); c.p(10, 9, hx("5f8f4a"))
    tiles["P"] = c
    # pedra
    c = noise_tile(G1, [G2, G3], 10, 8)
    c.ell(8, 9, 6, 5, hx("8a8a92")); c.ell(6, 7, 3, 2, hx("a8a8b2")); c.r(4, 12, 9, 1, hx("5a5a66"))
    tiles["o"] = c
    # parede de penhasco
    c = Canvas(S, S)
    c.r(0, 0, S, S, hx("7a6a58"))
    for y in range(0, S, 5):
        c.r(0, y, S, 1, hx("5a4a3c"))
    for x, y in ((2, 3), (9, 8), (12, 2), (5, 12)):
        c.r(x, y, 3, 1, hx("9a8a76"))
    c.r(0, 0, S, 2, hx("8a7a66"))
    tiles["C"] = c
    # grama transformada (vibrante) e flores desabrochadas
    c = noise_tile(hx("62b04a"), [hx("86d060"), hx("4e9a3c")], 11, 18)
    tiles["g"] = c
    c = noise_tile(hx("62b04a"), [hx("86d060"), hx("4e9a3c")], 12, 12)
    for (x, y, col) in ((3, 3, hx("f6e0ff")), (9, 5, hx("ffd860")), (6, 10, hx("ff9ab8")), (12, 11, hx("f6e0ff")), (13, 3, hx("ffd860"))):
        c.p(x, y, col); c.p(x + 1, y, shade(col, .85)); c.p(x, y + 1, hx("3a7a2c")); c.p(x - 1, y, shade(col, .85)); c.p(x, y - 1, shade(col, .95))
    tiles["G"] = c
    # vazio
    c = Canvas(S, S); c.r(0, 0, S, S, hx("0d0a14"))
    tiles["v"] = c
    # piso de cavidade escura
    c = noise_tile(hx("5a5266"), [hx("4a4256"), hx("6a6278")], 13, 16)
    tiles["k"] = c
    # soleira (piso de ruina claro com marca)
    c = noise_tile(R1, [R2], 14, 6)
    c.r(0, 6, S, 4, hx("e0d6a8")); c.r(0, 6, S, 1, R2); c.r(0, 9, S, 1, R2)
    tiles["e"] = c
    # ponte de madeira sobre o abismo (transitavel)
    c = Canvas(S, S)
    c.r(0, 0, S, S, hx("1a1628"))
    c.r(2, 0, 12, S, hx("a8764a"))
    for y in range(0, S, 4):
        c.r(2, y, 12, 1, hx("8a5a38"))
    c.r(2, 0, 1, S, hx("6b4528")); c.r(13, 0, 1, S, hx("6b4528"))
    tiles["B"] = c
    # ruina musgosa
    c = noise_tile(R1, [R2, hx("7aa862"), hx("5f8f4a")], 15, 22)
    c.r(0, 0, S, 1, R2); c.r(0, 0, 1, S, R2)
    tiles["y"] = c

    for i, ch in enumerate(TILE_ORDER):
        tiles[ch].outline_off = True
        sheet.paste(tiles[ch].im, (i * S, 0))
    save(sheet, "tiles.png", TIL)


# ------------------------------------------------------------------ HEROI / NPC
SKIN = hx("e8b890")


def draw_humanoid(direction, frame, pose="idle", pal=None, sword=0):
    """frame 24x32. direction: down,left,right,up. pose: idle,walk0-3,atk0-2,guard,dodge,hurt,capture,dead"""
    pal = pal or {}
    cloak = pal.get("cloak", hx("26346a")); trim = pal.get("trim", hx("c0703a"))
    scarf = pal.get("scarf", hx("f2e6c8")); hair = pal.get("hair", hx("4a2c1a"))
    boot = pal.get("boot", hx("3a2a22")); skin = pal.get("skin", SKIN)
    c = Canvas(24, 32)
    bob = 0; lstep = 0
    if pose.startswith("walk"):
        k = int(pose[4]); bob = 1 if k in (1, 3) else 0; lstep = [0, 2, 0, -2][k]
    lean = 0
    if pose.startswith("atk"):
        lean = 1
    if pose == "dodge":
        bob = 4
    if pose == "hurt":
        lean = -1
    if pose == "dead":
        # corpo caido
        c.ell(12, 26, 9, 4, cloak); c.ell(6, 25, 3, 3, skin); c.r(15, 24, 6, 3, trim)
        c.outline(); return c.im
    if pose == "capture":
        bob = 2
    cx = 12
    side = direction in ("left", "right")
    # pernas
    ly = 24 + bob
    if pose == "dodge":
        ly = 26
    if side:
        c.r(cx - 3 + lstep // 2, ly, 3, 6 - bob, boot); c.r(cx + 1 - lstep // 2, ly, 3, 6 - bob, shade(boot, 1.2))
    else:
        c.r(cx - 4, ly, 3, 6 - bob, boot if lstep >= 0 else shade(boot, 1.2)); c.r(cx + 1, ly, 3, 6 - bob, shade(boot, 1.2) if lstep >= 0 else boot)
        if lstep > 0:
            c.r(cx - 4, ly - 1, 3, 1, boot)
    # corpo (capa)
    by = 14 + bob
    c.r(cx - 5, by, 10, 11 - bob // 2, cloak)
    c.r(cx - 5, by + 9 - bob // 2, 10, 2, trim)
    c.r(cx - 5, by, 10, 1, shade(cloak, 1.3))
    if direction == "down":
        c.r(cx - 1, by, 2, 9, trim); c.r(cx - 3, by + 4, 6, 1, shade(trim, .8))
    elif direction == "up":
        c.r(cx - 3, by + 2, 6, 6, shade(cloak, .85))
    else:
        c.r(cx - 1, by + 3, 2, 6, shade(cloak, 1.2))
    # bolsa de vinculador
    if direction != "up":
        c.r(cx + (3 if direction in ("down", "right") else -5), by + 6, 3, 4, trim)
    # cabeca
    hy = 5 + bob
    c.r(cx - 4, hy, 8, 8, skin)
    if direction == "down":
        c.r(cx - 4, hy, 8, 3, hair); c.r(cx - 4, hy + 3, 1, 3, hair); c.r(cx + 3, hy + 3, 1, 3, hair)
        c.p(cx - 2, hy + 4, OUT); c.p(cx + 1, hy + 4, OUT)
    elif direction == "up":
        c.r(cx - 4, hy, 8, 8, hair); c.r(cx - 3, hy + 6, 6, 2, shade(hair, .8))
    else:
        d = 1 if direction == "right" else -1
        c.r(cx - 4, hy, 8, 3, hair); c.r(cx - 4 if d > 0 else cx + 1, hy + 3, 3, 5, hair)
        c.p(cx + (2 if d > 0 else -3), hy + 4, OUT)
    # lenco
    c.r(cx - 4, hy + 7, 8, 2, scarf)
    if direction == "down" or direction == "up":
        c.r(cx + 1, hy + 8, 2, 4, scarf)
    # bracos / espada
    if side:
        d = 1 if direction == "right" else -1
        ax = cx + (2 if d > 0 else -4)
        c.r(ax, by + 2, 3, 5, shade(cloak, 1.4))
    else:
        c.r(cx - 7, by + 2, 2, 6 + (lstep // 2), shade(cloak, 1.3)); c.r(cx + 5, by + 2, 2, 6 - (lstep // 2), shade(cloak, 1.3))
        c.p(cx - 7, by + 8, skin); c.p(cx + 5, by + 8, skin)
    blade = hx("e8eef8"); hilt = hx("c0703a")

    def sword_line(x0, y0, x1, y1):
        c.line(x0, y0, x1, y1, blade); c.p(x0, y0, hilt)
        c.line(x0 + (0 if x1 == x0 else 0), y0, x0, y0, hilt)

    d = {"down": (0, 1), "up": (0, -1), "left": (-1, 0), "right": (1, 0)}[direction]
    if pose.startswith("atk"):
        k = int(pose[3])
        # k0 preparacao (recuado), k1 golpe, k2 recuperacao
        if side:
            if k == 0:
                c.line(cx + d[0] * 4, by + 3, cx + d[0] * 5, by - 7, blade)
            elif k == 1:
                c.line(cx + d[0] * 3, by + 4, cx + d[0] * 11, by + 4, blade); c.line(cx + d[0] * 3, by + 5, cx + d[0] * 11, by + 5, shade(blade, .85))
            else:
                c.line(cx + d[0] * 3, by + 6, cx + d[0] * 9, by + 11, blade)
            c.p(cx + d[0] * 3, by + 4, hilt)
        elif direction == "down":
            if k == 0:
                c.line(cx + 6, by + 4, cx + 7, by - 6, blade)
            elif k == 1:
                c.line(cx + 5, by + 5, cx + 6, by + 15, blade); c.line(cx + 6, by + 5, cx + 7, by + 15, shade(blade, .85))
            else:
                c.line(cx + 6, by + 6, cx + 10, by + 12, blade)
        else:
            if k == 0:
                c.line(cx + 6, by + 4, cx + 7, by + 12, blade)
            elif k == 1:
                c.line(cx + 4, by + 3, cx + 4, by - 10, blade); c.line(cx + 5, by + 3, cx + 5, by - 10, shade(blade, .85))
            else:
                c.line(cx + 6, by + 3, cx + 9, by - 3, blade)
    elif pose == "guard":
        sh = hx("3a5a8a"); shd = hx("c0703a")
        if side:
            c.r(cx + d[0] * 3 - (2 if d[0] < 0 else 0), by + 1, 4, 9, sh); c.r(cx + d[0] * 3 - (2 if d[0] < 0 else 0) + 1, by + 3, 2, 4, shd)
        elif direction == "down":
            c.r(cx - 5, by + 1, 10, 8, sh); c.r(cx - 1, by + 3, 2, 4, shd); c.r(cx - 5, by + 1, 10, 1, shade(sh, 1.4))
        else:
            c.r(cx - 5, by + 1, 10, 7, shade(sh, .8))
    elif pose == "capture":
        c.r(cx - 8, by - 1, 3, 3, hx("9be0ff")); c.r(cx + 5, by - 1, 3, 3, hx("9be0ff"))
    else:
        # espada embainhada nas costas / cintura
        if side:
            c.line(cx - d[0] * 5, by + 1, cx - d[0] * 6, by + 11, hilt)
        elif direction == "down":
            c.line(cx + 5, by + 8, cx + 7, by + 14, blade)
    c.outline()
    # deslocamento horizontal na esquiva
    if pose == "dodge":
        im = Image.new("RGBA", (24, 32), (0, 0, 0, 0)); im.paste(c.im, (0, 0)); return im
    return c.im


def hero_sheet(name, pal=None, dirs=("down", "left", "right", "up")):
    W, H = 24, 32
    cols = 5
    rows = len(dirs) * 3
    sheet = Image.new("RGBA", (W * cols, H * rows), (0, 0, 0, 0))
    for di, d in enumerate(dirs):
        row = di
        frames = ["idle", "walk0", "walk1", "walk2", "walk3"]
        for i, p in enumerate(frames):
            sheet.paste(draw_humanoid(d, i, p, pal), (i * W, (row) * H))
        frames2 = ["atk0", "atk1", "atk2", "guard", "dodge"]
        for i, p in enumerate(frames2):
            sheet.paste(draw_humanoid(d, i, p, pal), (i * W, (len(dirs) + di) * H))
        frames3 = ["hurt", "capture", "dead"]
        for i, p in enumerate(frames3):
            sheet.paste(draw_humanoid(d, i, p, pal), (i * W, (2 * len(dirs) + di) * H))
    save(sheet, name)


def npc_sheet(name, pal):
    # NPC so precisa de idle(2) + walk(4) frente; reaproveita a mesma folha do heroi (4 direcoes)
    hero_sheet(name, pal)


# ------------------------------------------------------------------ CRIATURAS / INIMIGOS
# Layout (colunas): 0 idle0, 1 idle1, 2-5 walk, 6 windup/skill, 7 attack, 8 hurt  -> 9 colunas

def anim_params(frame):
    """retorna (bob, step, stretch, lean) para cada coluna."""
    table = {
        0: (0, 0, 0, 0), 1: (1, 0, 0, 0),
        2: (0, 1, 0, 0), 3: (1, 0, 0, 0), 4: (0, -1, 0, 0), 5: (1, 0, 0, 0),
        6: (0, 0, -1, -1), 7: (0, 0, 2, 1), 8: (0, 0, -1, -2),
    }
    return table[frame]


def sheet_from(fn, W, H, name, cols=9):
    sheet = Image.new("RGBA", (W * cols, H), (0, 0, 0, 0))
    for f in range(cols):
        c = Canvas(W, H)
        fn(c, f)
        c.outline()
        sheet.paste(c.im, (f * W, 0))
    save(sheet, name)


def brotisco(c, f, big=False):
    bob, step, st, lean = anim_params(f)
    W, H = c.w, c.h
    cx = W // 2
    body = hx("6fbf4a"); belly = hx("c8e890"); dark = hx("3f8a3a")
    s = 1.5 if big else 1.0
    by = H - 7 * s - bob
    c.ell(cx + lean, by, 5 * s + (st * .5), 4 * s - (st * .3), body)
    c.ell(cx + lean, by + 1, 3 * s, 2.5 * s, belly)
    # pes
    c.r(cx - 3 + step, H - 3, 2, 2, dark); c.r(cx + 1 - step, H - 3, 2, 2, dark)
    # olhos
    c.p(cx - 2 + lean, by - 1, OUT); c.p(cx + 2 + lean, by - 1, OUT)
    c.p(cx - 2 + lean, by - 2, hx("ffffff")); c.p(cx + 2 + lean, by - 2, hx("ffffff"))
    # broto na cabeca
    ty = by - 4 * s
    c.line(cx + lean, ty, cx + lean, ty - 3 * s, dark)
    c.ell(cx - 2 + lean, ty - 3 * s, 2.2 * s, 1.5 * s, hx("8ee060")); c.ell(cx + 2 + lean, ty - 4 * s, 2.2 * s, 1.5 * s, hx("a8f070"))
    if big:  # Galhardo: chifres de galho e folhagem maior
        for sx in (-1, 1):
            c.line(cx + sx * 4 + lean, ty, cx + sx * 7 + lean, ty - 5, hx("7a5232"))
            c.line(cx + sx * 6 + lean, ty - 3, cx + sx * 9 + lean, ty - 5, hx("7a5232"))
            c.ell(cx + sx * 8 + lean, ty - 5, 2, 1.5, hx("a8f070"))
    if f == 8:
        c.p(cx - 2, by - 1, hx("ff8080")); c.p(cx + 2, by - 1, hx("ff8080"))


def lumipim(c, f, big=False):
    bob, step, st, lean = anim_params(f)
    W, H = c.w, c.h; cx = W // 2
    s = 1.5 if big else 1.0
    body = hx("fff0a0") if not big else hx("ffe070")
    by = H - 8 * s - bob - 1
    # asas
    wing = hx("bfe8ff") if not big else hx("fff4c8")
    wy = by - 1 + (1 if f % 2 else -1)
    c.ell(cx - 5 * s, wy, 3 * s, 2 * s, wing); c.ell(cx + 5 * s, wy, 3 * s, 2 * s, wing)
    c.ell(cx + lean, by, 4.5 * s, 4 * s, body)
    c.ell(cx + lean, by + 1, 2.5 * s, 2 * s, hx("fffbe0"))
    c.p(cx - 2 + lean, by - 1, OUT); c.p(cx + 2 + lean, by - 1, OUT)
    c.p(cx + lean, by + 1, hx("e8a838")); c.p(cx + lean + 1, by + 1, hx("e8a838"))
    # luzinha na cabeca
    c.ell(cx + lean, by - 5 * s, 1.5 * s, 1.5 * s, hx("fff8a0") if st >= 0 else hx("ffffff"))
    c.p(cx + lean, by - 7 * s, hx("fffbd0"))
    c.r(cx - 2, H - 2, 1, 2, hx("c08a30")); c.r(cx + 1, H - 2, 1, 2, hx("c08a30"))
    if big:
        c.ell(cx, by - 8 * s, 4, 1, hx("ffd860"))  # halo


def cascalito(c, f, big=False):
    bob, step, st, lean = anim_params(f)
    W, H = c.w, c.h; cx = W // 2
    s = 1.45 if big else 1.0
    rock = hx("8f8a92"); lite = hx("b8b4bc"); dk = hx("5f5a66")
    by = H - 6 * s - bob + (1 if bob else 0)
    c.ell(cx + lean, by, 5.5 * s + st * .4, 4.5 * s, rock)
    c.ell(cx + lean - 1, by - 2 * s, 3 * s, 2 * s, lite)
    c.r(cx - 4 + step, H - 3, 3, 3, dk); c.r(cx + 1 - step, H - 3, 3, 3, dk)
    c.p(cx - 2 + lean, by - 1, OUT); c.p(cx + 2 + lean, by - 1, OUT); c.p(cx + lean, by + 1, OUT)
    c.r(cx + lean - 3, by - 5 * s, 4, 2, hx("5f8f4a")); c.p(cx + lean + 2, by - 5 * s - 1, hx("8ee060"))  # musgo
    if big:  # Rocantor: ombros-escudo
        c.r(cx - 9, by - 2, 4, 6, dk); c.r(cx + 5, by - 2, 4, 6, dk); c.r(cx - 9, by - 2, 4, 1, lite); c.r(cx + 5, by - 2, 4, 1, lite)
    if f == 7:
        c.r(cx + 6, by - 2, 4, 4, lite)  # escudo no avanco


def lobo(c, f):
    bob, step, st, lean = anim_params(f)
    W, H = c.w, c.h
    fur = hx("6a4a3a"); dk = hx("3f2a22"); sp = hx("d8d0a0"); thorn = hx("5a8a3a")
    by = H - 9 - bob
    lean2 = lean * 2
    c.ell(11 + lean2, by, 9 + st, 5, fur)
    c.ell(19 + lean2, by - 3, 4, 3.5, fur)  # cabeca
    c.r(22 + lean2, by - 2, 4, 2, dk); c.p(21 + lean2, by - 4, hx("ff6040")); c.p(23 + lean2, by - 5, hx("ff6040"))
    c.r(18 + lean2, by - 8, 2, 3, dk); c.r(21 + lean2, by - 8, 2, 3, dk)  # orelhas
    for i, x in enumerate((6, 9, 12, 15)):
        c.r(x + lean2, by - 6 - (i % 2), 1, 3, sp); c.p(x + lean2, by - 7 - (i % 2), thorn)  # espinhos
    c.r(5 + step + lean2, H - 4, 2, 4, dk); c.r(9 - step + lean2, H - 4, 2, 4, dk); c.r(15 + step + lean2, H - 4, 2, 4, dk); c.r(19 - step + lean2, H - 4, 2, 4, dk)
    c.line(2, by - 2, 0, by - 5 - (1 if f % 2 else 0), dk)
    if f == 7:
        c.r(24, by - 1, 3, 1, hx("ffffff"))  # presas na investida


def cogumelo(c, f):
    bob, step, st, lean = anim_params(f)
    W, H = c.w, c.h; cx = W // 2
    cap = hx("a8486a") if f != 8 else hx("d87090")
    by = H - 8
    c.r(cx - 3, by - bob, 6, 8, hx("e8dcc0"))
    c.r(cx - 4 + step, H - 2, 3, 2, hx("c9b890")); c.r(cx + 1 - step, H - 2, 3, 2, hx("c9b890"))
    ex = 1 if f == 6 else 0
    c.ell(cx, by - 4 - bob - ex, 8 + ex, 5 + ex, cap)
    for x, y in ((cx - 4, by - 6), (cx + 2, by - 7), (cx, by - 3), (cx + 5, by - 4)):
        c.r(x, y - bob - ex, 2, 2, hx("f8d8e8"))
    c.p(cx - 2, by - bob, OUT); c.p(cx + 1, by - bob, OUT)
    if f in (6, 7):
        for dx in (-9, 9):
            c.p(cx + dx, by - 8, hx("c8e080")); c.p(cx + dx // 2, by - 11, hx("c8e080"))
    c.p(cx - 7, by - 2, hx("7a2a4a"))


def sentinela(c, f):
    bob, step, st, lean = anim_params(f)
    W, H = c.w, c.h; cx = W // 2
    wood = hx("8a5a38"); lite = hx("b07848"); dk = hx("5a3a24"); moss = hx("5f8f4a")
    c.r(cx - 5 + step, H - 8, 4, 8, dk); c.r(cx + 1 - step, H - 8, 4, 8, dk)
    c.r(cx - 7, 8 - bob, 14, 16, wood)
    c.r(cx - 7, 8 - bob, 14, 2, lite)
    for y in range(12, 22, 4):
        c.r(cx - 7, y - bob, 14, 1, dk)
    c.r(cx - 5, 1 - bob, 10, 8, lite); c.r(cx - 5, 1 - bob, 10, 2, hx("c89868"))
    c.p(cx - 3, 5 - bob, hx("ffd860")); c.p(cx + 2, 5 - bob, hx("ffd860"))
    c.r(cx - 3, 9 - bob, 6, 2, moss)
    # escudo frontal (lado direito), lanca de madeira
    c.r(cx + 6 + lean, 9 - bob, 6, 14, hx("6a4a30")); c.r(cx + 6 + lean, 9 - bob, 6, 2, lite); c.r(cx + 8 + lean, 13 - bob, 2, 6, hx("c9a038"))
    if f in (6, 7):
        c.line(cx - 8, 6, cx - 10, 24 if f == 7 else 0, dk); c.line(cx - 9, 6, cx - 11, 24 if f == 7 else 0, wood)
    else:
        c.line(cx - 9, 4, cx - 9, 26, dk)


def lenhador(c, f):
    bob, step, st, lean = anim_params(f)
    W, H = c.w, c.h; cx = W // 2
    bark = hx("6b4a30"); dk = hx("3f2a1c"); lite = hx("8a6a44"); hollow = hx("1a1020")
    c.r(cx - 9 + step, H - 10, 7, 10, dk); c.r(cx + 2 - step, H - 10, 7, 10, dk)
    c.r(cx - 12, 14 - bob, 24, 20, bark)
    c.r(cx - 12, 14 - bob, 24, 2, lite)
    for y in range(18, 32, 5):
        c.r(cx - 12, y - bob, 24, 1, dk)
    c.ell(cx, 22 - bob, 4, 6, hollow)  # tronco oco com brilho
    c.p(cx - 1, 20 - bob, hx("ff9a40")); c.p(cx + 1, 20 - bob, hx("ff9a40"))
    c.r(cx - 7, 3 - bob, 14, 11, lite); c.r(cx - 7, 3 - bob, 14, 2, hx("a88a60"))
    c.r(cx - 4, 7 - bob, 3, 3, hollow); c.r(cx + 2, 7 - bob, 3, 3, hollow)
    c.p(cx - 3, 8 - bob, hx("ff9a40")); c.p(cx + 3, 8 - bob, hx("ff9a40"))
    c.r(cx - 6, 0, 2, 4, hx("5f8f4a")); c.r(cx + 4, 0, 2, 3, hx("5f8f4a"))  # folhas
    # machado
    if f == 6:
        c.line(cx + 12, 20, cx + 10, -2, hx("a8825a")); c.r(cx + 6, -4, 8, 5, hx("c8ccd8"))
    elif f == 7:
        c.line(cx + 12, 22, cx + 22, 34, hx("a8825a")); c.r(cx + 20, 32, 8, 5, hx("c8ccd8"))
    else:
        c.line(cx + 12, 20, cx + 15, 36, hx("a8825a")); c.r(cx + 13, 30, 7, 5, hx("c8ccd8"))
    c.r(cx - 16, 16 - bob, 4, 10, bark); c.r(cx + 12, 16 - bob, 4, 10, bark)


def cervo(c, f):
    bob, step, st, lean = anim_params(f)
    W, H = c.w, c.h
    bone = hx("e8e0c8"); dk = hx("a89e82"); void = hx("1a1020"); glow = hx("9bff7a")
    by = H - 22 - bob
    # corpo
    c.ell(26 + lean * 2, by, 20 + st, 10, bone)
    c.ell(26 + lean * 2, by + 3, 16, 5, dk)
    for x in range(10, 40, 4):
        c.r(x + lean * 2, by - 6, 1, 12, void)  # costelas
    # nucleo (coracao de Eco) no peito
    c.ell(20 + lean * 2, by, 3, 3, glow); c.p(20 + lean * 2, by, hx("ffffff"))
    # pernas
    for i, x in enumerate((10, 17, 33, 40)):
        off = step if i % 2 == 0 else -step
        c.r(x + off + lean, by + 8, 3, 14 - bob, bone); c.r(x + off + lean, H - 4, 4, 3, dk)
    # pescoco e cabeca
    c.r(42 + lean * 2, by - 14, 5, 14, bone)
    c.ell(51 + lean * 2, by - 15, 6, 5, bone); c.r(53 + lean * 2, by - 14, 8, 4, dk)
    c.r(49 + lean * 2, by - 18, 2, 2, void); c.p(49 + lean * 2, by - 18, glow)
    # galhada
    for k in range(3):
        c.line(48 + lean * 2, by - 19, 44 + k * 3 + lean * 2, by - 30 - k * 2, dk)
        c.line(52 + lean * 2, by - 19, 56 + k * 3 + lean * 2, by - 30 - k * 2, dk)
    c.line(48 + lean * 2, by - 24, 42 + lean * 2, by - 26, dk)
    c.line(52 + lean * 2, by - 24, 58 + lean * 2, by - 26, dk)
    # cauda de raizes
    c.line(6 + lean, by - 2, 0, by + 6, hx("5a8a3a"))
    if f == 6:  # raspando o chao
        c.line(58, H - 3, 62, H - 5, hx("c9a66e"))


def make_creatures():
    # 9 colunas: idle0 idle1 walk0-3 windup attack hurt
    sheet_from(lambda c, f: brotisco(c, f, False), 20, 20, "brotisco.png")
    sheet_from(lambda c, f: brotisco(c, f, True), 28, 28, "galhardo.png")
    sheet_from(lambda c, f: lumipim(c, f, False), 20, 20, "lumipim.png")
    sheet_from(lambda c, f: lumipim(c, f, True), 28, 28, "auripim.png")
    sheet_from(lambda c, f: cascalito(c, f, False), 20, 20, "cascalito.png")
    sheet_from(lambda c, f: cascalito(c, f, True), 28, 28, "rocantor.png")
    sheet_from(lobo, 30, 20, "lobo_espinhos.png")
    sheet_from(cogumelo, 24, 22, "cogumelo.png")
    sheet_from(sentinela, 32, 34, "sentinela.png")
    sheet_from(lenhador, 44, 44, "lenhador.png")
    sheet_from(cervo, 68, 56, "cervo.png")


# ------------------------------------------------------------------ PROPS
def make_props():
    out = {}
    # bau fechado/aberto
    def chest(open_):
        c = Canvas(16, 16)
        c.r(2, 6, 12, 8, hx("8a5a38")); c.r(2, 6, 12, 2, hx("a8764a"))
        c.r(2, 10, 12, 1, hx("5a3a24")); c.r(7, 9, 2, 3, hx("e8c038"))
        if open_:
            c.r(2, 3, 12, 3, hx("6b4528")); c.r(3, 7, 10, 3, hx("2a1a14")); c.r(6, 6, 4, 2, hx("fff0a0"))
        else:
            c.r(2, 4, 12, 3, hx("a8764a")); c.r(2, 4, 12, 1, hx("c9946a"))
        c.outline(); return c.im
    sh = Image.new("RGBA", (32, 16)); sh.paste(chest(False), (0, 0)); sh.paste(chest(True), (16, 0)); save(sh, "chest.png")
    # alavanca: baixo / cima
    def lever(up, ):
        c = Canvas(16, 16)
        c.r(3, 11, 10, 4, hx("8a8670")); c.r(3, 11, 10, 1, hx("b0a98e"))
        if up:
            c.line(8, 11, 4, 3, hx("a8764a")); c.line(9, 11, 5, 3, hx("a8764a")); c.ell(4, 3, 2, 2, hx("e8c038"))
        else:
            c.line(8, 11, 12, 3, hx("a8764a")); c.line(9, 11, 13, 3, hx("a8764a")); c.ell(12, 3, 2, 2, hx("c0703a"))
        c.outline(); return c.im
    sh = Image.new("RGBA", (32, 16)); sh.paste(lever(False), (0, 0)); sh.paste(lever(True), (16, 0)); save(sh, "lever.png")
    # placa de peso: solta / pressionada
    def plate(on):
        c = Canvas(16, 16)
        c.r(1, 3 if not on else 5, 14, 11 if not on else 9, hx("8a8670") if not on else hx("a8c870"))
        c.r(3, 5 if not on else 7, 10, 7 if not on else 5, hx("b0a98e") if not on else hx("d8f090"))
        c.ell(8, 9 if not on else 10, 3, 2, hx("6e6a58") if not on else hx("5f8f4a"))
        c.outline(); return c.im
    sh = Image.new("RGBA", (32, 16)); sh.paste(plate(False), (0, 0)); sh.paste(plate(True), (16, 0)); save(sh, "plate.png")
    # caixa empurravel
    c = Canvas(16, 16)
    c.r(1, 1, 14, 14, hx("a8764a")); c.r(1, 1, 14, 2, hx("c9946a")); c.r(3, 3, 10, 10, hx("8a5a38"))
    c.line(3, 3, 12, 12, hx("6b4528")); c.line(12, 3, 3, 12, hx("6b4528")); c.r(1, 1, 14, 1, hx("e0b888"))
    c.outline(); save(c.im, "crate.png")
    # flor-lanterna apagada / acesa
    def flower(lit):
        c = Canvas(16, 16)
        c.line(8, 15, 8, 8, hx("3f8a3a")); c.ell(5, 12, 3, 1, hx("4a9a48")); c.ell(11, 11, 3, 1, hx("4a9a48"))
        pet = hx("ffe880") if lit else hx("8a8aa0")
        c.ell(8, 6, 4, 4, pet); c.ell(8, 6, 2, 2, hx("fffbd0") if lit else hx("5a5a70"))
        if lit:
            for x, y in ((2, 3), (14, 4), (8, 0), (3, 9), (13, 9)):
                c.p(x, y, hx("fff4a0"))
        c.outline(); return c.im
    sh = Image.new("RGBA", (32, 16)); sh.paste(flower(False), (0, 0)); sh.paste(flower(True), (16, 0)); save(sh, "flower.png")
    # santuario (cristal): inativo / ativo
    def shrine(on):
        c = Canvas(24, 32)
        c.r(2, 24, 20, 6, hx("8a8670")); c.r(2, 24, 20, 2, hx("b0a98e")); c.r(5, 21, 14, 4, hx("6e6a58"))
        col = hx("7ae0ff") if on else hx("5a7a8a")
        c.r(10, 6, 4, 16, col); c.r(8, 10, 8, 8, col); c.r(11, 3, 2, 3, shade(col, 1.2))
        c.r(10, 7, 1, 14, shade(col, 1.4))
        if on:
            for x, y in ((4, 8), (19, 12), (6, 18), (18, 4), (12, 0)):
                c.p(x, y, hx("d8f8ff"))
        c.outline(); return c.im
    sh = Image.new("RGBA", (48, 32)); sh.paste(shrine(False), (0, 0)); sh.paste(shrine(True), (24, 0)); save(sh, "shrine.png")
    # placa de aviso
    c = Canvas(16, 16)
    c.r(7, 8, 2, 7, hx("6b4528")); c.r(2, 2, 12, 8, hx("c9a070")); c.r(2, 2, 12, 1, hx("e0c090")); c.r(4, 4, 8, 1, hx("6b4528")); c.r(4, 6, 6, 1, hx("6b4528"))
    c.outline(); save(c.im, "sign.png")
    # suporte para cipo (marcado) vazio/estendido
    def vine(on):
        c = Canvas(16, 24)
        c.r(6, 6, 4, 18, hx("8a8670")); c.r(3, 4, 10, 3, hx("b0a98e")); c.r(5, 3, 6, 1, hx("e0d6a8"))
        c.r(7, 8, 2, 2, hx("5f8f4a"))
        if on:
            c.line(8, 4, 8, 0, hx("5f8f4a")); c.line(2, 5, 2, 23, hx("5fa047")); c.line(13, 5, 13, 23, hx("5fa047"))
            for y in range(6, 22, 3):
                c.r(3, y, 10, 1, hx("7ec060"))
        c.outline(); return c.im
    sh = Image.new("RGBA", (32, 24)); sh.paste(vine(False), (0, 0)); sh.paste(vine(True), (16, 0)); save(sh, "vine.png")
    # pontos de ponte (Raiz Viva): marca sobre o abismo
    c = Canvas(16, 16)
    c.r(1, 1, 14, 14, (0, 0, 0, 0))
    for i in range(0, 16, 4):
        c.r(i, 0, 2, 2, hx("9bff7a")); c.r(i + 2, 14, 2, 2, hx("9bff7a")); c.r(0, i + 2, 2, 2, hx("9bff7a")); c.r(14, i, 2, 2, hx("9bff7a"))
    c.ell(8, 8, 3, 3, hx("5f8f4a")); c.p(8, 8, hx("e8ffd0"))
    save(c.im, "bridge_mark.png")
    # selo de vinculo (projetil) 8x8 e particulas
    c = Canvas(8, 8)
    c.ell(4, 4, 3.4, 3.4, hx("9bf0ff")); c.ell(4, 4, 1.6, 1.6, hx("ffffff")); c.outline(hx("2a6a9a")); save(c.im, "seal.png")
    c = Canvas(4, 4); c.r(0, 0, 4, 4, hx("ffffff")); save(c.im, "spark.png")
    # fragmentos de Eco (moeda)
    c = Canvas(8, 8); c.r(2, 0, 4, 8, hx("9bf0ff")); c.r(0, 2, 8, 4, hx("9bf0ff")); c.r(3, 1, 2, 2, hx("ffffff")); c.outline(hx("2a6a9a")); save(c.im, "fragment.png")
    # sombra
    c = Canvas(24, 8); c.ell(12, 4, 10, 3, (0, 0, 0, 90)); save(c.im, "shadow.png")
    # raiz (habilidade) / area
    c = Canvas(16, 16)
    for sx in (3, 8, 12):
        c.line(sx, 15, sx + 1, 3, hx("5a8a3a")); c.line(sx + 1, 15, sx + 2, 3, hx("7ec060"))
    c.ell(8, 14, 7, 2, hx("3f6a38")); save(c.im, "roots.png")
    # icones 12x12 para itens (selo, selo refinado, pocao, fragmento, chave, amuleto, raiz, espada)
    icons = Image.new("RGBA", (16 * 8, 16), (0, 0, 0, 0))

    def icon(i, fn):
        c = Canvas(16, 16); fn(c); c.outline(); icons.paste(c.im, (i * 16, 0))
    icon(0, lambda c: (c.ell(8, 8, 5, 5, hx("9bf0ff")), c.ell(8, 8, 2.4, 2.4, hx("ffffff"))))
    icon(1, lambda c: (c.ell(8, 8, 5, 5, hx("ffd860")), c.ell(8, 8, 2.4, 2.4, hx("ffffff")), c.r(2, 7, 12, 2, hx("e8a838"))))
    icon(2, lambda c: (c.r(6, 2, 4, 3, hx("c9a070")), c.ell(8, 10, 5, 5, hx("e85a6a")), c.r(5, 7, 6, 2, hx("ff9aa8"))))
    icon(3, lambda c: (c.r(6, 2, 4, 12, hx("9bf0ff")), c.r(2, 6, 12, 4, hx("9bf0ff")), c.r(7, 4, 2, 3, hx("ffffff"))))
    icon(4, lambda c: (c.ell(5, 5, 3, 3, hx("e8c038")), c.r(7, 7, 3, 7, hx("e8c038")), c.r(9, 11, 4, 2, hx("e8c038"))))
    icon(5, lambda c: (c.ell(8, 9, 5, 5, hx("c0703a")), c.ell(8, 9, 2.5, 2.5, hx("7ae0ff")), c.r(7, 1, 2, 4, hx("a8764a"))))
    icon(6, lambda c: (c.line(8, 14, 8, 3, hx("5f8f4a")), c.ell(5, 5, 3, 2, hx("8ee060")), c.ell(11, 7, 3, 2, hx("a8f070")), c.ell(6, 11, 3, 2, hx("8ee060"))))
    icon(7, lambda c: (c.line(3, 13, 13, 3, hx("e8eef8")), c.line(3, 12, 12, 3, hx("b8c0d0")), c.r(2, 12, 4, 2, hx("c0703a"))))
    save(icons, "icons.png")


# ------------------------------------------------------------------ HUD retratos pequenos nao necessarios; titulo
def make_title():
    W, H = 480, 270
    im = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(20 + 30 * t), int(18 + 30 * t), int(48 + 40 * t), 255))
    rnd = random.Random(7)
    for _ in range(90):
        x, y = rnd.randrange(W), rnd.randrange(H // 2)
        d.point((x, y), fill=(255, 245, 200, 255))
    # lua
    d.ellipse((350, 28, 410, 88), fill=(246, 236, 200, 255)); d.ellipse((364, 28, 424, 88), fill=(30, 36, 70, 255))
    # montanhas / silhueta de floresta e ruina
    pts = [(0, 200), (60, 150), (120, 190), (190, 130), (260, 180), (330, 140), (400, 185), (480, 160), (480, 270), (0, 270)]
    d.polygon(pts, fill=(28, 40, 66, 255))
    for x in range(0, W, 12):
        h = rnd.randrange(30, 60)
        d.polygon([(x, 270), (x + 6, 270 - h), (x + 12, 270)], fill=(18, 46, 38, 255))
    # arco da ruina
    d.rectangle((210, 150, 226, 230), fill=(170, 164, 140, 255)); d.rectangle((254, 150, 270, 230), fill=(170, 164, 140, 255))
    d.rectangle((206, 140, 274, 154), fill=(190, 184, 158, 255))
    d.ellipse((228, 170, 252, 200), fill=(155, 255, 122, 255))
    d.ellipse((234, 176, 246, 194), fill=(232, 255, 208, 255))
    im.convert("RGB").save(os.path.join(SPR, "title_bg.png"))


def main():
    make_tiles()
    # heroi e NPCs
    hero_sheet("hero.png")
    hero_sheet("npc_elder.png", {"cloak": hx("7a4a8a"), "trim": hx("e8c038"), "scarf": hx("e0e0e8"), "hair": hx("d8d8e0")})
    hero_sheet("npc_smith.png", {"cloak": hx("8a4a2a"), "trim": hx("5a5a66"), "scarf": hx("c9a070"), "hair": hx("2a1a14")})
    hero_sheet("npc_kid.png", {"cloak": hx("3a8a5a"), "trim": hx("e8a838"), "scarf": hx("f8d8e8"), "hair": hx("c9843a")})
    hero_sheet("npc_mother.png", {"cloak": hx("b0485a"), "trim": hx("f2e6c8"), "scarf": hx("e8c038"), "hair": hx("3a2a4a")})
    hero_sheet("npc_ranger.png", {"cloak": hx("4a6a3a"), "trim": hx("8a5a38"), "scarf": hx("c8d0a0"), "hair": hx("6a4a2a")})
    make_creatures()
    make_props()
    make_title()
    print("arte gerada em", SPR, TIL)


if __name__ == "__main__":
    main()
