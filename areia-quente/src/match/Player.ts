import * as THREE from 'three';
import { Athlete } from '../game/Athlete';
import type { DeviceId } from '../core/Input';
import type { Team } from './Team';
import TEAMS from '../data/teams.json';

export type TeamData = (typeof TEAMS.teams)[number];
export type PlayerData = TeamData['players'][number];
export type Role = 'GOL' | 'FIXO' | 'ALA' | 'PIVÔ';

export type KickKind = 'shot' | 'pass_short' | 'pass_lob' | 'volley' | 'header' | 'diving_header' | 'bicycle_kick' | 'scissor_kick'
  | 'chest_control' | 'juggle' | 'sombrero_flick' | 'gk_throw' | 'gk_punch' | 'throw_in' | 'long_throw';

export type PendingKick = { kind: KickKind; at: number; power: number; aim: THREE.Vector3 | null; target: Player | null; fire: boolean; done: boolean };

/** Um jogador em campo: estado físico, controle (humano/IA) e o personagem animado. */
export class Player {
  data: PlayerData;
  team: Team;
  ath: Athlete;
  role: Role;
  slot: number; // 0 GK, 1 FIXO, 2 ALA esq, 3 ALA dir, 4 PIVÔ
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0; // 0 = olhando para +Z
  stamina = 1;
  device: DeviceId | null = null;
  kick: PendingKick | null = null;
  stun = 0; // caído / levantando
  lying: string | null = null;
  cooldown = 0; // sem domínio após chutar
  tackleCd = 0;
  sliding = 0;
  slideDir = new THREE.Vector3();
  fouls = 0;
  yellow = 0;
  sentOff = 0; // segundos de jogo fora
  goals = 0;
  style = 0;
  shots = 0;
  // IA
  aiT = Math.random() * 0.3;
  target = new THREE.Vector3();
  wantSprint = false;
  juggling = 0; // > 0 quando está fazendo embaixadinhas
  stepT = 0;
  stepSide = 1;
  holdT = 0; // segurando a bola (goleiro / lateral)
  shootHold = 0;

  constructor(data: PlayerData, team: Team, slot: number, kitUrl: string) {
    this.data = data;
    this.team = team;
    this.slot = slot;
    this.role = (data.pos === 'PIVÔ' ? 'PIVÔ' : data.pos) as Role;
    this.ath = new Athlete(kitUrl);
  }

  get isGK() { return this.slot === 0; }
  get forward() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  get name() { return this.data.short; }
  get onField() { return this.sentOff <= 0; }
  stat(k: keyof PlayerData['stats']) { return this.data.stats[k] / 5; }

  maxSpeed(sprint: boolean) {
    const base = 5.4 + this.stat('velocidade') * 1.3;
    const tired = this.stamina < 0.25 ? 0.82 : 1;
    const fire = this.team.fire > 0 ? 1.2 : 1;
    return (sprint && this.stamina > 0.05 ? base * 1.32 : base) * tired * fire * this.team.speedMul;
  }

  faceTo(dir: THREE.Vector3, dt: number, rate = 12) {
    if (dir.lengthSq() < 1e-4) return;
    const want = Math.atan2(dir.x, dir.z);
    let d = want - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * rate);
  }

  sync() {
    this.ath.root.position.copy(this.pos);
    this.ath.root.rotation.y = this.yaw;
  }
}
