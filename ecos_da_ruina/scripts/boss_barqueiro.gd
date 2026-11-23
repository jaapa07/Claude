extends Enemy
## Barqueiro Sem Sombra (minichefe do Templo Submerso).
## Desliza pelo lago central da arena (intocável sobre a água) e emerge na beira das plataformas para golpear com o remo
## (arco anunciado) ou mandar ondas pelo chão (faixas anunciadas). Sem sombra, os golpes o atravessam (dano mínimo).
## Acenda uma das quatro lanternas das plataformas (E) quando ele estiver perto: a luz prende a sombra dele, ele cambaleia
## e fica vulnerável enquanto estiver no clarão. As plataformas são largas e não há quedas: a água só bloqueia o caminho.

enum B { DORMANT, INTRO, GLIDE, SURFACE, TELE_OAR, OAR, TELE_WAVE, RECOVER, SHADOWED }

var activated := false
var bst := B.DORMANT
var bt := 0.0
var bdef: Dictionary = {}
var arena := Rect2()
var lake := Rect2()
var glide_to := Vector2.ZERO
var wave_cd := 3.0
var wave_dirs: Array = []
var surfaced_t := 0.0
var shadowed_by: Node = null
var lantern_misses := 0
var shadows := 0

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	boss = true
	bdef = Data.bosses["barqueiro"]
	max_hp = float(bdef["hp"]); hp = max_hp
	invulnerable = true
	radius = 14.0
	arena = Rect2(float(e["x0"]) * 16.0, float(e["y0"]) * 16.0, float(e["w"]) * 16.0, float(e["h"]) * 16.0)
	var lk: Array = e.get("lago", [22, 27, 16, 8])
	lake = Rect2(float(lk[0]) * 16.0, float(lk[1]) * 16.0, float(lk[2]) * 16.0, float(lk[3]) * 16.0)
	def["percepcao"] = 400

func _ready() -> void:
	super._ready()
	collision_mask = 0          # desliza sobre a água do lago central
	for c in get_children():
		if c is Sprite2D and (c as Sprite2D).texture == Art.sprite_tex("shadow_raw"):
			c.visible = false   # sem sombra (a dele só aparece na luz das lanternas)

func activate() -> void:
	if activated:
		return
	activated = true
	bst = B.INTRO
	bt = 1.6
	world.gather_companion(arena)
	Game.set_flag("tmp_barqueiro_ativo")
	Audio.play("boss_roar")
	world.shake(2.0, 0.5)
	world.boss_started(self)
	world.say("O Barqueiro Sem Sombra emerge! Sem sombra, seus golpes o atravessam.")

## Há uma lanterna acesa perto dele? Então a sombra aparece.
func lit_lantern_near() -> Node:
	for l in get_tree().get_nodes_in_group("ents"):
		if l.kind == "lantern" and l.def.get("boss", false) and l.lit and l.global_position.distance_to(global_position) <= 92.0:
			return l
	return null

func has_shadow() -> bool:
	return lit_lantern_near() != null

## Ponto da beira do lago mais próximo de `p`: ele emerge e apoia o barco na borda da plataforma (dá para alcançá-lo).
func edge_point(p: Vector2) -> Vector2:
	var inner := lake.grow(7.0)
	var q := Vector2(clamp(p.x, inner.position.x, inner.end.x), clamp(p.y, inner.position.y, inner.end.y))
	var dl: float = q.x - inner.position.x
	var dr: float = inner.end.x - q.x
	var du: float = q.y - inner.position.y
	var dd: float = inner.end.y - q.y
	var m: float = min(min(dl, dr), min(du, dd))
	if m == dl: q.x = inner.position.x
	elif m == dr: q.x = inner.end.x
	elif m == du: q.y = inner.position.y
	else: q.y = inner.end.y
	return q

