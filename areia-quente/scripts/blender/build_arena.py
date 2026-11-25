"""Monta as 3 arenas do AREIA QUENTE no Blender e exporta public/assets/models/arenas/<id>.glb
+ <id>_seats.json (posições de assento da torcida, em coordenadas three.js).
Unidades: metros. Campo 36 x 27 m centrado na origem, comprimento no eixo X, lado da câmera em -Y.
Objetos com nome especial são tratados em runtime: FIELD_SAND, BEACH_SAND, WATER, NET_*, FLAG_*,
FLOODLIGHT_* (empties apontando para o campo), SCREEN, DUNE*."""
import bpy, bmesh, os, sys, json, math, random
from mathutils import Vector, Matrix, Euler

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KEN = os.path.join(ROOT, '.cache', 'src', 'kenney')
TEX = os.path.join(ROOT, 'public', 'assets', 'textures', 'arena')
OUT = os.path.join(ROOT, 'public', 'assets', 'models', 'arenas')
os.makedirs(OUT, exist_ok=True)

HL, HW = 18.0, 13.5  # meia-comprimento / meia-largura do campo
GOAL_W, GOAL_H, GOAL_D = 5.5, 2.2, 1.6


# ------------------------------------------------------------ utilidades
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)


MATS = {}


def mat(name, color=(0.8, 0.8, 0.8), rough=0.7, metal=0.0, img=None, emit=None, alpha=False, emit_strength=1.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name)
    nt = m.node_tree if m.node_tree else None
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if img:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(os.path.join(TEX, img))
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if alpha:
            nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
            m.blend_method = 'CLIP' if hasattr(m, 'blend_method') else None
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = emit_strength
    MATS[name] = m
    return m


