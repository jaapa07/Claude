extends CharacterBody2D
class_name Enemy
## Inimigo orientado a dados. Subclasses (chefões) sobrescrevem _ai() e take_damage().

enum St { IDLE, CHASE, WINDUP, ATTACK, RECOVER, STAGGER, DEAD }

var world: Node
var kind := ""
var def: Dictionary = {}
var uid := ""
var species_id := ""
var affinity := ""
var level := 1
var max_hp := 30.0
var hp := 30.0
var radius := 9.0
var damage := 8.0
var speed := 50.0
var home := Vector2.ZERO
var st := St.IDLE
var st_t := 0.0
var target: Node2D = null
var alive_flag := true
var dying := false
var capturable := false
var garantida := false
var unique := false
var invulnerable := false
var protect_t := 0.0
var contained := false
var rooted_t := 0.0
var angry_t := 0.0
var attack_dir := Vector2.RIGHT
var face := Vector2.RIGHT
var hit_registry := {}
var participants := {}
var enc_id := ""
var boss := false
var guard_front := 0.0
var knock_v := Vector2.ZERO
var small := false
var hp_bar_t := 0.0
var xp_level := 1
var sprite: AnimatedSprite2D
var fw := 24
var fh := 24
var flash := 0.0
var wander_t := 0.0
var wander_to := Vector2.ZERO
var flank_side := 1.0
var cd := 0.0
var los_t := 0.0
var los_ok := false
var P: Dictionary = {}          # parâmetros de ataque do tipo
var shown_name := ""
var dummy_heal_t := 0.0
var _tw: Tween

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	world = p_world
	kind = p_kind
	uid = str(e.get("id", ""))
	enc_id = str(e.get("enc", ""))
	home = Vector2(float(e["x"]) * 16.0 + 8.0, float(e["y"]) * 16.0 + 8.0)
	position = home
	if kind == "wild":
		species_id = e["species"]
		level = int(e.get("level", 1))
		var s: Dictionary = Data.species[species_id]
		def = Data.enemies["selvagem"].duplicate()
		def["sprite"] = s["sprite"]
		def["frame"] = s["frame"]
		def["nome"] = s["nome"]
		affinity = s["afinidade"]
		max_hp = floor(float(s["hp_base"]) + float(s["hp_cresc"]) * (level - 1))
		damage = float(s["atk_base"]) + float(s["atk_cresc"]) * (level - 1) * 0.9
		capturable = true
		small = bool(s.get("pequeno", true))
		xp_level = level
		unique = bool(e.get("unique", false))
		garantida = bool(e.get("garantida", false))
		radius = 7.0
		shown_name = "%s Nv.%d" % [s["nome"], level]
	else:
		def = Data.enemies[kind].duplicate()
		max_hp = float(def["hp"])
		damage = float(def["dano"])
		radius = float(def.get("raio", 9))
		small = bool(def.get("pequeno", false))
		guard_front = float(def.get("guarda_frontal", 0.0))
		xp_level = int({"lobo": 3, "cogumelo": 2, "sentinela": 4, "lenhador": 6, "cervo": 8}.get(kind, 1))
		shown_name = def.get("nome", kind)
	speed = float(def.get("vel", 40))
	hp = max_hp
	var a: String = def.get("ataque", "nenhum")
	P = _attack_params(a)

func _attack_params(a: String) -> Dictionary:
	match a:
		"investida": return {"wind": 0.55, "dur": 0.28, "rec": 0.75, "cd": 1.3, "start": 78.0, "dash": 215.0, "hit_r": 12.0}
		"esporos": return {"wind": 0.80, "dur": 0.20, "rec": 1.4, "cd": 0.5, "start": 62.0, "aoe": 34.0}
		"golpe": return {"wind": 0.85, "dur": 0.16, "rec": 0.95, "cd": 0.8, "start": 34.0, "r": 36.0, "arc": 62.0}
		"selvagem": return {"wind": 0.45, "dur": 0.14, "rec": 0.9, "cd": 0.8, "start": 18.0, "r": 18.0, "arc": 50.0}
	return {}

