extends CanvasLayer
## Camada de interface: HUD, diálogos e todas as telas (título, pausa, equipe, santuário, bestiário, inventário, loja, opções).
## A UI só lê o estado e envia comandos ao Game/World; não calcula dano nem altera flags de chefes.

var world: Node
var hud: Hud
var font: FontFile
var stack: Array = []
var modal := 0
var _fade_tw: Tween
var instant := false        # testes: sem animações de fade

func _ready() -> void:
	layer = 10
	process_mode = Node.PROCESS_MODE_ALWAYS
	font = Fonts.pixel()
	hud = Hud.new()
	hud.ui = self
	hud.font = font
	add_child(hud)

func bind(w: Node) -> void:
	world = w
	hud.world = w
	w.ui = self

# =============================================================== BÁSICO
func banner(t: String) -> void:
	hud.show_banner(t)

func toast(t: String) -> void:
	hud.add_toast(t)

func fade(a: float, dur: float) -> Signal:
	if _fade_tw:
		_fade_tw.kill()
	if instant:
		hud.fade_a = a
		return get_tree().process_frame
	_fade_tw = create_tween()
	_fade_tw.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	_fade_tw.tween_property(hud, "fade_a", a, dur)
	return _fade_tw.finished

func boss_bar(b: Node) -> void:
	hud.boss = b

func _modal(on: bool) -> void:
	modal += 1 if on else -1
	modal = max(0, modal)
	get_tree().paused = modal > 0

func dialog(lines: Array, cb: Callable) -> void:
	_modal(true)
	hud.start_dialog(lines, cb)

func dialog_closed() -> void:
	_modal(false)

func is_modal() -> bool:
	return modal > 0

func has_screen() -> bool:
	for s in stack:
		if is_instance_valid(s):
			return true
	return false

func _push(title: String, items: Array, info := "") -> MenuScreen:
	var s := MenuScreen.new()
	s.ui = self
	add_child(s)
	s.setup(title, items, info)
	stack.append(s)
	_modal(true)
	s.closed.connect(func():
		stack.erase(s)
		_modal(false)
		if stack.is_empty():
			screens_closed())
	return s

func screens_closed() -> void:
	if world and world.player and world.player.state == Player.S.INTERACT and not hud.dlg_active:
		world.player.set_busy(false)

func close_all() -> void:
	for s in stack.duplicate():
		if is_instance_valid(s):
			s.active = false
			s.queue_free()
			_modal(false)
	stack.clear()
	screens_closed()

func _top() -> MenuScreen:
	for i in range(stack.size() - 1, -1, -1):
		if is_instance_valid(stack[i]):
			return stack[i]
	return null

func _refresh(s: MenuScreen, items: Array) -> void:
	if is_instance_valid(s):
		s.set_items(items)

func _it(t: String, fn: Callable, info = "", en := true) -> Dictionary:
	return {"t": t, "fn": fn, "info": info, "en": en}

func _hdr(t: String) -> Dictionary:
	return {"t": t, "hdr": true}

func _confirm(title: String, msg: String, yes: Callable) -> void:
	var s: MenuScreen
	s = _push(title, [], msg)
	s.setup(title, [_it("Confirmar", func():
		s.close()
		yes.call(), msg), _it("Cancelar", func(): s.close(), msg)], msg)

# =============================================================== TÍTULO
func open_title(main: Node) -> void:
	var s: MenuScreen
	s = _push("ECOS DA RUÍNA", [], "")
	s.can_cancel = false
	s.title_mode = true
	s.dim = 0.25
	s.footer = "Capítulos 1 e 2: Floresta e Minas da Brasa  •  ↑↓ navegar, E confirmar"
	var items := [
		_it("Continuar", func(): _slot_menu(main, false, true), "Retoma o último save disponível.", SaveSys.has_any_save()),
		_it("Novo jogo", func(): _new_game_slots(main), "Começa uma nova aventura em um dos 3 slots."),
		_it("Carregar", func(): _slot_menu(main, false, false), "Escolha um slot salvo.", SaveSys.has_any_save()),
		_it("Opções", func(): open_options(), "Volume, acessibilidade, controles e dificuldade."),
		_it("Sair", func(): get_tree().quit(), "Fecha o jogo."),
	]
	s.setup("ECOS DA RUÍNA", items, "Explore Auralis, forme vínculos com criaturas e enfrente os guardiões corrompidos.\n\nControles: WASD mover, J atacar, K defender, Espaço esquivar, F capturar, Q habilidade, Tab trocar, E interagir, I menu.")

func _slot_label(i: int) -> String:
	var inf := SaveSys.slot_info(i)
	var nm := "Autosave" if i == 0 else "Slot %d" % i
	if inf.is_empty():
		return "%s — vazio" % nm
	return "%s — Nv.%d  %s  %d%%  %dmin%s" % [nm, inf["nivel"], inf["mapa"], int(inf.get("conquista", 0)), int(inf["tempo"] / 60.0), " (backup)" if inf["recuperado"] else ""]

func _slot_menu(main: Node, saving: bool, continue_best: bool) -> void:
	if continue_best:
		var best := -1
		var bt := -1.0
		for i in [0, 1, 2, 3]:
			var inf := SaveSys.slot_info(i)
			if not inf.is_empty() and float(inf["tempo"]) >= bt:
				bt = float(inf["tempo"]); best = i
		if best >= 0:
			main.continue_from_slot(best)
		return
	var s := _push("Carregar jogo", [], "")
	var items: Array = []
	for i in [0, 1, 2, 3]:
		var idx: int = i
		items.append(_it(_slot_label(idx), func(): main.continue_from_slot(idx), "Carrega este slot.", not SaveSys.slot_info(idx).is_empty()))
	s.setup("Carregar jogo", items, "O autosave é gravado ao chegar em cada área e nos santuários.")

func _new_game_slots(main: Node) -> void:
	var s := _push("Novo jogo", [], "")
	var items: Array = []
	for i in [1, 2, 3]:
		var idx: int = i
		items.append(_it(_slot_label(idx), func():
			if SaveSys.slot_info(idx).is_empty():
				main.start_new_game(idx)
			else:
				_confirm("Sobrescrever slot %d?" % idx, "Já existe um jogo salvo neste slot. Ele será substituído ao salvar.", func(): main.start_new_game(idx)), "Inicia uma nova aventura neste slot."))
	s.setup("Novo jogo", items, "Escolha o slot.")

# =============================================================== PAUSA
func open_pause() -> void:
	if has_screen() or hud.dlg_active:
		return
	var s := _push("Pausa", [], "")
	_fill_pause(s)

