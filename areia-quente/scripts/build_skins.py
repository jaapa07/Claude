"""Pinta as texturas de uniforme (public/assets/textures/kits/*.png) para o athlete.glb.
Para cada pixel do novo UV, interpola a posição 3D do triângulo e avalia o desenho do uniforme
(camisa com padrão, número/nome nas costas, bermuda, pele, tornozeleira). As faces da cabeça
amostram o rosto/cabelo originais das skins do Kenney (CC0) com recolorização de pele e cabelo."""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
KEN = os.path.join(ROOT, '.cache', 'src', 'kenney')
OUT = os.path.join(ROOT, 'public', 'assets', 'textures', 'kits')
os.makedirs(OUT, exist_ok=True)
SIZE = 1024
TRIS = json.load(open(os.path.join(ROOT, '.cache', 'build', 'athlete_uv.json')))['tris']
TEAMS = json.load(open(os.path.join(ROOT, 'src', 'data', 'teams.json')))

HEAD_FILES = {
    'skaterMaleA': 'animated-characters-protagonists/Skins/skaterMaleA.png',
    'criminalMaleA': 'animated-characters-protagonists/Skins/criminalMaleA.png',
    'humanMaleA': 'animated-characters-retro/Skins/humanMaleA.png',
    'survivorMaleB': 'animated-characters-survivors/Skins/survivorMaleB.png',
    'skaterFemaleA': 'animated-characters-protagonists/Skins/skaterFemaleA.png',
    'humanFemaleA': 'animated-characters-retro/Skins/humanFemaleA.png',
    'survivorFemaleA': 'animated-characters-survivors/Skins/survivorFemaleA.png',
}
SKIN_TONES = ['#F4B591', '#E39A70', '#C8804F', '#A5653C', '#7E4A2A', '#5C3420']


def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def font(size):
    for f in [os.path.join(ROOT, 'node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff'),
              '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf']:
        try:
            return ImageFont.truetype(f, size)
        except Exception:
            pass
    return ImageFont.load_default()


def text_mask(txt, w=512, h=256, size=200):
    im = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(im)
    f = font(size)
    bb = d.textbbox((0, 0), txt, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    if tw > w * 0.96:
        f = font(int(size * w * 0.96 / tw)); bb = d.textbbox((0, 0), txt, font=f); tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text(((w - tw) / 2 - bb[0], (h - th) / 2 - bb[1]), txt, font=f, fill=255)
    return np.asarray(im, dtype=np.float32) / 255.0


def sample_mask(mask, u, v):
    h, w = mask.shape
    inside = (u >= 0) & (u < 1) & (v >= 0) & (v < 1)
    xi = np.clip((u * w).astype(int), 0, w - 1); yi = np.clip((v * h).astype(int), 0, h - 1)
    return np.where(inside, mask[yi, xi], 0.0)


# ------------------------------------------------------------------ rasterização
class Raster:
    """Pré-computa, para cada pixel coberto, o triângulo, baricêntricas, posição 3D e UV original."""

    def __init__(self):
        S = SIZE
        self.tri = np.full((S, S), -1, np.int32)
        self.P = np.zeros((S, S, 3), np.float32)
        self.UV0 = np.zeros((S, S, 2), np.float32)
        self.N = np.zeros((S, S, 3), np.float32)
        self.part = np.zeros((S, S), np.int8)
        for ti, t in enumerate(TRIS):
            uv = np.array(t['uv']) * [S, S]; uv[:, 1] = S - uv[:, 1]
            x0, y0 = np.floor(uv.min(0)).astype(int) - 1; x1, y1 = np.ceil(uv.max(0)).astype(int) + 1
            x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, S - 1), min(y1, S - 1)
            if x1 < x0 or y1 < y0: continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            (ax, ay), (bx, by), (cx, cy) = uv
            den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
            if abs(den) < 1e-9: continue
            l1 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / den
            l2 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / den
            l3 = 1 - l1 - l2
            eps = -0.02 * 3 / max(1.0, abs(den) ** 0.5)  # pequeno sangramento para cobrir bordas
            m = (l1 >= eps) & (l2 >= eps) & (l3 >= eps)
            if not m.any(): continue
            yy, xx = np.nonzero(m); yy = yy + y0; xx = xx + x0
            L = np.stack([l1[m], l2[m], l3[m]], 1)
            p = np.array(t['p']); u0 = np.array(t['uv0'])
            self.tri[yy, xx] = ti
            self.P[yy, xx] = L @ p
            self.UV0[yy, xx] = L @ u0
            self.N[yy, xx] = t['n']
            b = max(set(t['b']), key=t['b'].count)
            self.part[yy, xx] = PART.get(b, PART_DEFAULT(b))
        self.cov = self.tri >= 0


