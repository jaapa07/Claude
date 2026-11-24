extends Node
class_name HeroPowers
## Técnicas especiais do herói, liberadas por nível. Usam os mesmos botões do teclado e do toque.
##   Nv 2  Golpe em Investida — atacar durante a esquiva
##   Nv 3  Lâmina de Eco      — o golpe carregado solta uma onda que atravessa inimigos
##   Nv 4  Defesa Perfeita    — defender no instante do golpe: anula, atordoa e dobra o próximo golpe
##   Nv 5  Fúria do Vínculo   — defender + habilidade da criatura: explosão conjunta (custa energia)

const TECHS := [
	{"id": "investida", "curto": "Esquiva + ataque: avança cortando.", "nivel": 2, "nome": "Golpe em Investida", "icone": 0,
		"como": "Ataque durante a esquiva ({esquivar} e logo {atacar}).",
		"desc": "Avança cortando tudo na linha. Ótimo para atravessar lobos que flanqueiam."},
	{"id": "lamina", "curto": "Segure o ataque: solta uma onda.", "nivel": 3, "nome": "Lâmina de Eco", "icone": 1,
		"como": "Segure e solte o ataque (golpe carregado).",
		"desc": "O golpe carregado solta uma onda de Eco que voa à frente e atravessa inimigos."},
	{"id": "defesa", "curto": "Defenda no instante do golpe.", "nivel": 4, "nome": "Defesa Perfeita", "icone": 2,
		"como": "Defenda ({defender}) no instante em que o golpe chega.",
		"desc": "Anula o dano, atordoa o atacante e o próximo golpe em 1,5 s causa dano dobrado."},
	{"id": "furia", "curto": "Defesa + habilidade: explosão.", "nivel": 5, "nome": "Fúria do Vínculo", "icone": 3,
		"como": "Segure a defesa e use a habilidade da criatura ({defender} + {habilidade}).",
		"desc": "Herói e criatura liberam juntos uma explosão de Eco que fere e atordoa ao redor. Custa 40 de energia."},
]
const DASH := {"wind": 0.02, "act": 0.16, "rec": 0.22, "r": 30.0, "arc": 50.0, "mult": 1.35, "knock": 100.0, "lunge": 64.0}
const PARRY_WINDOW := 0.18
const COUNTER_TIME := 1.5
const BURST_COST := 40.0
const BURST_CD := 18.0
const BURST_RADIUS := 64.0

var player: Node
var _prev_state := -1
var _guard_t := 99.0
var counter_t := 0.0
var burst_cd := 0.0
var _charged_seen := false

func has(id: String) -> bool:
	for t in TECHS:
		if t["id"] == id:
			return Game.hero_level() >= int(t["nivel"])
	return false

func unlocked() -> Array:
	var out: Array = []
	for t in TECHS:
		if Game.hero_level() >= int(t["nivel"]):
			out.append(t)
	return out

func _ready() -> void:
	Game.level_up.connect(_on_level_up)

func _on_level_up(who: String, level: int) -> void:
	if who != "heroi":
		return
	for t in TECHS:
		if int(t["nivel"]) == level:
			Audio.play("evolve")
			player.world.say("Nova técnica: %s!" % t["nome"])
			player.world.say(t["curto"] + " (detalhes: {menu} > Inventário e herói)")
			player.world.fx_at("sparkle", player.global_position + Vector2(0, -26), 1.2, 0.0, 1.5)

func _physics_process(delta: float) -> void:
	if player == null or get_tree().paused or not Game.in_game:
		return
	var st: int = player.state
	counter_t = max(0.0, counter_t - delta)
	burst_cd = max(0.0, burst_cd - delta)
	# tempo desde que a defesa começou (para a Defesa Perfeita)
	if st == Player.S.GUARD:
		_guard_t = 0.0 if _prev_state != Player.S.GUARD else _guard_t + delta
	else:
		_guard_t = 99.0
	# Golpe em Investida: atacar durante a esquiva
	if st == Player.S.DODGE and has("investida") and Input.is_action_just_pressed("attack"):
		player._start_attack(DASH, false)
		player.atk_def["idx"] = 0
		player.atk_def["tecnica"] = "investida"
		player.world.dust(player.global_position)
		Audio.play("dodge", -2.0)
	# Lâmina de Eco: ao iniciar um golpe carregado
	if st == Player.S.ATTACK and player.atk_def.get("charged", false):
		if not _charged_seen and player.atk_t >= float(player.atk_def["wind"]):
			_charged_seen = true
			if has("lamina"):
				_spawn_wave()
			_charged_extras()
	else:
		_charged_seen = false
	# Fúria do Vínculo: defesa + habilidade da criatura
	if st == Player.S.GUARD and has("furia") and Input.is_action_just_pressed("skill"):
		_burst()
	_prev_state = st

