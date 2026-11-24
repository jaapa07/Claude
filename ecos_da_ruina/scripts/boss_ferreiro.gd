extends Enemy
## Ferreiro Devorador (guardião das Minas da Brasa).
## Fase 1: marteladas criam ondas de choque esquiváveis (fx_quake).
## Fase 2 (65%): armadura superaquecida reduz o dano; as válvulas de água dos cantos a resfriam se ele estiver no jato.
## Fase 3 (30%): quebra o centro da arena (vira lava, sempre preservando a borda e a faixa do meio) e alterna golpes
## curtos com uma grande martelada anunciada por 1,2 s. Avisos com sprites (fx_warn_tile, fx_warn_circle, fx_alert).

enum B { DORMANT, INTRO, CHASE, TELE_SWIPE, SWIPE, TELE_WAVE, TELE_BIG, BIG, RECOVER, TRANSITION, STAGGER }

var activated := false
var bst := B.DORMANT
var bt := 0.0
var phase := 1
var bdef: Dictionary = {}
var arena := Rect2()
var def_arena: Array = []
var quebra: Array = []
var armor_hot := false
var quench_t := 0.0
var quenches := 0
var wave_cd := 1.5
var swipes := 0
var big_cd := 6.0
var phase_done := {2: false, 3: false}
var wave_dirs: Array = []
var big_r := 84.0
var valve_misses := 0

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	def_arena = [int(e["x0"]), int(e["y0"]), int(e["w"]), int(e["h"])]
	quebra = e.get("quebra", [])
	boss = true
	bdef = Data.bosses["ferreiro"]
	max_hp = float(bdef["hp"]); hp = max_hp
	invulnerable = true
	radius = 18.0
	arena = Rect2(float(e["x0"]) * 16.0, float(e["y0"]) * 16.0, float(e["w"]) * 16.0, float(e["h"]) * 16.0)
	def["percepcao"] = 600

func activate() -> void:
	if activated:
		return
	activated = true
	bst = B.INTRO
	bt = 2.0
	world.gather_companion(arena)
	Game.set_flag("tmp_ferreiro_ativo")
	Audio.play("boss_roar")
	world.shake(3.0, 0.8)
	world.boss_started(self)
	world.say("O Ferreiro Devorador ergue o martelo! Esquive as ondas no chão.")

func _player_pos() -> Vector2:
	return world.player.global_position

func _ai(delta: float) -> void:
	if bst == B.DORMANT:
		_anim("idle")
		return
	bt -= delta
	wave_cd -= delta
	if phase == 3:
		big_cd -= delta
	if quench_t > 0.0:
		quench_t -= delta
		if quench_t <= 0.0 and phase >= 2 and alive_flag:
			armor_hot = true
			world.say("A armadura do Ferreiro volta a arder!")
	var pp := _player_pos()
	var to := pp - global_position
	if bst != B.SWIPE and bst != B.BIG:
		_face_to(pp)
	match bst:
		B.INTRO:
			_anim("windup")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				invulnerable = false
				bst = B.CHASE
		B.CHASE:
			var spd := speed * (1.15 if phase == 3 else 1.0)
			if to.length() > 44.0:
				_move(to.normalized(), spd, delta)
				_anim("walk")
			else:
				_move(Vector2.ZERO, 0.0, delta)
				_anim("idle")
			if phase == 3 and (swipes >= 2 or big_cd <= 0.0):
				swipes = 0
				big_cd = 7.0
				bst = B.TELE_BIG
				bt = float(bdef["aviso_grande"]) * Game.warning_mult()
				Audio.play("telegraph")
				world.say("O Ferreiro ergue o martelo bem alto! Afaste-se!")
			elif to.length() < 58.0:
				attack_dir = to.normalized()
				bst = B.TELE_SWIPE
				bt = (0.45 if phase == 3 else 0.65) * Game.warning_mult()
				Audio.play("telegraph", -6.0)
			elif wave_cd <= 0.0 and phase < 3:
				bst = B.TELE_WAVE
				bt = 0.9 * Game.warning_mult()
				wave_dirs.clear()
				for a in [-0.42, 0.0, 0.42]:
					wave_dirs.append(to.normalized().rotated(a))
				Audio.play("telegraph")
		B.TELE_SWIPE:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				bst = B.SWIPE
				bt = 0.2
				hit_registry.clear()
				Audio.play("swing")
		B.SWIPE:
			_anim("attack")
			_move(Vector2.ZERO, 0.0, delta)
			for t in world.targets():
				if hit_registry.has(t.get_instance_id()):
					continue
				if Combat.in_arc(global_position, attack_dir, 60.0, 75.0, t.global_position, 5.0):
					hit_registry[t.get_instance_id()] = true
					if not _misses():
						t.take_hit(float(bdef["dano_golpe"]), global_position, {"knock": 130.0})
			if bt <= 0.0:
				swipes += 1
				bst = B.RECOVER
				bt = 0.7 if phase == 3 else 0.9
		B.TELE_WAVE:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				_slam_waves(wave_dirs, 280.0)
				wave_cd = 3.2 if phase == 1 else 4.2
				bst = B.RECOVER
				bt = 1.0
		B.TELE_BIG:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				bst = B.BIG
				bt = 0.3
				hit_registry.clear()
				world.shake(4.0, 0.4)
				Audio.play("thud")
				for k in 8:
					world.fx_at("dust", global_position + Vector2.from_angle(TAU * k / 8.0) * big_r * 0.7, 0.4, 0.0, 1.6)
				for t in world.targets():
					if t.global_position.distance_to(global_position) <= big_r:
						t.take_hit(float(bdef["dano_grande"]), global_position, {"knock": 160.0, "indefensavel": true})
				_slam_waves([Vector2.RIGHT, Vector2.LEFT, Vector2.UP, Vector2.DOWN], 200.0)
		B.BIG:
			_anim("attack")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				bst = B.RECOVER
				bt = 1.5
		B.RECOVER:
			_anim("idle")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				bst = B.CHASE
		B.STAGGER:
			_anim("hurt")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				bst = B.CHASE
		B.TRANSITION:
			_anim("windup")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				if phase == 3 and not Game.has_flag("tmp_ferreiro_piso"):
					_break_floor()
				invulnerable = false
				bst = B.CHASE

