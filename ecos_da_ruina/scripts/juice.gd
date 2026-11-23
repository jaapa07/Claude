extends Node
class_name Juice
## Animação procedural de corpo para os sprites autorais (herói, criaturas, inimigos, chefes, aliados).
## Não desenha nada: só mexe na escala/posição do sprite e num shader de cor (clarão branco, brilho de
## antecipação e desintegração em pontilhado usando a matriz desenhada à mão em fx_bayer.png).
## Lê o estado pela animação que o dono está tocando, então funciona com qualquer script sem acoplamento:
##   idle -> respiração de 1 pixel; walk -> passada; windup -> agacha, treme e acende; attack -> estica e avança;
##   hurt -> achata e recua; propriedade `flash` do dono -> clarão branco; `phase` maior -> transição de fase.

const SHADER_CODE := """
shader_type canvas_item;
uniform float flash : hint_range(0.0, 1.0) = 0.0;
uniform vec4 flash_col : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float glow : hint_range(0.0, 1.0) = 0.0;
uniform vec4 glow_col : source_color = vec4(1.0, 0.45, 0.25, 1.0);
uniform float dissolve : hint_range(0.0, 1.0) = 0.0;
uniform vec4 dissolve_col : source_color = vec4(0.6, 0.95, 1.0, 1.0);
uniform sampler2D bayer : filter_nearest, repeat_enable;
void fragment() {
	vec4 c = COLOR;
	c.rgb = mix(c.rgb, glow_col.rgb, glow);
	c.rgb = mix(c.rgb, flash_col.rgb, flash);
	if (dissolve > 0.0) {
		vec2 px = floor(UV / TEXTURE_PIXEL_SIZE);
		float th = texture(bayer, (mod(px, 4.0) + 0.5) / 4.0).r;
		c.rgb = mix(c.rgb, dissolve_col.rgb, clamp(dissolve * 1.6, 0.0, 0.85));
		if (th < dissolve * 1.07) {
			c.a = 0.0;
		}
	}
	COLOR = c;
}
"""

## Cor de cada afinidade (impacto, fragmentos, partículas)
const AFF_COLOR := {
	"agua": Color(0.45, 0.78, 1.0), "brasa": Color(1.0, 0.55, 0.25), "flora": Color(0.55, 0.95, 0.4),
	"luz": Color(1.0, 0.95, 0.55), "pedra": Color(0.85, 0.72, 0.52), "sombra": Color(0.72, 0.5, 1.0),
	"vento": Color(0.75, 1.0, 0.9), "": Color(1.0, 0.96, 0.8)}

static var _shader: Shader

var host: Node2D
var spr: Node2D
var mat: ShaderMaterial
var fh := 24.0
var fw := 24.0
var enabled := true
var breathe := true            # respiração procedural no idle (o herói já tem quadros próprios)
var glow_windup := false       # inimigos: o corpo acende durante a antecipação (telegrafia)
var flash_prop := "flash"
var t := 0.0
var _period := 1.8
var _imp := Vector2.ZERO        # deformação extra (escala), volta por mola
var _imp_v := Vector2.ZERO
var _push := Vector2.ZERO       # deslocamento extra do sprite, volta suave
var _base_scale := Vector2.ONE
var _written := Vector2.ONE
var _last_anim := ""
var _extra_flash := 0.0
var _flash_hold := 0.0
var _phase := -1

static func color_of(aff: String) -> Color:
	return AFF_COLOR.get(aff, AFF_COLOR[""])

static func shader() -> Shader:
	if _shader == null:
		_shader = Shader.new()
		_shader.code = SHADER_CODE
	return _shader

## Liga a animação procedural a um sprite (AnimatedSprite2D) de uma entidade.
static func attach(p_host: Node2D, p_spr: Node2D, p_fw: float, p_fh: float) -> Juice:
	var j := Juice.new()
	j.name = "Juice"
	j.host = p_host
	j.spr = p_spr
	j.fw = max(8.0, p_fw)
	j.fh = max(8.0, p_fh)
	# fase própria sem usar o gerador aleatório global (os testes dependem da sequência dele)
	var hsh := int(p_host.get_instance_id() % 997)
	j.t = float(hsh) * 0.37
	j._period = 1.6 + float(hsh % 7) * 0.1
	j.mat = ShaderMaterial.new()
	j.mat.shader = shader()
	j.mat.set_shader_parameter("bayer", Art.sprite_tex("fx_bayer"))
	p_spr.material = j.mat
	j._base_scale = p_spr.scale
	j._written = p_spr.scale
	p_host.add_child(j)
	return j

