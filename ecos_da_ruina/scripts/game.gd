extends Node
## Estado global do jogo e regras de progressão (herói, equipe, santuário, inventário, missões, Ecos).
## A interface apenas observa este estado e envia comandos; nada de dano/flags de chefão é calculado na UI.

signal flag_changed(name: String, value: bool)
signal hero_changed
signal team_changed
signal inventory_changed
signal toast(text: String)
signal quest_changed
signal creature_captured(ind: Dictionary, destino: String)
signal eco_changed
signal level_up(who: String, level: int)

const SAVE_VERSION := 1
const SANCTUARY_CAP := 90
const TEAM_MAX := 3
const SWAP_CD := 6.0
const HERO_MAX_LEVEL := 30
const CREATURE_MAX_LEVEL := 30
const CAPTURE_HP_LIMIT := 0.35
const MIN_BOND_ACTIVITIES := 3

# ---- estado persistente (vai para o save)
var hero := {}
var inventory := {}
var fragments := 0
var equipment := {"arma": "espada_viajante", "protecao": "", "amuleto": ""}
var individuals := {}
var team: Array = []
var sanctuary: Array = []
var active_idx := 0
var flags := {}
var chests := {}
var ecos := {}
var eco_slots := ["", ""]
var bestiary := {}
var location := {"map": "vila_lumen", "spawn": "default", "pos": []}
var checkpoint := {"map": "vila_lumen", "spawn": "default", "shrine": "vila"}
var stats := {"kills": {}, "capturas": 0, "mortes": 0}
var play_time := 0.0
var difficulty := "aventura"
var behavior := "preservar"
var slot := 1

# ---- estado de execução (não vai para o save)
var tmp_flags := {}
var swap_cd := 0.0
var skill_cd := {}          # uuid -> segundos restantes
var save_block := 0         # > 0 impede salvar (captura, transição)
var in_game := false
var rng := RandomNumberGenerator.new()
var rng_override: Callable = Callable()   # testes: func() -> float
var god_mode := false
var last_death := {}
var dmg_stats := {}

# ---- preferências (arquivo separado)
var prefs := {"master": 0.8, "musica": 0.6, "efeitos": 0.8, "texto": 1.0, "reduz_tremor": false, "reduz_flash": false,
	"formas_perigo": true, "keys": {}}

const DEFAULT_KEYS := {
	"move_up": [KEY_W, KEY_UP], "move_down": [KEY_S, KEY_DOWN], "move_left": [KEY_A, KEY_LEFT], "move_right": [KEY_D, KEY_RIGHT],
	"attack": [KEY_J], "guard": [KEY_K], "dodge": [KEY_SPACE], "interact": [KEY_E], "skill": [KEY_Q], "swap": [KEY_TAB],
	"capture": [KEY_F], "eco1": [KEY_1], "eco2": [KEY_2], "consumable": [KEY_R], "inventory": [KEY_I], "pause": [KEY_ESCAPE],
	"behavior": [KEY_C],
}
const ACTION_NAMES := {
	"move_up": "Mover para cima", "move_down": "Mover para baixo", "move_left": "Mover à esquerda", "move_right": "Mover à direita",
	"attack": "Ataque", "guard": "Defesa", "dodge": "Esquiva", "interact": "Interagir", "skill": "Habilidade da criatura",
	"swap": "Trocar criatura", "capture": "Capturar (selo)", "eco1": "Eco 1", "eco2": "Eco 2", "consumable": "Consumível",
	"inventory": "Menu / equipe", "pause": "Pausa", "behavior": "Comportamento",
}

func _ready() -> void:
	rng.randomize()
	load_prefs()
	setup_input()