func _fill_pause(s: MenuScreen) -> void:
	var items := [
		_it("Continuar", func(): s.close(), "Volta ao jogo.\n\n" + Weather.describe()),
		_it("Equipe e criaturas", func(): open_team(), "Veja, ordene e evolua suas criaturas."),
		_it("Inventário e herói", func(): open_inventory(), "Itens, equipamentos, talentos."),
		_it("Bestiário", func(): open_bestiary(), "Criaturas vistas e capturadas."),
		_it("Diário", func(): open_diary(), "Missões ativas."),
		_it("Mapa", func(): open_map(), "Áreas visitadas e bloqueios."),
		_it("Salvar jogo", func(): open_save_slots(), "Grava o progresso em um slot."),
		_it("Reiniciar enigmas da sala", func():
			if world.in_combat():
				toast("Não é possível durante o combate.")
			else:
				world.reset_room_puzzles(); s.close(); toast("Enigmas da sala reiniciados."), "Recoloca caixas e alavancas se algo ficou preso. Enigmas resolvidos continuam resolvidos."),
		_it("Opções", func(): open_options(), "Volume, acessibilidade, controles."),
		_it("Botões do toque", func(): close_all(); TouchControls.instance.show_legend(), "Mostra o que cada botão da tela faz.", TouchControls.active),
		_it("Jornada (%d%%)" % Game.conquest_pct(), func(): open_journey(), "O grande objetivo e quanto falta para conquistar tudo."),
		_it("Voltar ao título", func(): _confirm("Voltar ao título?", "O progresso não salvo desde o último autosave será perdido.", func(): get_tree().root.get_node("Main").back_to_title()), "Sai da partida."),
	]
	s.setup("Pausa — " + world.map.get("name", ""), items, "Pausa — a simulação está parada.")

# =============================================================== EQUIPE
func creature_info(ind: Dictionary, compare: Dictionary = {}) -> String:
	var sp := Game.sp_of(ind)
	var sk: Dictionary = Data.skills[Game.hab_active(ind)]
	var ev := Game.evolution_status(ind)
	var t := "%s  (%s)\nNível %d   XP %d/%d\nVida %d/%d   Ataque %.0f\nAfinidade: %s   Papel: %s\n\nHabilidade (Q): %s\n  %s\nPassiva: %s\nAção ambiental: %s\n\nVínculo: %d/3 atividades\n" % [
		Game.creature_name(ind), sp["nome"], ind["nivel"], int(ind["xp"]), Game.creature_xp_to_next(int(ind["nivel"])),
		int(ind["hp"]), int(Game.creature_hp_max(ind)), Game.creature_atk(ind), sp["afinidade"], sp["papel"],
		sk["nome"], sk["descricao"], sp["passiva"], sp["acao_ambiental"], Game.bond_count(ind)]
	t += "Habilidades aprendidas: %d/%d (menu Habilidades)\n" % [ind.get("hab_aprendidas", []).size(), Game.hab_list(ind["species_id"]).size()]
	if sp.get("evolucao") != null:
		t += "Evolui para %s no nível %d. %s" % [Data.sp(sp["evolucao"]["para"])["nome"], sp["evolucao"]["nivel"], "PRONTA!" if ev["possivel"] else ev["motivo"]]
	else:
		t += "Forma final."
	var acc: String = str(ind.get("acessorio", ""))
	t += "\nAcessório: %s" % (Data.items[acc]["nome"] if acc != "" and Data.items.has(acc) else "—")
	if ind.get("exausta", false):
		t += "\n[EXAUSTA — recupere no santuário]"
	if not compare.is_empty():
		t += "\n\nAtiva: %s Nv.%d  Vida %d  Atq %.0f" % [Game.creature_name(compare), compare["nivel"], int(Game.creature_hp_max(compare)), Game.creature_atk(compare)]
	return t

func open_team() -> void:
	var s := _push("Equipe", [], "")
	_fill_team(s)

func _fill_team(s: MenuScreen) -> void:
	var items: Array = []
	items.append(_hdr("Equipe (%d/3)" % Game.team.size()))
	for i in Game.team.size():
		var uuid: String = Game.team[i]
		var ind: Dictionary = Game.individuals[uuid]
		var lab := "%s%s Nv.%d  %d/%d%s" % ["★ " if i == Game.active_idx else "  ", Game.creature_name(ind), ind["nivel"], int(ind["hp"]), int(Game.creature_hp_max(ind)), " [exausta]" if ind.get("exausta", false) else ""]
		items.append(_it(lab, func(): _creature_menu(uuid, s), func(): return creature_info(ind)))
	items.append(_hdr("Gerenciar"))
	items.append(_it("Santuário (%d/%d)" % [Game.sanctuary.size(), Game.SANCTUARY_CAP], func(): open_storage(), "Armazenamento: leve criaturas para a equipe, dê apelidos, ordene e compare."))
	items.append(_it("Comportamento: %s" % hud._beh_name(), func():
		world.cycle_behavior(); _fill_team(s), "Acompanhar, Atacar alvo, Proteger ou Preservar (poupa criaturas selvagens com ≤20% de vida). Tecla C no jogo.",))
	items.append(_it("Voltar", func(): s.close()))
	s.setup("Equipe", items, "Selecione uma criatura.")
	s.sel = 1
	s.list_w = 200.0

func _creature_menu(uuid: String, parent: MenuScreen) -> void:
	var ind: Dictionary = Game.individuals[uuid]
	var s := _push(Game.creature_name(ind), [], "")
	var build := func():
		pass
	var items: Array = []
	items.append(_it("Tornar ativa", func():
		if ind.get("exausta", false):
			toast("Criatura exausta: recupere no santuário.")
		else:
			Game.set_active(uuid); world.refresh_companion(true); s.close(); _fill_team(parent), "Define esta criatura como a ativa no mapa."))
	items.append(_it("Apelido…", func(): _rename(ind, func(): s.close(); _fill_team(parent)), "Dá um apelido (até 12 letras)."))
	var ev := Game.evolution_status(ind)
	items.append(_it("Evoluir" + ("" if ev["possivel"] else " (indisponível)"), func(): _evolve_confirm(ind, func(): s.close(); _fill_team(parent)), ev.get("motivo", "") if not ev["possivel"] else "Confirme a evolução fora de combate.", ev["possivel"] and not world.in_combat()))
	items.append(_it("Habilidades…", func(): open_habilidades(uuid, func(): s.setup(Game.creature_name(ind), items, creature_info(ind))), "Escolha qual habilidade aprendida a criatura usa no Q (botão estrela no toque)."))
	items.append(_it("Enviar ao santuário", func():
		if Game.move_to_sanctuary(uuid):
			world.refresh_companion(true); s.close(); _fill_team(parent)
		else:
			toast("Precisa manter ao menos uma criatura na equipe."), "Guarda no armazenamento (não recebe XP).", Game.team.size() > 1))
	items.append(_acc_row(uuid, func(): s.close(); _fill_team(parent)))
	items.append(_it("Voltar", func(): s.close()))
	s.setup(Game.creature_name(ind), items, creature_info(ind))
	for it in items:
		if not (it["info"] is Callable) and it["t"] != "Evoluir (indisponível)":
			pass

func _rename(ind: Dictionary, done: Callable) -> void:
	var le := LineEdit.new()
	le.process_mode = Node.PROCESS_MODE_ALWAYS
	le.position = Vector2(140, 110)
	le.size = Vector2(200, 24)
	le.max_length = 12
	le.text = ind.get("apelido", "")
	le.placeholder_text = "Apelido"
	le.add_theme_font_override("font", font)
	le.add_theme_font_size_override("font_size", 8)
	add_child(le)
	le.grab_focus()
	le.text_submitted.connect(func(t):
		ind["apelido"] = t.strip_edges()
		Game.team_changed.emit()
		le.queue_free()
		done.call())
	le.gui_input.connect(func(e):
		if e is InputEventKey and e.pressed and e.keycode == KEY_ESCAPE:
			le.queue_free())