func _ready() -> void:
	collision_layer = 4
	collision_mask = 1
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	var cs := CollisionShape2D.new()
	var c := CircleShape2D.new(); c.radius = max(4.0, radius * 0.7)
	cs.shape = c
	add_child(cs)
	var sh := Sprite2D.new()
	sh.texture = Art.sprite_tex("shadow")
	sh.scale = Vector2(max(0.6, radius / 9.0), max(0.6, radius / 9.0))
	sh.position = Vector2(0, 1)
	add_child(sh)
	var sp_name: String = def.get("sprite", "")
	if kind == "dummy":
		sp_name = "sentinela"
		def["frame"] = [32, 34]
	if sp_name != "":
		fw = int(def["frame"][0]); fh = int(def["frame"][1])
		sprite = AnimatedSprite2D.new()
		sprite.sprite_frames = Art.creature_frames(sp_name, fw, fh)
		sprite.offset = Vector2(0, -fh / 2.0 + 2.0)
		add_child(sprite)
		sprite.play("idle")
		if kind == "dummy":
			sprite.modulate = Color(1.0, 0.9, 0.7)
	add_to_group("enemies")
	if kind == "wild":
		add_to_group("wild")
	wander_to = home
	flank_side = 1.0 if randf() < 0.5 else -1.0

func hittable() -> bool:
	return alive_flag and not dying and not invulnerable

func is_controlled() -> bool:
	return rooted_t > 0.0 or st == St.STAGGER

func contain(on: bool) -> void:
	contained = on
	if on:
		st = St.IDLE
		velocity = Vector2.ZERO
		if sprite:
			sprite.modulate = Color(0.7, 1.0, 1.2)
	elif sprite:
		sprite.modulate = Color.WHITE

# =============================================================== LOOP
func _physics_process(delta: float) -> void:
	if not alive_flag or get_tree().paused:
		return
	protect_t = max(0.0, protect_t - delta)
	flash = max(0.0, flash - delta)
	hp_bar_t = max(0.0, hp_bar_t - delta)
	cd = max(0.0, cd - delta)
	angry_t = max(0.0, angry_t - delta)
	los_t -= delta
	if sprite:
		sprite.modulate = _tint()
	if contained or world.frozen:
		velocity = Vector2.ZERO
		_anim("idle")
		queue_redraw()
		return
	if rooted_t > 0.0:
		rooted_t -= delta
		velocity = knock_v
		knock_v = knock_v.move_toward(Vector2.ZERO, 500.0 * delta)
		move_and_slide()
		_anim("idle")
		queue_redraw()
		return
	_ai(delta)
	queue_redraw()

func _tint() -> Color:
	if flash > 0.0:
		return Color(2.0, 1.6, 1.6)
	if contained:
		return Color(0.7, 1.0, 1.2)
	if rooted_t > 0.0:
		return Color(0.75, 1.1, 0.75)
	if kind == "dummy":
		return Color(1.0, 0.9, 0.7)
	return Color.WHITE

func _anim(n: String) -> void:
	if sprite and sprite.animation != n:
		sprite.play(n)

func _move(dir: Vector2, spd: float, delta: float) -> void:
	velocity = dir * spd + knock_v
	knock_v = knock_v.move_toward(Vector2.ZERO, 520.0 * delta)
	move_and_slide()

# =============================================================== IA PADRÃO
func _ai(delta: float) -> void:
	match kind:
		"dummy": _ai_dummy(delta)
		"wild": _ai_wild(delta)
		_: _ai_hostile(delta)

func _ai_dummy(delta: float) -> void:
	dummy_heal_t -= delta
	if hp < max_hp and dummy_heal_t <= 0.0:
		hp = max_hp
	_move(Vector2.ZERO, 0.0, delta)

func _acquire() -> void:
	if target != null and (not is_instance_valid(target) or not target.is_alive()):
		target = null
	if los_t > 0.0 and target != null:
		return
	los_t = 0.35
	var best: Node2D = null
	var bd := float(def.get("percepcao", 90)) * (1.6 if st == St.CHASE else 1.0)
	for t in world.targets():
		var d := global_position.distance_to(t.global_position)
		if d < bd and not Combat.ray_blocked(world, global_position, t.global_position):
			bd = d
			best = t
	if best != null:
		target = best
	elif target != null and global_position.distance_to(target.global_position) > float(def.get("percepcao", 90)) * 1.8:
		target = null

func _ai_hostile(delta: float) -> void:
	match st:
		St.IDLE:
			_anim("idle")
			_move(Vector2.ZERO, 0.0, delta)
			_acquire()
			if target != null:
				st = St.CHASE
				st_t = 0.0
		St.CHASE:
			_acquire()
			if target == null:
				st = St.IDLE
				return
			_chase(delta)
		St.WINDUP:
			st_t += delta
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if st_t >= P["wind"] * Game.warning_mult():
				_begin_attack()
		St.ATTACK:
			st_t += delta
			_attack_tick(delta)
		St.RECOVER:
			st_t += delta
			_move(Vector2.ZERO, 0.0, delta)
			_anim("idle")
			if st_t >= P["rec"]:
				st = St.CHASE
		St.STAGGER:
			st_t += delta
			_move(Vector2.ZERO, 0.0, delta)
			_anim("hurt")
			if st_t >= 0.45:
				st = St.CHASE

