extends CharacterBody2D
class_name Ally
## Aliado humano controlado pela IA (missões em dupla e trio). Cada um tem a própria criatura (AllyBeast).
## Estilos: "escudo" (Bruna: linha de frente, Provocar, defesa) e "arremesso" (Ravi: distância, discos de cobre).
## Caído: o herói fica perto por 1,2 s para reanimar; fora de combate ele se levanta sozinho.

enum St { FOLLOW, FIGHT, WINDUP, ATTACK, RECOVER, DOWN }

const REVIVE_TIME := 1.2
const SELF_REVIVE := 8.0
const LEASH := 150.0

var world: Node
var aid := ""
var def: Dictionary = {}
var slot := 0
var st := St.FOLLOW
var st_t := 0.0
var max_hp := 80.0
var hp := 80.0
var atk := 6.0
var speed := 66.0
var target: Node = null
var atk_cd := 0.0
var taunt_cd := 3.0
var guard_t := 0.0
var inv_t := 0.0
var flash := 0.0
var hurt_t := 0.0
var down_t := 0.0
var revive_prog := 0.0
var aim := Vector2.DOWN
var facing := Vector2.DOWN
var radius := 7.0
var beast: Node = null
var _hits := {}
var sprite: AnimatedSprite2D
var _bar: TextureProgressBar
var _name: Label

func init(p_world: Node, p_id: String, p_slot: int) -> void:
	world = p_world
	aid = p_id
	slot = p_slot
	def = Data.allies[aid]
	var lv: int = level()
	max_hp = float(def["hp_base"]) + float(def["hp_nivel"]) * (lv - 1)
	atk = float(def["atk_base"]) + float(def["atk_nivel"]) * (lv - 1)
	speed = float(def.get("vel", 66))
	hp = max_hp

func level() -> int:
	return max(1, Game.hero_level())

func style() -> String:
	return def.get("estilo", "escudo")

func _ready() -> void:
	collision_layer = 8
	collision_mask = 1
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	var cs := CollisionShape2D.new()
	var c := CircleShape2D.new(); c.radius = 4.5
	cs.shape = c
	add_child(cs)
	add_child(Art.shadow(0.9))
	sprite = AnimatedSprite2D.new()
	sprite.sprite_frames = Art.human_frames(def["sprite"])
	sprite.offset = Vector2(0, -14)
	add_child(sprite)
	_bar = Art.bar(4, 20)
	_bar.position = Vector2(-10, -36)
	add_child(_bar)
	_name = Fonts.label(def["nome"], 8, Color(0.75, 1.0, 0.8))
	_name.position = Vector2(-14, -48)
	_name.visible = false
	add_child(_name)
	add_to_group("allies")
	add_to_group("party")
	_play("idle")

func is_alive() -> bool:
	return st != St.DOWN

func hittable() -> bool:
	return false

# =============================================================== DANO
func take_hit(dmg: float, from: Vector2, opts: Dictionary = {}) -> bool:
	if st == St.DOWN or inv_t > 0.0:
		return false
	dmg *= Game.enemy_damage_mult() * Game.ALLY_DAMAGE_TAKEN
	var to_src := (from - global_position).normalized()
	if guard_t > 0.0 and facing.dot(to_src) > 0.1 and not opts.get("indefensavel", false):
		dmg *= 0.3
		world.spawn_text(global_position + Vector2(0, -30), "Defendeu", Color(0.6, 0.85, 1.0))
		Audio.play("guard", -4.0)
	hp -= dmg
	flash = 0.12
	hurt_t = 0.2
	inv_t = 0.35
	velocity = -to_src * float(opts.get("knock", 60.0)) * 0.5
	world.spawn_text(global_position + Vector2(0, -26), str(int(round(dmg))), Color(1.0, 0.6, 0.5))
	if hp <= 0.0:
		_go_down()
	return true

func _go_down() -> void:
	hp = 0.0
	st = St.DOWN
	down_t = 0.0
	revive_prog = 0.0
	target = null
	Audio.play("hurt", -2.0)
	world.say(def["falas"]["caida"] + " (fique perto para reanimar)")

