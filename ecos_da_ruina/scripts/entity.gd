extends StaticBody2D
class_name Ent
## Entidade interativa genérica do mapa: npc, sign, chest, shrine, flower, lever, plate, crate, vine, bridge_spot, bond_stone.

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
			anim.sprite_frames = Art.human_frames(def.get("sprite", "npc_elder"))
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
			solid = false
		"bond_stone":
			_spr("shrine", Vector2(0, -8), true, 24, Game.has_flag(def.get("flag", "")))
			solid = true
	if solid:
		collision_layer = 1
		var cs := CollisionShape2D.new()
		var r := RectangleShape2D.new()
		r.size = Vector2(12, 10) if kind != "crate" else Vector2(14, 14)
		cs.shape = r
		add_child(cs)

func _shadow() -> void:
	var sh := Sprite2D.new()
	sh.texture = Art.sprite_tex("shadow")
	sh.position = Vector2(0, 7)
	sh.show_behind_parent = true
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
		"plate": return "Pressionar (criatura)" if Game.active_ind().get("species_id", "") in ["cascalito", "rocantor"] and not _pressed() else ""
		"crate": return "Empurrar"
		"vine": return "" if Game.has_flag(def.get("flag", "")) else "Cipó"
		"bridge_spot": return "" if Game.has_flag(def.get("flag", "")) else "Raiz Viva"
		"bond_stone": return "" if Game.has_flag(def.get("flag", "")) else "Tocar"
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

func _open_chest() -> void:
	if opened:
		return
	opened = true
	Game.chests[eid] = true
	set_frame(true)
	Audio.play("pickup")
	Game.give_loot(def.get("loot", {}))

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
	queue_redraw()

func _pressed() -> bool:
	return pressed_by_crate or held or Game.has_flag(world.puzzle_flag(def.get("group", "")))

func _creature_press() -> void:
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
func _process(delta: float) -> void:
	glow_t += delta
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
	if kind in ["lever", "flower", "shrine", "bridge_spot"]:
		queue_redraw()

func _draw() -> void:
	if kind == "lever":
		# glifo de estado (forma + posição): triângulo para cima = erguida, para baixo = abaixada
		var y := -14.0
		if lever_on:
			draw_colored_polygon(PackedVector2Array([Vector2(-4, y + 6), Vector2(4, y + 6), Vector2(0, y)]), Color(1.0, 0.9, 0.4))
		else:
			draw_colored_polygon(PackedVector2Array([Vector2(-4, y), Vector2(4, y), Vector2(0, y + 6)]), Color(0.7, 0.7, 0.85))
		draw_string(ThemeDB.fallback_font, Vector2(-3, y + 16), str(int(def["idx"]) + 1), HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color.WHITE)
	elif kind == "flower" and lit:
		draw_circle(Vector2(0, -2), 12.0 + sin(glow_t * 3.0) * 1.5, Color(1.0, 0.95, 0.5, 0.18))
	elif kind == "shrine" and Game.has_flag("shrine_" + eid):
		draw_circle(Vector2(0, -12), 16.0 + sin(glow_t * 2.0) * 2.0, Color(0.5, 0.9, 1.0, 0.14))
	elif kind == "bridge_spot" and not Game.has_flag(def.get("flag", "")):
		draw_circle(Vector2.ZERO, 7.0 + sin(glow_t * 4.0), Color(0.6, 1.0, 0.5, 0.25))