def obj_from_bm(name, bm, material=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    if material: me.materials.append(material)
    return o


def box(name, size, loc, material, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    uvl = bm.loops.layers.uv.new()
    for f in bm.faces:
        n = f.normal
        for l in f.loops:
            co = l.vert.co
            if abs(n.z) > 0.5: l[uvl].uv = (co.x / 2 + 0.5, co.y / 2 + 0.5)
            elif abs(n.x) > 0.5: l[uvl].uv = (co.y / 2 + 0.5, co.z / 2 + 0.5)
            else: l[uvl].uv = (co.x / 2 + 0.5, co.z / 2 + 0.5)
    o = obj_from_bm(name, bm, material)
    o.location = loc; o.rotation_euler = rot
    return o


def cyl(name, r, h, loc, material, seg=10, rot=(0, 0, 0), r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    o = obj_from_bm(name, bm, material)
    o.location = loc; o.rotation_euler = rot
    return o


def plane(name, sx, sy, loc, material, uvscale=1.0, cuts=0):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=cuts + 1, y_segments=cuts + 1, size=0.5)
    bmesh.ops.scale(bm, vec=Vector((sx, sy, 1)), verts=bm.verts)
    uvl = bm.loops.layers.uv.new()
    for f in bm.faces:
        for l in f.loops:
            l[uvl].uv = (l.vert.co.x / uvscale, l.vert.co.y / uvscale)
    o = obj_from_bm(name, bm, material)
    o.location = loc
    return o


IMPORTED = {}


def kenney(path, target_h=None, scale=None):
    """Importa um glb do Kenney uma vez e devolve uma função que cria cópias."""
    full = os.path.join(KEN, path)
    if full not in IMPORTED:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=full)
        new = [o for o in bpy.data.objects if o not in before]
        meshes = [o for o in new if o.type == 'MESH']
        # aplica transformações e junta numa malha única de referência
        for o in new:
            o.select_set(False)
        dg = bpy.context.evaluated_depsgraph_get()
        bm = bmesh.new()
        mats = []
        for o in meshes:
            me = o.evaluated_get(dg).to_mesh()
            me.transform(o.matrix_world)
            off = len(mats)
            for ms in o.data.materials: mats.append(ms)
            tmp = bmesh.new(); tmp.from_mesh(me)
            for f in tmp.faces: f.material_index += off
            tmpme = bpy.data.meshes.new('tmp'); tmp.to_mesh(tmpme); tmp.free()
            bm.from_mesh(tmpme); bpy.data.meshes.remove(tmpme)
            o.evaluated_get(dg).to_mesh_clear()
        ref = bpy.data.meshes.new(os.path.basename(path))
        bm.to_mesh(ref); bm.free()
        for ms in mats: ref.materials.append(ms)
        for o in new: bpy.data.objects.remove(o)
        zs = [v.co.z for v in ref.vertices]
        IMPORTED[full] = (ref, max(zs) - min(zs))
    ref, h = IMPORTED[full]
    s = scale if scale else (target_h / h if target_h else 1.0)

    def place(name, loc, rotz=0.0, extra_scale=1.0):
        o = bpy.data.objects.new(name, ref)
        bpy.context.scene.collection.objects.link(o)
        o.location = loc; o.rotation_euler = (0, 0, rotz); o.scale = (s * extra_scale,) * 3
        return o
    return place


def join(objs, name):
    objs = [o for o in objs if o]
    if not objs: return None
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        if o.data.users > 1: o.data = o.data.copy()
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    return o


# ------------------------------------------------------------ elementos
def field():
    plane('FIELD_SAND', 2 * HL + 6, 2 * HW + 6, (0, 0, 0.0), mat('field_sand', (0.86, 0.74, 0.52)), uvscale=4.0)
    plane('BEACH_SAND', 600, 600, (0, 0, -0.03), mat('beach_sand', (0.9, 0.8, 0.6)), uvscale=6.0)
    tape = mat('tape', (0.12, 0.43, 0.82), img='tape.png', rough=0.8)
    t = 0.12
    parts = [box('t1', (2 * HL + t, t, 0.02), (0, HW, 0.01), tape), box('t2', (2 * HL + t, t, 0.02), (0, -HW, 0.01), tape),
             box('t3', (t, 2 * HW, 0.02), (HL, 0, 0.01), tape), box('t4', (t, 2 * HW, 0.02), (-HL, 0, 0.01), tape)]
    join(parts, 'TAPE_LINES')


def goal(side):
    sx = 1 if side > 0 else -1
    x = sx * HL
    yel = mat('goal_yellow', (1.0, 0.78, 0.05), rough=0.35, metal=0.2)
    p = []
    r = 0.07
    for y in (-GOAL_W / 2, GOAL_W / 2):
        p.append(cyl('post', r, GOAL_H, (x, y, GOAL_H / 2), yel))
        p.append(cyl('back', 0.035, GOAL_H, (x + sx * GOAL_D, y, GOAL_H / 2), yel, seg=6))
        p.append(cyl('topside', 0.035, GOAL_D, (x + sx * GOAL_D / 2, y, GOAL_H), yel, seg=6, rot=(0, math.pi / 2, 0)))
        p.append(cyl('botside', 0.035, GOAL_D, (x + sx * GOAL_D / 2, y, 0.03), yel, seg=6, rot=(0, math.pi / 2, 0)))
    p.append(cyl('bar', r, GOAL_W + 2 * r, (x, 0, GOAL_H), yel, rot=(math.pi / 2, 0, 0)))
    p.append(cyl('bbar', 0.035, GOAL_W, (x + sx * GOAL_D, 0, GOAL_H), yel, seg=6, rot=(math.pi / 2, 0, 0)))
    p.append(cyl('gbar', 0.035, GOAL_W, (x + sx * GOAL_D, 0, 0.03), yel, seg=6, rot=(math.pi / 2, 0, 0)))
    # caixa de areia/placa atrás do gol (base)
    join(p, f'GOAL_{"R" if sx > 0 else "L"}')
    netm = mat('net', (1, 1, 1), img='net.png', alpha=True, rough=0.9)
    # rede: fundo, topo e laterais em malhas subdivididas (deformadas em runtime)
    n = []
    o = plane('nb', GOAL_H, GOAL_W, (x + sx * GOAL_D, 0, GOAL_H / 2), netm, uvscale=0.25, cuts=10)
    o.rotation_euler = (0, math.pi / 2, 0); n.append(o)
    o = plane('nt', GOAL_D, GOAL_W, (x + sx * GOAL_D / 2, 0, GOAL_H), netm, uvscale=0.25, cuts=6); n.append(o)
    for y in (-GOAL_W / 2, GOAL_W / 2):
        o = plane('ns', GOAL_D, GOAL_H, (x + sx * GOAL_D / 2, y, GOAL_H / 2), netm, uvscale=0.25, cuts=6)
        o.rotation_euler = (math.pi / 2, 0, 0); n.append(o)
    for o in n:
        bpy.context.view_layer.update()
    join(n, f'NET_{"R" if sx > 0 else "L"}')


def flags():
    pole = mat('flag_pole', (0.95, 0.95, 0.95), rough=0.4)
    red = mat('flag_red', (0.9, 0.1, 0.08), rough=0.8)
    yel = mat('flag_yellow', (1.0, 0.82, 0.05), rough=0.8)
    spots = [((HL, HW), red), ((HL, -HW), red), ((-HL, HW), red), ((-HL, -HW), red), ((0, HW + 0.6), red), ((0, -HW - 0.6), red),
             ((HL - 9, HW + 0.6), yel), ((HL - 9, -HW - 0.6), yel), ((-HL + 9, HW + 0.6), yel), ((-HL + 9, -HW - 0.6), yel)]
    for i, ((x, y), m) in enumerate(spots):
        cyl(f'FLAGPOLE_{i}', 0.025, 1.5, (x, y, 0.75), pole, seg=6)
        bm = bmesh.new()
        v = [bm.verts.new(c) for c in [(0, 0, 0), (0.45, 0, -0.16), (0, 0, -0.32)]]
        bm.faces.new(v)
        uvl = bm.loops.layers.uv.new()
        o = obj_from_bm(f'FLAG_{i}', bm, m)
        o.location = (x, y, 1.5)


def boards(neon=False):
    atlas = mat('boards_neon' if neon else 'boards', (1, 1, 1), img='boards_neon.png' if neon else 'boards.png', rough=0.5,
                emit=(1, 1, 1) if neon else None, emit_strength=0.0)
    if neon:
        b = atlas.node_tree.nodes.get('Principled BSDF'); t = [n for n in atlas.node_tree.nodes if n.type == 'TEX_IMAGE'][0]
        atlas.node_tree.links.new(t.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 1.2
    back = mat('board_back', (0.15, 0.15, 0.18), rough=0.8)
    objs = []
    k = 0
    L, H = 4.0, 0.9

    def one(cx, cy, rotz):
        nonlocal k
        row = k % 8; k += 1
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=Vector((L, 0.12, H)), verts=bm.verts)
        uvl = bm.loops.layers.uv.new()
        for f in bm.faces:
            if f.normal.y < -0.5:
                f.material_index = 0
                for l in f.loops:
                    u = (l.vert.co.x / L) + 0.5; v = (l.vert.co.z / H) + 0.5
                    l[uvl].uv = (u, 1 - (row + 1 - v) / 8.0)
            else:
                f.material_index = 1
                for l in f.loops: l[uvl].uv = (0, 0)
        o = obj_from_bm('board', bm)
        o.data.materials.append(atlas); o.data.materials.append(back)
        o.location = (cx, cy, H / 2 + 0.02); o.rotation_euler = (math.radians(-8) if rotz == 0 else 0, 0, rotz)
        objs.append(o)
    # lado de lá (y+) e lado da câmera (y-)
    for i in range(-5, 6):
        one(i * L * 1.02, HW + 3.0, 0)
        one(i * L * 1.02, -HW - 3.2, math.pi)
    for side in (-1, 1):
        for j in range(-2, 3):
            one(side * (HL + 3.3), j * L * 1.02, side * -math.pi / 2)
    join(objs, 'AD_BOARDS')


def stands(seats_out, seat_color_mat):
    """Arquibancadas temporárias de praia: lado de lá e atrás dos dois gols."""
    steel = mat('steel', (0.55, 0.57, 0.6), rough=0.4, metal=0.6)
    concrete = mat('stand_step', (0.82, 0.8, 0.76), rough=0.9)
    steps, frames = [], []
    rows, depth, rise = 12, 0.85, 0.48

    def block(cx, cy, length, rotz, start_off):
        c, s = math.cos(rotz), math.sin(rotz)
        for r in range(rows):
            d = start_off + r * depth
            z = 0.6 + r * rise
            # degrau + assento colorido
            lx, ly = 0.0, d
            wx, wy = cx + lx * c - ly * s, cy + lx * s + ly * c
            o = box('step', (length, depth, 0.12), (wx, wy, z), concrete, rot=(0, 0, rotz)); steps.append(o)
            ly2 = d - depth * 0.2
            o = box('seat', (length, 0.3, 0.08), (cx - ly2 * s, cy + ly2 * c, z + 0.1), seat_color_mat, rot=(0, 0, rotz)); steps.append(o)
            # assentos da torcida
            n = int(length / 0.62)
            for i in range(n):
                t = -length / 2 + (i + 0.5) * length / n
                px, py = cx + t * c - (d - 0.05) * s, cy + t * s + (d - 0.05) * c
                # three.js: (x, z_up, -y); face voltada para o campo
                seats_out.append([round(px, 2), round(z + 0.14, 2), round(-py, 2), round(rotz, 3)])
        # estrutura metálica
        for i in range(0, int(length / 3) + 1):
            t = -length / 2 + i * 3
            for r in range(0, rows, 3):
                d = start_off + r * depth
                h = 0.6 + r * rise
                frames.append(cyl('col', 0.06, h, (cx + t * c - d * s, cy + t * s + d * c, h / 2), steel, seg=6))
        backd = start_off + rows * depth
        h = 0.6 + rows * rise + 1.2
        o = box('backwall', (length, 0.15, h), (cx - backd * s, cy + backd * c, h / 2), steel, rot=(0, 0, rotz)); frames.append(o)
        return backd, h

    seat_mat = seat_color_mat
    # lado de lá: blocos ao longo de y+ ; rot=0 => profundidade cresce em +y
    bd, bh = block(0, HW + 5.0, 2 * HL + 10, 0.0, 0.0)
    # atrás dos gols: rotacionado 90°
    block(HL + 5.2, 0, 2 * HW + 2, -math.pi / 2, 0.0)
    block(-HL - 5.2, 0, 2 * HW + 2, math.pi / 2, 0.0)
    join(steps, 'STANDS'); join(frames, 'STAND_FRAMES')
    # bandeirão no topo do lado de lá
    ban = mat('banner', (1, 1, 1), img='banner.png', rough=0.7)
    o = plane('BANNER', 2 * HL + 6, 2.2, (0, HW + 5.0 + bd - 0.2, bh + 1.0), ban)
    o.rotation_euler = (math.pi / 2, 0, math.pi)
    o.data.uv_layers[0].data.foreach_set('uv', [c for l in o.data.loops for c in ((o.data.vertices[l.vertex_index].co.x / (2 * HL + 6) + 0.5), (o.data.vertices[l.vertex_index].co.y / 2.2 + 0.5))])
    # mastros com bandeiras no topo
    poles, fl = [], []
    colors = [(0.0, 0.6, 0.3), (1.0, 0.82, 0.1), (0.1, 0.35, 0.8), (1, 0.4, 0.1), (0.9, 0.1, 0.4)]
    for i in range(9):
        x = -HL - 2 + i * (2 * HL + 4) / 8
        poles.append(cyl('mast', 0.05, 5, (x, HW + 5 + bd, bh + 2.5), steel, seg=6))
        o = plane(f'FLAG_TOP_{i}', 1.6, 1.0, (x + 0.8, HW + 5 + bd, bh + 4.4), mat(f'topflag{i % 5}', colors[i % 5], rough=0.8))
        o.rotation_euler = (math.pi / 2, 0, 0)
    join(poles, 'MASTS')
    return bd, bh


def floodlights(bd, bh):
    steel = mat('steel', (0.55, 0.57, 0.6))
    panel = mat('flood_panel', (1, 1, 0.95), emit=(1, 0.97, 0.9), emit_strength=0.0)
    objs = []
    for i, (x, y) in enumerate([(-HL - 9, HW + 12), (HL + 9, HW + 12), (-HL - 9, -HW - 9), (HL + 9, -HW - 9)]):
        h = 22
        objs.append(cyl('tower', 0.35, h, (x, y, h / 2), steel, seg=8, r2=0.2))
        p = box(f'FLOODPANEL_{i}', (4.0, 0.4, 2.4), (x, y, h + 1), panel)
        ang = math.atan2(-y, -x)
        p.rotation_euler = (math.radians(-25), 0, ang + math.pi / 2)
        e = bpy.data.objects.new(f'FLOODLIGHT_{i}', None)
        bpy.context.scene.collection.objects.link(e)
        e.location = (x, y, h + 1)
    join(objs, 'TOWERS')


def screen(bd, bh):
    scr = mat('screen', (1, 1, 1), img='screen.png', emit=(1, 1, 1), emit_strength=0.0)
    b = scr.node_tree.nodes.get('Principled BSDF'); t = [n for n in scr.node_tree.nodes if n.type == 'TEX_IMAGE'][0]
    scr.node_tree.links.new(t.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = 0.8
    steel = mat('steel', (0.55, 0.57, 0.6))
    x = HL + 5.2 + 12 * 0.85 + 1
    box('screen_frame', (0.4, 8.6, 4.6), (x + 0.25, 0, bh + 3.2), mat('board_back', (0.15, 0.15, 0.18)))
    o = plane('SCREEN', 8, 4, (x, 0, bh + 3.2), scr)
    o.rotation_euler = (math.pi / 2, 0, -math.pi / 2)
    cyl('screen_leg', 0.2, bh + 1, (x + 0.3, -3, (bh + 1) / 2), steel)
    cyl('screen_leg', 0.2, bh + 1, (x + 0.3, 3, (bh + 1) / 2), steel)


def near_side(rnd):
    """Bancos de reservas, tendas, cooler e cabine de TV no lado da câmera."""
    bench = kenney('furniture-kit/Models/GLTF format/benchCushionLow.glb', target_h=0.5)
    para = kenney('city-kit-commercial/Models/GLB format/detail-parasol-a.glb', target_h=2.6)
    para2 = kenney('city-kit-commercial/Models/GLB format/detail-parasol-b.glb', target_h=2.6)
    tent = mat('tent', (1, 1, 1), img='canvas_stripes.png', rough=0.8)
    for side in (-1, 1):
        for i in range(3):
            bench(f'bench', (side * (4 + i * 1.6), -HW - 5.2, 0), 0)
        # tenda do time
        x = side * 6.5
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=False, segments=4, radius1=3.2, radius2=0.1, depth=1.4)
        uvl = bm.loops.layers.uv.new()
        for f in bm.faces:
            for l in f.loops: l[uvl].uv = ((math.atan2(l.vert.co.y, l.vert.co.x) / math.pi + 1) * 2, l.vert.co.z + 0.7)
        o = obj_from_bm('tent_roof', bm, tent); o.location = (x, -HW - 5.6, 3.0); o.rotation_euler = (0, 0, math.pi / 4)
        for dx in (-1.6, 1.6):
            for dy in (-1.6, 1.6):
                cyl('tent_leg', 0.05, 2.4, (x + dx, -HW - 5.6 + dy, 1.2), mat('steel', (0.55, 0.57, 0.6)), seg=6)
    for i in range(6):
        p = para if i % 2 else para2
        p('parasol', (-26 + i * 10 + rnd.uniform(-2, 2), -HW - 14 - rnd.uniform(0, 6), 0), rnd.uniform(0, 6))
    # cabine de transmissão (TV)
    cab = mat('cabin', (0.95, 0.95, 0.97), rough=0.6)
    glass = mat('glass', (0.2, 0.35, 0.5), rough=0.1, metal=0.3)
    box('tv_cabin', (6, 3, 2.8), (0, -HW - 11, 4.4), cab)
    box('tv_glass', (5.6, 0.05, 1.2), (0, -HW - 9.47, 4.6), glass)
    for dx in (-2.6, 2.6):
        for dy in (-1.2, 1.2):
            cyl('cabin_leg', 0.1, 3.0, (dx, -HW - 11 + dy, 1.5), mat('steel', (0.55, 0.57, 0.6)), seg=6)
    # cooler + bolas
    box('cooler', (0.7, 0.45, 0.45), (side * 9.0, -HW - 5.0, 0.22), mat('cooler', (0.1, 0.55, 0.9), rough=0.4))


def palms(rnd, spots):
    kinds = [kenney('nature-kit/Models/GLTF format/tree_palmTall.glb', target_h=11),
             kenney('nature-kit/Models/GLTF format/tree_palmBend.glb', target_h=9),
             kenney('nature-kit/Models/GLTF format/tree_palmDetailedTall.glb', target_h=12)]
    for i, (x, y) in enumerate(spots):
        rnd.choice(kinds)(f'palm', (x, y, 0), rnd.uniform(0, 6.28), rnd.uniform(0.8, 1.2))


def skyline(rnd, y0, x_span, night=False, count=26, low=False):
    sky = ['building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c', 'building-skyscraper-d', 'building-skyscraper-e']
    mid = ['building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f', 'building-g', 'building-h']
    lows = ['low-detail-building-wide-a', 'low-detail-building-wide-b', 'low-detail-building-a', 'low-detail-building-c']
    lit = mat('window_lit', (1, 0.85, 0.5), emit=(1, 0.8, 0.45), emit_strength=3.0) if night else None
    placed = []
    x = -x_span
    while x < x_span:
        pool = lows if low else (sky if rnd.random() < 0.45 else mid)
        name = rnd.choice(pool)
        h = rnd.uniform(14, 22) if low else (rnd.uniform(35, 70) if 'sky' in name else rnd.uniform(18, 32))
        f = kenney(f'city-kit-commercial/Models/GLB format/{name}.glb', target_h=h)
        y = y0 + rnd.uniform(0, 25)
        o = f('bldg', (x, y, 0), rnd.choice([0, math.pi / 2, math.pi, -math.pi / 2]))
        placed.append(o)
        if night:
            # janelas acesas: pequenos quadros emissivos na fachada voltada ao campo
            w = h * 0.45
            for k in range(int(h / 3)):
                for j in range(4):
                    if rnd.random() < 0.45:
                        box('win', (w / 6, 0.1, 1.0), (x - w / 2 + (j + 0.5) * w / 4, y - w * 0.52, 2 + k * 3), lit)
        x += rnd.uniform(9, 16)
    return placed


def mountains(rnd, positions, color=(0.22, 0.38, 0.2), rock=(0.45, 0.42, 0.38)):
    m = mat('mountain', color, rough=1.0)
    mr = mat('mountain_rock', rock, rough=1.0)
    for i, (x, y, r, h) in enumerate(positions):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
        for v in bm.verts:
            n = 0.75 + 0.35 * math.sin(v.co.x * 4.1 + i) * math.cos(v.co.y * 3.3 - i) + rnd.uniform(-0.06, 0.06)
            v.co *= n
            if v.co.z < 0: v.co.z *= 0.05
        bmesh.ops.scale(bm, vec=Vector((r, r * 0.8, h)), verts=bm.verts)
        for f in bm.faces:
            f.material_index = 1 if f.calc_center_median().z > h * 0.55 else 0
            f.smooth = False
        o = obj_from_bm('MOUNTAIN', bm)
        o.data.materials.append(m); o.data.materials.append(mr)
        o.location = (x, y, -1)


def sea(y_from, night=False):
    w = mat('water', (0.05, 0.35, 0.5), rough=0.1)
    o = plane('WATER', 1400, 700, (0, y_from - 350, -0.2), w, uvscale=20, cuts=0)
    return o


def boats(rnd, area, n=6):
    kinds = ['boat-sail-a', 'boat-sail-b', 'boat-speed-a', 'boat-fishing-small', 'ship-ocean-liner-small', 'boat-row-large']
    for i in range(n):
        k = rnd.choice(kinds)
        f = kenney(f'watercraft-kit/Models/GLB format/{k}.glb', scale=2.2 if 'ship' not in k else 3.0)
        f('BOAT', (rnd.uniform(area[0], area[1]), rnd.uniform(area[2], area[3]), -0.3), rnd.uniform(0, 6.28))


def dunes(rnd, spots):
    m = mat('dune_sand', (0.93, 0.78, 0.55), rough=1.0)
    for i, (x, y, r, h) in enumerate(spots):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=1.0)
        for v in bm.verts:
            if v.co.z < 0: v.co.z = 0
            v.co.x *= 1 + 0.2 * math.sin(v.co.y * 3 + i)
        bmesh.ops.scale(bm, vec=Vector((r, r * 0.6, h)), verts=bm.verts)
        for f in bm.faces: f.smooth = True
        uvl = bm.loops.layers.uv.new()
        for f in bm.faces:
            for l in f.loops: l[uvl].uv = (l.vert.co.x / 6, l.vert.co.y / 6)
        o = obj_from_bm(f'DUNE_{i}', bm, m)
        o.location = (x, y, -0.2); o.rotation_euler = (0, 0, rnd.uniform(-0.4, 0.4))


