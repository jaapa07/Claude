extends Enemy
## Cavaleiro Sem Rosto (guardião da Fortaleza do Eclipse).
## Fase 1: guarda frontal (escudo erguido: golpes pela frente quase não entram) e estocada longa anunciada por faixa no chão;
##         depois da estocada a lâmina crava no chão e ele fica exausto — guarda baixa, dano maior. Gira devagar: flanquear funciona.
## Fase 2 (60%): alterna a POSTURA DE MURALHA (resiste a golpes físicos; vulnerável a disparos e habilidades) e a
##         POSTURA DE ESPELHO (rebate disparos e habilidades; vulnerável à espada). A troca é comunicada por animação (pose
##         própria em cavaleiro_posturas.png), por símbolo sobre a cabeça (escudo x espelho) e também por cor.
##         Balestras da arena disparam virotes para quem não tem criatura à distância.
## Fase 3 (30%): duelos curtos entre portais — some num portal, surge noutro perto do herói, dá dois cortes anunciados e
##         fica exausto; golpes pelas costas (o companheiro flanqueando) causam dano extra e o desequilibram.
## Nenhuma decisão lê o botão apertado: tudo depende de posição, tempo e de golpes que já acertaram.

enum B { DORMANT, INTRO, CHASE, TELE_THRUST, THRUST, EXHAUSTED, SWITCH, VANISH, EMERGE, TELE_SLASH, SLASH, TRANSITION }

var activated := false
var bst := B.DORMANT
var bt := 0.0
var phase := 1
var bdef: Dictionary = {}
var arena := Rect2()
var facing_dir := Vector2.LEFT
var posture := ""
var posture_t := 0.0
var thrust_cd := 1.5
var slashes := 0
var portals: Array = []
var portal_idx := -1
var phase_done := {2: false, 3: false}
var flank_hits := 0
var last_kind := ""          # "fisico" | "distancia" (último golpe recebido; usado no teste e nas mensagens)

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	boss = true
	bdef = Data.bosses["cavaleiro"]
	max_hp = float(bdef["hp"]); hp = max_hp
	invulnerable = true
	radius = 16.0
	arena = Rect2(float(e["x0"]) * 16.0, float(e["y0"]) * 16.0, float(e["w"]) * 16.0, float(e["h"]) * 16.0)
	def["percepcao"] = 600
	for p in e.get("portais", []):
		portals.append(Vector2(float(p[0]) * 16.0 + 8.0, float(p[1]) * 16.0 + 8.0))

func activate() -> void:
	if activated:
		return
	activated = true
	bst = B.INTRO
	bt = 2.0
	world.gather_companion(arena)
	Game.set_flag("tmp_cavaleiro_ativo")
	Audio.play("boss_roar")
	world.shake(2.5, 0.8)
	world.boss_started(self)
	world.say("O Cavaleiro Sem Rosto ergue o escudo. Pela frente ele não cede: espere a estocada ou ataque pelos lados.")

func _hero() -> Vector2:
	return world.player.global_position

func _turn_toward(p: Vector2, rate: float, delta: float) -> void:
	var want := (p - global_position).normalized()
	if want == Vector2.ZERO:
		return
	var ang := facing_dir.angle_to(want)
	var step := rate * delta
	facing_dir = facing_dir.rotated(clamp(ang, -step, step)).normalized()
	face = Vector2(sign(facing_dir.x) if abs(facing_dir.x) > 0.05 else face.x, 0)
	if sprite:
		sprite.flip_h = facing_dir.x < 0.0