func _evolve_confirm(ind: Dictionary, done: Callable) -> void:
	var ev := Game.evolution_status(ind)
	var to: Dictionary = Data.sp(ev["para"])
	var cur_hp := Game.creature_hp_max(ind)
	var cur_atk := Game.creature_atk(ind)
	var tmp := ind.duplicate(true)
	tmp["species_id"] = ev["para"]
	var msg := "%s evoluirá para %s.\n\nVida máx.: %d → %d\nAtaque: %.0f → %.0f\n\nMantém: identidade, apelido, vínculo, papel e ação ambiental.\nA habilidade ganha potência (×1.4)." % [Game.creature_name(ind), to["nome"], int(cur_hp), int(Game.creature_hp_max(tmp)), cur_atk, Game.creature_atk(tmp)]
	_confirm("Evoluir criatura?", msg, func():
		var evolved := Game.evolve(ind["uuid"])
		if evolved:
			Audio.play("evolve")
			world.refresh_companion(true)
			if world.companion != null:
				world.companion.queue_free()
				world.companion = null
				world.refresh_companion(true)
		done.call()
		if evolved and not Game.hab_novas.is_empty():
			open_habilidades(ind["uuid"], Callable(), Game.hab_novas.duplicate()))

# =============================================================== HABILIDADES DA CRIATURA (escolha da ativa)
## Lista as aprendidas (escolher define a ativa: Q / botão estrela) e as bloqueadas com o nível necessário (cinza).
func open_habilidades(uuid: String, done: Callable = Callable(), novas: Array = []) -> MenuScreen:
	var ind: Dictionary = Game.individuals.get(uuid, {})
	if ind.is_empty():
		return null
	Game.hab_sync(ind, false)
	var s := _push("Habilidades", [], "")
	if done.is_valid():
		s.closed.connect(done)
	s.setup("Habilidades — %s" % Game.creature_name(ind), [], "")
	s.list_w = 200.0
	_hab_fill(s, ind, novas)
	# começa na habilidade ativa
	for i in s.items.size():
		if str(s.items[i]["t"]).begins_with("★"):
			s.sel = i
			break
	s._refresh()
	return s

func _hab_fill(s: MenuScreen, ind: Dictionary, novas: Array) -> void:
	if not is_instance_valid(s):
		return
	var uuid: String = ind["uuid"]
	var items: Array = []
	var ativa := Game.hab_active(ind)
	var learned: Array = ind.get("hab_aprendidas", [])
	if not novas.is_empty():
		var nomes: Array = []
		for h in novas:
			nomes.append(Data.skills[h]["nome"])
		items.append(_hdr("Nova: " + ", ".join(nomes)))
	items.append(_hdr("Aprendidas (%d)" % learned.size()))
	for hid in learned:
		var h: String = hid
		var lab := "%s%s" % ["★ " if h == ativa else "  ", Data.skills[h]["nome"]]
		items.append(_it(lab, func():
			if Game.hab_set_active(uuid, h):
				Audio.play("ui_ok")
				toast("%s usará %s no Q." % [Game.creature_name(ind), Data.skills[h]["nome"]])
			_hab_fill(s, ind, novas), func(): return Game.hab_text(ind, h) + ("\n\n[ATIVA — usada no Q]" if h == Game.hab_active(ind) else "\n\nConfirme para usar no Q.")))
	var locked: Array = []
	for e in Game.hab_list(ind["species_id"]):
		if not learned.has(str(e["id"])):
			locked.append(e)
	if not locked.is_empty():
		items.append(_hdr("Bloqueadas"))
		for e in locked:
			var h2: String = str(e["id"])
			var nv: int = int(e.get("nivel", 1))
			items.append(_it("  %s  (Nv.%d)" % [Data.skills[h2]["nome"], nv], Callable(), func(): return Game.hab_text(ind, h2) + "\n\nAprende no nível %d." % nv, false))
	var ev = Game.sp_of(ind).get("evolucao")
	if ev != null:
		var exclusive: Array = []
		for e2 in Game.hab_list(str(ev["para"])):
			if Game.hab_level(ind["species_id"], str(e2["id"])) == 0:
				exclusive.append(e2)
		if not exclusive.is_empty():
			items.append(_hdr("Após evoluir (%s)" % Data.sp(ev["para"])["nome"]))
			for e3 in exclusive:
				var h3: String = str(e3["id"])
				var nv3: int = int(e3.get("nivel", 1))
				items.append(_it("  %s  (Nv.%d)" % [Data.skills[h3]["nome"], nv3], Callable(), func(): return Game.hab_text(ind, h3) + "\n\nExclusiva da forma evoluída: aprende no nível %d após evoluir." % nv3, false))
	items.append(_it("Voltar", func(): s.close()))
	var keep := s.sel
	s.set_items(items)
	s.sel = clampi(keep, 0, items.size() - 1)
	s._fix_sel(1)
	s._refresh()

func open_storage() -> void:
	var s := _push("Santuário", [], "")
	var mode := ["nome"]
	var fill: Callable
	fill = func():
		var items: Array = []
		items.append(_it("Ordenar por: %s" % mode[0], func():
			mode[0] = {"nome": "nivel", "nivel": "especie", "especie": "nome"}[mode[0]]
			Game.sort_sanctuary(mode[0]); fill.call(), "Alterna ordenação: nome, nível, espécie."))
		if Game.sanctuary.is_empty():
			items.append(_it("(santuário vazio)", Callable(), "Criaturas capturadas com a equipe cheia vêm para cá."))
		for u in Game.sanctuary:
			var ind: Dictionary = Game.individuals[u]
			var uu: String = u
			items.append(_it("%s Nv.%d  %s" % [Game.creature_name(ind), ind["nivel"], Game.sp_of(ind)["nome"]], func(): _storage_menu(uu, fill), func(): return creature_info(ind, Game.active_ind())))
		items.append(_it("Voltar", func(): s.close()))
		s.set_items(items)
	s.setup("Santuário (%d/%d)" % [Game.sanctuary.size(), Game.SANCTUARY_CAP], [], "Selecione uma criatura.")
	s.list_w = 200.0
	fill.call()

func _storage_menu(uuid: String, refill: Callable) -> void:
	var ind: Dictionary = Game.individuals[uuid]
	var s := _push(Game.creature_name(ind), [], "")
	var items: Array = []
	items.append(_it("Levar à equipe", func():
		if Game.move_to_team(uuid):
			s.close(); refill.call()
		else:
			toast("Equipe cheia (3)."), "", Game.team.size() < 3))
	items.append(_it("Apelido…", func(): _rename(ind, func(): s.close(); refill.call())))
	items.append(_it("Habilidades…", func(): open_habilidades(uuid, func(): s.setup(Game.creature_name(ind), items, creature_info(ind, Game.active_ind()))), "Escolha qual habilidade aprendida a criatura usa no Q."))
	items.append(_it("Liberar…", func():
		var why := Game.can_release(uuid)
		if why != "":
			toast(why)
		else:
			_confirm("Liberar %s?" % Game.creature_name(ind), "Esta criatura será liberada para sempre. Isso não pode ser desfeito.", func():
				Game.release(uuid); s.close(); refill.call()), "Liberta a criatura (pede confirmação)."))
	items.append(_acc_row(uuid, func(): s.close(); refill.call()))
	items.append(_it("Voltar", func(): s.close()))
	s.setup(Game.creature_name(ind), items, creature_info(ind, Game.active_ind()))

# =============================================================== INVENTÁRIO / HERÓI
func open_inventory() -> void:
	var s := _push("Inventário", [], "")
	_fill_inventory(s)

