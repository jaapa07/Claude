#!/usr/bin/env python3
"""Compilador de pixel art autoral (.pxl -> .png).

Os sprites de Ecos da Ruína são desenhados à mão, pixel a pixel, em arquivos de texto.
Este script apenas converte o desenho em PNG; não gera formas.

Formato .pxl:
  # comentário
  pal NOME              -> usa paleta nomeada (definida com 'palette NOME')
  palette NOME
    k = #1b1626         -> um caractere por cor ('.' é sempre transparente)
  end
  frame NOME [w h]      -> quadro; linhas seguintes são pixels até 'end'
  end
  sheet ARQ.png W H COLS -> monta folha com os quadros listados nas linhas seguintes até 'end'
    nome_quadro [flip]   -> 'flip' espelha horizontalmente; '-' deixa a célula vazia
  end
"""
import os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def hx(s):
    s = s.strip().lstrip("#")
    a = 255
    if len(s) == 8:
        a = int(s[6:8], 16)
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def parse(path, palettes, frames, sheets):
    cur_pal = None
    lines = open(path, encoding="utf-8").read().split("\n")
    i = 0
    while i < len(lines):
        raw = lines[i]
        ln = raw.strip()
        i += 1
        if not ln or ln.startswith("#"):
            continue
        parts = ln.split()
        if parts[0] == "palette":
            name = parts[1]
            pal = {".": (0, 0, 0, 0)}
            if len(parts) > 3 and parts[2] == "from":
                pal.update(palettes[parts[3]])
            while i < len(lines) and lines[i].strip() != "end":
                l2 = lines[i].strip()
                i += 1
                if not l2 or l2.startswith("#"):
                    continue
                k, v = l2.split("=")
                pal[k.strip()] = hx(v)
            i += 1
            palettes[name] = pal
        elif parts[0] == "pal":
            cur_pal = parts[1]
        elif parts[0] == "frame":
            name = parts[1]
            opts = parts[2:]
            rows = []
            while i < len(lines) and lines[i].strip() != "end":
                rows.append(lines[i].strip())
                i += 1
            i += 1
            if "mirror4" in opts:
                # linhas descrevem o quadrante superior-esquerdo; espelha em X e Y
                rows = [r + r[::-1] for r in rows]
                rows = rows + rows[::-1]
            elif "mirror" in opts:
                # linhas descrevem a metade esquerda; a direita é o espelho exato
                rows = [r + r[::-1] for r in rows]
            base = None
            if "over" in opts:
                base = opts[opts.index("over") + 1]
            frames[name] = (cur_pal, rows, path, base)
        elif parts[0] == "sheet":
            out, w, h, cols = parts[1], int(parts[2]), int(parts[3]), int(parts[4])
            cells = []
            while i < len(lines) and lines[i].strip() != "end":
                l2 = lines[i].strip()
                i += 1
                if l2 and not l2.startswith("#"):
                    cells.append(l2.split())
            i += 1
            sheets.append((out, w, h, cols, cells, path))


def render(name, frames, palettes, cache, pal_override=None):
    key = (name, pal_override)
    if key in cache:
        return cache[key]
    pal_name, rows, path, base = frames[name]
    pal = palettes[pal_override or pal_name]
    if base:
        im = render(base, frames, palettes, cache, pal_override).copy()
    else:
        w = max(len(r) for r in rows) if rows else 0
        im = Image.new("RGBA", (w, len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if base and ch == ".":
                continue          # sobreposição: '.' mantém o pixel do quadro-base
            if ch == "_":
                ch = "."          # '_' apaga
            if ch not in pal:
                raise SystemExit(f"{path}: quadro '{name}' linha {y}: cor '{ch}' fora da paleta {pal_name}")
            if x < im.width and y < im.height:
                im.putpixel((x, y), pal[ch])
    cache[key] = im
    return im


def main(argv):
    src_dir = os.path.join(ROOT, "assets", "src")
    out_dir = os.path.join(ROOT, "assets", "sprites")
    palettes, frames, sheets = {}, {}, []
    files = sorted(f for f in os.listdir(src_dir) if f.endswith(".pxl"))
    # paletas primeiro (arquivos com prefixo 00_)
    for f in files:
        parse(os.path.join(src_dir, f), palettes, frames, sheets)
    cache = {}
    for out, w, h, cols, cells, path in sheets:
        n = len(cells)
        rows_n = (n + cols - 1) // cols
        sheet = Image.new("RGBA", (w * cols, h * rows_n), (0, 0, 0, 0))
        for k, cell in enumerate(cells):
            if cell[0] == "-":
                continue
            if cell[0] not in frames:
                raise SystemExit(f"{path}: folha {out}: quadro inexistente '{cell[0]}'")
            po = None
            for c in cell[1:]:
                if c.startswith("pal="):
                    po = c[4:]
            im = render(cell[0], frames, palettes, cache, po)
            if "flip" in cell[1:]:
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
            dx = (w - im.width) // 2
            dy = h - im.height
            for c in cell[1:]:
                if c.startswith("dx="):
                    dx += int(c[3:])
                if c.startswith("dy="):
                    dy += int(c[3:])
            sheet.alpha_composite(im, (k % cols * w + dx, k // cols * h + dy))
        sheet.save(os.path.join(out_dir, out))
        print("folha", out, sheet.size)
    if "--preview" in argv:
        name = argv[argv.index("--preview") + 1]
        sc = int(argv[argv.index("--preview") + 2]) if len(argv) > argv.index("--preview") + 2 else 6
        im = Image.open(os.path.join(out_dir, name))
        bg = Image.new("RGBA", im.size, (96, 128, 88, 255))
        bg.alpha_composite(im)
        bg.resize((im.width * sc, im.height * sc), Image.NEAREST).save("/tmp/preview.png")


if __name__ == "__main__":
    main(sys.argv[1:])
