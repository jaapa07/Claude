extends CanvasLayer
class_name TouchControls
## Controles de toque para celular (iPhone/Android pelo navegador).
## Analógico virtual à esquerda (aparece onde o polegar toca) e botões à direita que acionam as mesmas ações do teclado.

const RADIUS := 26.0
const DEAD := 0.18

var main: Node
var _stick_idx := -1
var _stick_center := Vector2.ZERO
var _base: Sprite2D
var _knob: Sprite2D
var _buttons: Array = []
var _root: Node2D
var enabled := false
static var active := false
static var instance: TouchControls

## [ícone, nome, o que faz] — legenda mostrada na primeira partida e pelo menu de pausa
const LEGEND := [
	[-1, "Polegar esquerdo", "arraste para andar"],
	[0, "Espada", "atacar (segure: golpe forte)"],
	[1, "Escudo", "defender (segure)"],
	[2, "Setas", "esquivar"],
	[3, "E", "falar, abrir, pegar"],
	[5, "Selo", "mirar e lançar (capturar)"],
	[4, "Estrela", "habilidade da criatura"],
	[6, "Troca", "trocar de criatura"],
	[8, "Tônico", "curar"],
	[7, "Menu", "pausa, equipe, mapa, salvar"],
]
var _legend: Control
var _legend_layer: CanvasLayer

# [ícone (coluna em touch_buttons.png), ação, centro (x, y) na tela 480x270, escala]
const LAYOUT := [
	[0, "attack", Vector2(440, 228), 1.25],
	[2, "dodge", Vector2(404, 248), 1.0],
	[1, "guard", Vector2(452, 192), 1.0],
	[3, "interact", Vector2(406, 212), 1.0],
	[4, "skill", Vector2(368, 240), 1.0],
	[5, "capture", Vector2(372, 206), 1.0],
	[6, "swap", Vector2(426, 84), 0.85],
	[8, "consumable", Vector2(396, 84), 0.85],
	[7, "pause", Vector2(456, 84), 0.85],
]

func _ready() -> void:
	instance = self
	layer = 9
	process_mode = Node.PROCESS_MODE_ALWAYS
	_root = Node2D.new()
	add_child(_root)
	_base = Sprite2D.new()
	_base.texture = _empty_button()
	_base.scale = Vector2(2, 2)
	_base.modulate = Color(1, 1, 1, 0.55)
	_base.visible = false
	_root.add_child(_base)
	_knob = Sprite2D.new()
	_knob.texture = Art.sprite_tex("touch_knob")
	_knob.scale = Vector2(1.5, 1.5)
	_knob.modulate = Color(1, 1, 1, 0.85)
	_knob.visible = false
	_root.add_child(_knob)
	for b in LAYOUT:
		var t := TouchScreenButton.new()
		t.texture_normal = Art.region("touch_buttons", int(b[0]) * 28, 0, 28, 28)
		t.action = b[1]
		t.scale = Vector2.ONE * float(b[3])
		t.position = b[2] - Vector2(14, 14) * float(b[3])
		t.modulate = Color(1, 1, 1, 0.8)
		t.passby_press = false
		var shape := CircleShape2D.new()
		shape.radius = 15.0
		t.shape = shape
		t.shape_centered = true
		_root.add_child(t)
		_buttons.append(t)
	if DisplayServer.is_touchscreen_available() or OS.has_feature("web_ios") or OS.has_feature("web_android"):
		_enable()
	_root.visible = enabled

## No toque, o clique de mouse emulado não pode atacar/defender nem mirar
func _enable() -> void:
	enabled = true
	active = true
	for act in ["attack", "guard"]:
		for ev in InputMap.action_get_events(act):
			if ev is InputEventMouseButton:
				InputMap.action_erase_event(act, ev)

func _empty_button() -> Texture2D:
	# a moldura do botão sem ícone: recorta a borda de um botão e cobre o ícone com o miolo
	var img := Art.sprite_tex("touch_buttons").get_image().get_region(Rect2i(7 * 28, 0, 28, 28))
	var fill := img.get_pixel(5, 14)
	for y in range(5, 23):
		for x in range(5, 23):
			img.set_pixel(x, y, fill)
	return ImageTexture.create_from_image(img)