# =============================================================== ENTRADA / PREFERÊNCIAS
func setup_input() -> void:
	for act in DEFAULT_KEYS:
		if not InputMap.has_action(act):
			InputMap.add_action(act, 0.2)
		InputMap.action_erase_events(act)
		var keys: Array = prefs["keys"].get(act, DEFAULT_KEYS[act])
		for k in keys:
			var ev := InputEventKey.new()
			ev.physical_keycode = int(k)
			InputMap.action_add_event(act, ev)
	var mb := InputEventMouseButton.new(); mb.button_index = MOUSE_BUTTON_LEFT
	InputMap.action_add_event("attack", mb)
	var mb2 := InputEventMouseButton.new(); mb2.button_index = MOUSE_BUTTON_RIGHT
	InputMap.action_add_event("guard", mb2)
	# menus: WASD + E também navegam e confirmam
	for pair in [["ui_up", KEY_W], ["ui_down", KEY_S], ["ui_left", KEY_A], ["ui_right", KEY_D], ["ui_accept", KEY_E]]:
		var ev := InputEventKey.new(); ev.physical_keycode = pair[1]
		InputMap.action_add_event(pair[0], ev)

func rebind(action: String, keycode: int) -> void:
	prefs["keys"][action] = [keycode]
	setup_input()
	save_prefs()

func reset_keys() -> void:
	prefs["keys"] = {}
	setup_input()
	save_prefs()

func load_prefs() -> void:
	if FileAccess.file_exists("user://prefs.json"):
		var d = JSON.parse_string(FileAccess.get_file_as_string("user://prefs.json"))
		if d is Dictionary:
			for k in d:
				prefs[k] = d[k]

func save_prefs() -> void:
	var f := FileAccess.open("user://prefs.json", FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(prefs))

# =============================================================== ALEATORIEDADE CONTROLÁVEL
func rand_f() -> float:
	if rng_override.is_valid():
		return rng_override.call()
	return rng.randf()

# =============================================================== NOVO JOGO / SAVE
func new_game(p_slot: int = 1) -> void:
	slot = p_slot
	hero = {"level": 1, "xp": 0, "hp": 100.0, "talent_points": 0, "talents": {"espada": 0, "resistencia": 0, "vinculo": 0}}
	inventory = {"selo_basico": 0, "pocao": 0, "espada_viajante": 1}
	fragments = 0
	equipment = {"arma": "espada_viajante", "protecao": "", "amuleto": ""}
	individuals = {}
	team = []
	sanctuary = []
	active_idx = 0
	flags = {}
	chests = {}
	ecos = {}
	eco_slots = ["", ""]
	bestiary = {}
	location = {"map": "vila_lumen", "spawn": "default", "pos": []}
	checkpoint = {"map": "vila_lumen", "spawn": "default", "shrine": "vila"}
	stats = {"kills": {}, "capturas": 0, "mortes": 0}
	play_time = 0.0
	behavior = "preservar"
	tmp_flags = {}
	skill_cd = {}
	swap_cd = 0.0
	save_block = 0
	hero["hp"] = hero_max_hp()
	in_game = true
	hero_changed.emit(); team_changed.emit(); inventory_changed.emit(); quest_changed.emit()

func to_dict() -> Dictionary:
	return {"version": SAVE_VERSION, "hero": hero, "inventory": inventory, "fragments": fragments, "equipment": equipment,
		"individuals": individuals, "team": team, "sanctuary": sanctuary, "active_idx": active_idx, "flags": flags,
		"chests": chests, "ecos": ecos, "eco_slots": eco_slots, "bestiary": bestiary, "location": location,
		"checkpoint": checkpoint, "stats": stats, "play_time": play_time, "difficulty": difficulty, "behavior": behavior, "slot": slot}

func validate_save(d: Dictionary) -> String:
	if int(d.get("version", -1)) != SAVE_VERSION:
		return "versão de save incompatível"
	for k in ["hero", "inventory", "individuals", "team", "flags", "location", "checkpoint"]:
		if not d.has(k):
			return "campo ausente: " + k
	for u in d["team"]:
		if not d["individuals"].has(u):
			return "equipe referencia indivíduo inexistente"
	for u in d["individuals"]:
		if not Data.species.has(d["individuals"][u].get("species_id", "")):
			return "espécie inexistente no save"
	if not Data.maps.has(d["location"].get("map", "")):
		return "mapa inexistente no save"
	return ""

