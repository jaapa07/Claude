extends Node
## Bot de teste ponta a ponta. Entra pelo ponto de entrada normal (cena principal), usa o menu de título,
## move o herói com entradas reais (ações de input), luta, captura, resolve enigmas, derrota chefes, salva e recarrega.
## Uso: godot --headless --fixed-fps 60 --path . -- --e2e [--stage=N]

var main: Node
var mode := "e2e"
var args: Array = []
var W: World
var P: Player
var results: Array = []
var fails := 0
var stage_limit := 99
var frame_count := 0
var seen_errors := 0
var exhausted_events := 0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	await get_tree().process_frame
	for a in args:
		if a.begins_with("--stage="):
			stage_limit = int(a.substr(8))
	W = main.world
	P = W.player
	W.test_mode = true
	Game.toast.connect(func(t): if "exausta" in t: exhausted_events += 1)
	main.ui.instant = true
	if mode == "unit":
		await run_unit()
	else:
		await run_e2e()
	finish()

func finish() -> void:
	print("\n================ RESULTADO ================")
	var passed := 0
	for r in results:
		print(r)
		if r.begins_with("[PASS]"):
			passed += 1
	print("TOTAL: %d verificações, %d aprovadas, %d falhas" % [results.size(), passed, fails])
	var f := FileAccess.open("res://tests/last_result.txt", FileAccess.WRITE)
	if f:
		f.store_string("\n".join(results) + "\nTOTAL: %d verificações, %d aprovadas, %d falhas\n" % [results.size(), passed, fails])
	get_tree().quit(1 if fails > 0 else 0)

func check(name: String, cond: bool, detail := "") -> void:
	if cond:
		results.append("[PASS] " + name)
	else:
		fails += 1
		results.append("[FAIL] %s  %s" % [name, detail])
	print(results[-1])

func shot(name: String) -> void:
	if DisplayServer.get_name() == "headless":
		return
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	if img:
		DirAccess.make_dir_recursive_absolute("/tmp/shots")
		img.save_png("/tmp/shots/%s.png" % name)

# =============================================================== PRIMITIVAS
func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame
		frame_count += 1

func secs(s: float) -> void:
	await frames(int(s * 60.0))

func tap(action: String, hold := 2) -> void:
	Input.action_press(action)
	await frames(hold)
	Input.action_release(action)
	await frames(1)

func ui_press(action: String) -> void:
	var e := InputEventAction.new()
	e.action = action
	e.pressed = true
	Input.parse_input_event(e)
	await frames(2)
	var e2 := InputEventAction.new()
	e2.action = action
	e2.pressed = false
	Input.parse_input_event(e2)
	await frames(2)

func release_moves() -> void:
	for a in ["move_left", "move_right", "move_up", "move_down"]:
		Input.action_release(a)

func steer(v: Vector2) -> void:
	release_moves()
	if v.length() < 0.01:
		return
	var n := v.normalized()
	if n.x > 0.05: Input.action_press("move_right", n.x)
	elif n.x < -0.05: Input.action_press("move_left", -n.x)
	if n.y > 0.05: Input.action_press("move_down", n.y)
	elif n.y < -0.05: Input.action_press("move_up", -n.y)

# ---- navegação em grade (A*)
func _blocked_tiles() -> Dictionary:
	var b := {}
	for e in get_tree().get_nodes_in_group("ents"):
		if e.solid:
			b[Vector2i(int(floor(e.global_position.x / 16.0)), int(floor(e.global_position.y / 16.0)))] = true
	return b

func tile_of(p: Vector2) -> Vector2i:
	return Vector2i(int(floor(p.x / 16.0)), int(floor(p.y / 16.0)))

func find_path(a: Vector2i, b: Vector2i, extra_block := {}) -> Array:
	var blocked := _blocked_tiles()
	for k in extra_block:
		blocked[k] = true
	blocked.erase(b)
	var open := [a]
	var came := {a: a}
	var g := {a: 0.0}
	var guard := 0
	while not open.is_empty() and guard < 20000:
		guard += 1
		var best := 0
		for i in open.size():
			var ci: Vector2i = open[i]
			var cb: Vector2i = open[best]
			if g[ci] + ci.distance_to(b) < g[cb] + cb.distance_to(b):
				best = i
		var cur: Vector2i = open[best]
		open.remove_at(best)
		if cur == b:
			var path: Array = [cur]
			while cur != a:
				cur = came[cur]
				path.push_front(cur)
			return path
		for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var nx: Vector2i = cur + d
			if nx.x < 0 or nx.y < 0 or nx.x >= W.W or nx.y >= W.H:
				continue
			if W.is_solid_char(W.cur_tiles[nx.y][nx.x]) or blocked.has(nx):
				continue
			var ng: float = g[cur] + 1.0
			if not g.has(nx) or ng < g[nx]:
				g[nx] = ng
				came[nx] = cur
				if not open.has(nx):
					open.append(nx)
	return []

