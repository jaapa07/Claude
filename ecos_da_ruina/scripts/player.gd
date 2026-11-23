extends CharacterBody2D
class_name Player
## Herói: livre, ataque, defesa, esquiva, captura, dano, interação, morto.

enum S { FREE, ATTACK, GUARD, DODGE, CAPTURE, HURT, INTERACT, DEAD }

# ---- parâmetros ajustáveis (pontos de partida do documento)
const SPEED := 78.0
const VIGOR_MAX := 100.0
const ENERGY_MAX := 60.0
const DODGE_COST := 25.0
const DODGE_DUR := 0.32
const DODGE_SPEED := 190.0
const IFRAME_START := 0.06
const IFRAME_END := 0.20
const DODGE_COOLDOWN := 0.30
const VIGOR_REGEN := 25.0
const VIGOR_DELAY := 0.6
const GUARD_REDUCTION := 0.7
const HURT_INVULN := 0.65
const CHARGED_COST := 20.0
const CHARGE_TIME := 0.6
const CAPTURE_RANGE := 150.0
const CAPTURE_CHANNEL := 1.2
const COMBO := [
	{"wind": 0.08, "act": 0.10, "rec": 0.16, "r": 26.0, "arc": 62.0, "mult": 1.0, "knock": 30.0, "lunge": 26.0},
	{"wind": 0.07, "act": 0.10, "rec": 0.16, "r": 26.0, "arc": 62.0, "mult": 1.0, "knock": 30.0, "lunge": 26.0},
	{"wind": 0.12, "act": 0.14, "rec": 0.30, "r": 30.0, "arc": 78.0, "mult": 1.5, "knock": 80.0, "lunge": 30.0},
]
const CHARGED := {"wind": 0.10, "act": 0.12, "rec": 0.36, "r": 34.0, "arc": 110.0, "mult": 2.4, "knock": 110.0, "lunge": 0.0}

var world: Node
var state := S.FREE
var facing := Vector2.DOWN
var aim_dir := Vector2.DOWN
var move_input := Vector2.ZERO
var vigor := VIGOR_MAX
var energy := ENERGY_MAX
var vigor_idle := 0.0
var inv_timer := 0.0           # invulnerabilidade pós-dano
var dodge_t := 0.0
var dodge_cd := 0.0
var dodge_dir := Vector2.DOWN
var hurt_t := 0.0
var stagger_extra := 0.0
var combo_idx := 0
var combo_reset := 0.0
var atk_t := 0.0
var atk_def: Dictionary = {}
var atk_hit := {}
var atk_queued := false
var atk_hold := 0.0
var atk_pressed_prev := false
var eco_cd := [0.0, 0.0]
var energy_gain_window := 0.0

# captura
var aiming := false
var cap_target: Node = null
var cap_state := "" # "", "voo", "canal"
var cap_timer := 0.0
var cap_chance := 0.0
var cap_seal_id := "selo_basico"
var cap_msg := ""
var _seal: Node2D = null

var sprite: AnimatedSprite2D
var shadow: Sprite2D
var _flash := 0.0
var last_slash_draw := 0.0

func _ready() -> void:
	collision_layer = 2
	collision_mask = 1
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	var cs := CollisionShape2D.new()
	var c := CircleShape2D.new(); c.radius = 5.0
	cs.shape = c
	add_child(cs)
	shadow = Sprite2D.new()
	shadow.texture = Art.sprite_tex("shadow")
	shadow.position = Vector2(0, 1)
	add_child(shadow)
	sprite = AnimatedSprite2D.new()
	sprite.sprite_frames = Art.human_frames("hero")
	sprite.offset = Vector2(0, -14)
	add_child(sprite)
	sprite.play("idle_down")
	add_to_group("hero")
	reset_resources()

func reset_resources() -> void:
	vigor = VIGOR_MAX
	energy = ENERGY_MAX
	state = S.FREE
	inv_timer = 0.0
	aiming = false
	cap_state = ""
	cap_target = null
	atk_hit.clear()
	sprite.modulate = Color.WHITE
	sprite.rotation = 0.0

func hp() -> float:
	return float(Game.hero["hp"])

# =============================================================== ENTRADA
func _unhandled_input(event: InputEvent) -> void:
	if state == S.DEAD or state == S.INTERACT or get_tree().paused:
		return
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT or event.button_index == MOUSE_BUTTON_RIGHT:
			var d := (get_global_mouse_position() - global_position)
			if d.length() > 4.0:
				aim_dir = d.normalized()
				facing = aim_dir

