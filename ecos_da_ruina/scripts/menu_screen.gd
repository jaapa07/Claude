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
	_refresh()

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
	_refresh()

func set_items(p_items: Array) -> void:
	items = p_items
	sel = clampi(sel, 0, max(0, items.size() - 1))
	_refresh()

func _fix_sel(dir: int) -> void:
	if items.is_empty():
		return
	var n := 0
	while n < items.size() and (items[sel].get("hdr", false) or (title_mode and not items[sel].get("en", true))):
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
			_refresh()
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
			_refresh()
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
	var row := int((p.y - (Y0 + 19.0)) / 16.0)
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
	_refresh()

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
		_refresh()

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
	_refresh()

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

# =============================================================== MONTAGEM (nós e arte autoral; nada de _draw)
var _built := false
var _dim: ColorRect
var _list_panel: NinePatchRect
var _title_lab: Label
var _rows: Array = []
var _sel_bar: NinePatchRect
var _cursor: TextureRect
var _count_lab: Label
var _info_panel: NinePatchRect
var _info_lab: Label
var _foot_lab: Label
var _info_icon: TextureRect
var _key_panel: NinePatchRect
var _logo: Label
var _sub: Label

func _build() -> void:
	_built = true
	_dim = ColorRect.new(); _dim.size = Vector2(480, 270); _dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_dim)
	_list_panel = UIKit.panel(Vector2.ZERO, Vector2(10, 10)); add_child(_list_panel)
	_sel_bar = UIKit.panel(Vector2.ZERO, Vector2(10, 14)); _sel_bar.modulate = Color(0.75, 0.7, 1.2); add_child(_sel_bar)
	_cursor = TextureRect.new(); _cursor.texture = Art.sprite_tex("fx_target"); _cursor.rotation = -PI / 2.0
	_cursor.mouse_filter = Control.MOUSE_FILTER_IGNORE; add_child(_cursor)
	_title_lab = Fonts.label("", 11, Color(1.0, 0.85, 0.4)); add_child(_title_lab)
	for i in VIS:
		var l := Fonts.label("", 10)
		l.clip_text = true
		add_child(l)
		_rows.append(l)
	_count_lab = Fonts.label("", 8, Color(0.6, 0.6, 0.75)); add_child(_count_lab)
	_info_panel = UIKit.panel(Vector2.ZERO, Vector2(10, 10)); add_child(_info_panel)
	_info_lab = Fonts.label("", 9, Color(0.92, 0.92, 1.0)); _info_lab.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_info_panel.add_child(_info_lab)
	_foot_lab = Fonts.label("", 8, Color(0.65, 0.65, 0.8)); add_child(_foot_lab)
	_info_icon = TextureRect.new(); _info_icon.scale = Vector2(2, 2); _info_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_info_panel.add_child(_info_icon)
	_key_panel = UIKit.panel(Vector2(110, 110), Vector2(260, 30)); _key_panel.visible = false
	var kl := Fonts.label("Pressione a nova tecla (Esc cancela)", 10); kl.position = Vector2(12, 8); _key_panel.add_child(kl)
	add_child(_key_panel)
	_logo = Fonts.label("ECOS DA RUÍNA", 24, Color(1.0, 0.88, 0.5)); _logo.size = Vector2(480, 36)
	_logo.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _logo.position = Vector2(0, 30); _logo.visible = false
	_logo.add_theme_constant_override("outline_size", 6); add_child(_logo)
	_sub = Fonts.label("Os cinco guardiões de Auralis", 11, Color(0.8, 0.85, 1.0)); _sub.size = Vector2(480, 14)
	_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _sub.position = Vector2(0, 70); _sub.visible = false; add_child(_sub)

