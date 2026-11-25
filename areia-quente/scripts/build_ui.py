"""Arte de UI e VFX do AREIA QUENTE.
- Flipbooks/sprites de efeito a partir dos pacotes Kenney Smoke Particles e Particle Pack (CC0).
- Logo, brasões dos times, bandeiras, medidor de calor (brasão azul -> dourado), marcadores,
  cartões, pegada (decal), ícones de controle (Kenney Input Prompts, CC0)."""
import os, json, math, shutil, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
KEN = os.path.join(ROOT, '.cache', 'src', 'kenney')
A = os.path.join(ROOT, 'public', 'assets')
for d in ('vfx', 'ui', 'ui/emblems', 'ui/flags', 'ui/input'):
    os.makedirs(os.path.join(A, d), exist_ok=True)
BUNGEE = os.path.join(ROOT, 'node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff')
TEAMS = json.load(open(os.path.join(ROOT, 'src', 'data', 'teams.json')))['teams']


def F(s):
    return ImageFont.truetype(BUNGEE, s)


# ---------------------------------------------------------------- VFX
def sheet(files, cols, cell=128, out=None, tint=None):
    rows = math.ceil(len(files) / cols)
    im = Image.new('RGBA', (cols * cell, rows * cell), (0, 0, 0, 0))
    for i, f in enumerate(files):
        s = Image.open(f).convert('RGBA')
        s.thumbnail((cell, cell), Image.LANCZOS)
        im.paste(s, ((i % cols) * cell + (cell - s.width) // 2, (i // cols) * cell + (cell - s.height) // 2), s)
    im.save(out)


def vfx():
    sp = os.path.join(KEN, 'smoke-particles', 'PNG')
    puff = sorted(os.listdir(os.path.join(sp, 'White puff')))
    sheet([os.path.join(sp, 'White puff', f) for f in puff], 5, 128, os.path.join(A, 'vfx', 'puff_5x5.png'))
    exp = sorted(os.listdir(os.path.join(sp, 'Explosion')))
    sheet([os.path.join(sp, 'Explosion', f) for f in exp], 3, 192, os.path.join(A, 'vfx', 'explosion_3x3.png'))
    fl = sorted(os.listdir(os.path.join(sp, 'Flash')))
    sheet([os.path.join(sp, 'Flash', f) for f in fl], math.ceil(math.sqrt(len(fl))), 128, os.path.join(A, 'vfx', 'flash_sheet.png'))
    pp = os.path.join(KEN, 'particle-pack', 'PNG (Transparent)')
    for name in ['spark_01', 'spark_04', 'spark_05', 'star_01', 'star_06', 'flame_02', 'flame_04', 'fire_01', 'trace_01', 'trace_04', 'magic_03',
                 'magic_05', 'circle_02', 'circle_05', 'light_01', 'light_03', 'dirt_02', 'dirt_03', 'smoke_04', 'twirl_02', 'scorch_02', 'muzzle_02']:
        im = Image.open(os.path.join(pp, name + '.png')).convert('RGBA')
        im.thumbnail((256, 256), Image.LANCZOS)
        im.save(os.path.join(A, 'vfx', name + '.png'))
    # pegada na areia (decal): sombra suave de um pé descalço
    fp = Image.new('L', (128, 256), 0)
    d = ImageDraw.Draw(fp)
    d.ellipse((30, 70, 98, 240), fill=140)      # sola
    d.ellipse((28, 40, 100, 140), fill=150)     # antepé
    for i, (x, y, r) in enumerate([(36, 22, 14), (56, 12, 12), (74, 14, 11), (89, 22, 10), (100, 34, 8)]):
        d.ellipse((x - r, y - r + 8, x + r, y + r + 8), fill=130)
    fp = fp.filter(ImageFilter.GaussianBlur(5))
    rgba = Image.merge('RGBA', [Image.new('L', fp.size, 60), Image.new('L', fp.size, 40), Image.new('L', fp.size, 20), fp])
    rgba.save(os.path.join(A, 'vfx', 'footprint.png'))
    # sombra de contato redonda
    sh = Image.new('L', (128, 128), 0)
    ImageDraw.Draw(sh).ellipse((8, 8, 120, 120), fill=200)
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    Image.merge('RGBA', [Image.new('L', sh.size, 0)] * 3 + [sh]).save(os.path.join(A, 'vfx', 'blob_shadow.png'))
    # confete (atlas 4x1 de papéis coloridos)
    cf = Image.new('RGBA', (256, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(cf)
    for i, c in enumerate(['#FFD21F', '#1D74C9', '#FF3E8A', '#0FC48F']):
        d.rectangle((i * 64 + 18, 10, i * 64 + 46, 54), fill=c)
    cf.save(os.path.join(A, 'vfx', 'confetti.png'))
    print('vfx ok')


# ---------------------------------------------------------------- bandeiras
def flags():
    W, H = 300, 200
    def save(im, code): im.save(os.path.join(A, 'ui', 'flags', code + '.png'))
    # Brasil
    im = Image.new('RGB', (W, H), '#009B3A'); d = ImageDraw.Draw(im)
    d.polygon([(W / 2, 18), (W - 22, H / 2), (W / 2, H - 18), (22, H / 2)], fill='#FEDF00')
    d.ellipse((W / 2 - 52, H / 2 - 52, W / 2 + 52, H / 2 + 52), fill='#002776')
    d.arc((W / 2 - 80, H / 2 - 30, W / 2 + 70, H / 2 + 120), 205, 300, fill='#FFFFFF', width=9)
    save(im, 'BRA')
    im = Image.new('RGB', (W, H), '#FFFFFF'); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, H / 3), fill='#74ACDF'); d.rectangle((0, 2 * H / 3, W, H), fill='#74ACDF')
    for i in range(16):
        a = i * math.pi / 8
        d.line((W / 2, H / 2, W / 2 + math.cos(a) * 26, H / 2 + math.sin(a) * 26), fill='#F6B40E', width=5)
    d.ellipse((W / 2 - 15, H / 2 - 15, W / 2 + 15, H / 2 + 15), fill='#F6B40E')
    save(im, 'ARG')
    im = Image.new('RGB', (W, H), '#FF0000'); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W * 0.4, H), fill='#006600')
    d.ellipse((W * 0.4 - 38, H / 2 - 38, W * 0.4 + 38, H / 2 + 38), outline='#FFCC00', width=9)
    d.rounded_rectangle((W * 0.4 - 20, H / 2 - 24, W * 0.4 + 20, H / 2 + 24), 10, fill='#FFFFFF', outline='#FF0000', width=5)
    save(im, 'POR')
    im = Image.new('RGB', (W, H), '#AA151B'); d = ImageDraw.Draw(im)
    d.rectangle((0, H / 4, W, 3 * H / 4), fill='#F1BF00'); d.rounded_rectangle((70, 75, 110, 128), 8, fill='#AA151B', outline='#C8A000', width=4)
    save(im, 'ESP')
    for code, cs in (('ITA', ['#009246', '#FFFFFF', '#CE2B37']), ('FRA', ['#0055A4', '#FFFFFF', '#EF4135'])):
        im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
        for i, c in enumerate(cs): d.rectangle((i * W / 3, 0, (i + 1) * W / 3, H), fill=c)
        save(im, code)
    im = Image.new('RGB', (W, H), '#FFFFFF'); d = ImageDraw.Draw(im)
    d.ellipse((W / 2 - 60, H / 2 - 60, W / 2 + 60, H / 2 + 60), fill='#BC002D'); save(im, 'JPN')
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    for i, c in enumerate(['#00853F', '#FDEF42', '#E31B23']): d.rectangle((i * W / 3, 0, (i + 1) * W / 3, H), fill=c)
    star(d, W / 2, H / 2, 30, '#00853F'); save(im, 'SEN')
    # Uruguai: 9 listras + sol
    im = Image.new('RGB', (W, H), '#FFFFFF'); d = ImageDraw.Draw(im)
    for i in range(1, 9, 2): d.rectangle((0, i * H / 9, W, (i + 1) * H / 9), fill='#0038A8')
    d.rectangle((0, 0, W * 0.38, H * 5 / 9), fill='#FFFFFF')
    cx, cy = W * 0.19, H * 2.5 / 9
    for i in range(16):
        a = i * math.pi / 8; d.line((cx, cy, cx + math.cos(a) * 34, cy + math.sin(a) * 34), fill='#FCD116', width=5)
    d.ellipse((cx - 18, cy - 18, cx + 18, cy + 18), fill='#FCD116'); save(im, 'URU')
    # Paraguai
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    for i, c in enumerate(['#D52B1E', '#FFFFFF', '#0038A8']): d.rectangle((0, i * H / 3, W, (i + 1) * H / 3), fill=c)
    d.ellipse((W / 2 - 24, H / 2 - 24, W / 2 + 24, H / 2 + 24), outline='#0038A8', width=4); star(d, W / 2, H / 2, 10, '#FCD116'); save(im, 'PAR')
    # México
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    for i, c in enumerate(['#006847', '#FFFFFF', '#CE1126']): d.rectangle((i * W / 3, 0, (i + 1) * W / 3, H), fill=c)
    d.ellipse((W / 2 - 26, H / 2 - 26, W / 2 + 26, H / 2 + 26), fill='#8C5A2B'); d.ellipse((W / 2 - 14, H / 2 - 20, W / 2 + 14, H / 2 + 6), fill='#5C3A1A')
    d.arc((W / 2 - 30, H / 2 - 10, W / 2 + 30, H / 2 + 34), 20, 160, fill='#006847', width=5); save(im, 'MEX')
    # Taiti
    im = Image.new('RGB', (W, H), '#FFFFFF'); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, H / 4), fill='#CE1126'); d.rectangle((0, 3 * H / 4, W, H), fill='#CE1126')
    d.ellipse((W / 2 - 30, H / 2 - 30, W / 2 + 30, H / 2 + 30), fill='#FFC400'); d.rectangle((W / 2 - 30, H / 2 + 4, W / 2 + 30, H / 2 + 30), fill='#1A6FB4')
    d.polygon([(W / 2 - 22, H / 2 + 2), (W / 2 + 22, H / 2 + 2), (W / 2 + 12, H / 2 + 12), (W / 2 - 12, H / 2 + 12)], fill='#CE1126'); save(im, 'TAH')
    # Irã
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    for i, c in enumerate(['#239F40', '#FFFFFF', '#DA0000']): d.rectangle((0, i * H / 3, W, (i + 1) * H / 3), fill=c)
    d.ellipse((W / 2 - 16, H / 2 - 22, W / 2 + 16, H / 2 + 22), outline='#DA0000', width=5); d.line((W / 2, H / 2 - 26, W / 2, H / 2 + 26), fill='#DA0000', width=5); save(im, 'IRN')
    # Suíça
    im = Image.new('RGB', (W, H), '#DA291C'); d = ImageDraw.Draw(im)
    d.rectangle((W / 2 - 15, H / 2 - 55, W / 2 + 15, H / 2 + 55), fill='#FFFFFF'); d.rectangle((W / 2 - 55, H / 2 - 15, W / 2 + 55, H / 2 + 15), fill='#FFFFFF'); save(im, 'SUI')
    # EUA
    im = Image.new('RGB', (W, H), '#FFFFFF'); d = ImageDraw.Draw(im)
    for i in range(0, 13, 2): d.rectangle((0, i * H / 13, W, (i + 1) * H / 13), fill='#B31942')
    d.rectangle((0, 0, W * 0.42, H * 7 / 13), fill='#0A3161')
    for r in range(5):
        for c in range(6): star(d, 12 + c * 20 + (r % 2) * 10, 10 + r * 19, 5, '#FFFFFF')
    save(im, 'USA')
    # Egito
    im = Image.new('RGB', (W, H)); d = ImageDraw.Draw(im)
    for i, c in enumerate(['#CE1126', '#FFFFFF', '#111111']): d.rectangle((0, i * H / 3, W, (i + 1) * H / 3), fill=c)
    d.polygon([(W / 2, H / 2 - 26), (W / 2 + 22, H / 2 + 20), (W / 2, H / 2 + 10), (W / 2 - 22, H / 2 + 20)], fill='#C09300'); save(im, 'EGY')