func show_legend() -> void:
	if _legend != null:
		return
	_legend = Control.new()
	_legend.size = Vector2(480, 270)
	_legend.mouse_filter = Control.MOUSE_FILTER_STOP
	var bg := ColorRect.new()
	bg.color = Color(0.04, 0.03, 0.08, 0.88)
	bg.size = Vector2(480, 270)
	_legend.add_child(bg)
	var panel := UIKit.panel(Vector2(40, 8), Vector2(400, 254))
	panel.position = Vector2(40, 8)
	panel.size = Vector2(400, 254)
	_legend.add_child(panel)
	var title := Fonts.label("Botões do toque", 8, Color(1, 0.85, 0.45))
	title.position = Vector2(14, 8)
	panel.add_child(title)
	for i in LEGEND.size():
		var row: Array = LEGEND[i]
		var y := 24.0 + i * 20.0
		if int(row[0]) >= 0:
			var ic := Sprite2D.new()
			ic.texture = Art.region("touch_buttons", int(row[0]) * 28, 0, 28, 28)
			ic.scale = Vector2(0.65, 0.65)
			ic.position = Vector2(26, y + 8)
			panel.add_child(ic)
		else:
			var kn := Sprite2D.new()
			kn.texture = Art.sprite_tex("touch_knob")
			kn.position = Vector2(26, y + 8)
			panel.add_child(kn)
		var l := Fonts.label("%s: %s" % [row[1], row[2]], 7, Color(0.92, 0.95, 1.0))
		l.position = Vector2(46, y + 4)
		l.size = Vector2(344, 10)
		panel.add_child(l)
	var foot := Fonts.label("Toque para continuar  (Menu > Botões do toque)", 7, Color(0.7, 1.0, 0.75))
	foot.position = Vector2(14, 230)
	panel.add_child(foot)
	_root.visible = false
	_legend_layer = CanvasLayer.new()
	_legend_layer.layer = 60
	_legend_layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(_legend_layer)
	_legend_layer.add_child(_legend)
	get_tree().paused = true

func _close_legend() -> void:
	if _legend == null:
		return
	_legend_layer.queue_free()
	_legend = null
	get_tree().paused = main != null and (main.ui.has_screen() or main.ui.is_modal())
	Game.set_flag("viu_legenda_toque")

func _process(_delta: float) -> void:
	if _legend != null:
		return
	if enabled and main != null and Game.in_game and not Game.has_flag("viu_legenda_toque") and not main.ui.has_screen() and not main.ui.is_modal() and Game.play_time > 1.0:
		show_legend()
		return
	var hide: bool = main == null or not Game.in_game or main.ui.has_screen() or main.ui.is_modal()
	_root.visible = enabled and not hide
	if hide and _stick_idx != -1:
		_release_stick()

func _input(event: InputEvent) -> void:
	if _legend != null:
		if (event is InputEventScreenTouch and not event.pressed) or (event is InputEventKey and event.pressed) or (event is InputEventMouseButton and not event.pressed):
			_close_legend()
		get_viewport().set_input_as_handled()
		return
	if event is InputEventScreenTouch and not enabled:
		_enable()
	if enabled and _root.visible and event is InputEventMouseButton:
		get_viewport().set_input_as_handled()     # clique emulado do toque não mira nem ataca
		return
	if not _root.visible:
		return
	if event is InputEventScreenTouch:
		if event.pressed and _stick_idx == -1 and event.position.x < 200.0 and event.position.y > 80.0:
			_stick_idx = event.index
			_stick_center = event.position
			_base.position = _stick_center
			_knob.position = _stick_center
			_base.visible = true
			_knob.visible = true
			get_viewport().set_input_as_handled()
		elif not event.pressed and event.index == _stick_idx:
			_release_stick()
			get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag and event.index == _stick_idx:
		var v: Vector2 = event.position - _stick_center
		if v.length() > RADIUS:
			v = v.normalized() * RADIUS
		_knob.position = _stick_center + v
		_apply(v / RADIUS)
		get_viewport().set_input_as_handled()

func _apply(v: Vector2) -> void:
	for a in ["move_left", "move_right", "move_up", "move_down"]:
		Input.action_release(a)
	if v.length() < DEAD:
		return
	if v.x > 0.05: Input.action_press("move_right", v.x)
	elif v.x < -0.05: Input.action_press("move_left", -v.x)
	if v.y > 0.05: Input.action_press("move_down", v.y)
	elif v.y < -0.05: Input.action_press("move_up", -v.y)

func _release_stick() -> void:
	_stick_idx = -1
	_base.visible = false
	_knob.visible = false
	_apply(Vector2.ZERO)
