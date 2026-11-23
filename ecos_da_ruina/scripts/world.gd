extends Node2D
class_name World
## Mundo jogável: carrega mapas escritos à mão, constrói colisão, entidades, enigmas, encontros e transições.

const TILE := 16
const TILE_ORDER := ".,fpT~rRhHwcxFbSDPoCgGvkeBy"
const SOLID := "T~RhHcxFbDPoCvMLuJZXOAaI56"
const TILESET_PATH := "res://assets/sprites/tiles2.png"
## Região 2 (Minas da Brasa): segunda fonte do TileSet (source id 1), ordem do contrato docs/REGIAO2_CONTRATO.md
const TILESET_MINAS_PATH := "res://assets/sprites/tiles_minas.png"
const MINAS_NAMES := ["mfloor0", "mfloor1", "mwall_front", "mwall_top", "rail_h", "rail_v", "lava0", "lava1", "hot_floor", "cool_floor",
	"support", "qfloor", "qwall_front", "qwall_top", "brick_front", "brick_top", "forge_floor", "metal_door", "metal_open", "cracked",
	"ore_rock", "coal", "grate", "stairs", "mfloor_edge_n", "copper_roof_l", "copper_roof_m", "copper_roof_r", "forge_wall",
	"forge_window", "forge_door", "chimney"]
const MINE_WALLS := "MJZuOXAa"
const RAILS := "=|"
const HEAT_TICK := 0.7
const HEAT_DMG_HERO := 5.0
const HEAT_DMG_CREATURE := 4.0
const TILESET_INT_PATH := "res://assets/sprites/tiles_interior.png"
const INT_NAMES := ["wood_floor0", "wood_floor1", "wood_floor_dark", "stone_floor", "rug_center", "rug_edge_n", "rug_edge_s", "rug_edge_w", "rug_edge_e",
	"iwall_top", "iwall_front", "iwall_window", "iwall_shelf", "iwall_painting", "door_mat", "iwall_front_dark"]
const TILE_NAMES := ["grass0", "grass1", "grass2", "grassd0", "flowers0", "lush0", "bloom0", "path0", "path1", "pedge_n", "pedge_s", "pedge_w", "pedge_e",
	"water0", "water1", "shore_n", "shore_s", "shore_w", "shore_e", "tree_bot0", "tree_top0", "tree_bot1", "tree_top1", "bush", "rock", "fence", "roots",
	"rfloor0", "rfloor1", "rmoss", "rwall_front", "rwall_top", "pillar", "pillar_top", "door_closed", "door_open", "sap", "roof_l", "roof_m", "roof_r",
	"hwall", "hwindow", "hdoor", "wood", "chasm", "chasm_lip", "bridge", "cliff_front", "cliff_top", "cave", "void"]
const GRASSY := ".,fgGFbox"

var map_id := ""
var map: Dictionary = {}
var W := 0
var H := 0
var base_tiles: Array = []
var cur_tiles: Array = []
var tilemap: TileMapLayer
var detail: TileMapLayer
var detail2: TileMapLayer
var cover: TileMapLayer
var col_body: StaticBody2D
var ysort: Node2D
var fx_layer: Node2D
var player: Player
var companion: Companion
var camera: Camera2D
var ui: Node
var frozen := false
var hero_target: Node = null
var hero_target_t := 0.0
var ent_nodes := {}
var lever_states := {}
var lever_counts := {}
var combat_t := 0.0
var shake_amp := 0.0
var shake_t := 0.0
var darkness: ColorRect
var dark_mat: ShaderMaterial
var dark_on := false
var dark_radius := 90.0
var light_boost_t := 0.0
var current_prompt := ""
var current_prompt_ent: Node = null
var transition_busy := false
var arrival_t := 0.0
var boss_nodes := {}
var active_boss: Node = null
var encounter_active := {}
var test_mode := false
var _tileset: TileSet
var _hit_token := 0
var _death_pending := false
var ent_defs: Array = []
var rail_switch := {}        # id da alavanca de desvio -> "a" | "b"
var heat_t := 0.0
var heat_warned := false
var furnace_fails := {}
var boss_scripts := {"lenhador": "res://scripts/boss_lenhador.gd", "cervo": "res://scripts/boss_cervo.gd",
	"vigia": "res://scripts/boss_vigia.gd", "ferreiro": "res://scripts/boss_ferreiro.gd"}

signal map_loaded(id: String)

# =============================================================== CONSTRUÇÃO
func _ready() -> void:
	tilemap = TileMapLayer.new()
	tilemap.tile_set = _make_tileset()
	add_child(tilemap)
	detail = TileMapLayer.new()
	detail.tile_set = tilemap.tile_set
	add_child(detail)
	detail2 = TileMapLayer.new()
	detail2.tile_set = tilemap.tile_set
	add_child(detail2)
	col_body = StaticBody2D.new()
	col_body.collision_layer = 1
	col_body.collision_mask = 0
	add_child(col_body)
	ysort = Node2D.new()
	ysort.y_sort_enabled = true
	add_child(ysort)
	cover = TileMapLayer.new()
	cover.tile_set = tilemap.tile_set
	cover.z_index = 25
	add_child(cover)
	fx_layer = Node2D.new()
	fx_layer.z_index = 50
	add_child(fx_layer)
	player = Player.new()
	player.world = self
	ysort.add_child(player)
	camera = Camera2D.new()
	camera.position_smoothing_enabled = false
	camera.limit_smoothed = false
	player.add_child(camera)
	camera.make_current()
	# escuridão da fase 3 do Cervo (camada acima do mundo, abaixo da interface)
	var cl := CanvasLayer.new()
	cl.layer = 5
	add_child(cl)
	darkness = ColorRect.new()
	darkness.size = Vector2(480, 270)
	darkness.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sh := Shader.new()
	sh.code = "shader_type canvas_item;\nuniform vec2 center = vec2(240.0,135.0);\nuniform float radius = 90.0;\nuniform float strength = 0.0;\nvoid fragment(){\n vec2 p = UV * vec2(480.0,270.0);\n float d = distance(p, center);\n float a = smoothstep(radius*0.55, radius*1.5, d) * strength;\n COLOR = vec4(0.02,0.03,0.12,a);\n}\n"
	dark_mat = ShaderMaterial.new()
	dark_mat.shader = sh
	darkness.material = dark_mat
	darkness.visible = false
	cl.add_child(darkness)
	Game.flag_changed.connect(_on_flag_changed)
	Game.team_changed.connect(_on_team_changed)

func _make_tileset() -> TileSet:
	if _tileset:
		return _tileset
	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE, TILE)
	var src := TileSetAtlasSource.new()
	src.texture = Art.tex(TILESET_PATH)
	src.texture_region_size = Vector2i(TILE, TILE)
	for i in TILE_NAMES.size():
		if TILE_NAMES[i] == "water1":
			continue
		var c := Vector2i(i % 16, i / 16)
		src.create_tile(c)
		if TILE_NAMES[i] == "water0":
			src.set_tile_animation_frames_count(c, 2)
			src.set_tile_animation_frame_duration(c, 0, 0.7)
			src.set_tile_animation_frame_duration(c, 1, 0.7)
	ts.add_source(src, 0)
	if ResourceLoader.exists(TILESET_MINAS_PATH):
		var src2 := TileSetAtlasSource.new()
		src2.texture = Art.tex(TILESET_MINAS_PATH)
		src2.texture_region_size = Vector2i(TILE, TILE)
		for i in MINAS_NAMES.size():
			if MINAS_NAMES[i] == "lava1":
				continue
			var c2 := Vector2i(i % 16, i / 16)
			src2.create_tile(c2)
			if MINAS_NAMES[i] == "lava0":
				src2.set_tile_animation_frames_count(c2, 2)
				src2.set_tile_animation_frame_duration(c2, 0, 0.55)
				src2.set_tile_animation_frame_duration(c2, 1, 0.55)
		ts.add_source(src2, 1)
	if ResourceLoader.exists(TILESET_INT_PATH):
		var src3 := TileSetAtlasSource.new()
		src3.texture = Art.tex(TILESET_INT_PATH)
		src3.texture_region_size = Vector2i(TILE, TILE)
		for i in INT_NAMES.size():
			src3.create_tile(Vector2i(i % 16, i / 16))
		ts.add_source(src3, 2)
	_tileset = ts
	return ts