def star(d, cx, cy, r, col, rot=-math.pi / 2):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.42
        a = rot + i * math.pi / 5
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    d.polygon(pts, fill=col)


# ---------------------------------------------------------------- brasões
def emblem(t):
    S = 512
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c1, c2 = t['colors']
    shield = [(S * 0.14, S * 0.12), (S * 0.86, S * 0.12), (S * 0.86, S * 0.52), (S * 0.5, S * 0.94), (S * 0.14, S * 0.52)]
    d.polygon([(x + 10, y + 12) for x, y in shield], fill=(0, 0, 0, 90))
    d.polygon(shield, fill='#141414')
    inner = [(S * 0.18, S * 0.16), (S * 0.82, S * 0.16), (S * 0.82, S * 0.5), (S * 0.5, S * 0.88), (S * 0.18, S * 0.5)]
    d.polygon(inner, fill=c1)
    # faixa diagonal e onda
    mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).polygon(inner, fill=255)
    deco = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dd = ImageDraw.Draw(deco)
    dd.polygon([(S * 0.1, S * 0.62), (S * 0.9, S * 0.36), (S * 0.9, S * 0.5), (S * 0.1, S * 0.76)], fill=c2)
    for k in range(3):
        y0 = S * (0.74 + k * 0.05)
        dd.line([(S * 0.1 + i * 6, y0 + math.sin(i * 0.25) * 8) for i in range(140)], fill=(255, 255, 255, 120), width=6)
    im.paste(deco, (0, 0), ImageChops.multiply(mask, deco.split()[3]))
    d = ImageDraw.Draw(im)
    fo = F(120)
    txt = t['id']
    bb = d.textbbox((0, 0), txt, font=fo, stroke_width=10)
    d.text((S / 2 - (bb[2] - bb[0]) / 2 - bb[0], S * 0.3 - bb[1]), txt, font=fo, fill='#FFFFFF', stroke_width=10, stroke_fill='#141414')
    for i, x in enumerate((S * 0.36, S * 0.5, S * 0.64)):
        star(d, x, S * 0.08, 22 if i == 1 else 16, '#FFC21F')
    im.save(os.path.join(A, 'ui', 'emblems', t['id'] + '.png'))


