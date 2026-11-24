extends Node2D
class_name Fx
## Efeitos visuais como sprites animados das folhas autorais (assets/src/20_efeitos.pxl).

const SHEETS := {
	"hit": ["fx_hit", 16, 16, 4, 22.0],
	"dust": ["fx_dust", 16, 12, 4, 14.0],
	"pulse": ["fx_pulse", 48, 48, 3, 10.0],
	"roots": ["fx_roots", 24, 24, 3, 14.0],
	"bond": ["fx_bond", 32, 32, 3, 10.0],
	"shards": ["fx_shards", 24, 20, 2, 6.0],
	"slash": ["fx_slash", 20, 32, 3, 30.0],
	"sparkle": ["fx_sparkle", 16, 12, 2, 8.0],
	"vortex": ["fx_vortex", 32, 32, 2, 10.0],
	"seal": ["fx_seal", 10, 10, 2, 14.0],
	"parry": ["fx_parry", 16, 16, 3, 14.0],
	"burst": ["fx_burst", 64, 64, 3, 7.0],
	"fire": ["fx_fire", 16, 16, 4, 12.0],
	"quake": ["fx_quake", 48, 16, 3, 10.0],
	"steam": ["minas_props", 16, 16, 2, 6.0, 9],
	"corrente": ["fx_corrente", 16, 16, 3, 16.0],
	"reviver": ["fx_reviver", 16, 16, 4, 10.0],
	"vento": ["fx_vento", 16, 16, 3, 14.0],
	"splash": ["fx_splash", 16, 16, 4, 14.0],
	"onda": ["fx_onda", 24, 24, 3, 12.0],
	"bolhas": ["pantano_props", 16, 16, 2, 6.0, 16],
	"impacto": ["fx_impacto", 24, 24, 5, 22.0],
	"passo": ["fx_passo", 10, 6, 3, 10.0],
	"ondinha": ["fx_ondinha", 16, 8, 4, 9.0],
	"selo_anel": ["fx_selo_anel", 24, 24, 3, 9.0],
}

var mode := "hit"
var text := ""
var color := Color.WHITE
var life := 0.5
var t := 0.0
var radius := 20.0
var count := 5
var to := Vector2.ZERO
var on_end: Callable = Callable()
var _spr: Array = []
var _lab: Label
var _start := Vector2.ZERO

func _ready() -> void:
	z_index = 40
	_start = position
	match mode:
		"text":
			_lab = Fonts.label(text, 9, color)
			_lab.position = Vector2(-12, -8)
			add_child(_lab)
		"roots":
			z_index = 0
			var pts := [Vector2.ZERO]
			for i in 5:
				pts.append(Vector2.from_angle(TAU * i / 5.0 + Game.fx_rng.randf() * 0.5) * radius * Game.fx_rng.randf_range(0.45, 0.85))
			for p in pts:
				var s := _anim("roots", false)
				s.position = p + Vector2(0, -8)
			Audio.play("roots", -6.0)
		"pulse":
			var s2 := _anim("pulse", false)
			s2.scale = Vector2.ONE * (radius / 24.0)
		"bolt":
			var s3 := _anim("sparkle", true)
			s3.modulate = color
		"spark":
			_anim("hit", false)
		_:
			_anim(mode, mode in ["sparkle", "vortex", "seal", "fire", "steam"])

func _anim(kind: String, loop: bool) -> AnimatedSprite2D:
	var d: Array = SHEETS[kind]
	var s := AnimatedSprite2D.new()
	if d.size() > 5:
		s.sprite_frames = Art.fx_frames_at(d[0], d[1], d[2], int(d[5]), d[3], d[4], true)
	else:
		s.sprite_frames = Art.fx_frames(d[0], d[1], d[2], d[3], d[4], loop)
	s.play("a")
	add_child(s)
	_spr.append(s)
	return s

func _process(delta: float) -> void:
	t += delta
	var f: float = clamp(t / life, 0.0, 1.0)
	match mode:
		"text":
			position = _start + Vector2(0, -14.0 * f)
			_lab.modulate.a = 1.0 - f * f
		"bolt":
			position = _start.lerp(to, f)
		"roots":
			if f > 0.8:
				modulate.a = (1.0 - f) / 0.2
		"steam":
			position = _start + Vector2(0, -10.0 * f)
			modulate.a = 1.0 - f * f
	if t >= life:
		if on_end.is_valid():
			on_end.call()
		queue_free()