HEAD, TORSO, UPARM, FOREARM, HAND, HIPS, THIGH, SHIN, FOOT = range(1, 10)
PART = {'Head': HEAD, 'Neck': HEAD, 'Spine': TORSO, 'Chest': TORSO, 'UpperChest': TORSO,
        'LeftShoulder': TORSO, 'RightShoulder': TORSO, 'LeftArm': UPARM, 'RightArm': UPARM,
        'LeftForeArm': FOREARM, 'RightForeArm': FOREARM, 'Hips': HIPS, 'LeftUpLeg': THIGH, 'RightUpLeg': THIGH,
        'LeftLeg': SHIN, 'RightLeg': SHIN, 'LeftFoot': FOOT, 'RightFoot': FOOT, 'LeftToes': FOOT, 'RightToes': FOOT}
PART_DEFAULT = lambda b: HAND if 'Hand' in b else TORSO

R = None
HEADCACHE = {}


def head_source(name):
    if name in HEADCACHE: return HEADCACHE[name]
    im = np.asarray(Image.open(os.path.join(KEN, HEAD_FILES[name])).convert('RGB'), np.float32)
    h, w, _ = im.shape
    m = R.part == HEAD
    uv = R.UV0[m]
    px = im[np.clip(((1 - uv[:, 1]) * h).astype(int), 0, h - 1), np.clip((uv[:, 0] * w).astype(int), 0, w - 1)]
    # cor de pele: tom mais comum entre pixels quentes e claros; cabelo: mais comum entre os escuros
    q = (px // 12).astype(int)
    keys, counts = np.unique(q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2], return_counts=True)
    order = np.argsort(-counts)
    cols = [np.array([k // 10000, (k // 100) % 100, k % 100]) * 12 + 6 for k in keys[order[:12]]]
    lum = lambda c: c @ [0.3, 0.59, 0.11]
    skin = cols[0]
    # mais frequente com aparência de pele
    for c in cols:
        if c[0] > 150 and c[0] > c[2] + 40 and lum(c) > 120: skin = c; break
    hair = None
    for c in cols:
        if lum(c) < 110 and np.abs(c - skin).sum() > 120: hair = c; break
    HEADCACHE[name] = (im, skin.astype(np.float32), None if hair is None else hair.astype(np.float32))
    return HEADCACHE[name]


def paint(kit, player, role='player', head='skaterMaleA', skin_i=1, hair_c='#2A1B12'):
    """kit: dict shirt/shirt2/pattern/shorts/trim/num. role: player|gk|ref|dancer."""
    S = SIZE
    img = np.zeros((S, S, 3), np.float32)
    P = R.P; x, y, z = P[..., 0], P[..., 1], P[..., 2]
    ax = np.abs(x)
    N = R.N
    part = R.part
    skin = hexc(SKIN_TONES[skin_i])
    shirt = hexc(kit['shirt']); shirt2 = hexc(kit['shirt2']); trim = hexc(kit['trim']); shorts = hexc(kit['shorts']); numc = hexc(kit['num'])
    front = y < -0.02

    # ---- camisa (tronco + mangas)
    col = np.broadcast_to(shirt, (S, S, 3)).copy()
    pat = kit.get('pattern')
    sel = np.zeros((S, S), bool)
    if pat == 'sash': sel = np.abs((-x) * 0.85 + (z - 2.0)) < 0.13
    elif pat == 'stripes': sel = (np.floor((x + 4) / 0.15) % 2) == 0
    elif pat == 'hoop': sel = (z > 1.86) & (z < 2.08)
    elif pat == 'chevron': sel = front & (np.abs(z - (2.36 - ax * 0.9)) < 0.07)
    elif pat == 'shoulders': sel = (z > 2.3) | (ax > 0.42)
    elif pat == 'sleeves': sel = ax > 0.42
    elif pat == 'side': sel = (ax > 0.27) & (ax < 0.42)
    elif pat == 'sun': sel = front & ((x ** 2 + (z - 1.98) ** 2) < 0.16 ** 2)
    elif pat == 'tricolor':
        sel = (ax > 0.22) & (ax < 0.26)
        col[(ax >= 0.26) & (ax < 0.30) & (ax < 0.42)] = hexc('#FDEF42')
        col[(ax >= 0.30) & (ax < 0.34)] = hexc('#E31B23')
    col[sel] = shirt2
    # gola em V e barra
    collar = (z > 2.5) & (ax < 0.24) & (np.abs(z - (2.62 - ax * 0.6)) < 0.045)
    col[collar] = trim
    col[(z > 1.36) & (z < 1.42)] = trim * 0.85 + col[(z > 1.36) & (z < 1.42)] * 0.15

    # número e nome nas costas, número pequeno no peito, emblema
    num = str(player['number'])
    nmask = text_mask(num, 512, 300, 260)
    back = y > 0.02
    u = 0.5 - x / 0.62; v = (2.34 - z) / 0.62
    m = sample_mask(nmask, u, v) * back
    name_mask = text_mask(player['short'], 1024, 160, 120)
    m2 = sample_mask(name_mask, 0.5 - x / 0.58, (2.5 - z) / 0.09) * back
    uf = 0.5 + (x + 0.17) / 0.2; vf = (2.3 - z) / 0.12
    m3 = sample_mask(text_mask(num, 256, 160, 150), uf, vf) * front
    em = front & (((x - 0.17) ** 2 + (z - 2.2) ** 2) < 0.075 ** 2)
    emr = front & (((x - 0.17) ** 2 + (z - 2.2) ** 2) < 0.06 ** 2)
    mm = np.clip(m + m2 + m3, 0, 1)[..., None]
    col = col * (1 - mm) + numc * mm
    col[em] = trim; col[emr] = shirt2 if pat != 'sash' else numc

    # sombreamento suave de tecido
    shade = 1.0 - np.clip((2.4 - z) * 0.05, 0, 0.08) + (N[..., 2] * 0.03)
    col = col * shade[..., None]

    long_sleeve = role in ('gk', 'ref_long')
    sleeve_end = 1.33 if long_sleeve else 0.62
    is_torso = part == TORSO
    is_arm = (part == UPARM) | (part == FOREARM)
    shirt_area = is_torso | (is_arm & (ax < sleeve_end)) | ((part == HIPS) & (z > 1.4))
    hem = is_arm & (ax > sleeve_end - 0.05) & (ax < sleeve_end)

    # ---- bermuda
    sh = np.broadcast_to(shorts, (S, S, 3)).copy()
    sh[(ax > 0.33) & (ax < 0.37) & (z < 1.4)] = trim
    sh[(z > 1.33) & (z < 1.4)] = shorts * 0.8
    sh *= (1 - np.clip((1.4 - z) * 0.06, 0, 0.06))[..., None]
    shorts_end = 0.9
    shorts_area = ((part == HIPS) & (z <= 1.4)) | ((part == THIGH) & (z > shorts_end))
    shorts_hem = shorts_area & (z < shorts_end + 0.05) & (part == THIGH)

    # ---- pele (padrão para tudo)
    sk = np.broadcast_to(skin, (S, S, 3)).copy()
    sk *= (0.93 + 0.07 * np.clip(N[..., 2] * 0.5 + 0.5, 0, 1))[..., None]
    img[:] = sk
    # sola do pé mais escura e linha dos dedos
    sole = (part == FOOT) & (N[..., 2] < -0.5)
    img[sole] = skin * 0.72
    if player.get('ankle'):
        tape = ((part == SHIN) | (part == FOOT)) & (z > 0.17) & (z < 0.3)
        img[tape] = trim
    img[shirt_area] = col[shirt_area]
    img[hem] = trim
    img[shorts_area] = sh[shorts_area]
    img[shorts_hem] = trim
    if role == 'gk':
        glove = part == HAND
        img[glove] = hexc('#F2F2F2') * 0.9
        cuff = glove & (ax < 1.42)
        img[cuff] = shirt2
    if role == 'ref':
        pocket = front & is_torso & (((x + 0.16) ** 2 + (z - 2.2) ** 2) < 0.07 ** 2)
        img[pocket] = trim
    if role == 'dancer':
        top = is_torso & (z > 1.95) & (z < 2.35)
        img[is_torso | (is_arm & (ax < sleeve_end)) | ((part == HIPS) & (z > 1.4))] = sk[is_torso | (is_arm & (ax < sleeve_end)) | ((part == HIPS) & (z > 1.4))]
        img[top] = shirt[None, :] * (1 - 0.1 * (np.abs(x[top]) > 0.15))[:, None]
        bottoms = ((part == HIPS) & (z <= 1.42)) | ((part == THIGH) & (z > 1.12))
        img[bottoms] = shirt2
        img[(part == THIGH) & (z > 1.12)] = sk[(part == THIGH) & (z > 1.12)]
        img[(part == HIPS) & (z <= 1.42)] = shirt2
        img[(part == FOOT)] = hexc(kit['trim'])

    # ---- cabeça: amostra o rosto original e recolore pele/cabelo
    hm = part == HEAD
    src, s_skin, s_hair = head_source(head)
    h, w, _ = src.shape
    uv = R.UV0[hm]
    px = src[np.clip(((1 - uv[:, 1]) * h).astype(int), 0, h - 1), np.clip((uv[:, 0] * w).astype(int), 0, w - 1)].copy()
    ds = np.abs(px - s_skin).sum(1)
    skinish = ds < 140
    px[skinish] = px[skinish] * (skin / s_skin)
    if s_hair is not None and hair_c:
        dh = np.abs(px - s_hair).sum(1)
        hairish = (dh < 90) & ~skinish
        px[hairish] = px[hairish] * (hexc(hair_c) / np.maximum(s_hair, 8))
    img[hm] = px
    # pescoço do corpo (Neck usa a mesma região) já incluso.

    img = np.clip(img, 0, 255).astype(np.uint8)
    out = Image.fromarray(img, 'RGB')
    # dilata as ilhas para evitar costuras
    cov = Image.fromarray((R.cov * 255).astype(np.uint8), 'L')
    for _ in range(6):
        grown = out.filter(ImageFilter.MaxFilter(3))
        cov2 = cov.filter(ImageFilter.MaxFilter(3))
        newm = Image.fromarray(((np.asarray(cov2) > 0) & (np.asarray(cov) == 0)).astype(np.uint8) * 255)
        out.paste(grown, (0, 0), newm)
        cov = cov2
    return out


def save(im, name):
    im = im.resize((768, 768), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), quality=92, method=6)


def main():
    global R
    R = Raster()
    hairs = TEAMS['hairColors']
    only = sys.argv[1:] or None
    for t in TEAMS['teams']:
        if only and t['id'] not in only: continue
        for kitname in ('home', 'away'):
            for i, p in enumerate(t['players']):
                is_gk = p['pos'] == 'GOL'
                kit = t['gk'] if is_gk else t[kitname]
                if is_gk and kitname == 'away':
                    kit = dict(kit, shirt=kit['shirt2'], shirt2=kit['shirt'], num='#FFFFFF')
                im = paint(kit, p, 'gk' if is_gk else 'player', p['head'], p['skin'], hairs[p['hair']])
                save(im, f"{t['id']}_{kitname}_{i}")
        print('kits', t['id'])
    if not only:
        ref = dict(shirt='#151515', shirt2='#FF7A00', pattern='sleeves', shorts='#151515', trim='#FF7A00', num='#FF7A00')
        save(paint(ref, {'number': 0, 'short': 'ÁRBITRO'}, 'ref', 'criminalMaleA', 1, '#151515'), 'referee_0')
        save(paint(ref, {'number': 0, 'short': 'ÁRBITRO'}, 'ref', 'survivorMaleB', 3, '#2A1B12'), 'referee_1')
        dancers = [('#FF3E8A', '#FFD21F', 'skaterFemaleA', 2, '#2A1B12'), ('#19C3C9', '#FF7A00', 'survivorFemaleA', 0, '#B8925A'),
                   ('#FFD21F', '#0B9B4A', 'survivorFemaleA', 4, '#140D09'), ('#9A4DFF', '#FF3E8A', 'skaterFemaleA', 1, '#B5402A')]
        for i, (a, b, hd, s, hc) in enumerate(dancers):
            kit = dict(shirt=a, shirt2=b, pattern=None, shorts=b, trim=a, num=a)
            save(paint(kit, {'number': '', 'short': ''}, 'dancer', hd, s, hc), f'dancer_{i}')
        print('ref + dancers')


if __name__ == '__main__':
    main()
