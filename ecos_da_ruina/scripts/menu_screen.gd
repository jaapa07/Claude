extends Control
class_name MenuScreen
## Tela de menu genérica: lista navegável por teclado/mouse com painel de informações.

signal closed

var title := ""
var items: Array = []           # {"t": String, "fn": Callable, "en": bool, "info": String|Callable, "l": Callable, "r": Callable}
var sel := 0
var info_default := ""
var can_cancel := true
var list_w := 190.0
var key_capture := ""           # ação aguardando nova tecla
var on_key: Callable = Callable()
var scroll := 0
var footer := "↑↓ navegar  •  E / Enter confirmar  •  Esc voltar"
var ui: Node
var active := true
var dim := 0.88

const VIS := 11
var X0 := 14.0
var Y0 := 14.0
var title_mode := false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	position = Vector2.ZERO
	size = Vector2(480, 270)
	mouse_filter = Control.MOUSE_FILTER_STOP
	Audio.play("ui_ok", -6.0)

func setup(p_title: String, p_items: Array, p_info := "") -> void:
	title = p_title
	items = p_items
	info_default = p_info
	sel = clampi(sel, 0, max(0, items.size() - 1))
	_fix_sel(1)
	if items.size() > 0 and not items[sel].get("en", true):
		for i in items.size():
			if items[i].get("en", true) and not items[i].get("hdr", false):
				sel = i
				break
	queue_redraw()

func set_items(p_items: Array) -> void:
	items = p_items
	sel = clampi(sel, 0, max(0, items.size() - 1))
	queue_redraw()

func _fix_sel(dir: int) -> void:
	if items.is_empty():
		return
	var n := 0
	while n < items.size() and items[sel].get("hdr", false):
		sel = (sel + dir + items.size()) % items.size()
		n += 1

func _input(event: InputEvent) -> void:
	if not active or not visible:
		return
	if key_capture != "":
		if event is InputEventKey and event.pressed and not event.echo:
			get_viewport().set_input_as_handled()
			if event.keycode == KEY_ESCAPE:
				key_capture = ""
			else:
				Game.rebind(key_capture, event.physical_keycode)
				key_capture = ""
				if on_key.is_valid():
					on_key.call()
			queue_redraw()
		return
	if event.is_action_pressed("ui_up"):
		_move(-1)
	elif event.is_action_pressed("ui_down"):
		_move(1)
	elif event.is_action_pressed("ui_left"):
		_side("l")
	elif event.is_action_pressed("ui_right"):
		_side("r")
	elif event.is_action_pressed("ui_accept") or (event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ENTER):
		_activate()
	elif event.is_action_pressed("ui_cancel") or (event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE):
		if can_cancel:
			close()
	elif event is InputEventMouseMotion:
		var i := _item_at(event.position)
		if i >= 0 and i != sel:
			sel = i
			queue_redraw()
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var i2 := _item_at(event.position)
		if i2 >= 0:
			sel = i2
			_activate()
	else:
		return
	get_viewport().set_input_as_handled()

func _item_at(p: Vector2) -> int:
	if title_mode:
		var r := int((p.y - 120.0) / 16.0)
		return r if r >= 0 and r < items.size() and p.x > 160.0 and p.x < 320.0 and items[r].get("en", true) else -1
	if p.x < X0 or p.x > X0 + list_w:
		return -1
	var row := int((p.y - (Y0 + 22.0)) / 16.0)
	if row < 0 or row >= VIS:
		return -1
	var i := scroll + row
	return i if i < items.size() and not items[i].get("hdr", false) else -1

func _move(d: int) -> void:
	if items.is_empty():
		return
	sel = (sel + d + items.size()) % items.size()
	_fix_sel(d)
	_clamp_scroll()
	Audio.play("ui_move", -8.0)
	queue_redraw()

func _clamp_scroll() -> void:
	if sel < scroll:
		scroll = sel
	elif sel >= scroll + VIS:
		scroll = sel - VIS + 1

func _side(which: String) -> void:
	if items.is_empty():
		return
	var it: Dictionary = items[sel]
	if it.has(which) and it[which].is_valid():
		it[which].call()
		Audio.play("ui_move", -8.0)
		queue_redraw()

func _activate() -> void:
	if items.is_empty():
		return
	var it: Dictionary = items[sel]
	if not it.get("en", true):
		Audio.play("puzzle_no", -6.0)
		return
	if it.has("fn") and it["fn"].is_valid():
		Audio.play("ui_ok", -6.0)
		it["fn"].call()
	queue_redraw()

func close() -> void:
	active = false
	Audio.play("ui_back", -6.0)
	closed.emit()
	queue_free()

func _info_text() -> String:
	if items.is_empty():
		return info_default
	var inf = items[sel].get("info", info_default)
	if inf is Callable:
		return inf.call()
	return str(inf)

