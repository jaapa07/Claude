extends Ent
class_name FlorestaEnt
## Entidades extras da Floresta (ver scripts/floresta.gd). Sprites de floresta_props.png:
## 0 inscricao_off 1 inscricao_on 2 parede_musgo 3 parede_aberta 4 raiz_dormente 5 raiz_pronta
## 6 pedra_dica 7 tronco_oco 8 tronco_aberto 9 anel_marca

const FR := {"inscricao_off": 0, "inscricao_on": 1, "parede_musgo": 2, "parede_aberta": 3, "raiz_dormente": 4, "raiz_pronta": 5,
	"pedra_dica": 6, "tronco_oco": 7, "tronco_aberto": 8, "anel_marca": 9}

var motes: Array = []       # vagalumes que giram sobre o anel de flores
var mote_t := 0.0           # tempo restante da dança completa (depois fica só um brilho calmo)
var mark: AnimatedSprite2D  # brilho sobre a parede depois que a inscrição a aponta
var cshape: CollisionShape2D

func _ready() -> void:
	add_to_group("ents")
	collision_layer = 0
	collision_mask = 0
	solid = false
	reach = 24.0
	match kind:
		"inscricao_seiva":
			lit = Game.has_flag(_flag())
			_fr("inscricao_on" if lit else "inscricao_off", Vector2.ZERO)
		"parede_musgo":
			opened = Game.has_flag(_flag())
			_fr("parede_aberta" if opened else "parede_musgo", Vector2.ZERO)
			z_index = -1 if opened else 0
			reach = 26.0
			mark = AnimatedSprite2D.new()
			mark.sprite_frames = Art.fx_frames("fx_sparkle", 16, 12, 2, 5.0, true)
			mark.position = Vector2(0, -4)
			mark.modulate = Color(0.75, 1.0, 0.6, 0.85)
			mark.play("a")
			add_child(mark)
			refresh_mark()
		"anel_flores":
			_fr("anel_marca", Vector2(0, -2))
			opened = Game.has_flag(_flag())
			sprite.visible = opened
			if opened:
				_spawn_motes(3)
		"raiz_seiva":
			_fr("raiz_dormente", Vector2(0, -2))
			refresh_root()
		"dica_rito":
			_fr("pedra_dica", Vector2(0, -2))
			solid = true
		"tronco_oco":
			opened = Game.has_flag(_flag())
			_fr("tronco_aberto" if opened else "tronco_oco", Vector2(0, -2))
			solid = not opened
		"deco_seiva":
			# bacia de seiva (floresta_extras.png de 74_ritos.pxl: 5 vazia, 6 cheia) que enche com a flag "cheia"
			sprite = Sprite2D.new()
			sprite.texture = Art.sprite_tex("floresta_extras")
			sprite.region_enabled = true
			sprite.offset = Vector2(0, -2)
			add_child(sprite)
			refresh_basin()
	if solid:
		collision_layer = 1
		cshape = CollisionShape2D.new()
		var r := RectangleShape2D.new()
		r.size = Vector2(14, 14) if kind == "tronco_oco" else Vector2(12, 10)
		cshape.shape = r
		add_child(cshape)

func _flag() -> String:
	if kind == "inscricao_seiva":
		return str(def.get("flag", "lit_" + eid))
	return str(def.get("flag", "_nunca_"))

func _fr(name: String, off: Vector2) -> void:
	sprite = Sprite2D.new()
	sprite.texture = Art.sprite_tex("floresta_props")
	sprite.region_enabled = true
	sprite.region_rect = Rect2(int(FR[name]) * 16, 0, 16, 16)
	sprite.offset = off
	add_child(sprite)

func _set_fr(name: String) -> void:
	if sprite:
		sprite.region_rect = Rect2(int(FR[name]) * 16, 0, 16, 16)

# =============================================================== PROMPT / INTERAÇÃO
func prompt() -> String:
	match kind:
		"inscricao_seiva": return "Ler a inscrição" if lit else "Examinar"
		"parede_musgo": return "" if opened else "Examinar"
		"anel_flores": return "" if opened else "Observar o anel"
		"raiz_seiva": return "" if Game.has_flag(_flag()) else "Raiz Viva"
		"dica_rito": return "Pedra da dica"
		"tronco_oco": return "" if opened else "Examinar o tronco"
	return ""

