import type RAPIER from '@dimforge/rapier3d-compat';
import { RAY_GROUPS, type Rapier } from '@/game/physics/trackColliders';
import type { SimEvent } from '@/game/racing/events';
import type { KartState } from './kartState';
import { PHYS, surfaceByIndex } from './kartTuning';

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export interface PhysicsContext {
  R: Rapier;
  world: RAPIER.World;
  ray: RAPIER.Ray;
  emit: (e: SimEvent) => void;
  /** false durante a contagem regressiva: os karts ficam parados. */
  controlsEnabled: boolean;
}

/** Aplica um miniturbo/impulso. `kind`: 1..3 = nível de drift, 4 = item ou placa. */
export function applyBoost(k: KartState, seconds: number, kind: number): void {
  if (seconds >= k.boostTime) {
    k.boostTime = seconds;
    k.boostTotal = seconds;
    k.boostKind = kind;
  }
}

/** Faz o kart rodar (atingido). Devolve false se estava protegido. */
export function spinOut(k: KartState, emit: (e: SimEvent) => void, cause: 'faisca' | 'nevoa' | 'obstaculo'): boolean {
  if (k.invuln > 0 || k.spinTime > 0) return false;
  if (k.shield > 0) {
    k.shield = 0;
    k.invuln = 0.8;
    emit({ type: 'shield_break', kart: k.index });
    return false;
  }
  k.spinTime = PHYS.spinTime / k.tuning.recovery;
  k.invuln = k.spinTime + PHYS.invulnTime;
  k.drifting = false; k.driftCharge = 0; k.driftLevel = 0;
  k.boostTime = 0;
  k.hitsTaken++;
  emit({ type: 'hit', kart: k.index, cause });
  return true;
}

export function jump(k: KartState, emit: (e: SimEvent) => void, speed: number = PHYS.jumpSpeed): void {
  k.vy = Math.max(k.vy, 0) + speed;
  k.grounded = false;
  k.jumpGrace = 0.3;
  emit({ type: 'jump', kart: k.index });
}

/**
 * Um passo fixo de física arcade do kart: lê o chão por raio, integra aceleração, direção,
 * aderência, drift e turbo, e escreve a velocidade no corpo rígido (o Rapier resolve as colisões).
 */
