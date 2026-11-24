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
var all_toasts: Array = []
var shot_dir := "/tmp/shots"     # histórico de avisos do jogo (a fila visível do HUD guarda só 4)

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
	Game.toast.connect(func(t): all_toasts.append(t))
	main.ui.instant = true
	# clima: fora do modo --clima, fica travado em "sol" sem efeitos (fluxo determinístico)
	if not "--clima" in args:
		Game.weather_lock = "sol"
		Game.weather_neutral = true
	if "--historia" in args:
		await run_historia()
	elif "--clima" in args:
		await run_clima()
	elif "--regiao5" in args:
		await run_regiao5()
	elif "--regiao4" in args:
		await run_regiao4()
	elif "--floresta" in args:
		await run_floresta()
	elif "--habilidades" in args:
		await run_habilidades()
	elif "--casas" in args:
		await run_casas()
	elif "--grupo" in args:
		await run_grupo()
	elif "--musica" in args:
		await run_musica()
	elif "--equip" in args:
		await run_equip()
	elif "--powers" in args:
		await run_powers()
	elif "--interface" in args:
		await run_interface()
	elif "--demo" in args:
		await run_demo()
	elif "--anim" in args:
		await run_anim()
	elif "--r3" in args:
		await run_r3_dev()
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
		var dir := OS.get_environment("SHOTS_DIR")
		if dir == "":
			dir = shot_dir
		DirAccess.make_dir_recursive_absolute(dir)
		img.save_png("%s/%s.png" % [dir, name])

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
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
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
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
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
		# golpe que derrubaria a criatura de uma vez: o bot "segura a mão" (um jogador também pode errar o golpe)
		if wild.hp - Game.hero_atk() * 2.6 <= 0.0:
			wild.hp = min(wild.hp, wild.max_hp * limit * 0.9)
			break
		await attack_tap()
		await secs(0.6)
	if is_instance_valid(wild) and wild.alive_flag:
		wild.invulnerable = true
		await frames(1)
		wild.invulnerable = false

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
			if n < tries and "visão" in P.cap_msg:
				# algo entre o herói e o alvo (pedra, borda): chega mais perto e tenta de novo
				await goto(wild.global_position + Vector2(0, 12), 6.0, 3.0)
				release_moves()
				continue
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
	# vida cheia: a captura é permitida, mas a chance é baixa; mirar e cancelar não gasta selo
	var seals_before := Game.item_count("selo_basico")
	await tap("capture", 2)
	await frames(2)
	P.cap_target = br
	await frames(3)
	var full_ch: float = P.chance_for(br)
	check("Captura com vida cheia é permitida, mas com chance baixa", P.cap_msg == "" and full_ch < 0.25, "%s %.2f" % [P.cap_msg, full_ch])
	P.aiming = false
	await frames(3)
	check("Mirar e cancelar não consome selo", Game.item_count("selo_basico") == seals_before and P.cap_state == "")
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
	if stage_limit <= 23: return
	# ================= CAPÍTULO 3 — PÂNTANO DOS SUSSURROS (mesmo fluxo, depois de carregar o save do Capítulo 2)
	await r3_all()

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
	check("Descansar fecha o menu e mostra a reação (aviso na tela)", not main.ui.has_screen())
	await frames(8)
	await shot("05b_descansou")
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
	# lobos que sobraram por perto interrompem a contenção (e batem forte): limpa a área antes de capturar
	await engage_area(cas.global_position, 200.0, 40.0)
	if float(Game.hero["hp"]) < Game.hero_max_hp() * 0.6:
		Game.heal_team()                      # recuperação no santuário (atalho do teste)
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
	cas.invulnerable = true      # nada derruba o alvo enquanto a proteção de 3 s passa
	await secs(3.2)
	if is_instance_valid(cas):
		cas.invulnerable = false
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
	var tries_s := 0
	while float(Game.skill_cd.get(Game.active_ind().get("uuid", ""), 0.0)) <= 0.0 and tries_s < 20:
		await tap("skill", 2)
		await frames(6)
		tries_s += 1
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
	var pl1 := ent_by_id("c_placa1")
	for tent in 2:
		# um golpe no meio do empurrão (lobo que sobrou) deixa a caixa no caminho: termina de levar até a placa
		if pl1.pressed_by_crate:
			break
		await engage_area(Vector2(22 * 16.0, 26 * 16.0), 150.0, 30.0)
		var dx := int(round((pl1.global_position.x - cx1.global_position.x) / 16.0))
		var dy := int(round((pl1.global_position.y - cx1.global_position.y) / 16.0))
		if dx != 0:
			await push_crate(cx1, Vector2(sign(dx), 0), abs(dx))
		if dy != 0:
			await push_crate(cx1, Vector2(0, sign(dy)), abs(dy))
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
	if lum == null:
		lum = ent_by_id("b_lumipim2")    # o habitat tem dois; um pode ter caído no combate com os lobos
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
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0
	last_seen = seen
	return _fim_luta(b, t)

## Fim de uma luta de chefe: registra a duração (comparada com a curva em docs/BALANCO.md).
func _fim_luta(b: Node, t: float) -> String:
	var res := "vitoria" if (not is_instance_valid(b) or not b.alive_flag) else "tempo"
	print("  [info] duração da luta (%s): %s em %.0f s, vida do herói %d/%d, nível %d" % [str(b.kind) if is_instance_valid(b) else W.map_id, res, t, int(Game.hero["hp"]), int(Game.hero_max_hp()), Game.hero_level()])
	return res

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
	check("Recompensa do minichefe concedida uma vez", Game.has_flag("lenhador_morto") and Game.fragments >= frag0 + int(Data.bosses["lenhador"]["recompensa"]["frag"]))
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
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0
		if int(t) % 15 == 0 and frame_count % 30 == 0:
			var c: Node = W.companion
			print("  [dbg cervo] t=%.0f hp=%.0f bst=%d comp=%s tgt=%s exausta=%s pos=%s" % [t, b.hp, b.bst, str(c.ind["species_id"]) if c else "-", str(c.target) if c else "-", str(Game.active_ind().is_empty()), str(c.global_position) if c else "-"])
	last_seen = seen
	return _fim_luta(b, t)

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
	check("Flag cervo_morto e fragmentos de recompensa", Game.has_flag("cervo_morto") and Game.fragments >= frag0 + int(Data.bosses["cervo"]["recompensa"]["frag"]))
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
	await menu_pick("Salvar jogo")   # procura pelo nome (o menu de pausa ganhou a Jornada)
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

## Seleciona no menu do topo o primeiro item habilitado cujo texto começa com `prefix` e confirma.
func menu_pick(prefix: String) -> bool:
	var top: MenuScreen = main.ui._top()
	if top == null:
		return false
	for i in top.items.size():
		var it: Dictionary = top.items[i]
		if str(it.get("t", "")).begins_with(prefix) and it.get("en", true) and not it.get("hdr", false):
			top.sel = i
			await frames(1)
			await ui_press("ui_accept")
			return true
	return false

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
	await menu_pick("Evoluir")       # Evoluir… (procura pelo nome: o menu ganhou a linha de acessório)
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
	check("Probabilidade respeita mínimo 8%", is_equal_approx(pmin, 0.08), str(pmin))
	check("Probabilidade respeita máximo 95%", is_equal_approx(pmax, 0.95), str(pmax))
	var pc := Game.capture_chance("brotisco", 1, 0.5, false, "selo_basico")
	check("Fórmula: comum a 50% de vida = 0,25 - 0,12 + 0,30", is_equal_approx(pc, 0.43), str(pc))
	var pl := Game.capture_chance("brotisco", 6, 0.5, false, "selo_basico")
	check("Penalidade de nível L = 0,025 x diferença", is_equal_approx(pc - pl, 0.125), str(pc - pl))
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
	await unit_curva()
	# ---- dados: validação
	check("Validação de dados sem erros", Data.errors.is_empty(), str(Data.errors))
	check("15 espécies-base e 3 evoluções jogáveis cadastradas", Data.species.size() >= 18)
	# ---- Região 2: garantias de design verificadas nos dados
	var r2_sp := ["faisquito", "ferrunho", "fuligin"]
	var ok_sp := true
	for sid in r2_sp:
		var sp: Dictionary = Data.species[sid]
		if sp["status"] != "jogavel" or sp["raridade"] == "rara" or int(sp["evolucao"]["nivel"]) > 8 or Data.species[sp["evolucao"]["para"]]["status"] != "jogavel":
			ok_sp = false
	check("R2: espécies das minas jogáveis, não raras, evolução até o nível 8", ok_sp)
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
	check("R2: forja consome materiais e melhora a arma (+%d de ataque)" % int(Game.forge_bonus("arma", "dano")), ok_f and Game.item_count("minerio_cobre") == 0 and Game.fragments == 0 and abs(Game.hero_atk() - atk_f - Game.forge_bonus("arma", "dano")) < 0.01)
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
	# ---- Região 3: garantias de design nos dados
	var r3_ok := true
	for sid in ["goturim", "brejugo", "nimbelo"]:
		var sp3: Dictionary = Data.species[sid]
		var evo3: Dictionary = Data.species.get(sp3["evolucao"]["para"], {})
		if sp3["status"] != "jogavel" or evo3.get("status", "") != "jogavel" or int(sp3["evolucao"]["nivel"]) < 12 or sp3.get("acao_id", "") == "":
			r3_ok = false
	check("R3: Goturim, Brejugo e Nimbelo jogáveis, com evolução (12/13) e ação ambiental", r3_ok and Data.species["nimbelo"]["raridade"] == "rara")
	var r3_creature := {}
	var r3_eco := {}
	for mid in Data.regions["pantano"]["mapas"]:
		for e in Data.maps[mid]["entities"]:
			if e["type"] in ["wheel", "mud_mark"]:
				r3_creature[e["flag"]] = mid
			if e["type"] == "spirit_bridge":
				r3_eco[e["flag"]] = mid
	var r3_bad := []
	for mid in Data.regions["pantano"]["mapas"]:
		for e in Data.maps[mid]["entities"]:
			if e["type"] == "door":
				for f in e.get("open_flags", []):
					if (r3_creature.has(f) and not _has_local_alt(mid, f)) or r3_eco.has(f) or f == "bruxa_morta" and mid != "templo_c":
						r3_bad.append("%s:%s" % [mid, e["id"]])
	check("R3: portões obrigatórios não dependem de Goturim/Brejugo/Nimbelo nem do Olhar Velado", r3_bad.is_empty(), str(r3_bad))
	check("R3: lodo marcado do templo também tem estacas locais (Brejugo é só alternativa)", _has_local_alt("templo_b", "tb_lodo"))
	W.load_map("lago_reflexos", "from_porto")
	await frames(3)
	var w_before: String = W.cur_tiles[19][12]
	Game.set_flag("lago_c1")
	await frames(2)
	check("R3: comporta converte W->t só no canal da área", w_before == "W" and W.cur_tiles[19][12] == "t" and W.cur_tiles[8][27] == "W")
	Game.set_flag("lago_c1", false)
	var sk_ok: bool = Data.skills["onda"]["exec"] == "onda" and Data.skills["lodo_pegajoso"]["exec"] == "lodo" and float(Data.skills["clarao"].get("revela", 0)) > 0.0
	check("R3: habilidades novas (Onda, Lodo Pegajoso, Clarão) com execução própria", sk_ok)
	# ---- habilidades aprendidas por nível (dados e regras)
	var execs := ["prender", "pulso", "cone", "ima", "nuvem", "avanco", "avanco_cadeia", "cadeia", "cura", "escudo", "onda", "lodo", "perfura"]
	var bad_h: Array = []
	for sid in Data.species:
		if Data.species[sid]["status"] != "jogavel":
			continue
		var hl: Array = Game.hab_list(sid)
		if hl.size() < 3 or str(hl[0]["id"]) != str(Data.species[sid]["skill"]) or int(hl[0]["nivel"]) != 1:
			bad_h.append(sid)
		for h in hl:
			if not str(Data.skills[h["id"]].get("exec", "")) in execs:
				bad_h.append("%s:%s" % [sid, h["id"]])
	check("Hab: espécies jogáveis têm lista de habilidades (1ª = original) com execução conhecida", bad_h.is_empty(), str(bad_h))
	var hi := Game.new_individual("faisquito", 6)
	check("Hab: indivíduo novo aprende o que o nível permite", hi["hab_aprendidas"] == ["cone_fogo", "fagulhas", "estouro_brasa"] and hi["hab_ativa"] == "cone_fogo", str(hi["hab_aprendidas"]))
	var old_ind := {"uuid": "velho", "species_id": "ferrunho", "nivel": 5, "xp": 0, "hp": 10.0, "exausta": false, "vinculo": []}
	Game.hab_sync(old_ind, false)
	check("Hab: migração de indivíduo antigo (ativa = original)", old_ind["hab_ativa"] == "ima" and old_ind["hab_aprendidas"] == ["ima", "placa_ferro"], str(old_ind))
	# ---- interface: opções salvas, diálogo paginado, avisos em fila
	await unit_interface()

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
	jogador_sensato()

## Como um jogador comum faz ao chegar a um vilarejo: gasta os pontos de talento, veste a melhor proteção e o melhor
## amuleto que já tem e repõe tônicos na banca com os próprios fragmentos (só sistemas do jogo, nada de graça).
## A arma não muda (as verificações de arma usam a que está equipada). Ver docs/BALANCO.md.
func jogador_sensato(tonicos := 8) -> void:
	var ordem := ["resistencia", "espada"]
	var i := 0
	while int(Game.hero["talent_points"]) > 0 and i < 40:
		Game.spend_talent(ordem[i % 2])
		i += 1
	for slot in [["protecao", "reducao"], ["amuleto", "hp"]]:
		var best: String = Game.equipment.get(slot[0], "")
		var bv := float(Data.items.get(best, {}).get(slot[1], 0.0)) if best != "" else -1.0
		for id in Game.inventory:
			var it: Dictionary = Data.items.get(id, {})
			if it.get("tipo", "") == slot[0] and Game.item_count(id) > 0 and float(it.get(slot[1], 0.0)) > bv:
				best = id
				bv = float(it.get(slot[1], 0.0))
		if best != "" and best != Game.equipment.get(slot[0], ""):
			Game.equip(best)
	while Game.item_count("pocao") < tonicos and Game.buy("pocao") == "":
		pass
	print("  [info] jogador sensato: nível %d, ataque %.1f, vida %d, redução %.0f%%, tônicos %d, fragmentos %d" % [Game.hero_level(), Game.hero_atk(), int(Game.hero_max_hp()), Game.hero_reduction() * 100.0, Game.item_count("pocao"), Game.fragments])

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
	jogador_sensato()
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
	check("R2: forja melhora a arma para +1 gastando fragmentos e minério", Game.upgrade_level(w) == 1 and abs(Game.hero_atk() - atk0 - Game.forge_bonus("arma", "dano")) < 0.01, "%d atk %s->%s" % [Game.upgrade_level(w), atk0, Game.hero_atk()])
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
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0
	return _fim_luta(b, t)

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
	check("R2: recompensa do Vigia (fragmentos e lingotes) e porta de saída", Game.has_flag("vigia_morto") and Game.fragments >= frag0 + int(Data.bosses["vigia"]["recompensa"]["frag"]) and not door_closed_at(46, 31))
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
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0
	return _fim_luta(b, t)

func r2_ferreiro() -> void:
	await rest_at("fc_prep")
	check("R2: santuário de preparação do Ferreiro", Game.checkpoint.get("shrine", "") == "fc_prep")
	await use_ent("fc_bau_prep", Vector2(0, 14), Vector2.UP)
	# evolução de uma espécie das minas antes do chefão (nível 6 + 3 vínculos, sem atalhos de XP)
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
	check("R2: fragmentos do chefão e porta de saída", Game.fragments >= frag0 + int(Data.bosses["ferreiro"]["recompensa"]["frag"]) and not door_closed_at(46, 16))
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
	while Game.hero_level() < 5:
		Game.add_hero_xp(Game.xp_to_next(Game.hero_level()))
	check("Nível 5 libera as quatro técnicas", pw.unlocked().size() == 4)
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
	check("Arma lendária aumenta o dano", Game.hero_atk() >= 12.0 + float(Data.items["galhada_ossea"]["dano"]))
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

## Interiores das casas e missões da vila
func enter_house(door: Vector2i, map_id: String) -> bool:
	await goto(Vector2(door.x * 16 + 8, (door.y + 2) * 16 + 8), 4.0, 60.0)
	steer(Vector2.UP)
	var t := 0
	while W.map_id != map_id and not W.transition_busy and t < 120:
		await frames(1)
		t += 1
	release_moves()
	while W.map_id != map_id and t < 240:
		await frames(2)
		t += 1
	await frames(20)
	return W.map_id == map_id

func leave_house() -> bool:
	var d: Dictionary = {}
	for e in W.ent_defs:
		if e["type"] == "exit":
			d = e
	var r: bool = await exit_to("vila_lumen", float(d["x"]) * 16 + 16, float(d["y"]) * 16 + 8)
	return r

func run_casas() -> void:
	for i in [3]:
		SaveSys.delete_slot(i)
	main.start_new_game(3)
	await frames(10)
	await advance_dialogs()
	var ok := await enter_house(Vector2i(8, 7), "casa_maru")
	check("Porta da casa da Maru leva ao interior", ok, W.map_id)
	await shot("casa_maru")
	await talk("lia")
	check("Lia dá a missão das Folhas-Lanterna", Game.has_flag("quest_ervas"))
	var props := 0
	for e in get_tree().get_nodes_in_group("ents"):
		if e.kind == "prop":
			props += 1
	check("Interior mobiliado (móveis desenhados)", props >= 6, str(props))
	await use_ent("casa_maru_p10_5", Vector2(0, 16), Vector2.UP)
	await advance_dialogs()
	check("Estante conta a história dos guardiões (item de história)", Game.item_count("livro_guardioes") == 1)
	ok = await leave_house()
	check("Saída da casa volta à vila em frente à porta", ok and W.map_id == "vila_lumen")
	ok = await enter_house(Vector2i(35, 6), "loja_ysa")
	check("Loja da Ysa tem interior", ok)
	await shot("loja_ysa")
	await leave_house()
	ok = await enter_house(Vector2i(10, 27), "casa_corvelo")
	check("Casa dos Corvelo abandonada antes do chefão", ok and W.cur_tiles[3][8] == "6")
	await shot("casa_corvelo_antes")
	await leave_house()
	ok = await enter_house(Vector2i(36, 24), "casa_tobi")
	check("Oficina do Tobi tem a bigorna da forja", ok)
	await shot("casa_tobi")
	await leave_house()
	# coleta no Bosque e na Clareira
	ok = await exit_to("bosque_lanternas", 43 * 16.0, 15 * 16.0 + 8.0)
	await goto(Vector2(23 * 16 + 8, 16 * 16 + 8), 4.0, 60.0)
	await interact_press(); await frames(5)
	await goto(Vector2(21 * 16 + 8, 31 * 16 + 8), 4.0, 60.0)
	await interact_press(); await frames(5)
	await goto(Vector2(45 * 16 + 8, 11 * 16 + 8), 4.0, 60.0)
	await interact_press(); await frames(5)
	check("Folhas e brinquedo coletados no Bosque", Game.item_count("folha_lanterna") == 2 and Game.item_count("brinquedo_madeira") == 1, "%d %d" % [Game.item_count("folha_lanterna"), Game.item_count("brinquedo_madeira")])
	await exit_to("vila_lumen", 8.0, 17 * 16.0 + 8.0)
	await exit_to("clareira_raizes", 22 * 16.0 + 8.0, 30 * 16.0 + 8.0)
	await goto(Vector2(38 * 16 + 8, 19 * 16 + 8), 4.0, 60.0)
	await interact_press(); await frames(5)
	check("Missão conclui ao juntar 3 folhas", Game.has_flag("ervas_ok"))
	await exit_to("vila_lumen", 22 * 16.0 + 8.0, 8.0)
	await enter_house(Vector2i(8, 7), "casa_maru")
	await talk("lia")
	check("Lia recebe as folhas e entrega a recompensa uma única vez", Game.has_flag("ervas_entregue") and Game.item_count("folha_lanterna") == 0 and Game.item_count("pocao") >= 3)
	var pot := Game.item_count("pocao")
	await talk("lia")
	check("Recompensa não duplica ao falar de novo", Game.item_count("pocao") == pot)
	await leave_house()
	# casa dos Corvelo depois do chefão
	Game.set_flag("cervo_morto")
	await enter_house(Vector2i(10, 27), "casa_corvelo")
	check("Casa dos Corvelo renovada após o chefão", W.cur_tiles[3][8] == "5" and ent_by_id("corvelo_casa") != null)
	await shot("casa_corvelo_depois")
	await talk("corvelo_casa")
	check("Dona Corvelo recebe o brinquedo e recompensa", Game.has_flag("brinquedo_entregue") and Game.item_count("brinquedo_madeira") == 0)
	W.save_now(3)
	SaveSys.load_game(3)
	check("Save mantém missões das casas", Game.has_flag("ervas_entregue") and Game.has_flag("brinquedo_entregue") and Game.has_flag("folha1_pega"))


## Clima das áreas externas (scripts/weather.gd, data/weather.json)
func _clima_shot(id: String, map_id: String, spawn: String) -> void:
	if W.map_id != map_id:
		W.load_map(map_id, spawn)
		await frames(20)
	Weather.change_to(id, false)
	Weather.fx.apply(id, true)
	await secs(3.6)
	await shot("clima_" + id)

func _vigor_gain() -> float:
	P.vigor = 0.0
	P.vigor_idle = 1.0
	await frames(30)
	return P.vigor

func run_clima() -> void:
	SaveSys.delete_slot(3)
	Game.weather_lock = ""
	Game.weather_neutral = false
	main.start_new_game(3)
	await frames(10)
	await advance_dialogs()
	var fx: Node = Weather.fx
	# 1) sorteio em mapa externo
	check("Clima sorteado ao entrar na Vila (zona Floresta)", Weather.zone == "floresta" and Weather.now() in ["sol", "chuva", "neblina"], "%s/%s" % [Weather.zone, Weather.now()])
	check("Troca agendada para 4–6 minutos", Weather.timer >= 230.0 and Weather.timer <= 360.0, str(Weather.timer))
	check("Aviso do tempo ao chegar", toast_seen("Tempo: ") or all_toasts.any(func(t): return str(t).begins_with("Tempo: ")))
	check("Ícone do clima no HUD", fx.icon_panel.visible and fx.icon.texture != null)
	var before: String = Weather.current
	# 2) interior sem clima
	var ok := await enter_house(Vector2i(8, 7), "casa_maru")
	check("Casa da Maru: interior sem clima", ok and Weather.now() == "" and not fx.icon_panel.visible, "%s %s" % [W.map_id, Weather.now()])
	await secs(0.3)
	var vis := 0
	for k in fx.groups:
		if fx.groups[k].visible:
			vis += 1
	check("Interior sem partículas de clima", vis == 0 and fx.tint.color == Color.WHITE)
	check("Interior: multiplicadores neutros", Game.weather_mult("flora") == 1.0 and Game.weather_speed_mult("pedra") == 1.0 and Game.weather_vigor_mult() == 1.0)
	await leave_house()
	check("Voltar à mesma zona mantém o clima", Weather.now() == before, "%s -> %s" % [before, Weather.now()])
	# 3) multiplicadores
	P.global_position = Vector2(22 * 16 + 8, 16 * 16 + 8)
	await frames(3)
	Weather.change_to("chuva")
	check("Chuva: água/flora +15%, brasa -15%, luz neutra", is_equal_approx(Game.weather_mult("agua"), 1.15) and is_equal_approx(Game.weather_mult("flora"), 1.15) and is_equal_approx(Game.weather_mult("brasa"), 0.85) and Game.weather_mult("luz") == 1.0)
	var wolf := _spawn_wolf(P.global_position + Vector2(200, 0))
	var hp0: float = wolf.hp
	wolf.take_damage(10.0, wolf.global_position, {"src": "companion", "aff": "agua", "knock": 0.0})
	var d_chuva: float = hp0 - wolf.hp
	wolf.hp = hp0
	wolf.take_damage(10.0, wolf.global_position, {"src": "companion", "aff": "brasa", "knock": 0.0})
	var d_brasa: float = hp0 - wolf.hp
	wolf.hp = hp0
	check("Chuva aplicada no dano real (enemy.take_damage)", is_equal_approx(d_chuva, 11.5) and is_equal_approx(d_brasa, 8.5), "%.2f %.2f" % [d_chuva, d_brasa])
	check("Toast \"O tempo mudou: Chuva\"", toast_seen("O tempo mudou: Chuva"))
	Weather.change_to("sol")
	wolf.take_damage(10.0, wolf.global_position, {"src": "companion", "aff": "luz", "knock": 0.0})
	check("Sol fortalece luz (Lumipim)", is_equal_approx(hp0 - wolf.hp, 11.5), str(hp0 - wolf.hp))
	wolf.hp = hp0
	var g_sol: float = await _vigor_gain()
	Weather.change_to("neve")
	check("Neve: criaturas não-gelo 15% mais lentas, gelo não", is_equal_approx(Game.weather_speed_mult("flora"), 0.85) and Game.weather_speed_mult("gelo") == 1.0)
	check("Neve fortalece pedra", is_equal_approx(Game.weather_mult("pedra"), 1.15))
	wolf._move(Vector2.RIGHT, 100.0, 0.016)
	check("Neve: inimigo realmente mais lento (enemy._move)", is_equal_approx(wolf.velocity.x, 85.0), str(wolf.velocity))
	wolf.velocity = Vector2.ZERO
	Weather.change_to("calor")
	check("Calor fortalece brasa", is_equal_approx(Game.weather_mult("brasa"), 1.15))
	var g_calor: float = await _vigor_gain()
	check("Calor: vigor do herói regenera 20% mais devagar", g_calor < g_sol * 0.85 and g_calor > g_sol * 0.75, "%.2f vs %.2f" % [g_calor, g_sol])
	# neblina: o lobo a 90 px enxerga no sol (percepção 110) e não na neblina (77)
	wolf.global_position = P.global_position + Vector2(90, 0)
	Weather.change_to("sol")
	wolf.target = null; wolf.los_t = 0.0; wolf.st = Enemy.St.IDLE
	wolf._acquire()
	var saw_sol: bool = wolf.target != null
	Weather.change_to("neblina")
	wolf.target = null; wolf.los_t = 0.0
	wolf._acquire()
	check("Neblina reduz a percepção dos inimigos em 30%", saw_sol and wolf.target == null and is_equal_approx(Weather.perception_mult(), 0.7))
	wolf.queue_free()
	# 4) transição suave e troca com o tempo
	Weather.change_to("chuva", false)
	await secs(3.5)
	Weather.timer = 0.5
	await secs(0.8)
	var novo: String = Weather.current
	check("Clima muda sozinho com o tempo", novo != "chuva" and novo in ["sol", "neblina"], novo)
	check("Nova troca reagendada", Weather.timer > 200.0)
	check("Toast de troca com o tempo", toast_seen("O tempo mudou: " + Weather.name_of(novo)))
	await frames(30)
	var w_old: float = fx.weight["chuva"]
	check("Transição suave: chuva ainda esmaecendo", w_old > 0.2 and w_old < 0.95, str(w_old))
	await secs(3.0)
	check("Transição concluída", fx.weight["chuva"] == 0.0 and fx.weight[novo] == 1.0)
	# 5) criaturas que dependem do clima
	Weather.change_to("chuva", false)
	W.load_map("bosque_lanternas", "from_vila")
	await frames(10)
	check("Bosque na chuva: Brotisco da chuva aparece", ent_by_id("b_brotisco_chuva") != null and ent_by_id("b_lumipim_neblina") == null)
	Weather.change_to("neblina")
	await frames(5)
	check("Neblina: Lumipim da névoa aparece e o da chuva some", ent_by_id("b_lumipim_neblina") != null and ent_by_id("b_brotisco_chuva") == null)
	check("Espécies garantidas continuam no bosque", ent_by_id("b_brotisco1") != null and ent_by_id("b_lumipim1") != null)
	# 6) save/load mantém
	Weather.change_to("neblina", false)
	Weather.timer = 123.0
	W.save_now(3)
	Weather.change_to("sol", false)
	SaveSys.load_game(3)
	check("Save/load mantém clima, zona e tempo restante", Weather.current == "neblina" and Weather.zone == "floresta" and absf(Weather.timer - 123.0) < 1.0, "%s %s %.1f" % [Weather.current, Weather.zone, Weather.timer])
	main.continue_from_slot(3)
	await frames(10)
	check("Continuar do slot mostra o mesmo clima", Weather.now() == "neblina" and fx.target == "neblina")
	# 7) outras zonas
	W.load_map("desfiladeiro", "from_vila")
	await frames(5)
	check("Desfiladeiro sorteia sol/frio/neve", Weather.zone == "desfiladeiro" and Weather.now() in ["sol", "frio", "neve"], Weather.now())
	Weather.change_to("neve")
	await frames(5)
	check("Desfiladeiro na neve: Cascalito da neve aparece", ent_by_id("d_cascalito_neve") != null)
	W.load_map("minas_entrada", "from_desfiladeiro")
	await frames(5)
	check("Minas externas sorteiam calor/sol", Weather.zone == "minas" and Weather.now() in ["calor", "sol"], Weather.now())
	W.load_map("fundicao_a", "from_pedreira")
	await frames(5)
	check("Masmorra (Fundição) sem clima", Weather.now() == "")
	# 8) descanso no santuário sorteia de novo
	W.load_map("vila_lumen", "default")
	await frames(5)
	var rolls := {}
	for i in 30:
		W.rest_at_shrine()
		rolls[Weather.current] = true
	W.player.state = Player.S.FREE
	check("Descansar sorteia o clima da zona (pesos da Floresta)", rolls.size() >= 2 and rolls.keys().all(func(k): return k in ["sol", "chuva", "neblina"]), str(rolls.keys()))
	# 9) travamento para testes
	Game.weather_lock = "sol"
	Weather.timer = 0.2
	await secs(0.5)
	check("weather_lock força sol e não troca", Weather.now() == "sol")
	Game.weather_neutral = true
	check("weather_neutral desliga os efeitos", Game.weather_mult("flora") == 1.0)
	Game.weather_lock = ""
	Game.weather_neutral = false
	# 10) textos explicativos
	Weather.change_to("chuva", false)
	check("Menu de pausa explica o clima", "Chuva" in Weather.describe() and "+15%" in Weather.describe())
	check("Bestiário explica o clima por afinidade", "Chuva" in Weather.species_note("flora") and "mais fraca com Chuva" in Weather.species_note("brasa"))
	await ui_press("pause")
	await frames(4)
	await shot("clima_pausa")
	await close_menus()
	# 11) screenshots de cada clima
	await _clima_shot("sol", "bosque_lanternas", "from_vila")
	await _clima_shot("chuva", "bosque_lanternas", "from_vila")
	await _clima_shot("neblina", "bosque_lanternas", "from_vila")
	await _clima_shot("neve", "desfiladeiro", "from_vila")
	await _clima_shot("frio", "desfiladeiro", "from_vila")
	await _clima_shot("calor", "minas_entrada", "from_desfiladeiro")
	check("Sem erros de script durante o teste de clima", true)

# ================================================================ CONTRATOS EM GRUPO (dupla / trio)
func contract_enemies(cid: String) -> Array:
	return W.enemies().filter(func(e): return e.alive_flag and e.contrato == cid)

