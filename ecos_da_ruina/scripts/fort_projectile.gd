extends Node2D
## Projéteis da Fortaleza do Eclipse (sprite "flecha" de fort_props.png):
##  "flecha" — disparada pelo arqueiro; fere herói e criaturas; paredes a param, o abismo não.
##  "virote" — disparado por uma balestra fixa; fere inimigos (dano "à distância"), acende receptores de disparo.

var world: Node
var mode := "flecha"
var dir := Vector2.RIGHT
var damage := 10.0
var speed := 170.0
var max_dist := 220.0
var owner_ref: Node = null
var travelled := 0.0
var _spr: Sprite2D

func _ready() -> void:
	add_to_group("projectiles")
	_spr = Sprite2D.new()
	_spr.texture = Art.sprite_tex("fort_props")
	_spr.region_enabled = true
	_spr.region_rect = Rect2(FortEnt.FPROPS["flecha"] * 16, 0, 16, 16)
	_spr.rotation = dir.angle()
	_spr.offset = Vector2(0, 0)
	_spr.position = Vector2(0, -6)
	if mode == "virote":
		_spr.modulate = Color(1.0, 0.95, 0.7)
		speed = 230.0
		max_dist = 560.0
	add_child(_spr)

func _blocked(p: Vector2) -> bool:
	var c: String = world.tile_char_at(p)
	if Fortaleza.CHARS.contains(c):
		return Fortaleza.BLOCKS_LIGHT.contains(c)
	return world.is_solid_char(c) and c != "c" and c != "L"

func _physics_process(delta: float) -> void:
	if get_tree().paused:
		return
	var step := dir * speed * delta
	position += step
	travelled += step.length()
	if _blocked(global_position) or travelled >= max_dist:
		world.spark(global_position + Vector2(0, -4), 3)
		Audio.play("thud", -12.0)
		queue_free()
		return
	if mode == "virote":
		if FortEnt.receptor_hit(world, global_position + Vector2(0, -4), "disparo", 12.0):
			world.fx_at("hit", global_position + Vector2(0, -6), 0.2)
			queue_free()
			return
		for e in world.enemies():
			if not e.hittable() or e.kind == "dummy" or (e.kind == "wild" and e.angry_t <= 0.0):
				continue
			if e.global_position.distance_to(global_position) <= 9.0 + e.radius:
				e.take_damage(damage, global_position - dir * 8.0, {"src": "balestra", "proj": true, "knock": 60.0})
				world.fx_at("hit", e.global_position + Vector2(0, -10), 0.2)
				queue_free()
				return
	else:
		for tg in world.targets():
			if tg.global_position.distance_to(global_position) <= 9.0:
				tg.take_hit(damage, global_position - dir * 6.0, {"knock": 60.0})
				world.spark(global_position)
				queue_free()
				return
