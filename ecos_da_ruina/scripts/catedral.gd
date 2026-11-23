class_name Catedral
## Região 5 — Catedral do Vazio: tileset, caracteres de mapa, ganchos usados por world.gd, resgate de Ione,
## epílogo nas cinco comunidades, créditos e a Harmonia dos Ecos (pós-jogo).
## Mantido num arquivo próprio para que world.gd só tenha ganchos de uma linha (ver docs/REGIAO5_CONTRATO.md).

const TILESET_PATH := "res://assets/sprites/tiles_catedral.png"
## Fonte do atlas no TileSet (0 floresta, 1 minas, 2 interiores, 3 pântano, 4 fortaleza).
const SOURCE_ID := 5
const NAMES := ["c5_floor0", "c5_floor1", "c5_floor_edge_n", "c5_wall_front", "c5_wall_top", "c5_wall_glass", "c5_mosaic", "c5_mosaic_edge_n",
	"c5_void0", "c5_void1", "c5_void_lip", "c5_frag_plat", "c5_stairs", "c5_pillar", "c5_seal0", "c5_seal1",
	"c5_rune_floor", "c5_root_bridge", "c5_crystal_rock", "c5_spirit_path", "c5_garden0", "c5_garden1", "c5_hanging", "c5_camp0",
	"c5_camp1", "c5_tent_l", "c5_tent_m", "c5_tent_r", "c5_tent_front", "c5_tent_door", "c5_fence", "c5_carpet",
	"c5_glass_light", "c5_gate", "c5_rock_top", "c5_rock_front"]
## Caracteres de mapa da região (docs/REGIAO5_CONTRATO.md)
const CHARS := "длышцэябгпчжфщъювзикьм"
const SOLID := "жфщъювзикьм"
## O vazio deixa passar a luz e os projéteis (mas ninguém anda sobre ele).
const LIGHT_PASS := "ф"
const WALLS := "жьм"
const ENEMY_KINDS := ["escriba", "sentinela_prisma", "fragmento"]
const ENT_KINDS := ["prisma", "emissor", "cristal", "ancora", "elo", "raiz", "cristal_eco", "marca", "circulo", "selo_harmonia", "adorno",
	"cristal_ione", "nome", "eco_ione"]
const MAPS := ["acampamento_aurora", "escadaria_fragmentos", "jardim_invertido", "catedral_a", "catedral_b", "rito_convergencia",
	"catedral_c", "salao_harmonia"]

static func is_name(n: String) -> bool:
	return n.begins_with("c5_")

static func coords(n: String) -> Vector2i:
	var i := NAMES.find(n)
	return Vector2i(i % 16, i / 16)

static func add_source(ts: TileSet) -> void:
	if not ResourceLoader.exists(TILESET_PATH):
		return
	var src := TileSetAtlasSource.new()
	src.texture = Art.tex(TILESET_PATH)
	src.texture_region_size = Vector2i(16, 16)
	for i in NAMES.size():
		if NAMES[i] in ["c5_void1", "c5_seal1"]:
			continue
		var c := Vector2i(i % 16, i / 16)
		src.create_tile(c)
		if NAMES[i] in ["c5_void0", "c5_seal0"]:
			src.set_tile_animation_frames_count(c, 2)
			src.set_tile_animation_frame_duration(c, 0, 0.8 if NAMES[i] == "c5_void0" else 0.45)
			src.set_tile_animation_frame_duration(c, 1, 0.8 if NAMES[i] == "c5_void0" else 0.45)
	ts.add_source(src, SOURCE_ID)

