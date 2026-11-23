class_name Combat
## Regras puras de combate (sem estado): afinidades, arcos, dano.

const AFF := {
	"flora": {"agua": 1.25, "brasa": 0.8},
	"agua": {"brasa": 1.25, "flora": 0.8},
	"brasa": {"flora": 1.25, "agua": 0.8},
	"luz": {"sombra": 1.25},
	"sombra": {"luz": 1.25},
	"pedra": {"vento": 1.25},
	"vento": {"pedra": 1.25},
}

static func affinity_mult(att: String, deff: String) -> float:
	if att == "" or deff == "":
		return 1.0
	return AFF.get(att, {}).get(deff, 1.0)

## true se `target` esta dentro do arco (origem, direcao, raio, meio-angulo em graus)
static func in_arc(origin: Vector2, dir: Vector2, radius: float, half_deg: float, target: Vector2, target_r: float) -> bool:
	var to := target - origin
	var d := to.length()
	if d > radius + target_r:
		return false
	if d <= target_r + 2.0:
		return true
	var ang: float = abs(rad_to_deg(dir.angle_to(to)))
	var slack := rad_to_deg(asin(clamp(target_r / max(d, 0.01), 0.0, 1.0)))
	return ang <= half_deg + slack

static func ray_blocked(world: Node, a: Vector2, b: Vector2) -> bool:
	var space: PhysicsDirectSpaceState2D = world.get_world_2d().direct_space_state
	var q := PhysicsRayQueryParameters2D.create(a, b, 1)
	return not space.intersect_ray(q).is_empty()
