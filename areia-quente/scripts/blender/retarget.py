"""Retarget de animações livres para o rig do Kenney (characterMedium).
Fontes:
  - Quaternius "Universal Animation Library" (CC0) — glTF (espelho: github.com/J-Ponzo/gltf-universal-animation-library)
  - CMU Graphics Lab Motion Capture Database (uso livre) — BVH (espelho: github.com/una-dinosauria/cmu-mocap)
Método: para cada osso mapeado, a rotação de pose da fonte é levada ao espaço do mundo como um delta em relação
à pose de descanso (D = W_pose * W_rest^-1), corrigida pela direção do osso em repouso (pose A x pose T) e aplicada
ao osso equivalente do alvo; a translação vertical do quadril é escalada pelo comprimento da perna. Os três esqueletos
usam a mesma convenção (frente = -Y, esquerda = +X, Z para cima)."""
import bpy, math, os
from mathutils import Quaternion, Vector, Matrix

UAL_MAP = {
    'Hips': 'DEF-hips', 'Spine': 'DEF-spine.001', 'Chest': 'DEF-spine.002', 'UpperChest': 'DEF-spine.003', 'Neck': 'DEF-neck', 'Head': 'DEF-head',
    'LeftShoulder': 'DEF-shoulder.L', 'LeftArm': 'DEF-upper_arm.L', 'LeftForeArm': 'DEF-forearm.L', 'LeftHand': 'DEF-hand.L',
    'RightShoulder': 'DEF-shoulder.R', 'RightArm': 'DEF-upper_arm.R', 'RightForeArm': 'DEF-forearm.R', 'RightHand': 'DEF-hand.R',
    'LeftUpLeg': 'DEF-thigh.L', 'LeftLeg': 'DEF-shin.L', 'LeftFoot': 'DEF-foot.L', 'LeftToes': 'DEF-toe.L',
    'RightUpLeg': 'DEF-thigh.R', 'RightLeg': 'DEF-shin.R', 'RightFoot': 'DEF-foot.R', 'RightToes': 'DEF-toe.R',
}
CMU_MAP = {
    'Hips': 'Hips', 'Spine': 'LowerBack', 'Chest': 'Spine', 'UpperChest': 'Spine1', 'Neck': 'Neck', 'Head': 'Head',
    'LeftShoulder': 'LeftShoulder', 'LeftArm': 'LeftArm', 'LeftForeArm': 'LeftForeArm', 'LeftHand': 'LeftHand',
    'RightShoulder': 'RightShoulder', 'RightArm': 'RightArm', 'RightForeArm': 'RightForeArm', 'RightHand': 'RightHand',
    'LeftUpLeg': 'LeftUpLeg', 'LeftLeg': 'LeftLeg', 'LeftFoot': 'LeftFoot', 'LeftToes': 'LeftToeBase',
    'RightUpLeg': 'RightUpLeg', 'RightLeg': 'RightLeg', 'RightFoot': 'RightFoot', 'RightToes': 'RightToeBase',
}
MIXAMO_MAP = {k: 'mixamorig:' + v for k, v in {
    'Hips': 'Hips', 'Spine': 'Spine', 'Chest': 'Spine1', 'UpperChest': 'Spine2', 'Neck': 'Neck', 'Head': 'Head',
    'LeftShoulder': 'LeftShoulder', 'LeftArm': 'LeftArm', 'LeftForeArm': 'LeftForeArm', 'LeftHand': 'LeftHand',
    'RightShoulder': 'RightShoulder', 'RightArm': 'RightArm', 'RightForeArm': 'RightForeArm', 'RightHand': 'RightHand',
    'LeftUpLeg': 'LeftUpLeg', 'LeftLeg': 'LeftLeg', 'LeftFoot': 'LeftFoot', 'LeftToes': 'LeftToeBase',
    'RightUpLeg': 'RightUpLeg', 'RightLeg': 'RightLeg', 'RightFoot': 'RightFoot', 'RightToes': 'RightToeBase'}.items()}