func from_dict(d: Dictionary) -> bool:
	var err := validate_save(d)
	if err != "":
		push_error("Save inválido: " + err)
		return false
	hero = d["hero"]; inventory = d["inventory"]; fragments = int(d.get("fragments", 0)); equipment = d.get("equipment", equipment)
	individuals = d["individuals"]; team = d["team"]; sanctuary = d.get("sanctuary", []); active_idx = int(d.get("active_idx", 0))
	flags = d["flags"]; chests = d.get("chests", {}); ecos = d.get("ecos", {}); eco_slots = d.get("eco_slots", ["", ""])
	bestiary = d.get("bestiary", {}); location = d["location"]; checkpoint = d["checkpoint"]
	stats = d.get("stats", stats); play_time = float(d.get("play_time", 0.0)); difficulty = d.get("difficulty", "aventura")
	behavior = d.get("behavior", "preservar"); slot = int(d.get("slot", 1))
	tmp_flags = {}; skill_cd = {}; swap_cd = 0.0; save_block = 0
	in_game = true
	_normalize_types()
	hero["hp"] = min(float(hero.get("hp", 1.0)), hero_max_hp())
	hero_changed.emit(); team_changed.emit(); inventory_changed.emit(); quest_changed.emit(); eco_changed.emit()
	return true

## O JSON devolve números como float; restaura inteiros onde o jogo espera inteiros.
func _normalize_types() -> void:
	for k in inventory.keys():
		inventory[k] = int(inventory[k])
	fragments = int(fragments)
	for k in ["level", "xp", "talent_points"]:
		hero[k] = int(hero.get(k, 0))
	for k in hero["talents"].keys():
		hero["talents"][k] = int(hero["talents"][k])
	for u in individuals:
		var ind: Dictionary = individuals[u]
		ind["nivel"] = int(ind["nivel"])
	for k in chests.keys():
		chests[k] = true
	stats["capturas"] = int(stats.get("capturas", 0))
	stats["mortes"] = int(stats.get("mortes", 0))
	for k in stats.get("kills", {}).keys():
		stats["kills"][k] = int(stats["kills"][k])
	active_idx = int(active_idx)
	for b in bestiary.keys():
		pass

func can_save() -> bool:
	return in_game and save_block <= 0

# =============================================================== FLAGS
func set_flag(name: String, value: bool = true) -> void:
	if name.begins_with("tmp_"):
		if value:
			tmp_flags[name] = true
		else:
			tmp_flags.erase(name)
	else:
		if value:
			flags[name] = true
		else:
			flags.erase(name)
	flag_changed.emit(name, value)
	if not name.begins_with("tmp_"):
		quest_changed.emit()

func has_flag(name: String) -> bool:
	if name == "":
		return true
	if name.begins_with("tmp_"):
		return tmp_flags.has(name)
	return flags.has(name)

func clear_tmp_flags() -> void:
	for k in tmp_flags.keys():
		set_flag(k, false)

# =============================================================== HERÓI
func hero_level() -> int:
	return int(hero.get("level", 1))

func hero_max_hp() -> float:
	var hp = 100.0 + 8.0 * (hero_level() - 1) + 6.0 * hero["talents"].get("resistencia", 0)
	var am: String = equipment.get("amuleto", "")
	if am != "" and Data.items.has(am):
		hp += float(Data.items[am].get("hp", 0))
	return hp

func hero_atk() -> float:
	var a = 12.0 + 1.4 * (hero_level() - 1) + 2.0 * hero["talents"].get("espada", 0)
	var w: String = equipment.get("arma", "")
	if w != "" and Data.items.has(w):
		a += float(Data.items[w].get("dano", 0))
	return a

func hero_reduction() -> float:
	var r = 0.02 * hero["talents"].get("resistencia", 0)
	var p: String = equipment.get("protecao", "")
	if p != "" and Data.items.has(p):
		r += float(Data.items[p].get("reducao", 0))
	return clamp(r, 0.0, 0.5)

