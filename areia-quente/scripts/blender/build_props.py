"""Objetos do AREIA QUENTE: bola, troféu, cone de treino e torcida (mini-characters do Kenney, CC0,
congelados em poses 'sentado' e 'torcendo' para InstancedMesh). Exporta public/assets/models/props/*.glb."""
import bpy, bmesh, os, math, sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KEN = os.path.join(ROOT, '.cache', 'src', 'kenney')
TEX = os.path.join(ROOT, 'public', 'assets', 'textures', 'props')
OUT = os.path.join(ROOT, 'public', 'assets', 'models', 'props')
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def pmat(name, color, rough=0.5, metal=0.0, img=None):
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if img:
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(TEX, img))
        m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    return m


def export(name, objs=None):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_animations=False)
    print('OK', name)


def ball():
    reset()
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.12)
    uvl = bm.loops.layers.uv.new()
    for f in bm.faces:
        f.smooth = True
        for l in f.loops:
            co = l.vert.co.normalized()
            u = math.atan2(co.y, co.x) / (2 * math.pi) + 0.5
            v = math.asin(max(-1, min(1, co.z))) / math.pi + 0.5
            l[uvl].uv = (u, v)
    # corrige costura
    for f in bm.faces:
        us = [l[uvl].uv.x for l in f.loops]
        if max(us) - min(us) > 0.5:
            for l in f.loops:
                if l[uvl].uv.x < 0.5: l[uvl].uv.x += 1.0
    me = bpy.data.meshes.new('ball'); bm.to_mesh(me)
    o = bpy.data.objects.new('BALL', me); bpy.context.scene.collection.objects.link(o)
    me.materials.append(pmat('ball', (1, 1, 1), 0.35, img='ball.png'))
    export('ball')


def lathe(name, profile, seg=40, m=None):
    bm = bmesh.new()
    rings = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for r, z in profile])
    for i in range(seg):
        A, B = rings[i], rings[(i + 1) % seg]
        for j in range(len(profile) - 1):
            f = bm.faces.new((A[j], B[j], B[j + 1], A[j + 1])); f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if m: me.materials.append(m)
    return o


def trophy():
    reset()
    gold = pmat('gold', (1.0, 0.76, 0.25), 0.18, 1.0)
    base = pmat('base', (0.08, 0.08, 0.1), 0.3, 0.2)
    lathe('base', [(0.0, 0.0), (0.22, 0.0), (0.22, 0.12), (0.19, 0.14), (0.16, 0.16), (0.16, 0.26), (0.13, 0.28), (0.0, 0.28)], m=base)
    # cup: pé, haste, bojo e borda
    prof = [(0.0, 0.28), (0.12, 0.28), (0.11, 0.31), (0.05, 0.34), (0.035, 0.42), (0.03, 0.5), (0.05, 0.53), (0.09, 0.56), (0.14, 0.62),
            (0.17, 0.7), (0.185, 0.78), (0.19, 0.86), (0.2, 0.9), (0.18, 0.9), (0.17, 0.86), (0.16, 0.7), (0.05, 0.6), (0.0, 0.6)]
    lathe('cup', prof, m=gold)
    # bola dourada no topo
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=0.09)
    for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new('topball'); bm.to_mesh(me); o = bpy.data.objects.new('topball', me); bpy.context.scene.collection.objects.link(o)
    o.location = (0, 0, 0.98); me.materials.append(gold)
    # alças
    for s in (-1, 1):
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, segments=16, radius=0.012)
        me = bpy.data.meshes.new('handle'); bm.to_mesh(me)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.09, minor_radius=0.016, location=(s * 0.2, 0, 0.74), rotation=(math.pi / 2, 0, 0))
        h = bpy.context.active_object; h.data.materials.append(gold); h.scale = (0.8, 1, 1.25)
        for p in h.data.polygons: p.use_smooth = True
    # estrelas da base (faixa)
    export('trophy')


