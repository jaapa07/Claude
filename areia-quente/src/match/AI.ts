import * as THREE from 'three';
import type { Match } from './Match';
import type { Team } from './Team';
import type { Player } from './Player';
import { FIELD, BALL_R } from './Ball';
import { audio } from '../core/Audio';
import { t } from '../core/Strings';

const tmp = new THREE.Vector3();
const REACT = [0.42, 0.26, 0.16];

/** Estilo de jogo de cada seleção (probabilidades usadas nas decisões). */
function styleOf(tm: Team) {
  const s = tm.data.style;
  return {
    trick: s === 'firula' ? 0.5 : s === 'toque' ? 0.25 : s === 'força' ? 0.15 : 0.18,
    pass: s === 'toque' || s === 'posse' || s === 'coletivo' ? 0.55 : 0.35,
    shootRange: s === 'força' || s === 'raça' ? 15 : 13,
    press: s === 'ferrolho' ? 0.75 : s === 'raça' ? 1.15 : 1,
    aerial: s === 'firula' ? 0.6 : 0.35,
  };
}

/** Posição-alvo da formação (coordenadas do campo) para cada função. */
function anchor(m: Match, p: Player, attacking: boolean, out: THREE.Vector3) {
  const tm = p.team, d = tm.dir, b = m.ball.pos;
  const bu = b.x * d; // posição da bola no eixo de ataque
  const bz = b.z;
  let u = 0, v = 0;
  const f = tm.formation;
  switch (p.slot) {
    case 1: // fixo
      u = attacking ? Math.max(-10, bu - 7) : Math.max(-14, Math.min(-6, bu - 4));
      v = bz * (attacking ? 0.2 : 0.45);
      if (f === '2-2') v += attacking ? -3 : -2.5;
      break;
    case 2: case 3: { // alas
      const s = p.slot === 2 ? -1 : 1;
      u = attacking ? Math.min(13, bu + 2 + (f === '1-1-2' ? 3 : 0)) : Math.max(-12, bu - 3);
      v = s * (attacking ? 8 : 5) + bz * 0.25;
      if (f === '2-2' && p.slot === 2) { u = attacking ? bu - 5 : Math.max(-13, bu - 6); v = 3 + bz * 0.3; }
      break;
    }
    case 4: // pivô
      u = attacking ? Math.min(15, Math.max(9, bu + 6)) : Math.max(-6, bu - 1.5);
      v = attacking ? -bz * 0.35 + Math.sin(m.world.time * 0.4 + p.data.number) * 3 : bz * 0.4;
      if (f === '1-1-2' && attacking) v += 3;
      break;
  }
  // formatos menores: menos gente para cobrir a largura do campo
  if (tm.size === 3) { if (p.slot === 1) v = bz * 0.7; else if (p.slot === 4) v = attacking ? -Math.sign(bz || 1) * 4 + bz * 0.2 : bz * 0.5; }
  if (tm.size === 4 && (p.slot === 2 || p.slot === 3) && attacking) u = Math.min(15, u + 2); // sem pivô, os alas atacam mais
  out.set(u * d, 0, THREE.MathUtils.clamp(v, -FIELD.HW + 1, FIELD.HW - 1));
  out.x = THREE.MathUtils.clamp(out.x, -FIELD.HL + 1.5, FIELD.HL - 1.5);
  return out;
}

/**
 * Desmarque: perto da posição da formação, procura o ponto com mais espaço (longe dos marcadores)
 * e com a linha de passe do companheiro com a bola livre. Recalcula de tempos em tempos para não tremer.
 */
const cand = new THREE.Vector3();
function openSpace(m: Match, p: Player, carrier: Player, out: THREE.Vector3, dt: number) {
  p.aiT -= dt;
  if (p.aiT > 0 && p.wantSprint) { out.copy(p.runTarget); return; }
  p.aiT = 0.6 + Math.random() * 0.3;
  const opp = p.team.opp.field;
  let best = -1e9;
  const base = out.clone();
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI * 2, r = i === 8 ? 0 : 3.2;
    cand.set(base.x + Math.cos(a) * r, 0, base.z + Math.sin(a) * r);
    cand.x = THREE.MathUtils.clamp(cand.x, -FIELD.HL + 1.5, FIELD.HL - 1.5); cand.z = THREE.MathUtils.clamp(cand.z, -FIELD.HW + 1, FIELD.HW - 1);
    const free = Math.min(...opp.map((o) => o.pos.distanceTo(cand)));
    const lane = Math.min(...opp.map((o) => segDist(o.pos, carrier.pos, cand)));
    const d = cand.distanceTo(carrier.pos);
    const s = Math.min(free, 5) * 0.8 + Math.min(lane, 3) * 1.2 - Math.abs(d - 7) * 0.15 - cand.distanceTo(base) * 0.15 + cand.x * p.team.dir * 0.05;
    if (s > best) { best = s; p.runTarget.copy(cand); }
  }
  p.wantSprint = true;
  out.copy(p.runTarget);
}
function segDist(pt: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  const abx = b.x - a.x, abz = b.z - a.z, l = abx * abx + abz * abz || 1;
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * abx + (pt.z - a.z) * abz) / l));
  return Math.hypot(a.x + abx * t - pt.x, a.z + abz * t - pt.z);
}

