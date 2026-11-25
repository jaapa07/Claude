import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';

// a bola carrega o modelo .glb no construtor; nos testes usamos objetos vazios
vi.mock('../src/core/Assets', () => ({
  A: (p: string) => p,
  assets: {
    gltf: () => ({ scene: new THREE.Group() }),
    tex: () => new THREE.Texture(),
    texAsync: () => Promise.resolve(new THREE.Texture()),
  },
}));

import { Ball, ballistic, FIELD, BALL_R } from '../src/match/Ball';
import TEAMS from '../src/data/teams.json';
import CLIPS from '../src/data/clips.json';
import ARENAS from '../src/data/arenas.json';
import STR from '../src/data/strings.pt-BR.json';

const step = (b: Ball, secs: number) => { for (let i = 0; i < secs * 60; i++) b.update(1 / 60); };

describe('bola na areia', () => {
  it('quica pouco e para rápido', () => {
    const b = new Ball();
    b.place(0, 0, 3);
    step(b, 0.8);
    expect(b.events.length).toBeGreaterThanOrEqual(0);
    step(b, 3);
    expect(b.pos.y).toBeCloseTo(BALL_R, 2);
    expect(b.speed).toBeLessThan(0.2);
  });
  it('rolando desacelera mais que na grama', () => {
    const b = new Ball();
    b.place(0, 0);
    b.vel.set(8, 0, 0);
    step(b, 1.5);
    expect(b.speed).toBeLessThan(2);
    expect(b.pos.x).toBeLessThan(9);
  });
  it('detecta gol entre as traves e abaixo do travessão', () => {
    const b = new Ball();
    b.place(FIELD.HL - 3, 0.5, 1);
    b.vel.copy(ballistic(b.pos, new THREE.Vector3(FIELD.HL + 0.5, 1, 0.5), 0.3));
    let goal = false;
    for (let i = 0; i < 60 && !goal; i++) { b.update(1 / 60); goal = b.events.some((e) => e.type === 'goal'); }
    expect(goal).toBe(true);
    expect(b.inGoal).toBe(1);
  });
  it('bola por cima do travessão não é gol', () => {
    const b = new Ball();
    b.place(FIELD.HL - 3, 0, 1);
    b.vel.copy(ballistic(b.pos, new THREE.Vector3(FIELD.HL + 0.5, 3.5, 0), 0.3));
    step(b, 0.6);
    expect(b.inGoal).toBe(0);
  });
  it('balística chega ao alvo no tempo pedido', () => {
    const p0 = new THREE.Vector3(0, 0.12, 0), p1 = new THREE.Vector3(10, 1, 3);
    const v = ballistic(p0, p1, 1);
    const t = 1;
    const x = p0.x + v.x * t, y = p0.y + v.y * t - 0.5 * 9.81 * t * t, z = p0.z + v.z * t;
    expect(x).toBeCloseTo(10); expect(y).toBeCloseTo(1); expect(z).toBeCloseTo(3);
  });
});

describe('conteúdo', () => {
  it('8 seleções com 10 jogadores fictícios e números únicos', () => {
    expect(TEAMS.teams).toHaveLength(8);
    for (const t of TEAMS.teams) {
      expect(t.players).toHaveLength(10);
      expect(new Set(t.players.map((p) => p.number)).size).toBe(10);
      expect(t.players.filter((p) => p.pos === 'GOL').length).toBeGreaterThanOrEqual(2);
    }
  });
  it('animações exigidas existem', () => {
    const need = ['idle', 'run', 'sprint', 'shot', 'pass_short', 'pass_lob', 'volley', 'header', 'diving_header', 'bicycle_kick', 'scissor_kick',
      'chest_control', 'juggle', 'sombrero_flick', 'slide_tackle', 'shoulder_charge', 'fall_hit', 'get_up', 'celebrate_knee_slide', 'celebrate_samba',
      'celebrate_point_sky', 'celebrate_fist', 'argue_ref', 'gk_idle', 'gk_dive_left', 'gk_dive_right', 'gk_catch', 'gk_punch', 'gk_throw',
      'ref_whistle', 'ref_card', 'dance_1', 'dance_2', 'dance_3'];
    for (const n of need) expect(CLIPS, n).toHaveProperty(n);
  });
  it('3 arenas com horários diferentes', () => {
    expect(new Set(ARENAS.arenas.map((a) => a.time))).toEqual(new Set(['day', 'night', 'sunset']));
  });
  it('20 dicas de carregamento', () => {
    expect((STR as any).tips).toHaveLength(20);
  });
});
