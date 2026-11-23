class_name Art
## Monta animações a partir das folhas de pixel art autorais (assets/src/*.pxl -> assets/sprites/*.png).

static var _cache := {}

static func tex(path: String) -> Texture2D:
	if _cache.has(path):
		return _cache[path]
	var t: Texture2D = load(path)
	_cache[path] = t
	return t

static func sprite_tex(name: String) -> Texture2D:
	return tex("res://assets/sprites/%s.png" % name)

static func atlas(t: Texture2D, x: int, y: int, w: int, h: int) -> AtlasTexture:
	var a := AtlasTexture.new()
	a.atlas = t
	a.region = Rect2(x, y, w, h)
	return a

static func region(name: String, x: int, y: int, w: int, h: int) -> AtlasTexture:
	return atlas(sprite_tex(name), x, y, w, h)

## Criatura/inimigo: 9 colunas (idle0 idle1 walk0-3 windup attack hurt)
static func creature_frames(sprite: String, fw: int, fh: int) -> SpriteFrames:
	var key := "cf:%s" % sprite
	if _cache.has(key):
		return _cache[key]
	var t := sprite_tex(sprite)
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	var defs := {"idle": [[0, 1], 3.0, true], "walk": [[2, 3, 4, 5], 8.0, true], "windup": [[6], 1.0, false], "attack": [[7], 1.0, false], "hurt": [[8], 1.0, false]}
	for an in defs:
		sf.add_animation(an)
		sf.set_animation_speed(an, defs[an][1])
		sf.set_animation_loop(an, defs[an][2])
		for c in defs[an][0]:
			sf.add_frame(an, atlas(t, c * fw, 0, fw, fh))
	_cache[key] = sf
	return sf

## Herói 24x32: linhas baixo/esquerda/direita/cima; 15 colunas
## idle0 idle1 walk0-3 atk0-2 guard roll0 roll1 hurt capture dead
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
		var add := func(an: String, cols: Array, fps: float, loop: bool):
			var name := "%s_%s" % [an, d]
			sf.add_animation(name)
			sf.set_animation_speed(name, fps)
			sf.set_animation_loop(name, loop)
			for c in cols:
				sf.add_frame(name, atlas(t, c * 24, di * 32, 24, 32))
		add.call("idle", [0, 0, 0, 1], 3.0, true)
		add.call("walk", [2, 3, 4, 5], 9.0, true)
		add.call("atk0", [6], 1.0, false)
		add.call("atk1", [7], 1.0, false)
		add.call("atk2", [8], 1.0, false)
		add.call("guard", [9], 1.0, true)
		add.call("dodge", [10, 11], 12.0, true)
		add.call("hurt", [12], 1.0, false)
		add.call("capture", [13], 1.0, true)
		add.call("dead", [14], 1.0, false)
	_cache[key] = sf
	return sf

## Moradores: colunas idle frente(0,1), esquerda(2,3), direita(4,5), costas(6)
static func npc_frames(sprite: String) -> SpriteFrames:
	var key := "nf:%s" % sprite
	if _cache.has(key):
		return _cache[key]
	var t := sprite_tex(sprite)
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	var cols := {"down": [0, 0, 0, 1], "left": [2, 2, 2, 3], "right": [4, 4, 4, 5], "up": [6]}
	for d in cols:
		var name: String = "idle_" + d
		sf.add_animation(name)
		sf.set_animation_speed(name, 3.0)
		sf.set_animation_loop(name, true)
		for c in cols[d]:
			sf.add_frame(name, atlas(t, c * 24, 0, 24, 32))
	_cache[key] = sf
	return sf

## Efeito em folha horizontal
static func fx_frames(sheet: String, fw: int, fh: int, n: int, fps: float, loop := false) -> SpriteFrames:
	var key := "fx:%s" % sheet
	if _cache.has(key):
		return _cache[key]
	var t := sprite_tex(sheet)
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	sf.add_animation("a")
	sf.set_animation_speed("a", fps)
	sf.set_animation_loop("a", loop)
	for i in n:
		sf.add_frame("a", atlas(t, i * fw, 0, fw, fh))
	_cache[key] = sf
	return sf

static func shadow(scale := 1.0) -> Sprite2D:
	var sh := Sprite2D.new()
	sh.texture = sprite_tex("shadow_raw")
	sh.modulate = Color(1, 1, 1, 0.32)
	sh.scale = Vector2(scale, scale)
	sh.position = Vector2(0, 1)
	sh.show_behind_parent = true
	return sh

## Barra com texturas de ui_bars.png (0 fundo, 1 vermelho, 2 amarelo, 3 azul, 4 verde, 5 laranja)
static func bar(kind: int, w: float) -> TextureProgressBar:
	var b := TextureProgressBar.new()
	b.texture_under = region("ui_bars", 0, 0, 40, 4)
	b.texture_progress = region("ui_bars", 0, kind * 4, 40, 4)
	b.nine_patch_stretch = true
	b.stretch_margin_left = 1; b.stretch_margin_right = 1; b.stretch_margin_top = 1; b.stretch_margin_bottom = 1
	b.size = Vector2(w, 4)
	b.max_value = 1000
	b.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return b

static func dir_name(v: Vector2) -> String:
	if abs(v.x) > abs(v.y):
		return "right" if v.x > 0 else "left"
	return "down" if v.y > 0 else "up"
