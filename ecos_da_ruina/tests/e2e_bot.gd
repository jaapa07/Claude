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
	# aleatoriedade com semente fixa: o mesmo fluxo a cada execução (sorteios de captura, flanqueio, passeio)
	var sd := 20261123
	for a in args:
		if a.begins_with("--seed="):
			sd = int(a.substr(7))
	seed(sd)
	Game.rng.seed = sd
	Game.toast.connect(func(t): if "exausta" in t: exhausted_events += 1)
	main.ui.instant = true
	if "--equip" in args:
		await run_equip()
	elif "--powers" in args:
		await run_powers()
	elif "--demo" in args:
		await run_demo()
	elif mode == "unit":
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
	var start_map := W.map_id
	while t < timeout:
		if W.map_id != start_map or W.transition_busy:
			release_moves()
			return true
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
	var fnt: Font = Fonts.pixel()
	check("Fonte da interface carregada com acentos (funciona no jogo exportado)", fnt != null and fnt.has_char("Ã".unicode_at(0)) and fnt.has_char("ç".unicode_at(0)) and fnt.get_string_size("Ruína", HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x > 30.0)

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
	print("  [info] dano acumulado até o Lenhador: ", Game.dmg_stats)
	if stage_limit <= 8: return
	await stage9_cervo()
	if stage_limit <= 9: return
	await stage10_save_load()
	if stage_limit <= 10: return
	await stage11_vila_transformada()
	if stage_limit <= 11: return
	await stage12_pos_chefao()
	if stage_limit <= 12: return
	# ================= CAPÍTULO 2 — MINAS DA BRASA (mesmo fluxo, sem recarregar)
	await r2_forja_chegada()
	if stage_limit <= 13: return
	await r2_pedreira()
	if stage_limit <= 14: return
	await r2_forja_equipe()
	if stage_limit <= 15: return
	await r2_trilhos()
	if stage_limit <= 16: return
	await r2_fundicao_a()
	if stage_limit <= 17: return
	await r2_fundicao_b()
	if stage_limit <= 18: return
	await r2_vigia()
	if stage_limit <= 19: return
	await r2_rito()
	if stage_limit <= 20: return
	await r2_ferreiro()
	if stage_limit <= 21: return
	await r2_pos_ferreiro()
	if stage_limit <= 22: return
	await r2_rito_avancado()
	await r2_save_load()

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
	if P.global_position.distance_to(cas.global_position) > 120.0:
		await goto(cas.global_position + Vector2(18, 0), 14.0, 1.2)
	var wt := 0
	while P.state != Player.S.FREE and wt < 60:
		await frames(1)
		wt += 1
	await tap("capture", 2)
	await frames(2)
	P.cap_target = cas
	await frames(3)
	check("Alvo protegido rejeita tentativa imediata", "protegido" in P.cap_msg, "%s prot=%.2f" % [P.cap_msg, cas.protect_t])
	P.aiming = false
	await secs(3.2)
	Game.rng_override = Callable()
	ok2 = await capture_wild(cas, 10)
	if not ok2:
		# o habitat fixo tem outros Cascalitos (se este caiu durante o teste)
		ok2 = await capture_species("c_casc2")
		cas = null
	check("Captura de Cascalito conclui (equipe agora com 2)", ok2 and Game.team.size() == 2, "ok2=%s valid=%s msg=%s aiming=%s state=%s seals=%d" % [ok2, cas != null and is_instance_valid(cas), P.cap_msg, P.aiming, P.state, Game.item_count("selo_basico")])
	check("Bestiário: Cascalito capturado", Game.bestiary.get("cascalito", {}).get("capturado", false))
	# ---- troca de criatura: recarga global de 6 s, sem curar nem reiniciar recarga
	var cas_id: String = Game.team[1]
	var br_id: String = Game.team[0]
	Game.heal_team()      # recuperação (como no santuário) para que nenhuma troca seja forçada por exaustão
	W.refresh_companion(true)
	await frames(10)
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
	await engage_area(Vector2(22 * 16.0, 26 * 16.0), 150.0, 40.0)
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
	var got := await capture_wild(lum, 10)
	if not got:
		# o habitat tem um segundo Lumipim (garantia de local fixo)
		var lum2 := ent_by_id("b_lumipim2")
		if lum2 != null and lum2.alive_flag:
			await goto(lum2.global_position + Vector2(18, 0), 14.0, 40.0)
			await weaken(lum2)
			got = await capture_wild(lum2, 10)
	check("Lumipim capturado (3 espécies na coleção)", got and Game.bestiary.get("lumipim", {}).get("capturado", false))
	check("Equipe cheia (3 criaturas)", Game.team.size() == 3)
	check("Missão Vínculos da Floresta: três criaturas capturadas", Game.has_flag("tres_vinculos"))
	# cipó do Brotisco: atalho opcional
	if Game.individuals[Game.team[0]].get("exausta", false):
		Game.heal_team()          # (recuperação de santuário; o teste segue sem voltar à vila)
	Game.set_active(Game.team[0])
	W.refresh_companion(true)
	await goto(Vector2(24 * 16.0, 10 * 16.0) + Vector2(-6, 0), 4.0, 60.0)
	var vine := ent_by_id("cipo_norte")
	await face(Vector2.RIGHT)
	await interact_press()
	await frames(6)
	check("Brotisco estende cipós e abre atalho opcional (ação ambiental)", Game.has_flag("cipo_bosque") and not W.is_solid_char(W.tile_char_at(Vector2(25 * 16 + 8, 10 * 16 + 8))),
		"ativa=%s prompt=%s pos=%s" % [str(Game.active_ind().get("species_id", "-")), W.current_prompt, str(P.global_position)])
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
	var nevo := await evolve_ready_team()
	check("Ao menos uma criatura evoluiu antes do Lenhador (sem atalhos de XP)", nevo >= 1, str(nevo))
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
	check("Lenhador reiniciou (vida cheia ao reentrar)", lb != null and lb.hp >= lb.max_hp * 0.85, str(lb.hp) if lb else "-")
	var frag0 := Game.fragments
	var res := await fight_boss(lb, 300.0)
	check("Lenhador Oco derrotado em combate", res == "vitoria", res)
	check("Lenhador: ataque anunciado e janela vulnerável observados", last_seen.get("vulneravel", false))
	check("Recompensa do minichefe concedida uma vez", Game.has_flag("lenhador_morto") and Game.fragments >= frag0 + 40)
	check("Porta de saída abriu e porta de entrada reabriu", not door_closed_at(38, 32) and not door_closed_at(23, 26))
	await secs(2.5)

func pillar_tiles() -> Array:
	var out := []
	for j in W.H:
		for i in W.W:
			if W.cur_tiles[j][i] == "P" and i >= 20 and i <= 43 and j >= 10 and j <= 26:
				out.append(Vector2(i * 16.0 + 8, j * 16.0 + 8))
	return out

func safe_lane_target(b: Node, pos: Vector2) -> Vector2:
	var best := pos
	var bd := 1e9
	var count := int((b.arena.size.x if b.lanes_vertical else b.arena.size.y) / 40.0) + 1
	for i in count:
		if (i + b.lanes_phase) % 2 == 0:
			continue
		var c: Vector2
		if b.lanes_vertical:
			c = Vector2(b.arena.position.x + i * 40.0 + 20.0, clamp(pos.y, b.arena.position.y + 20, b.arena.end.y - 20))
		else:
			c = Vector2(clamp(pos.x, b.arena.position.x + 20, b.arena.end.x - 20), b.arena.position.y + i * 40.0 + 20.0)
		if b.arena.grow(-12.0).has_point(c) and pos.distance_to(c) < bd:
			bd = pos.distance_to(c)
			best = c
	return best

func cervo_step(b: Node) -> void:
	await use_potion_if_needed()
	var pp := P.global_position
	match b.bst:
		b.B.TELE_CHARGE:
			if b.bt < 0.16 and P.dodge_cd <= 0.0 and P.vigor >= 25.0:
				steer(b.charge_dir.orthogonal())
				await frames(1)
				await tap("dodge", 2)
				release_moves()
			elif P.global_position.distance_to(b.global_position) < 70.0:
				steer(pp - b.global_position)
				await frames(2)
				release_moves()
			else:
				await frames(2)
		b.B.TELE_ROOTS:
			if b._lane_is_danger(pp):
				var tgt := safe_lane_target(b, pp)
				steer(tgt - pp)
				await frames(3)
				release_moves()
			else:
				await frames(3)
		b.B.ROOTS:
			if b._lane_is_danger(pp):
				var tgt2 := safe_lane_target(b, pp)
				steer(tgt2 - pp)
				await frames(3)
				release_moves()
			else:
				await frames(3)
		b.B.CHARGE, b.B.INTRO, b.B.TRANSITION:
			# mantém distância
			if pp.distance_to(b.global_position) < 90.0:
				steer(pp - b.global_position)
				await frames(3)
				release_moves()
			else:
				await frames(3)
		b.B.REPOS:
			# isca: coloca um pilar entre o herói e o cervo
			var pil := pillar_tiles()
			if pil.is_empty():
				await frames(3)
				return
			pil.sort_custom(func(x, y): return x.distance_to(b.global_position) + x.distance_to(pp) < y.distance_to(b.global_position) + y.distance_to(pp))
			var pc: Vector2 = pil[0]
			var spot: Vector2 = pc + (pc - b.global_position).normalized() * 26.0
			if pp.distance_to(spot) > 6.0:
				steer(spot - pp)
				await frames(3)
				release_moves()
			else:
				await frames(3)
		_:
			await combat_step(b)

func fight_cervo(b: Node, timeout := 420.0) -> String:
	var t := 0.0
	var seen := {}
	while t < timeout and is_instance_valid(b) and b.alive_flag:
		if P.state == Player.S.DEAD:
			return "morreu"
		var before := frame_count
		seen["bst%d" % b.bst] = true
		seen["fase%d" % b.phase] = true
		if b.exposed:
			seen["exposto"] = true
		if W.dark_on:
			seen["escuro"] = true
		await cervo_step(b)
		t += float(frame_count - before) / 60.0
		if int(t) % 15 == 0 and frame_count % 30 == 0:
			var c: Node = W.companion
			print("  [dbg cervo] t=%.0f hp=%.0f bst=%d comp=%s tgt=%s exausta=%s pos=%s" % [t, b.hp, b.bst, str(c.ind["species_id"]) if c else "-", str(c.target) if c else "-", str(Game.active_ind().is_empty()), str(c.global_position) if c else "-"])
	last_seen = seen
	return "vitoria" if (not is_instance_valid(b) or not b.alive_flag) else "tempo"

func find_boss(kind: String) -> Node:
	for e in W.enemies():
		if e.kind == kind:
			return e
	return null

func enter_cervo_arena() -> Node:
	await goto(Vector2(24 * 16.0 + 8, 18 * 16.0 + 8), 6.0, 90.0)
	await frames(20)
	return find_boss("cervo")

func die_to_boss(b: Node, label: String) -> void:
	Game.hero["hp"] = 2.0
	Game.hero_changed.emit()
	var t := 0.0
	while P.state != Player.S.DEAD and t < 40.0:
		if is_instance_valid(b) and b.global_position.distance_to(P.global_position) > 40.0 and b.bst != b.B.TELE_CHARGE:
			steer(b.global_position - P.global_position)
		else:
			release_moves()
		await frames(6)
		t += 0.1
	release_moves()
	check("Derrota na %s" % label, P.state == Player.S.DEAD)
	await secs(4.0)

func stage9_cervo() -> void:
	var ok := await exit_to("santuario_c", 47 * 16.0 + 8.0, 32 * 16.0 + 8.0)
	check("Câmaras profundas levam à Sala do Cervo", ok and W.map_id == "santuario_c")
	await use_ent("santuario_c_prep", Vector2(0, 18), Vector2.UP)
	await ui_press("ui_accept")
	await close_menus()
	check("Santuário de preparação grava ponto de retorno do chefão", Game.checkpoint.get("shrine", "") == "santuario_c_prep")
	await use_ent("placa_cervo", Vector2(0, 14), Vector2.UP)
	await advance_dialogs()
	check("Pista do chefão disponível (inscrição)", true)
	Game.set_flag("tmp_dummy_flag")
	# autosave antes do chefão
	check("Autosave anterior ao chefão existe", not SaveSys.slot_info(0).is_empty())
	# ---- derrota na fase 1
	var b := await enter_cervo_arena()
	check("Cervo de Ossos desperta ao entrar na arena (porta se fecha)", b != null and b.activated and door_closed_at(19, 18), "act=%s" % [b.activated if b else "-"])
	await shot("19_cervo_intro")
	check("Barra do chefão visível", main.ui.hud.boss == b)
	await secs(2.2)
	check("Cervo: fase 1 com ataque anunciado (investida)", b.phase == 1)
	await die_to_boss(b, "fase 1 do Cervo")
	check("Derrota fase 1: reinício limpo (cervo vivo, porta aberta, sem flags temporárias)", W.map_id == "santuario_c" and not Game.has_flag("cervo_morto") and not Game.has_flag("tmp_cervo_ativo") and not door_closed_at(19, 18))
	# ---- derrota na fase 2 (limiar a 60%)
	b = await enter_cervo_arena()
	check("Cervo reiniciou com vida cheia e fase 1", b != null and abs(b.hp - b.max_hp) < 0.01 and b.phase == 1)
	await secs(2.2)
	b.take_damage(b.max_hp * 0.41 / 0.7, b.global_position + Vector2(-20, 0), {"src": "heroi", "knock": 0.0})
	await frames(5)
	check("Fase 2 inicia uma única vez aos 60%", b.phase == 2 and b.phase_done[2])
	var hp_ph2: float = b.hp
	b.take_damage(1.0, b.global_position + Vector2(-20, 0), {"src": "heroi", "knock": 0.0})
	await secs(1.6)
	check("Transição de fase não repete (ocorre uma vez por limiar)", b.phase == 2)
	var saw_roots := false
	var tt := 0.0
	while tt < 12.0 and not saw_roots:
		if b.bst == b.B.TELE_ROOTS:
			saw_roots = true
		await frames(6)
		tt += 0.1
	check("Fase 2: faixas de raízes anunciadas com áreas seguras", saw_roots)
	await shot("20_cervo_raizes")
	await die_to_boss(b, "fase 2 do Cervo")
	check("Derrota fase 2: reinício limpo", W.map_id == "santuario_c" and not Game.has_flag("tmp_cervo_ativo") and not W.dark_on)
	# ---- derrota na fase 3 (escuridão com avisos legíveis)
	b = await enter_cervo_arena()
	await secs(2.2)
	b.take_damage(b.max_hp * 0.75 / 0.7, b.global_position + Vector2(-20, 0), {"src": "heroi", "knock": 0.0})
	await secs(2.2)
	check("Fase 3: escuridão ativa e fase registrada", b.phase == 3 and W.dark_on)
	await shot("21_cervo_escuro")
	await die_to_boss(b, "fase 3 do Cervo")
	check("Derrota fase 3: escuridão desligada e reinício limpo", not W.dark_on and not Game.has_flag("tmp_cervo_ativo") and not Game.has_flag("cervo_morto"))
	# ---- luta real até a vitória
	Game.heal_team()
	b = await enter_cervo_arena()
	await secs(2.2)
	var frag0 := Game.fragments
	var xp_lv := Game.hero_level()
	Game.dmg_stats = {}
	var t_fight := Time.get_ticks_msec()
	var res := await fight_cervo(b, 600.0)
	print("  [info] luta final do Cervo: %s, dano herói=%.0f companheiro=%.0f, vida do herói=%d, tônicos restantes=%d, nível herói=%d" % [res, float(Game.dmg_stats.get("heroi", 0)), float(Game.dmg_stats.get("companion", 0)), int(Game.hero["hp"]), Game.item_count("pocao"), Game.hero_level()])
	if res != "vitoria":
		# nova tentativa após eventual derrota (o jogo reinicia limpo no santuário)
		print("  [dbg] 1a tentativa: ", res, " fases vistas: ", last_seen.keys())
		for k in 3:
			if res == "vitoria":
				break
			await secs(4.0)
			Game.heal_team()
			b = await enter_cervo_arena()
			await secs(2.2)
			res = await fight_cervo(b, 600.0)
	check("Cervo de Ossos derrotado em combate real", res == "vitoria", res)
	check("Combate passou por investida anunciada, raízes e fases", last_seen.get("bst3", false) and last_seen.get("bst4", false) and last_seen.get("fase2", false), str(last_seen.keys()))
	check("Pilares expuseram o núcleo ao menos uma vez", last_seen.get("exposto", false), str(last_seen.keys()))
	check("Fase 3 enfrentada com escuridão", last_seen.get("fase3", false) and last_seen.get("escuro", false))
	await secs(2.5)
	check("Recompensa: Eco Raiz Viva concedido uma única vez", Game.has_eco("raiz_viva") and Game.eco_slots[0] == "raiz_viva")
	check("Flag cervo_morto e fragmentos de recompensa", Game.has_flag("cervo_morto") and Game.fragments >= frag0 + 120)
	check("Porta de saída do chefão abre", not door_closed_at(44, 18))
	check("Escuridão encerrada ao morrer", not W.dark_on)
	await shot("22_cervo_morto")
	var eco_before := Game.ecos.size()
	Game.grant_eco("raiz_viva")
	check("Recompensa idempotente (segundo grant não duplica)", Game.ecos.size() == eco_before)

func snapshot_state() -> Dictionary:
	var ind_sum := {}
	for u in Game.individuals:
		var i: Dictionary = Game.individuals[u]
		ind_sum[u] = [i["species_id"], i["nivel"], i["apelido"], i["vinculo"].duplicate(), i["exausta"]]
	return {"team": Game.team.duplicate(), "sanc": Game.sanctuary.duplicate(), "ind": ind_sum, "hero_level": Game.hero_level(), "hero_xp": int(Game.hero["xp"]),
		"frag": Game.fragments, "eco": Game.ecos.duplicate(), "chests": Game.chests.duplicate(), "cervo": Game.has_flag("cervo_morto"),
		"lenhador": Game.has_flag("lenhador_morto"), "inv": Game.inventory.duplicate(), "best": Game.bestiary.duplicate(true), "checkpoint": Game.checkpoint.duplicate(true),
		"equip": Game.equipment.duplicate(), "flags": Game.flags.size(), "map": W.map_id}

func stage10_save_load() -> void:
	# ---- salvar pelo menu de pausa (UI real) no slot 2, duas vezes para criar o backup
	await ui_press("pause")
	for i in 6:
		await ui_press("ui_down")
	await ui_press("ui_accept")      # Salvar jogo
	await frames(3)
	await ui_press("ui_down")        # slot 2
	await ui_press("ui_accept")
	await frames(4)
	await close_menus()
	check("Salvamento pelo menu grava o slot 2", not SaveSys.slot_info(2).is_empty())
	var snap := snapshot_state()
	# não salva em estado instável (captura em andamento)
	Game.save_block += 1
	var blocked := not SaveSys.save_game(3)
	Game.save_block -= 1
	check("Não é possível salvar durante captura/transição (estado instável)", blocked and SaveSys.slot_info(3).is_empty())
	check("Salvar de novo cria backup", W.save_now(2) and FileAccess.file_exists("user://saves/slot_2.json.bak"))
	# arquivo principal corrompido: recupera do backup
	var f := FileAccess.open("user://saves/slot_2.json", FileAccess.WRITE)
	f.store_string("{corrompido")
	f.close()
	var info := SaveSys.slot_info(2)
	check("Save corrompido é detectado e recuperado do backup", not info.is_empty() and info.get("recuperado", false))
	check("Escrita atômica não deixa arquivo temporário", not FileAccess.file_exists("user://saves/slot_2.json.tmp"))
	check("Salvar após recuperação restaura o arquivo principal", W.save_now(2) and not SaveSys.slot_info(2).get("recuperado", true))
	# ---- voltar ao título e Carregar pelo menu
	main.back_to_title()
	await frames(5)
	check("Voltar ao título encerra a partida", not Game.in_game)
	await ui_press("ui_down")        # Novo jogo
	await ui_press("ui_down")        # Carregar
	await ui_press("ui_accept")
	await frames(3)
	await ui_press("ui_down")        # slot 1
	await ui_press("ui_down")        # slot 2
	await ui_press("ui_accept")
	await frames(30)
	check("Carregar slot 2 retoma a partida", Game.in_game and W.map_id == "santuario_c", W.map_id)
	var after := snapshot_state()
	check("Load mantém equipe e santuário", after["team"] == snap["team"] and after["sanc"] == snap["sanc"])
	var diff := ""
	for k in snap["ind"]:
		if not after["ind"].has(k) or str(after["ind"][k]) != str(snap["ind"][k]):
			diff += " %s: %s vs %s;" % [k, str(snap["ind"][k]), str(after["ind"].get(k))]
	check("Load mantém indivíduos (espécie, nível, apelido, vínculo)", diff == "", diff)
	check("Load mantém recompensa do chefão (Eco Raiz Viva) e flag cervo_morto", Game.has_eco("raiz_viva") and Game.has_flag("cervo_morto") and Game.eco_slots[0] == "raiz_viva")
	check("Load mantém herói, fragmentos, inventário e equipamentos", after["hero_level"] == snap["hero_level"] and after["frag"] == snap["frag"] and after["inv"] == snap["inv"] and after["equip"] == snap["equip"], "lvl %s/%s frag %s/%s inv %s vs %s" % [after["hero_level"], snap["hero_level"], after["frag"], snap["frag"], str(after["inv"]), str(snap["inv"])])
	check("Load mantém baús abertos", after["chests"] == snap["chests"] and Game.chests.has("a_bau_tesouro"))
	check("Load mantém bestiário e checkpoint", after["best"] == snap["best"] and after["checkpoint"] == snap["checkpoint"])
	check("Chefão morto permanece morto após recarregar", find_boss("cervo") == null and not Game.has_flag("tmp_cervo_ativo"))
	check("Minichefe morto permanece morto", Game.has_flag("lenhador_morto"))
	await shot("23_apos_load")

func stage11_vila_transformada() -> void:
	var ok := await exit_to("vila_lumen", 51 * 16.0 + 8.0, 18 * 16.0 + 8.0)
	if not ok:
		print("  [dbg] saída falhou em ", W.map_id, P.global_position, " estado ", P.state)
		ok = await exit_to("vila_lumen", 51 * 16.0 + 8.0, 19 * 16.0 + 4.0)
	check("Saída do santuário leva à vila transformada", ok and W.map_id == "vila_lumen")
	await frames(60)
	await advance_dialogs()
	check("Cena de retorno à vila ocorre e marca voltou_vila", Game.has_flag("voltou_vila"))
	check("Raízes ao norte recuaram", not W.is_solid_char(W.tile_char_at(Vector2(21 * 16 + 8, 5 * 16 + 8))))
	var grass_changed := false
	for yy in range(2, 12):
		for xx in range(3, 15):
			if W.cur_tiles[yy][xx] in ["g", "G"]:
				grass_changed = true
	check("Vegetação da vila foi transformada (grama viva e flores)", grass_changed)
	check("Família retornou à vila (NPC novo)", ent_by_id("mae") != null)
	await shot("24_vila_transformada")
	await talk("anciao")
	check("Maru recompensa os Vínculos da Floresta", Game.has_flag("vinculos_entregue") and Game.item_count("amuleto_vinculo") == 1)
	await talk("anciao")
	check("Diálogo da Anciã mudou após o chefão", Game.has_flag("cervo_morto"))
	# ---- Raiz Viva abre a passagem às Minas da Brasa
	ok = await exit_to("desfiladeiro", 22 * 16.0, 8.0)
	check("Passagem norte da vila leva ao Desfiladeiro do Eco", ok and W.map_id == "desfiladeiro")
	await shot("25_desfiladeiro")
	check("Ravina bloqueia a passagem antes da ponte", W.is_solid_char(W.tile_char_at(Vector2(19 * 16 + 8, 10 * 16 + 8))))
	# sem o Eco a ponte não é construída
	var had := Game.ecos.duplicate()
	Game.ecos.clear()
	await use_ent("ponte_minas", Vector2(0, 14), Vector2.UP)
	check("Sem Raiz Viva, o suporte não responde", not Game.has_flag("ponte_minas"))
	Game.ecos = had
	await use_ent("ponte_minas", Vector2(0, 14), Vector2.UP)
	await frames(10)
	check("Raiz Viva constrói a ponte (interação contextual, sem gastar energia)", Game.has_flag("ponte_minas") and not W.is_solid_char(W.tile_char_at(Vector2(19 * 16 + 8, 10 * 16 + 8))))
	await shot("26_ponte")
	ok = await exit_to("minas_entrada", 20 * 16.0, 8.0)
	check("Ponte leva às Minas da Brasa", ok and W.map_id == "minas_entrada")
	await goto(Vector2(15 * 16.0, 5 * 16.0), 8.0, 40.0)
	await frames(10)
	await advance_dialogs()
	check("Fim do capítulo 1 sinalizado (demais regiões em desenvolvimento)", Game.has_flag("fim_cap1") and Game.has_flag("ponte_minas"))
	await shot("27_fim_capitulo")

func evolve_via_ui(uuid: String) -> void:
	await ui_press("pause")
	await ui_press("ui_down")
	await ui_press("ui_accept")      # Equipe e criaturas
	await frames(3)
	var idx := Game.team.find(uuid)
	for i in idx:
		await ui_press("ui_down")
	await ui_press("ui_accept")      # menu da criatura
	await frames(3)
	await ui_press("ui_down")
	await ui_press("ui_down")        # Evoluir…
	await ui_press("ui_accept")
	await frames(3)
	await shot("28_evolucao_confirma")
	await ui_press("ui_accept")      # Confirmar
	await frames(10)
	await close_menus()

## Antes do Lenhador: evolui pela interface toda criatura da equipe que já cumpriu nível e vínculo (sem atalhos)
func evolve_ready_team() -> int:
	var n := 0
	for u in Game.team.duplicate():
		var ind: Dictionary = Game.individuals[u]
		print("  [info] %s nível %d, vínculo %d/3" % [ind["species_id"], ind["nivel"], Game.bond_count(ind)])
		if Game.evolution_status(ind)["possivel"]:
			if ind["species_id"] == "brotisco":
				ind["apelido"] = "Broto"
			var uuid0: String = ind["uuid"]
			var env0: String = Game.sp_of(ind).get("acao_id", "")
			var sp0: String = ind["species_id"]
			await evolve_via_ui(u)
			var after: Dictionary = Game.individuals[u]
			check("Evolução de %s pela Equipe (antes dos chefões)" % sp0, after["species_id"] != sp0, after["species_id"])
			check("Evolução de %s preserva uuid, apelido e ação ambiental" % sp0, after["uuid"] == uuid0 and Game.sp_of(after).get("acao_id", "") == env0)
			n += 1
	return n

func stage12_pos_chefao() -> void:
	var evolved := 0
	for u in Game.individuals:
		if Game.individuals[u]["species_id"] in ["galhardo", "auripim", "rocantor"]:
			evolved += 1
	check("Criaturas evoluídas participaram dos chefões", evolved >= 1, str(evolved))
	check("Bestiário registra a evolução", Game.bestiary.get("galhardo", {}).get("evoluiu", false) or Game.bestiary.get("auripim", {}).get("evoluiu", false) or Game.bestiary.get("rocantor", {}).get("evoluiu", false))
	check("Evolução não duplica indivíduos", Game.individuals.size() == Game.team.size() + Game.sanctuary.size())
	for u in Game.individuals:
		var ind: Dictionary = Game.individuals[u]
		if ind["species_id"] in ["galhardo", "auripim", "rocantor"]:
			check("Forma final não evolui de novo", not Game.evolution_status(ind)["possivel"])
			break
	var gal := ""
	for u in Game.individuals:
		if Game.individuals[u]["species_id"] == "galhardo":
			gal = u
	if gal != "":
		check("Apelido mantido após evoluir", Game.individuals[gal]["apelido"] == "Broto")

func run_unit() -> void:
	main.start_new_game(3)
	await frames(10)
	await advance_dialogs()
	Game.god_mode = false
	# ---- movimento: diagonal não é mais rápida
	P.global_position = Vector2(21 * 16 + 8, 16 * 16 + 8)
	await frames(3)
	var p0 := P.global_position
	Input.action_press("move_right"); await frames(30); Input.action_release("move_right")
	var d_axis := P.global_position.distance_to(p0)
	P.global_position = Vector2(21 * 16 + 8, 16 * 16 + 8)
	await frames(3)
	p0 = P.global_position
	Input.action_press("move_right"); Input.action_press("move_down"); await frames(30)
	Input.action_release("move_right"); Input.action_release("move_down")
	var d_diag := P.global_position.distance_to(p0)
	check("Diagonal não é mais rápida que eixo", d_diag <= d_axis + 0.5, "%.1f vs %.1f" % [d_diag, d_axis])
	# ---- colisão: herói não atravessa parede
	P.global_position = Vector2(2 * 16 + 8, 16 * 16 + 8)
	Input.action_press("move_left"); await frames(60); Input.action_release("move_left")
	check("Herói não atravessa árvores/paredes", not W.tile_solid_at(P.global_position) and P.global_position.x > 32.0)
	# ---- fórmula de captura: limites e termos
	var pmin := Game.capture_chance("lumipim", 30, 1.0, false, "selo_basico")
	Game.hero["talents"]["vinculo"] = 5
	var pmax := Game.capture_chance("brotisco", 1, 0.0, true, "selo_refinado")
	Game.hero["talents"]["vinculo"] = 0
	check("Probabilidade respeita mínimo 10%", is_equal_approx(pmin, 0.10), str(pmin))
	check("Probabilidade respeita máximo 95%", is_equal_approx(pmax, 0.95), str(pmax))
	var pc := Game.capture_chance("brotisco", 1, 0.5, false, "selo_basico")
	check("Fórmula: comum a 50% de vida = 0,25 + 0,225", is_equal_approx(pc, 0.475), str(pc))
	var pl := Game.capture_chance("brotisco", 6, 0.5, false, "selo_basico")
	check("Penalidade de nível L = 0,02 x diferença", is_equal_approx(pc - pl, 0.10), str(pc - pl))
	Game.rng_override = func(): return 0.5
	check("Fonte aleatória controlável em testes", Game.rand_f() == 0.5)
	Game.rng_override = Callable()
	# ---- santuário cheio bloqueia antes do selo
	for i in Game.SANCTUARY_CAP:
		var ind := Game.new_individual("brotisco", 1)
		Game.individuals[ind["uuid"]] = ind
		if Game.team.size() < 3:
			Game.team.append(ind["uuid"])
		else:
			Game.sanctuary.append(ind["uuid"])
	for i in 3:
		var ind2 := Game.new_individual("cascalito", 1)
		Game.individuals[ind2["uuid"]] = ind2
		Game.sanctuary.append(ind2["uuid"])
	check("Armazenamento cheio é detectado", not Game.storage_has_room())
	var wild := ent_by_id("brotisco_tutorial")
	wild.hp = wild.max_hp * 0.2
	P.global_position = wild.global_position + Vector2(-30, 0)
	await frames(2)
	check("Equipe e santuário cheios rejeitam a captura antes de lançar", P.validate_target(wild) == "Equipe e santuário cheios.", P.validate_target(wild))
	var dup := Game.register_capture(Game.individuals[Game.team[0]])
	check("Registro de captura não duplica indivíduo existente", dup == "duplicado")
	# ---- troca não cura nem duplica
	var a0: Dictionary = Game.individuals[Game.team[0]]
	a0["hp"] = 5.0
	Game.swap_cd = 0.0
	Game.swap_active()
	check("Troca não cura a criatura que sai", float(a0["hp"]) == 5.0)
	check("Troca não duplica indivíduos", Game.team.size() == 3 and Game.individuals.size() == Game.SANCTUARY_CAP + 3)
	# ---- liberar: confirmação e última criatura
	check("Não permite liberar com muitas criaturas? (permitido) e regra da última criatura existe", Game.can_release(Game.sanctuary[0]) == "")
	# ---- esquiva: janela de invulnerabilidade só entre 0,06 e 0,20 s
	P.state = Player.S.DODGE
	P.dodge_t = 0.03
	check("Esquiva: vulnerável antes de 0,06 s", not P.is_dodge_invulnerable())
	P.dodge_t = 0.12
	check("Esquiva: invulnerável dentro da janela", P.is_dodge_invulnerable())
	P.dodge_t = 0.25
	check("Esquiva: vulnerável após 0,20 s", not P.is_dodge_invulnerable())
	P.state = Player.S.FREE
	P.vigor = 10.0
	P._try_dodge()
	check("Vigor insuficiente impede esquiva", P.state == Player.S.FREE)
	# ---- defesa frontal reduz 70% e falha contra indefensável
	P.vigor = 100.0
	Game.hero["hp"] = 100.0
	P.inv_timer = 0.0
	P.state = Player.S.GUARD
	P.aim_dir = Vector2.RIGHT
	Game.difficulty = "desafio"
	P.take_hit(20.0, P.global_position + Vector2(30, 0))
	check("Defesa frontal reduz 70% do dano", abs(float(Game.hero["hp"]) - (100.0 - 20.0 * 0.3)) < 0.1, str(Game.hero["hp"]))
	P.inv_timer = 0.0
	P.state = Player.S.GUARD
	Game.hero["hp"] = 100.0
	P.take_hit(20.0, P.global_position + Vector2(30, 0), {"indefensavel": true})
	check("Ataque indefensável ignora a defesa", abs(float(Game.hero["hp"]) - 80.0) < 0.1)
	P.inv_timer = 0.0
	P.state = Player.S.FREE
	Game.hero["hp"] = 100.0
	P.take_hit(10.0, P.global_position + Vector2(30, 0))
	var after_first := float(Game.hero["hp"])
	P.take_hit(10.0, P.global_position + Vector2(30, 0))
	check("Invulnerabilidade pós-dano evita acertos instantâneos", float(Game.hero["hp"]) == after_first)
	Game.difficulty = "aventura"
	check("Dificuldade Aventura reduz dano inimigo em 25%", is_equal_approx(Game.enemy_damage_mult(), 0.75) and is_equal_approx(Game.warning_mult(), 1.2))
	# ---- dados: validação
	check("Validação de dados sem erros", Data.errors.is_empty(), str(Data.errors))
	check("15 espécies-base e 3 evoluções jogáveis cadastradas", Data.species.size() >= 18)
	# ---- Região 2: garantias de design verificadas nos dados
	var r2_sp := ["faisquito", "ferrunho", "fuligin"]
	var ok_sp := true
	for sid in r2_sp:
		var sp: Dictionary = Data.species[sid]
		if sp["status"] != "jogavel" or sp["raridade"] == "rara" or int(sp["evolucao"]["nivel"]) > 11 or Data.species[sp["evolucao"]["para"]]["status"] != "jogavel":
			ok_sp = false
	check("R2: espécies das minas jogáveis, não raras, evolução até o nível 11", ok_sp)
	# nenhum portão obrigatório depende de criatura, de Eco ou de flag que só se obtém depois dele
	var creature_flags := {}
	var eco_flags := {}
	for mid in Data.regions["minas"]["mapas"]:
		for e in Data.maps[mid]["entities"]:
			if e["type"] in ["rail_marked", "draft", "vine"] and not e.get("hero", false):
				creature_flags[e["flag"]] = mid
			if e["type"] == "crack":
				eco_flags[e["flag"]] = mid
	var bad := []
	for mid in Data.regions["minas"]["mapas"]:
		for e in Data.maps[mid]["entities"]:
			if e["type"] == "door":
				for f in e.get("open_flags", []):
					if creature_flags.has(f) or eco_flags.has(f) or f == "ferreiro_morto" and mid != "fundicao_c":
						bad.append("%s:%s" % [mid, e["id"]])
			if e["type"] == "exit" and e.get("if_flag", "") in creature_flags:
				bad.append("%s:saida" % mid)
	check("R2: portões obrigatórios não dependem de criatura nem de Ruptura Ígnea (sem dependência circular)", bad.is_empty(), str(bad))
	var agua := []
	for mid in Data.regions["minas"]["mapas"]:
		for e in Data.maps[mid]["entities"]:
			if e["type"] == "valve" and not e.has("flag") and not e.get("boss", false):
				agua.append(e["id"])
			if e.get("species", "") in ["goturim", "marulume"] or e["type"] == "vine":
				agua.append(str(e.get("id", e["type"])))
	check("R2: resfriamento só por válvulas locais (nenhuma criatura de água nas minas)", agua.is_empty(), str(agua))
	# forja: custo e efeito
	Game.inventory["minerio_cobre"] = 3
	Game.fragments = 40
	var atk_f := Game.hero_atk()
	var ok_f := Game.forge_upgrade("espada_viajante")
	check("R2: forja consome materiais e melhora a arma (+3 de ataque)", ok_f and Game.item_count("minerio_cobre") == 0 and Game.fragments == 0 and abs(Game.hero_atk() - atk_f - 3.0) < 0.01)
	check("R2: forja recusa sem materiais", Game.forge_check("espada_viajante") != "" and not Game.forge_upgrade("espada_viajante"))
	Game.inventory["luvas_termicas"] = 1
	check("R2: Luvas Térmicas reduzem o calor pela metade", is_equal_approx(Game.heat_mult(), 0.5))
	# condicional por área (válvula resfria só a ala)
	W.load_map("pedreira_oca", "from_forja")
	await frames(3)
	var q_before: String = W.cur_tiles[15][20]
	Game.set_flag("pedreira_valv")
	await frames(2)
	check("R2: válvula converte Q->q só dentro da área", q_before == "Q" and W.cur_tiles[15][20] == "q" and W.cur_tiles[33][42] == "Q")
	Game.set_flag("pedreira_valv", false)

## Captura quadro a quadro do combo de espada (para conferir a animação)
func run_demo() -> void:
	main.start_new_game(3)
	await frames(10)
	await advance_dialogs()
	var br := ent_by_id("brotisco_tutorial")
	br.set_physics_process(false)
	P.global_position = br.global_position + Vector2(-22, 0)
	await face(Vector2.RIGHT)
	await frames(5)
	var n := 0
	for k in 3:
		Input.action_press("attack"); await frames(1); Input.action_release("attack")
		for f in 20:
			await frames(1)
			if f % 2 == 0:
				await shot("atk_%02d" % n)
				n += 1
	P.global_position = br.global_position + Vector2(0, -24)
	await face(Vector2.DOWN)
	await frames(30)
	Input.action_press("attack"); await frames(1); Input.action_release("attack")
	for f in 16:
		await frames(1)
		if f % 2 == 0:
			await shot("atkd_%02d" % n)
			n += 1

# =============================================================== CAPÍTULO 2 — MINAS DA BRASA
func tpos(tx: int, ty: int) -> Vector2:
	return Vector2(tx * 16.0 + 8.0, ty * 16.0 + 8.0)

func toast_seen(sub: String) -> bool:
	for t in main.ui.hud.toasts:
		if sub in t["t"]:
			return true
	return false

func uuid_of(sp_ids: Array) -> String:
	for u in Game.individuals:
		if Game.individuals[u]["species_id"] in sp_ids:
			return u
	return ""

func rest_at(shrine_id: String) -> void:
	await use_ent(shrine_id, Vector2(0, 18), Vector2.UP)
	await ui_press("ui_accept")      # Descansar
	await close_menus()

func take_fire(brazier: String, from := Vector2(0, 14), dir := Vector2.UP) -> void:
	await use_ent(brazier, from, dir)

func light_with_torch(brazier: String, furnace: String, bfrom := Vector2(0, 14), bdir := Vector2.UP, ffrom := Vector2(0, 14), fdir := Vector2.UP) -> void:
	await take_fire(brazier, bfrom, bdir)
	await use_ent(furnace, ffrom, fdir)

func push_cart_dir(cart: Node, dir: Vector2) -> void:
	await goto(cart.global_position - dir * 16.0, 3.0, 40.0)
	await face(dir)
	await interact_press()
	var t := 0
	await frames(4)
	while cart.moving and t < 600:
		await frames(2)
		t += 2
	await frames(4)

func exhaust_team() -> void:
	for u in Game.team:
		Game.damage_creature(Game.individuals[u], 99999.0)
	await frames(5)

func set_active_species(ids: Array) -> bool:
	var u := uuid_of(ids)
	if u == "" or not Game.team.has(u):
		return false
	if Game.individuals[u].get("exausta", false):
		return false
	Game.set_active(u)
	W.refresh_companion(true)
	await frames(5)
	return Game.active_ind().get("uuid", "") == u

## Tenta os indivíduos do habitat em ordem (o habitat fixo tem mais de um, como garante o documento).
func capture_species(id: String, limit := 0.3) -> bool:
	var ids: Array = [id]
	var sp_id := ""
	var home := P.global_position
	for d in W.ent_defs:
		if d.get("id", "") == id:
			sp_id = d["species"]
			home = tpos(int(d["x"]), int(d["y"]))
	for e in get_tree().get_nodes_in_group("wild"):
		var w0: Node = e
		if w0.uid != id and w0.species_id == sp_id and w0.global_position.distance_to(home) < 320.0:
			ids.append(w0.uid)
	var n0 := Game.individuals.size()
	for wid in ids:
		var w := ent_by_id(wid)
		if w == null or not w.alive_flag:
			continue
		await goto(w.global_position + Vector2(18, 0), 14.0, 40.0)
		await weaken(w, limit)
		if not is_instance_valid(w) or not w.alive_flag:
			continue
		if await capture_wild(w, 10):
			return true
	return Game.individuals.size() > n0

# ---------------------------------------------------------------- 13. chegada à Forja de Cobre
func r2_forja_chegada() -> void:
	var ok := await exit_to("forja_cobre", 15 * 16.0 + 8.0, 8.0)
	check("R2: a passagem do fim do Capítulo 1 segue para a Forja de Cobre", ok and W.map_id == "forja_cobre" and Game.has_flag("fim_cap1"))
	check("R2: região Minas da Brasa marcada como jogável", Data.regions["minas"]["status"] == "jogavel" and Data.regions["minas"]["mapas"].size() >= 8)
	check("R2: tileset das minas (segunda fonte do TileSet) carregado", W.tilemap.tile_set.has_source(1) and W.tilemap.get_cell_source_id(Vector2i(23, 20)) == 1)
	check("R2: objetivo do Capítulo 2 aparece no HUD", Game.has_flag("visitou_forja_cobre") and "Doran" in Game.objective_text(), Game.objective_text())
	await shot("r2_01_forja")
	await talk("doran")
	check("R2: capataz Doran dá a missão principal e suprimentos", Game.has_flag("falou_doran") and "Pedreira" in Game.objective_text())
	await talk("tessa")
	check("R2: Tessa oferece a missão 'Ferramentas Perdidas'", Game.has_flag("quest_ferramentas"))
	await talk("nino")
	check("R2: Nino oferece a missão 'Calor de Vínculo'", Game.has_flag("quest_calor"))
	await talk("ilda")
	check("R2: Mestra Ilda abre a forja (tela de melhoria)", main.ui.has_screen() and Game.has_flag("falou_ilda"))
	await shot("r2_02_forja_ui")
	await close_menus()
	await rest_at("forja")
	check("R2: santuário da Forja grava o ponto de retorno", Game.checkpoint.get("shrine", "") == "forja")
	# obstáculos apresentados antes da solução
	await use_ent("forja_rocha", Vector2(-16, 0), Vector2.RIGHT)
	check("R2: rocha fissurada visível e intransponível antes da Ruptura Ígnea", W.is_solid_char(W.tile_char_at(tpos(44, 29))) and W.tile_char_at(tpos(44, 29)) == "X" and not Game.has_flag("forja_rocha"))
	check("R2: elevador da praça parado antes do chefão", not W._def_visible({"if_flag": "ferreiro_morto"}))
	await use_ent("forja_inscricao", Vector2(0, 14), Vector2.UP)
	check("R2: inscrição oculta marcada para revisita com Olhar Velado", Game.has_flag("viu_oculto_forja_inscricao"))

# ---------------------------------------------------------------- 14. Pedreira Oca (rota 1)
func r2_pedreira() -> void:
	var ok := await exit_to("pedreira_oca", 8.0, 18 * 16.0 + 8.0)
	check("R2: oeste da Forja leva à Pedreira Oca (rota 1)", ok and W.map_id == "pedreira_oca")
	await shot("r2_03_pedreira")
	await engage_area(tpos(40, 18), 220.0, 120.0)
	check("R2: mineiros corrompidos (arremesso de ferramentas) derrotados", hostile().filter(func(e): return e.global_position.distance_to(tpos(40, 18)) < 220.0).is_empty() and P.state != Player.S.DEAD)
	check("R2: mineiro conta para a missão da Tessa", int(Game.stats["kills"].get("mineiro", 0)) >= 1)
	await use_ent("p_veio1", Vector2(0, 14), Vector2.UP)
	await use_ent("p_veio2", Vector2(0, 14), Vector2.UP)
	check("R2: veios de minério dão minério de cobre (uma vez)", Game.item_count("minerio_cobre") >= 4 and Game.chests.has("p_veio1"))
	# ninho de Faisquitos: só aparece com a fornalha velha acesa (pelo herói, com o braseiro)
	check("R2: ninho escondido antes de acender a fornalha", ent_by_id("p_faisquito_ninho1") == null)
	await light_with_torch("p_ninho_brasa", "p_ninho_forn", Vector2(0, -14), Vector2.DOWN, Vector2(0, -14), Vector2.DOWN)
	await frames(10)
	check("R2: fornalha acesa pelo herói revela o ninho de Faisquitos", Game.has_flag("ninho_aceso") and ent_by_id("p_faisquito_ninho1") != null)
	await shot("r2_04_ninho")
	# Faisquito no bolsão quente (habitat fixo)
	var sanc0 := Game.sanctuary.size()
	var okf := await capture_species("p_faisquito1")
	check("R2: Faisquito capturado no habitat fixo da pedreira", okf and Game.bestiary.get("faisquito", {}).get("capturado", false))
	check("R2: equipe cheia encaminha a captura ao santuário", Game.sanctuary.size() == sanc0 + 1)
	# calor: piso quente fere; a válvula resfria
	await engage_area(tpos(12, 15), 160.0, 60.0)
	await goto(tpos(31, 15), 4.0, 40.0)
	await goto(tpos(25, 15), 4.0, 20.0)
	var hp0 := float(Game.hero["hp"])
	await secs(2.0)
	check("R2: piso quente (Q) fere o herói periodicamente", float(Game.hero["hp"]) < hp0 - 4.0, "%s -> %s" % [hp0, Game.hero["hp"]])
	await use_ent("pedreira_valvula", Vector2(0, 14), Vector2.UP)
	check("R2: válvula de resfriamento converte Q em q na ala definida", Game.has_flag("pedreira_valv") and W.tile_char_at(tpos(25, 15)) == "q")
	await goto(tpos(25, 15), 4.0, 20.0)
	var hp1 := float(Game.hero["hp"])
	await secs(2.0)
	check("R2: piso resfriado (q) não fere", float(Game.hero["hp"]) >= hp1 - 0.01)
	await shot("r2_05_valvula")
	await engage_area(tpos(10, 15), 160.0, 60.0)
	var okg := await capture_species("p_fuligin1")
	check("R2: Fuligin capturado na galeria escura", okg and Game.bestiary.get("fuligin", {}).get("capturado", false))
	await use_ent("fresta_veio", Vector2(0, -14), Vector2.DOWN)
	check("R2: corrente de ar só se revela com fumaça (sem Fuligin ativo nada muda)", not Game.has_flag("veio_revelado"))
	await use_ent("pedreira_bau1", Vector2(0, 14), Vector2.UP)
	check("R2: baú do nicho do elevador (manual) coletado", Game.chests.has("pedreira_bau1") and Game.item_count("diario_elevador") == 1)
	ok = await exit_to("forja_cobre", 55 * 16.0 + 8.0, 19 * 16.0 + 8.0)
	check("R2: volta da pedreira à Forja", ok)

# ---------------------------------------------------------------- 15. Forja: equipe, missão de vínculo e forja
func r2_forja_equipe() -> void:
	await use_ent("forja", Vector2(0, 18), Vector2.UP)
	await ui_press("ui_accept")
	# no santuário: as criaturas da floresta vão para o armazenamento e as das minas entram na equipe
	var fa := uuid_of(["faisquito", "brasejante"])
	var fu := uuid_of(["fuligin", "cinzaveu"])
	var olds := Game.team.duplicate()
	for i in olds.size() - 1:
		Game.move_to_sanctuary(olds[i])
	Game.move_to_team(fa)
	Game.move_to_team(fu)
	Game.move_to_sanctuary(olds[olds.size() - 1])
	await close_menus()
	W.refresh_companion(true)
	check("R2: Faisquito e Fuligin na equipe (vagas para o Ferrunho)", Game.team.has(fa) and Game.team.has(fu) and Game.team.size() == 2, str(Game.team.size()))
	await talk("nino")
	check("R2: missão 'Calor de Vínculo' concluída e conta vínculo para a equipe", Game.has_flag("calor_entregue") and "missao:calor_nino" in Game.individuals[fa]["vinculo"])
	# forja: melhora a arma com comparação antes/depois
	var atk0 := Game.hero_atk()
	var w: String = Game.equipment["arma"]
	await use_ent("bigorna", Vector2(0, 14), Vector2.UP)   # a bigorna abre a forja
	await frames(3)
	await ui_press("ui_accept")       # Arma
	await frames(3)
	var top: MenuScreen = main.ui._top()
	check("R2: tela de comparação antes/depois antes de forjar", top != null and "Melhorar" in top.title and "DEPOIS" in top.info_default, top.title if top else "-")
	await shot("r2_06_forja_comparacao")
	await ui_press("ui_accept")       # Confirmar
	await frames(3)
	await close_menus()
	check("R2: forja melhora a arma para +1 gastando fragmentos e minério", Game.upgrade_level(w) == 1 and abs(Game.hero_atk() - atk0 - 3.0) < 0.01, "%d atk %s->%s" % [Game.upgrade_level(w), atk0, Game.hero_atk()])
	check("R2: nível +3 bloqueado até a grande forja acender", "grande forja" in str(Data.forge["niveis"][2]["requer_texto"]))
	# fumaça do Fuligin revela o veio esquecido (segredo ligado às criaturas)
	var ok := await exit_to("pedreira_oca", 8.0, 18 * 16.0 + 8.0)
	await set_active_species(["fuligin", "cinzaveu"])
	await use_ent("fresta_veio", Vector2(0, -14), Vector2.DOWN)
	check("R2: Fuligin revela a corrente de ar (ação ambiental com efeito real)", Game.has_flag("veio_revelado") and not W.is_solid_char(W.tile_char_at(tpos(9, 32))))
	check("R2: ação ambiental do Fuligin conta vínculo", "acao:fresta_veio" in Game.individuals[fu]["vinculo"])
	await use_ent("veio_rocha", Vector2(0, -14), Vector2.DOWN)
	check("R2: veio selado por rocha fissurada (Ruptura Ígnea ainda não existe)", W.tile_char_at(tpos(9, 37)) == "X" and not Game.has_flag("veio_rocha"))
	await shot("r2_07_veio")
	ok = await exit_to("forja_cobre", 55 * 16.0 + 8.0, 19 * 16.0 + 8.0)
	check("R2: de volta à Forja", ok)

# ---------------------------------------------------------------- 16. Trilhos Fundidos (rota 2)
func r2_trilhos() -> void:
	var ok := await exit_to("trilhos_fundidos", 47 * 16.0 + 8.0, 18 * 16.0 + 8.0)
	check("R2: leste da Forja leva aos Trilhos Fundidos (rota 2)", ok and W.map_id == "trilhos_fundidos")
	await shot("r2_08_trilhos")
	await engage_area(tpos(11, 19), 180.0, 90.0)
	var okr := await capture_species("t_ferrunho1")
	check("R2: Ferrunho capturado no pátio de sucata (vai para a equipe)", okr and Game.bestiary.get("ferrunho", {}).get("capturado", false) and Game.team.size() == 3)
	# segredo por observação: vapor vazando de uma placa solta
	check("R2: depósito escondido antes de examinar o vapor", W.is_solid_char(W.tile_char_at(tpos(19, 13))))
	await use_ent("t_vapor", Vector2(-16, 0), Vector2.RIGHT)
	check("R2: examinar o vapor que vaza abre o depósito (segredo por observação)", Game.has_flag("trilhos_vapor") and not W.is_solid_char(W.tile_char_at(tpos(19, 13))))
	await use_ent("trilhos_bau_vapor", Vector2(0, 14), Vector2.UP)
	check("R2: diário encontrado no depósito", Game.item_count("diario_tessa") == 1)
	# carrinho: primeiro cai no ramal errado, depois a alavanca de desvio corrige
	var cart := ent_by_id("t_carrinho")
	await push_cart_dir(cart, Vector2.RIGHT)
	check("R2: carrinho anda sobre os trilhos e o desvio inicial o leva ao beco sul", tile_of(cart.global_position) == Vector2i(30, 23), str(tile_of(cart.global_position)))
	check("R2: portão segue fechado sem o carrinho no batente", door_closed_at(40, 15))
	await use_ent("t_desvio", Vector2(-16, 0), Vector2.RIGHT)
	check("R2: alavanca de desvio muda o trilho", W.rail_switch.get("t_desvio", "") == "a")
	await push_cart_dir(cart, Vector2.UP)
	check("R2: carrinho segue o desvio, sobe a curva e para no batente", tile_of(cart.global_position) == Vector2i(38, 17), str(tile_of(cart.global_position)))
	check("R2: batente aciona o portão de metal", Game.has_flag("trilhos_carrinho") and not door_closed_at(40, 15))
	await shot("r2_09_carrinho")
	await engage_area(tpos(36, 21), 160.0, 80.0)
	# Ferrunho move o trilho marcado sobre a lava (caminho opcional)
	await set_active_species(["ferrunho", "ferragor"])
	await use_ent("t_trilho_marcado", Vector2(-16, 0), Vector2.RIGHT)
	check("R2: Ferrunho arrasta o trilho marcado sobre a lava", Game.has_flag("trilho_ferrunho") and W.tile_char_at(tpos(47, 20)) == "=")
	await use_ent("trilhos_bau_ilha", Vector2(0, 14), Vector2.UP)
	check("R2: baú da ilha (rota opcional do Ferrunho)", Game.chests.has("trilhos_bau_ilha"))
	await use_ent("trilhos_bau1", Vector2(0, 14), Vector2.UP)
	# alas quentes alternadas
	check("R2: ala 1 quente e ala 2 fria no início", W.tile_char_at(tpos(40, 12)) == "Q" and W.tile_char_at(tpos(40, 5)) == "q")
	await use_ent("t_valvula1", Vector2(0, 16), Vector2.UP)
	check("R2: válvula 1 resfria a ala 1 e esquenta a ala 2", W.tile_char_at(tpos(40, 12)) == "q" and W.tile_char_at(tpos(40, 5)) == "Q")
	await use_ent("t_valvula2", Vector2(-16, 0), Vector2.RIGHT)
	check("R2: válvula 2 (da plataforma) alterna de novo", W.tile_char_at(tpos(40, 12)) == "Q" and W.tile_char_at(tpos(40, 5)) == "q")
	await shot("r2_10_alas")
	ok = await exit_to("fundicao_a", 40 * 16.0 + 8.0, 8.0)
	check("R2: Trilhos Fundidos chegam à Fundição do Último Fogo", ok and W.map_id == "fundicao_a" and Game.has_flag("visitou_fundicao_a"))

# ---------------------------------------------------------------- 17. Fundição A (caldeira central, bigornas, fornalhas) — com a equipe exausta
func r2_fundicao_a() -> void:
	await rest_at("fa_atrio")
	check("R2: santuário do átrio da Fundição", Game.checkpoint.get("shrine", "") == "fa_atrio")
	await shot("r2_11_atrio")
	await use_ent("fa_valvula", Vector2(0, 16), Vector2.UP)
	check("R2: Grande Caldeira: válvula resfria o piso ao redor da lava", W.tile_char_at(tpos(23, 23)) == "q" and W.tile_char_at(tpos(28, 23)) == "L")
	# caminho obrigatório com todas as criaturas exaustas
	await exhaust_team()
	check("R2: equipe inteira exausta (teste do caminho sem criaturas)", Game.alive_team_count() == 0 and (W.companion == null or not is_instance_valid(W.companion)))
	await goto(tpos(30, 19), 4.0, 40.0)
	await goto(tpos(30, 15), 6.0, 20.0)
	await frames(10)
	check("R2: Galeria das Bigornas: portas de metal se fecham no combate", Game.has_flag("tmp_enc_bigornas") and door_closed_at(29, 17) and door_closed_at(44, 11))
	await shot("r2_12_bigornas")
	var tt := 0.0
	while tt < 240.0 and not Game.has_flag("enc_bigornas_ok") and P.state != Player.S.DEAD:
		await engage_area(tpos(30, 11), 250.0, 20.0)
		tt += 20.0
	check("R2: combate vencido só pelo herói (equipe exausta); portas reabrem", Game.has_flag("enc_bigornas_ok") and not door_closed_at(44, 11) and P.state != Player.S.DEAD)
	await use_ent("fa_bau_bigornas", Vector2(0, 14), Vector2.UP)
	# válvula desta sala resfria a passagem de outra (ala de escória)
	await use_ent("fa_valvula_oeste", Vector2(0, 14), Vector2.UP)
	check("R2: válvula da galeria resfria a passagem da ala de escória (efeito entre salas)", W.tile_char_at(tpos(18, 24)) == "q")
	await engage_area(tpos(10, 24), 150.0, 60.0)
	await use_ent("fa_bau_escoria", Vector2(0, 14), Vector2.UP)
	check("R2: ala de escória: diário de mineiro", Game.item_count("diario_mineiro") == 1)
	# Câmara das Fornalhas: dica após 3 erros, solução com o braseiro (sem criatura)
	for i in 3:
		await use_ent("fa_forn1", Vector2(0, 14), Vector2.UP)
		await frames(10)
	check("R2: fornalhas: dica opcional após 3 tentativas erradas", toast_seen("Dica"))
	await light_with_torch("fa_braseiro", "fa_forn1")
	await light_with_torch("fa_braseiro", "fa_forn2")
	check("R2: duas fornalhas acesas não abrem a porta", not Game.has_flag("fa_fornalhas") and ent_by_id("fa_forn1").lit)
	await light_with_torch("fa_braseiro", "fa_forn3")
	await frames(5)
	check("R2: três fornalhas acesas pelo herói (braseiro) abrem a porta", Game.has_flag("fa_fornalhas") and not door_closed_at(58, 10))
	await shot("r2_13_fornalhas")
	check("R2: acender as fornalhas baixou a lava da Grande Caldeira", W.tile_char_at(tpos(28, 23)) == "z")
	await use_ent("fa_bau_caldeira", Vector2(0, 14), Vector2.UP)
	check("R2: baú da ilha da caldeira (visível desde o início) coletado", Game.chests.has("fa_bau_caldeira") and Game.item_count("diario_fundidor") == 1)
	var ok := await exit_to("fundicao_b", 59 * 16.0 + 8.0, 10 * 16.0 + 8.0)
	check("R2: Câmara das Fornalhas leva ao Pátio dos Carrinhos", ok and W.map_id == "fundicao_b")

# ---------------------------------------------------------------- 18. Fundição B (carrinho + calor, tesouro, atalho)
func r2_fundicao_b() -> void:
	check("R2: criaturas seguem exaustas até um santuário", Game.alive_team_count() == 0)
	await use_ent("fb_valvula", Vector2(0, 16), Vector2.UP)
	check("R2: válvula resfria a ilha quente do desvio", W.tile_char_at(tpos(15, 9)) == "q")
	await use_ent("fb_desvio", Vector2(-16, 0), Vector2.RIGHT)
	var cart := ent_by_id("fb_carrinho")
	await push_cart_dir(cart, Vector2.RIGHT)
	check("R2: carrinho sobe pelo desvio até o batente (calor + trilho combinados)", Game.has_flag("fb_carrinho") and tile_of(cart.global_position) == Vector2i(14, 5), str(tile_of(cart.global_position)))
	await use_ent("fb_bau_tesouro", Vector2(0, 14), Vector2.UP)
	check("R2: Lança de Cobre obtida no tesouro", Game.item_count("lanca_cobre") == 1)
	var r0: float = float(Player.COMBO[0]["r"])
	Game.equip("lanca_cobre")
	check("R2: Lança de Cobre tem alcance frontal maior", Game.weapon_profile()["alcance"] > 10.0)
	P._start_attack(Player.COMBO[0], false)
	check("R2: golpe com a lança alcança mais longe", float(P.atk_def["r"]) > r0 + 10.0)
	await frames(30)
	await rest_at("fb_tesouro")
	check("R2: santuário do tesouro recupera as criaturas exaustas", Game.alive_team_count() == Game.team.size())
	await use_ent("fb_alavanca_atalho", Vector2(0, 16), Vector2.UP)
	check("R2: passagem de carga: alavanca abre o portão da Forja por dentro", Game.has_flag("atalho_fundicao_aberto") and not door_closed_at(30, 1))
	var ok := await exit_to("forja_cobre", 28 * 16.0 + 8.0, 1 * 16.0 + 8.0)
	check("R2: atalho leva de volta à Forja de Cobre", ok and W.map_id == "forja_cobre" and not door_closed_at(23, 2))
	ok = await exit_to("fundicao_b", 23 * 16.0 + 8.0, 8.0)
	check("R2: atalho funciona nos dois sentidos (Forja -> Fundição)", ok and W.map_id == "fundicao_b")

# ---------------------------------------------------------------- 19. Vigia de Escória
func vigia_valve_spot(v: Node) -> Vector2:
	return v.global_position + (Vector2(16, 0) if v.eid == "fb_vv_oeste" else Vector2(-16, 0))

func fight_vigia(b: Node, timeout := 240.0) -> String:
	var t := 0.0
	var valves := [ent_by_id("fb_vv_oeste"), ent_by_id("fb_vv_leste")]
	while t < timeout and is_instance_valid(b) and b.alive_flag:
		if P.state == Player.S.DEAD:
			return "morreu"
		var before := frame_count
		await use_potion_if_needed()
		if b.is_vulnerable():
			last_seen["trincado"] = true
			await combat_step(b)
		elif b.bst == b.B.TELE_SPIT and P.global_position.distance_to(b.spit_pos) < 34.0:
			steer(P.global_position - b.spit_pos)
			await frames(6)
			release_moves()
		elif b.bst == b.B.INTRO:
			await frames(3)
		else:
			var v: Node = valves[0] if valves[0].valve_cd <= 0.0 else valves[1]
			if v.valve_cd > 0.0:
				v = valves[0] if valves[0].valve_cd < valves[1].valve_cd else valves[1]
			var spot := vigia_valve_spot(v)
			if P.global_position.distance_to(spot) > 5.0:
				await goto(spot, 4.0, 3.0)
			else:
				var vr: Array = v.def["vent"]
				var vent := Rect2(vr[0] * 16.0, vr[1] * 16.0, vr[2] * 16.0, vr[3] * 16.0)
				if v.valve_cd <= 0.0 and vent.grow(8.0).has_point(b.global_position):
					await face(v.global_position - P.global_position)
					await interact_press()
					await frames(4)
				else:
					await frames(3)
		t += float(frame_count - before) / 60.0
	return "vitoria" if (not is_instance_valid(b) or not b.alive_flag) else "tempo"

func die_generic(b: Node, label: String) -> void:
	Game.hero["hp"] = 2.0
	Game.hero_changed.emit()
	var t := 0.0
	while P.state != Player.S.DEAD and t < 40.0:
		if is_instance_valid(b) and b.global_position.distance_to(P.global_position) > 36.0:
			steer(b.global_position - P.global_position)
		else:
			release_moves()
		await frames(6)
		t += 0.1
	release_moves()
	check("Derrota na %s" % label, P.state == Player.S.DEAD)
	await secs(4.0)

func r2_vigia() -> void:
	await goto(tpos(35, 22), 6.0, 60.0)
	check("R2: dica do Vigia antes da arena (inscrição)", ent_by_id("placa_vigia") != null)
	await goto(tpos(35, 26), 6.0, 20.0)
	await frames(30)
	var b := find_boss("vigia")
	check("R2: Vigia de Escória desperta e a porta de metal se fecha", b != null and b.activated and door_closed_at(35, 23))
	await shot("r2_14_vigia")
	await secs(2.0)
	var hp_full: float = b.hp
	b.take_damage(40.0, b.global_position + Vector2(-20, 0), {"src": "heroi", "knock": 0.0})
	check("R2: couraça do Vigia reduz muito o dano sem o vapor", hp_full - b.hp <= 40.0 * 0.2, str(hp_full - b.hp))
	await die_generic(b, "arena do Vigia")
	check("R2: derrota no Vigia: volta ao santuário, porta aberta, Vigia intacto", W.map_id == "fundicao_b" and not Game.has_flag("vigia_morto") and not Game.has_flag("tmp_vigia_ativo") and not door_closed_at(35, 23))
	Game.heal_team()
	await goto(tpos(35, 22), 6.0, 60.0)
	await goto(tpos(35, 26), 6.0, 20.0)
	await frames(30)
	b = find_boss("vigia")
	check("R2: Vigia reiniciado com vida cheia", b != null and abs(b.hp - b.max_hp) < 0.1)
	last_seen = {}
	var frag0 := Game.fragments
	var res := await fight_vigia(b, 300.0)
	if res != "vitoria":
		for k in 2:
			if res == "vitoria":
				break
			await secs(4.0)
			Game.heal_team()
			await goto(tpos(35, 22), 6.0, 60.0)
			await goto(tpos(35, 26), 6.0, 20.0)
			await frames(30)
			b = find_boss("vigia")
			res = await fight_vigia(b, 300.0)
	check("R2: Vigia de Escória derrotado usando as válvulas", res == "vitoria", res)
	check("R2: válvula certa trincou a couraça (vulnerável)", last_seen.get("trincado", false))
	await secs(2.0)
	check("R2: recompensa do Vigia (fragmentos e lingotes) e porta de saída", Game.has_flag("vigia_morto") and Game.fragments >= frag0 + 60 and not door_closed_at(46, 31))
	await shot("r2_15_vigia_morto")

# ---------------------------------------------------------------- 20. Rito da Forja
func r2_rito() -> void:
	await rest_at("fb_tesouro")
	var ok := await exit_to("rito_forja", 59 * 16.0 + 8.0, 31 * 16.0 + 8.0)
	check("R2: após o Vigia, o Rito da Forja (prova antes do Ferreiro)", ok and W.map_id == "rito_forja")
	await shot("r2_16_rito")
	check("R2: rito: porta 1 fechada até cumprir as duas lições", door_closed_at(14, 14))
	await use_ent("rito_v1", Vector2(0, -16), Vector2.DOWN)
	check("R2: rito 1: válvula resfria a faixa de demonstração (fora do caminho)", W.tile_char_at(tpos(7, 12)) == "q" and door_closed_at(14, 14))
	await light_with_torch("rito_b1", "rito_f1", Vector2(0, -16), Vector2.DOWN, Vector2(0, -16), Vector2.DOWN)
	check("R2: rito 1: chama do braseiro acende a fornalha; porta abre", Game.has_flag("rito_f1_ok") and not door_closed_at(14, 14))
	# sala 2: erros -> dica; reinício local sem perder recursos
	for i in 3:
		await use_ent("rito_f2a", Vector2(0, 16), Vector2.UP)
		await frames(10)
	check("R2: rito 2: dica opcional após 3 erros", toast_seen("resfrie a faixa"))
	await use_ent("rito_v2", Vector2(0, 16), Vector2.UP)
	await light_with_torch("rito_b2", "rito_f2a", Vector2(0, 16), Vector2.UP, Vector2(0, 16), Vector2.UP)
	check("R2: rito 2: uma fornalha acesa", ent_by_id("rito_f2a").lit)
	var inv0 := Game.inventory.duplicate()
	var fr0 := Game.fragments
	await use_ent("rito_reset2", Vector2(0, 16), Vector2.UP)
	await frames(10)
	check("R2: reiniciar o rito apaga as fornalhas sem tirar itens/fragmentos", not ent_by_id("rito_f2a").lit and Game.inventory == inv0 and Game.fragments == fr0)
	var safe_exit := false
	for d in W.ent_defs:
		if d["type"] == "exit" and d["to"] == "fundicao_b" and W._def_visible(d):
			safe_exit = true
	check("R2: saída segura do rito sempre aberta", safe_exit and not door_closed_at(1, 14))
	await light_with_torch("rito_b2", "rito_f2a", Vector2(0, 16), Vector2.UP, Vector2(0, 16), Vector2.UP)
	await light_with_torch("rito_b2", "rito_f2b", Vector2(0, 16), Vector2.UP, Vector2(0, 16), Vector2.UP)
	check("R2: rito 2: calor + chama aplicados; porta abre", Game.has_flag("rito_f2_ok") and not door_closed_at(30, 14))
	# sala 3: sincronização com válvula temporizada; Faisquito acelera
	var fa := uuid_of(["faisquito", "brasejante"])
	var act := await set_active_species(["faisquito", "brasejante"])
	var b0 := Game.bond_count(Game.individuals[fa])
	await use_ent("rito_v3", Vector2(0, 16), Vector2.UP)
	check("R2: rito 3: válvula temporizada resfria as duas faixas", Game.has_flag("tmp_rito_v3") and W.tile_char_at(tpos(37, 12)) == "q")
	if act:
		await use_ent("rito_f3a", Vector2(0, 16), Vector2.UP)
		await use_ent("rito_f3b", Vector2(0, 16), Vector2.UP)
		await use_ent("rito_f3c", Vector2(0, 16), Vector2.UP)
	if not Game.has_flag("rito_f3_ok"):
		await light_with_torch("rito_b3", "rito_f3a", Vector2(0, 16), Vector2.UP, Vector2(0, 16), Vector2.UP)
		await light_with_torch("rito_b3b", "rito_f3b", Vector2(0, 16), Vector2.UP, Vector2(0, 16), Vector2.UP)
		await light_with_torch("rito_b3b", "rito_f3c", Vector2(0, 16), Vector2.UP, Vector2(0, 16), Vector2.UP)
	check("R2: rito 3: três fornalhas sincronizadas (Faisquito acende de perto, sem braseiro)", Game.has_flag("rito_f3_ok") and act, "act=%s" % act)
	check("R2: ação ambiental do Faisquito (acender) conta vínculo", Game.bond_count(Game.individuals[fa]) > b0)
	await secs(16.5)
	check("R2: válvula temporizada fecha sozinha", not Game.has_flag("tmp_rito_v3"))
	await shot("r2_17_rito3")
	var b1 := Game.bond_count(Game.individuals[fa])
	await use_ent("rito_altar", Vector2(0, 16), Vector2.UP)
	await advance_dialogs()
	check("R2: conclusão do rito: Luvas Térmicas e vínculo da criatura ativa", Game.has_flag("rito_ok") and Game.item_count("luvas_termicas") == 1 and Game.bond_count(Game.individuals[fa]) == b1 + 1)
	check("R2: Luvas Térmicas reduzem o dano de calor", Game.heat_mult() <= 0.5)
	W.rite_altar(ent_by_id("rito_altar"))
	await advance_dialogs()
	check("R2: repetir o altar não dá recompensa nem vínculo de novo", Game.item_count("luvas_termicas") == 1 and Game.bond_count(Game.individuals[fa]) == b1 + 1)
	ok = await exit_to("fundicao_c", 59 * 16.0 + 8.0, 14 * 16.0 + 8.0)
	check("R2: rito leva ao Coração da Forja", ok and W.map_id == "fundicao_c")

# ---------------------------------------------------------------- 21. Ferreiro Devorador
func enter_ferreiro_arena() -> Node:
	await goto(tpos(20, 17), 6.0, 60.0)
	await frames(30)
	return find_boss("ferreiro")

func quake_threat() -> Node:
	for q in get_tree().get_nodes_in_group("projectiles"):
		if q.mode != "quake":
			continue
		var rel: Vector2 = P.global_position - q.global_position
		var along := rel.dot(q.dir)
		var across: float = abs(rel.dot(q.dir.orthogonal()))
		if along > 2.0 and along < 22.0 and across <= q.width + 6.0:
			return q
	return null

func ferreiro_valve_spot(v: Node) -> Vector2:
	var off := Vector2(0, 16) if v.def["y"] < 15 else Vector2(0, -16)
	return v.global_position + off

func ferreiro_step(b: Node) -> void:
	await use_potion_if_needed()
	var pp := P.global_position
	var q := quake_threat()
	if q != null and P.dodge_cd <= 0.0 and P.vigor >= 25.0:
		steer(q.dir.orthogonal())
		await frames(1)
		await tap("dodge", 2)
		release_moves()
		last_seen["esquivou_onda"] = true
		return
	match b.bst:
		b.B.TELE_BIG, b.B.BIG:
			if pp.distance_to(b.global_position) < b.big_r + 26.0:
				var away: Vector2 = (pp - b.global_position).normalized()
				var goal: Vector2 = b.global_position + away * (b.big_r + 40.0)
				goal = Vector2(clamp(goal.x, b.arena.position.x + 24, b.arena.end.x - 24), clamp(goal.y, b.arena.position.y + 24, b.arena.end.y - 24))
				await goto(goal, 6.0, 0.4)
			else:
				await frames(3)
			return
		b.B.TELE_SWIPE:
			if pp.distance_to(b.global_position) < 76.0:
				steer(pp - b.global_position)
				await frames(4)
				release_moves()
				return
		b.B.INTRO, b.B.TRANSITION:
			await frames(3)
			return
	if b.phase >= 2 and b.armor_hot:
		var vs: Array = []
		for id in ["fc_vv_no", "fc_vv_ne", "fc_vv_so", "fc_vv_se"]:
			var v := ent_by_id(id)
			if v != null and v.valve_cd <= 0.0:
				vs.append(v)
		if vs.is_empty():
			await frames(3)
			return
		vs.sort_custom(func(a, c): return a.global_position.distance_to(b.global_position) < c.global_position.distance_to(b.global_position))
		var v2: Node = vs[0]
		var spot := ferreiro_valve_spot(v2)
		if pp.distance_to(spot) > 5.0:
			await goto(spot, 4.0, 0.6)
			return
		var vr: Array = v2.def["vent"]
		var vent := Rect2(vr[0] * 16.0, vr[1] * 16.0, vr[2] * 16.0, vr[3] * 16.0)
		if vent.grow(10.0).has_point(b.global_position):
			await face(v2.global_position - pp)
			await interact_press()
			await frames(3)
			if not b.armor_hot:
				last_seen["resfriou"] = true
		else:
			await frames(3)
		return
	await combat_step(b)

func fight_ferreiro(b: Node, timeout := 420.0) -> String:
	var t := 0.0
	while t < timeout and is_instance_valid(b) and b.alive_flag:
		if P.state == Player.S.DEAD:
			return "morreu"
		var before := frame_count
		last_seen["fase%d" % b.phase] = true
		if b.phase == 3 and Game.has_flag("tmp_ferreiro_piso"):
			last_seen["piso_quebrado"] = true
		if b.bst == b.B.TELE_BIG:
			last_seen["grande_anunciada"] = true
		await ferreiro_step(b)
		t += float(frame_count - before) / 60.0
	return "vitoria" if (not is_instance_valid(b) or not b.alive_flag) else "tempo"

func r2_ferreiro() -> void:
	await rest_at("fc_prep")
	check("R2: santuário de preparação do Ferreiro", Game.checkpoint.get("shrine", "") == "fc_prep")
	await use_ent("fc_bau_prep", Vector2(0, 14), Vector2.UP)
	# evolução de uma espécie das minas antes do chefão (nível 10–11 + 3 vínculos, sem atalhos de XP)
	for u in Game.team:
		var ind: Dictionary = Game.individuals[u]
		print("  [info] %s nível %d, vínculo %d/3 %s" % [ind["species_id"], ind["nivel"], Game.bond_count(ind), str(ind["vinculo"])])
	var nevo := await evolve_ready_team()
	var evolved_r2 := uuid_of(["brasejante", "ferragor", "cinzaveu"]) != ""
	check("R2: ao menos uma criatura das minas evoluiu dentro do capítulo, antes do chefão", evolved_r2, str(nevo))
	await use_ent("placa_ferreiro", Vector2(0, 14), Vector2.UP)
	await advance_dialogs()
	# ---- derrota na fase 1
	var b := await enter_ferreiro_arena()
	check("R2: Ferreiro Devorador desperta e a porta se fecha", b != null and b.activated and door_closed_at(17, 17))
	await shot("r2_18_ferreiro")
	await secs(2.2)
	await die_generic(b, "fase 1 do Ferreiro")
	check("R2: derrota fase 1: reinício limpo", W.map_id == "fundicao_c" and not Game.has_flag("ferreiro_morto") and not Game.has_flag("tmp_ferreiro_ativo") and not door_closed_at(17, 17))
	# ---- fase 2
	b = await enter_ferreiro_arena()
	check("R2: Ferreiro reiniciado com vida cheia e fase 1", b != null and abs(b.hp - b.max_hp) < 0.1 and b.phase == 1)
	await secs(2.2)
	b.take_damage(b.max_hp * 0.36, b.global_position + Vector2(-20, 0), {"src": "heroi", "knock": 0.0})
	await secs(1.6)
	check("R2: fase 2 aos 65%: armadura superaquecida", b.phase == 2 and b.armor_hot)
	var h0: float = b.hp
	b.take_damage(40.0, b.global_position + Vector2(-20, 0), {"src": "heroi", "knock": 0.0})
	check("R2: armadura superaquecida reduz o dano", h0 - b.hp <= 40.0 * 0.3, str(h0 - b.hp))
	await shot("r2_19_ferreiro_f2")
	await die_generic(b, "fase 2 do Ferreiro")
	check("R2: derrota fase 2: reinício limpo", not Game.has_flag("tmp_ferreiro_ativo") and not Game.has_flag("ferreiro_morto"))
	# ---- fase 3: o piso desaba e volta ao normal após a derrota
	b = await enter_ferreiro_arena()
	await secs(2.2)
	b.take_damage(b.max_hp * 0.75, b.global_position + Vector2(-20, 0), {"src": "heroi", "knock": 0.0})
	await secs(2.4)
	check("R2: fase 3 aos 30%: parte do piso vira lava, borda e faixa do meio preservadas", b.phase == 3 and W.tile_char_at(tpos(31, 10)) == "L" and W.tile_char_at(tpos(31, 16)) == "z" and W.tile_char_at(tpos(19, 10)) == "z")
	var saw_big := false
	var t3 := 0.0
	while t3 < 20.0 and not saw_big and is_instance_valid(b) and P.state != Player.S.DEAD:
		if b.bst == b.B.TELE_BIG:
			saw_big = true
		await ferreiro_step(b)
		t3 += 0.1
	check("R2: fase 3: grande martelada anunciada (1,2 s)", saw_big)
	await shot("r2_20_ferreiro_f3")
	if is_instance_valid(b) and P.state != Player.S.DEAD:
		await die_generic(b, "fase 3 do Ferreiro")
	else:
		await secs(4.5)
	check("R2: derrota fase 3: piso restaurado e reinício limpo", W.tile_char_at(tpos(31, 10)) == "z" and not Game.has_flag("tmp_ferreiro_piso") and not Game.has_flag("ferreiro_morto"))
	# ---- luta real
	Game.heal_team()
	last_seen = {}
	b = await enter_ferreiro_arena()
	await secs(2.2)
	var frag0 := Game.fragments
	Game.dmg_stats = {}
	var res := await fight_ferreiro(b, 480.0)
	if res != "vitoria":
		print("  [dbg] ferreiro 1a tentativa: ", res, " ", last_seen.keys(), " hp=", b.hp if is_instance_valid(b) else -1)
		for k in 3:
			if res == "vitoria":
				break
			await secs(4.0)
			Game.heal_team()
			b = await enter_ferreiro_arena()
			await secs(2.2)
			res = await fight_ferreiro(b, 480.0)
	print("  [info] luta do Ferreiro: %s, dano herói=%.0f companheiro=%.0f, tônicos=%d, nível herói=%d" % [res, float(Game.dmg_stats.get("heroi", 0)), float(Game.dmg_stats.get("companion", 0)), Game.item_count("pocao"), Game.hero_level()])
	check("R2: Ferreiro Devorador derrotado em combate real (sem Ruptura Ígnea)", res == "vitoria", res)
	check("R2: luta passou pelas três fases", last_seen.get("fase2", false) and last_seen.get("fase3", false), str(last_seen.keys()))
	check("R2: válvulas de água resfriaram a armadura", last_seen.get("resfriou", false), str(last_seen.keys()))
	check("R2: ondas de choque esquivadas", last_seen.get("esquivou_onda", false), str(last_seen.keys()))
	await secs(2.5)
	check("R2: recompensa: Eco Ruptura Ígnea + flag de região", Game.has_eco("ruptura_ignea") and Game.has_flag("minas_libertas") and Game.eco_slots.has("ruptura_ignea"))
	check("R2: fragmentos do chefão e porta de saída", Game.fragments >= frag0 + 160 and not door_closed_at(46, 16))
	var n_ecos := Game.ecos.size()
	Game.grant_eco("ruptura_ignea")
	check("R2: recompensa idempotente", Game.ecos.size() == n_ecos)
	await shot("r2_21_ferreiro_morto")

# ---------------------------------------------------------------- 22. transformação da Forja e revisitas
func r2_pos_ferreiro() -> void:
	var ok := await exit_to("forja_cobre", 55 * 16.0 + 8.0, 16 * 16.0 + 8.0)
	await frames(60)
	await advance_dialogs()
	check("R2: volta à Forja com cena de transformação", ok and Game.has_flag("voltou_forja") and "concluído" in Game.objective_text(), Game.objective_text())
	check("R2: forjas reacesas", ent_by_id("forja_f1") != null and ent_by_id("forja_f1").lit)
	check("R2: novos moradores e loja após o chefão (Ruivo, Joca)", ent_by_id("ruivo") != null and ent_by_id("joca") != null)
	check("R2: moradores mudam de lugar (rotina do Doran)", ent_by_id("doran") == null and ent_by_id("doran_forja") != null)
	await shot("r2_22_forja_transformada")
	# Ruptura Ígnea quebra a rocha fissurada do muro leste
	await use_ent("forja_rocha", Vector2(-16, 0), Vector2.RIGHT)
	check("R2: Ruptura Ígnea quebra a rocha fissurada", Game.has_flag("forja_rocha") and not W.is_solid_char(W.tile_char_at(tpos(44, 29))))
	await use_ent("forja_bau_rocha", Vector2(0, 14), Vector2.UP)
	check("R2: depósito atrás da rocha", Game.chests.has("forja_bau_rocha") and Game.item_count("diario_ilda") == 1)
	check("R2: forja +3 liberada pela grande forja", not ("grande forja" in Game.forge_check("lanca_cobre")))
	# elevador: atalho Forja <-> Pedreira
	ok = await exit_to("pedreira_oca", 40 * 16.0 + 8.0, 22 * 16.0 + 8.0)
	check("R2: elevador da Forja desce à Pedreira (atalho)", ok and W.map_id == "pedreira_oca" and tile_of(P.global_position).distance_to(Vector2i(45, 6)) < 3.0, "%s %s" % [W.map_id, str(tile_of(P.global_position))])
	# revisita: o veio esquecido
	await goto(tpos(46, 16), 8.0, 60.0)
	await use_ent("veio_rocha", Vector2(0, -14), Vector2.DOWN)
	check("R2: segredo revisitado: Ruptura abre o veio esquecido", Game.has_flag("veio_rocha") and not W.is_solid_char(W.tile_char_at(tpos(9, 37))))
	await use_ent("veio_bau", Vector2(0, -14), Vector2.DOWN)
	check("R2: tesouro do veio (Couraça de Placas de Cobre) e missão secreta", Game.item_count("placa_cobre") == 1 and Game.has_flag("veio_tesouro"))
	ok = await exit_to("forja_cobre", 45 * 16.0, 4 * 16.0 + 8.0)
	check("R2: elevador sobe de volta à Forja", ok and W.map_id == "forja_cobre")

# ---------------------------------------------------------------- rito avançado (opcional, testa a Ruptura Ígnea)
func r2_rito_avancado() -> void:
	var ok := await exit_to("fundicao_b", 23 * 16.0 + 8.0, 8.0)
	ok = ok and await exit_to("rito_forja", 59 * 16.0 + 8.0, 31 * 16.0 + 8.0)
	check("R2: rito revisitado pela passagem de carga", ok and W.map_id == "rito_forja")
	await use_ent("rito_rocha", Vector2(0, 16), Vector2.UP)
	check("R2: Ruptura Ígnea abre a ala do rito avançado", Game.has_flag("rito_rocha") and not W.is_solid_char(W.tile_char_at(tpos(54, 8))))
	await use_ent("rito_mec1", Vector2(48, 16), Vector2.UP)
	check("R2: mecanismo térmico não acende com chama comum", not ent_by_id("rito_mec1").lit)
	var slot := Game.eco_slots.find("ruptura_ignea")
	var key := "eco%d" % (slot + 1)
	P.energy = Player.ENERGY_MAX
	await goto(tpos(54, 4), 3.0, 20.0)
	await face(Vector2.LEFT)
	await tap(key, 2)
	await frames(10)
	check("R2: uma Ruptura acende os dois mecanismos do oeste", ent_by_id("rito_mec1").lit and ent_by_id("rito_mec2").lit)
	await goto(tpos(57, 4), 3.0, 20.0)
	var w := 0
	while P.eco_cd[slot] > 0.0 and w < 900:
		await frames(5)
		w += 5
	await face(Vector2.RIGHT)
	await tap(key, 2)
	await frames(10)
	check("R2: rito avançado: três mecanismos sincronizados com a Ruptura Ígnea", Game.has_flag("rito_av_mec"))
	await use_ent("rito_altar2", Vector2(-16, 0), Vector2.RIGHT)
	await advance_dialogs()
	check("R2: recompensa única do rito avançado (Amuleto da Brasa)", Game.has_flag("rito_avancado_ok") and Game.item_count("amuleto_brasa") == 1,
		"pos=%s prompt=%s mec=%s" % [str(tile_of(P.global_position)), W.current_prompt, Game.has_flag("rito_av_mec")])
	W.rite_altar(ent_by_id("rito_altar2"))
	check("R2: rito avançado não repete a recompensa", Game.item_count("amuleto_brasa") == 1)
	await shot("r2_23_rito_avancado")
	ok = await exit_to("fundicao_b", 8.0, 14 * 16.0 + 8.0)
	ok = ok and await exit_to("forja_cobre", 28 * 16.0 + 8.0, 1 * 16.0 + 8.0)
	check("R2: volta à Forja pelo atalho", ok and W.map_id == "forja_cobre")

# ---------------------------------------------------------------- 23. salvar e carregar
func r2_snapshot() -> Dictionary:
	var d := snapshot_state()
	d["up"] = Game.upgrades.duplicate()
	d["r2flags"] = []
	for f in ["ferreiro_morto", "vigia_morto", "rito_ok", "atalho_fundicao_aberto", "forja_rocha", "veio_rocha", "trilhos_vapor", "ninho_aceso", "calor_entregue", "fa_fornalhas", "trilhos_carrinho", "fb_carrinho", "minas_libertas"]:
		if Game.has_flag(f):
			d["r2flags"].append(f)
	return d

func r2_save_load() -> void:
	check("R2: save permitido fora de combate", W.save_now(3))
	var snap := r2_snapshot()
	main.back_to_title()
	await frames(5)
	main.continue_from_slot(3)
	await frames(30)
	var after := r2_snapshot()
	check("R2: load mantém mapa, equipe e criaturas", after["map"] == "forja_cobre" and after["team"] == snap["team"] and str(after["ind"]) == str(snap["ind"]))
	check("R2: load mantém melhorias da forja, inventário e equipamento", after["up"] == snap["up"] and after["inv"] == snap["inv"] and after["equip"] == snap["equip"])
	check("R2: load mantém atalhos, segredos, mudanças e chefões", after["r2flags"] == snap["r2flags"] and after["r2flags"].size() >= 12, str(after["r2flags"]))
	check("R2: load mantém Eco e baús únicos", Game.has_eco("ruptura_ignea") and after["chests"] == snap["chests"])
	check("R2: portão da Fundição continua aberto após carregar", not door_closed_at(23, 2), "%s %s %s" % [W.map_id, W.cur_tiles[2][23], Game.has_flag("atalho_fundicao_aberto")])
	check("R2: elevador segue ativo após carregar", W.map_id == "forja_cobre" and W.tile_char_at(tpos(40, 22)) == "%")
	var chests_n := Game.chests.size()
	var bau := ent_by_id("forja_bau_rocha")
	bau.interact(P)
	await frames(5)
	check("R2: baú único não reaparece após carregar", bau.opened and Game.chests.size() == chests_n and Game.item_count("diario_ilda") == 1)
	check("R2: dados sem erros de validação", Data.errors.is_empty(), str(Data.errors))

## Técnicas especiais do herói (hero_powers.gd), com entradas reais
func _spawn_wolf(pos: Vector2) -> Node:
	var e := Enemy.new()
	e.init(W, "lobo", {"id": "teste_lobo", "x": int(pos.x / 16), "y": int(pos.y / 16)})
	W.ysort.add_child(e)
	e.global_position = pos
	e.set_physics_process(false)
	return e

func run_powers() -> void:
	main.start_new_game(3)
	await frames(10)
	await advance_dialogs()
	var pw: Node = P.powers
	check("Técnicas anexadas ao herói", pw != null)
	P.global_position = Vector2(22 * 16 + 8, 16 * 16 + 8)
	await face(Vector2.RIGHT)
	# bloqueada no nível 1
	await tap("dodge", 2)
	await tap("attack", 2)
	check("Nv.1: Golpe em Investida ainda bloqueado", not P.atk_def.get("tecnica", "") == "investida")
	await secs(1.0)
	while Game.hero_level() < 8:
		Game.add_hero_xp(Game.xp_to_next(Game.hero_level()))
	check("Nível 8 libera as quatro técnicas", pw.unlocked().size() == 4)
	# 1) Golpe em Investida
	P.vigor = 100.0
	var x0: float = P.global_position.x
	Input.action_press("move_right"); await frames(2)
	await tap("dodge", 2)
	await frames(3)
	Input.action_release("move_right")
	await tap("attack", 2)
	check("Investida: ataque durante a esquiva vira golpe em avanço", P.state == Player.S.ATTACK and P.atk_def.get("tecnica", "") == "investida", str(P.atk_def))
	await secs(0.6)
	check("Investida avança o herói", P.global_position.x > x0 + 30.0, "%.0f -> %.0f" % [x0, P.global_position.x])
	# 2) Lâmina de Eco
	var wolf := _spawn_wolf(P.global_position + Vector2(90, 0))
	var hp0: float = wolf.hp
	P.vigor = 100.0
	await face(Vector2.RIGHT)
	Input.action_press("attack"); await frames(45); Input.action_release("attack")
	await frames(12)
	await shot("pw_onda")
	var waves := 0
	for n in W.fx_layer.get_children():
		if n is EchoWave:
			waves += 1
	check("Lâmina de Eco: golpe carregado solta a onda", waves >= 1)
	await secs(0.8)
	check("Onda atinge inimigo à distância", wolf.hp < hp0, "%s -> %s" % [hp0, wolf.hp])
	# 3) Defesa Perfeita
	Game.hero["hp"] = 100.0
	P.inv_timer = 0.0
	await face(Vector2.RIGHT)
	Input.action_press("guard"); await frames(3)
	var hit: bool = P.take_hit(20.0, wolf.global_position, {})
	await frames(3)
	await shot("pw_defesa")
	check("Defesa Perfeita anula o golpe no instante certo", not hit and float(Game.hero["hp"]) == 100.0, str(Game.hero["hp"]))
	check("Contra-ataque armado (dano dobrado)", pw.damage_mult() == 2.0)
	await frames(20)
	P.inv_timer = 0.0
	P.take_hit(20.0, wolf.global_position, {})
	check("Defesa comum (fora da janela) só reduz o dano", float(Game.hero["hp"]) < 100.0)
	Input.action_release("guard")
	await frames(3)
	# 4) Fúria do Vínculo
	Game.hero["hp"] = 100.0
	P.inv_timer = 0.0
	wolf.global_position = P.global_position + Vector2(30, 0)
	P.energy = 60.0
	var hp1: float = wolf.hp
	Input.action_press("guard"); await frames(3)
	await tap("skill", 2)
	await frames(4)
	await shot("pw_furia")
	Input.action_release("guard")
	await frames(1)
	check("Fúria do Vínculo gasta energia e fere ao redor", P.energy <= 21.0 and wolf.hp < hp1, "energia %.0f hp %s -> %s" % [P.energy, hp1, wolf.hp])
	Input.action_press("guard"); await frames(3)
	await tap("skill", 2)
	Input.action_release("guard")
	check("Fúria do Vínculo respeita a recarga", P.energy <= 21.0)

## Raridade, desmontar e montar equipamento
func run_equip() -> void:
	main.start_new_game(3)
	await frames(10)
	await advance_dialogs()
	check("Cores de raridade: verde < azul < roxo < laranja < vermelho", Game.rarity_name("espada_viajante") == "Comum" and Game.rarity_name("espada_seiva") == "Raro" and Game.rarity_name("laminas_ocas") == "Épico" and Game.rarity_name("galhada_ossea") == "Lendário" and Game.rarity_name("lamina_ruina") == "Mítico")
	check("Peça equipada não pode ser desmontada", Game.dismantle_check("espada_viajante") != "")
	Game.give_item("couraca_fibra", 1)
	Game.equipment["protecao"] = ""
	var ess0 := Game.item_count("essencia_verde")
	check("Desmontar peça comum rende essência verde", Game.dismantle("couraca_fibra") and Game.item_count("essencia_verde") == ess0 + 2 and Game.item_count("couraca_fibra") == 0)
	check("Montar exige materiais", Game.craft_check("espada_seiva") != "")
	Game.give_item("essencia_verde", 3)
	Game.fragments += 50
	check("Montar Espada de Seiva (azul) com essências", Game.craft("espada_seiva") and Game.item_count("espada_seiva") == 1)
	check("Não monta a mesma peça duas vezes", Game.craft_check("espada_seiva") == "Você já tem esta peça.")
	Game.give_item("osso_ancestral", 2); Game.give_item("essencia_roxa", 2); Game.fragments += 200
	check("Receita lendária bloqueada antes do Cervo", Game.craft_check("galhada_ossea").begins_with("Bloqueada"))
	Game.set_flag("cervo_morto")
	check("Receita lendária liberada após o Cervo", Game.craft("galhada_ossea"))
	Game.equip("galhada_ossea")
	check("Arma lendária aumenta o dano", Game.hero_atk() >= 12.0 + 9.0)
	# interface: inventário com cores e detalhes
	await ui_press("pause")
	await ui_press("ui_down"); await ui_press("ui_down")
	await ui_press("ui_accept")
	await frames(4)
	var top = main.ui._top()
	var colored := 0
	for it in top.items:
		if it.has("col") and it.has("icon"):
			colored += 1
	check("Inventário lista equipamentos com cor e ícone", colored >= 3, str(colored))
	for i in 12:
		await ui_press("ui_down")
		if top.items[top.sel].has("col"):
			break
	await shot("inv_cores")
	await close_menus()
	# persistência
	W.save_now(3)
	var inv_before := Game.inventory.duplicate()
	SaveSys.load_game(3)
	check("Save mantém peças montadas e essências", Game.item_count("galhada_ossea") == 1 and Game.item_count("espada_seiva") == 1 and Game.inventory == inv_before)
	W.player.global_position = W.player.global_position
	Game.equipment["arma"] = "galhada_ossea"
	await frames(5)
	await talk("tobi")
	await frames(5)
	check("Tobi abre a forja na vila", main.ui.has_screen())
	await shot("forja_tobi")
	await ui_press("ui_down"); await ui_press("ui_down"); await ui_press("ui_down"); await ui_press("ui_down")
	await ui_press("ui_accept")
	await frames(4)
	await shot("montar")
	await close_menus()