func interact(_player: Node) -> void:
	match kind:
		"inscricao_seiva": _inscricao()
		"parede_musgo": _parede()
		"anel_flores": _anel()
		"raiz_seiva": _raiz()
		"dica_rito": _dica()
		"tronco_oco": _tronco()

# ---- inscrição de raízes (Santuário)
func _inscricao() -> void:
	if lit:
		_read_lines()
		return
	var ac := Game.active_ind()
	if not ac.is_empty() and Game.sp_of(ac).get("acao_id", "") == "luz" and world.companion != null and is_instance_valid(world.companion):
		light_up(ac)
		return
	world.say("Sulcos de raiz riscados na laje, apagados pela sombra. Uma luz viva os tornaria legíveis. (Lumipim)")
	Game.set_flag("viu_" + eid)

## Acende a inscrição (Pulso de luz ou ação do Lumipim) e marca a parede que ela aponta.
func light_up(by_ind: Variant) -> void:
	if lit:
		return
	lit = true
	Game.set_flag(_flag())
	_set_fr("inscricao_on")
	Audio.play("puzzle_ok", -4.0)
	world.spark(global_position + Vector2(0, -6), 6)
	if by_ind is Dictionary and not (by_ind as Dictionary).is_empty():
		world.companion.env_action_fx(global_position)
		Game.bond_activity(str(by_ind["uuid"]), "acao:" + eid)
	var par: String = str(def.get("parede", ""))
	if par != "":
		Game.set_flag("marcou_" + par)
		for e in world.get_tree().get_nodes_in_group("ents"):
			if e is FlorestaEnt and e.eid == par:
				e.refresh_mark()
	_read_lines()

func _read_lines() -> void:
	world.player.set_busy(true)
	world.ui.dialog(["Inscrição (sulcos de seiva acesos): \"Onde o musgo é pálido, a pedra é oca.\"",
		"Inscrição: \"Bata com força e ouça quem passou.\" Os sulcos se juntam numa seta que aponta para o oeste do corredor.",
		"Embaixo, riscada com outra mão: uma mão aberta — o sinal que você e a Mestra Ione usavam no treino."], func():
		world.player.set_busy(false))

# ---- parede musgosa (segredo do Santuário)
func refresh_mark() -> void:
	if mark:
		mark.visible = not opened and Game.has_flag("marcou_" + eid)

func _parede() -> void:
	if opened:
		return
	Game.set_flag("viu_" + eid)
	world.say("O musgo desta parede é mais pálido que o resto, e a pedra soa oca... Um golpe carregado (segure {atacar}) poderia rompê-la.")

func break_wall() -> void:
	if opened:
		return
	opened = true
	Game.set_flag(_flag())
	_set_fr("parede_aberta")
	z_index = -1
	refresh_mark()
	Audio.play("thud")
	Audio.on_treasure({}, true)
	world.shake(2.0, 0.2)
	world.fx_at("shards", global_position + Vector2(0, -4), 0.5, 0.0, 1.3)
	world.say("A pedra oca cedeu! Atrás do musgo pálido, uma câmara esquecida.")

# ---- anel de flores (Bosque)
func _anel() -> void:
	if opened:
		return
	var ac := Game.active_ind()
	var luz: bool = not ac.is_empty() and Game.sp_of(ac).get("acao_id", "") == "luz" and world.companion != null and is_instance_valid(world.companion)
	var neblina: bool = Weather.now() == "neblina"
	if not luz and not neblina:
		Game.set_flag("viu_" + eid)
		world.say("Um anel de flores perfeito, sem uma pétala fora do lugar. Na vila dizem que, na neblina, os Lumipins dançam aqui. (Volte com neblina ou com um Lumipim na equipe.)")
		return
	if luz:
		world.companion.env_action_fx(global_position)
		Game.bond_activity(str(ac["uuid"]), "acao:" + eid)
	opened = true
	sprite.visible = true
	_spawn_motes(8)
	mote_t = 5.0
	Audio.play("skill", -4.0)
	Audio.on_treasure({}, true)
	Game.set_flag(_flag())
	var abre: String = "A neblina desce sobre o anel e" if neblina else "O brilho do seu Lumipim chama os da mata:"
	world.player.set_busy(true)
	world.ui.dialog(["%s Lumipins surgem entre as flores, girando sobre o anel e piscando como vagalumes." % abre,
		"No centro pousa uma Lumipim mais velha, de luz mais forte. Presa à pata dela, uma fita azul gasta — o mesmo azul da capa da Mestra Ione.",
		"Ione passou por aqui e cuidou dela. Os Lumipins se lembram de quem os trata com carinho... e a velha Lumipim olha para você esperando o mesmo."], func():
		world.player.set_busy(false)
		world.autosave())