func _process(delta: float) -> void:
	if spr == null or not is_instance_valid(spr):
		return
	t += delta
	_flash_hold = max(0.0, _flash_hold - delta)
	_extra_flash = max(0.0, _extra_flash - delta * 2.5) if _flash_hold <= 0.0 else _extra_flash
	# clarão branco (dano): puro no começo, depois esmaece
	var f := 0.0
	var hf = host.get(flash_prop) if host != null else null
	if hf != null and float(hf) > 0.0:
		f = clamp(float(hf) / 0.1, 0.0, 1.0)
	if f > 0.0 and _extra_flash <= 0.0:
		mat.set_shader_parameter("flash_col", Color.WHITE)   # dano sempre em branco
	f = max(f, _extra_flash)
	mat.set_shader_parameter("flash", clamp(f, 0.0, 1.0))
	if not enabled:
		return
	# transição de fase dos chefes
	var ph = host.get("phase")
	if ph != null:
		if _phase >= 0 and int(ph) > _phase:
			phase_burst()
		_phase = int(ph)
	if spr.scale != _written:
		_base_scale = spr.scale       # outro script mudou a escala de propósito
	var an: String = String(spr.get("animation"))
	if an != _last_anim:
		_on_enter(an)
		_last_anim = an
	var sx := 1.0
	var sy := 1.0
	var off := Vector2.ZERO
	var glow := 0.0
	if an.begins_with("idle"):
		if breathe:
			# respiração de exatamente 1 pixel (sem borrar a pixel art)
			var k := 1.0 if sin(t * TAU / _period) > 0.2 else 0.0
			sy += k / fh
	elif an.begins_with("walk"):
		if breathe:
			var fr := int(spr.get("frame"))
			sy += (1.0 / fh) if fr % 2 == 1 else 0.0
	elif an == "windup":
		# antecipação: agacha, treme e (inimigos) acende pulsando
		sx += 2.0 / fw
		sy -= 2.0 / fh
		off.x = float(int(t * 30.0) % 2) * 2.0 - 1.0
		if glow_windup:
			glow = 0.22 + 0.2 * (0.5 + 0.5 * sin(t * 22.0))
	if glow_windup and an.begins_with("atk0"):
		glow = 0.18 + 0.15 * (0.5 + 0.5 * sin(t * 22.0))
		off.x = float(int(t * 30.0) % 2) * 2.0 - 1.0
	mat.set_shader_parameter("glow", glow)
	# mola da deformação (leve sobra elástica) e retorno do deslocamento
	var acc := -_imp * 420.0 - _imp_v * 22.0
	_imp_v += acc * delta
	_imp += _imp_v * delta
	_push = _push.move_toward(Vector2.ZERO, 40.0 * delta)
	var sc := Vector2(sx + _imp.x, sy + _imp.y)
	sc.x = max(0.3, sc.x); sc.y = max(0.3, sc.y)
	_written = _base_scale * sc
	spr.scale = _written
	spr.position = (_push + off).round()

func _on_enter(an: String) -> void:
	if an == "attack" or (glow_windup and an.begins_with("atk2")):
		var d := _dir()
		if abs(d.x) >= abs(d.y):
			kick(Vector2(0.22, -0.14))
		else:
			kick(Vector2(-0.12, 0.18))
		_push = d * 3.0
	elif an.begins_with("atk1") and not glow_windup:
		var d2 := _dir()
		kick(Vector2(0.1, -0.06) if abs(d2.x) >= abs(d2.y) else Vector2(-0.06, 0.1))
		_push = d2 * 1.5
	elif an.begins_with("hurt"):
		kick(Vector2(0.28, -0.24))
		_push = -_dir() * 2.0
	elif an.begins_with("dodge"):
		kick(Vector2(0.16, -0.16))
	elif _last_anim.begins_with("dodge") and an.begins_with("idle") or _last_anim.begins_with("dodge") and an.begins_with("walk"):
		kick(Vector2(0.14, -0.12))      # aterrissagem da rolagem

