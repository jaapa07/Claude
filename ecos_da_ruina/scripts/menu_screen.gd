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
			var it2: Dictionary = items[i2]
			# valores ajustáveis (volume etc.): tocar na metade esquerda diminui, na direita aumenta
			if not it2.has("fn") and (it2.has("l") or it2.has("r")):
				_side("l" if event.position.x < X0 + list_w * 0.5 else "r")
			else:
				_activate()
		elif _built and _info_panel.visible and Rect2(_info_panel.position, _info_panel.size).has_point(event.position):
			info_flip(1)
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
	elif _built and info_flip(-1 if which == "l" else 1):
		Audio.play("ui_move", -10.0)

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
var _row_icons: Array = []
var _sel_bar: NinePatchRect
var _cursor: TextureRect
var _count_lab: Label
var _info_panel: NinePatchRect
var _info_glow: NinePatchRect
var _info_lab: Label
var _info_page_lab: Label
var _foot_lab: Label
var _info_icon: TextureRect
var _key_panel: NinePatchRect
var _logo: Label
var _sub: Label
var _up_arrow: Label
var _down_arrow: Label
var _info_pages: Array = []
var _info_page := 0
var _info_src := ""
var _info_t := 0.0
var _t := 0.0
const INFO_PAGE_SECS := 5.0

func _build() -> void:
	_built = true
	_dim = ColorRect.new(); _dim.size = Vector2(480, 270); _dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_dim)
	_list_panel = UIKit.panel(Vector2.ZERO, Vector2(16, 16)); add_child(_list_panel)
	_sel_bar = UIKit.sel_bar(); add_child(_sel_bar)
	_cursor = TextureRect.new(); _cursor.texture = Art.sprite_tex("fx_target"); _cursor.rotation = -PI / 2.0
	_cursor.mouse_filter = Control.MOUSE_FILTER_IGNORE; add_child(_cursor)
	_title_lab = Fonts.label("", 11, Color(1.0, 0.85, 0.4)); _title_lab.clip_text = true
	_title_lab.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS; add_child(_title_lab)
	for i in VIS:
		var l := Fonts.label("", 10)
		l.clip_text = true
		l.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		add_child(l)
		_rows.append(l)
		var ic := TextureRect.new(); ic.mouse_filter = Control.MOUSE_FILTER_IGNORE
		ic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE; ic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		ic.size = Vector2(12, 12); ic.visible = false
		add_child(ic)
		_row_icons.append(ic)
	_up_arrow = Fonts.label("▲", 8, Color(1, 0.85, 0.45)); add_child(_up_arrow)
	_down_arrow = Fonts.label("▼", 8, Color(1, 0.85, 0.45)); add_child(_down_arrow)
	_count_lab = Fonts.label("", 8, Color(0.6, 0.6, 0.75)); add_child(_count_lab)
	_info_panel = UIKit.panel(Vector2.ZERO, Vector2(16, 16)); add_child(_info_panel)
	_info_glow = UIKit.panel(Vector2.ZERO, Vector2(16, 16), UIKit.FR_GLOW); _info_glow.visible = false; add_child(_info_glow)
	_info_lab = Fonts.label("", 9, Color(0.92, 0.92, 1.0))
	_info_panel.add_child(_info_lab)
	_info_page_lab = Fonts.label("", 7, Color(0.7, 0.75, 1.0)); _info_panel.add_child(_info_page_lab)
	_foot_lab = Fonts.label("", 8, Color(0.65, 0.65, 0.8)); _foot_lab.clip_text = true; add_child(_foot_lab)
	_info_icon = TextureRect.new(); _info_icon.scale = Vector2(2, 2); _info_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_info_panel.add_child(_info_icon)
	_key_panel = UIKit.panel(Vector2(100, 108), Vector2(280, 34), UIKit.FR_WARN); _key_panel.visible = false
	var kl := Fonts.label("Pressione a nova tecla (Esc cancela)", 10); kl.position = Vector2(8, 13); kl.size = Vector2(264, 10)
	kl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _key_panel.add_child(kl)
	add_child(_key_panel)
	_logo = Fonts.label("ECOS DA RUÍNA", 24, Color(1.0, 0.88, 0.5)); _logo.size = Vector2(480, 36)
	_logo.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _logo.position = Vector2(0, 30); _logo.visible = false
	_logo.add_theme_constant_override("outline_size", 6); add_child(_logo)
	_sub = Fonts.label("Os cinco guardiões de Auralis", 11, Color(0.8, 0.85, 1.0)); _sub.size = Vector2(480, 14)
	_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _sub.position = Vector2(0, 70); _sub.visible = false; add_child(_sub)