## Chamado por Player.take_hit antes de aplicar a defesa. Retorna true se o golpe foi anulado.
func try_parry(_dmg: float, from: Vector2, opts: Dictionary) -> bool:
	if not has("defesa") or player.state != Player.S.GUARD or _guard_t > PARRY_WINDOW:
		return false
	if opts.get("indefensavel", false):
		return false
	var to_src: Vector2 = (from - player.global_position).normalized()
	if player.aim_dir.dot(to_src) <= 0.2:
		return false
	counter_t = COUNTER_TIME
	player.inv_timer = 0.3
	Audio.play("guard_break", 2.0)
	player.world.fx_at("parry", player.global_position + player.aim_dir * 12.0 + Vector2(0, -12), 0.25, 0.0, 1.6)
	player.world.spawn_text(player.global_position + Vector2(0, -30), "Defesa perfeita!", Color(1.0, 0.9, 0.4))
	player.world.hitstop(0.08)
	# atordoa quem atacou (o mais próximo da origem do golpe)
	var best: Node = null
	var bd := 48.0
	for e in player.world.enemies():
		var d: float = e.global_position.distance_to(from)
		if d < bd:
			bd = d
			best = e
	if best != null:
		best.interrupt()
		if best.has_method("take_damage"):
			best.knock_v = (best.global_position - player.global_position).normalized() * 90.0
	return true

## Multiplicador de dano do próximo golpe (contra-ataque após Defesa Perfeita)
func damage_mult() -> float:
	if counter_t > 0.0:
		return 2.0
	return 1.0

func consume_counter() -> void:
	if counter_t > 0.0:
		counter_t = 0.0
		player.world.spawn_text(player.global_position + Vector2(0, -30), "Contra-ataque!", Color(1.0, 0.75, 0.3))

## Golpe carregado: rompe paredes de pedra oca (Floresta) e, com o Golpe Enraizado, prende inimigos pequenos.
func _charged_extras() -> void:
	Floresta.charged_strike(player.world, player.global_position, player.aim_dir)
	if Game.item_count("golpe_enraizado") > 0:
		Floresta.root_strike(player.world, player.global_position, player.aim_dir, float(player.atk_def["r"]) + 10.0, float(player.atk_def["arc"]) + 15.0)

func _spawn_wave() -> void:
	var w := EchoWave.new()
	w.world = player.world
	w.dir = player.aim_dir
	w.damage = Game.hero_atk() * 1.1
	w.global_position = player.global_position + Vector2(0, -10) + player.aim_dir * 14.0
	player.world.add_fx(w)
	Audio.play("skill", -2.0)

func _burst() -> void:
	if burst_cd > 0.0:
		player.world.say("Fúria do Vínculo em recarga (%.0f s)." % burst_cd)
		return
	if player.energy < BURST_COST:
		player.world.say("Energia insuficiente para a Fúria do Vínculo.")
		return
	var comp: Node = player.world.companion
	var comp_atk := 0.0
	if comp != null and is_instance_valid(comp) and comp.is_alive():
		comp_atk = Game.creature_atk(comp.ind)
		comp.global_position = player.world.safe_pos_near(player.global_position)
	player.energy -= BURST_COST
	burst_cd = BURST_CD
	var center: Vector2 = player.global_position
	player.world.fx_at("burst", center + Vector2(0, -8), 0.45)
	player.world.shake(3.5, 0.35)
	player.world.hitstop(0.1)
	Audio.play("boss_roar", -6.0)
	Audio.play("skill")
	var dmg := Game.hero_atk() * 1.6 + comp_atk * 1.5
	for e in player.world.enemies():
		if e.hittable() and e.global_position.distance_to(center) <= BURST_RADIUS + e.radius and e.kind != "dummy":
			e.take_damage(dmg, center, {"src": "heroi", "knock": 120.0, "dir": (e.global_position - center).normalized()})
			e.interrupt()
			if e.small:
				e.root(1.5)
	player.world.spawn_text(center + Vector2(0, -34), "Fúria do Vínculo!", Color(0.6, 1.0, 0.8))
