"""Texturas de cenário do REI DA PRAIA (placas de patrocinadores fictícios, rede, faixas, bandeirões).
Também copia e redimensiona as texturas PBR de areia (ambientCG, CC0) e os HDRIs (Poly Haven, CC0)."""
import os, shutil, math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, '.cache', 'src')
TEX = os.path.join(ROOT, 'public', 'assets', 'textures')
for d in ('arena', 'sand', 'sky'):
    os.makedirs(os.path.join(TEX, d), exist_ok=True)
BUNGEE = os.path.join(ROOT, 'node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff')
RUBIK = os.path.join(ROOT, 'node_modules/@fontsource/rubik/files/rubik-latin-800-normal.woff')


def F(size, f=BUNGEE):
    try:
        return ImageFont.truetype(f, size)
    except Exception:
        return ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf', size)


def center_text(d, box, txt, font, fill, stroke=0, sfill=None):
    bb = d.textbbox((0, 0), txt, font=font, stroke_width=stroke)
    x = box[0] + (box[2] - box[0] - (bb[2] - bb[0])) / 2 - bb[0]
    y = box[1] + (box[3] - box[1] - (bb[3] - bb[1])) / 2 - bb[1]
    d.text((x, y), txt, font=font, fill=fill, stroke_width=stroke, stroke_fill=sfill)


def fit_font(d, txt, maxw, size, f=BUNGEE):
    while size > 10:
        fo = F(size, f)
        bb = d.textbbox((0, 0), txt, font=fo)
        if bb[2] - bb[0] <= maxw: return fo
        size -= 4
    return F(size, f)


def sun(d, cx, cy, r, col):
    for i in range(12):
        a = i * math.pi / 6
        d.polygon([(cx + math.cos(a - 0.12) * r * 1.2, cy + math.sin(a - 0.12) * r * 1.2), (cx + math.cos(a) * r * 1.7, cy + math.sin(a) * r * 1.7),
                   (cx + math.cos(a + 0.12) * r * 1.2, cy + math.sin(a + 0.12) * r * 1.2)], fill=col)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col)


def wave(d, x0, y0, w, h, col, n=3):
    pts = []
    for i in range(60):
        t = i / 59
        pts.append((x0 + t * w, y0 + math.sin(t * math.pi * 2 * n) * h))
    d.line(pts, fill=col, width=int(h * 0.9))


def coconut(d, cx, cy, r):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill='#6B3E1E')
    d.ellipse((cx - r * 0.75, cy - r * 0.75, cx + r * 0.75, cy + r * 0.75), fill='#F7F3E8')
    d.line((cx + r * 0.2, cy - r * 1.6, cx + r * 0.1, cy - r * 0.3), fill='#FF3E8A', width=int(r * 0.25))


SPONSORS = [
    # (texto, fundo, cor do texto, desenho)
    ('COCO GELADO', '#0FA3A3', '#FFFFFF', 'coconut'),
    ('MARÉ ALTA SURF', '#1D3F8F', '#FFD21F', 'wave'),
    ('RÁDIO ONDA 98', '#FF7A00', '#FFFFFF', 'radio'),
    ('SOLAR FPS 50', '#FFD21F', '#D7263D', 'sun'),
    ('PICOLÉ TROPICAL', '#FF3E8A', '#FFFFFF', 'pop'),
    ('REI DA PRAIA', '#141414', '#FFB81F', 'sun2'),
    ('BRISA AIRLINES', '#FFFFFF', '#1D74C9', 'plane'),
    ('FAROL BANK', '#0B6B35', '#FFFFFF', 'light'),
]


