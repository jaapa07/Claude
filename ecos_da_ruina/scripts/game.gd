extends Node
## Estado global do jogo e regras de progressão (herói, equipe, santuário, inventário, missões, Ecos).
## A interface apenas observa este estado e envia comandos; nada de dano/flags de chefão é calculado na UI.

signal flag_changed(name: String, value: bool)
signal hero_changed
signal team_changed
signal inventory_changed
signal toast(text: String)
signal prefs_changed
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
const CAPTURE_HP_LIMIT := 0.35   # ponto ideal (barra laranja); a captura pode ser tentada com qualquer vida
const MIN_BOND_ACTIVITIES := 3

# ---- estado persistente (vai para o save)
var hero := {}
var inventory := {}
var fragments := 0
var equipment := {"arma": "espada_viajante", "protecao": "", "amuleto": ""}
var upgrades := {}          # item -> nível de melhoria na forja (+1..+3)
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
var party: Array = []           # aliados humanos que acompanham o herói (máx. 2)
var contract := ""              # contrato em grupo ativo
signal party_changed
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
var weather_lock := ""      # testes: força um clima ("sol") em vez do sorteio (ver scripts/weather.gd)
var weather_neutral := false  # testes: clima sem efeitos de jogo (o e2e completo continua determinístico)

# ---- preferências (arquivo separado)
## Padrões das opções (tela Opções; "Restaurar padrões" volta a estes valores, menos os controles).
const PREFS_DEFAULT := {"master": 0.8, "musica": 0.6, "efeitos": 0.8, "texto": 1.0, "reduz_tremor": false, "reduz_flash": false,
	"formas_perigo": true, "vel_texto": 1, "texto_grande": false, "vibracao": true, "dicas": true,
	"toque_tamanho": 1.0, "toque_alfa": 0.8, "setas_lado": "laterais", "idioma": "pt_BR", "keys": {}}
var prefs := PREFS_DEFAULT.duplicate(true)
var prefs_path := "user://prefs.json"
## Velocidades do texto dos diálogos (caracteres por segundo); "Instantâneo" mostra tudo de uma vez.
const TEXT_SPEEDS := [["Lenta", 30.0], ["Normal", 55.0], ["Rápida", 110.0], ["Instantânea", 0.0]]
## Idiomas disponíveis (estrutura pronta para traduções futuras).
const LANGS := {"pt_BR": "Português (Brasil)"}

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
	# testes usam um arquivo próprio e começam dos padrões: as opções do jogador não mudam o fluxo
	var a := OS.get_cmdline_user_args()
	if "--e2e" in a or "--unit" in a:
		prefs_path = "user://prefs_teste.json"
	else:
		load_prefs()
	TranslationServer.set_locale(str(prefs.get("idioma", "pt_BR")))
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
	if FileAccess.file_exists(prefs_path):
		var d = JSON.parse_string(FileAccess.get_file_as_string(prefs_path))
		if d is Dictionary:
			for k in d:
				# só aceita chaves conhecidas e do mesmo tipo (arquivo antigo ou editado à mão não quebra o jogo)
				if PREFS_DEFAULT.has(k) and (typeof(d[k]) == typeof(PREFS_DEFAULT[k]) or (d[k] is float and PREFS_DEFAULT[k] is int)):
					prefs[k] = int(d[k]) if PREFS_DEFAULT[k] is int else d[k]
	prefs_changed.emit()

func save_prefs() -> void:
	var f := FileAccess.open(prefs_path, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(prefs, "\t"))
	prefs_changed.emit()

## Volta todas as opções ao padrão (os controles remapeados ficam).
func reset_prefs() -> void:
	var keys: Dictionary = prefs.get("keys", {})
	prefs = PREFS_DEFAULT.duplicate(true)
	prefs["keys"] = keys
	save_prefs()

func pref(key: String):
	return prefs.get(key, PREFS_DEFAULT.get(key))

## Caracteres por segundo nos diálogos (0 = instantâneo).
func text_speed() -> float:
	var i: int = clampi(int(pref("vel_texto")), 0, TEXT_SPEEDS.size() - 1)
	return float(TEXT_SPEEDS[i][1])

## Vibração curta no celular (opção "Vibração"); no PC não faz nada.
func vibrate(ms: int) -> void:
	if not bool(pref("vibracao")) or not TouchControls.active:
		return
	if OS.has_feature("web") or OS.has_feature("mobile"):
		Input.vibrate_handheld(ms)

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
	upgrades = {}
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
	party = []
	contract = ""
	tmp_flags = {}
	skill_cd = {}
	swap_cd = 0.0
	save_block = 0
	hab_escudo_t = 0.0; hab_novas = []
	Weather.reset()
	hero["hp"] = hero_max_hp()
	in_game = true
	hero_changed.emit(); team_changed.emit(); inventory_changed.emit(); quest_changed.emit()

