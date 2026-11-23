extends Ent
class_name FortEnt
## Mecanismos da Fortaleza do Eclipse (Região 4), todos com sprites de assets/src/82_fortaleza_objetos.pxl:
##  espelho   — reflete o feixe de luz; E gira entre "/" e "\".
##  persiana  — E abre/fecha; fechada bloqueia o feixe.
##  lente     — emissor do feixe (luz do sol). "fase": "sol" | "lua" só emite com o eclipse naquela fase.
##  receptor  — cristal que acende com "luz" (feixe), "disparo" (virote de balestra) ou "vento" (rajada do Ventisco).
##  helice    — hélice; gira com a manivela ligada a ela (herói) ou com o Ventisco (ação/rajada), inclusive à distância.
##  manivela  — o herói gira a hélice indicada em "helice" (flag).
##  nevoa     — névoa cortante; o Ventisco a dispersa (mesma flag da hélice que a sopraria).
##  fresta    — receptor dentro de uma fresta na muralha: só o Umbrel entra; alternativa: alavanca local com a mesma flag.
##  solar     — mecanismo antigo frio: reaquecido por Brasardo/Solarco, Faisquito ou chama de braseiro.
##  balestra  — besta fixa: E dispara um virote na direção "dir" (acende receptores de disparo, fere inimigos).
##  eclipse   — alavanca de sol/lua: alterna a flag "flag" (plataformas de luz e de sombra).
##  portal / fissura — travessias do Passo Umbral (só com o Eco; nunca atravessa paredes comuns).
##  segredo   — detalhe que só a observação revela (E): grava a flag e abre o que estava escondido.

const FPROPS := {"mirror_a": 0, "mirror_b": 1, "shutter_open": 2, "shutter_closed": 3, "receptor_off": 4, "receptor_on": 5, "sun_lens": 6,
	"helice0": 7, "helice1": 8, "helice2": 9, "crank": 10, "fresta_off": 11, "fresta_on": 12, "solar_cold": 13, "solar_hot": 14,
	"portal_off": 15, "portal_on": 16, "fissure_mark": 17, "balestra": 18, "eclipse_sun": 19, "eclipse_moon": 20, "beam_h": 21,
	"beam_v": 22, "beam_spark": 23, "sym_muralha": 24, "sym_espelho": 25, "flecha": 26}

var ori := "a"            # espelho
var open_state := true    # persiana
var spin_t := 0.0         # hélice

func _ready() -> void:
	add_to_group("ents")
	collision_layer = 0
	collision_mask = 0
	solid = true
	reach = 22.0
	match kind:
		"espelho":
			ori = str(def.get("ori", "a"))
			if Game.has_flag(_puzzle_done_flag()):
				ori = str(def.get("ori_ok", ori))
			_fprop("mirror_a" if ori == "a" else "mirror_b", Vector2(0, -4))
		"persiana":
			open_state = bool(def.get("aberta", true))
			_fprop("shutter_open" if open_state else "shutter_closed", Vector2(0, -4))
		"lente":
			_fprop("sun_lens", Vector2(0, -4))
		"receptor":
			lit = Game.has_flag(def.get("flag", "_nunca_")) or Game.has_flag(_puzzle_done_flag())
			_fprop("receptor_on" if lit else "receptor_off", Vector2(0, -4))
		"helice":
			_fprop("helice0", Vector2(0, -6))
			lit = Game.has_flag(def.get("flag", ""))
		"manivela":
			_fprop("crank", Vector2(0, -4))
		"nevoa":
			solid = false
			_spr("fx_sparkle", Vector2(0, -6), true, 16, false)
			sprite.modulate = Color(0.85, 0.85, 1.0, 0.0 if Game.has_flag(def.get("flag", "")) else 0.5)
		"fresta":
			lit = Game.has_flag(def.get("flag", ""))
			_fprop("fresta_on" if lit else "fresta_off", Vector2.ZERO)
			reach = 26.0
		"solar":
			lit = Game.has_flag(def.get("flag", ""))
			_fprop("solar_hot" if lit else "solar_cold", Vector2(0, -4))
		"portal":
			solid = false
			_fprop("portal_on" if Game.has_eco("passo_umbral") else "portal_off", Vector2(0, -4))
		"fissura":
			solid = false
			_fprop("fissure_mark", Vector2(0, 2))
			sprite.modulate = Color(1, 1, 1, 0.85 if Game.has_eco("passo_umbral") else 0.35)
		"balestra":
			_fprop("balestra", Vector2(0, -4))
			var d: Array = def.get("dir", [1, 0])
			sprite.flip_h = float(d[0]) < 0.0
			if float(d[1]) != 0.0:
				sprite.rotation = PI / 2.0 if float(d[1]) > 0.0 else -PI / 2.0
		"eclipse":
			_fprop("eclipse_moon" if Game.has_flag(def.get("flag", "")) else "eclipse_sun", Vector2(0, -4))
		"segredo":
			solid = false
			_spr("fx_sparkle", Vector2(0, -6), true, 16, false)
			sprite.modulate = Color(1.0, 0.95, 0.7, 0.18)
			sprite.visible = not Game.has_flag(def.get("flag", ""))
	if solid:
		collision_layer = 1
		var cs := CollisionShape2D.new()
		var r := RectangleShape2D.new()
		r.size = Vector2(12, 10)
		cs.shape = r
		add_child(cs)

