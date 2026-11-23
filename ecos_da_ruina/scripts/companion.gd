extends CharacterBody2D
class_name Companion
## Criatura ativa: acompanha, luta, responde a comandos (Q) e executa ações ambientais.

var world: Node
var ind: Dictionary
var species: Dictionary
var sprite: AnimatedSprite2D
var fw := 20
var fh := 20
var target: Node = null
var atk_cd := 0.0
var inv_t := 0.0
var stuck_t := 0.0
var dash_t := 0.0
var dash_dir := Vector2.ZERO
var dash_hit := {}
var anim_lock := 0.0
var regen_t := 0.0
var face_left := false
var radius := 6.0
var flash := 0.0

func init(p_world: Node, p_ind: Dictionary) -> void:
	world = p_world
	ind = p_ind
	species = Game.sp_of(ind)

func _ready() -> void:
	collision_layer = 8
	collision_mask = 1
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	var cs := CollisionShape2D.new()
	var c := CircleShape2D.new(); c.radius = 4.0
	cs.shape = c
	add_child(cs)
	add_child(Art.shadow(0.7))
	fw = int(species["frame"][0]); fh = int(species["frame"][1])
	sprite = AnimatedSprite2D.new()
	sprite.sprite_frames = Art.creature_frames(species["sprite"], fw, fh)
	sprite.offset = Vector2(0, -fh / 2.0 + 2.0)
	add_child(sprite)
	sprite.play("idle")
	add_to_group("allies")

func uuid() -> String:
	return ind["uuid"]

func is_alive() -> bool:
	return not ind.get("exausta", false)

func is_evolved() -> bool:
	return str(species.get("habitat", "")).begins_with("Evolução")

func stat_mult() -> float:
	return 1.4 if is_evolved() else 1.0

# =============================================================== LOOP
func _physics_process(delta: float) -> void:
	if get_tree().paused or world.player == null:
		return
	inv_t = max(0.0, inv_t - delta)
	atk_cd = max(0.0, atk_cd - delta)
	anim_lock = max(0.0, anim_lock - delta)
	flash = max(0.0, flash - delta)
	sprite.modulate = Color(1.8, 1.4, 1.4) if (flash > 0.0 or (inv_t > 0.0 and int(inv_t * 20.0) % 2 == 0)) else Color.WHITE
	var cds: Dictionary = Game.skill_cd
	for k in cds.keys():
		cds[k] = max(0.0, float(cds[k]) - delta)
	if dash_t > 0.0:
		_dash(delta)
		return
	_passive(delta)
	target = _pick_target()
	var hero_pos: Vector2 = world.player.global_position
	var to_hero := hero_pos - global_position
	var moved := false
	if target != null:
		moved = _fight(delta)
	else:
		moved = _follow(delta, to_hero)
	_check_stuck(delta, moved, to_hero)

func _passive(delta: float) -> void:
	if species_id() == "brotisco" or species_id() == "galhardo":
		if not world.in_combat() and float(ind["hp"]) < Game.creature_hp_max(ind):
			regen_t += delta
			if regen_t >= 4.0:
				regen_t = 0.0
				ind["hp"] = min(Game.creature_hp_max(ind), float(ind["hp"]) + 1.0)

func species_id() -> String:
	return ind["species_id"]

func light_bonus() -> float:
	return 1.0 if species_id() in ["lumipim", "auripim"] else 0.0

