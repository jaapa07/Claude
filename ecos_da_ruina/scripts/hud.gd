extends Control
class_name Hud
## HUD compacto, caixa de diálogo, barra de chefão, avisos e transição — montados com nós e arte autoral.

var ui: Node
var world: Node
var font: Font
var toasts: Array = []       # {"t": String, "life": float, "node": Control}
var banner_t := 0.0
var boss: Node = null
var dlg_lines: Array = []
var dlg_i := 0
var dlg_chars := 0.0
var dlg_cb: Callable = Callable()
var dlg_active := false
var hud_hidden := false
var fade_a := 0.0:
	set(v):
		fade_a = v
		if _fade:
			_fade.color.a = v

var _fade: ColorRect
var _root: Control
var _hp: TextureProgressBar
var _vig: TextureProgressBar
var _en: TextureProgressBar
var _hp_lab: Label
var _hero_lab: Label
var _cr_panel: NinePatchRect
var _cr_icon: TextureRect
var _cr_icon_sp := ""
var _cr_name: Label
var _cr_hp: TextureProgressBar
var _cr_skill: Label
var _cr_cd: TextureProgressBar
var _cr_beh: Label
var _res: Array = []
var _swap_lab: Label
var _frag_lab: Label
var _seal_lab: Label
var _ton_lab: Label
var _eco_lab: Label
var _boss_panel: NinePatchRect
var _boss_name: Label
var _boss_bar: TextureProgressBar
var _toast_box: VBoxContainer
var _prompt: NinePatchRect
var _prompt_lab: Label
var _obj_lab: Label
var _hint: NinePatchRect
var _hint_lab: Label
var _cap: NinePatchRect
var _cap_lab: Label
var _cap_bar: TextureProgressBar
var _banner: NinePatchRect
var _banner_lab: Label
var _dlg: NinePatchRect
var _dlg_name: Label
var _dlg_body: Label
var _dlg_more: Label

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	size = Vector2(480, 270)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	Game.toast.connect(func(t): add_toast(t))
	_root = Control.new()
	_root.size = size
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_root)
	# herói
	var hp_panel := UIKit.panel(Vector2(4, 4), Vector2(150, 38))
	_root.add_child(hp_panel)
	_hero_lab = Fonts.label("Herói", 8, Color(1, 0.9, 0.6)); _hero_lab.position = Vector2(6, 5); hp_panel.add_child(_hero_lab)
	_hp_lab = Fonts.label("", 7); _hp_lab.position = Vector2(88, 5); _hp_lab.size = Vector2(56, 10); _hp_lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT; hp_panel.add_child(_hp_lab)
	_hp = Art.bar(1, 140); _hp.position = Vector2(5, 16); _hp.size = Vector2(140, 6); hp_panel.add_child(_hp)
	_vig = Art.bar(2, 140); _vig.position = Vector2(5, 24); hp_panel.add_child(_vig)
	_en = Art.bar(3, 140); _en.position = Vector2(5, 29); hp_panel.add_child(_en)
	# criatura ativa
	_cr_panel = UIKit.panel(Vector2(4, 44), Vector2(150, 42))
	_root.add_child(_cr_panel)
	_cr_name = Fonts.label("", 8, Color(0.75, 1.0, 0.8)); _cr_name.position = Vector2(32, 5); _cr_panel.add_child(_cr_name)
	_cr_hp = Art.bar(4, 112); _cr_hp.position = Vector2(32, 16); _cr_hp.size = Vector2(112, 5); _cr_panel.add_child(_cr_hp)
	_cr_skill = Fonts.label("", 7, Color(1, 1, 0.7)); _cr_skill.position = Vector2(32, 23); _cr_panel.add_child(_cr_skill)
	_cr_cd = Art.bar(3, 112); _cr_cd.position = Vector2(32, 34); _cr_panel.add_child(_cr_cd)
	_cr_beh = Fonts.label("", 7, Color(0.8, 0.8, 0.95)); _cr_beh.position = Vector2(6, 88); _root.add_child(_cr_beh)
	for i in 2:
		var p := UIKit.panel(Vector2(156 + i * 34, 44), Vector2(32, 30))
		p.visible = false
		_root.add_child(p)
		var bar := Art.bar(4, 24); bar.position = Vector2(4, 23); p.add_child(bar)
		_res.append({"panel": p, "bar": bar, "icon": null, "sp": ""})
	_swap_lab = Fonts.label("", 7, Color(0.7, 0.85, 1)); _swap_lab.position = Vector2(158, 76); _root.add_child(_swap_lab)
	# recursos (direita)
	var rp := UIKit.panel(Vector2(358, 4), Vector2(118, 38))
	_root.add_child(rp)
	var i1 := UIKit.icon(3); i1.position = Vector2(4, 3); rp.add_child(i1)
	_frag_lab = Fonts.label("0", 8, Color(0.7, 0.95, 1)); _frag_lab.position = Vector2(20, 8); rp.add_child(_frag_lab)
	var i2 := UIKit.icon(0); i2.position = Vector2(56, 3); rp.add_child(i2)
	_seal_lab = Fonts.label("0", 8); _seal_lab.position = Vector2(72, 8); rp.add_child(_seal_lab)
	var i3 := UIKit.icon(2); i3.position = Vector2(84, 3); rp.add_child(i3)
	_ton_lab = Fonts.label("0", 8); _ton_lab.position = Vector2(100, 8); rp.add_child(_ton_lab)
	var i4 := UIKit.icon(6); i4.position = Vector2(4, 19); rp.add_child(i4)
	_eco_lab = Fonts.label("—", 7, Color(0.75, 1, 0.65)); _eco_lab.position = Vector2(20, 24); rp.add_child(_eco_lab)
	# chefão
	_boss_panel = UIKit.panel(Vector2(156, 4), Vector2(198, 30)); _boss_panel.position = Vector2(156, 4); _boss_panel.size = Vector2(200, 28); _boss_panel.visible = false; _root.add_child(_boss_panel)
	_boss_name = Fonts.label("", 10, Color(1, 0.85, 0.5)); _boss_name.position = Vector2(4, 5); _boss_name.size = Vector2(192, 10)
	_boss_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _boss_panel.add_child(_boss_name)
	_boss_bar = Art.bar(1, 188); _boss_bar.position = Vector2(6, 17); _boss_bar.size = Vector2(188, 6); _boss_panel.add_child(_boss_bar)
	# avisos
	_toast_box = VBoxContainer.new()
	_toast_box.position = Vector2(20, 120); _toast_box.size = Vector2(440, 64)
	_toast_box.alignment = BoxContainer.ALIGNMENT_END
	_toast_box.add_theme_constant_override("separation", 1)
	_toast_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(_toast_box)
	# dica, captura, prompt, objetivo
	_hint = UIKit.panel(Vector2(10, 204), Vector2(460, 28)); _root.add_child(_hint)
	_hint_lab = Fonts.label("", 8, Color(0.85, 1.0, 0.85)); _hint_lab.position = Vector2(6, 5); _hint_lab.size = Vector2(448, 20); _hint_lab.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_hint_lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _hint.add_child(_hint_lab)
	_cap = UIKit.panel(Vector2(40, 160), Vector2(400, 40)); _cap.visible = false; _root.add_child(_cap)
	_cap_lab = Fonts.label("", 8, Color(0.75, 1, 1)); _cap_lab.position = Vector2(6, 5); _cap_lab.size = Vector2(388, 24); _cap_lab.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_cap_lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _cap.add_child(_cap_lab)
	_cap_bar = Art.bar(3, 300); _cap_bar.position = Vector2(50, 31); _cap.add_child(_cap_bar)
	_prompt = UIKit.panel(Vector2(190, 234), Vector2(100, 16)); _prompt.visible = false; _root.add_child(_prompt)
	_prompt_lab = Fonts.label("", 9); _prompt_lab.position = Vector2(4, 4); _prompt_lab.size = Vector2(92, 10)
	_prompt_lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _prompt.add_child(_prompt_lab)
	_obj_lab = Fonts.label("", 7, Color(1, 0.95, 0.75)); _obj_lab.position = Vector2(6, 252); _obj_lab.size = Vector2(468, 18); _obj_lab.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; _root.add_child(_obj_lab)
	# faixa com nome do mapa
	_banner = UIKit.panel(Vector2(110, 92), Vector2(260, 26)); _banner.visible = false; add_child(_banner)
	_banner_lab = Fonts.label("", 11, Color(1, 0.9, 0.55)); _banner_lab.position = Vector2(4, 9); _banner_lab.size = Vector2(252, 10)
	_banner_lab.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; _banner.add_child(_banner_lab)
	# diálogo
	_dlg = UIKit.panel(Vector2(10, 180), Vector2(460, 86)); _dlg.visible = false; add_child(_dlg)
	_dlg_name = Fonts.label("", 10, Color(1, 0.85, 0.4)); _dlg_name.position = Vector2(10, 7); _dlg.add_child(_dlg_name)
	_dlg_body = Fonts.label("", 10); _dlg_body.position = Vector2(10, 21); _dlg_body.size = Vector2(440, 58)
	_dlg_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; _dlg.add_child(_dlg_body)
	_dlg_more = Fonts.label("E >", 8, Color(1, 0.85, 0.4)); _dlg_more.position = Vector2(428, 74); _dlg.add_child(_dlg_more)
	# transição
	_fade = ColorRect.new(); _fade.size = size; _fade.color = Color(0, 0, 0, 0); _fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fade)