func _tc(name: String) -> Vector2i:
	var i := TILE_NAMES.find(name)
	if i < 0:
		i = MINAS_NAMES.find(name)
	if i < 0:
		i = INT_NAMES.find(name)
	return Vector2i(i % 16, i / 16)

## Fonte do atlas: 0 = floresta (tiles2.png), 1 = minas (tiles_minas.png)
func _src(name: String) -> int:
	if INT_NAMES.has(name):
		return 2
	return 1 if MINAS_NAMES.has(name) else 0

func _ch(x: int, y: int) -> String:
	if x < 0 or y < 0 or x >= W or y >= H:
		return "#"
	return cur_tiles[y][x]

func _hash(x: int, y: int) -> int:
	return ((x * 73856093) ^ (y * 19349663)) & 0xffff

## Escolhe o desenho de cada célula pela vizinhança (autotile). Retorna [chão, detalhe, detalhe2, copa acima].
func _cell_tiles(x: int, y: int) -> Array:
	var c := _ch(x, y)
	var hv := _hash(x, y)
	var g: String = ["grass0", "grass1", "grass2", "grass0"][hv % 4]
	var out := [g, "", "", ""]
	match c:
		".": out[0] = g
		",": out[0] = "grassd0"
		"d": out[0] = "hdoor"
		"1": out[0] = "wood_floor0" if hv % 3 else "wood_floor1"
		"2": out[0] = "wood_floor_dark"
		"3": out[0] = "stone_floor"
		"7": out[0] = "door_mat"
		"4":
			out[0] = "rug_center"
			if _ch(x, y - 1) != "4": out[0] = "rug_edge_n"
			elif _ch(x, y + 1) != "4": out[0] = "rug_edge_s"
			elif _ch(x - 1, y) != "4": out[0] = "rug_edge_w"
			elif _ch(x + 1, y) != "4": out[0] = "rug_edge_e"
		"5", "6":
			var below := _ch(x, y + 1)
			if below in ["5", "6", "v", "#"]:
				out[0] = "iwall_top"
			elif c == "6":
				out[0] = "iwall_front_dark"
			else:
				out[0] = ["iwall_front", "iwall_front", "iwall_window", "iwall_front", "iwall_shelf", "iwall_painting"][hv % 6]
		"f": out[0] = "flowers0"
		"g": out[0] = "lush0"
		"G": out[0] = "bloom0"
		"p":
			out[0] = "path0" if hv % 3 else "path1"
			var e: Array = []
			if GRASSY.contains(_ch(x, y - 1)): e.append("pedge_n")
			if GRASSY.contains(_ch(x, y + 1)): e.append("pedge_s")
			if GRASSY.contains(_ch(x - 1, y)): e.append("pedge_w")
			if GRASSY.contains(_ch(x + 1, y)): e.append("pedge_e")
			if e.size() > 0: out[1] = e[0]
			if e.size() > 1: out[2] = e[1]
		"~":
			out[0] = "water0"
			var e2: Array = []
			if _ch(x, y - 1) != "~": e2.append("shore_n")
			if _ch(x, y + 1) != "~": e2.append("shore_s")
			if _ch(x - 1, y) != "~": e2.append("shore_w")
			if _ch(x + 1, y) != "~": e2.append("shore_e")
			if e2.size() > 0: out[1] = e2[0]
			if e2.size() > 1: out[2] = e2[1]
		"T":
			out[0] = "grassd0"
			var v := hv % 3
			out[1] = "tree_bot1" if v == 0 else "tree_bot0"
			out[3] = "tree_top1" if v == 0 else "tree_top0"
		"b": out[0] = "bush"
		"o": out[0] = "rock"
		"F": out[0] = "fence"
		"x":
			out[0] = "grassd0"
			out[1] = "roots"
		"r": out[0] = "rfloor0" if hv % 4 else "rfloor1"
		"y": out[0] = "rmoss"
		"e": out[0] = "door_open"
		"D": out[0] = "door_closed"
		"S": out[0] = "sap"
		"R": out[0] = "rwall_top" if _ch(x, y + 1) in ["R", "v", "#"] else "rwall_front"
		"P":
			out[0] = "rfloor0"
			out[1] = "pillar"
			out[3] = "pillar_top"
		"H":
			var l := _ch(x - 1, y) == "H"
			var r := _ch(x + 1, y) == "H"
			out[0] = "roof_m" if (l and r) else ("roof_l" if r else "roof_r")
		"h":
			var a := x
			while _ch(a - 1, y) == "h": a -= 1
			var b := x
			while _ch(b + 1, y) == "h": b += 1
			var mid := (a + b) / 2
			out[0] = "hdoor" if x == mid else ("hwindow" if (x - a) % 2 == 1 else "hwall")
		"w": out[0] = "wood"
		"c": out[0] = "chasm" if _ch(x, y - 1) in ["c", "B"] else "chasm_lip"
		"B": out[0] = "bridge"
		"C": out[0] = "cliff_top" if _ch(x, y + 1) in ["C", "#"] else "cliff_front"
		"k": out[0] = "cave"
		"v": out[0] = "void"
		# ---- Região 2 (Minas da Brasa)
		"m":
			out[0] = "mfloor_edge_n" if MINE_WALLS.contains(_ch(x, y - 1)) else ("mfloor1" if hv % 5 == 0 else "mfloor0")
		"M": out[0] = "mwall_top" if _ch(x, y + 1) in ["M", "#"] else "mwall_front"
		"L": out[0] = "lava0"
		"Q": out[0] = "hot_floor"
		"q": out[0] = "cool_floor"
		"=": out[0] = "rail_h"
		"|": out[0] = "rail_v"
		"u": out[0] = "support"
		"j": out[0] = "qfloor"
		"J": out[0] = "qwall_top" if _ch(x, y + 1) in ["J", "#"] else "qwall_front"
		"Z": out[0] = "brick_top" if _ch(x, y + 1) in ["Z", "#", "v"] else "brick_front"
		"z": out[0] = "forge_floor"
		"X": out[0] = "cracked"
		"O": out[0] = "ore_rock"
		"%": out[0] = "grate"
		"<": out[0] = "stairs"
		"I": out[0] = "metal_door"
		"A":
			var la := _ch(x - 1, y) == "A"
			var ra := _ch(x + 1, y) == "A"
			out[0] = "copper_roof_m" if (la and ra) else ("copper_roof_l" if ra else "copper_roof_r")
		"a":
			var a2 := x
			while _ch(a2 - 1, y) == "a": a2 -= 1
			var b2 := x
			while _ch(b2 + 1, y) == "a": b2 += 1
			var mid2 := (a2 + b2) / 2
			if x == b2 and b2 - a2 >= 8:
				out[0] = "chimney"
			else:
				out[0] = "forge_door" if x == mid2 else ("forge_window" if (x - a2) % 2 == 1 else "forge_wall")
	return out

func _paint_cell(i: int, j: int) -> void:
	var t := _cell_tiles(i, j)
	var p := Vector2i(i, j)
	tilemap.set_cell(p, _src(t[0]), _tc(t[0]))
	if t[1] != "": detail.set_cell(p, _src(t[1]), _tc(t[1]))
	else: detail.erase_cell(p)
	if t[2] != "": detail2.set_cell(p, _src(t[2]), _tc(t[2]))
	else: detail2.erase_cell(p)
	if t[3] != "" and j > 0:
		cover.set_cell(Vector2i(i, j - 1), _src(t[3]), _tc(t[3]))