# =============================================================== ESCOLHA DE ALVO
func _pick_target() -> Node:
	var b: String = Game.behavior
	var hero: Node2D = world.player
	var cap_t: Node = hero.cap_target if (hero.aiming or hero.cap_state != "") else null
	var best: Node = null
	var bd := 1e9
	var mode_manual: Node = world.hero_target if (world.hero_target != null and is_instance_valid(world.hero_target) and world.hero_target.alive_flag) else null
	for e in world.enemies():
		if not e.hittable() or e.contained or e == cap_t or e.kind == "dummy":
			continue
		if e.capturable and b in ["preservar"] and e.hp / e.max_hp <= 0.20 and e == mode_manual:
			continue
		if e.capturable and e.hp / e.max_hp <= 0.20 and b == "preservar":
			continue
		var d := hero.global_position.distance_to(e.global_position)
		var want := false
		match b:
			"acompanhar", "preservar":
				want = (e.target != null and e.st != Enemy.St.IDLE and d < 150.0) or (e.capturable and e.angry_t > 0.0 and d < 150.0) or (e.boss and e.get("activated") == true and d < 260.0)
				if b == "preservar" and e == mode_manual and d < 180.0:
					want = true
			"atacar":
				want = (e == mode_manual and d < 220.0) or (e.target != null and e.st != Enemy.St.IDLE and d < 120.0) or (e.boss and e.get("activated") == true and d < 260.0)
			"proteger":
				want = d < 70.0 and (e.target != null or e.angry_t > 0.0 or (e.boss and e.get("activated") == true))
		if want and d < bd:
			bd = d
			best = e
	return best

# =============================================================== MOVIMENTO
func _follow(delta: float, to_hero: Vector2) -> bool:
	var want_dist := 26.0 if Game.behavior != "proteger" else 18.0
	var goal: Vector2 = world.player.global_position - world.player.facing * 18.0
	var to_goal := goal - global_position
	if to_hero.length() > 150.0 and not world.in_combat():
		pass
	if to_goal.length() > want_dist:
		var spd := 92.0 if to_hero.length() < 70.0 else 120.0
		velocity = to_goal.normalized() * spd
		move_and_slide()
		_face(velocity)
		_anim("walk")
		return true
	velocity = Vector2.ZERO
	_anim("idle")
	return false

func _fight(delta: float) -> bool:
	var tp: Vector2 = target.global_position
	var to := tp - global_position
	var dist := to.length()
	var basic: Dictionary = species["basic"]
	var reach: float = float(basic["alcance"]) + float(target.radius)
	var ranged: bool = basic["tipo"] == "ranged"
	var want := reach * (0.85 if not ranged else 0.9)
	_face(to)
	var moved := false
	if dist > want:
		velocity = to.normalized() * 100.0
		move_and_slide()
		_anim("walk")
		moved = true
	elif ranged and dist < want * 0.55:
		velocity = -to.normalized() * 80.0
		move_and_slide()
		_anim("walk")
		moved = true
	else:
		velocity = Vector2.ZERO
		if anim_lock <= 0.0:
			_anim("idle")
	if dist <= reach + 4.0 and atk_cd <= 0.0 and not Combat.ray_blocked(world, global_position, tp):
		_basic_attack()
	return moved

