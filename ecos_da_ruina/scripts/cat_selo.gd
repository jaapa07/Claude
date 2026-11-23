extends Node2D
## Selo do Escriba do Vazio (Região 5): runa vermelha escrita no chão. Aparece com o círculo de aviso, "fecha" depois de
## `arm` segundos e fere quem ainda estiver dentro. Sprites autorais: fx_selo_vazio.png (32x32, 3 quadros) + fx_warn_circle.

var world: Node
var damage := 12.0
var arm := 1.1
var radius := 20.0
var t := 0.0
var fired := false
var owner_boss: Node = null     # o Rei dos Ecos também escreve selos (fase 1, eco do Escriba não; usado pelo Arauto)
var _glyph: AnimatedSprite2D
var _ring: Sprite2D

func _ready() -> void:
	z_index = -1
	add_to_group("selos")
	_ring = Sprite2D.new()
	_ring.texture = Art.sprite_tex("fx_warn_circle")
	_ring.scale = Vector2.ONE * (radius * 2.0 / 72.0 + 0.1)
	add_child(_ring)
	_glyph = AnimatedSprite2D.new()
	_glyph.sprite_frames = Art.fx_frames("fx_selo_vazio", 32, 32, 3, 1.0, false)
	_glyph.scale = Vector2.ONE * (radius * 2.0 / 32.0)
	_glyph.stop()
	_glyph.frame = 0
	add_child(_glyph)

func _physics_process(delta: float) -> void:
	if get_tree().paused:
		return
	t += delta
	if not fired:
		var f: float = clamp(t / arm, 0.0, 1.0)
		_glyph.frame = 0 if f < 0.6 else 1
		_ring.modulate = Color(1, 1, 1, 0.35 + 0.55 * f)
		_glyph.modulate = Color(1, 1, 1, 0.5 + 0.5 * f)
		if t >= arm:
			fired = true
			_glyph.frame = 2
			Audio.play("thud", -8.0)
			for tg in world.targets():
				if tg.global_position.distance_to(global_position) <= radius + 4.0:
					tg.take_hit(damage, global_position, {"knock": 40.0})
					world.spawn_text(tg.global_position + Vector2(0, -26), "Selado!", Color(1.0, 0.5, 0.5))
	else:
		var k: float = clamp((t - arm) / 0.45, 0.0, 1.0)
		modulate.a = 1.0 - k
		if k >= 1.0:
			queue_free()
