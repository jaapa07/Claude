extends Enemy
## Inimigos da Catedral do Vazio (Região 5). Herdam o inimigo orientado a dados e mudam só o comportamento:
##  escriba           — Escriba do Vazio: mantém distância e escreve um SELO no chão onde o alvo está (círculo de aviso que
##                      fecha 1,1 s depois). Sair do círculo basta. Fica vulnerável enquanto escreve (pena erguida).
##  sentinela_prisma  — Sentinela Prismática: quase parada; carrega um feixe em linha reta (faixa de aviso até a parede) e o
##                      dispara. O prisma da frente segura golpes frontais: ataque pelos lados ou depois do disparo.
##  fragmento         — Fragmento Errante: muda de posição — marca no chão onde vai reaparecer (círculo), some e surge ali com
##                      um corte curto. A marca aparece antes: basta sair dela.
## Nenhuma decisão lê o botão apertado: só posição, tempo e golpes que já acertaram.

const SEAL_ARM := 1.1

var beam_len := 0.0
var blink_to := Vector2.ZERO
var _beam_parts: Array = []
var _blink_mark: Sprite2D

func _attack_params(a: String) -> Dictionary:
	match a:
		"selo": return {"wind": 0.75, "dur": 0.12, "rec": 0.7, "cd": 2.4, "start": 140.0, "keep": 76.0}
		"prisma": return {"wind": 1.0, "dur": 0.4, "rec": 1.3, "cd": 2.0, "start": 170.0, "w": 9.0}
		"fragmento": return {"wind": 0.7, "dur": 0.16, "rec": 0.9, "cd": 1.9, "start": 150.0, "r": 30.0, "arc": 70.0}
	return super._attack_params(a)

func _ready() -> void:
	super._ready()
	_blink_mark = Sprite2D.new()
	_blink_mark.texture = Art.sprite_tex("fx_warn_circle")
	_blink_mark.top_level = true
	_blink_mark.z_index = -1
	_blink_mark.visible = false
	add_child(_blink_mark)

# =============================================================== MOVIMENTO
func _chase(delta: float) -> void:
	var a: String = def.get("ataque", "")
	var tp := target.global_position
	var to := tp - global_position
	var dist := to.length()
	_face_to(tp)
	match a:
		"selo":
			var los := not Combat.ray_blocked(world, global_position, tp)
			if dist < P["keep"] * 0.8:
				_move(-to.normalized(), speed, delta)
				_anim("walk")
			elif dist > P["start"] * 0.85 or not los:
				_move(to.normalized(), speed, delta)
				_anim("walk")
			else:
				_move(to.normalized().orthogonal() * flank_side, speed * 0.35, delta)
				_anim("walk")
			if dist < P["start"] and cd <= 0.0 and los:
				_start_windup(to.normalized())
		"prisma":
			# gira devagar e quase não sai do lugar
			if global_position.distance_to(home) > 24.0:
				_move((home - global_position).normalized(), speed, delta)
				_anim("walk")
			else:
				_move(Vector2.ZERO, 0.0, delta)
				_anim("idle")
			if dist < P["start"] and cd <= 0.0 and not Combat.ray_blocked(world, global_position, tp):
				_start_windup(to.normalized())
				beam_len = _beam_reach(attack_dir)
		"fragmento":
			if dist > 90.0:
				_move(to.normalized(), speed, delta)
				_anim("walk")
			else:
				_move(to.normalized().orthogonal() * flank_side, speed * 0.5, delta)
				_anim("idle")
			if dist < P["start"] and cd <= 0.0:
				var dest := _pick_blink(tp)
				if dest != Vector2.ZERO:
					blink_to = dest
					_start_windup((tp - dest).normalized())
		_:
			super._chase(delta)

## Ponto livre perto do alvo onde o fragmento vai reaparecer (a 30 px, de um dos lados).
func _pick_blink(tp: Vector2) -> Vector2:
	var base := (global_position - tp).angle()
	for k in 8:
		var ang := base + (0.7 + 0.45 * k) * (1.0 if k % 2 == 0 else -1.0) * flank_side
		var p := tp + Vector2.from_angle(ang) * 30.0
		if not world.tile_solid_at(p) and not world.tile_solid_at(p + Vector2(0, 6)):
			return p
	return Vector2.ZERO

## Alcance do feixe até a primeira parede (o vazio deixa a luz passar).
func _beam_reach(d: Vector2) -> float:
	var l := 12.0
	while l < 220.0:
		var p: Vector2 = global_position + Vector2(0, -6) + d * l
		var c: String = world.tile_char_at(p)
		if world.is_solid_char(c) and not Catedral.LIGHT_PASS.contains(c):
			break
		l += 6.0
	return l