def board(i, w=1024, h=128):
    txt, bg, fg, art = SPONSORS[i]
    im = Image.new('RGB', (w, h), bg)
    d = ImageDraw.Draw(im)
    # faixa diagonal decorativa
    d.polygon([(w - 220, 0), (w - 150, 0), (w - 230, h), (w - 300, h)], fill=fg if bg != '#FFFFFF' else '#E6F1FB')
    if art == 'coconut': coconut(d, 70, 70, 34)
    elif art == 'wave': wave(d, 20, 64, 110, 18, '#7CC6F2')
    elif art == 'radio':
        for r in (20, 36, 52): d.arc((70 - r, 64 - r, 70 + r, 64 + r), -60, 60, fill=fg, width=8)
        d.ellipse((60, 54, 80, 74), fill=fg)
    elif art == 'sun': sun(d, 70, 64, 28, '#FF7A00')
    elif art == 'pop':
        d.rounded_rectangle((52, 14, 92, 92), 18, fill='#FFD21F'); d.rectangle((68, 92, 76, 118), fill='#F7E7C8')
    elif art == 'sun2': sun(d, 70, 64, 26, '#FFB81F'); wave(d, 30, 100, 90, 8, '#FF6A1A', 2)
    elif art == 'plane':
        d.polygon([(30, 70), (120, 56), (130, 62), (40, 80)], fill=fg); d.polygon([(70, 64), (95, 30), (105, 32), (92, 64)], fill=fg); d.polygon([(70, 72), (90, 104), (100, 102), (88, 70)], fill=fg)
    elif art == 'light':
        d.polygon([(60, 110), (80, 110), (76, 40), (64, 40)], fill='#FFFFFF'); d.rectangle((58, 26, 82, 42), fill='#FFD21F')
        d.polygon([(82, 30), (140, 10), (140, 56)], fill='#FFE89A')
    fo = fit_font(d, txt, w - 420, 78)
    center_text(d, (150, 0, w - 270, h), txt, fo, fg)
    small = F(26, RUBIK)
    d.text((w - 140, 44), 'oficial' if i % 2 else 'patrocina', font=small, fill=fg if bg != '#FFFFFF' else '#1D74C9')
    return im


def main():
    # atlas de placas: 8 linhas de 1024x128
    atlas = Image.new('RGB', (1024, 1024))
    for i in range(8):
        atlas.paste(board(i), (0, i * 128))
    atlas.save(os.path.join(TEX, 'arena', 'boards.png'), optimize=True)
    # versão noturna (neon): mesmas marcas, fundo escuro e brilho
    neon = Image.new('RGB', (1024, 1024))
    for i in range(8):
        b = board(i)
        dark = Image.new('RGB', b.size, '#0A0A18')
        glow = b.filter(ImageFilter.GaussianBlur(6))
        neon.paste(Image.blend(dark, Image.blend(b, glow, 0.35), 0.85), (0, i * 128))
    neon.save(os.path.join(TEX, 'arena', 'boards_neon.png'), optimize=True)

    # rede do gol (alpha)
    net = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(net)
    for k in range(0, 256, 32):
        d.line((k, 0, k, 256), fill=(250, 250, 245, 255), width=5)
        d.line((0, k, 256, k), fill=(250, 250, 245, 255), width=5)
    net.save(os.path.join(TEX, 'arena', 'net.png'))

    # faixa do campo (fita azul com textura de tecido)
    tape = Image.new('RGB', (64, 512), '#1F6FD1')
    d = ImageDraw.Draw(tape)
    rnd = random.Random(3)
    for y in range(0, 512, 4):
        d.line((0, y, 64, y), fill=(31 + rnd.randint(-8, 8), 111 + rnd.randint(-10, 10), 209 + rnd.randint(-10, 10)))
    d.rectangle((0, 0, 4, 512), fill='#174F9A'); d.rectangle((60, 0, 64, 512), fill='#174F9A')
    tape.save(os.path.join(TEX, 'arena', 'tape.png'))

    # assentos da arquibancada: listras coloridas
    seats = Image.new('RGB', (256, 256), '#DDDDDD')
    d = ImageDraw.Draw(seats)
    cols = ['#FFD21F', '#1D74C9', '#FF7A00', '#0FA3A3', '#FFFFFF', '#FF3E8A']
    for i in range(16):
        d.rectangle((0, i * 16, 256, i * 16 + 11), fill=cols[i % len(cols)])
        d.rectangle((0, i * 16 + 11, 256, i * 16 + 16), fill='#8A8A8A')
    seats.save(os.path.join(TEX, 'arena', 'seats.png'))

    # bandeirão do jogo (faixa no topo da arquibancada) 2048x256
    ban = Image.new('RGB', (2048, 256), '#FF6A1A')
    d = ImageDraw.Draw(ban)
    for i in range(0, 2048, 120):
        d.polygon([(i, 256), (i + 60, 256), (i + 160, 0), (i + 100, 0)], fill='#FF8A2A')
    sun(d, 180, 128, 54, '#FFD21F')
    center_text(d, (300, 0, 1748, 256), 'REI DA PRAIA  •  COPA DE FUTEBOL DE PRAIA', fit_font(d, 'REI DA PRAIA  •  COPA DE FUTEBOL DE PRAIA', 1400, 110), '#FFFFFF', 6, '#7A2A00')
    sun(d, 1868, 128, 54, '#FFD21F')
    ban.save(os.path.join(TEX, 'arena', 'banner.png'), optimize=True)

    # telão / placar do estádio
    scr = Image.new('RGB', (512, 256), '#0B1530')
    d = ImageDraw.Draw(scr)
    d.rectangle((8, 8, 504, 248), outline='#1F6FD1', width=6)
    center_text(d, (0, 20, 512, 140), 'AREIA', F(96), '#FFB81F')
    center_text(d, (0, 120, 512, 240), 'QUENTE', F(96), '#FFFFFF')
    scr.save(os.path.join(TEX, 'arena', 'screen.png'))

    # lona listrada (guarda-sol / tenda)
    can = Image.new('RGB', (512, 64), '#FFFFFF')
    d = ImageDraw.Draw(can)
    for i in range(8):
        if i % 2 == 0: d.rectangle((i * 64, 0, i * 64 + 64, 64), fill='#FF3E3E')
    can.save(os.path.join(TEX, 'arena', 'canvas_stripes.png'))

    # areia PBR (ambientCG CC0) — campo e praia
    for src, dst in [('Ground080_2K-JPG/Ground080_2K-JPG', 'field'), ('Ground093C_2K-JPG/Ground093C_2K-JPG', 'beach')]:
        for m, o in [('Color', 'color'), ('NormalGL', 'normal'), ('Roughness', 'rough')]:
            im = Image.open(os.path.join(SRC, 'ambientcg', f'{src}_{m}.jpg'))
            size = 1024 if m != 'Color' else 2048
            im.resize((size, size), Image.LANCZOS).save(os.path.join(TEX, 'sand', f'{dst}_{o}.jpg'), quality=86)
    for h in ('kloofendal_48d_partly_cloudy_puresky', 'qwantani_sunset_puresky', 'qwantani_night_puresky'):
        shutil.copy(os.path.join(SRC, 'polyhaven', f'{h}.hdr'), os.path.join(TEX, 'sky', f'{h}.hdr'))
    print('textures ok')



