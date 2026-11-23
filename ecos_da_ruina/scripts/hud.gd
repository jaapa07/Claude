extends Control
class_name Hud
## HUD compacto, caixa de diálogo, barra de chefão, avisos e fade.

var ui: Node
var world: Node
var font: Font
var toasts: Array = []       # {"t": String, "life": float}
var banner_text := ""
var banner_t := 0.0
var fade_a := 0.0
var boss: Node = null
var dlg_lines: Array = []
var dlg_i := 0
var dlg_chars := 0.0
var dlg_cb: Callable = Callable()
var dlg_active := false
var hud_hidden := false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	size = Vector2(480, 270)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	Game.toast.connect(func(t): add_toast(t))

func add_toast(t: String) -> void:
	if toasts.size() > 0 and toasts[toasts.size() - 1]["t"] == t:
		toasts[toasts.size() - 1]["life"] = 3.0
		return
	toasts.append({"t": t, "life": 3.2})
	if toasts.size() > 4:
		toasts.pop_front()

func show_banner(t: String) -> void:
	banner_text = t
	banner_t = 2.6

func start_dialog(lines: Array, cb: Callable) -> void:
	dlg_lines = lines
	dlg_i = 0
	dlg_chars = 0.0
	dlg_cb = cb
	dlg_active = true

func _process(delta: float) -> void:
	for t in toasts:
		t["life"] -= delta
	toasts = toasts.filter(func(t): return t["life"] > 0.0)
	banner_t = max(0.0, banner_t - delta)
	if dlg_active:
		dlg_chars += delta * 55.0
	queue_redraw()

func _input(event: InputEvent) -> void:
	if not dlg_active:
		return
	var adv = event.is_action_pressed("ui_accept") or event.is_action_pressed("interact") or (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT)
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ENTER:
		adv = true
	if event is InputEventKey and event.echo:
		adv = false
	if not adv:
		return
	get_viewport().set_input_as_handled()
	var line: String = dlg_lines[dlg_i]
	if dlg_chars < line.length():
		dlg_chars = line.length()
		return
	dlg_i += 1
	dlg_chars = 0.0
	Audio.play("ui_move", -10.0)
	if dlg_i >= dlg_lines.size():
		dlg_active = false
		var cb := dlg_cb
		ui.dialog_closed()
		if cb.is_valid():
			cb.call()

# =============================================================== DESENHO
func _bar(x: float, y: float, w: float, h: float, f: float, col: Color, back := Color(0.1, 0.06, 0.12, 0.9)) -> void:
	draw_rect(Rect2(x, y, w, h), back)
	draw_rect(Rect2(x + 1, y + 1, (w - 2) * clamp(f, 0.0, 1.0), h - 2), col)

func _text(p: Vector2, s: String, sz := 9, col := Color.WHITE, w := -1.0) -> void:
	draw_string(font, p + Vector2(1, 1), s, HORIZONTAL_ALIGNMENT_LEFT, w, sz, Color(0, 0, 0, 0.8))
	draw_string(font, p, s, HORIZONTAL_ALIGNMENT_LEFT, w, sz, col)

func _draw() -> void:
	if world == null or not Game.in_game or world.player == null:
		draw_rect(Rect2(0, 0, 480, 270), Color(0, 0, 0, fade_a))
		return
	if not hud_hidden:
		_draw_hud()
	if banner_t > 0.0:
		var a: float = clamp(banner_t / 0.6, 0.0, 1.0)
		draw_rect(Rect2(120, 52, 240, 22), Color(0.05, 0.04, 0.1, 0.7 * a))
		draw_string(font, Vector2(120, 67), banner_text, HORIZONTAL_ALIGNMENT_CENTER, 240, 12, Color(1.0, 0.9, 0.5, a))
	if dlg_active:
		_draw_dialog()
	draw_rect(Rect2(0, 0, 480, 270), Color(0, 0, 0, fade_a))