func is_solid_char(c: String) -> bool:
	return SOLID.contains(c)

# =============================================================== CARREGAR MAPA
## spawn: nome do ponto de entrada; pos: posição em pixels (sobrepõe o spawn, usada por continue/checkpoint).
func load_map(id: String, spawn: String = "default", pos: Variant = null) -> void:
	Game.save_block += 1
	map_id = id
	map = Data.maps[id]
	W = int(map["w"]); H = int(map["h"])
	Game.clear_tmp_flags()
	for n in ysort.get_children():
		if n != player:
			n.queue_free()
	for n in fx_layer.get_children():
		n.queue_free()
	companion = null
	ent_nodes.clear()
	boss_nodes.clear()
	encounter_active.clear()
	active_boss = null
	hero_target = null
	dark_on = false
	darkness.visible = false
	base_tiles = []
	for row in map["tiles"]:
		base_tiles.append(Array(row.split("")))
	ent_defs = map["entities"]
	lever_states.clear(); lever_counts.clear()
	rail_switch.clear()
	furnace_fails.clear()
	heat_t = 0.0
	for d0 in ent_defs:
		if d0["type"] == "rail_lever":
			rail_switch[d0["id"]] = str(d0.get("start", "a"))
	for g in map.get("puzzles", {}):
		var pz: Dictionary = map["puzzles"][g]
		if pz["type"] == "levers":
			lever_states[g] = (pz["start"] as Array).duplicate()
			lever_counts[g] = 0
	_compute_tiles()
	_rebuild_tilemap(true)
	_rebuild_collision()
	var sp: Vector2
	if pos != null and pos is Vector2:
		sp = pos
	else:
		var s: Array = map["spawns"].get(spawn, map["spawns"].get("default", [2, 2]))
		sp = Vector2(float(s[0]) * TILE + 8.0, float(s[1]) * TILE + 8.0)
	player.revive_at(sp)
	player.facing = Vector2.DOWN
	camera.limit_left = 0; camera.limit_top = 0
	camera.limit_right = W * TILE; camera.limit_bottom = H * TILE
	_spawn_all(sp)
	refresh_companion(false)
	Audio.music(map.get("music", ""))
	Game.location = {"map": id, "spawn": spawn, "pos": [sp.x, sp.y]}
	if ui:
		ui.banner(map.get("name", id))
	arrival_t = 0.6
	Game.save_block = max(0, Game.save_block - 1)
	if Game.in_game:
		Game.set_flag("visitou_" + id)
	map_loaded.emit(id)
	if Game.in_game and map_id == "vila_lumen" and Game.has_flag("cervo_morto") and not Game.has_flag("voltou_vila"):
		_vila_return_scene()
	if Game.in_game and map_id == "forja_cobre" and Game.has_flag("ferreiro_morto") and not Game.has_flag("voltou_forja"):
		_forja_return_scene()

func _compute_tiles() -> void:
	cur_tiles = []
	for row in base_tiles:
		cur_tiles.append((row as Array).duplicate())
	for c in map.get("conditional", []):
		if c.has("if") and not Game.has_flag(c["if"]):
			continue
		if c.has("unless") and Game.has_flag(c["unless"]):
			continue
		for r in c.get("rects", []):
			for j in range(int(r[3])):
				for i in range(int(r[2])):
					_set_cur(int(r[0]) + i, int(r[1]) + j, str(r[4]))
		var chars: Dictionary = c.get("chars", {})
		if not chars.is_empty():
			# "area" [x, y, w, h] limita a troca de caracteres (ex.: válvula resfria Q -> q só naquela ala)
			var ar: Array = c.get("area", [0, 0, W, H])
			for j in range(max(0, int(ar[1])), min(H, int(ar[1]) + int(ar[3]))):
				for i in range(max(0, int(ar[0])), min(W, int(ar[0]) + int(ar[2]))):
					var ch: String = cur_tiles[j][i]
					if chars.has(ch):
						cur_tiles[j][i] = chars[ch]
	for d in ent_defs:
		if d["type"] == "door":
			var open := door_open(d)
			for t in d["tiles"]:
				_set_cur(int(t[0]), int(t[1]), _door_open_char(d) if open else str(d["closed_char"]))

func _door_open_char(d: Dictionary) -> String:
	if d.has("open_char"):
		return str(d["open_char"])
	match str(d["closed_char"]):
		"D": return "e"
		"I": return "z"
	return "p"

func door_open(d: Dictionary) -> bool:
	for f in d.get("open_flags", []):
		if not Game.has_flag(f):
			return false
	for f in d.get("close_flags", []):
		if Game.has_flag(f):
			return false
	return true

func _set_cur(x: int, y: int, c: String) -> void:
	if x >= 0 and y >= 0 and x < W and y < H:
		cur_tiles[y][x] = c

func _rebuild_tilemap(_full: bool) -> void:
	tilemap.clear(); detail.clear(); detail2.clear(); cover.clear()
	for j in H:
		for i in W:
			_paint_cell(i, j)

func _rebuild_collision() -> void:
	for c in col_body.get_children():
		c.queue_free()
	for j in H:
		var i := 0
		while i < W:
			if is_solid_char(cur_tiles[j][i]):
				var k := i
				while k < W and is_solid_char(cur_tiles[j][k]):
					k += 1
				var cs := CollisionShape2D.new()
				var r := RectangleShape2D.new()
				r.size = Vector2((k - i) * TILE, TILE)
				cs.shape = r
				cs.position = Vector2((i + k) * TILE / 2.0, j * TILE + TILE / 2.0)
				col_body.add_child(cs)
				i = k
			else:
				i += 1

func refresh_tiles() -> void:
	var before := cur_tiles.duplicate(true)
	_compute_tiles()
	var changed := false
	var changed_solid := false
	for j in H:
		for i in W:
			if before[j][i] != cur_tiles[j][i]:
				changed = true
				if is_solid_char(before[j][i]) != is_solid_char(cur_tiles[j][i]):
					changed_solid = true
	if changed:
		_rebuild_tilemap(true)
	if changed_solid:
		_rebuild_collision()

func tile_char_at(p: Vector2) -> String:
	var x := int(floor(p.x / TILE)); var y := int(floor(p.y / TILE))
	if x < 0 or y < 0 or x >= W or y >= H:
		return "v"
	return cur_tiles[y][x]

func tile_solid_at(p: Vector2) -> bool:
	return is_solid_char(tile_char_at(p))

# =============================================================== ENTIDADES
func _spawn_all(player_pos: Vector2) -> void:
	for i in ent_defs.size():
		_spawn_def(i, player_pos)

func _def_visible(d: Dictionary) -> bool:
	if d.has("if_flag") and not Game.has_flag(d["if_flag"]):
		return false
	if d.has("unless_flag") and Game.has_flag(d["unless_flag"]):
		return false
	return true