export function stepKart(k: KartState, ctx: PhysicsContext, dt: number): void {
  const t = k.tuning;
  const inp = k.input;
  k.px = k.x; k.py = k.y; k.pz = k.z; k.pHeading = k.heading;

  // temporizadores
  k.boostTime = Math.max(0, k.boostTime - dt);
  k.spinTime = Math.max(0, k.spinTime - dt);
  k.invuln = Math.max(0, k.invuln - dt);
  k.stun = Math.max(0, k.stun - dt);
  k.shield = Math.max(0, k.shield - dt);
  k.hopTime = Math.max(0, k.hopTime - dt);
  k.jumpGrace = Math.max(0, k.jumpGrace - dt);
  k.padCooldown = Math.max(0, k.padCooldown - dt);
  k.freeze = Math.max(0, k.freeze - dt);

  if (k.freeze > 0 || !ctx.controlsEnabled) {
    k.vx = 0; k.vz = 0;
    if (!ctx.controlsEnabled) k.vy = 0;
  }

  // chão
  ctx.ray.origin.x = k.x; ctx.ray.origin.y = k.y; ctx.ray.origin.z = k.z;
  ctx.ray.dir.x = 0; ctx.ray.dir.y = -1; ctx.ray.dir.z = 0;
  const reach = PHYS.rideHeight + 0.9;
  const hit = ctx.world.castRayAndGetNormal(ctx.ray, reach, true, undefined, RAY_GROUPS);
  let dist = Infinity;
  if (hit) {
    dist = hit.timeOfImpact;
    if (hit.normal.y > 0.35) { k.nx = hit.normal.x; k.ny = hit.normal.y; k.nz = hit.normal.z; } else dist = Infinity;
  }
  const wasGrounded = k.grounded;
  const near = dist <= PHYS.rideHeight + (wasGrounded ? 0.3 : 0.06);
  const vn = k.vx * k.nx + k.vy * k.ny + k.vz * k.nz;
  k.grounded = near && k.jumpGrace <= 0 && (wasGrounded || vn <= 0.5);
  if (!k.grounded) { k.nx = 0; k.ny = 1; k.nz = 0; }

  if (k.grounded && !wasGrounded) {
    if (k.airTime > 0.25) ctx.emit({ type: 'land', kart: k.index, impact: Math.max(0, -vn) });
    k.airTime = 0;
  }
  if (!k.grounded) k.airTime += dt;

  // base local: frente e esquerda sobre o plano do chão
  let fx = Math.sin(k.heading), fy = 0, fz = Math.cos(k.heading);
  const fd = fx * k.nx + fz * k.nz;
  fx -= k.nx * fd; fy -= k.ny * fd; fz -= k.nz * fd;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl; fy /= fl; fz /= fl;
  // esquerda = normal × frente
  const lx = k.ny * fz - k.nz * fy, ly = k.nz * fx - k.nx * fz, lz = k.nx * fy - k.ny * fx;

  let vf = k.vx * fx + k.vy * fy + k.vz * fz;
  let vl = k.vx * lx + k.vy * ly + k.vz * lz;

  const surf = surfaceByIndex(k.surface);
  const boosting = k.boostTime > 0;
  const off = k.onRoad ? 0 : 1;
  // fora de estrada: penalidade reduzida pelo atributo do kart e ignorada em parte durante o turbo
  const penalty = (base: number): number => 1 - (1 - base) * (1 - t.offroad * off) * (boosting ? 0.35 : 1);
  let top = t.topSpeed * penalty(surf.speed);
  if (boosting) top = Math.max(top, t.topSpeed * PHYS.boostSpeed * (off ? 0.86 : 1));

  const controllable = ctx.controlsEnabled && k.spinTime <= 0 && k.stun <= 0 && k.freeze <= 0;
  const throttle = controllable ? clamp(inp.throttle, 0, 1) : 0;
  const brake = controllable ? clamp(inp.brake, 0, 1) : 0;
  const steerIn = controllable ? clamp(inp.steer, -1, 1) : 0;
  k.steer += (steerIn - k.steer) * Math.min(1, dt * 9);

  if (k.grounded) {
    // ----- aceleração longitudinal -----
    if (boosting && k.spinTime <= 0) {
      if (vf < top) vf = Math.min(top, vf + PHYS.boostAccel * dt);
    } else if (throttle > 0 && vf < top) {
      const ratio = clamp(vf / top, 0, 1);
      vf += t.accel * penalty(surf.accel) * (1 - ratio * ratio * 0.82) * throttle * t.recovery ** (ratio < 0.5 ? 1 : 0) * dt;
      vf = Math.min(vf, top);
    }
    if (vf > top) vf = Math.max(top, vf - (off ? 26 : 10) * dt);
    // teto absoluto: empurrões, quedas e ladeiras não podem render mais que o turbo do próprio kart
    vf = Math.min(vf, t.topSpeed * PHYS.boostSpeed * 1.1);
    if (brake > 0) {
      if (vf > 0.6) vf = Math.max(0, vf - t.brake * brake * (surf.grip < 3 ? 0.35 : 1) * dt);
      else vf = Math.max(-PHYS.reverseSpeed * penalty(surf.speed), vf - 11 * brake * dt);
    }
    if (throttle <= 0 && brake <= 0 && !boosting) {
      const drag = (2.2 + Math.abs(vf) * 0.12) * surf.drag;
      vf -= Math.sign(vf) * Math.min(Math.abs(vf), drag * dt);
    }
    if (k.spinTime > 0) vf *= Math.exp(-2.4 * dt);
    // efeito da ladeira
    vf += -PHYS.gravity * fy * 0.3 * dt;

    // ----- drift -----
    const driftPressed = controllable && inp.drift;
    const fast = vf > t.topSpeed * 0.42;
    // segurar o botão e depois virar também inicia o drift; `driftHeld` trava só depois de um drift encerrado
    if (!driftPressed) k.driftHeld = false;
    if (driftPressed && !k.driftHeld && !k.drifting && fast && Math.abs(steerIn) > 0.2) {
      k.drifting = true;
      k.driftDir = Math.sign(steerIn);
      k.driftCharge = 0; k.driftLevel = 0;
      k.hopTime = 0.22;
      ctx.emit({ type: 'drift_start', kart: k.index });
    }
    if (k.drifting) {
      if (!driftPressed || !fast) {
        if (k.driftLevel > 0 && fast) {
          const lvl = k.driftLevel;
          applyBoost(k, PHYS.driftBoostTime[lvl - 1]! * t.driftBoost, lvl);
          k.turbos[lvl - 1]!++;
          ctx.emit({ type: 'turbo', kart: k.index, level: lvl });
        }
        k.drifting = false; k.driftCharge = 0; k.driftLevel = 0;
        k.driftHeld = driftPressed;
      } else {
        const inward = steerIn * k.driftDir;
        k.driftCharge += dt * (0.55 + 0.5 * Math.max(0, inward)) * t.driftCharge;
        const lv = k.driftCharge >= PHYS.driftLevels[2] ? 3 : k.driftCharge >= PHYS.driftLevels[1] ? 2 : k.driftCharge >= PHYS.driftLevels[0] ? 1 : 0;
        if (lv > k.driftLevel) { k.driftLevel = lv as 1 | 2 | 3; ctx.emit({ type: 'drift_level', kart: k.index, level: lv }); }
      }
    }

    // ----- direção -----
    const speedAbs = Math.abs(vf);
    const authority = clamp(speedAbs / 5, 0, 1) * (1 - 0.3 * clamp(speedAbs / t.topSpeed, 0, 1));
    let yaw: number;
    if (k.drifting) {
      const inward = k.steer * k.driftDir;
      yaw = k.driftDir * (1.12 + 0.72 * inward) * (t.turnRate / 2.05);
    } else {
      yaw = k.steer * t.turnRate * authority * (vf < -0.5 ? -1 : 1) * (surf.grip < 3 ? 0.8 : 1);
    }
    k.heading -= yaw * dt;

    // ----- aderência lateral -----
    // empurrado (onda de vento) ou rodando: quase sem aderência, o impulso lateral se mantém
    const grip = (k.drifting ? 3.4 : surf.grip) * t.grip * (k.stun > 0 ? 0.12 : k.spinTime > 0 ? 0.4 : 1);
    vl *= Math.exp(-grip * dt);
    // no drift o kart é empurrado para fora da curva (derrapa de lado)
    if (k.drifting) vl += k.driftDir * vf * 0.42 * dt * (surf.grip < 3 ? 1.6 : 1);

    if (!ctx.controlsEnabled || k.freeze > 0) { vf = 0; vl = 0; }

    // segue o chão: remove a componente normal e corrige a altura
    const err = PHYS.rideHeight - dist;
    const corr = clamp(err * 16, -7, 9);
    k.vx = fx * vf + lx * vl + k.nx * corr;
    k.vy = fy * vf + ly * vl + k.ny * corr;
    k.vz = fz * vf + lz * vl + k.nz * corr;
  } else {
    // no ar: gravidade, leve controle de direção, sem tração
    k.vy -= PHYS.gravity * dt;
    k.heading -= k.steer * 0.9 * dt;
    if (k.drifting && k.airTime > 0.5) { k.drifting = false; k.driftCharge = 0; k.driftLevel = 0; k.driftHeld = true; }
    if (!(controllable && inp.drift)) k.driftHeld = false;
    if (k.freeze > 0) { k.vx = 0; k.vz = 0; }
  }

  k.speed = vf;
  k.lateralSpeed = vl;
  if (vf > k.topSpeed) k.topSpeed = vf;
  k.body.setLinvel({ x: k.vx, y: k.vy, z: k.vz }, true);
}