func _fill_inventory(s: MenuScreen) -> void:
	var items: Array = []
	items.append(_hdr("Herói Nv.%d  XP %d/%d" % [Game.hero_level(), int(Game.hero["xp"]), Game.xp_to_next(Game.hero_level())]))
	items.append(_it("Vida %d/%d  Ataque %.0f  Redução %d%%" % [int(Game.hero["hp"]), int(Game.hero_max_hp()), Game.hero_atk(), int(Game.hero_reduction() * 100)], Callable(), "Fragmentos: %d" % Game.fragments))
	items.append(_hdr("Talentos (%d pontos)" % int(Game.hero["talent_points"])))
	for k in ["espada", "resistencia", "vinculo"]:
		var kk: String = k
		var desc = {"espada": "+2 de dano de espada por ponto.", "resistencia": "+6 vida e +2% de redução de dano por ponto.", "vinculo": "+2% de chance de captura por ponto."}[kk]
		items.append(_it("%s: %d" % [kk.capitalize(), int(Game.hero["talents"][kk])], func():
			if Game.spend_talent(kk):
				Audio.play("levelup"); _fill_inventory(s)
			else:
				toast("Sem pontos de talento (1 a cada 3 níveis)."), desc + "\nGasta 1 ponto.", int(Game.hero["talent_points"]) > 0))
	items.append(_it("Reespecializar (50 fragmentos)", func():
		if Game.respec(50):
			toast("Talentos redistribuídos."); _fill_inventory(s)
		else:
			toast("Fragmentos insuficientes."), "Devolve todos os pontos gastos."))
	items.append(_hdr("Equipamento (cor = raridade)"))
	var eqs: Array = []
	for id in Data.items:
		if Game.is_equipment(id) and Game.item_count(id) > 0:
			eqs.append(id)
	var slot_order := {"arma": 0, "protecao": 1, "amuleto": 2}
	eqs.sort_custom(func(x, y):
		var sx: int = slot_order[Data.items[x]["tipo"]]; var sy: int = slot_order[Data.items[y]["tipo"]]
		return sx < sy or (sx == sy and Game.rarity_of(x) > Game.rarity_of(y)))
	for id in eqs:
		var it: Dictionary = Data.items[id]
		var idd: String = id
		var eq: bool = Game.equipment.get(it["tipo"], "") == idd
		var lv := Game.upgrade_level(idd)
		var row := _it("%s%s%s" % ["● " if eq else "  ", it["nome"], (" +%d" % lv) if lv > 0 else ""], func(): _equip_menu(idd, s), func(): return Game.item_details(idd))
		row["col"] = Game.rarity_color(idd)
		row["icol"] = Game.rarity_color(idd).lerp(Color.WHITE, 0.55)
		row["icon"] = Game.item_icon(idd)
		items.append(row)
	var accs: Array = []
	for ida in Data.items:
		if Data.items[ida]["tipo"] == "acessorio_criatura" and Game.item_count(ida) > 0:
			var idac: String = ida
			var users: Array = []
			for u in Game.individuals:
				if str(Game.individuals[u].get("acessorio", "")) == idac:
					users.append(Game.creature_name(Game.individuals[u]))
			var ra := _it("%s%s" % [Data.items[idac]["nome"], (" x%d" % Game.item_count(idac)) if Game.item_count(idac) > 1 else ""], Callable(),
				Data.items[idac]["desc"] + "\n\nEm uso por: " + (", ".join(users) if users.size() > 0 else "ninguém") + "\nEquipe pela tela da Equipe (escolha a criatura).")
			ra["col"] = Game.rarity_color(idac)
			ra["icon"] = Game.item_icon(idac)
			accs.append(ra)
	if not accs.is_empty():
		items.append(_hdr("Acessórios de criatura"))
		items.append_array(accs)
	items.append(_hdr("Itens"))
	for id2 in Data.items:
		var it2: Dictionary = Data.items[id2]
		var id2c: String = id2
		if it2["tipo"] in ["selo", "consumivel", "consumivel_criatura"] and Game.item_count(id2c) > 0:
			var r2 := _it("%s x%d" % [it2["nome"], Game.item_count(id2c)], func(): _use_item(id2c, s), it2["desc"] + "\nAção: usar", it2["tipo"] != "selo")
			r2["icon"] = Game.item_icon(id2c)
			items.append(r2)
	var mats: Array = []
	for id3 in Data.items:
		var it3: Dictionary = Data.items[id3]
		if it3["tipo"] in ["material", "tecnica", "historia", "melhoria"] and Game.item_count(id3) > 0:
			var r3 := _it("%s%s" % [it3["nome"], (" x%d" % Game.item_count(id3)) if it3["tipo"] in ["material", "melhoria"] else ""], Callable(), it3["desc"])
			r3["icon"] = Game.item_icon(id3)
			if it3.has("raridade"):
				r3["col"] = Game.rarity_color(id3)
			mats.append(r3)
	if not mats.is_empty():
		items.append(_hdr("Materiais, técnicas e diários"))
		items.append_array(mats)
	items.append(_hdr("Técnicas"))
	for t in HeroPowers.TECHS:
		var ok: bool = Game.hero_level() >= int(t["nivel"])
		items.append(_it(("%s" % t["nome"]) if ok else ("Nv.%d — ???" % int(t["nivel"])), Callable(),
			("%s\n\n%s\n\nComo usar: %s" % [t["nome"], t["desc"], t["como"]]) if ok else "Técnica liberada no nível %d." % int(t["nivel"])))
	items.append(_hdr("Ecos"))
	for e in Game.ecos:
		var ee: String = e
		var slot_i: int = Game.eco_slots.find(ee)
		items.append(_it("%s  [%s]" % [Data.skills[ee]["nome"], ("atalho %d" % (slot_i + 1)) if slot_i >= 0 else "sem atalho"], func():
			# confirma: alterna o Eco entre os atalhos 1 e 2 (troca com o que estava lá)
			var cur: int = Game.eco_slots.find(ee)
			var to: int = 1 if cur == 0 else 0
			var other: String = Game.eco_slots[to]
			Game.eco_slots[to] = ee
			if cur >= 0:
				Game.eco_slots[cur] = other
			Game.eco_changed.emit()
			toast("%s no atalho %d." % [Data.skills[ee]["nome"], to + 1])
			_fill_inventory(s), Data.skills[ee]["descricao"] + "\nTravessia contextual (E) não gasta energia.\nConfirme para trocar o atalho (1/2) deste Eco."))
	if Game.ecos.is_empty():
		items.append(_it("(nenhum ainda)", Callable(), "Guardiões concedem Ecos permanentes."))
	items.append(_it("Voltar", func(): s.close()))
	s.setup("Inventário e herói", items, "")
	s.list_w = 220.0
	s.sel = 1

func _equip_menu(id: String, parent: MenuScreen) -> void:
	var it: Dictionary = Data.items[id]
	var s := _push(it["nome"], [], "")
	var eq: bool = Game.equipment.get(it["tipo"], "") == id
	var why := Game.dismantle_check(id)
	var items: Array = []
	items.append(_it("Equipar" if not eq else "Equipado", func():
		Game.equip(id); s.close(); _fill_inventory(parent), Game.item_details(id), not eq))
	items.append(_it("Desmontar…", func():
		_confirm("Desmontar %s?" % it["nome"], Game.item_details(id) + "\n\nA peça some para sempre.", func():
			if Game.dismantle(id):
				Audio.play("thud"); s.close(); _fill_inventory(parent)), Game.item_details(id) if why == "" else why, why == ""))
	items.append(_it("Voltar", func(): s.close()))
	for row in items:
		row["icon"] = Game.item_icon(id)
		row["icol"] = Game.rarity_color(id).lerp(Color.WHITE, 0.55)
	s.setup(it["nome"], items, Game.item_details(id))

