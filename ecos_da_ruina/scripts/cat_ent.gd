extends FortEnt
class_name CatEnt
## Mecanismos da Catedral do Vazio (Região 5), com sprites de assets/src/88_catedral_objetos.pxl (cat_props.png).
## Reaproveitam o feixe de luz da Região 4 (FortEnt.retrace): emissor = lente, cristal = receptor de luz.
##  prisma       — redireciona o feixe para a direção "dir" (seta). Só um Cristil/Prismal o gira (ação "prisma"); espelhos são a solução local.
##  emissor      — fonte do feixe (direção "dir").
##  cristal      — cristal receptor (grupo "group" em puzzles do tipo "receptores").
##  ancora       — âncora gravitacional: segura fragmentos no lugar (flag). Solução local: contrapeso (bloco na placa do mesmo grupo/flag);
##                 alternativa: um Gravito/Monolito a sustenta (ação "ancora").
##  raiz         — suporte de raiz: a Raiz Viva ergue uma ponte (flag).
##  cristal_eco  — cristal rachado: a Ruptura Ígnea o estilhaça (flag).
##  marca        — marca espiritual: o Olhar Velado (ou um Velúnio, ação "marca") a materializa num caminho (flag). "requires": flag prévia.
##  circulo      — anel de marcas: revelado pelo Olhar Velado, atrai o Velúnio (flag).
##  elo          — elo da corrente que prende a Mestra Ione: cada um cede a um Eco ("eco").
##  cristal_ione — a prisão de cristal da Mestra Ione (32x48).
##  selo_harmonia— selo que só a Harmonia dos Ecos abre (pós-jogo).
##  adorno       — decoração ("frame"): estandartes, lanternas e fitas de festa do epílogo.
##  nome         — criado pelo Rei dos Ecos ao hesitar: o herói devolve a ele o nome "Ivar".

const CPROPS := {"prisma": 0, "prisma_seta": 1, "emissor": 2, "cristal_off": 3, "cristal_on": 4, "ancora_off": 5, "ancora_on": 6,
	"elo": 7, "elo_partido": 8, "raiz_off": 9, "raiz_on": 10, "rachadura": 11, "marca_off": 12, "marca_on": 13, "circulo": 14,
	"selo_harmonia": 15, "estandarte": 16, "lanterna_festa": 17, "vitral": 18, "fita_festa": 19, "flores_festa": 20, "nome": 21, "feixe": 22}
## nomes da Região 4 que os mecanismos herdados pedem -> desenho da Catedral
const ALIAS := {"sun_lens": "emissor", "receptor_on": "cristal_on", "receptor_off": "cristal_off"}

var out_dir := Vector2i(1, 0)
var seta: Sprite2D
var aura: Sprite2D
var my_kind := ""

func init(p_world: Node, d: Dictionary) -> void:
	super.init(p_world, d)
	my_kind = kind
	# o feixe da Região 4 trata emissor e cristal como lente e receptor
	if kind == "emissor":
		kind = "lente"
	elif kind == "cristal":
		kind = "receptor"

func _ready() -> void:
	if kind in ["lente", "receptor"]:
		super._ready()
		return
	add_to_group("ents")
	collision_layer = 0
	collision_mask = 0
	solid = true
	reach = 22.0
	match kind:
		"prisma":
			var d: Array = def.get("dir", [1, 0])
			out_dir = Vector2i(int(d[0]), int(d[1]))
			_fprop("prisma", Vector2(0, -4))
			seta = _sub("prisma_seta", Vector2(0, -4))
			_turn_arrow()
		"ancora":
			lit = Game.has_flag(def.get("flag", ""))
			_fprop("ancora_on" if lit else "ancora_off", Vector2(0, -6))
		"elo":
			lit = Game.has_flag(def.get("flag", ""))
			_fprop("elo_partido" if lit else "elo", Vector2(0, -4))
			if str(def.get("eco", "")) == "olhar_velado" and not lit:
				sprite.modulate = Color(0.8, 0.8, 1.0, 0.15)
				solid = false
		"raiz":
			solid = false
			lit = Game.has_flag(def.get("flag", ""))
			_fprop("raiz_on" if lit else "raiz_off", Vector2(0, 0))
		"cristal_eco":
			solid = false
			lit = Game.has_flag(def.get("flag", ""))
			_fprop("rachadura", Vector2(0, -2))
			sprite.visible = not lit
		"marca":
			solid = false
			lit = Game.has_flag(def.get("flag", ""))
			_fprop("marca_on" if lit else "marca_off", Vector2(0, 0))
			sprite.modulate = Color(1, 1, 1, 1.0 if lit else 0.45)
			if def.has("requires") and not Game.has_flag(str(def["requires"])):
				sprite.visible = false
		"circulo":
			solid = false
			lit = Game.has_flag(def.get("flag", ""))
			_fprop("circulo", Vector2(0, 0))
			sprite.modulate = Color(1, 1, 1, 1.0 if lit else 0.3)
		"selo_harmonia":
			lit = Game.has_flag(def.get("flag", ""))
			_fprop("selo_harmonia", Vector2(0, -6))
			sprite.modulate = Color(1, 1, 1, 0.5 if lit else 1.0)
			solid = not lit
		"adorno":
			solid = bool(def.get("solid", false))
			_fprop(str(def.get("frame", "estandarte")), Vector2(0, -8))
		"cristal_ione":
			lit = Game.has_flag("ione_livre")
			sprite = Sprite2D.new()
			sprite.texture = Art.sprite_tex("cristal_ione")
			sprite.region_enabled = true
			sprite.region_rect = Rect2(32 if lit else 0, 0, 32, 48)
			sprite.offset = Vector2(0, -18)
			add_child(sprite)
			solid = not lit
		"nome":
			solid = false
			_fprop("nome", Vector2(0, -6))
			reach = 40.0
		"eco_ione":
			# Eco de Ione: a figura dela, azul e translúcida, sempre um passo à frente (antes do resgate)
			solid = false
			reach = 30.0
			var a := AnimatedSprite2D.new()
			a.sprite_frames = Art.npc_frames("npc_ione")
			a.offset = Vector2(0, -6)
			a.modulate = Color(0.55, 0.8, 1.5, 0.55)
			a.play("idle_down")
			add_child(a)
			anim = a
	if solid:
		collision_layer = 1
		var cs := CollisionShape2D.new()
		var r := RectangleShape2D.new()
		r.size = Vector2(20, 12) if kind == "cristal_ione" else Vector2(12, 10)
		cs.shape = r
		add_child(cs)