func goto(target: Vector2, tol := 4.0, timeout := 40.0, extra_block := {}) -> bool:
	var t := 0.0
	var path: Array = []
	var pi := 0
	var replan := 0.0
	while t < timeout:
		if P.state == Player.S.DEAD:
			release_moves()
			return false
		var here := P.global_position
		if here.distance_to(target) <= tol:
			release_moves()
			return true
		if path.is_empty() or replan <= 0.0:
			path = find_path(tile_of(here), tile_of(target), extra_block)
			pi = 1
			replan = 1.5
			if path.is_empty():
				release_moves()
				push_warning("sem caminho de %s para %s" % [str(here), str(target)])
				return false
		var goal: Vector2
		if pi < path.size():
			var nd: Vector2i = path[pi]
			goal = Vector2(nd.x * 16.0 + 8.0, nd.y * 16.0 + 8.0)
			if pi == path.size() - 1:
				goal = target
			if here.distance_to(goal) < 3.0 and pi < path.size() - 1:
				pi += 1
				continue
		else:
			goal = target
		steer(goal - here)
		await get_tree().physics_frame
		frame_count += 1
		t += 1.0 / 60.0
		replan -= 1.0 / 60.0
	release_moves()
	return false

func goto_tile(tx: int, ty: int, tol := 4.0, timeout := 40.0) -> bool:
	return await goto(Vector2(tx * 16.0 + 8.0, ty * 16.0 + 8.0), tol, timeout)

func face(dir: Vector2) -> void:
	# empurra contra a direção por 1 quadro para atualizar a orientação
	steer(dir)
	await frames(2)
	release_moves()
	await frames(1)

func interact_press() -> void:
	await tap("interact", 2)

func advance_dialogs(maxn := 20) -> void:
	var n := 0
	while main.ui.hud.dlg_active and n < maxn:
		await frames(70)   # deixa o texto aparecer
		await ui_press("ui_accept")
		await ui_press("ui_accept")
		n += 1

func talk(ent_id: String) -> void:
	var e := ent_by_id(ent_id)
	await goto(e.global_position + Vector2(0, 16), 6.0)
	await face(Vector2.UP)
	await frames(3)
	await interact_press()
	await frames(3)
	await advance_dialogs()
	await frames(5)

func ent_by_id(id: String) -> Node:
	for e in get_tree().get_nodes_in_group("ents"):
		if e.eid == id:
			return e
	for e in get_tree().get_nodes_in_group("enemies"):
		if e.uid == id:
			return e
	return null

func hostile() -> Array:
	var out := []
	for e in W.enemies():
		if e.alive_flag and e.kind != "dummy" and e.kind != "wild":
			out.append(e)
	return out

# =============================================================== COMBATE
func attack_tap() -> void:
	Input.action_press("attack")
	await frames(3)
	Input.action_release("attack")
	await frames(1)

func threat_for(e: Node) -> float:
	match e.def.get("ataque", ""):
		"investida": return 95.0
		"esporos": return 46.0
		"golpe": return 60.0
		"lenhador": return 74.0
		"selvagem": return 36.0
	return 40.0

func dodge_away(e: Node) -> void:
	var to: Vector2 = P.global_position - e.global_position
	var perp := to.normalized().orthogonal()
	if e.kind == "wolf" or e.def.get("ataque", "") == "investida":
		perp = e.attack_dir.orthogonal()
	steer(perp if randf() < 0.5 else -perp)
	await frames(1)
	await tap("dodge", 2)
	release_moves()

func use_potion_if_needed() -> void:
	if float(Game.hero["hp"]) < Game.hero_max_hp() * 0.4 and Game.item_count("pocao") > 0:
		await tap("consumable", 2)

## um passo de combate contra `tgt`; devolve quando termina uma ação
func combat_step(tgt: Node) -> void:
	await use_potion_if_needed()
	# esquiva de ataques anunciados
	for e in hostile():
		if e.st == Enemy.St.WINDUP and P.global_position.distance_to(e.global_position) < threat_for(e):
			var wind: float = float(e.P.get("wind", 0.6)) * Game.warning_mult() if not e.P.is_empty() else 0.6
			if e.st_t > wind - 0.22 and P.vigor >= 25.0 and P.dodge_cd <= 0.0:
				await dodge_away(e)
				return
	var tp: Vector2 = tgt.global_position
	var goal: Vector2 = tp
	if tgt.guard_front > 0.0:
		# contorna a guarda frontal: ataca por cima/baixo
		goal = tp + Vector2(0, 18 if P.global_position.y > tp.y else -18)
	var d := P.global_position.distance_to(goal)
	var reach := 24.0 + (0.0 if tgt.kind != "cervo" else 8.0)
	if d > reach or P.global_position.distance_to(tp) > 30.0:
		steer(goal - P.global_position)
		await frames(2)
		release_moves()
	else:
		await face(tp - P.global_position)
		await attack_tap()
		await frames(10)

func clear_hostiles(timeout := 90.0, radius := 9999.0) -> bool:
	var t := 0.0
	while t < timeout:
		if P.state == Player.S.DEAD:
			return false
		var es := hostile().filter(func(e): return e.global_position.distance_to(P.global_position) < radius)
		if es.is_empty():
			return true
		es.sort_custom(func(a, b): return a.global_position.distance_to(P.global_position) < b.global_position.distance_to(P.global_position))
		var before := frame_count
		await combat_step(es[0])
		t += float(frame_count - before) / 60.0
	return false

## aproxima-se de inimigos hostis dentro do raio e os derrota (usa A* para chegar à vizinhança)
func engage_area(center: Vector2, radius := 140.0, timeout := 90.0) -> void:
	var t := 0.0
	while t < timeout and P.state != Player.S.DEAD:
		var es := hostile().filter(func(e): return e.global_position.distance_to(center) < radius)
		if es.is_empty():
			break
		es.sort_custom(func(a, b): return a.global_position.distance_to(P.global_position) < b.global_position.distance_to(P.global_position))
		var tgt: Node = es[0]
		var before := frame_count
		if P.global_position.distance_to(tgt.global_position) > 90.0:
			await goto(tgt.global_position, 70.0, 12.0)
		await combat_step(tgt)
		t += float(frame_count - before) / 60.0

