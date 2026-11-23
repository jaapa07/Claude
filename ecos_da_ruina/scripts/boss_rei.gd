extends Enemy
## Rei dos Ecos (guardião final da Catedral do Vazio). É Ivar, o primeiro Arquivista, que guardou o Eco em si e esqueceu quem era.
## Fase 1: alterna ataques reconhecíveis dos quatro guardiões — UM de cada vez, sempre anunciado pelo nome, por cor e por aviso
##         no chão: Eco do Cervo (faixas de raízes), Eco do Ferreiro (ondas de martelo), Eco da Bruxa (leque de orbes + poças) e
##         Eco do Cavaleiro (estocada longa, depois fica exausto). Depois de cada ataque, uma janela de recuperação.
## Fase 2 (65%): sobe ao centro e acende DOIS FOCOS que protegem o núcleo. Cada foco só cede a golpes vindos de trás (do lado
##         oposto ao Rei): é preciso se posicionar. Com os dois apagados, o núcleo fica exposto por alguns segundos.
## Fase 3 (30%): a arena se parte — trechos anunciados 2,5 s antes (faixas no chão) caem no vazio; a cruz central nunca cai.
##         Entre as quedas há intervalos de respiro (e a luz de Ione, se ela estiver livre, cura um pouco).
## No fim (6%) ele hesita: não cai pela força. O herói devolve a ele o nome "Ivar" (entidade "nome") e ele se desfaz em paz.
## Nenhuma decisão lê o botão apertado: só posição, tempo e golpes que já acertaram.

enum B { DORMANT, INTRO, CHASE, TELE, ATTACK, THRUST, EXHAUSTED, RECOVER, RISE, SHIELDED, EXPOSED, WARN_RUIN, BREATH, HESITATE, RELEASED, TRANSITION }

var activated := false
var bst := B.DORMANT
var bt := 0.0
var phase := 1
var bdef: Dictionary = {}
var arena := Rect2()
var center := Vector2.ZERO
var echo_i := 0
var echo := ""
var echoes_seen := {}
var focos: Array = []
var foco_pos: Array = []
var shield_cycles := 0
var ruinas: Array = []
var ruin_i := 0
var ruin_attacks := 0
var falls := 0
var heals := 0
var phase_done := {2: false, 3: false}
var attack_t := 0.0
var nome_ent: Node = null
var root_dirs: Array = []
var quake_dirs: Array = []
var orb_dirs: Array = []
var puddle_pts: Array = []
var _decals: Array = []
var _circles: Array = []
var _ruin_decals: Array = []

const ECHOES := ["cervo", "ferreiro", "bruxa", "cavaleiro"]
const ECHO_NAME := {"cervo": "Eco do Cervo", "ferreiro": "Eco do Ferreiro", "bruxa": "Eco da Bruxa", "cavaleiro": "Eco do Cavaleiro"}
const ECHO_TINT := {"cervo": Color(0.75, 1.15, 0.75), "ferreiro": Color(1.25, 0.85, 0.6), "bruxa": Color(0.7, 0.95, 1.2), "cavaleiro": Color(1.05, 0.8, 1.25)}

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	boss = true
	bdef = Data.bosses["rei"]
	max_hp = float(bdef["hp"]); hp = max_hp
	invulnerable = true
	radius = 18.0
	arena = Rect2(float(e["x0"]) * 16.0, float(e["y0"]) * 16.0, float(e["w"]) * 16.0, float(e["h"]) * 16.0)
	center = arena.get_center()
	def["percepcao"] = 800
	for p in e.get("focos", []):
		foco_pos.append(Vector2(float(p[0]) * 16.0 + 8.0, float(p[1]) * 16.0 + 8.0))
	ruinas = e.get("ruinas", [])

func _ready() -> void:
	super._ready()
	collision_mask = 0          # paira sobre a arena (também sobre o vazio)
	for i in 5:
		var d := Sprite2D.new()
		d.texture = Art.sprite_tex("fx_warn_tile")
		d.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		d.region_enabled = true
		d.top_level = true
		d.z_index = -1
		d.visible = false
		add_child(d)
		_decals.append(d)
	for i in 3:
		var c := Sprite2D.new()
		c.texture = Art.sprite_tex("fx_warn_circle")
		c.top_level = true
		c.z_index = -1
		c.visible = false
		add_child(c)
		_circles.append(c)