func _ai(delta: float) -> void:
	if bst == B.DORMANT:
		_anim("idle")
		return
	bt -= delta
	wave_cd -= delta
	var pp: Vector2 = world.player.global_position
	var to := pp - global_position
	if bst != B.OAR:
		_face_to(pp)
	# sombra presa pela luz: cambaleia uma vez por lanterna acesa
	var ln := lit_lantern_near()
	if ln != null and ln != shadowed_by and bst in [B.GLIDE, B.SURFACE, B.RECOVER, B.TELE_WAVE, B.TELE_OAR]:
		shadowed_by = ln
		shadows += 1
		bst = B.SHADOWED
		bt = float(bdef["atordoa_s"])
		world.spawn_text(global_position + Vector2(0, -52), "Sombra presa!", Color(1.0, 0.9, 0.6))
		world.say("A luz prendeu a sombra do Barqueiro! Ataque enquanto ele estiver no clarão.")
		Audio.play("guard_break")
	if ln == null:
		shadowed_by = null
	match bst:
		B.INTRO:
			_anim("windup")
			if bt <= 0.0:
				invulnerable = false
				_pick_glide(pp)
		B.GLIDE:
			_anim("walk")
			var d := glide_to - global_position
			if d.length() > 4.0:
				global_position += d.normalized() * min(d.length(), speed * delta * (0.5 if slow_t > 0.0 else 1.0))
			else:
				bst = B.SURFACE
				bt = 0.35
				surfaced_t = 0.0
		B.SURFACE:
			_anim("idle")
			surfaced_t += delta
			if bt > 0.0:
				pass
			elif to.length() < 62.0:
				attack_dir = to.normalized()
				bst = B.TELE_OAR
				bt = 0.8 * Game.warning_mult()
				Audio.play("telegraph", -6.0)
			elif wave_cd <= 0.0 and to.length() < 200.0:
				bst = B.TELE_WAVE
				bt = 1.0 * Game.warning_mult()
				wave_dirs.clear()
				for a in [-0.35, 0.35]:
					wave_dirs.append(to.normalized().rotated(a))
				Audio.play("telegraph", -4.0)
			elif surfaced_t > 1.0:
				_pick_glide(pp)
		B.TELE_OAR:
			_anim("windup")
			if bt <= 0.0:
				bst = B.OAR
				bt = 0.22
				hit_registry.clear()
				Audio.play("swing")
		B.OAR:
			_anim("attack")
			for t in world.targets():
				if hit_registry.has(t.get_instance_id()):
					continue
				if Combat.in_arc(global_position, attack_dir, 60.0, 70.0, t.global_position, 5.0):
					hit_registry[t.get_instance_id()] = true
					if not _misses():
						t.take_hit(float(bdef["dano_remo"]), global_position, {"knock": 130.0})
			if bt <= 0.0:
				bst = B.RECOVER
				bt = 0.9
		B.TELE_WAVE:
			_anim("windup")
			if bt <= 0.0:
				for wd in wave_dirs:
					var q = world.spawn_projectile(global_position + wd * 20.0, wd, float(bdef["dano_onda"]), self, "quake")
					q.speed = 120.0
					q.width = 16.0
					q.max_dist = 220.0
					q.life = 3.0
					q.modulate = Color(0.55, 0.85, 1.0)
					q.over_water = true
				world.fx_at("splash", global_position, 0.5, 0.0, 2.0)
				Audio.play("thud", -4.0)
				wave_cd = 5.0
				bst = B.RECOVER
				bt = 0.8
		B.RECOVER:
			_anim("idle")
			if bt <= 0.0:
				_pick_glide(pp)
		B.SHADOWED:
			_anim("hurt")
			if bt <= 0.0:
				bst = B.SURFACE
				bt = 0.2
				surfaced_t = 0.0

func _pick_glide(pp: Vector2) -> void:
	glide_to = edge_point(pp)
	bst = B.GLIDE

## Lanterna da arena (Ent "lantern" com boss=true): acende por alguns segundos e recarrega.
func on_lantern(l: Node) -> void:
	if not activated or not alive_flag:
		return
	if l.lit:
		world.say("Esta lanterna já está acesa.")
		return
	if l.boss_cd > 0.0:
		world.say("O pavio ainda fumega (%.0f s). Use outra lanterna!" % l.boss_cd)
		return
	l.light_temp(float(bdef["lanterna_s"]))
	l.boss_cd = float(bdef["lanterna_s"]) + float(bdef["lanterna_recarga"])
	if l.global_position.distance_to(global_position) > 92.0:
		lantern_misses += 1
		world.say("A lanterna acendeu, mas o Barqueiro está longe da luz." + (" Acenda a lanterna mais perto de onde ele emerge." if lantern_misses >= 2 else ""))

