extends Enemy
## Vigia de Escória (minichefe das Minas): couraça de escória quase não sente golpes.
## Atraia-o para o vapor de uma das duas válvulas da arena e gire-a: a couraça trinca e ele fica vulnerável.
## A válvula usada recarrega, então é preciso alternar de posição e de válvula.

enum B { DORMANT, INTRO, CHASE, TELE_SLAM, SLAM, TELE_SPIT, RECOVER, CRACKED }

var activated := false
var bst := B.DORMANT
var bt := 0.0
var bdef: Dictionary = {}
var arena := Rect2()
var def_arena: Array = []
var spit_pos := Vector2.ZERO
var spit_cd := 2.5
var cracked_t := 0.0
var valve_misses := 0
var cracks := 0

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	def_arena = [int(e["x0"]), int(e["y0"]), int(e["w"]), int(e["h"])]
	boss = true
	bdef = Data.bosses["vigia"]
	max_hp = float(bdef["hp"]); hp = max_hp
	invulnerable = true
	radius = 15.0
	arena = Rect2(float(e["x0"]) * 16.0, float(e["y0"]) * 16.0, float(e["w"]) * 16.0, float(e["h"]) * 16.0)
	def["percepcao"] = 400

func activate() -> void:
	if activated:
		return
	activated = true
	bst = B.INTRO
	bt = 1.6
	world.gather_companion(arena)
	Game.set_flag("tmp_vigia_ativo")
	Audio.play("boss_roar")
	world.shake(2.0, 0.5)
	world.boss_started(self)
	world.say("O Vigia de Escória desperta! Sua couraça é quase impenetrável.")

func is_vulnerable() -> bool:
	return cracked_t > 0.0

func _ai(delta: float) -> void:
	if bst == B.DORMANT:
		_anim("idle")
		return
	bt -= delta
	spit_cd -= delta
	cracked_t = max(0.0, cracked_t - delta)
	var pp: Vector2 = world.player.global_position
	_face_to(pp)
	var to := pp - global_position
	match bst:
		B.INTRO:
			_anim("windup")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				invulnerable = false
				bst = B.CHASE
		B.CHASE:
			if to.length() > 40.0:
				_move(to.normalized(), speed, delta)
				_anim("walk")
			else:
				_move(Vector2.ZERO, 0.0, delta)
				_anim("idle")
			if to.length() < 50.0:
				attack_dir = to.normalized()
				bst = B.TELE_SLAM
				bt = 0.9 * Game.warning_mult()
				Audio.play("telegraph", -6.0)
			elif spit_cd <= 0.0 and to.length() > 64.0:
				spit_pos = pp
				spit_cd = 3.6
				bst = B.TELE_SPIT
				bt = 1.0 * Game.warning_mult()
				Audio.play("telegraph", -6.0)
		B.TELE_SLAM:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				bst = B.SLAM
				bt = 0.2
				hit_registry.clear()
				Audio.play("swing")
				world.shake(1.5, 0.12)
		B.SLAM:
			_anim("attack")
			_move(Vector2.ZERO, 0.0, delta)
			for t in world.targets():
				if hit_registry.has(t.get_instance_id()):
					continue
				if Combat.in_arc(global_position, attack_dir, 56.0, 70.0, t.global_position, 5.0):
					hit_registry[t.get_instance_id()] = true
					if not _misses():
						t.take_hit(float(bdef["dano_golpe"]), global_position, {"knock": 130.0})
			if bt <= 0.0:
				bst = B.RECOVER
				bt = 0.9
		B.TELE_SPIT:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				world.add_hazard(spit_pos, 18.0, 5.0)
				world.fx_at("fire", spit_pos + Vector2(0, -6), 0.5, 0.0, 1.4)
				for t in world.targets():
					if t.global_position.distance_to(spit_pos) <= 20.0:
						t.take_hit(float(bdef["dano_escoria"]), spit_pos, {"knock": 60.0})
				Audio.play("thud", -4.0)
				bst = B.RECOVER
				bt = 0.6
		B.RECOVER:
			_anim("idle")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				bst = B.CHASE
		B.CRACKED:
			_anim("hurt")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				bst = B.CHASE