func _spawn_def(i: int, player_pos: Vector2 = Vector2(-9999, -9999)) -> void:
	var d: Dictionary = ent_defs[i]
	var t: String = d["type"]
	if t in ["exit", "door", "encounter", "chapter_end"]:
		return
	if not _def_visible(d):
		return
	if ent_nodes.has(i) and is_instance_valid(ent_nodes[i]):
		return
	var node: Node = null
	match t:
		"npc", "sign", "chest", "shrine", "flower", "lever", "plate", "crate", "vine", "bridge_spot", "bond_stone", \
				"valve", "furnace", "brazier", "cart", "rail_lever", "rail_marked", "draft", "crack", "ore", "anvil", "spirit_mark", "rite_reset", "altar", "prop", "pickup":
			var e := Ent.new()
			e.init(self, d)
			node = e
		"dummy":
			var en := Enemy.new()
			en.init(self, "dummy", d)
			node = en
		"enemy":
			if d.has("enc") and Game.has_flag(_enc_done_flag(d["enc"])):
				return
			var en2 := Enemy.new()
			en2.init(self, d["kind"], d)
			if player_pos.distance_to(en2.position) < 80.0:
				return
			node = en2
		"wild":
			if d.get("unique", false) and Game.has_flag("captured_" + str(d["id"])):
				return
			var w := Enemy.new()
			w.init(self, "wild", d)
			node = w
		"miniboss":
			if Game.has_flag(d["flag_done"]):
				return
			var mk: String = d.get("boss", "lenhador")
			var mb = load(boss_scripts[mk]).new()
			mb.init(self, mk, d)
			node = mb
			boss_nodes[i] = mb
		"boss":
			if Game.has_flag(d["flag_done"]):
				return
			var bk: String = d.get("boss", "cervo")
			var bb = load(boss_scripts[bk]).new()
			bb.init(self, bk, d)
			node = bb
			boss_nodes[i] = bb
	if node != null:
		ysort.add_child(node)
		ent_nodes[i] = node

func _enc_done_flag(enc: String) -> String:
	for d in ent_defs:
		if d["type"] == "encounter" and d["id"] == enc:
			return d["flag_done"]
	return "_"

func refresh_entities() -> void:
	for i in ent_defs.size():
		var d: Dictionary = ent_defs[i]
		if not (d.has("if_flag") or d.has("unless_flag")):
			continue
		var vis := _def_visible(d)
		var has := ent_nodes.has(i) and is_instance_valid(ent_nodes[i])
		if vis and not has:
			_spawn_def(i)
		elif not vis and has:
			ent_nodes[i].queue_free()
			ent_nodes.erase(i)

## Inimigos comuns reaparecem ao descansar (nunca ao lado do jogador).
func respawn_commons() -> void:
	for i in ent_defs.size():
		var d: Dictionary = ent_defs[i]
		if d["type"] in ["enemy", "wild"]:
			var n = ent_nodes.get(i)
			if n == null or not is_instance_valid(n) or not n.alive_flag:
				ent_nodes.erase(i)
				_spawn_def(i, player.global_position)

func _on_flag_changed(name: String, _v: bool) -> void:
	if map.is_empty():
		return
	refresh_tiles()
	refresh_entities()
	if name == "tmp_enc_galeria_ativo" or name.begins_with("tmp_"):
		pass

func _on_team_changed() -> void:
	if not map.is_empty() and player != null and Game.in_game:
		refresh_companion(false)

# =============================================================== COMPANHEIRO
func refresh_companion(fx: bool) -> void:
	var ac := Game.active_ind()
	if companion != null and is_instance_valid(companion):
		if not ac.is_empty() and companion.ind["uuid"] == ac["uuid"] and companion.species["sprite"] == Game.sp_of(ac)["sprite"]:
			return
		companion.queue_free()
		companion = null
	if ac.is_empty():
		return
	var c := Companion.new()
	c.init(self, ac)
	c.position = safe_pos_near(player.global_position)
	ysort.add_child(c)
	companion = c
	if fx:
		spark(c.global_position + Vector2(0, -8), 8)

func on_companion_exhausted() -> void:
	refresh_companion(true)

## Antes de fechar portas de um encontro, garante que o companheiro esteja dentro da sala (a porta ainda está aberta).
func gather_companion(room: Rect2) -> void:
	if companion != null and is_instance_valid(companion) and not room.has_point(companion.global_position):
		companion.global_position = safe_pos_near(player.global_position)
		companion.velocity = Vector2.ZERO
		spark(companion.global_position + Vector2(0, -8), 6)

func companion_command() -> void:
	if companion == null or not is_instance_valid(companion):
		say("Nenhuma criatura ativa.")
		return
	var dir: Vector2 = player.aim_dir
	companion.command_skill(dir)

func cycle_behavior() -> void:
	var order := ["acompanhar", "atacar", "proteger", "preservar"]
	var i := order.find(Game.behavior)
	Game.behavior = order[(i + 1) % order.size()]
	var names := {"acompanhar": "Acompanhar", "atacar": "Atacar alvo", "proteger": "Proteger", "preservar": "Preservar (poupa criaturas com ≤20% de vida)"}
	say("Comportamento: " + names[Game.behavior])
	Audio.play("ui_move")

func safe_pos_near(p: Vector2) -> Vector2:
	var tx := int(floor(p.x / TILE)); var ty := int(floor(p.y / TILE))
	for r in range(1, 6):
		for j in range(-r, r + 1):
			for i in range(-r, r + 1):
				if max(abs(i), abs(j)) != r:
					continue
				var c := tile_char_at(Vector2((tx + i) * TILE + 8.0, (ty + j) * TILE + 8.0))
				if not is_solid_char(c):
					var q := Vector2((tx + i) * TILE + 8.0, (ty + j) * TILE + 8.0)
					if _solid_ent_near(q, 9.0):
						continue
					return q
	return p

func _solid_ent_near(q: Vector2, r: float) -> bool:
	for e in get_tree().get_nodes_in_group("ents"):
		if e.solid and e.global_position.distance_to(q) < r:
			return true
	return false

# =============================================================== CONSULTAS
func enemies() -> Array:
	return get_tree().get_nodes_in_group("enemies")

func targets() -> Array:
	var out: Array = []
	if player != null and player.state != Player.S.DEAD:
		out.append(player)
	if companion != null and is_instance_valid(companion) and companion.is_alive():
		out.append(companion)
	return out

func in_combat() -> bool:
	return combat_t > 0.0

func mouse_aiming() -> bool:
	if TouchControls.active:
		return false
	return Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) or Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT)

func set_hero_target(e: Node) -> void:
	hero_target = e
	hero_target_t = 3.0

func say(text: String) -> void:
	if ui:
		ui.toast(text)

# =============================================================== FRAME
func _physics_process(delta: float) -> void:
	if map.is_empty() or get_tree().paused:
		return
	arrival_t = max(0.0, arrival_t - delta)
	combat_t = max(0.0, combat_t - delta)
	Game.swap_cd = max(0.0, Game.swap_cd - delta)
	hero_target_t -= delta
	if hero_target != null and (not is_instance_valid(hero_target) or not hero_target.alive_flag or hero_target_t <= 0.0):
		hero_target = null
	for e in enemies():
		if e.kind == "dummy":
			continue
		if (e.target != null and e.st != Enemy.St.IDLE) or (e.capturable and e.angry_t > 0.0):
			if e.global_position.distance_to(player.global_position) < 240.0:
				combat_t = 3.0
				break
	_update_hero_target()
	_update_prompt()
	_update_exits()
	_update_encounters()
	_update_camera(delta)
	_update_darkness(delta)
	_update_heat(delta)
	_update_chapter_end()
	if light_boost_t > 0.0:
		light_boost_t -= delta

func _update_hero_target() -> void:
	if hero_target == null and player.state != Player.S.DEAD:
		var best: Node = null
		var bd := 90.0
		for e in enemies():
			if e.kind == "dummy" or not e.hittable():
				continue
			var to: Vector2 = e.global_position - player.global_position
			if to.length() < bd and abs(rad_to_deg(player.aim_dir.angle_to(to))) < 75.0:
				bd = to.length()
				best = e
		if best != null:
			hero_target = best
			hero_target_t = 1.0

