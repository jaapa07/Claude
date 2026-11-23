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
var magnet_t := 0.0          # Ímã do Ferrunho
var magnet_radius := 96.0
var _magnet_fx: AnimatedSprite2D
var dash_sk: Dictionary = {}   # habilidade do avanço em curso (Avanço Rochoso, Passo Sombrio, investidas em cadeia...)
var dash_hops := 0

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
	Game.hab_tick(delta)
	if dash_t > 0.0:
		_dash(delta)
		return
	_passive(delta)
	if magnet_t > 0.0:
		magnet_t -= delta
		if _magnet_fx:
			_magnet_fx.visible = magnet_t > 0.0
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
	# Nimbelo/Nimbélio: olhos de orvalho revelam espectros por perto (sem gastar nada)
	if species.get("acao_id", "") == "reflexo":
		world.reveal_spirits(global_position, 64.0 * (1.3 if is_evolved() else 1.0), 0.3)
	if species_id() in ["goturim", "marulume"]:
		if not world.in_combat() and float(ind["hp"]) < Game.creature_hp_max(ind):
			regen_t += delta
			if regen_t >= 4.0:
				regen_t = 0.0
				ind["hp"] = min(Game.creature_hp_max(ind), float(ind["hp"]) + 2.0)
	if species_id() == "brotisco" or species_id() == "galhardo":
		if not world.in_combat() and float(ind["hp"]) < Game.creature_hp_max(ind):
			regen_t += delta
			if regen_t >= 4.0:
				regen_t = 0.0
				ind["hp"] = min(Game.creature_hp_max(ind), float(ind["hp"]) + 1.0)

func species_id() -> String:
	return ind["species_id"]

func light_bonus() -> float:
	return 1.0 if species_id() in ["lumipim", "auripim", "nimbelo", "nimbelio"] else 0.0

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
		var spd := (92.0 if to_hero.length() < 70.0 else 120.0) * (1.0 + Game.acc_stat(ind, "vel")) * Game.weather_speed_mult(species["afinidade"])
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
		velocity = to.normalized() * 100.0 * Game.weather_speed_mult(species["afinidade"])
		move_and_slide()
		_anim("walk")
		moved = true
	elif ranged and dist < want * 0.55:
		velocity = -to.normalized() * 80.0 * Game.weather_speed_mult(species["afinidade"])
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
	# 0,6: calibrado no teste para o companheiro responder por ~25–35% do dano da dupla
	var dmg: float = Game.creature_atk(ind) * stat_mult() * 0.6
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
	dmg *= Game.enemy_damage_mult() * Game.COMPANION_DAMAGE_TAKEN
	if species_id() == "cascalito":
		dmg *= 0.9
	elif species_id() == "rocantor":
		dmg *= 0.85
	dmg *= 1.0 - float(species.get("reducao_dano", 0.0))
	if randf() < float(species.get("esquiva", 0.0)):
		# Fuligin/Cinzavéu: some na fumaça
		inv_t = 0.3
		world.spawn_text(global_position + Vector2(0, -fh), "Esquivou", Color(0.8, 0.8, 0.9))
		return false
	if dash_t > 0.0:
		dmg *= 0.3
	dmg *= Game.hab_shield_mult()   # Escudo de Casca / Halo / Muralha
	inv_t = 0.5
	flash = 0.15
	velocity = (global_position - from).normalized() * float(opts.get("knock", 60.0)) * 0.5
	move_and_slide()
	world.spawn_text(global_position + Vector2(0, -fh), str(int(round(dmg))), Color(1, 0.6, 0.5))
	Game.damage_creature(ind, dmg)
	if not is_alive():
		world.on_companion_exhausted()
	return true

## Calor do piso: espécies de brasa são imunes (passiva).
func heat_immune() -> bool:
	return bool(species.get("imune_calor", false))

func env_damage(d: float) -> void:
	if not is_alive() or heat_immune():
		return
	flash = 0.12
	world.spawn_text(global_position + Vector2(0, -fh), str(int(round(d))), Color(1, 0.6, 0.3))
	Game.damage_creature(ind, d * Game.heat_mult())
	if not is_alive():
		world.on_companion_exhausted()

