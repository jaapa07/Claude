extends Enemy
## Inimigos da Fortaleza do Eclipse (Região 4). Herdam o inimigo orientado a dados e mudam só o comportamento:
##  lanceiro  — guarda um corredor (não persegue além do posto), escudo frontal e estocada longa anunciada por uma faixa no chão.
##              Depois da estocada fica vulnerável (guarda baixa) — é a janela para atacar.
##  arqueiro  — mantém distância, dispara uma flecha anunciada por uma linha e em seguida corre para outra posição com visão.
##  armadura  — armadura vazia: se recebe golpes no mesmo ritmo (3 golpes seguidos em pouco tempo), entra em postura de
##              contra-ataque (anunciada por pose, brilho e círculo no chão) e revida em área. Variar o ritmo, esquivar
##              ou deixar a criatura atacar quebra o padrão. Nunca reage ao botão apertado: só a golpes que já acertaram.

const LEASH := 84.0

var repos_to := Vector2.ZERO
var repos_t := 0.0
var hit_times: Array = []
var countering := false
var _p_normal: Dictionary = {}
var post_dir := Vector2.ZERO

func _attack_params(a: String) -> Dictionary:
	match a:
		"estocada": return {"wind": 0.8, "dur": 0.22, "rec": 1.2, "cd": 1.5, "start": 66.0, "len": 70.0, "w": 10.0}
		"flecha": return {"wind": 0.7, "dur": 0.12, "rec": 0.35, "cd": 1.8, "start": 160.0, "keep": 72.0}
		"contra": return {"wind": 0.95, "dur": 0.16, "rec": 1.0, "cd": 1.1, "start": 30.0, "r": 34.0, "arc": 70.0}
	return super._attack_params(a)

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	_p_normal = P
	if e.has("posto"):
		var pd: Array = e["posto"]
		post_dir = Vector2(float(pd[0]), float(pd[1])).normalized()

func _ready() -> void:
	super._ready()
	if post_dir != Vector2.ZERO:
		face = Vector2(sign(post_dir.x), 0) if post_dir.x != 0.0 else face
		if sprite and not human:
			sprite.flip_h = post_dir.x < 0.0

# =============================================================== MOVIMENTO
func _chase(delta: float) -> void:
	match kind:
		"lanceiro": _chase_lanceiro(delta)
		"arqueiro": _chase_arqueiro(delta)
		_: super._chase(delta)

func _chase_lanceiro(delta: float) -> void:
	var tp := target.global_position
	var to := tp - global_position
	var dist := to.length()
	_face_to(tp)
	# guarda o corredor: nunca se afasta do posto além do limite
	if tp.distance_to(home) > LEASH + 40.0 and global_position.distance_to(home) > 6.0:
		_move((home - global_position).normalized(), speed, delta)
		_anim("walk")
		return
	if dist > P["start"] * 0.85 and global_position.distance_to(home) < LEASH:
		_move(to.normalized(), speed, delta)
		_anim("walk")
	else:
		_move(Vector2.ZERO, 0.0, delta)
		_anim("idle")
	if dist < P["start"] and cd <= 0.0:
		_start_windup(to.normalized())

func _chase_arqueiro(delta: float) -> void:
	var tp := target.global_position
	var to := tp - global_position
	var dist := to.length()
	_face_to(tp)
	var los := not Combat.ray_blocked(world, global_position, tp)
	if repos_t > 0.0:
		repos_t -= delta
		var d := repos_to - global_position
		if d.length() > 4.0:
			_move(d.normalized(), speed * 1.35, delta)
			_anim("walk")
			return
		repos_t = 0.0
	if dist < P["keep"] * 0.75:
		_move(-to.normalized(), speed, delta)
		_anim("walk")
	elif dist > P["start"] * 0.9 or not los:
		_move(to.normalized(), speed, delta)
		_anim("walk")
	else:
		_move(Vector2.ZERO, 0.0, delta)
		_anim("idle")
	if dist < P["start"] and cd <= 0.0 and los:
		_start_windup(to.normalized())

## Depois de disparar, escolhe outro ponto com visão do alvo, a ~100 px, girando em volta dele.
func _pick_reposition() -> void:
	if target == null or not is_instance_valid(target):
		return
	var tp: Vector2 = target.global_position
	var base := (global_position - tp).angle()
	for k in 6:
		var ang := base + (0.9 + 0.25 * k) * flank_side * (1.0 if k % 2 == 0 else -1.0)
		var p := tp + Vector2.from_angle(ang) * randf_range(90.0, 120.0)
		if world.tile_solid_at(p) or Combat.ray_blocked(world, p, tp) or Combat.ray_blocked(world, global_position, p):
			continue
		repos_to = p
		repos_t = 1.4
		return

