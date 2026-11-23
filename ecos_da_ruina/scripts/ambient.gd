extends Node2D
class_name Ambient
## Ambiente vivo por região: poucas partículas leves (CPUParticles2D, boas para o iPhone) espalhando sprites
## desenhados à mão em assets/src/92_animacao.pxl. Folhas caindo na Floresta, brasas nas Minas, vagalumes no
## Pântano, poeira dourada na Fortaleza, partículas do vazio na Catedral e brilhos sobre a água de qualquer mapa.
## O emissor acompanha a câmera, mas as partículas ficam no mundo (não "grudam" na tela ao andar).

var world: Node
var _air: CPUParticles2D
var _glint: CPUParticles2D
var _region := ""

const INTERIORES := ["casa_maru", "loja_ysa", "casa_corvelo", "casa_tobi"]

## Região do mapa pela lista de regions.json
static func region_of(map_id: String) -> String:
	for rid in Data.regions:
		if map_id in Data.regions[rid].get("mapas", []):
			return rid
	return ""

func _ready() -> void:
	z_index = 30
	z_as_relative = false

func rebuild(map_id: String) -> void:
	for c in get_children():
		c.queue_free()
	_air = null
	_glint = null
	if world == null or not world.deco_ok():
		return
	_region = region_of(map_id)
	if map_id in INTERIORES:
		_air = _emitter("amb_cisco", 3, 6, 6.0)
		_air.emission_rect_extents = Vector2(240, 135)
		_air.direction = Vector2(0.3, -1)
		_air.spread = 60.0
		_air.initial_velocity_min = 2.0
		_air.initial_velocity_max = 5.0
		_air.color_ramp = _ramp(Color(1.0, 0.95, 0.8), 0.6)
	else:
		match _region:
			"floresta":
				_air = _emitter("amb_folha", 4, 16, 7.0, 2.0)
				_air.emission_rect_extents = Vector2(260, 150)
				_air.direction = Vector2(-0.45, 1)
				_air.spread = 15.0
				_air.initial_velocity_min = 9.0
				_air.initial_velocity_max = 16.0
				_air.gravity = Vector2(0, 3)
				_air.color_ramp = _ramp(Color.WHITE, 0.95)
			"minas":
				_air = _emitter("amb_brasa", 4, 14, 3.2, 1.0)
				_air.emission_rect_extents = Vector2(250, 145)
				_air.direction = Vector2(0.15, -1)
				_air.spread = 25.0
				_air.initial_velocity_min = 8.0
				_air.initial_velocity_max = 22.0
				_air.gravity = Vector2(0, -6)
				_air.color_ramp = _ramp(Color.WHITE, 1.0)
			"pantano":
				_air = _emitter("amb_vagalume", 4, 12, 5.0, 4.0)
				_air.emission_rect_extents = Vector2(250, 140)
				_air.direction = Vector2(1, 0)
				_air.spread = 180.0
				_air.initial_velocity_min = 3.0
				_air.initial_velocity_max = 9.0
				_air.color_ramp = _ramp(Color.WHITE, 1.0)
			"fortaleza":
				_air = _emitter("amb_cisco", 3, 12, 6.0)
				_air.emission_rect_extents = Vector2(250, 145)
				_air.direction = Vector2(1, -0.2)
				_air.spread = 30.0
				_air.initial_velocity_min = 5.0
				_air.initial_velocity_max = 11.0
				_air.color_ramp = _ramp(Color(1.0, 0.92, 0.7), 0.8)
			"catedral":
				_air = _emitter("amb_vazio", 4, 14, 4.5, 1.0)
				_air.emission_rect_extents = Vector2(250, 145)
				_air.direction = Vector2(0, -1)
				_air.spread = 35.0
				_air.initial_velocity_min = 4.0
				_air.initial_velocity_max = 10.0
				_air.gravity = Vector2(0, -3)
				_air.color_ramp = _ramp(Color.WHITE, 0.9)
	_build_glints()
	# a câmera só chega à nova posição no quadro seguinte: o céu de partículas é preenchido depois disso
	get_tree().create_timer(0.05, false).timeout.connect(_refill)

func _refill() -> void:
	_follow()
	for c in get_children():
		if c is CPUParticles2D and not c.is_queued_for_deletion():
			c.restart()

## Brilhos sobre a água: pontos de emissão nas células de água do mapa (amostra limitada).
func _build_glints() -> void:
	var pts := PackedVector2Array()
	var cells := 0
	for y in world.H:
		for x in world.W:
			var p := Vector2(x * 16.0 + 8.0, y * 16.0 + 8.0)
			if world.is_watery(p) or world.tile_char_at(p) == "~":
				cells += 1
				var h: int = ((x * 73856093) ^ (y * 19349663)) & 0xffff
				pts.append(p + Vector2(float(h % 11) - 5.0, float((h / 11) % 9) - 4.0))
	if cells == 0:
		return
	if pts.size() > 600:
		var step := int(ceil(pts.size() / 600.0))
		var sub := PackedVector2Array()
		for i in range(0, pts.size(), step):
			sub.append(pts[i])
		pts = sub
	_glint = _emitter("amb_brilho", 4, clampi(cells / 14, 3, 40), 1.3, 1.0)
	_glint.local_coords = true
	_glint.top_level = true
	_glint.global_position = Vector2.ZERO
	_glint.preprocess = 0.0
	_glint.emission_shape = CPUParticles2D.EMISSION_SHAPE_POINTS
	_glint.emission_points = pts
	_glint.initial_velocity_min = 0.0
	_glint.initial_velocity_max = 0.0
	_glint.z_index = -1
	_glint.z_as_relative = false
	_glint.color_ramp = _ramp(Color.WHITE, 0.85)

func _emitter(sheet: String, frames: int, amount: int, life: float, anim := 0.0) -> CPUParticles2D:
	var p := CPUParticles2D.new()
	p.texture = Art.sprite_tex(sheet)
	p.amount = amount
	p.lifetime = life
	p.preprocess = life
	p.local_coords = false
	p.randomness = 0.5
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.gravity = Vector2.ZERO
	var m := CanvasItemMaterial.new()
	m.particles_animation = true
	m.particles_anim_h_frames = frames
	m.particles_anim_v_frames = 1
	m.particles_anim_loop = anim > 1.0
	p.material = m
	if anim > 0.0:
		p.anim_speed_min = anim
		p.anim_speed_max = anim
	else:
		p.anim_offset_min = 0.0
		p.anim_offset_max = 1.0
	add_child(p)
	return p

func _ramp(col: Color, peak: float) -> Gradient:
	var g := Gradient.new()
	g.set_color(0, Color(col.r, col.g, col.b, 0.0))
	g.set_color(1, Color(col.r, col.g, col.b, 0.0))
	g.add_point(0.2, Color(col.r, col.g, col.b, peak))
	g.add_point(0.75, Color(col.r, col.g, col.b, peak))
	return g

func _process(_delta: float) -> void:
	_follow()

func _follow() -> void:
	if _air != null and world != null and world.camera != null:
		_air.global_position = world.camera.get_screen_center_position()
