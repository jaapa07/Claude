extends Node2D
## Camada visual do clima: partículas (CPUParticles2D, compatíveis com web/gl_compatibility) que espalham os
## sprites desenhados à mão em assets/src/80_clima.pxl, presas à tela/câmera; tom do mundo por CanvasModulate;
## ícone do clima no canto do HUD. Nada é desenhado por código. Trocas de clima fazem transição suave.

const FADE := 3.0          # segundos da transição entre climas
const SW := 480.0
const SH := 270.0

var tint: CanvasModulate
var layer: CanvasLayer
var hud_layer: CanvasLayer
var groups := {}           # clima -> Node2D com as partículas
var weight := {}           # clima -> 0..1 (visibilidade atual)
var target := ""
var icon: TextureRect
var icon_panel: NinePatchRect
var icon_lab: Label
var shown_icon := ""

func _ready() -> void:
	tint = CanvasModulate.new()
	tint.color = Color.WHITE
	add_child(tint)
	layer = CanvasLayer.new()
	layer.layer = 4          # acima do mundo, abaixo da escuridão do Cervo (5) e da interface (10)
	add_child(layer)
	_build_rain()
	_build_snow()
	_build_cold()
	_build_heat()
	_build_sun()
	_build_fog()
	for k in groups:
		weight[k] = 0.0
		groups[k].modulate.a = 0.0
		groups[k].visible = false
		_set_emitting(groups[k], false)
	hud_layer = CanvasLayer.new()
	hud_layer.layer = 9
	add_child(hud_layer)
	icon_panel = UIKit.panel(Vector2(396, 44), Vector2(80, 20))
	icon_panel.visible = false
	hud_layer.add_child(icon_panel)
	icon = TextureRect.new()
	icon.size = Vector2(16, 16)
	icon.position = Vector2(3, 2)
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	icon_panel.add_child(icon)
	icon_lab = Fonts.label("", 7, Color(0.85, 0.92, 1.0))
	icon_lab.position = Vector2(21, 6)
	icon_lab.size = Vector2(56, 10)
	icon_lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon_panel.add_child(icon_lab)

# =============================================================== CONSTRUÇÃO DAS PARTÍCULAS
func _ramp(peak := 1.0) -> Gradient:
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 0))
	g.set_color(1, Color(1, 1, 1, 0))
	g.add_point(0.2, Color(1, 1, 1, peak))
	g.add_point(0.8, Color(1, 1, 1, peak))
	return g

## Emissor com folha de quadros (h_frames). `anim` > 0 anima ao longo da vida; senão sorteia um quadro.
func _emitter(parent: Node, tex: Texture2D, frames: int, amount: int, life: float, anim := 0.0) -> CPUParticles2D:
	var p := CPUParticles2D.new()
	p.texture = tex
	p.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	p.amount = amount
	p.lifetime = life
	p.preprocess = life
	p.local_coords = false
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.gravity = Vector2.ZERO
	var m := CanvasItemMaterial.new()
	m.particles_animation = true
	m.particles_anim_h_frames = frames
	m.particles_anim_v_frames = 1
	m.particles_anim_loop = false
	p.material = m
	if anim > 0.0:
		p.anim_speed_min = anim
		p.anim_speed_max = anim
	elif frames > 1:
		p.anim_offset_min = 0.0
		p.anim_offset_max = 1.0
	parent.add_child(p)
	return p

func _group(id: String) -> Node2D:
	var g := Node2D.new()
	g.name = id
	layer.add_child(g)
	groups[id] = g
	return g

func _build_rain() -> void:
	var g := _group("chuva")
	var drops := _emitter(g, Art.sprite_tex("clima_chuva"), 3, 150, 0.85)
	drops.position = Vector2(SW * 0.5 + 40.0, -16.0)
	drops.emission_rect_extents = Vector2(SW * 0.5 + 60.0, 6.0)
	drops.direction = Vector2(-0.2, 1.0)
	drops.spread = 1.5
	drops.initial_velocity_min = 300.0
	drops.initial_velocity_max = 360.0
	var splash := _emitter(g, Art.sprite_tex("clima_respingo"), 4, 46, 0.32, 1.0)
	splash.position = Vector2(SW * 0.5, SH * 0.5 + 10.0)
	splash.emission_rect_extents = Vector2(SW * 0.5, SH * 0.5 - 6.0)
	splash.initial_velocity_min = 0.0
	splash.initial_velocity_max = 0.0

func _build_snow() -> void:
	var g := _group("neve")
	var flakes := _emitter(g, Art.sprite_tex("clima_neve"), 4, 110, 8.0)
	flakes.position = Vector2(SW * 0.5, -10.0)
	flakes.emission_rect_extents = Vector2(SW * 0.5 + 60.0, 6.0)
	flakes.direction = Vector2(-0.25, 1.0)
	flakes.spread = 22.0
	flakes.initial_velocity_min = 22.0
	flakes.initial_velocity_max = 42.0
	flakes.color_ramp = _ramp()
	# sopro lateral leve: os flocos desviam devagar
	flakes.tangential_accel_min = -3.0
	flakes.tangential_accel_max = 3.0

func _build_cold() -> void:
	var g := _group("frio")
	var glint := _emitter(g, Art.sprite_tex("clima_geada"), 3, 26, 1.8)
	glint.position = Vector2(SW * 0.5, SH * 0.5)
	glint.emission_rect_extents = Vector2(SW * 0.5, SH * 0.5)
	glint.initial_velocity_min = 0.0
	glint.initial_velocity_max = 3.0
	glint.color_ramp = _ramp(0.9)
	var few := _emitter(g, Art.sprite_tex("clima_neve"), 4, 22, 9.0)
	few.position = Vector2(SW * 0.5, -10.0)
	few.emission_rect_extents = Vector2(SW * 0.5 + 60.0, 6.0)
	few.direction = Vector2(-0.4, 1.0)
	few.spread = 25.0
	few.initial_velocity_min = 18.0
	few.initial_velocity_max = 30.0
	few.color_ramp = _ramp(0.8)