function moveTo(p: Player, target: THREE.Vector3, dt: number, sprint: boolean, face?: THREE.Vector3) {
  const d = tmp.copy(target).sub(p.pos).setY(0);
  const dist = d.length();
  const max = p.maxSpeed(sprint && dist > 4);
  const want = dist > 0.25 ? d.setLength(Math.min(max, dist * 2.2)) : d.set(0, 0, 0);
  p.vel.lerp(want, 1 - Math.exp(-10 * dt));
  if (sprint && dist > 4) p.stamina = Math.max(0, p.stamina - dt * 0.07);
  if (face) p.faceTo(face, dt, 8);
  else if (p.vel.lengthSq() > 0.3) p.faceTo(p.vel, dt, 10);
}

/** IA de linha (e dos companheiros do jogador humano). */
export function teamAI(m: Match, tm: Team, dt: number) {
  const b = m.ball;
  const st = styleOf(tm);
  const diff = m.difficulty;
  const owner = b.owner;
  const attacking = (owner && owner.team === tm) || (!owner && b.lastTouch?.team === tm && b.speed > 3);
  // quem pressiona: o mais rápido a chegar na bola
  const field = tm.field.filter((p) => !p.isGK && p !== m.trainer);
  let chaser: Player | null = null;
  if (!attacking || !owner) {
    let best = 1e9;
    for (const p of field) {
      if (p.stun > 0) continue;
      const tt = p.pos.distanceTo(b.predict(0.35)) / p.maxSpeed(true);
      if (tt < best) { best = tt; chaser = p; }
    }
  }
  for (const p of field) {
    if (p.device || p.stun > 0 || p.sliding > 0 || (p.kick && !p.kick.done) || !p.onField) continue;
    if (m.state === 'setpiece' || m.state === 'kickoff') {
      if (m.sp?.taker === p) continue;
      anchor(m, p, m.sp?.team === tm, p.target);
      if (m.state === 'kickoff') p.target.x = THREE.MathUtils.clamp(p.target.x, tm.dir > 0 ? -17 : 0.6, tm.dir > 0 ? -0.6 : 17);
      moveTo(p, p.target, dt, false, b.pos.clone().sub(p.pos));
      continue;
    }
    if (owner === p) { carrierAI(m, p, dt, st); continue; }
    // goleiro adversário com a bola na mão: ninguém pressiona nem dá carrinho (volta para a posição)
    if (owner && b.held && owner.team !== tm) { anchor(m, p, false, p.target); moveTo(p, p.target, dt, false, b.pos.clone().sub(p.pos)); continue; }
    if (p === chaser && (!owner || owner.team !== tm) && !(!owner && m.passTo && m.passTo.team === tm)) { // passe do time a caminho: ninguém corre atrás
      // pressão / disputa de bola
      const target = owner ? owner.pos.clone().addScaledVector(owner.vel, 0.3) : b.predict(0.25).setY(0);
      // pressão sem disparada contra o jogador humano (só corre a toda quando está perto ou no difícil)
      const far = target.distanceTo(p.pos) > 5;
      moveTo(p, target, dt, !(owner?.device && far && diff < 2));
      p.aiT -= dt;
      if (owner && p.aiT <= 0) {
        p.aiT = REACT[diff] + Math.random() * 0.3;
        const d = owner.pos.distanceTo(p.pos);
        if (d < 1.2 && Math.random() < (owner.device ? 0.3 : 0.45) * st.press) m.doTackle(p, false);
        else if (d < 2.8 && d > 1.6 && Math.random() < 0.12 * st.press * (diff + 1) / 2) m.doTackle(p, true);
      }
      // bola no alto vindo na área de ataque: finalização acrobática
      if (!owner && b.airborne && b.lastTouch?.team === tm) tryAerial(m, p, st);
      continue;
    }
    // recebedor do passe: espera a bola no pé, de frente para ela (a bola é que vem até ele)
    if (p === m.passTo && (!owner || owner.team === tm) && p.runT <= 0) { moveTo(p, p.pos, dt, false, b.pos.clone().sub(p.pos)); p.vel.multiplyScalar(0.85); tryAerial(m, p, st); continue; }
    // outro companheiro perto de uma bola do time: vai ao encontro dela
    if (!owner && b.lastTouch?.team === tm && b.speed > 2 && m.passTo !== p) {
      const tt = Math.max(0.1, Math.min(1.5, p.pos.distanceTo(b.pos) / Math.max(4, b.speed)));
      const pr = b.predict(tt);
      if (pr.distanceTo(p.pos) < 7) { moveTo(p, pr.setY(0), dt, true); tryAerial(m, p, st); continue; }
    }
    // tabela: corre para o espaço depois de tocar
    if (p.runT > 0 && attacking) { moveTo(p, p.runTarget, dt, true); continue; }
    anchor(m, p, !!attacking, p.target);
    if (attacking && owner && owner !== p) openSpace(m, p, owner, p.target, dt);
    if (!attacking && owner) {
      // marcação: fica entre o adversário mais próximo e o gol
      const opp = owner.team.field.filter((o) => o !== owner && !o.isGK).sort((a, c) => a.pos.distanceTo(p.target) - c.pos.distanceTo(p.target))[0];
      if (opp) p.target.lerp(opp.pos.clone().lerp(new THREE.Vector3(m.ownGoalX(tm), 0, 0), 0.35), 0.4); // marcação mais solta, deixa espaço
    }
    moveTo(p, p.target, dt, p.target.distanceTo(p.pos) > 7, attacking ? undefined : b.pos.clone().sub(p.pos));
  }
}

