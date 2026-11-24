extends Node
## Efeitos e trilhas. Volumes mestre/música/efeitos independentes.
## Trilha dinâmica: dois players de música com crossfade e uma pilha de "humores" com prioridade
## (base do lugar < memória < combate < suspense < chefe). Jingles (vitória/descoberta) tocam num
## terceiro player por cima, abaixando a base (ducking), e depois a base volta. Regras em data/music.json.

const SFX := ["swing", "hit", "hurt", "dodge", "guard", "guard_break", "skill", "telegraph", "capture_start", "capture_ok", "capture_fail",
	"seal_throw", "levelup", "evolve", "pickup", "ui_move", "ui_ok", "ui_back", "door", "lever", "puzzle_ok", "puzzle_no", "boss_roar",
	"boss_die", "thud", "roots", "death", "bridge", "heal"]
const MUSIC_DB := -4.0
const DEFAULT_FADE := 1.2
const RESUME_WINDOW := 90.0  # segundos: voltar à base retoma do ponto em que parou
var _sfx := {}
var _pool: Array = []
var headless := false

# ---- trilha dinâmica
var cfg: Dictionary = {}
var _mp: Array = []            # dois AudioStreamPlayer de música
var _mp_track := ["", ""]
var _gain := [0.0, 0.0]
var _gain_to := [0.0, 0.0]
var _rate := [1.0, 1.0]
var _active := 0
var _target := ""              # trilha escolhida agora
var _place := ""               # base do lugar (mapa)
var _moods := {}               # humor -> trilha
var _mood_timers := {}         # humor -> segundos restantes (humores temporários)
var _resume := {}              # trilha -> [posição, tempo do relógio]
var _clock := 0.0
var _stinger: AudioStreamPlayer
var _stinger_name := ""
var _stinger_left := 0.0
var _duck := 0.0
var _duck_to := 0.0
var _combat_in := 0.0
var _combat_out := 0.0
var _dialog_memoria := false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	headless = DisplayServer.get_name() == "headless"
	for n in ["Musica", "Efeitos"]:
		if AudioServer.get_bus_index(n) < 0:
			AudioServer.add_bus()
			AudioServer.set_bus_name(AudioServer.bus_count - 1, n)
			AudioServer.set_bus_send(AudioServer.bus_count - 1, "Master")
	for n in SFX:
		var p := "res://assets/audio/%s.ogg" % n
		if ResourceLoader.exists(p):
			_sfx[n] = load(p)
	for i in 10:
		var pl := AudioStreamPlayer.new()
		pl.bus = "Efeitos"
		add_child(pl)
		_pool.append(pl)
	for i in 2:
		var m := AudioStreamPlayer.new()
		m.bus = "Musica"
		m.volume_db = -80.0
		add_child(m)
		_mp.append(m)
	_stinger = AudioStreamPlayer.new()
	_stinger.bus = "Musica"
	_stinger.volume_db = MUSIC_DB
	add_child(_stinger)
	_load_cfg()
	apply_volumes()

func _load_cfg() -> void:
	var p := "res://data/music.json"
	if FileAccess.file_exists(p):
		var parsed = JSON.parse_string(FileAccess.get_file_as_string(p))
		if parsed is Dictionary:
			cfg = parsed

func apply_volumes() -> void:
	var p: Dictionary = Game.prefs
	AudioServer.set_bus_volume_db(0, linear_to_db(max(0.0001, p["master"])))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Musica"), linear_to_db(max(0.0001, p["musica"])))
	AudioServer.set_bus_volume_db(AudioServer.get_bus_index("Efeitos"), linear_to_db(max(0.0001, p["efeitos"])))

func play(name: String, vol_db: float = 0.0, pitch_var: float = 0.05) -> void:
	if not _sfx.has(name):
		return
	for pl in _pool:
		if not pl.playing:
			pl.stream = _sfx[name]
			pl.volume_db = vol_db
			pl.pitch_scale = 1.0 + Game.fx_rng.randf_range(-pitch_var, pitch_var)
			pl.play()
			return

# =============================================================== API
## Compatível com a versão antiga: troca a base e limpa os humores.
func music(name: String) -> void:
	_moods.clear()
	_mood_timers.clear()
	set_place(name)

## Base do lugar (trilha de fundo do mapa).
func set_place(name: String) -> void:
	_place = name
	_refresh()

## Liga/desliga um humor ("memoria", "combate", "suspense", "chefe"). `track` sobrepõe a trilha padrão do humor.
func set_mood(mood: String, on: bool, track: String = "") -> void:
	if on:
		var t := track
		if t == "":
			t = str(_mood_cfg(mood).get("musica", mood))
		if _moods.get(mood, "") == t:
			return
		_moods[mood] = t
	else:
		if not _moods.has(mood):
			return
		_moods.erase(mood)
		_mood_timers.erase(mood)
	_refresh()