func _fprop(name: String, off: Vector2) -> void:
	sprite = Sprite2D.new()
	sprite.texture = Art.sprite_tex("fort_props")
	sprite.region_enabled = true
	sprite.region_rect = Rect2(FPROPS[name] * 16, 0, 16, 16)
	sprite.offset = off
	add_child(sprite)

func _fset(name: String) -> void:
	if sprite:
		sprite.region_rect = Rect2(FPROPS[name] * 16, 0, 16, 16)

func _puzzle_done_flag() -> String:
	var g: String = def.get("group", "")
	if g == "":
		return "_nunca_"
	return world.puzzle_flag(g)

func cell() -> Vector2i:
	return Vector2i(int(def["x"]), int(def["y"]))

# =============================================================== PROMPT / INTERAÇÃO
func prompt() -> String:
	var ac := Game.active_ind()
	var acao: String = Game.sp_of(ac).get("acao_id", "") if not ac.is_empty() else ""
	match kind:
		"espelho": return "" if def.get("fixo", false) else "Girar espelho"
		"persiana": return "Fechar persiana" if open_state else "Abrir persiana"
		"lente": return "Examinar"
		"receptor": return "" if lit else "Receptor"
		"helice":
			if Game.has_flag(def.get("flag", "")):
				return ""
			return "Soprar a hélice" if acao == "helice" else "Hélice"
		"manivela": return "" if Game.has_flag(def.get("helice", "")) else "Girar manivela"
		"nevoa":
			if Game.has_flag(def.get("flag", "")):
				return ""
			return "Dispersar a névoa" if acao == "helice" else "Névoa"
		"fresta":
			if lit:
				return ""
			return "Entrar na fresta" if acao == "fresta" else "Fresta"
		"solar":
			if lit:
				return ""
			if acao in ["calor", "fogo"]:
				return "Reaquecer"
			return "Acender" if world.player.carry_fire_t > 0.0 else "Mecanismo antigo"
		"portal", "fissura": return "Passo Umbral" if Game.has_eco("passo_umbral") else "Examinar"
		"balestra": return "Disparar"
		"eclipse": return "Eclipse"
		"segredo": return "" if Game.has_flag(def.get("flag", "")) else "Examinar"
	return ""

func interact(player: Node) -> void:
	if def.has("dica_grupo"):
		_count_try(str(def["dica_grupo"]))
	match kind:
		"espelho":
			if def.get("fixo", false):
				return
			ori = "b" if ori == "a" else "a"
			_fset("mirror_a" if ori == "a" else "mirror_b")
			Audio.play("lever", -4.0)
			FortEnt.retrace(world)
		"persiana":
			open_state = not open_state
			_fset("shutter_open" if open_state else "shutter_closed")
			Audio.play("door", -6.0)
			FortEnt.retrace(world)
		"lente":
			world.say("Uma lente de cristal recolhe a luz do sol e a projeta num feixe. Espelhos desviam o feixe; persianas o bloqueiam.")
		"receptor":
			match str(def.get("ativa", "luz")):
				"luz": world.say("Receptor de cristal: acende quando um feixe de luz o atinge.")
				"disparo": world.say("Receptor de disparo: acende com um virote de balestra ou um disparo à distância.")
				"vento": world.say("Receptor de cata-vento: gira e acende com uma rajada forte de vento.")
		"helice": _helice_creature()
		"manivela": _manivela(player)
		"nevoa": _nevoa()
		"fresta": _fresta()
		"solar": _solar()
		"portal", "fissura": FortEnt.cross(world, self)
		"balestra": fire_balestra()
		"eclipse": _eclipse()
		"segredo": _segredo()