func to_dict() -> Dictionary:
	return {"version": SAVE_VERSION, "hero": hero, "inventory": inventory, "fragments": fragments, "equipment": equipment, "upgrades": upgrades,
		"individuals": individuals, "team": team, "sanctuary": sanctuary, "active_idx": active_idx, "flags": flags,
		"chests": chests, "ecos": ecos, "eco_slots": eco_slots, "bestiary": bestiary, "location": location,
		"checkpoint": checkpoint, "stats": stats, "play_time": play_time, "difficulty": difficulty, "behavior": behavior, "slot": slot,
		"party": party, "contract": contract, "conquista": conquest_pct(),
		"clima": Weather.to_dict()}

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
	upgrades = d.get("upgrades", {})
	individuals = d["individuals"]; team = d["team"]; sanctuary = d.get("sanctuary", []); active_idx = int(d.get("active_idx", 0))
	flags = d["flags"]; chests = d.get("chests", {}); ecos = d.get("ecos", {}); eco_slots = d.get("eco_slots", ["", ""])
	bestiary = d.get("bestiary", {}); location = d["location"]; checkpoint = d["checkpoint"]
	stats = d.get("stats", stats); play_time = float(d.get("play_time", 0.0)); difficulty = d.get("difficulty", "aventura")
	behavior = d.get("behavior", "preservar"); slot = int(d.get("slot", 1))
	party = Array(d.get("party", [])); contract = str(d.get("contract", ""))
	tmp_flags = {}; skill_cd = {}; swap_cd = 0.0; save_block = 0
	hab_escudo_t = 0.0; hab_novas = []
	Weather.from_dict(d.get("clima", {}))
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
		hab_sync(ind, false)   # saves antigos: ativa = habilidade original, aprendidas conforme o nível
	for k in chests.keys():
		chests[k] = true
	for k in upgrades.keys():
		upgrades[k] = int(upgrades[k])
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
			var novo: bool = not flags.has(name)
			flags[name] = true
			if novo and name.begins_with("quest_"):
				check_item_steps.call_deferred()   # item achado antes de a missão começar
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
	var hp = 100.0 + 8.0 * (hero_level() - 1) + 6.0 * hero["talents"].get("resistencia", 0) + 12.0 * item_count("semente_vida")
	var am: String = equipment.get("amuleto", "")
	if am != "" and Data.items.has(am):
		hp += float(Data.items[am].get("hp", 0)) + float(forge_bonus("amuleto", "hp")) * upgrade_level(am)
	return hp

func hero_atk() -> float:
	var a = 12.0 + 1.4 * (hero_level() - 1) + 2.0 * hero["talents"].get("espada", 0)
	var w: String = equipment.get("arma", "")
	if w != "" and Data.items.has(w):
		a += float(Data.items[w].get("dano", 0)) + float(forge_bonus("arma", "dano")) * upgrade_level(w)
	return a

func hero_reduction() -> float:
	var r = 0.02 * hero["talents"].get("resistencia", 0)
	var p: String = equipment.get("protecao", "")
	if p != "" and Data.items.has(p):
		r += float(Data.items[p].get("reducao", 0)) + float(forge_bonus("protecao", "reducao")) * upgrade_level(p)
	return clamp(r, 0.0, 0.5)

## Perfil da arma equipada: a Lança de Cobre alcança mais à frente com um arco mais estreito.
func weapon_profile() -> Dictionary:
	var w: Dictionary = Data.items.get(equipment.get("arma", ""), {})
	return {"alcance": float(w.get("alcance", 0.0)), "arco": float(w.get("arco", 1.0)), "lanca": w.has("alcance")}

## Multiplicador do dano de calor (piso quente/poças): Luvas Térmicas e Amuleto da Brasa reduzem.
func heat_mult() -> float:
	var m := 1.0
	if item_count("luvas_termicas") > 0:
		m *= 0.5
	var am: String = equipment.get("amuleto", "")
	if am != "" and Data.items.has(am):
		m *= float(Data.items[am].get("calor", 1.0))
	return m

# =============================================================== CLIMA (regras em scripts/weather.gd)
## Dano causado por quem tem a afinidade `aff` sob o clima atual.
func weather_mult(aff: String) -> float:
	return Weather.dmg_mult(aff)

## Velocidade de criaturas com a afinidade `aff` (neve/frio deixam mais lentas).
func weather_speed_mult(aff: String) -> float:
	return Weather.speed_mult(aff)

## Recuperação de vigor do herói (onda de calor cansa).
func weather_vigor_mult() -> float:
	return Weather.vigor_mult()

## Recuperação de vigor pelo amuleto equipado (Amuleto de Seiva Viva).
func hero_vigor_mult() -> float:
	var am: String = equipment.get("amuleto", "")
	if am != "" and Data.items.has(am):
		return float(Data.items[am].get("vigor", 1.0))
	return 1.0

# =============================================================== FORJA (melhoria de equipamento)
func upgrade_level(id: String) -> int:
	return int(upgrades.get(id, 0))

func forge_bonus(slot: String, stat: String) -> float:
	return float(Data.forge.get("bonus", {}).get(slot, {}).get(stat, 0.0))

func forge_next(id: String) -> Dictionary:
	var lv := upgrade_level(id)
	var niveis: Array = Data.forge.get("niveis", [])
	if lv >= niveis.size():
		return {}
	return niveis[lv]

## Motivo pelo qual não dá para melhorar ("" = pode).
func forge_check(id: String) -> String:
	if id == "" or not Data.items.has(id):
		return "Nada equipado neste espaço."
	var nx := forge_next(id)
	if nx.is_empty():
		return "Já está no nível máximo (+3)."
	if nx.has("requer_flag") and not has_flag(nx["requer_flag"]):
		return str(nx.get("requer_texto", "Ainda não é possível."))
	for mat in nx["custo"]:
		if item_count(mat) < int(nx["custo"][mat]):
			return "Faltam materiais: %s." % forge_cost_text(nx["custo"])
	return ""