# ---------------------------------------------------------------- crista do medidor (sol + ondas)
def crest(path, c_main, c_dark, c_light):
    W, H = 420, 230
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = 175, 125
    # raios em leque (asa)
    for i in range(9):
        a0 = math.radians(150 + i * 12); a1 = math.radians(150 + i * 12 + 8)
        r0, r1 = 60, 100 + i * 9
        d.polygon([(cx + math.cos(a0) * r0, cy + math.sin(a0) * r0), (cx + math.cos(a0) * r1, cy + math.sin(a0) * r1),
                   (cx + math.cos(a1) * (r1 + 10), cy + math.sin(a1) * (r1 + 10)), (cx + math.cos(a1) * r0, cy + math.sin(a1) * r0)],
                  fill=c_main if i % 2 else c_light, outline=c_dark)
    # cauda de onda
    pts = [(cx + 30, cy + 30)]
    for i in range(40):
        t = i / 39
        pts.append((cx + 30 + t * 200, cy + 30 - math.sin(t * math.pi) * 30 - t * 40))
    pts += [(cx + 230, cy - 4), (cx + 236, cy + 20), (cx + 40, cy + 58)]
    d.polygon(pts, fill=c_main, outline=c_dark)
    d.ellipse((cx - 62, cy - 62, cx + 62, cy + 62), fill=c_dark)
    d.ellipse((cx - 54, cy - 54, cx + 54, cy + 54), fill=c_main)
    d.ellipse((cx - 36, cy - 36, cx + 36, cy + 36), fill=c_light)
    im = im.filter(ImageFilter.SMOOTH)
    im.save(path)