func revive(frac: float) -> void:
	hp = max(1.0, max_hp * frac)
	st = St.FOLLOW
	inv_t = 1.0
	world.fx_at("reviver" if ResourceLoader.exists("res://assets/sprites/fx_reviver.png") else "sparkle", global_position + Vector2(0, -10), 0.6, 0.0, 1.4)
	Audio.play("heal")
	world.say(def["falas"]["volta"])
	Game.stats["reanimacoes"] = int(Game.stats.get("reanimacoes", 0)) + 1

func heal_full() -> void:
	hp = max_hp
	if st == St.DOWN:
		st = St.FOLLOW

# =============================================================== LOOP
func _physics_process(delta: float) -> void:
	if get_tree().paused or world == null or world.player == null:
		return
	inv_t = max(0.0, inv_t - delta)
	flash = max(0.0, flash - delta)
	hurt_t = max(0.0, hurt_t - delta)
	atk_cd = max(0.0, atk_cd - delta)
	taunt_cd = max(0.0, taunt_cd - delta)
	guard_t = max(0.0, guard_t - delta)
	sprite.modulate = Color(2.0, 1.6, 1.6) if flash > 0.0 else Color.WHITE
	_bar.value = clamp(hp / max_hp, 0.0, 1.0) * 1000.0
	_bar.visible = st == St.DOWN or hp < max_hp or world.in_combat()
	_name.visible = st == St.DOWN
	if world.frozen:
		velocity = Vector2.ZERO
		return
	var hero: Node2D = world.player
	if st == St.DOWN:
		_down(delta, hero)
		return
	# regenera devagar fora de combate
	if not world.in_combat() and hp < max_hp:
		hp = min(max_hp, hp + max_hp * 0.04 * delta)
	if global_position.distance_to(hero.global_position) > 260.0:
		global_position = world.safe_pos_near(hero.global_position)
	match st:
		St.FOLLOW, St.FIGHT:
			target = _pick_target(hero)
			if target != null:
				st = St.FIGHT
				_fight(delta)
			else:
				st = St.FOLLOW
				_follow(delta, hero)
		St.WINDUP:
			st_t += delta
			_move(Vector2.ZERO, 0.0)
			_play("atk0")
			if st_t >= 0.24:
				st = St.ATTACK
				st_t = 0.0
				_hits.clear()
				_strike()
		St.ATTACK:
			st_t += delta
			_move(Vector2.ZERO, 0.0)
			_play("atk2")
			if style() == "escudo":
				_melee_tick()
			if st_t >= 0.16:
				st = St.RECOVER
				st_t = 0.0
		St.RECOVER:
			st_t += delta
			_move(Vector2.ZERO, 0.0)
			_play("guard" if guard_t > 0.0 else "idle")
			if st_t >= 0.3:
				st = St.FIGHT

func _down(delta: float, hero: Node2D) -> void:
	velocity = Vector2.ZERO
	_play("dead")
	down_t += delta
	if hero.global_position.distance_to(global_position) <= 24.0 and hero.state != Player.S.DEAD:
		revive_prog += delta
		if int(revive_prog * 10.0) % 4 == 0:
			world.spark(global_position + Vector2(0, -6), 2)
		if revive_prog >= REVIVE_TIME:
			revive(0.5)
	else:
		revive_prog = max(0.0, revive_prog - delta * 0.5)
	if down_t >= SELF_REVIVE and not world.in_combat():
		revive(0.3)

func _pick_target(hero: Node2D) -> Node:
	if target != null and not is_instance_valid(target):
		target = null
	if target != null and is_instance_valid(target) and target.hittable() and target.global_position.distance_to(hero.global_position) < LEASH + 30.0:
		return target
	var best: Node = null
	var bd := 1e9
	for e in world.enemies():
		if not e.hittable() or e.kind == "dummy" or e.contained:
			continue
		if e.kind == "wild" and e.angry_t <= 0.0:
			continue          # nunca ataca criaturas calmas (são para captura)
		var dh: float = e.global_position.distance_to(hero.global_position)
		if dh > LEASH:
			continue
		var engaged: bool = e.kind == "wild" or e.st != Enemy.St.IDLE or (e.boss and e.get("activated") == true)
		if not engaged and e.global_position.distance_to(global_position) > 90.0:
			continue
		var d: float = e.global_position.distance_to(global_position)
		if d < bd:
			bd = d
			best = e
	return best