func forge_cost_text(cost: Dictionary) -> String:
	var parts: Array = []
	for mat in cost:
		var nm: String = "fragmentos" if mat == "fragmentos" else Data.items.get(mat, {}).get("nome", mat)
		parts.append("%s %d/%d" % [nm, item_count(mat), int(cost[mat])])
	return ", ".join(parts)

## Comparação antes/depois (a UI só exibe).
func forge_preview(id: String) -> Dictionary:
	var it: Dictionary = Data.items.get(id, {})
	var slot: String = it.get("tipo", "")
	var lv := upgrade_level(id)
	var out := {"slot": slot, "nivel": lv, "antes": "", "depois": ""}
	match slot:
		"arma":
			var base := float(it.get("dano", 0))
			out["antes"] = "Ataque do herói %.0f (arma +%.0f)" % [hero_atk(), base + forge_bonus("arma", "dano") * lv]
			out["depois"] = "Ataque do herói %.0f (arma +%.0f)" % [hero_atk() + forge_bonus("arma", "dano") if equipment.get("arma", "") == id else hero_atk(), base + forge_bonus("arma", "dano") * (lv + 1)]
		"protecao":
			var r0 := float(it.get("reducao", 0)) + forge_bonus("protecao", "reducao") * lv
			out["antes"] = "Redução de dano %d%%" % int(round(r0 * 100.0))
			out["depois"] = "Redução de dano %d%%" % int(round((r0 + forge_bonus("protecao", "reducao")) * 100.0))
		"amuleto":
			var h0 := float(it.get("hp", 0)) + forge_bonus("amuleto", "hp") * lv
			out["antes"] = "Vida máxima +%d" % int(h0)
			out["depois"] = "Vida máxima +%d" % int(h0 + forge_bonus("amuleto", "hp"))
	var nx := forge_next(id)
	out["custo"] = forge_cost_text(nx["custo"]) if not nx.is_empty() else "—"
	return out

func forge_upgrade(id: String) -> bool:
	if forge_check(id) != "":
		return false
	var nx := forge_next(id)
	for mat in nx["custo"]:
		take_item(mat, int(nx["custo"][mat]))
	upgrades[id] = upgrade_level(id) + 1
	hero["hp"] = min(float(hero["hp"]) + (forge_bonus("amuleto", "hp") if Data.items[id]["tipo"] == "amuleto" else 0.0), hero_max_hp())
	set_flag("forjou_equipamento")
	toast.emit("%s melhorada para +%d!" % [Data.items[id]["nome"], upgrades[id]])
	inventory_changed.emit()
	hero_changed.emit()
	return true

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
	hab_sync(ind, false)
	return ind

func sp_of(ind: Dictionary) -> Dictionary:
	return Data.species.get(ind.get("species_id", ""), {})

func creature_hp_max(ind: Dictionary) -> float:
	var s := sp_of(ind)
	var hp: float = float(s.get("hp_base", 30)) + float(s.get("hp_cresc", 4)) * (int(ind["nivel"]) - 1) + acc_stat(ind, "hp")
	return floor(hp * (1.0 + acc_stat(ind, "mult")))

func creature_atk(ind: Dictionary) -> float:
	var s := sp_of(ind)
	var a: float = float(s.get("atk_base", 5)) + float(s.get("atk_cresc", 1)) * (int(ind["nivel"]) - 1) + acc_stat(ind, "atk")
	return a * (1.0 + acc_stat(ind, "mult"))

# ---- acessórios de criatura (um por criatura)
func acc_stat(ind: Dictionary, key: String) -> float:
	var id: String = str(ind.get("acessorio", ""))
	if id == "" or not Data.items.has(id):
		return 0.0
	return float(Data.items[id].get(key, 0.0))

func creature_cd_mult(ind: Dictionary) -> float:
	return max(0.4, 1.0 - acc_stat(ind, "cd"))

func acc_in_use(id: String, except_uuid := "") -> int:
	var n := 0
	for u in individuals:
		if u != except_uuid and str(individuals[u].get("acessorio", "")) == id:
			n += 1
	return n

func acc_available(id: String, for_uuid := "") -> bool:
	return item_count(id) > acc_in_use(id, for_uuid)

func equip_creature(uuid: String, id: String) -> bool:
	var ind: Dictionary = individuals.get(uuid, {})
	if ind.is_empty():
		return false
	if id != "" and not acc_available(id, uuid):
		return false
	var frac: float = float(ind["hp"]) / max(1.0, creature_hp_max(ind))
	ind["acessorio"] = id
	if not ind.get("exausta", false):
		ind["hp"] = max(1.0, floor(creature_hp_max(ind) * frac))
	team_changed.emit()
	return true

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
	if not has_flag("capturou_" + str(ind["species_id"])):
		set_flag("capturou_" + str(ind["species_id"]))
	var trio := 0
	for sp_id in ["brotisco", "lumipim", "cascalito"]:
		if bestiary.get(sp_id, {}).get("capturado", false):
			trio += 1
	if trio >= 3 and not has_flag("tres_vinculos"):
		set_flag("tres_vinculos")
		toast.emit("Vínculos da Floresta: as três criaturas estão com você! Fale com Maru.")
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
	amount *= 1.0 - acc_stat(ind, "red")
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
	ind["xp"] = float(ind["xp"]) + amount * (1.0 + acc_stat(ind, "xp"))
	while int(ind["nivel"]) < CREATURE_MAX_LEVEL and float(ind["xp"]) >= creature_xp_to_next(int(ind["nivel"])):
		ind["xp"] = float(ind["xp"]) - creature_xp_to_next(int(ind["nivel"]))
		ind["nivel"] = int(ind["nivel"]) + 1
		var frac: float = float(ind["hp"]) / max(1.0, creature_hp_max(ind))
		toast.emit("%s chegou ao nível %d!" % [creature_name(ind), ind["nivel"]])
		level_up.emit(ind["uuid"], int(ind["nivel"]))
		hab_sync(ind, true)
		check_evolution_hint(ind)
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
	check_evolution_hint(ind)
	team_changed.emit()
	return true