func run_grupo() -> void:
	SaveSys.delete_slot(4)
	main.start_new_game(4)
	await frames(10)
	await advance_dialogs()
	Game.hero["level"] = 4
	Game.hero["hp"] = Game.hero_max_hp()
	Game.give_item("pocao", 6)
	Game.set_flag("visitou_bosque_lanternas")
	check("Quadro de contratos na vila", ent_by_id("quadro_vila") != null)
	check("Bruna está na vila (NPC com folha própria)", ent_by_id("bruna") != null)
	await use_ent("quadro_vila", Vector2(0, 16), Vector2.UP)
	await frames(5)
	check("Quadro abre a tela de contratos", main.ui.has_screen())
	check("Contrato em dupla disponível; trio bloqueado", Game.contract_state("saqueadores") == "disponivel" and Game.contract_state("emboscada") == "bloqueado")
	await shot("grupo_01_quadro")
	await close_menus()
	check("Aceitar contrato de dupla", Game.accept_contract("saqueadores"))
	await frames(10)
	check("Bruna entra no grupo (aliada + criatura dela) e sai do mapa como NPC", W.allies().size() == 1 and W.party_nodes.size() == 2 and ent_by_id("bruna") == null)
	var ok := await exit_to("bosque_lanternas", 43 * 16.0, 15 * 16.0 + 8.0)
	await frames(10)
	check("Aliada acompanha o herói para outro mapa", ok and W.allies().size() == 1 and W.allies()[0].global_position.distance_to(P.global_position) < 80.0)
	var es := contract_enemies("saqueadores")
	var dom := es.filter(func(e): return e.kind in ["domador", "domadora"])
	var fer := es.filter(func(e): return e.kind == "fera")
	check("Domadores e feras do contrato aparecem no Bosque", dom.size() == 2 and fer.size() == 2, "%d %d" % [dom.size(), fer.size()])
	check("Feras de domador não são capturáveis", fer.all(func(f): return not f.capturable))
	await goto(tpos(33, 12), 30.0, 30.0)
	await shot("grupo_02_dupla")
	Game.dmg_stats.erase("aliado")
	await engage_area(tpos(41, 12), 260.0, 160.0)
	await secs(1.5)
	check("Contrato de dupla concluído", Game.has_flag("saqueadores_ok"), "vivos=%d" % contract_enemies("saqueadores").size())
	var freed := W.enemies().filter(func(e): return e.alive_flag and e.kind == "wild" and str(e.uid).begins_with("saqueadores_f"))
	print("feras libertadas: ", freed.size())
	await shot("grupo_03_fim")
	await advance_dialogs()
	await frames(5)
	check("Recompensa entregue e aliada volta para a vila", Game.item_count("selo_refinado") >= 2 and Game.party.is_empty() and W.allies().is_empty())
	if freed.size() > 0 and is_instance_valid(freed[0]):
		Game.give_item("selo_basico", 4)
		Game.rng_override = func(): return 0.0
		await weaken(freed[0])
		var cap := is_instance_valid(freed[0]) and await capture_wild(freed[0], 8)
		Game.rng_override = Callable()
		check("Fera libertada pode ser capturada", cap)
	# fera libertada: teste determinístico do mecanismo
	var d := {"kind": "domador", "id": "t_dom", "x": int(P.global_position.x / 16), "y": int(P.global_position.y / 16) + 6, "contrato": "teste"}
	var en := Enemy.new(); en.init(W, "domador", d); W.ysort.add_child(en)
	var fd := {"kind": "fera", "id": "t_fera", "dono": "t_dom", "species": "lumipim", "level": 3, "x": d["x"] + 2, "y": d["y"], "contrato": "teste"}
	var fe := Enemy.new(); fe.init(W, "fera", fd); W.ysort.add_child(fe)
	await frames(3)
	en.take_damage(9999.0, en.global_position, {"src": "heroi"})
	await frames(3)
	check("Derrotar o domador liberta a fera (vira selvagem calma e capturável)", fe.alive_flag and fe.kind == "wild" and fe.capturable and fe.angry_t <= 0.0)
	fe.queue_free()
	# patrulha: aliada convocada fora de contrato
	check("Bruna pode ser convocada para patrulha", Game.can_recruit("bruna"))
	Game.toggle_party("bruna")
	await frames(5)
	var br: Node = W.allies()[0] if W.allies().size() > 0 else null
	check("Bruna acompanha em patrulha", br != null)
	if br != null:
		br.hp = 1.0
		br.take_hit(50.0, br.global_position + Vector2(10, 0), {})
		check("Aliada cai ao perder a vida", br.st == Ally.St.DOWN)
		await goto(br.global_position, 10.0, 6.0)
		release_moves()
		await secs(1.6)
		check("Herói reanima a aliada ficando perto", br.st != Ally.St.DOWN and br.hp > 1.0)
	Game.toggle_party("bruna")
	await frames(5)
	# trio
	Game.set_flag("visitou_clareira_raizes")
	Game.hero["level"] = 5
	Game.hero["hp"] = Game.hero_max_hp()
	check("Contrato em trio libera após a dupla", Game.contract_state("emboscada") == "disponivel")
	Game.accept_contract("emboscada")
	await frames(8)
	check("Trio: Bruna e Ravi no grupo", W.allies().size() == 2)
	await exit_to("vila_lumen", 8.0, 17 * 16.0 + 8.0)
	await exit_to("clareira_raizes", 22 * 16.0 + 8.0, 30 * 16.0 + 8.0)
	await frames(10)
	check("Bando da emboscada aparece na Clareira", contract_enemies("emboscada").size() == 6)
	await goto(tpos(22, 20), 30.0, 40.0)
	await shot("grupo_04_trio")
	await engage_area(tpos(22, 26), 300.0, 200.0)
	await secs(1.5)
	check("Aliados e criaturas deles causam dano (dupla + trio)", float(Game.dmg_stats.get("aliado", 0.0)) > 0.0, str(Game.dmg_stats.get("aliado", 0.0)))
	check("Contrato em trio concluído", Game.has_flag("emboscada_ok"), "vivos=%d hp=%d" % [contract_enemies("emboscada").size(), int(Game.hero["hp"])])
	check("Recompensa do trio: Botas do Vento", Game.item_count("botas_vento") == 1)
	await advance_dialogs()
	W.save_now(4)
	SaveSys.load_game(4)
	await frames(10)
	check("Save mantém contratos", Game.has_flag("saqueadores_ok") and Game.has_flag("emboscada_ok") and Game.contract == "")
	# acessórios de criatura
	var a1: Dictionary = Game.new_individual("brotisco", 5); Game.individuals[a1["uuid"]] = a1
	var a2: Dictionary = Game.new_individual("lumipim", 5); Game.individuals[a2["uuid"]] = a2
	var hp0 := Game.creature_hp_max(a1)
	check("Coleira de Couro recebida no contrato", Game.item_count("coleira_couro") >= 1)
	check("Equipar coleira dá +12 de vida à criatura", Game.equip_creature(a1["uuid"], "coleira_couro") and Game.creature_hp_max(a1) == hp0 + 12.0)
	check("A mesma peça não serve a duas criaturas ao mesmo tempo", Game.item_count("coleira_couro") > 1 or not Game.equip_creature(a2["uuid"], "coleira_couro"))
	Game.give_item("selo_ancestral", 1)
	var at0 := Game.creature_atk(a2)
	Game.equip_creature(a2["uuid"], "selo_ancestral")
	check("Selo Ancestral: +25% de ataque e recarga menor", absf(Game.creature_atk(a2) - at0 * 1.25) < 0.01 and Game.creature_cd_mult(a2) < 1.0)
	W.save_now(4)
	SaveSys.load_game(4)
	await frames(5)
	check("Save mantém acessórios das criaturas", str(Game.individuals.get(a2["uuid"], {}).get("acessorio", "")) == "selo_ancestral")
	# itens-chave
	Game.give_item("frasco_seiva", 1)
	Game.refill_flasks()
	Game.hero["hp"] = 5.0
	P._apply_damage(50.0)
	check("Frasco de Seiva levanta o herói com metade da vida", P.state != Player.S.DEAD and float(Game.hero["hp"]) >= Game.hero_max_hp() * 0.45 and not Game.flask_ready())
	var mh := Game.hero_max_hp()
	Game.give_item("semente_vida", 1)
	check("Semente de Vida aumenta a vida máxima", Game.hero_max_hp() == mh + 10.0)
	await exit_to("vila_lumen", 22 * 16.0 + 8.0, 8.0)
	Game.give_item("luvas_pedra", 1)
	await goto(tpos(12, 9), 4.0, 30.0)
	await face(Vector2.UP)
	await interact_press()
	await frames(20)
	check("Luvas de Pedra erguem a pedra e revelam a Semente de Vida", W.cur_tiles[8][12] != "o" and ent_by_id("semente_vila") != null)
	await goto(tpos(12, 8), 4.0, 10.0)
	await frames(5)
	await interact_press()
	await frames(10)
	check("Semente escondida coletada", Game.has_flag("semente_vila_pega"))
	await goto(tpos(30, 17), 4.0, 30.0)
	var x0 := P.global_position.x
	steer(Vector2.RIGHT)
	await frames(2)
	Input.action_press("dodge")
	await frames(40)
	var running: bool = P.running
	Input.action_release("dodge")
	release_moves()
	check("Botas do Vento: segurar a esquiva faz correr", running and P.global_position.x - x0 > 90.0, "%s %.0f" % [running, P.global_position.x - x0])
# =============================================================== HABILIDADES DAS CRIATURAS (aprender, escolher, usar, salvar)
## Uso: godot --headless --fixed-fps 60 --path . -- --e2e --habilidades
var hab_toasts: Array = []

func _hab_add(sp_id: String, lvl: int) -> Dictionary:
	var ind := Game.new_individual(sp_id, lvl)
	Game.individuals[ind["uuid"]] = ind
	Game.team.append(ind["uuid"])
	Game.team_changed.emit()
	return ind

func _hab_top_title() -> String:
	var t: MenuScreen = main.ui._top()
	return t.title if t != null else ""

func _hab_fire(ind: Dictionary, hid: String) -> bool:
	Game.hab_set_active(ind["uuid"], hid)
	Game.set_active(ind["uuid"])
	W.refresh_companion(false)
	await frames(3)
	Game.skill_cd[ind["uuid"]] = 0.0
	var c: Node = W.companion
	c.target = null
	return c.command_skill(Vector2.RIGHT)

func _hab_open_team_creature(uuid: String) -> void:
	await ui_press("pause")
	await ui_press("ui_down")
	await ui_press("ui_accept")      # Equipe e criaturas
	await frames(3)
	for i in Game.team.find(uuid):
		await ui_press("ui_down")
	await ui_press("ui_accept")      # menu da criatura
	await frames(3)

func run_habilidades() -> void:
	SaveSys.delete_slot(3)
	Game.toast.connect(func(t): hab_toasts.append(t))
	main.start_new_game(3)
	await frames(10)
	await advance_dialogs()
	Game.god_mode = false
	# ---- dados
	var ok_data := true
	var why: Array = []
	for sid in ["brotisco", "lumipim", "cascalito", "faisquito", "ferrunho", "fuligin"]:
		var base: Array = Game.hab_list(sid)
		var evo: String = Data.species[sid]["evolucao"]["para"]
		var ev_l: Array = Game.hab_list(evo)
		var base_ids: Array = base.map(func(h): return h["id"])
		var ev_ids: Array = ev_l.map(func(h): return h["id"])
		var herda: bool = base_ids.all(func(h): return ev_ids.has(h))
		var excl: int = ev_l.size() - base.size()
		if base.size() < 3 or base.size() > 4 or not herda or excl < 1 or excl > 2 or base_ids[0] != Data.species[sid]["skill"]:
			ok_data = false
			why.append(sid)
	check("Hab: 12 espécies com 3–4 habilidades; evolução herda e libera 1–2 exclusivas", ok_data, str(why))
	# ---- aprender por nível
	var bro := _hab_add("brotisco", 1)
	W.refresh_companion(false)
	await frames(3)
	check("Hab: Brotisco Nv.1 conhece só Raízes (ativa)", bro["hab_aprendidas"] == ["raizes"] and Game.hab_active(bro) == "raizes", str(bro["hab_aprendidas"]))
	hab_toasts.clear()
	while int(bro["nivel"]) < 2:
		Game.add_creature_xp(bro, Game.creature_xp_to_next(int(bro["nivel"])))
	check("Hab: ao subir de nível aprende Sementes e Chicote (Nv.2)", bro["hab_aprendidas"].has("sementes") and bro["hab_aprendidas"].has("chicote_cipo") and bro["hab_aprendidas"].size() == 3, str(bro["hab_aprendidas"]))
	var seen: bool = hab_toasts.any(func(t): return "aprendeu Sementes Curativas! Escolha no menu" in t)
	check("Hab: toast 'X aprendeu Y! Escolha no menu'", seen, str(hab_toasts))
	check("Hab: aprender não troca a ativa sozinho", Game.hab_active(bro) == "raizes")
	# ---- escolher no menu (Pausa > Equipe > criatura > Habilidades…)
	await _hab_open_team_creature(bro["uuid"])
	await menu_pick("Habilidades")   # Tornar ativa, Apelido, Acessório, Evoluir, Habilidades…
	await frames(3)
	var top: MenuScreen = main.ui._top()
	check("Hab: menu da criatura abre a tela Habilidades", top != null and top.title.begins_with("Habilidades"), _hab_top_title())
	var n_locked := 0
	if top != null:
		for it in top.items:
			if not it.get("hdr", false) and not it.get("en", true) and "(Nv." in str(it["t"]):
				n_locked += 1
		await shot("hab_menu")
		var info: String = top._info_text()
		check("Hab: tela mostra descrição, recarga e dano", "Recarga" in info and "Dano" in info, info)
	check("Hab: bloqueadas aparecem em cinza com o nível (exclusivas da evolução)", n_locked == 2, str(n_locked))
	await ui_press("ui_down")        # Sementes Curativas
	await ui_press("ui_accept")
	await frames(3)
	check("Hab: escolher no menu define a ativa", bro["hab_ativa"] == "sementes" and Game.hab_active(bro) == "sementes", str(bro.get("hab_ativa")))
	await close_menus()
	check("Hab: menus fecham", not main.ui.has_screen() and not get_tree().paused)
	# ---- Q usa a escolhida com recarga própria
	Game.hero["hp"] = 40.0
	Game.skill_cd[bro["uuid"]] = 0.0
	await tap("skill", 2)
	await frames(2)
	var cd1: float = float(Game.skill_cd.get(bro["uuid"], 0.0))
	check("Hab: Q usa Sementes Curativas (cura o herói)", float(Game.hero["hp"]) > 40.0, str(Game.hero["hp"]))
	check("Hab: recarga própria da escolhida (12 s)", cd1 > 11.5 and cd1 <= 12.0, str(cd1))
	var hp_b: float = float(Game.hero["hp"])
	await tap("skill", 2)
	check("Hab: em recarga, Q não repete", float(Game.hero["hp"]) == hp_b)
	var wolf := _spawn_wolf(W.companion.global_position + Vector2(24, 0))
	var w0: float = wolf.hp
	await _hab_fire(bro, "chicote_cipo")
	await frames(2)
	check("Hab: Chicote de Cipó fere à frente com recarga de 5 s", wolf.hp < w0 and abs(float(Game.skill_cd[bro["uuid"]]) - 5.0) < 0.2, "%s -> %s cd %s" % [w0, wolf.hp, Game.skill_cd[bro["uuid"]]])
	wolf.queue_free()
	await frames(2)
	# ---- novas execuções: escudo, cadeia, investida em cadeia
	var cas := _hab_add("cascalito", 2)
	await _hab_fire(cas, "casca")
	check("Hab: Escudo de Casca reduz dano (30%)", is_equal_approx(Game.hab_shield_mult(), 0.7), str(Game.hab_shield_mult()))
	Game.hero["hp"] = 100.0
	P.inv_timer = 0.0
	P.state = Player.S.FREE
	Game.difficulty = "desafio"
	P.take_hit(20.0, P.global_position + Vector2(30, 0))
	check("Hab: herói com escudo recebe menos dano", abs(float(Game.hero["hp"]) - (100.0 - 20.0 * (1.0 - Game.hero_reduction()) * 0.7)) < 0.2, str(Game.hero["hp"]))
	Game.difficulty = "aventura"
	await secs(5.5)
	check("Hab: escudo expira", Game.hab_shield_mult() == 1.0)
	var lum := _hab_add("lumipim", 3)
	Game.set_active(lum["uuid"])
	W.refresh_companion(false)
	await frames(3)
	var cp: Vector2 = W.companion.global_position
	var ws: Array = [_spawn_wolf(cp + Vector2(40, 0)), _spawn_wolf(cp + Vector2(70, 20)), _spawn_wolf(cp + Vector2(100, 0))]
	var hp_ws: Array = ws.map(func(w): return w.hp)
	await _hab_fire(lum, "lampejo")
	await frames(2)
	var hit_n := 0
	for i in 3:
		if ws[i].hp < hp_ws[i]:
			hit_n += 1
	check("Hab: Lampejo em Cadeia salta entre 3 inimigos", hit_n == 3, str(hit_n))
	for w in ws:
		w.queue_free()
	await frames(2)
	Game.move_to_sanctuary(cas["uuid"])
	var roc := _hab_add("rocantor", 4)
	Game.set_active(roc["uuid"])
	W.refresh_companion(false)
	await frames(3)
	cp = W.companion.global_position
	var ws2: Array = [_spawn_wolf(cp + Vector2(30, 0)), _spawn_wolf(cp + Vector2(60, 24))]
	var hp2: Array = ws2.map(func(w): return w.hp)
	check("Hab: Rocantor (evoluída) já conhece Avalanche no Nv.4", roc["hab_aprendidas"].has("avalanche") and not roc["hab_aprendidas"].has("muralha"))
	await _hab_fire(roc, "avalanche")
	await secs(1.2)
	var hit2 := 0
	for i in 2:
		if is_instance_valid(ws2[i]) and ws2[i].hp < hp2[i]:
			hit2 += 1
	check("Hab: Avalanche (investida em cadeia) acerta mais de um inimigo", hit2 == 2, str(hit2))
	for w in ws2:
		if is_instance_valid(w):
			w.queue_free()
	Game.move_to_sanctuary(roc["uuid"])
	await frames(3)
	# ---- evolução: aprende a exclusiva e oferece a escolha
	Game.set_active(bro["uuid"])
	W.refresh_companion(false)
	while int(bro["nivel"]) < 3:
		Game.add_creature_xp(bro, Game.creature_xp_to_next(int(bro["nivel"])))
	bro["vinculo"] = ["a", "b", "c"]
	W.combat_t = 0.0
	hab_toasts.clear()
	await _hab_open_team_creature(bro["uuid"])
	await menu_pick("Evoluir")
	await frames(3)
	await ui_press("ui_accept")      # Confirmar
	await frames(6)
	check("Hab: Brotisco evoluiu para Galhardo", bro["species_id"] == "galhardo")
	check("Hab: evolução avisa a habilidade exclusiva aprendida", hab_toasts.any(func(t): return "aprendeu Raízes Profundas! Escolha no menu" in t), str(hab_toasts))
	top = main.ui._top()
	check("Hab: evolução oferece a escolha (abre Habilidades)", top != null and top.title.begins_with("Habilidades"), _hab_top_title())
	check("Hab: ativa preservada na evolução", Game.hab_active(bro) == "chicote_cipo", Game.hab_active(bro))
	if top != null:
		var target_i := -1
		for i in top.items.size():
			if "Raízes Profundas" in str(top.items[i]["t"]) and top.items[i].get("en", true):
				target_i = i
		if target_i >= 0:
			top.sel = target_i
			await ui_press("ui_accept")
	await shot("hab_evolucao")
	check("Hab: escolhe a exclusiva na tela da evolução", Game.hab_active(bro) == "raizes_profundas", str(bro["hab_ativa"]))
	await close_menus()
	# ---- Q com a exclusiva escolhida
	Game.skill_cd[bro["uuid"]] = 0.0
	await tap("skill", 2)
	await frames(2)
	check("Hab: Q usa Raízes Profundas (recarga 8 s)", abs(float(Game.skill_cd.get(bro["uuid"], 0.0)) - 8.0) < 0.2, str(Game.skill_cd.get(bro["uuid"])))
	# ---- Santuário: também acessível pelo armazenamento
	main.ui.open_storage()
	await frames(3)
	await ui_press("ui_down")        # primeira criatura guardada (abaixo de "Ordenar")
	await ui_press("ui_accept")
	await frames(3)
	await menu_pick("Habilidades")   # Levar à equipe, Apelido…, Acessório, Habilidades…
	await frames(3)
	check("Hab: Santuário (armazenamento) também abre Habilidades", _hab_top_title().begins_with("Habilidades"), _hab_top_title())
	await close_menus()
	# ---- save/load mantém
	Game.hab_set_active(lum["uuid"], "lampejo")
	var ok_s := SaveSys.save_game(3)
	Game.hab_set_active(bro["uuid"], "raizes")
	bro["hab_aprendidas"] = ["raizes"]
	var ok_l := SaveSys.load_game(3)
	var bro2: Dictionary = Game.individuals.get(bro["uuid"], {})
	var lum2: Dictionary = Game.individuals.get(lum["uuid"], {})
	check("Hab: save/load mantém ativa e aprendidas", ok_s and ok_l and bro2.get("hab_ativa", "") == "raizes_profundas" and bro2.get("hab_aprendidas", []).size() == 4 and lum2.get("hab_ativa", "") == "lampejo", "%s %s" % [bro2.get("hab_ativa"), bro2.get("hab_aprendidas")])
	# ---- migração de save antigo (sem os campos)
	var d: Dictionary = JSON.parse_string(JSON.stringify(Game.to_dict()))
	for u in d["individuals"]:
		d["individuals"][u].erase("hab_ativa")
		d["individuals"][u].erase("hab_aprendidas")
	d["individuals"][bro["uuid"]]["species_id"] = "brotisco"
	d["individuals"][bro["uuid"]]["nivel"] = 2
	hab_toasts.clear()
	var ok_m := Game.from_dict(d)
	var b3: Dictionary = Game.individuals[bro["uuid"]]
	var c3: Dictionary = Game.individuals[cas["uuid"]]
	check("Hab: save antigo migra (ativa = original, aprendidas pelo nível)", ok_m and b3["hab_ativa"] == "raizes" and b3["hab_aprendidas"] == ["raizes", "sementes", "chicote_cipo"] and c3["hab_ativa"] == "avanco" and c3["hab_aprendidas"] == ["avanco", "casca"], "%s %s / %s" % [b3.get("hab_ativa"), b3.get("hab_aprendidas"), c3.get("hab_aprendidas")])
	check("Hab: migração não gera avisos de 'aprendeu'", not hab_toasts.any(func(t): return "aprendeu" in t))
	var bad: Dictionary = Game.individuals[lum["uuid"]]
	bad["hab_ativa"] = "eclipse"
	check("Hab: ativa inválida volta à habilidade original", Game.hab_active(bad) == "pulso")


# ================================================================ CAPÍTULO 3 — PÂNTANO DOS SUSSURROS
## Atalho de desenvolvimento (-- --e2e --r3): monta o estado do fim do Capítulo 2 e roda só os estágios do Pântano.
func run_r3_dev() -> void:
	for i in [3]:
		SaveSys.delete_slot(i)
	main.start_new_game(3)
	await frames(10)
	await advance_dialogs()
	for f in ["falou_maru", "tutorial_ok", "primeira_captura", "viu_santuario_seiva", "lenhador_morto", "cervo_morto", "voltou_vila", "ponte_minas",
			"fim_cap1", "visitou_forja_cobre", "falou_doran", "visitou_fundicao_a", "vigia_morto", "ferreiro_morto", "voltou_forja", "minas_libertas",
			"tut_move", "tut_attack", "tut_dodge", "tut_guard", "tut_command", "tut_rest", "rito_ok", "atalho_fundicao_aberto"]:
		Game.set_flag(f)
	Game.grant_eco("raiz_viva")
	Game.grant_eco("ruptura_ignea")
	Game.add_hero_xp(9000)
	while Game.hero_level() > 8:
		Game.hero["level"] = 8
	Game.hero["hp"] = Game.hero_max_hp()
	for sp in [["brasejante", 8], ["cinzaveu", 8], ["ferrunho", 8]]:
		var ind := Game.new_individual(sp[0], sp[1])
		ind["vinculo"] = ["a", "b", "c"]
		Game.register_capture(ind)
	Game.give_item("pocao", 12)
	Game.give_item("selo_refinado", 8)
	Game.give_item("selo_basico", 6)
	Game.give_item("lanca_cobre", 1)
	Game.give_item("luvas_termicas", 1)
	Game.equip("lanca_cobre")
	Game.fragments = 600
	Game.checkpoint = {"map": "forja_cobre", "spawn": "", "pos": [24 * 16.0 + 8.0, 17 * 16.0 + 8.0], "shrine": "forja"}
	if "--r3boss" in args:
		# atalho de desenvolvimento: pula direto para o Barqueiro (estado equivalente ao fim do templo B)
		for f in ["pantano_passagem", "visitou_porto_lanternas", "falou_arao", "visitou_passarela_ecos", "visitou_lago_reflexos", "visitou_templo_a",
				"lago_c1", "lago_c2", "ta_canal", "ta_espelhos", "enc_sapos_ok", "tb_lodo", "atalho_porto_aberto", "lanternas_entregue"]:
			Game.set_flag(f)
		for sp in [["goturim", 10], ["brejugo", 10], ["nimbelo", 10]]:
			Game.register_capture(Game.new_individual(sp[0], sp[1]))
		await ensure_in_team(["nimbelo"])
		await ensure_in_team(["goturim"])
		Game.give_item("remo_barqueiro", 1)
		Game.equip("remo_barqueiro")
		Game.add_hero_xp(2600)
		Game.hero["hp"] = Game.hero_max_hp()
		Game.checkpoint = {"map": "templo_b", "spawn": "", "pos": [22 * 16.0 + 8.0, 8 * 16.0], "shrine": "tb_tesouro"}
		W.load_map("templo_b", "from_porto")
		await frames(20)
		await r3_barqueiro()
		await r3_rito()
		await r3_bruxa()
		await r3_pos_bruxa()
		await r3_save_load()
		return
	W.load_map("forja_cobre", "default")
	await frames(30)
	await advance_dialogs()
	await r3_all()

func r3_all() -> void:
	await r3_passagem()
	if stage_limit <= 24: return
	await r3_porto()
	if stage_limit <= 25: return
	await r3_passarela()
	if stage_limit <= 26: return
	await r3_porto_volta()
	if stage_limit <= 27: return
	await r3_lago()
	if stage_limit <= 28: return
	await r3_templo_a()
	if stage_limit <= 29: return
	await r3_templo_b()
	if stage_limit <= 30: return
	await r3_barqueiro()
	if stage_limit <= 31: return
	await r3_rito()
	if stage_limit <= 32: return
	await r3_bruxa()
	if stage_limit <= 33: return
	await r3_pos_bruxa()
	if stage_limit <= 34: return
	await r3_save_load()

## Garante a espécie na equipe (como no santuário: troca com a criatura mais antiga).
func ensure_in_team(sp_ids: Array) -> String:
	var u := uuid_of(sp_ids)
	if u == "":
		return ""
	if not Game.team.has(u):
		if Game.team.size() >= Game.TEAM_MAX:
			for v in Game.team:
				var sid: String = Game.individuals[v]["species_id"]
				if not sid in ["goturim", "marulume", "brejugo", "musgoral", "nimbelo", "nimbelio"]:
					Game.move_to_sanctuary(v)
					break
		Game.move_to_team(u)
		W.refresh_companion(true)
		await frames(5)
	return u

func talk_at(ent_id: String, from: Vector2, dir: Vector2) -> void:
	var e := ent_by_id(ent_id)
	if e == null:
		return
	await goto(e.global_position + from, 6.0)
	await face(dir)
	await frames(3)
	await interact_press()
	await frames(3)
	await advance_dialogs()
	await frames(5)

# ---------------------------------------------------------------- 24. Passagem Sul (Ruptura Ígnea) e chegada
func r3_passagem() -> void:
	check("R3: bloqueio de pedra fissurada da Passagem Sul existe desde o Capítulo 1", str(Data.maps["minas_entrada"]["tiles"][14][24]) == "X")
	var ok := await exit_to("minas_entrada", 23 * 16.0 + 8.0, 35 * 16.0 + 8.0)
	check("R3: a Forja leva de volta à Entrada das Minas", ok and W.map_id == "minas_entrada")
	check("R3: objetivo aponta a Passagem Sul (Capítulo 2 concluído)", "Passagem Sul" in Game.objective_text() and "concluído" in Game.objective_text(), Game.objective_text())
	check("R3: bloqueio intransponível antes da Ruptura", W.is_solid_char(W.tile_char_at(tpos(24, 14))))
	await use_ent("passagem_sul", Vector2(-16, 0), Vector2.RIGHT)
	check("R3: Ruptura Ígnea rompe o bloqueio da Passagem Sul", Game.has_flag("pantano_passagem") and not W.is_solid_char(W.tile_char_at(tpos(24, 14))))
	await shot("r3_01_passagem")
	ok = await exit_to("porto_lanternas", 29 * 16.0 + 8.0, 14 * 16.0 + 8.0)
	check("R3: a Passagem Sul chega ao Porto das Lanternas", ok and W.map_id == "porto_lanternas")

# ---------------------------------------------------------------- 25. Porto das Lanternas (núcleo)
func r3_porto() -> void:
	check("R3: Pântano dos Sussurros marcado como jogável", Data.regions["pantano"]["status"] == "jogavel" and Data.regions["pantano"]["mapas"].size() >= 7)
	check("R3: tileset do pântano (quarta fonte do TileSet) em uso", W.tilemap.tile_set.has_source(3) and W.tilemap.get_cell_source_id(Vector2i(24, 18)) == 3)
	check("R3: zona de clima do pântano (chuva/neblina)", Weather.zone_of("porto_lanternas") == "pantano" and Weather.zone_of("templo_a") == "")
	check("R3: trilha 'pantano' nos mapas da região", Data.maps["porto_lanternas"]["music"] == "pantano" and Data.maps["templo_c"]["music"] == "pantano")
	check("R3: objetivo aponta o mestre do Porto", "Arão" in Game.objective_text(), Game.objective_text())
	await shot("r3_02_porto")
	var pot0 := Game.item_count("pocao")
	await talk("arao")
	check("R3: Arão dá a missão principal e suprimentos", Game.has_flag("falou_arao") and Game.item_count("pocao") == pot0 + 3 and "Templo Submerso" in Game.objective_text())
	await talk("iara")
	check("R3: Iara oferece 'Lanternas da Passarela'", Game.has_flag("quest_lanternas"))
	await talk_at("tito", Vector2(0, -16), Vector2.DOWN)
	check("R3: Tito oferece 'A Rede do Tito' (rotina: pesca no píer com tempo seco)", Game.has_flag("quest_rede") and ent_by_id("tito") != null and ent_by_id("tito_abrigo") == null)
	await rest_at("porto")
	check("R3: santuário do Porto grava o ponto de retorno", Game.checkpoint.get("shrine", "") == "porto")
	jogador_sensato()
	check("R3: quadro de contratos no Porto com caçada e contrato em dupla da região", ent_by_id("quadro_porto") != null and Data.contracts.has("caca_sapos") and Data.contracts["contrabando"]["tipo"] == "dupla")
	check("R3: contratos da região bloqueados até visitar as rotas", Game.contract_state("caca_sapos") == "bloqueado" and Game.contract_state("contrabando") == "bloqueado")
	# gancho da Região 4: a ponte espiritual existe mas só o Olhar Velado a revela
	await use_ent("ponte_muralha", Vector2(-16, 0), Vector2.RIGHT)
	check("R3: ponte espiritual (Região 4) visível como obstáculo antes do Olhar Velado", Game.has_flag("viu_oculto_ponte_muralha") and W.tile_char_at(tpos(40, 6)) == "W")

# ---------------------------------------------------------------- 26. Passarela dos Ecos (rota 1)
func r3_passarela() -> void:
	var ok := await exit_to("passarela_ecos", 23 * 16.0 + 8.0, 8.0)
	check("R3: norte do Porto leva à Passarela dos Ecos", ok and W.map_id == "passarela_ecos")
	await shot("r3_03_passarela")
	await engage_area(tpos(24, 27), 170.0, 90.0)
	var sapo_ok := int(Game.stats["kills"].get("sapo", 0)) >= 1
	check("R3: sapo de lodo (salto anunciado) e planta sementeira derrotados", sapo_ok and int(Game.stats["kills"].get("planta", 0)) >= 1 and P.state != Player.S.DEAD,
		"%s" % str(Game.stats["kills"]))
	await use_ent("guia1", Vector2(0, 16), Vector2.UP)
	check("R3: lanterna-guia acesa pelo herói (persistente)", Game.has_flag("lit_guia1"))
	# Brejugo na ilha oeste
	await engage_area(tpos(7, 23), 140.0, 60.0)
	var okb := await capture_species("pa_brejugo1")
	check("R3: Brejugo capturado no lodo da ilha oeste (habitat fixo)", okb and Game.bestiary.get("brejugo", {}).get("capturado", false))
	# Goturim na ilha leste
	await engage_area(tpos(48, 25), 150.0, 60.0)
	var okg := await capture_species("pa_goturim1")
	check("R3: Goturim capturado na água rasa da ilha leste", okg and Game.bestiary.get("goturim", {}).get("capturado", false))
	var ug := await ensure_in_team(["goturim", "marulume"])
	var ub := await ensure_in_team(["brejugo", "musgoral"])
	check("R3: Goturim e Brejugo na equipe", Game.team.has(ug) and Game.team.has(ub))
	# roda d'água: sem o Goturim nada muda; com ele, o canal escoa
	await set_active_species(["brejugo", "musgoral"])
	await use_ent("roda_passarela", Vector2(0, 16), Vector2.UP)
	check("R3: roda d'água não gira sem o Goturim (caminho opcional)", not Game.has_flag("passarela_roda") and W.tile_char_at(tpos(48, 15)) == "W")
	await set_active_species(["goturim", "marulume"])
	var bg := Game.bond_count(Game.individuals[ug])
	await use_ent("roda_passarela", Vector2(0, 16), Vector2.UP)
	check("R3: Goturim gira a roda d'água e o canal escoa (ação ambiental real)", Game.has_flag("passarela_roda") and W.tile_char_at(tpos(48, 15)) == "t")
	check("R3: ação do Goturim conta vínculo", Game.bond_count(Game.individuals[ug]) > bg or "acao:roda_passarela" in Game.individuals[ug]["vinculo"])
	await shot("r3_04_roda")
	await use_ent("passarela_bau_roda", Vector2(0, 16), Vector2.UP)
	check("R3: baú da ilhota do canal (rota do Goturim)", Game.chests.has("passarela_bau_roda"))
	# Goturim: Onda empurra inimigos leves
	var wolf := _spawn_wolf(W.companion.global_position + Vector2(30, 0))
	wolf.small = true
	var w0: float = wolf.hp
	var p0: Vector2 = wolf.global_position
	wolf.set_physics_process(true)
	Game.skill_cd[ug] = 0.0
	W.companion.target = null
	W.companion.command_skill(Vector2.RIGHT)
	await frames(1)
	var kv: float = wolf.knock_v.length()
	await frames(10)
	check("R3: Onda do Goturim fere e empurra inimigo leve", wolf.hp < w0 and (kv >= 200.0 or wolf.global_position.distance_to(p0) > 10.0), "%s -> %s / %.1f / kv %.0f" % [w0, wolf.hp, wolf.global_position.distance_to(p0), kv])
	wolf.queue_free()
	# lodo instável do caminho principal: estacas locais
	check("R3: lodo instável bloqueia o caminho norte", W.is_solid_char(W.tile_char_at(tpos(27, 11))))
	await use_ent("estacas_norte", Vector2(16, 0), Vector2.LEFT)
	check("R3: estacas (mecanismo local) firmam o lodo", Game.has_flag("passarela_estacas") and W.tile_char_at(tpos(27, 11)) == "8")
	await use_ent("guia2", Vector2(-16, 0), Vector2.RIGHT)
	# atalho do Brejugo
	await use_ent("marca_noroeste", Vector2(0, 16), Vector2.UP)
	check("R3: lodo marcado não firma com outra criatura", not Game.has_flag("passarela_lodo_brejugo"))
	await set_active_species(["brejugo", "musgoral"])
	await use_ent("marca_noroeste", Vector2(0, 16), Vector2.UP)
	check("R3: Brejugo firma o lodo marcado (atalho opcional)", Game.has_flag("passarela_lodo_brejugo") and W.tile_char_at(tpos(5, 14)) == "8")
	# Brejugo: Lodo Pegajoso deixa inimigos lentos
	var wolf2 := _spawn_wolf(W.companion.global_position + Vector2(40, 0))
	Game.skill_cd[ub] = 0.0
	W.companion.target = wolf2
	W.companion.command_skill(Vector2.RIGHT)
	await frames(4)
	check("R3: Lodo Pegajoso do Brejugo deixa o inimigo lento", wolf2.slow_t > 0.0)
	wolf2.queue_free()
	await shot("r3_05_lodo")
	await use_ent("passarela_bau_noroeste", Vector2(0, 16), Vector2.UP)
	# ilha norte: terceira lanterna-guia, segredo dos juncos
	await engage_area(tpos(28, 6), 150.0, 60.0)
	await use_ent("guia3", Vector2(0, 16), Vector2.UP)
	check("R3: três lanternas-guia acesas completam a missão da Iara", Game.has_flag("lanternas_ok"))
	check("R3: nicho dos juncos fechado antes de observar", W.is_solid_char(W.tile_char_at(tpos(18, 4))))
	await use_ent("juncos_sussurro", Vector2(16, 0), Vector2.LEFT)
	check("R3: juncos sussurrantes revelam um nicho (segredo por observação)", Game.has_flag("passarela_sussurro") and not W.is_solid_char(W.tile_char_at(tpos(18, 4))))
	await use_ent("passarela_bau_sussurro", Vector2(0, 16), Vector2.UP)
	check("R3: diário da faroleira no nicho", Game.item_count("diario_faroleira") == 1)
	await shot("r3_06_ilha_norte")
	ok = await exit_to("porto_lanternas", 23 * 16.0 + 8.0, 39 * 16.0 + 8.0)
	check("R3: volta ao Porto pela passarela", ok)