func activate() -> void:
	if activated:
		return
	activated = true
	bst = B.INTRO
	bt = 3.0
	world.gather_companion(arena)
	Game.set_flag("tmp_rei_ativo")
	Audio.play("boss_roar")
	world.shake(3.0, 1.0)
	world.boss_started(self)
	world.say("O Rei dos Ecos ergue as mãos: \"Raiz... brasa... água... sombra. Eu guardei tudo. Por que não lembro de NADA?\"")

func _hero() -> Vector2:
	return world.player.global_position

func _ai(delta: float) -> void:
	if bst == B.DORMANT:
		_anim("idle")
		return
	bt -= delta
	var pp := _hero()
	var to := pp - global_position
	_face_to(pp)
	match bst:
		B.INTRO, B.TRANSITION:
			_anim("windup")
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				invulnerable = false
				if phase == 2:
					_rise()
				elif phase == 3:
					_start_ruin()
				else:
					bst = B.CHASE
					bt = 1.0
		B.CHASE:
			# paira mantendo distância média do herói
			var want := 96.0
			if to.length() > want + 20.0:
				_move(to.normalized(), speed, delta)
			elif to.length() < want - 30.0:
				_move(-to.normalized(), speed * 0.8, delta)
			else:
				_move(to.normalized().orthogonal(), speed * 0.4, delta)
			_keep_in_arena()
			_anim("walk")
			if bt <= 0.0:
				_tele_echo(ECHOES[echo_i % ECHOES.size()])
				echo_i += 1
		B.TELE:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				_fire_echo()
		B.ATTACK:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("attack")
			if bt <= 0.0:
				_after_attack()
		B.THRUST:
			_anim("attack")
			_move(attack_dir, float(bdef["vel_estocada"]), delta)
			for t in world.targets():
				if hit_registry.has(t.get_instance_id()):
					continue
				var rel: Vector2 = t.global_position - global_position
				if rel.dot(attack_dir) > -8.0 and rel.dot(attack_dir) < 46.0 and abs(rel.dot(attack_dir.orthogonal())) < 18.0:
					hit_registry[t.get_instance_id()] = true
					if not _misses():
						t.take_hit(float(bdef["dano_estocada"]), global_position, {"knock": 160.0})
			if bt <= 0.0 or not arena.grow(-20.0).has_point(global_position + attack_dir * 18.0):
				bst = B.EXHAUSTED
				bt = float(bdef["exausto_s"])
				world.shake(2.0, 0.2)
				Audio.play("thud")
		B.EXHAUSTED, B.RECOVER:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("hurt" if bst == B.EXHAUSTED else "idle")
			if bt <= 0.0:
				_resume()
		B.RISE:
			var tc := center + Vector2(0, -24)
			global_position = global_position.move_toward(tc, 90.0 * delta)
			velocity = Vector2.ZERO
			_anim("windup")
			if bt <= 0.0:
				_light_focos()
		B.SHIELDED:
			global_position = global_position.move_toward(center + Vector2(0, -24), 60.0 * delta)
			velocity = Vector2.ZERO
			_anim("idle")
			attack_t -= delta
			if attack_t <= 0.0:
				attack_t = float(bdef["ataque_focos_s"])
				_tele_echo(ECHOES[echo_i % ECHOES.size()] if ECHOES[echo_i % ECHOES.size()] != "cavaleiro" else "bruxa")
				echo_i += 1
				return
			if _focos_down():
				_expose()
		B.EXPOSED:
			global_position = global_position.move_toward(center + Vector2(0, 8), 80.0 * delta)
			velocity = Vector2.ZERO
			_anim("hurt")
			if bt <= 0.0 and phase == 2:
				_light_focos()
		B.WARN_RUIN:
			_move(Vector2.ZERO, 0.0, delta)
			global_position = global_position.move_toward(center, 60.0 * delta)
			_anim("windup")
			if bt <= 0.0:
				_collapse()
		B.BREATH:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("idle")
			if bt <= 0.0:
				_restore_floor()
				_start_ruin()
		B.HESITATE:
			_move(Vector2.ZERO, 0.0, delta)
			global_position = global_position.move_toward(center + Vector2(0, -8), 40.0 * delta)
			_anim("hurt")
		B.RELEASED:
			_move(Vector2.ZERO, 0.0, delta)