func _update_prompt() -> void:
	current_prompt = ""
	current_prompt_ent = null
	if player.state != Player.S.FREE or get_tree().paused:
		return
	var best: Ent = null
	var bd := 1e9
	var origin := player.global_position + player.aim_dir * 6.0
	for e in get_tree().get_nodes_in_group("ents"):
		var p: String = e.prompt()
		if p == "":
			continue
		var d: float = origin.distance_to(e.global_position)
		var reach: float = e.reach + (4.0 if e.kind in ["npc", "shrine", "chest", "crate", "sign"] else 0.0)
		if d <= reach and d < bd:
			bd = d
			best = e
	if best != null:
		current_prompt = best.prompt()
		current_prompt_ent = best

func try_interact() -> void:
	if current_prompt_ent != null and is_instance_valid(current_prompt_ent):
		current_prompt_ent.interact(player)

func _update_exits() -> void:
	if transition_busy or arrival_t > 0.0 or player.state == Player.S.DEAD:
		return
	var p := player.global_position
	for d in ent_defs:
		if d["type"] != "exit" or not _def_visible(d):
			continue
		var r := Rect2(float(d["x"]) * TILE, float(d["y"]) * TILE, float(d["w"]) * TILE, float(d["h"]) * TILE)
		if r.has_point(p):
			if d.has("set_flag"):
				Game.set_flag(d["set_flag"])
			travel(d["to"], d["spawn"])
			return

func travel(to_map: String, spawn: String) -> void:
	if transition_busy:
		return
	transition_busy = true
	Game.save_block += 1
	player.set_busy(true)
	await ui.fade(1.0, 0.25)
	Game.save_block = max(0, Game.save_block - 1)
	load_map(to_map, spawn)
	player.set_busy(false)
	await ui.fade(0.0, 0.25)
	transition_busy = false
	autosave()

func autosave() -> void:
	save_now(0)

## Salva em estado estável. Se a posição não for segura, usa o checkpoint associado.
func save_now(slot: int) -> bool:
	if not Game.can_save():
		return false
	var loc := {"map": map_id, "spawn": "", "pos": [player.global_position.x, player.global_position.y]}
	var unsafe := in_combat() or player.state in [Player.S.DEAD, Player.S.CAPTURE] or is_solid_char(tile_char_at(player.global_position)) or active_boss != null
	if unsafe:
		loc = _checkpoint_location()
	Game.location = loc
	return SaveSys.save_game(slot, loc)

func _checkpoint_location() -> Dictionary:
	var cp: Dictionary = Game.checkpoint
	var pos: Array = cp.get("pos", [])
	if pos.is_empty():
		var s: Array = Data.maps[cp["map"]]["spawns"].get(cp.get("spawn", "default"), [2, 2])
		pos = [float(s[0]) * TILE + 8.0, float(s[1]) * TILE + 8.0]
	return {"map": cp["map"], "spawn": cp.get("spawn", "default"), "pos": pos}

func _update_camera(delta: float) -> void:
	shake_t = max(0.0, shake_t - delta)
	if shake_t > 0.0 and not Game.prefs.get("reduz_tremor", false):
		camera.offset = Vector2(randf_range(-1, 1), randf_range(-1, 1)).round() * shake_amp
	else:
		camera.offset = Vector2.ZERO
	# mapas menores que a tela ficam centralizados
	var vw := 480.0; var vh := 270.0
	camera.limit_right = max(W * TILE, int(vw)); camera.limit_bottom = max(H * TILE, int(vh))

func shake(amp: float, dur: float) -> void:
	shake_amp = amp
	shake_t = dur

func hitstop(sec: float) -> void:
	if test_mode or Game.prefs.get("reduz_flash", false):
		return
	_hit_token += 1
	var tok := _hit_token
	Engine.time_scale = 0.06
	await get_tree().create_timer(sec * 0.06 + 0.001, true, false, true).timeout
	if tok == _hit_token:
		Engine.time_scale = 1.0

# =============================================================== EFEITOS
func spawn_text(pos: Vector2, text: String, col: Color) -> void:
	var f := Fx.new()
	f.mode = "text"; f.text = text; f.color = col; f.life = 0.7
	f.position = pos
	fx_layer.add_child(f)

func fx_at(mode: String, pos: Vector2, life: float, rot := 0.0, sc := 1.0) -> Fx:
	var f := Fx.new()
	f.mode = mode; f.life = life
	f.position = pos
	f.rotation = rot
	f.scale = Vector2.ONE * sc
	fx_layer.add_child(f)
	return f

func spark(pos: Vector2, n: int = 5) -> void:
	fx_at("spark", pos, 0.2)

func dust(pos: Vector2) -> void:
	fx_at("dust", pos, 0.3)

func add_fx(n: Node2D) -> void:
	fx_layer.add_child(n)

func bolt(from: Vector2, to: Vector2, col: Color, cb: Callable) -> void:
	var f := Fx.new()
	f.mode = "bolt"; f.color = col; f.life = 0.18
	f.position = from; f.to = to
	f.on_end = cb
	fx_layer.add_child(f)

func fx_roots(center: Vector2, rad: float) -> void:
	var f := Fx.new()
	f.mode = "roots"; f.life = 3.0; f.radius = rad
	f.position = center
	ysort.add_child(f)

func fx_pulse(center: Vector2, rad: float) -> void:
	var f := Fx.new()
	f.mode = "pulse"; f.life = 0.3; f.radius = rad
	f.position = center
	fx_layer.add_child(f)

func eco_raiz_viva(center: Vector2) -> void:
	var sk: Dictionary = Data.skills["raiz_viva"]
	fx_roots(center, float(sk["raio"]))
	Audio.play("roots")
	for e in enemies():
		if e.hittable() and e.global_position.distance_to(center) <= float(sk["raio"]) + e.radius and e.kind != "dummy":
			e.root(float(sk["duracao"]))
			e.take_damage(float(sk["dano"]) + Game.hero_atk() * 0.3, center, {"src": "heroi", "knock": 0.0, "aff": "flora"})

func light_pulse(center: Vector2, rad: float) -> void:
	light_boost_t = 4.0
	for e in get_tree().get_nodes_in_group("ents"):
		if e.kind == "flower" and not e.lit and e.global_position.distance_to(center) <= rad + 8.0:
			e.light(false)

func _update_darkness(delta: float) -> void:
	if not dark_on:
		return
	var sp: Vector2 = get_viewport().get_canvas_transform() * player.global_position
	dark_mat.set_shader_parameter("center", sp)
	var bonus := 0.0
	if companion != null and is_instance_valid(companion):
		bonus = 45.0 * companion.light_bonus()
	if light_boost_t > 0.0:
		bonus += 40.0
	dark_mat.set_shader_parameter("radius", dark_radius + bonus)
	dark_mat.set_shader_parameter("strength", 0.62)

func set_darkness(on: bool) -> void:
	dark_on = on
	darkness.visible = on

# =============================================================== DIÁLOGO / NPC / SANTUÁRIO
func pick_variant(did: String) -> Dictionary:
	for v in Data.dialogs.get(did, []):
		if v.has("if") and not Game.has_flag(v["if"]):
			continue
		if v.has("unless") and Game.has_flag(v["unless"]):
			continue
		if v.has("if_item") and Game.item_count(v["if_item"]) <= 0:
			continue
		return v
	return {"lines": ["..."]}

func talk_to(npc: Ent) -> void:
	start_dialog(npc.def["dialog"], npc)

func start_dialog(did: String, speaker: Node = null) -> void:
	var v := pick_variant(did)
	player.set_busy(true)
	ui.dialog(v["lines"], func():
		for f in v.get("set", []):
			Game.set_flag(f)
		for k in v.get("take", {}):
			Game.take_item(k, int(v["take"][k]))
		if v.has("give"):
			Game.give_loot(v["give"])
		if v.has("bond"):
			# missão de vínculo: conta uma vez para cada criatura da equipe
			for u in Game.team:
				Game.bond_activity(u, str(v["bond"]))
		player.set_busy(false)
		var shop = v.get("shop", false)
		if shop is String:
			ui.open_shop(shop)
		elif shop:
			ui.open_shop("ysa")
		elif v.get("forge", false):
			ui.open_forge())

