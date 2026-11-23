extends Node
## Clima das áreas externas (autoload "Weather"). Dados em data/weather.json.
## - Cada mapa externo pertence a uma zona climática com climas possíveis e pesos; mapas fora da lista
##   (interiores, casas, masmorras) não têm clima.
## - O clima é sorteado ao entrar numa zona nova e ao descansar no santuário, e muda sozinho a cada
##   4–6 minutos de jogo passados ao ar livre. Zona, clima e tempo restante vão para o save.
## - Efeitos de jogo são consultados por funções centrais (dmg_mult, speed_mult, vigor_mult, perception_mult),
##   usadas por enemy.gd, companion.gd e player.gd através de Game.weather_*.
## - A parte visual (partículas com sprites de assets/src/80_clima.pxl, tom e ícone do HUD) fica em weather_fx.gd.

signal changed(id: String)

var data: Dictionary = {}
var zone := ""            # zona climática do último mapa externo (persistente)
var current := ""         # clima sorteado para essa zona (persistente)
var timer := 0.0          # segundos de jogo ao ar livre até a próxima troca (persistente)
var outdoors := false     # o mapa atual tem clima
var world: Node = null
var fx: Node = null
var rng := RandomNumberGenerator.new()   # separado de Game.rng: o clima não altera sorteios de captura

func _ready() -> void:
	rng.randomize()
	var p = JSON.parse_string(FileAccess.get_file_as_string("res://data/weather.json"))
	data = p if p is Dictionary else {}
	if data.is_empty():
		push_error("[DADOS] data/weather.json ausente ou inválido")

## Chamado uma vez pelo mundo: cria a camada visual (filha do mundo, pausa junto com ele).
func attach(w: Node) -> void:
	world = w
	fx = preload("res://scripts/weather_fx.gd").new()
	fx.name = "Clima"
	w.add_child(fx)

# =============================================================== CONSULTAS
func climates() -> Dictionary:
	return data.get("climas", {})

func zone_of(map_id: String) -> String:
	return str(data.get("mapas", {}).get(map_id, ""))

## Clima em vigor agora ("" em interiores e fora de jogo). Game.weather_lock força um clima (testes).
func now() -> String:
	if not outdoors:
		return ""
	if Game.weather_lock != "":
		return Game.weather_lock
	return current

func cfg(id: String = "") -> Dictionary:
	return climates().get(now() if id == "" else id, {})

func name_of(id: String) -> String:
	return str(climates().get(id, {}).get("nome", "Sem clima"))

func short_name(id: String) -> String:
	return str(climates().get(id, {}).get("curto", name_of(id)))

## Entidades com "clima": "chuva" (ou lista) só existem enquanto esse clima está em vigor.
func allows(spec: Variant) -> bool:
	var n := now()
	if spec is Array:
		return n in spec
	return n == str(spec)

# =============================================================== EFEITOS DE JOGO
func _neutral() -> bool:
	return Game.weather_neutral or now() == ""

## Dano causado por quem tem a afinidade `aff` (ex.: chuva fortalece água/flora e enfraquece brasa).
func dmg_mult(aff: String) -> float:
	if _neutral() or aff == "":
		return 1.0
	return float(cfg().get("dano", {}).get(aff, 1.0))

## Velocidade de criaturas e inimigos com a afinidade `aff` (neve/frio: -15%, exceto gelo).
func speed_mult(aff: String) -> float:
	if _neutral():
		return 1.0
	var c := cfg()
	if aff != "" and aff in c.get("imunes_lentidao", []):
		return 1.0
	return float(c.get("lentidao", 1.0))

## Recuperação de vigor do herói (onda de calor: 20% mais devagar).
func vigor_mult() -> float:
	if _neutral():
		return 1.0
	return float(cfg().get("vigor", 1.0))

## Alcance de percepção dos inimigos (neblina: -30%).
func perception_mult() -> float:
	if _neutral():
		return 1.0
	return float(cfg().get("percepcao", 1.0))

## Afinidade climática de um inimigo: a da espécie (selvagens) ou a tabela de inimigos comuns.
func enemy_aff(e: Node) -> String:
	var a: String = str(e.affinity)
	if a != "":
		return a
	return str(data.get("afinidade_inimigos", {}).get(str(e.kind), ""))

func enemy_speed_mult(e: Node) -> float:
	if e.boss or e.kind == "dummy":
		return 1.0
	return speed_mult(enemy_aff(e))

func enemy_perception_mult(e: Node) -> float:
	if e.boss:
		return 1.0
	return perception_mult()

func enemy_attack_mult(e: Node) -> float:
	if e.boss:
		return 1.0
	return dmg_mult(enemy_aff(e))

# =============================================================== TEXTOS (menu de pausa e bestiário)
func describe() -> String:
	var n := now()
	if n == "":
		return "Tempo: sem clima aqui (interior ou abrigo)."
	var s := "Tempo: %s — %s" % [name_of(n), str(cfg().get("efeito", ""))]
	if Game.weather_neutral:
		s += " (efeitos desligados)"
	var z: Dictionary = data.get("zonas", {}).get(zone, {})
	if not z.is_empty():
		var nomes: Array = []
		for k in z.get("pesos", {}):
			nomes.append(name_of(k))
		s += "\nNesta região: %s. O tempo muda com o passar das horas e ao descansar no santuário. Algumas criaturas só aparecem com certo clima." % ", ".join(nomes)
	return s