## Desenho da célula pela vizinhança. Retorna [chão, detalhe, detalhe2, copa acima] (mesmo formato de World._cell_tiles).
static func cell_tiles(w: Node, x: int, y: int, c: String, hv: int) -> Array:
	var out := ["c5_floor0", "", "", ""]
	var up: String = w._ch(x, y - 1)
	var down: String = w._ch(x, y + 1)
	match c:
		"д":
			if WALLS.contains(up) or up == "#":
				out[0] = "c5_floor_edge_n"
			else:
				out[0] = "c5_floor1" if hv % 7 == 0 else "c5_floor0"
		"л": out[0] = "c5_mosaic_edge_n" if (WALLS.contains(up) or up == "#") else "c5_mosaic"
		"ы": out[0] = "c5_rune_floor"
		"ш": out[0] = "c5_stairs"
		"ц":
			out[0] = "c5_void0"
			out[1] = "c5_frag_plat"
		"э":
			out[0] = "c5_void0"
			out[1] = "c5_root_bridge"
		"я":
			out[0] = "c5_void0"
			out[1] = "c5_spirit_path"
		"б": out[0] = "c5_garden1" if hv % 5 == 0 else "c5_garden0"
		"в":
			out[0] = "c5_garden0"
			out[1] = "c5_hanging"
		"г": out[0] = "c5_camp1" if hv % 6 == 0 else "c5_camp0"
		"п": out[0] = "c5_carpet"
		"ч": out[0] = "c5_glass_light"
		"ж":
			if down in ["ж", "#", "ь", "м"]:
				out[0] = "c5_wall_top"
			else:
				out[0] = "c5_wall_glass" if hv % 6 == 0 else "c5_wall_front"
		"ф":
			var ledge: bool = not (up in ["ф", "#", "ц", "э", "я"] or w.is_solid_char(up))
			out[0] = "c5_void_lip" if ledge else "c5_void0"
		"щ":
			out[0] = _ground_near(w, x, y)
			out[1] = "c5_pillar"
		"ъ": out[0] = "c5_seal0"
		"ю": out[0] = "c5_crystal_rock"
		"з":
			var l: bool = w._ch(x - 1, y) == "з"
			var r: bool = w._ch(x + 1, y) == "з"
			out[0] = "c5_camp0"
			out[1] = "c5_tent_m" if (l and r) else ("c5_tent_l" if r else "c5_tent_r")
		"и":
			var a := x
			while w._ch(a - 1, y) == "и": a -= 1
			var b := x
			while w._ch(b + 1, y) == "и": b += 1
			out[0] = "c5_camp0"
			out[1] = "c5_tent_door" if x == (a + b) / 2 else "c5_tent_front"
		"к":
			out[0] = "c5_camp0"
			out[1] = "c5_fence"
		"ь": out[0] = "c5_gate"
		"м": out[0] = "c5_rock_top" if down in ["м", "#"] else "c5_rock_front"
	return out

static func _ground_near(w: Node, x: int, y: int) -> String:
	for d in [Vector2i(0, 1), Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, -1)]:
		var c: String = w._ch(x + d.x, y + d.y)
		if c == "г": return "c5_camp0"
		if c == "л": return "c5_mosaic"
		if c == "б": return "c5_garden0"
	return "c5_floor0"

static func new_enemy(kind: String) -> Enemy:
	if kind in ENEMY_KINDS:
		return load("res://scripts/enemy_catedral.gd").new()
	return null

# =============================================================== GANCHOS (World._ready)
static var _epilogue_running := false

static func attach(w: Node) -> void:
	w.boss_scripts["arauto"] = "res://scripts/boss_arauto.gd"
	w.boss_scripts["rei"] = "res://scripts/boss_rei.gd"
	w.map_loaded.connect(func(_id): Catedral.on_map_loaded(w))
	Game.flag_changed.connect(func(n, v): Catedral._on_flag(w, n, v))
	Game.creature_captured.connect(func(_i, _d): Catedral.check_bestiary())

## Missão pós-jogo "O Arquivo Vivo": uma criatura de cada espécie-base capturada.
static func check_bestiary() -> void:
	if not Game.has_flag("quest_bestiario") or Game.has_flag("bestiario_completo"):
		return
	var q: Dictionary = Data.quests.get("bestiario_completo", {})
	if q.is_empty():
		return
	for sid in q["etapas"][0]["contador_especies"]:
		if not Game.bestiary.get(sid, {}).get("capturado", false):
			return
	Game.set_flag("bestiario_completo")
	Game.toast.emit("Missão: bestiário completo! Fale com a Arquivista Sena.")

static func _on_flag(w: Node, n: String, v: bool) -> void:
	if not v or not is_instance_valid(w):
		return
	if n.begins_with("estrela_") and not Game.has_flag("estrelas_ok"):
		if Game.has_flag("estrela_1") and Game.has_flag("estrela_2") and Game.has_flag("estrela_3"):
			Game.set_flag("estrelas_ok")
			Game.toast.emit("Missão: as três estrelas invertidas anotadas! Fale com Mira.")
	if n.begins_with("elo_") and not Game.has_flag("ione_livre"):
		if Game.has_flag("elo_raiz") and Game.has_flag("elo_brasa") and Game.has_flag("elo_velado") and Game.has_flag("elo_umbral"):
			Catedral.rescue_ione(w)