function tryAerial(m: Match, p: Player, st: ReturnType<typeof styleOf>) {
  const b = m.ball;
  if (!b.airborne || p.kick) return;
  const d = Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
  const goalD = Math.abs(m.goalX(p.team) - p.pos.x);
  if (d < 2.2 && b.pos.y < 2.6 && b.pos.y > 0.5 && b.vel.y < 1) {
    if (goalD < 14 && Math.random() < st.aerial + 0.2) m.doShoot(p, 0.8, new THREE.Vector3());
    else if (Math.random() < 0.3) m.doTrick(p);
  }
}

function carrierAI(m: Match, p: Player, dt: number, st: ReturnType<typeof styleOf>) {
  const tm = p.team;
  const b = m.ball;
  const goal = new THREE.Vector3(m.goalX(tm), 0, 0);
  const toGoal = goal.clone().sub(p.pos).setY(0);
  const gd = toGoal.length();
  const opps = tm.opp.field.filter((o) => !o.isGK);
  const nearest = opps.reduce<Player | null>((a, o) => (!a || o.pos.distanceTo(p.pos) < a.pos.distanceTo(p.pos) ? o : a), null);
  const nd = nearest ? nearest.pos.distanceTo(p.pos) : 99;
  const blocked = nearest ? nearest.pos.clone().sub(p.pos).normalize().dot(toGoal.clone().normalize()) > 0.6 && nd < 3 : false;
  // direção de condução: para o gol desviando do marcador
  const dir = toGoal.clone().normalize();
  if (nearest && nd < 4) {
    const away = p.pos.clone().sub(nearest.pos).setY(0).normalize();
    dir.addScaledVector(away, 0.9).normalize();
  }
  if (Math.abs(p.pos.z) > FIELD.HW - 2) dir.z -= Math.sign(p.pos.z) * 0.8;
  const sprint = gd > 10 && p.stamina > 0.3;
  moveTo(p, p.pos.clone().addScaledVector(dir, 3), dt, sprint);
  p.aiT -= dt;
  if (p.aiT > 0) return;
  p.aiT = REACT[m.difficulty] + 0.15 + Math.random() * 0.35;
  // Modo Fogo no ataque
  if (tm.heat >= 1 && tm.fire <= 0 && gd < 20 && Math.random() < 0.5) m.activateFire(tm);
  const r = Math.random();
  // finalização
  if (gd < st.shootRange && (!blocked || gd < 7) && Math.abs(p.pos.z) < 9) {
    if (gd < 12 && r < st.trick * 0.5 && !blocked) { m.doTrick(p); return; } // levanta para o voleio
    if (r < 0.4 + (13 - gd) * 0.05) { m.doShoot(p, THREE.MathUtils.clamp(0.45 + gd * 0.035, 0.4, 0.92), new THREE.Vector3(0, 0, Math.random() - 0.5)); return; }
  }
  // firula para passar do marcador
  if (nd < 2.4 && blocked && r < st.trick) { m.doTrick(p); return; }
  // passe
  if ((nd < 3 && r < st.pass + 0.25) || r < st.pass * 0.35) {
    const lob = blocked || Math.random() < 0.3;
    m.doPass(p, toGoal, lob);
  }
}