/** Depois do passo do mundo: lê posição e velocidade resolvidas e detecta impactos. */
export function syncKart(k: KartState, emit: (e: SimEvent) => void): void {
  const p = k.body.translation();
  const v = k.body.linvel();
  const dvx = v.x - k.vx, dvy = v.y - k.vy, dvz = v.z - k.vz;
  const impact = Math.hypot(dvx, dvz) + Math.max(0, Math.abs(dvy) - 4) * 0.5;
  if (impact > 2.5) {
    emit({ type: 'collision', kart: k.index, strength: impact, x: p.x, y: p.y, z: p.z });
    if (k.drifting && impact > 7) { k.drifting = false; k.driftCharge = 0; k.driftLevel = 0; k.driftHeld = true; }
  }
  k.x = p.x; k.y = p.y; k.z = p.z;
  k.vx = v.x; k.vy = v.y; k.vz = v.z;
}

/** Coloca o kart em uma posição, parado. */
export function placeKart(k: KartState, x: number, y: number, z: number, heading: number): void {
  k.x = k.px = x; k.y = k.py = y; k.z = k.pz = z;
  k.heading = k.pHeading = heading;
  k.vx = k.vy = k.vz = 0; k.speed = 0; k.lateralSpeed = 0; k.steer = 0;
  k.drifting = false; k.driftCharge = 0; k.driftLevel = 0; k.boostTime = 0; k.spinTime = 0;
  k.grounded = true; k.airTime = 0;
  k.body.setTranslation({ x, y, z }, true);
  k.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
}