static func on_map_loaded(w: Node) -> void:
	if not Game.in_game:
		return
	check_bestiary()
	if Game.has_flag("rei_morto"):
		_apply_epilogue_changes(w)
		if not Game.has_flag("epilogo_visto") and not _epilogue_running:
			Catedral.epilogue(w)
			return
	if w.map_id == "acampamento_aurora" and not Game.has_flag("chegou_aurora"):
		Game.set_flag("chegou_aurora")
		await w.get_tree().create_timer(0.6).timeout
		if not is_instance_valid(w) or w.map_id != "acampamento_aurora":
			return
		w.player.set_busy(true)
		w.ui.dialog(["Do outro lado do selo, o ar fica frio e claro. Barracas de lona marfim cercam uma fogueira que nunca apaga.",
			"É o Acampamento da Aurora: gente que fugiu da Catedral, ex-noviços da Ordem do Vazio e caçadores que desistiram de caçar.",
			"Acima de tudo, flutuando sobre o vazio, a Catedral do Vazio — e uma luz vermelha pulsando no coração dela.",
			"Você: Ela está lá dentro. Eu sinto. Tomara que eu não chegue tarde demais.",
			"Perto do portão norte, uma figura de manto branco ergue um livro rachado e começa a falar alto."], func():
			w.player.set_busy(false)
			if not Game.has_flag("arauto_partiu"):
				w.start_dialog("arauto_aurora")
			w.autosave())
	elif w.map_id == "catedral_a" and not Game.has_flag("arauto_nave_partiu"):
		await w.get_tree().create_timer(0.6).timeout
		if is_instance_valid(w) and w.map_id == "catedral_a" and not Game.has_flag("arauto_nave_partiu") and not w.ui.is_modal():
			w.start_dialog("arauto_nave")

# =============================================================== ECOS (ganchos de uma linha em world.gd)
## Raiz Viva, Ruptura Ígnea e Olhar Velado também agem sobre os mecanismos da Catedral ao alcance.
static func on_eco(w: Node, eco: String, center: Vector2, rad := 64.0) -> int:
	var n := 0
	for e in w.get_tree().get_nodes_in_group("ents"):
		if e is CatEnt and not e.is_queued_for_deletion() and e.global_position.distance_to(center) <= rad + 16.0:
			if e.eco_hit(eco):
				n += 1
	return n

## Eco final: Harmonia dos Ecos — cura um pouco a equipe, revela espíritos e abre os selos da Harmonia.
static func eco_harmonia(w: Node) -> void:
	var sk: Dictionary = Data.skills.get("harmonia", {})
	var rad := float(sk.get("raio", 96))
	var c: Vector2 = w.player.global_position
	w.fx_pulse(c, rad)
	for k in 6:
		w.fx_at("sparkle", c + Vector2.from_angle(TAU * k / 6.0) * rad * 0.5 + Vector2(0, -8), 0.6)
	Audio.play("heal")
	var cura := float(sk.get("cura", 0.12))
	Game.hero["hp"] = min(Game.hero_max_hp(), float(Game.hero["hp"]) + Game.hero_max_hp() * cura)
	for u in Game.team:
		var ind: Dictionary = Game.individuals[u]
		if not ind.get("exausta", false):
			ind["hp"] = min(Game.creature_hp_max(ind), float(ind["hp"]) + Game.creature_hp_max(ind) * cura)
	Game.hero_changed.emit()
	Game.team_changed.emit()
	w.reveal_spirits(c, rad, float(sk.get("duracao", 6.0)))
	on_eco(w, "harmonia", c, rad)
	w.spawn_text(c + Vector2(0, -30), "Harmonia", Color(1.0, 0.9, 0.75))