func _process(delta: float) -> void:
	if not _built or not visible:
		return
	_t += delta
	# o cursor "respira"; o brilho de raridade pulsa; páginas longas do painel viram sozinhas
	_cursor.modulate.a = 0.75 + 0.25 * sin(_t * 6.0)
	if _info_glow.visible:
		_info_glow.modulate.a = 0.55 + 0.35 * sin(_t * 3.0)
	if _info_pages.size() > 1:
		_info_t += delta
		if _info_t >= INFO_PAGE_SECS:
			_info_t = 0.0
			_info_page = (_info_page + 1) % _info_pages.size()
			_show_info_page()

## Rodapé conforme o aparelho (toque ou teclado) e o item (← → ajustam valores).
func _footer_text() -> String:
	var cur: Dictionary = items[sel] if (sel >= 0 and sel < items.size()) else {}
	var adj: bool = (cur.has("l") and cur["l"].is_valid()) or (cur.has("r") and cur["r"].is_valid())
	if footer.begins_with("↑↓ navegar"):
		if TouchControls.active:
			return "Toque no item ou use as setas  •  OK confirma  •  Voltar sai" if not adj else "Toque no valor para mudar  •  Voltar sai"
		if adj:
			return "↑↓ navegar  •  ← → ajustar  •  Esc voltar"
		return footer
	return footer

## Página do painel de informação: ← → também viram a página quando o item não usa ← →.
func info_flip(d: int) -> bool:
	if _info_pages.size() <= 1:
		return false
	_info_page = (_info_page + d + _info_pages.size()) % _info_pages.size()
	_info_t = 0.0
	_show_info_page()
	return true

func _show_info_page() -> void:
	if _info_pages.is_empty():
		_info_lab.text = ""
		_info_page_lab.text = ""
		return
	_info_page = clampi(_info_page, 0, _info_pages.size() - 1)
	_info_lab.text = _info_pages[_info_page]
	_info_page_lab.text = ("%d/%d ▸" % [_info_page + 1, _info_pages.size()]) if _info_pages.size() > 1 else ""