func _ai(delta: float) -> void:
	if bst == B.DORMANT:
		_anim("idle")
		return
	bt -= delta
	thrust_cd -= delta
	var pp := _hero()
	var to := pp - global_position
	match bst:
		B.INTRO:
			_anim("windup")
			_move(Vector2.ZERO, 0.0, delta)
			_turn_toward(pp, 3.0, delta)
			if bt <= 0.0:
				invulnerable = false
				bst = B.CHASE
				if phase == 2:
					_set_posture("muralha")
		B.CHASE:
			_turn_toward(pp, float(bdef["giro"]) * (0.8 if phase == 2 else 1.0), delta)
			if phase == 2:
				posture_t -= delta
				if posture_t <= 0.0:
					_set_posture("espelho" if posture == "muralha" else "muralha")
					return
			var dist := to.length()
			if dist > 64.0:
				_move(facing_dir, speed * (0.9 if phase == 2 else 1.0), delta)
				_anim("walk")
			else:
				_move(Vector2.ZERO, 0.0, delta)
				_anim("idle")
			if dist < 130.0 and thrust_cd <= 0.0 and abs(facing_dir.angle_to(to)) < 0.5:
				bst = B.TELE_THRUST
				bt = float(bdef["aviso_estocada"]) * Game.warning_mult()
				attack_dir = facing_dir
				Audio.play("telegraph")
		B.TELE_THRUST:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				bst = B.THRUST
				bt = 0.32
				hit_registry.clear()
				Audio.play("swing")
		B.THRUST:
			_anim("attack")
			_move(attack_dir, float(bdef["vel_estocada"]), delta)
			for t in world.targets():
				if hit_registry.has(t.get_instance_id()):
					continue
				var rel: Vector2 = t.global_position - global_position
				if rel.dot(attack_dir) > -6.0 and rel.dot(attack_dir) < 44.0 and abs(rel.dot(attack_dir.orthogonal())) < 16.0:
					hit_registry[t.get_instance_id()] = true
					if not _misses():
						t.take_hit(float(bdef["dano_estocada"]), global_position, {"knock": 170.0})
			if bt <= 0.0 or not arena.grow(-12.0).has_point(global_position + attack_dir * 14.0):
				bst = B.EXHAUSTED
				bt = float(bdef["exausto_s"])
				thrust_cd = float(bdef["recarga_estocada"]) * (1.3 if phase == 2 else 1.0)
				world.shake(2.0, 0.2)
				Audio.play("thud")
				world.fx_at("dust", global_position + attack_dir * 20.0, 0.4, 0.0, 1.5)
		B.EXHAUSTED:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("idle")
			if bt <= 0.0:
				if phase == 3:
					_vanish()
				else:
					bst = B.CHASE
		B.SWITCH:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("idle")
			if bt <= 0.0:
				bst = B.CHASE
		B.VANISH:
			_move(Vector2.ZERO, 0.0, delta)
			if sprite:
				sprite.modulate.a = clamp(bt / 0.6, 0.0, 1.0)
			if bt <= 0.0:
				_emerge()
		B.EMERGE:
			_move(Vector2.ZERO, 0.0, delta)
			_turn_toward(pp, 10.0, delta)
			if bt <= 0.0:
				invulnerable = false
				slashes = 0
				_tele_slash()
		B.TELE_SLASH:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				bst = B.SLASH
				bt = 0.2
				hit_registry.clear()
				Audio.play("swing")
				world.fx_at("slash", global_position + attack_dir * 22.0 + Vector2(0, -24), 0.25, attack_dir.angle(), 2.2)
		B.SLASH:
			_anim("attack")
			_move(attack_dir, 60.0, delta)
			for t in world.targets():
				if hit_registry.has(t.get_instance_id()):
					continue
				if Combat.in_arc(global_position, attack_dir, float(bdef["raio_corte"]), 75.0, t.global_position, 5.0):
					hit_registry[t.get_instance_id()] = true
					if not _misses():
						t.take_hit(float(bdef["dano_corte"]), global_position, {"knock": 140.0})
			if bt <= 0.0:
				slashes += 1
				if slashes < 2:
					_tele_slash()
				else:
					bst = B.EXHAUSTED
					bt = float(bdef["exausto_duelo_s"])
		B.TRANSITION:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				invulnerable = false
				if phase == 2:
					_set_posture("muralha")
				elif phase == 3:
					_vanish()
				else:
					bst = B.CHASE