## Dica opcional do rito: depois de algumas tentativas sem resolver o grupo, a placa "fala" a dica (puzzles[g].dica).
func _count_try(g: String) -> void:
	var pz: Dictionary = world.map.get("puzzles", {}).get(g, {})
	if pz.is_empty() or Game.has_flag(pz.get("flag", "")):
		return
	var tries: Dictionary = world.get_meta("fort_tries", {})
	tries[g] = int(tries.get(g, 0)) + 1
	world.set_meta("fort_tries", tries)
	if int(tries[g]) >= int(pz.get("dica_apos", 3)) and str(pz.get("dica", "")) != "":
		world.say(pz["dica"])

func _helice_creature() -> void:
	var flag: String = def.get("flag", "")
	if Game.has_flag(flag):
		return
	if world.creature_action(self, "helice", "%s soprou uma rajada: a hélice gira!",
			"A hélice está travada pelo vento parado. Uma manivela ligada a ela a giraria — ou uma criatura de vento (Ventisco)."):
		spin(true)

func spin(by_creature: bool) -> void:
	var flag: String = def.get("flag", "")
	if flag == "" or Game.has_flag(flag):
		return
	Game.set_flag(flag)
	spin_t = 3.0
	Audio.play("bridge", -4.0)
	world.fx_at("vento", global_position + Vector2(0, -8), 0.5, 0.0, 1.3)
	world.say(def.get("msg", "A hélice gira e o vento sopra pelos dutos da torre!"))
	if by_creature:
		Audio.on_treasure({}, true)

func _manivela(player: Node) -> void:
	var flag: String = def.get("helice", "")
	if Game.has_flag(flag):
		return
	player.set_busy(true)
	Audio.play("lever")
	world.say("Você gira a manivela com força...")
	await world.get_tree().create_timer(0.9).timeout
	player.set_busy(false)
	for e in world.get_tree().get_nodes_in_group("ents"):
		if e is FortEnt and e.kind == "helice" and e.def.get("flag", "") == flag:
			e.spin(false)
			return
	Game.set_flag(flag)

func _nevoa() -> void:
	var flag: String = def.get("flag", "")
	if Game.has_flag(flag):
		return
	if world.creature_action(self, "helice", "%s soprou a névoa para longe!",
			"Névoa cortante, fria como lâmina. Um vento forte a dispersaria — gire as hélices da torre ou peça a um Ventisco."):
		disperse()

func disperse() -> void:
	var flag: String = def.get("flag", "")
	if flag == "" or Game.has_flag(flag):
		return
	Game.set_flag(flag)
	Audio.play("dodge")
	for k in 4:
		world.fx_at("vento", global_position + Vector2(randf_range(-20, 20), randf_range(-16, 8)), 0.6, 0.0, 1.4)
	if sprite:
		sprite.modulate.a = 0.0

func _fresta() -> void:
	if lit:
		return
	if world.creature_action(self, "fresta", "%s deslizou pela fresta e acionou o receptor por dentro!",
			"Uma fresta estreita na muralha; lá dentro, um receptor apagado. Só uma criatura de sombra (Umbrel) passaria. Procure também uma alavanca por perto."):
		light_fresta()

func light_fresta() -> void:
	if lit:
		return
	lit = true
	_fset("fresta_on")
	Audio.play("puzzle_ok")
	Game.set_flag(def.get("flag", ""))

func _solar() -> void:
	if lit:
		return
	var ac := Game.active_ind()
	var acao: String = Game.sp_of(ac).get("acao_id", "") if not ac.is_empty() else ""
	if acao in ["calor", "fogo"] and world.companion != null and is_instance_valid(world.companion):
		world.companion.env_action_fx(global_position)
		Game.bond_activity(ac["uuid"], "acao:" + eid)
		world.say("%s reaqueceu o mecanismo antigo!" % Game.creature_name(ac))
		heat()
		return
	if world.player.carry_fire_t > 0.0:
		world.player.carry_fire_t = 0.0
		world.say("A chama do braseiro pegou no mecanismo antigo.")
		heat()
		return
	world.say("Um mecanismo antigo, frio há séculos. Precisa de calor: chama de um braseiro ou uma criatura de brasa (Brasardo).")

