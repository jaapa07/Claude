extends Enemy
## Foco de luz do Rei dos Ecos (fase 2). Um prisma de marfim que liga o núcleo do Rei por um fio de luz.
## Só cede a golpes vindos de TRÁS (do lado oposto ao Rei): pela frente, o prisma reflete. Posicionamento, não força.
## Sprite autoral rei_foco.png (24x32, 9 colunas como as criaturas: idle0-1 = aceso, hurt = rachado).

var rei: Node = null
var _link: Array = []
var pulse_t := 0.0

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	boss = true
	radius = 10.0

func _ready() -> void:
	super._ready()
	collision_layer = 4
	for i in 6:
		var s := Sprite2D.new()
		s.texture = Art.sprite_tex("cat_props")
		s.region_enabled = true
		s.region_rect = Rect2(22 * 16, 0, 16, 16)
		s.top_level = true
		s.z_index = 1
		s.modulate = Color(0.85, 0.9, 1.0, 0.6)
		add_child(s)
		_link.append(s)
	Audio.play("guard", -6.0)
	world.fx_at("sparkle", global_position + Vector2(0, -14), 0.5, 0.0, 1.3)

func _ai(delta: float) -> void:
	_move(Vector2.ZERO, 0.0, delta)
	_anim("idle")
	pulse_t += delta

## "Trás" é o lado oposto ao Rei: o golpe precisa vir de lá.
func from_behind(from_pos: Vector2) -> bool:
	if rei == null or not is_instance_valid(rei):
		return true
	var to_rei: Vector2 = (rei.global_position - global_position).normalized()
	return (from_pos - global_position).normalized().dot(to_rei) < -0.2

func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	if not from_behind(from_pos):
		world.spawn_text(global_position + Vector2(0, -34), "Refletido!", Color(0.8, 0.9, 1.0))
		Audio.play("guard", -6.0)
		hp_bar_t = 2.0
		return super.take_damage(amount * 0.08, from_pos, opts)
	return super.take_damage(amount, from_pos, opts)

func interrupt() -> void:
	pass

func root(_sec: float) -> bool:
	return false

func _give_rewards(_src: String) -> void:
	Audio.play("guard_break")
	world.shake(1.5, 0.2)
	world.spawn_text(global_position + Vector2(0, -34), "Foco apagado!", Color(1.0, 0.8, 0.6))

func _visuals() -> void:
	super._visuals()
	if _link.is_empty():
		return
	var on: bool = alive_flag and rei != null and is_instance_valid(rei)
	for i in _link.size():
		var s: Sprite2D = _link[i]
		s.visible = on
		if on:
			var a: Vector2 = global_position + Vector2(0, -16)
			var b: Vector2 = rei.global_position + Vector2(0, -30)
			var f := (float(i) + 0.5) / float(_link.size())
			s.global_position = a.lerp(b, f)
			s.rotation = (b - a).angle()
			s.modulate.a = 0.35 + 0.25 * sin(pulse_t * 6.0 + i)
