extends Enemy
## Lenhador Oco (minichefe): golpe largo após levantar o machado, seguido de janela vulnerável.

var activated := false
var intro_t := 0.0
var vulnerable := false
var swings := 0
var bdef: Dictionary = {}
var dormant_sprite_col := Color(0.8, 0.8, 0.9)

var def_arena: Array = []

func init(p_world: Node, p_kind: String, e: Dictionary) -> void:
	super.init(p_world, p_kind, e)
	def_arena = [int(e["x0"]), int(e["y0"]), int(e["w"]), int(e["h"])]
	boss = true
	bdef = Data.bosses["lenhador"]
	max_hp = float(bdef["hp"]); hp = max_hp
	P = {"wind": 0.95, "dur": 0.2, "rec": 1.5, "cd": 0.3, "start": 48.0, "r": 54.0, "arc": 72.0}
	invulnerable = true
	def["percepcao"] = 400

func activate() -> void:
	if activated:
		return
	activated = true
	invulnerable = false
	intro_t = 1.4
	world.gather_companion(Rect2(float(def_arena[0]) * 16.0, float(def_arena[1]) * 16.0, float(def_arena[2]) * 16.0, float(def_arena[3]) * 16.0))
	Game.set_flag("tmp_lenhador_ativo")
	Audio.play("boss_roar")
	world.shake(2.0, 0.5)
	world.boss_started(self)
	world.say("O Lenhador Oco desperta!")

func _ai(delta: float) -> void:
	if not activated:
		_anim("idle")
		return
	if intro_t > 0.0:
		intro_t -= delta
		_anim("windup")
		return
	vulnerable = (st == St.RECOVER)
	_ai_hostile(delta)

func _begin_attack() -> void:
	super._begin_attack()
	swings += 1
	Audio.play("swing", -2.0)
	world.shake(1.5, 0.1)

func _end_attack() -> void:
	super._end_attack()
	if swings % 2 == 1:
		world.say("Ofegante! Ataque agora!")

func take_damage(amount: float, from_pos: Vector2, opts: Dictionary = {}) -> float:
	if vulnerable:
		amount *= 1.5
	return super.take_damage(amount, from_pos, opts)

func _give_rewards(_src: String) -> void:
	if Game.has_flag(bdef["flag_morte"]):
		return
	Game.set_flag(bdef["flag_morte"])
	Game.set_flag("tmp_lenhador_ativo", false)
	var r: Dictionary = bdef["recompensa"]
	Game.award_encounter_xp(int(r["xp"]), 6)
	Game.fragments += int(r["frag"])
	Game.give_item("casca_oca", 2)
	world.say("Material de chefão: Casca Oca x2 (monte equipamento na forja).")
	Game.inventory_changed.emit()
	Game.register_kill("lenhador")
	var ac := Game.active_ind()
	if not ac.is_empty() and participants.has(ac["uuid"]):
		Game.bond_activity(ac["uuid"], "vitoria:lenhador")
	world.boss_finished(self)
	Audio.play("boss_die")
	world.say("Lenhador Oco derrotado! +%d fragmentos" % int(r["frag"]))
	world.get_tree().create_timer(1.5).timeout.connect(func(): world.autosave())

func _death_fx() -> void:
	for i in 3:
		world.spark(global_position + Vector2(randf_range(-14, 14), randf_range(-30, 0)), 10)
	super._death_fx()

var _tired_fx: AnimatedSprite2D

func _visuals() -> void:
	super._visuals()
	if _tired_fx == null and is_inside_tree():
		_tired_fx = AnimatedSprite2D.new()
		_tired_fx.sprite_frames = Art.fx_frames("fx_sparkle", 16, 12, 2, 8.0, true)
		_tired_fx.position = Vector2(0, -fh - 2)
		_tired_fx.play("a")
		add_child(_tired_fx)
	if _tired_fx:
		_tired_fx.visible = vulnerable and alive_flag