func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	if has_shadow():
		amount *= float(bdef["com_sombra"])
	else:
		amount *= float(bdef["sem_sombra"])
		if str(opts.get("src", "")) == "heroi" and randf() < 0.4:
			world.spawn_text(global_position + Vector2(0, -52), "Atravessa!", Color(0.7, 0.8, 1.0))
	return super.take_damage(amount, from_pos, opts)

func interrupt() -> void:
	pass

func root(_sec: float) -> bool:
	return false

func _give_rewards(_src: String) -> void:
	if Game.has_flag(bdef["flag_morte"]):
		return
	Game.set_flag(bdef["flag_morte"])
	Game.set_flag("tmp_barqueiro_ativo", false)
	var r: Dictionary = bdef["recompensa"]
	Game.award_encounter_xp(int(r["xp"]), int(def.get("nivel", 15)))
	Game.fragments += int(r["frag"])
	Game.give_loot(r.get("itens", {}))
	Game.inventory_changed.emit()
	Game.register_kill("barqueiro")
	var ac := Game.active_ind()
	if not ac.is_empty() and (participants.has(ac["uuid"]) or world.companion != null):
		Game.bond_activity(ac["uuid"], "vitoria:barqueiro")
	world.boss_finished(self)
	Audio.play("boss_die")
	world.say("O Barqueiro Sem Sombra descansa, enfim. +%d fragmentos" % int(r["frag"]))
	world.get_tree().create_timer(1.5).timeout.connect(func(): world.autosave())

func _death_fx() -> void:
	for i in 4:
		world.fx_at("splash", global_position + Vector2(randf_range(-16, 16), randf_range(-30, 0)), 0.6, 0.0, 1.5)
	super._death_fx()

# =============================================================== VISUAIS (decalques autorais)
var _oar_decal: Sprite2D
var _wave_decals: Array = []
var _shadow_spr: Sprite2D

func _visuals() -> void:
	super._visuals()
	if not is_inside_tree():
		return
	if _oar_decal == null:
		_oar_decal = Sprite2D.new()
		_oar_decal.texture = Art.sprite_tex("fx_warn_tile")
		_oar_decal.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		_oar_decal.region_enabled = true
		_oar_decal.region_rect = Rect2(0, 0, 60, 56)
		_oar_decal.z_as_relative = false
		_oar_decal.z_index = -1
		_oar_decal.visible = false
		add_child(_oar_decal)
		for i in 2:
			var d := Sprite2D.new()
			d.texture = Art.sprite_tex("fx_warn_tile")
			d.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
			d.region_enabled = true
			d.region_rect = Rect2(0, 0, 200, 32)
			d.z_as_relative = false
			d.z_index = -1
			d.visible = false
			add_child(d)
			_wave_decals.append(d)
		# a sombra só aparece com uma lanterna acesa por perto
		_shadow_spr = Art.shadow(2.2)
		_shadow_spr.modulate = Color(0, 0, 0, 0.55)
		_shadow_spr.position = Vector2(0, 2)
		add_child(_shadow_spr)
	_alert.visible = bst in [B.TELE_OAR, B.TELE_WAVE]
	_oar_decal.visible = bst == B.TELE_OAR and alive_flag
	if _oar_decal.visible:
		_oar_decal.rotation = attack_dir.angle()
		_oar_decal.position = attack_dir * 30.0
		_oar_decal.modulate = Color(1, 1, 1, 0.6)
	for i in _wave_decals.size():
		var d: Sprite2D = _wave_decals[i]
		d.visible = bst == B.TELE_WAVE and i < wave_dirs.size() and alive_flag
		if d.visible:
			d.rotation = (wave_dirs[i] as Vector2).angle()
			d.position = (wave_dirs[i] as Vector2) * 110.0
			d.modulate = Color(0.7, 0.9, 1.0, 0.55)
	var sh := has_shadow() and alive_flag
	_shadow_spr.visible = sh
	if sprite and alive_flag and flash <= 0.0:
		sprite.modulate = Color(1, 1, 1, 1.0) if sh else Color(0.8, 0.9, 1.0, 0.7)
