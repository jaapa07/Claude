import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '@/data/characters';
import { CUPS, TRACKS } from '@/data/tracks';
import { ITEM_IDS, KART_IDS, TRACK_IDS } from '@/data/ids';
import { KARTS } from '@/data/karts';
import { ENVIRONMENTS } from '@/game/tracks/environments';
import { TrackRuntime } from '@/game/tracks/trackRuntime';
import { SURFACES } from '@/game/tracks/trackTypes';
import { loadTrack } from './simHarness';

describe('conteúdo do jogo', () => {
  it('tem 11 pilotos, 8 karts, 12 pistas, 3 copas de 4 pistas e 6 itens', () => {
    expect(CHARACTERS).toHaveLength(11);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(11);
    expect(KARTS).toHaveLength(8);
    // Todo kart é o preferido de alguém (com 11 pilotos, alguns karts são compartilhados).
    expect(new Set(CHARACTERS.map((c) => c.kartId))).toEqual(new Set(KART_IDS));
    expect(TRACKS).toHaveLength(12);
    expect(CUPS).toHaveLength(3);
    for (const cup of CUPS) expect(cup.tracks).toHaveLength(4);
    expect(new Set(CUPS.flatMap((c) => c.tracks))).toEqual(new Set(TRACK_IDS));
    expect(ITEM_IDS).toHaveLength(6);
    expect(KART_IDS).toHaveLength(8);
  });

  it('cada pista tem ambiente (céu, luz, clima) próprio', () => {
    const skies = TRACK_IDS.map((t) => `${ENVIRONMENTS[t].skyTop}${ENVIRONMENTS[t].skyHorizon}${ENVIRONMENTS[t].weather}`);
    expect(new Set(skies).size).toBe(TRACK_IDS.length);
  });
});

describe.each([...TRACK_IDS])('dados da pista %s', (id) => {
  const data = loadTrack(id);
  const rt = new TrackRuntime(data);

  it('é um circuito fechado com comprimento coerente', () => {
    expect(data.id).toBe(id);
    expect(data.length).toBeGreaterThan(900);
    expect(data.length).toBeLessThan(1700);
    expect(data.main.pos).toHaveLength(data.count * 3);
    for (let i = 0; i < data.count; i++) {
      const j = (i + 1) % data.count;
      const d = Math.hypot(data.main.pos[j * 3]! - data.main.pos[i * 3]!, data.main.pos[j * 3 + 1]! - data.main.pos[i * 3 + 1]!, data.main.pos[j * 3 + 2]! - data.main.pos[i * 3 + 2]!);
      expect(d).toBeGreaterThan(1.6);
      expect(d).toBeLessThan(2.4);
    }
  });

  it('tem largada, 12 checkpoints em ordem, grid de 8 e câmera de apresentação', () => {
    expect(data.checkpoints).toHaveLength(12);
    expect(data.checkpoints[0]).toBe(0);
    expect([...data.checkpoints].sort((a, b) => a - b)).toEqual(data.checkpoints);
    expect(data.grid).toHaveLength(8);
    expect(data.introCamera.length).toBeGreaterThanOrEqual(2);
    expect(data.minimap.points.length).toBeGreaterThan(100);
  });

  it('tem zonas de itens, placas de turbo, rampa(s) e atalho', () => {
    expect(data.itemRows.length).toBeGreaterThanOrEqual(4);
    expect(data.itemRows.every((r) => r.offsets.length >= 2)).toBe(true);
    expect(data.boostPads.length).toBeGreaterThanOrEqual(3);
    expect(data.ramps.length).toBeGreaterThanOrEqual(1);
    expect(data.shortcuts.length).toBeGreaterThanOrEqual(1);
    for (const sc of rt.shortcuts) {
      // um atalho precisa ser mais curto que o trecho principal que ele substitui
      expect(sc.path.n).toBeLessThan(sc.span);
    }
  });

  it('tem linha de corrida e velocidades-alvo para a IA em toda a volta', () => {
    expect(data.racingLine).toHaveLength(data.count);
    expect(data.speedHint).toHaveLength(data.count);
    expect(Math.min(...data.speedHint)).toBeGreaterThan(0.3);
    expect(Math.max(...data.speedHint)).toBe(1);
    for (let i = 0; i < data.count; i++) expect(Math.abs(data.racingLine[i]!)).toBeLessThan(data.main.halfWidth[i]!);
  });

  it('tem cenário com colisão e superfícies válidas', () => {
    expect(data.propColliders.length % 5).toBe(0);
    expect(data.propColliders.length / 5).toBeGreaterThan(30);
    expect(data.main.surface.every((s) => s >= 0 && s < SURFACES.length)).toBe(true);
    expect(rt.safeIndex(0)).toBeGreaterThanOrEqual(0);
  });
});

describe('variedade de superfícies e de elementos entre as pistas', () => {
  const all = TRACK_IDS.map((id) => loadTrack(id));
  it('as cinco superfícies (asfalto, terra, grama, areia, gelo) aparecem no jogo', () => {
    const used = new Set<number>();
    for (const t of all) { for (const s of t.main.surface) used.add(s); for (const sc of t.shortcuts) for (const s of sc.samples.surface) used.add(s); used.add(t.offroad); }
    expect(used).toEqual(new Set([0, 1, 2, 3, 4]));
  });
  it('há saltos sobre vãos, obstáculos móveis, água, lava e pistas sem chão fora da estrada', () => {
    expect(all.some((t) => t.liquid === 'lava' && t.waterY !== null)).toBe(true);
    expect(all.some((t) => t.main.gap.includes(1))).toBe(true);
    expect(all.filter((t) => t.obstacles.length > 0).length).toBeGreaterThanOrEqual(3);
    expect(all.some((t) => t.waterY !== null)).toBe(true);
    expect(all.some((t) => t.terrain === null)).toBe(true);
    expect(all.filter((t) => t.animatedProps.length > 0).length).toBe(TRACK_IDS.length);
  });
});