func _draw() -> void:
	var f: Font = ui.font
	var fs := 10
	if title_mode:
		_draw_title(f)
		return
	draw_rect(Rect2(0, 0, 480, 270), Color(0.05, 0.04, 0.1, dim))
	var pw := list_w + 12.0
	draw_rect(Rect2(X0 - 6, Y0 - 6, pw, 230), Color(0.12, 0.1, 0.2, 0.95))
	draw_rect(Rect2(X0 - 6, Y0 - 6, pw, 230), Color(0.75, 0.6, 0.3), false, 1.0)
	draw_string(f, Vector2(X0, Y0 + 8), title, HORIZONTAL_ALIGNMENT_LEFT, list_w, 11, Color(1.0, 0.85, 0.4))
	draw_line(Vector2(X0, Y0 + 12), Vector2(X0 + list_w - 4, Y0 + 12), Color(0.75, 0.6, 0.3), 1.0)
	for r in VIS:
		var i := scroll + r
		if i >= items.size():
			break
		var it: Dictionary = items[i]
		var y := Y0 + 22.0 + r * 16.0
		if it.get("hdr", false):
			draw_string(f, Vector2(X0, y + 10), it["t"], HORIZONTAL_ALIGNMENT_LEFT, list_w, 9, Color(0.6, 0.7, 0.9))
			continue
		if i == sel:
			draw_rect(Rect2(X0 - 3, y, list_w - 2, 14), Color(0.35, 0.3, 0.6, 0.9))
			draw_rect(Rect2(X0 - 3, y, 2, 14), Color(1.0, 0.85, 0.4))
		var col := Color(1, 1, 1) if it.get("en", true) else Color(0.5, 0.5, 0.55)
		draw_string(f, Vector2(X0 + 2, y + 10), it["t"], HORIZONTAL_ALIGNMENT_LEFT, list_w - 8, fs, col)
	if items.size() > VIS:
		draw_string(f, Vector2(X0 + list_w - 22, Y0 + 8), "%d/%d" % [sel + 1, items.size()], HORIZONTAL_ALIGNMENT_LEFT, 40, 8, Color(0.6, 0.6, 0.7))
	# painel de informações
	var ix := X0 + pw + 4.0
	var iw := 480.0 - ix - 10.0
	draw_rect(Rect2(ix, Y0 - 6, iw, 230), Color(0.1, 0.09, 0.17, 0.95))
	draw_rect(Rect2(ix, Y0 - 6, iw, 230), Color(0.5, 0.45, 0.7), false, 1.0)
	var txt := _info_text()
	draw_multiline_string(f, Vector2(ix + 6, Y0 + 8), txt, HORIZONTAL_ALIGNMENT_LEFT, iw - 12.0, 9, 20, Color(0.92, 0.92, 1.0))
	if key_capture != "":
		draw_rect(Rect2(120, 110, 240, 40), Color(0.05, 0.05, 0.12, 0.98))
		draw_rect(Rect2(120, 110, 240, 40), Color(1, 0.85, 0.4), false, 1.0)
		draw_string(f, Vector2(130, 134), "Pressione a nova tecla (Esc cancela)", HORIZONTAL_ALIGNMENT_LEFT, 220, 10, Color.WHITE)
	draw_string(f, Vector2(X0, 262), footer, HORIZONTAL_ALIGNMENT_LEFT, 450, 8, Color(0.6, 0.6, 0.75))

func _draw_title(f: Font) -> void:
	draw_rect(Rect2(0, 0, 480, 270), Color(0.05, 0.04, 0.1, dim))
	draw_string(f, Vector2(2, 62), "ECOS DA RUÍNA", HORIZONTAL_ALIGNMENT_CENTER, 480, 30, Color(0, 0, 0, 0.8))
	draw_string(f, Vector2(0, 60), "ECOS DA RUÍNA", HORIZONTAL_ALIGNMENT_CENTER, 480, 30, Color(1.0, 0.88, 0.5))
	draw_string(f, Vector2(0, 78), "Capítulo 1 — Floresta dos Esquecidos", HORIZONTAL_ALIGNMENT_CENTER, 480, 11, Color(0.8, 0.85, 1.0))
	var x := 170.0
	var y := 120.0
	draw_rect(Rect2(x - 8, y - 8, 156, items.size() * 16 + 14), Color(0.08, 0.07, 0.16, 0.92))
	draw_rect(Rect2(x - 8, y - 8, 156, items.size() * 16 + 14), Color(0.75, 0.6, 0.3), false, 1.0)
	for i in items.size():
		var it: Dictionary = items[i]
		var yy := y + i * 16.0
		if i == sel:
			draw_rect(Rect2(x - 4, yy, 148, 14), Color(0.35, 0.3, 0.6, 0.9))
			draw_rect(Rect2(x - 4, yy, 2, 14), Color(1.0, 0.85, 0.4))
		var col := Color(1, 1, 1) if it.get("en", true) else Color(0.5, 0.5, 0.55)
		draw_string(f, Vector2(x + 2, yy + 10), it["t"], HORIZONTAL_ALIGNMENT_LEFT, 140, 10, col)
	draw_string(f, Vector2(0, 250), _info_text().get_slice("\n", 0), HORIZONTAL_ALIGNMENT_CENTER, 480, 9, Color(0.85, 0.85, 1.0))
	draw_string(f, Vector2(0, 264), "WASD/setas navegar • E ou Enter confirmar", HORIZONTAL_ALIGNMENT_CENTER, 480, 8, Color(0.6, 0.6, 0.75))