func check_evolution_hint(ind: Dictionary) -> void:
	if ind.is_empty() or not in_game:
		return
	var key := "evo_aviso_%s_%s" % [ind["uuid"], ind["species_id"]]
	if evolution_status(ind)["possivel"] and not has_flag(key):
		set_flag(key)
		toast.emit("%s pode evoluir! Abra a Equipe (I) fora de combate." % creature_name(ind))

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
	hab_novas = hab_sync(ind, true)
	team_changed.emit()
	return true

# =============================================================== HABILIDADES DAS CRIATURAS (aprendidas por nível; o jogador escolhe a ativa)
## Cada espécie lista "habilidades": [{"id", "nivel"}]; a forma evoluída repete as da base e libera exclusivas.
## Cada indivíduo guarda "hab_aprendidas" (ids) e "hab_ativa" (a usada no Q / botão estrela).
const HAB_FATOR := {"prender": 0.4, "pulso": 0.5, "ima": 0.4, "nuvem": 0.3, "lodo": 0.4}
var hab_escudo_t := 0.0      # execução: escudo ativo (herói e criatura recebem menos dano)
var hab_escudo_red := 0.0
var hab_novas: Array = []    # habilidades liberadas na última evolução (a UI oferece a escolha)

func hab_list(species_id: String) -> Array:
	var s: Dictionary = Data.sp(species_id)
	var l = s.get("habilidades", [])
	if l is Array and not l.is_empty():
		return l
	if str(s.get("skill", "")) != "":
		return [{"id": s["skill"], "nivel": 1}]
	return []

func hab_default(ind: Dictionary) -> String:
	return str(sp_of(ind).get("skill", ""))

## Garante os campos e aprende o que o nível permite. Devolve as recém-aprendidas (avisa por toast se announce).
func hab_sync(ind: Dictionary, announce: bool) -> Array:
	if ind.is_empty() or not ind.has("species_id"):
		return []
	var learned: Array = []
	var old = ind.get("hab_aprendidas", null)
	var had_list: bool = old is Array
	if had_list:
		for h in old:
			if Data.skills.has(str(h)) and not learned.has(str(h)):
				learned.append(str(h))
	var novas: Array = []
	for h in hab_list(str(ind["species_id"])):
		var hid := str(h.get("id", ""))
		if Data.skills.has(hid) and int(h.get("nivel", 1)) <= int(ind.get("nivel", 1)) and not learned.has(hid):
			learned.append(hid)
			if had_list:
				novas.append(hid)
	ind["hab_aprendidas"] = learned
	var act := str(ind.get("hab_ativa", ""))
	if act == "" or not learned.has(act):
		var df := hab_default(ind)
		ind["hab_ativa"] = df if (learned.has(df) or learned.is_empty()) else str(learned[0])
	if announce and in_game:
		for hid in novas:
			toast.emit("%s aprendeu %s! Escolha no menu" % [creature_name(ind), Data.skills[hid]["nome"]])
	return novas

## Habilidade usada no Q (sempre válida para a espécie atual).
func hab_active(ind: Dictionary) -> String:
	var a := str(ind.get("hab_ativa", ""))
	if a != "" and Data.skills.has(a) and ind.get("hab_aprendidas", []).has(a):
		return a
	return hab_default(ind)

func hab_set_active(uuid: String, hid: String) -> bool:
	var ind: Dictionary = individuals.get(uuid, {})
	if ind.is_empty():
		return false
	hab_sync(ind, false)
	if not ind["hab_aprendidas"].has(hid):
		return false
	ind["hab_ativa"] = hid
	team_changed.emit()
	return true

## Nível exigido para a habilidade nesta espécie (0 = não faz parte da lista).
func hab_level(species_id: String, hid: String) -> int:
	for h in hab_list(species_id):
		if str(h.get("id", "")) == hid:
			return int(h.get("nivel", 1))
	return 0

func hab_mult(ind: Dictionary) -> float:
	return 1.4 if str(sp_of(ind).get("habitat", "")).begins_with("Evolução") else 1.0

## Dano por alvo (mesma conta que o companheiro usa ao executar).
func hab_damage(ind: Dictionary, hid: String) -> float:
	var sk: Dictionary = Data.skills.get(hid, {})
	var base: float = (float(sk.get("dano", 0)) + creature_atk(ind) * 0.6) * hab_mult(ind)
	return base * float(HAB_FATOR.get(str(sk.get("exec", hid)), 1.0))

func hab_heal(ind: Dictionary, hid: String) -> float:
	var sk: Dictionary = Data.skills.get(hid, {})
	return (float(sk.get("cura", 0)) + creature_atk(ind) * 0.5) * hab_mult(ind)

