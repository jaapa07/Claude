/**
 * Os 10 clipes do contrato, descritos como funções pose(t) e amostrados a 30 fps.
 * Cadeias secundárias (caudas, tranças, cachecóis, orelhas, penas) reagem com atraso à inclinação do tronco,
 * balançam sozinhas e esvoaçam com o "vento" nos clipes de pilotagem.
 */
import { THREE, type V3 } from '../lib/geo';
import { mirrorPose, solvePose, type Pose, type Rig } from './rig';

export const FPS = 30;
const TAU = Math.PI * 2;
const wave = (t: number, dur: number, k = 1, ph = 0): number => Math.sin(TAU * ((k * t) / dur + ph));
const ss = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Sobe em [a,b] e desce em [c,d]. */
const win = (t: number, a: number, b: number, c: number, d: number): number => ss(a, b, t) * (1 - ss(c, d, t));

export interface ClipDef { name: string; dur: number; loop: boolean; wind: number; sway: number; pose: (t: number) => Pose }

/** Distribui inclinação do tronco: roll (z; negativo = esquerda), pitch (x; positivo = para a frente), yaw (y; positivo = esquerda). */
function torso(roll: number, pitch: number, yaw: number): Record<string, V3> {
  return {
    hips: [pitch * 0.15, yaw * 0.1, roll * 0.2],
    spine: [pitch * 0.4, yaw * 0.4, roll * 0.4],
    chest: [pitch * 0.45, yaw * 0.5, roll * 0.4],
  };
}

const idle: ClipDef = {
  name: 'idle', dur: 3, loop: true, wind: 0, sway: 1,
  pose: (t) => {
    const br = wave(t, 3, 2), x = (TAU * t) / 3;
    const look = 0.36 * (Math.sin(x) + 0.2 * Math.sin(3 * x));
    return {
      rot: {
        ...torso(0.03 * wave(t, 3, 1, 0.2), -0.035 * br, look * 0.25),
        neck: [0.02 * br, look * 0.3, 0.02 * wave(t, 3, 1, 0.4)],
        head: [0.05 * wave(t, 3, 2, 0.15) - 0.02, look * 0.6, 0.07 * wave(t, 3, 1, 0.55)],
        legL: [0.025 * wave(t, 3, 1, 0.1), 0, 0], legR: [0.025 * wave(t, 3, 1, 0.6), 0, 0],
      },
      hips: [0, 0.005 * br, 0],
      steer: 0.09 * wave(t, 3, 1, 0.3),
    };
  },
};

const drive: ClipDef = {
  name: 'drive', dur: 1.2, loop: true, wind: 1, sway: 0.4,
  pose: (t) => {
    const d = 1.2, st = 0.13 * wave(t, d, 1) + 0.06 * wave(t, d, 3, 0.2);
    return {
      rot: {
        ...torso(-0.3 * st + 0.012 * wave(t, d, 5), 0.1 + 0.015 * wave(t, d, 4), 0.25 * st),
        neck: [-0.03, 0.2 * st, 0.1 * st],
        head: [-0.06 + 0.02 * wave(t, d, 4, 0.2), 0.45 * st, 0.015 * wave(t, d, 6)],
        legL: [0.02 * wave(t, d, 2), 0, 0], legR: [0.02 * wave(t, d, 2, 0.5), 0, 0],
        shinR: [0.04 * wave(t, d, 1, 0.3), 0, 0],
      },
      hips: [0, 0.004 * wave(t, d, 6) + 0.003 * wave(t, d, 2), 0],
      steer: st,
    };
  },
};

const turnLeft: ClipDef = {
  name: 'turn_left', dur: 1, loop: true, wind: 1, sway: 0.4,
  pose: (t) => {
    const d = 1, j = wave(t, d, 2), j2 = wave(t, d, 3, 0.3);
    return {
      rot: {
        ...torso(-0.2 + 0.015 * j, 0.1 + 0.01 * j2, 0.16),
        neck: [-0.02, 0.14, -0.05],
        head: [-0.05 + 0.012 * j2, 0.26 + 0.02 * j, -0.1],
        legL: [0.03, 0, -0.04], legR: [-0.03, 0, -0.05],
      },
      hips: [0.012, 0.003 * wave(t, d, 5), 0],
      steer: 0.92 + 0.05 * j,
    };
  },
};