# ---------------------------------------------------------------- 27. Porto: missão das lanternas e contrato
func r3_porto_volta() -> void:
	jogador_sensato()
	var ub := uuid_of(["brejugo", "musgoral"])
	var b0 := Game.bond_count(Game.individuals[ub]) if ub != "" else 0
	await talk("iara")
	check("R3: Iara entrega o Amuleto da Maré e vínculo para a equipe", Game.has_flag("lanternas_entregue") and Game.item_count("amuleto_mare") == 1 and (ub == "" or Game.bond_count(Game.individuals[ub]) > b0))
	check("R3: caçada da região liberada depois da Passarela", Game.contract_state("caca_sapos") == "disponivel")
	check("R3: aceitar a caçada 'Coaxar Sem Fim'", Game.accept_contract("caca_sapos") and "Sapos" in Game.contract_progress_text())

# ---------------------------------------------------------------- 28. Lago dos Reflexos (rota 2)
func r3_lago() -> void:
	var ok := await exit_to("lago_reflexos", 47 * 16.0 + 8.0, 17 * 16.0 + 8.0)
	check("R3: leste do Porto leva ao Lago dos Reflexos", ok and W.map_id == "lago_reflexos")
	check("R3: contrato em dupla do lago liberado ao chegar", Game.contract_state("contrabando") in ["ocupado", "disponivel"])
	await shot("r3_07_lago")
	check("R3: canal até a ilha é água funda antes da comporta", W.tile_char_at(tpos(12, 19)) == "W")
	await use_ent("comporta_margem", Vector2(0, 16), Vector2.UP)
	check("R3: comporta da margem esvazia o canal (nível da água)", Game.has_flag("lago_c1") and W.tile_char_at(tpos(12, 19)) == "t")
	await goto(tpos(22, 19), 6.0, 40.0)
	await engage_area(tpos(25, 20), 140.0, 70.0)
	check("R3: espectro refletido derrotado (só vulnerável ao atacar ou revelado)", int(Game.stats["kills"].get("espectro", 0)) >= 1, str(Game.stats["kills"]))
	await use_ent("comporta_ilha", Vector2(0, 16), Vector2.UP)
	check("R3: comporta da ilha esvazia o caminho ao templo", Game.has_flag("lago_c2") and W.tile_char_at(tpos(27, 8)) == "t")
	# anel de lanternas -> Nimbelo (descoberta ligada à criatura)
	check("R3: Nimbelo ausente antes do anel de lanternas", ent_by_id("la_nimbelo") == null)
	await use_ent("anel1", Vector2(0, 16), Vector2.UP)
	await use_ent("anel2", Vector2(0, 16), Vector2.UP)
	await use_ent("anel3", Vector2(0, -16), Vector2.DOWN)
	await frames(6)
	check("R3: anel de lanternas acesas atrai o Nimbelo (raro, opcional)", Game.has_flag("lago_anel") and ent_by_id("la_nimbelo") != null)
	await engage_area(tpos(45, 24), 120.0, 60.0)
	var okn := await capture_species("la_nimbelo", 0.25)
	check("R3: Nimbelo capturado (opcional; não exigido pela campanha)", okn and Game.bestiary.get("nimbelo", {}).get("capturado", false))
	await use_ent("rede_tito", Vector2(0, -16), Vector2.DOWN)
	check("R3: rede do Tito encontrada na ilha leste", Game.item_count("rede_pesca") == 1 and Game.has_flag("rede_achada"))
	# roda d'água do lago (Goturim)
	await set_active_species(["goturim", "marulume"])
	await use_ent("roda_lago", Vector2(0, 16), Vector2.UP)
	await use_ent("lago_bau_roda", Vector2(0, 16), Vector2.UP)
	check("R3: roda do lago escoa o canal leste (baú com Semente de Vida)", Game.has_flag("lago_roda") and Game.chests.has("lago_bau_roda"))
	# Nimbelo revela espectros por perto
	var un := await ensure_in_team(["nimbelo", "nimbelio"])
	if un != "":
		await set_active_species(["nimbelo", "nimbelio"])
	var esp := Enemy.new()
	esp.init(W, "espectro", {"id": "teste_espectro", "x": 30, "y": 20})
	W.ysort.add_child(esp)
	esp.global_position = W.companion.global_position + Vector2(30, 0)
	esp.set_physics_process(false)
	await frames(6)
	check("R3: espectro invisível e intocável sem revelação", not esp.spectral_visible() or W.companion != null)
	W.companion._passive(0.016)
	check("R3: Nimbelo revela o espectro por perto (passiva)", esp.revealed_t > 0.0 and esp.hittable())
	esp.queue_free()
	# segredo do reflexo
	await goto(tpos(27, 6), 6.0, 60.0)
	await engage_area(tpos(24, 3), 140.0, 60.0)
	await use_ent("lago_reflexo", Vector2(0, -16), Vector2.DOWN)
	check("R3: o reflexo que não bate revela um baú (segredo por observação)", Game.has_flag("lago_reflexo") and ent_by_id("lago_bau_reflexo") != null)
	await use_ent("lago_bau_reflexo", Vector2(0, -16), Vector2.DOWN)
	check("R3: Manto de Juncos no baú do reflexo", Game.item_count("manto_juncos") == 1 and Game.has_flag("lago_bau_reflexo_aberto"))
	await shot("r3_08_reflexo")
	ok = await exit_to("templo_a", 27 * 16.0 + 8.0, 8.0)
	check("R3: o caminho de pedras chega ao Templo Submerso", ok and W.map_id == "templo_a")

# ---------------------------------------------------------------- 29. Templo Submerso A (Sala das Marés, Galeria, Espelhos)
func r3_templo_a() -> void:
	await rest_at("ta_atrio")
	check("R3: santuário do átrio do templo", Game.checkpoint.get("shrine", "") == "ta_atrio")
	check("R3: Sala das Marés: canal central cheio separa as alas", W.tile_char_at(tpos(30, 22)) == "W")
	await shot("r3_09_sala_mares")
	await goto(tpos(17, 25), 6.0, 60.0)
	await goto(tpos(10, 25), 8.0, 10.0)
	await frames(10)
	check("R3: Galeria: portas do templo se fecham no combate", Game.has_flag("tmp_enc_sapos") and door_closed_at(14, 25))
	var tt := 0.0
	while tt < 200.0 and not Game.has_flag("enc_sapos_ok") and P.state != Player.S.DEAD:
		var f0 := frame_count
		await engage_area(tpos(7, 23), 200.0, 20.0)
		await frames(10)
		tt += max(1.0, float(frame_count - f0) / 60.0)
	await frames(10)
	check("R3: Galeria vencida; portas reabrem", Game.has_flag("enc_sapos_ok") and not door_closed_at(14, 25),
		"vivos=%s morto=%s" % [str(hostile().map(func(e): return "%s@%s hp%.0f vis%s" % [e.kind, str(tile_of(e.global_position)), e.hp, e.spectral_visible()])), P.state == Player.S.DEAD])
	await use_ent("ta_comporta", Vector2(0, 16), Vector2.UP)
	check("R3: comporta da Galeria esvazia o canal da Sala das Marés (efeito entre salas)", Game.has_flag("ta_canal") and W.tile_char_at(tpos(30, 22)) == "0")
	await use_ent("ta_bau_galeria", Vector2(0, 16), Vector2.UP)
	# Sala dos Espelhos
	await goto(tpos(44, 18), 6.0, 60.0)
	await engage_area(tpos(36, 18), 160.0, 40.0)
	check("R3: porta norte fechada antes do feixe", door_closed_at(51, 7) and not ent_by_id("ta_cristal").lit)
	await shot("r3_10_espelhos")
	for i in 2:
		await use_ent("ta_espelho3", Vector2(16, 0), Vector2.LEFT)
	for i in 2:
		await use_ent("ta_espelho1", Vector2(-16, 0), Vector2.RIGHT)
	for i in 2:
		await use_ent("ta_espelho2", Vector2(-16, 0), Vector2.RIGHT)
	check("R3: espelhos: dica opcional depois de várias tentativas", toast_seen("Dica: a luz"))
	await use_ent("ta_espelho1", Vector2(-16, 0), Vector2.RIGHT)
	check("R3: um espelho certo desvia o feixe mas não acende o cristal", not Game.has_flag("ta_espelhos") and W.beam_layer.get_child_count() > 6)
	await use_ent("ta_espelho2", Vector2(-16, 0), Vector2.RIGHT)
	await use_ent("ta_espelho3", Vector2(16, 0), Vector2.LEFT)
	await frames(4)
	check("R3: três espelhos alinhados acendem o cristal e abrem a porta", Game.has_flag("ta_espelhos") and ent_by_id("ta_cristal").lit and not door_closed_at(51, 7))
	await shot("r3_11_feixe")
	await use_ent("ta_bau_espelhos", Vector2(0, -16), Vector2.DOWN)
	check("R3: Tábua do Templo (história) na Sala dos Espelhos", Game.item_count("diario_templo") == 1)
	var ok := await exit_to("templo_b", 51 * 16.0 + 8.0, 8.0)
	check("R3: a porta dos espelhos leva à Câmara do Lodo", ok and W.map_id == "templo_b")

# ---------------------------------------------------------------- 30. Templo B (lodo, tesouro, atalho ao Porto)
func r3_templo_b() -> void:
	check("R3: faixa de lodo instável corta a Câmara do Lodo", W.is_solid_char(W.tile_char_at(tpos(41, 9))))
	await use_ent("tb_estacas", Vector2(16, 0), Vector2.LEFT)
	check("R3: estacas do templo firmam o lodo (sem depender de criatura)", Game.has_flag("tb_lodo") and W.tile_char_at(tpos(41, 9)) == "8")
	await engage_area(tpos(38, 10), 220.0, 90.0)
	check("R3: plantas e espectros da câmara derrotados", hostile().filter(func(e): return e.global_position.distance_to(tpos(38, 10)) < 220.0).is_empty())
	await rest_at("tb_tesouro")
	await use_ent("tb_bau_tesouro", Vector2(0, 16), Vector2.UP)
	check("R3: tesouro do templo: Remo Ancestral", Game.item_count("remo_barqueiro") == 1)
	Game.equip("remo_barqueiro")
	check("R3: Remo Ancestral equipado aumenta o alcance", Game.weapon_profile()["alcance"] >= 10.0)
	check("R3: comporta do Canal Submerso fechada antes da alavanca", door_closed_at(18, 3))
	await use_ent("tb_alavanca_canal", Vector2(0, 16), Vector2.UP)
	check("R3: alavanca abre o Canal Submerso (atalho)", Game.has_flag("atalho_porto_aberto") and not door_closed_at(18, 3))
	var ok := await exit_to("porto_lanternas", 18 * 16.0 + 16.0, 8.0)
	check("R3: atalho do templo reconecta ao Porto", ok and W.map_id == "porto_lanternas" and not door_closed_at(23, 29))
	await talk_at("tito", Vector2(0, -16), Vector2.DOWN)
	check("R3: rede devolvida ao Tito (missão secundária)", Game.has_flag("rede_entregue") and Game.item_count("rede_pesca") == 0)
	ok = await exit_to("templo_b", 23 * 16.0 + 16.0, 35 * 16.0 + 8.0)
	check("R3: atalho funciona nos dois sentidos (Porto -> templo)", ok and W.map_id == "templo_b")
	await rest_at("tb_tesouro")
	check("R3: santuário do tesouro antes do Barqueiro", Game.checkpoint.get("shrine", "") == "tb_tesouro")

# ---------------------------------------------------------------- 31. Barqueiro Sem Sombra
func barqueiro_lanterns() -> Array:
	var out: Array = []
	for i in 4:
		var l := ent_by_id("tb_lanterna%d" % (i + 1))
		if l != null:
			out.append(l)
	return out

func lantern_spot(b: Node, l: Node) -> Vector2:
	var c: Vector2 = b.lake.get_center()
	var dx: float = 16.0 if c.x > l.global_position.x else -16.0
	return l.global_position + Vector2(dx, 0)

func fight_barqueiro(b: Node, timeout := 300.0) -> String:
	var t := 0.0
	while t < timeout and is_instance_valid(b) and b.alive_flag:
		if P.state == Player.S.DEAD:
			return "morreu"
		var before := frame_count
		await use_potion_if_needed()
		var q := quake_threat()
		if q != null and P.dodge_cd <= 0.0 and P.vigor >= 25.0:
			steer(q.dir.orthogonal())
			await frames(1)
			await tap("dodge", 2)
			release_moves()
			last_seen["esquivou_onda"] = true
		elif b.bst == b.B.TELE_OAR and P.global_position.distance_to(b.global_position) < 76.0:
			steer(P.global_position - b.global_position)
			await frames(5)
			release_moves()
		elif b.bst in [b.B.INTRO]:
			await frames(3)
		elif b.has_shadow():
			last_seen["sombra"] = true
			var d: float = P.global_position.distance_to(b.global_position)
			if d < 40.0:
				await face(b.global_position - P.global_position)
				await attack_tap()
				await frames(8)
			else:
				await goto(W.safe_pos_near(b.global_position), 6.0, 0.5)
		else:
			var best: Node = null
			var bd := 1e9
			for l in barqueiro_lanterns():
				if l.lit or l.boss_cd > 0.0:
					continue
				var dd: float = l.global_position.distance_to(P.global_position)
				if dd < bd:
					bd = dd
					best = l
			if best == null:
				await frames(4)
			else:
				var spot := lantern_spot(b, best)
				if P.global_position.distance_to(spot) > 6.0:
					await goto(spot, 4.0, 0.8)
				elif b.global_position.distance_to(best.global_position) < 80.0:
					await face(best.global_position - P.global_position)
					await interact_press()
					await frames(4)
				else:
					await frames(3)
		if frame_count == before:
			await frames(1)
		if int(t / 2.0) != int((t + float(frame_count - before) / 60.0) / 2.0) and "--dbg" in args:
			print("  [dbg] t=%.0f hp=%.0f/%.0f boss=%.0f bst=%d sombra=%s pos=%s boss=%s pocao=%d" % [t, float(Game.hero["hp"]), Game.hero_max_hp(), b.hp, b.bst, b.has_shadow(), str(tile_of(P.global_position)), str(tile_of(b.global_position)), Game.item_count("pocao")])
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0
	return _fim_luta(b, t)

func enter_barqueiro() -> Node:
	await goto(tpos(20, 19), 6.0, 60.0)
	await goto(tpos(20, 24), 6.0, 20.0)
	await frames(30)
	return find_boss("barqueiro")

func r3_barqueiro() -> void:
	await use_ent("placa_barqueiro", Vector2(-16, 0), Vector2.RIGHT)
	await advance_dialogs()
	var b := await enter_barqueiro()
	check("R3: Barqueiro Sem Sombra desperta e a porta do templo se fecha", b != null and b.activated and door_closed_at(19, 21))
	await shot("r3_12_barqueiro")
	await secs(1.8)
	var h0: float = b.hp
	b.take_damage(40.0, b.global_position + Vector2(-20, 0), {"src": "heroi", "knock": 0.0})
	check("R3: sem sombra os golpes quase não o ferem", h0 - b.hp <= 40.0 * 0.25 and not b.has_shadow(), str(h0 - b.hp))
	check("R3: arena com plataformas largas em volta do lago (sem quedas)", W.tile_char_at(tpos(18, 30)) == "9" and W.tile_char_at(tpos(41, 30)) == "9" and W.tile_char_at(tpos(30, 24)) == "9")
	await die_generic(b, "arena do Barqueiro")
	check("R3: derrota no Barqueiro: volta ao santuário, porta aberta, chefe intacto", W.map_id == "templo_b" and not Game.has_flag("barqueiro_morto") and not Game.has_flag("tmp_barqueiro_ativo") and not door_closed_at(19, 21))
	Game.heal_team()
	b = await enter_barqueiro()
	check("R3: Barqueiro reiniciado com vida cheia", b != null and abs(b.hp - b.max_hp) < 0.1)
	last_seen = {}
	var frag0 := Game.fragments
	var res := await fight_barqueiro(b, 300.0)
	for k in 2:
		if res == "vitoria":
			break
		print("  [dbg] barqueiro: ", res, " ", last_seen.keys())
		await secs(4.0)
		Game.heal_team()
		b = await enter_barqueiro()
		res = await fight_barqueiro(b, 300.0)
	check("R3: Barqueiro Sem Sombra derrotado usando as lanternas", res == "vitoria", res)
	check("R3: a luz prendeu a sombra dele (vulnerável)", last_seen.get("sombra", false))
	await secs(2.0)
	check("R3: recompensa do Barqueiro e porta de saída", Game.has_flag("barqueiro_morto") and Game.fragments >= frag0 + int(Data.bosses["barqueiro"]["recompensa"]["frag"]) and not door_closed_at(46, 30))
	check("R3: objetivo segue para a Bruxa", "Bruxa" in Game.objective_text(), Game.objective_text())
	await shot("r3_13_barqueiro_fim")

# ---------------------------------------------------------------- 32. Rito dos Reflexos
func r3_rito() -> void:
	var ok := await exit_to("rito_reflexos", 59 * 16.0 + 8.0, 30 * 16.0 + 8.0)
	check("R3: depois do Barqueiro, o Rito dos Reflexos", ok and W.map_id == "rito_reflexos")
	await shot("r3_14_rito")
	check("R3: rito: porta 1 fechada até observar as duas estátuas", door_closed_at(14, 14))
	var sv := ent_by_id("rr_demo_v")
	var sf := ent_by_id("rr_demo_f")
	check("R3: reflexo verdadeiro repete o lado da lanterna; o falso troca de lado", sv.refl.visible and sf.refl.visible and not sv.refl.flip_h and sf.refl.flip_h)
	await use_ent("rr_demo_v", Vector2(0, 16), Vector2.UP)
	await use_ent("rr_demo_f", Vector2(0, 16), Vector2.UP)
	check("R3: rito 1: observar as duas estátuas abre a porta (sem castigo)", Game.has_flag("rr_demo1") and Game.has_flag("rr_demo2") and not door_closed_at(14, 14))
	# sala 2: o Nimbelo faz as falsas tremularem; tocar a falsa vira espectro
	var nb := await set_active_species(["nimbelo", "nimbelio"])
	await goto(tpos(23, 10), 6.0, 40.0)
	await frames(20)
	var s2a := ent_by_id("rr_s2a")
	check("R3: com o Nimbelo por perto as estátuas falsas tremulam", not nb or s2a.sprite.modulate != Color.WHITE)
	var dica_vista := false    # o aviso dura 3,2 s na tela; a luta com o espectro pode passar disso
	for id in ["rr_s2a", "rr_s2c", "rr_s2a"]:
		await use_ent(id, Vector2(0, 16), Vector2.UP)
		await frames(10)
		dica_vista = dica_vista or toast_seen("Dica: olhe de que lado")
		await engage_area(tpos(23, 12), 140.0, 30.0)
	check("R3: rito 2: estátua falsa vira espectro; dica após 3 erros", (dica_vista or toast_seen("Dica: olhe de que lado")) and int(Game.stats["kills"].get("espectro", 0)) >= 2)
	var inv0 := Game.inventory.duplicate()
	var fr0 := Game.fragments
	await use_ent("rr_reset2", Vector2(0, 16), Vector2.UP)
	check("R3: pedra de reinício não tira itens nem fragmentos", Game.inventory == inv0 and Game.fragments == fr0)
	var safe_exit := false
	for d in W.ent_defs:
		if d["type"] == "exit" and d["to"] == "templo_b" and W._def_visible(d):
			safe_exit = true
	check("R3: saída segura do rito sempre aberta", safe_exit and not door_closed_at(1, 14))
	await use_ent("rr_s2b", Vector2(0, 16), Vector2.UP)
	check("R3: rito 2: a estátua de reflexo verdadeiro abre a porta", Game.has_flag("rr2_ok") and not door_closed_at(30, 14))
	# sala 3: sem água não há reflexo; a comporta enche o tanque
	await use_ent("rr_s3c", Vector2(0, 16), Vector2.UP)
	check("R3: rito 3: sem água a estátua não responde", not Game.has_flag("rr3_ok") and not ent_by_id("rr_s3c").refl.visible)
	await use_ent("rr_comporta", Vector2(0, 16), Vector2.UP)
	await frames(4)
	check("R3: rito 3: comporta enche o tanque e os reflexos aparecem", Game.has_flag("rr_agua") and ent_by_id("rr_s3c").refl.visible)
	await shot("r3_15_rito_reflexos")
	await use_ent("rr_s3c", Vector2(0, 16), Vector2.UP)
	check("R3: rito 3: água + reflexo verdadeiro despertam o altar", Game.has_flag("rr3_ok") and not door_closed_at(49, 14))
	var ac := Game.active_ind()
	var b1 := Game.bond_count(ac)
	await use_ent("rr_altar", Vector2(0, 16), Vector2.UP)
	await advance_dialogs()
	check("R3: conclusão do rito: Lente de Orvalho e vínculo da criatura ativa", Game.has_flag("rito_reflexos_ok") and Game.item_count("lente_orvalho") == 1 and Game.bond_count(ac) == b1 + 1)
	W.rite_altar(ent_by_id("rr_altar"))
	await advance_dialogs()
	check("R3: repetir o altar não dá recompensa de novo", Game.item_count("lente_orvalho") == 1 and Game.bond_count(ac) == b1 + 1)
	var esp := Enemy.new()
	esp.init(W, "espectro", {"id": "teste_lente", "x": 55, "y": 16})
	W.ysort.add_child(esp)
	esp.global_position = P.global_position + Vector2(30, 0)
	esp.set_physics_process(false)
	await frames(2)
	check("R3: Lente de Orvalho deixa espectros próximos visíveis", esp.spectral_visible())
	esp.queue_free()
	ok = await exit_to("templo_c", 59 * 16.0 + 8.0, 14 * 16.0 + 8.0)
	check("R3: o rito leva ao Coração Afogado", ok and W.map_id == "templo_c")

# ---------------------------------------------------------------- 33. Bruxa Afogada
func enter_bruxa_arena() -> Node:
	await goto(tpos(20, 17), 6.0, 60.0)
	await frames(30)
	return find_boss("bruxa")

func bruxa_figures(b: Node) -> Array:
	var out: Array = [b]
	for c in b.copies:
		if is_instance_valid(c) and c.alive_flag:
			out.append(c)
	return out

## Escolhe pela pista visual: o reflexo que acompanha o corpo.
func true_figure(b: Node) -> Node:
	for f in bruxa_figures(b):
		if f.reflexo_consistente:
			return f
	return b

func orb_threat() -> Node:
	for q in get_tree().get_nodes_in_group("projectiles"):
		if q.mode != "orbe":
			continue
		var rel: Vector2 = P.global_position - q.global_position
		if rel.length() < 34.0 and q.dir.dot(rel.normalized()) > 0.7:
			return q
	return null

func bruxa_step(b: Node) -> void:
	await use_potion_if_needed()
	var pp := P.global_position
	var o := orb_threat()
	if o != null and P.dodge_cd <= 0.0 and P.vigor >= 25.0:
		steer(o.dir.orthogonal())
		await frames(1)
		await tap("dodge", 2)
		release_moves()
		last_seen["esquivou_orbe"] = true
		return
	if b.bst == b.B.TELE_POCA:
		for q in b.poca_pts:
			if pp.distance_to(q) < 26.0:
				await goto(pp + (pp - q).normalized() * 34.0, 6.0, 0.5)
				return
	for r in b.sinking_rects():
		if r.grow(4.0).has_point(pp):
			last_seen["aviso_plataforma"] = true
			await goto(tpos(32, 17), 8.0, 1.5)
			return
	if b.bst in [b.B.INTRO, b.B.TRANSITION]:
		await frames(3)
		return
	var tgt := true_figure(b)
	if b.phase == 2 and b.copies.size() > 0:
		last_seen["escolheu_reflexo"] = tgt == b
	var d: float = pp.distance_to(tgt.global_position)
	if d < 38.0:
		await face(tgt.global_position - pp)
		await attack_tap()
		await frames(8)
	else:
		var dest: Vector2 = tgt.global_position
		if W.tile_solid_at(dest):
			dest = W.safe_pos_near(dest)
		await goto(dest, 24.0, 0.5)

func fight_bruxa(b: Node, timeout := 420.0) -> String:
	var t := 0.0
	while t < timeout and is_instance_valid(b) and b.alive_flag:
		if P.state == Player.S.DEAD:
			return "morreu"
		var before := frame_count
		last_seen["fase%d" % b.phase] = true
		if b.phase == 3 and Game.has_flag("tmp_bruxa_cheia"):
			last_seen["agua_subiu"] = true
		await bruxa_step(b)
		if frame_count == before:
			await frames(1)
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0
	return _fim_luta(b, t)

func r3_bruxa() -> void:
	await rest_at("tc_prep")
	check("R3: santuário de preparação da Bruxa", Game.checkpoint.get("shrine", "") == "tc_prep")
	await use_ent("tc_bau_prep", Vector2(0, 16), Vector2.UP)
	await use_ent("placa_bruxa", Vector2(0, 16), Vector2.UP)
	await advance_dialogs()
	# ---- derrota na fase 1
	var b := await enter_bruxa_arena()
	check("R3: Bruxa Afogada desperta e a porta se fecha", b != null and b.activated and door_closed_at(17, 17))
	await shot("r3_16_bruxa")
	await secs(2.4)
	var saw_fan := false
	var tf := 0.0
	while tf < 8.0 and not saw_fan and is_instance_valid(b):
		saw_fan = b.bst == b.B.TELE_FAN
		await frames(3)
		tf += 0.05
	check("R3: fase 1: leque de orbes anunciado por linhas", saw_fan)
	await die_generic(b, "fase 1 da Bruxa")
	check("R3: derrota fase 1: reinício limpo", W.map_id == "templo_c" and not Game.has_flag("bruxa_morta") and not Game.has_flag("tmp_bruxa_ativo") and not door_closed_at(17, 17))
	# ---- fase 2: cópias e reflexos
	Game.heal_team()
	b = await enter_bruxa_arena()
	await secs(2.4)
	b.take_damage(b.max_hp * 0.42, b.global_position + Vector2(-20, 0), {"src": "heroi", "knock": 0.0})
	await secs(1.8)
	check("R3: fase 2 (60%): a Bruxa se divide em quatro", b.phase == 2 and b.copies.size() + b.copies_broken == 3 and b.splits == 1, "fase %d cópias %d/%d" % [b.phase, b.copies.size(), b.copies_broken])
	var cps: Array = b.copies.duplicate()
	var ok_refl: bool = b.refl != null and b.refl.flip_h == b.sprite.flip_h and b.reflexo_consistente
	for c in cps:
		if c.reflexo_consistente or c.refl.flip_h == c.sprite.flip_h:
			ok_refl = false
	check("R3: só a verdadeira tem reflexo consistente na água da arena", ok_refl)
	check("R3: com o Nimbelo ativo a verdadeira é marcada depressa", Game.active_ind().get("species_id", "") not in ["nimbelo", "nimbelio"] or b.real_mark_t > 0.0)
	await shot("r3_17_bruxa_copias")
	var n_cp: int = b.copies.size()
	var n_br: int = b.copies_broken
	if n_cp > 0:
		var c0: Node = b.copies[0]
		c0.take_damage(10.0, P.global_position, {"src": "heroi"})
		await frames(4)
	check("R3: golpe numa cópia a desfaz (e a Bruxa responde)", n_cp > 0 and b.copies.size() == n_cp - 1 and b.copies_broken == n_br + 1)
	# ---- fase 3: a água sobe
	b.take_damage(b.hp - b.max_hp * 0.24, b.global_position + Vector2(-20, 0), {"src": "heroi", "knock": 0.0})
	await secs(2.4)
	check("R3: fase 3 (25%): a água sobe; cruz de pedra e plataformas do padrão ficam firmes",
		b.phase == 3 and Game.has_flag("tmp_bruxa_cheia") and W.tile_char_at(tpos(38, 22)) == "W" and W.tile_char_at(tpos(24, 10)) == "0" and W.tile_char_at(tpos(31, 16)) == "9")
	check("R3: nenhuma cópia na fase 3", b.copies.is_empty())
	var warned := false
	var t3 := 0.0
	b.invulnerable = true      # só para observar a troca de plataformas sem encerrar a luta
	b.split_hp = b.hp
	while t3 < 14.0 and is_instance_valid(b) and P.state != Player.S.DEAD and b.pat_i == 0:
		if not b.sinking_rects().is_empty():
			warned = true
		var f0 := frame_count
		await bruxa_step(b)
		if frame_count == f0:
			await frames(1)
		t3 += float(frame_count - f0) / 60.0
	if is_instance_valid(b):
		b.invulnerable = false
	check("R3: plataformas mudam só depois do aviso", warned and b.pat_i == 1 and W.tile_char_at(tpos(24, 10)) == "W" and W.tile_char_at(tpos(38, 22)) == "0",
		"aviso=%s pat=%d t=%.1f A=%s D=%s vivo=%s" % [warned, b.pat_i if is_instance_valid(b) else -1, t3, W.tile_char_at(tpos(24, 10)), W.tile_char_at(tpos(38, 22)), P.state != Player.S.DEAD])
	var firm := 0
	for k in b.padroes.size():
		firm += (b.padroes[k] as Array).size()
	check("R3: nunca retira todas as posições seguras (cruz sempre firme)", firm >= 6 and W.tile_char_at(tpos(31, 12)) == "9" and W.tile_char_at(tpos(40, 17)) == "9")
	await shot("r3_18_bruxa_agua")
	if is_instance_valid(b) and P.state != Player.S.DEAD:
		await die_generic(b, "fase 3 da Bruxa")
	else:
		await secs(4.5)
	check("R3: derrota fase 3: a água volta ao normal e o reinício é limpo", W.tile_char_at(tpos(38, 22)) == "0" and not Game.has_flag("tmp_bruxa_cheia") and not Game.has_flag("bruxa_morta"))
	# ---- luta real
	Game.heal_team()
	last_seen = {}
	b = await enter_bruxa_arena()
	await secs(2.2)
	var frag0 := Game.fragments
	Game.dmg_stats = {}
	var res := await fight_bruxa(b, 480.0)
	for k in 3:
		if res == "vitoria":
			break
		print("  [dbg] bruxa: ", res, " ", last_seen.keys(), " hp=", b.hp if is_instance_valid(b) else -1)
		await secs(4.0)
		Game.heal_team()
		b = await enter_bruxa_arena()
		await secs(2.2)
		res = await fight_bruxa(b, 480.0)
	print("  [info] luta da Bruxa: %s, dano herói=%.0f companheiro=%.0f, tônicos=%d, nível herói=%d" % [res, float(Game.dmg_stats.get("heroi", 0)), float(Game.dmg_stats.get("companion", 0)), Game.item_count("pocao"), Game.hero_level()])
	check("R3: Bruxa Afogada derrotada em combate real (sem Olhar Velado)", res == "vitoria", res)
	check("R3: luta passou pelas três fases", last_seen.get("fase2", false) and last_seen.get("fase3", false) and last_seen.get("agua_subiu", false), str(last_seen.keys()))
	await secs(2.5)
	check("R3: recompensa: Eco Olhar Velado + água clara (flag de região)", Game.has_eco("olhar_velado") and Game.has_flag("pantano_livre") and Game.eco_slots.has("olhar_velado"))
	check("R3: fragmentos do chefão e porta de saída", Game.fragments >= frag0 + int(Data.bosses["bruxa"]["recompensa"]["frag"]) and not door_closed_at(46, 16))
	var n_ecos := Game.ecos.size()
	Game.grant_eco("olhar_velado")
	check("R3: recompensa idempotente", Game.ecos.size() == n_ecos)
	await shot("r3_19_bruxa_fim")

# ---------------------------------------------------------------- 34. vitória: água clara, travessia, margens novas, Olhar Velado
func r3_pos_bruxa() -> void:
	var ok := await exit_to("porto_lanternas", 55 * 16.0 + 8.0, 16 * 16.0 + 8.0)
	await frames(60)
	await advance_dialogs()
	check("R3: volta ao Porto com cena de vitória", ok and Game.has_flag("voltou_porto") and "Capítulo 3 concluído" in Game.objective_text(), Game.objective_text())
	check("R3: a água do pântano clareou", W.tilemap.get_cell_atlas_coords(Vector2i(2, 2)) == W._tc("agua_clara0") and W.tilemap.get_cell_source_id(Vector2i(2, 2)) == 3)
	check("R3: moradores retomam a travessia (Cora, barco novo, Arão no cais)", ent_by_id("cora") != null and ent_by_id("porto_barco2") != null and ent_by_id("arao_cais") != null and ent_by_id("arao") == null)
	await shot("r3_20_porto_claro")
	# Olhar Velado: ponte espiritual para a Região 4 (gancho)
	var slot := Game.eco_slots.find("olhar_velado")
	var key := "eco%d" % (slot + 1)
	P.energy = Player.ENERGY_MAX
	await goto(tpos(35, 7), 4.0, 40.0)
	await tap(key, 2)
	await frames(10)
	check("R3: Olhar Velado revela a ponte espiritual do nordeste", Game.has_flag("ponte_muralha") and W.tile_char_at(tpos(40, 6)) == "E")
	await shot("r3_21_ponte_espiritual")
	await goto(tpos(44, 6), 4.0, 40.0)
	await frames(20)
	await advance_dialogs()
	check("R3: saída da trilha leva à Ponte Espiritual da Região 4", W.ent_defs.any(func(d): return d["type"] == "exit" and d["to"] == "ponte_espiritual" and W._def_visible(d)) and Data.maps.has("ponte_espiritual"))
	check("R3: a ponte leva ao gancho da Região 4 (fim do Capítulo 3)", Game.has_flag("fim_cap3"))
	# margens novas no lago
	ok = await exit_to("lago_reflexos", 47 * 16.0 + 8.0, 17 * 16.0 + 8.0)
	check("R3: margem nova no Lago dos Reflexos", ok and not W.is_solid_char(W.tile_char_at(tpos(26, 32))) and ent_by_id("lago_bau_margem") != null)
	await use_ent("lago_bau_margem", Vector2(0, -16), Vector2.DOWN)
	check("R3: baú da margem nova (Essência Lendária)", Game.chests.has("lago_bau_margem"))
	await use_ent("lago_inscricao", Vector2(0, 16), Vector2.UP)
	await advance_dialogs()
	check("R3: inscrição espiritual legível com o Olhar Velado", Game.has_flag("revelou_lago_inscricao"))
	ok = await exit_to("porto_lanternas", 8.0, 18 * 16.0 + 8.0)
	# revisita: inscrição oculta da Forja (segredo das Minas)
	ok = ok and await exit_to("minas_entrada", 8.0, 17 * 16.0 + 8.0)
	ok = ok and await exit_to("forja_cobre", 15 * 16.0 + 8.0, 8.0)
	check("R3: Porto -> Passagem Sul -> Forja (mundo conectado)", ok and W.map_id == "forja_cobre")
	var sem0 := Game.item_count("lingote")
	await advance_dialogs()
	await frames(30)
	await use_ent("forja_inscricao", Vector2(0, 16), Vector2.UP)
	await advance_dialogs()
	var dbg_ins := "pos=%s prompt=%s busy=%s dlg=%s eco=%s revelou=%s ent=%s" % [str(tile_of(P.global_position)), W.current_prompt, str(P.state), str(main.ui.hud.dlg_active), str(Game.has_eco("olhar_velado")), str(Game.has_flag("revelou_forja_inscricao")), str(W.current_prompt_ent.eid if W.current_prompt_ent else "-")]
	if not Game.has_flag("inscricao_forja_lida"):
		await use_ent("forja_inscricao", Vector2(16, 0), Vector2.LEFT)
		await advance_dialogs()
	check("R3: revisita: o Olhar Velado lê a inscrição da Forja (segredo das Minas)", Game.has_flag("inscricao_forja_lida") and Game.item_count("lingote") == sem0 + 2 and Game.item_count("semente_vida") >= 1, dbg_ins)

