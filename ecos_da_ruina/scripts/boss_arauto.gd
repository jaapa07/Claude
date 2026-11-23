extends Enemy
## Arauto Partido (minichefe da Catedral do Vazio). Arauto da Ordem do Vazio, partido ao meio pelo Eco que tentou carregar.
## Apresenta COMBINAÇÕES das mecânicas anteriores, uma de cada vez, sempre anunciadas pelo nome e por avisos no chão:
##  "Raiz e Brasa"   — três faixas de raízes partem dele na direção do herói (faixas de aviso); ao brotar deixam brasas no chão.
##  "Véu e Portal"   — vira véu (quase invisível e intocável) e some num portal; o Olhar Velado (ou um Nimbelo/Velúnio) o revela
##                     e o derruba (cambaleia). Senão, surge noutro portal perto do herói e dá um corte anunciado.
##  "Selos da Ordem" — escreve três selos no chão (círculos que fecham).
## Depois de cada combinação ele recupera o fôlego (janela de ataque, dano maior). Abaixo de 50% encadeia duas combinações.
## Nenhuma decisão lê o botão apertado: só posição, tempo e golpes que já acertaram.

enum B { DORMANT, INTRO, CHASE, TELE_ROOTS, ROOTS, VEIL, EMERGE, TELE_SLASH, SLASH, SEALS, RECOVER, STAGGER_B, TRANSITION }

var activated := false
var bst := B.DORMANT
var bt := 0.0
var phase := 1
var bdef: Dictionary = {}
var arena := Rect2()
var portals: Array = []
var combo_i := 0
var chain := 0
var root_dirs: Array = []
var seals_left := 0
var portal_idx := -1
var seen := {}              # combinações mostradas (teste)
var revealed_hits := 0
var _decals: Array = []

const COMBOS := ["raiz_brasa", "veu_portal", "selos"]
const NOMES := {"raiz_brasa": "Raiz e Brasa", "veu_portal": "Véu e Portal", "selos": "Selos da Ordem"}

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	boss = true
	bdef = Data.bosses["arauto"]
	max_hp = float(bdef["hp"]); hp = max_hp
	invulnerable = true
	radius = 14.0
	arena = Rect2(float(e["x0"]) * 16.0, float(e["y0"]) * 16.0, float(e["w"]) * 16.0, float(e["h"]) * 16.0)
	def["percepcao"] = 600
	for p in e.get("portais", []):
		portals.append(Vector2(float(p[0]) * 16.0 + 8.0, float(p[1]) * 16.0 + 8.0))

func _ready() -> void:
	super._ready()
	for i in 3:
		var d := Sprite2D.new()
		d.texture = Art.sprite_tex("fx_warn_tile")
		d.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		d.region_enabled = true
		d.z_as_relative = false
		d.z_index = -1
		d.visible = false
		add_child(d)
		_decals.append(d)