const driftLeft: ClipDef = {
  name: 'drift_left', dur: 0.8, loop: true, wind: 1, sway: 0.6,
  pose: (t) => {
    const d = 0.8, tr = wave(t, d, 5), tr2 = wave(t, d, 7, 0.3), j = wave(t, d, 2);
    return {
      rot: {
        ...torso(-0.36 + 0.018 * tr, 0.13 + 0.012 * tr2, 0.3 + 0.02 * j),
        neck: [-0.04, 0.2, 0.08],
        head: [-0.04 + 0.015 * tr2, 0.42 + 0.03 * j, 0.14 + 0.012 * tr],
        legL: [0.05, 0, -0.07], legR: [-0.07 + 0.01 * tr, 0, -0.09], shinR: [-0.08, 0, 0],
      },
      hips: [0.02, 0.004 * tr, 0],
      // contra-esterço: volante para a direita enquanto o corpo mergulha para dentro da curva
      steer: -0.5 + 0.07 * tr + 0.05 * j,
    };
  },
};

const hit: ClipDef = {
  name: 'hit', dur: 0.9, loop: false, wind: 0.3, sway: 0.5,
  pose: (t) => {
    const fade = 1 - ss(0.68, 0.9, t);
    const A = (x: number): number => (x <= 0 ? 0 : Math.exp(-4.2 * x) * Math.sin(TAU * 1.55 * x) * 1.6);
    const a = A(t) * fade, ah = A(t - 0.05) * fade;
    const m = win(t, 0.0, 0.1, 0.42, 0.78);
    const hop = Math.sin(Math.PI * Math.min(1, t / 0.32)) * 0.045;
    const wob = wave(t, 0.9, 3) * m;
    return {
      rot: {
        ...torso(0.1 * wob, 0.5 * a, 0.08 * wob),
        neck: [0.2 * ah, 0, 0.1 * wob],
        head: [0.42 * ah, 0.12 * wob, -0.16 * wob],
        legL: [-0.3 * m, 0, 0.05 * m], legR: [-0.24 * m, 0, -0.05 * m],
        shinL: [0.25 * m, 0, 0], shinR: [0.2 * m, 0, 0],
      },
      hips: [0, hop, -0.02 * a],
      steer: 0.2 * wob,
      handL: { mix: m, rel: [0.3, 0.24 + 0.06 * wob, 0.2], pole: [1, -0.4, -0.4], rot: [0, 0, 0.5 * wob] },
      handR: { mix: m, rel: [-0.32, 0.3 - 0.06 * wob, 0.16], pole: [-1, -0.4, -0.4], rot: [0, 0, 0.5 * wob] },
    };
  },
};

const victory: ClipDef = {
  name: 'victory', dur: 2.4, loop: false, wind: 0, sway: 1.2,
  pose: (t) => {
    const crouch = win(t, 0, 0.22, 0.3, 0.45);
    const up = ss(0.28, 0.55, t);
    const hop1 = Math.max(0, Math.sin(Math.PI * ((t - 0.38) / 0.5))) * (t < 0.88 ? 1 : 0);
    const hop2 = Math.max(0, Math.sin(Math.PI * ((t - 1.05) / 0.45))) * (t > 1.05 && t < 1.5 ? 1 : 0);
    const hop = 0.07 * hop1 + 0.05 * hop2;
    const pump = Math.sin(TAU * 1.6 * (t - 0.5)) * win(t, 0.5, 0.7, 1.9, 2.3);
    const settle = ss(1.9, 2.4, t);
    const sway = Math.sin(TAU * 0.8 * t) * up * (1 - settle * 0.6);
    return {
      rot: {
        ...torso(0.1 * sway, 0.14 * crouch - 0.16 * up + 0.03 * pump, -0.12 * up),
        neck: [-0.06 * up, -0.05 * up, 0.05 * sway],
        head: [0.1 * crouch - 0.24 * up + 0.04 * pump, -0.12 * up + 0.12 * sway, 0.16 * sway],
        legL: [-0.22 * (hop1 + hop2 * 0.7) + 0.04 * crouch, 0, 0.04 * up], legR: [-0.16 * (hop1 * 0.7 + hop2), 0, -0.04 * up],
        shinL: [0.2 * hop1, 0, 0], shinR: [0.2 * hop2, 0, 0],
      },
      hips: [0, hop - 0.012 * crouch, 0],
      steer: 0.12 * sway,
      handL: { mix: 0.25 * up, rel: [0.22, 0.12, 0.34], pole: [1, -0.8, -0.2] },
      handR: { mix: up, rel: [-0.3 - 0.02 * pump, 0.44 + 0.055 * pump, 0.1], pole: [-1, -0.45, -0.5], rot: [0, 0, 0.25 * pump] },
    };
  },
};