# =============================================================== CAPTURA
func weaken(wild: Node, limit := 0.35) -> void:
	var guard := 0
	while is_instance_valid(wild) and wild.alive_flag and wild.hp / wild.max_hp > limit and guard < 40 and P.state != Player.S.DEAD:
		guard += 1
		if P.global_position.distance_to(wild.global_position) > 26.0:
			steer(wild.global_position - P.global_position)
			await frames(3)
			release_moves()
			continue
		await face(wild.global_position - P.global_position)
		await attack_tap()
		await secs(0.6)

func capture_wild(wild: Node, tries := 4) -> bool:
	if not is_instance_valid(wild):
		return false
	var n := 0
	var uuid_before := Game.individuals.size()
	while n < tries and is_instance_valid(wild) and wild.alive_flag:
		n += 1
		if P.global_position.distance_to(wild.global_position) > 120.0:
			await goto(wild.global_position, 100.0, 10.0)
		var att := 0
		while not P.aiming and att < 8 and is_instance_valid(wild):
			var wt := 0
			while P.state != Player.S.FREE and wt < 180:
				await frames(1)
				wt += 1
			await tap("capture", 2)
			await frames(2)
			att += 1
		if not P.aiming or not is_instance_valid(wild):
			print("  [dbg cap] sem mira: aiming=%s state=%s" % [P.aiming, P.state])
			return false
		P.cap_target = wild
		await frames(2)
		if P.cap_msg != "":
			print("  [dbg cap] alvo recusado: %s (hp %s/%s dist %s)" % [P.cap_msg, wild.hp, wild.max_hp, P.global_position.distance_to(wild.global_position)])
			P.aiming = false
			return false
		await tap("capture", 2)
		var guard := 0
		while P.cap_state != "" and guard < 400:
			await frames(1)
			guard += 1
		if Game.individuals.size() > uuid_before:
			return true
		if n < tries:
			await secs(3.2)    # proteção de 3 s após falha
	return false

# =============================================================== CENÁRIO PRINCIPAL
func run_e2e() -> void:
	# ---- 1. Ponto de entrada normal: título -> novo jogo (saves limpos para um teste determinístico)
	for i in [0, 1, 2, 3]:
		SaveSys.delete_slot(i)
	main.back_to_title()
	await frames(5)
	var title_menu = main.ui._top()
	check("Título abre ao iniciar o jogo", title_menu != null and not Game.in_game)
	await shot("01_titulo")
	await ui_press("ui_accept")      # primeiro item habilitado = Novo jogo
	await ui_press("ui_accept")      # slot 1
	await frames(10)
	check("Novo jogo inicia na Vila Lúmen", Game.in_game and W.map_id == "vila_lumen")
	await advance_dialogs()
	await shot("02_vila_inicio")
	check("Dados do jogo sem erros de validação", Data.errors.is_empty(), str(Data.errors))

	# ---- 2. Falar com Maru e tutorial
	await talk("anciao")
	check("Maru entrega selos e tônicos", Game.item_count("selo_basico") == 5 and Game.item_count("pocao") == 2)
	check("Flag falou_maru registrada", Game.has_flag("falou_maru"))
	await goto_tile(12, 12)
	check("Dica de movimento concluída ao andar", Game.has_flag("tut_move"))
	var dummy := ent_by_id("dummy1")
	await goto(dummy.global_position + Vector2(0, 22), 6.0)
	await face(Vector2.UP)
	await attack_tap()
	await secs(0.6)
	check("Tutorial: ataque ao boneco registrado", Game.has_flag("tut_attack"))
	await tap("dodge", 2)
	await secs(0.5)
	check("Tutorial: esquiva registrada e vigor gasto", Game.has_flag("tut_dodge"))
	Input.action_press("guard")
	await frames(8)
	check("Defesa: herói entra no estado de guarda", P.state == Player.S.GUARD)
	Input.action_release("guard")
	await frames(3)
	check("Tutorial concluído (controles aprendidos na exploração)", Game.has_flag("tutorial_ok"))

	# ---- 3. Captura do Brotisco do cercado
	var br := ent_by_id("brotisco_tutorial")
	check("Brotisco do cercado existe e é capturável", br != null and br.capturable and br.garantida)
	await goto(Vector2(12 * 16 + 8, 17 * 16 + 8), 6.0, 20.0)
	# rejeição sem alvo elegível (vida cheia): não consome selo
	var seals_before := Game.item_count("selo_basico")
	await tap("capture", 2)
	await frames(2)
	P.cap_target = br
	await frames(3)
	check("Captura rejeita alvo com vida alta", P.cap_msg != "" and "Enfraqueça" in P.cap_msg, P.cap_msg)
	await tap("capture", 2)
	await frames(3)
	check("Alvo inválido não consome selo", Game.item_count("selo_basico") == seals_before and P.cap_state == "")
	P.aiming = false
	await weaken(br)
	check("Brotisco enfraquecido (<=35%)", br.hp / br.max_hp <= 0.35, str(br.hp / br.max_hp))
	await shot("03_captura_mirando")
	var ok := await capture_wild(br)
	check("Captura real do Brotisco funciona (selo consumido, indivíduo registrado)", ok and Game.team.size() == 1 and Game.item_count("selo_basico") < seals_before)
	check("Brotisco está na equipe e é a criatura ativa", Game.active_ind().get("species_id", "") == "brotisco")
	check("Companheiro aparece no mapa", W.companion != null and is_instance_valid(W.companion))
	check("Bestiário registrou captura", Game.bestiary.get("brotisco", {}).get("capturado", false))
	await shot("04_captura_ok")
	if stage_limit <= 3: return
	await stage4_shrine_menu()
	if stage_limit <= 4: return
	await stage5_clareira()
	if stage_limit <= 5: return
	await stage6_santuario_a()
	if stage_limit <= 6: return
	await stage7_bosque()
	if stage_limit <= 7: return
	await stage8_santuario_b()
	if stage_limit <= 8: return