# ---------------------------------------------------------------- céu: HDR -> JPG tonemapeado
def read_hdr(path):
    """Decodificador mínimo de Radiance .hdr (RGBE, RLE novo) com numpy."""
    import numpy as np
    data = open(path, 'rb').read()
    i = 0
    while True:
        j = data.index(b'\n', i)
        line = data[i:j]; i = j + 1
        if line.startswith(b'-Y') or line.startswith(b'+Y'):
            _, h, _, w = line.split(); h, w = int(h), int(w); break
    out = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        if data[i] == 2 and data[i + 1] == 2:
            i += 4
            for c in range(4):
                x = 0
                row = out[y, :, c]
                while x < w:
                    n = data[i]; i += 1
                    if n > 128:
                        n -= 128; row[x:x + n] = data[i]; i += 1
                    else:
                        row[x:x + n] = np.frombuffer(data, np.uint8, n, i); i += n
                    x += n
        else:
            out[y] = np.frombuffer(data, np.uint8, w * 4, i).reshape(w, 4); i += w * 4
    e = out[..., 3].astype(np.float32)
    f = np.where(out[..., 3] > 0, np.ldexp(1.0, (e - 136).astype(np.int32)), 0)
    return out[..., :3].astype(np.float32) * f[..., None]


def hdr_to_jpg():
    import numpy as np
    for h, exp, grade in (('kloofendal_48d_partly_cloudy_puresky', 0.55, (1, 1, 1)), ('qwantani_sunset_puresky', 0.55, (1.6, 0.88, 0.5)), ('qwantani_night_puresky', 0.07, (0.75, 0.9, 1.3))):
        rgb = read_hdr(os.path.join(TEX, 'sky', f'{h}.hdr')) * exp * np.array(grade, np.float32)
        a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14  # ACES (Narkowicz)
        t = np.clip((rgb * (a * rgb + b)) / (rgb * (c * rgb + d) + e), 0, 1) ** (1 / 2.2)
        Image.fromarray((t * 255).astype(np.uint8)).save(os.path.join(TEX, 'sky', f'{h}.jpg'), quality=88)
    print('sky jpg ok')


if __name__ == '__main__':
    main(); hdr_to_jpg()
