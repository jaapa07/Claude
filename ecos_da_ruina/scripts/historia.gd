extends Node
class_name Historia
## Fio pessoal da história (docs/HISTORIA.md): o herói perdeu a memória e a recupera aos pedaços.
## - ARTEFATOS (data/story.json → "artefatos"): quando a flag do chefe é marcada, depois da Memória do Guardião,
##   toca a LEMBRANÇA (cena curta com a trilha "memoria", tela em tom sépia) e o artefato vai para o inventário.
## - CENAS (story.json → "cenas"): cenas curtas de ritmo (chegadas, descobertas) e o Arauto da Ordem do Vazio,
##   que aparece em cena antes de cada chefe de região, fala e some.
## - REAÇÕES da criatura ativa (story.json → "reacoes_criatura").
## Mantido fora de world.gd: o mundo só chama Historia.attach(self) e with_reaction().
## Em modo de teste (world.test_mode sem world.memory_in_tests) tudo é instantâneo: artefato entregue, cena marcada.

var world: Node
var playing := false          # lembrança ou cena em andamento
var _queue: Array = []        # ids de artefato aguardando a lembrança
var _wait := 0.0
var _scene_wait := 0.0
var _arautos := {}            # id da cena -> Ent do Arauto em cena

static func attach(w: Node) -> Historia:
	var h := Historia.new()
	h.name = "Historia"
	h.world = w
	w.add_child(h)
	Game.flag_changed.connect(h._on_flag)
	w.map_loaded.connect(h._on_map)
	return h

# =============================================================== CONSULTAS (usadas pela UI e pela Região 5)
static func artefatos() -> Array:
	return Data.story.get("artefatos", [])

static func artefato(id: String) -> Dictionary:
	for a in artefatos():
		if str(a.get("id", "")) == id:
			return a
	return {}

static func has_artefato(id: String) -> bool:
	return Game.has_flag("lembranca_" + id) or Game.item_count(id) > 0

static func count() -> int:
	var n := 0
	for a in artefatos():
		if has_artefato(str(a["id"])):
			n += 1
	return n

## Texto para reler a lembrança (tela de Artefatos e Jornada).
static func lembranca_text(a: Dictionary) -> String:
	var l: Dictionary = a.get("lembranca", {})
	return "%s\n%s\n\n%s\n\n%s" % [a.get("nome", ""), str(a.get("desc", "")), l.get("titulo", ""), "\n".join(l.get("linhas", []))]

## Linha descritiva da criatura ativa ("Brotisco encosta a cabeça na sua mão."). Vazia se não há criatura ativa.
static func reaction(ctx: String, key: String = "") -> String:
	var ac := Game.active_ind()
	if ac.is_empty() or ctx == "":
		return ""
	var r: Dictionary = Data.story.get("reacoes_criatura", {})
	var sid := str(ac.get("species_id", ""))
	var esp: Dictionary = r.get("especies", {}).get(sid, {})
	var t := ""
	if esp.has(ctx):
		t = str(esp[ctx])
	else:
		var arr: Array = r.get(ctx, [])
		if arr.is_empty():
			return ""
		t = str(arr[absi(hash(key + ctx)) % arr.size()])
	return t.replace("{nome}", Game.creature_name(ac))

## Cópia das linhas com a reação da criatura inserida em `pos` (-1 = no fim).
static func with_reaction(lines: Array, ctx: String, key: String = "", pos: int = -1) -> Array:
	var out: Array = lines.duplicate()
	var r := reaction(ctx, key)
	if r != "":
		if pos < 0 or pos > out.size():
			out.append(r)
		else:
			out.insert(pos, r)
	return out

func _instant() -> bool:
	return world.test_mode and not world.memory_in_tests

func _can_play() -> bool:
	var p = world.player
	return not world.ui.is_modal() and not world.ui.has_screen() and not world.transition_busy and not world.in_combat() \
		and p != null and p.state == Player.S.FREE and world.active_boss == null and world._memory_queue.is_empty() \
		and world.arrival_t <= 0.0 and not playing

# =============================================================== ARTEFATOS E LEMBRANÇAS
func _on_flag(name: String, v: bool) -> void:
	if not v:
		return
	for a in artefatos():
		var id := str(a["id"])
		if str(a.get("chefe_flag", "")) == name and not a.get("placeholder", false) and not has_artefato(id) and not id in _queue:
			_queue.append(id)
	_refresh_arautos()

func _physics_process(delta: float) -> void:
	if world == null or world.map.is_empty() or not Game.in_game:
		return
	_tick_lembrancas(delta)
	_tick_cenas(delta)

func _tick_lembrancas(delta: float) -> void:
	if _queue.is_empty():
		_wait = 0.0
		return
	if _instant():
		for id in _queue:
			_give(id)
		_queue.clear()
		return
	var id: String = _queue[0]
	var a := artefato(id)
	# a Memória do Guardião vem primeiro (a lembrança é a resposta pessoal a ela)
	var f := str(a.get("chefe_flag", ""))
	if Data.story.get("memorias", {}).has(f) and not Game.has_flag("mem_" + f):
		_wait = 0.0
		return
	if not _can_play():
		_wait = 0.0
		return
	_wait += delta
	if _wait < 1.2:
		return
	_wait = 0.0
	_queue.pop_front()
	play_lembranca(id)

