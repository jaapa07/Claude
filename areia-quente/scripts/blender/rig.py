"""Utilitários de pose para o rig do Kenney (characterMedium).
Espaço do personagem (armature rest): +X = esquerda do personagem, -Y = frente, +Z = cima.
Rotações são listas [(eixo, graus), ...] aplicadas em sequência no referencial do personagem,
relativas ao pai (convertidas para o espaço local do osso)."""
import bpy, math
from mathutils import Quaternion, Vector, Matrix

AX = {'x': Vector((1, 0, 0)), 'y': Vector((0, 1, 0)), 'z': Vector((0, 0, 1))}

def rot(seq):
    q = Quaternion()
    for ax, deg in seq:
        q = Quaternion(AX[ax], math.radians(deg)) @ q
    return q

def mirror_seq(seq):
    # espelho no plano YZ: rotações em X mantêm o sinal, Y e Z invertem
    return [(a, d if a == 'x' else -d) for a, d in seq]

class Poser:
    def __init__(self, arm):
        self.arm = arm
        self.rest = {b.name: b.matrix_local.to_3x3() for b in arm.data.bones}

    def local_q(self, bone, seq):
        R = self.rest[bone]
        q = rot(seq).to_matrix()
        return (R.inverted() @ q @ R).to_quaternion()

    def local_loc(self, bone, v):
        return self.rest[bone].inverted() @ Vector(v)

def expand(pose):
    """pose: dict bone->seq. Chaves 'L:Arm' geram LeftArm e RightArm espelhado; 'Left*'/'Right*' literais."""
    out = {}
    for k, v in pose.items():
        if k.startswith('L:'):
            n = k[2:]
            out['Left' + n] = v
            out['Right' + n] = mirror_seq(v)
        elif k.startswith('R:'):  # especifica o lado direito e espelha para o esquerdo
            n = k[2:]
            out['Right' + n] = v
            out['Left' + n] = mirror_seq(v)
        else:
            out[k] = v
    return out

DEFORM = None

def make_action(arm, poser, name, keys, fps=30, loop=False):
    """keys: lista de (tempo_s, pose_dict, hips_loc(x,y,z) em unidades do personagem ou None)."""
    global DEFORM
    if DEFORM is None:
        DEFORM = [b.name for b in arm.data.bones if not any(s in b.name for s in ('Ctrl', 'IK', 'Roll', '_end'))]
    act = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = act
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    for (t, pose, hips) in keys:
        f = round(t * fps)
        p = expand(pose)
        for bn in DEFORM:
            pb = arm.pose.bones[bn]
            pb.rotation_quaternion = poser.local_q(bn, p.get(bn, []))
            pb.keyframe_insert('rotation_quaternion', frame=f)
        hb = arm.pose.bones['Hips']
        hb.location = poser.local_loc('Hips', hips or (0, 0, 0))
        hb.keyframe_insert('location', frame=f)
    # quaternions contínuos
    act.use_fake_user = True
    return act
