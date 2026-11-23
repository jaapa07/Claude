class_name Fortaleza
## Região 4 — Fortaleza do Eclipse: tileset, caracteres de mapa e ganchos usados por world.gd.
## Mantido num arquivo próprio para que world.gd só tenha ganchos de uma linha (ver docs/REGIAO4_CONTRATO.md).

const TILESET_PATH := "res://assets/sprites/tiles_fortaleza.png"
## Fonte do atlas no TileSet (0 floresta, 1 minas, 2 interiores; 3 fica reservada para o Pântano).
const SOURCE_ID := 4
const NAMES := ["f_floor0", "f_floor1", "f_floor_edge_n", "f_wall_front", "f_wall_top", "f_crenel", "f_gold_floor", "f_garden",
	"f_garden_flowers", "f_hedge", "f_planter", "f_abyss", "f_abyss_lip", "f_spirit_bridge", "f_fissure", "f_gate_closed",
	"f_gate_open", "f_stairs", "f_pillar", "f_light_floor", "f_shadow_floor", "f_light_plat", "f_light_ghost", "f_shadow_plat",
	"f_shadow_ghost", "f_fog0", "f_fog1", "f_roof_l", "f_roof_m", "f_roof_r", "f_house_wall", "f_house_window", "f_house_door",
	"f_mountain", "f_rock_front", "f_rock_top", "f_carpet", "f_banner", "f_gold_plain"]
## Caracteres de mapa da região (docs/REGIAO4_CONTRATO.md)
const CHARS := "βωΩγψφΦθξλζιεπσαΛΔΣΨκρνμΜτ"
const SOLID := "ωΩφΦθλζπΔΨκρνΜ"
## Luz atravessa abismo, pisos e plataformas; é barrada por muralhas, pilares, grades, fissuras, névoa, sebes e casas.
const BLOCKS_LIGHT := "ωΩφΦλζπκρνΜ"
const WALLS := "ωΩλζνΜ"
## Mecanismos que a pedra de reinício do rito recoloca no estado inicial
const RESET_KINDS := ["espelho", "persiana", "eclipse"]
const ENEMY_KINDS := ["lanceiro", "arqueiro", "armadura"]
const ENT_KINDS := ["espelho", "persiana", "receptor", "lente", "helice", "manivela", "fresta", "solar", "portal", "fissura",
	"balestra", "eclipse", "nevoa", "segredo"]

static func is_solid(c: String) -> bool:
	return SOLID.contains(c)

static func is_name(n: String) -> bool:
	return n.begins_with("f_")

static func coords(n: String) -> Vector2i:
	var i := NAMES.find(n)
	return Vector2i(i % 16, i / 16)

## Ganchos chamados em World._ready
static func attach(w: Node) -> void:
	w.boss_scripts["gemeos"] = "res://scripts/boss_gemeos.gd"
	w.boss_scripts["cavaleiro"] = "res://scripts/boss_cavaleiro.gd"
	Game.eco_changed.connect(func():
		if is_instance_valid(w) and not w.map.is_empty():
			w.refresh_tiles()
			w.refresh_entities())
	w.map_loaded.connect(func(_id):
		FortEnt.retrace(w)
		Fortaleza.on_map_loaded(w))
	Game.flag_changed.connect(func(_n, _v): FortEnt.request(w))

static func new_enemy(kind: String) -> Enemy:
	var c5 := Catedral.new_enemy(kind)   # Região 5
	if c5 != null:
		return c5
	if kind in ENEMY_KINDS:
		return load("res://scripts/enemy_fortaleza.gd").new()
	return Enemy.new()

## Cena de retorno ao Refúgio depois do Cavaleiro (a guarnição libertada abre a estrada final).
static func on_map_loaded(w: Node) -> void:
	if not Game.in_game or w.map_id != "refugio_muralha" or not Game.has_flag("cavaleiro_morto") or Game.has_flag("voltou_refugio"):
		return
	Game.set_flag("voltou_refugio")
	await w.get_tree().create_timer(0.8).timeout
	w.player.set_busy(true)
	w.ui.dialog(["Os soldados da guarnição, presos nas sombras da torre, voltaram ao Refúgio da Muralha.",
		"A Capitã Ilse ergueu o estandarte: o portão norte foi destrancado e a Estrada Final, rumo à Catedral do Vazio, está aberta.",
		"Com o Passo Umbral você atravessa fissuras violeta e portais marcados — procure-os nas muralhas e na torre."], func():
		w.player.set_busy(false)
		w.autosave())