func _spawn_motes(n: int) -> void:
	for m in motes:
		if is_instance_valid(m):
			m.queue_free()
	motes.clear()
	for i in n:
		var a := AnimatedSprite2D.new()
		a.sprite_frames = Art.fx_frames("fx_lumi", 8, 8, 2, 4.0 + float(i % 3), true)
		a.play("a")
		a.frame = i % 2
		a.z_index = 20
		add_child(a)
		motes.append(a)

func refresh_basin() -> void:
	var full := Game.has_flag(str(def.get("cheia", "_nunca_")))
	sprite.region_rect = Rect2((6 if full else 5) * 16, 0, 16, 16)

# ---- raiz dormente (Rito da Seiva avançado)
func refresh_root() -> void:
	var done := Game.has_flag(_flag())
	var req: String = str(def.get("requires", ""))
	_set_fr("raiz_pronta" if done or req == "" or Game.has_flag(req) else "raiz_dormente")
	if sprite:
		sprite.modulate = Color(1, 1, 1, 0.55) if done else Color.WHITE

func _raiz() -> void:
	var flag := _flag()
	if Game.has_flag(flag):
		return
	if not Game.has_eco("raiz_viva"):
		world.say("Raízes dormem na beira do canal, esperando força para crescer. (Raiz Viva — volte depois do Cervo)")
		return
	var req: String = str(def.get("requires", ""))
	if req != "" and not Game.has_flag(req):
		world.say("A raiz está seca: faça a seiva correr por este canal antes de erguê-la. (alavanca)")
		return
	world.fx_roots(global_position + Vector2(0, -10), 18.0)
	Audio.play("bridge")
	Game.set_flag(flag)
	refresh_root()
	world.say("A Raiz Viva bebe a seiva e se ergue sobre o canal!")

# ---- pedra da dica do rito
func _dica() -> void:
	if Floresta.attempts(world) < Floresta.DICA_APOS:
		world.say("A pedra da dica está quieta. Ela só fala depois de algumas tentativas (%d/%d). Se uma caixa encalhar, toque a pedra de reinício." % [Floresta.attempts(world), Floresta.DICA_APOS])
		return
	world.start_dialog(str(def.get("dica", "rs_dica2")), self)

# ---- tronco oco (Grota)
func _tronco() -> void:
	if opened:
		return
	opened = true
	Game.set_flag(_flag())
	_set_fr("tronco_aberto")
	solid = false
	collision_layer = 0
	if cshape:
		cshape.queue_free()
		cshape = null
	Audio.play("thud", -2.0)
	Audio.on_treasure({}, true)
	world.dust(global_position)
	world.say("A casca estava solta e o tronco, oco por dentro: dá para passar! Do outro lado, uma toca escondida.")

func _process(delta: float) -> void:
	glow_t += delta
	if get_tree().paused:
		return
	if kind == "anel_flores" and not motes.is_empty():
		mote_t = max(0.0, mote_t - delta)
		var big := mote_t > 0.0
		var rad := 26.0 if big else 14.0
		var spd := 2.4 if big else 0.9
		for i in motes.size():
			var m: AnimatedSprite2D = motes[i]
			var ang := glow_t * spd + TAU * float(i) / float(motes.size())
			m.position = Vector2(cos(ang) * rad, sin(ang) * rad * 0.55 - 10.0 + sin(glow_t * 3.0 + i) * 2.0)
		if not big and motes.size() > 3:
			_spawn_motes(3)
	elif kind == "raiz_seiva" or kind == "deco_seiva":
		if int(glow_t * 4.0) % 4 == 0:
			if kind == "raiz_seiva":
				refresh_root()
			else:
				refresh_basin()