func _keep_in_arena() -> void:
	var a := arena.grow(-28.0)
	global_position = Vector2(clamp(global_position.x, a.position.x, a.end.x), clamp(global_position.y, a.position.y, a.end.y))

# ---------------------------------------------------------------- ecos dos guardiões (um de cada vez)
func _tele_echo(e: String) -> void:
	echo = e
	echoes_seen[e] = true
	bst = B.TELE
	var pp := _hero()
	var base := (pp - global_position).normalized()
	attack_dir = base
	match e:
		"cervo":
			bt = float(bdef["aviso_raiz"])
			root_dirs = [base, base.rotated(0.5), base.rotated(-0.5)]
		"ferreiro":
			bt = float(bdef["aviso_martelo"])
			quake_dirs = [base, base.rotated(0.6), base.rotated(-0.6)]
		"bruxa":
			bt = float(bdef["aviso_orbes"])
			orb_dirs = []
			for k in 5:
				orb_dirs.append(base.rotated(-0.5 + 0.25 * k))
			puddle_pts = [pp, pp + base.orthogonal() * 40.0]
		"cavaleiro":
			bt = float(bdef["aviso_estocada"])
	bt *= Game.warning_mult()
	Audio.play("telegraph")
	world.spawn_text(global_position + Vector2(0, -80), ECHO_NAME[e], ECHO_TINT[e])

func _fire_echo() -> void:
	match echo:
		"cervo":
			Audio.play("roots")
			world.shake(1.5, 0.2)
			var L := float(bdef["alcance_raiz"])
			for d in root_dirs:
				for k in 5:
					world.fx_at("roots", global_position + d * (20.0 + k * L / 5.0), 0.5, 0.0, 1.2)
				for t in world.targets():
					var rel: Vector2 = t.global_position - global_position
					if rel.dot(d) > 0.0 and rel.dot(d) < L and abs(rel.dot(d.orthogonal())) < 13.0:
						t.take_hit(float(bdef["dano_raiz"]), global_position, {"knock": 100.0})
			bst = B.ATTACK
			bt = 0.4
		"ferreiro":
			Audio.play("thud")
			world.shake(2.5, 0.3)
			for d in quake_dirs:
				var q = world.spawn_projectile(global_position + d * 18.0, d, float(bdef["dano_martelo"]), self, "quake")
				q.speed = 170.0
				q.max_dist = float(bdef["alcance_martelo"])
				q.width = 14.0
				q.over_water = true
				q.opts = {"guarda_parcial": true, "knock": 120.0}
			bst = B.ATTACK
			bt = 0.5
		"bruxa":
			for d in orb_dirs:
				var o = world.spawn_projectile(global_position + Vector2(0, -16) + d * 16.0, d, float(bdef["dano_orbe"]), self, "orbe")
				o.speed = 110.0
				o.max_dist = 220.0
			for p in puddle_pts:
				if not world.tile_solid_at(p):
					world.add_puddle(p, 18.0, float(bdef["poca_s"]))
			Audio.play("swing", -4.0)
			bst = B.ATTACK
			bt = 0.5
		"cavaleiro":
			bst = B.THRUST
			bt = 0.36
			hit_registry.clear()
			Audio.play("swing")

func _after_attack() -> void:
	bst = B.RECOVER
	bt = float(bdef["recupera_s"])

func _resume() -> void:
	match phase:
		2:
			bst = B.EXPOSED if _focos_down() else B.SHIELDED
			if bst == B.SHIELDED:
				attack_t = float(bdef["ataque_focos_s"])
		3:
			ruin_attacks += 1
			if ruin_attacks >= 2:
				_breath()
			else:
				bt = 0.6
				bst = B.CHASE
				_tele_echo(ECHOES[echo_i % ECHOES.size()])
				echo_i += 1
		_:
			bst = B.CHASE
			bt = float(bdef["intervalo_s"])

# ---------------------------------------------------------------- fase 2: dois focos protegem o núcleo
func _rise() -> void:
	bst = B.RISE
	bt = 1.2
	invulnerable = true