## Notas da Harmonia no bestiário (expansão pós-jogo): números e evolução de cada espécie vista.
static func harmonia_note(id: String) -> String:
	if not Game.has_eco("harmonia"):
		return ""
	var sp: Dictionary = Data.sp(id)
	if sp.is_empty():
		return ""
	var habs: Array = []
	for h in sp.get("habilidades", []):
		habs.append("%s (nv.%d)" % [Data.skills.get(h["id"], {}).get("nome", h["id"]), int(h["nivel"])])
	var evo := "—"
	if sp.get("evolucao") != null:
		evo = "%s no nv.%d" % [Data.sp(sp["evolucao"]["para"]).get("nome", "?"), int(sp["evolucao"]["nivel"])]
	return "\n\nNotas da Harmonia: vida %d (+%.1f/nv) • ataque %d (+%.1f/nv)\nHabilidades: %s\nEvolução: %s" % [
		int(sp["hp_base"]), float(sp["hp_cresc"]), int(sp["atk_base"]), float(sp["atk_cresc"]), ", ".join(habs) if not habs.is_empty() else "—", evo]

# =============================================================== RESGATE DE IONE (Câmara do Eco)
static func rescue_ione(w: Node) -> void:
	if Game.has_flag("ione_livre"):
		return
	await w.get_tree().create_timer(0.5).timeout
	if not is_instance_valid(w):
		return
	for e in w.get_tree().get_nodes_in_group("ents"):
		if e is CatEnt and e.kind == "cristal_ione":
			e.shatter()
	w.shake(2.5, 0.6)
	Audio.play("boss_die", -6.0)
	Game.set_flag("ione_livre")
	await w.get_tree().create_timer(0.8).timeout
	if not is_instance_valid(w):
		return
	w.player.set_busy(true)
	Audio.mood_for("memoria", 30.0)
	w.ui.banner("A Mestra Ione")
	w.ui.dialog(Data.story.get("resgate_ione", ["Ione: Aprendiz... você veio."]), func():
		w.player.set_busy(false)
		w.refresh_entities()
		w.autosave())

# =============================================================== VITÓRIA: o nome devolvido
## Chamado pela entidade "nome" que o Rei deixa ao hesitar: o herói (e Ione) devolvem a ele o nome "Ivar".
static func say_name(w: Node, rei: Node) -> void:
	w.player.set_busy(true)
	var lines: Array = []
	for l in Data.story.get("nome_ivar", ["Ivar."]):
		if str(l) == "{EQUIPE}":
			lines.append(team_line())
		else:
			lines.append(l)
	w.ui.dialog(lines, func():
		w.player.set_busy(false)
		if is_instance_valid(rei) and rei.has_method("release"):
			rei.release())

# =============================================================== EPÍLOGO
## Mudanças visíveis nas comunidades depois do Rei: moradores novos, decorações de festa e falas novas.
static func _apply_epilogue_changes(w: Node) -> void:
	var mud: Dictionary = Data.story.get("epilogo", {}).get("mudancas", {}).get(w.map_id, {})
	if mud.is_empty():
		return
	for d in mud.get("entidades", []):
		var dd: Dictionary = (d as Dictionary).duplicate()
		var node: Node = null
		if str(dd["type"]) == "npc":
			var e := Ent.new()
			e.init(w, dd)
			node = e
		else:
			var c := CatEnt.new()
			c.init(w, dd)
			node = c
		w.ysort.add_child(node)
	var dlg: Dictionary = mud.get("dialogos", {})
	for i in w.ent_nodes:
		var n = w.ent_nodes[i]
		if is_instance_valid(n) and n is Ent and dlg.has(str(n.def.get("id", ""))):
			n.def = n.def.duplicate()
			n.def["dialog"] = dlg[str(n.def["id"])]

class _Wait:
	var done := false

## Linhas do epílogo podem ser condicionais: {"if": flag, "t": texto} / {"unless": flag, "t": texto}.
static func _lines(src: Array) -> Array:
	var out: Array = []
	for l in src:
		if l is Dictionary:
			if l.has("if") and not Game.has_flag(str(l["if"])):
				continue
			if l.has("unless") and Game.has_flag(str(l["unless"])):
				continue
			out.append(str(l["t"]))
		else:
			out.append(str(l))
	return out

