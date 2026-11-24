extends Node
## Ponto de entrada: título, novo jogo, continuar, pausa. O jogo roda inteiro a partir daqui.

var world: World
var ui: Node
var title_bg: TextureRect
var title_logo: Control
var e2e: Node = null

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	# celular pelo navegador: a escala inteira deixava o jogo em 480x270 pontos numa tela de ~750x340 (iPhone deitado),
	# com faixas pretas largas; a escala fracionária ocupa a altura toda (a tela de 3x densidade esconde a diferença de pixel)
	if OS.has_feature("web") and (OS.has_feature("web_ios") or OS.has_feature("web_android") or DisplayServer.is_touchscreen_available()):
		get_tree().root.content_scale_stretch = Window.CONTENT_SCALE_STRETCH_FRACTIONAL
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
	var pw := HeroPowers.new()
	pw.player = world.player
	world.player.add_child(pw)
	world.player.powers = pw
	var touch := TouchControls.new()
	touch.main = self
	add_child(touch)
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
	# o herói tem amnésia: só lembra que é aprendiz da Mestra Ione e carrega a carta dela (docs/HISTORIA.md)
	ui.dialog(["Auralis, ano da Ruína. O Eco — a energia que dá voz às criaturas e às terras — está adoecendo, e fissuras se abrem entre o mundo e sua memória.",
		"Você acorda na beira da estrada que leva a Lúmen, com a cabeça pesada e o céu girando. Não lembra de onde veio. Não lembra nem do próprio rosto.",
		"Só uma coisa ficou: um nome, Mestra Ione. Você é aprendiz dela. Disso você tem certeza, mesmo sem saber por quê.",
		"No bolso, uma carta com a letra dela: \"Se eu não voltar, vá a Lúmen. Procure a Anciã Maru. E traga selos.\" Pela carta, você sabe que ela partiu com uma expedição e não voltou.",
		"Seu objetivo: reunir os Ecos dos cinco guardiões, recuperar o que você esqueceu, abrir caminho até a Catedral do Vazio e trazer Ione de volta. (Acompanhe em Menu > Jornada.)",
		"A Anciã Maru, no centro da vila, espera por você. (Ande com {andar}; fale com {interagir}.)"], func():
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