func _physics_process(delta: float) -> void:
	if state == S.DEAD or get_tree().paused:
		return
	Game.play_time += delta
	_tick_timers(delta)
	move_input = Input.get_vector("move_left", "move_right", "move_up", "move_down")
	match state:
		S.FREE: _state_free(delta)
		S.ATTACK: _state_attack(delta)
		S.GUARD: _state_guard(delta)
		S.DODGE: _state_dodge(delta)
		S.CAPTURE: _state_capture(delta)
		S.HURT: _state_hurt(delta)
	_regen(delta)
	_update_anim()
	queue_redraw()

func _tick_timers(delta: float) -> void:
	inv_timer = max(0.0, inv_timer - delta)
	dodge_cd = max(0.0, dodge_cd - delta)
	combo_reset = max(0.0, combo_reset - delta)
	if combo_reset <= 0.0 and state != S.ATTACK:
		combo_idx = 0
	for i in 2:
		eco_cd[i] = max(0.0, eco_cd[i] - delta)
	_flash = max(0.0, _flash - delta)

func _regen(delta: float) -> void:
	vigor_idle += delta
	if vigor_idle >= VIGOR_DELAY and state != S.GUARD:
		vigor = min(VIGOR_MAX, vigor + VIGOR_REGEN * delta)
	if not world.in_combat():
		energy = min(ENERGY_MAX, energy + 4.0 * delta)
	else:
		energy = min(ENERGY_MAX, energy + 0.4 * delta)
	energy_gain_window = max(0.0, energy_gain_window - delta)

func _use_vigor(n: float) -> void:
	vigor = max(0.0, vigor - n)
	vigor_idle = 0.0

# =============================================================== ESTADOS
func _state_free(delta: float) -> void:
	if move_input != Vector2.ZERO:
		facing = move_input.normalized()
		aim_dir = facing
		Game.tutorial_event("move")
	velocity = move_input.normalized() * SPEED * (0.7 if aiming else 1.0)
	move_and_slide()
	# ordem de prioridade dos comandos
	if Input.is_action_just_pressed("dodge"):
		_try_dodge()
		return
	if Input.is_action_pressed("guard") and not aiming:
		_enter_guard()
		return
	var atk_down := Input.is_action_pressed("attack")
	if atk_down:
		atk_hold += delta
	if Input.is_action_just_pressed("attack"):
		atk_hold = 0.0
	if Input.is_action_just_released("attack"):
		if atk_hold >= CHARGE_TIME and vigor >= CHARGED_COST and not aiming:
			_use_vigor(CHARGED_COST)
			_start_attack(CHARGED, true)
		elif not aiming:
			_start_attack(COMBO[combo_idx], false)
		atk_hold = 0.0
		return
	if Input.is_action_just_pressed("capture"):
		_capture_pressed()
	if aiming:
		if Input.is_action_just_pressed("swap"):
			_cycle_capture_target()
		_validate_aim()
	elif Input.is_action_just_pressed("swap"):
		if Game.swap_active():
			world.refresh_companion(true)
			Audio.play("ui_ok")
		elif Game.team.size() > 1:
			world.say("Troca em recarga (%.0f s)." % Game.swap_cd)
	if Input.is_action_just_pressed("skill"):
		world.companion_command()
	if Input.is_action_just_pressed("behavior"):
		world.cycle_behavior()
	if Input.is_action_just_pressed("consumable"):
		use_potion()
	if Input.is_action_just_pressed("eco1"):
		use_eco(0)
	if Input.is_action_just_pressed("eco2"):
		use_eco(1)
	if Input.is_action_just_pressed("interact"):
		world.try_interact()

func _state_attack(delta: float) -> void:
	atk_t += delta
	var wind: float = atk_def["wind"]
	var act: float = atk_def["act"]
	var rec: float = atk_def["rec"]
	var total := wind + act + rec
	# avanço curto durante a preparação/ativo
	if atk_t < wind + act:
		velocity = aim_dir * (float(atk_def["lunge"]) / (wind + act))
	else:
		velocity = Vector2.ZERO
	move_and_slide()
	if atk_t >= wind and atk_t < wind + act:
		_attack_hits()
	# buffer do próximo golpe durante a recuperação
	if Input.is_action_just_pressed("attack") and atk_t > wind:
		atk_queued = true
	if Input.is_action_just_pressed("dodge") and atk_t >= wind + act and vigor >= DODGE_COST and dodge_cd <= 0.0:
		_try_dodge()
		return
	if atk_t >= total:
		if atk_queued and combo_idx < 2 and not atk_def.has("charged"):
			combo_idx += 1
			_start_attack(COMBO[combo_idx], false)
		else:
			combo_idx = 0 if (combo_idx >= 2 or atk_def.has("charged")) else combo_idx + 1
			combo_reset = 0.35
			state = S.FREE

