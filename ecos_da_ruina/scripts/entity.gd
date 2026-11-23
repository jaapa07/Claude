extends StaticBody2D
class_name Ent
## Entidade interativa genérica do mapa: npc, sign, chest, shrine, flower, lever, plate, crate, vine, bridge_spot, bond_stone
## e, na Região 2: valve, furnace, brazier, cart, rail_lever, rail_marked, draft, crack, ore, anvil, spirit_mark, rite_reset, altar.

var world: Node
var def: Dictionary = {}
var kind := ""
var eid := ""
var sprite: Sprite2D
var anim: AnimatedSprite2D
var solid := false
var reach := 24.0
var lit := false          # flor
var lever_on := false     # alavanca
var opened := false       # baú
var pressed_by_crate := false
var held := false         # placa pressionada por criatura
var held_uuid := ""
var moving := false
var glow_t := 0.0
var shown_tile := Vector2i.ZERO
var timer := 0.0           # válvula temporizada
var lit_t := -1.0          # fornalha: segundos acesa (-1 = permanente)
var valve_open := false    # válvula de chefe (estado controlado pelo chefe)
var valve_cd := 0.0
var fire: AnimatedSprite2D
var roll_dir := Vector2i.ZERO
var roll_to := Vector2.ZERO
var steam: AnimatedSprite2D

const PROPS := {"valve_closed": 0, "valve_open": 1, "furnace_off": 2, "furnace_on": 3, "cart": 4, "lever_rail_a": 5, "lever_rail_b": 6,
	"ore_chunk": 7, "anvil": 8, "steam0": 9, "steam1": 10, "debris": 11}

func init(p_world: Node, d: Dictionary) -> void:
	world = p_world
	def = d
	kind = d["type"]
	eid = str(d.get("id", ""))
	position = Vector2(float(d["x"]) * 16.0 + 8.0, float(d["y"]) * 16.0 + 8.0)
	shown_tile = Vector2i(int(d["x"]), int(d["y"]))

func _ready() -> void:
	add_to_group("ents")
	collision_layer = 0
	collision_mask = 0
	match kind:
		"npc":
			solid = true
			anim = AnimatedSprite2D.new()
			anim.sprite_frames = Art.npc_frames(def.get("sprite", "npc_elder"))
			anim.offset = Vector2(0, -6)
			add_child(anim)
			anim.play("idle_down")
			_shadow()
		"sign":
			_spr("sign", Vector2(0, -2)); solid = true
		"chest":
			opened = Game.chests.has(eid)
			_spr("chest", Vector2(0, -2), true, 16, opened); solid = true
		"shrine":
			var s := _spr("shrine", Vector2(0, -8), true, 24, Game.has_flag("shrine_" + eid)); solid = true
		"flower":
			lit = Game.has_flag(world.puzzle_flag(def["group"]))
			_spr("flower", Vector2.ZERO, true, 16, lit)
		"lever":
			lever_on = world.lever_state(def["group"], int(def["idx"]))
			_spr("lever", Vector2.ZERO, true, 16, lever_on); solid = true
		"plate":
			_spr("plate", Vector2.ZERO, true, 16, false)
		"crate":
			_spr("crate", Vector2.ZERO); solid = true
		"vine":
			_spr("vine", Vector2(0, -4), true, 16, Game.has_flag(def.get("flag", "")))
			solid = false
		"bridge_spot":
			_spr("bridge_mark", Vector2.ZERO)
			sprite.modulate = Color(1, 1, 1, 0.75)
			solid = false
		"bond_stone":
			_spr("shrine", Vector2(0, -8), true, 24, Game.has_flag(def.get("flag", "")))
			solid = true
		"valve":
			_prop("valve_closed", Vector2(0, -2)); solid = true
			_refresh_valve()
		"furnace":
			_prop("furnace_off", Vector2(0, -4)); solid = true
			fire = _fire(Vector2(0, -10))
			if Game.has_flag(def.get("lit_flag", "_never_")) or Game.has_flag(world.puzzle_flag(def.get("group", ""))):
				lit = true
			_refresh_furnace()
		"brazier":
			_prop("furnace_on", Vector2(0, -4)); solid = true
			fire = _fire(Vector2(0, -10))
			fire.visible = true
		"cart":
			_prop("cart", Vector2(0, -2)); solid = true
			var goal: Array = def.get("goal", [])
			if goal.size() == 2 and _puzzle_done_for_goal():
				position = Vector2(float(goal[0]) * 16.0 + 8.0, float(goal[1]) * 16.0 + 8.0)
		"rail_lever":
			_prop("lever_rail_a", Vector2(0, -2)); solid = true
			refresh_rail_lever()
		"rail_marked":
			_spr("bridge_mark", Vector2.ZERO)
			sprite.modulate = Color(0.6, 0.8, 1.0, 0.85)
			sprite.visible = not Game.has_flag(def.get("flag", ""))
		"draft":
			steam = AnimatedSprite2D.new()
			steam.sprite_frames = Art.fx_frames_at("minas_props", 16, 16, 9, 2, 3.0, true)
			steam.position = Vector2(0, 8)
			steam.modulate = Color(1, 1, 1, 0.55)
			steam.play("a")
			add_child(steam)
			steam.visible = not Game.has_flag(def.get("flag", ""))
		"crack":
			_prop("debris", Vector2(0, 4))
			sprite.modulate = Color(1, 1, 1, 0.8)
			sprite.visible = not Game.has_flag(def.get("flag", ""))
		"ore":
			_prop("ore_chunk", Vector2.ZERO)
			opened = Game.chests.has(eid)
			sprite.visible = not opened
		"anvil":
			_prop("anvil", Vector2(0, -2)); solid = true
		"spirit_mark":
			_spr("fx_sparkle", Vector2(0, -6), true, 16, false)
			sprite.modulate = Color(0.8, 0.85, 1.0, 0.25)
		"rite_reset":
			_spr("sign", Vector2(0, -2)); solid = true
			sprite.modulate = Color(1.0, 0.7, 0.45)
		"altar":
			_spr("shrine", Vector2(0, -8), true, 24, Game.has_flag(def.get("flag", "")))
			sprite.modulate = Color(1.0, 0.75, 0.55)
			solid = true
	if solid:
		collision_layer = 1
		var cs := CollisionShape2D.new()
		var r := RectangleShape2D.new()
		r.size = Vector2(12, 10) if kind != "crate" else Vector2(14, 14)
		cs.shape = r
		add_child(cs)

