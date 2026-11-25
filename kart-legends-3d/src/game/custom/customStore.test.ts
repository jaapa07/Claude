import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { COSMETIC_PRICES, cosmeticKey } from '@/data/shop';
import { COSMETIC_GROUPS, FLAMES, KART_PARTS, METALS, NEONS, OUTFITS, PAINTS, TIRE_OPTIONS } from '@/data/customization';
import { applyRecipe } from '@/game/vehicles/kartModel';
import { parseCustom } from './customStore';

describe('personalização', () => {
  it('lê o save ignorando ids desconhecidos e completa o que falta', () => {
    const data = parseCustom(JSON.stringify({
      outfits: { nilo: 'tropical', boro: 'nao-existe', fulano: 'ouro' },
      karts: { flecha: { paint: 'azul', neon: 'ciano', metal: 'xyz' }, inexistente: { paint: 'azul' } },
    }));
    expect(data.outfits).toEqual({ nilo: 'tropical' });
    expect(data.karts).toEqual({ flecha: { paint: 'azul', metal: 'original', flame: 'original', neon: 'ciano', tire: 'original' } });
    expect(parseCustom('{lixo')).toEqual({ outfits: {}, karts: {} });
    expect(parseCustom(null)).toEqual({ outfits: {}, karts: {} });
  });

  it('cada lista tem ids únicos, uma opção inicial liberada e a padrão primeiro', () => {
    for (const list of [OUTFITS, PAINTS, METALS, FLAMES, NEONS, TIRE_OPTIONS]) {
      expect(new Set(list.map((o) => o.id)).size).toBe(list.length);
      expect(list[0]!.unlock.type).toBe('initial');
    }
    // Tudo que não é grátis está à venda na loja (e vice-versa).
    for (const g of COSMETIC_GROUPS) for (const o of g.options) {
      expect(o.unlock.type === 'shop', `${g.group}:${o.id}`).toBe(COSMETIC_PRICES[cosmeticKey(g.group, o.id)] !== undefined);
      expect(['initial', 'shop']).toContain(o.unlock.type);
    }
    expect(KART_PARTS.map((p) => p.key)).toEqual(['paint', 'metal', 'flame', 'neon', 'tire']);
  });

  it('receitas de cor: troca de matiz, cor fixa preservando cinzas e monocromático', () => {
    const red = new THREE.Color().setHSL(0, 0.8, 0.5);
    const shifted = applyRecipe(red.clone(), { mode: 'shift', hue: 0.33 });
    expect(shifted.getHSL({ h: 0, s: 0, l: 0 }).h).toBeCloseTo(0.33, 2);
    const grey = new THREE.Color().setHSL(0, 0, 0.6);
    expect(applyRecipe(grey.clone(), { mode: 'set', hue: 0.6, sat: 0.8 }).equals(grey)).toBe(true);
    const blue = applyRecipe(red.clone(), { mode: 'set', hue: 0.6, sat: 0.8 }).getHSL({ h: 0, s: 0, l: 0 });
    expect(blue.h).toBeCloseTo(0.6, 2);
    const gold = applyRecipe(grey.clone(), { mode: 'set', hue: 0.12, sat: 0.8, keepGrays: false }).getHSL({ h: 0, s: 0, l: 0 });
    expect(gold.s).toBeGreaterThan(0.5);
    const black = applyRecipe(red.clone(), { mode: 'mono', light: [0.05, 0.2] }).getHSL({ h: 0, s: 0, l: 0 });
    expect(black.l).toBeLessThan(0.21);
    expect(black.s).toBeLessThan(0.1);
  });
});
