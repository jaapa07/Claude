extends CharacterBody2D
class_name AllyBeast
## Criatura de um aliado. Segue o dono, ataca o mesmo alvo e, ao cair, volta ao selo por alguns segundos.
## Pedregulho (Cascalito da Bruna): golpe que empurra. Faísca (Lumipim do Ravi): o golpe ofusca (inimigo erra metade dos ataques por 2 s).

const RETURN_TIME := 14.0

var world: Node
var owner_ally: Node
var species: Dictionary
var sid := ""
var nome := ""
var max_hp := 40.0
var hp := 40.0
var atk := 5.0
var speed := 70.0
var radius := 6.0
var target: Node = null
var atk_cd := 0.0
var away_t := 0.0
var flash := 0.0
var inv_t := 0.0
var sprite: AnimatedSprite2D
var _shape: CollisionShape2D

func init(p_world: Node, p_owner: Node, sp: String, p_nome: String) -> void:
	world = p_world
	owner_ally = p_owner
	sid = sp
	nome = p_nome
	species = Data.species[sp]
	var lv: int = max(1, Game.hero_level() - 1)
	max_hp = float(species["hp_base"]) + float(species["hp_cresc"]) * (lv - 1)
	atk = (float(species["atk_base"]) + float(species["atk_cresc"]) * (lv - 1)) * 0.5   # apoio: metade do ataque da espécie (docs/BALANCO.md)
	hp = max_hp

func _ready() -> void:
	collision_layer = 8
	collision_mask = 1
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	_shape = CollisionShape2D.new()
	var c := CircleShape2D.new(); c.radius = 4.0
	_shape.shape = c
	add_child(_shape)
	add_child(Art.shadow(0.7))
	var fw := int(species["frame"][0]); var fh := int(species["frame"][1])
	sprite = AnimatedSprite2D.new()
	sprite.sprite_frames = Art.creature_frames(species["sprite"], fw, fh)
	sprite.offset = Vector2(0, -fh / 2.0 + 2.0)
	add_child(sprite)
	Juice.attach(self, sprite, fw, fh)
	sprite.play("idle")
	add_to_group("allies")
	add_to_group("party")

func is_alive() -> bool:
	return away_t <= 0.0

func take_hit(dmg: float, from: Vector2, _opts: Dictionary = {}) -> bool:
	if not is_alive() or inv_t > 0.0:
		return false
	hp -= dmg * Game.enemy_damage_mult() * Game.COMPANION_DAMAGE_TAKEN
	flash = 0.12
	inv_t = 0.4
	velocity = (global_position - from).normalized() * 50.0
	if hp <= 0.0:
		away_t = RETURN_TIME
		visible = false
		_shape.set_deferred("disabled", true)
		world.spark(global_position + Vector2(0, -6), 6)
		world.say("%s voltou ao selo de %s." % [nome, owner_ally.def["nome"]])
	return true

func _physics_process(delta: float) -> void:
	if get_tree().paused or world == null or world.frozen or owner_ally == null or not is_instance_valid(owner_ally):
		return
	atk_cd = max(0.0, atk_cd - delta)
	flash = max(0.0, flash - delta)
	inv_t = max(0.0, inv_t - delta)
	if away_t > 0.0:
		away_t -= delta
		global_position = owner_ally.global_position
		if away_t <= 0.0 and owner_ally.is_alive():
			hp = max_hp * 0.6
			visible = true
			_shape.set_deferred("disabled", false)
			global_position = world.safe_pos_near(owner_ally.global_position)
		return
	sprite.modulate = Color.WHITE     # clarão de dano: shader do Juice
	if global_position.distance_to(owner_ally.global_position) > 220.0:
		global_position = world.safe_pos_near(owner_ally.global_position)
	var ot = owner_ally.target if (owner_ally.is_alive() and is_instance_valid(owner_ally.target)) else null
	if ot != null and (not is_instance_valid(ot) or not ot.hittable()):
		ot = null
	target = ot
	var goal: Vector2
	if target != null:
		goal = target.global_position
		var d := global_position.distance_to(goal)
		if d > 16.0:
			_move((goal - global_position).normalized(), speed)
			sprite.play("walk")
		else:
			_move(Vector2.ZERO, 0.0)
			if atk_cd <= 0.0:
				_bite()
		sprite.flip_h = goal.x < global_position.x
		return
	goal = owner_ally.global_position + Vector2(-12, 8)
	if global_position.distance_to(goal) > 14.0:
		_move((goal - global_position).normalized(), speed * 1.1)
		sprite.play("walk")
		sprite.flip_h = goal.x < global_position.x
	else:
		_move(Vector2.ZERO, 0.0)
		sprite.play("idle")

func _bite() -> void:
	atk_cd = 1.2
	sprite.play("attack")
	var opts := {"src": "aliado", "knock": 40.0 if sid != "cascalito" else 110.0}
	target.take_damage(atk, global_position, opts)
	world.fx_at("hit", target.global_position + Vector2(0, -8), 0.18)
	if sid == "lumipim" and target.get("blind_t") != null:
		target.blind_t = 2.0

func _move(dir: Vector2, spd: float) -> void:
	velocity = velocity.move_toward(dir * spd, 700.0 * get_physics_process_delta_time())
	move_and_slide()

func _exit_tree() -> void:
	if world != null and is_instance_valid(world):
		world.party_nodes.erase(self)