## Sprites da folha cat_props (os nomes da Região 4 viram os desenhos da Catedral).
func _fprop(name: String, off: Vector2) -> void:
	var n: String = ALIAS.get(name, name)
	sprite = Sprite2D.new()
	sprite.texture = Art.sprite_tex("cat_props")
	sprite.region_enabled = true
	sprite.region_rect = Rect2(CPROPS[n] * 16, 0, 16, 16)
	sprite.offset = off
	add_child(sprite)

func _fset(name: String) -> void:
	var n: String = ALIAS.get(name, name)
	if sprite and CPROPS.has(n):
		sprite.region_rect = Rect2(CPROPS[n] * 16, 0, 16, 16)

func _sub(name: String, off: Vector2) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = Art.sprite_tex("cat_props")
	s.region_enabled = true
	s.region_rect = Rect2(CPROPS[name] * 16, 0, 16, 16)
	s.offset = off
	add_child(s)
	return s

func _turn_arrow() -> void:
	if seta:
		seta.rotation = Vector2(out_dir).angle()
		seta.position = Vector2(0, -4)
		seta.offset = Vector2.ZERO

func _acao() -> String:
	var ac := Game.active_ind()
	return Game.sp_of(ac).get("acao_id", "") if not ac.is_empty() else ""

# =============================================================== PROMPT / INTERAÇÃO
func prompt() -> String:
	match kind:
		"lente": return "Examinar"
		"receptor": return "" if lit else "Cristal"
		"prisma": return "Girar prisma" if _acao() == "prisma" else "Prisma"
		"ancora":
			if lit:
				return ""
			return "Sustentar a âncora" if _acao() == "ancora" else "Âncora"
		"elo":
			if lit:
				return ""
			if str(def.get("eco", "")) == "olhar_velado" and not revealed:
				return ""
			return "Elo da corrente"
		"raiz": return "" if lit else "Raiz Viva"
		"cristal_eco": return "" if lit else "Cristal rachado"
		"marca":
			if lit or (sprite and not sprite.visible):
				return ""
			return "Marca espiritual"
		"circulo": return "" if lit else "Anel de marcas"
		"selo_harmonia": return "" if lit else "Selo da Harmonia"
		"adorno": return "Examinar" if def.has("dialog") else ""
		"cristal_ione": return "" if Game.has_flag("ione_livre") else "Mestra Ione"
		"nome": return "Dizer o nome"
		"eco_ione": return "" if Game.has_flag("ione_livre") else "Eco de Ione"
	return ""

func interact(player: Node) -> void:
	if def.has("dica_grupo"):
		_count_try(str(def["dica_grupo"]))
	match kind:
		"lente":
			world.say("Um olho de cristal lança a luz do vitral num feixe. Espelhos desviam; prismas dobram.")
		"receptor":
			world.say("Cristal receptor: acende quando um feixe de luz o atinge.")
		"prisma": _prisma()
		"ancora": _ancora()
		"elo": _elo()
		"raiz": _raiz()
		"cristal_eco": _cristal()
		"marca": _marca()
		"circulo": _circulo()
		"selo_harmonia": _selo()
		"adorno":
			if def.has("dialog"):
				world.start_dialog(def["dialog"], self)
		"cristal_ione":
			world.start_dialog("cristal_ione", self)
		"nome":
			Catedral.say_name(world, def.get("rei_node"))
		"eco_ione":
			world.start_dialog(str(def.get("dialog", "eco_ione_1")), self)