func _build_heat() -> void:
	var g := _group("calor")
	var t := Art.sprite_tex("clima_calor")
	var haze := _emitter(g, Art.atlas(t, 0, 0, 8, 12), 1, 34, 3.2)
	haze.position = Vector2(SW * 0.5, SH * 0.5 + 20.0)
	haze.emission_rect_extents = Vector2(SW * 0.5, SH * 0.5)
	haze.direction = Vector2(0, -1)
	haze.spread = 8.0
	haze.initial_velocity_min = 6.0
	haze.initial_velocity_max = 14.0
	haze.color_ramp = _ramp(0.85)
	var motes := _emitter(g, Art.atlas(t, 8, 0, 24, 12), 3, 40, 4.5)
	motes.position = Vector2(SW * 0.5, SH * 0.5 + 20.0)
	motes.emission_rect_extents = Vector2(SW * 0.5, SH * 0.5)
	motes.direction = Vector2(0.3, -1)
	motes.spread = 40.0
	motes.initial_velocity_min = 4.0
	motes.initial_velocity_max = 12.0
	motes.color_ramp = _ramp()

func _build_sun() -> void:
	var g := _group("sol")
	var beams := _emitter(g, Art.sprite_tex("clima_sol"), 1, 5, 9.0)
	beams.position = Vector2(SW * 0.5, 48.0)
	beams.emission_rect_extents = Vector2(SW * 0.5, 30.0)
	beams.direction = Vector2(-1, 0)
	beams.spread = 0.0
	beams.initial_velocity_min = 2.0
	beams.initial_velocity_max = 5.0
	beams.scale_amount_min = 2.0
	beams.scale_amount_max = 2.0
	beams.color_ramp = _ramp()
	var pollen := _emitter(g, Art.sprite_tex("clima_polen"), 2, 22, 5.0)
	pollen.position = Vector2(SW * 0.5, SH * 0.5)
	pollen.emission_rect_extents = Vector2(SW * 0.5, SH * 0.5)
	pollen.direction = Vector2(0.5, -1)
	pollen.spread = 60.0
	pollen.initial_velocity_min = 3.0
	pollen.initial_velocity_max = 9.0
	pollen.color_ramp = _ramp(0.9)

func _build_fog() -> void:
	var g := _group("neblina")
	var puffs := _emitter(g, Art.sprite_tex("clima_nevoa"), 2, 16, 24.0)
	puffs.position = Vector2(-70.0, SH * 0.5)
	puffs.emission_rect_extents = Vector2(40.0, SH * 0.5 + 10.0)
	puffs.direction = Vector2(1, 0)
	puffs.spread = 3.0
	puffs.initial_velocity_min = 22.0
	puffs.initial_velocity_max = 30.0
	puffs.scale_amount_min = 3.0
	puffs.scale_amount_max = 3.0
	puffs.color_ramp = _ramp()

func _set_emitting(g: Node, on: bool) -> void:
	for p in g.get_children():
		if p is CPUParticles2D and p.emitting != on:
			if on:
				p.restart()
			p.emitting = on

# =============================================================== ESTADO
func _group_for(id: String) -> String:
	return "neve" if id == "neve" else id

## Define o clima visível. `instant` (troca de mapa) aparece já cheio; senão faz a transição.
func apply(id: String, instant: bool) -> void:
	target = _group_for(id)
	if instant:
		for k in groups:
			var on: bool = k == target
			weight[k] = 1.0 if on else 0.0
			groups[k].modulate.a = weight[k]
			groups[k].visible = on
			_set_emitting(groups[k], false)
			if on:
				_set_emitting(groups[k], true)
		tint.color = _tone(id)
	_update_icon(id)
	_update_icon_visibility()

func _tone(id: String) -> Color:
	if id == "":
		return Color.WHITE
	return Color(str(Weather.climates().get(id, {}).get("tom", "#ffffff")))

func _process(delta: float) -> void:
	var step := delta / FADE
	for k in groups:
		var want := 1.0 if k == target else 0.0
		var w: float = move_toward(float(weight[k]), want, step)
		weight[k] = w
		var g: Node2D = groups[k]
		g.modulate.a = w
		if w > 0.0 and not g.visible:
			g.visible = true
			_set_emitting(g, true)
		elif w <= 0.0 and g.visible:
			g.visible = false
			_set_emitting(g, false)
	var want_tone := _tone(Weather.now())
	tint.color = tint.color.lerp(want_tone, clamp(step * 2.0, 0.0, 1.0))
	_update_icon_visibility()

func _update_icon(id: String) -> void:
	shown_icon = id
	if id == "":
		return
	var c: Dictionary = Weather.climates().get(id, {})
	icon.texture = Art.region(str(c.get("folha", "clima_icones")), int(c.get("icone", 0)) * 16, 0, 16, 16)
	icon_lab.text = Weather.short_name(id)

func _update_icon_visibility() -> void:
	var vis := shown_icon != "" and Game.in_game
	var w: Node = Weather.world
	if vis and w != null and w.ui != null and w.ui.get("hud") != null:
		var hud: Node = w.ui.hud
		vis = not hud.hud_hidden and w.visible
	icon_panel.visible = vis
