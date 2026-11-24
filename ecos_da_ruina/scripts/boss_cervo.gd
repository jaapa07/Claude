extends Enemy
## Cervo de Ossos (guardião): investida anunciada, pilares expõem o núcleo, faixas de raízes e escuridão.

enum B { DORMANT, INTRO, REPOS, TELE_CHARGE, CHARGE, STUNNED, RECOVER, TELE_ROOTS, ROOTS, TRANSITION }

var activated := false
var bst := B.DORMANT
var bt := 0.0
var phase := 1
var bdef: Dictionary = {}
var arena := Rect2()
var charge_dir := Vector2.RIGHT
var charge_dist := 0.0
var repos_goal := Vector2.ZERO
var exposed := false
var lanes_vertical := true
var lanes_phase := 0
var lane_hit := {}
var next_roots := false
var phase_done := {2: false, 3: false}

const LANE_W := 40.0

var def_arena: Array = []

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	def_arena = [int(e["x0"]), int(e["y0"]), int(e["w"]), int(e["h"])]
	boss = true
	bdef = Data.bosses["cervo"]
	max_hp = float(bdef["hp"]); hp = max_hp
	invulnerable = true
	radius = 16.0
	arena = Rect2(float(e["x0"]) * 16.0, float(e["y0"]) * 16.0, float(e["w"]) * 16.0, float(e["h"]) * 16.0)
	def["percepcao"] = 600

func activate() -> void:
	if activated:
		return
	activated = true
	bst = B.INTRO
	bt = 2.0
	world.gather_companion(Rect2(float(def_arena[0]) * 16.0, float(def_arena[1]) * 16.0, float(def_arena[2]) * 16.0, float(def_arena[3]) * 16.0))
	Game.set_flag("tmp_cervo_ativo")
	Audio.play("boss_roar")
	world.shake(3.0, 0.8)
	world.boss_started(self)
	world.say("O Cervo de Ossos desperta! Pilares o fazem tropeçar.")

func _ai(delta: float) -> void:
	if bst == B.DORMANT:
		_anim("idle")
		return
	_face_player()
	bt -= delta
	match bst:
		B.INTRO:
			_anim("windup")
			velocity = Vector2.ZERO
			if bt <= 0.0:
				invulnerable = false
				_next_action()
		B.REPOS:
			_anim("walk")
			var to := repos_goal - global_position
			if to.length() < 6.0 or bt <= 0.0:
				_start_charge_tele()
			else:
				velocity = to.normalized() * 70.0
				move_and_slide()
		B.TELE_CHARGE:
			_anim("windup")
			velocity = Vector2.ZERO
			if bt > 0.35:
				charge_dir = (_player_pos() - global_position).normalized()
			if bt <= 0.0:
				bst = B.CHARGE
				bt = 1.2
				charge_dist = 0.0
				lane_hit.clear()
				hit_registry.clear()
				Audio.play("swing", -2.0)
		B.CHARGE:
			_anim("attack")
			var spd := 270.0
			velocity = charge_dir * spd
			var before := global_position
			move_and_slide()
			charge_dist += before.distance_to(global_position)
			_charge_hits()
			if get_slide_collision_count() > 0:
				var col := get_slide_collision(0)
				var probe := col.get_position() - col.get_normal() * 3.0
				if world.tile_char_at(probe) == "P":
					_expose()
				else:
					bst = B.RECOVER
					bt = 1.1 if phase < 3 else 0.8
					world.shake(2.5, 0.2)
					Audio.play("thud")
				velocity = Vector2.ZERO
			elif charge_dist > 320.0 or bt <= 0.0:
				bst = B.RECOVER
				bt = 1.1 if phase < 3 else 0.8
		B.STUNNED:
			_anim("hurt")
			velocity = Vector2.ZERO
			if bt <= 0.0:
				exposed = false
				bst = B.RECOVER
				bt = 0.5
		B.RECOVER:
			_anim("idle")
			velocity = Vector2.ZERO
			if bt <= 0.0:
				_next_action()
		B.TELE_ROOTS:
			_anim("windup")
			velocity = Vector2.ZERO
			if bt <= 0.0:
				bst = B.ROOTS
				bt = 1.0
				lane_hit.clear()
				Audio.play("roots")
				world.shake(2.0, 0.3)
		B.ROOTS:
			_anim("idle")
			_roots_damage()
			if bt <= 0.0:
				bst = B.RECOVER
				bt = 0.9 if phase < 3 else 0.6
		B.TRANSITION:
			_anim("windup")
			velocity = Vector2.ZERO
			if bt <= 0.0:
				invulnerable = false
				if phase == 3:
					world.set_darkness(true)
				_next_action()