func _prisma() -> void:
	if world.creature_action(self, "prisma", "%s cantou no cristal: o prisma gira e dobra o feixe!",
			"O prisma vibra, pesado demais para a mão. Um Cristil o faria girar com a própria luz — os espelhos da sala também levam o feixe."):
		turn_prisma()

func turn_prisma() -> void:
	out_dir = Vector2i(-out_dir.y, out_dir.x)    # gira 90° no sentido horário (direita -> baixo -> esquerda -> cima)
	_turn_arrow()
	Audio.play("lever", -4.0)
	world.fx_at("sparkle", global_position + Vector2(0, -10), 0.4)
	FortEnt.retrace(world)

func _ancora() -> void:
	if lit:
		return
	if world.creature_action(self, "ancora", "%s firmou a âncora: os fragmentos param no lugar!",
			"Âncora gravitacional sem peso: os fragmentos ao redor caem no vazio. Ponha um contrapeso na placa ao lado — ou peça a um Gravito que a sustente."):
		hold_anchor()

func hold_anchor() -> void:
	if lit:
		return
	lit = true
	_fset("ancora_on")
	Audio.play("bridge")
	world.fx_at("pulse", global_position + Vector2(0, -6), 0.4, 0.0, 0.8)
	Game.set_flag(def.get("flag", ""))

func _elo() -> void:
	if lit:
		return
	var eco: String = def.get("eco", "")
	if not Game.has_eco(eco):
		world.say("O elo não cede. Precisa de um Eco: %s." % Data.skills.get(eco, {}).get("nome", eco))
		return
	match eco:
		"raiz_viva":
			world.fx_roots(global_position, 30.0)
			Audio.play("roots")
		"ruptura_ignea":
			world.fx_at("fire", global_position + Vector2(0, -8), 0.6, 0.0, 1.5)
			Audio.play("thud")
		"olhar_velado":
			world.fx_at("sparkle", global_position + Vector2(0, -8), 0.6, 0.0, 1.4)
			Audio.play("skill")
		_:
			world.fx_at("vortex", global_position + Vector2(0, -8), 0.5)
			Audio.play("dodge")
	break_link()

func break_link() -> void:
	if lit:
		return
	lit = true
	_fset("elo_partido")
	sprite.modulate = Color.WHITE
	world.shake(1.2, 0.2)
	var nomes := {"raiz_viva": "A raiz arranca o elo do chão!", "ruptura_ignea": "O calor da Ruptura derrete o elo!",
		"olhar_velado": "Visto, o elo invisível se desfaz em luz!", "passo_umbral": "Do lado de dentro da sombra, o elo cede ao seu passo!"}
	world.say(nomes.get(str(def.get("eco", "")), "O elo se parte!"))
	Game.set_flag(def.get("flag", ""))

## Ecos lançados por perto (Raiz Viva, Ruptura Ígnea, Olhar Velado, Harmonia) agem sobre o mecanismo certo.
func eco_hit(eco: String) -> bool:
	match kind:
		"raiz":
			if eco == "raiz_viva" and not lit:
				grow_root(); return true
		"cristal_eco":
			if eco == "ruptura_ignea" and not lit:
				shatter_crystal(); return true
		"marca":
			if eco in ["olhar_velado", "harmonia"] and not lit and sprite and sprite.visible:
				materialize(); return true
		"circulo":
			if eco in ["olhar_velado", "harmonia"] and not lit:
				reveal_circle(); return true
		"elo":
			if lit:
				return false
			if eco == "olhar_velado" and str(def.get("eco", "")) == "olhar_velado":
				_reveal_elo()
				return true
			if eco == str(def.get("eco", "")) and eco in ["raiz_viva", "ruptura_ignea"]:
				break_link(); return true
		"selo_harmonia":
			if eco == "harmonia" and not lit:
				open_selo(); return true
	return false

func _reveal_elo() -> void:
	if revealed:
		return
	revealed = true
	solid = true
	if sprite:
		sprite.modulate = Color(0.9, 0.85, 1.0, 1.0)
	world.spawn_text(global_position + Vector2(0, -22), "Elo revelado", Color(0.85, 0.75, 1.0))

func _raiz() -> void:
	if lit:
		return
	if not Game.has_eco("raiz_viva"):
		world.say("Um suporte de raiz seca sobre o vazio. A Raiz Viva o faria crescer. (Raiz Viva)")
		return
	world.fx_roots(global_position, 26.0)
	Audio.play("roots")
	grow_root()