func add_toast(t: String) -> void:
	for x in toasts:
		if x["t"] == t:
			x["life"] = 3.0
			return
	var p := UIKit.panel(Vector2.ZERO, Vector2(10, 16))
	var l := Fonts.label(t, 8)
	l.position = Vector2(5, 4)
	p.add_child(l)
	var w: float = l.get_minimum_size().x + 10.0
	var hgt := 16.0
	if w > 440.0:
		# aviso longo: quebra em linhas dentro da tela
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.custom_minimum_size = Vector2(426, 0)
		l.size = Vector2(426, 0)
		w = 436.0
		hgt = l.get_minimum_size().y + 8.0
	p.custom_minimum_size = Vector2(w, hgt)
	p.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_toast_box.add_child(p)
	toasts.append({"t": t, "life": 3.2, "node": p})
	while toasts.size() > 4:
		var old: Dictionary = toasts.pop_front()
		old["node"].queue_free()

func show_banner(t: String) -> void:
	_banner_lab.text = t
	banner_t = 2.6

func start_dialog(lines: Array, cb: Callable) -> void:
	dlg_lines = lines
	dlg_i = 0
	dlg_chars = 0.0
	dlg_cb = cb
	dlg_active = true
	_show_line()

func _show_line() -> void:
	var line: String = dlg_lines[dlg_i]
	var ci := line.find(":")
	if ci > 0 and ci <= 22 and (line.substr(0, ci).find(" ") < 0 or line.begins_with("Dona")):
		_dlg_name.text = line.substr(0, ci)
		_dlg_body.text = line.substr(ci + 2)
	else:
		_dlg_name.text = ""
		_dlg_body.text = line
	_dlg_body.visible_characters = 0