## Texto da habilidade para os menus.
func hab_text(ind: Dictionary, hid: String) -> String:
	var sk: Dictionary = Data.skills.get(hid, {})
	var t := "%s\n%s\n\nRecarga: %.0f s" % [sk.get("nome", hid), sk.get("descricao", ""), float(sk.get("recarga", 0))]
	var ex := str(sk.get("exec", hid))
	if ex == "cura":
		t += "\nCura: %d" % int(round(hab_heal(ind, hid)))
	elif ex == "escudo":
		t += "\nReduz dano: %d%% por %.0f s" % [int(round(float(sk.get("reducao", 0)) * 100.0)), float(sk.get("duracao", 0))]
	if float(sk.get("dano", 0)) > 0.0 or not (ex in ["cura", "escudo"]):
		t += "\nDano: %d por alvo" % int(round(hab_damage(ind, hid)))
	return t

func hab_shield(dur: float, red: float) -> void:
	if hab_escudo_t <= 0.0:
		hab_escudo_red = 0.0
	hab_escudo_red = max(hab_escudo_red, red)
	hab_escudo_t = max(hab_escudo_t, dur)

## Multiplicador de dano recebido pelo herói/criatura com escudo ativo.
func hab_shield_mult() -> float:
	return 1.0 - hab_escudo_red if hab_escudo_t > 0.0 else 1.0

func hab_tick(delta: float) -> void:
	if hab_escudo_t > 0.0:
		hab_escudo_t = max(0.0, hab_escudo_t - delta)
		if hab_escudo_t <= 0.0:
			hab_escudo_red = 0.0

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
	return clamp(b - 0.12 + 0.6 * (1.0 - hp_ratio) + s + t - l, 0.08, 0.95)

# =============================================================== INVENTÁRIO
func item_count(id: String) -> int:
	if id == "fragmentos":
		return fragments
	return int(inventory.get(id, 0))

func give_item(id: String, n: int = 1) -> void:
	if id == "fragmentos":
		fragments += n
	elif Data.items.get(id, {}).get("tipo", "") in ["tecnica", "historia"]:
		inventory[id] = 1
	elif Data.items.get(id, {}).get("tipo", "") in ["arma", "protecao", "amuleto"]:
		inventory[id] = 1
		var slot_name: String = {"arma": "arma", "protecao": "protecao", "amuleto": "amuleto"}[Data.items[id]["tipo"]]
		if equipment.get(slot_name, "") == "":
			equipment[slot_name] = id
		hero["hp"] = min(float(hero["hp"]) + (float(Data.items[id].get("hp", 0))), hero_max_hp()) if slot_name == "amuleto" else hero["hp"]
	else:
		inventory[id] = int(inventory.get(id, 0)) + n
	inventory_changed.emit()
	if Data.items.get(id, {}).get("tipo", "") == "missao":
		check_item_steps()
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
	var placed := false
	for i in 2:
		if eco_slots[i] == "":
			eco_slots[i] = id
			placed = true
			break
	if not placed:
		# atalhos cheios: o Eco novo entra no atalho 2 (troque no Inventário > Ecos); travessias com E não dependem do atalho
		eco_slots[1] = id
		toast.emit("%s no atalho 2. Troque os atalhos em Inventário > Ecos." % Data.skills.get(id, {}).get("nome", id))
	eco_changed.emit()
	return true

func has_eco(id: String) -> bool:
	return ecos.has(id)

# =============================================================== MISSÕES / DIÁRIO
func register_kill(kind: String) -> void:
	stats["kills"][kind] = int(stats["kills"].get(kind, 0)) + 1
	_hunt_progress(kind)
	if has_flag("quest_esporos") and int(stats["kills"].get("cogumelo", 0)) >= 3 and not has_flag("esporos_ok"):
		set_flag("esporos_ok")
		toast.emit("Missão: 3 Cogumelos derrotados! Fale com Ysa.")
	if has_flag("quest_ferramentas") and int(stats["kills"].get("mineiro", 0)) >= 4 and not has_flag("ferramentas_ok"):
		set_flag("ferramentas_ok")
		toast.emit("Missão: 4 Mineiros Corrompidos derrotados! Fale com Tessa.")

func quest_active(qid: String) -> bool:
	if qid == "principal":
		return true
	var q: Dictionary = Data.quests.get(qid, {})
	if q.has("ativa_se"):
		return has_flag(q["ativa_se"])
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
	if i < q["etapas"].size():
		return q["etapas"][i]["texto"]
	if Data.quests.has("principal2") and quest_active("principal2"):
		var j := quest_step("principal2")
		var q2: Dictionary = Data.quests["principal2"]
		if j < q2["etapas"].size():
			return q2["etapas"][j]["texto"]
		for qid in Data.quests:   # capítulos seguintes (principal3, principal4...): o primeiro ativo e incompleto
			if str(qid).begins_with("principal") and not qid in ["principal", "principal2"] and quest_active(qid) and quest_step(qid) < Data.quests[qid]["etapas"].size():
				if qid == "principal3" and quest_step(qid) == 0:
					return "Capítulo 2 concluído! " + str(Data.quests[qid]["etapas"][0]["texto"])
				return Data.quests[qid]["etapas"][quest_step(qid)]["texto"]
		var last := 2
		for qid in Data.quests:
			if str(qid).begins_with("principal") and str(qid).substr(9).is_valid_int() and quest_active(qid):
				last = max(last, int(str(qid).substr(9)))
		return "Capítulo %d concluído!" % last
	return "Capítulo 1 concluído!"

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
			if step.has("item"):
				txt += " (%d/%d)" % [mini(item_count(step["item"]), int(step["alvo"])), int(step["alvo"])]
			if step.has("contador_especies"):
				var c := 0
				for sp_id in step["contador_especies"]:
					if bestiary.get(sp_id, {}).get("capturado", false):
						c += 1
				txt += " (%d/%d)" % [c, step["contador_especies"].size()]
			out.append("    " + txt)
	return out