func open_craft() -> void:
	var s := _push("Montar equipamento", [], "")
	_fill_craft(s)

func _fill_craft(s: MenuScreen) -> void:
	var items: Array = []
	var ids: Array = Data.recipes.keys()
	ids.sort_custom(func(x, y): return Game.rarity_of(x) < Game.rarity_of(y))
	for rid in ids:
		var r: String = rid
		var why := Game.craft_check(r)
		var info := func(): return Game.item_details(r).split("\n\nDesmontar")[0] + "\n\nCusto: " + Game.craft_cost_text(r) + ("" if Game.craft_check(r) == "" else "\n\n" + Game.craft_check(r))
		var row := _it(Data.items[r]["nome"] if Game.has_flag(str(Data.recipes[r].get("requer", ""))) or not Data.recipes[r].has("requer") else "??? (" + Game.rarity_name(r) + ")", func():
			var w2 := Game.craft_check(r)
			if w2 != "":
				toast(w2); Audio.play("puzzle_no"); return
			_confirm("Montar %s?" % Data.items[r]["nome"], "Custo: " + Game.craft_cost_text(r), func():
				if Game.craft(r):
					Audio.play("levelup"); world.shake(1.0, 0.1)
				_fill_craft(s)), info, why == "" or why == "Faltam materiais." or why == "Fragmentos insuficientes.")
		row["col"] = Game.rarity_color(r)
		row["icol"] = Game.rarity_color(r).lerp(Color.WHITE, 0.55)
		row["icon"] = Game.item_icon(r)
		items.append(row)
	items.append(_it("Voltar", func(): s.close()))
	s.setup("Montar — fragmentos: %d" % Game.fragments, items, "")
	s.list_w = 230.0

func open_dismantle() -> void:
	var s := _push("Desmontar equipamento", [], "")
	_fill_dismantle(s)

func _fill_dismantle(s: MenuScreen) -> void:
	var items: Array = []
	for id in Data.items:
		if Game.is_equipment(id) and Game.item_count(id) > 0:
			var idd: String = id
			var why := Game.dismantle_check(idd)
			var row := _it(Data.items[idd]["nome"] + ((" +%d" % Game.upgrade_level(idd)) if Game.upgrade_level(idd) > 0 else ""), func():
				_confirm("Desmontar %s?" % Data.items[idd]["nome"], Game.item_details(idd) + "\n\nA peça some para sempre.", func():
					if Game.dismantle(idd):
						Audio.play("thud")
					_fill_dismantle(s)), func(): return Game.item_details(idd) + ("" if Game.dismantle_check(idd) == "" else "\n\n" + Game.dismantle_check(idd)), why == "")
			row["col"] = Game.rarity_color(idd)
			row["icol"] = Game.rarity_color(idd).lerp(Color.WHITE, 0.55)
			row["icon"] = Game.item_icon(idd)
			items.append(row)
	if items.is_empty():
		items.append(_it("(nada para desmontar)", Callable(), "Peças equipadas não podem ser desmontadas."))
	items.append(_it("Voltar", func(): s.close()))
	s.setup("Desmontar", items, "")
	s.list_w = 230.0

func _use_item(id: String, s: MenuScreen) -> void:
	if world.in_combat():
		toast("Não é possível usar agora.")
		return
	var it: Dictionary = Data.items[id]
	if it["tipo"] == "consumivel":
		if float(Game.hero["hp"]) >= Game.hero_max_hp():
			toast("Vida cheia.")
			return
		if Game.take_item(id, 1):
			world.player.heal(float(it["cura"])); Audio.play("heal")
	elif it["tipo"] == "consumivel_criatura":
		var ex: Array = []
		for u in Game.team:
			if Game.individuals[u].get("exausta", false):
				ex.append(u)
		if ex.is_empty():
			toast("Nenhuma criatura exausta.")
			return
		if Game.take_item(id, 1):
			Game.revive_creature(ex[0]); Audio.play("heal")
			world.refresh_companion(true)
	_fill_inventory(s)

# =============================================================== BESTIÁRIO / DIÁRIO / MAPA
func open_bestiary() -> void:
	var s := _push("Bestiário", [], "")
	var items: Array = []
	var seen := 0; var cap := 0
	var order: Array = []
	for id in Data.species:
		order.append(id)
	order.sort_custom(func(a, b): return int(Data.species[a]["regiao"]) < int(Data.species[b]["regiao"]) or (int(Data.species[a]["regiao"]) == int(Data.species[b]["regiao"]) and false))
	var base_ids: Array = []
	for id in order:
		if not str(Data.species[id]["habitat"]).begins_with("Evolução"):
			base_ids.append(id)
	for id in base_ids:
		var sp: Dictionary = Data.species[id]
		var b: Dictionary = Game.bestiary.get(id, {})
		var idd: String = id
		var vis: bool = b.get("visto", false)
		if vis: seen += 1
		if b.get("capturado", false): cap += 1
		var evo_id: String = sp["evolucao"]["para"] if sp.get("evolucao") != null else ""
		var evo_found: bool = evo_id != "" and Game.bestiary.get(evo_id, {}).get("evoluiu", false)
		items.append(_it("%s %s" % [("+" if b.get("capturado", false) else ("•" if vis else "?")), sp["nome"] if vis else "???"], Callable(), func():
			if not vis:
				return "Ainda não encontrada.\nRegião %d — %s" % [sp["regiao"], "jogável" if sp["status"] == "jogavel" else "em desenvolvimento nesta versão"]
			var skn: Dictionary = Data.skills[sp["skill"]]
			return "%s\nAfinidade: %s   Raridade: %s   Papel: %s\nHabitat: %s\n%s\n\nHabilidade: %s — %s\nPassiva: %s\nAção ambiental: %s\n\nVisto: sim   Capturado: %s\nEvolução: %s" % [
				sp["nome"], sp["afinidade"], sp["raridade"], sp["papel"], sp["habitat"], sp["descricao"], skn["nome"], skn["descricao"], sp["passiva"], sp["acao_ambiental"],
				"sim" if b.get("capturado", false) else "não",
				("descoberta: %s (nv.%d)" % [Data.sp(evo_id)["nome"], sp["evolucao"]["nivel"]]) if evo_found else ("%s no nv.%d (não vista)" % ["???", sp["evolucao"]["nivel"]] if evo_id != "" else "—")] + "\n" + Weather.species_note(sp["afinidade"]) + Catedral.harmonia_note(idd)))
	items.append(_it("Voltar", func(): s.close()))
	s.setup("Bestiário  vistas %d • capturadas %d / %d" % [seen, cap, base_ids.size()], items, "")
	s.list_w = 200.0