func _light_focos() -> void:
	for f in focos:
		if is_instance_valid(f):
			f.queue_free()
	focos.clear()
	for p in foco_pos:
		var f: Enemy = load("res://scripts/boss_rei_foco.gd").new()
		f.init(world, "foco_rei", {"x": int(p.x / 16.0), "y": int(p.y / 16.0), "id": "foco_%d" % focos.size()})
		f.rei = self
		world.ysort.add_child(f)
		focos.append(f)
	shield_cycles += 1
	bst = B.SHIELDED
	invulnerable = false
	attack_t = float(bdef["ataque_focos_s"])
	Audio.play("guard")
	world.say("Dois focos de luz protegem o núcleo do Rei. Cada foco só cede a golpes vindos DE TRÁS — dê a volta neles!" if shield_cycles == 1
		else "Os focos se reacendem! Por trás deles, de novo.")

func _focos_down() -> bool:
	for f in focos:
		if is_instance_valid(f) and f.alive_flag:
			return false
	return true

func _expose() -> void:
	bst = B.EXPOSED
	bt = float(bdef["exposto_s"])
	Audio.play("guard_break")
	world.shake(2.0, 0.3)
	world.spawn_text(global_position + Vector2(0, -80), "Núcleo exposto!", Color(1.0, 0.55, 0.5))

# ---------------------------------------------------------------- fase 3: a arena se parte (avisos claros, respiros)
func _start_ruin() -> void:
	if ruinas.is_empty():
		bst = B.CHASE
		bt = 1.0
		return
	bst = B.WARN_RUIN
	bt = float(bdef["aviso_ruina"]) * Game.warning_mult()
	ruin_attacks = 0
	Audio.play("telegraph")
	world.say("O chão treme: as faixas marcadas vão cair no vazio! Fique na cruz central ou nas partes firmes.")

func ruin_rects(i: int) -> Array:
	var out: Array = []
	for r in ruinas[i % ruinas.size()]:
		out.append(Rect2(float(r[0]) * 16.0, float(r[1]) * 16.0, float(r[2]) * 16.0, float(r[3]) * 16.0))
	return out

func _collapse() -> void:
	Game.set_flag("tmp_rei_ruina%d" % (ruin_i % ruinas.size()))
	world.shake(3.0, 0.5)
	Audio.play("boss_roar", -6.0)
	_fall_check()
	ruin_attacks = 0
	bst = B.CHASE
	bt = 0.8
	_tele_echo(ECHOES[echo_i % ECHOES.size()])
	echo_i += 1

func _restore_floor() -> void:
	for i in ruinas.size():
		Game.set_flag("tmp_rei_ruina%d" % i, false)
	ruin_i += 1

func _breath() -> void:
	bst = B.BREATH
	bt = float(bdef["respiro_s"])
	world.spawn_text(global_position + Vector2(0, -80), "O Rei respira...", Color(0.85, 0.9, 1.0))
	if Game.has_flag("ione_livre"):
		var hmax := Game.hero_max_hp()
		Game.hero["hp"] = min(hmax, float(Game.hero["hp"]) + hmax * float(bdef["cura_ione"]))
		Game.hero_changed.emit()
		heals += 1
		world.fx_at("sparkle", _hero() + Vector2(0, -16), 0.6, 0.0, 1.4)
		world.spawn_text(_hero() + Vector2(0, -34), "Luz de Ione", Color(0.6, 0.8, 1.0))

## Quem ficou sobre um trecho que caiu é levado ao chão firme mais próximo (dano leve; nunca morte por queda).
func _fall_check() -> void:
	for t in world.targets():
		if world.tile_solid_at(t.global_position):
			t.global_position = _nearest_firm(t.global_position)
			falls += 1
			if t == world.player:
				t.env_damage(float(bdef["dano_queda"]), "Vazio!")

func _nearest_firm(p: Vector2) -> Vector2:
	var best := p
	var bd := 1e9
	var tx := int(floor(p.x / 16.0)); var ty := int(floor(p.y / 16.0))
	for r in range(1, 16):
		for j in range(-r, r + 1):
			for i in range(-r, r + 1):
				if max(abs(i), abs(j)) != r:
					continue
				var q := Vector2((tx + i) * 16.0 + 8.0, (ty + j) * 16.0 + 8.0)
				if not world.tile_solid_at(q) and q.distance_to(p) < bd:
					bd = q.distance_to(p)
					best = q
		if bd < 1e9:
			return best
	return world.safe_pos_near(p)