func _shadow() -> void:
	var sh := Art.shadow(0.8)
	sh.position = Vector2(0, 7)
	add_child(sh)

func _spr(name: String, off: Vector2, sheet := false, fw := 16, second := false) -> Sprite2D:
	sprite = Sprite2D.new()
	sprite.texture = Art.sprite_tex(name)
	sprite.offset = off
	if sheet:
		sprite.region_enabled = true
		var th: int = sprite.texture.get_height()
		sprite.region_rect = Rect2(fw if second else 0, 0, fw, th)
	add_child(sprite)
	return sprite

func _prop(name: String, off: Vector2) -> Sprite2D:
	sprite = Sprite2D.new()
	sprite.texture = Art.sprite_tex("minas_props")
	sprite.region_enabled = true
	sprite.region_rect = Rect2(PROPS[name] * 16, 0, 16, 16)
	sprite.offset = off
	add_child(sprite)
	return sprite

func _set_prop(name: String) -> void:
	if sprite:
		sprite.region_rect = Rect2(PROPS[name] * 16, 0, 16, 16)

func _fire(off: Vector2) -> AnimatedSprite2D:
	var f := AnimatedSprite2D.new()
	f.sprite_frames = Art.fx_frames("fx_fire", 16, 16, 4, 10.0, true)
	f.position = off
	f.play("a")
	f.visible = false
	add_child(f)
	return f

func set_frame(second: bool, fw: int = 16) -> void:
	if sprite and sprite.region_enabled:
		sprite.region_rect = Rect2(fw if second else 0, 0, fw, sprite.texture.get_height())

