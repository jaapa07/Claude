class_name UIKit
## Peças de interface montadas com a arte autoral (moldura 9-slice, ícones, barras).

static func panel(pos: Vector2, size: Vector2) -> NinePatchRect:
	var p := NinePatchRect.new()
	p.texture = Art.sprite_tex("ui_panel")
	p.patch_margin_left = 5; p.patch_margin_right = 5; p.patch_margin_top = 5; p.patch_margin_bottom = 5
	p.position = pos
	p.size = size
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return p

static func icon(idx: int) -> TextureRect:
	var t := TextureRect.new()
	t.texture = Art.region("icons", idx * 16, 0, 16, 16)
	t.size = Vector2(16, 16)
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t

## Retrato: primeiro quadro da folha da criatura
static func portrait(species_id: String) -> TextureRect:
	var sp: Dictionary = Data.sp(species_id)
	var t := TextureRect.new()
	var fw: int = int(sp["frame"][0]); var fh: int = int(sp["frame"][1])
	t.texture = Art.region(sp["sprite"], 0, 0, fw, fh)
	t.size = Vector2(fw, fh)
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t
