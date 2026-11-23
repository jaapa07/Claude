extends Enemy
## Cópia (reflexo falso) da Bruxa Afogada, fase 2. Igual à verdadeira, mas o reflexo na água está espelhado do lado
## errado e fora de compasso. Um golpe a desfaz (a Bruxa responde com uma poça). Também lança leques mais fracos.

var owner_bruxa: Node = null
var anchor := Vector2.ZERO
var attack_cd := 2.0
var float_to := Vector2.ZERO
var tele_t := 0.0
var fan_dirs: Array = []
var reflexo_consistente := false
var refl: AnimatedSprite2D
var _fan_decals: Array = []

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	max_hp = 1.0; hp = 1.0
	radius = 16.0
	shown_name = "Bruxa Afogada"

func _ready() -> void:
	super._ready()
	collision_mask = 0
	float_to = global_position
	refl = AnimatedSprite2D.new()
	refl.sprite_frames = sprite.sprite_frames
	refl.flip_v = true
	refl.offset = Vector2(0, fh / 2.0 + 2.0)
	refl.modulate = Color(0.55, 0.75, 1.0, 0.42)
	refl.show_behind_parent = true
	refl.play("idle")
	add_child(refl)
	for i in 5:
		var d := Sprite2D.new()
		d.texture = Art.sprite_tex("fx_warn_tile")
		d.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		d.region_enabled = true
		d.region_rect = Rect2(0, 0, 110, 10)
		d.z_as_relative = false
		d.z_index = -1
		d.visible = false
		add_child(d)
		_fan_decals.append(d)

func _ai(delta: float) -> void:
	if owner_bruxa == null or not is_instance_valid(owner_bruxa) or not owner_bruxa.alive_flag:
		vanish()
		return
	var pp: Vector2 = world.player.global_position
	_face_to(pp)
	attack_cd -= delta
	if tele_t > 0.0:
		tele_t -= delta
		_anim("windup")
		if tele_t <= 0.0:
			for d in fan_dirs:
				var o = world.spawn_projectile(global_position + Vector2(0, -10) + d * 14.0, d, float(owner_bruxa.bdef["dano_orbe"]) * float(owner_bruxa.bdef["copia_mult"]), self, "orbe")
				o.speed = 100.0
				o.max_dist = 130.0
				o.modulate = Color(0.85, 0.85, 1.0, 0.8)
			Audio.play("dodge", -8.0)
		return
	var d2 := float_to - global_position
	if d2.length() > 3.0:
		global_position += d2.normalized() * min(d2.length(), speed * delta)
		_anim("walk")
	else:
		float_to = anchor + Vector2(randf_range(-24, 24), randf_range(-18, 18))
		_anim("idle")
	if attack_cd <= 0.0:
		attack_cd = 3.6
		tele_t = 0.85 * Game.warning_mult()
		var base := (pp - global_position).normalized()
		fan_dirs.clear()
		for a in [-0.35, 0.0, 0.35]:
			fan_dirs.append(base.rotated(a))
		Audio.play("telegraph", -10.0)

func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	world.spawn_text(global_position + Vector2(0, -60), "Reflexo falso!", Color(0.8, 0.75, 1.0))
	world.fx_at("splash", global_position, 0.5, 0.0, 2.0)
	alive_flag = false
	dying = true
	remove_from_group("enemies")
	if owner_bruxa != null and is_instance_valid(owner_bruxa):
		owner_bruxa.copy_broken(self)
	_death_fx()
	return amount

func vanish() -> void:
	if not alive_flag and dying:
		return
	alive_flag = false
	dying = true
	remove_from_group("enemies")
	_death_fx()

func interrupt() -> void:
	pass

func root(_sec: float) -> bool:
	return false

func _give_rewards(_src: String) -> void:
	pass

## Reflexo falso: espelhado do lado errado e preso na pose parada (não acompanha o corpo).
func _visuals() -> void:
	super._visuals()
	if refl == null:
		return
	refl.visible = alive_flag and world.is_watery(global_position + Vector2(0, 4))
	refl.flip_h = not sprite.flip_h
	if refl.animation != "idle":
		refl.play("idle")
	_alert.visible = tele_t > 0.0
	for i in _fan_decals.size():
		var d: Sprite2D = _fan_decals[i]
		d.visible = tele_t > 0.0 and i < fan_dirs.size() and alive_flag
		if d.visible:
			d.rotation = (fan_dirs[i] as Vector2).angle()
			d.position = (fan_dirs[i] as Vector2) * 62.0 + Vector2(0, -6)
			d.modulate = Color(0.75, 0.7, 1.0, 0.45)