# =============================================================== ATAQUES
func _begin_attack() -> void:
	var a: String = def.get("ataque", "")
	match a:
		"selo":
			st = St.ATTACK
			st_t = 0.0
			_anim("attack")
			if target != null and is_instance_valid(target):
				var p: Vector2 = target.global_position
				if blind_t > 0.0:
					p += Vector2(randf_range(-30, 30), randf_range(-30, 30))
				_spawn_seal(p)
			Audio.play("skill", -8.0)
			return
		"prisma":
			st = St.ATTACK
			st_t = 0.0
			hit_registry.clear()
			_anim("attack")
			Audio.play("telegraph", -2.0)
			_show_beam(true)
			return
		"fragmento":
			st = St.ATTACK
			st_t = 0.0
			hit_registry.clear()
			world.fx_at("shards", global_position + Vector2(0, -8), 0.3)
			global_position = blink_to
			if sprite:
				sprite.modulate.a = 1.0
			world.fx_at("shards", global_position + Vector2(0, -8), 0.3)
			_anim("attack")
			Audio.play("swing", -4.0)
			if target != null and is_instance_valid(target):
				attack_dir = (target.global_position - global_position).normalized()
			world.fx_at("slash", global_position + attack_dir * 14.0 + Vector2(0, -8), 0.2, attack_dir.angle(), 1.1)
			return
	super._begin_attack()

func _attack_tick(delta: float) -> void:
	var a: String = def.get("ataque", "")
	var dmg := damage * Weather.enemy_attack_mult(self)
	if a == "prisma":
		_move(Vector2.ZERO, 0.0, delta)
		for t in world.targets():
			if hit_registry.has(t.get_instance_id()):
				continue
			var rel: Vector2 = t.global_position - global_position
			var along := rel.dot(attack_dir)
			if along > 0.0 and along <= beam_len and abs(rel.dot(attack_dir.orthogonal())) <= float(P["w"]) + 4.0:
				hit_registry[t.get_instance_id()] = true
				if not _misses():
					t.take_hit(dmg, global_position, {"knock": 60.0})
		if st_t >= P["dur"]:
			_show_beam(false)
			_end_attack()
		return
	if a == "selo":
		_move(Vector2.ZERO, 0.0, delta)
		if st_t >= P["dur"]:
			_end_attack()
		return
	super._attack_tick(delta)

func _end_attack() -> void:
	super._end_attack()
	if sprite:
		sprite.modulate.a = 1.0

func _spawn_seal(p: Vector2) -> void:
	var s: Node2D = preload("res://scripts/cat_selo.gd").new()
	s.world = world
	s.damage = damage * Weather.enemy_attack_mult(self)
	s.arm = SEAL_ARM * Game.warning_mult()
	s.position = p
	world.ysort.add_child(s)

func _show_beam(on: bool) -> void:
	for b in _beam_parts:
		if is_instance_valid(b):
			b.queue_free()
	_beam_parts.clear()
	if not on:
		return
	var n := int(beam_len / 16.0)
	for k in n:
		var s := Sprite2D.new()
		s.texture = Art.sprite_tex("cat_props")
		s.region_enabled = true
		s.region_rect = Rect2(22 * 16, 0, 16, 16)     # feixe_vermelho
		s.rotation = attack_dir.angle()
		s.position = attack_dir * (12.0 + k * 16.0) + Vector2(0, -6)
		s.z_index = 2
		add_child(s)
		_beam_parts.append(s)

func interrupt() -> void:
	_show_beam(false)
	super.interrupt()

func die(src: String) -> void:
	_show_beam(false)
	_blink_mark.visible = false
	super.die(src)

# =============================================================== AVISOS
func _visuals() -> void:
	super._visuals()
	if _blink_mark == null:
		return
	var blinking: bool = alive_flag and st == St.WINDUP and def.get("ataque", "") == "fragmento"
	_blink_mark.visible = blinking
	if blinking:
		_blink_mark.global_position = blink_to
		_blink_mark.scale = Vector2.ONE * (float(P["r"]) * 2.0 / 72.0 + 0.1)
		var f: float = clamp(st_t / (float(P["wind"]) * Game.warning_mult()), 0.0, 1.0)
		_blink_mark.modulate = Color(1, 1, 1, 0.35 + 0.5 * f)
		if sprite:
			sprite.modulate.a = 1.0 - 0.6 * f

func _draw_telegraph_decal() -> void:
	var a: String = def.get("ataque", "")
	if a == "prisma":
		_set_decal("line")
		_decal.region_rect = Rect2(0, 0, beam_len, float(P["w"]) * 2.0)
		_decal.rotation = attack_dir.angle()
		_decal.position = attack_dir * beam_len * 0.5
		_decal.scale = Vector2.ONE
		return
	if a == "selo":
		# a pena erguida (pose de windup) já anuncia; o círculo aparece no chão do alvo quando o selo é escrito
		_set_decal("line")
		_decal.region_rect = Rect2(0, 0, 40, 6)
		_decal.rotation = attack_dir.angle()
		_decal.position = attack_dir * 24.0
		_decal.scale = Vector2.ONE
		return
	if a == "fragmento":
		_set_decal("circle")
		_decal.rotation = 0.0
		_decal.position = Vector2.ZERO
		_decal.scale = Vector2.ONE * 0.4
		return
	super._draw_telegraph_decal()