func _attack_hits() -> void:
	var dmg: float = Game.hero_atk() * float(atk_def["mult"])
	for e in world.enemies():
		if atk_hit.has(e.get_instance_id()):
			continue
		if not e.hittable():
			continue
		if not Combat.in_arc(global_position, aim_dir, float(atk_def["r"]), float(atk_def["arc"]), e.global_position, e.radius):
			continue
		if Combat.ray_blocked(world, global_position, e.global_position):
			continue
		atk_hit[e.get_instance_id()] = true
		var got: float = e.take_damage(dmg, global_position, {"src": "heroi", "knock": float(atk_def["knock"]), "ataque": "espada", "dir": aim_dir})
		if got > 0.0:
			if energy_gain_window < 6.0:
				energy = min(ENERGY_MAX, energy + 2.0)
				energy_gain_window += 2.0
			world.set_hero_target(e)
			world.hitstop(0.055)
			world.shake(1.5, 0.08)
			Audio.play("hit")

func _start_attack(def: Dictionary, charged: bool) -> void:
	state = S.ATTACK
	atk_def = def.duplicate()
	if charged:
		atk_def["charged"] = true
	atk_t = 0.0
	atk_queued = false
	atk_hit.clear()
	if world.mouse_aiming():
		var d := (get_global_mouse_position() - global_position)
		if d.length() > 4.0:
			aim_dir = d.normalized()
	elif move_input != Vector2.ZERO:
		aim_dir = move_input.normalized()
	facing = aim_dir
	Audio.play("swing")

func _enter_guard() -> void:
	state = S.GUARD
	Game.tutorial_event("guard")

func _state_guard(_delta: float) -> void:
	velocity = move_input.normalized() * SPEED * 0.35
	if move_input != Vector2.ZERO:
		facing = move_input.normalized()
		aim_dir = facing
	move_and_slide()
	if Input.is_action_just_pressed("dodge"):
		_try_dodge()
		return
	if not Input.is_action_pressed("guard"):
		state = S.FREE

func _try_dodge() -> void:
	if dodge_cd > 0.0 or vigor < DODGE_COST:
		if vigor < DODGE_COST:
			world.say("Sem vigor para esquivar.")
		return
	_use_vigor(DODGE_COST)
	state = S.DODGE
	dodge_t = 0.0
	dodge_dir = move_input.normalized() if move_input != Vector2.ZERO else aim_dir
	facing = dodge_dir
	aiming = false
	atk_queued = false
	Audio.play("dodge")
	Game.tutorial_event("dodge")

func _state_dodge(delta: float) -> void:
	dodge_t += delta
	velocity = dodge_dir * DODGE_SPEED * (1.0 - 0.5 * dodge_t / DODGE_DUR)
	move_and_slide()
	if dodge_t >= DODGE_DUR:
		dodge_cd = DODGE_COOLDOWN
		state = S.FREE

func is_dodge_invulnerable() -> bool:
	return state == S.DODGE and dodge_t >= IFRAME_START and dodge_t <= IFRAME_END

func _state_hurt(delta: float) -> void:
	hurt_t -= delta
	velocity = velocity.move_toward(Vector2.ZERO, 600.0 * delta)
	move_and_slide()
	if hurt_t <= 0.0:
		state = S.FREE

func set_busy(b: bool) -> void:
	if b and state != S.DEAD:
		state = S.INTERACT
		velocity = Vector2.ZERO
	elif state == S.INTERACT:
		state = S.FREE

