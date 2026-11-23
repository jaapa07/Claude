extends Enemy
## Gêmeos de Ferro (minichefe da Torre das Duas Sombras). Dois corpos, ataques alternados:
##  Martelo (gêmeo A) — onda de choque em linha no chão, anunciada por faixa (fx_warn_tile).
##  Corrente (gêmeo B) — aproxima-se e gira a corrente em círculo, anunciado por círculo (fx_warn_circle).
## Só um ataca por vez (a vez passa ao outro depois da recuperação). O que espera mantém distância do herói e fica
## do mesmo lado do irmão, para que os dois avisos nunca fechem todas as saídas. Quando um cai, o outro se enfurece.

enum B { DORMANT, INTRO, CHASE, WAIT, TELE, ATTACK, RECOVER }

var activated := false
var role := "a"
var partner: Node = null
var bst := B.DORMANT
var bt := 0.0
var bdef: Dictionary = {}
var arena := Rect2()
var has_turn := false
var enraged := false
var spawn_def: Dictionary = {}
var wave_dir := Vector2.RIGHT

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	spawn_def = e
	role = str(e.get("role", "a"))
	boss = true
	bdef = Data.bosses["gemeos"]
	max_hp = float(bdef["hp"]); hp = max_hp
	invulnerable = true
	radius = 13.0
	arena = Rect2(float(e["x0"]) * 16.0, float(e["y0"]) * 16.0, float(e["w"]) * 16.0, float(e["h"]) * 16.0)
	def["percepcao"] = 600
	if role == "b":
		def["sprite"] = "gemeo_ferro_b"
		shown_name = "Gêmeo de Ferro — Corrente"
	else:
		shown_name = "Gêmeo de Ferro — Martelo"
	has_turn = role == "a"

func _ready() -> void:
	super._ready()
	if role == "a":
		call_deferred("_spawn_partner")

func _spawn_partner() -> void:
	var d := spawn_def.duplicate()
	d["role"] = "b"
	d["id"] = str(spawn_def.get("id", "gemeos")) + "_b"
	var g: Array = spawn_def.get("gemeo", [int(d["x"]) + 4, int(d["y"])])
	d["x"] = int(g[0]); d["y"] = int(g[1])
	var b = load("res://scripts/boss_gemeos.gd").new()
	b.init(world, "gemeos", d)
	b.partner = self
	partner = b
	world.ysort.add_child(b)

func activate() -> void:
	if activated:
		return
	activated = true
	bst = B.INTRO
	bt = 1.6
	if role == "a":
		world.gather_companion(arena)
		Game.set_flag("tmp_gemeos_ativo")
		Audio.play("boss_roar")
		world.shake(2.5, 0.6)
		world.boss_started(self)
		world.say("Os Gêmeos de Ferro despertam! Um ataca enquanto o outro espera — observe de quem é a vez.")
		if partner != null and is_instance_valid(partner):
			partner.activate()

func _alive_partner() -> bool:
	return partner != null and is_instance_valid(partner) and partner.alive_flag

func pass_turn() -> void:
	if _alive_partner():
		has_turn = false
		partner.has_turn = true
	else:
		has_turn = true

func _hero() -> Vector2:
	return world.player.global_position

func _ai(delta: float) -> void:
	if bst == B.DORMANT:
		_anim("idle")
		_move(Vector2.ZERO, 0.0, delta)
		return
	bt -= delta
	var pp := _hero()
	var to := pp - global_position
	if bst != B.ATTACK:
		_face_to(pp)
	var spd := speed * (1.3 if enraged else 1.0)
	match bst:
		B.INTRO:
			_anim("windup")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				invulnerable = false
				bst = B.CHASE
		B.CHASE:
			if not has_turn and _alive_partner():
				bst = B.WAIT
				return
			var want := 60.0 if role == "a" else 34.0
			if to.length() > want:
				_move(to.normalized(), spd, delta)
				_anim("walk")
			else:
				_move(Vector2.ZERO, 0.0, delta)
				_anim("idle")
				_start_tele(to)
			if bt < -5.0:
				_start_tele(to)       # nunca fica preso perseguindo
		B.WAIT:
			if has_turn or not _alive_partner():
				bst = B.CHASE
				bt = 0.0
				return
			# espera a uns 110 px do herói, do mesmo lado do irmão (deixa o outro lado livre para fugir)
			var side: Vector2 = (partner.global_position - pp).normalized() if _alive_partner() else -to.normalized()
			var goal := pp + side.rotated(0.9 if role == "b" else -0.9) * 110.0
			goal.x = clamp(goal.x, arena.position.x + 24.0, arena.end.x - 24.0)
			goal.y = clamp(goal.y, arena.position.y + 24.0, arena.end.y - 24.0)
			var d := goal - global_position
			if d.length() > 6.0:
				_move(d.normalized(), spd * 0.8, delta)
				_anim("walk")
			else:
				_move(Vector2.ZERO, 0.0, delta)
				_anim("idle")
		B.TELE:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				bst = B.ATTACK
				bt = 0.3
				hit_registry.clear()
				if role == "a":
					_hammer()
				else:
					Audio.play("swing")
					world.fx_at("slash", global_position + Vector2(0, -16), 0.3, 0.0, 2.0)
		B.ATTACK:
			_anim("attack")
			_move(Vector2.ZERO, 0.0, delta)
			if role == "b":
				for t in world.targets():
					if hit_registry.has(t.get_instance_id()):
						continue
					if t.global_position.distance_to(global_position) <= float(bdef["raio_corrente"]):
						hit_registry[t.get_instance_id()] = true
						if not _misses():
							t.take_hit(float(bdef["dano_corrente"]), global_position, {"knock": 150.0})
			if bt <= 0.0:
				bst = B.RECOVER
				bt = 1.3 if not enraged else 0.8
		B.RECOVER:
			_anim("idle")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				pass_turn()
				bst = B.CHASE if has_turn else B.WAIT
				bt = 0.0