func capture_bonus() -> float:
	var b = 0.02 * hero["talents"].get("vinculo", 0)
	var am: String = equipment.get("amuleto", "")
	if am != "" and Data.items.has(am):
		b += float(Data.items[am].get("selo_chance", 0))
	return b

func enemy_damage_mult() -> float:
	return 0.75 if difficulty == "aventura" else 1.0

func warning_mult() -> float:
	return 1.2 if difficulty == "aventura" else 1.0

func xp_to_next(level: int) -> int:
	return 20 * level

func add_hero_xp(amount: int) -> void:
	if hero_level() >= HERO_MAX_LEVEL:
		return
	hero["xp"] = int(hero["xp"]) + amount
	while hero_level() < HERO_MAX_LEVEL and int(hero["xp"]) >= xp_to_next(hero_level()):
		hero["xp"] = int(hero["xp"]) - xp_to_next(hero_level())
		hero["level"] = hero_level() + 1
		if hero_level() % 3 == 0:
			hero["talent_points"] = int(hero["talent_points"]) + 1
		hero["hp"] = hero_max_hp()
		toast.emit("Herói chegou ao nível %d!" % hero_level())
		level_up.emit("heroi", hero_level())
	hero_changed.emit()

func spend_talent(kind: String) -> bool:
	if int(hero["talent_points"]) <= 0 or not hero["talents"].has(kind):
		return false
	hero["talent_points"] = int(hero["talent_points"]) - 1
	hero["talents"][kind] = int(hero["talents"][kind]) + 1
	hero["hp"] = min(float(hero["hp"]), hero_max_hp())
	hero_changed.emit()
	return true

func respec(cost: int = 50) -> bool:
	if fragments < cost:
		return false
	var total := 0
	for k in hero["talents"]:
		total += int(hero["talents"][k]); hero["talents"][k] = 0
	hero["talent_points"] = int(hero["talent_points"]) + total
	fragments -= cost
	hero_changed.emit(); inventory_changed.emit()
	return true

# =============================================================== CRIATURAS
func new_uuid() -> String:
	return "%d-%08x%04x" % [Time.get_unix_time_from_system(), randi(), individuals.size()]

func new_individual(species_id: String, level: int) -> Dictionary:
	var ind := {"uuid": new_uuid(), "species_id": species_id, "apelido": "", "nivel": level, "xp": 0, "hp": 1.0,
		"exausta": false, "vinculo": [], "origem": ""}
	ind["hp"] = creature_hp_max(ind)
	return ind

func sp_of(ind: Dictionary) -> Dictionary:
	return Data.species.get(ind.get("species_id", ""), {})

func creature_hp_max(ind: Dictionary) -> float:
	var s := sp_of(ind)
	return floor(float(s.get("hp_base", 30)) + float(s.get("hp_cresc", 4)) * (int(ind["nivel"]) - 1))

func creature_atk(ind: Dictionary) -> float:
	var s := sp_of(ind)
	return float(s.get("atk_base", 5)) + float(s.get("atk_cresc", 1)) * (int(ind["nivel"]) - 1)

func creature_name(ind: Dictionary) -> String:
	if ind.get("apelido", "") != "":
		return ind["apelido"]
	return sp_of(ind).get("nome", "?")

func creature_xp_to_next(level: int) -> int:
	return 18 * level

func mark_seen(species_id: String) -> void:
	var b: Dictionary = bestiary.get(species_id, {"visto": false, "capturado": false, "evoluiu": false})
	if not b["visto"]:
		b["visto"] = true
		bestiary[species_id] = b
		toast.emit("Bestiário: %s registrado." % Data.sp(species_id).get("nome", species_id))
	bestiary[species_id] = b

func mark_captured(species_id: String) -> void:
	var b: Dictionary = bestiary.get(species_id, {"visto": true, "capturado": false, "evoluiu": false})
	b["visto"] = true; b["capturado"] = true
	bestiary[species_id] = b

