extends Node
## Ponto de entrada: título, novo jogo, continuar, pausa. O jogo roda inteiro a partir daqui.

var world: World
var ui: Node
var title_bg: TextureRect
var title_logo: Control
var e2e: Node = null

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	if not Data.errors.is_empty():
		push_error("Dados inválidos: %s" % str(Data.errors))
	ui = preload("res://scripts/ui.gd").new()
	add_child(ui)
	title_bg = TextureRect.new()
	title_bg.size = Vector2(480, 270)
	title_bg.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var cl := CanvasLayer.new()
	cl.layer = -1
	add_child(cl)
	cl.add_child(title_bg)
	world = World.new()
	add_child(world)
	ui.bind(world)
	show_title()
	var args := OS.get_cmdline_user_args()
	if "--e2e" in args or "--unit" in args:
		var bot = load("res://tests/e2e_bot.gd").new()
		bot.main = self
		bot.mode = "unit" if "--unit" in args else "e2e"
		bot.args = args
		add_child(bot)
		e2e = bot

func show_title() -> void:
	Game.in_game = false
	# fundo do título: a própria Vila Lúmen desenhada com o tileset, sem o herói
	world.visible = true
	world.process_mode = Node.PROCESS_MODE_INHERIT
	world.load_map("vila_lumen", "default")
	world.player.visible = false
	world.player.global_position = Vector2(22 * 16, 15 * 16)
	if world.companion:
		world.companion.queue_free()
		world.companion = null
	world.process_mode = Node.PROCESS_MODE_DISABLED
	title_bg.visible = false
	Audio.music("titulo")
	get_tree().paused = false
	ui.modal = 0
	ui.open_title(self)

func begin_world() -> void:
	title_bg.visible = false
	world.player.visible = true
	world.visible = true
	world.process_mode = Node.PROCESS_MODE_INHERIT
	Game.in_game = true

func start_new_game(slot: int) -> void:
	ui.close_all()
	Game.new_game(slot)
	Game.inventory["espada_viajante"] = 1
	begin_world()
	world.load_map("vila_lumen", "default")
	world.player.set_busy(true)
	ui.dialog(["Auralis, ano da Ruína. Uma expedição desapareceu na Floresta dos Esquecidos, e você chegou à Vila Lúmen para descobrir o porquê.",
		"A Anciã Maru, no centro da vila, espera por você. (WASD para andar, E para falar.)"], func():
		world.player.set_busy(false))

func continue_from_slot(slot: int) -> void:
	if not SaveSys.load_game(slot):
		ui.toast("Falha ao carregar: " + SaveSys.last_error)
		return
	ui.close_all()
	begin_world()
	var loc: Dictionary = Game.location
	var pos: Array = loc.get("pos", [])
	if pos.size() == 2:
		world.load_map(loc["map"], loc.get("spawn", "default"), Vector2(float(pos[0]), float(pos[1])))
	else:
		world.load_map(loc["map"], loc.get("spawn", "default"))
	world.player.state = Player.S.FREE

func back_to_title() -> void:
	ui.close_all()
	show_title()

func _unhandled_input(event: InputEvent) -> void:
	if not Game.in_game or ui.has_screen() or ui.is_modal():
		return
	if world.player == null or world.player.state == Player.S.DEAD:
		return
	if event.is_action_pressed("pause"):
		ui.open_pause()
	elif event.is_action_pressed("inventory"):
		ui.open_pause()
		ui.open_team()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and Game.in_game and ui != null and not ui.has_screen() and not ui.is_modal():
		ui.open_pause()