## Ação ambiental: a criatura vai até perto do alvo, faz a animação e um traço visível liga os dois.
func env_action_fx(target_pos: Vector2) -> void:
	var to := target_pos - global_position
	if to.length() > 30.0:
		global_position = global_position + to.normalized() * min(24.0, to.length() - 20.0)
	_face(to)
	anim_lock = 0.4
	sprite.play("attack")
	var col := Color(1.0, 0.6, 0.25)
	match species.get("acao_id", ""):
		"trilho": col = Color(0.6, 0.8, 1.0)
		"fumaca": col = Color(0.5, 0.45, 0.6)
		"roda": col = Color(0.5, 0.85, 1.0)
		"lodo": col = Color(0.55, 0.75, 0.5)
		"reflexo": col = Color(0.85, 0.75, 1.0)
		"fresta": col = Color(0.6, 0.45, 0.9)
		"helice": col = Color(0.75, 0.9, 1.0)
		"prisma", "ancora", "marca": col = Catedral.action_color(species.get("acao_id", ""))   # Região 5
		"calor": col = Color(1.0, 0.8, 0.3)
	world.bolt(global_position + Vector2(0, -8), target_pos + Vector2(0, -6), col, func():
		world.fx_at({"fogo": "fire", "roda": "splash", "lodo": "bolhas"}.get(species.get("acao_id", ""), "sparkle"), target_pos + Vector2(0, -8), 0.5))

func absorb_projectile(_p: Node) -> void:
	world.spawn_text(global_position + Vector2(0, -fh), "Absorveu", Color(0.7, 0.85, 1.0))
	Audio.play("guard", -4.0)
	if not ind.get("exausta", false):
		ind["hp"] = min(Game.creature_hp_max(ind), float(ind["hp"]) + 2.0)

