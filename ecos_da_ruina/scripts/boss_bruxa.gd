extends Enemy
## Bruxa Afogada (guardiã do Pântano dos Sussurros).
## Fase 1: leques de orbes d'água (linhas de aviso) e poças temporárias (círculos de aviso).
## Fase 2 (60%): divide-se em quatro — ela e três cópias. Só a verdadeira tem reflexo consistente na água da arena
## (o reflexo acompanha o corpo; o das cópias está espelhado do lado errado). Tocar uma cópia a desfaz e provoca uma poça.
## O Nimbelo ativo marca a verdadeira depressa, mas observar o reflexo basta.
## Fase 3 (25%): a água sobe; só a cruz de pedra e as plataformas do padrão atual ficam firmes. As plataformas mudam
## depois de um aviso (decalques), e nunca somem todas: a cruz é sempre segura.

enum B { DORMANT, INTRO, FLOAT, TELE_FAN, TELE_POCA, RECOVER, TRANSITION, STAGGER }

var activated := false
var bst := B.DORMANT
var bt := 0.0
var phase := 1
var bdef: Dictionary = {}
var arena := Rect2()
var plats := {}
var padroes: Array = []
var pat_i := 0
var pat_t := 0.0
var warn := false
var next_pat := 0
var phase_done := {2: false, 3: false}
var copies: Array = []
var split_hp := 0.0
var split_t := 0.0
var attack_cd := 1.5
var attack_n := 0
var fan_dirs: Array = []
var poca_pts: Array = []
var float_to := Vector2.ZERO
var anchor := Vector2.ZERO
var real_mark_t := 0.0
var reflexo_consistente := true
var copies_broken := 0
var splits := 0
var falls := 0

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	boss = true
	bdef = Data.bosses["bruxa"]
	max_hp = float(bdef["hp"]); hp = max_hp
	invulnerable = true
	radius = 16.0
	arena = Rect2(float(e["x0"]) * 16.0, float(e["y0"]) * 16.0, float(e["w"]) * 16.0, float(e["h"]) * 16.0)
	plats = e.get("plataformas", {})
	padroes = e.get("padroes", [])
	def["percepcao"] = 600
	anchor = position

func _ready() -> void:
	super._ready()
	collision_mask = 0          # flutua sobre a água da arena
	_build_reflection()

func activate() -> void:
	if activated:
		return
	activated = true
	bst = B.INTRO
	bt = 2.0
	world.gather_companion(arena)
	Game.set_flag("tmp_bruxa_ativo")
	Audio.play("boss_roar")
	world.shake(2.5, 0.6)
	world.boss_started(self)
	world.say("A Bruxa Afogada ergue-se da água! Fuja dos leques de orbes e das poças anunciadas.")

func center() -> Vector2:
	return arena.get_center()

func _ai(delta: float) -> void:
	if bst == B.DORMANT:
		_anim("idle")
		return
	bt -= delta
	attack_cd -= delta
	real_mark_t = max(0.0, real_mark_t - delta)
	var pp: Vector2 = world.player.global_position
	_face_to(pp)
	if phase == 2 and bst != B.TRANSITION:
		split_t += delta
		if (split_hp - hp) >= max_hp * float(bdef["embaralha_dano"]) or split_t >= float(bdef["embaralha_s"]):
			_begin_split(0.8)
			return
	if phase == 3 and bst != B.TRANSITION:
		_platform_tick(delta)
	match bst:
		B.INTRO:
			_anim("windup")
			if bt <= 0.0:
				invulnerable = false
				bst = B.FLOAT
				_pick_float(pp)
		B.FLOAT:
			_anim("walk")
			_drift(delta)
			if attack_cd <= 0.0:
				attack_n += 1
				attack_cd = 2.6 if phase == 1 else (3.0 if phase == 2 else 2.4)
				if attack_n % 3 == 0:
					_tele_poca(pp, 3)
				else:
					_tele_fan(pp)
		B.TELE_FAN:
			_anim("windup")
			if bt <= 0.0:
				_fire_fan(fan_dirs, float(bdef["dano_orbe"]))
				bst = B.RECOVER
				bt = 0.5
		B.TELE_POCA:
			_anim("windup")
			if bt <= 0.0:
				_drop_pocas()
				bst = B.RECOVER
				bt = 0.5
		B.RECOVER:
			_anim("idle")
			_drift(delta)
			if bt <= 0.0:
				bst = B.FLOAT
				_pick_float(pp)
		B.STAGGER:
			_anim("hurt")
			if bt <= 0.0:
				bst = B.FLOAT
		B.TRANSITION:
			_anim("windup")
			if bt <= 0.0:
				invulnerable = false
				if phase == 2:
					_split()
				elif phase == 3 and not Game.has_flag("tmp_bruxa_cheia"):
					_flood()
				bst = B.FLOAT
				_pick_float(pp)