func open_diary() -> void:
	var s := _push("Diário", [], "")
	var lines := Game.diary_lines()
	var items: Array = []
	items.append(_hdr("Missões"))
	for l in lines:
		items.append(_it(l, Callable(), "\n".join(lines)))
	# o fio da história: memórias dos guardiões e as páginas da Mestra Ione
	var mems: Array = []
	for f in Data.story.get("memorias", {}):
		if Game.has_flag("mem_" + f):
			var m: Dictionary = Data.story["memorias"][f]
			var txt: String = "\n\n".join(m["linhas"])
			var it: String = str(m.get("item", ""))
			if it != "" and Data.items.has(it):
				txt += "\n\n— " + Data.items[it]["nome"] + " —\n" + Data.items[it]["desc"]
			var row := _it(m["titulo"], Callable(), txt)
			row["col"] = Color(0.85, 0.8, 1.0)
			mems.append(row)
	items.append(_hdr("Memórias e Diário de Ione"))
	if mems.is_empty():
		items.append(_it("(nenhuma ainda)", Callable(), "Cada guardião que cai mostra uma memória do passado e o rastro da Mestra Ione, sua mentora desaparecida."))
	else:
		items.append_array(mems)
	items.append(_it("Voltar", func(): s.close(), "\n".join(lines)))
	s.setup("Diário", items, "\n".join(lines))
	s.list_w = 250.0

func open_map() -> void:
	var s := _push("Mapa", [], "")
	var items: Array = []
	for rid in Data.regions:
		var r: Dictionary = Data.regions[rid]
		items.append(_hdr("%s  (%s)" % [r["nome"], r["status"]]))
		for mid in r["mapas"]:
			var m: Dictionary = Data.maps[mid]
			var visited: bool = Game.has_flag("visitou_" + mid)
			var note := ""
			match mid:
				"vila_lumen": note = "" if Game.has_flag("cervo_morto") else "  ⚠ raízes ao norte"
				"desfiladeiro": note = "" if Game.has_flag("ponte_minas") else "  ⚠ ponte (Raiz Viva)"
				"bosque_lanternas": note = "" if Game.has_flag("bosque_flores") else "  ⚠ portão de flores"
				"clareira_raizes": note = "" if Game.has_flag("clareira_placas") else "  ⚠ raízes/placas"
				"forja_cobre":
					var n2: Array = []
					if not Game.has_flag("forja_rocha"): n2.append("⚠ rocha fissurada — Ruptura Ígnea")
					if not Game.has_flag("ferreiro_morto"): n2.append("⚠ elevador parado")
					n2.append("⚠ inscrição oculta — Olhar Velado")
					note = "  " + ", ".join(n2)
				"pedreira_oca":
					note = "  ⚠ veio selado — Ruptura Ígnea" if Game.has_flag("veio_revelado") and not Game.has_flag("veio_rocha") else ("" if Game.has_flag("veio_revelado") else "  ⚠ corrente de ar")
				"trilhos_fundidos": note = "" if Game.has_flag("trilhos_carrinho") else "  ⚠ portão do carrinho"
				"fundicao_a": note = "  ⚠ inscrição oculta — Olhar Velado"
				"rito_forja": note = "" if Game.has_flag("rito_rocha") else ("  ⚠ rocha fissurada — Ruptura Ígnea (rito avançado)" if Game.has_flag("rito_ok") else "")
			items.append(_it("%s %s%s" % ["+" if visited else "·", m["name"] if visited else "???", note], Callable(), "Bloqueios marcados com ⚠ mostram o que ainda impede a passagem."))
	items.append(_it("Voltar", func(): s.close()))
	s.setup("Mapa do continente de Auralis", items, "+ visitada   · ainda não visitada   ⚠ bloqueio.")
	s.list_w = 250.0

# =============================================================== SALVAR
func open_save_slots() -> void:
	var s := _push("Salvar jogo", [], "")
	var items: Array = []
	for i in [1, 2, 3]:
		var idx: int = i
		items.append(_it(_slot_label(idx), func():
			if world.save_now(idx):
				toast("Jogo salvo no slot %d." % idx)
				s.close()
			else:
				toast("Não é possível salvar agora (combate/captura)." if not Game.can_save() or world.in_combat() else SaveSys.last_error), "Grava neste slot. Só em estado estável."))
	s.setup("Salvar jogo", items, "Fora de combate e de capturas. Posição insegura usa o santuário associado.")

# =============================================================== SANTUÁRIO (MENU)
func open_shrine_menu() -> void:
	var s := _push("Santuário", [], "")
	s.can_cancel = true
	var items := [
		_it("Descansar (curar tudo)", func(): world.rest_at_shrine(); toast("Descansou. Criaturas e herói recuperados."), "Restaura herói e criaturas (inclusive exaustas). Inimigos comuns reaparecem."),
		_it("Salvar jogo", func(): open_save_slots(), "Grava o progresso."),
		_it("Equipe e criaturas", func(): open_team(), "Troque criaturas com o armazenamento do santuário e evolua as que estiverem prontas."),
		_it("Armazenamento (%d/%d)" % [Game.sanctuary.size(), Game.SANCTUARY_CAP], func(): open_storage(), "Criaturas guardadas: leve para a equipe (máximo 3), dê apelidos, ordene ou liberte."),
		_it("Reespecializar talentos (50)", func(): if Game.respec(50): toast("Talentos redistribuídos.") else: toast("Fragmentos insuficientes."), "Redistribui pontos de talento."),
		_it("Sair", func(): s.close()),
	]
	s.setup("Santuário", items, "Um ponto de retorno: você volta aqui se cair em combate.")
	s.closed.connect(func(): if world.player.state == Player.S.INTERACT and not has_screen(): world.player.set_busy(false))

# =============================================================== LOJA
func open_shop(shop_id := "ysa") -> void:
	world.player.set_busy(true)
	var shop: Dictionary = Data.forge.get("lojas", {}).get(shop_id, {"nome": "Loja", "itens": []})
	var title: String = shop["nome"]
	var s := _push(title, [], "")
	var items: Array = []
	for id in shop["itens"]:
		var idd: String = id
		var it: Dictionary = Data.items[idd]
		items.append(_it("%s  — %d" % [it["nome"], int(it["preco"])], func():
			var err := Game.buy(idd)
			if err != "":
				toast(err)
			else:
				Audio.play("pickup"); toast("Comprou %s." % it["nome"]); s.footer = "Fragmentos: %d" % Game.fragments, it["desc"] + "\nPreço: %d fragmentos." % int(it["preco"])))
	items.append(_it("Sair", func(): s.close()))
	s.setup(title, items, "Fragmentos: %d" % Game.fragments)
	s.footer = "Fragmentos: %d" % Game.fragments
	s.closed.connect(func(): world.player.set_busy(false))

# =============================================================== OPÇÕES
func open_options() -> void:
	var s := _push("Opções", [], "")
	_fill_options(s)