func storage_has_room() -> bool:
	return team.size() < TEAM_MAX or sanctuary.size() < SANCTUARY_CAP

## Registra a captura uma única vez (transação lógica). Retorna "equipe", "santuario" ou "cheio".
func register_capture(ind: Dictionary) -> String:
	if individuals.has(ind["uuid"]):
		return "duplicado"
	if not storage_has_room():
		return "cheio"
	individuals[ind["uuid"]] = ind
	var dest := "equipe"
	if team.size() < TEAM_MAX:
		team.append(ind["uuid"])
	else:
		sanctuary.append(ind["uuid"])
		dest = "santuario"
	mark_captured(ind["species_id"])
	stats["capturas"] = int(stats["capturas"]) + 1
	set_flag("primeira_captura")
	team_changed.emit()
	creature_captured.emit(ind, dest)
	return dest

func get_ind(uuid: String) -> Dictionary:
	return individuals.get(uuid, {})

func active_ind() -> Dictionary:
	if team.is_empty():
		return {}
	active_idx = clampi(active_idx, 0, team.size() - 1)
	var ind: Dictionary = individuals[team[active_idx]]
	if ind.get("exausta", false):
		return {}
	return ind

func alive_team_count() -> int:
	var n := 0
	for u in team:
		if not individuals[u].get("exausta", false):
			n += 1
	return n

## Troca manual: respeita recarga global de 6 s; não cura nem reinicia recargas individuais.
func swap_active(force: bool = false) -> bool:
	if team.size() < 2:
		return false
	if swap_cd > 0.0 and not force:
		return false
	for i in range(1, team.size() + 1):
		var j := (active_idx + i) % team.size()
		if not individuals[team[j]].get("exausta", false):
			if j == active_idx:
				return false
			active_idx = j
			if not force:
				swap_cd = SWAP_CD
			team_changed.emit()
			return true
	return false

func set_active(uuid: String) -> void:
	var i := team.find(uuid)
	if i >= 0 and not individuals[uuid].get("exausta", false):
		active_idx = i
		team_changed.emit()

func damage_creature(ind: Dictionary, amount: float) -> void:
	ind["hp"] = max(0.0, float(ind["hp"]) - amount)
	if float(ind["hp"]) <= 0.0:
		ind["exausta"] = true
		toast.emit("%s ficou exausta!" % creature_name(ind))
		# força a troca para a próxima criatura disponível (não conta como troca manual)
		if active_idx < team.size() and team[active_idx] == ind["uuid"]:
			swap_active(true)
		team_changed.emit()

func heal_team() -> void:
	for u in team:
		var ind: Dictionary = individuals[u]
		ind["hp"] = creature_hp_max(ind)
		ind["exausta"] = false
	for u in sanctuary:
		var ind2: Dictionary = individuals[u]
		ind2["hp"] = creature_hp_max(ind2)
		ind2["exausta"] = false
	hero["hp"] = hero_max_hp()
	team_changed.emit(); hero_changed.emit()

func revive_creature(uuid: String) -> bool:
	var ind: Dictionary = individuals.get(uuid, {})
	if ind.is_empty() or not ind.get("exausta", false):
		return false
	ind["exausta"] = false
	ind["hp"] = floor(creature_hp_max(ind) * 0.5)
	team_changed.emit()
	return true

func add_creature_xp(ind: Dictionary, amount: float) -> void:
	if int(ind["nivel"]) >= CREATURE_MAX_LEVEL:
		return
	ind["xp"] = float(ind["xp"]) + amount
	while int(ind["nivel"]) < CREATURE_MAX_LEVEL and float(ind["xp"]) >= creature_xp_to_next(int(ind["nivel"])):
		ind["xp"] = float(ind["xp"]) - creature_xp_to_next(int(ind["nivel"]))
		ind["nivel"] = int(ind["nivel"]) + 1
		var frac: float = float(ind["hp"]) / max(1.0, creature_hp_max(ind))
		toast.emit("%s chegou ao nível %d!" % [creature_name(ind), ind["nivel"]])
		level_up.emit(ind["uuid"], int(ind["nivel"]))
		if not ind.get("exausta", false):
			ind["hp"] = min(creature_hp_max(ind), float(ind["hp"]) + creature_hp_max(ind) * 0.25)
		else:
			ind["hp"] = 0.0
		var _unused := frac
	team_changed.emit()

