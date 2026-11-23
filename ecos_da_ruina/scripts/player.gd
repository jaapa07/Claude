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
var powers: Node = null       # técnicas especiais (hero_powers.gd)
var carry_fire_t := 0.0       # chama de braseiro nas mãos (Região 2)
var _carry_fx: AnimatedSprite2D

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
var _aim_ring: Sprite2D
var _vortex: AnimatedSprite2D
var _slash_done := false
var _sword: Sprite2D
var _ghost_t := 0.0
var running := false          # Botas do Vento
var _run_fx_t := 0.0
var _run_hits := {}

func _ready() -> void:
	collision_layer = 2
	collision_mask = 1
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	var cs := CollisionShape2D.new()
	var c := CircleShape2D.new(); c.radius = 5.0
	cs.shape = c
	add_child(cs)
	add_child(Art.shadow(0.8))
	_aim_ring = Sprite2D.new()
	_aim_ring.texture = Art.sprite_tex("fx_aim")
	_aim_ring.top_level = true
	_aim_ring.z_index = 45
	_aim_ring.visible = false
	add_child(_aim_ring)
	_vortex = AnimatedSprite2D.new()
	_vortex.sprite_frames = Art.fx_frames("fx_vortex", 32, 32, 2, 10.0, true)
	_vortex.top_level = true
	_vortex.z_index = 45
	_vortex.visible = false
	_vortex.play("a")
	add_child(_vortex)
	sprite = AnimatedSprite2D.new()
	sprite.sprite_frames = Art.human_frames("hero")
	sprite.offset = Vector2(0, -14)
	add_child(sprite)
	# espada: sprite próprio que gira a partir da mão durante o golpe
	_sword = Sprite2D.new()
	_sword.texture = Art.sprite_tex("fx_sword")
	_sword.centered = false
	_sword.offset = Vector2(-2, -3.5)
	_sword.visible = false
	add_child(_sword)
	sprite.play("idle_down")
	_carry_fx = AnimatedSprite2D.new()
	_carry_fx.sprite_frames = Art.fx_frames("fx_fire", 16, 16, 4, 10.0, true)
	_carry_fx.position = Vector2(6, -26)
	_carry_fx.scale = Vector2(0.75, 0.75)
	_carry_fx.visible = false
	_carry_fx.play("a")
	add_child(_carry_fx)
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
	carry_fire_t = 0.0
	atk_hit.clear()
	sprite.modulate = Color.WHITE
	sprite.rotation = 0.0

func is_alive() -> bool:
	return state != S.DEAD

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
	_update_sword(delta)
	_update_capture_fx()

func _tick_timers(delta: float) -> void:
	inv_timer = max(0.0, inv_timer - delta)
	dodge_cd = max(0.0, dodge_cd - delta)
	combo_reset = max(0.0, combo_reset - delta)
	if combo_reset <= 0.0 and state != S.ATTACK:
		combo_idx = 0
	for i in 2:
		eco_cd[i] = max(0.0, eco_cd[i] - delta)
	_flash = max(0.0, _flash - delta)
	if carry_fire_t > 0.0:
		carry_fire_t = max(0.0, carry_fire_t - delta)
		if carry_fire_t <= 0.0:
			world.say("A chama se apagou nas suas mãos.")
	if _carry_fx:
		_carry_fx.visible = carry_fire_t > 0.0

func _regen(delta: float) -> void:
	vigor_idle += delta
	if vigor_idle >= VIGOR_DELAY and state != S.GUARD:
		vigor = min(VIGOR_MAX, vigor + VIGOR_REGEN * Game.weather_vigor_mult() * delta)
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
	if running and (not Input.is_action_pressed("dodge") or move_input == Vector2.ZERO or vigor <= 1.0 or aiming):
		running = false
	velocity = move_input.normalized() * SPEED * (0.7 if aiming else (1.8 if running else 1.0))
	move_and_slide()
	if running:
		_run_tick(delta)
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
		if not _slash_done:
			_slash_done = true
			var snap := snappedf(aim_dir.angle(), PI / 2.0)
			var sc: float = float(atk_def["r"]) / 26.0
			var trail = world.fx_at("slash", global_position + Vector2(0, -10) + Vector2.from_angle(snap) * 14.0, act + 0.08, snap, sc)
			trail.modulate = Color(1, 1, 1, 0.55)
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
	var dmg: float = Game.hero_atk() * float(atk_def["mult"]) * (powers.damage_mult() if powers != null else 1.0)
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
			if powers != null:
				powers.consume_counter()
			if energy_gain_window < 6.0:
				energy = min(ENERGY_MAX, energy + 2.0)
				energy_gain_window += 2.0
			world.set_hero_target(e)
			var contact: Vector2 = e.global_position.lerp(global_position + Vector2(0, -10), 0.35) + Vector2(0, -6)
			world.fx_at("hit", contact, 0.2, 0.0, 1.6)
			world.hitstop(0.055)
			world.shake(1.5, 0.08)
			Audio.play("hit")