func _refresh() -> void:
	if not is_inside_tree():
		return
	if not _built:
		_build()
	_dim.color = Color(0.05, 0.04, 0.1, dim)
	_key_panel.visible = key_capture != ""
	_foot_lab.text = footer
	if TouchControls.active and footer.begins_with("↑↓ navegar"):
		_foot_lab.text = "Toque no item ou nas setas  •  OK confirma  •  Voltar volta"
	if title_mode:
		_logo.visible = true; _sub.visible = true
		_title_lab.visible = false; _info_panel.visible = false; _count_lab.visible = false
		var x := 170.0; var y := 120.0
		_list_panel.position = Vector2(x - 10, y - 8); _list_panel.size = Vector2(160, items.size() * 16 + 14)
		for r in VIS:
			var l: Label = _rows[r]
			l.visible = r < items.size()
			if r < items.size():
				var it: Dictionary = items[r]
				l.text = it["t"]; l.position = Vector2(x + 4, y + r * 16.0); l.size = Vector2(140, 14)
				l.modulate = Color.WHITE if it.get("en", true) else Color(0.5, 0.5, 0.55)
		_sel_bar.visible = true; _cursor.visible = true
		_sel_bar.position = Vector2(x - 4, y + sel * 16.0 - 1); _sel_bar.size = Vector2(148, 15)
		_cursor.position = Vector2(x - 10, y + sel * 16.0 + 10)
		_foot_lab.text = _info_text().get_slice("\n", 0)
		_foot_lab.position = Vector2(0, 248); _foot_lab.size = Vector2(480, 12); _foot_lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		return
	_logo.visible = false; _sub.visible = false
	var pw := list_w + 12.0
	_list_panel.position = Vector2(X0 - 6, Y0 - 6); _list_panel.size = Vector2(pw, 232)
	_title_lab.text = title; _title_lab.position = Vector2(X0, Y0 - 2); _title_lab.size = Vector2(list_w, 14)
	for r in VIS:
		var i := scroll + r
		var l: Label = _rows[r]
		l.visible = i < items.size()
		if i >= items.size():
			continue
		var it: Dictionary = items[i]
		l.text = it["t"]
		l.position = Vector2(X0 + 4, Y0 + 20.0 + r * 16.0)
		l.size = Vector2(list_w - 8, 14)
		if it.get("hdr", false):
			l.add_theme_font_size_override("font_size", 8)
			l.modulate = Color(0.6, 0.72, 1.0)
		else:
			l.add_theme_font_size_override("font_size", 8)
			var base_col: Color = it.get("col", Color.WHITE)
			l.modulate = base_col if it.get("en", true) else base_col.darkened(0.5)
	var row := sel - scroll
	_sel_bar.visible = row >= 0 and row < VIS and not items.is_empty()
	_sel_bar.position = Vector2(X0 - 2, Y0 + 19.0 + row * 16.0); _sel_bar.size = Vector2(list_w - 2, 15)
	_cursor.visible = _sel_bar.visible
	_cursor.position = Vector2(X0 - 9, Y0 + 30.0 + row * 16.0)
	_count_lab.visible = items.size() > VIS
	_count_lab.text = "%d/%d" % [sel + 1, items.size()]
	_count_lab.position = Vector2(X0 + list_w - 34, Y0 + 210)
	var ix := X0 + pw + 2.0
	var iw := 480.0 - ix - 8.0
	_info_panel.visible = true
	_info_panel.position = Vector2(ix, Y0 - 6); _info_panel.size = Vector2(iw, 232)
	_info_lab.position = Vector2(8, 6); _info_lab.size = Vector2(iw - 16, 220)
	_info_lab.text = _info_text()
	var cur: Dictionary = items[sel] if (sel >= 0 and sel < items.size()) else {}
	var icon = cur.get("icon")
	_info_icon.visible = icon != null
	if icon != null:
		_info_icon.texture = icon
		_info_icon.position = Vector2(iw - 42, 6)
	_info_lab.modulate = cur.get("icol", Color.WHITE)
	_foot_lab.position = Vector2(X0, 254); _foot_lab.size = Vector2(450, 12); _foot_lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