## XP integral para cada criatura da equipe (uma vez por encontro). Reserva no santuário não recebe.
func award_encounter_xp(enemy_xp: int, enemy_level: int) -> void:
	if enemy_xp <= 0:
		return
	add_hero_xp(enemy_xp)
	for u in team:
		var ind: Dictionary = individuals[u]
		var f := 1.0
		if int(ind["nivel"]) - enemy_level >= 5:
			f = 0.5
		add_creature_xp(ind, float(enemy_xp) * f)

# ---- vínculo e evolução
func bond_activity(uuid: String, key: String) -> bool:
	var ind: Dictionary = individuals.get(uuid, {})
	if ind.is_empty() or key in ind["vinculo"]:
		return false
	ind["vinculo"].append(key)
	team_changed.emit()
	return true

func bond_count(ind: Dictionary) -> int:
	return ind.get("vinculo", []).size()

func evolution_status(ind: Dictionary) -> Dictionary:
	var ev = sp_of(ind).get("evolucao")
	if ev == null:
		return {"possivel": false, "motivo": "Sem evolução."}
	var need_lv := int(ev["nivel"])
	var ok_lv := int(ind["nivel"]) >= need_lv
	var ok_b := bond_count(ind) >= MIN_BOND_ACTIVITIES
	var motivo := ""
	if not ok_lv:
		motivo = "Precisa do nível %d." % need_lv
	elif not ok_b:
		motivo = "Precisa de 3 atividades de vínculo (%d/3)." % bond_count(ind)
	return {"possivel": ok_lv and ok_b, "motivo": motivo, "para": ev["para"], "nivel": need_lv}

func evolve(uuid: String) -> bool:
	var ind: Dictionary = individuals.get(uuid, {})
	if ind.is_empty():
		return false
	var st := evolution_status(ind)
	if not st["possivel"]:
		return false
	var ratio: float = float(ind["hp"]) / max(1.0, creature_hp_max(ind))
	ind["species_id"] = st["para"]   # uuid, apelido, vínculo e papel ambiental preservados
	ind["hp"] = floor(creature_hp_max(ind) * (1.0 if not ind.get("exausta", false) else 0.0) * max(ratio, 0.5))
	if ind.get("exausta", false):
		ind["hp"] = 0.0
	var b: Dictionary = bestiary.get(ind["species_id"], {"visto": true, "capturado": false, "evoluiu": false})
	b["visto"] = true; b["evoluiu"] = true
	bestiary[ind["species_id"]] = b
	toast.emit("%s evoluiu para %s!" % [creature_name(ind), Data.sp(ind["species_id"]).get("nome", "")])
	team_changed.emit()
	return true

# ---- santuário (armazenamento)
func move_to_team(uuid: String) -> bool:
	if team.size() >= TEAM_MAX or not sanctuary.has(uuid):
		return false
	sanctuary.erase(uuid); team.append(uuid)
	team_changed.emit()
	return true

func move_to_sanctuary(uuid: String) -> bool:
	if not team.has(uuid) or sanctuary.size() >= SANCTUARY_CAP or team.size() <= 1:
		return false
	var was_active: bool = team.size() > active_idx and team[active_idx] == uuid
	team.erase(uuid); sanctuary.append(uuid)
	active_idx = clampi(active_idx, 0, max(0, team.size() - 1))
	if was_active:
		active_idx = 0
	team_changed.emit()
	return true