func _dir() -> Vector2:
	var d = host.get("attack_dir")
	if d == null:
		d = host.get("aim_dir")
	if d == null or not (d is Vector2) or (d as Vector2).length() < 0.1:
		return Vector2.RIGHT
	return (d as Vector2).normalized()

## Impulso de deformação (x = largura, y = altura; positivos alargam/esticam)
func kick(v: Vector2) -> void:
	_imp = v
	_imp_v = Vector2.ZERO

func flash_for(sec: float, strength := 1.0, col := Color.WHITE) -> void:
	_extra_flash = strength
	_flash_hold = sec
	mat.set_shader_parameter("flash_col", col)

## Transição de fase do chefe: clarão, pulsação e anel de fragmentos de Eco.
func phase_burst() -> void:
	flash_for(0.25, 1.0)
	kick(Vector2(0.3, -0.25))
	var w = host.get("world")
	if w == null:
		return
	var c := color_of(str(host.get("affinity")))
	w.fx_at("pulse", host.global_position + Vector2(0, -fh * 0.45), 0.5, 0.0, 1.4).modulate = Color(c.r, c.g, c.b, 0.8)
	w.fx_at("impacto", host.global_position + Vector2(0, -fh * 0.5), 0.3, 0.0, 2.0).modulate = c.lerp(Color.WHITE, 0.5)
	if w.deco_ok():
		fragments(w, host.global_position + Vector2(0, -fh * 0.45), 18, c, fw * 0.4, fh * 0.4, 1.0, 70.0)

## Morte: clarão, desintegração em pontilhado e fragmentos de Eco subindo. `dur` = tempo até sumir.
func disintegrate(w: Node, dur: float, big := false) -> void:
	enabled = false
	flash_for(0.06, 1.0)
	var c := color_of(str(host.get("affinity")))
	mat.set_shader_parameter("dissolve_col", Color(0.6, 0.95, 1.0).lerp(c, 0.35))
	var tw := spr.create_tween()
	tw.tween_interval(0.07)
	tw.tween_method(func(v: float): mat.set_shader_parameter("dissolve", v), 0.0, 1.0, max(0.1, dur - 0.07))
	if w != null:
		var n := 34 if big else 12
		if w.deco_ok():
			fragments(w, host.global_position + Vector2(0, -fh * 0.45), n, Color(0.6, 0.95, 1.0).lerp(c, 0.3), fw * 0.35, fh * 0.35, 1.3 if big else 0.9, 34.0)
		else:
			w.fx_at("shards", host.global_position + Vector2(0, -fh * 0.4), 0.45)

## Rajada de fragmentos de Eco (fx_fragmento.png) no mundo. Partículas leves (CPUParticles2D, uma vez só).
static func fragments(w: Node, pos: Vector2, n: int, col: Color, ex: float, ey: float, life: float, spd: float) -> void:
	var p := CPUParticles2D.new()
	p.texture = Art.sprite_tex("fx_fragmento")
	p.amount = n
	p.lifetime = life
	p.one_shot = true
	p.explosiveness = 0.85
	p.randomness = 0.5
	p.local_coords = false
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(max(2.0, ex), max(2.0, ey))
	p.direction = Vector2(0, -1)
	p.spread = 70.0
	p.gravity = Vector2(0, -30)
	p.initial_velocity_min = spd * 0.4
	p.initial_velocity_max = spd
	p.damping_min = 20.0
	p.damping_max = 40.0
	var m := CanvasItemMaterial.new()
	m.particles_animation = true
	m.particles_anim_h_frames = 4
	m.particles_anim_v_frames = 1
	m.particles_anim_loop = true
	p.material = m
	p.anim_speed_min = 1.5
	p.anim_speed_max = 3.0
	p.anim_offset_max = 1.0
	var g := Gradient.new()
	g.set_color(0, Color(col.r, col.g, col.b, 1.0))
	g.set_color(1, Color(col.r, col.g, col.b, 0.0))
	g.add_point(0.6, Color(col.r, col.g, col.b, 0.9))
	p.color_ramp = g
	p.position = pos
	p.z_index = 2
	w.add_fx(p)
	p.emitting = true
	p.get_tree().create_timer(life + 0.4, false).timeout.connect(p.queue_free)