# =============================================================== TUTORIAL (dicas durante a exploração)
func tutorial_hint() -> String:
	if not has_flag("falou_maru"):
		return ""
	if not has_flag("tut_move"):
		return "Mova-se com {andar}."
	if not has_flag("tutorial_ok"):
		if not has_flag("tut_attack"):
			return "Ataque o boneco com {atacar} (combo de 3 golpes; segure para o golpe carregado)."
		if not has_flag("tut_dodge"):
			return "Esquive com {esquivar} (gasta vigor; fica invulnerável por um instante)."
		if not has_flag("tut_guard"):
			return "Segure {defender} para defender de frente."
	if not has_flag("primeira_captura"):
		return "Capture o Brotisco do cercado: toque {capturar} para mirar e de novo para lançar. Quanto menos vida ele tiver, maior a chance."
	if not has_flag("tut_command"):
		return "Use a habilidade da criatura com {habilidade}. {trocar} troca de criatura."
	if not has_flag("tut_rest"):
		return "Descanse no santuário da vila ({interagir}) para curar a equipe e gravar o ponto de retorno."
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


# =============================================================== RARIDADE, DESMONTAR E MONTAR
const RARITY_NAMES := ["Comum", "Raro", "Épico", "Lendário", "Mítico"]
const RARITY_COLORS := [Color(0.45, 0.9, 0.45), Color(0.4, 0.7, 1.0), Color(0.78, 0.5, 1.0), Color(1.0, 0.65, 0.25), Color(1.0, 0.32, 0.32)]
const ESSENCES := ["essencia_verde", "essencia_azul", "essencia_roxa", "essencia_laranja", "essencia_rubra"]

func rarity_of(id: String) -> int:
	return clampi(int(Data.items.get(id, {}).get("raridade", 0)), 0, 4)

func rarity_color(id: String) -> Color:
	return RARITY_COLORS[rarity_of(id)]

func rarity_name(id: String) -> String:
	return RARITY_NAMES[rarity_of(id)]

func is_equipment(id: String) -> bool:
	return Data.items.get(id, {}).get("tipo", "") in ["arma", "protecao", "amuleto"]

## O que desmontar rende: essências da cor da peça (2 + nível de melhoria) e fragmentos.
func dismantle_yield(id: String) -> Dictionary:
	var r := rarity_of(id)
	var out := {ESSENCES[r]: 2 + upgrade_level(id), "fragmentos": 10 * (r + 1)}
	if r > 0:
		out[ESSENCES[r - 1]] = 1
	return out

## Motivo pelo qual não dá para desmontar ("" = pode).
func dismantle_check(id: String) -> String:
	if not is_equipment(id) or item_count(id) <= 0:
		return "Você não tem esta peça."
	for slot in equipment:
		if equipment[slot] == id:
			return "Equipado: troque por outra peça antes de desmontar."
	return ""

func dismantle(id: String) -> bool:
	if dismantle_check(id) != "":
		return false
	var y := dismantle_yield(id)
	inventory.erase(id)
	upgrades.erase(id)
	for k in y:
		if k == "fragmentos":
			fragments += int(y[k])
		else:
			inventory[k] = item_count(k) + int(y[k])
	toast.emit("%s desmontada." % Data.items[id]["nome"])
	inventory_changed.emit()
	hero_changed.emit()
	return true

## Motivo pelo qual não dá para montar ("" = pode).
func craft_check(rid: String) -> String:
	var rc: Dictionary = Data.recipes.get(rid, {})
	if rc.is_empty():
		return "Receita desconhecida."
	if rc.has("requer") and not has_flag(rc["requer"]):
		return "Bloqueada: " + str(rc.get("dica", ""))
	if item_count(rid) > 0:
		return "Você já tem esta peça."
	if fragments < int(rc.get("fragmentos", 0)):
		return "Fragmentos insuficientes."
	for it in rc["custo"]:
		if item_count(it) < int(rc["custo"][it]):
			return "Faltam materiais."
	return ""

func craft_cost_text(rid: String) -> String:
	var rc: Dictionary = Data.recipes.get(rid, {})
	var parts: Array = []
	for it in rc.get("custo", {}):
		parts.append("%s %d/%d" % [Data.items[it]["nome"], item_count(it), int(rc["custo"][it])])
	parts.append("fragmentos %d/%d" % [fragments, int(rc.get("fragmentos", 0))])
	return ", ".join(parts)

func craft(rid: String) -> bool:
	if craft_check(rid) != "":
		return false
	var rc: Dictionary = Data.recipes[rid]
	for it in rc["custo"]:
		inventory[it] = item_count(it) - int(rc["custo"][it])
	fragments -= int(rc.get("fragmentos", 0))
	give_item(rid, 1)
	toast.emit("Montou: %s (%s)!" % [Data.items[rid]["nome"], rarity_name(rid)])
	return true