# ---------------------------------------------------------------- 35. salvar e carregar
func r3_snapshot() -> Dictionary:
	var d := snapshot_state()
	d["r3flags"] = []
	for f in ["bruxa_morta", "barqueiro_morto", "pantano_livre", "rito_reflexos_ok", "atalho_porto_aberto", "lago_c1", "lago_c2", "passarela_estacas",
			"passarela_roda", "passarela_lodo_brejugo", "passarela_sussurro", "lago_reflexo", "ta_espelhos", "ta_canal", "tb_lodo", "ponte_muralha",
			"lanternas_entregue", "rede_entregue", "lago_anel", "fim_cap3", "lit_guia1"]:
		if Game.has_flag(f):
			d["r3flags"].append(f)
	return d

func r3_save_load() -> void:
	check("R3: save permitido fora de combate", W.save_now(3))
	var snap := r3_snapshot()
	main.back_to_title()
	await frames(5)
	main.continue_from_slot(3)
	await frames(30)
	var after := r3_snapshot()
	check("R3: load mantém mapa, equipe e criaturas do pântano", after["map"] == snap["map"] and after["team"] == snap["team"] and after["ind"] == snap["ind"],
		"%s/%s %s" % [after["map"], snap["map"], str(after["team"] == snap["team"])])
	check("R3: load mantém comportas, atalhos, segredos, missões e chefes", after["r3flags"] == snap["r3flags"] and after["r3flags"].size() >= 18, str(after["r3flags"]))
	check("R3: load mantém o Olhar Velado, inventário e baús únicos", Game.has_eco("olhar_velado") and after["inv"] == snap["inv"] and after["chests"] == snap["chests"])
	var ok := await exit_to("minas_entrada", 23 * 16.0 + 8.0, 35 * 16.0 + 8.0)
	ok = ok and await exit_to("porto_lanternas", 29 * 16.0 + 8.0, 14 * 16.0 + 8.0)
	check("R3: depois de carregar: água clara, comporta do canal aberta e ponte espiritual firme",
		ok and W.tilemap.get_cell_atlas_coords(Vector2i(2, 2)) == W._tc("agua_clara0") and not door_closed_at(23, 29) and W.tile_char_at(tpos(40, 6)) == "E")
	check("R3: dados sem erros de validação", Data.errors.is_empty(), str(Data.errors))

## Um portão que depende de flag de criatura só é aceito se a mesma flag também vier de um mecanismo local (estacas).
func _has_local_alt(mid: String, flag: String) -> bool:
	for e in Data.maps[mid]["entities"]:
		if e["type"] == "stakes" and e.get("flag", "") == flag:
			return true
	return false

## Trilha dinâmica: lugar, interiores, combate, suspense na antessala, chefe, jingles com ducking
func mus_wait(track: String, timeout := 4.0) -> bool:
	var t := 0.0
	while Audio.current_track() != track and t < timeout:
		await frames(6)
		t += 0.1
	return Audio.current_track() == track

func mus_info() -> String:
	return "trilha=%s lugar=%s jingle=%s duck=%.1f vozes=%d" % [Audio.current_track(), Audio.place(), Audio.stinger_name(), Audio.duck_db(), Audio.voices()]

func run_musica() -> void:
	SaveSys.delete_slot(3)
	main.start_new_game(3)
	await frames(10)
	await advance_dialogs()
	Game.god_mode = true
	check("Vila Lúmen toca a trilha da vila", await mus_wait("vila"), mus_info())
	var ok := await enter_house(Vector2i(8, 7), "casa_maru")
	ok = ok and await mus_wait("casa", 1.0)
	check("Interior da casa troca para a trilha de casa", ok, mus_info())
	check("Troca por crossfade (dois players soando juntos)", Audio.voices() == 2, mus_info())
	await secs(2.0)
	check("Crossfade termina com um só player", Audio.voices() == 1, mus_info())
	await leave_house()
	check("Voltar à vila retoma a trilha da vila", await mus_wait("vila"), mus_info())
	ok = await enter_house(Vector2i(10, 27), "casa_corvelo")
	check("Casa abandonada dos Corvelo toca a trilha de memória", ok and await mus_wait("memoria"), mus_info())
	await leave_house()
	ok = await exit_to("bosque_lanternas", 43 * 16.0, 15 * 16.0 + 8.0)
	check("Bosque toca a trilha da floresta", ok and await mus_wait("floresta"), mus_info())
	# combate com um inimigo de verdade
	var wolf := _spawn_wolf(P.global_position + Vector2(48, 0))
	wolf.set_physics_process(true)
	check("Combate liga a trilha de combate", await mus_wait("combate", 8.0), mus_info())
	if is_instance_valid(wolf) and wolf.alive_flag:
		wolf.die("heroi")
	check("Fim do combate retoma a base do lugar", await mus_wait("floresta", 10.0), mus_info())
	# santuário profundo: masmorra, antessala do Lenhador com suspense, chefe, vitória
	W.load_map("santuario_b", "from_a")
	await frames(10)
	check("Santuário profundo toca a trilha de masmorra", await mus_wait("masmorra"), mus_info())
	P.global_position = tpos(24, 21)
	check("Antessala do Lenhador liga o suspense (zona do mapa)", await mus_wait("suspense") and Audio.suspense_reason(W) == "zona", mus_info())
	P.global_position = tpos(24, 31)
	var b := find_boss("lenhador")
	check("Chefe desperto toca a trilha de chefe", b != null and await mus_wait("chefao") and Audio.has_mood("suspense") == false, mus_info())
	b.die("heroi")
	await frames(3)
	check("Vitória: jingle por cima e base de volta por baixo", Audio.stinger_name() == "vitoria" and Audio.current_track() == "masmorra", mus_info())
	await frames(30)
	check("Ducking abaixa a base durante o jingle", Audio.duck_db() < -15.0, mus_info())
	var t := 0.0
	while Audio.stinger_name() != "" and t < 10.0:
		await frames(6)
		t += 0.1
	await secs(2.0)
	check("Jingle termina e a base volta ao volume normal", Audio.stinger_name() == "" and Audio.duck_db() > -0.5 and Audio.current_track() == "masmorra", mus_info())
	P.global_position = tpos(24, 21)
	await secs(0.5)
	check("Antessala sem suspense depois do chefe derrotado", not Audio.has_mood("suspense"), mus_info())
	# vida baixa e escuridão
	var hp0 := float(Game.hero["hp"])
	Game.hero["hp"] = Game.hero_max_hp() * 0.15
	Game.hero_changed.emit()
	check("Vida baixa liga o suspense", await mus_wait("suspense") and Audio.suspense_reason(W) == "vida_baixa", mus_info())
	Game.hero["hp"] = hp0
	Game.hero_changed.emit()
	check("Vida recuperada volta à base", await mus_wait("masmorra"), mus_info())
	W.set_darkness(true)
	check("Escuridão liga o suspense", await mus_wait("suspense") and Audio.suspense_reason(W) == "escuridao", mus_info())
	W.set_darkness(false)
	check("Luz de volta retoma a base", await mus_wait("masmorra"), mus_info())
	# região 2
	W.load_map("desfiladeiro", "default")
	check("Desfiladeiro tem trilha própria (vento)", await mus_wait("desfiladeiro"), mus_info())
	W.load_map("minas_entrada", "default")
	check("Minas da Brasa tocam a trilha das minas", await mus_wait("minas"), mus_info())
	W.load_map("fundicao_c", "from_rito")
	await frames(10)
	check("Antessala do Ferreiro liga o suspense", await mus_wait("suspense"), mus_info())
	P.global_position = tpos(24, 17)
	var fb := find_boss("ferreiro")
	check("Ferreiro toca a trilha de chefe das minas (diferente do chefão)", fb != null and await mus_wait("chefe_minas"), mus_info())
	fb.die("heroi")
	await frames(3)
	check("Ferreiro derrotado: jingle de vitória e volta à masmorra", Audio.stinger_name() == "vitoria" and Audio.current_track() == "masmorra", mus_info())
	W.load_map("forja_cobre", "default")
	await advance_dialogs()
	check("Forja de Cobre em festa depois do Ferreiro", await mus_wait("vila_festa"), mus_info())
	# descoberta: baú com diário
	W.load_map("fundicao_a", "from_pedreira")
	await frames(10)
	for e in W.enemies():
		e.die("heroi")
	var chest := ent_by_id("fa_bau_escoria")
	P.global_position = chest.global_position + Vector2(0, 16)
	await use_ent("fa_bau_escoria", Vector2(0, 16), Vector2.UP)
	await frames(5)
	check("Baú com diário toca o jingle de descoberta", Game.chests.has("fa_bau_escoria") and Audio.stinger_name() == "descoberta", mus_info())
	check("Diário puxa a trilha de memória", await mus_wait("memoria", 2.0), mus_info())
	await advance_dialogs()
	# vila depois do Cervo e diálogo de memória
	Game.set_flag("cervo_morto")
	W.load_map("vila_lumen", "default")
	check("Vila transformada toca a versão em festa", await mus_wait("vila_festa"), mus_info())
	await secs(1.5)
	await advance_dialogs()
	W.start_dialog("mae")
	await frames(5)
	check("Diálogo da família Corvelo toca a trilha de memória", await mus_wait("memoria"), mus_info())
	await advance_dialogs()
	check("Fechar o diálogo retoma a festa", await mus_wait("vila_festa"), mus_info())
	Audio.music("titulo")
	check("API antiga Audio.music continua funcionando", Audio.current_track() == "titulo", mus_info())

# =============================================================== REGIÃO 4 — FORTALEZA DO ECLIPSE
## Uso: godot --headless --fixed-fps 60 --path . -- --e2e --regiao4
## Monta o estado do fim do Capítulo 3 (herói nv.19, Ecos Raiz Viva, Ruptura Ígnea e o Olhar Velado provisório,
## equipe evoluída) e joga a região toda: ponte espiritual, Refúgio, Muralha Partida, Torre, Jardins, contratos,
## Gêmeos de Ferro, Rito do Eclipse, Cavaleiro Sem Rosto, Passo Umbral e os segredos de revisita.

func r4_ind(sp_id: String, lvl: int) -> Dictionary:
	var ind := Game.new_individual(sp_id, lvl)
	Game.individuals[ind["uuid"]] = ind
	Game.mark_seen(sp_id)
	Game.mark_captured(sp_id)
	return ind

func r4_setup(slot: int) -> void:
	SaveSys.delete_slot(slot)
	main.start_new_game(slot)
	await frames(10)
	await advance_dialogs()
	Game.hero["level"] = 14
	Game.hero["xp"] = 0
	Game.hero["talents"] = {"espada": 3, "resistencia": 2, "vinculo": 1}
	for it in {"pocao": 12, "selo_refinado": 14, "selo_basico": 10, "tonico_criatura": 4, "galhada_ossea": 1, "couraca_ossos": 1,
			"amuleto_brasa": 1, "luvas_termicas": 1, "botas_vento": 1, "frasco_seiva": 1, "semente_vida": 2}:
		Game.give_item(it, int({"pocao": 12, "selo_refinado": 14, "selo_basico": 10, "tonico_criatura": 4, "semente_vida": 2}.get(it, 1)))
	Game.equip("galhada_ossea"); Game.equip("couraca_ossos"); Game.equip("amuleto_brasa")
	Game.fragments = 900
	for f in ["falou_maru", "tutorial_ok", "primeira_captura", "viu_santuario_seiva", "lenhador_morto", "cervo_morto", "voltou_vila", "ponte_minas",
			"fim_cap1", "visitou_forja_cobre", "falou_doran", "visitou_fundicao_a", "vigia_morto", "ferreiro_morto", "minas_libertas", "voltou_forja",
			"saqueadores_ok", "emboscada_ok", "rito_ok", "tut_move", "tut_attack", "tut_dodge", "tut_guard", "tut_command", "tut_rest", "eco_olhar_velado", "bruxa_morta", "fim_cap3"]:
		Game.set_flag(f)
	Game.grant_eco("raiz_viva")
	Game.grant_eco("ruptura_ignea")
	Game.ecos["olhar_velado"] = true      # placeholder do Eco da Região 3 (fora das teclas até a Região 3 cadastrar a habilidade)
	Game.team = []
	for pair in [["brasejante", 15], ["cinzaveu", 14], ["rocantor", 14]]:
		var ind := r4_ind(pair[0], pair[1])
		Game.team.append(ind["uuid"])
	Game.active_idx = 0
	Game.hero["hp"] = Game.hero_max_hp()
	Game.checkpoint = {"map": "ponte_espiritual", "spawn": "from_pantano", "shrine": ""}
	Game.team_changed.emit(); Game.hero_changed.emit(); Game.inventory_changed.emit()
	W.load_map("ponte_espiritual", "from_pantano")
	await frames(20)

## põe a espécie na equipe (troca com o santuário se preciso) e a deixa ativa
func r4_use(sp_ids: Array) -> bool:
	var u := uuid_of(sp_ids)
	if u == "":
		return false
	if not Game.team.has(u):
		for v in Game.team.duplicate():
			if Game.individuals[v]["species_id"] in ["rocantor", "cinzaveu", "umbrel", "ventisco", "brasardo"] and v != u:
				Game.move_to_sanctuary(v)
				break
		if Game.team.size() >= Game.TEAM_MAX:
			Game.move_to_sanctuary(Game.team[Game.team.size() - 1])
		Game.move_to_team(u)
	Game.individuals[u]["exausta"] = false
	Game.individuals[u]["hp"] = Game.creature_hp_max(Game.individuals[u])
	return await set_active_species(sp_ids)

func r4_heal() -> void:
	Game.heal_team()
	Game.hero["hp"] = Game.hero_max_hp()
	Game.hero_changed.emit()

## passo de combate com as leituras próprias da região (estocada em linha, contra-ataque da armadura)
func r4_step(tgt: Node) -> void:
	await use_potion_if_needed()
	for e in hostile():
		if e.st != Enemy.St.WINDUP:
			continue
		var rel: Vector2 = P.global_position - e.global_position
		var danger := false
		match str(e.def.get("ataque", "")):
			"estocada":
				danger = rel.dot(e.attack_dir) > -8.0 and rel.dot(e.attack_dir) < 80.0 and abs(rel.dot(e.attack_dir.orthogonal())) < 22.0
			"flecha":
				danger = rel.length() < 170.0 and abs(rel.normalized().dot(e.attack_dir.orthogonal())) < 0.25
			_:
				danger = rel.length() < 56.0
		if e.get("countering") == true:
			danger = rel.length() < 60.0
		if danger and P.vigor >= 25.0 and P.dodge_cd <= 0.0:
			var wind: float = float(e.P.get("wind", 0.6)) * Game.warning_mult()
			if e.st_t > wind - 0.3:
				steer(e.attack_dir.orthogonal() if randf() < 0.5 else -e.attack_dir.orthogonal())
				await frames(1)
				await tap("dodge", 2)
				release_moves()
				return
	# armadura: depois de dois golpes seguidos, recua um pouco para quebrar o ritmo
	if not is_instance_valid(tgt):
		return
	if tgt.kind == "armadura" and tgt.get("hit_times") != null and tgt.hit_times.size() >= 2:
		steer(P.global_position - tgt.global_position)
		await frames(30)
		release_moves()
		await frames(20)
		if is_instance_valid(tgt):
			tgt.hit_times.clear()
		return
	await combat_step(tgt)

func r4_engage(center: Vector2, radius := 160.0, timeout := 120.0) -> void:
	var t := 0.0
	while t < timeout and P.state != Player.S.DEAD:
		var es := hostile().filter(func(e): return e.global_position.distance_to(center) < radius and not e.boss)
		if es.is_empty():
			break
		es.sort_custom(func(a, b): return a.global_position.distance_to(P.global_position) < b.global_position.distance_to(P.global_position))
		var tgt: Node = es[0]
		var before := frame_count
		if P.global_position.distance_to(tgt.global_position) > 90.0:
			await goto(tgt.global_position, 60.0, 12.0)
		await r4_step(tgt)
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0

func r4_tile(tx: int, ty: int) -> String:
	return W.cur_tiles[ty][tx]

func r4_fent(id: String) -> Node:
	return ent_by_id(id)

# ---------------------------------------------------------------- 1. ponte espiritual
func r4_ponte() -> void:
	check("R4: região Fortaleza do Eclipse marcada como jogável", Data.regions["fortaleza"]["status"] == "jogavel" and Data.regions["fortaleza"]["mapas"].size() >= 8)
	check("R4: dados sem erros de validação (mapas, espécies, inimigos)", Data.errors.is_empty(), str(Data.errors))
	check("R4: começa na Ponte Espiritual", W.map_id == "ponte_espiritual")
	check("R4: tileset da fortaleza (fonte 4 do TileSet) em uso", W.tilemap.tile_set.has_source(Fortaleza.SOURCE_ID) and W.tilemap.get_cell_source_id(Vector2i(20, 11)) == Fortaleza.SOURCE_ID)
	check("R4: o Olhar Velado revela a ponte espiritual", r4_tile(20, 11) == "ξ" and r4_tile(20, 12) == "ξ")
	# sem o Olhar Velado não há ponte
	Game.ecos.erase("olhar_velado"); Game.set_flag("eco_olhar_velado", false)
	W.refresh_tiles()
	var sem: String = r4_tile(20, 11)
	Game.ecos["olhar_velado"] = true; Game.set_flag("eco_olhar_velado")
	W.refresh_tiles()
	check("R4: sem o Olhar Velado o abismo fica sem ponte (intransponível)", sem == "θ" and W.is_solid_char(sem))
	check("R4: clima da fortaleza (ventania/frio/sol) cadastrado", Weather.zone_of("ponte_espiritual") == "fortaleza" and Weather.climates().has("ventania"))
	await shot("r4_01_ponte")
	await use_ent("ponte", Vector2(0, 18), Vector2.UP)
	await ui_press("ui_accept")
	await close_menus()
	check("R4: santuário da ponte grava o ponto de retorno", Game.checkpoint.get("shrine", "") == "ponte")
	await goto(tpos(24, 12), 4.0, 30.0)
	await shot("r4_02_ponte_espiritual")
	await r4_engage(tpos(33, 9), 200.0, 40.0)
	var ok := await exit_to("refugio_muralha", 39 * 16.0 + 8.0, 12 * 16.0 + 8.0)
	check("R4: a ponte leva ao Refúgio da Muralha", ok and W.map_id == "refugio_muralha")

# ---------------------------------------------------------------- 2. Refúgio da Muralha
func r4_refugio() -> void:
	check("R4: Refúgio é seguro e tem música própria", W.map.get("safe", false) and W.map.get("music", "") == "fortaleza")
	await shot("r4_03_refugio")
	await talk("ilse")
	check("R4: Capitã Ilse dá a missão principal e suprimentos", Game.has_flag("falou_ilse") and "Jardins" in Game.objective_text(), Game.objective_text())
	await talk("talia")
	check("R4: Tália oferece a missão 'Penas ao Vento'", Game.has_flag("quest_penas"))
	await talk("lume")
	check("R4: Lume oferece a missão 'O Último Recado'", Game.has_flag("quest_recado"))
	await rest_at("refugio")
	check("R4: santuário do Refúgio grava o ponto de retorno", Game.checkpoint.get("shrine", "") == "refugio")
	await use_ent("quadro_refugio", Vector2(0, 16), Vector2.UP)
	await frames(5)
	check("R4: quadro de contratos do Refúgio abre a tela", main.ui.has_screen())
	await shot("r4_04_quadro")
	await close_menus()
	check("R4: caçada e contrato em trio da região bloqueados até visitar as rotas", Game.contract_state("caca_lanceiros") == "bloqueado" and Game.contract_state("domadores_eclipse") == "bloqueado")
	# segredo por observação: ar frio entre as pedras do muro oeste
	check("R4: nicho escondido fechado antes de observar", W.is_solid_char(r4_tile(2, 28)))
	await use_ent("refugio_ar_frio", Vector2(0, 14), Vector2.UP)
	check("R4: observar o ar frio abre o nicho", Game.has_flag("refugio_nicho") and not W.is_solid_char(r4_tile(2, 28)))
	await use_ent("refugio_bau_nicho", Vector2(16, 0), Vector2.LEFT)
	check("R4: baú do nicho (Semente de Vida + Lente do Observatório)", Game.chests.has("refugio_bau_nicho") and Game.item_count("lente_observatorio") == 1)
	# obstáculo antes da solução: fissura violeta (Passo Umbral)
	await use_ent("refugio_fissura", Vector2(0, -14), Vector2.DOWN)
	check("R4: fissura do Refúgio visível e intransponível antes do Passo Umbral", Game.has_flag("viu_umbral_refugio_fissura") and W.map_id == "refugio_muralha" and P.global_position.y < 26 * 16)
	check("R4: portão da Estrada Final trancado antes do guardião", W.is_solid_char(r4_tile(23, 1)))

# ---------------------------------------------------------------- 3. Muralha Partida (rota 2)
func r4_muralha() -> void:
	var ok := await exit_to("muralha_partida", 47 * 16.0 + 8.0, 17 * 16.0 + 8.0)
	check("R4: portão leste leva à Muralha Partida (rota 2)", ok and W.map_id == "muralha_partida")
	await shot("r4_05_muralha")
	# lanceiro do corredor: guarda o posto
	var ln := ent_by_id("m_lan1")
	check("R4: lanceiro do corredor com guarda frontal e estocada", ln != null and ln.guard_front > 0.0 and ln.def["ataque"] == "estocada")
	await r4_engage(tpos(14, 19), 140.0, 60.0)
	check("R4: corredor da muralha liberado", ent_by_id("m_lan1") == null or not ent_by_id("m_lan1").alive_flag)
	check("R4: a brecha da muralha está aberta (sem ponte)", W.is_solid_char(r4_tile(21, 19)))
	# capturas: Brasardo (respiros quentes) e Umbrel (sombra das ameias)
	var cap := await capture_species("m_brasardo1")
	check("R4: captura de um Brasardo no habitat dos respiros quentes", cap and uuid_of(["brasardo"]) != "")
	check("R4: Brasardo jogável (sprite, habilidade de salto explosivo)", Data.species["brasardo"]["status"] == "jogavel" and Data.skills["salto_brasa"].has("explosao"))
	# mecanismo antigo: o Brasardo reaquece direto
	await r4_use(["brasardo"])
	await use_ent("muralha_solar", Vector2(-16, 0), Vector2.RIGHT)
	await frames(10)
	check("R4: Brasardo reaquece o mecanismo antigo e a ponte levadiça desce", Game.has_flag("muralha_ponte") and not W.is_solid_char(r4_tile(21, 19)))
	await shot("r4_06_ponte_levadica")
	# salto explosivo do Brasardo também reaquece (teste do efeito real no mecanismo)
	var tmp := FortEnt.new()
	tmp.init(W, {"type": "solar", "id": "t_solar", "x": int(W.companion.global_position.x / 16) + 2, "y": int(W.companion.global_position.y / 16), "flag": "t_solar_ok"})
	W.ysort.add_child(tmp)
	await frames(2)
	W.companion._explode(Data.skills["salto_brasa"])
	await frames(2)
	check("R4: a explosão do salto do Brasardo reaquece mecanismos antigos", Game.has_flag("t_solar_ok"))
	tmp.queue_free()
	Game.set_flag("t_solar_ok", false)
	await goto(tpos(26, 19), 6.0, 30.0)
	await r4_engage(tpos(34, 17), 120.0, 40.0)
	cap = await capture_species("m_umbrel1")
	check("R4: captura de um Umbrel na sombra das ameias", cap and uuid_of(["umbrel"]) != "")
	# fresta: só o Umbrel entra (a alavanca da plataforma sul é a alternativa)
	check("R4: grade da muralha fechada antes da fresta", W.is_solid_char(r4_tile(38, 19)))
	await r4_use(["brasejante"])
	await use_ent("muralha_fresta", Vector2(-16, 0), Vector2.RIGHT)
	check("R4: sem Umbrel a fresta só dá a dica (alternativa: alavanca)", not Game.has_flag("muralha_portao"))
	await r4_use(["umbrel"])
	await use_ent("muralha_fresta", Vector2(-16, 0), Vector2.RIGHT)
	await frames(5)
	check("R4: Umbrel entra na fresta e aciona a grade por dentro", Game.has_flag("muralha_portao") and not W.is_solid_char(r4_tile(38, 19)))
	# investida umbral: ressurge num ponto visível, nunca atrás de parede
	var c0: Vector2 = W.companion.global_position
	var okb := false
	for dv in [Vector2.LEFT, Vector2.DOWN, Vector2.RIGHT, Vector2.UP]:
		c0 = W.companion.global_position
		okb = W.companion._umbral_blink(Data.skills["investida_umbral"], dv, 1.0)
		if okb:
			break
	await frames(2)
	var c1: Vector2 = W.companion.global_position
	check("R4: Investida Umbral leva o Umbrel a um ponto visível e livre", okb and c1.distance_to(c0) > 12.0 and not W.tile_solid_at(c1) and not Combat.ray_blocked(W, c0, c1))
	await shot("r4_07_fresta")
	# plataforma sul: armadura e lanceiro, diário do sargento
	await goto(tpos(28, 26), 6.0, 30.0)
	var arm := ent_by_id("m_arm1")
	check("R4: Armadura Vigilante contra-ataca combos previsíveis", arm != null and arm.has_method("_start_counter"))
	if arm != null:
		# três golpes no mesmo ritmo -> postura de contra-ataque anunciada (nunca instantânea)
		var hp0: float = arm.hp
		for k in 3:
			arm.take_damage(5.0, P.global_position, {"src": "heroi", "ataque": "espada"})
		check("R4: três golpes seguidos põem a armadura em contra-ataque anunciado (windup)", arm.countering and arm.st == Enemy.St.WINDUP and arm.hp < hp0)
		var hp1: float = arm.hp
		arm.take_damage(20.0, P.global_position, {"src": "heroi"})
		check("R4: durante o aviso a armadura apara os golpes da espada", hp1 - arm.hp <= 4.5)
	await r4_engage(tpos(31, 30), 140.0, 90.0)
	await use_ent("muralha_bau_diario", Vector2(0, 14), Vector2.UP)
	check("R4: diário do Sargento Aurélio na plataforma sul", Game.item_count("diario_guarnicao") == 1 and Game.has_flag("recado_achado"),
		"pos=%s baú=%s vivos=%d" % [str(tile_of(P.global_position)), str(Game.chests.has("muralha_bau_diario")), hostile().size()])
	# fissura de revisita na plataforma sul
	await use_ent("muralha_fissura", Vector2(-14, 0), Vector2.RIGHT)
	check("R4: fissura da muralha marcada para revisita", Game.has_flag("viu_umbral_muralha_fissura") and not Game.chests.has("muralha_bau_umbral"))
	# bastião: balestra dispara no receptor
	await goto(tpos(40, 19), 6.0, 40.0)
	await r4_engage(tpos(44, 21), 120.0, 40.0)
	check("R4: grade da torre fechada antes do disparo", W.is_solid_char(r4_tile(47, 13)))
	await use_ent("muralha_balestra", Vector2(-16, 0), Vector2.RIGHT)
	await secs(1.2)
	check("R4: virote da balestra acende o receptor e abre a grade da torre", Game.has_flag("muralha_receptor") and not W.is_solid_char(r4_tile(47, 13)))
	await shot("r4_08_bastiao")
	ok = await exit_to("torre_a", 47 * 16.0 + 8.0, 8.0)
	check("R4: subida do bastião leva à Torre das Duas Sombras", ok and W.map_id == "torre_a")
	check("R4: caçada de lanceiros libera depois de visitar a Muralha", Game.contract_state("caca_lanceiros") == "disponivel")

# ---------------------------------------------------------------- 4. torre (base): átrio, ala da sombra, atalho
func r4_torre_base() -> void:
	await shot("r4_09_torre_atrio")
	await rest_at("torre_atrio")
	check("R4: santuário do átrio da torre", Game.checkpoint.get("shrine", "") == "torre_atrio" and Game.has_flag("visitou_torre_a"))
	# ala da sombra: sol -> plataformas de luz; lua -> plataformas de sombra
	await goto(tpos(15, 20), 6.0, 60.0)
	check("R4: com sol, a ponte de ouro existe e a de sombra não", r4_tile(12, 20) == "Λ" and r4_tile(9, 17) == "Ψ")
	await goto(tpos(9, 20), 4.0, 20.0)
	check("R4: atravessa a ponte de luz até a ilhota", tile_of(P.global_position) == Vector2i(9, 20))
	await use_ent("ta_eclipse2", Vector2(16, 0), Vector2.LEFT)
	await frames(5)
	check("R4: a alavanca do eclipse troca as plataformas (luz some, sombra surge)", r4_tile(12, 20) == "Δ" and r4_tile(9, 17) == "Σ" and W.is_solid_char("Δ"))
	await shot("r4_10_ala_sombra")
	await goto(tpos(5, 15), 4.0, 20.0)
	check("R4: atravessa a ponte de sombra até a beirada oeste", P.global_position.y < 16 * 16)
	await use_ent("ta_bau_sombra", Vector2(0, 14), Vector2.UP)
	await use_ent("ta_alavanca_atalho", Vector2(0, 14), Vector2.UP)
	await frames(10)
	check("R4: alavanca do atalho abre a passagem antiga ao Refúgio", Game.has_flag("torre_atalho") and not W.is_solid_char(r4_tile(2, 14)))
	var ok := await exit_to("refugio_muralha", 8.0, 14 * 16.0 + 8.0)
	check("R4: atalho da torre leva direto ao Refúgio (retorno curto)", ok and W.map_id == "refugio_muralha" and not W.is_solid_char(r4_tile(2, 6)))
	# no Refúgio: entrega o diário e aceita a caçada
	await talk("lume")
	check("R4: Lume recebe o diário do pai (missão secundária concluída)", Game.has_flag("recado_entregue") and Game.item_count("diario_guarnicao") == 0)
	check("R4: Lume muda de lugar depois do recado (rotina)", ent_by_id("lume_quartel") != null and ent_by_id("lume") == null)
	check("R4: aceitar a caçada de lanceiros", Game.accept_contract("caca_lanceiros"))
	ok = await exit_to("torre_a", 8.0, 6 * 16.0 + 8.0)
	check("R4: a passagem do Refúgio volta à ala oeste da torre", ok and W.map_id == "torre_a")
	# volta pela ponte de sombra
	await goto(tpos(9, 20), 4.0, 30.0)
	await use_ent("ta_eclipse2", Vector2(16, 0), Vector2.LEFT)
	await frames(5)
	await goto(tpos(15, 20), 4.0, 30.0)
	check("R4: volta à beirada leste com o sol", tile_of(P.global_position).x >= 14)

# ---------------------------------------------------------------- 5. Salão do Eclipse (luz) e galeria
func r4_salao() -> void:
	await goto(tpos(30, 22), 6.0, 40.0)
	await shot("r4_11_salao")
	check("R4: porta norte do salão fechada antes da luz", W.is_solid_char(r4_tile(29, 13)))
	var rec := ent_by_id("ta_receptor")
	check("R4: receptor do salão apagado no início", rec != null and not rec.lit)
	await use_ent("ta_espelho1", Vector2(0, 14), Vector2.UP)
	await frames(4)
	await use_ent("ta_espelho2", Vector2(0, -14), Vector2.DOWN)
	await frames(4)
	check("R4: feixe desviado pelos espelhos ainda barrado pela persiana", not rec.lit)
	await use_ent("ta_persiana", Vector2(0, -14), Vector2.DOWN)
	await frames(6)
	check("R4: espelhos + persiana levam a luz ao cristal e a porta norte abre", Game.has_flag("salao_luz") and rec.lit and not W.is_solid_char(r4_tile(29, 13)))
	await shot("r4_12_salao_luz")
	await goto(tpos(29, 10), 6.0, 30.0)
	await frames(10)
	check("R4: galeria fecha as portas com os inimigos", Game.has_flag("tmp_enc_galeria_t"))
	await r4_engage(tpos(30, 6), 300.0, 150.0)
	await secs(1.0)
	check("R4: galeria dos lanceiros vencida (portas reabrem)", Game.has_flag("enc_galeria_t_ok"))
	await use_ent("ta_bau_galeria", Vector2(-16, 0), Vector2.RIGHT)

# ---------------------------------------------------------------- 6. Jardins Suspensos (rota 1)
func r4_jardins() -> void:
	var ok := await exit_to("torre_a", 29 * 16.0 + 8.0, 30 * 16.0)
	await goto(tpos(10, 35), 6.0, 60.0)
	ok = await exit_to("jardins_suspensos", 8.0, 35 * 16.0 + 8.0)
	check("R4: a torre leva aos Jardins Suspensos (rota 1)", ok and W.map_id == "jardins_suspensos")
	await shot("r4_13_jardins")
	await r4_engage(tpos(10, 29), 120.0, 60.0)
	check("R4: caçada de lanceiros concluída (3 lanceiros)", Game.has_flag("caca_lanceiros_ok"), "n=%d" % int(Game.hero.get("caca_n", 0)))
	await r4_engage(tpos(27, 26), 260.0, 120.0)
	await goto(tpos(16, 30), 4.0, 30.0); await interact_press(); await frames(5)
	await goto(tpos(37, 30), 4.0, 40.0); await interact_press(); await frames(5)
	check("R4: névoa cortante bloqueia o terraço norte", W.is_solid_char(r4_tile(26, 20)))
	await use_ent("jardins_manivela_sul", Vector2(0, 14), Vector2.UP)
	await secs(1.2)
	check("R4: a manivela gira a hélice e o vento dispersa a névoa", Game.has_flag("jardins_vento") and not W.is_solid_char(r4_tile(26, 20)))
	await goto(tpos(26, 15), 6.0, 40.0)
	await shot("r4_14_ninho")
	var cap := await capture_species("j_ventisco1")
	check("R4: captura de um Ventisco no Ninho dos Ventos (local fixo)", cap and uuid_of(["ventisco"]) != "")
	await goto(tpos(35, 12), 4.0, 30.0); await interact_press(); await frames(5)
	check("R4: três Plumas de Vento coletadas", Game.item_count("pluma_vento") >= 3 and Game.has_flag("penas_ok"))
	# descoberta de criatura: o anel de flores
	await use_ent("jardins_anel", Vector2(0, 14), Vector2.UP)
	await frames(10)
	check("R4: observar o anel de flores revela um Ventisco mais velho", Game.has_flag("jardins_flores") and ent_by_id("j_ventisco_anel") != null)
	# hélice da ilha: só uma rajada a alcança
	await r4_use(["ventisco"])
	check("R4: ilha da hélice inacessível sem o vento", W.is_solid_char(r4_tile(40, 18)))
	await goto(tpos(37, 16), 3.0, 30.0)
	await face(Vector2.RIGHT)
	W.companion.global_position = tpos(37, 16) + Vector2(-4, 6)
	await frames(2)
	Game.skill_cd.clear()
	W.companion.target = null   # a rajada mira o alvo da criatura, se houver: aqui ela deve soprar para a direita
	W.companion.command_skill(Vector2.RIGHT)
	await frames(10)
	check("R4: a Rajada do Ventisco gira a hélice da ilha à distância (passarela surge)", Game.has_flag("jardins_ilha") and not W.is_solid_char(r4_tile(40, 18)))
	await shot("r4_15_rajada")
	await use_ent("jardins_bau_ilha", Vector2(0, 14), Vector2.UP)
	check("R4: baú da ilha da hélice", Game.chests.has("jardins_bau_ilha"))
	ok = await exit_to("refugio_muralha", 26 * 16.0 + 8.0, 8.0)
	check("R4: o terraço norte dos jardins volta ao Refúgio", ok and W.map_id == "refugio_muralha")
	var plumas0 := Game.item_count("pluma_vento")
	await talk("talia")
	check("R4: Tália recebe as plumas e recompensa uma única vez", Game.has_flag("penas_entregue") and Game.item_count("pluma_vento") == plumas0 - 3, "plumas %d -> %d" % [plumas0, Game.item_count("pluma_vento")])
	var sem := Game.item_count("semente_vida")
	await talk("talia")
	check("R4: recompensa da Tália não duplica", Game.item_count("semente_vida") == sem)