## Linha do bestiário: como o clima afeta uma afinidade.
func species_note(aff: String) -> String:
	var up: Array = []
	var down: Array = []
	var slow: Array = []
	for id in climates():
		var c: Dictionary = climates()[id]
		var m := float(c.get("dano", {}).get(aff, 1.0))
		if m > 1.0:
			up.append(name_of(id))
		elif m < 1.0:
			down.append(name_of(id))
		if float(c.get("lentidao", 1.0)) < 1.0 and not (aff in c.get("imunes_lentidao", [])):
			slow.append(name_of(id))
	var parts: Array = []
	if not up.is_empty():
		parts.append("mais forte com %s (+15%%)" % ", ".join(up))
	if not down.is_empty():
		parts.append("mais fraca com %s (-15%%)" % ", ".join(down))
	if not slow.is_empty():
		parts.append("mais lenta com %s" % ", ".join(slow))
	if parts.is_empty():
		return "Clima: não é afetada."
	return "Clima: " + "; ".join(parts) + "."

# =============================================================== CICLO
func reset() -> void:
	zone = ""
	current = ""
	timer = 0.0
	outdoors = false

func _next_time() -> float:
	var r: Array = data.get("troca_seg", [240, 360])
	return rng.randf_range(float(r[0]), float(r[1]))

## Sorteio ponderado na zona atual; `avoid` evita repetir o clima anterior quando há alternativa.
func _pick(avoid: String = "") -> String:
	var pesos: Dictionary = data.get("zonas", {}).get(zone, {}).get("pesos", {})
	var total := 0.0
	for k in pesos:
		if k != avoid or pesos.size() == 1:
			total += float(pesos[k])
	if total <= 0.0:
		return ""
	var x := rng.randf() * total
	for k in pesos:
		if k == avoid and pesos.size() > 1:
			continue
		x -= float(pesos[k])
		if x <= 0.0:
			return k
	return pesos.keys()[-1]

## Chamado por world.load_map antes de criar as entidades.
func enter_map(map_id: String) -> void:
	var z := zone_of(map_id)
	outdoors = z != "" and Game.in_game
	if outdoors and (z != zone or not climates().has(current)):
		zone = z
		current = _pick()
		timer = _next_time()
		if Game.weather_lock == "":
			Game.toast.emit("Tempo: " + name_of(current))
	if fx:
		fx.apply(now(), true)
	changed.emit(now())

## Descanso no santuário: o tempo da última zona externa é sorteado de novo.
func on_rest() -> void:
	if zone == "" or Game.weather_lock != "":
		return
	var old := current
	current = _pick()
	timer = _next_time()
	if outdoors and current != old:
		_announce()
	_after_change()

## Troca para um clima específico (também usado pelos testes), com transição suave.
func change_to(id: String, announce := true) -> void:
	current = id
	timer = _next_time()
	if announce and outdoors:
		_announce()
	_after_change()

func _announce() -> void:
	Game.toast.emit("O tempo mudou: " + name_of(now()))
	if world and world.player:
		world.spawn_text(world.player.global_position + Vector2(0, -36), name_of(now()), Color(0.8, 0.9, 1.0))

func _after_change() -> void:
	if fx:
		fx.apply(now(), false)
	_refresh_spawns()
	changed.emit(now())

## Passa o tempo do clima (chamado a cada quadro; testes podem adiantar).
func advance(sec: float) -> void:
	if not outdoors or zone == "" or Game.weather_lock != "":
		return
	timer -= sec
	if timer <= 0.0:
		change_to(_pick(current))

func _process(delta: float) -> void:
	if world == null or not Game.in_game or world.process_mode == Node.PROCESS_MODE_DISABLED:
		return
	advance(delta)

## Criaturas que dependem do clima aparecem/somem quando ele muda (sem sumir no meio de uma luta).
func _refresh_spawns() -> void:
	if world == null or world.map.is_empty() or not Game.in_game:
		return
	for i in world.ent_defs.size():
		var d: Dictionary = world.ent_defs[i]
		if not d.has("clima"):
			continue
		var vis: bool = world._def_visible(d)
		var n = world.ent_nodes.get(i)
		var has: bool = n != null and is_instance_valid(n)
		if vis and not has:
			world._spawn_def(i, world.player.global_position)
		elif not vis and has and n.alive_flag and n.angry_t <= 0.0:
			n.queue_free()
			world.ent_nodes.erase(i)

# =============================================================== SAVE
func to_dict() -> Dictionary:
	return {"zona": zone, "atual": current, "t": timer}

func from_dict(d: Dictionary) -> void:
	zone = str(d.get("zona", ""))
	current = str(d.get("atual", ""))
	timer = float(d.get("t", 0.0))
	if zone != "" and (current == "" or not climates().has(current)):
		current = _pick()
	if timer <= 0.0 and zone != "":
		timer = _next_time()