/** Goleiro: posicionamento no arco, saídas, mergulhos e defesas. */
export function gkAI(m: Match, tm: Team, dt: number) {
  const gk = tm.gk;
  if (!gk || !gk.onField || gk.stun > 0) return;
  const b = m.ball;
  const gx = m.ownGoalX(tm);
  const side = Math.sign(gx);
  // segurando a bola: repõe
  if (b.held && b.owner === gk) {
    if (!gk.device) { gk.vel.set(0, 0, 0); gk.holdT += dt; } // goleiro humano: anda com a bola e o tempo conta em humanUpdate (antes contava em dobro)
    if (!gk.device && gk.holdT > 1.4 && !gk.kick) {
      if (Math.random() < 0.35) m.longThrow(gk, 0.8);
      else m.doPass(gk, null, Math.random() < 0.3);
    }
    return;
  }
  if (gk.kick && !gk.kick.done) return;
  if (gk.ath.locked > 0 && gk.ath.current.startsWith('gk_dive')) { gk.vel.multiplyScalar(Math.exp(-2 * dt)); return; }
  // chute vindo em direção ao gol?
  const incoming = !b.owner && b.vel.x * side > 4 && Math.abs(b.pos.x - gx) < 20;
  if (incoming && b.lastTouch?.team !== tm) {
    const tt = (gx - b.pos.x) / b.vel.x;
    if (tt > 0 && tt < 2.2) {
      const pr = b.predict(tt);
      const onTarget = Math.abs(pr.z) < FIELD.GOAL_W / 2 + 0.4 && pr.y < FIELD.GOAL_H + 0.3;
      const dz = pr.z - gk.pos.z;
      if (onTarget) {
        const react = [0.32, 0.22, 0.14][m.difficulty] * (tm.human ? 0.85 : 1);
        if (!m.saveRolled && tt < 0.75 && m.ball.lastTouch && m.stateT >= 0) {
          m.saveRolled = true;
          const speed = b.speed;
          const fire = b.fire;
          const reach = Math.abs(dz);
          let chance = (tm.human ? 0.7 : [0.55, 0.72, 0.82][m.difficulty]) * (1 - Math.max(0, speed - 16) / 40) * (reach < 0.9 ? 1.3 : reach < 1.8 ? 1.0 : reach < 2.6 ? 0.68 : 0.3) * (fire ? 0.4 : 1);
          if (pr.y > 1.9) chance *= 0.75;
          if (tt < react) chance *= 0.65;
          const save = Math.random() < chance;
          if (Math.abs(dz) > 0.7 || pr.y < 0.5) {
            const left = new THREE.Vector3(Math.cos(gk.yaw), 0, -Math.sin(gk.yaw));
            const dirSign = dz * left.z > 0 ? 1 : -1;
            gk.ath.play(dirSign > 0 ? 'gk_dive_left' : 'gk_dive_right', 0.05, 1.6);
            gk.vel.set(0, 0, Math.sign(dz) * Math.min(7, Math.abs(dz) / 0.35));
            gk.lying = 'side'; gk.stun = save ? 1.6 : 1.9;
          } else gk.ath.play(pr.y > 1.6 ? 'gk_punch' : 'gk_catch', 0.05);
          if (save) m.pendingSave = { gk, t: Math.max(0.04, tt - 0.06), speed, fire, pr: pr.clone() };
        }
        if (Math.abs(dz) < 0.7) { gk.vel.set(0, 0, Math.sign(dz) * Math.min(5, Math.abs(dz) * 8)); }
        return;
      }
    }
  }
  // saída do gol para bola solta na área
  const inArea = Math.abs(b.pos.x - gx) < 6 && Math.abs(b.pos.z) < 6;
  const attackerClose = tm.opp.field.some((o) => o.pos.distanceTo(b.pos) < 1.4);
  if (!b.owner && inArea && b.speed < 9 && !attackerClose && b.pos.y < 1.5) {
    moveTo(gk, b.pos.clone().setY(0), dt, true);
    return;
  }
  // posição no arco: na linha bola-centro do gol
  const g = new THREE.Vector3(gx, 0, 0);
  const toBall = b.pos.clone().sub(g).setY(0);
  const out = Math.min(1.8, 0.6 + toBall.length() * 0.05);
  const target = g.clone().addScaledVector(toBall.normalize(), out);
  target.x = THREE.MathUtils.clamp(target.x, Math.min(gx, gx - side * 2.4), Math.max(gx, gx - side * 2.4));
  target.z = THREE.MathUtils.clamp(target.z, -FIELD.GOAL_W / 2 + 0.3, FIELD.GOAL_W / 2 - 0.3);
  moveTo(gk, target, dt, false, b.pos.clone().sub(gk.pos));
  void BALL_R;
}
