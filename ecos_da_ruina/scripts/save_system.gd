extends Node
## Salvamento: 3 slots + autosave (slot 0). Escrita em arquivo temporário, backup do anterior e troca atômica.

const DIR := "user://saves"
var last_error := ""

func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(DIR)

func path(slot: int) -> String:
	return "%s/slot_%d.json" % [DIR, slot]

func _wrap(data: Dictionary) -> String:
	var body := JSON.stringify(data)
	return JSON.stringify({"v": Game.SAVE_VERSION, "hash": body.md5_text(), "body": body})

func _unwrap(text: String) -> Dictionary:
	var w = JSON.parse_string(text)
	if not (w is Dictionary) or not w.has("body") or not w.has("hash"):
		return {}
	if str(w["body"]).md5_text() != w["hash"]:
		return {}
	var d = JSON.parse_string(w["body"])
	return d if d is Dictionary else {}

## Salva o estado atual (somente em estado estável). Retorna true se gravou.
func save_game(slot: int, location_override: Dictionary = {}) -> bool:
	if not Game.can_save():
		last_error = "Não é possível salvar agora."
		return false
	DirAccess.make_dir_recursive_absolute(DIR)
	var d := Game.to_dict()
	if not location_override.is_empty():
		d["location"] = location_override
	d["slot"] = slot
	d["saved_at"] = Time.get_datetime_string_from_system()
	var final := path(slot)
	var tmp := final + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		last_error = "Falha ao abrir arquivo temporário."
		return false
	f.store_string(_wrap(d))
	f.close()
	# verifica o que foi gravado antes de substituir
	if _unwrap(FileAccess.get_file_as_string(tmp)).is_empty():
		last_error = "Verificação do arquivo temporário falhou."
		DirAccess.remove_absolute(tmp)
		return false
	if FileAccess.file_exists(final):
		DirAccess.copy_absolute(final, final + ".bak")
	var err := DirAccess.rename_absolute(tmp, final)
	if err != OK:
		last_error = "Falha ao substituir o save (%d)." % err
		return false
	return true

## Lê um slot. Se o principal estiver corrompido, tenta o backup. Retorna {} se nada servir.
func read_slot(slot: int) -> Dictionary:
	for p in [path(slot), path(slot) + ".bak"]:
		if FileAccess.file_exists(p):
			var d := _unwrap(FileAccess.get_file_as_string(p))
			if not d.is_empty() and Game.validate_save(d) == "":
				d["_recuperado"] = p.ends_with(".bak")
				return d
	return {}

func load_game(slot: int) -> bool:
	var d := read_slot(slot)
	if d.is_empty():
		last_error = "Save ausente ou corrompido."
		return false
	return Game.from_dict(d)

func slot_info(slot: int) -> Dictionary:
	var d := read_slot(slot)
	if d.is_empty():
		return {}
	var lvl: int = int(d["hero"].get("level", 1))
	var mapname: String = Data.maps.get(d["location"]["map"], {}).get("name", "?")
	return {"nivel": lvl, "mapa": mapname, "tempo": float(d.get("play_time", 0.0)), "quando": d.get("saved_at", ""),
		"equipe": d["team"].size(), "recuperado": d.get("_recuperado", false)}

func delete_slot(slot: int) -> void:
	for p in [path(slot), path(slot) + ".bak", path(slot) + ".tmp"]:
		if FileAccess.file_exists(p):
			DirAccess.remove_absolute(p)

func has_any_save() -> bool:
	for s in [0, 1, 2, 3]:
		if not read_slot(s).is_empty():
			return true
	return false