def ui():
    crest(os.path.join(A, 'ui', 'crest_blue.png'), '#2F8CE6', '#0B2E66', '#9AD3FF')
    crest(os.path.join(A, 'ui', 'crest_gold.png'), '#FFB81F', '#7A3B00', '#FFF07A')
    # logo
    W, H = 1400, 520
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = 700, 250
    for i in range(18):
        a = i * math.pi / 9
        d.polygon([(cx + math.cos(a - 0.09) * 170, cy + math.sin(a - 0.09) * 170), (cx + math.cos(a) * 250, cy + math.sin(a) * 250),
                   (cx + math.cos(a + 0.09) * 170, cy + math.sin(a + 0.09) * 170)], fill='#FFB81F')
    d.ellipse((cx - 175, cy - 175, cx + 175, cy + 175), fill='#FF7A1A')
    d.ellipse((cx - 150, cy - 150, cx + 150, cy + 150), fill='#FFB81F')
    for k in range(4):
        y = cy + 40 + k * 26
        d.line([(cx - 170 + i * 5, y + math.sin(i * 0.2 + k) * 8) for i in range(70)], fill='#1D74C9', width=12)
    fo = F(190)
    for txt, y, col in (('AREIA', 40, '#FFFFFF'), ('QUENTE', 250, '#FFD21F')):
        bb = d.textbbox((0, 0), txt, font=fo, stroke_width=16)
        x = W / 2 - (bb[2] - bb[0]) / 2 - bb[0]
        d.text((x + 10, y + 14), txt, font=fo, fill=(0, 0, 0, 120), stroke_width=16, stroke_fill=(0, 0, 0, 120))
        d.text((x, y), txt, font=fo, fill=col, stroke_width=16, stroke_fill='#7A1E00')
    fo2 = F(46)
    sub = 'FUTEBOL DE PRAIA'
    bb = d.textbbox((0, 0), sub, font=fo2, stroke_width=6)
    d.rounded_rectangle((W / 2 - (bb[2] - bb[0]) / 2 - 30, 460, W / 2 + (bb[2] - bb[0]) / 2 + 30, 520), 30, fill='#1D74C9')
    d.text((W / 2 - (bb[2] - bb[0]) / 2 - bb[0], 462 - bb[1] + 4), sub, font=fo2, fill='#FFFFFF', stroke_width=0)
    im.save(os.path.join(A, 'ui', 'logo.png'))
    # marcador do jogador controlado (seta vermelha) e de P2 (azul)
    for name, col, dark in (('marker_p1', '#FF2A2A', '#7A0000'), ('marker_p2', '#2AA8FF', '#003F7A'), ('marker_cpu', '#FFD21F', '#7A5A00')):
        m = Image.new('RGBA', (128, 160), (0, 0, 0, 0)); d = ImageDraw.Draw(m)
        d.polygon([(14, 30), (114, 30), (64, 150)], fill=dark)
        d.polygon([(24, 36), (104, 36), (64, 136)], fill=col)
        d.polygon([(24, 36), (64, 36), (64, 136)], fill=(255, 255, 255, 60))
        m.save(os.path.join(A, 'ui', name + '.png'))
    # cartões
    for name, col in (('card_yellow', '#FFD21F'), ('card_red', '#E3182D')):
        c = Image.new('RGBA', (64, 88), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
        d.rounded_rectangle((6, 6, 58, 82), 6, fill=col, outline='#141414', width=4)
        c.save(os.path.join(A, 'ui', name + '.png'))
    # bola (ícone) a partir da textura
    # ícones de controle (Kenney Input Prompts)
    ip = os.path.join(KEN, 'input-prompts')
    keys = ['w', 'a', 's', 'd', 'j', 'k', 'l', 'i', 'e', 'shift', 'space', 'escape', 'enter', 'arrows']
    for k in keys:
        shutil.copy(os.path.join(ip, 'Keyboard & Mouse', 'Double', f'keyboard_{k}.png'), os.path.join(A, 'ui', 'input', f'key_{k}.png'))
    for b in ['button_a', 'button_b', 'button_x', 'button_y', 'button_menu', 'lt', 'rt', 'rb', 'stick_l']:
        shutil.copy(os.path.join(ip, 'Xbox Series', 'Double', f'xbox_{b}.png'), os.path.join(A, 'ui', 'input', f'pad_{b}.png'))
    shutil.copy(os.path.join(ip, 'Xbox Series', 'Double', 'controller_xboxseries.png'), os.path.join(A, 'ui', 'input', 'controller.png'))
    shutil.copy(os.path.join(ip, 'Keyboard & Mouse', 'Double', 'keyboard.png'), os.path.join(A, 'ui', 'input', 'keyboard.png'))
    # textura de areia para transições (wipe)
    sand = Image.open(os.path.join(A, 'textures', 'sand', 'field_color.jpg')).resize((512, 512))
    sand.save(os.path.join(A, 'ui', 'sand_wipe.jpg'), quality=80)
    # estrela de atributo
    s = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); star(ImageDraw.Draw(s), 32, 34, 30, '#FFC21F'); s.save(os.path.join(A, 'ui', 'star.png'))
    s = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); star(ImageDraw.Draw(s), 32, 34, 30, (255, 255, 255, 60)); s.save(os.path.join(A, 'ui', 'star_empty.png'))
    print('ui ok')


if __name__ == '__main__':
    vfx(); flags()
    for t in TEAMS: emblem(t)
    ui()