func _slam_waves(dirs: Array, dist: float) -> void:
	Audio.play("thud")
	world.shake(2.5, 0.2)
	for d in dirs:
		var q = world.spawn_projectile(global_position + d * 22.0, d, float(bdef["dano_onda"]), self, "quake")
		q.speed = 135.0
		q.width = 20.0
		q.max_dist = dist
		q.life = 3.0

## Fase 3: parte do piso desaba em lava. Quem estiver em cima é levado para a borda segura.
func _break_floor() -> void:
	Game.set_flag("tmp_ferreiro_piso")
	world.shake(4.0, 0.6)
	Audio.play("boss_roar")
	for t in world.targets():
		if world.tile_solid_at(t.global_position):
			t.global_position = world.safe_pos_near(t.global_position)
			if t == world.player:
				t.env_damage(float(bdef["dano_queda"]), "Desabou!")
	if world.tile_solid_at(global_position):
		global_position = world.safe_pos_near(global_position)
	world.say("O chão do centro desabou! Siga pela borda e pela faixa do meio.")

func on_valve(v: Node) -> void:
	if not activated or not alive_flag:
		return
	if v.valve_cd > 0.0:
		world.say("A válvula de água ainda recarrega (%.0f s)." % v.valve_cd)
		return
	v.valve_cd = float(bdef["valvula_recarga"])
	v.valve_open = true
	world.get_tree().create_timer(1.6).timeout.connect(func(): if is_instance_valid(v): v.valve_open = false)
	Audio.play("lever")
	Audio.play("bridge", -6.0)
	var vr: Array = v.def["vent"]
	var vent := Rect2(float(vr[0]) * 16.0, float(vr[1]) * 16.0, float(vr[2]) * 16.0, float(vr[3]) * 16.0)
	for k in 10:
		world.steam_at(vent.position + Vector2(randf() * vent.size.x, randf() * vent.size.y), 1.3)
	if not vent.grow(12.0).has_point(global_position):
		valve_misses += 1
		world.say("O jato de água não alcançou o Ferreiro." + (" Atraia-o para o quadrante da válvula antes de girá-la." if valve_misses >= 2 else ""))
		return
	if not armor_hot:
		world.say("A água chia na armadura fria. Guarde as válvulas para quando ela arder.")
		return
	armor_hot = false
	quenches += 1
	quench_t = float(bdef["resfriada_s"])
	bst = B.STAGGER
	bt = 1.2
	world.fx_at("shards", global_position + Vector2(0, -40), 0.6, 0.0, 1.8)
	world.spawn_text(global_position + Vector2(0, -76), "Armadura resfriada!", Color(0.6, 0.9, 1.0))
	world.say("A armadura esfriou e rachou! Ataque agora!")
	Audio.play("guard_break")

func damage_mult() -> float:
	if phase == 1:
		return 1.0
	if armor_hot:
		return float(bdef["armadura_quente"] if phase == 2 else bdef["armadura_quente_f3"])
	return float(bdef["resfriada"])

func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	amount *= damage_mult()
	if armor_hot and str(opts.get("src", "")) == "heroi" and randf() < 0.3:
		world.spawn_text(global_position + Vector2(0, -80), "Armadura incandescente!", Color(1.0, 0.6, 0.3))
	var got := super.take_damage(amount, from_pos, opts)
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
	bt = 1.8 if n == 3 else 1.4
	invulnerable = true
	armor_hot = true
	quench_t = 0.0
	swipes = 0
	velocity = Vector2.ZERO
	Audio.play("boss_roar")
	world.shake(3.0, 0.6)
	if n == 2:
		world.say("A armadura do Ferreiro fica incandescente! Use as válvulas de água dos cantos.")
	else:
		world.say("O Ferreiro golpeia o chão com fúria: o centro da arena vai ceder!")

func interrupt() -> void:
	pass

func root(_sec: float) -> bool:
	return false