func _face_to(p: Vector2) -> void:
	var d := p - global_position
	if abs(d.x) > 1.0:
		face = Vector2(sign(d.x), 0)
		if sprite:
			sprite.flip_h = d.x < 0.0

func _chase(delta: float) -> void:
	if P.is_empty():
		return
	var tp := target.global_position
	var to := tp - global_position
	var dist := to.length()
	_face_to(tp)
	var a: String = def.get("ataque", "")
	if a == "investida":
		# flanqueia: aproxima-se pelo lado antes de investir
		var perp := to.normalized().orthogonal() * flank_side
		var goal := tp + perp * 58.0
		if dist > 100.0:
			goal = tp
		var dir := (goal - global_position).normalized()
		_move(dir, speed, delta)
		_anim("walk")
		if dist < P["start"] and cd <= 0.0:
			_start_windup(to.normalized())
	elif a == "esporos":
		_move(Vector2.ZERO, 0.0, delta)
		_anim("idle")
		if dist < P["start"] and cd <= 0.0:
			_start_windup(to.normalized())
	else:
		if dist > P["start"] * 0.8:
			_move(to.normalized(), speed, delta)
			_anim("walk")
		else:
			_move(Vector2.ZERO, 0.0, delta)
		if dist < P["start"] and cd <= 0.0:
			_start_windup(to.normalized())

func _start_windup(dir: Vector2) -> void:
	st = St.WINDUP
	st_t = 0.0
	attack_dir = dir
	hit_registry.clear()
	Audio.play("telegraph", -8.0)

func _begin_attack() -> void:
	st = St.ATTACK
	st_t = 0.0
	hit_registry.clear()
	var a: String = def.get("ataque", "")
	if a == "investida" or a == "golpe":
		if target != null and is_instance_valid(target) and a == "investida":
			attack_dir = (target.global_position - global_position).normalized() if st_t == 0.0 and false else attack_dir
	_anim("attack")

func _attack_tick(delta: float) -> void:
	var a: String = def.get("ataque", "")
	var dmg := damage
	if a == "investida":
		_move(attack_dir, P["dash"], delta)
		_hit_circle(global_position + attack_dir * 6.0, P["hit_r"], dmg, {"knock": 110.0})
		if st_t >= P["dur"]:
			_end_attack()
	elif a == "esporos":
		_hit_circle(global_position, P["aoe"], dmg, {"knock": 70.0})
		_move(Vector2.ZERO, 0.0, delta)
		if st_t >= P["dur"]:
			_end_attack()
	else:
		_move(Vector2.ZERO, 0.0, delta)
		for t in world.targets():
			if hit_registry.has(t.get_instance_id()):
				continue
			if Combat.in_arc(global_position, attack_dir, P["r"], P["arc"], t.global_position, 5.0) and not Combat.ray_blocked(world, global_position, t.global_position):
				hit_registry[t.get_instance_id()] = true
				t.take_hit(dmg, global_position, {"knock": 120.0})
		if st_t >= P["dur"]:
			_end_attack()

func _hit_circle(center: Vector2, r: float, dmg: float, opts: Dictionary) -> void:
	for t in world.targets():
		if hit_registry.has(t.get_instance_id()):
			continue
		if center.distance_to(t.global_position) <= r + 5.0:
			hit_registry[t.get_instance_id()] = true
			t.take_hit(dmg, global_position, opts)

func _end_attack() -> void:
	st = St.RECOVER
	st_t = 0.0
	cd = P["cd"]
	flank_side = -flank_side
	velocity = Vector2.ZERO