# =============================================================== DANO
## Retorna true se o golpe efetivamente atingiu (ou foi absorvido pela defesa).
func take_hit(dmg: float, from: Vector2, opts: Dictionary = {}) -> bool:
	if state == S.DEAD or Game.god_mode:
		return false
	if inv_timer > 0.0 or is_dodge_invulnerable():
		return false
	dmg *= Game.enemy_damage_mult() * (1.0 - Game.hero_reduction())
	var to_src := (from - global_position).normalized()
	if state == S.GUARD and not opts.get("indefensavel", false) and aim_dir.dot(to_src) > 0.2:
		var cost := dmg * 0.9
		if vigor >= cost:
			_use_vigor(cost)
			var taken := dmg * (1.0 - GUARD_REDUCTION)
			_apply_damage(taken)
			inv_timer = 0.2
			velocity = -to_src * 60.0
			Audio.play("guard")
			world.spawn_text(global_position + Vector2(0, -26), "Defendeu", Color(0.6, 0.85, 1.0))
			world.shake(1.0, 0.06)
			return true
		# guarda quebrada
		_use_vigor(vigor)
		Audio.play("guard_break")
		stagger_extra = 0.25
	_apply_damage(dmg)
	inv_timer = HURT_INVULN
	state = S.HURT
	hurt_t = 0.22 + stagger_extra
	stagger_extra = 0.0
	velocity = -to_src * float(opts.get("knock", 90.0))
	atk_queued = false
	_interrupt_capture("O vínculo foi interrompido!")
	aiming = false
	_flash = 0.2
	Audio.play("hurt")
	world.hitstop(0.06)
	world.shake(3.0, 0.15)
	return true

func _apply_damage(d: float) -> void:
	Game.hero["hp"] = max(0.0, float(Game.hero["hp"]) - d)
	Game.hero_changed.emit()
	world.spawn_text(global_position + Vector2(0, -28), str(int(round(d))), Color(1, 0.4, 0.4))
	if float(Game.hero["hp"]) <= 0.0:
		_die()

func _die() -> void:
	state = S.DEAD
	velocity = Vector2.ZERO
	_interrupt_capture("")
	aiming = false
	Audio.play("death")
	sprite.play("dead_down")
	world.on_player_died()

func revive_at(pos: Vector2) -> void:
	global_position = pos
	velocity = Vector2.ZERO
	reset_resources()
	sprite.play("idle_down")

func heal(n: float) -> void:
	Game.hero["hp"] = min(Game.hero_max_hp(), float(Game.hero["hp"]) + n)
	Game.hero_changed.emit()

func use_potion() -> void:
	if float(Game.hero["hp"]) >= Game.hero_max_hp():
		world.say("Vida já está cheia.")
		return
	if Game.take_item("pocao", 1):
		heal(float(Data.items["pocao"]["cura"]))
		Audio.play("heal")
		world.spawn_text(global_position + Vector2(0, -28), "+%d" % int(Data.items["pocao"]["cura"]), Color(0.5, 1, 0.5))
	else:
		world.say("Sem tônicos.")

func use_eco(slot: int) -> void:
	var id: String = Game.eco_slots[slot]
	if id == "":
		return
	var sk: Dictionary = Data.skills.get(id, {})
	if eco_cd[slot] > 0.0 or energy < float(sk.get("custo", 0)):
		world.say("Eco indisponível.")
		return
	energy -= float(sk.get("custo", 0))
	eco_cd[slot] = float(sk.get("recarga", 8.0))
	if id == "raiz_viva":
		world.eco_raiz_viva(global_position + aim_dir * 14.0)

# =============================================================== CAPTURA
func _capture_pressed() -> void:
	if state != S.FREE:
		return
	if not aiming:
		if Game.item_count("selo_basico") + Game.item_count("selo_refinado") <= 0:
			if Game.individuals.is_empty() and not Game.has_flag("primeira_captura"):
				Game.give_item("selo_basico", 1)
				world.say("Reposição gratuita de selo!")
			else:
				world.say("Você não tem Selos de Vínculo.")
				return
		aiming = true
		cap_msg = ""
		_select_nearest_target()
		if cap_target == null:
			cap_msg = "Nenhuma criatura selvagem por perto."
		Audio.play("ui_move")
		return
	# segunda pressão: confirma o lançamento
	if cap_target == null or not is_instance_valid(cap_target):
		aiming = false
		return
	var v := validate_target(cap_target)
	if v != "":
		world.say(v)
		Audio.play("puzzle_no")
		return
	_launch_seal()

func capture_targets() -> Array:
	var out: Array = []
	for e in world.enemies():
		if e.capturable and e.alive_flag and global_position.distance_to(e.global_position) <= CAPTURE_RANGE + 40.0:
			out.append(e)
	out.sort_custom(func(a, b): return global_position.distance_to(a.global_position) < global_position.distance_to(b.global_position))
	return out