func open_shrine(shrine: Ent) -> void:
	var first := not Game.has_flag("shrine_" + shrine.eid)
	Game.set_flag("shrine_" + shrine.eid)
	Game.checkpoint = {"map": map_id, "spawn": "", "pos": [shrine.global_position.x, shrine.global_position.y + 20.0], "shrine": shrine.eid}
	if map_id.begins_with("santuario"):
		Game.set_flag("viu_santuario_seiva")
	if first:
		say("Ponto de retorno gravado.")
		Audio.play("puzzle_ok")
	player.set_busy(true)
	ui.open_shrine_menu()

func rest_at_shrine() -> void:
	Game.heal_team()
	player.reset_resources()
	player.state = Player.S.INTERACT
	respawn_commons()
	refresh_companion(true)
	Game.tutorial_event("rest")
	Audio.play("heal")
	say("Equipe e herói recuperados.")

# =============================================================== ENIGMAS
func puzzle_flag(group: String) -> String:
	return map.get("puzzles", {}).get(group, {}).get("flag", "_")

func lever_state(group: String, idx: int) -> bool:
	var pz: Dictionary = map["puzzles"][group]
	if Game.has_flag(pz["flag"]):
		return int(pz["goal"][idx]) == 1
	return bool(lever_states[group][idx])

func lever_pull(group: String, idx: int) -> void:
	var pz: Dictionary = map["puzzles"][group]
	if Game.has_flag(pz["flag"]):
		say("A seiva já flui.")
		return
	for t in pz["toggles"][idx]:
		lever_states[group][t] = 1 - int(lever_states[group][t])
	lever_counts[group] += 1
	Audio.play("lever")
	for e in get_tree().get_nodes_in_group("ents"):
		if e.kind == "lever" and e.def["group"] == group:
			e.refresh_lever()
	var ok := true
	for i in lever_states[group].size():
		if int(lever_states[group][i]) != int(pz["goal"][i]):
			ok = false
	if ok:
		Audio.play("puzzle_ok")
		Game.set_flag(pz["flag"])
		say("A seiva sobe pelos canais!")
		for e in get_tree().get_nodes_in_group("ents"):
			if e.kind == "lever" and e.def["group"] == group:
				e.refresh_lever()
	elif lever_counts[group] >= int(pz.get("dica_apos", 3)):
		say(pz.get("dica", ""))

func puzzle_changed(group: String) -> void:
	var groups: Array = [group]
	if group == "*":
		groups = map.get("puzzles", {}).keys()
	for g in groups:
		var pz: Dictionary = map.get("puzzles", {}).get(g, {})
		if pz.is_empty() or Game.has_flag(pz["flag"]):
			continue
		if pz["type"] == "flowers":
			var all := true; var n := 0
			for e in get_tree().get_nodes_in_group("ents"):
				if e.kind == "flower" and e.def["group"] == g:
					n += 1
					if not e.lit:
						all = false
			if all and n > 0:
				Audio.play("puzzle_ok")
				Game.set_flag(pz["flag"])
				say("As flores-lanterna revelam o caminho!")
		elif pz["type"] == "furnaces":
			var allf := true; var nf := 0
			for e in get_tree().get_nodes_in_group("ents"):
				if e.kind == "furnace" and e.def.get("group", "") == g:
					nf += 1
					if not e.lit:
						allf = false
			if allf and nf > 0:
				Audio.play("puzzle_ok")
				Game.set_flag(pz["flag"])
				say(pz.get("msg", "As fornalhas rugem juntas! Algo se abriu."))
		elif pz["type"] == "plates":
			var allp := true; var np := 0
			for e in get_tree().get_nodes_in_group("ents"):
				if e.kind == "plate" and e.def["group"] == g:
					np += 1
					if not (e.pressed_by_crate or e.held):
						allp = false
			if allp and np > 0:
				Audio.play("puzzle_ok")
				Game.set_flag(pz["flag"])
				say("As placas cedem. Algo se abriu.")

func crate_on(pos: Vector2) -> bool:
	for e in get_tree().get_nodes_in_group("ents"):
		if (e.kind == "crate" or e.kind == "cart") and not e.moving and e.global_position.distance_to(pos) < 6.0:
			return true
	return false

func cell_free_for_crate(pos: Vector2, me: Node) -> bool:
	if tile_solid_at(pos):
		return false
	for e in get_tree().get_nodes_in_group("ents"):
		if e != me and e.solid and e.global_position.distance_to(pos) < 10.0:
			return false
	for e in enemies():
		if e.global_position.distance_to(pos) < 11.0:
			return false
	if player.global_position.distance_to(pos) < 9.0:
		return false
	return true

func reset_room_puzzles() -> void:
	## Reinicia caixas e alavancas ainda não resolvidas (evita travar por caixa encurralada).
	const RESET := ["crate", "lever", "flower", "plate", "cart", "furnace", "rail_lever", "brazier"]
	for i in ent_defs.size():
		var d: Dictionary = ent_defs[i]
		if d["type"] in RESET:
			var n = ent_nodes.get(i)
			if n != null and is_instance_valid(n):
				n.queue_free()
			ent_nodes.erase(i)
		elif d["type"] == "valve" and (d.has("dura") or str(d.get("flag", "")).begins_with("tmp_")):
			Game.set_flag(d["flag"], false)      # válvulas temporizadas do rito voltam a fechar
		elif d["type"] == "rail_lever":
			pass
		if d["type"] == "rail_lever":
			rail_switch[d["id"]] = str(d.get("start", "a"))
	for g in map.get("puzzles", {}):
		var pz: Dictionary = map["puzzles"][g]
		if pz["type"] == "levers":
			lever_states[g] = (pz["start"] as Array).duplicate()
			lever_counts[g] = 0
	furnace_fails.clear()
	player.carry_fire_t = 0.0
	await get_tree().process_frame
	for i in ent_defs.size():
		if ent_defs[i]["type"] in RESET:
			_spawn_def(i)

# =============================================================== ENCONTROS
func _update_encounters() -> void:
	for d in ent_defs:
		if d["type"] == "encounter":
			var done: bool = Game.has_flag(d["flag_done"])
			if done:
				continue
			var r := Rect2(float(d["x"]) * TILE, float(d["y"]) * TILE, float(d["w"]) * TILE, float(d["h"]) * TILE).grow(-8.0)
			var alive := 0
			for e in enemies():
				if e.enc_id == d["id"] and e.alive_flag:
					alive += 1
			if not Game.has_flag(d["flag_active"]):
				if r.has_point(player.global_position) and alive > 0 and arrival_t <= 0.0:
					gather_companion(r.grow(8.0))
					Game.set_flag(d["flag_active"])
					Audio.play("door")
					say("As portas se fecharam!")
			elif alive == 0:
				Game.set_flag(d["flag_done"])
				Game.set_flag(d["flag_active"], false)
				Audio.play("puzzle_ok")
				say("As portas se abriram.")
	for i in boss_nodes.keys():
		var b = boss_nodes[i]
		if not is_instance_valid(b):
			continue
		if not b.activated and b.alive_flag:
			var d2: Dictionary = ent_defs[i]
			var r2 := Rect2(float(d2["x0"]) * TILE, float(d2["y0"]) * TILE, float(d2["w"]) * TILE, float(d2["h"]) * TILE).grow(-16.0)
			if r2.has_point(player.global_position) and arrival_t <= 0.0:
				b.activate()

func enemy_died(e: Node) -> void:
	if e == hero_target:
		hero_target = null

func boss_started(b: Node) -> void:
	active_boss = b
	ui.boss_bar(b)
	Audio.music("chefao")