# ------------------------------------------------------------ arenas
def export(aid, seats):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f'{aid}.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_materials='EXPORT', export_image_format='AUTO',
                              export_lights=False, export_cameras=False)
    json.dump({'seats': seats}, open(os.path.join(OUT, f'{aid}_seats.json'), 'w'))
    print('OK', aid, len(seats), 'assentos')


def common(rnd, neon=False, seat_img=True):
    field(); goal(1); goal(-1); flags(); boards(neon)
    seats = []
    seatm = mat('seats', (1, 1, 1), img='seats.png', rough=0.6)
    bd, bh = stands(seats, seatm)
    floodlights(bd, bh); screen(bd, bh); near_side(rnd)
    return seats, bd, bh


def copacabana():
    reset(); MATS.clear(); IMPORTED.clear(); rnd = random.Random(1)
    seats, bd, bh = common(rnd)
    skyline(rnd, 70, 200)
    mountains(rnd, [(-160, 330, 120, 140), (40, 380, 150, 110), (220, 300, 100, 170), (-300, 260, 90, 90)])
    sea(-60)
    boats(rnd, (-200, 200, -300, -90), 8)
    palms(rnd, [(x, y) for x in range(-60, 61, 12) for y in (-28, -40)] + [(x, 52) for x in range(-70, 71, 14)] + [(s * 48, y) for s in (-1, 1) for y in range(-20, 30, 10)])
    export('copacabana', seats)