func _draw_hud() -> void:
	var p: Player = world.player
	var maxhp := Game.hero_max_hp()
	var hp := float(Game.hero["hp"])
	# herói
	draw_rect(Rect2(4, 4, 112, 30), Color(0.05, 0.04, 0.1, 0.55))
	_text(Vector2(8, 12), "Herói Nv.%d" % Game.hero_level(), 8, Color(1, 0.9, 0.6))
	_bar(8, 15, 104, 7, hp / maxhp, Color(0.9, 0.25, 0.3) if hp / maxhp > 0.3 else Color(1.0, 0.5, 0.2))
	_text(Vector2(10, 21), "%d/%d" % [int(hp), int(maxhp)], 7)
	_bar(8, 23, 104, 4, p.vigor / Player.VIGOR_MAX, Color(0.95, 0.85, 0.3))
	_bar(8, 28, 104, 3, p.energy / Player.ENERGY_MAX, Color(0.35, 0.6, 1.0))
	# criatura ativa e reservas
	var y := 38.0
	var ac := Game.active_ind()
	draw_rect(Rect2(4, y, 112, 36), Color(0.05, 0.04, 0.1, 0.55))
	if not ac.is_empty():
		var spd: Dictionary = Game.sp_of(ac)
		_text(Vector2(8, y + 9), "%s Nv.%d" % [Game.creature_name(ac), ac["nivel"]], 8, Color(0.7, 1.0, 0.8))
		_bar(8, y + 12, 104, 6, float(ac["hp"]) / Game.creature_hp_max(ac), Color(0.4, 0.85, 0.5))
		var cd: float = float(Game.skill_cd.get(ac["uuid"], 0.0))
		var sk: Dictionary = Data.skills[spd["skill"]]
		if cd > 0.0:
			_bar(8, y + 20, 60, 4, 1.0 - cd / float(sk["recarga"]), Color(0.5, 0.7, 1.0))
			_text(Vector2(72, y + 25), "%.0fs" % cd, 7, Color(0.7, 0.8, 1.0))
		else:
			_text(Vector2(8, y + 26), "Q: %s" % sk["nome"], 7, Color(1, 1, 0.7))
		_text(Vector2(8, y + 34), _beh_name(), 7, Color(0.8, 0.8, 0.9))
	else:
		_text(Vector2(8, y + 12), "Sem criatura ativa", 8, Color(0.7, 0.7, 0.8))
	# reservas
	var rx := 120.0
	for i in Game.team.size():
		if i == Game.active_idx:
			continue
		var r: Dictionary = Game.individuals[Game.team[i]]
		draw_rect(Rect2(rx, y, 42, 16), Color(0.05, 0.04, 0.1, 0.55))
		_text(Vector2(rx + 2, y + 8), Game.creature_name(r).left(6), 7, Color(0.8, 0.8, 0.9) if not r.get("exausta", false) else Color(0.6, 0.4, 0.4))
		_bar(rx + 2, y + 10, 38, 4, float(r["hp"]) / Game.creature_hp_max(r), Color(0.4, 0.85, 0.5))
		rx += 44.0
	if Game.swap_cd > 0.0 and Game.team.size() > 1:
		_text(Vector2(120, y + 26), "Troca %.0fs" % Game.swap_cd, 7, Color(0.7, 0.8, 1.0))
	# itens e Ecos (canto superior direito)
	draw_rect(Rect2(380, 4, 96, 30), Color(0.05, 0.04, 0.1, 0.55))
	_text(Vector2(384, 14), "◆ %d" % Game.fragments, 8, Color(0.6, 0.95, 1.0))
	_text(Vector2(384, 24), "Selos %d  Tônicos %d" % [Game.item_count("selo_basico") + Game.item_count("selo_refinado"), Game.item_count("pocao")], 7)
	for i in 2:
		var eid: String = Game.eco_slots[i]
		var ex := 384.0 + i * 46.0
		if eid != "":
			var cdv: float = p.eco_cd[i]
			_text(Vector2(ex, 32), "%d:%s" % [i + 1, Data.skills[eid]["nome"].left(8)], 7, Color(0.7, 1.0, 0.6) if cdv <= 0.0 else Color(0.6, 0.6, 0.7))
	# alerta de captura
	if p.aiming or p.cap_state != "":
		_draw_capture(p)
	# chefão
	if boss != null and is_instance_valid(boss) and boss.alive_flag:
		var bw := 260.0
		var bx := 110.0
		draw_rect(Rect2(bx - 3, 6, bw + 6, 22), Color(0.05, 0.03, 0.08, 0.8))
		draw_string(font, Vector2(bx, 15), boss.shown_name, HORIZONTAL_ALIGNMENT_CENTER, bw, 10, Color(1.0, 0.85, 0.5))
		_bar(bx, 18, bw, 6, boss.hp / boss.max_hp, Color(0.85, 0.2, 0.25))
		for th in [0.6, 0.3] if boss.kind == "cervo" else []:
			draw_rect(Rect2(bx + bw * th, 18, 1, 6), Color(1, 1, 1, 0.8))
	# avisos
	var ty := 232.0
	for i in toasts.size():
		var t: Dictionary = toasts[i]
		var a: float = clamp(t["life"], 0.0, 1.0)
		var w := font.get_string_size(t["t"], HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x + 10.0
		draw_rect(Rect2(240 - w / 2.0, ty - 10 - (toasts.size() - 1 - i) * 13.0, w, 12), Color(0.05, 0.04, 0.1, 0.75 * a))
		draw_string(font, Vector2(240 - w / 2.0 + 5, ty - 1 - (toasts.size() - 1 - i) * 13.0), t["t"], HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color(1, 1, 1, a))
	# prompt de interação
	if world.current_prompt != "":
		var s = "[E] " + world.current_prompt
		var w2 := font.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x + 12.0
		draw_rect(Rect2(240 - w2 / 2.0, 244, w2, 14), Color(0.05, 0.04, 0.1, 0.8))
		draw_rect(Rect2(240 - w2 / 2.0, 244, w2, 14), Color(1.0, 0.85, 0.4), false, 1.0)
		draw_string(font, Vector2(240 - w2 / 2.0 + 6, 255), s, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color.WHITE)
	# objetivo e dica de tutorial
	var obj := Game.objective_text()
	if obj != "":
		draw_string(font, Vector2(6, 264), "Objetivo: " + obj, HORIZONTAL_ALIGNMENT_LEFT, 468, 8, Color(1.0, 0.95, 0.7, 0.9))
	var hint := Game.tutorial_hint()
	if hint != "":
		var w3 := font.get_string_size(hint, HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x + 12.0
		w3 = min(w3, 440.0)
		draw_rect(Rect2(240 - w3 / 2.0, 205, w3, 14), Color(0.1, 0.2, 0.15, 0.85))
		draw_string(font, Vector2(240 - w3 / 2.0 + 6, 215), hint, HORIZONTAL_ALIGNMENT_LEFT, w3 - 8, 9, Color(0.8, 1.0, 0.85))

func _beh_name() -> String:
	return {"acompanhar": "Acompanhar", "atacar": "Atacar alvo", "proteger": "Proteger", "preservar": "Preservar"}.get(Game.behavior, "")

func _draw_capture(p: Player) -> void:
	var lines: Array = []
	if p.cap_state == "voo":
		lines.append("Selo em voo...")
	elif p.cap_state == "canal":
		lines.append("Canalizando vínculo... %d%%" % int(p.cap_chance * 100.0 + 0.5))
		_bar(190, 190, 100, 5, p.cap_timer / Player.CAPTURE_CHANNEL, Color(0.6, 0.95, 1.0))
	elif p.cap_target != null and is_instance_valid(p.cap_target):
		var t: Node = p.cap_target
		lines.append("%s — vida %d%%" % [t.shown_name, int(t.hp / t.max_hp * 100.0)])
		var ok: bool = p.cap_msg == ""
		if ok:
			lines.append("Chance %d%%  •  F: lançar selo  •  Esc: cancelar" % int(p.chance_for(t) * 100.0 + 0.5))
		else:
			lines.append(p.cap_msg)
	else:
		lines.append(p.cap_msg if p.cap_msg != "" else "Mirando...")
	var y := 170.0
	for l in lines:
		var w := font.get_string_size(l, HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x + 12.0
		draw_rect(Rect2(240 - w / 2.0, y, w, 13), Color(0.05, 0.1, 0.18, 0.9))
		draw_string(font, Vector2(240 - w / 2.0 + 6, y + 10), l, HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color(0.7, 1.0, 1.0))
		y += 14.0

func _draw_dialog() -> void:
	draw_rect(Rect2(20, 196, 440, 66), Color(0.08, 0.06, 0.16, 0.96))
	draw_rect(Rect2(20, 196, 440, 66), Color(0.85, 0.7, 0.35), false, 1.0)
	var line: String = dlg_lines[dlg_i]
	var shown := line.substr(0, int(dlg_chars))
	var name_part := ""
	var body := shown
	var full := line
	var ci := full.find(":")
	if ci > 0 and ci <= 18 and full.substr(0, ci).find(" ") < 0 or (ci > 0 and ci <= 22 and full.begins_with("Dona")):
		name_part = full.substr(0, ci)
		body = shown.substr(min(ci + 2, shown.length()))
	if name_part != "":
		draw_string(font, Vector2(28, 210), name_part, HORIZONTAL_ALIGNMENT_LEFT, 200, 10, Color(1.0, 0.85, 0.4))
	draw_multiline_string(font, Vector2(28, 224 if name_part != "" else 214), body, HORIZONTAL_ALIGNMENT_LEFT, 424, 10, 4, Color.WHITE)
	if dlg_chars >= line.length():
		draw_string(font, Vector2(430, 256), "▼ E", HORIZONTAL_ALIGNMENT_LEFT, 40, 8, Color(1, 0.85, 0.4))