func boss_finished(b: Node) -> void:
	active_boss = null
	ui.boss_bar(null)
	Audio.music(map.get("music", ""))

# =============================================================== MORTE E RETOMADA
func on_player_died() -> void:
	if _death_pending:
		return
	_death_pending = true
	Game.stats["mortes"] = int(Game.stats["mortes"]) + 1
	frozen = true
	await get_tree().create_timer(1.3).timeout
	await ui.fade(1.0, 0.5)
	var lost := int(floor(Game.fragments * 0.10))
	Game.last_death = {"antes": Game.fragments, "perdidos": lost, "mapa": map_id}
	Game.fragments -= lost
	Game.inventory_changed.emit()
	Game.heal_team()
	frozen = false
	Game.save_block = 0
	var cp := _checkpoint_location()
	Game.clear_tmp_flags()
	if ui:
		ui.boss_bar(null)
	load_map(cp["map"], cp.get("spawn", "default"), Vector2(float(cp["pos"][0]), float(cp["pos"][1])))
	player.reset_resources()
	player.state = Player.S.FREE
	await ui.fade(0.0, 0.5)
	_death_pending = false
	say("Você retornou ao santuário. Perdeu %d fragmentos." % lost)

# =============================================================== CENAS
func _vila_return_scene() -> void:
	Game.set_flag("voltou_vila")
	await get_tree().create_timer(0.8).timeout
	player.set_busy(true)
	ui.dialog(["As raízes recuaram da vila e as flores abriram por toda parte.", "A família Corvelo voltou para casa, e a passagem ao norte, para o Desfiladeiro do Eco, está aberta.",
		"Só a Raiz Viva pode construir uma ponte sobre a ravina: vá até lá e aperte E no suporte marcado."], func():
		player.set_busy(false)
		autosave())

func _update_chapter_end() -> void:
	for d in ent_defs:
		if d["type"] == "chapter_end" and not Game.has_flag("fim_cap1"):
			var r := Rect2(float(d["x"]) * TILE, float(d["y"]) * TILE, float(d["w"]) * TILE, float(d["h"]) * TILE)
			if r.has_point(player.global_position) and player.state == Player.S.FREE:
				Game.set_flag("fim_cap1")
				var mins := int(Game.play_time / 60.0)
				player.set_busy(true)
				ui.dialog(["FIM DO CAPÍTULO 1 — Floresta dos Esquecidos.",
					"Herói nível %d • %d capturas • %d mortes • %d min de jogo." % [Game.hero_level(), int(Game.stats["capturas"]), int(Game.stats["mortes"]), mins],
					"CAPÍTULO 2 — Minas da Brasa. A boca da mina leva à Forja de Cobre, ao norte.",
					"(Pântano dos Sussurros, Fortaleza do Eclipse e Catedral do Vazio ainda estão em desenvolvimento.)"], func():
					player.set_busy(false)
					autosave())

func _forja_return_scene() -> void:
	Game.set_flag("voltou_forja")
	await get_tree().create_timer(0.8).timeout
	player.set_busy(true)
	ui.dialog(["O calor bom voltou às pedras: as forjas da Forja de Cobre se acenderam outra vez.",
		"A família Ruivo, presa na Fundição, está de volta, e o vapor da grande forja moveu o elevador da praça leste.",
		"Com a Ruptura Ígnea você pode quebrar rochas fissuradas — há uma no muro leste da vila — e o Rito da Forja guarda uma prova avançada."], func():
		player.set_busy(false)
		autosave())

# =============================================================== CALOR (Região 2)
## Piso quente `Q` e poças de escória ferem herói e criaturas a cada HEAT_TICK; `q` (resfriado) não.
func is_hot_at(p: Vector2) -> bool:
	if tile_char_at(p) == "Q":
		return true
	for h in get_tree().get_nodes_in_group("hazards"):
		if h.hot and h.global_position.distance_to(p) <= h.radius:
			return true
	return false

func _update_heat(delta: float) -> void:
	heat_t += delta
	if heat_t < HEAT_TICK:
		return
	heat_t = 0.0
	if transition_busy or frozen or arrival_t > 0.0:
		return
	if player.state != Player.S.DEAD and player.state != Player.S.INTERACT and is_hot_at(player.global_position):
		player.env_damage(HEAT_DMG_HERO * Game.heat_mult(), "Quente!")
		if not heat_warned:
			heat_warned = true
			say("Piso em brasa! Gire uma válvula azul (E) para resfriá-lo ou atravesse depressa.")
	if companion != null and is_instance_valid(companion) and companion.is_alive() and is_hot_at(companion.global_position):
		companion.env_damage(HEAT_DMG_CREATURE)
	for e in enemies():
		if e.kind == "dummy" or e.boss or e.heat_immune() or not e.hittable():
			continue
		if is_hot_at(e.global_position):
			e.heat_damage(HEAT_DMG_CREATURE)

func add_hazard(pos: Vector2, rad: float, life: float) -> Node2D:
	var h: Node2D = preload("res://scripts/hazard.gd").new()
	h.world = self
	h.radius = rad
	h.life = life
	h.position = pos
	ysort.add_child(h)
	return h

func smoke_cloud(pos: Vector2, rad: float, life: float) -> Node2D:
	var h: Node2D = preload("res://scripts/hazard.gd").new()
	h.world = self
	h.mode = "smoke"
	h.hot = false
	h.radius = rad
	h.life = life
	h.position = pos
	fx_layer.add_child(h)
	return h

func steam_at(pos: Vector2, life := 1.2) -> void:
	fx_at("steam", pos, life)

func spawn_projectile(from: Vector2, dir: Vector2, dmg: float, owner: Node, mode := "tool") -> Node2D:
	var pr: Node2D = preload("res://scripts/projectile.gd").new()
	pr.world = self
	pr.mode = mode
	pr.dir = dir.normalized()
	pr.damage = dmg
	pr.owner_ref = owner
	pr.position = from
	fx_layer.add_child(pr)
	return pr

# =============================================================== VÁLVULAS
func valve_use(v: Ent) -> void:
	if v.def.get("boss", false):
		if active_boss != null and is_instance_valid(active_boss) and active_boss.has_method("on_valve"):
			active_boss.on_valve(v)
		else:
			say("A válvula de água está emperrada: só gira quando o mecanismo da arena desperta.")
		return
	var flag: String = v.def["flag"]
	if v.def.has("dura"):
		# válvula de vapor temporizada (rito): abre por alguns segundos e fecha sozinha
		if Game.has_flag(flag):
			say("A válvula já está aberta.")
			return
		Game.set_flag(flag)
		v.timer = float(v.def["dura"])
	else:
		Game.set_flag(flag, not Game.has_flag(flag))
	Audio.play("lever")
	Audio.play("bridge", -10.0)
	steam_at(v.global_position + Vector2(0, -10))
	for c in map.get("conditional", []):
		var area: Array = c.get("area", [])
		if area.size() == 4 and (c.get("if", "") == flag or c.get("unless", "") == flag):
			for k in 4:
				steam_at(Vector2((float(area[0]) + randf() * float(area[2])) * TILE, (float(area[1]) + randf() * float(area[3])) * TILE), 1.0)
	say("Vapor frio sibila pelas grades." if Game.has_flag(flag) else "A válvula fecha: o piso volta a esquentar.")
	if companion != null and is_instance_valid(companion):
		pass