## Humor que se desliga sozinho depois de `secs` segundos.
func mood_for(mood: String, secs: float, track: String = "") -> void:
	set_mood(mood, true, track)
	_mood_timers[mood] = secs

## Jingle curto por cima da trilha (não faz loop); a base é abaixada e volta ao final.
func stinger(name: String) -> void:
	var p := "res://assets/audio/music_%s.ogg" % name
	if not ResourceLoader.exists(p):
		return
	var st = load(p)
	if st is AudioStreamOggVorbis:
		st.loop = false
	_stinger.stream = st
	_stinger.volume_db = MUSIC_DB
	_stinger.play()
	_stinger_name = name
	var len_s := 3.0
	if st is AudioStream:
		len_s = max(1.0, (st as AudioStream).get_length())
	_stinger_left = len_s + 0.1
	_duck_to = float(cfg.get("jingles", {}).get(name, {}).get("duck_db", -12.0))

## Ao carregar um mapa: base pelo campo "music" (com variantes por flag de data/music.json) e humores zerados.
func enter_map(id: String, map: Dictionary) -> void:
	for m in ["combate", "suspense", "chefe", "memoria"]:
		_moods.erase(m)
		_mood_timers.erase(m)
	_combat_in = 0.0
	_combat_out = 0.0
	_dialog_memoria = false
	set_place(place_for_map(id, map))

func place_for_map(id: String, map: Dictionary) -> String:
	for v in cfg.get("variantes", {}).get(id, []):
		if v.has("if") and not Game.has_flag(str(v["if"])):
			continue
		if v.has("unless") and Game.has_flag(str(v["unless"])):
			continue
		return str(v.get("music", ""))
	return str(map.get("music", ""))

## Chefe despertou / terminou. `won`: toca o jingle de vitória.
func boss_music(kind: String, on: bool, won: bool = false) -> void:
	if on:
		set_mood("chefe", true, str(cfg.get("chefes", {}).get(kind, _mood_cfg("chefe").get("musica", "chefao"))))
	else:
		set_mood("chefe", false)
		set_mood("combate", false)
		_combat_in = 0.0
		if won:
			stinger("vitoria")

## Diálogos de memória (família Corvelo, cartas): trilha triste enquanto o diálogo estiver aberto.
func dialog_mood(did: String, on: bool) -> void:
	if on:
		if did in cfg.get("dialogos_memoria", []):
			_dialog_memoria = true
			set_mood("memoria", true)
	elif _dialog_memoria:
		_dialog_memoria = false
		set_mood("memoria", false)

## Baú importante ou segredo encontrado: jingle de descoberta; diários puxam a trilha de memória por alguns segundos.
func on_treasure(loot: Dictionary, secret: bool = false) -> void:
	var important := secret
	var story := false
	for k in loot:
		var it: Dictionary = Data.items.get(k, {})
		var tipo := str(it.get("tipo", ""))
		if tipo in ["arma", "protecao", "amuleto", "tecnica", "historia"] or int(it.get("raridade", 0)) >= 2:
			important = true
		if tipo == "historia":
			story = true
	if important:
		stinger("descoberta")
	if story:
		mood_for("memoria", float(cfg.get("memoria_historia_seg", 14.0)))

## Chamado a cada quadro de física pelo mundo: combate, suspense (zona, escuridão, vida baixa, chefe dormindo).
func world_tick(w: Node, delta: float) -> void:
	var cc: Dictionary = cfg.get("combate", {})
	var safe: bool = w.map.get("safe", false) and cc.get("ignorar_mapas_seguros", true)
	if w.in_combat() and not safe:
		_combat_in += delta
		_combat_out = 0.0
		if _combat_in >= float(cc.get("entrar_apos", 0.8)):
			set_mood("combate", true)
	else:
		_combat_out += delta
		if _combat_out >= float(cc.get("sair_apos", 1.0)):
			_combat_in = 0.0
			set_mood("combate", false)
	set_mood("suspense", suspense_reason(w) != "")