func _tele_slash() -> void:
	bst = B.TELE_SLASH
	bt = (0.6 if slashes == 0 else 0.5) * Game.warning_mult()
	_turn_toward(_hero(), 99.0, 1.0)
	attack_dir = facing_dir
	Audio.play("telegraph", -4.0)

var postures_seen := {}

func _set_posture(p: String) -> void:
	posture = p
	postures_seen[p] = true
	posture_t = float(bdef["postura_s"])
	bst = B.SWITCH
	bt = 1.0
	Audio.play("guard")
	world.spawn_text(global_position + Vector2(0, -70), "Postura de Muralha" if p == "muralha" else "Postura de Espelho",
		Color(0.7, 0.85, 1.0) if p == "muralha" else Color(0.85, 0.7, 1.0))
	if p == "muralha":
		world.say("Postura de MURALHA (escudo): a espada não entra — use disparos, habilidades das criaturas ou as balestras.")
	else:
		world.say("Postura de ESPELHO (losango): disparos e habilidades são rebatidos — ataque com a espada!")

func _vanish() -> void:
	bst = B.VANISH
	bt = 0.6
	invulnerable = true
	Audio.play("dodge")
	world.fx_at("vortex", global_position + Vector2(0, -24), 0.6, 0.0, 1.6)

func _emerge() -> void:
	# portal a 60–170 px do herói, diferente do último; nunca em cima dele
	var pp := _hero()
	var best := -1
	var opts: Array = []
	for i in portals.size():
		var d: float = portals[i].distance_to(pp)
		if i != portal_idx and d > 60.0 and d < 190.0:
			opts.append(i)
	if opts.is_empty():
		for i in portals.size():
			if i != portal_idx:
				opts.append(i)
	if not opts.is_empty():
		best = opts[randi() % opts.size()]
	if best >= 0:
		portal_idx = best
		global_position = portals[best]
	bst = B.EMERGE
	bt = 0.5
	if sprite:
		sprite.modulate.a = 1.0
	world.fx_at("vortex", global_position + Vector2(0, -24), 0.5, 0.0, 1.6)
	Audio.play("telegraph", -6.0)

# =============================================================== DANO
func _front(from_pos: Vector2) -> bool:
	return facing_dir.dot((from_pos - global_position).normalized()) > 0.45

func _back(from_pos: Vector2) -> bool:
	return facing_dir.dot((from_pos - global_position).normalized()) < -0.35

func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	var src := str(opts.get("src", ""))
	var fisico: bool = src == "heroi" and not opts.get("proj", false)
	last_kind = "fisico" if fisico else "distancia"
	var m := 1.0
	if bst == B.EXHAUSTED:
		m *= float(bdef["mult_exausto"])
	elif phase == 1 and _front(from_pos):
		m *= float(bdef["guarda_frontal"])
		world.spawn_text(global_position + Vector2(0, -66), "Bloqueado", Color(0.8, 0.85, 1.0))
		Audio.play("guard", -4.0)
	if phase == 2 and bst != B.EXHAUSTED:
		if posture == "muralha":
			m *= float(bdef["muralha_fisico"]) if fisico else float(bdef["muralha_distancia"])
			if fisico:
				world.spawn_text(global_position + Vector2(0, -66), "Muralha!", Color(0.7, 0.85, 1.0))
		elif posture == "espelho":
			m *= float(bdef["espelho_fisico"]) if fisico else float(bdef["espelho_distancia"])
			if not fisico:
				world.spawn_text(global_position + Vector2(0, -66), "Rebatido!", Color(0.85, 0.7, 1.0))
	if phase == 3:
		if _back(from_pos):
			m *= float(bdef["mult_costas"])
			flank_hits += 1
			world.spawn_text(global_position + Vector2(0, -66), "Pelas costas!", Color(1.0, 0.9, 0.5))
			if bst in [B.TELE_SLASH] and flank_hits % 3 == 0:
				bst = B.EXHAUSTED
				bt = 1.0
		elif _front(from_pos) and fisico and bst != B.EXHAUSTED:
			m *= 0.5
	# a fase 3 só começa depois de ele mostrar as duas posturas (o jogador sempre vê a alternância)
	if phase == 2 and postures_seen.size() < 2:
		var floor_hp: float = max_hp * float(bdef["fases"][2]) + 1.0
		amount = min(amount * m, max(0.0, hp - floor_hp)) / max(m, 0.001)
	var got := super.take_damage(amount * m, from_pos, opts)
	_check_phase()
	return got