func heat() -> void:
	if lit:
		return
	lit = true
	_fset("solar_hot")
	Audio.play("skill", -4.0)
	world.fx_at("fire", global_position + Vector2(0, -10), 0.6, 0.0, 1.4)
	Game.set_flag(def.get("flag", ""))
	if def.has("msg"):
		world.say(def["msg"])

func fire_balestra() -> void:
	var d: Array = def.get("dir", [1, 0])
	var dir := Vector2(float(d[0]), float(d[1])).normalized()
	var p: Node2D = preload("res://scripts/fort_projectile.gd").new()
	p.world = world
	p.mode = "virote"
	p.dir = dir
	p.damage = Game.hero_atk() * 1.2
	p.position = global_position + dir * 10.0 + Vector2(0, -4)
	world.add_fx(p)
	Audio.play("swing", -2.0)
	world.fx_at("dust", global_position + dir * 8.0, 0.25)

func _eclipse() -> void:
	var flag: String = def.get("flag", "")
	var on := not Game.has_flag(flag)
	Game.set_flag(flag, on)
	_fset("eclipse_moon" if on else "eclipse_sun")
	Audio.play("lever")
	world.say("A lua cobre o sol: as plataformas de sombra surgem e as de luz se apagam." if on else "O sol volta: as plataformas de luz se acendem e as de sombra somem.")
	world.shake(1.0, 0.2)
	FortEnt.retrace(world)

func _segredo() -> void:
	var flag: String = def.get("flag", "")
	if Game.has_flag(flag):
		return
	Game.set_flag(flag)
	Audio.play("thud")
	Audio.on_treasure({}, true)
	world.fx_at("sparkle", global_position + Vector2(0, -8), 0.6, 0.0, 1.3)
	world.say(def.get("msg", "Você percebe algo que ninguém tinha notado. Uma passagem!"))
	sprite.visible = false

func set_receptor(on: bool) -> void:
	if lit == on:
		return
	lit = on
	_fset("receptor_on" if on else "receptor_off")
	if on:
		Audio.play("lever", -8.0)
		world.fx_at("sparkle", global_position + Vector2(0, -10), 0.4)

func _process(delta: float) -> void:
	glow_t += delta
	if get_tree().paused:
		return
	if kind == "helice":
		var spinning: bool = Game.has_flag(def.get("flag", "")) or spin_t > 0.0
		spin_t = max(0.0, spin_t - delta)
		if spinning:
			_fset(["helice0", "helice1", "helice2"][int(glow_t * (14.0 if spin_t > 0.0 else 8.0)) % 3])
	elif kind == "portal":
		_fset("portal_on" if Game.has_eco("passo_umbral") else "portal_off")
		if sprite and Game.has_eco("passo_umbral"):
			sprite.modulate = Color(1, 1, 1, 0.75 + 0.25 * sin(glow_t * 4.0))
	elif kind == "receptor" and lit and sprite:
		sprite.modulate = Color(1.0 + 0.15 * sin(glow_t * 6.0), 1.0, 1.0)

# =============================================================== FEIXE DE LUZ (estático: calculado na grade)
static func _layer(w: Node) -> Node2D:
	if w.has_meta("fort_beams"):
		var n = w.get_meta("fort_beams")
		if is_instance_valid(n):
			return n
	var l := Node2D.new()
	l.z_index = 1
	w.add_child(l)
	w.set_meta("fort_beams", l)
	return l

static func _ent_at(w: Node, c: Vector2i) -> FortEnt:
	for e in w.get_tree().get_nodes_in_group("ents"):
		if e is FortEnt and e.kind in ["espelho", "persiana", "receptor", "lente", "balestra", "helice", "manivela", "solar", "eclipse", "prisma"] \
				and not e.is_queued_for_deletion() and e.cell() == c:
			return e
	return null

static var _pending := false

## Agenda um novo cálculo dos feixes para o fim do quadro (várias mudanças de flag viram um só cálculo).
static func request(w: Node) -> void:
	if _pending or not is_instance_valid(w) or not w.has_meta("fort_light"):
		return
	_pending = true
	(func():
		_pending = false
		if is_instance_valid(w):
			retrace(w)).call_deferred()