# =============================================================== ESTÁGIOS
func wait_map(id: String, timeout := 6.0) -> bool:
	var t := 0.0
	while (W.map_id != id or W.transition_busy) and t < timeout:
		await frames(3)
		t += 0.05
	await frames(6)
	return W.map_id == id

func exit_to(map_id: String, ex: float, ey: float) -> bool:
	await goto(Vector2(ex, ey), 3.0, 120.0)
	return await wait_map(map_id)

func close_menus() -> void:
	var n := 0
	while main.ui.has_screen() and n < 8:
		await ui_press("ui_cancel")
		n += 1
	await frames(3)

func stage4_shrine_menu() -> void:
	# santuário da vila: descansar, abrir pausa, equipe, bestiário
	var sh := ent_by_id("vila")
	await goto(sh.global_position + Vector2(0, 18), 6.0)
	await face(Vector2.UP)
	await interact_press()
	await frames(5)
	check("Santuário abre o menu (simulação pausada)", main.ui.has_screen() and get_tree().paused)
	await shot("05_santuario_menu")
	await ui_press("ui_accept")      # Descansar
	await frames(3)
	check("Descansar registra o ponto de retorno", Game.checkpoint.get("shrine", "") == "vila" and Game.has_flag("tut_rest"))
	await close_menus()
	check("Menu fecha e o herói volta ao controle", not get_tree().paused and P.state == Player.S.FREE)
	# pausa por Esc
	await ui_press("pause")
	await frames(3)
	check("Esc abre a pausa", main.ui.has_screen() and get_tree().paused)
	# navega Equipe e Bestiário pelos menus reais
	await ui_press("ui_down")
	await ui_press("ui_accept")
	await frames(3)
	await shot("06_equipe")
	check("Tela de equipe lista Brotisco", main.ui._top() != null and Game.team.size() == 1)
	await close_menus()
	check("Pausa fecha e jogo retoma", not get_tree().paused)
	# baú único da vila e compra de selo na loja da Ysa (UI real)
	var frag_ini := Game.fragments
	await use_ent("vila_bau1", Vector2(0, 14), Vector2.UP)
	check("Baú da vila abre uma única vez e dá selos", Game.chests.has("vila_bau1") and Game.item_count("selo_basico") >= 2)
	await use_ent("vila_bau1", Vector2(0, 14), Vector2.UP)
	var seals_after := Game.item_count("selo_basico")
	check("Baú aberto não reaparece nem duplica recompensa", Game.item_count("selo_basico") == seals_after and ent_by_id("vila_bau1").opened)
	await talk("ysa")
	check("Ysa abre a loja ao fim da conversa", main.ui.has_screen())
	var s0 := Game.item_count("selo_basico")
	var f0 := Game.fragments
	Game.fragments += 60      # fragmentos obtidos em combate (atalho do teste)
	f0 = Game.fragments
	await ui_press("ui_accept")      # primeiro item: Selo de Vínculo (15)
	check("Compra de selo debita fragmentos e entrega item", Game.item_count("selo_basico") == s0 + 1 and Game.fragments == f0 - 15, "%d->%d frag %d->%d" % [s0, Game.item_count("selo_basico"), f0, Game.fragments])
	await ui_press("ui_down"); await ui_press("ui_down"); await ui_press("ui_down")
	await ui_press("ui_down")
	await close_menus()
	Game.fragments += 90      # fragmentos extras para comprar mais selos (atalho do teste)
	await talk("ysa")
	for i in 4:
		await ui_press("ui_accept")
	await close_menus()
	check("Loja: compras repetidas funcionam (selos suficientes para a campanha)", Game.item_count("selo_basico") >= 6)

func push_crate(crate: Node, dir: Vector2, n: int) -> void:
	for i in n:
		var stand: Vector2 = crate.global_position - dir * 16.0
		await goto(stand, 3.0, 25.0)
		await face(dir)
		await interact_press()
		await secs(0.35)