func _check_phase() -> void:
	if not alive_flag:
		return
	var f := hp / max_hp
	var fases: Array = bdef["fases"]
	if f <= float(fases[2]) and not phase_done[3]:
		phase_done[3] = true; phase_done[2] = true
		_enter_phase(3)
	elif f <= float(fases[1]) and not phase_done[2]:
		phase_done[2] = true
		_enter_phase(2)

func _enter_phase(n: int) -> void:
	phase = n
	bst = B.TRANSITION
	bt = 1.6
	invulnerable = true
	posture = ""
	velocity = Vector2.ZERO
	Audio.play("boss_roar")
	world.shake(3.0, 0.6)
	if n == 2:
		world.say("O Cavaleiro abaixa o escudo e muda de postura. Observe o símbolo sobre ele!")
	else:
		posture = ""
		Game.set_flag("tmp_cavaleiro_portais")
		world.say("Os portais da arena se abrem: ele vai duelar de portal em portal. Flanqueie com sua criatura!")

func interrupt() -> void:
	pass

func root(_sec: float) -> bool:
	return false

func _give_rewards(_src: String) -> void:
	if Game.has_flag(bdef["flag_morte"]):
		return
	Game.set_flag(bdef["flag_morte"])
	Game.set_flag(bdef["flag_regiao"])
	Game.set_flag("tmp_cavaleiro_ativo", false)
	Game.set_flag("tmp_cavaleiro_portais", false)
	var r: Dictionary = bdef["recompensa"]
	Game.award_encounter_xp(int(r["xp"]), int(def.get("nivel", 24)))
	Game.fragments += int(r["frag"])
	Game.inventory_changed.emit()
	Game.register_kill("cavaleiro")
	var ac := Game.active_ind()
	if not ac.is_empty() and participants.has(ac["uuid"]):
		Game.bond_activity(ac["uuid"], "vitoria:cavaleiro")
	Game.grant_eco(r["eco"])
	if not r["eco"] in Game.eco_slots:
		Game.eco_slots[1] = r["eco"]       # o Eco novo ocupa a segunda tecla (troque no menu de Ecos)
		Game.eco_changed.emit()
	world.boss_finished(self)
	Audio.play("boss_die")
	world.shake(4.0, 1.0)
	world.say("Eco obtido: PASSO UMBRAL! Atravessa fissuras violeta e portais marcados. +%d fragmentos" % int(r["frag"]))
	world.get_tree().create_timer(2.0).timeout.connect(func(): world.autosave())

func _death_fx() -> void:
	for i in 6:
		world.fx_at("vortex", global_position + Vector2(randf_range(-20, 20), randf_range(-50, 0)), 0.7, 0.0, 1.2)
	super._death_fx()

# =============================================================== VISUAIS (posturas, símbolo, portais, avisos)
var _pose: Sprite2D
var _sym: Sprite2D
var _line: Sprite2D
var _arc: Sprite2D
var _rifts: Node2D