func _start_attack(def: Dictionary, charged: bool) -> void:
	state = S.ATTACK
	atk_def = def.duplicate()
	if charged:
		atk_def["charged"] = true
		if Game.item_count("corrente_vinculo") > 0:
			world.chain_pull(global_position, aim_dir)
	atk_t = 0.0
	atk_queued = false
	_slash_done = false
	atk_def["idx"] = 3 if charged else combo_idx
	var wp := Game.weapon_profile()
	atk_def["r"] = float(atk_def["r"]) + float(wp["alcance"])
	atk_def["arc"] = float(atk_def["arc"]) * float(wp["arco"])
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
	world.dust(global_position)
	Game.tutorial_event("dodge")

func _state_dodge(delta: float) -> void:
	dodge_t += delta
	velocity = dodge_dir * DODGE_SPEED * (1.0 - 0.5 * dodge_t / DODGE_DUR)
	move_and_slide()
	if dodge_t >= DODGE_DUR:
		dodge_cd = DODGE_COOLDOWN
		state = S.FREE
		# Botas do Vento: continuar segurando a esquiva vira corrida
		if Game.item_count("botas_vento") > 0 and Input.is_action_pressed("dodge") and move_input != Vector2.ZERO:
			running = true
			_run_hits.clear()

func _run_tick(delta: float) -> void:
	_use_vigor(14.0 * delta)
	_run_fx_t -= delta
	if _run_fx_t <= 0.0:
		_run_fx_t = 0.12
		if ResourceLoader.exists("res://assets/sprites/fx_vento.png"):
			world.fx_at("vento", global_position + Vector2(0, -4) - facing * 6.0, 0.25, facing.angle())
		else:
			world.dust(global_position)
	var now := Time.get_ticks_msec()
	for e in world.enemies():
		if not e.hittable() or e.kind == "dummy" or (e.kind == "wild" and e.angry_t <= 0.0):
			continue
		if e.global_position.distance_to(global_position) <= 12.0 + e.radius:
			var k: int = e.get_instance_id()
			if now - int(_run_hits.get(k, -9999)) < 600:
				continue
			_run_hits[k] = now
			e.take_damage(Game.hero_atk() * 0.9, global_position - facing * 4.0, {"src": "heroi", "knock": 140.0, "dir": facing})
			e.interrupt()
			world.hitstop(0.04)
			Audio.play("hit", -4.0)

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
	if powers != null and powers.try_parry(dmg, from, opts):
		return false
	dmg *= Game.enemy_damage_mult() * (1.0 - Game.hero_reduction())
	dmg *= Game.hab_shield_mult()   # escudo de habilidade da criatura (Casca, Halo, Muralha, Placa)
	var to_src := (from - global_position).normalized()
	if state == S.GUARD and not opts.get("indefensavel", false) and aim_dir.dot(to_src) > 0.2:
		var cost := dmg * 0.9
		if vigor >= cost:
			_use_vigor(cost)
			# golpe pesado "parcialmente indefensável": a defesa segura só 30%
			var taken := dmg * (1.0 - (0.3 if opts.get("guarda_parcial", false) else GUARD_REDUCTION))
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
	if state == S.DEAD:
		return true
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

## Dano do ambiente (piso quente, poça de escória, piso que desaba): sem atordoar nem empurrar.
func env_damage(d: float, txt := "") -> void:
	if state == S.DEAD or Game.god_mode:
		return
	d *= Game.enemy_damage_mult() * (1.0 - Game.hero_reduction() * 0.5)
	_flash = 0.12
	Audio.play("hurt", -10.0)
	if txt != "":
		world.spawn_text(global_position + Vector2(0, -36), txt, Color(1.0, 0.6, 0.3))
	_apply_damage(d)