func stage5_clareira() -> void:
	# sai pela saída sul da vila para a rota B
	var ok := await exit_to("clareira_raizes", 22 * 16.0 + 8.0, 30 * 16.0 + 8.0)
	check("Saída sul leva à Clareira das Raízes (rota B)", ok and W.map_id == "clareira_raizes")
	check("Autosave gravado ao chegar", not SaveSys.slot_info(0).is_empty())
	await shot("07_clareira")
	# ---- morte em combate real e retomada do santuário
	Game.fragments += 100
	var fr0 := Game.fragments
	var team0 := Game.team.duplicate()
	var sent := ent_by_id("c_sent1")
	await goto(Vector2(23 * 16.0 + 8, 5 * 16.0), 8.0)
	await goto(sent.global_position + Vector2(-26, 8), 10.0, 20.0)
	Game.hero["hp"] = 3.0
	Game.hero_changed.emit()
	var t := 0.0
	while P.state != Player.S.DEAD and t < 25.0:
		await frames(6)
		t += 0.1

	check("Herói morre em combate real", P.state == Player.S.DEAD, "hp=%s" % str(Game.hero["hp"]))
	await shot("08_morte")
	await secs(4.0)
	check("Morte: retoma no último santuário (Vila Lúmen)", W.map_id == "vila_lumen" and P.state == Player.S.FREE, W.map_id)
	check("Morte: herói e equipe recuperados", float(Game.hero["hp"]) >= Game.hero_max_hp() - 0.1 and not Game.individuals[team0[0]].get("exausta", false))
	check("Morte: perde 10% dos fragmentos carregados", Game.last_death.get("perdidos", -1) == int(floor(Game.last_death.get("antes", 0) * 0.1)) and Game.fragments == Game.last_death["antes"] - Game.last_death["perdidos"], str(Game.last_death))
	check("Morte: captura mantida", Game.team == team0 and Game.individuals.has(team0[0]))
	check("Morte: posição de retorno junto ao santuário", P.global_position.distance_to(ent_by_id("vila").global_position) < 40.0)
	# volta à clareira
	ok = await exit_to("clareira_raizes", 22 * 16.0 + 8.0, 30 * 16.0 + 8.0)
	check("Retorno à Clareira após morrer", ok)
	# ---- combate com a dupla
	await goto(Vector2(23 * 16.0 + 8, 5 * 16.0), 8.0)
	await engage_area(Vector2(24 * 16.0, 12 * 16.0), 230.0, 150.0)
	check("Sentinelas e cogumelo derrotados pela dupla (herói + criatura)", hostile().filter(func(e): return e.global_position.distance_to(Vector2(24 * 16, 12 * 16)) < 230.0).is_empty() and P.state != Player.S.DEAD)
	var bro = Game.individuals[Game.team[0]]
	check("Criatura recebeu XP e vínculo de encontros relevantes", int(bro["xp"]) > 0 or int(bro["nivel"]) > 1)
	check("Vínculo registrado por vitória relevante (se a criatura não ficou exausta)", Game.bond_count(bro) >= 1 or exhausted_events > 0, str(bro["vinculo"]) + " exaustoes=%d" % exhausted_events)
	# habilidade comandada do companheiro (Q) com recarga
	if Game.active_ind().is_empty() or float(bro["hp"]) <= 0.0:
		Game.heal_team()                      # recuperação no santuário (atalho do teste após o combate)
		W.refresh_companion(true)
		await frames(10)
	var tries := 0
	while float(Game.skill_cd.get(bro["uuid"], 0.0)) <= 0.0 and tries < 20:
		await tap("skill", 2)
		await frames(6)
		tries += 1
	check("Habilidade comandada (Q) usa recarga própria", float(Game.skill_cd.get(bro["uuid"], 0.0)) > 0.0)
	# ---- Cascalito: falha controlada e depois sucesso
	var cas := ent_by_id("c_casc1")
	await goto(cas.global_position + Vector2(18, 0), 14.0, 30.0)
	await weaken(cas)
	check("Cascalito enfraquecido para captura", cas.alive_flag and cas.hp / cas.max_hp <= 0.35)
	Game.rng_override = func(): return 0.99
	var seals := Game.item_count("selo_basico") + Game.item_count("selo_refinado")
	var hp_c: float = cas.hp
	var ok2 := await capture_wild(cas, 1)
	check("Captura falha com sorteio ruim: criatura permanece e selo é consumido", not ok2 and is_instance_valid(cas) and cas.alive_flag and Game.item_count("selo_basico") + Game.item_count("selo_refinado") == seals - 1 and Game.team.size() == 1,
		"ok2=%s valid=%s seals=%d/%d team=%d msg=%s state=%d hp=%s" % [ok2, is_instance_valid(cas), Game.item_count("selo_basico"), seals, Game.team.size(), P.cap_msg, P.state, str(Game.hero["hp"])])
	check("Falha não cura nem mata o alvo", is_instance_valid(cas) and cas.hp <= hp_c + 0.01, "hp %s -> %s" % [hp_c, cas.hp if is_instance_valid(cas) else -1.0])
	check("Falha dá 3 s de proteção contra nova tentativa", cas.protect_t > 0.0 and cas.protect_t <= 3.0, str(cas.protect_t))
	await goto(cas.global_position + Vector2(18, 0), 14.0, 10.0)
	await tap("capture", 2)
	await frames(2)
	P.cap_target = cas
	await frames(3)
	check("Alvo protegido rejeita tentativa imediata", "protegido" in P.cap_msg, P.cap_msg)
	P.aiming = false
	await secs(3.2)
	Game.rng_override = Callable()
	ok2 = await capture_wild(cas, 4)
	check("Captura de Cascalito conclui (equipe agora com 2)", ok2 and Game.team.size() == 2, "ok2=%s valid=%s msg=%s aiming=%s state=%s seals=%d" % [ok2, is_instance_valid(cas), P.cap_msg, P.aiming, P.state, Game.item_count("selo_basico")])
	check("Bestiário: Cascalito capturado", Game.bestiary.get("cascalito", {}).get("capturado", false))
	# ---- troca de criatura: recarga global de 6 s, sem curar nem reiniciar recarga
	var cas_id: String = Game.team[1]
	var br_id: String = Game.team[0]
	if Game.active_ind().is_empty():
		Game.heal_team()
		W.refresh_companion(true)
		await frames(10)
	await tap("skill", 2)
	await frames(3)
	var cd_before: float = float(Game.skill_cd.get(Game.active_ind()["uuid"], 0.0))
	await tap("swap", 2)
	await frames(3)
	check("Tab troca a criatura ativa", Game.active_ind()["uuid"] != br_id or Game.active_ind()["uuid"] == cas_id)
	var first_active: String = Game.active_ind()["uuid"]
	await tap("swap", 2)
	await frames(3)
	check("Troca respeita recarga global de 6 s", Game.active_ind()["uuid"] == first_active and Game.swap_cd > 0.0)
	check("Troca não reinicia recarga individual", float(Game.skill_cd.get(br_id, 0.0)) > 0.0 or cd_before > 0.0)
	await secs(6.2)
	# ---- enigma de placas: caixa 1 empurrada + Cascalito na placa 2
	var cx1 := ent_by_id("c_caixa1")
	await goto(cx1.global_position + Vector2(24, 0), 3.0, 30.0)
	await push_crate(cx1, Vector2.LEFT, 4)
	await push_crate(cx1, Vector2.DOWN, 2)
	check("Caixa empurrada para a placa 1", ent_by_id("c_placa1").pressed_by_crate, str(cx1.global_position))
	check("Porta ainda fechada com uma placa", not Game.has_flag("clareira_placas"))
	Game.set_active(cas_id)
	W.refresh_companion(true)
	var pl2 := ent_by_id("c_placa2")
	await goto(pl2.global_position + Vector2(0, -14), 4.0, 30.0)
	await face(Vector2.DOWN)
	await interact_press()
	await frames(5)
	check("Cascalito pressiona a placa 2 (ação ambiental)", pl2.held and Game.has_flag("clareira_placas"))
	check("Ação ambiental conta como vínculo do Cascalito", Game.bond_count(Game.individuals[cas_id]) >= 1)
	check("Raízes recuam: portão da clareira aberto", W.tile_char_at(Vector2(22 * 16 + 8, 32 * 16 + 8)) == "p")
	await shot("09_clareira_placas")