const defeat: ClipDef = {
  name: 'defeat', dur: 2.4, loop: false, wind: 0, sway: 0.5,
  pose: (t) => {
    const d = ss(0, 0.9, t);
    const sigh = win(t, 0.25, 0.6, 0.7, 1.1);
    const shake = Math.sin(TAU * 1.5 * (t - 1.0)) * win(t, 1.0, 1.2, 1.9, 2.25);
    return {
      rot: {
        ...torso(0.03 * shake, 0.34 * d - 0.1 * sigh, 0.04 * shake),
        neck: [0.16 * d, 0.1 * shake, 0],
        head: [0.4 * d - 0.12 * sigh, 0.24 * shake, 0.05 * d],
        legL: [0.04 * d, 0, 0.03 * d], legR: [0.04 * d, 0, -0.03 * d],
      },
      hips: [0, -0.008 * d, 0],
      steer: 0.03 * shake,
      handL: { mix: 0.9 * d, rel: [0.115, -0.02 - 0.02 * d, 0.3], pole: [1, -1, -0.5] },
      handR: { mix: 0.9 * d, rel: [-0.115, -0.02 - 0.02 * d, 0.3], pole: [-1, -1, -0.5] },
    };
  },
};

const podium: ClipDef = {
  name: 'podium', dur: 2, loop: true, wind: 0, sway: 1.2,
  pose: (t) => {
    const d = 2, s1 = wave(t, d, 1), w2 = wave(t, d, 2), w2b = wave(t, d, 2, 0.25);
    const bounce = 0.5 - 0.5 * Math.cos((TAU * 2 * t) / d);
    return {
      rot: {
        ...torso(0.09 * s1, -0.1 + 0.03 * w2, 0.1 * wave(t, d, 1, 0.25)),
        neck: [-0.04, 0.05 * wave(t, d, 1, 0.25), 0.05 * s1],
        head: [-0.12 + 0.03 * w2b, 0.14 * wave(t, d, 1, 0.3), 0.12 * s1],
        legL: [-0.08 * bounce, 0, 0.03], legR: [-0.08 * (1 - bounce) * 0.6, 0, -0.03],
      },
      hips: [0, 0.022 * bounce, 0],
      handL: { mix: 1, rel: [0.3 + 0.06 * w2, 0.42 + 0.03 * w2b, 0.08], pole: [1, -0.5, -0.5], rot: [0, 0, 0.35 * w2] },
      handR: { mix: 1, rel: [-0.3 + 0.06 * w2b, 0.42 - 0.03 * w2, 0.08], pole: [-1, -0.5, -0.5], rot: [0, 0, 0.35 * w2b] },
    };
  },
};

const mirrored = (c: ClipDef, name: string): ClipDef => ({ ...c, name, pose: (t) => mirrorPose(c.pose(t)) });

export const CLIPS: ClipDef[] = [
  idle, drive, turnLeft, mirrored(turnLeft, 'turn_right'), driftLeft, mirrored(driftLeft, 'drift_right'), hit, victory, defeat, podium,
];
export const CLIP_NAMES = CLIPS.map((c) => c.name);

/* ---------- movimento secundário ---------- */
export interface Chain {
  bones: string[];
  /** Contra-rotação por osso em resposta ao roll/pitch do tronco (com atraso). */
  roll?: number; pitch?: number;
  /** Atraso por osso (s). */
  lag?: number;
  /** Amplitude do balanço próprio (rad) por eixo e defasagem entre ossos. */
  sway?: V3; phase?: number; cycles?: number;
  /** Rotação constante por osso com vento = 1, e amplitude do esvoaçar. */
  wind?: V3; flutter?: V3;
  /** Resposta ao pulo (rad por metro de deslocamento vertical do quadril). */
  bounce?: number;
}