# =============================================================== HABILIDADE COMANDADA (Q)
## Executa a habilidade ativa escolhida pelo jogador (Game.hab_active). O tipo de execução vem de "exec" em skills.json;
## números, raio, recarga e efeitos visuais vêm da própria habilidade.
func command_skill(dir: Vector2) -> bool:
	if not is_alive():
		return false
	var sid: String = Game.hab_active(ind)
	if not Data.skills.has(sid):
		return false
	var sk: Dictionary = Data.skills[sid]
	var cd: float = float(Game.skill_cd.get(uuid(), 0.0))
	if cd > 0.0:
		world.say("%s: habilidade em recarga (%.0f s)." % [Game.creature_name(ind), cd])
		return false
	Game.skill_cd[uuid()] = float(sk["recarga"]) * Game.creature_cd_mult(ind)
	var mult := stat_mult()
	var dmg: float = (float(sk.get("dano", 0)) + Game.creature_atk(ind) * 0.6) * mult
	var aff: String = species["afinidade"]
	Audio.play(sk.get("som", "skill"))
	Game.tutorial_event("command")
	var ex := str(sk.get("exec", sid))
	match ex:
		"prender":
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
			_fx_area(str(sk.get("fx", "pulse")), global_position, rad2)
			if bool(sk.get("luz", false)):
				world.light_pulse(global_position, rad2)
			if float(sk.get("revela", 0.0)) > 0.0:
				world.reveal_spirits(global_position, rad2 + 20.0, float(sk["revela"]) * mult)
			if bool(sk.get("acende", false)):
				world.fire_area(global_position, Vector2.RIGHT, rad2 + 10.0, 360.0, "companion")
			var stun: float = float(sk.get("atordoa", 0.0))
			for e in world.enemies():
				if e.hittable() and e.global_position.distance_to(global_position) <= rad2 + e.radius and e.kind != "dummy":
					e.interrupt()
					if stun > 0.0:
						e.root(stun * mult)
					e.take_damage(dmg * 0.5, global_position, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": float(sk.get("knock", 20.0))})
			anim_lock = 0.3
			sprite.play("windup")
		"cone":
			var cdir := dir if dir != Vector2.ZERO else Vector2.RIGHT
			if target != null and is_instance_valid(target):
				cdir = (target.global_position - global_position).normalized()
			var rr: float = float(sk["alcance"]) * (1.25 if is_evolved() else 1.0)
			var arc: float = float(sk["arco"])
			var cfx := str(sk.get("fx", "fire"))
			if cfx == "slash":
				world.fx_at("slash", global_position + cdir * 18.0 + Vector2(0, -6), 0.25, cdir.angle(), 1.3)
			else:
				for k in 3:
					world.fx_at(cfx, global_position + cdir * (10.0 + rr * 0.28 * k) + Vector2(0, -6), 0.45, 0.0, 0.8 + 0.25 * k)
			for e in world.enemies():
				if e.hittable() and e.kind != "dummy" and Combat.in_arc(global_position, cdir, rr, arc, e.global_position, e.radius):
					e.take_damage(dmg, global_position, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": float(sk.get("knock", 40.0))})
			if bool(sk.get("acende", false)):
				world.fire_area(global_position, cdir, rr + 10.0, arc + 10.0, "companion")
			if bool(sk.get("vento", false)):
				FortEnt.wind_area(world, global_position, cdir, rr + 16.0, arc + 10.0)   # Região 4: hélices, névoa, cata-ventos
			_face(cdir)
			anim_lock = 0.35
			sprite.play("attack")
		"ima":
			magnet_t = float(sk["duracao"]) * mult
			magnet_radius = float(sk["raio"]) * (1.2 if is_evolved() else 1.0)
			if _magnet_fx == null:
				_magnet_fx = AnimatedSprite2D.new()
				_magnet_fx.sprite_frames = Art.fx_frames("fx_pulse", 48, 48, 3, 6.0, true)
				_magnet_fx.modulate = Color(0.55, 0.75, 1.0, 0.45)
				_magnet_fx.position = Vector2(0, -6)
				_magnet_fx.play("a")
				add_child(_magnet_fx)
			_magnet_fx.scale = Vector2.ONE * (magnet_radius / 96.0)
			_magnet_fx.visible = true
			for e in world.enemies():
				if e.hittable() and e.kind != "dummy" and e.global_position.distance_to(global_position) <= magnet_radius:
					if e.small:
						e.knock_v = (global_position - e.global_position).normalized() * 140.0
					e.take_damage(dmg * 0.4, global_position, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": 0.0})
			anim_lock = 0.3
			sprite.play("windup")
		"nuvem":
			var center: Vector2 = world.player.global_position + dir * float(sk["alcance"])
			if target != null and is_instance_valid(target):
				center = target.global_position
			var rad3: float = float(sk["raio"]) * (1.25 if is_evolved() else 1.0)
			world.smoke_cloud(center, rad3, float(sk["duracao"]) * mult)
			for e in world.enemies():
				if e.hittable() and e.kind != "dummy" and e.global_position.distance_to(center) <= rad3 + e.radius:
					e.take_damage(dmg * 0.3, center, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": 0.0})
			anim_lock = 0.3
			sprite.play("windup")
		"avanco", "avanco_cadeia":
			if bool(sk.get("umbral", false)) and _umbral_blink(sk, dir, dmg):
				return true      # Região 4: investida de sombra entre pontos visíveis
			dash_dir = dir if dir != Vector2.ZERO else Vector2.RIGHT
			dash_sk = sk
			dash_hops = int(sk.get("saltos", 0)) if ex == "avanco_cadeia" else 0
			if dash_hops > 0:
				var first := _nearest_enemy(global_position, float(sk["alcance"]) * 1.6, {})
				if first != null:
					dash_dir = (first.global_position - global_position).normalized()
			dash_t = 0.25
			dash_hit.clear()
			sprite.play("attack")
		"onda":
			# onda d'água à frente: empurra longe os inimigos leves e interrompe ataques
			var odir := dir if dir != Vector2.ZERO else Vector2.RIGHT
			if target != null and is_instance_valid(target):
				odir = (target.global_position - global_position).normalized()
			var orr: float = float(sk["alcance"]) * (1.25 if is_evolved() else 1.0)
			var oarc: float = float(sk.get("arco", 50))
			for k in 3:
				world.fx_at("onda", global_position + odir * (12.0 + orr * 0.3 * k) + Vector2(0, -6), 0.4, odir.angle(), 0.8 + 0.2 * k)
			for e in world.enemies():
				if e.hittable() and e.kind != "dummy" and Combat.in_arc(global_position, odir, orr, oarc, e.global_position, e.radius):
					var push: float = float(sk.get("empurra", 220.0)) if e.small else float(sk.get("knock", 50.0))
					e.interrupt()
					e.take_damage(dmg, global_position, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": 0.0})
					if is_instance_valid(e) and e.alive_flag and not e.boss:
						e.knock_v = odir * push
			_face(odir)
			anim_lock = 0.35
			sprite.play("attack")
		"lodo":
			# campo de lodo: inimigos dentro ficam lentos; o lançamento fere de leve
			var lc: Vector2 = world.player.global_position + dir * float(sk.get("alcance", 56))
			if target != null and is_instance_valid(target):
				lc = target.global_position
			var lr: float = float(sk["raio"]) * (1.25 if is_evolved() else 1.0)
			world.mud_field(lc, lr, float(sk["duracao"]) * mult)
			world.fx_at("bolhas", lc, 0.5, 0.0, 1.4)
			for e in world.enemies():
				if e.hittable() and e.kind != "dummy" and e.global_position.distance_to(lc) <= lr + e.radius:
					e.slow_t = max(e.slow_t, 1.0)
					e.take_damage(dmg * 0.4, lc, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": 0.0})
			anim_lock = 0.3
			sprite.play("windup")
		"perfura":
			Catedral.pierce(self, sk, dir, dmg, aff)   # Região 5: projétil que atravessa um inimigo
		"cadeia":
			_chain_bolt(sk, dmg, aff)
		"cura":
			_heal_area(sid, sk, dmg, aff)
		"escudo":
			var dur: float = float(sk.get("duracao", 5.0)) * (1.2 if is_evolved() else 1.0)
			Game.hab_shield(dur, float(sk.get("reducao", 0.3)))
			var hp_pos: Vector2 = world.player.global_position
			world.fx_at(str(sk.get("fx", "parry")), hp_pos + Vector2(0, -12), 0.5, 0.0, 1.5)
			world.fx_at(str(sk.get("fx", "parry")), global_position + Vector2(0, -8), 0.5, 0.0, 1.2)
			world.spawn_text(hp_pos + Vector2(0, -30), "Escudo -%d%%" % int(round(float(sk.get("reducao", 0.3)) * 100.0)), Color(0.7, 0.85, 1.0))
			if bool(sk.get("luz", false)):
				world.light_pulse(global_position, 56.0)
			anim_lock = 0.3
			sprite.play("windup")
	return true

## Efeito de área com sprites existentes (sem _draw).
func _fx_area(kind: String, center: Vector2, rad: float) -> void:
	match kind:
		"pulse":
			world.fx_pulse(center, rad)
		"burst":
			world.fx_at("burst", center + Vector2(0, -6), 0.35, 0.0, rad / 32.0)
			world.fx_pulse(center, rad)
		"quake":
			world.fx_at("quake", center, 0.4, 0.0, rad / 24.0)
			world.shake(1.5, 0.15)
		_:
			world.fx_at(kind, center + Vector2(0, -6), 0.4, 0.0, 1.2)
			for k in 6:
				world.fx_at(kind, center + Vector2.from_angle(TAU * k / 6.0) * rad * 0.6 + Vector2(0, -6), 0.45, 0.0, 1.1)

func _nearest_enemy(from: Vector2, max_d: float, skip: Dictionary) -> Node:
	var best: Node = null
	var bd := max_d
	for e in world.enemies():
		if not e.hittable() or e.kind == "dummy" or skip.has(e.get_instance_id()):
			continue
		var d: float = from.distance_to(e.global_position)
		if d <= bd:
			bd = d
			best = e
	return best

## Raio/fagulha/sombra que salta entre inimigos próximos (dano imediato; o traço é só visual).
func _chain_bolt(sk: Dictionary, dmg: float, aff: String) -> void:
	var first: Node = target if (target != null and is_instance_valid(target) and target.hittable() and target.kind != "dummy") else null
	if first == null:
		first = _nearest_enemy(global_position, float(sk.get("alcance", 100)), {})
	anim_lock = 0.3
	sprite.play("windup")
	if first == null:
		world.fx_at(str(sk.get("fx", "sparkle")), global_position + Vector2(0, -10), 0.4)
		return
	var hit := {}
	var from := global_position + Vector2(0, -8)
	var cur: Node = first
	var n := int(sk.get("saltos", 3))
	var col := Color(1.0, 0.95, 0.5)
	match aff:
		"brasa": col = Color(1.0, 0.55, 0.25)
		"sombra": col = Color(0.6, 0.5, 0.8)
	while cur != null and hit.size() < n:
		hit[cur.get_instance_id()] = true
		var to: Vector2 = cur.global_position + Vector2(0, -6)
		var fxk := str(sk.get("fx", "sparkle"))
		world.bolt(from, to, col, func(): world.fx_at(fxk, to, 0.35))
		cur.take_damage(dmg, from, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": 25.0})
		if float(sk.get("cega", 0.0)) > 0.0 and is_instance_valid(cur) and "blind_t" in cur:
			cur.blind_t = max(float(cur.blind_t), float(sk["cega"]))
		from = to
		cur = _nearest_enemy(to, float(sk.get("raio", 60)), hit)
	if bool(sk.get("luz", false)):
		world.light_pulse(global_position, 40.0)
	_face(first.global_position - global_position)

## Cura em área: o herói e a própria criatura; "Bosque Vivo" também prende os pequenos ao redor.
func _heal_area(sid: String, sk: Dictionary, dmg: float, aff: String) -> void:
	var hero: Node2D = world.player
	var heal: float = Game.hab_heal(ind, sid)
	var center: Vector2 = hero.global_position
	if global_position.distance_to(center) > float(sk.get("raio", 48)):
		global_position = global_position.move_toward(center, 24.0)
	hero.heal(heal)
	world.spawn_text(center + Vector2(0, -30), "+%d" % int(round(heal)), Color(0.5, 1.0, 0.5))
	ind["hp"] = min(Game.creature_hp_max(ind), float(ind["hp"]) + heal * 0.6)
	var fxk := str(sk.get("fx", "bond"))
	if fxk == "roots":
		world.fx_roots(center, float(sk.get("raio", 48)))
	else:
		world.fx_at(fxk, center + Vector2(0, -12), 0.6, 0.0, 1.4)
	world.fx_at("bond", global_position + Vector2(0, -8), 0.5)
	Audio.play("heal", -4.0)
	if bool(sk.get("luz", false)):
		world.light_pulse(global_position, float(sk.get("raio", 48)))
	if float(sk.get("dano", 0)) > 0.0:
		var rad: float = float(sk.get("raio", 48))
		for e in world.enemies():
			if e.hittable() and e.kind != "dummy" and e.global_position.distance_to(center) <= rad + e.radius:
				e.root(float(sk.get("duracao", 2.0)) * stat_mult())
				e.take_damage(dmg * 0.4, center, {"src": "companion", "uuid": uuid(), "aff": aff, "knock": 0.0})
	anim_lock = 0.3
	sprite.play("windup")

func _dash(delta: float) -> void:
	dash_t -= delta
	var sk: Dictionary = dash_sk if not dash_sk.is_empty() else Data.skills["avanco"]
	velocity = dash_dir * (float(sk["alcance"]) / 0.25)
	move_and_slide()
	_face(dash_dir)
	var dmg: float = (float(sk["dano"]) + Game.creature_atk(ind) * 0.6) * stat_mult()
	var hit_now: Node = null
	for e in world.enemies():
		if dash_hit.has(e.get_instance_id()) or not e.hittable():
			continue
		if e.global_position.distance_to(global_position) <= float(sk["raio"]) + e.radius:
			dash_hit[e.get_instance_id()] = true
			hit_now = e
			e.take_damage(dmg, global_position, {"src": "companion", "uuid": uuid(), "aff": species["afinidade"], "knock": 120.0, "ignore_guard": true})
	if sk.has("fx") and Engine.get_physics_frames() % 4 == 0:
		world.fx_at(str(sk["fx"]), global_position + Vector2(0, -6), 0.3)
	# investida em cadeia: ao acertar (ou ao fim do avanço), ricocheteia para o próximo inimigo próximo
	if dash_hops > 0 and (hit_now != null or dash_t <= 0.0) and not dash_hit.is_empty():
		var nxt := _nearest_enemy(global_position, float(sk["alcance"]) * 1.4, dash_hit)
		dash_hops -= 1
		if nxt != null and dash_hops > 0:
			dash_dir = (nxt.global_position - global_position).normalized()
			dash_t = 0.25
			world.dust(global_position)
			return
		dash_hops = 0
	if dash_t <= 0.0:
		velocity = Vector2.ZERO
		if dash_sk.has("explosao"):
			_explode(dash_sk)    # Região 4: salto com explosão localizada (Brasardo/Solarco)
		dash_sk = {}
		dash_hops = 0


# =============================================================== REGIÃO 4 (Fortaleza do Eclipse)
## Investida Umbral: some na sombra e ressurge num ponto VISÍVEL à frente (alvo ou direção), ferindo quem estiver na linha.
## Nunca atravessa paredes: o destino precisa estar livre e com linha de visão.
func _umbral_blink(sk: Dictionary, dir: Vector2, dmg: float) -> bool:
	var reach: float = float(sk.get("alcance", 70)) * (1.2 if is_evolved() else 1.0)
	var goal: Vector2 = global_position + (dir if dir != Vector2.ZERO else Vector2.RIGHT) * reach
	if target != null and is_instance_valid(target) and target.hittable() and target.global_position.distance_to(global_position) <= reach * 1.3:
		goal = target.global_position + (target.global_position - global_position).normalized() * 14.0
	var steps := 8
	while steps > 0 and (world.tile_solid_at(goal) or Combat.ray_blocked(world, global_position, goal)):
		goal = global_position.lerp(goal, 0.8)
		steps -= 1
	if steps == 0 or goal.distance_to(global_position) < 12.0:
		return false
	var from := global_position
	world.fx_at("vortex", from + Vector2(0, -6), 0.3)
	for e in world.enemies():
		if not e.hittable() or e.kind == "dummy":
			continue
		var seg: Vector2 = goal - from
		var tt: float = clamp((e.global_position - from).dot(seg) / max(1.0, seg.length_squared()), 0.0, 1.0)
		if (from + seg * tt).distance_to(e.global_position) <= float(sk.get("raio", 16)) + e.radius:
			e.take_damage(dmg, from, {"src": "companion", "uuid": uuid(), "aff": species["afinidade"], "knock": 60.0, "ignore_guard": true})
	global_position = goal
	world.fx_at("vortex", goal + Vector2(0, -6), 0.3)
	_face(goal - from)
	anim_lock = 0.3
	sprite.play("attack")
	return true

## Explosão localizada ao fim do salto: fere em volta, reaquece mecanismos antigos e acende fornalhas.
func _explode(sk: Dictionary) -> void:
	var rad: float = float(sk["explosao"]) * (1.2 if is_evolved() else 1.0)
	var dmg: float = (float(sk["dano"]) + Game.creature_atk(ind) * 0.6) * stat_mult() * 0.6
	for k in 5:
		world.fx_at("fire", global_position + Vector2.from_angle(TAU * k / 5.0) * rad * 0.5 + Vector2(0, -4), 0.45, 0.0, 1.2)
	world.fx_at("hit", global_position + Vector2(0, -6), 0.3, 0.0, 2.0)
	world.shake(1.5, 0.15)
	Audio.play("thud", -4.0)
	for e in world.enemies():
		if e.hittable() and e.kind != "dummy" and e.global_position.distance_to(global_position) <= rad + e.radius:
			e.take_damage(dmg, global_position, {"src": "companion", "uuid": uuid(), "aff": species["afinidade"], "knock": 80.0})
	world.fire_area(global_position, Vector2.RIGHT, rad + 12.0, 360.0, "companion")