func grow_root() -> void:
	if lit:
		return
	lit = true
	_fset("raiz_on")
	Audio.play("bridge")
	Game.set_flag(def.get("flag", ""))
	world.say(def.get("msg", "A Raiz Viva cresce sobre o vazio e vira ponte!"))

func _cristal() -> void:
	if lit:
		return
	if not Game.has_eco("ruptura_ignea"):
		world.say("Cristal de eco rachado, quente por dentro. (Ruptura Ígnea)")
		return
	world.eco_ruptura(global_position + world.player.aim_dir * 8.0, world.player.aim_dir)
	shatter_crystal()

func shatter_crystal() -> void:
	if lit:
		return
	lit = true
	if sprite:
		sprite.visible = false
	Audio.play("thud")
	world.fx_at("shards", global_position + Vector2(0, -8), 0.5, 0.0, 1.3)
	Game.set_flag(def.get("flag", ""))
	world.say(def.get("msg", "O cristal de eco se estilhaça!"))
	# marcas escondidas atrás do cristal aparecem
	for e in world.get_tree().get_nodes_in_group("ents"):
		if e is CatEnt and e.kind == "marca" and str(e.def.get("requires", "")) == str(def.get("flag", "")) and e.sprite:
			e.sprite.visible = true

func _marca() -> void:
	if lit:
		return
	if _acao() == "marca" and world.companion != null and is_instance_valid(world.companion):
		var ac := Game.active_ind()
		world.companion.env_action_fx(global_position)
		Game.bond_activity(ac["uuid"], "acao:" + eid)
		world.say("%s tocou a marca com a própria sombra: ela ganha corpo!" % Game.creature_name(ac))
		materialize()
		return
	if Game.has_eco("olhar_velado"):
		world.eco_olhar(world.player.global_position)
		return
	world.say("Uma marca espiritual tremula no chão. (Olhar Velado — ou um Velúnio)")

func materialize() -> void:
	if lit:
		return
	lit = true
	_fset("marca_on")
	if sprite:
		sprite.modulate = Color.WHITE
	Audio.play("bridge")
	world.fx_pulse(global_position, 36.0)
	Game.set_flag(def.get("flag", ""))
	world.say(def.get("msg", "A marca espiritual se materializa num caminho de luz!"))

func _circulo() -> void:
	if lit:
		return
	if Game.has_eco("olhar_velado"):
		world.eco_olhar(world.player.global_position)
		return
	world.say("Pedras em anel, com marcas apagadas. Parece que algo dorme aqui quando ninguém olha direito.")

func reveal_circle() -> void:
	if lit:
		return
	lit = true
	if sprite:
		sprite.modulate = Color.WHITE
	Audio.on_treasure({}, true)
	world.fx_pulse(global_position, 30.0)
	Game.set_flag(def.get("flag", ""))
	world.say(def.get("msg", "As marcas do anel acendem em violeta... e um Velúnio sai da sombra, curioso!"))
	world.refresh_entities()

func _selo() -> void:
	if lit:
		return
	if Game.has_eco("harmonia"):
		Catedral.eco_harmonia(world)
		return
	world.say("Um selo com as cinco marcas dos guardiões. Só a Harmonia dos Ecos o abre.")

func open_selo() -> void:
	if lit:
		return
	lit = true
	if sprite:
		sprite.modulate = Color(1, 1, 1, 0.5)
	Audio.play("puzzle_ok")
	Game.set_flag(def.get("flag", ""))
	world.say("As cinco marcas acendem juntas: o Salão da Harmonia se abre!")

## Câmara do Eco: o cristal se parte quando os quatro elos cedem.
func shatter() -> void:
	lit = true
	solid = false
	collision_layer = 0
	if sprite:
		sprite.region_rect = Rect2(32, 0, 32, 48)
	for k in 6:
		world.fx_at("shards", global_position + Vector2(randf_range(-14, 14), randf_range(-36, 0)), 0.6, 0.0, 1.2)

func _process(delta: float) -> void:
	super._process(delta)
	if get_tree().paused:
		return
	match kind:
		"marca", "circulo":
			if not lit and sprite:
				sprite.modulate.a = 0.3 + 0.2 * sin(glow_t * 3.0)
		"nome":
			if sprite:
				sprite.modulate = Color(1.0, 0.9, 0.6, 0.7 + 0.3 * sin(glow_t * 5.0))
		"eco_ione":
			if anim:
				anim.modulate.a = 0.4 + 0.2 * sin(glow_t * 2.5)
				anim.position.y = -1.0 + sin(glow_t * 1.7) * 1.5
		"ancora":
			if lit and sprite:
				sprite.modulate = Color(1.0 + 0.12 * sin(glow_t * 4.0), 1.0, 1.0)
