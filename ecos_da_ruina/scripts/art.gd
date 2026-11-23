class_name Art
## Utilidades de arte: monta SpriteFrames a partir das folhas geradas.

static var _cache := {}

static func tex(path: String) -> Texture2D:
	if _cache.has(path):
		return _cache[path]
	var t: Texture2D = load(path)
	_cache[path] = t
	return t

static func sprite_tex(name: String) -> Texture2D:
	return tex("res://assets/sprites/%s.png" % name)

static func _atlas(t: Texture2D, x: int, y: int, w: int, h: int) -> AtlasTexture:
	var a := AtlasTexture.new()
	a.atlas = t
	a.region = Rect2(x, y, w, h)
	return a

## Folha de criatura/inimigo: 9 colunas (idle0 idle1 walk0-3 windup attack hurt)
static func creature_frames(sprite: String, fw: int, fh: int) -> SpriteFrames:
	var key := "cf:%s" % sprite
	if _cache.has(key):
		return _cache[key]
	var t := sprite_tex(sprite)
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	var defs := {"idle": [[0, 1], 3.0, true], "walk": [[2, 3, 4, 5], 9.0, true], "windup": [[6], 1.0, false], "attack": [[7], 1.0, false], "hurt": [[8], 1.0, false]}
	for an in defs:
		sf.add_animation(an)
		sf.set_animation_speed(an, defs[an][1])
		sf.set_animation_loop(an, defs[an][2])
		for c in defs[an][0]:
			sf.add_frame(an, _atlas(t, c * fw, 0, fw, fh))
	_cache[key] = sf
	return sf

## Folha humanoide 24x32: por direcao (down,left,right,up) 3 linhas de 5 colunas
static func human_frames(sprite: String) -> SpriteFrames:
	var key := "hf:%s" % sprite
	if _cache.has(key):
		return _cache[key]
	var t := sprite_tex(sprite)
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	var dirs := ["down", "left", "right", "up"]
	for di in 4:
		var d: String = dirs[di]
		var add := func(an: String, row: int, cols: Array, fps: float, loop: bool):
			var name := "%s_%s" % [an, d]
			sf.add_animation(name)
			sf.set_animation_speed(name, fps)
			sf.set_animation_loop(name, loop)
			for c in cols:
				sf.add_frame(name, _atlas(t, c * 24, row * 32, 24, 32))
		add.call("idle", di, [0], 1.0, true)
		add.call("walk", di, [1, 2, 3, 4], 8.0, true)
		add.call("atk0", 4 + di, [0], 1.0, false)
		add.call("atk1", 4 + di, [1], 1.0, false)
		add.call("atk2", 4 + di, [2], 1.0, false)
		add.call("guard", 4 + di, [3], 1.0, true)
		add.call("dodge", 4 + di, [4], 1.0, false)
		add.call("hurt", 8 + di, [0], 1.0, false)
		add.call("capture", 8 + di, [1], 1.0, true)
		add.call("dead", 8 + di, [2], 1.0, false)
	_cache[key] = sf
	return sf

static func dir_name(v: Vector2) -> String:
	if abs(v.x) > abs(v.y):
		return "right" if v.x > 0 else "left"
	return "down" if v.y > 0 else "up"