static func add_source(ts: TileSet) -> void:
	if not ResourceLoader.exists(TILESET_PATH):
		return
	var src := TileSetAtlasSource.new()
	src.texture = Art.tex(TILESET_PATH)
	src.texture_region_size = Vector2i(16, 16)
	for i in NAMES.size():
		if NAMES[i] == "f_fog1":
			continue
		var c := Vector2i(i % 16, i / 16)
		src.create_tile(c)
		if NAMES[i] == "f_fog0":
			src.set_tile_animation_frames_count(c, 2)
			src.set_tile_animation_frame_duration(c, 0, 0.6)
			src.set_tile_animation_frame_duration(c, 1, 0.6)
		elif NAMES[i] == "f_banner" and src.texture.get_height() >= 144:
			# estandarte ao vento: quadros extras nas linhas 5 e 8 da mesma coluna (82_fortaleza.pxl)
			src.set_tile_animation_columns(c, 1)
			src.set_tile_animation_separation(c, Vector2i(0, 32))
			src.set_tile_animation_frames_count(c, 3)
			for k in 3:
				src.set_tile_animation_frame_duration(c, k, 0.22)
			src.set_tile_animation_mode(c, TileSetAtlasSource.TILE_ANIMATION_MODE_RANDOM_START_TIMES)
	ts.add_source(src, SOURCE_ID)

## Desenho da célula pela vizinhança. Retorna [chão, detalhe, detalhe2, copa acima] (mesmo formato de World._cell_tiles).
static func cell_tiles(w: Node, x: int, y: int, c: String, hv: int) -> Array:
	var out := ["f_floor0", "", "", ""]
	var up: String = w._ch(x, y - 1)
	var down: String = w._ch(x, y + 1)
	match c:
		"β":
			if WALLS.contains(up) or up == "Ω":
				out[0] = "f_floor_edge_n"
			else:
				out[0] = "f_floor1" if hv % 7 == 0 else "f_floor0"
		"ω":
			if down in ["ω", "Ω", "#", "λ"]:
				out[0] = "f_wall_top"
			else:
				out[0] = "f_banner" if hv % 9 == 0 else "f_wall_front"
		"Ω": out[0] = "f_crenel"
		"γ": out[0] = "f_gold_floor" if (x % 3 == 1 and y % 3 == 1) else "f_gold_plain"
		"ψ": out[0] = "f_garden_flowers" if hv % 5 == 0 else "f_garden"
		"φ":
			out[0] = "f_garden"
			out[1] = "f_hedge"
		"Φ":
			out[0] = "f_floor0"
			out[1] = "f_planter"
		"θ":
			var ledge := not (up in ["θ", "#", "Δ", "Ψ", "ξ", "Λ", "Σ", "v"] or SOLID.contains(up))
			out[0] = "f_abyss_lip" if ledge else "f_abyss"
		"ξ": out[0] = "f_spirit_bridge"
		"λ": out[0] = "f_fissure"
		"ζ": out[0] = "f_gate_closed"
		"ι": out[0] = "f_gate_open"
		"ε": out[0] = "f_stairs"
		"π":
			out[0] = "f_floor0"
			out[1] = "f_pillar"
		"σ": out[0] = "f_shadow_floor"
		"α": out[0] = "f_light_floor"
		"Λ": out[0] = "f_light_plat"
		"Δ": out[0] = "f_light_ghost"
		"Σ": out[0] = "f_shadow_plat"
		"Ψ": out[0] = "f_shadow_ghost"
		"κ": out[0] = "f_fog0"
		"ρ":
			var l: bool = w._ch(x - 1, y) == "ρ"
			var r: bool = w._ch(x + 1, y) == "ρ"
			out[0] = "f_floor0"
			out[1] = "f_roof_m" if (l and r) else ("f_roof_l" if r else "f_roof_r")
		"ν":
			var a := x
			while w._ch(a - 1, y) == "ν": a -= 1
			var b := x
			while w._ch(b + 1, y) == "ν": b += 1
			var mid := (a + b) / 2
			out[0] = "f_house_door" if x == mid else ("f_house_window" if (x - a) % 2 == 1 else "f_house_wall")
		"μ": out[0] = "f_mountain"
		"Μ": out[0] = "f_rock_top" if down in ["Μ", "#"] else "f_rock_front"
		"τ": out[0] = "f_carpet"
	return out