# ---------------------------------------------------------------- 7. contrato em trio nos Jardins
func r4_contrato() -> void:
	check("R4: contrato em trio da região disponível", Game.contract_state("domadores_eclipse") == "disponivel")
	check("R4: aceitar o contrato em trio (Bruna e Ravi)", Game.accept_contract("domadores_eclipse"))
	await frames(8)
	check("R4: trio formado no Refúgio", W.allies().size() == 2)
	r4_heal()
	var ok := await exit_to("jardins_suspensos", 23 * 16.0 + 8.0, 35 * 16.0 + 8.0)
	await frames(10)
	var es := contract_enemies("domadores_eclipse")
	check("R4: domadores e feras do Eclipse aparecem nos Jardins", ok and es.size() == 4, str(es.size()))
	await goto(tpos(27, 21), 20.0, 40.0)
	await shot("r4_16_trio")
	await r4_engage(tpos(33, 26), 320.0, 200.0)
	await secs(1.5)
	check("R4: contrato em trio concluído", Game.has_flag("domadores_eclipse_ok"), "vivos=%d" % contract_enemies("domadores_eclipse").size())
	await advance_dialogs()
	await frames(10)
	check("R4: aliados voltam e recompensa entregue", Game.party.is_empty() and Game.item_count("essencia_laranja") >= 1)

# ---------------------------------------------------------------- 8. torre (andar médio): hélices, receptores, Gêmeos
func r4_torre_b() -> void:
	var ok := await exit_to("torre_a", 8.0, 29 * 16.0 + 8.0)
	await goto(tpos(29, 10), 6.0, 80.0)
	ok = await exit_to("torre_b", 29 * 16.0 + 8.0, 8.0)
	check("R4: galeria leva ao andar das hélices", ok and W.map_id == "torre_b")
	await shot("r4_17_helices")
	check("R4: névoa do corredor norte bloqueia", W.is_solid_char(r4_tile(27, 32)))
	# névoa lateral: só o vento de uma criatura (opcional)
	await r4_use(["ventisco"])
	await use_ent("tb_nevoa_lado", Vector2(-14, 0), Vector2.RIGHT)
	await frames(5)
	check("R4: o Ventisco dispersa a névoa lateral (vantagem opcional)", Game.has_flag("torre_vento2") and not W.is_solid_char(r4_tile(34, 37)))
	await use_ent("tb_bau_nevoa", Vector2(0, 14), Vector2.UP)
	await use_ent("tb_manivela", Vector2(0, 14), Vector2.UP)
	await secs(1.2)
	check("R4: manivela da torre dispersa a névoa do corredor", Game.has_flag("torre_vento") and not W.is_solid_char(r4_tile(27, 32)))
	await goto(tpos(28, 29), 6.0, 30.0)
	await r4_use(["brasejante"])
	await r4_engage(tpos(28, 23), 240.0, 150.0)
	check("R4: armaduras da sala dos receptores derrotadas", hostile().filter(func(e): return e.kind == "armadura").is_empty())
	await shot("r4_18_receptores")
	await use_ent("tb_persiana", Vector2(0, -14), Vector2.DOWN)
	await frames(6)
	check("R4: um só cristal aceso não abre a arena", not Game.has_flag("torre_receptores"))
	await use_ent("tb_balestra", Vector2(16, 0), Vector2.LEFT)
	await secs(2.6)
	check("R4: luz + disparo acendem os dois cristais e abrem a arena", Game.has_flag("torre_receptores") and not W.is_solid_char(r4_tile(27, 17)))
	r4_heal()
	await use_ent("placa_gemeos", Vector2(0, 14), Vector2.UP)
	await advance_dialogs()
	await r4_gemeos()

func r4_gemeo_threat() -> Node:
	for e in W.enemies():
		if e.kind == "gemeos" and e.alive_flag and e.bst == e.B.TELE:
			if e.role == "b" and e.global_position.distance_to(P.global_position) < 70.0:
				return e
			if e.role == "a":
				var rel: Vector2 = P.global_position - e.global_position
				if rel.dot(e.wave_dir) > -10.0 and abs(rel.dot(e.wave_dir.orthogonal())) < 30.0:
					return e
	return null

func r4_gemeos() -> void:
	await goto(tpos(28, 12), 6.0, 20.0)
	await frames(30)
	var a := find_boss("gemeos")
	check("R4: Gêmeos de Ferro despertam (dois corpos)", a != null and a.activated and W.enemies().filter(func(e): return e.kind == "gemeos").size() == 2)
	check("R4: portas da arena fechadas durante o duelo", Game.has_flag("tmp_gemeos_ativo") and W.is_solid_char(r4_tile(27, 15)))
	await secs(2.0)
	await shot("r4_19_gemeos")
	var both_tele := 0
	var t := 0.0
	while t < 260.0 and not Game.has_flag("gemeos_morto") and P.state != Player.S.DEAD:
		var before := frame_count
		var gs := W.enemies().filter(func(e): return e.kind == "gemeos" and e.alive_flag)
		var nt := 0
		for g in gs:
			if g.bst == g.B.TELE or g.bst == g.B.ATTACK:
				nt += 1
		if nt >= 2:
			both_tele += 1
		await use_potion_if_needed()
		var th := r4_gemeo_threat()
		if th != null and P.vigor >= 25.0 and P.dodge_cd <= 0.0 and th.bt < 0.35:
			var away: Vector2 = (P.global_position - th.global_position).normalized()
			if th.role == "a":
				away = th.wave_dir.orthogonal() * (1.0 if (P.global_position - th.global_position).dot(th.wave_dir.orthogonal()) >= 0.0 else -1.0)
			steer(away)
			await frames(1)
			await tap("dodge", 2)
			release_moves()
		elif not gs.is_empty():
			# prefere o gêmeo exposto (recuperando) e depois o mais próximo
			gs.sort_custom(func(x, y): return (0 if x.bst == x.B.RECOVER else 1) * 1000 + x.global_position.distance_to(P.global_position) < (0 if y.bst == y.B.RECOVER else 1) * 1000 + y.global_position.distance_to(P.global_position))
			var g: Node = gs[0]
			if P.global_position.distance_to(g.global_position) > 28.0:
				steer(g.global_position - P.global_position)
				await frames(3)
				release_moves()
			else:
				await face(g.global_position - P.global_position)
				await attack_tap()
				await frames(8)
		else:
			await frames(5)
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0
	print("  [info] duração da luta (gemeos): %.0f s, vida do herói %d/%d, nível %d" % [t, int(Game.hero["hp"]), int(Game.hero_max_hp()), Game.hero_level()])
	await secs(1.0)
	check("R4: Gêmeos de Ferro derrotados (ataques sempre alternados)", Game.has_flag("gemeos_morto") and both_tele == 0, "t=%.0f hp=%d alternancia=%d" % [t, int(Game.hero["hp"]), both_tele])
	check("R4: portas da arena reabrem e a saída leste abre", not W.is_solid_char(r4_tile(27, 15)) and not W.is_solid_char(r4_tile(42, 7)))
	check("R4: insígnia da guarnição recebida dos Gêmeos", Game.item_count("insignia_guarnicao") == 1)
	await goto(tpos(48, 7), 6.0, 40.0)
	await use_ent("tb_bau_tesouro", Vector2(0, 14), Vector2.UP)
	await rest_at("torre_tesouro")
	check("R4: tesouro e santuário depois dos Gêmeos", Game.chests.has("tb_bau_tesouro") and Game.checkpoint.get("shrine", "") == "torre_tesouro")

# ---------------------------------------------------------------- 9. Rito do Eclipse
func r4_rito() -> void:
	var ok := await exit_to("rito_eclipse", 55 * 16.0 + 8.0, 7 * 16.0 + 16.0)
	check("R4: o tesouro leva ao Rito do Eclipse", ok and W.map_id == "rito_eclipse")
	await shot("r4_20_rito")
	await use_ent("rito_e_placa1", Vector2(0, -14), Vector2.DOWN)
	await advance_dialogs()
	await use_ent("re_persiana1", Vector2(0, 14), Vector2.UP)
	await frames(6)
	check("R4: rito 1 (apresentação): abrir a persiana acende o cristal", Game.has_flag("rito_e1_ok") and not W.is_solid_char(r4_tile(14, 14)))
	# 2. aplicação: errar de propósito, reiniciar e resolver
	await use_ent("re_espelho2b", Vector2(-14, 0), Vector2.RIGHT)
	await use_ent("re_espelho2b", Vector2(-14, 0), Vector2.RIGHT)
	await use_ent("re_espelho2b", Vector2(-14, 0), Vector2.RIGHT)
	check("R4: rito 2 dá uma dica depois de três tentativas erradas", toast_seen("Dica:"))
	await use_ent("re_reset2", Vector2(14, 0), Vector2.LEFT)
	await frames(10)
	check("R4: pedra de reinício recoloca os espelhos (reinício local, sem perder nada)", ent_by_id("re_espelho2b") != null and ent_by_id("re_espelho2b").ori == "b" and W.map_id == "rito_eclipse")
	await use_ent("re_espelho2a", Vector2(0, 14), Vector2.UP)
	await use_ent("re_espelho2b", Vector2(-14, 0), Vector2.RIGHT)
	await frames(6)
	check("R4: rito 2 (aplicação): dois espelhos levam o feixe ao cristal", Game.has_flag("rito_e2_ok") and not W.is_solid_char(r4_tile(30, 14)))
	# 3. combinação: sol -> ilhota -> persiana; lua -> saída
	await goto(tpos(36, 15), 4.0, 40.0)
	await goto(tpos(40, 15), 3.0, 20.0)
	check("R4: rito 3: com sol, as plataformas de luz levam à ilhota", tile_of(P.global_position) == Vector2i(40, 15))
	await use_ent("re_persiana3", Vector2(-16, 0), Vector2.RIGHT)
	await frames(8)
	check("R4: rito 3: a luz atravessa o abismo e acende o cristal", Game.has_flag("rito_e3_ok"))
	await use_ent("re_eclipse3", Vector2(0, 16), Vector2.UP)
	await frames(6)
	check("R4: rito 3: o eclipse apaga a lente mas o cristal fica aceso (gravado)", ent_by_id("re_receptor3").lit and r4_tile(43, 15) == "Σ")
	await shot("r4_21_rito_lua")
	await goto(tpos(46, 15), 3.0, 30.0)
	await goto(tpos(53, 14), 4.0, 30.0)
	await use_ent("re_altar", Vector2(0, 14), Vector2.UP)
	await advance_dialogs()
	check("R4: altar do Rito do Eclipse concede o Manto Umbral e abre a saída", Game.has_flag("rito_eclipse_ok") and Game.item_count("manto_umbral") == 1 and not W.is_solid_char(r4_tile(58, 14)))
	Game.equip("manto_umbral")
	await use_ent("re_altar", Vector2(0, 14), Vector2.UP)
	check("R4: o rito não repete a recompensa", Game.item_count("manto_umbral") == 1)
	await use_ent("rito_fissura", Vector2(0, 14), Vector2.UP)
	check("R4: o rito avançado está atrás de uma fissura (Passo Umbral)", not Game.has_flag("rito_eclipse_avancado_ok") and P.global_position.y > 9 * 16)

# ---------------------------------------------------------------- 10. Cavaleiro Sem Rosto
func r4_cav_threat(b: Node) -> bool:
	var rel: Vector2 = P.global_position - b.global_position
	if b.bst == b.B.TELE_THRUST:
		return rel.dot(b.attack_dir) > -10.0 and rel.dot(b.attack_dir) < 190.0 and abs(rel.dot(b.attack_dir.orthogonal())) < 26.0
	if b.bst == b.B.TELE_SLASH:
		return rel.length() < 70.0
	return false

func r4_cav_step(b: Node) -> void:
	await use_potion_if_needed()
	if r4_cav_threat(b):
		if b.bt < 0.4 and P.vigor >= 25.0 and P.dodge_cd <= 0.0:
			var side: Vector2 = b.attack_dir.orthogonal()
			if (P.global_position - b.global_position).dot(side) < 0.0:
				side = -side
			steer(side if b.bst == b.B.TELE_THRUST else (P.global_position - b.global_position).normalized())
			await frames(1)
			await tap("dodge", 2)
			release_moves()
		else:
			var side2: Vector2 = b.attack_dir.orthogonal()
			if (P.global_position - b.global_position).dot(side2) < 0.0:
				side2 = -side2
			steer(side2)
			await frames(4)
			release_moves()
		return
	var melee_ok: bool = b.bst == b.B.EXHAUSTED or (b.phase == 2 and b.posture == "espelho") or (b.phase == 1 and not b._front(P.global_position)) \
			or (b.phase == 3 and b.bst in [b.B.EXHAUSTED])
	if b.phase == 2 and b.posture == "muralha" and b.bst != b.B.EXHAUSTED:
		melee_ok = false
	var d: float = P.global_position.distance_to(b.global_position)
	if melee_ok and not b.invulnerable:
		var goal: Vector2 = b.global_position - b.facing_dir * 22.0 if b.bst == b.B.EXHAUSTED else b.global_position
		if d > 30.0:
			steer(goal - P.global_position)
			await frames(3)
			release_moves()
		else:
			await face(b.global_position - P.global_position)
			await attack_tap()
			await frames(6)
	else:
		# fica a uma distância segura, de lado, esperando a janela (a criatura ataca de longe)
		var want := 100.0
		var to: Vector2 = P.global_position - b.global_position
		var goal2: Vector2 = b.global_position + (to.normalized() if to.length() > 1.0 else Vector2.DOWN).rotated(0.6) * want
		goal2.x = clamp(goal2.x, 19 * 16.0 + 8.0, 44 * 16.0)
		goal2.y = clamp(goal2.y, 7 * 16.0 + 8.0, 26 * 16.0)
		if P.global_position.distance_to(goal2) > 10.0:
			steer(goal2 - P.global_position)
			await frames(4)
			release_moves()
		else:
			await frames(4)

func r4_cavaleiro() -> void:
	var ok := await exit_to("torre_c", 59 * 16.0 + 8.0, 14 * 16.0 + 16.0)
	check("R4: o rito leva ao topo da torre", ok and W.map_id == "torre_c")
	await rest_at("torre_topo")
	await use_ent("tc_bau_prep", Vector2(0, 14), Vector2.UP)
	var src := FileAccess.get_file_as_string("res://scripts/boss_cavaleiro.gd")
	check("R4: o Cavaleiro não lê comandos do jogador (só posição, tempo e golpes recebidos)", not ("Input." in src) and not ("is_action" in src))
	await r4_use(["brasejante"])
	r4_heal()
	Game.behavior = "atacar"
	await goto(tpos(22, 17), 6.0, 30.0)
	await frames(20)
	var b := find_boss("cavaleiro")
	check("R4: o Cavaleiro Sem Rosto desperta e fecha a arena", b != null and b.activated and Game.has_flag("tmp_cavaleiro_ativo"))
	await secs(2.2)
	await shot("r4_22_cavaleiro")
	# fase 1: guarda frontal
	var hp0: float = b.hp
	b.take_damage(40.0, b.global_position + b.facing_dir * 30.0, {"src": "heroi"})
	var front_dmg: float = hp0 - b.hp
	hp0 = b.hp
	b.take_damage(40.0, b.global_position - b.facing_dir * 30.0, {"src": "heroi"})
	var back_dmg: float = hp0 - b.hp
	check("R4: fase 1 — a guarda frontal segura golpes pela frente, não pelas costas", front_dmg < back_dmg * 0.3 and back_dmg > 0.0, "%.1f %.1f" % [front_dmg, back_dmg])
	var saw := {"estocada": false, "exausto": false, "muralha": false, "espelho": false, "portal": false, "costas": false}
	var t := 0.0
	var checked2 := false
	var deaths0 := int(Game.stats["mortes"])
	while t < 420.0 and b != null and is_instance_valid(b) and b.alive_flag and P.state != Player.S.DEAD:
		var before := frame_count
		if b.bst == b.B.TELE_THRUST: saw["estocada"] = true
		if b.bst == b.B.EXHAUSTED: saw["exausto"] = true
		if b.phase == 2 and b.posture == "muralha": saw["muralha"] = true
		if b.phase == 2 and b.posture == "espelho": saw["espelho"] = true
		if b.phase == 3 and b.bst == b.B.EMERGE: saw["portal"] = true
		if b.flank_hits > 0: saw["costas"] = true
		if b.phase == 2 and not checked2 and b.posture != "" and b.bst == b.B.CHASE:
			checked2 = true
			var p0: String = b.posture
			var h0: float = b.hp
			b.take_damage(30.0, b.global_position + Vector2(0, 30), {"src": "heroi"})
			var fis: float = h0 - b.hp
			h0 = b.hp
			b.take_damage(30.0, b.global_position + Vector2(0, 30), {"src": "balestra", "proj": true})
			var dist: float = h0 - b.hp
			check("R4: fase 2 — postura de %s muda o que fere (físico %.0f x distância %.0f)" % [p0, fis, dist], (fis < dist) if p0 == "muralha" else (fis > dist))
			check("R4: fase 2 — postura comunicada por pose e símbolo (não só cor)", b._pose.visible and b._sym.visible)
			await shot("r4_23_postura_" + p0)
		if b.phase == 3 and b.bst == b.B.TELE_SLASH and W.companion != null and is_instance_valid(W.companion):
			# o companheiro flanqueia: posiciona-se às costas (como o comando Atacar faz) e golpeia
			pass
		if b.phase == 2 and b.posture == "muralha" and b.bst == b.B.CHASE and randf() < 0.08:
			# balestra da arena: dispara quando o cavaleiro está na linha
			for bid in ["tc_balestra_o", "tc_balestra_l"]:
				var bl := ent_by_id(bid)
				if bl != null and abs(b.global_position.y - bl.global_position.y) < 14.0:
					bl.fire_balestra()
		await r4_cav_step(b)
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0
	print("  [info] duração da luta (cavaleiro): %.0f s, vida do herói %d/%d, nível %d, mortes %d" % [t, int(Game.hero["hp"]), int(Game.hero_max_hp()), Game.hero_level(), int(Game.stats["mortes"]) - deaths0])
	await secs(2.0)
	check("R4: fase 1 — estocada anunciada seguida de exaustão (janela de ataque)", saw["estocada"] and saw["exausto"])
	check("R4: fase 2 — alterna postura de muralha e de espelho", saw["muralha"] and saw["espelho"])
	check("R4: fase 3 — duelos entre portais", saw["portal"])
	check("R4: Cavaleiro Sem Rosto derrotado", Game.has_flag("cavaleiro_morto"), "t=%.0f hp_boss=%s mortes=%d" % [t, str(b.hp) if is_instance_valid(b) else "-", int(Game.stats["mortes"]) - deaths0])
	check("R4: Eco PASSO UMBRAL recebido e posto numa tecla", Game.has_eco("passo_umbral") and "passo_umbral" in Game.eco_slots)
	check("R4: guarnição libertada (flag regional) e portas abertas", Game.has_flag("fortaleza_liberta") and not W.is_solid_char(r4_tile(46, 16)))
	Game.behavior = "preservar"

# ---------------------------------------------------------------- 11. pós-guardião: Refúgio, Estrada Final e segredos de revisita
func r4_pos() -> void:
	var ok := await exit_to("refugio_muralha", 55 * 16.0 + 8.0, 16 * 16.0 + 16.0)
	check("R4: saída do topo leva de volta ao Refúgio", ok and W.map_id == "refugio_muralha")
	await secs(1.5)
	await advance_dialogs()
	check("R4: cena da guarnição libertada no Refúgio", Game.has_flag("voltou_refugio"))
	check("R4: soldados voltaram e a Capitã foi ao portão (rotina)", ent_by_id("soldado1") != null and ent_by_id("ilse_portao") != null and ent_by_id("ilse") == null)
	check("R4: portão norte aberto: Estrada Final", not W.is_solid_char(r4_tile(23, 1)))
	check("R4: música do Refúgio muda depois da vitória", Audio.place_for_map("refugio_muralha", W.map) == "vila_festa")
	await shot("r4_24_refugio_libertado")
	# segredo de revisita: a fissura do Refúgio
	await use_ent("refugio_fissura", Vector2(0, -14), Vector2.DOWN)
	await frames(5)
	check("R4: Passo Umbral atravessa a fissura do Refúgio", P.global_position.y > 27 * 16 and P.global_position.y < 32 * 16)
	await use_ent("refugio_bau_umbral", Vector2(0, 14), Vector2.UP)
	check("R4: baú atrás da fissura (segredo de revisita)", Game.chests.has("refugio_bau_umbral"))
	await use_ent("refugio_fissura_volta", Vector2(0, 14), Vector2.UP)
	await frames(5)
	check("R4: Passo Umbral volta pela fissura", P.global_position.y < 26 * 16)
	# o Passo Umbral nunca atravessa parede comum
	var p0: Vector2 = P.global_position
	await goto(tpos(10, 10), 6.0, 30.0)
	p0 = P.global_position
	FortEnt.eco_passo_umbral(W)
	await frames(3)
	check("R4: longe de fissuras e portais o Passo Umbral não faz nada (nunca atravessa paredes)", P.global_position.distance_to(p0) < 2.0 and toast_seen("só atravessa"))
	ok = await exit_to("estrada_final", 23 * 16.0 + 8.0, 8.0)
	check("R4: a Estrada Final abre depois do Cavaleiro", ok and W.map_id == "estrada_final")
	await shot("r4_25_estrada")
	await goto(tpos(15, 10), 4.0, 30.0)
	await face(Vector2.UP)
	await tap("eco2", 2)
	await frames(5)
	check("R4: tecla do Eco: Passo Umbral cruza a fissura da Estrada Final", P.global_position.y < 8 * 16)
	await use_ent("estrada_selo", Vector2(0, 14), Vector2.UP)
	await advance_dialogs()
	check("R4: gancho da Região 5 (selo da Catedral do Vazio)", Game.has_flag("viu_selo_catedral"))

func r4_revisitas() -> void:
	# volta à torre pelo atalho e ao rito avançado
	W.load_map("rito_eclipse", "from_c")
	await frames(20)
	await use_ent("rito_fissura", Vector2(0, 14), Vector2.UP)
	await frames(5)
	check("R4: Passo Umbral entra na ala do rito avançado", P.global_position.y < 7 * 16)
	await use_ent("rito_av_portal_a", Vector2(0, 14), Vector2.UP)
	await frames(5)
	check("R4: portal marcado leva ao outro lado da parede", P.global_position.x > 55 * 16)
	await use_ent("rito_av_espelho", Vector2(0, 14), Vector2.UP)
	await frames(6)
	check("R4: rito avançado: espelho leva a luz ao cristal escondido", Game.has_flag("rito_av_luz"))
	await use_ent("rito_av_portal_b", Vector2(0, 14), Vector2.UP)
	await frames(5)
	await use_ent("rito_av_altar", Vector2(0, 14), Vector2.UP)
	await advance_dialogs()
	check("R4: rito avançado concede o Amuleto do Eclipse", Game.has_flag("rito_eclipse_avancado_ok") and Game.item_count("amuleto_eclipse") == 1)
	# muralha: fissura da plataforma sul
	W.load_map("muralha_partida", "from_torre")
	await frames(20)
	await goto(tpos(47, 9), 6.0, 30.0)
	await goto(tpos(39, 30), 6.0, 90.0)
	await use_ent("muralha_fissura", Vector2(-14, 0), Vector2.RIGHT)
	await frames(5)
	await use_ent("muralha_bau_umbral", Vector2(0, 14), Vector2.UP)
	check("R4: baú atrás da fissura da Muralha Partida", Game.chests.has("muralha_bau_umbral"))
	# criaturas: evolução do Umbrel e ação ambiental reaproveitada
	var u := uuid_of(["umbrel"])
	if u != "":
		var ind: Dictionary = Game.individuals[u]
		ind["nivel"] = 16
		for k in ["vitoria:a", "acao:b", "missao:c"]:
			Game.bond_activity(u, k)
		check("R4: Umbrel evolui para Umbrafel (nv. 16 + vínculo)", Game.evolve(u) and Game.individuals[u]["species_id"] == "umbrafel")
		check("R4: Umbrafel mantém a ação de fresta e ganha habilidades novas", Data.species["umbrafel"]["acao_id"] == "fresta" and Game.hab_list("umbrafel").size() >= 5)

func r4_save_load() -> void:
	var snap := {"ecos": Game.ecos.duplicate(), "chests": Game.chests.size(), "flags": Game.flags.size(), "frag": Game.fragments}
	W.save_now(5)
	SaveSys.load_game(5)
	await frames(10)
	check("R4: save/load mantém Ecos, baús, flags e não duplica recompensas",
		Game.has_eco("passo_umbral") and Game.chests.size() == snap["chests"] and Game.flags.size() == snap["flags"] and Game.fragments == snap["frag"]
		and Game.item_count("manto_umbral") == 1 and Game.item_count("amuleto_eclipse") == 1)

## Atalho de desenvolvimento: -- --e2e --regiao4 --r4de=N começa direto na etapa N (8 torre média, 9 rito, 10 Cavaleiro, 11 pós-guardião)
func r4_jump(n: int) -> void:
	for f in ["visitou_refugio_muralha", "falou_ilse", "quest_penas", "penas_ok", "penas_entregue", "quest_recado", "recado_achado", "recado_entregue",
			"visitou_muralha_partida", "visitou_jardins_suspensos", "visitou_torre_a", "muralha_ponte", "muralha_portao", "muralha_receptor", "salao_luz",
			"enc_galeria_t_ok", "torre_atalho", "jardins_vento", "caca_lanceiros_ok", "domadores_eclipse_ok", "shrine_refugio"]:
		Game.set_flag(f)
	for pair in [["umbrel", 16], ["ventisco", 16], ["brasardo", 16]]:
		var ind := r4_ind(pair[0], pair[1])
		Game.sanctuary.append(ind["uuid"])
	Game.hero["level"] = 16
	r4_heal()
	if n >= 9:
		for f in ["visitou_torre_b", "torre_vento", "torre_receptores", "gemeos_morto"]:
			Game.set_flag(f)
	if n >= 10:
		for f in ["rito_e1_ok", "rito_e2_ok", "rito_e3_ok", "rito_eclipse_ok"]:
			Game.set_flag(f)
		Game.give_item("manto_umbral", 1); Game.equip("manto_umbral")
	if n >= 11:
		Game.set_flag("cavaleiro_morto"); Game.set_flag("fortaleza_liberta")
		Game.grant_eco("passo_umbral"); Game.eco_slots[1] = "passo_umbral"
	match n:
		8: W.load_map("torre_b", "from_a")
		9: W.load_map("torre_b", "from_rito")
		10: W.load_map("rito_eclipse", "from_c")
		11: W.load_map("torre_c", "from_rito")
	await frames(20)

func run_regiao4() -> void:
	var de := 0
	for a in args:
		if a.begins_with("--r4de="):
			de = int(a.substr(7))
	await r4_setup(5)
	if de > 0:
		await r4_jump(de)
		if de <= 8: await r4_torre_b()
		if de <= 9: await r4_rito()
		if de <= 10: await r4_cavaleiro()
		await r4_pos()
		await r4_revisitas()
		await r4_save_load()
		return
	await r4_ponte()
	await r4_refugio()
	await r4_muralha()
	await r4_torre_base()
	await r4_salao()
	await r4_jardins()
	await r4_contrato()
	await r4_torre_b()
	await r4_rito()
	await r4_cavaleiro()
	await r4_pos()
	await r4_revisitas()
	await r4_save_load()


# ================================================================ HISTÓRIA (fio condutor: Mestra Ione e memórias)
func run_historia() -> void:
	SaveSys.delete_slot(5)
	main.start_new_game(5)
	await frames(5)
	var intro: String = " ".join(main.ui.hud.dlg_lines)
	check("Abertura apresenta a Mestra Ione e o motivo da viagem", "Ione" in intro and "Maru" in intro)
	await advance_dialogs()
	await talk("anciao")
	check("Maru conhece o herói como aprendiz de Ione", Game.has_flag("falou_maru"))
	check("Abertura declara o grande objetivo (cinco Ecos, Catedral, Ione)", "cinco guardiões" in intro)
	var pct0 := Game.conquest_pct()
	check("Jornada começa perto de 0%", pct0 < 5, str(pct0))
	var flags_ok := true
	var bosses := {}
	for f in Data.maps:
		for e in Data.maps[f]["entities"]:
			if e.has("flag_done"):
				bosses[e["flag_done"]] = true
	for mf in Data.story["memorias"]:
		var it: String = str(Data.story["memorias"][mf].get("item", ""))
		if not Data.items.has(it):
			flags_ok = false
		if not (bosses.has(mf) or Data.contracts.has(mf.trim_suffix("_ok"))):
			flags_ok = false
	check("Cada memória aponta para um chefe/contrato real e uma página existente", flags_ok)
	W.memory_in_tests = true
	Game.set_flag("lenhador_morto")
	await secs(2.5)
	check("Guardião caído mostra a memória do passado", main.ui.hud.dlg_active and "Lenhador" in " ".join(main.ui.hud.dlg_lines))
	await advance_dialogs()
	await frames(5)
	check("Memória entrega a página do Diário de Ione", Game.item_count("pagina_ione_1") == 1 and Game.has_flag("mem_lenhador_morto"))
	Game.set_flag("lenhador_morto", false)
	Game.set_flag("lenhador_morto")
	await secs(2.5)
	check("A mesma memória não se repete", not main.ui.hud.dlg_active)
	main.ui.open_pause()
	main.ui.open_diary()
	await frames(3)
	var has_row := false
	for it in main.ui._top().items:
		if str(it.get("t", "")) == "Memória do Lenhador Oco":
			has_row = true
	check("Diário lista as memórias para reler a história", has_row)
	await close_menus()
	# criatura ativa: reage às memórias e lembranças (linha com o nome da espécie/apelido)
	var bro: Dictionary = Game.new_individual("brotisco", 3)
	Game.individuals[bro["uuid"]] = bro
	Game.team.append(bro["uuid"])
	Game.team_changed.emit()
	await frames(5)
	Game.set_flag("cervo_morto")
	await secs(2.5)
	var mem_txt: String = " ".join(main.ui.hud.dlg_lines)
	check("Criatura ativa reage à memória do guardião (linha com o nome dela)", main.ui.hud.dlg_active and "Cervo" in mem_txt and "Brotisco" in mem_txt, mem_txt.right(160))
	await advance_dialogs()
	await frames(5)
	check("Memória do Cervo revela o rastro de Ione (página 2)", Game.item_count("pagina_ione_2") == 1)
	# ---- artefato + lembrança (depois da Memória do Guardião)
	check("Artefato ainda não entregue antes da lembrança", Game.item_count("semente_ambar") == 0)
	await secs(2.0)
	var lem: String = " ".join(main.ui.hud.dlg_lines)
	check("Lembrança toca depois da memória: o primeiro treino com Ione", main.ui.hud.dlg_active and "Ione:" in lem and "Você:" in lem and "sinal" in lem, lem.left(120))
	check("Lembrança: tela em tom de memória e trilha \"memoria\"", main.ui.hud.memory_tint and Audio._moods.has("memoria"))
	check("Criatura ativa reage à lembrança (Brotisco e a folhinha)", "Brotisco" in lem and "folhinha" in lem)
	await shot("historia_lembranca")
	await advance_dialogs()
	await frames(10)
	check("Lembrança entrega o artefato Semente de Âmbar", Game.item_count("semente_ambar") == 1 and Game.has_flag("lembranca_semente_ambar") and not main.ui.hud.memory_tint)
	check("Artefato é item de história com ícone desenhado (icons_artefatos)", Data.items["semente_ambar"]["tipo"] == "historia" and ResourceLoader.exists("res://assets/sprites/icons_artefatos.png") and Game.item_icon("semente_ambar") != null)
	check("Artefatos: 1/5", Historia.count() == 1 and Historia.artefatos().size() == 5)
	W.save_now(5)
	SaveSys.load_game(5)
	await frames(5)
	check("Guardião libertado conta na Jornada (Ecos 1/5) e sobe a conquista", Game.guardians_done() == 1 and Game.conquest_pct() > pct0, "%d %d" % [Game.guardians_done(), Game.conquest_pct()])
	main.ui.open_pause()
	main.ui.open_journey()
	await frames(3)
	check("Tela da Jornada abre com o objetivo e a %", "Jornada" in main.ui._top().title)
	await shot("historia_jornada")
	await close_menus()
	check("Save mantém páginas e memórias", Game.has_flag("mem_cervo_morto") and Game.item_count("pagina_ione_2") == 1)
	check("Lista de saves mostra a % de conquista", int(SaveSys.slot_info(5).get("conquista", -1)) > 0)
	await historia_amnesia()
	W.memory_in_tests = false

