extends Node2D
## Projéteis da Região 2 (sprites autorais):
##  "tool"  — picareta arremessada pelo mineiro (ferramenta.png); colide com paredes, pode ser defendida e é atraída pelo Ímã do Ferrunho.
##  "quake" — onda de choque do martelo no chão (fx_quake.png); só a esquiva (invulnerável) ou sair da faixa evita.

var world: Node
var mode := "tool"
var dir := Vector2.RIGHT
var damage := 10.0
var speed := 150.0
var life := 2.4
var width := 14.0           # onda: meia-largura da frente
var max_dist := 120.0
var owner_ref: Node = null
var t := 0.0
var travelled := 0.0
var hit := {}
var opts := {}
var _spr: AnimatedSprite2D

func _ready() -> void:
	add_to_group("projectiles")
	_spr = AnimatedSprite2D.new()
	if mode == "pedra":
		if ResourceLoader.exists("res://assets/sprites/pedra_arremesso.png"):
			_spr.sprite_frames = Art.fx_frames("pedra_arremesso", 16, 16, 1, 1.0, true)
		else:
			_spr.sprite_frames = Art.fx_frames("fx_shards", 24, 20, 2, 6.0, true)
		_spr.offset = Vector2(0, -10)
	elif mode == "disco":
		if ResourceLoader.exists("res://assets/sprites/fx_disco.png"):
			_spr.sprite_frames = Art.fx_frames("fx_disco", 8, 8, 4, 18.0, true)
		else:
			_spr.sprite_frames = Art.fx_frames("ferramenta", 12, 12, 2, 14.0, true)
		_spr.offset = Vector2(0, -2)
	elif mode == "tool":
		_spr.sprite_frames = Art.fx_frames("ferramenta", 12, 12, 2, 14.0, true)
		_spr.offset = Vector2(0, -10)
	else:
		_spr.sprite_frames = Art.fx_frames("fx_quake", 48, 16, 3, 12.0, true)
		_spr.rotation = dir.angle() + PI / 2.0
		_spr.scale = Vector2(width * 2.0 / 48.0, 1.0)
		z_index = -1
	_spr.play("a")
	add_child(_spr)

func is_metal() -> bool:
	return mode == "tool"

func _physics_process(delta: float) -> void:
	if get_tree().paused:
		return
	t += delta
	if mode == "disco" or mode == "pedra":
		_disco(delta)
		return
	if mode == "tool":
		# Ímã do Ferrunho: desvia ferramentas próximas e as absorve
		for a in get_tree().get_nodes_in_group("allies"):
			if a.get("magnet_t") != null and a.magnet_t > 0.0 and a.global_position.distance_to(global_position) < a.magnet_radius:
				dir = (a.global_position - global_position).normalized()
				if a.global_position.distance_to(global_position) < 8.0:
					a.absorb_projectile(self)
					queue_free()
					return
	var step := dir * speed * delta
	position += step
	travelled += step.length()
	if mode == "tool":
		if world.tile_solid_at(global_position):
			world.spark(global_position)
			Audio.play("thud", -12.0)
			queue_free()
			return
		for tg in world.targets():
			if tg.global_position.distance_to(global_position) <= 9.0:
				tg.take_hit(damage, global_position - dir * 6.0, {"knock": 70.0})
				world.spark(global_position)
				queue_free()
				return
	else:
		if world.tile_solid_at(global_position + dir * 6.0):
			queue_free()
			return
		for tg in world.targets():
			if hit.has(tg.get_instance_id()):
				continue
			var rel: Vector2 = tg.global_position - global_position
			var along := rel.dot(dir)
			var across: float = abs(rel.dot(dir.orthogonal()))
			if abs(along) <= 7.0 and across <= width:
				hit[tg.get_instance_id()] = true
				var o := {"knock": 90.0}
				o.merge(opts)
				tg.take_hit(damage, global_position - dir * 10.0, o)
		if travelled >= max_dist:
			queue_free()
			return
	if t >= life:
		queue_free()

## Disco de cobre do Ravi (aliado): acerta o primeiro inimigo, para em paredes.
func _disco(delta: float) -> void:
	var step := dir * speed * delta
	position += step
	travelled += step.length()
	if world.tile_solid_at(global_position) or travelled >= max_dist:
		world.spark(global_position, 3)
		if mode == "pedra":
			world.dust(global_position)
			Audio.play("thud", -6.0)
		queue_free()
		return
	for e in world.enemies():
		if not e.hittable() or e.kind == "dummy" or (e.kind == "wild" and e.angry_t <= 0.0):
			continue
		if e.global_position.distance_to(global_position + Vector2(0, 6)) <= 8.0 + e.radius:
			e.take_damage(damage, global_position - dir * 6.0, {"src": "heroi" if mode == "pedra" else "aliado", "knock": 90.0 if mode == "pedra" else 50.0})
			world.fx_at("hit", e.global_position + Vector2(0, -8), 0.18)
			queue_free()
			return