## As criaturas da equipe participam do clímax: os vínculos ajudam a devolver o nome ao Rei.
static func team_line() -> String:
	var names: Array = []
	var bonds := 0
	for u in Game.team:
		var ind: Dictionary = Game.individuals.get(u, {})
		if ind.is_empty():
			continue
		names.append("%s (%s)" % [Game.creature_name(ind), Data.sp(ind["species_id"]).get("nome", "")] if Game.creature_name(ind) != Data.sp(ind["species_id"]).get("nome", "") else Game.creature_name(ind))
		bonds += Game.bond_count(ind)
	if names.is_empty():
		return "Ione segura sua mão. Duas vozes juntas são mais fortes que uma."
	var who: String = names[0] if names.size() == 1 else ", ".join(names.slice(0, names.size() - 1)) + " e " + names[-1]
	Game.set_flag("climax_equipe")
	return "%s se aproximam e encostam em você e em Ione. Os vínculos de vocês (%d lembranças compartilhadas) vibram juntos — e as vozes de todos dizem o mesmo nome." % [who, max(1, bonds)] if names.size() > 1 else "%s encosta em você e em Ione. O vínculo de vocês vibra — e as três vozes dizem o mesmo nome." % who

static func _dialog(w: Node, lines: Array) -> void:
	var box := _Wait.new()
	w.ui.dialog(lines, func(): box.done = true)
	while not box.done and is_instance_valid(w):
		await w.get_tree().process_frame

## Visita as cinco comunidades (consequências visíveis), mostra os créditos e devolve o herói ao Acampamento.
static func epilogue(w: Node) -> void:
	if _epilogue_running:
		return
	_epilogue_running = true
	# primeiro a memória de Ivar (a visão do passado aparece quando a luta acaba)
	var waited := 0.0
	while is_instance_valid(w) and not Game.has_flag("mem_rei_morto") and waited < 30.0:
		await w.get_tree().create_timer(0.25).timeout
		waited += 0.25
	# depois, a última lembrança (artefato "coroa_partida", scripts/historia.gd): a fenda e o selo de Ione
	waited = 0.0
	while is_instance_valid(w) and not Historia.has_artefato("coroa_partida") and waited < 40.0:
		await w.get_tree().create_timer(0.25).timeout
		waited += 0.25
	if not is_instance_valid(w):
		_epilogue_running = false
		return
	while w.ui.is_modal():
		await w.get_tree().process_frame
	await w.get_tree().create_timer(0.4).timeout
	var ep: Dictionary = Data.story.get("epilogo", {})
	w.transition_busy = true
	w.player.set_busy(true)
	if not Game.has_flag("fissuras_fechadas"):
		Game.set_flag("fissuras_fechadas")
		await _dialog(w, ep.get("abertura", []))
	for stop in ep.get("paradas", []):
		if not is_instance_valid(w):
			_epilogue_running = false
			return
		await w.ui.fade(1.0, 0.5)
		var pos: Variant = null
		if stop.has("pos"):
			pos = Vector2(float(stop["pos"][0]) * 16.0 + 8.0, float(stop["pos"][1]) * 16.0 + 8.0)
		w.load_map(str(stop["mapa"]), str(stop.get("spawn", "default")), pos)
		w.player.set_busy(true)
		w.transition_busy = true
		await w.ui.fade(0.0, 0.5)
		w.ui.banner(str(stop["titulo"]))
		Game.set_flag("epilogo_" + str(stop["mapa"]))
		await _dialog(w, _lines(stop["linhas"]))
	await credits(w)
	Game.set_flag("epilogo_visto")
	Game.set_flag("fim_cap5")
	Game.grant_eco("harmonia")
	await w.ui.fade(1.0, 0.5)
	w.load_map("acampamento_aurora", "from_epilogo")
	w.player.set_busy(true)
	await w.ui.fade(0.0, 0.5)
	await _dialog(w, ep.get("fecho", []))
	w.player.set_busy(false)
	w.transition_busy = false
	_epilogue_running = false
	w.autosave()