## Toca a lembrança de um artefato (também pode ser chamada pela Região 5 para a revelação final).
func play_lembranca(id: String) -> void:
	var a := artefato(id)
	if a.is_empty():
		return
	if _instant():
		_give(id)
		return
	playing = true
	world.player.set_busy(true)
	Audio.mood_for("memoria", 40.0)
	await world.ui.fade(1.0, 0.5)
	world.ui.hud.set_memory_tint(true)
	await world.ui.fade(0.0, 0.7)
	var l: Dictionary = a.get("lembranca", {})
	world.ui.banner(str(l.get("titulo", "Lembrança")))
	var lines := with_reaction(l.get("linhas", []), "lembranca", id)
	world.ui.dialog(lines, func(): _end_lembranca(id))

func _end_lembranca(id: String) -> void:
	await world.ui.fade(1.0, 0.4)
	world.ui.hud.set_memory_tint(false)
	await world.ui.fade(0.0, 0.5)
	_give(id)
	world.player.set_busy(false)
	playing = false

func _give(id: String) -> void:
	if Game.has_flag("lembranca_" + id):
		return
	Game.set_flag("lembranca_" + id)
	if Data.items.has(id):
		Game.give_item(id, 1)
		world.say("Artefato: %s — %d/%d lembranças (Menu > Artefatos)" % [Data.items[id]["nome"], count(), artefatos().size()])
	if count() >= artefatos().size():
		Game.set_flag("artefatos_completos")

# =============================================================== CENAS (chegadas, descobertas, o Arauto)
func _cena_ok(cid: String, c: Dictionary) -> bool:
	if str(c.get("mapa", "")) != world.map_id or Game.has_flag("cena_" + cid):
		return false
	if c.has("if") and not Game.has_flag(str(c["if"])):
		return false
	if c.has("unless") and Game.has_flag(str(c["unless"])):
		return false
	return true

func _tick_cenas(delta: float) -> void:
	if playing:
		return
	var cenas: Dictionary = Data.story.get("cenas", {})
	for cid in cenas:
		var c: Dictionary = cenas[cid]
		if not _cena_ok(cid, c):
			continue
		if _instant():
			Game.set_flag("cena_" + cid)
			continue
		if c.has("area"):
			var ar: Array = c["area"]
			var r := Rect2(float(ar[0]) * 16.0, float(ar[1]) * 16.0, float(ar[2]) * 16.0, float(ar[3]) * 16.0)
			if not r.has_point(world.player.global_position):
				continue
		if not _can_play():
			_scene_wait = 0.0
			return
		_scene_wait += delta
		if _scene_wait < float(c.get("espera", 0.8)):
			return
		_scene_wait = 0.0
		play_cena(cid)
		return

func play_cena(cid: String) -> void:
	var c: Dictionary = Data.story.get("cenas", {}).get(cid, {})
	if c.is_empty():
		return
	if _instant():
		Game.set_flag("cena_" + cid)
		return
	playing = true
	Game.set_flag("cena_" + cid)
	world.player.set_busy(true)
	var ar = _arautos.get(cid)
	if ar != null and is_instance_valid(ar):
		Audio.mood_for("suspense", 14.0)
		world.player.facing = (ar.global_position - world.player.global_position).normalized()
	if c.has("titulo"):
		world.ui.banner(str(c["titulo"]))
	var lines := with_reaction(c.get("linhas", []), str(c.get("reacao", "")), cid, int(c.get("reacao_pos", -1)))
	world.ui.dialog(lines, func(): _end_cena(cid))

func _end_cena(cid: String) -> void:
	var ar = _arautos.get(cid)
	_arautos.erase(cid)
	if ar != null and is_instance_valid(ar):
		# o Arauto some num clarão branco
		world.fx_at("sparkle", ar.global_position + Vector2(0, -14), 1.0, 0.0, 1.6)
		world.fx_pulse(ar.global_position + Vector2(0, -8), 26.0)
		Audio.play("seal_throw")
		ar.collision_layer = 0
		var tw: Tween = ar.create_tween()
		tw.tween_property(ar, "modulate", Color(1.6, 1.6, 1.8, 0.0), 0.6)
		tw.tween_callback(ar.queue_free)
	world.player.set_busy(false)
	playing = false

func _on_map(_id: String) -> void:
	_arautos.clear()
	_scene_wait = 0.0
	_refresh_arautos()

## Põe o Arauto em cena nos mapas com cena pendente (nunca em teste rápido: não pode bloquear o caminho do bot).
func _refresh_arautos() -> void:
	if world == null or world.map.is_empty() or not Game.in_game or _instant():
		return
	var cenas: Dictionary = Data.story.get("cenas", {})
	for cid in cenas:
		var c: Dictionary = cenas[cid]
		if not c.has("arauto"):
			continue
		var has: bool = _arautos.has(cid) and is_instance_valid(_arautos[cid])
		if _cena_ok(cid, c) and not has:
			var p: Array = c["arauto"]
			var e := Ent.new()
			e.init(world, {"type": "npc", "id": "arauto_" + cid, "sprite": "arauto", "dialog": "arauto_eco", "x": int(p[0]), "y": int(p[1]), "nome": "Arauto"})
			world.ysort.add_child(e)
			_arautos[cid] = e
		elif not _cena_ok(cid, c) and has and not playing:
			_arautos[cid].queue_free()
			_arautos.erase(cid)

## Arauto em cena neste mapa (testes e Região 5).
func arauto_node(cid: String) -> Node:
	var n = _arautos.get(cid)
	return n if n != null and is_instance_valid(n) else null