# =============================================================== FORNALHAS / FOGO
## Acende uma fornalha: pelo herói com chama do braseiro, por um Faisquito ativo por perto (mais rápido) ou pela Ruptura Ígnea.
func furnace_try(f: Ent) -> void:
	if f.lit:
		return
	if f.def.get("so_ruptura", false):
		say("Mecanismo térmico marcado: só uma explosão de calor o desperta (Ruptura Ígnea, tecla do Eco).")
		_furnace_fail(f)
		return
	var ac := Game.active_ind()
	if not ac.is_empty() and Game.sp_of(ac).get("acao_id", "") == "fogo" and companion != null and is_instance_valid(companion) \
			and companion.global_position.distance_to(f.global_position) < 140.0:
		companion.env_action_fx(f.global_position)
		Game.bond_activity(ac["uuid"], "acao:" + f.eid)
		f.light_furnace()
		say("%s soprou brasa na fornalha!" % Game.creature_name(ac))
		return
	if player.carry_fire_t > 0.0:
		player.carry_fire_t = 0.0
		f.light_furnace()
		say("A chama pegou na fornalha.")
		return
	say("A fornalha está fria. Pegue chama num braseiro (E) e traga até aqui — ou peça a um Faisquito.")
	_furnace_fail(f)

func _furnace_fail(f: Ent) -> void:
	var g: String = f.def.get("group", "")
	if g == "":
		return
	furnace_fails[g] = int(furnace_fails.get(g, 0)) + 1
	var pz: Dictionary = map.get("puzzles", {}).get(g, {})
	if int(furnace_fails[g]) >= int(pz.get("dica_apos", 3)) and pz.get("dica", "") != "":
		say(pz["dica"])

func furnace_went_out(f: Ent) -> void:
	say("Uma fornalha esfriou antes das outras acenderem.")
	_furnace_fail(f)

func take_fire(b: Ent) -> void:
	player.carry_fire_t = float(b.def.get("chama", 9.0))
	Audio.play("skill", -6.0)
	say("Você pegou uma chama (%.0f s). Leve-a até uma fornalha fria." % player.carry_fire_t)

## Fogo em cone (Faisquito) ou explosão (Ruptura) acende fornalhas atingidas.
func fire_area(origin: Vector2, dir: Vector2, rad: float, arc: float, src: String) -> int:
	var n := 0
	for e in get_tree().get_nodes_in_group("ents"):
		if e.kind != "furnace" or e.lit:
			continue
		if e.def.get("so_ruptura", false) and src != "ruptura":
			continue
		if Combat.in_arc(origin, dir, rad, arc, e.global_position, 8.0):
			e.light_furnace()
			n += 1
			if src == "companion":
				var ac := Game.active_ind()
				if not ac.is_empty():
					Game.bond_activity(ac["uuid"], "acao:" + e.eid)
	return n

# =============================================================== ECO: RUPTURA ÍGNEA
func eco_ruptura(center: Vector2, dir: Vector2) -> void:
	var sk: Dictionary = Data.skills["ruptura_ignea"]
	var rad := float(sk["raio"])
	for k in 5:
		fx_at("fire", center + Vector2.from_angle(TAU * k / 5.0) * rad * 0.5, 0.5, 0.0, 1.4)
	fx_at("hit", center, 0.3, 0.0, 2.2)
	Audio.play("thud")
	shake(2.5, 0.25)
	for e in enemies():
		if e.hittable() and e.kind != "dummy" and e.global_position.distance_to(center) <= rad + e.radius:
			e.take_damage(float(sk["dano"]) + Game.hero_atk() * 0.5, center, {"src": "heroi", "knock": 90.0, "aff": "brasa"})
	for e in get_tree().get_nodes_in_group("ents"):
		if e.kind == "crack" and e.global_position.distance_to(center) <= rad + 20.0:
			e.break_rock()
	fire_area(center - dir * 30.0, dir, rad + 30.0, 70.0, "ruptura")

# =============================================================== CARRINHOS SOBRE TRILHOS
func is_rail(c: Vector2i) -> bool:
	return RAILS.contains(_ch(c.x, c.y))

func switch_at(c: Vector2i) -> Dictionary:
	for d in ent_defs:
		if d["type"] == "rail_lever" and int(d["at"][0]) == c.x and int(d["at"][1]) == c.y:
			return d
	return {}

func rail_lever_toggle(l: Ent) -> void:
	var id: String = l.def["id"]
	rail_switch[id] = "b" if rail_switch.get(id, "a") == "a" else "a"
	Audio.play("lever")
	l.refresh_rail_lever()
	var dv: Array = l.def[rail_switch[id]]
	say("Desvio: o trilho agora segue para %s." % _dir_name(Vector2(float(dv[0]), float(dv[1]))))

func _dir_name(v: Vector2) -> String:
	if abs(v.x) > abs(v.y):
		return "o leste" if v.x > 0 else "o oeste"
	return "o sul" if v.y > 0 else "o norte"

## Próxima direção do carrinho ao chegar à célula `c` vindo na direção `d` (Vector2i.ZERO = parar).
func cart_next_dir(c: Vector2i, d: Vector2i) -> Vector2i:
	var sw := switch_at(c)
	if not sw.is_empty():
		var dv: Array = sw[rail_switch.get(sw["id"], "a")]
		var sd := Vector2i(int(dv[0]), int(dv[1]))
		if sd != -d and is_rail(c + sd):
			return sd
	if is_rail(c + d):
		return d
	var turns: Array = []
	for t in [Vector2i(d.y, d.x), Vector2i(-d.y, -d.x)]:
		if is_rail(c + t):
			turns.append(t)
	if turns.size() == 1:
		return turns[0]
	return Vector2i.ZERO

func cart_cell_free(p: Vector2, me: Node) -> bool:
	for e in get_tree().get_nodes_in_group("ents"):
		if e != me and e.solid and e.global_position.distance_to(p) < 10.0:
			return false
	for e in enemies():
		if e.global_position.distance_to(p) < 10.0:
			return false
	if player.global_position.distance_to(p) < 9.0:
		return false
	return true

# =============================================================== INTERAÇÕES DE CRIATURA (marcadores)
func creature_action(e: Ent, acao: String, ok_msg: String, no_msg: String) -> bool:
	var ac := Game.active_ind()
	if ac.is_empty() or Game.sp_of(ac).get("acao_id", "") != acao or companion == null or not is_instance_valid(companion):
		say(no_msg)
		return false
	companion.env_action_fx(e.global_position)
	Game.bond_activity(ac["uuid"], "acao:" + e.eid)
	say(ok_msg % Game.creature_name(ac))
	return true

# =============================================================== RITO DA FORJA
func rite_reset(_e: Ent) -> void:
	if in_combat():
		say("Não é possível durante o combate.")
		return
	reset_room_puzzles()
	Audio.play("puzzle_no")
	say("O rito recomeça: fornalhas apagadas e válvulas do rito fechadas. Nada do que você carrega foi perdido.")

func rite_altar(a: Ent) -> void:
	var flag: String = a.def["flag"]
	if Game.has_flag(flag):
		return
	var req: String = a.def.get("requires", "")
	if req != "" and not Game.has_flag(req):
		say(a.def.get("msg_falta", "Os mecanismos do rito ainda não estão acesos."))
		return
	Game.set_flag(flag)
	if a.sprite:
		a.sprite.region_rect = Rect2(16, 0, 16, 16)      # rite_altar_on
	Audio.play("levelup")
	shake(1.5, 0.3)
	for k in 6:
		fx_at("fire", a.global_position + Vector2.from_angle(TAU * k / 6.0) * 26.0, 0.8)
	if a.def.has("loot"):
		Game.give_loot(a.def["loot"])
	var bond: String = a.def.get("bond", "")
	if bond != "":
		var ac := Game.active_ind()
		if not ac.is_empty() and Game.bond_activity(ac["uuid"], bond):
			say("%s sentiu o rito com você: vínculo fortalecido!" % Game.creature_name(ac))
	player.set_busy(true)
	ui.dialog(a.def.get("lines", ["O rito está completo."]), func():
		player.set_busy(false)
		autosave())