# ---------------------------------------------------------------- o fim: o nome devolvido
func _hesitate() -> void:
	bst = B.HESITATE
	invulnerable = true
	velocity = Vector2.ZERO
	_restore_floor()
	for f in focos:
		if is_instance_valid(f):
			f.queue_free()
	Audio.play("boss_roar", -10.0)
	world.say("O Rei para no ar. As correntes afrouxam. \"Quem... sou eu?\" — Não é a força que vai terminar isto.")
	var c := CatEnt.new()
	c.init(world, {"type": "nome", "id": "rei_nome", "x": int(global_position.x / 16.0), "y": int(global_position.y / 16.0) + 2, "rei_node": self})
	world.ysort.add_child(c)
	nome_ent = c

## Chamado depois do diálogo do nome: o Rei se desfaz em paz.
func release() -> void:
	if bst == B.RELEASED:
		return
	bst = B.RELEASED
	if is_instance_valid(nome_ent):
		nome_ent.queue_free()
	invulnerable = false
	hp = 0.0
	die("nome")

# =============================================================== DANO
func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable() or bst in [B.HESITATE, B.RELEASED]:
		return 0.0
	var m := 1.0
	match bst:
		B.EXHAUSTED: m = float(bdef["mult_exausto"])
		B.RECOVER: m = float(bdef["mult_recupera"])
		B.EXPOSED: m = float(bdef["mult_exposto"])
		B.BREATH: m = float(bdef["mult_recupera"])
		B.SHIELDED, B.RISE:
			m = float(bdef["mult_protegido"])
			world.spawn_text(global_position + Vector2(0, -76), "Protegido", Color(0.8, 0.85, 1.0))
	# cada fase só começa depois de mostrar o que tem (fase 2: pelo menos um núcleo exposto; fase 1: os quatro ecos)
	var floor_hp := max_hp * float(bdef["hesita"])
	if phase == 1 and echoes_seen.size() < 4:
		floor_hp = max(floor_hp, max_hp * float(bdef["fases"][1]) + 1.0)
	elif phase == 2 and shield_cycles < 1:
		floor_hp = max(floor_hp, max_hp * float(bdef["fases"][2]) + 1.0)
	elif phase == 2:
		floor_hp = max(floor_hp, max_hp * (float(bdef["fases"][2]) - 0.02))
	elif phase == 3 and ruin_i < 1:
		floor_hp = max(floor_hp, max_hp * (float(bdef["hesita"]) + 0.04))
	var dmg := amount * m
	if hp - dmg * 1.3 < floor_hp:
		dmg = max(0.0, hp - floor_hp) / 1.3
	var got := super.take_damage(dmg, from_pos, opts)
	_check_phase()
	return got

func _check_phase() -> void:
	if not alive_flag or bst in [B.HESITATE, B.RELEASED]:
		return
	var f := hp / max_hp
	var fases: Array = bdef["fases"]
	if f <= float(bdef["hesita"]) + 0.001:
		_hesitate()
	elif f <= float(fases[2]) and not phase_done[3]:
		phase_done[3] = true; phase_done[2] = true
		_enter_phase(3)
	elif f <= float(fases[1]) and not phase_done[2]:
		phase_done[2] = true
		_enter_phase(2)

func _enter_phase(n: int) -> void:
	phase = n
	bst = B.TRANSITION
	bt = 1.8
	invulnerable = true
	velocity = Vector2.ZERO
	Audio.play("boss_roar")
	world.shake(3.0, 0.7)
	if n == 2:
		world.say("\"Não! Eu não vou esquecer de novo!\" O Rei sobe ao centro e acende dois focos de luz.")
	else:
		for f in focos:
			if is_instance_valid(f):
				f.queue_free()
		focos.clear()
		world.say("A arena começa a se partir! Os trechos que vão cair ficam marcados. Ione grita: \"Aguente! Eu cuido de você entre as quedas!\"")

func interrupt() -> void:
	pass

func root(_sec: float) -> bool:
	return false