func _fill_options(s: MenuScreen) -> void:
	var p: Dictionary = Game.prefs
	var pct := func(v: float) -> String: return "%d%%" % int(round(v * 100.0))
	var slider := func(label: String, key: String, info: String) -> Dictionary:
		return {"t": "%s: %s" % [label, pct.call(p[key])], "info": info,
			"l": func(): p[key] = max(0.0, snappedf(float(p[key]) - 0.1, 0.1)); Audio.apply_volumes(); Game.save_prefs(); _fill_options(s),
			"r": func(): p[key] = min(1.0, snappedf(float(p[key]) + 0.1, 0.1)); Audio.apply_volumes(); Game.save_prefs(); _fill_options(s)}
	var toggle := func(label: String, key: String, info: String) -> Dictionary:
		return {"t": "%s: %s" % [label, "sim" if p[key] else "não"], "info": info,
			"fn": func(): p[key] = not p[key]; Game.save_prefs(); _fill_options(s)}
	var items: Array = []
	items.append(_hdr("Áudio"))
	items.append(slider.call("Volume geral", "master", "← → ajustam."))
	items.append(slider.call("Música", "musica", ""))
	items.append(slider.call("Efeitos", "efeitos", ""))
	items.append(_hdr("Acessibilidade"))
	items.append(toggle.call("Reduzir tremor de tela", "reduz_tremor", "Desliga o tremor de câmera."))
	items.append(toggle.call("Reduzir flashes/impacto", "reduz_flash", "Desliga o congelamento de impacto."))
	items.append(toggle.call("Perigo por forma e cor", "formas_perigo", "Avisos de ataque sempre usam símbolo + contorno além da cor."))
	items.append({"t": "Escala de texto: %d%%" % int(round(p["texto"] * 100.0)), "info": "Afeta diálogos e menus nesta versão (mínimo 100%).",
		"l": func(): p["texto"] = max(1.0, snappedf(float(p["texto"]) - 0.1, 0.1)); Game.save_prefs(); _fill_options(s),
		"r": func(): p["texto"] = min(1.4, snappedf(float(p["texto"]) + 0.1, 0.1)); Game.save_prefs(); _fill_options(s)})
	items.append(_hdr("Jogo"))
	items.append({"t": "Dificuldade: %s" % ("Aventura" if Game.difficulty == "aventura" else "Desafio"),
		"info": "Aventura: -25% de dano inimigo e avisos 20% mais longos. Desafio: valores-base. Só fora de combate.",
		"fn": func():
			if world != null and world.map != null and world.in_combat():
				toast("Só fora de combate.")
			else:
				Game.difficulty = "desafio" if Game.difficulty == "aventura" else "aventura"; _fill_options(s)})
	items.append(_hdr("Controles (Enter/E para remapear)"))
	for a in Game.ACTION_NAMES:
		var aa: String = a
		var keys: Array = p["keys"].get(aa, Game.DEFAULT_KEYS[aa])
		var names: Array = []
		for k in keys:
			names.append(OS.get_keycode_string(int(k)))
		items.append({"t": "%s: %s" % [Game.ACTION_NAMES[aa], " / ".join(names)], "info": "Pressione E e depois a nova tecla. Mouse: botão esquerdo ataca, direito defende.",
			"fn": func(): s.key_capture = aa; s.on_key = func(): _fill_options(s)})
	items.append(_it("Restaurar controles padrão", func(): Game.reset_keys(); _fill_options(s), ""))
	items.append(_it("Voltar", func(): s.close()))
	var keep := s.sel
	s.setup("Opções", items, "")
	s.sel = keep
	s.list_w = 250.0

# =============================================================== FORJA (melhoria de equipamento)
## Lista o equipamento usado; a informação mostra antes → depois e o custo. Confirmar pede uma tela de comparação.
func open_forge() -> void:
	world.player.set_busy(true)
	var s := _push("Forja", [], "")
	_fill_forge(s)
	s.closed.connect(func(): if world.player.state == Player.S.INTERACT and not has_screen(): world.player.set_busy(false))

func _forge_info(id: String) -> String:
	if id == "":
		return "Nada equipado neste espaço."
	var pv := Game.forge_preview(id)
	var why := Game.forge_check(id)
	var t := "%s  +%d\n\nAntes:  %s\nDepois: %s\n\nCusto: %s" % [Data.items[id]["nome"], pv["nivel"], pv["antes"], pv["depois"], pv["custo"]]
	if why != "":
		t += "\n\n" + why
	return t

func _fill_forge(s: MenuScreen) -> void:
	var items: Array = []
	items.append(_hdr("Equipamento em uso"))
	for slot in ["arma", "protecao", "amuleto"]:
		var id: String = Game.equipment.get(slot, "")
		var label: String = {"arma": "Arma", "protecao": "Proteção", "amuleto": "Amuleto"}[slot]
		if id == "":
			items.append(_it("%s: —" % label, Callable(), "Nada equipado neste espaço.", false))
			continue
		var idd := id
		items.append(_it("%s: %s +%d" % [label, Data.items[id]["nome"], Game.upgrade_level(id)], func():
			var why := Game.forge_check(idd)
			if why != "":
				toast(why)
				Audio.play("puzzle_no")
				return
			var pv := Game.forge_preview(idd)
			_confirm("Melhorar %s para +%d?" % [Data.items[idd]["nome"], int(pv["nivel"]) + 1],
				"ANTES:  %s\nDEPOIS: %s\n\nCusto: %s" % [pv["antes"], pv["depois"], pv["custo"]], func():
					if Game.forge_upgrade(idd):
						Audio.play("levelup")
						world.shake(1.0, 0.1)
					_fill_forge(s)), func(): return _forge_info(idd)))
	items.append(_hdr("Oficina"))
	items.append(_it("Montar equipamento", func(): open_craft(), "Monte peças novas com essências e materiais. A cor mostra a raridade: verde, azul, roxo, laranja e vermelho."))
	items.append(_it("Desmontar equipamento", func(): open_dismantle(), "Transforme peças que você não usa em essências da mesma cor e fragmentos."))
	items.append(_hdr("Materiais"))
	for mat in ["minerio_cobre", "brasa_viva", "lingote", "essencia_verde", "essencia_azul", "essencia_roxa", "essencia_laranja", "essencia_rubra", "casca_oca", "osso_ancestral"]:
		items.append(_it("%s x%d" % [Data.items[mat]["nome"], Game.item_count(mat)], Callable(), Data.items[mat]["desc"]))
	items.append(_it("Sair", func(): s.close()))
	s.setup("Forja — fragmentos: %d" % Game.fragments, items, "Escolha o que melhorar.")
	s.list_w = 230.0

# =============================================================== CONTRATOS EM GRUPO
func open_contracts() -> void:
	world.player.set_busy(true)
	var s := _push("Quadro de Contratos", [], "")
	_fill_contracts(s)
	s.closed.connect(func(): if world.player.state == Player.S.INTERACT and not has_screen(): world.player.set_busy(false))

func _contract_info(cid: String) -> String:
	var c: Dictionary = Data.contracts[cid]
	var names: Array = []
	for a in c["aliados"]:
		names.append("%s (%s)" % [Data.allies[a]["nome"], Data.allies[a]["titulo"]])
	var r: Dictionary = c.get("recompensa", {})
	var its: Array = []
	for it in r.get("itens", {}):
		its.append("%s x%d" % [Data.items.get(it, {}).get("nome", it), int(r["itens"][it])])
	var t := "%s — %s, nível sugerido %d\n\n%s\n\nCom você: %s\n\nRecompensa: %d fragmentos, %d XP%s" % [c["nome"], {"dupla": "DUPLA", "trio": "TRIO", "caca": "CAÇADA"}.get(c["tipo"], ""), int(c["nivel"]),
		c["texto"], ", ".join(names) if names.size() > 0 else "ninguém (solo)", int(r.get("fragmentos", 0)), int(r.get("xp", 0)), ("\n" + ", ".join(its)) if its.size() > 0 else ""]
	var why := Game.contract_lock_reason(cid)
	if Game.contract_state(cid) == "bloqueado" and why != "":
		t += "\n\n" + why
	return t

