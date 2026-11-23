extends Node2D
## Perigo temporário no chão: poça de escória quente (fere quem pisa) ou nuvem de fuligem (inimigos dentro erram ataques).
## Região 3: "poca" (poça amaldiçoada da Bruxa: fere o herói) e "lodo" (campo do Brejugo: inimigos dentro ficam lentos).
## Visual com sprites autorais (tile hot_floor + fx_fire, ou fx_dust escurecido); nada desenhado por código.

var world: Node
var mode := "hot"
var hot := true
var radius := 14.0
var life := 4.0
var t := 0.0
var _parts: Array = []

func _ready() -> void:
	add_to_group("hazards")
	z_index = -1 if mode in ["hot", "poca", "lodo"] else 30
	if mode == "poca" or mode == "lodo":
		var s0 := Sprite2D.new()
		s0.texture = Art.sprite_tex("tiles_pantano")
		s0.region_enabled = true
		s0.region_rect = Rect2((7 if mode == "poca" else 10) * 16, 0, 16, 16)    # agua_rasa / lodo_instavel
		s0.scale = Vector2.ONE * (radius * 2.0 / 16.0)
		s0.modulate = Color(0.75, 0.6, 1.0, 0.8) if mode == "poca" else Color(1, 1, 1, 0.85)
		add_child(s0)
		_parts.append(s0)
		for k in 2:
			var b := AnimatedSprite2D.new()
			b.sprite_frames = Art.fx_frames_at("pantano_props", 16, 16, 16, 2, 4.0, true)
			b.position = Vector2(-radius * 0.35 + radius * 0.7 * k, -4.0 * k)
			b.play("a")
			add_child(b)
			_parts.append(b)
	elif mode == "hot":
		var s := Sprite2D.new()
		s.texture = Art.sprite_tex("tiles_minas")
		s.region_enabled = true
		s.region_rect = Rect2(8 * 16, 0, 16, 16)          # hot_floor
		s.scale = Vector2.ONE * (radius * 2.0 / 16.0)
		s.modulate = Color(1, 1, 1, 0.85)
		add_child(s)
		_parts.append(s)
		var f := AnimatedSprite2D.new()
		f.sprite_frames = Art.fx_frames("fx_fire", 16, 16, 4, 9.0, true)
		f.position = Vector2(0, -6)
		f.scale = Vector2(0.7, 0.7)
		f.play("a")
		add_child(f)
		_parts.append(f)
	else:
		for k in 6:
			var d := AnimatedSprite2D.new()
			d.sprite_frames = Art.fx_frames_at("fx_dust", 16, 12, 0, 4, 4.0, true)
			d.position = Vector2.from_angle(TAU * k / 6.0) * radius * 0.55
			d.scale = Vector2.ONE * 1.8
			d.modulate = Color(0.25, 0.22, 0.3, 0.75)
			d.play("a")
			add_child(d)
			_parts.append(d)

func _process(delta: float) -> void:
	if get_tree().paused:
		return
	t += delta
	if mode == "lodo":
		for e in world.enemies():
			if e.global_position.distance_to(global_position) <= radius + e.radius:
				e.slow_t = max(e.slow_t, 0.4)
	if mode == "smoke":
		rotation += delta * 0.4
		for e in world.enemies():
			if e.global_position.distance_to(global_position) <= radius + e.radius:
				e.blind_t = max(e.blind_t, 0.4)
	if t > life - 0.6:
		modulate.a = clamp((life - t) / 0.6, 0.0, 1.0)
	if t >= life:
		queue_free()