func _start_tele(to: Vector2) -> void:
	bst = B.TELE
	bt = (0.9 if not enraged else 0.7) * Game.warning_mult()
	attack_dir = to.normalized()
	wave_dir = attack_dir
	Audio.play("telegraph")

func _hammer() -> void:
	Audio.play("thud")
	world.shake(2.5, 0.2)
	var q = world.spawn_projectile(global_position + wave_dir * 18.0, wave_dir, float(bdef["dano_onda"]), self, "quake")
	q.speed = 150.0
	q.width = 16.0
	q.max_dist = 230.0
	q.life = 3.0
	if enraged:
		for a in [-0.5, 0.5]:
			var q2 = world.spawn_projectile(global_position + wave_dir.rotated(a) * 18.0, wave_dir.rotated(a), float(bdef["dano_onda"]), self, "quake")
			q2.speed = 150.0; q2.width = 14.0; q2.max_dist = 200.0; q2.life = 3.0
	for t in world.targets():
		if t.global_position.distance_to(global_position + wave_dir * 20.0) <= 26.0:
			t.take_hit(float(bdef["dano_golpe"]), global_position, {"knock": 130.0})

func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	# quem espera a vez se defende melhor; quem acabou de atacar fica exposto
	if bst == B.RECOVER:
		amount *= 1.35
	elif bst == B.WAIT:
		amount *= 0.7
	return super.take_damage(amount, from_pos, opts)

func interrupt() -> void:
	pass

func root(_sec: float) -> bool:
	return false

func _give_rewards(_src: String) -> void:
	Game.register_kill("gemeos")
	if _alive_partner():
		partner.enraged = true
		partner.has_turn = true
		world.boss_started(partner)
		world.say("Um dos Gêmeos caiu — o outro se enfurece e ataca sem parar!")
		Audio.play("boss_roar")
		return
	if Game.has_flag(bdef["flag_morte"]):
		return
	Game.set_flag(bdef["flag_morte"])
	Game.set_flag("tmp_gemeos_ativo", false)
	var r: Dictionary = bdef["recompensa"]
	Game.award_encounter_xp(int(r["xp"]), int(def.get("nivel", 21)))
	Game.fragments += int(r["frag"])
	Game.give_loot(r.get("itens", {}))
	Game.inventory_changed.emit()
	var ac := Game.active_ind()
	if not ac.is_empty() and participants.has(ac["uuid"]):
		Game.bond_activity(ac["uuid"], "vitoria:gemeos")
	world.boss_finished(self)
	Audio.play("boss_die")
	world.say("Os Gêmeos de Ferro caíram! +%d fragmentos" % int(r["frag"]))

# =============================================================== AVISOS
var _wline: Sprite2D
var _wcirc: Sprite2D

func _visuals() -> void:
	super._visuals()
	if not is_inside_tree():
		return
	if _wline == null:
		_wline = Sprite2D.new()
		_wline.texture = Art.sprite_tex("fx_warn_tile")
		_wline.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		_wline.region_enabled = true
		_wline.region_rect = Rect2(0, 0, 220, 32)
		_wline.z_as_relative = false
		_wline.z_index = -1
		add_child(_wline)
		_wcirc = Sprite2D.new()
		_wcirc.texture = Art.sprite_tex("fx_warn_circle")
		_wcirc.z_as_relative = false
		_wcirc.z_index = -1
		_wcirc.scale = Vector2.ONE * (float(bdef["raio_corrente"]) * 2.0 / 72.0)
		add_child(_wcirc)
	var tele := bst == B.TELE and alive_flag
	_alert.visible = tele
	_wline.visible = tele and role == "a"
	_wcirc.visible = tele and role == "b"
	if _wline.visible:
		_wline.rotation = wave_dir.angle()
		_wline.position = wave_dir * 120.0
		_wline.modulate = Color(1, 1, 1, 0.6)
	if _wcirc.visible:
		_wcirc.modulate = Color(1, 1, 1, 0.65)
	if sprite and alive_flag and flash <= 0.0:
		if enraged:
			sprite.modulate = Color(1.4, 0.9, 0.9)
		elif bst == B.WAIT:
			sprite.modulate = Color(0.85, 0.85, 0.95)
		else:
			sprite.modulate = Color.WHITE