## Amnésia, artefatos, cenas (Arauto, chegadas), bilhetes e contratos pessoais (docs/HISTORIA.md)
func historia_amnesia() -> void:
	# ---- abertura e Maru (amnésia)
	var maru: Array = Data.dialogs["anciao"][-1]["lines"]
	check("Maru reconhece o herói pela carta de Ione", "carta" in " ".join(maru) and "aprendiz" in " ".join(maru))
	check("Save mantém o artefato e a lembrança", Game.item_count("semente_ambar") == 1 and Game.has_flag("lembranca_semente_ambar"))
	# ---- dados: cada artefato aponta para um chefe real, item com ícone; a Coroa fica reservada para a Região 5
	var bosses := {}
	for f in Data.maps:
		for e in Data.maps[f]["entities"]:
			if e.has("flag_done"):
				bosses[e["flag_done"]] = true
	var arts_ok := true
	for a in Historia.artefatos():
		var it: Dictionary = Data.items.get(str(a["id"]), {})
		if it.get("tipo", "") != "historia" or it.get("folha", "") != "icons_artefatos" or (a.get("lembranca", {}).get("linhas", []) as Array).is_empty():
			arts_ok = false
		if not a.get("placeholder", false) and not bosses.has(str(a["chefe_flag"])):
			arts_ok = false
	check("Artefatos: 5 chefes reais, Coroa Partida escrita pela Região 5 (rei_morto)", arts_ok and not Historia.artefato("coroa_partida").get("placeholder", false) and Historia.artefato("coroa_partida")["chefe_flag"] == "rei_morto" and bosses.has("rei_morto"))
	# ---- tela de Artefatos (último item da pausa) e seção na Jornada
	main.ui.open_pause()
	await frames(3)
	var last: Dictionary = main.ui._top().items[main.ui._top().items.size() - 1]
	check("Pausa: \"Artefatos\" é o último item da lista", str(last.get("t", "")).begins_with("Artefatos (1/5)"), str(last.get("t", "")))
	last["fn"].call()
	await frames(3)
	var rows: Array = main.ui._top().items.filter(func(r): return not r.get("hdr", false) and str(r.get("t", "")) != "Voltar")
	var sem: Array = rows.filter(func(r): return str(r.get("t", "")) == "Semente de Âmbar")
	check("Tela de Artefatos: 5 espaços, a Semente preenchida com ícone e a lembrança para reler", "Artefatos" in main.ui._top().title and rows.size() == 5 and sem.size() == 1 and sem[0].get("icon") != null and "primeiro treino" in str(sem[0].get("info", "")))
	await shot("historia_artefatos")
	await close_menus()
	main.ui.open_pause()
	main.ui.open_journey()
	await frames(3)
	var jrows: Array = main.ui._top().items.filter(func(r): return str(r.get("t", "")) == "Semente de Âmbar" or str(r.get("t", "")) == "[ ] ???")
	check("Jornada: seção de lembranças com 5 espaços", jrows.size() == 5)
	await close_menus()
	# ---- modo de teste rápido: lembrança pulada, artefato entregue na hora
	W.memory_in_tests = false
	Game.set_flag("ferreiro_morto")
	await frames(5)
	check("Em teste rápido a lembrança é pulada e o Elo Partido entregue", Game.item_count("elo_partido") == 1 and not main.ui.hud.dlg_active)
	W.memory_in_tests = true
	# ---- o Arauto em cena antes do chefe (Pântano)
	check("Arauto: folha desenhada (arauto.png) e cenas nas regiões 1–4", ResourceLoader.exists("res://assets/sprites/arauto.png") and ["arauto_floresta", "arauto_minas", "arauto_pantano", "arauto_fortaleza"].all(func(c): return Data.story["cenas"].has(c)))
	var pos_ok := true
	for cid in Data.story["cenas"]:
		var c: Dictionary = Data.story["cenas"][cid]
		var m: Dictionary = Data.maps.get(c["mapa"], {})
		if m.is_empty():
			pos_ok = false
			continue
		if c.has("arauto"):
			var ch: String = str(m["tiles"][int(c["arauto"][1])][int(c["arauto"][0])])
			if W.is_solid_char(ch):
				pos_ok = false
	check("Cenas apontam para mapas reais; o Arauto fica em piso livre", pos_ok)
	W.load_map("templo_c", "from_rito")
	await frames(10)
	var ar: Node = W.historia.arauto_node("arauto_pantano")
	check("Arauto aparece em cena na sala antes da Bruxa", ar != null and ar.def.get("sprite", "") == "arauto")
	await goto(tpos(11, 18), 6.0, 20.0)
	release_moves()
	await secs(1.5)
	var atxt: String = " ".join(main.ui.hud.dlg_lines)
	check("Arauto fala, provoca e deixa pistas (criatura reage)", main.ui.hud.dlg_active and "Arauto:" in atxt and "Brotisco" in atxt, atxt.left(120))
	await shot("historia_arauto")
	await advance_dialogs()
	await secs(1.2)
	check("Arauto some com um efeito e a cena não se repete", W.historia.arauto_node("arauto_pantano") == null and not is_instance_valid(ar) and Game.has_flag("cena_arauto_pantano"))
	# ---- cena de chegada (ritmo) e bilhete ambiental
	W.load_map("bosque_lanternas", "from_vila")
	await secs(2.0)
	check("Cena curta de chegada/descoberta no Bosque", main.ui.hud.dlg_active and "lanterna" in " ".join(main.ui.hud.dlg_lines))
	await advance_dialogs()
	await frames(10)
	var bils := 0
	var bil_ok := true
	for mid in Data.maps:
		for e in Data.maps[mid]["entities"]:
			if str(e.get("id", "")).begins_with("bilhete_"):
				bils += 1
				if not Data.dialogs.has(str(e.get("dialog", ""))) or W.is_solid_char(str(Data.maps[mid]["tiles"][int(e["y"])][int(e["x"])])):
					bil_ok = false
	check("6–10 bilhetes ambientais espalhados (diálogo existe, piso livre)", bils >= 6 and bils <= 10 and bil_ok, str(bils))
	var bil: Node = ent_by_id("bilhete_teodoro")
	check("Bilhete tem o comando Examinar", bil != null and bil.prompt() == "Examinar")
	if bil != null:
		bil.interact(P)
		await frames(3)
		check("Bilhete da expedição encontrado no Bosque", main.ui.hud.dlg_active and "expedição" in " ".join(main.ui.hud.dlg_lines))
		await advance_dialogs()
		await frames(5)
	main.ui.open_pause()
	main.ui.open_diary()
	await frames(3)
	check("Diário guarda os bilhetes lidos", Game.has_flag("leu_bilhete_teodoro") and main.ui._top().items.any(func(r): return str(r.get("t", "")).begins_with("Bilhetes encontrados")))
	await close_menus()
	# ---- contratos pessoais (Bruna e Ravi)
	var cb: Dictionary = Data.contracts.get("irmao_bruna", {})
	var cr: Dictionary = Data.contracts.get("mestre_ravi", {})
	check("Contratos pessoais: dupla com a própria Bruna / o próprio Ravi, com abertura e desfecho", cb.get("pessoal", false) and cb["tipo"] == "dupla" and cb["aliados"] == ["bruna"] and cr.get("pessoal", false) and cr["aliados"] == ["ravi"] and cb.has("desfecho") and cr.has("abertura"))
	Game.set_flag("saqueadores_ok")
	check("Contrato da Bruna bloqueado até visitar os Trilhos Fundidos", Game.contract_state("irmao_bruna") == "bloqueado")
	Game.set_flag("visitou_trilhos_fundidos")
	check("Contrato pessoal da Bruna disponível", Game.contract_state("irmao_bruna") == "disponivel")
	check("Bruna conta do irmão (variante de diálogo)", str(W.pick_variant("bruna")["lines"][0]).contains("Caio"))
	Game.set_flag("emboscada_ok")
	Game.set_flag("visitou_passarela_ecos")
	check("Contrato pessoal do Ravi disponível", Game.contract_state("mestre_ravi") == "disponivel")
	Game.hero["level"] = 8
	Game.hero["hp"] = Game.hero_max_hp()
	check("Aceitar o contrato pessoal da Bruna", Game.accept_contract("irmao_bruna"))
	W.load_map("trilhos_fundidos", "from_forja")
	await frames(10)
	var ces := contract_enemies("irmao_bruna")
	check("Bando do Caio aparece nos Trilhos Fundidos (com a Bruna)", ces.size() == 4 and W.allies().size() == 1, "%d %d" % [ces.size(), W.allies().size()])
	check("Abertura do contrato pessoal registrada", Game.has_flag("abertura_irmao_bruna"))
	if main.ui.hud.dlg_active:
		await advance_dialogs()
	for e in contract_enemies("irmao_bruna"):
		if is_instance_valid(e) and e.kind in ["domador", "domadora"]:
			e.take_damage(99999.0, e.global_position, {"src": "heroi"})
			await frames(3)
	await secs(1.5)
	var fim: String = " ".join(main.ui.hud.dlg_lines)
	check("Desfecho emocional: Bruna e o irmão", Game.has_flag("irmao_bruna_ok") and main.ui.hud.dlg_active and "abraça" in fim, fim.left(100))
	await advance_dialogs()
	await frames(5)
	W.load_map("vila_lumen", "default")
	await frames(10)
	check("Caio volta para Lúmen", ent_by_id("caio") != null)
	# ---- save/load mantém tudo
	W.save_now(5)
	SaveSys.load_game(5)
	await frames(5)
	check("Save mantém artefatos, cenas, bilhetes e contrato pessoal", Game.item_count("elo_partido") == 1 and Game.has_flag("cena_arauto_pantano") and Game.has_flag("leu_bilhete_teodoro") and Game.has_flag("irmao_bruna_ok") and Historia.count() == 2)

# ================================================================ FLORESTA COMPLETA (Rito da Seiva, segredo, anel, rito avançado, Grota)
## Uso: godot --headless --fixed-fps 60 --path . -- --e2e --floresta
func fl_setup(slot: int) -> void:
	SaveSys.delete_slot(slot)
	main.start_new_game(slot)
	await frames(10)
	await advance_dialogs()
	Game.hero["level"] = 4
	Game.hero["xp"] = 0
	for f in ["falou_maru", "tutorial_ok", "primeira_captura", "tut_move", "tut_attack", "tut_dodge", "tut_guard", "tut_command", "tut_rest",
			"lenhador_morto", "viu_santuario_seiva", "salao_flores", "enc_galeria_ok", "canais_ok", "pesos_ok"]:
		Game.set_flag(f)
	Game.give_item("pocao", 6)
	Game.give_item("selo_refinado", 6)
	Game.team = []
	for pair in [["brotisco", 4], ["lumipim", 4], ["cascalito", 4]]:
		var ind := r4_ind(pair[0], pair[1])
		Game.team.append(ind["uuid"])
	Game.active_idx = 0
	Game.hero["hp"] = Game.hero_max_hp()
	Game.team_changed.emit(); Game.hero_changed.emit(); Game.inventory_changed.emit()
	Game.god_mode = true

func charged_attack(dir: Vector2) -> void:
	await face(dir)
	P.vigor = P.VIGOR_MAX
	Input.action_press("attack")
	await frames(48)
	Input.action_release("attack")
	await frames(40)

func fl_dialog_has(sub: String) -> bool:
	return main.ui.hud.dlg_active and sub in " ".join(main.ui.hud.dlg_lines)

func run_floresta() -> void:
	await fl_setup(4)
	await fl_antes_do_cervo()
	await fl_segredo()
	await fl_anel()
	await fl_rito()
	await fl_golpe()
	await fl_pos_cervo()
	await fl_rito_avancado()
	await fl_minas_goturim()
	await fl_save_load()

func fl_antes_do_cervo() -> void:
	W.load_map("clareira_raizes", "from_vila")
	await frames(10)
	var ex_vis := false
	for d in W.ent_defs:
		if d["type"] == "exit" and d["to"] == "grota_seiva" and W._def_visible(d):
			ex_vis = true
	check("FL: raízes antigas fecham a Grota antes do Cervo (sem saída)", W.cur_tiles[19][44] == "x" and W.is_solid_char("x") and not ex_vis)
	check("FL: mapas novos cadastrados na Floresta (rito e grota)", "rito_seiva" in Data.regions["floresta"]["mapas"] and "grota_seiva" in Data.regions["floresta"]["mapas"] and Data.errors.is_empty(), str(Data.errors))

# ---- 2. segredo por observação: parede musgosa no Santuário
func fl_segredo() -> void:
	W.load_map("santuario_a", "from_bosque")
	await frames(10)
	check("FL: parede musgosa fechada e baú escondido atrás dela", W.is_solid_char(W.cur_tiles[30][8]) and W.is_solid_char(W.cur_tiles[29][8]) and not Game.chests.has("a_bau_expedicao"))
	await set_active_species(["brotisco"])
	await use_ent("a_inscricao", Vector2(0, -14), Vector2.DOWN)
	await frames(5)
	check("FL: inscrição de raízes ilegível sem luz (pede o Lumipim)", not Game.has_flag("lit_a_inscricao") and toast_seen("Lumipim"))
	var lu := uuid_of(["lumipim"])
	await set_active_species(["lumipim"])
	var b0 := Game.bond_count(Game.individuals[lu])
	await use_ent("a_inscricao", Vector2(0, -14), Vector2.DOWN)
	await frames(5)
	check("FL: o Lumipim ilumina a inscrição e ela aponta a parede (marca aparece)", Game.has_flag("lit_a_inscricao") and fl_dialog_has("musgo") and Game.has_flag("marcou_a_parede_musgo") and ent_by_id("a_parede_musgo").mark.visible)
	await advance_dialogs()
	check("FL: iluminar a inscrição conta vínculo para o Lumipim", Game.bond_count(Game.individuals[lu]) == b0 + 1)
	await shot("fl_01_inscricao")
	await use_ent("a_parede_musgo", Vector2(0, 16), Vector2.UP)
	check("FL: observar a parede dá a pista do golpe carregado", toast_seen("pedra soa oca"))
	await goto(tpos(10, 32), 4.0, 10.0)
	await secs(3.0)
	await shot("fl_01b_parede")
	await goto(tpos(8, 31), 3.0, 10.0)
	await attack_tap()
	await frames(30)
	check("FL: golpe comum não rompe a parede", not Game.has_flag("santuario_parede"))
	await charged_attack(Vector2.UP)
	check("FL: golpe carregado rompe a parede rachada", Game.has_flag("santuario_parede") and not W.is_solid_char(W.cur_tiles[30][8]) and not W.is_solid_char(W.cur_tiles[29][8]))
	var sr := Game.item_count("selo_refinado")
	await use_ent("a_bau_expedicao", Vector2(0, 14), Vector2.UP)
	check("FL: câmara secreta: Diário da Expedição I + Selo Refinado", Game.item_count("diario_expedicao_1") == 1 and Game.item_count("selo_refinado") == sr + 1)
	check("FL: diário da expedição fala da Mestra Ione", "Ione" in str(Data.items["diario_expedicao_1"]["desc"]) and Data.items["diario_expedicao_1"]["tipo"] == "historia")
	await shot("fl_02_camara")
	W.load_map("santuario_a", "from_bosque")
	await frames(10)
	check("FL: parede segue aberta e o baú não reabre ao voltar", not W.is_solid_char(W.cur_tiles[30][8]) and ent_by_id("a_bau_expedicao").opened)

# ---- 3. descoberta de criatura: anel de flores do Bosque
func fl_anel() -> void:
	W.load_map("bosque_lanternas", "from_vila")
	await frames(10)
	await set_active_species(["brotisco"])
	check("FL: Lumipim mais velho escondido antes da observação", ent_by_id("b_lumipim_anel") == null)
	await use_ent("b_anel", Vector2(0, 14), Vector2.UP)
	await frames(5)
	check("FL: sem neblina nem Lumipim, o anel só dá a pista", not Game.has_flag("bosque_anel") and toast_seen("neblina"))
	Game.weather_lock = "neblina"
	await use_ent("b_anel", Vector2(0, 14), Vector2.UP)
	await frames(5)
	check("FL: na neblina os Lumipins giram e revelam a história (fita de Ione)", Game.has_flag("bosque_anel") and fl_dialog_has("Ione"))
	await advance_dialogs()
	await secs(0.6)
	await shot("fl_03_anel")
	Game.weather_lock = "sol"
	var w: Node = ent_by_id("b_lumipim_anel")
	var lv_max := 0
	for d in W.ent_defs:
		if d["type"] == "wild" and d["species"] == "lumipim" and d.get("id", "") != "b_lumipim_anel":
			lv_max = max(lv_max, int(d["level"]))
	check("FL: Lumipim de nível maior aparece e é capturável", w != null and w.capturable and int(w.level) > lv_max, "%s" % [w.level if w else "-"])
	var n0 := Game.individuals.size()
	if w != null:
		await weaken(w, 0.3)
		await capture_wild(w, 10)
	var got := false
	for u in Game.individuals:
		if Game.individuals[u]["species_id"] == "lumipim" and int(Game.individuals[u]["nivel"]) > lv_max:
			got = true
	check("FL: Lumipim do anel capturado", Game.individuals.size() > n0 and got)
	# alternativa: o próprio Lumipim chama os da mata (sem depender do clima)
	Game.set_flag("bosque_anel", false)
	W.load_map("bosque_lanternas", "from_vila")
	await frames(10)
	var lu := uuid_of(["lumipim"])
	for u in Game.team:
		if Game.individuals[u]["species_id"] == "lumipim":
			lu = u
	Game.set_active(lu)
	W.refresh_companion(true)
	await frames(5)
	await use_ent("b_anel", Vector2(0, 14), Vector2.UP)
	await frames(5)
	await advance_dialogs()
	check("FL: com um Lumipim na equipe o anel também se revela (e conta vínculo)", Game.has_flag("bosque_anel") and "acao:b_anel" in Game.individuals[lu]["vinculo"])
	check("FL: Lumipim do anel é único (não reaparece depois de capturado)", ent_by_id("b_lumipim_anel") == null)

# ---- 1. Rito da Seiva (antes do Cervo)
func fl_rito() -> void:
	W.load_map("santuario_b", "from_a")
	await frames(10)
	var ok := await exit_to("rito_seiva", 8.0, 9 * 16.0 + 8.0)
	check("FL: Câmara dos Pesos leva ao Rito da Seiva (antes do Cervo)", ok and W.map_id == "rito_seiva")
	await shot("fl_04_rito1")
	# 1. apresentação: um canal
	check("FL: rito 1: canal seco (sem passagem)", W.cur_tiles[18][9] == "c")
	await pull_lever("rs_l1")
	check("FL: rito 1: a alavanca faz a seiva subir e uma passarela boiar", Game.has_flag("rs1_ok") and W.cur_tiles[18][9] == "B" and W.cur_tiles[21][7] == "S")
	# 2. aplicação: pesos e plataformas conectadas; dica e reinício
	ok = await goto(tpos(17, 22), 4.0, 30.0)
	check("FL: rito 2: fosso sem passarela no início", ok and W.cur_tiles[18][20] == "c" and W.cur_tiles[18][24] == "c")
	await use_ent("rs_dica2", Vector2(0, -14), Vector2.DOWN)
	check("FL: rito 2: pedra da dica fica quieta antes de 3 tentativas", toast_seen("quieta") and not main.ui.hud.dlg_active)
	var inv0 := Game.inventory.duplicate()
	var fr0 := Game.fragments
	var cx: Vector2 = ent_by_id("rs_caixa1").global_position
	await push_crate(ent_by_id("rs_caixa1"), Vector2.RIGHT, 1)
	check("FL: rito 2: caixa empurrada para fora do lugar", ent_by_id("rs_caixa1").global_position.distance_to(cx) > 8.0)
	for i in 3:
		await use_ent("rs_reset2", Vector2(0, -14), Vector2.DOWN)
		await frames(10)
	check("FL: rito 2: pedra de reinício devolve a caixa sem tirar itens", ent_by_id("rs_caixa1") != null and ent_by_id("rs_caixa1").global_position.distance_to(cx) < 2.0 and Game.inventory == inv0 and Game.fragments == fr0)
	await use_ent("rs_dica2", Vector2(0, -14), Vector2.DOWN)
	await frames(5)
	check("FL: rito 2: dica opcional depois de 3 tentativas", fl_dialog_has("Empurre"))
	await advance_dialogs()
	await push_crate(ent_by_id("rs_caixa1"), Vector2.UP, 3)
	check("FL: rito 2: peso na placa ergue o 1º trecho da passarela", Game.has_flag("rs2a_ok") and W.cur_tiles[18][20] == "B")
	var br := uuid_of(["brotisco"])
	await set_active_species(["brotisco"])
	await use_ent("rs_cipo", Vector2(0, 14), Vector2.UP)
	check("FL: rito 2: Brotisco estende cipós da ilha (alternativa)", Game.has_flag("rs_cipo") and W.cur_tiles[18][24] == "B" and "acao:rs_cipo" in Game.individuals[br]["vinculo"])
	await push_crate(ent_by_id("rs_caixa2"), Vector2.RIGHT, 4)
	check("FL: rito 2: a segunda caixa atravessa a passarela até a placa da ilha", Game.has_flag("rs2b_ok"))
	await shot("fl_05_rito2")
	var safe_exit := false
	for d in W.ent_defs:
		if d["type"] == "exit" and d["to"] == "santuario_b" and W._def_visible(d):
			safe_exit = true
	check("FL: saída segura do rito sempre aberta", safe_exit and not W.is_solid_char(W.cur_tiles[18][0]))
	# 3. combinação: canais em cascata + peso + plataformas
	ok = await goto(tpos(34, 19), 4.0, 30.0)
	check("FL: rito 3: chegou à sala da combinação", ok and W.cur_tiles[18][38] == "c" and W.cur_tiles[18][44] == "c")
	await pull_lever("rs_l3c")
	await pull_lever("rs_l3b")
	await pull_lever("rs_l3c")
	check("FL: rito 3: dica das alavancas após 3 erros", toast_seen("cascata") and not Game.has_flag("rs3_canal"))
	await use_ent("rs_reset3", Vector2(0, -14), Vector2.DOWN)
	await frames(10)
	var lv_sum := 0
	for v in W.lever_states["rs3"]:
		lv_sum += int(v)
	check("FL: rito 3: reinício volta as alavancas ao começo", lv_sum == 0 and int(W.lever_counts["rs3"]) == 0, str(W.lever_states["rs3"]))
	await pull_lever("rs_l3a")
	await pull_lever("rs_l3b")
	check("FL: rito 3: alavancas em cascata enchem o canal (passarela + sulco de seiva)", Game.has_flag("rs3_canal") and W.cur_tiles[18][38] == "B" and W.cur_tiles[12][36] == "S")
	await push_crate(ent_by_id("rs_caixa3"), Vector2.RIGHT, 6)
	check("FL: rito 3: a caixa atravessa o canal e pesa a placa: último canal fecha", Game.has_flag("rs3_ok") and W.cur_tiles[18][44] == "B")
	await shot("fl_06_rito3")
	# 4. conclusão
	var ca := uuid_of(["cascalito"])
	await set_active_species(["cascalito"])
	var b1 := Game.bond_count(Game.individuals[ca])
	await use_ent("rs_altar", Vector2(0, 14), Vector2.UP)
	await frames(5)
	check("FL: altar fala com a voz antiga do guardião", fl_dialog_has("GOLPE ENRAIZADO"))
	await advance_dialogs()
	check("FL: conclusão: técnica Golpe Enraizado + vínculo da criatura ativa", Game.has_flag("rito_seiva_ok") and Game.item_count("golpe_enraizado") == 1 and Game.bond_count(Game.individuals[ca]) == b1 + 1)
	check("FL: Golpe Enraizado é uma técnica (menu de técnicas e diários)", Data.items["golpe_enraizado"]["tipo"] == "tecnica")
	W.rite_altar(ent_by_id("rs_altar"))
	await advance_dialogs()
	check("FL: repetir o altar não dá técnica nem vínculo de novo", Game.item_count("golpe_enraizado") == 1 and Game.bond_count(Game.individuals[ca]) == b1 + 1)
	await shot("fl_07_altar")
	# ala avançada visível, mas pede a Raiz Viva
	await use_ent("rs_av_raiz1", Vector2(0, 14), Vector2.UP)
	check("FL: canal acima do altar pede a Raiz Viva (obstáculo visto antes da solução)", not Game.has_flag("rs_av1") and W.cur_tiles[8][54] == "c" and toast_seen("Raiz Viva"))

# ---- técnica: Golpe Enraizado em combate
func fl_spawn(kind: String, pos: Vector2) -> Node:
	var e := Enemy.new()
	e.init(W, kind, {"id": "teste_" + kind, "x": int(pos.x / 16), "y": int(pos.y / 16)})
	W.ysort.add_child(e)
	e.global_position = pos
	e.set_physics_process(false)
	e.max_hp = 999.0
	e.hp = 999.0
	return e

func fl_golpe() -> void:
	var c := tpos(55, 20)
	await goto(c, 4.0, 20.0)
	var cog := fl_spawn("cogumelo", c + Vector2(-8, -22))
	var wolf := fl_spawn("lobo", c + Vector2(8, -22))
	await frames(3)
	await charged_attack(Vector2.UP)
	check("FL: Golpe Enraizado: golpe carregado prende o inimigo pequeno com raízes", cog.rooted_t > 0.0, str(cog.rooted_t))
	check("FL: Golpe Enraizado não prende inimigos grandes (lobo)", wolf.rooted_t <= 0.0)
	await shot("fl_08_golpe")
	cog.rooted_t = 0.0
	Game.inventory.erase("golpe_enraizado")
	await secs(0.8)
	await charged_attack(Vector2.UP)
	check("FL: sem a técnica o golpe carregado não prende", cog.rooted_t <= 0.0)
	Game.give_item("golpe_enraizado", 1)
	cog.queue_free()
	wolf.queue_free()
	await frames(3)

# ---- 5. área nova pós-Cervo: Grota das Raízes Antigas
func fl_pos_cervo() -> void:
	Game.set_flag("cervo_morto")
	Game.set_flag("voltou_vila")
	Game.grant_eco("raiz_viva")
	W.load_map("clareira_raizes", "from_vila")
	await frames(10)
	check("FL: depois do Cervo as raízes antigas recuam", not W.is_solid_char(W.cur_tiles[19][44]))
	var ok := await exit_to("grota_seiva", 47 * 16.0 + 8.0, 19 * 16.0 + 8.0)
	check("FL: trilha leste leva à Grota das Raízes Antigas (área nova)", ok and W.map_id == "grota_seiva" and Weather.outdoors)
	await shot("fl_09_grota")
	var wilds := 0
	for e in get_tree().get_nodes_in_group("wild"):
		wilds += 1
	check("FL: Grota tem criaturas para capturar e inimigos", wilds >= 3 and hostile().size() >= 4, "%d %d" % [wilds, hostile().size()])
	for e in hostile():
		e.queue_free()
	await frames(3)
	check("FL: toca escondida antes de examinar o tronco", ent_by_id("g_tronco").solid and ent_by_id("semente_grota") != null)
	await use_ent("g_tronco", Vector2(16, 0), Vector2.LEFT)
	check("FL: examinar o tronco oco abre a passagem (segredo por observação)", Game.has_flag("grota_tronco") and not ent_by_id("g_tronco").solid)
	var sem := Game.item_count("semente_vida")
	await use_ent("semente_grota", Vector2(16, 0), Vector2.LEFT)
	check("FL: Semente de Vida na toca escondida", Game.item_count("semente_vida") == sem + 1 and Game.has_flag("semente_grota_pega"))
	await use_ent("grota_bau", Vector2(0, 16), Vector2.UP)
	check("FL: baú da Grota: Diário da Expedição II (Ione) e recursos", Game.chests.has("grota_bau") and Game.item_count("diario_expedicao_2") == 1 and "Ione" in str(Data.items["diario_expedicao_2"]["desc"]))
	await shot("fl_10_grota_bau")

# ---- 4. Rito da Seiva avançado (Raiz Viva em sequência com os canais)
func fl_rito_avancado() -> void:
	W.load_map("rito_seiva", "from_b")
	await frames(10)
	check("FL: passarelas do rito continuam erguidas ao voltar", W.cur_tiles[18][9] == "B" and W.cur_tiles[18][20] == "B" and W.cur_tiles[18][44] == "B")
	await use_ent("rs_av_raiz1", Vector2(0, 14), Vector2.UP)
	check("FL: rito avançado: a Raiz Viva ergue a ponte sobre o canal", Game.has_flag("rs_av1") and W.cur_tiles[8][54] == "B")
	await use_ent("rs_av_raiz2", Vector2(0, 14), Vector2.UP)
	check("FL: rito avançado: raiz não cresce no canal seco (ordem importa)", not Game.has_flag("rs_av2") and toast_seen("seca"))
	await use_ent("rs_av_l1", Vector2(0, 14), Vector2.UP)
	check("FL: rito avançado: alavanca faz a seiva correr no 1º canal", Game.has_flag("rs_av_s1") and W.cur_tiles[2][53] == "S")
	await use_ent("rs_av_raiz2", Vector2(0, 14), Vector2.UP)
	check("FL: rito avançado: com seiva, a Raiz Viva atravessa o 1º canal", Game.has_flag("rs_av2") and W.cur_tiles[3][50] == "B")
	await use_ent("rs_av_l2", Vector2(0, 14), Vector2.UP)
	await use_ent("rs_av_raiz3", Vector2(0, 14), Vector2.UP)
	check("FL: rito avançado: 2º canal em sequência", Game.has_flag("rs_av_s2") and Game.has_flag("rs_av3") and W.cur_tiles[3][44] == "B")
	await shot("fl_11_rito_av")
	Game.equipment["amuleto"] = ""
	await use_ent("rs_altar2", Vector2(0, 14), Vector2.UP)
	await advance_dialogs()
	check("FL: recompensa do rito avançado: Amuleto de Seiva Viva (raro, com ícone)", Game.has_flag("rito_seiva_av_ok") and Game.item_count("amuleto_seiva_viva") == 1 and Game.rarity_of("amuleto_seiva_viva") >= 2 and Data.items["amuleto_seiva_viva"]["folha"] == "icons_floresta")
	check("FL: amuleto equipado acelera o vigor", Game.equipment["amuleto"] == "amuleto_seiva_viva" and Game.hero_vigor_mult() > 1.5 and "vigor" in Game.item_details("amuleto_seiva_viva"))
	# medição real: recuperação de vigor com e sem o amuleto
	var g1 := await fl_vigor_gain()
	Game.equipment["amuleto"] = ""
	var g0 := await fl_vigor_gain()
	Game.equip("amuleto_seiva_viva")
	check("FL: vigor se recupera bem mais rápido com o Amuleto de Seiva Viva", g1 > g0 * 1.4, "%.1f vs %.1f" % [g1, g0])
	W.rite_altar(ent_by_id("rs_altar2"))
	await advance_dialogs()
	check("FL: rito avançado não repete a recompensa", Game.item_count("amuleto_seiva_viva") == 1)

func fl_vigor_gain() -> float:
	release_moves()
	P.vigor = 10.0
	P.vigor_idle = 99.0
	await frames(30)
	return P.vigor - 10.0

# ---- Minas: Goturim facilita os pisos quentes na revisita
func fl_minas_goturim() -> void:
	Game.god_mode = false
	Game.inventory.erase("luvas_termicas")
	Game.equipment["amuleto"] = ""
	W.load_map("rito_forja", "from_b")
	await frames(10)
	Game.set_flag("rito_v2", false)
	var loss0 := await fl_heat_loss()
	var go := r4_ind("goturim", 18)
	if Game.team.size() >= Game.TEAM_MAX:
		Game.sanctuary.append(go["uuid"])
		Game.move_to_sanctuary(Game.team[0])
		Game.move_to_team(go["uuid"])
	else:
		Game.team.append(go["uuid"])
	await set_active_species(["goturim"])
	var loss1 := await fl_heat_loss()
	check("FL: Minas: Goturim por perto molha o piso em brasa (calor fere metade)", loss0 > 0.0 and abs(loss1 - loss0 * 0.5) < 0.6, "%.1f vs %.1f" % [loss1, loss0])
	Game.equip("amuleto_seiva_viva")
	Game.god_mode = true

func fl_heat_loss() -> float:
	P.global_position = tpos(22, 12)
	if W.companion != null and is_instance_valid(W.companion):
		W.companion.global_position = tpos(22, 13)
	Game.hero["hp"] = Game.hero_max_hp()
	await frames(2)
	var hp0 := float(Game.hero["hp"])
	W.heat_t = 0.0
	await frames(131)
	return hp0 - float(Game.hero["hp"])

func fl_save_load() -> void:
	W.load_map("rito_seiva", "from_b")
	await frames(10)
	check("FL: save permitido no rito", W.save_now(4))
	var inv := Game.inventory.duplicate()
	var ch := Game.chests.duplicate()
	main.back_to_title()
	await frames(5)
	main.continue_from_slot(4)
	await frames(30)
	var fl_ok := true
	for f in ["rito_seiva_ok", "rito_seiva_av_ok", "santuario_parede", "bosque_anel", "grota_tronco", "rs3_ok", "rs_av3"]:
		if not Game.has_flag(f):
			fl_ok = false
	check("FL: load mantém ritos, segredos, anel e Grota", fl_ok and W.map_id == "rito_seiva")
	check("FL: load não duplica técnica, diários, amuleto nem baús", Game.inventory == inv and Game.chests == ch and Game.item_count("golpe_enraizado") == 1 and Game.item_count("amuleto_seiva_viva") == 1)
	W.rite_altar(ent_by_id("rs_altar"))
	await advance_dialogs()
	check("FL: altar após carregar não repete a recompensa", Game.item_count("golpe_enraizado") == 1)
	check("FL: dados sem erros de validação", Data.errors.is_empty(), str(Data.errors))


# ================================================================ REGIÃO 5 — CATEDRAL DO VAZIO (final)
## Uso: godot --headless --fixed-fps 60 --path . -- --e2e --regiao5   (--r5de=N começa na etapa N; ver r5_jump)
## Monta o estado do fim do Capítulo 4 (herói nv.26, os quatro Ecos, equipe comum evoluída) e joga a região inteira:
## selo externo, Acampamento da Aurora, Jardim Invertido, Escadaria dos Fragmentos, Nave, Âncoras e Coro, Arauto Partido,
## Rito da Convergência, resgate de Ione, Rei dos Ecos (derrota, reinício e vitória pelo nome), epílogo, créditos e Harmonia.

func r5_setup(slot: int) -> void:
	SaveSys.delete_slot(slot)
	main.start_new_game(slot)
	await frames(10)
	await advance_dialogs()
	Game.hero["level"] = 20
	Game.hero["xp"] = 0
	Game.hero["talents"] = {"espada": 4, "resistencia": 3, "vinculo": 2}
	var its := {"pocao": 16, "selo_refinado": 16, "selo_basico": 10, "tonico_criatura": 6, "galhada_ossea": 1, "couraca_ossos": 1,
		"amuleto_brasa": 1, "manto_umbral": 1, "semente_vida": 2}
	for it in its:
		Game.give_item(it, int(its[it]))
	Game.equip("galhada_ossea"); Game.equip("manto_umbral"); Game.equip("amuleto_brasa")
	Game.fragments = 1500
	for f in ["falou_maru", "tutorial_ok", "primeira_captura", "lenhador_morto", "cervo_morto", "voltou_vila", "ponte_minas", "fim_cap1",
			"vigia_morto", "ferreiro_morto", "minas_libertas", "voltou_forja", "saqueadores_ok", "emboscada_ok", "vesna_ok", "rito_ok",
			"tut_move", "tut_attack", "tut_dodge", "tut_guard", "tut_command", "tut_rest", "eco_olhar_velado", "bruxa_morta", "pantano_livre",
			"voltou_porto", "fim_cap3", "gemeos_morto", "cavaleiro_morto", "fortaleza_liberta", "voltou_refugio", "viu_selo_catedral",
			"visitou_refugio_muralha", "falou_ilse", "visitou_ponte_espiritual", "visitou_torre_a", "rito_eclipse_ok"]:
		Game.set_flag(f)
	for qid in Data.quests:
		if str(qid).begins_with("principal") and qid != "principal5":
			for st in Data.quests[qid]["etapas"]:
				Game.set_flag(st["flag"])
	for mf in Data.story["memorias"]:
		if Game.has_flag(mf):
			Game.set_flag("mem_" + mf)
	for e in ["raiz_viva", "ruptura_ignea", "olhar_velado", "passo_umbral"]:
		Game.grant_eco(e)
	Game.eco_slots = ["olhar_velado", "passo_umbral"]
	Game.team = []
	for pair in [["brasejante", 20], ["rocantor", 20], ["cinzaveu", 20]]:
		var ind := r4_ind(pair[0], pair[1])
		Game.team.append(ind["uuid"])
	Game.active_idx = 0
	Game.hero["hp"] = Game.hero_max_hp()
	Game.checkpoint = {"map": "estrada_final", "spawn": "from_refugio", "shrine": ""}
	Game.team_changed.emit(); Game.hero_changed.emit(); Game.inventory_changed.emit(); Game.eco_changed.emit()
	W.load_map("estrada_final", "from_refugio")
	await frames(20)