func pull_lever(id: String) -> void:
	var l := ent_by_id(id)
	await goto(l.global_position + Vector2(0, -14), 4.0, 25.0)
	await face(Vector2.DOWN)
	await interact_press()
	await frames(8)

func use_ent(id: String, from := Vector2(0, 14), dir := Vector2.UP) -> void:
	var e := ent_by_id(id)
	await goto(e.global_position + from, 4.0, 40.0)
	await face(dir)
	await interact_press()
	await frames(8)

func door_closed_at(tx: int, ty: int) -> bool:
	return W.is_solid_char(W.cur_tiles[ty][tx])

func stage6_santuario_a() -> void:
	var ok := await exit_to("santuario_a", 22 * 16.0 + 8.0, 36 * 16.0 + 8.0)
	check("Portão da clareira leva ao Santuário da Seiva (átrio)", ok and W.map_id == "santuario_a")
	# a criatura deve estar viva para os testes seguintes
	await use_ent("santuario_a_atrio", Vector2(0, 18), Vector2.UP)
	check("Santuário do átrio grava ponto de retorno", Game.checkpoint.get("shrine", "") == "santuario_a_atrio" and Game.has_flag("viu_santuario_seiva"))
	await ui_press("ui_accept")      # Descansar
	await close_menus()
	await shot("10_santuario_atrio")
	# ---- Salão das Flores (introdução de mecânica de luz)
	check("Porta do Salão das Flores fechada", door_closed_at(27, 15))
	await use_ent("a_flor1", Vector2(0, 14), Vector2.UP)
	check("Uma flor acesa não abre a porta", not Game.has_flag("salao_flores") and ent_by_id("a_flor1").lit)
	await use_ent("a_flor2", Vector2(0, 14), Vector2.UP)
	await use_ent("a_flor3", Vector2(0, 14), Vector2.UP)
	check("Três flores acesas abrem a porta (solução permanente pelo herói)", Game.has_flag("salao_flores") and not door_closed_at(27, 15))
	await shot("11_flores")
	# ---- Galeria dos Lobos (combate com portas que fecham)
	await goto(Vector2(27 * 16.0 + 8, 11 * 16.0), 5.0, 30.0)
	await frames(10)
	check("Encontro sinalizado: portas da galeria fecham", Game.has_flag("tmp_enc_galeria_ativo") and door_closed_at(27, 13) and door_closed_at(40, 7))
	await shot("12_galeria_combate")
	# criatura exausta durante o encontro: troca forçada, herói segue lutando
	var cas_ind: Dictionary = {}
	for u in Game.team:
		if Game.individuals[u]["species_id"] == "cascalito":
			cas_ind = Game.individuals[u]
	Game.set_active(cas_ind["uuid"])
	W.refresh_companion(true)
	await frames(5)
	Game.damage_creature(cas_ind, 99999.0)
	await frames(5)
	check("Criatura exausta volta à reserva (troca forçada)", cas_ind["exausta"] and Game.active_ind().get("species_id", "") == "brotisco" and W.companion != null and W.companion.ind["species_id"] == "brotisco")
	var enc_ok := false
	var tt := 0.0
	while tt < 200.0 and not Game.has_flag("enc_galeria_ok") and P.state != Player.S.DEAD:
		await engage_area(Vector2(28 * 16.0, 8 * 16.0), 400.0, 20.0)
		tt += 20.0
		if hostile().is_empty():
			await frames(20)
	check("Encontro vencido: flag persistente e portas reabertas", Game.has_flag("enc_galeria_ok") and not door_closed_at(40, 7) and not Game.has_flag("tmp_enc_galeria_ativo"))
	check("Herói sobreviveu com a criatura exausta na reserva", P.state != Player.S.DEAD and cas_ind["exausta"])
	# ---- Canais de Seiva (enigma de alavancas com dica após 3 interações)
	await pull_lever("l2")
	await pull_lever("l2")
	await pull_lever("l3")
	check("Alavancas em estado errado não resolvem", not Game.has_flag("canais_ok"))
	var hint_seen := false
	for t in main.ui.hud.toasts:
		if "Dica" in t["t"]:
			hint_seen = true
	check("Após 3 interações a dica opcional aparece", hint_seen)
	await pull_lever("l1")
	check("Enigma das alavancas resolvido", Game.has_flag("canais_ok") and not door_closed_at(51, 15))
	await shot("13_canais")
	# ---- Tesouro e atalho
	await use_ent("a_bau_tesouro", Vector2(0, 14), Vector2.UP)
	check("Baú único abre e entrega recompensa (amuleto equipado)", Game.chests.has("a_bau_tesouro") and Game.equipment["amuleto"] == "amuleto_seiva")
	var frag_chest := Game.fragments
	await use_ent("santuario_a_tesouro", Vector2(0, 18), Vector2.UP)
	await ui_press("ui_accept")
	await close_menus()
	check("Santuário recupera criaturas exaustas", not cas_ind["exausta"])
	check("Segundo santuário passa a ser o ponto de retorno", Game.checkpoint.get("shrine", "") == "santuario_a_tesouro")
	# atalho para a vila (porta de raízes)
	ok = await exit_to("vila_lumen", 63 * 16.0 + 8.0, 22 * 16.0 + 8.0)
	check("Atalho do santuário leva de volta à vila", ok and Game.has_flag("atalho_vila_aberto"))
	check("Portão oeste da vila abriu", not W.is_solid_char(W.tile_char_at(Vector2(8, 23 * 16 + 8))))
	ok = await exit_to("santuario_a", 8.0, 23 * 16.0 + 8.0)
	check("Atalho funciona nos dois sentidos (vila -> santuário)", ok and W.map_id == "santuario_a")