## Libertar. Impede liberar a última criatura durante o tutorial.
func can_release(uuid: String) -> String:
	var total := team.size() + sanctuary.size()
	if not flags.has("tutorial_ok") or total <= 1:
		if total <= 1:
			return "Você precisa manter ao menos uma criatura."
	return ""

func release(uuid: String) -> bool:
	if can_release(uuid) != "":
		return false
	team.erase(uuid); sanctuary.erase(uuid); individuals.erase(uuid)
	active_idx = clampi(active_idx, 0, max(0, team.size() - 1))
	team_changed.emit()
	return true

func sort_sanctuary(mode: String) -> void:
	sanctuary.sort_custom(func(a, b):
		var ia: Dictionary = individuals[a]
		var ib: Dictionary = individuals[b]
		if mode == "nivel":
			return int(ia["nivel"]) > int(ib["nivel"])
		if mode == "especie":
			return str(ia["species_id"]) < str(ib["species_id"])
		return creature_name(ia) < creature_name(ib))
	team_changed.emit()

# =============================================================== CAPTURA
## P = clamp(B + 0,45*(1 - HP/HPmax) + S + T - L, 0,10, 0,95)
func capture_chance(species_id: String, wild_level: int, hp_ratio: float, controlled: bool, seal_id: String) -> float:
	var rar: String = Data.sp(species_id).get("raridade", "comum")
	var b := 0.25 if rar == "comum" else (0.15 if rar == "incomum" else 0.05)
	var s := 0.10 if controlled else 0.0
	var t := float(Data.items.get(seal_id, {}).get("bonus", 0.0)) + capture_bonus()
	var l: float = min(0.20, 0.02 * max(0, wild_level - hero_level()))
	return clamp(b + 0.45 * (1.0 - hp_ratio) + s + t - l, 0.10, 0.95)

# =============================================================== INVENTÁRIO
func item_count(id: String) -> int:
	if id == "fragmentos":
		return fragments
	return int(inventory.get(id, 0))

func give_item(id: String, n: int = 1) -> void:
	if id == "fragmentos":
		fragments += n
	elif Data.items.get(id, {}).get("tipo", "") in ["arma", "protecao", "amuleto"]:
		inventory[id] = 1
		var slot_name: String = {"arma": "arma", "protecao": "protecao", "amuleto": "amuleto"}[Data.items[id]["tipo"]]
		if equipment.get(slot_name, "") == "":
			equipment[slot_name] = id
		hero["hp"] = min(float(hero["hp"]) + (float(Data.items[id].get("hp", 0))), hero_max_hp()) if slot_name == "amuleto" else hero["hp"]
	else:
		inventory[id] = int(inventory.get(id, 0)) + n
	inventory_changed.emit()
	hero_changed.emit()

func take_item(id: String, n: int = 1) -> bool:
	if item_count(id) < n:
		return false
	if id == "fragmentos":
		fragments -= n
	else:
		inventory[id] = int(inventory[id]) - n
	inventory_changed.emit()
	return true

func give_loot(loot: Dictionary) -> void:
	var parts: Array = []
	for id in loot:
		give_item(id, int(loot[id]))
		var nm: String = "fragmentos" if id == "fragmentos" else Data.items.get(id, {}).get("nome", id)
		parts.append("%s x%d" % [nm, int(loot[id])] if id == "fragmentos" or int(loot[id]) > 1 else nm)
	if not parts.is_empty():
		toast.emit("Obteve: " + ", ".join(parts))

func equip(id: String) -> void:
	var it: Dictionary = Data.items.get(id, {})
	var t: String = it.get("tipo", "")
	if t in ["arma", "protecao", "amuleto"] and item_count(id) > 0:
		equipment[t] = id
		hero["hp"] = min(float(hero["hp"]), hero_max_hp())
		hero_changed.emit()

func buy(id: String) -> String:
	var it: Dictionary = Data.items.get(id, {})
	var price := int(it.get("preco", 0))
	if price <= 0:
		return "Não está à venda."
	if fragments < price:
		return "Fragmentos insuficientes."
	fragments -= price
	give_item(id, 1)
	return ""

