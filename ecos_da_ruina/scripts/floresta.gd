class_name Floresta
## Região 1 (Floresta dos Esquecidos) — conteúdo extra: Rito da Seiva, segredo da parede musgosa, anel de flores,
## Grota das Raízes Antigas e a técnica Golpe Enraizado. Mantido num arquivo próprio para que world.gd,
## entity.gd e hero_powers.gd só tenham ganchos de uma linha.
## Entidades (scripts/floresta_ent.gd, arte em assets/src/88_floresta_extra.pxl):
##   inscricao_seiva — laje com sulcos de raiz; a luz do Lumipim (ação ou Pulso) a acende e marca a parede indicada.
##   parede_musgo    — parede rachada de musgo pálido; o golpe carregado do herói a rompe (flag "flag").
##   anel_flores     — anel de flores incomum; na neblina ou com um Lumipim na equipe os Lumipins giram e revelam um Lumipim mais velho.
##   raiz_seiva      — raiz dormente na beira de um canal: a Raiz Viva a ergue em ponte; "requires" = seiva que precisa correr antes.
##   dica_rito       — pedra da dica do rito: fala depois de 3 tentativas (reinícios + alavancas puxadas na sala).
##   tronco_oco      — tronco de casca solta: examinar abre a passagem (segredo por observação).
##   deco_seiva      — bacia de seiva do rito (arte de 74_ritos.pxl): vazia, cheia quando a flag "cheia" vale.

const ENT_KINDS := ["inscricao_seiva", "parede_musgo", "anel_flores", "raiz_seiva", "dica_rito", "tronco_oco", "deco_seiva"]
const ROOT_TIME := 2.5
const DICA_APOS := 3

static var resets := {}     # mapa -> reinícios do rito usados nesta sessão

## Pulso de luz (Lumipim): acende inscrições de seiva no raio.
static func on_light(w: Node, center: Vector2, rad: float) -> void:
	for e in w.get_tree().get_nodes_in_group("ents"):
		if e is FlorestaEnt and e.kind == "inscricao_seiva" and not e.lit and e.global_position.distance_to(center) <= rad + 8.0:
			e.light_up(null)

## Golpe carregado do herói: rompe a parede musgosa à frente. Retorna true se rompeu.
static func charged_strike(w: Node, origin: Vector2, dir: Vector2) -> bool:
	for e in w.get_tree().get_nodes_in_group("ents"):
		if e is FlorestaEnt and e.kind == "parede_musgo" and not e.opened:
			var to: Vector2 = e.global_position - origin
			if to.length() <= 30.0 and dir.dot(to.normalized()) > 0.3:
				e.break_wall()
				return true
	return false

## Golpe Enraizado: o golpe carregado prende com raízes os inimigos pequenos no arco do golpe.
static func root_strike(w: Node, origin: Vector2, dir: Vector2, radius: float, half_deg: float) -> int:
	var n := 0
	for e in w.enemies():
		if not e.hittable() or e.boss or e.kind == "dummy":
			continue
		if not Combat.in_arc(origin, dir, radius, half_deg, e.global_position, e.radius):
			continue
		if e.root(ROOT_TIME):
			n += 1
			w.fx_roots(e.global_position, 10.0)
	if n > 0:
		Audio.play("roots", -4.0)
		w.spawn_text(origin + Vector2(0, -34), "Golpe Enraizado!", Color(0.6, 1.0, 0.5))
	return n

static func note_reset(w: Node) -> void:
	resets[w.map_id] = int(resets.get(w.map_id, 0)) + 1

## Tentativas na sala do rito: reinícios usados + alavancas puxadas desde o último reinício.
static func attempts(w: Node) -> int:
	var n := int(resets.get(w.map_id, 0))
	for g in w.lever_counts:
		n += int(w.lever_counts[g])
	return n