# =============================================================== ATAQUES
func _begin_attack() -> void:
	var a: String = def.get("ataque", "")
	if countering:
		st = St.ATTACK
		st_t = 0.0
		hit_registry.clear()
		_anim("attack")
		Audio.play("swing")
		world.fx_at("slash", global_position + Vector2(0, -12), 0.25, attack_dir.angle(), 1.6)
		return
	if a == "flecha":
		st = St.ATTACK
		st_t = 0.0
		_anim("attack")
		if target != null and is_instance_valid(target):
			var dir := (target.global_position - global_position).normalized()
			if blind_t > 0.0:
				dir = dir.rotated(randf_range(-0.6, 0.6))
			var p: Node2D = preload("res://scripts/fort_projectile.gd").new()
			p.world = world
			p.mode = "flecha"
			p.dir = dir
			p.damage = damage * Weather.enemy_attack_mult(self)
			p.owner_ref = self
			p.position = global_position + dir * 10.0
			world.add_fx(p)
			Audio.play("swing", -6.0)
		return
	if a == "estocada":
		st = St.ATTACK
		st_t = 0.0
		hit_registry.clear()
		_anim("attack")
		Audio.play("swing", -2.0)
		return
	super._begin_attack()

func _attack_tick(delta: float) -> void:
	var a: String = def.get("ataque", "")
	var dmg := damage * Weather.enemy_attack_mult(self)
	if countering:
		_move(Vector2.ZERO, 0.0, delta)
		for t in world.targets():
			if hit_registry.has(t.get_instance_id()):
				continue
			if t.global_position.distance_to(global_position) <= 40.0:
				hit_registry[t.get_instance_id()] = true
				if not _misses():
					t.take_hit(dmg * 1.4, global_position, {"knock": 150.0})
		if st_t >= P["dur"]:
			countering = false
			P = _p_normal
			_end_attack()
			st_t = -0.5     # recuperação mais longa depois do contra-ataque
		return
	if a == "estocada":
		_move(attack_dir, 170.0 if st_t < 0.12 else 0.0, delta)
		for t in world.targets():
			if hit_registry.has(t.get_instance_id()):
				continue
			var rel: Vector2 = t.global_position - global_position
			var along := rel.dot(attack_dir)
			var across: float = abs(rel.dot(attack_dir.orthogonal()))
			if along > -4.0 and along <= P["len"] * 0.6 and across <= P["w"] + 4.0:
				hit_registry[t.get_instance_id()] = true
				if not _misses():
					t.take_hit(dmg, global_position, {"knock": 130.0})
		if st_t >= P["dur"]:
			_end_attack()
		return
	if a == "flecha":
		_move(Vector2.ZERO, 0.0, delta)
		if st_t >= P["dur"]:
			_end_attack()
			_pick_reposition()
		return
	super._attack_tick(delta)

# =============================================================== DANO (contra-ataque da armadura)
func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if kind == "armadura" and hittable():
		if countering and st == St.WINDUP and str(opts.get("src", "")) == "heroi":
			world.spawn_text(global_position + Vector2(0, -fh), "Aparou!", Color(0.8, 0.85, 1.0))
			Audio.play("guard")
			hp_bar_t = 3.0
			return super.take_damage(amount * 0.2, from_pos, opts)
		if str(opts.get("src", "")) == "heroi" and not countering and st != St.STAGGER:
			var now := Game.clock_ms() / 1000.0
			hit_times.append(now)
			while hit_times.size() > 0 and now - float(hit_times[0]) > 1.7:
				hit_times.pop_front()
			if hit_times.size() >= 3:
				hit_times.clear()
				var got := super.take_damage(amount, from_pos, opts)
				if alive_flag:
					_start_counter(from_pos)
				return got
	return super.take_damage(amount, from_pos, opts)

func _start_counter(from_pos: Vector2) -> void:
	countering = true
	P = _attack_params("contra")
	st = St.WINDUP
	st_t = 0.0
	attack_dir = (from_pos - global_position).normalized()
	hit_registry.clear()
	Audio.play("telegraph")
	world.spawn_text(global_position + Vector2(0, -fh - 6), "Contra-ataque!", Color(1.0, 0.7, 0.9))

func interrupt() -> void:
	if countering:
		return
	super.interrupt()

# =============================================================== AVISOS (decalques autorais)
func _draw_telegraph_decal() -> void:
	var a: String = def.get("ataque", "")
	if countering:
		_set_decal("circle")
		_decal.rotation = 0.0
		_decal.position = Vector2.ZERO
		_decal.scale = Vector2.ONE * (40.0 / 34.0)
		return
	if a == "estocada":
		_set_decal("line")
		_decal.region_rect = Rect2(0, 0, float(P["len"]), float(P["w"]) * 2.0)
		_decal.rotation = attack_dir.angle()
		_decal.position = attack_dir * float(P["len"]) * 0.5
		_decal.scale = Vector2.ONE
		return
	if a == "flecha":
		_set_decal("line")
		_decal.region_rect = Rect2(0, 0, 90, 6)
		_decal.rotation = attack_dir.angle()
		_decal.position = attack_dir * 50.0
		_decal.scale = Vector2.ONE
		return
	super._draw_telegraph_decal()

func _tint() -> Color:
	if countering and st == St.WINDUP and flash <= 0.0:
		return Color(1.3, 1.1, 1.6)
	return super._tint()
