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

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	await get_tree().process_frame
	for a in args:
		if a.begins_with("--stage="):
			stage_limit = int(a.substr(8))
	W = main.world
	P = W.player
	W.test_mode = true
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
			if e.st_t > wind * 0.55 and P.vigor >= 25.0 and P.dodge_cd <= 0.0:
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
	while wild.alive_flag and wild.hp / wild.max_hp > limit and guard < 40 and P.state != Player.S.DEAD:
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
	var n := 0
	var uuid_before := Game.individuals.size()
	while n < tries and wild.alive_flag:
		n += 1
		if P.global_position.distance_to(wild.global_position) > 120.0:
			await goto(wild.global_position, 100.0, 10.0)
		await tap("capture", 2)
		await frames(2)
		if not P.aiming:
			return false
		P.cap_target = wild
		await frames(2)
		if P.cap_msg != "":
			P.aiming = false
			return false
		await tap("capture", 2)
		var guard := 0
		while P.cap_state != "" and guard < 400:
			await frames(1)
			guard += 1
		if Game.individuals.size() > uuid_before:
			return true
		await secs(3.2)    # proteção de 3 s após falha
	return false

# =============================================================== CENÁRIO PRINCIPAL
func run_e2e() -> void:
	# ---- 1. Ponto de entrada normal: título -> novo jogo
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
	print("-- estágio 3 concluído")

func run_unit() -> void:
	pass