function signals(p: Pose): { roll: number; pitch: number; yaw: number; y: number } {
  let roll = 0, pitch = 0, yaw = 0;
  for (const b of ['hips', 'spine', 'chest', 'neck', 'head']) {
    const e = p.rot[b];
    const k = b === 'neck' || b === 'head' ? 0.5 : 1;
    if (e) { pitch += e[0] * k; yaw += e[1] * k; roll += e[2] * k; }
  }
  return { roll, pitch, yaw, y: p.hips?.[1] ?? 0 };
}

function chainRotations(rig: Rig, chains: Chain[], clip: ClipDef, t: number): Map<number, THREE.Quaternion> {
  const out = new Map<number, THREE.Quaternion>();
  const e = new THREE.Euler();
  const at = (tau: number): Pose => clip.pose(clip.loop ? ((tau % clip.dur) + clip.dur) % clip.dur : Math.min(clip.dur, Math.max(0, tau)));
  chains.forEach((ch, ci) => {
    const lag = ch.lag ?? 0.07, cyc = ch.cycles ?? 1;
    ch.bones.forEach((name, i) => {
      const tau = t - lag * (i + 1);
      const s = signals(at(tau)), s0 = signals(at(tau - 0.06));
      const ph = (ch.phase ?? 0.16) * i + ci * 0.13;
      const sw = ch.sway ?? [0, 0, 0], wd = ch.wind ?? [0, 0, 0], fl = ch.flutter ?? [0, 0, 0];
      // ciclos inteiros por clipe para os loops fecharem sem salto
      const kS = clip.loop ? Math.max(1, Math.round((cyc * clip.dur) / 1.5)) : (cyc * clip.dur) / 1.5;
      const kF = clip.loop ? Math.max(2, Math.round(clip.dur * 3.4)) : clip.dur * 3.4;
      const a = wave(t, clip.dur, kS, -ph), b = wave(t, clip.dur, kS, -ph + 0.25);
      const fa = wave(t, clip.dur, kF, -ph * 2.2), fb = wave(t, clip.dur, kF + (clip.loop ? 1 : 0.7), -ph * 1.7 + 0.2);
      const vy = (s.y - s0.y) / 0.06;
      const bx = -(ch.bounce ?? 0) * (s.y * 1.2 + vy * 0.09);
      const yawVel = (s.yaw - s0.yaw) / 0.06;
      e.set(
        -(ch.pitch ?? 0) * s.pitch + sw[0] * clip.sway * b + clip.wind * (wd[0] + fl[0] * fb) + bx,
        sw[1] * clip.sway * a + clip.wind * (wd[1] + fl[1] * fa) - (ch.roll ?? 0) * 0.12 * yawVel,
        -(ch.roll ?? 0) * s.roll + sw[2] * clip.sway * a + clip.wind * (wd[2] + fl[2] * fa),
        'XYZ',
      );
      out.set(rig.i(name), new THREE.Quaternion().setFromEuler(e));
    });
  });
  return out;
}

/* ---------- amostragem ---------- */
export interface SampledClip { name: string; dur: number; times: number[]; rot: number[][]; hips: number[] }

export function sampleClip(rig: Rig, chains: Chain[], clip: ClipDef): SampledClip {
  const frames = Math.round(clip.dur * FPS);
  const times: number[] = [];
  const rot: number[][] = rig.bones.map(() => []);
  const hips: number[] = [];
  const prev: (THREE.Quaternion | null)[] = rig.bones.map(() => null);
  const hipsRest = rig.p('hips').sub(rig.p('root'));
  for (let f = 0; f <= frames; f++) {
    const t = (f / frames) * clip.dur;
    // nos loops o último quadro repete exatamente o primeiro
    const te = clip.loop && f === frames ? 0 : t;
    const s = solvePose(rig, clip.pose(te), chainRotations(rig, chains, clip, te));
    times.push(Math.round(t * 1e5) / 1e5);
    s.q.forEach((q, k) => {
      const p = prev[k];
      if (p && p.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
      prev[k] = q;
      rot[k]!.push(q.x, q.y, q.z, q.w);
    });
    hips.push(hipsRest.x + s.hips.x, hipsRest.y + s.hips.y, hipsRest.z + s.hips.z);
  }
  return { name: clip.name, dur: clip.dur, times, rot, hips };
}