func _process(delta: float) -> void:
	for t in toasts:
		t["life"] -= delta
		t["node"].modulate.a = clamp(t["life"], 0.0, 1.0)
	for t in toasts.duplicate():
		if t["life"] <= 0.0:
			t["node"].queue_free()
			toasts.erase(t)
	banner_t = max(0.0, banner_t - delta)
	_banner.visible = banner_t > 0.0 and Game.in_game
	_banner.modulate.a = clamp(banner_t / 0.6, 0.0, 1.0)
	_dlg.visible = dlg_active
	if dlg_active:
		dlg_chars += delta * 55.0
		_dlg_body.visible_characters = int(dlg_chars)
		_dlg_more.visible = _dlg_body.visible_characters >= _dlg_body.text.length()
	_root.visible = world != null and Game.in_game and world.player != null and not hud_hidden
	if _root.visible:
		_update_hud()

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
	if _dlg_body.visible_characters < _dlg_body.text.length():
		dlg_chars = 9999.0
		_dlg_body.visible_characters = -1
		return
	dlg_i += 1
	dlg_chars = 0.0
	Audio.play("ui_move", -10.0)
	if dlg_i >= dlg_lines.size():
		dlg_active = false
		_dlg.visible = false
		var cb := dlg_cb
		ui.dialog_closed()
		if cb.is_valid():
			cb.call()
	else:
		_show_line()

func _beh_name() -> String:
	return {"acompanhar": "Acompanhar", "atacar": "Atacar alvo", "proteger": "Proteger", "preservar": "Preservar"}.get(Game.behavior, "")