# =============================================================== CRIATURA SELVAGEM
func _ai_wild(delta: float) -> void:
	if angry_t > 0.0 and world.player != null and world.player.state != Player.S.DEAD:
		# defende-se com golpes curtos
		match st:
			St.IDLE, St.CHASE:
				var tp: Vector2 = world.player.global_position
				var to := tp - global_position
				_face_to(tp)
				if to.length() > 24.0:
					_move(to.normalized(), speed * (0.8 if hp / max_hp < 0.35 else 1.0), delta)
					_anim("walk")
				else:
					_move(Vector2.ZERO, 0.0, delta)
				if to.length() < 26.0 and cd <= 0.0:
					target = world.player
					_start_windup(to.normalized())
			St.WINDUP:
				st_t += delta
				_move(Vector2.ZERO, 0.0, delta)
				_anim("windup")
				if st_t >= P["wind"] * Game.warning_mult():
					_begin_attack()
			St.ATTACK:
				st_t += delta
				_attack_tick(delta)
			St.RECOVER:
				st_t += delta
				_move(Vector2.ZERO, 0.0, delta)
				_anim("idle")
				if st_t >= P["rec"]:
					st = St.CHASE
			St.STAGGER:
				st_t += delta
				_move(Vector2.ZERO, 0.0, delta)
				_anim("hurt")
				if st_t >= 0.4:
					st = St.CHASE
		return
	# passeio calmo no habitat
	if st != St.IDLE:
		st = St.IDLE
	wander_t -= delta
	if wander_t <= 0.0:
		wander_t = randf_range(1.8, 4.0)
		wander_to = home + Vector2(randf_range(-36, 36), randf_range(-26, 26))
	var d := wander_to - global_position
	if d.length() > 4.0:
		_move(d.normalized(), speed * 0.5, delta)
		_face_to(wander_to)
		_anim("walk")
	else:
		_move(Vector2.ZERO, 0.0, delta)
		_anim("idle")
	# registra no bestiário quando o herói o vê de perto
	if world.player != null and global_position.distance_to(world.player.global_position) < 150.0:
		Game.mark_seen(species_id)

# =============================================================== DANO
func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	var src: String = opts.get("src", "heroi")
	var dmg := amount * Combat.affinity_mult(str(opts.get("aff", "")), affinity)
	var to_att := (from_pos - global_position).normalized()
	if guard_front > 0.0 and not opts.get("ignore_guard", false) and face.dot(to_att) > 0.3 and st != St.RECOVER:
		dmg *= guard_front
		world.spawn_text(global_position + Vector2(0, -fh), "Bloqueado", Color(0.8, 0.8, 1.0))
		Audio.play("guard")
	if kind == "dummy":
		dummy_heal_t = 2.0
		hp = max(1.0, hp - dmg)
		flash = 0.12
		world.spawn_text(global_position + Vector2(0, -fh), str(int(round(dmg))), Color.WHITE)
		if src == "heroi":
			Game.tutorial_event("attack_dummy")
		return dmg
	hp -= dmg
	Game.dmg_stats[src] = float(Game.dmg_stats.get(src, 0.0)) + min(dmg, hp + dmg)
	flash = 0.12
	hp_bar_t = 3.0
	world.spawn_text(global_position + Vector2(0, -fh), str(int(round(dmg))), Color(1, 0.95, 0.6))
	world.spark(global_position + Vector2(0, -fh * 0.4))
	if src == "heroi" and kind == "wild":
		angry_t = 10.0
	if src == "companion" and opts.has("uuid"):
		participants[opts["uuid"]] = true
	if opts.has("dir") or from_pos != global_position:
		knock_v = (-to_att) * float(opts.get("knock", 0.0)) * (0.3 if boss else 1.0)
	if not boss and float(opts.get("knock", 0.0)) >= 80.0 and st == St.WINDUP and kind != "lenhador":
		interrupt()
	if hp <= 0.0:
		die(src)
	return dmg

func interrupt() -> void:
	if boss or st == St.DEAD:
		return
	if st == St.WINDUP or st == St.ATTACK:
		st = St.STAGGER
		st_t = 0.0
		cd = 0.6

func root(sec: float) -> bool:
	if boss or not small or not alive_flag:
		return false
	rooted_t = sec
	if st == St.WINDUP:
		st = St.CHASE
	world.spawn_text(global_position + Vector2(0, -fh), "Preso!", Color(0.6, 1, 0.6))
	return true

func die(src: String) -> void:
	if dying:
		return
	dying = true
	alive_flag = false
	st = St.DEAD
	remove_from_group("enemies")
	Audio.play("thud", -6.0)
	var d := float(def.get("xp", 0))
	_give_rewards(src)
	world.enemy_died(self)
	_death_fx()

func _give_rewards(_src: String) -> void:
	if kind == "wild" or kind == "dummy":
		if kind == "wild":
			Game.award_encounter_xp(int(def.get("xp", 0)), xp_level)
		return
	Game.award_encounter_xp(int(def.get("xp", 0)), xp_level)
	var fr: Array = def.get("frag", [0, 0])
	var n := randi_range(int(fr[0]), int(fr[1]))
	if n > 0:
		Game.fragments += n
		Game.inventory_changed.emit()
		world.spawn_text(global_position + Vector2(0, -fh - 8), "+%d" % n, Color(0.6, 0.95, 1.0))
	Game.register_kill(kind)
	if def.get("relevante", false):
		var ac := Game.active_ind()
		var near: bool = world.companion != null and is_instance_valid(world.companion) and world.companion.global_position.distance_to(global_position) < 150.0
		if not ac.is_empty() and (participants.has(ac["uuid"]) or near):
			Game.bond_activity(ac["uuid"], "vitoria:" + uid)