# ossos sem comprimento útil (ou raiz): usa alinhamento identidade
NO_ALIGN = {'Hips', 'UpperChest', 'LeftHand', 'RightHand', 'Neck', 'Head'}
ORDER = ['Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
         'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToes',
         'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToes']


def mirror_name(n):
    return n.replace('Left', '§').replace('Right', 'Left').replace('§', 'Right')


def mirror_q(q):
    return Quaternion((q.w, q.x, -q.y, -q.z))


class Source:
    def __init__(self, kind, path):
        self.kind = kind
        before = set(bpy.data.objects)
        acts_before = set(bpy.data.actions)
        if kind == 'ual':
            bpy.ops.import_scene.gltf(filepath=path)
            self.fps = bpy.context.scene.render.fps
            self.map = UAL_MAP
        elif kind == 'mixamo':
            bpy.ops.import_scene.fbx(filepath=path)
            self.fps = 30
            self.map = MIXAMO_MAP
        else:
            bpy.ops.import_anim.bvh(filepath=path, frame_start=1, use_fps_scale=False, update_scene_fps=False, axis_forward='-Z', axis_up='Y')
            self.fps = 120
            self.map = CMU_MAP
        new = [o for o in bpy.data.objects if o not in before]
        self.arm = [o for o in new if o.type == 'ARMATURE'][0]
        self.objs = new
        self.actions = [a for a in bpy.data.actions if a not in acts_before]
        if self.arm.animation_data:
            for tr in self.arm.animation_data.nla_tracks: tr.mute = True
        M = self.arm.matrix_world
        bl = self.arm.data.bones
        self.rest_q = {n: (M @ bl[n].matrix_local).to_quaternion() for n in self.map.values()}
        self.rest_dir = {n: (M @ bl[n].tail_local - M @ bl[n].head_local).normalized() for n in self.map.values()}
        foot = self.map['LeftFoot']
        hips = self.map['Hips']
        self.leg = (M @ bl[hips].head_local).z - (M @ bl[foot].head_local).z

    def use(self, action_name=None):
        act = self.actions[0] if action_name is None else next(a for a in self.actions if a.name.split('|')[-1] == action_name)
        self.arm.animation_data.action = act
        try:
            if act.slots: self.arm.animation_data.action_slot = act.slots[0]
        except Exception:
            pass
        return act

    def sample(self, t):
        f = t * self.fps + (0 if self.kind == 'ual' else 1)
        bpy.context.scene.frame_set(int(math.floor(f)), subframe=f - math.floor(f))
        M = self.arm.matrix_world
        pb = self.arm.pose.bones
        rot = {n: (M @ pb[n].matrix).to_quaternion() for n in self.map.values()}
        hips = (M @ pb[self.map['Hips']].head)
        lf = (M @ pb[self.map['LeftFoot']].head); rf = (M @ pb[self.map['RightFoot']].head)
        lt = (M @ pb[self.map['LeftUpLeg']].head); rt = (M @ pb[self.map['RightUpLeg']].head)
        return rot, hips, min(lf.z, rf.z), (lt - rt)

    def dispose(self):
        for o in self.objs:
            if o.name in bpy.data.objects: bpy.data.objects.remove(o, do_unlink=True)
        for a in self.actions:
            if a.name in bpy.data.actions: bpy.data.actions.remove(a)


