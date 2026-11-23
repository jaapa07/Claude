extends Node2D
## Selo de Vínculo em voo: colide com paredes e some se o alvo desaparecer.
signal arrived(hit: bool)
var world: Node
var target: Node2D
var speed := 260.0
var _done := false
var _spr: Sprite2D

func _ready() -> void:
	_spr = Sprite2D.new()
	_spr.texture = Art.sprite_tex("seal")
	add_child(_spr)
	z_index = 20

func _physics_process(delta: float) -> void:
	if _done:
		return
	if target == null or not is_instance_valid(target):
		_finish(false)
		return
	var tp: Vector2 = target.global_position + Vector2(0, -6)
	var d := tp - global_position
	var step := speed * delta
	if d.length() <= step + 4.0:
		global_position = tp
		_finish(true)
		return
	var nxt := global_position + d.normalized() * step
	if world.tile_solid_at(nxt):
		_finish(false)
		return
	global_position = nxt
	_spr.rotation += 12.0 * delta

func _finish(hit: bool) -> void:
	_done = true
	arrived.emit(hit)
	queue_free()