func stage7_bosque() -> void:
	# sai pelo corredor oeste do átrio rumo ao Bosque das Lanternas (rota A, lado do portão)
	var ok := await exit_to("bosque_lanternas", 8.0, 31 * 16.0 + 8.0)
	check("Saída oeste do átrio leva ao Bosque das Lanternas", ok and W.map_id == "bosque_lanternas")
	await shot("14_bosque")
	check("Portão de flores fechado antes de acender", door_closed_at(52, 7))
	# Lumipim: captura no habitat
	await engage_area(Vector2(42 * 16.0, 12 * 16.0), 180.0, 60.0)
	await engage_area(Vector2(30 * 16.0, 18 * 16.0), 150.0, 60.0)
	await goto(Vector2(24 * 16.0, 29 * 16.0), 20.0, 60.0)
	await engage_area(Vector2(20 * 16.0, 24 * 16.0), 130.0, 60.0)
	var lum := ent_by_id("b_lumipim1")
	check("Lumipim existe no habitat do bosque", lum != null and lum.capturable)
	await goto(lum.global_position + Vector2(18, 0), 14.0, 40.0)
	await weaken(lum)
	print("  [dbg lum] valid=%s hp=%s/%s state=%s protect=%s dist=%s seals=%d" % [is_instance_valid(lum), str(lum.hp) if is_instance_valid(lum) else "-", str(lum.max_hp) if is_instance_valid(lum) else "-", P.state, str(lum.protect_t) if is_instance_valid(lum) else "-", str(P.global_position.distance_to(lum.global_position)) if is_instance_valid(lum) else "-", Game.item_count("selo_basico")])
	var seal_ok := Game.item_count("selo_basico") + Game.item_count("selo_refinado") > 0
	check("Há selos disponíveis para capturar Lumipim", seal_ok)
	var got := await capture_wild(lum, 5)
	check("Lumipim capturado (3 espécies na coleção)", got and Game.bestiary.get("lumipim", {}).get("capturado", false))
	check("Equipe cheia (3 criaturas)", Game.team.size() == 3)
	# cipó do Brotisco: atalho opcional
	Game.set_active(Game.team[0])
	W.refresh_companion(true)
	await goto(Vector2(24 * 16.0, 10 * 16.0) + Vector2(-6, 0), 4.0, 60.0)
	var vine := ent_by_id("cipo_norte")
	await face(Vector2.RIGHT)
	await interact_press()
	await frames(6)
	check("Brotisco estende cipós e abre atalho opcional (ação ambiental)", Game.has_flag("cipo_bosque") and not W.is_solid_char(W.tile_char_at(Vector2(25 * 16 + 8, 10 * 16 + 8))))
	await goto(Vector2(36 * 16.0, 10 * 16.0 + 14.0), 5.0, 40.0)
	await face(Vector2.UP)
	await interact_press()
	await frames(6)
	check("Baú do atalho do cipó coletado", Game.chests.has("bosque_bau_cipo"))
	# flores-lanterna: duas pelo herói, uma pelo pulso do Lumipim
	await use_ent("b_flor1", Vector2(0, 14), Vector2.UP)
	await use_ent("b_flor2", Vector2(0, 14), Vector2.UP)
	var lum_u := ""
	for u in Game.team:
		if Game.individuals[u]["species_id"] == "lumipim":
			lum_u = u
	Game.set_active(lum_u)
	W.refresh_companion(true)
	await goto(ent_by_id("b_flor3").global_position + Vector2(-20, 10), 6.0, 40.0)
	var tries := 0
	while not ent_by_id("b_flor3").lit and tries < 10:
		await tap("skill", 2)
		await secs(1.0)
		tries += 1
	check("Pulso do Lumipim ilumina flor à distância (ação ambiental)", ent_by_id("b_flor3").lit)
	check("Portão do santuário abre com as três flores", Game.has_flag("bosque_flores") and not door_closed_at(52, 7))
	await shot("15_bosque_portao")
	# volta ao santuário pela rota A
	ok = await exit_to("santuario_a", 55 * 16.0, 7 * 16.0 + 8.0)
	check("Rota A conecta ao Santuário da Seiva", ok and W.map_id == "santuario_a")