## Desliza para o ponto escolhido (fase 2: em volta da âncora; fase 3: perto do herói).
func _drift(delta: float) -> void:
	var d := float_to - global_position
	if d.length() > 3.0:
		global_position += d.normalized() * min(d.length(), speed * delta * (0.5 if slow_t > 0.0 else 1.0))
	else:
		_pick_float(world.player.global_position)

func _pick_float(pp: Vector2) -> void:
	var inner := arena.grow(-28.0)
	var p: Vector2
	if phase == 2:
		p = anchor + Vector2(randf_range(-24, 24), randf_range(-18, 18))
	elif phase == 3:
		p = pp + Vector2.from_angle(randf() * TAU) * 22.0
	else:
		p = pp + Vector2.from_angle(randf() * TAU) * randf_range(60.0, 110.0)
	float_to = Vector2(clamp(p.x, inner.position.x, inner.end.x), clamp(p.y, inner.position.y, inner.end.y))
	# com a água alta ela paira sobre chão firme (sempre ao alcance da espada)
	if phase == 3 and world.tile_solid_at(float_to):
		float_to = _nearest_firm(float_to)

func _tele_fan(pp: Vector2) -> void:
	bst = B.TELE_FAN
	bt = 0.85 * Game.warning_mult()
	var base := (pp - global_position).normalized()
	fan_dirs.clear()
	for a in [-0.5, -0.25, 0.0, 0.25, 0.5]:
		fan_dirs.append(base.rotated(a))
	Audio.play("telegraph", -6.0)

func _fire_fan(dirs: Array, dmg: float) -> void:
	for d in dirs:
		var o = world.spawn_projectile(global_position + Vector2(0, -10) + d * 14.0, d, dmg, self, "orbe")
		o.speed = 105.0
		o.max_dist = 140.0
	Audio.play("dodge", -4.0)

func _tele_poca(pp: Vector2, n: int) -> void:
	bst = B.TELE_POCA
	bt = 1.0 * Game.warning_mult()
	poca_pts.clear()
	poca_pts.append(pp)
	if n > 1:
		poca_pts.append(pp + Vector2(34, 18))
		poca_pts.append(pp + Vector2(-34, 18))
	Audio.play("telegraph", -4.0)

func _drop_pocas() -> void:
	for q in poca_pts:
		if phase == 3 and world.tile_solid_at(q):
			continue
		world.add_puddle(q, 16.0, 5.0)
		world.fx_at("splash", q, 0.5, 0.0, 1.6)
		for t in world.targets():
			if t.global_position.distance_to(q) <= 18.0:
				t.take_hit(float(bdef["dano_poca"]), q, {"knock": 50.0})
	Audio.play("thud", -6.0)

# ---------------------------------------------------------------- fase 2: reflexos
func _begin_split(delay: float) -> void:
	_clear_copies(true)
	bst = B.TRANSITION
	bt = delay
	invulnerable = true

func _split() -> void:
	splits += 1
	split_hp = hp
	split_t = 0.0
	var c := center()
	var spots: Array = [c + Vector2(0, -96), c + Vector2(150, 0), c + Vector2(0, 96), c + Vector2(-150, 0)]
	var real_i := randi() % 4
	anchor = spots[real_i]
	global_position = anchor
	var k := 0
	for i in 4:
		if i == real_i:
			continue
		var cp = load("res://scripts/boss_bruxa_copia.gd").new()
		cp.init(world, "copia", {"id": "bruxa_copia_%d_%d" % [splits, i], "x": int(spots[i].x / 16.0), "y": int(spots[i].y / 16.0)})
		cp.owner_bruxa = self
		cp.anchor = spots[i]
		cp.attack_cd = 1.2 + 0.8 * k
		world.ysort.add_child(cp)
		cp.global_position = spots[i]
		copies.append(cp)
		k += 1
	for p in [global_position] + copies.map(func(x): return x.global_position):
		world.fx_at("splash", p, 0.5, 0.0, 2.0)
	var ac := Game.active_ind()
	if not ac.is_empty() and Game.sp_of(ac).get("acao_id", "") == "reflexo":
		real_mark_t = 999.0
		world.say("O Nimbelo aponta: a verdadeira é a que brilha!")
	else:
		world.say("A Bruxa se dividiu em quatro! Só a verdadeira tem reflexo que acompanha o corpo.")

func copy_broken(cp: Node) -> void:
	copies.erase(cp)
	copies_broken += 1
	world.say("Era só um reflexo! A água se vinga...")
	if bst == B.FLOAT or bst == B.RECOVER:
		_tele_poca(world.player.global_position, 1)