func _face_player() -> void:
	var p := _player_pos()
	if sprite:
		sprite.flip_h = p.x < global_position.x

func _player_pos() -> Vector2:
	return world.player.global_position

func _next_action() -> void:
	if phase >= 2 and next_roots:
		next_roots = false
		_start_roots_tele()
		return
	next_roots = (phase >= 2)
	# reposiciona em um lado da arena antes de investir
	bst = B.REPOS
	bt = 1.4
	var p := _player_pos()
	var side := Vector2(1, 0) if global_position.x < p.x else Vector2(-1, 0)
	repos_goal = _clamp_to_arena(p - side.rotated(randf_range(-0.9, 0.9)) * 130.0)

func _clamp_to_arena(v: Vector2) -> Vector2:
	var r := arena.grow(-34.0)
	return Vector2(clamp(v.x, r.position.x, r.end.x), clamp(v.y, r.position.y, r.end.y))

func _start_charge_tele() -> void:
	bst = B.TELE_CHARGE
	bt = 0.9 * Game.warning_mult()
	charge_dir = (_player_pos() - global_position).normalized()
	Audio.play("telegraph")

func _start_roots_tele() -> void:
	bst = B.TELE_ROOTS
	bt = 1.3 * Game.warning_mult()
	lanes_vertical = randf() < 0.5
	lanes_phase = randi() % 2
	Audio.play("telegraph")

func _expose() -> void:
	exposed = true
	bst = B.STUNNED
	bt = 3.0
	world.shake(3.5, 0.3)
	Audio.play("thud")
	world.spawn_text(global_position + Vector2(0, -40), "Núcleo exposto!", Color(0.6, 1.0, 0.5))

func _charge_hits() -> void:
	for t in world.targets():
		if hit_registry.has(t.get_instance_id()):
			continue
		if t.global_position.distance_to(global_position + charge_dir * 14.0) <= radius + 6.0:
			hit_registry[t.get_instance_id()] = true
			t.take_hit(float(bdef["dano_investida"]), global_position, {"knock": 150.0})

# ---- faixas de raízes: metade das faixas perigosas, outra metade segura e sempre visível
func _lane_is_danger(pos: Vector2) -> bool:
	var c: float = pos.x - arena.position.x if lanes_vertical else pos.y - arena.position.y
	var i := int(floor(c / LANE_W))
	return (i + lanes_phase) % 2 == 0

func _roots_damage() -> void:
	for t in world.targets():
		if lane_hit.has(t.get_instance_id()):
			continue
		if arena.has_point(t.global_position) and _lane_is_danger(t.global_position):
			lane_hit[t.get_instance_id()] = true
			t.take_hit(float(bdef["dano_raizes"]), t.global_position + Vector2(0, 8), {"knock": 40.0})

# =============================================================== DANO / FASES
func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	amount *= (2.0 if exposed else 0.7)
	var got := super.take_damage(amount, from_pos, opts)
	if OS.get_environment("ECOS_DEBUG") == "1":
		print("   [dbg dano cervo] %.1f src=%s hp=%.0f bst=%d exposed=%s" % [got, str(opts.get("src")), hp, bst, exposed])
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
	bt = 1.4
	invulnerable = true
	exposed = false
	velocity = Vector2.ZERO
	Audio.play("boss_roar")
	world.shake(3.0, 0.6)
	world.say("O Cervo de Ossos enfurece! (fase %d)" % n)

func hittable() -> bool:
	return alive_flag and not dying and not invulnerable

func interrupt() -> void:
	pass

func _give_rewards(_src: String) -> void:
	if Game.has_flag(bdef["flag_morte"]):
		return
	Game.set_flag(bdef["flag_morte"])            # a transformação regional começa aqui
	Game.set_flag("tmp_cervo_ativo", false)
	world.set_darkness(false)
	var r: Dictionary = bdef["recompensa"]
	Game.award_encounter_xp(int(r["xp"]), 5)
	Game.fragments += int(r["frag"])
	Game.give_item("osso_ancestral", 3)
	world.say("Material de chefão: Osso Ancestral x3 (monte equipamento na forja).")
	Game.inventory_changed.emit()
	Game.register_kill("cervo")
	var ac := Game.active_ind()
	if not ac.is_empty() and participants.has(ac["uuid"]):
		Game.bond_activity(ac["uuid"], "vitoria:cervo")
	Game.grant_eco(r["eco"])
	world.boss_finished(self)
	Audio.play("boss_die")
	world.shake(4.0, 1.0)
	world.say("Eco obtido: RAIZ VIVA! +%d fragmentos" % int(r["frag"]))
	world.get_tree().create_timer(2.0).timeout.connect(func(): world.autosave())