func _fill_contracts(s: MenuScreen) -> void:
	var items: Array = []
	items.append(_hdr("Contratos e caçadas"))
	for cid in Data.contracts:
		var c: Dictionary = Data.contracts[cid]
		var stt := Game.contract_state(cid)
		var tag: String = {"feito": "", "ativo": "> ", "bloqueado": "", "ocupado": "", "disponivel": ""}.get(stt, "")
		var lab := "%s%s" % [tag, c["nome"]]
		var idc: String = cid
		var row := _it(lab, func(): _contract_pick(idc, s), func(): return _contract_info(idc), stt != "bloqueado")
		row["icon"] = Art.region("icons_grupo", (2 if c["tipo"] != "trio" else 3) * 16, 0, 16, 16) if ResourceLoader.exists("res://assets/sprites/icons_grupo.png") else null
		if stt == "feito":
			row["col"] = Color(0.6, 0.9, 0.6)
		items.append(row)
	items.append(_hdr("Patrulha"))
	for aid in Data.allies:
		var al: Dictionary = Data.allies[aid]
		var ida: String = aid
		var on: bool = aid in Game.party
		var ok := Game.can_recruit(aid) or on
		var r2 := _it("%s %s — %s" % ["[no grupo]" if on else "", al["nome"], al["titulo"]], func():
			if not (Game.can_recruit(ida) or ida in Game.party):
				toast("Disponível depois de um contrato com %s." % Data.allies[ida]["nome"])
				return
			Game.toggle_party(ida)
			Audio.play("ui_ok")
			_fill_contracts(s), al["desc"] + ("\n\nNo grupo: aperte de novo para dispensar." if on else ("\n\nConvocar para acompanhar você." if ok else "\n\nDisponível depois de um contrato juntos.")), ok)
		r2["icon"] = Art.region("icons_grupo", int(al["icone"]) * 16, 0, 16, 16) if ResourceLoader.exists("res://assets/sprites/icons_grupo.png") else null
		items.append(r2)
	items.append(_it("Voltar", func(): s.close()))
	var keep: int = s.sel if s.sel > 0 else 1
	s.list_w = 250.0
	s.setup("Quadro de Contratos — fragmentos: %d" % Game.fragments, items, "")
	s.sel = min(keep, items.size() - 1)

func _contract_pick(idc: String, s: MenuScreen) -> void:
	match Game.contract_state(idc):
		"disponivel":
			_confirm("Aceitar \"%s\"?" % Data.contracts[idc]["nome"], _contract_info(idc), func():
				if Game.accept_contract(idc):
					Audio.play("ui_ok")
					for a in Data.contracts[idc]["aliados"]:
						toast(Data.allies[a]["falas"]["entra"])
				_fill_contracts(s))
		"ativo":
			_confirm("Desistir do contrato?", "Os aliados voltam para a vila. Você pode aceitar de novo depois.", func():
				Game.abandon_contract()
				_fill_contracts(s))
		"ocupado":
			toast("Termine o contrato ativo antes.")
		"feito":
			toast("Contrato já concluído.")
		_:
			toast(Game.contract_lock_reason(idc))
			Audio.play("puzzle_no")

# =============================================================== ACESSÓRIOS DE CRIATURA
func _acc_row(uuid: String, done: Callable) -> Dictionary:
	var ind: Dictionary = Game.individuals[uuid]
	var acc: String = str(ind.get("acessorio", ""))
	var lab := "Acessório: %s" % (Data.items[acc]["nome"] if acc != "" and Data.items.has(acc) else "—")
	var row := _it(lab, func(): _acc_menu(uuid, done), "Equipe um acessório nesta criatura (coleira, garras, guizo...). Cada peça serve a uma criatura por vez.")
	if acc != "" and Data.items.has(acc):
		row["col"] = Game.rarity_color(acc)
	return row

func _acc_menu(uuid: String, done: Callable) -> void:
	var ind: Dictionary = Game.individuals[uuid]
	var s := _push("Acessório — " + Game.creature_name(ind), [], "")
	var items: Array = []
	var cur: String = str(ind.get("acessorio", ""))
	if cur != "":
		items.append(_it("Remover %s" % Data.items[cur]["nome"], func():
			Game.equip_creature(uuid, ""); Audio.play("ui_back"); s.close(); done.call(), "Devolve o acessório à bolsa."))
	var any := false
	for id in Data.items:
		if Data.items[id]["tipo"] != "acessorio_criatura" or Game.item_count(id) <= 0 or id == cur:
			continue
		any = true
		var idd: String = id
		var free := Game.acc_available(idd, uuid)
		var row := _it(Data.items[idd]["nome"] + ("" if free else " (em uso)"), func():
			if Game.equip_creature(uuid, idd):
				Audio.play("ui_ok"); toast("%s equipou %s." % [Game.creature_name(ind), Data.items[idd]["nome"]]); s.close(); done.call()
			else:
				toast("Esta peça já está em outra criatura."), func(): return Data.items[idd]["desc"] + _acc_preview(ind, idd), free)
		row["col"] = Game.rarity_color(idd)
		row["icon"] = Game.item_icon(idd)
		items.append(row)
	if not any and cur == "":
		items.append(_it("(nenhum acessório)", Callable(), "Compre na loja da Ysa, monte na Oficina ou ganhe em contratos."))
	items.append(_it("Voltar", func(): s.close()))
	s.setup("Acessório — " + Game.creature_name(ind), items, "")

func _acc_preview(ind: Dictionary, id: String) -> String:
	var hp0 := Game.creature_hp_max(ind); var at0 := Game.creature_atk(ind)
	var old = ind.get("acessorio", "")
	ind["acessorio"] = id
	var hp1 := Game.creature_hp_max(ind); var at1 := Game.creature_atk(ind)
	ind["acessorio"] = old
	return "\n\nAntes:  Vida %d  Ataque %.0f\nDepois: Vida %d  Ataque %.0f" % [int(hp0), at0, int(hp1), at1]

# =============================================================== JORNADA
func open_journey() -> void:
	var s := _push("Jornada", [], "")
	var items: Array = []
	var j: Dictionary = Data.story.get("jornada", {})
	var goal := "GRANDE OBJETIVO\n%s\n\nConquista total: %d%%" % [j.get("objetivo", ""), Game.conquest_pct()]
	items.append(_hdr("Os cinco guardiões (%d/5)" % Game.guardians_done()))
	for g in j.get("guardioes", []):
		var done: bool = Game.has_flag(g["flag"])
		var reg: Dictionary = Data.regions.get(g["regiao"], {})
		var open_reg: bool = reg.get("status", "") == "jogavel"
		var lab := "%s %s" % ["[X]" if done else "[ ]", reg.get("nome", g["regiao"])]
		var info := "%s\n\nGuardião: %s\nEco: %s\n\n%s" % [reg.get("nome", ""), g["nome"] if (done or open_reg) else "desconhecido", g["eco"] if done else "???",
			"Libertado!" if done else ("Região aberta: vá até lá." if open_reg else "Ainda inalcançável (em desenvolvimento).")]
		var row := _it(lab, Callable(), info)
		row["col"] = Color(0.6, 1.0, 0.6) if done else (Color.WHITE if open_reg else Color(0.6, 0.6, 0.7))
		items.append(row)
	items.append(_hdr("Conquistar tudo: %d%%" % Game.conquest_pct()))
	for p in Game.conquest_parts():
		var row2 := _it("%s: %d/%d" % [p[0], int(p[1]), int(p[2])], Callable(), goal)
		if int(p[1]) >= int(p[2]) and int(p[2]) > 0:
			row2["col"] = Color(0.6, 1.0, 0.6)
		items.append(row2)
	items.append(_it("Voltar", func(): s.close(), goal))
	s.list_w = 250.0
	s.setup("Jornada — %d%%" % Game.conquest_pct(), items, goal)