func _clear_copies(fx: bool) -> void:
	for cp in copies:
		if is_instance_valid(cp):
			if fx:
				world.fx_at("splash", cp.global_position, 0.5, 0.0, 1.6)
			cp.vanish()
	copies.clear()

# ---------------------------------------------------------------- fase 3: a água sobe
func _flood() -> void:
	pat_i = 0
	pat_t = 0.0
	warn = false
	Game.set_flag("tmp_bruxa_p0")
	Game.set_flag("tmp_bruxa_cheia")
	world.shake(3.0, 0.6)
	Audio.play("boss_roar")
	_drown_check()
	world.say("A água sobe! Fique na cruz de pedra ou nas plataformas firmes.")

func _platform_tick(delta: float) -> void:
	if not Game.has_flag("tmp_bruxa_cheia") or padroes.is_empty():
		return
	pat_t += delta
	var troca := float(bdef["troca_plataforma"])
	var aviso := float(bdef["aviso_plataforma"]) * Game.warning_mult()
	if not warn and pat_t >= troca - aviso:
		warn = true
		next_pat = (pat_i + 1) % padroes.size()
		Audio.play("telegraph")
		world.say("As plataformas vão mudar! Saia das que tremem.")
	if pat_t >= troca:
		Game.set_flag("tmp_bruxa_p%d" % pat_i, false)
		pat_i = next_pat
		Game.set_flag("tmp_bruxa_p%d" % pat_i)
		pat_t = 0.0
		warn = false
		Audio.play("bridge", -4.0)
		_drown_check()

## Plataformas que afundam no próximo padrão (para o aviso e para o bot).
func sinking_rects() -> Array:
	var out: Array = []
	if not warn:
		return out
	var cur: Array = padroes[pat_i]
	var nxt: Array = padroes[next_pat]
	for k in cur:
		if not nxt.has(k):
			var r: Array = plats[k]
			out.append(Rect2(float(r[0]) * 16.0, float(r[1]) * 16.0, float(r[2]) * 16.0, float(r[3]) * 16.0))
	return out

## Quem ficou sobre a água é levado ao chão firme mais próximo (dano leve; nunca morte por queda).
func _drown_check() -> void:
	for t in world.targets():
		if world.tile_solid_at(t.global_position):
			t.global_position = _nearest_firm(t.global_position)
			falls += 1
			if t == world.player:
				t.env_damage(float(bdef["dano_queda"]), "Água!")

func _nearest_firm(p: Vector2) -> Vector2:
	var best := p
	var bd := 1e9
	var tx := int(floor(p.x / 16.0)); var ty := int(floor(p.y / 16.0))
	for r in range(1, 14):
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

# ---------------------------------------------------------------- dano e fases
func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	var got := super.take_damage(amount, from_pos, opts)
	_check_phase()
	return got

func _check_phase() -> void:
	if not alive_flag:
		return
	var f := hp / max_hp
	var fases: Array = bdef["fases"]
	if f <= float(fases[2]) and not phase_done[3]:
		phase_done[3] = true; phase_done[2] = true
		_enter_phase(3)
	elif f <= float(fases[1]) and not phase_done[2]:
		phase_done[2] = true
		_enter_phase(2)

func _enter_phase(n: int) -> void:
	phase = n
	_clear_copies(true)
	bst = B.TRANSITION
	bt = 1.4 if n == 2 else 1.8
	invulnerable = true
	velocity = Vector2.ZERO
	Audio.play("boss_roar")
	world.shake(3.0, 0.6)
	if n == 2:
		world.say("A Bruxa mergulha e a água da arena se agita... ela vai se dividir!")
	else:
		world.say("A Bruxa ergue os braços: a água do templo vai subir!")

func interrupt() -> void:
	pass

func root(_sec: float) -> bool:
	return false

func _give_rewards(_src: String) -> void:
	if Game.has_flag(bdef["flag_morte"]):
		return
	_clear_copies(true)
	Game.set_flag(bdef["flag_morte"])
	Game.set_flag(bdef["flag_regiao"])
	Game.set_flag("tmp_bruxa_ativo", false)
	for i in padroes.size():
		Game.set_flag("tmp_bruxa_p%d" % i, false)
	Game.set_flag("tmp_bruxa_cheia", false)
	var r: Dictionary = bdef["recompensa"]
	Game.award_encounter_xp(int(r["xp"]), int(def.get("nivel", 12)))
	Game.fragments += int(r["frag"])
	Game.inventory_changed.emit()
	Game.register_kill("bruxa")
	var ac := Game.active_ind()
	if not ac.is_empty() and participants.has(ac["uuid"]):
		Game.bond_activity(ac["uuid"], "vitoria:bruxa")
	Game.grant_eco(r["eco"])
	Game.set_flag("eco_olhar_velado")      # nome usado pela Região 4
	world.boss_finished(self)
	Audio.play("boss_die")
	world.shake(4.0, 1.0)
	world.say("Eco obtido: OLHAR VELADO! +%d fragmentos" % int(r["frag"]))
	world.get_tree().create_timer(2.0).timeout.connect(func(): world.autosave())