func activate() -> void:
	if activated:
		return
	activated = true
	bst = B.INTRO
	bt = 2.0
	world.gather_companion(arena)
	Game.set_flag("tmp_arauto_ativo")
	Audio.play("boss_roar")
	world.shake(2.0, 0.6)
	world.boss_started(self)
	world.say("O Arauto Partido abre o livro rachado: \"Raiz, brasa, véu e sombra — tudo para o Rei!\" Observe o nome de cada combinação.")

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
				bst = B.CHASE
				bt = 1.2
		B.CHASE:
			if to.length() > 70.0:
				_move(to.normalized(), speed, delta)
				_anim("walk")
			else:
				_move(-to.normalized().orthogonal(), speed * 0.4, delta)
				_anim("idle")
			if bt <= 0.0:
				_next_combo()
		B.TELE_ROOTS:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				_roots_erupt()
				bst = B.ROOTS
				bt = 0.35
		B.ROOTS:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("attack")
			if bt <= 0.0:
				_combo_done()
		B.VEIL:
			_move(Vector2.ZERO, 0.0, delta)
			if sprite:
				sprite.modulate.a = 0.18 if revealed_t <= 0.0 else 0.8
			if revealed_t > 0.0:
				# visto pelo Olhar Velado: o véu rasga e ele cambaleia (janela longa)
				def["espiritual"] = false
				bst = B.STAGGER_B
				bt = float(bdef["revelado_s"])
				revealed_hits += 1
				world.spawn_text(global_position + Vector2(0, -56), "Véu rasgado!", Color(0.85, 0.75, 1.0))
				Audio.play("guard_break")
				if sprite:
					sprite.modulate.a = 1.0
			elif bt <= 0.0:
				_emerge()
		B.EMERGE:
			_move(Vector2.ZERO, 0.0, delta)
			if bt <= 0.0:
				_tele_slash()
		B.TELE_SLASH:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("windup")
			if bt <= 0.0:
				bst = B.SLASH
				bt = 0.22
				hit_registry.clear()
				Audio.play("swing")
				world.fx_at("slash", global_position + attack_dir * 20.0 + Vector2(0, -20), 0.25, attack_dir.angle(), 2.0)
		B.SLASH:
			_anim("attack")
			_move(attack_dir, 50.0, delta)
			for t in world.targets():
				if hit_registry.has(t.get_instance_id()):
					continue
				if Combat.in_arc(global_position, attack_dir, float(bdef["raio_corte"]), 70.0, t.global_position, 5.0):
					hit_registry[t.get_instance_id()] = true
					if not _misses():
						t.take_hit(float(bdef["dano_corte"]), global_position, {"knock": 130.0})
			if bt <= 0.0:
				_combo_done()
		B.SEALS:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("attack" if fmod(bt, 0.6) < 0.2 else "windup")
			if bt <= 0.0:
				if seals_left > 0:
					seals_left -= 1
					var s: Node2D = preload("res://scripts/cat_selo.gd").new()
					s.world = world
					s.damage = float(bdef["dano_selo"])
					s.arm = float(bdef["armar_selo"]) * Game.warning_mult()
					s.radius = 22.0
					s.position = _hero() + Vector2(randf_range(-6, 6), randf_range(-6, 6))
					world.ysort.add_child(s)
					Audio.play("skill", -6.0)
					bt = 0.7
				else:
					_combo_done()
		B.RECOVER, B.STAGGER_B:
			_move(Vector2.ZERO, 0.0, delta)
			_anim("hurt" if bst == B.STAGGER_B else "idle")
			if bt <= 0.0:
				bst = B.CHASE
				bt = 0.9 if phase == 2 else 1.4

func _next_combo() -> void:
	var c: String = COMBOS[combo_i % COMBOS.size()]
	combo_i += 1
	seen[c] = true
	world.spawn_text(global_position + Vector2(0, -60), NOMES[c], Color(1.0, 0.75, 0.6))
	match c:
		"raiz_brasa":
			bst = B.TELE_ROOTS
			bt = float(bdef["aviso_raiz"]) * Game.warning_mult()
			var base := (_hero() - global_position).normalized()
			root_dirs = [base, base.rotated(0.45), base.rotated(-0.45)]
			Audio.play("telegraph")
		"veu_portal":
			bst = B.VEIL
			bt = float(bdef["veu_s"])
			invulnerable = false
			def["espiritual"] = true        # só o Olhar Velado / luz reveladora o tocam enquanto é véu
			revealed_t = 0.0
			Audio.play("dodge")
			world.fx_at("vortex", global_position + Vector2(0, -20), 0.5, 0.0, 1.4)
		"selos":
			bst = B.SEALS
			bt = 0.4
			seals_left = 3

func _roots_erupt() -> void:
	Audio.play("roots")
	world.shake(1.5, 0.2)
	var L := float(bdef["alcance_raiz"])
	for d in root_dirs:
		for k in 4:
			world.fx_at("roots", global_position + d * (24.0 + k * L / 4.0), 0.5, 0.0, 1.2)
		for t in world.targets():
			var rel: Vector2 = t.global_position - global_position
			var along := rel.dot(d)
			if along > 0.0 and along < L and abs(rel.dot(d.orthogonal())) < 12.0:
				t.take_hit(float(bdef["dano_raiz"]), global_position, {"knock": 90.0})
		# brasas no fim de cada faixa
		var hp_pos: Vector2 = global_position + d * L * 0.75
		if not world.tile_solid_at(hp_pos):
			world.add_hazard(hp_pos, 14.0, float(bdef["brasa_s"]))

func _emerge() -> void:
	def["espiritual"] = false
	var pp := _hero()
	var opts: Array = []
	for i in portals.size():
		var d: float = portals[i].distance_to(pp)
		if i != portal_idx and d > 40.0 and d < 200.0:
			opts.append(i)
	if opts.is_empty():
		for i in portals.size():
			if i != portal_idx:
				opts.append(i)
	if not opts.is_empty():
		portal_idx = opts[randi() % opts.size()]
		global_position = portals[portal_idx]
	if sprite:
		sprite.modulate.a = 1.0
	world.fx_at("vortex", global_position + Vector2(0, -20), 0.5, 0.0, 1.4)
	bst = B.EMERGE
	bt = 0.35