func _select_nearest_target() -> void:
	var t := capture_targets()
	cap_target = t[0] if not t.is_empty() else null

func _cycle_capture_target() -> void:
	var t := capture_targets()
	if t.is_empty():
		cap_target = null
		return
	var i := t.find(cap_target)
	cap_target = t[(i + 1) % t.size()]

func _validate_aim() -> void:
	if cap_target == null or not is_instance_valid(cap_target) or not cap_target.alive_flag:
		_select_nearest_target()
	if cap_target != null:
		cap_msg = validate_target(cap_target)
		cap_chance = chance_for(cap_target)
	if Input.is_action_just_pressed("guard") or Input.is_action_just_pressed("pause"):
		aiming = false

## Motivo de rejeição ("" = alvo válido). Não consome selo.
func validate_target(t: Node) -> String:
	if not t.alive_flag or t.dying:
		return "Alvo derrotado."
	if not t.capturable:
		return "Esta criatura não pode ser capturada."
	if t.invulnerable:
		return "Alvo invulnerável."
	var d := global_position.distance_to(t.global_position)
	if d > CAPTURE_RANGE:
		return "Fora de alcance."
	if t.protect_t > 0.0:
		return "O alvo está protegido (%.0f s)." % t.protect_t
	if t.hp / t.max_hp > Game.CAPTURE_HP_LIMIT:
		return "Enfraqueça mais (≤ 35%% de vida)."
	if Combat.ray_blocked(world, global_position, t.global_position):
		return "Sem linha de visão."
	if not Game.storage_has_room():
		return "Equipe e santuário cheios."
	return ""

func chance_for(t: Node) -> float:
	var seal := "selo_refinado" if Game.item_count("selo_refinado") > 0 else "selo_basico"
	if t.garantida:
		return 1.0
	return Game.capture_chance(t.species_id, t.level, t.hp / t.max_hp, t.is_controlled(), seal)

func _launch_seal() -> void:
	cap_seal_id = "selo_refinado" if Game.item_count("selo_refinado") > 0 else "selo_basico"
	Game.take_item(cap_seal_id, 1)         # consome o selo lançado
	Game.save_block += 1
	cap_chance = chance_for(cap_target)
	aiming = false
	state = S.CAPTURE
	cap_state = "voo"
	velocity = Vector2.ZERO
	Audio.play("seal_throw")
	var sd: Node2D = preload("res://scripts/seal.gd").new()
	sd.world = world
	sd.target = cap_target
	sd.global_position = global_position + Vector2(0, -12)
	sd.arrived.connect(_on_seal_arrived)
	world.add_fx(sd)
	_seal = sd
	facing = (cap_target.global_position - global_position).normalized()
	aim_dir = facing

func _on_seal_arrived(hit: bool) -> void:
	_seal = null
	if cap_state != "voo":
		return
	if not hit or cap_target == null or not is_instance_valid(cap_target) or not cap_target.alive_flag:
		_end_capture("O selo se perdeu.", false)
		return
	cap_chance = chance_for(cap_target)            # HP e condições avaliados ao iniciar a contenção
	cap_target.contain(true)
	cap_state = "canal"
	cap_timer = 0.0
	Audio.play("capture_start")

func _state_capture(delta: float) -> void:
	velocity = Vector2.ZERO
	if cap_state == "canal":
		cap_timer += delta
		if cap_target == null or not is_instance_valid(cap_target) or not cap_target.alive_flag:
			_end_capture("O alvo desapareceu.", false)
			return
		if cap_timer >= CAPTURE_CHANNEL:
			_resolve_capture()

func _resolve_capture() -> void:
	var t: Node = cap_target
	var ok := Game.rand_f() < cap_chance
	if ok:
		var ind := Game.new_individual(t.species_id, t.level)
		ind["origem"] = world.map_id
		var dest := Game.register_capture(ind)
		if dest == "cheio" or dest == "duplicado":
			t.contain(false)
			t.protect_t = 3.0
			_end_capture("Sem espaço para armazenar.", false)
			return
		t.captured_by_hero()
		var nm: String = Data.sp(t.species_id).get("nome", "")
		world.say("%s capturado! (%s)" % [nm, "equipe" if dest == "equipe" else "santuário"])
		Audio.play("capture_ok")
		world.refresh_companion(true)
		_end_capture("", true)
	else:
		t.contain(false)
		t.protect_t = 3.0
		Audio.play("capture_fail")
		_end_capture("O vínculo falhou (%d%%). Tente novamente em breve." % int(round(cap_chance * 100.0)), false)