func _apply_damage(d: float) -> void:
	Game.hero["hp"] = max(0.0, float(Game.hero["hp"]) - d)
	Game.hero_changed.emit()
	world.spawn_text(global_position + Vector2(0, -28), str(int(round(d))), Color(1, 0.4, 0.4))
	if float(Game.hero["hp"]) <= 0.0:
		if Game.flask_ready():
			# Frasco de Seiva: levanta o herói com metade da vida
			Game.use_flask()
			Game.hero["hp"] = Game.hero_max_hp() * 0.5
			Game.hero_changed.emit()
			inv_timer = 1.5
			Audio.play("heal")
			world.fx_at("reviver" if ResourceLoader.exists("res://assets/sprites/fx_reviver.png") else "sparkle", global_position + Vector2(0, -12), 0.7, 0.0, 1.8)
			world.say("O Frasco de Seiva te levantou! (enche de novo no santuário)")
			return
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
	elif id == "ruptura_ignea":
		world.eco_ruptura(global_position + aim_dir * 22.0, aim_dir)
	elif id == "olhar_velado":
		world.eco_olhar(global_position)

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
		if dest == "equipe":
			world.say("%s capturado! Entrou na equipe (%d/3)." % [nm, Game.team.size()])
		else:
			world.say("%s capturado! Equipe cheia: guardado no Santuário (%d/%d)." % [nm, Game.sanctuary.size(), Game.SANCTUARY_CAP])
			world.say("Troque criaturas em qualquer cristal de santuário.")
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

## Arco do golpe (graus, relativos à mira): [início, fim, escala]
const SWING := [[-110.0, 60.0, 1.0], [110.0, -60.0, 1.0], [-150.0, 150.0, 1.15], [-180.0, 180.0, 1.25]]

func _update_sword(delta: float) -> void:
	if state != S.ATTACK:
		_sword.visible = false
		return
	var wind: float = atk_def["wind"]
	var act: float = atk_def["act"]
	var rec: float = atk_def["rec"]
	var sw: Array = SWING[int(atk_def.get("idx", 0))]
	var a0 := deg_to_rad(float(sw[0]))
	var a1 := deg_to_rad(float(sw[1]))
	var base := aim_dir.angle()
	var ang: float
	var alpha := 1.0
	if atk_t < wind:
		# levanta a espada para trás
		ang = a0 - deg_to_rad(18.0) * (atk_t / wind)
	elif atk_t < wind + act:
		var f := (atk_t - wind) / act
		f = 1.0 - pow(1.0 - f, 2.0)
		ang = lerp(a0 - deg_to_rad(18.0), a1, f)
		_ghost_t -= delta
		if _ghost_t <= 0.0:
			_ghost_t = 0.016
			_spawn_ghost()
	else:
		var f2: float = (atk_t - wind - act) / max(rec, 0.01)
		ang = a1
		alpha = 1.0 if f2 < 0.5 else clamp(1.0 - (f2 - 0.5) * 2.0, 0.0, 1.0)
	_sword.visible = true
	_sword.rotation = base + ang
	_sword.scale = Vector2.ONE * float(sw[2])
	if bool(Game.weapon_profile()["lanca"]):
		_sword.scale.x *= 1.45        # lança: haste mais longa (mesmo sprite, provisório)
	_sword.modulate.a = alpha
	# mão: um pouco à frente do corpo; de costas a espada passa por trás
	_sword.position = Vector2(0, -12) + aim_dir * 3.0
	_sword.z_index = -1 if Art.dir_name(facing) == "up" else 1

func _spawn_ghost() -> void:
	var g := Sprite2D.new()
	g.texture = _sword.texture
	g.centered = false
	g.offset = _sword.offset
	g.global_position = _sword.global_position
	g.rotation = _sword.rotation
	g.scale = _sword.scale
	g.modulate = Color(0.75, 0.95, 1.0, 0.45)
	world.add_fx(g)
	var tw := g.create_tween()
	tw.tween_property(g, "modulate:a", 0.0, 0.12)
	tw.tween_callback(g.queue_free)

func _update_capture_fx() -> void:
	var t: Node = cap_target if (cap_target != null and is_instance_valid(cap_target)) else null
	_aim_ring.visible = aiming and t != null
	if _aim_ring.visible:
		_aim_ring.global_position = t.global_position + Vector2(0, -4)
		_aim_ring.modulate = Color(0.6, 1.0, 0.7) if cap_msg == "" else Color(1.0, 0.6, 0.45)
	_vortex.visible = cap_state == "canal" and t != null
	if _vortex.visible:
		_vortex.global_position = t.global_position + Vector2(0, -6)
		var f := cap_timer / CAPTURE_CHANNEL
		_vortex.scale = Vector2.ONE * (1.2 - 0.5 * f)
		_vortex.rotation += 0.15
