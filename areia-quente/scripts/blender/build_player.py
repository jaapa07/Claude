"""Gera public/assets/models/players/athlete.glb: malha + rig do Kenney (CC0) com ~45 clipes autorais.
Também exporta .cache/build/athlete_uv.json (triângulos com UV, posição, normal e osso dominante)
usado por build_skins.py para pintar os uniformes."""
import bpy, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from rig import Poser, make_action
from anims import build, LOOPING

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, '.cache', 'src', 'kenney', 'animated-characters-protagonists')
OUT = os.path.join(ROOT, 'public', 'assets', 'models', 'players')
BUILD = os.path.join(ROOT, '.cache', 'build')
os.makedirs(OUT, exist_ok=True); os.makedirs(BUILD, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, 'Model', 'characterMedium.fbx'))
bpy.context.scene.render.fps = 30
bpy.context.scene.frame_start = 0
arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
mesh = [o for o in bpy.data.objects if o.type == 'MESH'][0]
arm.name = 'Athlete'; mesh.name = 'AthleteBody'
mesh.data.materials[0].name = 'kit'

# ---- novo UV sem sobreposição (o original do Kenney sobrepõe braço e tronco)
me = mesh.data
orig_name = me.uv_layers.active.name
new = me.uv_layers.new(name='KitUV')
me.uv_layers.active = new
bpy.context.view_layer.objects.active = mesh
mesh.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.006, area_weight=0.0, scale_to_bounds=True)
bpy.ops.object.mode_set(mode='OBJECT')
me.calc_loop_triangles()
uv_orig = me.uv_layers[orig_name].data
uv = me.uv_layers['KitUV'].data
groups = {g.index: g.name for g in mesh.vertex_groups}
def dom_bone(vi):
    v = me.vertices[vi]
    if not v.groups: return 'Hips'
    g = max(v.groups, key=lambda g: g.weight)
    return groups[g.group]
tris = []
for t in me.loop_triangles:
    tris.append({
        'uv': [list(uv[l].uv) for l in t.loops],
        'uv0': [list(uv_orig[l].uv) for l in t.loops],
        'p': [list(me.vertices[v].co) for v in t.vertices],
        'n': list(t.normal),
        'b': [dom_bone(v) for v in t.vertices],
    })
json.dump({'tris': tris}, open(os.path.join(BUILD, 'athlete_uv.json'), 'w'))
me.uv_layers.remove(me.uv_layers[orig_name])

# ---- animações
poser = Poser(arm)
clips, meta = build()
arm.animation_data_create()
for name, keys in clips.items():
    act = make_action(arm, poser, name, keys)
    # interpolação: clipes em loop usam bezier; cortes rápidos também
    tr = arm.animation_data.nla_tracks.new()
    tr.name = name
    st = tr.strips.new(name, int(act.frame_range[0]), act)
    tr.mute = True
arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)

# ---- exporta
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, 'athlete.glb'), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
    export_frame_step=1, export_optimize_animation_size=True, export_def_bones=True,
    export_materials='EXPORT', export_image_format='NONE', export_yup=True, export_skins=True,
    export_texcoords=True, export_normals=True)
for k in clips:
    meta.setdefault(k, {})
    meta[k]['loop'] = k in LOOPING
    meta[k]['duration'] = clips[k][-1][0]
json.dump(meta, open(os.path.join(ROOT, 'src', 'data', 'clips.json'), 'w'), indent=1)
print('OK athlete.glb', len(clips), 'clips')
