extends Node2D
class_name Fx
## Efeitos visuais simples: texto flutuante, faíscas, anel, projétil e raízes.

var mode := "text"
var text := ""
var color := Color.WHITE
var life := 0.5
var t := 0.0
var radius := 20.0
var count := 5
var to := Vector2.ZERO
var on_end: Callable = Callable()
var _pts: Array = []
var _tex: Texture2D

func _ready() -> void:
	z_index = 40
	if mode == "spark":
		for i in count:
			_pts.append({"v": Vector2.from_angle(randf() * TAU) * randf_range(25.0, 60.0), "c": Color(1, 0.95, 0.6)})
	if mode == "roots":
		_tex = Art.sprite_tex("roots")
		for i in 6:
			_pts.append(Vector2.from_angle(randf() * TAU) * randf_range(0.0, radius * 0.8))
		z_index = 0
		Audio.play("roots", -6.0)

func _process(delta: float) -> void:
	t += delta
	queue_redraw()
	if mode == "bolt":
		position = position.lerp(to, clamp(delta / max(0.001, life - t + delta), 0.0, 1.0))
	if t >= life:
		if on_end.is_valid():
			on_end.call()
		queue_free()

func _draw() -> void:
	var f: float = clamp(t / life, 0.0, 1.0)
	match mode:
		"text":
			var font := ThemeDB.fallback_font
			var c := color
			c.a = 1.0 - f * f
			draw_string(font, Vector2(-8, -f * 14.0), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 9, Color(0, 0, 0, c.a))
			draw_string(font, Vector2(-9, -f * 14.0 - 1), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 9, c)
		"spark":
			for p in _pts:
				var c2: Color = p["c"]; c2.a = 1.0 - f
				draw_rect(Rect2(p["v"] * f * 0.5 - Vector2(1, 1), Vector2(2, 2)), c2)
		"ring":
			var c3 := color; c3.a = 0.8 * (1.0 - f)
			draw_arc(Vector2.ZERO, radius * f, 0.0, TAU, 32, c3, 2.0)
			draw_circle(Vector2.ZERO, radius * f, Color(c3.r, c3.g, c3.b, 0.12 * (1.0 - f)))
		"bolt":
			draw_circle(Vector2.ZERO, 2.5, color)
			draw_circle(Vector2.ZERO, 4.0, Color(color.r, color.g, color.b, 0.35))
		"roots":
			var a: float = 1.0 if f < 0.8 else (1.0 - f) / 0.2
			var grow: float = min(1.0, t / 0.25)
			draw_circle(Vector2.ZERO, radius, Color(0.2, 0.5, 0.2, 0.18 * a))
			draw_arc(Vector2.ZERO, radius, 0.0, TAU, 24, Color(0.5, 0.9, 0.4, 0.6 * a), 1.0)
			for p in _pts:
				draw_texture(_tex, p - Vector2(8, 14 * grow + 2), Color(1, 1, 1, a))