# =============================================================== PROMPT / INTERAÇÃO
func prompt() -> String:
	match kind:
		"npc": return "Falar"
		"sign": return "Ler"
		"chest": return "" if opened else "Abrir"
		"shrine": return "Santuário"
		"flower": return "" if lit else "Acender"
		"lever": return "Puxar"
		"plate": return "Pressionar (criatura)" if Game.active_ind().get("species_id", "") in ["cascalito", "rocantor"] and not _pressed() and not def.get("so_carrinho", false) else ""
		"crate": return "Empurrar"
		"vine": return "" if Game.has_flag(def.get("flag", "")) else "Cipó"
		"bridge_spot": return "" if Game.has_flag(def.get("flag", "")) else "Raiz Viva"
		"bond_stone": return "" if Game.has_flag(def.get("flag", "")) else "Tocar"
		"valve": return "Válvula de água" if def.get("boss", false) else ("Válvula (fechar)" if Game.has_flag(def["flag"]) and not def.has("dura") else "Válvula")
		"furnace":
			if lit or def.has("lit_flag"):
				return ""
			if def.get("so_ruptura", false):
				return "Mecanismo térmico"
			var ac := Game.active_ind()
			if not ac.is_empty() and Game.sp_of(ac).get("acao_id", "") == "fogo":
				return "Acender (%s)" % Game.creature_name(ac)
			return "Acender" if world.player.carry_fire_t > 0.0 else "Fornalha fria"
		"brazier": return "Pegar chama"
		"cart": return "" if moving else "Empurrar carrinho"
		"rail_lever": return "Desvio"
		"rail_marked": return "" if Game.has_flag(def.get("flag", "")) else "Trilho marcado"
		"draft":
			if Game.has_flag(def.get("flag", "")):
				return ""
			return "Examinar o vapor" if def.get("hero", false) else "Corrente de ar"
		"crack": return "" if Game.has_flag(def.get("flag", "")) else "Rocha fissurada"
		"ore": return "" if opened else "Minerar"
		"anvil": return "Forja"
		"spirit_mark": return "Examinar"
		"rite_reset": return "Reiniciar rito"
		"altar": return "" if Game.has_flag(def.get("flag", "")) else "Altar do Rito"
	return ""

func interact(player: Node) -> void:
	match kind:
		"npc": world.talk_to(self)
		"sign": world.start_dialog(def["dialog"], self)
		"chest": _open_chest()
		"shrine": world.open_shrine(self)
		"flower": light(true)
		"lever": _pull_lever()
		"plate": _creature_press()
		"crate": _push(player)
		"vine": _vine()
		"bridge_spot": _bridge()
		"bond_stone": _bond()
		"valve": world.valve_use(self)
		"furnace": world.furnace_try(self)
		"brazier": world.take_fire(self)
		"cart": _push_cart(player)
		"rail_lever": world.rail_lever_toggle(self)
		"rail_marked": _rail_marked()
		"draft": _draft()
		"crack": _crack()
		"ore": _mine()
		"anvil": world.ui.open_forge()
		"spirit_mark": _spirit()
		"rite_reset": world.rite_reset(self)
		"altar": world.rite_altar(self)

func _open_chest() -> void:
	if opened:
		return
	opened = true
	Game.chests[eid] = true
	set_frame(true)
	Audio.play("pickup")
	Game.give_loot(def.get("loot", {}))
	if def.has("set_flag"):
		Game.set_flag(def["set_flag"])

# =============================================================== REGIÃO 2
func _refresh_valve() -> void:
	var open: bool = valve_open if def.get("boss", false) else Game.has_flag(def.get("flag", ""))
	_set_prop("valve_open" if open else "valve_closed")
	if sprite:
		sprite.modulate = Color(0.6, 0.6, 0.7) if (def.get("boss", false) and valve_cd > 0.0 and not valve_open) else Color.WHITE

func _puzzle_done_for_goal() -> bool:
	for e in world.ent_defs:
		if e["type"] == "plate" and e.get("so_carrinho", false):
			var g: Array = def.get("goal", [])
			if int(e["x"]) == int(g[0]) and int(e["y"]) == int(g[1]):
				return Game.has_flag(world.puzzle_flag(e["group"]))
	return false

func light_furnace() -> void:
	if lit:
		return
	lit = true
	lit_t = float(def.get("dura", -1.0))
	Audio.play("skill", -4.0)
	world.fx_at("fire", global_position + Vector2(0, -10), 0.5, 0.0, 1.3)
	_refresh_furnace()
	if def.has("group"):
		world.puzzle_changed(def["group"])

func _refresh_furnace() -> void:
	_set_prop("furnace_on" if lit else "furnace_off")
	if fire:
		fire.visible = lit

func refresh_rail_lever() -> void:
	_set_prop("lever_rail_b" if world.rail_switch.get(def["id"], "a") == "b" else "lever_rail_a")

func _push_cart(player: Node) -> void:
	if moving:
		return
	var d: Vector2 = (global_position - player.global_position)
	var dir := Vector2i(int(sign(d.x)), 0) if abs(d.x) > abs(d.y) else Vector2i(0, int(sign(d.y)))
	if player.aim_dir.dot(Vector2(dir).normalized()) < 0.4:
		world.say("Fique de frente para o carrinho.")
		return
	var cell := Vector2i(int(floor(global_position.x / 16.0)), int(floor(global_position.y / 16.0)))
	if not world.is_rail(cell + dir) or not world.cart_cell_free(global_position + Vector2(dir) * 16.0, self):
		world.say("O carrinho só anda sobre os trilhos.")
		return
	roll_dir = dir
	roll_to = global_position + Vector2(dir) * 16.0
	moving = true
	Audio.play("thud", -8.0)

