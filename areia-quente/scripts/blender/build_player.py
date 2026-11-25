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

# ---- animações: captura de movimento livre (Quaternius UAL CC0 + CMU mocap) onde existe; clipes autorais no resto
from retarget import Source, retarget
SRCD = os.path.join(ROOT, '.cache', 'src')
MOCAP = [  # (nome no jogo, tipo, arquivo, action UAL | None, t0, t1, meta extra, loop)
    ('idle', 'ual', 'Idle_Loop', None, None, {}, True), ('lineup', 'ual', 'Idle_Loop', None, None, {}, True),
    ('walk', 'ual', 'Walk_Loop', None, None, {}, True), ('jog', 'ual', 'Jog_Fwd_Loop', None, None, {}, True),
    ('run', 'ual', 'Jog_Fwd_Loop', None, None, {}, True), ('sprint', 'ual', 'Sprint_Loop', None, None, {}, True),
    ('dance_1', 'ual', 'Dance_Loop', None, None, {}, True), ('argue_ref', 'ual', 'Idle_Talking_Loop', None, None, {}, True),
    ('fall_hit', 'ual', 'Death01', None, None, {'endsLying': 'back'}, False),
    ('shot', 'cmu', '011/11_01', 353, 461, {'contact': (407 - 353) / 120}, False),
    ('pass_short', 'cmu', '010/10_04', 309, 405, {'contact': (357 - 309) / 120}, False),
    ('pass_lob', 'cmu', '010/10_02', 299, 413, {'contact': (353 - 299) / 120}, False),
    ('gk_throw', 'cmu', '033/33_01', 230, 360, {'contact': (295 - 230) / 120}, False),
    ('celebrate_cartwheel', 'cmu', '049/49_07', 40, 340, {}, True),
    ('warmup_jacks', 'cmu', '013/13_29', 131, 411, {}, True),
    ('wave', 'cmu', '013/13_26', 811, 1011, {}, False),
    ('stretch', 'cmu', '042/42_01', 191, 700, {}, False),
    # Mixamo (Adobe) — pacote "Soccer Game Pack" fornecido pelo dono do projeto; os .fbx originais ficam fora do repositório
    # (quadros a 30 fps; tuplas: nome, 'mx', arquivo, quadro inicial, quadro final, meta, loop). Ausentes = mantém o clipe anterior.
    ('gk_idle', 'mx', 'goalkeeper idle (2)', 1, 101, {}, True),
    ('gk_dive_left', 'mx', 'goalkeeper diving save', 13, 70, {'endsLying': 'side', 'reach': (31 - 13) / 30}, False),
    ('gk_dive_right', 'mx', 'goalkeeper diving save (2)', 10, 70, {'endsLying': 'side', 'reach': (28 - 10) / 30}, False),
    ('gk_catch', 'mx', 'goalkeeper catch (2)', 1, 30, {}, False),
    ('gk_punch', 'mx', 'goalkeeper catch (4)', 4, 46, {'contact': (25 - 4) / 30}, False),
    ('gk_throw', 'mx', 'goalkeeper overhand throw', 13, 64, {'contact': (47 - 13) / 30}, False),
    ('gk_drop_kick', 'mx', 'goalkeeper drop kick', 37, 95, {'contact': (65 - 37) / 30}, False),
    ('gk_miss', 'mx', 'goalkeeper miss', 1, 70, {}, False),
    ('gk_side_left', 'mx', 'goalkeeper sidestep', 1, 17, {}, True),
    ('gk_side_right', 'mx', 'goalkeeper sidestep (2)', 1, 16, {}, True),
    ('header', 'mx', 'header soccerball', 10, 55, {'contact': (30 - 10) / 30}, False),
    ('bicycle_kick', 'mx', 'scissor kick', 4, 84, {'contact': (24 - 4) / 30}, False),
    ('scissor_kick', 'mx', 'scissor kick', 4, 84, {'contact': (24 - 4) / 30}, False),
    ('slide_tackle', 'mx', 'soccer tackle (3)', 1, 70, {'contact': 25 / 30}, False),
    ('fall_hit', 'mx', 'soccer trip', 1, 46, {'endsLying': 'front'}, False),
    ('get_up', 'mx', 'standing up', 1, 51, {}, False),
    ('get_up_front', 'mx', 'standing up', 1, 51, {}, False),
    ('shot', 'mx', 'strike foward jog', 1, 37, {'contact': 14 / 30}, False),
    ('pass_short', 'mx', 'kick soccerball (2)', 1, 16, {'contact': 13 / 30}, False),
    ('penalty_kick', 'mx', 'soccer penalty kick', 1, 46, {'contact': 22 / 30}, False),
    ('throw_in', 'mx', 'throw in', 19, 64, {'contact': (49 - 19) / 30}, False),
    ('idle_ready', 'mx', 'offensive idle', 1, 121, {}, True),
    ('strafe_left', 'mx', 'jog strafe left', 1, 22, {}, True),
    ('strafe_right', 'mx', 'jog strafe right', 1, 23, {}, True),
    ('jog_back', 'mx', 'jog backward', 1, 25, {}, True),
    ('freestyle', 'mx', 'stall soccerball', 1, 99, {}, True),
    ('knee_juggle', 'mx', 'kneeing soccerball', 1, 28, {}, True),
]
poser = Poser(arm)
clips, meta = build()
arm.animation_data_create()
mocap_acts = {}
ual = None
cmu_cache = {}
for name, kind, src, a, b, extra, loop in MOCAP:
    try:
        if kind == 'ual':
            if ual is None: ual = Source('ual', os.path.join(SRCD, 'ual', 'glTF', 'AnimationLibrary_Godot_Standard.gltf'))
            act_src = ual.use(src)
            t0, t1 = 0.0, act_src.frame_range[1] / ual.fps
            act, dur = retarget(arm, ual, name, t0, t1)
        elif kind == 'mx':
            f = os.path.join(SRCD, 'mixamo', 'pack', src + '.fbx')
            if not os.path.exists(f):
                print('mocap ausente (Mixamo)', name); continue
            sm = Source('mixamo', f)
            sm.use()
            act, dur = retarget(arm, sm, name, (a - 1) / 30, (b - 1) / 30)
            sm.dispose()
        else:
            if src not in cmu_cache:
                for c in cmu_cache.values(): c.dispose()
                cmu_cache = {src: Source('cmu', os.path.join(SRCD, 'cmu', 'data', src + '.bvh'))}
            s = cmu_cache[src]
            s.use()
            act, dur = retarget(arm, s, name, (a - 1) / 120, (b - 1) / 120)
        mocap_acts[name] = (act, dur, extra, loop)
        print('mocap', name, round(dur, 2))
    except Exception as e:
        print('mocap FALHOU', name, e)
for c in cmu_cache.values(): c.dispose()
if ual: ual.dispose()
for name, keys in clips.items():
    if name in mocap_acts:
        continue
    act = make_action(arm, poser, name, keys)
    # interpolação: clipes em loop usam bezier; cortes rápidos também
    tr = arm.animation_data.nla_tracks.new()
    tr.name = name
    st = tr.strips.new(name, int(act.frame_range[0]), act)
    tr.mute = True
for name, (act, dur, extra, loop) in mocap_acts.items():
    tr = arm.animation_data.nla_tracks.new()
    tr.name = name
    tr.strips.new(name, 0, act)
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
for k, (act, dur, extra, loop) in mocap_acts.items():
    m = {kk: vv for kk, vv in meta.get(k, {}).items() if kk not in ('contact', 'contact2')}
    m.update(extra); m['loop'] = loop; m['duration'] = round(dur, 4); m['mocap'] = True
    meta[k] = m
json.dump(meta, open(os.path.join(ROOT, 'src', 'data', 'clips.json'), 'w'), indent=1)
print('OK athlete.glb', len(meta), 'clips', len(mocap_acts), 'de captura de movimento')