## Recalcula todos os feixes do mapa: desenha os segmentos e acende/apaga os receptores de luz.
static func retrace(w: Node) -> void:
	if w.map.is_empty():
		return
	var layer := _layer(w)
	for c in layer.get_children():
		c.queue_free()
	var lentes: Array = []
	var receptores: Array = []
	for e in w.get_tree().get_nodes_in_group("ents"):
		if e is FortEnt and not e.is_queued_for_deletion():
			if e.kind == "lente":
				lentes.append(e)
			elif e.kind == "receptor" and str(e.def.get("ativa", "luz")) == "luz":
				receptores.append(e)
	w.set_meta("fort_light", not lentes.is_empty())
	if lentes.is_empty():
		w.remove_meta("fort_light")
		return
	var hit := {}
	for l in lentes:
		var fase: String = l.def.get("fase", "")
		var ecl: String = l.def.get("eclipse", "")
		if fase == "sol" and Game.has_flag(ecl):
			continue
		if fase == "lua" and not Game.has_flag(ecl):
			continue
		var d: Array = l.def.get("dir", [1, 0])
		_trace(w, layer, l.cell(), Vector2i(int(d[0]), int(d[1])), hit)
	for r in receptores:
		var latched: bool = Game.has_flag(r._puzzle_done_flag()) or Game.has_flag(r.def.get("flag", "_nunca_"))
		r.set_receptor(latched or hit.has(r.get_instance_id()))
		if hit.has(r.get_instance_id()) and r.def.has("flag") and not Game.has_flag(r.def["flag"]):
			Game.set_flag(r.def["flag"])
	_check_groups(w)

static func _trace(w: Node, layer: Node2D, start: Vector2i, dir: Vector2i, hit: Dictionary) -> void:
	var c := start
	var steps := 0
	while steps < 80:
		steps += 1
		c += dir
		if c.x < 0 or c.y < 0 or c.x >= w.W or c.y >= w.H:
			return
		var ch: String = w.cur_tiles[c.y][c.x]
		if Fortaleza.BLOCKS_LIGHT.contains(ch) or (not Fortaleza.CHARS.contains(ch) and not Catedral.LIGHT_PASS.contains(ch) and w.is_solid_char(ch)):
			_spark(layer, c - dir, dir)
			return
		var e := _ent_at(w, c)
		if e != null:
			match e.kind:
				"espelho":
					_spark(layer, c, Vector2i.ZERO)
					dir = Vector2i(-dir.y, -dir.x) if e.ori == "a" else Vector2i(dir.y, dir.x)
					continue
				"prisma":   # Região 5: o prisma da Catedral dobra o feixe para a direção da seta
					_spark(layer, c, Vector2i.ZERO)
					dir = e.out_dir
					continue
				"persiana":
					if not e.open_state:
						_spark(layer, c, dir)
						return
				"receptor":
					hit[e.get_instance_id()] = true
					_spark(layer, c, Vector2i.ZERO)
					return
				_:
					_spark(layer, c, Vector2i.ZERO)
					return
		var s := Sprite2D.new()
		s.texture = Art.sprite_tex("fort_props")
		s.region_enabled = true
		s.region_rect = Rect2(FPROPS["beam_h" if dir.y == 0 else "beam_v"] * 16, 0, 16, 16)
		s.position = Vector2(c.x * 16 + 8, c.y * 16 + 2)
		s.modulate = Color(1, 1, 1, 0.85)
		layer.add_child(s)

static func _spark(layer: Node2D, c: Vector2i, _dir: Vector2i) -> void:
	var s := Sprite2D.new()
	s.texture = Art.sprite_tex("fort_props")
	s.region_enabled = true
	s.region_rect = Rect2(FPROPS["beam_spark"] * 16, 0, 16, 16)
	s.position = Vector2(c.x * 16 + 8, c.y * 16 + 2)
	layer.add_child(s)

## Grupos de receptores ("type": "receptores" em puzzles): todos acesos -> grava a flag (fica gravada no save).
static func _check_groups(w: Node) -> void:
	for g in w.map.get("puzzles", {}):
		var pz: Dictionary = w.map["puzzles"][g]
		if pz.get("type", "") != "receptores" or Game.has_flag(pz["flag"]):
			continue
		var n := 0
		var all := true
		for e in w.get_tree().get_nodes_in_group("ents"):
			if e is FortEnt and e.kind == "receptor" and e.def.get("group", "") == g and not e.is_queued_for_deletion():
				n += 1
				if not e.lit:
					all = false
		if n > 0 and all:
			Game.set_flag(pz["flag"])
			Audio.play("puzzle_ok")
			w.say(pz.get("msg", "Os receptores brilham juntos: um mecanismo despertou!"))

