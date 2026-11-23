extends Node
## Carrega e valida os dados externos (data/*.json e data/maps/*.json).

var species := {}
var skills := {}
var enemies := {}
var items := {}
var recipes := {}
var bosses := {}
var regions := {}
var quests := {}
var dialogs := {}
var forge := {}
var allies := {}
var contracts := {}
var maps := {}
var errors: Array = []

func _ready() -> void:
	load_all()

func _read(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		errors.append("Arquivo de dados ausente: " + path)
		return {}
	var txt := FileAccess.get_file_as_string(path)
	var parsed = JSON.parse_string(txt)
	if parsed == null:
		errors.append("JSON inválido: " + path)
		return {}
	return parsed

func load_all() -> void:
	errors.clear()
	species = _read("res://data/species.json")
	skills = _read("res://data/skills.json")
	enemies = _read("res://data/enemies.json")
	items = _read("res://data/items.json")
	bosses = _read("res://data/bosses.json")
	regions = _read("res://data/regions.json")
	quests = _read("res://data/quests.json")
	recipes = _read("res://data/recipes.json")
	allies = _read("res://data/allies.json")
	contracts = _read("res://data/contracts.json")
	dialogs = _read("res://data/dialogs.json")
	forge = _read("res://data/forge.json")
	maps.clear()
	for rid in regions:
		for mid in regions[rid].get("mapas", []):
			maps[mid] = _read("res://data/maps/%s.json" % mid)
	validate()
	for e in errors:
		push_error("[DADOS] " + e)

func validate() -> Array:
	for sid in species:
		var s = species[sid]
		if not skills.has(s.get("skill", "")):
			errors.append("Espécie %s: habilidade inexistente '%s'" % [sid, s.get("skill", "")])
		for h in s.get("habilidades", []):
			if not skills.has(str(h.get("id", ""))):
				errors.append("Espécie %s: habilidade aprendível inexistente '%s'" % [sid, h.get("id", "")])
		if s.get("status", "") == "jogavel" and s.get("evolucao") != null and not species.has(s["evolucao"]["para"]):
			errors.append("Espécie %s: evolução inexistente '%s'" % [sid, s["evolucao"]["para"]])
		if s.get("status", "") == "jogavel":
			if not ResourceLoader.exists("res://assets/sprites/%s.png" % s.get("sprite", "")):
				errors.append("Espécie %s: sprite ausente" % sid)
	for mid in maps:
		var m = maps[mid]
		if m.get("tiles", []).size() != int(m.get("h", 0)):
			errors.append("Mapa %s: altura inconsistente" % mid)
		for e in m.get("entities", []):
			var t = e.get("type", "")
			if t == "exit":
				if not maps.has(e.get("to", "")):
					errors.append("Mapa %s: saída para mapa inexistente '%s'" % [mid, e.get("to", "")])
				elif not maps[e["to"]].get("spawns", {}).has(e.get("spawn", "")):
					errors.append("Mapa %s: spawn inexistente '%s' em %s" % [mid, e.get("spawn", ""), e["to"]])
			elif t == "wild" and not species.has(e.get("species", "")):
				errors.append("Mapa %s: espécie inexistente '%s'" % [mid, e.get("species", "")])
			elif t == "enemy" and not enemies.has(e.get("kind", "")):
				errors.append("Mapa %s: inimigo inexistente '%s'" % [mid, e.get("kind", "")])
			elif t == "chest":
				for it in e.get("loot", {}):
					if it != "fragmentos" and not items.has(it):
						errors.append("Mapa %s: item inexistente '%s' no baú %s" % [mid, it, e.get("id", "")])
			elif t in ["npc", "sign"] and not dialogs.has(e.get("dialog", "")):
				errors.append("Mapa %s: diálogo inexistente '%s'" % [mid, e.get("dialog", "")])
	for sh in forge.get("lojas", {}):
		for it in forge["lojas"][sh]["itens"]:
			if not items.has(it):
				errors.append("Loja %s: item inexistente '%s'" % [sh, it])
	for mid in maps:
		for e in maps[mid].get("entities", []):
			if e.get("type", "") in ["miniboss", "boss"] and not bosses.has(e.get("boss", "lenhador" if e["type"] == "miniboss" else "cervo")):
				errors.append("Mapa %s: chefe inexistente" % mid)
			if e.get("type", "") == "altar":
				for it in e.get("loot", {}):
					if not items.has(it):
						errors.append("Mapa %s: item inexistente '%s' no altar" % [mid, it])
	for rid in recipes:
		if not items.has(rid):
			errors.append("Receita %s: item resultante inexistente" % rid)
		for it in recipes[rid].get("custo", {}):
			if not items.has(it):
				errors.append("Receita %s: material inexistente '%s'" % [rid, it])
	for did in dialogs:
		for v in dialogs[did]:
			for it in v.get("give", {}):
				if it != "fragmentos" and not items.has(it):
					errors.append("Diálogo %s: item inexistente '%s'" % [did, it])
	return errors

func sp(id: String) -> Dictionary:
	return species.get(id, {})