func _ensure() -> void:
	if _pose != null:
		return
	_pose = Sprite2D.new()
	_pose.texture = Art.sprite_tex("cavaleiro_posturas")
	_pose.region_enabled = true
	_pose.region_rect = Rect2(0, 0, 64, 64)
	_pose.offset = Vector2(0, -30)
	_pose.visible = false
	add_child(_pose)
	_sym = Sprite2D.new()
	_sym.texture = Art.sprite_tex("fort_props")
	_sym.region_enabled = true
	_sym.position = Vector2(0, -72)
	_sym.visible = false
	add_child(_sym)
	_line = Sprite2D.new()
	_line.texture = Art.sprite_tex("fx_warn_tile")
	_line.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	_line.region_enabled = true
	_line.z_as_relative = false
	_line.z_index = -1
	_line.visible = false
	add_child(_line)
	_arc = Sprite2D.new()
	_arc.texture = Art.sprite_tex("fx_warn_circle")
	_arc.z_as_relative = false
	_arc.z_index = -1
	_arc.visible = false
	add_child(_arc)
	_rifts = Node2D.new()
	_rifts.top_level = true
	_rifts.z_index = 0
	add_child(_rifts)
	for p in portals:
		var a := AnimatedSprite2D.new()
		a.sprite_frames = Art.fx_frames("fort_rift", 32, 32, 2, 4.0, true)
		a.play("a")
		a.position = p + Vector2(0, -12)
		_rifts.add_child(a)

func _visuals() -> void:
	super._visuals()
	if not is_inside_tree():
		return
	_ensure()
	var tele := bst in [B.TELE_THRUST, B.TELE_SLASH] and alive_flag
	_alert.visible = tele
	_line.visible = bst == B.TELE_THRUST and alive_flag
	if _line.visible:
		var ln: float = float(bdef["vel_estocada"]) * 0.32 + 40.0
		_line.region_rect = Rect2(0, 0, ln, 28)
		_line.rotation = attack_dir.angle()
		_line.position = attack_dir * ln * 0.5
		_line.modulate = Color(1, 1, 1, 0.6)
	_arc.visible = bst == B.TELE_SLASH and alive_flag
	if _arc.visible:
		_arc.scale = Vector2.ONE * (float(bdef["raio_corte"]) * 2.0 / 72.0)
		_arc.position = attack_dir * 16.0
		_arc.modulate = Color(1, 1, 1, 0.55)
	for r in _rifts.get_children():
		r.modulate = Color(1, 1, 1, 0.9 if (phase == 3 and alive_flag) else 0.25)
	# pose: guarda (fase 1), posturas (fase 2), exausto (qualquer fase)
	var pose := -1
	if alive_flag:
		if bst == B.EXHAUSTED:
			pose = 3
		elif phase == 2 and posture != "" and bst in [B.CHASE, B.SWITCH]:
			pose = 1 if posture == "muralha" else 2
		elif phase == 1 and bst == B.CHASE and _hero().distance_to(global_position) < 140.0:
			pose = 0
	_pose.visible = pose >= 0
	if sprite:
		sprite.visible = pose < 0
	if pose >= 0:
		_pose.region_rect = Rect2(pose * 64, 0, 64, 64)
		_pose.flip_h = facing_dir.x < 0.0
		_pose.modulate = _tint_pose()
	_sym.visible = alive_flag and phase == 2 and posture != ""
	if _sym.visible:
		_sym.region_rect = Rect2(FortEnt.FPROPS["sym_muralha" if posture == "muralha" else "sym_espelho"] * 16, 0, 16, 16)
		_sym.scale = Vector2.ONE * (1.6 if bst == B.SWITCH and int(bt * 10.0) % 2 == 0 else 1.2)
	if sprite and alive_flag and flash <= 0.0 and bst != B.VANISH:
		sprite.modulate = _tint_pose()

func _tint_pose() -> Color:
	if flash > 0.0:
		return Color(2.0, 1.6, 1.6)
	if phase == 2 and posture == "muralha":
		return Color(0.8, 0.95, 1.25)
	if phase == 2 and posture == "espelho":
		return Color(1.2, 0.9, 1.3)
	return Color.WHITE