def cone():
    reset()
    orange = pmat('cone', (1.0, 0.42, 0.05), 0.6)
    white = pmat('cone_white', (0.95, 0.95, 0.95), 0.6)
    lathe('cone', [(0.0, 0.42), (0.03, 0.42), (0.13, 0.04), (0.16, 0.03), (0.0, 0.03)], seg=20, m=orange)
    o = lathe('stripe', [(0.07, 0.25), (0.092, 0.17)], seg=20, m=white); o.scale = (1.03, 1.03, 1)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.015)); b = bpy.context.active_object; b.scale = (0.36, 0.36, 0.03); b.data.materials.append(orange)
    export('cone')


def crowd():
    reset()
    chars = ['male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f']
    out_objs = []
    for ci, c in enumerate(chars):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(KEN, 'mini-characters', 'Models', 'GLB format', f'character-{c}.glb'))
        new = [o for o in bpy.data.objects if o not in before]
        arm = [o for o in new if o.type == 'ARMATURE'][0]
        meshes = [o for o in new if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
        acts = {a.name.split('|')[-1]: a for a in bpy.data.actions}
        if arm.animation_data:
            for tr in arm.animation_data.nla_tracks: tr.mute = True
        for pose, actname, frac in (('sit', 'sit', 0.5), ('cheer', 'jump', 0.35)):
            act = next((a for n, a in acts.items() if n.startswith(actname)), None)
            if not arm.animation_data: arm.animation_data_create()
            arm.animation_data.action = act
            try:
                if act.slots: arm.animation_data.action_slot = act.slots[0]
            except Exception:
                pass
            f0, f1 = act.frame_range
            bpy.context.scene.frame_set(int(f0 + (f1 - f0) * frac))
            dg = bpy.context.evaluated_depsgraph_get()
            bm = bmesh.new(); mats = []
            for o in meshes:
                ev = o.evaluated_get(dg); me = ev.to_mesh(); me.transform(o.matrix_world)
                tmp = bmesh.new(); tmp.from_mesh(me)
                off = len(mats); mats += list(o.data.materials)
                for f in tmp.faces: f.material_index += off
                tm = bpy.data.meshes.new('t'); tmp.to_mesh(tm); tmp.free(); bm.from_mesh(tm); bpy.data.meshes.remove(tm)
                ev.to_mesh_clear()
            me = bpy.data.meshes.new(f'crowd_{c}_{pose}'); bm.to_mesh(me); bm.free()
            for m in mats: me.materials.append(m)
            o = bpy.data.objects.new(f'CROWD_{ci}_{pose}', me)
            out_objs.append(o)
        for o in new: bpy.data.objects.remove(o)
        for a in list(bpy.data.actions): bpy.data.actions.remove(a)
    for i, o in enumerate(out_objs):
        bpy.context.scene.collection.objects.link(o); o.location = (i * 1.0, 0, 0)
    export('crowd')


def make_textures():
    """Textura da bola: gomos em espiral colorida (bola de futebol de praia)."""
    from PIL import Image, ImageDraw
    os.makedirs(TEX, exist_ok=True)
    W, H = 1024, 512
    im = Image.new('RGB', (W, H), '#FFFFFF')
    d = ImageDraw.Draw(im)
    cols = ['#FFD21F', '#1D74C9', '#FF3E8A', '#0FA3A3']
    for k in range(4):
        pts = []
        for i in range(81):
            v = i / 80
            u = (k / 4 + v * 0.6) % 1
            pts.append((u * W, v * H))
        for dx in (-W, 0, W):
            poly = [(x + dx, y) for x, y in pts] + [(x + dx + W * 0.11, y) for x, y in reversed(pts)]
            d.polygon(poly, fill=cols[k])
    for dx in (-W, 0, W):
        for k in range(4):
            pts = [(((k / 4 + v / 80 * 0.6) % 1) * W + dx, v / 80 * H) for v in range(81)]
            d.line(pts, fill='#222222', width=4)
    d.rectangle((0, 0, W, 14), fill='#222222'); d.rectangle((0, H - 14, W, H), fill='#222222')
    im.save(os.path.join(TEX, 'ball.png'))


if __name__ == '__main__':
    which = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['tex', 'ball', 'trophy', 'cone', 'crowd']
    for w in which:
        {'tex': make_textures, 'ball': ball, 'trophy': trophy, 'cone': cone, 'crowd': crowd}[w]()