func _death_fx() -> void:
	if sprite == null:
		queue_free()
		return
	_tw = create_tween()
	_tw.tween_property(sprite, "modulate:a", 0.0, 0.5)
	_tw.parallel().tween_property(sprite, "scale", Vector2(1.2, 0.2), 0.5)
	_tw.tween_callback(queue_free)

func captured_by_hero() -> void:
	alive_flag = false
	dying = true
	remove_from_group("enemies")
	if unique and uid != "":
		Game.set_flag("captured_" + uid)
	world.enemy_died(self)
	if sprite:
		var tw := create_tween()
		tw.tween_property(sprite, "scale", Vector2(0.1, 0.1), 0.35)
		tw.parallel().tween_property(sprite, "modulate:a", 0.0, 0.35)
		tw.tween_callback(queue_free)
	else:
		queue_free()

func is_alive() -> bool:
	return alive_flag

# =============================================================== DESENHO (telegrafos e barra de vida)
func _draw() -> void:
	if not alive_flag:
		return
	if st == St.WINDUP and not P.is_empty():
		_draw_telegraph()
	if hp_bar_t > 0.0 or (capturable and world.player != null and world.player.aiming):
		var w := 22.0
		var y := -fh - 4.0
		draw_rect(Rect2(-w / 2.0, y, w, 3.0), Color(0.1, 0.05, 0.1, 0.85))
		var f: float = clamp(hp / max_hp, 0.0, 1.0)
		var col := Color(0.4, 0.9, 0.4) if f > 0.35 else Color(1.0, 0.7, 0.3)
		draw_rect(Rect2(-w / 2.0 + 0.5, y + 0.5, (w - 1.0) * f, 2.0), col)
		if capturable and f <= Game.CAPTURE_HP_LIMIT:
			draw_rect(Rect2(w / 2.0 + 1.0, y, 2.0, 3.0), Color(0.5, 0.95, 1.0))
	if protect_t > 0.0:
		draw_arc(Vector2(0, -fh / 2.0), radius + 6.0, 0.0, TAU, 16, Color(0.7, 0.9, 1.0, 0.6), 1.0)
	if world.hero_target == self and kind != "dummy":
		var y2 := -fh - 10.0
		draw_colored_polygon(PackedVector2Array([Vector2(-3, y2), Vector2(3, y2), Vector2(0, y2 + 4)]), Color(1, 0.9, 0.3))

func _draw_telegraph() -> void:
	var f: float = clamp(st_t / (P["wind"] * Game.warning_mult()), 0.0, 1.0)
	var col := Color(1.0, 0.25, 0.2, 0.18 + 0.28 * f)
	var edge := Color(1.0, 0.85, 0.3, 0.95)
	var a: String = def.get("ataque", "")
	if a == "investida":
		var d := attack_dir
		var n := d.orthogonal() * 6.0
		var L := 80.0
		var pts := PackedVector2Array([n, n + d * L, -n + d * L, -n])
		draw_colored_polygon(pts, col)
		draw_polyline(PackedVector2Array([n, n + d * L, -n + d * L, -n, n]), edge, 1.0)
	elif a == "esporos":
		draw_circle(Vector2.ZERO, P["aoe"] * f, col)
		draw_arc(Vector2.ZERO, P["aoe"], 0.0, TAU, 28, edge, 1.5)
	else:
		var r: float = P["r"]
		var arc: float = deg_to_rad(float(P["arc"]))
		var a0 := attack_dir.angle() - arc
		var pts2 := PackedVector2Array([Vector2.ZERO])
		for i in range(0, 13):
			var aa := a0 + 2.0 * arc * float(i) / 12.0
			pts2.append(Vector2(cos(aa), sin(aa)) * r)
		draw_colored_polygon(pts2, col)
		pts2.append(Vector2.ZERO)
		draw_polyline(pts2, edge, 1.0)
	# símbolo de alerta (forma, não só cor)
	var y := -fh - 14.0
	draw_rect(Rect2(-1, y, 2, 6), edge)
	draw_rect(Rect2(-1, y + 8, 2, 2), edge)