## Descrição de equipamento com atributos, raridade e melhoria
func item_details(id: String) -> String:
	var it: Dictionary = Data.items.get(id, {})
	var t := "%s\n[%s]" % [it.get("nome", id), rarity_name(id)]
	if upgrade_level(id) > 0:
		t += "  +%d" % upgrade_level(id)
	t += "\n\n" + str(it.get("desc", ""))
	match it.get("tipo", ""):
		"arma":
			t += "\n\nDano extra: +%d" % (int(it.get("dano", 0)) + int(forge_bonus("arma", "dano")) * upgrade_level(id))
			if it.has("alcance"): t += "\nAlcance: +%d" % int(it["alcance"])
			if float(it.get("arco", 1.0)) != 1.0: t += "\nArco do golpe: x%.2f" % float(it["arco"])
		"protecao":
			t += "\n\nRedução de dano: %d%%" % int(round((float(it.get("reducao", 0)) + float(forge_bonus("protecao", "reducao")) * upgrade_level(id)) * 100.0))
		"amuleto":
			t += "\n\nVida extra: +%d" % (int(it.get("hp", 0)) + int(forge_bonus("amuleto", "hp")) * upgrade_level(id))
			if it.has("selo_chance"): t += "\nCaptura: +%d%%" % int(float(it["selo_chance"]) * 100.0)
			if it.has("vigor"): t += "\nRecuperação de vigor: +%d%%" % int(round((float(it["vigor"]) - 1.0) * 100.0))
	if is_equipment(id):
		var y := dismantle_yield(id)
		var parts: Array = []
		for k in y:
			parts.append(("%d fragmentos" % y[k]) if k == "fragmentos" else ("%s x%d" % [Data.items[k]["nome"], y[k]]))
		t += "\n\nDesmontar rende: " + ", ".join(parts)
	return t

## Ícone do item (folha e coluna)
func item_icon(id: String) -> Texture2D:
	var it: Dictionary = Data.items.get(id, {})
	var sheet: String = it.get("folha", "icons")
	return Art.region(sheet, int(it.get("icone", 0)) * 16, 0, 16, 16)


# =============================================================== MISSÕES COM ITENS (coleta)
## Etapas com "item"/"alvo" concluem sozinhas quando o herói tem itens suficientes.
func check_item_steps() -> void:
	for qid in Data.quests:
		if not quest_active(qid):
			continue
		for st in Data.quests[qid]["etapas"]:
			if st.has("item") and not has_flag(st["flag"]) and item_count(st["item"]) >= int(st["alvo"]):
				set_flag(st["flag"])
				toast.emit("Missão: %s (%d/%d) — volte para entregar." % [Data.items[st["item"]]["nome"], int(st["alvo"]), int(st["alvo"])])


# =============================================================== CONTRATOS EM GRUPO (dupla / trio)
const PARTY_MAX := 2

func contract_state(cid: String) -> String:
	## "feito", "ativo", "bloqueado", "ocupado" (outro contrato ativo) ou "disponivel"
	var c: Dictionary = Data.contracts.get(cid, {})
	if c.is_empty():
		return "bloqueado"
	if has_flag(cid + "_ok"):
		return "feito"
	if contract == cid:
		return "ativo"
	for f in c.get("requer", []):
		if not has_flag(f):
			return "bloqueado"
	if contract != "":
		return "ocupado"
	return "disponivel"

func contract_lock_reason(cid: String) -> String:
	var c: Dictionary = Data.contracts[cid]
	for f in c.get("requer", []):
		if not has_flag(f):
			if f.ends_with("_ok"):
				return "Conclua antes: " + Data.contracts.get(f.trim_suffix("_ok"), {}).get("nome", f)
			if f.begins_with("visitou_"):
				var m: String = f.trim_prefix("visitou_")
				return "Visite antes: " + Data.maps.get(m, {}).get("name", m)
			return "Ainda não disponível"
	return ""

func accept_contract(cid: String) -> bool:
	if contract_state(cid) != "disponivel":
		return false
	contract = cid
	party = (Data.contracts[cid]["aliados"] as Array).duplicate()
	hero["caca_n"] = 0
	set_flag("contrato_" + cid)
	party_changed.emit()
	quest_changed.emit()
	toast.emit("Contrato aceito: %s (%s)" % [Data.contracts[cid]["nome"], {"dupla": "Dupla", "trio": "Trio", "caca": "Caçada"}.get(Data.contracts[cid]["tipo"], "")])
	return true

func abandon_contract() -> void:
	if contract == "":
		return
	set_flag("contrato_" + contract, false)
	contract = ""
	party = []
	party_changed.emit()
	quest_changed.emit()

func complete_contract(cid: String) -> void:
	if has_flag(cid + "_ok"):
		return
	var c: Dictionary = Data.contracts[cid]
	set_flag(cid + "_ok")
	set_flag("contrato_" + cid, false)
	var r: Dictionary = c.get("recompensa", {})
	fragments += int(r.get("fragmentos", 0))
	add_hero_xp(int(r.get("xp", 0)))
	for u in team:
		if individuals.has(u):
			add_creature_xp(individuals[u], float(r.get("xp", 0)) * 0.6)
	for it in r.get("itens", {}):
		give_item(it, int(r["itens"][it]))
	stats["contratos"] = int(stats.get("contratos", 0)) + 1
	contract = ""
	toast.emit("Contrato concluído: %s! +%d fragmentos" % [c["nome"], int(r.get("fragmentos", 0))])
	inventory_changed.emit()
	quest_changed.emit()

## Depois do primeiro contrato, os aliados podem ser convocados para patrulhar junto (fora de contratos).
func can_recruit(aid: String) -> bool:
	return contract == "" and (has_flag("saqueadores_ok") if aid == "bruna" else has_flag("emboscada_ok"))