func _death_fx() -> void:
	for i in 6:
		world.spark(global_position + Vector2(randf_range(-24, 24), randf_range(-40, 0)), 12)
	super._death_fx()

# =============================================================== VISUAIS (decalques autorais)
var _charge_decal: Sprite2D
var _lanes: Node2D
var _core: AnimatedSprite2D
var _lanes_built := false

func _ensure_boss_visuals() -> void:
	if _charge_decal != null:
		return
	_charge_decal = Sprite2D.new()
	_charge_decal.texture = Art.sprite_tex("fx_warn_tile")
	_charge_decal.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	_charge_decal.region_enabled = true
	_charge_decal.region_rect = Rect2(0, 0, 260, 24)
	_charge_decal.z_as_relative = false
	_charge_decal.z_index = -1
	_charge_decal.visible = false
	add_child(_charge_decal)
	_lanes = Node2D.new()
	_lanes.top_level = true
	_lanes.z_index = -1
	add_child(_lanes)
	_core = AnimatedSprite2D.new()
	_core.sprite_frames = Art.fx_frames("fx_sparkle", 16, 12, 2, 10.0, true)
	_core.position = Vector2(-8, -34)
	_core.scale = Vector2(1.6, 1.6)
	_core.visible = false
	_core.play("a")
	add_child(_core)

func _build_lanes() -> void:
	for c in _lanes.get_children():
		c.queue_free()
	_lanes.global_position = arena.position
	var count := int((arena.size.x if lanes_vertical else arena.size.y) / LANE_W) + 1
	for i in count:
		var r: Rect2
		if lanes_vertical:
			r = Rect2(i * LANE_W, 0, LANE_W, arena.size.y)
		else:
			r = Rect2(0, i * LANE_W, arena.size.x, LANE_W)
		r = r.intersection(Rect2(Vector2.ZERO, arena.size))
		if r.size.x <= 0 or r.size.y <= 0:
			continue
		var danger := (i + lanes_phase) % 2 == 0
		var sp := Sprite2D.new()
		sp.texture = Art.sprite_tex("fx_warn_tile")
		sp.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		sp.region_enabled = true
		sp.centered = false
		sp.position = r.position
		sp.region_rect = Rect2(0 if danger else 16, 0, r.size.x, r.size.y) if danger else Rect2(16, 0, 16, 16)
		if not danger:
			sp.region_rect = Rect2(16, 0, 16, 16)
			sp.scale = r.size / 16.0
			sp.modulate = Color(1, 1, 1, 0.9)
		else:
			sp.set_meta("danger", true)
		_lanes.add_child(sp)
	_lanes_built = true

func _visuals() -> void:
	super._visuals()
	if not is_inside_tree():
		return
	_ensure_boss_visuals()
	_alert.visible = bst == B.TELE_CHARGE or bst == B.TELE_ROOTS
	_charge_decal.visible = bst == B.TELE_CHARGE and alive_flag
	if _charge_decal.visible:
		var f: float = clamp(1.0 - bt / (0.9 * Game.warning_mult()), 0.0, 1.0)
		_charge_decal.rotation = charge_dir.angle()
		_charge_decal.position = charge_dir * 130.0 + Vector2(0, -6)
		_charge_decal.modulate = Color(1, 1, 1, 0.35 + 0.45 * f)
	var lanes_on := (bst == B.TELE_ROOTS or bst == B.ROOTS) and alive_flag
	if lanes_on and not _lanes_built:
		_build_lanes()
	elif not lanes_on and _lanes_built:
		for c in _lanes.get_children():
			c.queue_free()
		_lanes_built = false
	if lanes_on:
		for c in _lanes.get_children():
			if c.has_meta("danger"):
				c.modulate = Color(1, 1, 1, 0.85 if bst == B.ROOTS else 0.45)
		if bst == B.ROOTS and int(bt * 10.0) % 3 == 0:
			var lp := Vector2(randf_range(arena.position.x, arena.end.x), randf_range(arena.position.y, arena.end.y))
			if _lane_is_danger(lp):
				world.fx_at("roots", lp, 0.5)
	_core.visible = exposed and alive_flag