## Por que o suspense está ligado agora ("" = não está).
func suspense_reason(w: Node) -> String:
	var sc: Dictionary = cfg.get("suspense", {})
	var pp: Vector2 = w.player.global_position
	var z = w.map.get("suspense", null)
	if z is bool and z:
		return "mapa"
	if z is Array and not z.is_empty():
		var rects: Array = z if z[0] is Array else [z]
		var tile := Vector2(pp.x / 16.0, pp.y / 16.0)
		for r in rects:
			if r.size() >= 5 and Game.has_flag(str(r[4])):
				continue
			if Rect2(float(r[0]), float(r[1]), float(r[2]), float(r[3])).has_point(tile):
				return "zona"
	if w.dark_on:
		return "escuridao"
	var hp_max: float = Game.hero_max_hp()
	var hp := float(Game.hero.get("hp", hp_max))
	if hp > 0.0 and hp < hp_max * float(sc.get("vida_baixa", 0.25)):
		return "vida_baixa"
	var raio := float(sc.get("chefe_dormindo_raio", 200.0))
	for b in w.boss_nodes.values():
		if is_instance_valid(b) and b.alive_flag and not b.activated and b.global_position.distance_to(pp) < raio:
			return "chefe_dormindo"
	return ""

# ---- consultas (testes/depuração)
func current_track() -> String:
	return _target

func place() -> String:
	return _place

func has_mood(mood: String) -> bool:
	return _moods.has(mood)

func stinger_name() -> String:
	return _stinger_name

func duck_db() -> float:
	return _duck

## Quantos players de música estão soando (2 durante um crossfade).
func voices() -> int:
	var n := 0
	for i in 2:
		if _mp[i].playing and _gain[i] > 0.001:
			n += 1
	return n

func track_volume_db() -> float:
	return _mp[_active].volume_db

# =============================================================== MOTOR
func _mood_cfg(mood: String) -> Dictionary:
	return cfg.get("humores", {}).get(mood, {})

func _refresh() -> void:
	var best := _place
	var best_p := -1
	var fade := DEFAULT_FADE
	for m in _moods:
		var mc := _mood_cfg(m)
		var p := int(mc.get("prioridade", 1))
		if p > best_p:
			best_p = p
			best = _moods[m]
			fade = float(mc.get("fade", DEFAULT_FADE))
	if best_p < 0:
		# voltando para a base: usa o fade do humor que estava tocando
		for m in cfg.get("humores", {}):
			if _target == str(_mood_cfg(m).get("musica", "")):
				fade = float(_mood_cfg(m).get("fade", DEFAULT_FADE))
	_switch(best, fade)

func _switch(track: String, fade: float) -> void:
	if track == _target:
		return
	if track == "":
		_target = ""
		for i in 2:
			_fade_to(i, 0.0, fade)
		return
	var p := "res://assets/audio/music_%s.ogg" % track
	if not ResourceLoader.exists(p):
		return
	_target = track
	var other := 1 - _active
	if _mp_track[other] == track and _mp[other].playing:
		# voltando no meio de um crossfade: reaproveita o player
		_active = other
	else:
		_remember(other)
		var st = load(p)
		if st is AudioStreamOggVorbis:
			st.loop = true
		var pl: AudioStreamPlayer = _mp[other]
		pl.stream = st
		_mp_track[other] = track
		_gain[other] = 0.0
		var from := 0.0
		if _resume.has(track) and _clock - float(_resume[track][1]) < RESUME_WINDOW:
			from = float(_resume[track][0])
		pl.play(from)
		_active = other
	_fade_to(_active, 1.0, fade)
	_fade_to(1 - _active, 0.0, fade)
	_apply_volume()

func _fade_to(i: int, g: float, secs: float) -> void:
	_gain_to[i] = g
	_rate[i] = 1.0 / max(0.05, secs)

func _remember(i: int) -> void:
	if _mp[i].playing and _mp_track[i] != "":
		_resume[_mp_track[i]] = [_mp[i].get_playback_position(), _clock]

func _apply_volume() -> void:
	for i in 2:
		_mp[i].volume_db = linear_to_db(max(0.0001, _gain[i])) + MUSIC_DB + _duck

func _process(delta: float) -> void:
	_clock += delta
	for m in _mood_timers.keys():
		_mood_timers[m] = float(_mood_timers[m]) - delta
		if _mood_timers[m] <= 0.0:
			set_mood(m, false)
	if _stinger_left > 0.0:
		_stinger_left -= delta
		if _stinger_left <= 0.0:
			_stinger.stop()
			_stinger_name = ""
			_duck_to = 0.0
	if _duck > _duck_to:
		_duck = max(_duck_to, _duck - 80.0 * delta)
	elif _duck < _duck_to:
		_duck = min(_duck_to, _duck + 16.0 * delta)
	for i in 2:
		if _gain[i] < _gain_to[i]:
			_gain[i] = min(_gain_to[i], _gain[i] + _rate[i] * delta)
		elif _gain[i] > _gain_to[i]:
			_gain[i] = max(_gain_to[i], _gain[i] - _rate[i] * delta)
		if _gain[i] <= 0.0 and _gain_to[i] <= 0.0 and _mp[i].playing:
			_remember(i)
			_mp[i].stop()
	_apply_volume()