func _tele_slash() -> void:
	bst = B.TELE_SLASH
	bt = float(bdef["aviso_corte"]) * Game.warning_mult()
	attack_dir = (_hero() - global_position).normalized()
	Audio.play("telegraph", -4.0)

func _combo_done() -> void:
	if phase == 2 and chain == 0:
		chain = 1
		bst = B.CHASE
		bt = 0.5
		return
	chain = 0
	bst = B.RECOVER
	bt = float(bdef["recupera_s"])
	world.spawn_text(global_position + Vector2(0, -56), "Sem fôlego!", Color(0.9, 0.95, 1.0))

# =============================================================== DANO
func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if not hittable():
		return 0.0
	var m := 1.0
	if bst in [B.RECOVER, B.STAGGER_B]:
		m = float(bdef["mult_recupera"])
	var got := super.take_damage(amount * m, from_pos, opts)
	if alive_flag and phase == 1 and hp / max_hp <= float(bdef["fases"][1]):
		phase = 2
		bst = B.TRANSITION
		bt = 1.4
		invulnerable = true
		def["espiritual"] = false
		if sprite:
			sprite.modulate.a = 1.0
		Audio.play("boss_roar")
		world.shake(2.5, 0.5)
		world.say("O livro do Arauto se parte de vez: agora ele encadeia DUAS combinações antes de recuperar o fôlego.")
	return got

func spectral_visible() -> bool:
	if bst == B.VEIL:
		return revealed_t > 0.0
	return true

func interrupt() -> void:
	pass

func root(_sec: float) -> bool:
	return false

func _give_rewards(_src: String) -> void:
	if Game.has_flag(bdef["flag_morte"]):
		return
	Game.set_flag(bdef["flag_morte"])
	Game.set_flag("tmp_arauto_ativo", false)
	var r: Dictionary = bdef["recompensa"]
	Game.award_encounter_xp(int(r["xp"]), int(def.get("nivel", 27)))
	Game.fragments += int(r["frag"])
	Game.give_loot(r.get("itens", {}))
	Game.inventory_changed.emit()
	Game.register_kill("arauto")
	var ac := Game.active_ind()
	if not ac.is_empty() and participants.has(ac["uuid"]):
		Game.bond_activity(ac["uuid"], "vitoria:arauto")
	world.boss_finished(self)
	Audio.play("boss_die")
	world.shake(3.0, 0.8)
	world.say("O Arauto Partido se desfaz em páginas de luz! +%d fragmentos" % int(r["frag"]))
	world.get_tree().create_timer(2.0).timeout.connect(func(): world.autosave())

func _death_fx() -> void:
	for i in 5:
		world.fx_at("sparkle", global_position + Vector2(randf_range(-18, 18), randf_range(-40, 0)), 0.7, 0.0, 1.3)
	super._death_fx()

# =============================================================== AVISOS
func _visuals() -> void:
	super._visuals()
	if not is_inside_tree() or _decals.is_empty():
		return
	var show_roots := alive_flag and bst == B.TELE_ROOTS
	var L := float(bdef["alcance_raiz"])
	for i in _decals.size():
		var d: Sprite2D = _decals[i]
		d.visible = show_roots and i < root_dirs.size()
		if d.visible:
			var dir: Vector2 = root_dirs[i]
			d.region_rect = Rect2(0, 0, L, 22)
			d.rotation = dir.angle()
			d.position = dir * L * 0.5
			d.modulate = Color(0.7, 1.0, 0.6, 0.65)
	_alert.visible = alive_flag and bst in [B.TELE_ROOTS, B.TELE_SLASH]
	if bst == B.TELE_SLASH and alive_flag:
		_set_decal("circle")
		_decal.visible = true
		_decal.rotation = 0.0
		_decal.position = attack_dir * 16.0
		_decal.scale = Vector2.ONE * (float(bdef["raio_corte"]) * 2.0 / 72.0)
		_decal.modulate = Color(1, 1, 1, 0.55)
	if sprite and alive_flag and flash <= 0.0 and bst != B.VEIL:
		sprite.modulate = Color(1.15, 1.0, 0.95) if bst in [B.RECOVER, B.STAGGER_B] else Color.WHITE