func _give_rewards(_src: String) -> void:
	if Game.has_flag(bdef["flag_morte"]):
		return
	Game.set_flag(bdef["flag_morte"])                # forjas reabrem, elevador e rotas novas
	Game.set_flag(bdef["flag_regiao"])
	Game.set_flag("tmp_ferreiro_ativo", false)
	Game.set_flag("tmp_ferreiro_piso", false)
	var r: Dictionary = bdef["recompensa"]
	Game.award_encounter_xp(int(r["xp"]), int(def.get("nivel", 8)))
	Game.fragments += int(r["frag"])
	Game.inventory_changed.emit()
	Game.register_kill("ferreiro")
	var ac := Game.active_ind()
	if not ac.is_empty() and participants.has(ac["uuid"]):
		Game.bond_activity(ac["uuid"], "vitoria:ferreiro")
	Game.grant_eco(r["eco"])
	world.boss_finished(self)
	Audio.play("boss_die")
	world.shake(4.0, 1.0)
	world.say("Eco obtido: RUPTURA ÍGNEA! +%d fragmentos" % int(r["frag"]))
	world.get_tree().create_timer(2.0).timeout.connect(func(): world.autosave())

func _death_fx() -> void:
	for i in 6:
		world.fx_at("fire", global_position + Vector2(randf_range(-24, 24), randf_range(-50, 0)), 0.7, 0.0, 1.5)
	super._death_fx()

# =============================================================== VISUAIS (decalques autorais)
var _wave_decals: Array = []
var _big_decal: Sprite2D
var _armor_fx: Array = []
var _break_decals: Node2D
var _cool_fx: AnimatedSprite2D

func _ensure() -> void:
	if _big_decal != null:
		return
	for i in 4:
		var d := Sprite2D.new()
		d.texture = Art.sprite_tex("fx_warn_tile")
		d.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		d.region_enabled = true
		d.region_rect = Rect2(0, 0, 200, 40)
		d.z_as_relative = false
		d.z_index = -1
		d.visible = false
		add_child(d)
		_wave_decals.append(d)
	_big_decal = Sprite2D.new()
	_big_decal.texture = Art.sprite_tex("fx_warn_circle")
	_big_decal.z_as_relative = false
	_big_decal.z_index = -1
	_big_decal.scale = Vector2.ONE * (big_r * 2.0 / 72.0)
	_big_decal.visible = false
	add_child(_big_decal)
	for k in 2:
		var f := AnimatedSprite2D.new()
		f.sprite_frames = Art.fx_frames("fx_fire", 16, 16, 4, 10.0, true)
		f.position = Vector2(-14 + 28 * k, -44)
		f.play("a")
		f.visible = false
		add_child(f)
		_armor_fx.append(f)
	_cool_fx = AnimatedSprite2D.new()
	_cool_fx.sprite_frames = Art.fx_frames("fx_sparkle", 16, 12, 2, 8.0, true)
	_cool_fx.position = Vector2(0, -78)
	_cool_fx.modulate = Color(0.6, 0.9, 1.0)
	_cool_fx.play("a")
	add_child(_cool_fx)
	_break_decals = Node2D.new()
	_break_decals.top_level = true
	_break_decals.z_index = 1
	add_child(_break_decals)
	for r in quebra:
		var sp := Sprite2D.new()
		sp.texture = Art.sprite_tex("fx_warn_tile")
		sp.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		sp.region_enabled = true
		sp.centered = false
		sp.region_rect = Rect2(0, 0, float(r[2]) * 16.0, float(r[3]) * 16.0)
		sp.position = Vector2(float(r[0]) * 16.0, float(r[1]) * 16.0)
		_break_decals.add_child(sp)
	_break_decals.visible = false

func _visuals() -> void:
	super._visuals()
	if not is_inside_tree():
		return
	_ensure()
	_alert.visible = bst in [B.TELE_SWIPE, B.TELE_WAVE, B.TELE_BIG]
	for i in _wave_decals.size():
		var d: Sprite2D = _wave_decals[i]
		d.visible = bst == B.TELE_WAVE and i < wave_dirs.size() and alive_flag
		if d.visible:
			var dir: Vector2 = wave_dirs[i]
			d.rotation = dir.angle()
			d.position = dir * 120.0
			d.modulate = Color(1, 1, 1, 0.55)
	_big_decal.visible = bst == B.TELE_BIG and alive_flag
	if _big_decal.visible:
		var f: float = clamp(1.0 - bt / (float(bdef["aviso_grande"]) * Game.warning_mult()), 0.0, 1.0)
		_big_decal.modulate = Color(1, 1, 1, 0.35 + 0.55 * f)
	_break_decals.visible = bst == B.TRANSITION and phase == 3 and alive_flag
	for f2 in _armor_fx:
		f2.visible = armor_hot and alive_flag
	_cool_fx.visible = alive_flag and phase >= 2 and not armor_hot
	if sprite and alive_flag and flash <= 0.0:
		sprite.modulate = Color(1.35, 0.85, 0.6) if armor_hot else Color.WHITE