## Créditos finais: tela própria com as pessoas e as criaturas da jornada.
static func credits(w: Node) -> void:
	var ui = w.ui
	var s: MenuScreen = ui._push("Créditos", [], "")
	var items: Array = []
	var mins := int(Game.play_time / 60.0)
	var info := "ECOS DA RUÍNA\n\nObrigado por jogar!\n\nHerói nível %d • %d capturas • %d mortes • %d min de jogo • conquista %d%%" % [
		Game.hero_level(), int(Game.stats["capturas"]), int(Game.stats["mortes"]), mins, Game.conquest_pct()]
	for blk in Data.story.get("epilogo", {}).get("creditos", []):
		items.append(ui._hdr(str(blk["titulo"])))
		for l in blk["linhas"]:
			items.append(ui._it(str(l), Callable(), info))
	items.append(ui._it("Continuar", func(): s.close(), info))
	s.setup("Créditos — Ecos da Ruína", items, info)
	s.list_w = 250.0
	while is_instance_valid(s) and ui.has_screen():
		await w.get_tree().process_frame

# =============================================================== CRIATURAS DA REGIÃO 5 (ganchos em companion.gd)
static func action_color(acao: String) -> Color:
	match acao:
		"prisma": return Color(1.0, 0.95, 0.8)
		"ancora": return Color(0.8, 0.75, 0.65)
		"marca": return Color(0.75, 0.6, 1.0)
	return Color(1.0, 0.6, 0.25)

## Habilidade "perfura" (Velúnio/Astravéu): dardo de sombra em linha que atravessa o primeiro inimigo e fere o seguinte.
static func pierce(comp: Node, sk: Dictionary, dir: Vector2, dmg: float, aff: String) -> void:
	var w: Node = comp.world
	var d := dir if dir != Vector2.ZERO else Vector2.RIGHT
	if comp.target != null and is_instance_valid(comp.target):
		d = (comp.target.global_position - comp.global_position).normalized()
	var reach := float(sk.get("alcance", 120)) * (1.2 if comp.is_evolved() else 1.0)
	var max_hits := int(sk.get("atravessa", 1)) + 1
	var origin: Vector2 = comp.global_position + Vector2(0, -6)
	var hits: Array = []
	for e in w.enemies():
		if not e.hittable() or e.kind == "dummy":
			continue
		var rel: Vector2 = e.global_position - comp.global_position
		var along := rel.dot(d)
		if along > 0.0 and along <= reach and abs(rel.dot(d.orthogonal())) <= 10.0 + e.radius:
			hits.append([along, e])
	hits.sort_custom(func(a, b): return a[0] < b[0])
	var end: Vector2 = origin + d * reach
	var n := 0
	for h in hits:
		if n >= max_hits:
			break
		var e: Node = h[1]
		e.take_damage(dmg * (1.0 if n == 0 else 0.8), comp.global_position, {"src": "companion", "uuid": comp.uuid(), "aff": aff, "knock": 30.0})
		end = e.global_position + Vector2(0, -6)
		n += 1
	w.bolt(origin, end + d * 12.0, Color(0.7, 0.5, 1.0), func(): pass)
	w.fx_at(str(sk.get("fx", "vortex")), end, 0.3, 0.0, 0.8)
	comp._face(d)
	comp.anim_lock = 0.3
	comp.sprite.play("attack")

# =============================================================== CLIMA "AURORA" (gancho em weather_fx.gd)
static func build_aurora(fx: Node) -> void:
	if not ResourceLoader.exists("res://assets/sprites/clima_aurora_fitas.png"):
		return
	var g: Node2D = fx._group("aurora")
	var fitas: CPUParticles2D = fx._emitter(g, Art.sprite_tex("clima_aurora_fitas"), 2, 6, 10.0)
	fitas.position = Vector2(240.0, 40.0)
	fitas.emission_rect_extents = Vector2(260.0, 30.0)
	fitas.direction = Vector2(1, 0.1)
	fitas.spread = 8.0
	fitas.initial_velocity_min = 4.0
	fitas.initial_velocity_max = 9.0
	fitas.scale_amount_min = 2.0
	fitas.scale_amount_max = 3.0
	fitas.color_ramp = fx._ramp(0.7)
	var brilhos: CPUParticles2D = fx._emitter(g, Art.sprite_tex("clima_aurora_brilho"), 2, 18, 6.0)
	brilhos.position = Vector2(240.0, 135.0)
	brilhos.emission_rect_extents = Vector2(240.0, 135.0)
	brilhos.direction = Vector2(0, -1)
	brilhos.spread = 30.0
	brilhos.initial_velocity_min = 2.0
	brilhos.initial_velocity_max = 6.0
	brilhos.color_ramp = fx._ramp(0.85)