def retarget(target, src, name, t0, t1, fps=30, mirror=False, ref_t=None, keep_xy=False, ground=None):
    """Cria a action `name` no armature `target` a partir de src[t0:t1] (segundos)."""
    tb = target.data.bones
    t_rest_q = {n: tb[n].matrix_local.to_quaternion() for n in ORDER}
    t_dir = {n: (tb[n].tail_local - tb[n].head_local).normalized() for n in ORDER}
    t_leg = tb['Hips'].head_local.z - tb['LeftFoot'].head_local.z
    scale = t_leg / max(1e-6, src.leg)
    # alinhamento de repouso (pose A da fonte x pose T do alvo)
    align = {}
    for tn in ORDER:
        sn = src.map[tn]
        align[tn] = Quaternion() if tn in NO_ALIGN else t_dir[tn].rotation_difference(src.rest_dir[sn])
    # direção para a frente no quadro de referência -> corrige para -Y
    rt = ref_t if ref_t is not None else t0
    _, h0, g0, lat = src.sample(rt)
    lat.z = 0
    fwd = lat.normalized().cross(Vector((0, 0, 1)))
    heading = math.atan2(fwd.x, -fwd.y)  # ângulo de fwd em relação a -Y
    H = Quaternion((0, 0, 1), -heading)
    # chão: menor altura de tornozelo do trecho
    n = max(2, int(round((t1 - t0) * fps)) + 1)
    samples = [src.sample(t0 + (t1 - t0) * i / (n - 1)) for i in range(n)]
    gz = ground if ground is not None else min(s[2] for s in samples)
    stand = gz + src.leg
    start_xy = samples[0][1].copy()
    act = bpy.data.actions.new(name)
    target.animation_data_create()
    target.animation_data.action = act
    for pbn in target.pose.bones: pbn.rotation_mode = 'QUATERNION'
    for i, (rot, hips, _, _) in enumerate(samples):
        D = {}
        for tn in ORDER:
            sn = src.map[tn]
            d = H @ (rot[sn] @ src.rest_q[sn].inverted())
            D[tn] = d
        if mirror:
            D = {mirror_name(k): mirror_q(v) for k, v in D.items()}
        world = {}
        for tn in ORDER:
            a = align[tn] if not mirror else align[mirror_name(tn)]
            if mirror and tn not in NO_ALIGN:
                a = t_dir[tn].rotation_difference(mirror_dir(src.rest_dir[src.map[mirror_name(tn)]]))
            world[tn] = D[tn] @ a @ t_rest_q[tn]
        f = i
        for tn in ORDER:
            b = tb[tn]
            par = b.parent
            if par and par.name in world:
                pq = world[par.name] @ t_rest_q[par.name].inverted() @ t_rest_q[tn]
            else:
                pq = t_rest_q[tn]
            basis = pq.inverted() @ world[tn]
            pb = target.pose.bones[tn]
            pb.rotation_quaternion = basis
            pb.keyframe_insert('rotation_quaternion', frame=f)
        # quadril: só vertical (in-place), opcionalmente também horizontal
        dz = (hips.z - stand) * scale
        off = Vector((0, 0, dz))
        if keep_xy:
            dxy = H @ (hips - start_xy)
            off.x, off.y = dxy.x * scale, dxy.y * scale
            if mirror: off.x = -off.x
        hb = target.pose.bones['Hips']
        hb.location = tb['Hips'].matrix_local.to_3x3().inverted() @ off
        hb.keyframe_insert('location', frame=f)
    # demais ossos (dedos etc.) em repouso
    for pb in target.pose.bones:
        if pb.name not in ORDER and not any(s in pb.name for s in ('Ctrl', 'IK', 'Roll', '_end')):
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.keyframe_insert('rotation_quaternion', frame=0)
    # quaternions contínuos (evita giros de 360° na interpolação)
    try:
        fcs = act.fcurves
    except AttributeError:
        fcs = [fc for layer in act.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
    fix_quat_continuity(fcs)
    act.use_fake_user = True
    return act, (t1 - t0)


def mirror_dir(v):
    return Vector((-v.x, v.y, v.z))


def fix_quat_continuity(fcs):
    groups = {}
    for fc in fcs:
        if fc.data_path.endswith('rotation_quaternion'):
            groups.setdefault(fc.data_path, [None] * 4)[fc.array_index] = fc
    for path, comps in groups.items():
        if any(c is None for c in comps): continue
        n = len(comps[0].keyframe_points)
        prev = None
        for k in range(n):
            q = [c.keyframe_points[k].co[1] for c in comps]
            if prev and sum(a * b for a, b in zip(q, prev)) < 0:
                q = [-x for x in q]
                for c, x in zip(comps, q): c.keyframe_points[k].co[1] = x
            prev = q
        for c in comps: c.update()