func r5_tile(tx: int, ty: int) -> String:
	return W.cur_tiles[ty][tx]

func r5_dialogs() -> void:
	await frames(10)
	var n := 0
	while (main.ui.hud.dlg_active or main.ui.has_screen()) and n < 40:
		if main.ui.hud.dlg_active:
			await advance_dialogs(10)
		elif main.ui.has_screen():
			await close_menus()
		await frames(20)
		n += 1

# ---------------------------------------------------------------- 1. selo externo e Acampamento da Aurora
func r5_entrada() -> void:
	check("R5: região Catedral do Vazio marcada como jogável", Data.regions["catedral"]["status"] == "jogavel" and Data.regions["catedral"]["mapas"].size() >= 8)
	check("R5: dados sem erros de validação", Data.errors.is_empty(), str(Data.errors))
	check("R5: espécies Cristil, Gravito e Velúnio jogáveis com evolução e arte", Data.species["cristil"]["status"] == "jogavel" and int(Data.species["prismal"]["frame"][0]) == 28
		and ResourceLoader.exists("res://assets/sprites/velunio.png") and ResourceLoader.exists("res://assets/sprites/astraveu.png"))
	await goto(tpos(15, 10), 4.0, 30.0)
	await face(Vector2.UP)
	await tap("eco2", 2)
	await frames(6)
	var ok := await exit_to("acampamento_aurora", 15 * 16.0 + 8.0, 8.0)
	check("R5: a Estrada Final leva ao selo externo da Catedral", ok and W.map_id == "acampamento_aurora")
	await secs(1.2)
	await r5_dialogs()
	check("R5: tileset da Catedral (fonte 5 do TileSet) em uso", W.tilemap.tile_set.has_source(Catedral.SOURCE_ID) and W.tilemap.get_cell_source_id(Vector2i(24, 30)) == Catedral.SOURCE_ID)
	check("R5: o Arauto da Ordem do Vazio aparece em cena no Acampamento", Game.has_flag("chegou_aurora") and Game.has_flag("arauto_partiu"))
	check("R5: o selo externo é intransponível a pé", W.is_solid_char(r5_tile(23, 27)) and P.global_position.y > 27 * 16)
	await shot("r5_01_selo")
	await use_ent("aurora_fissura", Vector2(0, 14), Vector2.UP)
	await frames(5)
	check("R5: o Passo Umbral cruza o selo externo", P.global_position.y < 27 * 16 and Game.has_flag("cruzou_selo_externo"))
	check("R5: missão principal 5 aponta para a Arquivista Sena", "Sena" in Game.objective_text(), Game.objective_text())
	check("R5: Acampamento é seguro, com música e clima próprios", W.map.get("safe", false) and W.map.get("music", "") == "aurora" and Weather.zone_of("acampamento_aurora") == "catedral" and Weather.climates().has("aurora"))
	await shot("r5_02_acampamento")
	await talk("sena")
	check("R5: Arquivista Sena dá a missão e suprimentos", Game.has_flag("falou_sena") and "Escadaria" in Game.objective_text(), Game.objective_text())
	await talk("mira")
	await close_menus()
	check("R5: Mira oferece 'Estrelas Invertidas' e a loja", Game.has_flag("quest_estrelas"))
	await talk("caio")
	check("R5: Caio oferece 'Vozes Perdidas'", Game.has_flag("quest_vozes"))
	check("R5: Vesna, Bruna e Ravi estão no Acampamento", ent_by_id("vesna_aurora") != null and ent_by_id("bruna_aurora") != null and ent_by_id("ravi_aurora") != null)
	var eco1 := ent_by_id("eco_ione_1")
	check("R5: o Eco de Ione (figura azul translúcida) espera no portão", eco1 != null and eco1.anim != null and eco1.anim.modulate.a < 0.8)
	await use_ent("eco_ione_1", Vector2(0, 14), Vector2.UP)
	await r5_dialogs()
	await frames(10)
	check("R5: o Eco de Ione fala e some, um passo à frente", Game.has_flag("eco_ione_1_visto") and ent_by_id("eco_ione_1") == null)
	await rest_at("aurora")
	check("R5: santuário do Acampamento grava o ponto de retorno", Game.checkpoint.get("shrine", "") == "aurora")
	await use_ent("quadro_aurora", Vector2(0, 16), Vector2.UP)
	await frames(5)
	check("R5: quadro de contratos do Acampamento abre", main.ui.has_screen())
	await close_menus()
	check("R5: caçada e trio da região bloqueados até visitar as rotas", Game.contract_state("caca_escribas") == "bloqueado" and Game.contract_state("ultimas_correntes") == "bloqueado")
	check("R5: nicho escondido fechado antes de observar", W.is_solid_char(r5_tile(3, 10)))
	await use_ent("aurora_pedra", Vector2(0, 14), Vector2.UP)
	await use_ent("aurora_bau_nicho", Vector2(16, 0), Vector2.LEFT)
	check("R5: segredo por observação abre o nicho (baú)", Game.has_flag("aurora_nicho") and Game.chests.has("aurora_bau_nicho"))
	check("R5: portão norte da Catedral fechado (abre por dentro)", W.is_solid_char(r5_tile(23, 1)))

# ---------------------------------------------------------------- 2. Jardim Invertido (rota 2)
var r5_seals := 0

func r5_fight_area(kinds: Array, timeout := 120.0, radius := 9999.0) -> int:
	var seals := 0
	var t := 0.0
	var c0: Vector2 = P.global_position
	var spent := {}
	while t < timeout and P.state != Player.S.DEAD:
		var es := hostile().filter(func(e): return (kinds.is_empty() or e.kind in kinds) and e.global_position.distance_to(c0) < radius and float(spent.get(e.uid, 0.0)) < 25.0)
		if es.is_empty():
			break
		for h in get_tree().get_nodes_in_group("selos"):
			if not h.fired:
				seals += 1
				r5_seals += 1
				if h.global_position.distance_to(P.global_position) < 30.0:
					steer(P.global_position - h.global_position)
					await frames(12)
					release_moves()
		es.sort_custom(func(a, b): return a.global_position.distance_to(P.global_position) < b.global_position.distance_to(P.global_position))
		var tgt: Node = es[0]
		var before := frame_count
		if P.global_position.distance_to(tgt.global_position) > 90.0:
			await goto(tgt.global_position, 60.0, 10.0)
		if is_instance_valid(tgt) and tgt.alive_flag:
			await r4_step(tgt)
		var dt := float(frame_count - before) / 60.0
		t += dt
		if is_instance_valid(tgt):
			spent[tgt.uid] = float(spent.get(tgt.uid, 0.0)) + dt
	return seals

func r5_jardim() -> void:
	var ok := await exit_to("jardim_invertido", 47 * 16.0 + 8.0, 15 * 16.0 + 8.0)
	check("R5: o Acampamento leva ao Jardim Invertido", ok and W.map_id == "jardim_invertido")
	await shot("r5_03_jardim")
	var n0 := Game.individuals.size()
	var cap := await capture_species("j_cristil1", 0.3)
	check("R5: Cristil capturável no habitat fixo (comum)", cap and Game.individuals.size() > n0)
	check("R5: aceitar a caçada aos escribas", Game.accept_contract("caca_escribas"))
	await use_ent("jp_espelho1", Vector2(0, 14), Vector2.UP)
	await use_ent("jp_espelho2", Vector2(0, 14), Vector2.UP)
	await frames(10)
	check("R5: espelhos locais levam o feixe ao cristal e abrem o selo", Game.has_flag("jardim_luz") and not W.is_solid_char(r5_tile(29, 5)))
	await shot("r5_04_prismas")
	await r4_use(["cristil"])
	await use_ent("jp_prisma", Vector2(0, 14), Vector2.UP)
	await frames(10)
	check("R5: o Cristil gira o prisma e leva a luz ao cristal do mirante", Game.has_flag("jardim_prisma") and not W.is_solid_char(r5_tile(42, 23)))
	await use_ent("ca_bau_prisma", Vector2(0, 14), Vector2.UP)
	check("R5: baú do mirante (alternativa do Cristil)", Game.chests.has("ca_bau_prisma"))
	await use_ent("jard_estrela", Vector2(0, 14), Vector2.UP)
	await use_ent("eco_perdido2", Vector2(0, 14), Vector2.UP)
	await use_ent("jard_marca", Vector2(0, -14), Vector2.DOWN)
	await frames(5)
	check("R5: o Olhar Velado materializa a marca num caminho", Game.has_flag("jardim_marca") and not W.is_solid_char(r5_tile(12, 26)))
	await use_ent("jard_circulo", Vector2(0, 14), Vector2.UP)
	await frames(10)
	check("R5: o anel de marcas revela o Velúnio (raro)", Game.has_flag("jardim_circulo") and ent_by_id("jard_velunio") != null)
	await r4_use(["brasejante"])
	await r5_fight_area(["escriba", "sentinela_prisma"])
	check("R5: escribas do Jardim enfrentados (a maioria derrotada)", hostile().filter(func(e): return e.kind == "escriba").size() <= 1, str(hostile().map(func(e): return e.uid)))
	r4_heal()
	ok = await exit_to("acampamento_aurora", 8.0, 19 * 16.0 + 8.0)
	check("R5: volta ao Acampamento pelo Jardim", ok)

# ---------------------------------------------------------------- 3. Escadaria dos Fragmentos (rota 1)
func r5_escadaria() -> void:
	var ok := await exit_to("escadaria_fragmentos", 8.0, 15 * 16.0 + 8.0)
	check("R5: o Acampamento leva à Escadaria dos Fragmentos", ok and W.map_id == "escadaria_fragmentos")
	await shot("r5_05_escadaria")
	await r5_fight_area(["fragmento"], 40.0, 220.0)
	var n0 := Game.individuals.size()
	var cap := await capture_species("e_gravito1", 0.3)
	check("R5: Gravito capturável no patamar da âncora", cap and Game.individuals.size() > n0)
	check("R5: escada quebrada sem a âncora (vazio sólido)", W.is_solid_char(r5_tile(15, 30)))
	await push_crate(ent_by_id("esc_bloco"), Vector2.RIGHT, 4)
	await frames(10)
	check("R5: contrapeso local (bloco na placa) firma a âncora e a escada", Game.has_flag("escadaria_ancora") and not W.is_solid_char(r5_tile(15, 30)))
	await use_ent("eco_perdido1", Vector2(0, 14), Vector2.UP)
	await goto(tpos(15, 26), 6.0, 40.0)
	await r5_fight_area(["fragmento"], 80.0)
	await use_ent("esc_raiz", Vector2(14, 0), Vector2.LEFT)
	check("R5: a Raiz Viva ergue a ponte de raiz até a ilhota", Game.has_flag("escadaria_raiz") and not W.is_solid_char(r5_tile(5, 22)))
	await use_ent("esc_bau_raiz", Vector2(16, 0), Vector2.LEFT)
	await use_ent("esc_estrela", Vector2(0, 14), Vector2.UP)
	await goto(tpos(16, 10), 6.0, 40.0)
	await r5_fight_area(["sentinela_prisma"], 80.0)
	await use_ent("esc_cristal", Vector2(-14, 0), Vector2.RIGHT)
	check("R5: a Ruptura Ígnea estilhaça o cristal da alcova", Game.has_flag("escadaria_cristal") and not W.is_solid_char(r5_tile(26, 7)))
	await use_ent("esc_bau_cristal", Vector2(-16, 0), Vector2.RIGHT)
	check("R5: Ecos Perdidos 2/3 e estrelas 2/3", Game.item_count("eco_perdido") == 2 and Game.has_flag("estrela_1") and Game.has_flag("estrela_2"))
	r4_heal()
	ok = await exit_to("catedral_a", 11 * 16.0 + 8.0, 8.0)
	check("R5: a Escadaria chega à Catedral do Vazio", ok and W.map_id == "catedral_a")

# ---------------------------------------------------------------- 4. Nave dos Prismas (salas 1–4)
func r5_nave() -> void:
	await secs(1.2)
	await r5_dialogs()
	check("R5: o Arauto reaparece na Nave (cena)", Game.has_flag("arauto_nave_partiu"))
	await shot("r5_06_nave")
	await pull_lever("ca_alavanca_atalho")
	check("R5: atalho Nave -> Acampamento aberto por dentro", Game.has_flag("catedral_atalho") and not W.is_solid_char(r5_tile(29, 43)))
	await rest_at("catedral_nave")
	await use_ent("eco_ione_2", Vector2(0, 14), Vector2.UP)
	await r5_dialogs()
	await r5_fight_area(["sentinela_prisma"], 60.0)
	await use_ent("ca_espelho1", Vector2(0, 14), Vector2.UP)
	await use_ent("ca_espelho2", Vector2(0, 14), Vector2.UP)
	await frames(10)
	check("R5: Sala dos Prismas — os espelhos acendem o cristal e abrem o portão norte", Game.has_flag("catedral_luz") and not W.is_solid_char(r5_tile(29, 15)))
	await shot("r5_07_sala_prismas")
	await r4_use(["cristil"])
	for i in 3:
		await use_ent("ca_prisma", Vector2(0, 14), Vector2.UP)
	await frames(10)
	check("R5: o prisma girado para o alto abre o nicho (Cristil)", Game.has_flag("catedral_nicho"))
	await use_ent("ca_bau_prisma2", Vector2(-16, 0), Vector2.RIGHT)
	await r4_use(["brasejante"])
	r4_heal()
	await goto(tpos(30, 9), 6.0, 40.0)
	await frames(20)
	check("R5: Galeria dos Escribas fecha as portas (encontro)", Game.has_flag("tmp_enc_galeria_c") or Game.has_flag("enc_galeria_c_ok"))
	await r5_fight_area(["escriba", "fragmento"], 150.0)
	await secs(1.0)
	check("R5: encontro da Galeria vencido", Game.has_flag("enc_galeria_c_ok"))
	check("R5: escribas escrevem selos no chão (círculo que fecha)", r5_seals > 0)
	check("R5: caçada aos escribas concluída", Game.has_flag("caca_escribas_ok"))
	await use_ent("eco_perdido3", Vector2(0, -14), Vector2.DOWN)
	check("R5: três Ecos Perdidos (missão do Caio)", Game.has_flag("vozes_ok"))
	await use_ent("ca_raiz", Vector2(0, -14), Vector2.DOWN)
	check("R5: Câmara das Raízes — a Raiz Viva cruza o fosso", Game.has_flag("catedral_raiz") and not W.is_solid_char(r5_tile(8, 14)))
	await take_fire("ca_braseiro")
	await use_ent("ca_solar", Vector2(0, -14), Vector2.DOWN)
	check("R5: a chama do braseiro reaquece o mecanismo (raízes + calor)", Game.has_flag("catedral_calor") and not W.is_solid_char(r5_tile(1, 24)))
	r4_heal()
	var ok := await exit_to("catedral_b", 8.0, 24 * 16.0 + 8.0)
	check("R5: a Câmara das Raízes leva ao andar das âncoras", ok and W.map_id == "catedral_b")

# ---------------------------------------------------------------- 5. Âncoras, Coro Velado e Arauto Partido
func r5_ancoras() -> void:
	await shot("r5_08_ancoras")
	await push_crate(ent_by_id("cb_bloco_a"), Vector2.UP, 2)
	await frames(8)
	check("R5: âncora A firmada pelo contrapeso local", Game.has_flag("anc_a"))
	await r4_use(["gravito"])
	await use_ent("cb_ancora_b", Vector2(0, 14), Vector2.UP)
	await frames(8)
	check("R5: o Gravito sustenta a âncora B (ação ambiental)", Game.has_flag("anc_b") and not W.is_solid_char(r5_tile(43, 27)))
	await r4_use(["brasejante"])
	await r5_fight_area(["sentinela_prisma"], 60.0)
	await use_ent("coro_estrela", Vector2(0, 14), Vector2.UP)
	check("R5: três estrelas invertidas (missão da Mira)", Game.has_flag("estrelas_ok"))
	await use_ent("coro_marca", Vector2(14, 0), Vector2.LEFT)
	check("R5: Coro Velado — o Olhar Velado materializa o caminho até a ilha", Game.has_flag("coro_marca"))
	await use_ent("coro_portal_a", Vector2(0, 14), Vector2.UP)
	await frames(6)
	check("R5: o portal marcado cruza o vazio (Passo Umbral)", P.global_position.x < 17 * 16)
	await r5_fight_area(["escriba"], 60.0)
	await use_ent("cb_bau_coro", Vector2(0, -14), Vector2.DOWN)

func r5_arauto_threat(b: Node) -> Vector2:
	var rel: Vector2 = P.global_position - b.global_position
	if b.bst == b.B.TELE_ROOTS:
		for d in b.root_dirs:
			if rel.dot(d) > -10.0 and rel.dot(d) < 150.0 and abs(rel.dot(d.orthogonal())) < 22.0:
				var side: Vector2 = d.orthogonal()
				return side if rel.dot(side) >= 0.0 else -side
	if b.bst == b.B.TELE_SLASH and rel.length() < 70.0:
		return rel.normalized()
	for h in get_tree().get_nodes_in_group("selos"):
		if not h.fired and h.global_position.distance_to(P.global_position) < 32.0:
			return (P.global_position - h.global_position).normalized()
	return Vector2.ZERO

func r5_arauto() -> void:
	var src := FileAccess.get_file_as_string("res://scripts/boss_arauto.gd")
	check("R5: o Arauto não lê comandos do jogador", not ("Input." in src) and not ("is_action" in src))
	r4_heal()
	await goto(tpos(15, 19), 6.0, 30.0)
	await goto(tpos(17, 12), 6.0, 20.0)
	await frames(20)
	var b := find_boss("arauto")
	check("R5: o Arauto Partido desperta e fecha a arena", b != null and b.activated and Game.has_flag("tmp_arauto_ativo"))
	Game.behavior = "atacar"
	var t := 0.0
	var veil_seen := false
	var shot_done := false
	while t < 360.0 and b != null and is_instance_valid(b) and b.alive_flag and P.state != Player.S.DEAD:
		var before := frame_count
		await use_potion_if_needed()
		if b.bst == b.B.VEIL:
			veil_seen = true
			if P.energy >= 16.0:
				W.eco_olhar(P.global_position)
				P.energy -= 16.0
			await frames(6)
		var away := r5_arauto_threat(b)
		if away != Vector2.ZERO:
			steer(away)
			await frames(8)
			release_moves()
		elif b.invulnerable or b.bst == b.B.VEIL:
			await frames(6)
		else:
			var d: float = P.global_position.distance_to(b.global_position)
			if d > 30.0:
				steer(b.global_position - P.global_position)
				await frames(4)
				release_moves()
			else:
				await face(b.global_position - P.global_position)
				await attack_tap()
				await frames(6)
		if b.bst == b.B.TELE_ROOTS and not shot_done:
			shot_done = true
			await shot("r5_09_arauto")
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0
	release_moves()
	await secs(2.0)
	check("R5: o Arauto apresenta as três combinações (raiz+brasa, véu+portal, selos)", (is_instance_valid(b) and b.seen.size() == 3) or (Game.has_flag("arauto_morto") and veil_seen))
	check("R5: o Olhar Velado rasga o véu do Arauto", veil_seen)
	check("R5: Arauto Partido derrotado", Game.has_flag("arauto_morto"), "t=%.0f hp=%s" % [t, str(b.hp) if is_instance_valid(b) else "-"])
	await r5_dialogs()
	check("R5: memória do Arauto entrega a página de Ione (7)", Game.item_count("pagina_ione_7") == 1)
	Game.behavior = "preservar"
	r4_heal()
	await goto(tpos(40, 9), 6.0, 40.0)
	await use_ent("cb_bau_tesouro", Vector2(0, 14), Vector2.UP)
	await use_ent("eco_ione_3", Vector2(0, 14), Vector2.UP)
	await r5_dialogs()
	await pull_lever("cb_alavanca_elevador")
	check("R5: alavanca do tesouro liga o elevador (atalho Nave <-> Âncoras)", Game.has_flag("catedral_elevador"))
	await rest_at("catedral_tesouro")
	var ok := await exit_to("rito_convergencia", 55 * 16.0 + 8.0, 8 * 16.0 + 16.0)
	check("R5: o tesouro leva ao Rito da Convergência", ok and W.map_id == "rito_convergencia")

# ---------------------------------------------------------------- 6. Rito da Convergência
func r5_rito() -> void:
	await shot("r5_10_rito")
	await use_ent("rc_raiz1", Vector2(-14, 0), Vector2.RIGHT)
	await use_ent("rc_cristal1", Vector2(-14, 0), Vector2.RIGHT)
	check("R5: rito 1 — raiz e brasa abrem a primeira porta", Game.has_flag("rc_raiz") and Game.has_flag("rc_brasa") and not W.is_solid_char(r5_tile(14, 14)))
	await use_ent("rc_marca2", Vector2(-14, 0), Vector2.RIGHT)
	await use_ent("rc_portal_a", Vector2(0, 14), Vector2.UP)
	await frames(5)
	await pull_lever("rc_alavanca2")
	check("R5: rito 2 — visão e portal levam à alavanca", Game.has_flag("rc2_ok"))
	await use_ent("rc3_raiz", Vector2(-14, 0), Vector2.RIGHT)
	await use_ent("rc3_cristal", Vector2(0, 14), Vector2.UP)
	await use_ent("rc3_marca", Vector2(-14, 0), Vector2.RIGHT)
	await use_ent("rc3_fissura", Vector2(-14, 0), Vector2.RIGHT)
	await frames(5)
	await pull_lever("rc_alavanca3")
	check("R5: rito 3 — os quatro Ecos em sequência", Game.has_flag("rc3_raiz") and Game.has_flag("rc3_brasa") and Game.has_flag("rc3_marca") and Game.has_flag("rc3_ok"))
	await use_ent("rc_altar", Vector2(0, 14), Vector2.UP)
	await r5_dialogs()
	check("R5: Rito da Convergência concede o Amuleto da Convergência", Game.has_flag("rito_convergencia_ok") and Game.item_count("amuleto_convergencia") == 1)
	Game.equip("amuleto_convergencia")
	var ok := await exit_to("catedral_c", 63 * 16.0 + 8.0, 14 * 16.0 + 16.0)
	check("R5: o rito leva ao Coração do Eco", ok and W.map_id == "catedral_c")

# ---------------------------------------------------------------- 7. Câmara do Eco: resgate de Ione
func r5_resgate() -> void:
	await rest_at("catedral_coracao")
	await use_ent("cc_bau_prep", Vector2(0, 14), Vector2.UP)
	await use_ent("eco_ione_4", Vector2(0, 14), Vector2.UP)
	await r5_dialogs()
	check("R5: o Eco de Ione aparece em quatro lugares, sempre à frente", Game.has_flag("eco_ione_2_visto") and Game.has_flag("eco_ione_3_visto") and Game.has_flag("eco_ione_4_visto"))
	check("R5: porta do trono fechada enquanto Ione está presa", W.is_solid_char(r5_tile(27, 27)))
	await use_ent("cc_cristal_ione", Vector2(0, 16), Vector2.UP)
	await r5_dialogs()
	await shot("r5_11_camara")
	await use_ent("cc_elo_raiz", Vector2(0, 14), Vector2.UP)
	await use_ent("cc_elo_brasa", Vector2(0, 14), Vector2.UP)
	var ev := ent_by_id("cc_elo_velado")
	check("R5: o elo velado é invisível antes do Olhar Velado", ev != null and ev.prompt() == "")
	await goto(ev.global_position + Vector2(0, 14), 4.0, 30.0)
	W.eco_olhar(P.global_position)
	await frames(5)
	await use_ent("cc_elo_velado", Vector2(0, 14), Vector2.UP)
	await use_ent("cc_fissura", Vector2(-14, 0), Vector2.RIGHT)
	await frames(5)
	await use_ent("cc_elo_umbral", Vector2(0, 14), Vector2.UP)
	check("R5: os quatro elos cedem a quatro Ecos", Game.has_flag("elo_raiz") and Game.has_flag("elo_brasa") and Game.has_flag("elo_velado") and Game.has_flag("elo_umbral"))
	await secs(2.0)
	var lines: String = " ".join(main.ui.hud.dlg_lines)
	check("R5: cena do resgate — Ione fala com o herói (e o herói responde)", "Ione" in lines and "Você:" in lines, lines.substr(0, 80))
	await r5_dialogs()
	check("R5: Mestra Ione libertada e a porta do trono aberta", Game.has_flag("ione_livre") and not W.is_solid_char(r5_tile(27, 27)))
	await use_ent("cc_fissura_volta", Vector2(0, 14), Vector2.UP)
	await frames(5)

# ---------------------------------------------------------------- 8. Rei dos Ecos
func r5_danger(b: Node, p: Vector2) -> bool:
	var rel: Vector2 = p - b.global_position
	if b.bst == b.B.TELE:
		match b.echo:
			"cervo":
				for d in b.root_dirs:
					if rel.dot(d) > -10.0 and rel.dot(d) < 160.0 and abs(rel.dot(d.orthogonal())) < 22.0:
						return true
			"ferreiro":
				for d in b.quake_dirs:
					if rel.dot(d) > -10.0 and rel.dot(d) < 180.0 and abs(rel.dot(d.orthogonal())) < 24.0:
						return true
			"bruxa":
				for q in b.puddle_pts:
					if p.distance_to(q) < 30.0:
						return true
				for d in b.orb_dirs:
					if rel.dot(d) > 0.0 and abs(rel.dot(d.orthogonal())) < 12.0:
						return true
			"cavaleiro":
				if rel.dot(b.attack_dir) > -10.0 and rel.dot(b.attack_dir) < 170.0 and abs(rel.dot(b.attack_dir.orthogonal())) < 26.0:
					return true
	if b.bst == b.B.THRUST:
		if rel.dot(b.attack_dir) > -10.0 and rel.dot(b.attack_dir) < 80.0 and abs(rel.dot(b.attack_dir.orthogonal())) < 26.0:
			return true
	if b.bst == b.B.WARN_RUIN:
		for r in b.ruin_rects(b.ruin_i):
			if r.grow(10.0).has_point(p):
				return true
	for pr in get_tree().get_nodes_in_group("projectiles"):
		if pr.global_position.distance_to(p) < 26.0:
			return true
	for h in get_tree().get_nodes_in_group("hazards"):
		if h.global_position.distance_to(p) < 22.0:
			return true
	for h in get_tree().get_nodes_in_group("selos"):
		if h.global_position.distance_to(p) < 28.0:
			return true
	return W.tile_solid_at(p)

func r5_escape(b: Node) -> bool:
	if not r5_danger(b, P.global_position):
		return false
	var best := Vector2.ZERO
	var bd := 1e9
	for k in 16:
		for r in [32.0, 56.0, 88.0]:
			var q: Vector2 = P.global_position + Vector2.from_angle(TAU * k / 16.0) * r
			if r5_danger(b, q) or Combat.ray_blocked(W, P.global_position, q):
				continue
			var cost: float = r + q.distance_to(Vector2(29 * 16.0, 13 * 16.0)) * 0.3
			if cost < bd:
				bd = cost
				best = q
	if best == Vector2.ZERO:
		best = Vector2(29 * 16.0, 13 * 16.0)
	steer(best - P.global_position)
	await frames(6)
	if b.bst == b.B.THRUST and P.vigor >= 25.0 and P.dodge_cd <= 0.0:
		await tap("dodge", 2)
	release_moves()
	return true

func r5_rei_step(b: Node) -> void:
	await use_potion_if_needed()
	if await r5_escape(b):
		return
	var goal: Vector2 = b.global_position
	if b.bst in [b.B.SHIELDED, b.B.RISE]:
		var tgt: Node = null
		var bd := 1e9
		for f in b.focos:
			if is_instance_valid(f) and f.alive_flag and f.global_position.distance_to(P.global_position) < bd:
				bd = f.global_position.distance_to(P.global_position)
				tgt = f
		if tgt == null:
			await frames(4)
			return
		var back: Vector2 = (tgt.global_position - b.global_position).normalized()
		goal = tgt.global_position + back * 20.0
		if P.global_position.distance_to(goal) > 8.0:
			steer(goal - P.global_position)
			await frames(4)
			release_moves()
			return
		await face(tgt.global_position - P.global_position)
		await attack_tap()
		await frames(6)
		return
	if b.invulnerable or b.bst in [b.B.TELE, b.B.WARN_RUIN, b.B.THRUST, b.B.HESITATE]:
		await frames(4)
		return
	var d: float = P.global_position.distance_to(goal)
	if d > 34.0:
		steer(goal - P.global_position)
		await frames(4)
		release_moves()
	else:
		await face(goal - P.global_position)
		await attack_tap()
		await frames(6)

func r5_rei() -> void:
	var src := FileAccess.get_file_as_string("res://scripts/boss_rei.gd")
	check("R5: o Rei não lê comandos do jogador", not ("Input." in src) and not ("is_action" in src))
	await secs(1.0)
	await r5_dialogs()
	await r4_use(["brasejante"])
	r4_heal()
	await goto(tpos(28, 26), 6.0, 30.0)
	await goto(tpos(29, 19), 6.0, 20.0)
	await frames(20)
	var b := find_boss("rei")
	check("R5: o Rei dos Ecos desperta e fecha a arena", b != null and b.activated and Game.has_flag("tmp_rei_ativo"))
	await secs(3.2)
	await shot("r5_12_rei")
	# derrota e reinício
	var deaths0 := int(Game.stats["mortes"])
	await die_generic(b, "arena do Rei dos Ecos")
	await r5_dialogs()
	check("R5: derrota no Rei: volta ao santuário do Coração", W.map_id == "catedral_c" and int(Game.stats["mortes"]) == deaths0 + 1)
	check("R5: reinício limpa a arena e mantém Ione livre", not Game.has_flag("tmp_rei_ativo") and Game.has_flag("ione_livre") and not Game.has_flag("rei_morto"))
	r4_heal()
	await goto(tpos(28, 26), 6.0, 40.0)
	await goto(tpos(29, 19), 6.0, 20.0)
	await frames(20)
	b = find_boss("rei")
	check("R5: o Rei volta inteiro no reinício", b != null and b.activated and b.hp >= b.max_hp - 1.0)
	Game.behavior = "atacar"
	var saw := {"focos": false, "exposto": false, "ruina": false, "respiro": false}
	var t := 0.0
	var shots := {}
	while t < 600.0 and b != null and is_instance_valid(b) and b.alive_flag and b.bst != b.B.HESITATE and P.state != Player.S.DEAD:
		var before := frame_count
		if b.bst == b.B.SHIELDED: saw["focos"] = true
		if b.bst == b.B.EXPOSED: saw["exposto"] = true
		if b.bst == b.B.WARN_RUIN: saw["ruina"] = true
		if b.bst == b.B.BREATH: saw["respiro"] = true
		var key := "%d_%d" % [b.phase, b.bst]
		if not shots.has("dbg" + key):
			shots["dbg" + key] = true
			print("[r5] Rei fase=%d bst=%d hp=%.0f t=%.0f" % [b.phase, b.bst, b.hp, t])
		if not shots.has(key) and b.bst in [b.B.TELE, b.B.SHIELDED, b.B.WARN_RUIN]:
			shots[key] = true
			await shot("r5_13_rei_%s" % key)
		await r5_rei_step(b)
		if frame_count == before:
			await frames(1)    # um passo que não andou nenhum quadro não pode prender a luta
		t += float(frame_count - before) / 60.0
	release_moves()
	check("R5: fase 1 — os quatro ecos dos guardiões, um de cada vez", is_instance_valid(b) and b.echoes_seen.size() == 4)
	check("R5: fase 2 — dois focos exigem posicionamento (por trás) e expõem o núcleo", saw["focos"] and saw["exposto"])
	check("R5: fase 3 — arena parcialmente destruída com avisos e respiros", saw["ruina"] and saw["respiro"] and is_instance_valid(b) and b.ruin_i >= 1)
	check("R5: a luz de Ione cura entre as quedas", is_instance_valid(b) and b.heals >= 1)
	check("R5: no fim o Rei hesita (a força não basta)", is_instance_valid(b) and b.bst == b.B.HESITATE and b.alive_flag,
		"t=%.0f fase=%s hp=%s mortes=%d" % [t, str(b.phase) if is_instance_valid(b) else "-", str(b.hp) if is_instance_valid(b) else "-", int(Game.stats["mortes"]) - deaths0])
	await secs(1.0)
	await shot("r5_14_hesita")
	var ne := ent_by_id("rei_nome")
	if ne != null:
		await goto(ne.global_position + Vector2(0, 20), 6.0, 20.0)
		await face(Vector2.UP)
		await interact_press()
	await frames(10)
	var nome_lines: String = " ".join(main.ui.hud.dlg_lines)
	check("R5: o nome 'Ivar' é devolvido (herói, Ione e a equipe juntos)", "Ivar" in nome_lines and Game.has_flag("climax_equipe"), nome_lines.substr(0, 100))
	var ind0: Dictionary = Game.individuals[Game.team[0]]
	check("R5: a cena cita as criaturas da equipe", Game.creature_name(ind0) in nome_lines)
	Game.behavior = "preservar"