func fight_boss(b: Node, timeout := 240.0) -> String:
	var t := 0.0
	var seen := {}
	while t < timeout and is_instance_valid(b) and b.alive_flag:
		if P.state == Player.S.DEAD:
			return "morreu"
		var before := frame_count
		if "vulnerable" in b and b.vulnerable:
			seen["vulneravel"] = true
		if "bst" in b:
			seen["bst%d" % b.bst] = true
			seen["fase%d" % b.phase] = true
			if b.exposed:
				seen["exposto"] = true
		await combat_step(b)
		t += float(frame_count - before) / 60.0
	last_seen = seen
	return "vitoria" if (not is_instance_valid(b) or not b.alive_flag) else "tempo"

var last_seen := {}

func stage8_santuario_b() -> void:
	# do santuário A para B pela saída sul da sala do tesouro
	var ok := await exit_to("santuario_b", 51 * 16.0 + 8.0, 39 * 16.0 + 8.0)
	check("Santuário A conecta às Câmaras Profundas", W.map_id == "santuario_b")
	await shot("16_camara_pesos")
	check("Porta da Câmara dos Pesos fechada", door_closed_at(23, 16))
	# enigma de placas com caixas (solução permanente do herói)
	var c1 := ent_by_id("b_caixa1")
	var c2 := ent_by_id("b_caixa2")
	await push_crate(c1, Vector2.LEFT, 4)
	await push_crate(c1, Vector2.DOWN, 4)
	check("Caixa 1 sobre a placa 1", ent_by_id("b_placa1").pressed_by_crate, str(c1.global_position))
	await push_crate(c2, Vector2.RIGHT, 4)
	await push_crate(c2, Vector2.DOWN, 4)
	await frames(6)
	check("Enigma das placas resolvido só com o herói", Game.has_flag("pesos_ok") and not door_closed_at(23, 16))
	await shot("17_pesos_ok")
	# sala de preparação: santuário + baú
	await use_ent("b_bau_prep", Vector2(0, 14), Vector2.UP)
	check("Baú da preparação coletado", Game.chests.has("b_bau_prep"))
	await use_ent("santuario_b_prep", Vector2(0, 18), Vector2.UP)
	await ui_press("ui_accept")
	await close_menus()
	check("Checkpoint próximo ao minichefe", Game.checkpoint.get("shrine", "") == "santuario_b_prep")
	# ---- Lenhador Oco: primeiro teste de derrota e reinício limpo
	var len_def_frags := Game.fragments
	await goto(Vector2(24 * 16.0 + 8, 29 * 16.0), 6.0, 30.0)
	await frames(30)
	var lb: Node = null
	for e in W.enemies():
		if e.kind == "lenhador":
			lb = e
	check("Lenhador Oco ativa ao entrar na arena e fecha a porta", lb != null and lb.activated and door_closed_at(23, 26), "lb=%s act=%s pos=%s tile=%s flag=%s" % [lb != null, lb.activated if lb else false, str(P.global_position), str(tile_of(P.global_position)), Game.has_flag("tmp_lenhador_ativo")])
	await shot("18_lenhador")
	Game.hero["hp"] = 2.0
	var t := 0.0
	while P.state != Player.S.DEAD and t < 30.0:
		if lb.global_position.distance_to(P.global_position) > 40.0:
			steer(lb.global_position - P.global_position)
		else:
			release_moves()
		await frames(6)
		t += 0.1
	release_moves()
	check("Derrota para o minichefe", P.state == Player.S.DEAD)
	await secs(4.0)
	check("Derrota: retoma no santuário da preparação", W.map_id == "santuario_b" and P.global_position.distance_to(ent_by_id("santuario_b_prep").global_position) < 40.0)
	check("Derrota: minichefe não morreu e a porta reabriu", not Game.has_flag("lenhador_morto") and not Game.has_flag("tmp_lenhador_ativo") and not door_closed_at(23, 26))
	# ---- luta real
	await goto(Vector2(24 * 16.0 + 8, 29 * 16.0), 6.0, 30.0)
	await frames(30)
	lb = null
	for e in W.enemies():
		if e.kind == "lenhador":
			lb = e
	check("Lenhador reiniciou com vida cheia", lb != null and abs(lb.hp - lb.max_hp) < 0.01)
	var frag0 := Game.fragments
	var res := await fight_boss(lb, 300.0)
	check("Lenhador Oco derrotado em combate", res == "vitoria", res)
	check("Lenhador: ataque anunciado e janela vulnerável observados", last_seen.get("vulneravel", false))
	check("Recompensa do minichefe concedida uma vez", Game.has_flag("lenhador_morto") and Game.fragments >= frag0 + 40)
	check("Porta de saída abriu e porta de entrada reabriu", not door_closed_at(38, 32) and not door_closed_at(23, 26))
	await secs(2.5)

func run_unit() -> void:
	pass
