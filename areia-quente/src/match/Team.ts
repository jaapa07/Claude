import { Player, type TeamData } from './Player';
import type { DeviceId } from '../core/Input';

export type Formation = '1-2-1' | '2-2' | '1-1-2';

/** Seleção em campo: 5 titulares, 5 reservas, placar, estatísticas, estilo e Modo Fogo. */
export class Team {
  side: 0 | 1;
  data: TeamData;
  kit: 'home' | 'away';
  players: Player[] = [];
  bench: Player[] = [];
  dir: 1 | -1 = 1; // direção de ataque no eixo X
  score = 0;
  penScore = 0;
  devices: DeviceId[] = [];
  heat = 0; // 0..1
  fire = 0; // segundos restantes de Modo Fogo
  multiplier = 1;
  comboT = 0;
  stylePts = 0;
  shots = 0;
  fouls = 0;
  possT = 0;
  formation: Formation = '1-2-1';
  speedMul = 1;
  opp!: Team;

  constructor(side: 0 | 1, data: TeamData, kit: 'home' | 'away') {
    this.side = side;
    this.data = data;
    this.kit = kit;
  }

  get id() { return this.data.id; }
  get human() { return this.devices.length > 0; }
  get gk() { return this.players[0]; }
  get field() { return this.players.filter((p) => p.onField); }
  kitUrl(i: number) { return `textures/kits/${this.data.id}_${this.kit}_${i}.webp`; }

  /**
   * Titulares conforme o formato da partida (o número conta o goleiro):
   * 5x5 = GOL, FIXO, ALA, ALA, PIVÔ · 4x4 = GOL, FIXO, ALA, ALA · 3x3 = GOL, FIXO, PIVÔ. O resto vai para o banco.
   */
  size: 3 | 4 | 5 = 5;
  build(size: 3 | 4 | 5 = 5) {
    this.size = size;
    const ps = this.data.players;
    const starters = size === 3 ? [0, 1, 4] : size === 4 ? [0, 1, 2, 3] : [0, 1, 2, 3, 4];
    for (const i of starters) this.players.push(new Player(ps[i], this, i, this.kitUrl(i)));
    for (let i = 0; i < 10; i++) if (!starters.includes(i)) this.bench.push(new Player(ps[i], this, Math.max(1, i % 5), this.kitUrl(i)));
  }

  /** Substituição: troca titular por reserva mantendo a posição. */
  substitute(onIdx: number, benchIdx: number) {
    const out = this.players[onIdx];
    const inn = this.bench[benchIdx];
    if (!out || !inn) return null;
    inn.slot = out.slot;
    inn.pos.copy(out.pos); inn.yaw = out.yaw; inn.device = out.device; out.device = null;
    inn.stamina = 1;
    this.players[onIdx] = inn;
    this.bench[benchIdx] = out;
    return { out, inn };
  }
}