func _update_hud() -> void:
	var p: Player = world.player
	var maxhp := Game.hero_max_hp()
	var hp := float(Game.hero["hp"])
	_hero_lab.text = "Nv.%d" % Game.hero_level()
	_hp_lab.text = "%d/%d" % [int(hp), int(maxhp)]
	_hp.value = hp / maxhp * 1000.0
	_vig.value = p.vigor / Player.VIGOR_MAX * 1000.0
	_en.value = p.energy / Player.ENERGY_MAX * 1000.0
	var ac := Game.active_ind()
	_cr_panel.visible = true
	if not ac.is_empty():
		if _cr_icon_sp != ac["species_id"]:
			if _cr_icon:
				_cr_icon.queue_free()
			_cr_icon = UIKit.portrait(ac["species_id"])
			_cr_icon.position = Vector2(3, 20 - _cr_icon.size.y / 2.0 + 0)
			_cr_icon.position = Vector2(16 - _cr_icon.size.x / 2.0, 20 - _cr_icon.size.y / 2.0)
			_cr_panel.add_child(_cr_icon)
			_cr_icon_sp = ac["species_id"]
		_cr_name.text = "%s %d" % [Game.creature_name(ac).left(9), ac["nivel"]]
		_cr_hp.value = float(ac["hp"]) / Game.creature_hp_max(ac) * 1000.0
		var sk: Dictionary = Data.skills[Game.hab_active(ac)]
		var cd: float = float(Game.skill_cd.get(ac["uuid"], 0.0))
		_cr_skill.text = "Q pronto" if cd <= 0.0 else "Q %.0fs" % cd
		_cr_cd.value = (1.0 - cd / float(sk["recarga"])) * 1000.0
		_cr_beh.text = "Modo: " + _beh_name() + "  (C)"
	else:
		if _cr_icon:
			_cr_icon.queue_free(); _cr_icon = null; _cr_icon_sp = ""
		_cr_name.text = "Sem criatura ativa"
		_cr_hp.value = 0
		_cr_skill.text = ""
		_cr_cd.value = 0
		_cr_beh.text = ""
	var k := 0
	for i in Game.team.size():
		if i == Game.active_idx:
			continue
		if k >= 2:
			break
		var r: Dictionary = Game.individuals[Game.team[i]]
		var slot: Dictionary = _res[k]
		slot["panel"].visible = true
		if slot["sp"] != r["species_id"]:
			if slot["icon"]:
				slot["icon"].queue_free()
			var ic := UIKit.portrait(r["species_id"])
			ic.scale = Vector2.ONE * (16.0 / max(ic.size.x, ic.size.y))
			ic.position = Vector2(8, 4)
			slot["panel"].add_child(ic)
			slot["icon"] = ic
			slot["sp"] = r["species_id"]
		slot["icon"].modulate = Color(0.5, 0.4, 0.4) if r.get("exausta", false) else Color.WHITE
		slot["bar"].value = float(r["hp"]) / Game.creature_hp_max(r) * 1000.0
		k += 1
	for j in range(k, 2):
		_res[j]["panel"].visible = false
	_swap_lab.text = ("Troca %.0fs" % Game.swap_cd) if (Game.swap_cd > 0.0 and Game.team.size() > 1) else ""
	_frag_lab.text = str(Game.fragments)
	_seal_lab.text = str(Game.item_count("selo_basico") + Game.item_count("selo_refinado"))
	_ton_lab.text = str(Game.item_count("pocao"))
	var ecos: Array = []
	for i in 2:
		var eid: String = Game.eco_slots[i]
		if eid != "":
			ecos.append("%d:%s%s" % [i + 1, Data.skills[eid]["nome"], "" if p.eco_cd[i] <= 0.0 else " %.0fs" % p.eco_cd[i]])
	_eco_lab.text = "  ".join(ecos) if not ecos.is_empty() else "Ecos: —"
	# chefão
	var b_ok = boss != null and is_instance_valid(boss) and boss.alive_flag
	_boss_panel.visible = b_ok
	if b_ok:
		_boss_name.text = boss.shown_name
		_boss_bar.value = boss.hp / boss.max_hp * 1000.0
	# captura
	_cap.visible = p.aiming or p.cap_state != ""
	if _cap.visible:
		_cap_bar.visible = p.cap_state == "canal"
		if p.cap_state == "voo":
			_cap_lab.text = "Selo em voo..."
		elif p.cap_state == "canal":
			_cap_lab.text = "Canalizando vínculo... chance %d%%" % int(p.cap_chance * 100.0 + 0.5)
			_cap_bar.value = p.cap_timer / Player.CAPTURE_CHANNEL * 1000.0
		elif p.cap_target != null and is_instance_valid(p.cap_target):
			var t: Node = p.cap_target
			var head: String = "%s — vida %d%%" % [t.shown_name, int(t.hp / t.max_hp * 100.0)]
			if p.cap_msg == "":
				_cap_lab.text = head + "\nChance %d%%  •  F: lançar  •  Tab: outro alvo  •  K: cancelar" % int(p.chance_for(t) * 100.0 + 0.5)
			else:
				_cap_lab.text = head + "\n" + p.cap_msg
		else:
			_cap_lab.text = p.cap_msg if p.cap_msg != "" else "Mirando..."
	# prompt
	_prompt.visible = world.current_prompt != ""
	if _prompt.visible:
		_prompt_lab.text = "E  " + world.current_prompt
		var w: float = _prompt_lab.get_minimum_size().x + 14.0
		_prompt.size.x = w
		_prompt.position.x = 240.0 - w / 2.0
		_prompt_lab.size.x = w - 8.0
	var obj := Game.objective_text()
	var ct := Game.contract_progress_text()
	if ct != "":
		obj = "[Contrato] " + ct
	_obj_lab.text = ("Objetivo: " + obj) if obj != "" else ""
	var hint := Game.tutorial_hint()
	_hint.visible = hint != "" and not dlg_active
	_hint_lab.text = hint