def lagoa():
    reset(); MATS.clear(); IMPORTED.clear(); rnd = random.Random(2)
    seats, bd, bh = common(rnd, neon=True)
    skyline(rnd, 90, 220, night=True, count=30)
    mountains(rnd, [(-120, 320, 140, 120), (150, 340, 130, 150)], color=(0.08, 0.12, 0.1), rock=(0.12, 0.12, 0.13))
    sea(-50, night=True)
    boats(rnd, (-150, 150, -250, -80), 5)
    palms(rnd, [(x, -34) for x in range(-60, 61, 15)] + [(s * 46, y) for s in (-1, 1) for y in range(-10, 30, 12)])
    export('lagoa', seats)


def dunas():
    reset(); MATS.clear(); IMPORTED.clear(); rnd = random.Random(3)
    seats, bd, bh = common(rnd)
    dunes(rnd, [(-140, 140, 70, 26), (-20, 190, 90, 34), (120, 150, 80, 30), (260, 230, 100, 40), (-260, 220, 90, 28), (60, 300, 140, 55)])
    skyline(rnd, 95, 160, low=True)
    sea(-60)
    boats(rnd, (-200, 200, -260, -90), 7)
    palms(rnd, [(x, y) for x in range(-90, 91, 9) for y in (-30, -38, 60)] + [(s * 46, y) for s in (-1, 1) for y in range(-20, 40, 8)])
    export('dunas', seats)


if __name__ == '__main__':
    which = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['copacabana', 'lagoa', 'dunas']
    for w in which:
        {'copacabana': copacabana, 'lagoa': lagoa, 'dunas': dunas}[w]()