func _refresh() -> void:
	if not is_inside_tree():
		return
	if not _built:
		_build()
	_dim.color = Color(0.05, 0.04, 0.1, dim)
	_key_panel.visible = key_capture != ""
	if title_mode:
		_logo.visible = true; _sub.visible = true
		_title_lab.visible = false; _info_panel.visible = false; _count_lab.visible = false; _info_glow.visible = false
		_up_arrow.visible = false; _down_arrow.visible = false
		var x := 170.0; var y := 120.0
		_list_panel.position = Vector2(x - 12, y - 10); _list_panel.size = Vector2(164, items.size() * 16 + 18)
		for r in VIS:
			var l: Label = _rows[r]
			_row_icons[r].visible = false
			l.visible = r < items.size()
			if r < items.size():
				var it: Dictionary = items[r]
				l.text = it["t"]; l.position = Vector2(x + 4, y + r * 16.0); l.size = Vector2(140, 14)
				l.modulate = (Color(1, 0.95, 0.75) if r == sel else Color.WHITE) if it.get("en", true) else Color(0.5, 0.5, 0.55)
		_sel_bar.visible = true; _cursor.visible = true
		_sel_bar.position = Vector2(x - 4, y + sel * 16.0 - 3); _sel_bar.size = Vector2(148, 15)
		_cursor.position = Vector2(x - 10, y + sel * 16.0 + 10)
		_foot_lab.text = _info_text().get_slice("\n", 0)
		_foot_lab.position = Vector2(8, 248); _foot_lab.size = Vector2(464, 12); _foot_lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		return
	_logo.visible = false; _sub.visible = false
	_title_lab.visible = true
	var pw := list_w + 12.0
	_list_panel.position = Vector2(X0 - 6, Y0 - 6); _list_panel.size = Vector2(pw, 232)
	_title_lab.text = title; _title_lab.position = Vector2(X0 + 2, Y0 + 1); _title_lab.size = Vector2(list_w - 4, 14)
	for r in VIS:
		var i := scroll + r
		var l: Label = _rows[r]
		var ic: TextureRect = _row_icons[r]
		l.visible = i < items.size()
		ic.visible = false
		if i >= items.size():
			continue
		var it: Dictionary = items[i]
		var tx := X0 + 4.0
		var row_icon = it.get("icon")
		if row_icon != null and not it.get("hdr", false):
			ic.texture = row_icon
			ic.position = Vector2(X0 + 2.0, Y0 + 21.0 + r * 16.0)
			ic.visible = true
			ic.modulate = Color.WHITE if it.get("en", true) else Color(0.5, 0.5, 0.5)
			tx += 13.0
		l.position = Vector2(tx, Y0 + 22.0 + r * 16.0)
		l.size = Vector2(X0 + list_w - 4.0 - tx, 14)
		l.add_theme_font_size_override("font_size", 8)
		if it.get("hdr", false):
			l.modulate = Color(0.6, 0.72, 1.0)
			var ht := str(it["t"])
			l.text = ("— " + ht + " —") if ht.length() * 8 + 40 < list_w else ht
		else:
			l.text = it["t"]
			var base_col: Color = it.get("col", Color.WHITE)
			l.modulate = base_col if it.get("en", true) else base_col.darkened(0.5)
	var row := sel - scroll
	_sel_bar.visible = row >= 0 and row < VIS and not items.is_empty()
	_sel_bar.position = Vector2(X0 - 2, Y0 + 19.0 + row * 16.0); _sel_bar.size = Vector2(list_w - 2, 15)
	_cursor.visible = _sel_bar.visible
	_cursor.position = Vector2(X0 - 9, Y0 + 30.0 + row * 16.0)
	# rolagem: setas mostram que há mais itens acima/abaixo
	_up_arrow.visible = scroll > 0
	_up_arrow.position = Vector2(X0 + list_w - 14, Y0 + 2)
	_down_arrow.visible = scroll + VIS < items.size()
	_down_arrow.position = Vector2(X0 + list_w - 14, Y0 + 211)
	_count_lab.visible = items.size() > VIS
	_count_lab.text = "%d/%d" % [sel + 1, items.size()]
	_count_lab.position = Vector2(X0 + 4, Y0 + 211)
	var ix := X0 + pw + 2.0
	var iw := 480.0 - ix - 8.0
	_info_panel.visible = true
	_info_panel.position = Vector2(ix, Y0 - 6); _info_panel.size = Vector2(iw, 232)
	var cur: Dictionary = items[sel] if (sel >= 0 and sel < items.size()) else {}
	var icon = cur.get("icon")
	_info_icon.visible = icon != null
	var txt_w := iw - 18.0
	if icon != null:
		_info_icon.texture = icon
		_info_icon.position = Vector2(iw - 42, 8)
	# texto do painel: quebra própria (fonte monoespaçada) e páginas quando não cabe — nada passa da moldura
	var src := _info_text()
	var cols := int(txt_w / 8.0)
	var rows := 20
	var key := src + ("#i" if icon != null else "")
	if key != _info_src:
		_info_src = key
		_info_page = 0
		_info_t = 0.0
		_info_pages = Hud.paginate(src, cols, rows, 4 if icon != null else 0, cols - 5)
	_info_lab.position = Vector2(9, 8); _info_lab.size = Vector2(txt_w, 214)
	_info_lab.autowrap_mode = TextServer.AUTOWRAP_OFF
	_show_info_page()
	_info_page_lab.position = Vector2(iw - 52, 216)
	_info_lab.modulate = cur.get("icol", Color.WHITE)
	# brilho da raridade em volta do painel (itens com cor de raridade)
	var glow_col = cur.get("glow")
	if glow_col == null and cur.has("icol") and cur.has("col"):
		glow_col = cur["col"]
	_info_glow.visible = glow_col != null
	if glow_col != null:
		_info_glow.position = _info_panel.position; _info_glow.size = _info_panel.size
		_info_glow.self_modulate = glow_col
	_foot_lab.text = _footer_text()
	_foot_lab.position = Vector2(X0, 254); _foot_lab.size = Vector2(452, 12); _foot_lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