func _interrupt_capture(msg: String) -> void:
	if cap_state == "":
		return
	if cap_target != null and is_instance_valid(cap_target):
		cap_target.contain(false)
		cap_target.protect_t = 3.0
	if _seal != null and is_instance_valid(_seal):
		_seal.queue_free()
		_seal = null
	_end_capture(msg, false)

func _end_capture(msg: String, _ok: bool) -> void:
	cap_state = ""
	cap_target = null
	if state == S.CAPTURE:
		state = S.FREE
	if Game.save_block > 0:
		Game.save_block -= 1
	if msg != "":
		world.say(msg)
		Audio.play("capture_fail")

# =============================================================== VISUAL
func _update_anim() -> void:
	var d := Art.dir_name(facing)
	var an := "idle_"
	match state:
		S.FREE:
			an = ("walk_" if move_input != Vector2.ZERO else "idle_")
		S.ATTACK:
			var wind: float = atk_def["wind"]; var act: float = atk_def["act"]
			var k := 0 if atk_t < wind else (1 if atk_t < wind + act else 2)
			an = "atk%d_" % k
		S.GUARD: an = "guard_"
		S.DODGE: an = "dodge_"
		S.HURT: an = "hurt_"
		S.CAPTURE: an = "capture_"
		S.DEAD: an = "dead_"
	var name := an + d
	if sprite.animation != name:
		sprite.play(name)
	sprite.modulate = Color(1.6, 1.3, 1.3) if (_flash > 0.0 or (inv_timer > 0.0 and int(inv_timer * 20.0) % 2 == 0 and state != S.GUARD)) else Color.WHITE
	if state == S.DODGE:
		sprite.modulate.a = 0.55 if is_dodge_invulnerable() else 0.85

func _draw() -> void:
	if state == S.ATTACK and atk_t >= float(atk_def["wind"]) and atk_t < float(atk_def["wind"]) + float(atk_def["act"]):
		var r: float = atk_def["r"]
		var arc: float = deg_to_rad(float(atk_def["arc"]))
		var a0 := aim_dir.angle() - arc
		var pts := PackedVector2Array()
		for i in range(0, 13):
			var a := a0 + (2.0 * arc) * float(i) / 12.0
			pts.append(Vector2(cos(a), sin(a)) * r + Vector2(0, -10))
		draw_polyline(pts, Color(0.95, 0.97, 1.0, 0.9), 2.0)
		var pts2 := PackedVector2Array()
		for i in range(0, 13):
			var a2 := a0 + (2.0 * arc) * float(i) / 12.0
			pts2.append(Vector2(cos(a2), sin(a2)) * (r - 5.0) + Vector2(0, -10))
		draw_polyline(pts2, Color(0.7, 0.85, 1.0, 0.6), 1.0)
	if state == S.GUARD:
		draw_arc(Vector2(0, -10), 14.0, aim_dir.angle() - 1.0, aim_dir.angle() + 1.0, 8, Color(0.6, 0.85, 1.0, 0.8), 2.0)
	if aiming and cap_target != null and is_instance_valid(cap_target):
		var p = cap_target.global_position - global_position
		var good := cap_msg == ""
		draw_dashed_line(Vector2(0, -10), p + Vector2(0, -6), Color(0.5, 1, 0.6) if good else Color(1, 0.6, 0.4), 1.0, 3.0)
		draw_arc(p, cap_target.radius + 5.0, 0.0, TAU, 20, Color(0.5, 1, 0.6) if good else Color(1, 0.6, 0.4), 1.5)
	if cap_state == "canal" and cap_target != null and is_instance_valid(cap_target):
		var p2 = cap_target.global_position - global_position
		var f := cap_timer / CAPTURE_CHANNEL
		draw_arc(p2, cap_target.radius + 8.0, -PI / 2.0, -PI / 2.0 + TAU * f, 24, Color(0.6, 0.95, 1.0), 2.5)
		draw_line(Vector2(0, -10), p2 + Vector2(0, -6), Color(0.6, 0.95, 1.0, 0.6), 1.0)