func _roll(delta: float) -> void:
	var step := 96.0 * delta
	var to := roll_to - global_position
	if to.length() > step:
		global_position += to.normalized() * step
		return
	global_position = roll_to
	var cell := Vector2i(int(floor(global_position.x / 16.0)), int(floor(global_position.y / 16.0)))
	var nd: Vector2i = world.cart_next_dir(cell, roll_dir)
	if nd != Vector2i.ZERO and world.cart_cell_free(global_position + Vector2(nd) * 16.0, self):
		roll_dir = nd
		roll_to = global_position + Vector2(nd) * 16.0
	else:
		moving = false
		roll_dir = Vector2i.ZERO
		Audio.play("thud", -6.0)
		world.puzzle_changed("*")

func _rail_marked() -> void:
	var flag: String = def.get("flag", "")
	if Game.has_flag(flag):
		return
	if world.creature_action(self, "trilho", "%s puxou o trilho de ferro sobre a lava! Um caminho se abriu.",
			"Trilho metálico marcado: um Ferrunho consegue arrastá-lo até aqui. (caminho opcional)"):
		Audio.play("bridge")
		Game.set_flag(flag)
		sprite.visible = false

func _draft() -> void:
	var flag: String = def.get("flag", "")
	if Game.has_flag(flag):
		return
	if def.get("hero", false):
		# segredo por observação: o vapor que vaza denuncia uma placa solta
		Audio.play("thud")
		world.steam_at(global_position + Vector2(0, -6), 1.2)
		Game.set_flag(flag)
		world.say(def.get("msg", "Você força a placa solta de onde o vapor vazava. Uma passagem!"))
		steam.visible = false
		return
	if world.creature_action(self, "fumaca", "%s soprou fumaça: a corrente de ar revela uma fresta na rocha!",
			"Um ar frio escapa da rocha... algo que faça fumaça mostraria por onde. (Fuligin)"):
		world.smoke_cloud(global_position + Vector2(0, 10), 20.0, 2.0)
		Audio.play("dodge")
		Game.set_flag(flag)
		steam.visible = false

func _crack() -> void:
	if Game.has_flag(def.get("flag", "")):
		return
	if not Game.has_eco("ruptura_ignea"):
		world.say("Rocha fissurada: a rachadura brilha quente por dentro. Só uma explosão ígnea a romperia. (Ruptura Ígnea)")
		return
	world.eco_ruptura(global_position + world.player.aim_dir * 8.0, world.player.aim_dir)
	break_rock()

func break_rock() -> void:
	var flag: String = def.get("flag", "")
	if flag == "" or Game.has_flag(flag):
		return
	Game.set_flag(flag)
	Audio.play("thud")
	world.fx_at("shards", global_position + Vector2(0, -4), 0.5, 0.0, 1.4)
	world.say("A Ruptura Ígnea partiu a rocha fissurada!")
	if sprite:
		sprite.visible = false

func _mine() -> void:
	if opened:
		return
	opened = true
	Game.chests[eid] = true
	Audio.play("hit")
	world.fx_at("shards", global_position, 0.4)
	Game.give_loot(def.get("loot", {"minerio_cobre": 1}))
	sprite.visible = false

func _spirit() -> void:
	var eco: String = def.get("requires_eco", "olhar_velado")
	if Game.has_eco(eco):
		world.start_dialog(def.get("dialog", "placa_veio"), self)
		return
	world.say(def.get("msg", "Há algo oculto aqui: um brilho fraco que olhos comuns não decifram. (Olhar Velado — volte depois)"))
	Game.set_flag("viu_oculto_" + eid)

func light(by_hero: bool) -> void:
	if lit:
		return
	lit = true
	set_frame(true)
	Audio.play("lever", -4.0)
	world.puzzle_changed(def["group"])

func _pull_lever() -> void:
	world.lever_pull(def["group"], int(def["idx"]))

func refresh_lever() -> void:
	lever_on = world.lever_state(def["group"], int(def["idx"]))
	set_frame(lever_on)

func _pressed() -> bool:
	return pressed_by_crate or held or Game.has_flag(world.puzzle_flag(def.get("group", "")))

