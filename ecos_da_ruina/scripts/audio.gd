extends Node
## Efeitos e trilhas. Volumes mestre/música/efeitos independentes.

const SFX := ["swing", "hit", "hurt", "dodge", "guard", "guard_break", "skill", "telegraph", "capture_start", "capture_ok", "capture_fail",
	"seal_throw", "levelup", "evolve", "pickup", "ui_move", "ui_ok", "ui_back", "door", "lever", "puzzle_ok", "puzzle_no", "boss_roar",
	"boss_die", "thud", "roots", "death", "bridge", "heal"]
var _sfx := {}
var _pool: Array = []
var _music: AudioStreamPlayer
var _current := ""
var headless := false

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
	_music = AudioStreamPlayer.new()
	_music.bus = "Musica"
	add_child(_music)
	apply_volumes()

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
			pl.pitch_scale = 1.0 + randf_range(-pitch_var, pitch_var)
			pl.play()
			return

func music(name: String) -> void:
	if name == _current:
		return
	_current = name
	if name == "":
		_music.stop()
		return
	var p := "res://assets/audio/music_%s.ogg" % name
	if not ResourceLoader.exists(p):
		return
	var st = load(p)
	if st is AudioStreamOggVorbis:
		st.loop = true
	_music.stream = st
	_music.volume_db = -4.0
	_music.play()