func _basic_attack() -> void:
	var basic: Dictionary = species["basic"]
	atk_cd = float(basic["recarga"])
	var dmg: float = Game.creature_atk(ind) * stat_mult()
	var aff: String = species["afinidade"]
	var tgt := target
	anim_lock = 0.2
	if basic["tipo"] == "ranged":
		sprite.play("windup")
		var col := Color(1.0, 0.95, 0.5)
		world.bolt(global_position + Vector2(0, -8), tgt.global_position + Vector2(0, -6), col, func():
			if is_instance_valid(tgt) and tgt.hittable():
				tgt.take_damage(dmg, global_position, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": 20.0}))
	else:
		sprite.play("attack")
		var dir = (tgt.global_position - global_position).normalized()
		velocity = dir * 120.0
		tgt.take_damage(dmg, global_position, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": 30.0})

func _face(v: Vector2) -> void:
	if abs(v.x) > 0.5:
		sprite.flip_h = v.x < 0.0

func _anim(n: String) -> void:
	if anim_lock > 0.0 and n != "attack":
		return
	if sprite.animation != n:
		sprite.play(n)

# =============================================================== PRESO / REPOSICIONAMENTO
func _check_stuck(delta: float, wants_move: bool, to_hero: Vector2) -> void:
	if wants_move and velocity.length() < 8.0 or to_hero.length() > 240.0:
		stuck_t += delta
	else:
		stuck_t = max(0.0, stuck_t - delta)
	if stuck_t > 2.0:
		stuck_t = 0.0
		reposition()

## Reposicionamento excepcional: apenas para um piso seguro perto do herói, sem atravessar portas ou causar dano.
func reposition() -> void:
	var p: Vector2 = world.safe_pos_near(world.player.global_position)
	global_position = p
	velocity = Vector2.ZERO

# =============================================================== DANO
func take_hit(dmg: float, from: Vector2, opts: Dictionary = {}) -> bool:
	if not is_alive() or inv_t > 0.0:
		return false
	dmg *= Game.enemy_damage_mult()
	if species_id() == "cascalito":
		dmg *= 0.9
	elif species_id() == "rocantor":
		dmg *= 0.85
	if dash_t > 0.0:
		dmg *= 0.3
	inv_t = 0.5
	flash = 0.15
	velocity = (global_position - from).normalized() * float(opts.get("knock", 60.0)) * 0.5
	move_and_slide()
	world.spawn_text(global_position + Vector2(0, -fh), str(int(round(dmg))), Color(1, 0.6, 0.5))
	Game.damage_creature(ind, dmg)
	if not is_alive():
		world.on_companion_exhausted()
	return true

# =============================================================== HABILIDADE COMANDADA (Q)
func command_skill(dir: Vector2) -> bool:
	if not is_alive():
		return false
	var sid: String = species["skill"]
	var sk: Dictionary = Data.skills[sid]
	var cd: float = float(Game.skill_cd.get(uuid(), 0.0))
	if cd > 0.0:
		world.say("%s: habilidade em recarga (%.0f s)." % [Game.creature_name(ind), cd])
		return false
	Game.skill_cd[uuid()] = float(sk["recarga"])
	var mult := stat_mult()
	var dmg: float = (float(sk["dano"]) + Game.creature_atk(ind) * 0.6) * mult
	var aff: String = species["afinidade"]
	Audio.play(sk.get("som", "skill"))
	Game.tutorial_event("command")
	match sid:
		"raizes":
			var center: Vector2 = world.player.global_position + dir * 56.0
			if target != null and is_instance_valid(target):
				center = target.global_position
			var rad: float = float(sk["raio"]) * (1.2 if is_evolved() else 1.0)
			world.fx_roots(center, rad)
			for e in world.enemies():
				if e.hittable() and e.global_position.distance_to(center) <= rad + e.radius and e.kind != "dummy":
					e.root(float(sk["duracao"]) * mult)
					e.take_damage(dmg * 0.4, center, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": 0.0})
			global_position = global_position.move_toward(center, 12.0)
			anim_lock = 0.3
			sprite.play("windup")
		"pulso":
			var rad2: float = float(sk["raio"]) * (1.25 if is_evolved() else 1.0)
			world.fx_pulse(global_position, rad2)
			world.light_pulse(global_position, rad2)
			for e in world.enemies():
				if e.hittable() and e.global_position.distance_to(global_position) <= rad2 + e.radius and e.kind != "dummy":
					e.interrupt()
					e.take_damage(dmg * 0.5, global_position, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": 20.0})
			anim_lock = 0.3
			sprite.play("windup")
		"avanco":
			dash_dir = dir if dir != Vector2.ZERO else Vector2.RIGHT
			dash_t = 0.25
			dash_hit.clear()
			sprite.play("attack")
	return true

func _dash(delta: float) -> void:
	dash_t -= delta
	velocity = dash_dir * (float(Data.skills["avanco"]["alcance"]) / 0.25)
	move_and_slide()
	_face(dash_dir)
	var sk: Dictionary = Data.skills["avanco"]
	var dmg: float = (float(sk["dano"]) + Game.creature_atk(ind) * 0.6) * stat_mult()
	for e in world.enemies():
		if dash_hit.has(e.get_instance_id()) or not e.hittable():
			continue
		if e.global_position.distance_to(global_position) <= float(sk["raio"]) + e.radius:
			dash_hit[e.get_instance_id()] = true
			e.take_damage(dmg, global_position, {"src": "companion", "uuid": uuid(), "aff": species["afinidade"], "knock": 120.0, "ignore_guard": true})
	if dash_t <= 0.0:
		velocity = Vector2.ZERO