## Válvula de vapor da arena (Ent "valve" com boss=true e "vent" [x,y,w,h]).
func on_valve(v: Node) -> void:
	if not activated or not alive_flag:
		return
	if v.valve_cd > 0.0:
		world.say("A válvula ainda recarrega (%.0f s). Use a outra!" % v.valve_cd)
		return
	v.valve_cd = float(bdef["valvula_recarga"])
	v.valve_open = true
	world.get_tree().create_timer(1.4).timeout.connect(func(): if is_instance_valid(v): v.valve_open = false)
	Audio.play("lever")
	Audio.play("bridge", -6.0)
	var vr: Array = v.def["vent"]
	var vent := Rect2(float(vr[0]) * 16.0, float(vr[1]) * 16.0, float(vr[2]) * 16.0, float(vr[3]) * 16.0)
	for k in 8:
		world.steam_at(vent.position + Vector2(randf() * vent.size.x, randf() * vent.size.y), 1.2)
	if vent.grow(10.0).has_point(global_position):
		cracks += 1
		cracked_t = float(bdef["trinca_s"])
		bst = B.CRACKED
		bt = 1.2
		world.fx_at("shards", global_position + Vector2(0, -24), 0.6, 0.0, 1.6)
		world.spawn_text(global_position + Vector2(0, -52), "Couraça trincada!", Color(0.6, 0.9, 1.0))
		world.say("O vapor frio trincou a couraça! Ataque agora!")
		Audio.play("guard_break")
	else:
		valve_misses += 1
		world.say("O vapor não alcançou o Vigia." + (" Atraia-o para cima da grade antes de girar." if valve_misses >= 2 else ""))

func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	if is_vulnerable():
		amount *= float(bdef["vulneravel"])
	else:
		amount *= float(bdef["couraca"])
		if str(opts.get("src", "")) == "heroi" and randf() < 0.35:
			world.spawn_text(global_position + Vector2(0, -56), "Couraça!", Color(0.85, 0.75, 0.6))
	return super.take_damage(amount, from_pos, opts)

func interrupt() -> void:
	pass

func root(_sec: float) -> bool:
	return false

func _give_rewards(_src: String) -> void:
	if Game.has_flag(bdef["flag_morte"]):
		return
	Game.set_flag(bdef["flag_morte"])
	Game.set_flag("tmp_vigia_ativo", false)
	var r: Dictionary = bdef["recompensa"]
	Game.award_encounter_xp(int(r["xp"]), int(def.get("nivel", 11)))
	Game.fragments += int(r["frag"])
	Game.give_loot(r.get("itens", {}))
	Game.inventory_changed.emit()
	Game.register_kill("vigia")
	var ac := Game.active_ind()
	if not ac.is_empty() and (participants.has(ac["uuid"]) or world.companion != null):
		Game.bond_activity(ac["uuid"], "vitoria:vigia")
	world.boss_finished(self)
	Audio.play("boss_die")
	world.say("Vigia de Escória derrotado! +%d fragmentos" % int(r["frag"]))
	world.get_tree().create_timer(1.5).timeout.connect(func(): world.autosave())

func _death_fx() -> void:
	for i in 4:
		world.fx_at("shards", global_position + Vector2(randf_range(-16, 16), randf_range(-36, 0)), 0.6)
	super._death_fx()

# =============================================================== VISUAIS (decalques autorais)
var _spit_decal: Sprite2D
var _slam_decal: Sprite2D
var _crack_fx: AnimatedSprite2D

func _visuals() -> void:
	super._visuals()
	if not is_inside_tree():
		return
	if _spit_decal == null:
		_spit_decal = Sprite2D.new()
		_spit_decal.texture = Art.sprite_tex("fx_warn_circle")
		_spit_decal.top_level = true
		_spit_decal.z_index = 1
		_spit_decal.visible = false
		add_child(_spit_decal)
		_slam_decal = Sprite2D.new()
		_slam_decal.texture = Art.sprite_tex("fx_warn_tile")
		_slam_decal.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		_slam_decal.region_enabled = true
		_slam_decal.region_rect = Rect2(0, 0, 56, 56)
		_slam_decal.z_as_relative = false
		_slam_decal.z_index = -1
		_slam_decal.visible = false
		add_child(_slam_decal)
		_crack_fx = AnimatedSprite2D.new()
		_crack_fx.sprite_frames = Art.fx_frames("fx_sparkle", 16, 12, 2, 8.0, true)
		_crack_fx.position = Vector2(0, -fh - 4)
		_crack_fx.modulate = Color(0.6, 0.9, 1.0)
		_crack_fx.play("a")
		add_child(_crack_fx)
	_alert.visible = bst == B.TELE_SLAM or bst == B.TELE_SPIT
	_spit_decal.visible = bst == B.TELE_SPIT and alive_flag
	if _spit_decal.visible:
		_spit_decal.global_position = spit_pos
		_spit_decal.scale = Vector2.ONE * (40.0 / 72.0)
		_spit_decal.modulate = Color(1, 1, 1, 0.5 + 0.4 * clamp(1.0 - bt, 0.0, 1.0))
	_slam_decal.visible = bst == B.TELE_SLAM and alive_flag
	if _slam_decal.visible:
		_slam_decal.rotation = attack_dir.angle()
		_slam_decal.position = attack_dir * 30.0
		_slam_decal.modulate = Color(1, 1, 1, 0.6)
	_crack_fx.visible = is_vulnerable() and alive_flag
	if sprite and alive_flag and not is_vulnerable() and flash <= 0.0:
		sprite.modulate = Color(1.0, 0.85, 0.75)