func _death_fx() -> void:
	for i in 6:
		world.fx_at("splash", global_position + Vector2(randf_range(-24, 24), randf_range(-50, 0)), 0.7, 0.0, 1.8)
	super._death_fx()

# =============================================================== VISUAIS (sprites autorais; reflexo = o próprio quadro espelhado)
var refl: AnimatedSprite2D
var _fan_decals: Array = []
var _poca_decals: Array = []
var _plat_decals: Node2D
var _mark: AnimatedSprite2D

func _build_reflection() -> void:
	if sprite == null:
		return
	refl = AnimatedSprite2D.new()
	refl.sprite_frames = sprite.sprite_frames
	refl.flip_v = true
	refl.offset = Vector2(0, fh / 2.0 + 2.0)
	refl.modulate = Color(0.55, 0.75, 1.0, 0.42)
	refl.show_behind_parent = true
	refl.play("idle")
	add_child(refl)

## Reflexo verdadeiro: mesmo quadro e mesmo lado do corpo.
func _sync_reflection() -> void:
	if refl == null or sprite == null:
		return
	refl.visible = alive_flag and world.is_watery(global_position + Vector2(0, 4))
	if refl.animation != sprite.animation:
		refl.play(sprite.animation)
	refl.frame = sprite.frame
	refl.flip_h = sprite.flip_h

func _ensure() -> void:
	if _plat_decals != null:
		return
	for i in 5:
		var d := Sprite2D.new()
		d.texture = Art.sprite_tex("fx_warn_tile")
		d.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		d.region_enabled = true
		d.region_rect = Rect2(0, 0, 110, 10)
		d.z_as_relative = false
		d.z_index = -1
		d.visible = false
		add_child(d)
		_fan_decals.append(d)
	for i in 3:
		var c := Sprite2D.new()
		c.texture = Art.sprite_tex("fx_warn_circle")
		c.top_level = true
		c.z_index = 1
		c.scale = Vector2.ONE * (36.0 / 72.0)
		c.visible = false
		add_child(c)
		_poca_decals.append(c)
	_plat_decals = Node2D.new()
	_plat_decals.top_level = true
	_plat_decals.z_index = 1
	add_child(_plat_decals)
	_mark = AnimatedSprite2D.new()
	_mark.sprite_frames = Art.fx_frames("fx_sparkle", 16, 12, 2, 8.0, true)
	_mark.position = Vector2(0, -fh - 6)
	_mark.modulate = Color(1.0, 0.95, 0.6)
	_mark.play("a")
	_mark.visible = false
	add_child(_mark)

func _visuals() -> void:
	super._visuals()
	if not is_inside_tree():
		return
	_ensure()
	_sync_reflection()
	_alert.visible = bst in [B.TELE_FAN, B.TELE_POCA]
	for i in _fan_decals.size():
		var d: Sprite2D = _fan_decals[i]
		d.visible = bst == B.TELE_FAN and i < fan_dirs.size() and alive_flag
		if d.visible:
			d.rotation = (fan_dirs[i] as Vector2).angle()
			d.position = (fan_dirs[i] as Vector2) * 62.0 + Vector2(0, -6)
			d.modulate = Color(0.75, 0.7, 1.0, 0.55)
	for i in _poca_decals.size():
		var c: Sprite2D = _poca_decals[i]
		c.visible = bst == B.TELE_POCA and i < poca_pts.size() and alive_flag
		if c.visible:
			c.global_position = poca_pts[i]
			c.modulate = Color(0.8, 0.7, 1.0, 0.45 + 0.4 * clamp(1.0 - bt, 0.0, 1.0))
	# aviso das plataformas que vão afundar
	var sr := sinking_rects() if alive_flag else []
	while _plat_decals.get_child_count() < sr.size():
		var sp := Sprite2D.new()
		sp.texture = Art.sprite_tex("fx_warn_tile")
		sp.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		sp.region_enabled = true
		sp.centered = false
		_plat_decals.add_child(sp)
	for i in _plat_decals.get_child_count():
		var sp2: Sprite2D = _plat_decals.get_child(i)
		sp2.visible = i < sr.size()
		if sp2.visible:
			var r: Rect2 = sr[i]
			sp2.position = r.position
			sp2.region_rect = Rect2(Vector2.ZERO, r.size)
			sp2.modulate = Color(1, 1, 1, 0.35 + 0.3 * sin(Time.get_ticks_msec() * 0.012))
	_mark.visible = alive_flag and real_mark_t > 0.0 and not copies.is_empty()