func toggle_party(aid: String) -> void:
	if aid in party:
		party.erase(aid)
	elif party.size() < PARTY_MAX:
		party.append(aid)
	party_changed.emit()


# =============================================================== ITENS-CHAVE
func flask_ready() -> bool:
	return item_count("frasco_seiva") > int(hero.get("frascos_usados", 0))

func use_flask() -> void:
	hero["frascos_usados"] = int(hero.get("frascos_usados", 0)) + 1

func refill_flasks() -> void:
	hero["frascos_usados"] = 0

## Caçadas (contratos solo): contam abates do tipo pedido desde que o contrato foi aceito.
func _hunt_progress(kind: String) -> void:
	if contract == "" or not Data.contracts.has(contract):
		return
	var c: Dictionary = Data.contracts[contract]
	if c.get("tipo", "") != "caca" or c["alvo"]["kind"] != kind:
		return
	hero["caca_n"] = int(hero.get("caca_n", 0)) + 1
	var n: int = int(hero["caca_n"]); var q: int = int(c["alvo"]["qtd"])
	if n >= q:
		complete_contract(contract)
	else:
		toast.emit("%s: %d/%d" % [c["nome"], n, q])

func contract_progress_text() -> String:
	if contract == "" or not Data.contracts.has(contract):
		return ""
	var c: Dictionary = Data.contracts[contract]
	if c.get("tipo", "") == "caca":
		return "%s (%d/%d)" % [c["objetivo"], int(hero.get("caca_n", 0)), int(c["alvo"]["qtd"])]
	return c["objetivo"]


# =============================================================== NOMES DOS CONTROLES (teclado x toque)
## Textos usam marcadores como {atacar}; aqui viram a tecla ou o botão de toque certo.
const KEYS_PC := {"andar": "WASD", "atacar": "J", "defender": "K", "esquivar": "Espaço", "interagir": "E", "capturar": "F",
	"habilidade": "Q", "trocar": "Tab", "comportamento": "C", "tonico": "R", "menu": "I", "cancelar": "K"}
const KEYS_TOUCH := {"andar": "o polegar esquerdo", "atacar": "a Espada", "defender": "o Escudo", "esquivar": "as Setas", "interagir": "o botão E",
	"capturar": "o Selo", "habilidade": "a Estrela", "trocar": "Troca (no alto)", "comportamento": "o menu da Equipe", "tonico": "o Tônico (no alto)", "menu": "o Menu (no alto)", "cancelar": "o Escudo"}

func k(text: String) -> String:
	if text.find("{") < 0:
		return text
	var m: Dictionary = KEYS_TOUCH if TouchControls.active else KEYS_PC
	for key in m:
		text = text.replace("{" + key + "}", m[key])
	return text


# =============================================================== JORNADA (o grande objetivo e a % de conquista)
func guardians_done() -> int:
	var n := 0
	for g in Data.story.get("jornada", {}).get("guardioes", []):
		if has_flag(g["flag"]):
			n += 1
	return n

## Partes da conquista: [nome, feito, total, peso]
func conquest_parts() -> Array:
	var gs: Array = Data.story.get("jornada", {}).get("guardioes", [])
	var sp_total := 0; var sp_cap := 0
	for sid in Data.species:
		if Data.species[sid].get("status", "") == "jogavel":
			sp_total += 1
			if bestiary.get(sid, {}).get("capturado", false):
				sp_cap += 1
	var ch_total := 0; var ch_open := 0; var seeds_total := 0; var seeds := 0
	for m in Data.maps:
		for e in Data.maps[m]["entities"]:
			if e["type"] == "chest":
				ch_total += 1
				if chests.has(str(e.get("id", ""))):
					ch_open += 1
			if e["type"] == "pickup" and e.get("item", "") == "semente_vida":
				seeds_total += 1
				if has_flag(str(e.get("flag", ""))):
					seeds += 1
	var ct_total := 0; var ct_done := 0
	for cid in Data.contracts:
		ct_total += 1
		if has_flag(cid + "_ok"):
			ct_done += 1
		if Data.contracts[cid].get("recompensa", {}).get("itens", {}).has("semente_vida"):
			seeds_total += 1
			if has_flag(cid + "_ok"):
				seeds += 1
	var mem_total: int = Data.story.get("memorias", {}).size()
	var mem := 0
	for f in Data.story.get("memorias", {}):
		if has_flag("mem_" + f):
			mem += 1
	return [["Guardiões libertados", guardians_done(), gs.size(), 40.0],
		["Criaturas capturadas", sp_cap, sp_total, 20.0],
		["Baús abertos", ch_open, ch_total, 12.0],
		["Contratos e caçadas", ct_done, ct_total, 12.0],
		["Sementes de Vida", seeds, seeds_total, 8.0],
		["Memórias recuperadas", mem, mem_total, 8.0]]

func conquest_pct() -> int:
	var tot := 0.0; var got := 0.0
	for p in conquest_parts():
		tot += float(p[3])
		if int(p[2]) > 0:
			got += float(p[3]) * float(p[1]) / float(p[2])
	return int(floor(100.0 * got / max(1.0, tot)))

func grand_goal_text() -> String:
	var j: Dictionary = Data.story.get("jornada", {})
	return "%s  (Ecos: %d/%d)" % [j.get("objetivo", ""), guardians_done(), j.get("guardioes", []).size()]