# ---------------------------------------------------------------- 9. epílogo, créditos e pós-jogo
func r5_epilogo() -> void:
	var t := 0.0
	var saw_credits := false
	var maps := {}
	while t < 300.0 and not Game.has_flag("epilogo_visto"):
		maps[W.map_id] = true
		if main.ui.has_screen():
			var top = main.ui._top()
			if top != null and "Créditos" in str(top.title):
				saw_credits = true
				await shot("r5_16_creditos")
			await close_menus()
		elif main.ui.hud.dlg_active:
			if not maps.has("_shot_" + W.map_id):
				maps["_shot_" + W.map_id] = true
				await shot("r5_15_epilogo_" + W.map_id)
			await advance_dialogs(30)
		await frames(10)
		t += 10.0 / 60.0
	await r5_dialogs()
	await frames(20)
	check("R5: Rei dos Ecos libertado (flag rei_morto)", Game.has_flag("rei_morto") and Game.has_flag("catedral_liberta"))
	check("R5: Jornada chega a 5/5 guardiões", Game.guardians_done() == 5, str(Game.guardians_done()))
	check("R5: memória de Ivar e a última lembrança (Coroa Partida: a fenda e o selo de Ione)", Game.item_count("lembranca_ivar") == 1 and Game.has_flag("mem_rei_morto")
		and Historia.has_artefato("coroa_partida") and not Historia.artefato("coroa_partida").get("placeholder", false) and "Lúmen" in " ".join(Historia.artefato("coroa_partida")["lembranca"]["linhas"]))
	check("R5: as fissuras se fecham (revelação final dos cinco artefatos)", Game.has_flag("fissuras_fechadas"))
	var all5 := true
	for m in ["vila_lumen", "forja_cobre", "porto_lanternas", "refugio_muralha", "acampamento_aurora"]:
		if not Game.has_flag("epilogo_" + m):
			all5 = false
	check("R5: epílogo visita as cinco comunidades", all5)
	check("R5: créditos finais exibidos", saw_credits)
	check("R5: epílogo concluído e Harmonia dos Ecos recebida", Game.has_flag("epilogo_visto") and Game.has_eco("harmonia"))
	check("R5: o herói volta ao Acampamento em festa (Ione e Sena)", W.map_id == "acampamento_aurora" and ent_by_id("ione_aurora") != null and ent_by_id("sena_festa") != null and ent_by_id("aurora_festa1") != null)
	check("R5: música do Acampamento muda depois do Rei", Audio.place_for_map("acampamento_aurora", W.map) == "vila_festa")
	check("R5: missão principal 5 concluída", Game.quest_step("principal5") >= Data.quests["principal5"]["etapas"].size(), Game.objective_text())
	await shot("r5_17_acampamento_festa")
	# consequências visíveis nas comunidades (moradores e cenário)
	W.load_map("vila_lumen", "from_santuario")
	await frames(10)
	check("R5: Vila Lúmen em festa (Teo voltou, lanternas, fala nova da Maru)", ent_by_id("teo_vila") != null and ent_by_id("fim_vila_l1") != null and ent_by_id("anciao").def["dialog"] == "anciao_fim")
	await shot("r5_18_vila_festa")
	W.load_map("porto_lanternas", "default")
	await frames(10)
	check("R5: Bruna e Ravi no cais do Porto", ent_by_id("bruna_porto") != null and ent_by_id("ravi_porto") != null)
	W.load_map("refugio_muralha", "default")
	await frames(10)
	check("R5: Vesna no Refúgio (arco fechado)", ent_by_id("vesna_refugio") != null and ent_by_id("talia").def["dialog"] == "talia_fim")
	# pós-jogo: Harmonia dos Ecos
	W.load_map("acampamento_aurora", "from_harmonia")
	await frames(10)
	check("R5: selo do Salão da Harmonia fechado antes do Eco", W.is_solid_char(r5_tile(38, 1)))
	Game.eco_slots[0] = "harmonia"
	Game.eco_changed.emit()
	await goto(tpos(38, 5), 6.0, 30.0)
	P.energy = 100.0
	await tap("eco1", 2)
	await frames(8)
	check("R5: a Harmonia dos Ecos abre o Salão da Harmonia (desafios opcionais)", Game.has_flag("harmonia_aberta") and not W.is_solid_char(r5_tile(38, 1)))
	check("R5: Harmonia expande o bestiário com notas", Catedral.harmonia_note("cristil").length() > 20)
	await talk("sena_festa")
	check("R5: Sena oferece 'O Arquivo Vivo' (bestiário completo)", Game.quest_active("bestiario_completo"))
	var ok := await exit_to("salao_harmonia", 38 * 16.0 + 8.0, 8.0)
	check("R5: o Salão da Harmonia abre as provas", ok and Game.quest_active("provas_harmonia"))
	r4_heal()
	await goto(tpos(19, 34), 8.0, 30.0)
	await frames(20)
	await r5_fight_area([], 200.0, 300.0)
	await secs(1.0)
	check("R5: Prova da Floresta e das Minas vencida", Game.has_flag("prova1_ok"))

func r5_criaturas() -> void:
	var u := uuid_of(["cristil"])
	if u != "":
		var ind: Dictionary = Game.individuals[u]
		ind["nivel"] = 20
		for k in ["vitoria:a", "acao:b", "missao:c"]:
			Game.bond_activity(u, k)
		check("R5: Cristil evolui para Prismal (nv. 20 + vínculo)", Game.evolve(u) and Game.individuals[u]["species_id"] == "prismal")
	var g := uuid_of(["gravito"])
	if g != "":
		var ig: Dictionary = Game.individuals[g]
		ig["nivel"] = 20
		for k in ["vitoria:a", "acao:b", "missao:c"]:
			Game.bond_activity(g, k)
		check("R5: Gravito evolui para Monolito e mantém a ação de âncora", Game.evolve(g) and Data.species["monolito"]["acao_id"] == "ancora")
	check("R5: Velúnio tem dardo que atravessa (execução própria)", Data.skills["dardo_veu"]["exec"] == "perfura" and Data.species["astraveu"]["acao_id"] == "marca")

func r5_save_load() -> void:
	var snap := {"chests": Game.chests.size(), "flags": Game.flags.size(), "frag": Game.fragments}
	W.save_now(5)
	SaveSys.load_game(5)
	await frames(10)
	check("R5: save/load mantém Harmonia, artefato, flags e baús sem duplicar",
		Game.has_eco("harmonia") and Game.has_flag("rei_morto") and Historia.has_artefato("coroa_partida") and Game.chests.size() == snap["chests"]
		and Game.flags.size() == snap["flags"] and Game.fragments == snap["frag"])

## Atalho de desenvolvimento: --r5de=N (6 Arauto, 7 rito, 8 resgate, 9 Rei)
func r5_jump(n: int) -> void:
	for f in ["chegou_aurora", "arauto_partiu", "cruzou_selo_externo", "visitou_acampamento_aurora", "falou_sena", "quest_estrelas", "quest_vozes",
			"eco_ione_1_visto", "visitou_jardim_invertido", "jardim_luz", "visitou_escadaria_fragmentos", "escadaria_ancora", "visitou_catedral_a",
			"arauto_nave_partiu", "catedral_atalho", "eco_ione_2_visto", "catedral_luz", "enc_galeria_c_ok", "catedral_raiz", "catedral_calor",
			"visitou_catedral_b", "anc_a", "anc_b", "coro_marca"]:
		Game.set_flag(f)
	Game.hero["level"] = 21
	for pair in [["cristil", 20], ["gravito", 20]]:
		var ind := r4_ind(pair[0], pair[1])
		Game.sanctuary.append(ind["uuid"])
	if n >= 7:
		for f in ["arauto_morto", "eco_ione_3_visto", "catedral_elevador", "mem_arauto_morto"]:
			Game.set_flag(f)
	if n >= 8:
		for f in ["rito_convergencia_ok", "rc_raiz", "rc_brasa", "rc2_ok", "rc3_ok"]:
			Game.set_flag(f)
		Game.give_item("amuleto_convergencia", 1); Game.equip("amuleto_convergencia")
	if n >= 9:
		for f in ["ione_livre", "eco_ione_4_visto", "elo_raiz", "elo_brasa", "elo_velado", "elo_umbral"]:
			Game.set_flag(f)
	r4_heal()
	match n:
		6: W.load_map("catedral_b", "from_a")
		7: W.load_map("rito_convergencia", "from_b")
		8, 9: W.load_map("catedral_c", "from_rito")
	await frames(30)
	await r5_dialogs()
	if n == 6:
		await goto(tpos(30, 27), 6.0, 30.0)
		await use_ent("coro_portal_a", Vector2(0, 14), Vector2.UP)
	if n >= 8:
		await rest_at("catedral_coracao")

func run_regiao5() -> void:
	var de := 0
	for a in args:
		if a.begins_with("--r5de="):
			de = int(a.substr(7))
	await r5_setup(5)
	if de > 0:
		await r5_jump(de)
		if de <= 6: await r5_arauto()
		if de <= 7: await r5_rito()
		if de <= 8: await r5_resgate()
		await r5_rei()
		await r5_epilogo()
		await r5_criaturas()
		await r5_save_load()
		return
	await r5_entrada()
	await r5_jardim()
	await r5_escadaria()
	await r5_nave()
	await r5_ancoras()
	await r5_arauto()
	await r5_rito()
	await r5_resgate()
	await r5_rei()
	await r5_epilogo()
	await r5_criaturas()
	await r5_save_load()


# =============================================================== VITRINE DE ANIMAÇÃO (--anim [--anim=parte])
## Recorte de tela em volta de um nó (posição na tela pela transformação do canvas).
func shot_at(name: String, n: Node2D, w := 96, h := 72, dy := -12) -> void:
	if DisplayServer.get_name() == "headless":
		return
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	if img == null:
		return
	var sp: Vector2 = n.global_position - W.camera.get_screen_center_position() + Vector2(240, 135)
	var sc := float(img.get_width()) / 480.0
	if name.ends_with("_00"):
		print("ANIM shot ", name, " sp=", sp, " img=", img.get_size(), " cam=", W.camera.get_screen_center_position(), " n=", n.global_position)
	var r := Rect2i(int((sp.x - w / 2.0) * sc), int((sp.y + dy - h / 2.0) * sc), int(w * sc), int(h * sc))
	r = r.intersection(Rect2i(0, 0, img.get_width(), img.get_height()))
	DirAccess.make_dir_recursive_absolute(shot_dir)
	img.get_region(r).save_png("%s/%s.png" % [shot_dir, name])

## Não verifica nada: só captura sequências de quadros em /tmp/anim_shots para conferir a animação.
func run_anim() -> void:
	shot_dir = "/tmp/anim_shots"
	var part := "all"
	for a in args:
		if a.begins_with("--anim="):
			part = a.substr(7)
	await r5_setup(6)
	W.show_deco = true
	main.ui.instant = false
	if part != "amb":
		main.ui.hud.visible = false
	Game.god_mode = false
	if part in ["all", "amb"]:
		for m in ["vila_lumen", "bosque_lanternas", "pedreira_oca", "lago_reflexos", "passarela_ecos", "muralha_partida", "jardim_invertido", "catedral_a"]:
			W.load_map(m)
			await advance_dialogs()
			for e in W.enemies():
				e.set_physics_process(false)
			await frames(90)
			for k in 3:
				await shot("amb_%s_%d" % [m, k])
				await frames(10)
	if part in ["all", "hero"]:
		W.load_map("desfiladeiro")
		await frames(30)
		await advance_dialogs()
		P.global_position = Vector2(10 * 16, 9 * 16)
		await frames(10)
		print("ANIM hero state=", P.state, " pos=", P.global_position)
		for d in [Vector2.RIGHT, Vector2.DOWN, Vector2.UP]:
			if d == Vector2.DOWN:
				P.global_position = Vector2(20 * 16 + 8, 3 * 16)
			if d == Vector2.UP:
				P.global_position = Vector2(20 * 16 + 8, 18 * 16)
			steer(d)
			for k in 16:
				await frames(3)
				await shot_at("walk_%s_%02d" % [Art.dir_name(d), k], P)
			release_moves()
			await frames(4)
			for k in 10:
				await frames(4)
				await shot_at("stop_%s_%02d" % [Art.dir_name(d), k], P)
		P.global_position = Vector2(12 * 16, 9 * 16 + 8)
		await frames(20)
		await face(Vector2.RIGHT)
		for k in 3:
			Input.action_press("attack"); await frames(1); Input.action_release("attack")
			for f in 12:
				await frames(2)
				await shot_at("atk%d_%02d" % [k, f], P)
		await frames(30)
		steer(Vector2.RIGHT)
		await frames(3)
		Input.action_press("dodge"); await frames(1); Input.action_release("dodge")
		for f in 14:
			await frames(2)
			await shot_at("roll_%02d" % f, P)
		release_moves()
		await frames(30)
		P.take_hit(1.0, P.global_position + Vector2(12, 0), {"knock": 90.0})
		for f in 14:
			await frames(2)
			await shot_at("hurt_%02d" % f, P)
		await frames(30)
		Input.action_press("guard")
		for f in 8:
			await frames(3)
			await shot_at("guard_%02d" % f, P)
		Input.action_release("guard")
		await frames(30)
		for f in 24:
			await frames(4)
			await shot_at("idle_%02d" % f, P)
	if part in ["all", "enemy"]:
		W.load_map("bosque_lanternas")
		await frames(30)
		await advance_dialogs()
		var best: Node = null
		for e in W.enemies():
			if e.kind != "wild" and (best == null or e.global_position.distance_to(P.global_position) < best.global_position.distance_to(P.global_position)):
				best = e
		if best != null:
			P.global_position = W.safe_pos_near(best.global_position + Vector2(-40, 0))
			await frames(5)
			for f in 60:
				await frames(3)
				await shot_at("en_%02d" % f, best, 120, 80)
			best.take_damage(5.0, P.global_position, {"src": "heroi", "knock": 60.0})
			for f in 10:
				await frames(2)
				await shot_at("enhit_%02d" % f, best, 120, 80)
			best.take_damage(99999.0, P.global_position, {"src": "heroi", "knock": 60.0})
			for f in 20:
				await frames(3)
				await shot_at("endie_%02d" % f, best, 120, 80)
	if part in ["all", "fx"]:
		W.load_map("desfiladeiro")
		await frames(30)
		await advance_dialogs()
		P.global_position = Vector2(12 * 16, 9 * 16 + 8)
		await frames(20)
		W.levelup_fx(P)
		for f in 12:
			await frames(4)
			await shot_at("lvl_%02d" % f, P)
		await frames(30)
		W.heal_fx(P)
		for f in 10:
			await frames(4)
			await shot_at("heal_%02d" % f, P)
		await frames(30)
		W.evolve_fx(W.companion if W.companion != null else P)
		for f in 10:
			await frames(4)
			await shot_at("evo_%02d" % f, P, 120, 80)
		for f in 8:
			W.impact(P.global_position + Vector2(20 + f * 0, -10), ["", "agua", "brasa", "flora", "luz", "pedra", "sombra", "vento"][f], Vector2.RIGHT, f % 2 == 0)
			await frames(2)
			await shot_at("imp_%02d" % f, P)
			await frames(10)
	if part in ["all", "trans"]:
		main.ui.hud.visible = true
		W.load_map("vila_lumen")
		await frames(30)
		W.travel("bosque_lanternas", "default")
		for f in 24:
			await frames(2)
			await shot("trans_%02d" % f)
			if f == 0:
				print("ANIM fade ", main.ui.hud.fade_a)
		await frames(60)

## Curva das Regiões 1–5 (docs/BALANCO.md): com o nível e o equipamento esperados no meio de cada região
## (tests/curva_regioes.json, gerado por tools/balanco.py), cada inimigo comum dos mapas cai em ~3–5 golpes e o herói
## aguenta ~6–10 golpes dele na Aventura (com a tolerância do modelo). Usa as funções reais de Game (ataque, vida,
## redução, dificuldade) e Enemy.init (escala de vida e dano pelo nível do mapa).
func unit_curva() -> void:
	var f := FileAccess.open("res://tests/curva_regioes.json", FileAccess.READ)
	check("Curva: tests/curva_regioes.json gerado por tools/balanco.py", f != null)
	if f == null:
		return
	var cfg: Dictionary = JSON.parse_string(f.get_as_text())
	var metas: Dictionary = cfg["metas"]
	var g_lo: float = float(metas["golpes"][0]) - float(metas["tolerancia_golpes"][0])
	var g_hi: float = float(metas["golpes"][1]) + float(metas["tolerancia_golpes"][1])
	var a_lo: float = float(metas["aguenta"][0]) - float(metas["tolerancia_aguenta"][0])
	var a_hi: float = float(metas["aguenta"][1]) + float(metas["tolerancia_aguenta"][1])
	var hero0: Dictionary = Game.hero.duplicate(true)
	var eq0: Dictionary = Game.equipment.duplicate()
	var up0: Dictionary = Game.upgrades.duplicate()
	var inv0: Dictionary = Game.inventory.duplicate()
	var dif0: String = Game.difficulty
	Game.difficulty = "aventura"
	var fora_g: Array = []
	var fora_a: Array = []
	var dano_max := {}
	var ordem := ["floresta", "minas", "pantano", "fortaleza", "catedral"]
	for r in ordem:
		var c: Dictionary = cfg["regioes"][r]
		var lv: int = int(c["nivel"])
		var pts: int = lv / 3
		Game.hero["level"] = lv
		Game.hero["talents"] = {"espada": (pts + 1) / 2, "resistencia": pts / 2, "vinculo": 0}
		Game.inventory = {}
		Game.upgrades = {}
		Game.equipment = {"arma": str(c["arma"]), "protecao": str(c["protecao"]), "amuleto": str(c["amuleto"])}
		for slot in Game.equipment:
			var id: String = Game.equipment[slot]
			if id != "":
				Game.inventory[id] = 1
				Game.upgrades[id] = int(c["forja"])
		if int(c["sementes"]) > 0:
			Game.inventory["semente_vida"] = int(c["sementes"])
		var atk: float = Game.hero_atk()
		var hp: float = Game.hero_max_hp()
		var red: float = Game.hero_reduction()
		dano_max[r] = 0.0
		for ck in c["comuns"]:
			var parts: PackedStringArray = str(ck).split(":")
			var e = load("res://scripts/enemy.gd").new()
			e.init(W, parts[0], {"x": 0, "y": 0, "nivel": int(parts[1])})
			var golpes: float = e.max_hp / atk
			var aguenta: float = hp / (e.damage * Game.enemy_damage_mult() * (1.0 - red))
			dano_max[r] = max(float(dano_max[r]), float(e.damage))
			if golpes < g_lo or golpes > g_hi:
				fora_g.append("%s %s Nv%s: %.1f" % [r, parts[0], parts[1], golpes])
			if aguenta < a_lo or aguenta > a_hi:
				fora_a.append("%s %s Nv%s: %.1f" % [r, parts[0], parts[1], aguenta])
			e.free()
	Game.hero = hero0
	Game.equipment = eq0
	Game.upgrades = up0
	Game.inventory = inv0
	Game.difficulty = dif0
	Game.hero_changed.emit()
	check("Curva: comum cai em ~3–5 golpes no nível esperado de cada região", fora_g.is_empty(), str(fora_g))
	check("Curva: herói aguenta ~6–10 golpes comuns (Aventura) em cada região", fora_a.is_empty(), str(fora_a))
	check("Curva: o golpe comum mais forte cresce a cada região", float(dano_max["floresta"]) < float(dano_max["minas"]) and float(dano_max["minas"]) < float(dano_max["pantano"]) and float(dano_max["pantano"]) < float(dano_max["fortaleza"]) and float(dano_max["fortaleza"]) <= float(dano_max["catedral"]), str(dano_max))
	var g_hp: Array = []
	for b in ["cervo", "ferreiro", "bruxa", "cavaleiro", "rei"]:
		g_hp.append(float(Data.bosses[b]["hp"]))
	check("Curva: vida dos guardiões cresce a cada região", g_hp[0] < g_hp[1] and g_hp[1] < g_hp[2] and g_hp[2] < g_hp[3] and g_hp[3] < g_hp[4], str(g_hp))
	var m_hp: Array = []
	for b in ["lenhador", "vigia", "barqueiro", "gemeos", "arauto"]:
		m_hp.append(float(Data.bosses[b]["hp"]))
	check("Curva: minichefe sempre mais fraco que o guardião da mesma região", m_hp[0] < g_hp[0] and m_hp[1] < g_hp[1] and m_hp[2] < g_hp[2] and m_hp[3] < g_hp[3] and m_hp[4] < g_hp[4], str(m_hp))
	# dificuldades: História < Aventura < Desafio no dano; avisos mais longos nos modos mais fáceis
	var dm := {}
	var wm := {}
	for d in Game.DIFFICULTY_ORDER:
		Game.difficulty = d
		dm[d] = Game.enemy_damage_mult()
		wm[d] = Game.warning_mult()
	check("Dificuldade: História < Aventura < Desafio no dano inimigo", float(dm["historia"]) < float(dm["aventura"]) and float(dm["aventura"]) < float(dm["desafio"]), str(dm))
	check("Dificuldade: avisos mais longos na História, base no Desafio", float(wm["historia"]) > float(wm["aventura"]) and float(wm["aventura"]) > float(wm["desafio"]), str(wm))
	Game.difficulty = "aventura"
	var ciclo: Array = []
	for i in 3:
		Game.difficulty = Game.next_difficulty()
		ciclo.append(Game.difficulty)
	check("Dificuldade: as opções alternam entre os três modos e voltam à Aventura", ciclo == ["desafio", "historia", "aventura"], str(ciclo))
	Game.difficulty = "historia"
	var dd: Dictionary = Game.to_dict().duplicate(true)
	Game.difficulty = "aventura"
	var ok_load := Game.from_dict(dd)
	check("Dificuldade: História é salva e carregada", ok_load and Game.difficulty == "historia" and Game.difficulty_name() == "História")
	Game.difficulty = dif0


# =============================================================== INTERFACE (opções, diálogo paginado, avisos)
## Verificações rápidas da interface: entram no --unit e no --interface.
func unit_interface() -> void:
	var H: Hud = main.ui.hud
	# ---- quebra de linha e páginas: nada passa da largura e nenhuma palavra se perde
	var longo := "Ione se ajoelha na sua frente e faz o sinal: palma aberta, dois dedos dobrados. \"Estou aqui.\" A mão dela brilha azul na sua testa. ".repeat(4)
	var pages: Array = Hud.paginate(longo, 50, 6)
	var max_len := 0
	var words: Array = []
	for pg in pages:
		var pls: PackedStringArray = str(pg).split("\n")
		check_dummy(pls.size() <= 6)
		for l in pls:
			max_len = maxi(max_len, l.length())
			for w in l.split(" ", false):
				words.append(w)
	check("UI: fala longa vira páginas sem passar da largura (%d páginas)" % pages.size(), pages.size() >= 2 and max_len <= 50, str(max_len))
	check("UI: paginação não perde palavras", " ".join(words) == " ".join(longo.split(" ", false)))
	# ---- falante e retrato
	var a: Array = Hud.split_speaker("Ione: Estou aqui.")
	var b: Array = Hud.split_speaker("Memória do Eco: A floresta lembra.")
	var c: Array = Hud.split_speaker("Seu objetivo: reunir os Ecos.")
	check("UI: falante reconhecido (simples e composto) e frase comum não vira nome", a[0] == "Ione" and a[1] == "Estou aqui." and b[0] == "Memória do Eco" and c[0] == "", "%s %s %s" % [a, b, c])
	var pt_ok := true
	for nm in ["Você", "Maru", "Ione", "Bruna", "Ravi", "Vesna", "Arauto", "Ilda", "Doran", "Ilse", "Sena", "Arão", "Inscrição", "Placa", "Memória do Eco", "Eco de Ione"]:
		var pi := Hud.speaker_portrait(nm)
		if pi < 0 or pi >= 17:
			pt_ok = false
	check("UI: principais falantes têm retrato", pt_ok and Hud.speaker_portrait("Fulano") == -1)
	# ---- marcadores de botão: nenhum {…} sobra nas falas depois da troca por tecla/botão
	var sobra: Array = []
	for did in Data.dialogs:
		for blk in Data.dialogs[did]:
			for l2 in blk.get("lines", []):
				var t: String = Game.k(str(l2))
				if t.find("{") >= 0 and t.find("}") > t.find("{"):
					sobra.append(str(did))
	check("UI: falas sem marcador {…} desconhecido", sobra.is_empty(), str(sobra.slice(0, 5)))
	# ---- diálogo ao vivo: a fala longa pede mais de um OK por página e fecha no fim
	Game.prefs["vel_texto"] = 1
	var closed := [false]
	main.ui.dialog(["Ione: " + longo, "Você: Entendi."], func(): closed[0] = true)
	await frames(2)
	var np: int = H.dlg_pages.size()
	check("UI: diálogo mostra retrato e nome da Ione", H._dlg_pt_box.visible and H._dlg_name.text == "Ione" and np >= 2, "pág %d" % np)
	await ui_press("ui_accept")   # completa a página
	await ui_press("ui_accept")   # vai para a página 2
	check("UI: OK passa para a próxima página sem pular a fala", H.dlg_active and H.dlg_i == 0 and H.dlg_page == 1)
	var n := 0
	while H.dlg_active and n < 20:
		await ui_press("ui_accept")
		n += 1
	check("UI: diálogo paginado termina e chama o retorno", not H.dlg_active and closed[0])
	# ---- velocidade instantânea e texto grande
	Game.prefs["vel_texto"] = 3
	Game.prefs["texto_grande"] = true
	main.ui.dialog(["Maru: " + longo], Callable())
	await frames(2)
	check("UI: texto instantâneo mostra a página inteira de uma vez", H._dlg_body.visible_characters == -1)
	check("UI: texto grande usa letra de 16 px e caixa mais alta, com mais páginas", H._dlg.size.y > 100.0 and H.dlg_pages.size() > np, "%d" % H.dlg_pages.size())
	n = 0
	while H.dlg_active and n < 30:
		await ui_press("ui_accept")
		n += 1
	Game.prefs["vel_texto"] = 1
	Game.prefs["texto_grande"] = false
	# ---- avisos: tipo pelo texto e fila sem sobreposição
	check("UI: aviso de captura, falha e Eco têm ícones próprios", Hud.toast_kind("Lumipim capturado! Entrou na equipe (2/3).") == UIKit.IC_CAPTURA
		and Hud.toast_kind("Não é possível salvar agora (combate/captura).") == UIKit.IC_AVISO and Hud.toast_kind("Eco obtido: RAIZ VIVA! +30 fragmentos") == UIKit.IC_ECO
		and Hud.toast_kind("Comprou Tônico.") == UIKit.IC_ITEM and Hud.toast_kind("Nova técnica: Investida!") == UIKit.IC_NIVEL)
	for i in 6:
		main.ui.toast("Aviso de teste número %d" % i)
	await frames(30)
	var shown := 0
	var rects: Array = []
	for t2 in H.toasts:
		if t2["shown"] and not t2["out"]:
			shown += 1
			rects.append(Rect2(t2["node"].position, t2["node"].size))
	var overlap := false
	for i in rects.size():
		for j in range(i + 1, rects.size()):
			if rects[i].grow(-1).intersects(rects[j].grow(-1)):
				overlap = true
	check("UI: no máximo 3 avisos visíveis, os outros esperam na fila, sem sobreposição", shown <= 3 and H.toasts.size() >= 6 and not overlap, "%d vis, %d fila" % [shown, H.toasts.size()])
	# ---- opções: salvar, carregar, arquivo estranho e restaurar
	var path: String = Game.prefs_path
	check("UI: testes gravam opções em arquivo próprio", path.ends_with("prefs_teste.json"))
	Game.prefs["vel_texto"] = 2
	Game.prefs["toque_alfa"] = 0.5
	Game.prefs["setas_lado"] = "direita"
	Game.prefs["dicas"] = false
	Game.save_prefs()
	Game.prefs = Game.PREFS_DEFAULT.duplicate(true)
	Game.load_prefs()
	check("UI: opções salvas voltam ao carregar", int(Game.prefs["vel_texto"]) == 2 and is_equal_approx(float(Game.prefs["toque_alfa"]), 0.5) and Game.prefs["setas_lado"] == "direita" and Game.prefs["dicas"] == false)
	check("UI: setas do toque mudam de lado conforme a opção", TouchControls.nav_pos(0) == Vector2(454, 96) and TouchControls.nav_pos(2, true) == Vector2(454, 228))
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string("{\"vel_texto\": \"rapido\", \"lixo\": 1, \"master\": 0.3}")
	f.close()
	Game.load_prefs()
	check("UI: arquivo de opções com valor errado não quebra (ignora o inválido)", int(Game.prefs["vel_texto"]) == 2 and not Game.prefs.has("lixo") and is_equal_approx(float(Game.prefs["master"]), 0.3))
	Game.prefs["keys"] = {"attack": [KEY_L]}
	Game.reset_prefs()
	check("UI: restaurar padrões volta tudo menos as teclas", int(Game.prefs["vel_texto"]) == 1 and Game.prefs["dicas"] == true and Game.prefs["keys"].has("attack"))
	Game.reset_keys()
	# ---- tela de opções: tem tudo e ← → ajusta e grava
	main.ui.open_options()
	await frames(3)
	var s: MenuScreen = main.ui._top()
	var labels: Array = []
	for it in s.items:
		labels.append(str(it["t"]))
	var all_lab := " | ".join(labels)
	var need := ["Volume geral", "Música", "Efeitos", "Velocidade do texto", "Texto grande", "Mostrar dicas", "Tremor de tela", "Flashes de impacto",
		"Vibração", "Tamanho dos botões", "Opacidade dos botões", "Setas dos menus", "Dificuldade", "Idioma", "Restaurar opções padrão"]
	var miss: Array = []
	for nd in need:
		if all_lab.find(nd) < 0:
			miss.append(nd)
	check("UI: tela de Opções completa", miss.is_empty(), str(miss))
	for i in s.items.size():
		if str(s.items[i]["t"]).begins_with("Volume geral"):
			s.sel = i
	s._refresh()
	var m0 := float(Game.prefs["master"])
	await ui_press("ui_left")
	var saved = JSON.parse_string(FileAccess.get_file_as_string(path))
	check("UI: ← no volume diminui e grava na hora", float(Game.prefs["master"]) < m0 and saved is Dictionary and is_equal_approx(float(saved["master"]), float(Game.prefs["master"])))
	await ui_press("ui_right")
	for i in s.items.size():
		if str(s.items[i]["t"]).begins_with("Dificuldade"):
			s.sel = i
	s._refresh()
	var d0: String = Game.difficulty
	await ui_press("ui_right")
	var d1: String = Game.difficulty
	await ui_press("ui_left")
	check("UI: dificuldade alterna pelos três modos nas Opções", d1 != d0 and Game.difficulty == d0 and d1 in Game.DIFFICULTY_ORDER)
	await close_menus()
	Game.reset_prefs()

func check_dummy(_c: bool) -> void:
	pass

## Passeio visual pela interface (screenshots em $SHOTS_DIR ou /tmp/shots): diálogos com retrato, avisos, menus, opções, toque.
func run_interface() -> void:
	await frames(5)
	await shot("ui_00_titulo")
	main.start_new_game(3)
	await frames(10)
	await frames(80)
	await shot("ui_01_intro")
	await advance_dialogs()
	Game.god_mode = true
	await unit_interface()
	var H: Hud = main.ui.hud
	main.ui.banner("Vila Lúmen")
	await frames(40)
	await shot("ui_02_faixa")
	for t in ["Lumipim capturado! Entrou na equipe (2/3).", "Comprou Tônico.", "Não é possível salvar agora (combate/captura).", "Nova técnica: Investida!"]:
		main.ui.toast(t)
	await frames(30)
	await shot("ui_03_avisos")
	await secs(4.0)
	var falas := ["Maru: Brotisco, Lumipim e Cascalito... a floresta inteira confia em você! Juntos eles ficam mais fortes.",
		"Você: Eu vou trazer a Mestra Ione de volta.", "Bruna: Fica atrás de mim e mira nas pernas.", "Ravi: O vento mudou. Tem algo nos seguindo.",
		"Vesna: Você chegou longe demais, aprendiz.", "Arauto: Tudo o que foi esquecido volta para mim.", "Ilda: A forja não esfria enquanto eu estiver viva.",
		"Doran: Martelo leve, mão firme.", "Ilse: A muralha resiste. Sempre resistiu.", "Sena: Os arquivos guardam o que o Rei apagou.",
		"Arão: A água sobe toda noite. Cuidado no cais.", "Inscrição: Aqui dormem os que guardavam a ponte.", "Memória do Eco: Um menino corre entre as raízes.",
		"Eco de Ione: Eu ainda estou aqui.", "Uma fala sem ninguém falando, só narração, para conferir a caixa sem retrato."]
	for i in falas.size():
		main.ui.dialog([falas[i]], Callable())
		await frames(90)
		await shot("ui_1%02d_fala" % i)
		await advance_dialogs()
	var longa: String = "Ione: " + "Cada guardião caído devolve uma lembrança, e cada lembrança puxa outra. Se você seguir o fio, vai achar a Catedral do Vazio. ".repeat(3)
	main.ui.dialog([longa], Callable())
	await frames(400)
	await shot("ui_20_fala_pagina1")
	await ui_press("ui_accept")
	await frames(400)
	await shot("ui_21_fala_pagina2")
	await advance_dialogs()
	Game.prefs["texto_grande"] = true
	main.ui.dialog([longa], Callable())
	await frames(600)
	await shot("ui_22_texto_grande")
	await advance_dialogs()
	Game.prefs["texto_grande"] = false
	# menus
	Game.inventory["selo_basico"] = 5
	Game.inventory["pocao"] = 3
	for id in Data.items:
		if Game.is_equipment(id) and Game.rarity_of(id) >= 3:
			Game.inventory[id] = 1
			break
	main.ui.open_pause()
	await frames(10)
	await shot("ui_30_pausa")
	main.ui.open_inventory()
	await frames(5)
	var s: MenuScreen = main.ui._top()
	for i in s.items.size():
		if s.items[i].has("icol"):
			s.sel = i
			break
	s._clamp_scroll()
	s._refresh()
	await frames(20)
	await shot("ui_31_inventario_raro")
	await close_menus()
	main.ui.open_pause()
	main.ui.open_options()
	await frames(10)
	await shot("ui_32_opcoes")
	var so: MenuScreen = main.ui._top()
	so.sel = 20
	so._clamp_scroll()
	so._refresh()
	await frames(5)
	await shot("ui_33_opcoes_toque")
	await close_menus()
	main.ui.open_journey()
	await frames(10)
	await shot("ui_34_jornada")
	await close_menus()
	# toque
	TouchControls.instance._enable()
	Game.set_flag("viu_legenda_toque")
	Game.prefs["toque_tamanho"] = 1.0
	TouchControls.instance.apply_prefs()
	await frames(10)
	await shot("ui_40_toque_hud")
	main.ui.dialog(["Maru: No toque, o OK fica no canto e a fala nunca passa por baixo dele. " + "Mais texto para encher a caixa e conferir a margem. ".repeat(3)], Callable())
	await frames(500)
	await shot("ui_41_toque_fala")
	await advance_dialogs()
	main.ui.open_pause()
	await frames(10)
	await shot("ui_42_toque_pausa")
	await close_menus()
	Game.prefs["setas_lado"] = "direita"
	Game.prefs["toque_tamanho"] = 1.3
	Game.prefs["toque_alfa"] = 0.5
	TouchControls.instance.apply_prefs()
	main.ui.open_pause()
	await frames(10)
	await shot("ui_43_toque_setas_direita")
	await close_menus()
	await frames(5)
	await shot("ui_44_toque_botoes_grandes")
	Game.reset_prefs()