## Disparo ou rajada que atinge um receptor do tipo certo.
static func receptor_hit(w: Node, pos: Vector2, kind_: String, r := 10.0) -> bool:
	for e in w.get_tree().get_nodes_in_group("ents"):
		if e is FortEnt and e.kind == "receptor" and not e.lit and str(e.def.get("ativa", "luz")) == kind_ and e.global_position.distance_to(pos) <= r:
			e.set_receptor(true)
			if e.def.has("flag"):
				Game.set_flag(e.def["flag"])
			_check_groups(w)
			return true
	return false

## Rajada de vento (Ventisco/Vendraco): gira hélices, dispersa névoa e acende receptores de cata-vento no cone.
static func wind_area(w: Node, origin: Vector2, dir: Vector2, rad: float, arc: float) -> int:
	var n := 0
	for e in w.get_tree().get_nodes_in_group("ents"):
		if not (e is FortEnt) or e.is_queued_for_deletion():
			continue
		if not Combat.in_arc(origin, dir, rad, arc, e.global_position, 10.0):
			continue
		match e.kind:
			"helice":
				if not Game.has_flag(e.def.get("flag", "")):
					e.spin(true); n += 1
			"nevoa":
				if not Game.has_flag(e.def.get("flag", "")):
					e.disperse(); n += 1
			"receptor":
				if str(e.def.get("ativa", "")) == "vento" and not e.lit:
					receptor_hit(w, e.global_position, "vento", 2.0); n += 1
	if n > 0:
		var ac := Game.active_ind()
		if not ac.is_empty():
			Game.bond_activity(ac["uuid"], "acao:vento_" + w.map_id)
	return n

## Calor (salto explosivo do Brasardo, cone do Faisquito, Ruptura Ígnea): reaquece mecanismos antigos atingidos.
static func heat_area(w: Node, origin: Vector2, dir: Vector2, rad: float, arc: float) -> int:
	var n := 0
	for e in w.get_tree().get_nodes_in_group("ents"):
		if e is FortEnt and e.kind == "solar" and not e.lit and Combat.in_arc(origin, dir, rad, arc, e.global_position, 10.0):
			e.heat(); n += 1
	return n

# =============================================================== ECO: PASSO UMBRAL
## Atravessa só fissuras e portais marcados. Nunca ignora paredes ou portas livremente.
static func cross(w: Node, e: FortEnt) -> bool:
	if not Game.has_eco("passo_umbral"):
		if e.kind == "portal":
			w.say("Um círculo de runas apagado. Algo que caminhe entre as sombras poderia usá-lo... (Passo Umbral — volte depois)")
		else:
			w.say("Uma fissura violeta pulsa na muralha. Do outro lado há passagem, mas nenhum passo comum a atravessa. (Passo Umbral)")
		Game.set_flag("viu_umbral_" + e.eid)
		return false
	var to := Vector2.ZERO
	if e.kind == "portal":
		var par: String = e.def.get("par", "")
		for o in w.get_tree().get_nodes_in_group("ents"):
			if o is FortEnt and o.kind == "portal" and o.eid == par:
				to = o.global_position + Vector2(0, 14)
		if to == Vector2.ZERO:
			return false
	else:
		var t: Array = e.def["to"]
		to = Vector2(float(t[0]) * 16.0 + 8.0, float(t[1]) * 16.0 + 8.0)
	var p: Node2D = w.player
	w.fx_at("vortex", p.global_position + Vector2(0, -8), 0.35)
	Audio.play("dodge")
	p.global_position = to
	if w.companion != null and is_instance_valid(w.companion):
		w.companion.global_position = w.safe_pos_near(to)
	w.fx_at("vortex", to + Vector2(0, -8), 0.35)
	Game.stats["passos_umbrais"] = int(Game.stats.get("passos_umbrais", 0)) + 1
	if e.def.has("set_flag"):
		Game.set_flag(e.def["set_flag"])
	return true

## Tecla do Eco: usa a fissura ou o portal marcado mais próximo (até 30 px).
static func eco_passo_umbral(w: Node) -> void:
	var best: FortEnt = null
	var bd := 30.0
	for e in w.get_tree().get_nodes_in_group("ents"):
		if e is FortEnt and e.kind in ["portal", "fissura"]:
			var d: float = e.global_position.distance_to(w.player.global_position)
			if d < bd:
				bd = d
				best = e
	if best == null:
		w.say("O Passo Umbral só atravessa fissuras violeta e portais marcados.")
		return
	cross(w, best)