func _creature_press() -> void:
	if def.get("so_carrinho", false):
		world.say("Batente de trilho: só o peso de um carrinho o aciona.")
		return
	var ac := Game.active_ind()
	if ac.is_empty() or Game.sp_of(ac).get("acao_id", "") != "placa":
		world.say("Só uma criatura pesada (Cascalito) pode pressionar esta placa.")
		return
	held = true
	held_uuid = ac["uuid"]
	Game.bond_activity(ac["uuid"], "acao:" + eid)
	world.puzzle_changed(def["group"])
	Audio.play("lever")

func _push(player: Node) -> void:
	if moving:
		return
	var d: Vector2 = (global_position - player.global_position)
	var dir = Vector2.RIGHT * sign(d.x) if abs(d.x) > abs(d.y) else Vector2.DOWN * sign(d.y)
	if player.aim_dir.dot(dir.normalized()) < 0.4:
		world.say("Fique de frente para a caixa.")
		return
	var tgt = global_position + dir * 16.0
	if not world.cell_free_for_crate(tgt, self):
		world.say("A caixa não se move.")
		return
	moving = true
	var tw := create_tween()
	tw.tween_property(self, "global_position", tgt, 0.18)
	tw.tween_callback(func():
		moving = false
		world.puzzle_changed("*"))
	Audio.play("thud", -8.0)

func _vine() -> void:
	var flag: String = def.get("flag", "")
	if Game.has_flag(flag):
		return
	var ac := Game.active_ind()
	if ac.is_empty() or Game.sp_of(ac).get("acao_id", "") != "cipo":
		world.say("Suporte marcado: um Brotisco consegue estender cipós aqui. (atalho opcional)")
		return
	Game.bond_activity(ac["uuid"], "acao:" + eid)
	Audio.play("roots")
	set_frame(true)
	Game.set_flag(flag)
	world.say("%s estendeu cipós! Um atalho se abriu." % Game.creature_name(ac))

func _bridge() -> void:
	var flag: String = def.get("flag", "")
	if Game.has_flag(flag):
		return
	var eco: String = def.get("requires_eco", "raiz_viva")
	if not Game.has_eco(eco):
		world.say("As raízes de um Eco poderiam cruzar aqui... (Raiz Viva)")
		return
	Audio.play("bridge")
	Game.set_flag(flag)
	world.say("A Raiz Viva ergueu uma ponte!")

func _bond() -> void:
	var flag: String = def.get("flag", "")
	if Game.has_flag(flag):
		return
	Game.set_flag(flag)
	for u in Game.team:
		Game.bond_activity(u, "missao:clareira_vinculo")
	Audio.play("levelup")
	world.say("A Pedra de Vínculo ressoa: sua equipe fortaleceu o vínculo!")
	set_frame(true, 24)

# =============================================================== FRAME
func _physics_process(delta: float) -> void:
	if kind == "cart" and moving and not get_tree().paused:
		_roll(delta)

func _process(delta: float) -> void:
	glow_t += delta
	if get_tree().paused:
		return
	match kind:
		"valve":
			if timer > 0.0:
				timer -= delta
				if timer <= 0.0 and Game.has_flag(def["flag"]):
					Game.set_flag(def["flag"], false)
					Audio.play("lever", -6.0)
					world.say("A válvula fechou sozinha: o piso volta a esquentar.")
			if valve_cd > 0.0:
				valve_cd -= delta
			_refresh_valve()
		"furnace":
			if lit and lit_t > 0.0 and not Game.has_flag(world.puzzle_flag(def.get("group", ""))):
				lit_t -= delta
				if lit_t <= 0.0:
					lit = false
					lit_t = -1.0
					_refresh_furnace()
					world.furnace_went_out(self)
			if def.has("lit_flag") and not lit and Game.has_flag(def["lit_flag"]):
				lit = true
				_refresh_furnace()
	if kind == "plate":
		var was := pressed_by_crate
		pressed_by_crate = world.crate_on(position)
		if held and (Game.active_ind().get("uuid", "") != held_uuid):
			held = false
			world.puzzle_changed(def["group"])
		if was != pressed_by_crate:
			world.puzzle_changed(def["group"])
		set_frame(_pressed())
	if kind == "npc":
		var p: Node = world.player
		if p != null:
			var d: Vector2 = p.global_position - global_position
			if d.length() < 60.0:
				var n := "idle_" + Art.dir_name(d)
				if anim.animation != n:
					anim.play(n)
	if kind == "shrine":
		set_frame(Game.has_flag("shrine_" + eid), 24)