func _follow(_delta: float, hero: Node2D) -> void:
	var hf: Vector2 = hero.facing if hero.get("facing") != null else Vector2.DOWN
	var side: Vector2 = hf.orthogonal() * (14.0 if slot == 0 else -14.0)
	var goal: Vector2 = hero.global_position - hf * 20.0 + side
	var to := goal - global_position
	if to.length() > 10.0:
		var spd := speed * (1.35 if to.length() > 70.0 else 1.0)
		_move(to.normalized(), spd)
		facing = to.normalized()
		_play("walk")
	else:
		_move(Vector2.ZERO, 0.0)
		facing = hf
		_play("idle")

func _fight(_delta: float) -> void:
	var tp: Vector2 = target.global_position
	var to := tp - global_position
	var dist := to.length()
	aim = to.normalized()
	facing = aim
	if style() == "escudo":
		# Provocar: puxa a atenção dos inimigos próximos para o escudo
		if taunt_cd <= 0.0:
			var n := 0
			for e in world.enemies():
				if e.hittable() and not e.boss and e.kind != "wild" and e.kind != "dummy" and e.global_position.distance_to(global_position) < 90.0:
					e.target = self
					e.los_t = 2.5
					n += 1
			if n > 0:
				taunt_cd = 9.0
				guard_t = 1.4
				world.spawn_text(global_position + Vector2(0, -34), "Provocar!", Color(1.0, 0.85, 0.4))
				Audio.play("guard", -6.0)
		if dist > 20.0:
			_move(aim, speed)
			_play("walk")
		else:
			_move(Vector2.ZERO, 0.0)
			_play("guard" if guard_t > 0.0 else "idle")
			if atk_cd <= 0.0:
				_windup()
		# levanta o escudo quando o alvo se prepara para atacar
		if target.st == Enemy.St.WINDUP and dist < 60.0:
			guard_t = max(guard_t, 0.3)
	else:
		var keep := 70.0
		if dist < keep * 0.6:
			_move(-aim, speed * 0.9)
			_play("walk")
		elif dist > 110.0 or Combat.ray_blocked(world, global_position, tp):
			_move(aim, speed)
			_play("walk")
		else:
			_move(aim.orthogonal() * (1.0 if slot == 0 else -1.0), speed * 0.35)
			_play("idle")
			if atk_cd <= 0.0:
				_windup()

func _windup() -> void:
	st = St.WINDUP
	st_t = 0.0

func _strike() -> void:
	if style() == "escudo":
		atk_cd = 0.95
		Audio.play("swing", -6.0)
		world.fx_at("slash", global_position + aim * 14.0 + Vector2(0, -12), 0.14, aim.angle(), 0.9)
	else:
		atk_cd = 1.15
		Audio.play("seal_throw", -6.0)
		var pr: Node2D = world.spawn_projectile(global_position + Vector2(0, -12) + aim * 8.0, aim, atk * 1.1, self, "disco")
		pr.speed = 210.0
		pr.max_dist = 150.0

func _melee_tick() -> void:
	for e in world.enemies():
		if _hits.has(e.get_instance_id()) or not e.hittable() or e.kind == "dummy":
			continue
		if e.kind == "wild" and e.angry_t <= 0.0:
			continue
		if Combat.in_arc(global_position, aim, 28.0, 70.0, e.global_position, e.radius):
			_hits[e.get_instance_id()] = true
			e.take_damage(atk * 1.2, global_position, {"src": "aliado", "knock": 70.0})

func _move(dir: Vector2, spd: float) -> void:
	velocity = velocity.move_toward(dir * spd, 900.0 * get_physics_process_delta_time())
	move_and_slide()

func _play(an: String) -> void:
	if hurt_t > 0.0 and st != St.DOWN:
		an = "hurt"
	var n := "%s_%s" % [an, Art.dir_name(facing)]
	if sprite.animation != n:
		sprite.play(n)

func _exit_tree() -> void:
	if world != null and is_instance_valid(world):
		world.party_nodes.erase(self)
