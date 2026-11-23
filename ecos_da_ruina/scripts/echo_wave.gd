extends Node2D
class_name EchoWave
## Onda da Lâmina de Eco: viaja em linha reta, atravessa inimigos (acerta cada um uma vez) e para em paredes.

const SPEED := 230.0
const RANGE := 130.0

var world: Node
var dir := Vector2.RIGHT
var damage := 10.0
var _dist := 0.0
var _hit := {}
var _spr: AnimatedSprite2D

func _ready() -> void:
	z_index = 40
	_spr = AnimatedSprite2D.new()
	_spr.sprite_frames = Art.fx_frames("fx_wave", 16, 16, 2, 12.0, true)
	_spr.play("a")
	_spr.rotation = dir.angle()
	_spr.scale = Vector2(1.3, 1.6)
	add_child(_spr)

func _physics_process(delta: float) -> void:
	if get_tree().paused:
		return
	var step := SPEED * delta
	global_position += dir * step
	_dist += step
	if world.tile_solid_at(global_position + Vector2(0, 10)):
		_end()
		return
	for e in world.enemies():
		if _hit.has(e.get_instance_id()) or not e.hittable() or e.kind == "dummy":
			continue
		if e.global_position.distance_to(global_position + Vector2(0, 10)) <= 14.0 + e.radius:
			_hit[e.get_instance_id()] = true
			e.take_damage(damage, global_position - dir * 8.0, {"src": "heroi", "knock": 60.0, "dir": dir, "aff": "luz"})
			world.fx_at("hit", e.global_position + Vector2(0, -8), 0.2, 0.0, 1.2)
	if _dist >= RANGE:
		_end()
	_spr.modulate.a = clamp(1.2 - _dist / RANGE, 0.0, 1.0)

func _end() -> void:
	set_physics_process(false)
	var tw := create_tween()
	tw.tween_property(self, "modulate:a", 0.0, 0.12)
	tw.tween_callback(queue_free)
