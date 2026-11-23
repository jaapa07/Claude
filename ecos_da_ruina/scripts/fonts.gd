class_name Fonts
## Fonte pixel (Pixelify Sans, OFL) sem suavização.
static var _f: FontFile

static func pixel() -> FontFile:
	if _f == null:
		_f = FontFile.new()
		_f.data = FileAccess.get_file_as_bytes("res://assets/fonts/PressStart2P.ttf")
		_f.antialiasing = TextServer.FONT_ANTIALIASING_NONE
		_f.hinting = TextServer.HINTING_NONE
		_f.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	return _f

static func label(text: String, size := 9, col := Color.WHITE, outline := true) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", pixel())
	l.add_theme_font_size_override("font_size", px(size))
	l.add_theme_constant_override("line_spacing", 2)
	l.add_theme_color_override("font_color", col)
	if outline:
		l.add_theme_color_override("font_outline_color", Color(0.1, 0.08, 0.15))
		l.add_theme_constant_override("outline_size", 3)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

## Press Start 2P é nítida em múltiplos de 8 px
static func px(size: int) -> int:
	if size >= 24:
		return 24
	if size >= 14:
		return 16
	return 8