# =============================================================== ECOS
func grant_eco(id: String) -> bool:
	if ecos.has(id):
		return false   # idempotente
	ecos[id] = true
	for i in 2:
		if eco_slots[i] == "":
			eco_slots[i] = id
			break
	eco_changed.emit()
	return true

func has_eco(id: String) -> bool:
	return ecos.has(id)

# =============================================================== MISSÕES / DIÁRIO
func register_kill(kind: String) -> void:
	stats["kills"][kind] = int(stats["kills"].get(kind, 0)) + 1
	if has_flag("quest_esporos") and int(stats["kills"].get("cogumelo", 0)) >= 3 and not has_flag("esporos_ok"):
		set_flag("esporos_ok")
		toast.emit("Missão: 3 Cogumelos derrotados! Fale com Ysa.")

func quest_active(qid: String) -> bool:
	if qid == "principal":
		return true
	return has_flag("quest_" + qid)

func quest_step(qid: String) -> int:
	var steps: Array = Data.quests[qid]["etapas"]
	for i in steps.size():
		if not has_flag(steps[i]["flag"]):
			return i
	return steps.size()

func objective_text() -> String:
	var q: Dictionary = Data.quests.get("principal", {})
	if q.is_empty():
		return ""
	var i := quest_step("principal")
	if i >= q["etapas"].size():
		return "Capítulo 1 concluído!"
	return q["etapas"][i]["texto"]

func diary_lines() -> Array:
	var out: Array = []
	for qid in Data.quests:
		if not quest_active(qid):
			continue
		var q: Dictionary = Data.quests[qid]
		var i := quest_step(qid)
		var head: String = "%s [%s]" % [q["nome"], q["tipo"]]
		if i >= q["etapas"].size():
			out.append("+ " + head + " — concluída")
		else:
			out.append("- " + head)
			var step: Dictionary = q["etapas"][i]
			var txt: String = step["texto"]
			if step.has("contador"):
				txt += " (%d/%d)" % [mini(int(stats["kills"].get(step["contador"], 0)), int(step["alvo"])), int(step["alvo"])]
			out.append("    " + txt)
	return out

# =============================================================== TUTORIAL (dicas durante a exploração)
func tutorial_hint() -> String:
	if not has_flag("falou_maru"):
		return ""
	if not has_flag("tut_move"):
		return "Mova-se com WASD ou as setas."
	if not has_flag("tutorial_ok"):
		if not has_flag("tut_attack"):
			return "Ataque o boneco: J ou clique esquerdo (combo de 3 golpes)."
		if not has_flag("tut_dodge"):
			return "Esquive com Espaço (consome vigor, invulnerável por instantes)."
		if not has_flag("tut_guard"):
			return "Segure K ou o botão direito para defender de frente."
	if not has_flag("primeira_captura"):
		return "Enfraqueça o Brotisco do cercado até 35%, aperte F para mirar e F de novo para lançar o selo."
	if not has_flag("tut_command"):
		return "Comande o companheiro com Q. Tab troca de criatura, C muda o comportamento."
	if not has_flag("tut_rest"):
		return "Descanse no santuário da vila (E) para curar a equipe e gravar o ponto de retorno."
	return ""

func tutorial_event(ev: String) -> void:
	if not has_flag("falou_maru"):
		return
	if ev == "move":
		set_flag("tut_move")
	elif ev == "attack_dummy" and has_flag("tut_move"):
		set_flag("tut_attack")
	elif ev == "dodge" and has_flag("tut_attack"):
		set_flag("tut_dodge")
	elif ev == "guard" and has_flag("tut_dodge"):
		set_flag("tut_guard")
	elif ev == "command" and has_flag("primeira_captura"):
		set_flag("tut_command")
	elif ev == "rest":
		set_flag("tut_rest")
	if has_flag("tut_guard") and not has_flag("tutorial_ok"):
		set_flag("tutorial_ok")
		toast.emit("Treino concluído! Agora capture o Brotisco do cercado.")
