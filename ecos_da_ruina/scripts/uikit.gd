class_name UIKit
## Peças de interface montadas com a arte autoral (molduras 9-slice, ícones, barras, retratos).
## Molduras em assets/src/92_interface.pxl (folha ui2_frames.png, 24x24, margem 8).

# ---- molduras (coluna em ui2_frames.png)
const FR_MENU := 0     # ouro, pedra azul: menus e painéis gerais
const FR_DLG := 1      # prata azulada: caixa de diálogo
const FR_WARN := 2     # vermelho: avisos de erro/perigo
const FR_BOSS := 3     # carmim: chefão
const FR_HUD := 4      # lilás discreto: HUD
const FR_GLOW := 5     # só o contorno, branco: brilho de raridade (cor pelo modulate)
const FR_TAB := 6      # aba do nome / faixa de área

# ---- ícones de aviso (coluna em ui2_icons.png)
const IC_ITEM := 0
const IC_MISSAO := 1
const IC_CAPTURA := 2
const IC_NIVEL := 3
const IC_AVISO := 4
const IC_CRISTAL := 5
const IC_ECO := 6
const IC_INFO := 7

static func panel(pos: Vector2, size: Vector2, kind := FR_MENU) -> NinePatchRect:
	var p := NinePatchRect.new()
	p.texture = Art.region("ui2_frames", kind * 24, 0, 24, 24)
	p.patch_margin_left = 8; p.patch_margin_right = 8; p.patch_margin_top = 8; p.patch_margin_bottom = 8
	p.position = pos
	p.size = size
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return p

## Barra de seleção dos menus (9-slice 12x12, margem 4).
static func sel_bar() -> NinePatchRect:
	var p := NinePatchRect.new()
	p.texture = Art.sprite_tex("ui2_sel")
	p.patch_margin_left = 4; p.patch_margin_right = 4; p.patch_margin_top = 4; p.patch_margin_bottom = 4
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return p

static func icon(idx: int) -> TextureRect:
	var t := TextureRect.new()
	t.texture = Art.region("icons", idx * 16, 0, 16, 16)
	t.size = Vector2(16, 16)
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t

static func toast_icon(idx: int) -> TextureRect:
	var t := TextureRect.new()
	t.texture = toast_tex(idx)
	t.size = Vector2(16, 16)
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t

static func toast_tex(idx: int) -> Texture2D:
	return Art.region("ui2_icons", idx * 16, 0, 16, 16)

## Retrato: primeiro quadro da folha da criatura
static func portrait(species_id: String) -> TextureRect:
	var sp: Dictionary = Data.sp(species_id)
	var t := TextureRect.new()
	var fw: int = int(sp["frame"][0]); var fh: int = int(sp["frame"][1])
	t.texture = Art.region(sp["sprite"], 0, 0, fw, fh)
	t.size = Vector2(fw, fh)
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return t