func _give_rewards(_src: String) -> void:
	if Game.has_flag(bdef["flag_morte"]):
		return
	Game.set_flag("tmp_rei_ativo", false)
	_restore_floor()
	var r: Dictionary = bdef["recompensa"]
	Game.award_encounter_xp(int(r["xp"]), int(def.get("nivel", 30)))
	Game.fragments += int(r["frag"])
	Game.inventory_changed.emit()
	Game.register_kill("rei")
	var ac := Game.active_ind()
	if not ac.is_empty():
		Game.bond_activity(ac["uuid"], "vitoria:rei")
	Game.set_flag(bdef["flag_regiao"])
	Game.set_flag(bdef["flag_morte"])
	world.boss_finished(self)
	Audio.play("boss_die")
	world.shake(4.0, 1.2)
	world.say("O Rei dos Ecos se desfaz em luz. Ivar lembrou. +%d fragmentos" % int(r["frag"]))
	Catedral.epilogue(world)

func _death_fx() -> void:
	for i in 10:
		world.fx_at("sparkle", global_position + Vector2(randf_range(-30, 30), randf_range(-70, 0)), 0.9, 0.0, 1.4)
	if sprite == null:
		queue_free()
		return
	_tw = create_tween()
	_tw.tween_property(sprite, "modulate", Color(1.4, 1.4, 1.6, 0.0), 1.6)
	_tw.parallel().tween_property(sprite, "offset:y", sprite.offset.y - 20.0, 1.6)
	_tw.tween_callback(queue_free)

# =============================================================== AVISOS (faixas e círculos no chão; nada desenhado por código)
func _visuals() -> void:
	super._visuals()
	if not is_inside_tree() or _decals.is_empty():
		return
	for d in _decals:
		d.visible = false
	for c in _circles:
		c.visible = false
	var tele := alive_flag and bst == B.TELE
	_alert.visible = tele or bst == B.WARN_RUIN
	if tele:
		var f: float = clamp(1.0 - bt / max(0.01, 1.0), 0.0, 1.0)
		match echo:
			"cervo":
				var L := float(bdef["alcance_raiz"])
				for i in root_dirs.size():
					_band(_decals[i], global_position, root_dirs[i], L, 24.0, Color(0.6, 1.0, 0.55, 0.45 + 0.35 * f))
			"ferreiro":
				var L2 := float(bdef["alcance_martelo"])
				for i in quake_dirs.size():
					_band(_decals[i], global_position, quake_dirs[i], L2, 28.0, Color(1.0, 0.7, 0.4, 0.45 + 0.35 * f))
			"bruxa":
				for i in puddle_pts.size():
					var c: Sprite2D = _circles[i]
					c.visible = true
					c.global_position = puddle_pts[i]
					c.scale = Vector2.ONE * (36.0 / 72.0 + 0.1)
					c.modulate = Color(0.6, 0.85, 1.0, 0.5 + 0.4 * f)
				for i in min(3, orb_dirs.size()):
					_band(_decals[i], global_position, orb_dirs[[0, 2, 4][i]], 120.0, 8.0, Color(0.7, 0.85, 1.0, 0.35))
			"cavaleiro":
				var L3 := float(bdef["vel_estocada"]) * 0.36 + 40.0
				_band(_decals[0], global_position, attack_dir, L3, 32.0, Color(0.9, 0.7, 1.0, 0.55 + 0.3 * f))
	if bst == B.WARN_RUIN and alive_flag:
		var rr := ruin_rects(ruin_i)
		for i in min(rr.size(), _decals.size()):
			var r: Rect2 = rr[i]
			var d: Sprite2D = _decals[i]
			d.visible = true
			d.rotation = 0.0
			d.region_rect = Rect2(0, 0, r.size.x, r.size.y)
			d.global_position = r.get_center()
			d.modulate = Color(1.0, 0.45, 0.4, 0.4 + 0.3 * (1.0 if int(bt * 6.0) % 2 == 0 else 0.0))
	if sprite and alive_flag and flash <= 0.0:
		var col := Color.WHITE
		if bst == B.TELE:
			col = ECHO_TINT.get(echo, Color.WHITE)
		elif bst in [B.SHIELDED, B.RISE]:
			col = Color(0.85, 0.9, 1.25)
		elif bst in [B.EXPOSED, B.EXHAUSTED]:
			col = Color(1.3, 0.9, 0.85)
		elif bst == B.HESITATE:
			col = Color(1.0, 1.0, 1.0, 0.85)
		sprite.modulate = col

func _band(d: Sprite2D, from: Vector2, dir: Vector2, L: float, w: float, col: Color) -> void:
	d.visible = true
	d.region_rect = Rect2(0, 0, L, w)
	d.rotation = dir.angle()
	d.global_position = from + dir * L * 0.5
	d.modulate = col
