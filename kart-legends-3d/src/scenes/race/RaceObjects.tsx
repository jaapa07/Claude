import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { RaceSim } from '@/game/racing/raceSim';
import { WIND_RADIUS } from '@/game/items/itemSystem';
import { PHYS } from '@/game/vehicles/kartTuning';
import type { AnimatedPropData } from '@/game/tracks/trackTypes';
import { cloneScene, setShadows, useModels } from '../assets';

export interface RaceView {
  sim: RaceSim;
  /** Fração do passo fixo já decorrida (interpolação). */
  alpha: number;
  time: number;
}

/** Ajusta um modelo para caber em uma caixa (largura, altura, comprimento) com a base no chão. */
function fitToBox(obj: THREE.Object3D, w: number, h: number, l: number): THREE.Group {
  const holder = new THREE.Group();
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x, -box.min.y, -c.z);
  holder.add(obj);
  holder.scale.set(w / (size.x || 1), h / (size.y || 1), l / (size.z || 1));
  return holder;
}

/** Placas de turbo, rampas, pórtico de chegada, caixas de item, itens em ação e obstáculos móveis. */
export function RaceObjects({ view }: { view: React.MutableRefObject<RaceView> }): JSX.Element {
  const sim = view.current.sim;
  const data = sim.track.data;
  const [box, pad, ramp, arch, mist, spark, wave] = useModels([
    'items/item-box.glb', 'items/boost-pad.glb', 'items/ramp.glb', 'items/finish-arch.glb',
    'items/nevoa-prisma.glb', 'items/faisca-rastreadora.glb', 'items/onda-vento.glb',
  ]);
  const obstacleIds = useMemo(() => [...new Set(data.obstacles.map((o) => o.model))], [data]);
  const obstacleModels = useModels(obstacleIds.map((id) => `props/${id}.glb`));

  const built = useMemo(() => {
    const root = new THREE.Group();
    // estáticos
    for (const p of data.boostPads) {
      const o = cloneScene(pad!);
      o.position.set(p.pos[0], p.pos[1] + 0.02, p.pos[2]);
      o.rotation.y = p.heading;
      root.add(o);
    }
    for (const r of data.ramps) {
      const o = fitToBox(cloneScene(ramp!), r.width, r.height, r.length);
      o.position.set(r.pos[0], r.pos[1] - 0.05, r.pos[2]);
      o.rotation.y = r.heading;
      setShadows(o, true, true);
      root.add(o);
    }
    {
      const m = sim.track.main;
      const o = cloneScene(arch!);
      o.position.set(m.pos[0]!, m.pos[1]!, m.pos[2]!);
      o.rotation.y = m.heading[0]!;
      o.scale.setScalar(Math.max(0.8, (m.halfWidth[0]! * 2 + 5) / 20));
      setShadows(o, true, false);
      root.add(o);
    }
    const boxes = sim.items.boxes.map((b) => {
      const o = cloneScene(box!);
      o.position.set(b.x, b.y, b.z);
      root.add(o);
      return o;
    });
    /** Tempo desde que cada caixa reapareceu (para o "pop" de entrada). */
    const boxPop = new Float32Array(boxes.length).fill(9);
    const pool = (src: THREE.Object3D, n: number): THREE.Object3D[] => Array.from({ length: n }, () => {
      const o = src.clone(true);
      o.visible = false;
      root.add(o);
      return o;
    });
    const mists = pool(mist!.scene, 8);
    const sparks = pool(spark!.scene, 8);
    const waves = pool(wave!.scene, 6);
    const obstacles = sim.obstacles.map((o) => {
      const g = new THREE.Group();
      const spin = new THREE.Group();
      const model = cloneScene(obstacleModels[obstacleIds.indexOf(o.data.model)]!);
      setShadows(model, true, false);
      if (o.data.kind === 'roller') { spin.position.y = o.data.radius; model.position.y = -o.data.radius; }
      spin.add(model);
      g.add(spin);
      root.add(g);
      // drones e balsas flutuam; os demais "andam" (gingado no ritmo da distância percorrida)
      const hover = /drone|balao|nave/.test(o.data.model);
      return { g, spin, hover, lean: 0 };
    });
    return { root, boxes, boxPop, mists, sparks, waves, obstacles };
  }, [sim, data, box, pad, ramp, arch, mist, spark, wave, obstacleModels, obstacleIds]);
  useEffect(() => () => { built.root.removeFromParent(); }, [built]);

  useFrame((_, delta) => {
    const { alpha, time } = view.current;
    const dt = Math.min(delta, 0.1);
    sim.items.boxes.forEach((b, i) => {
      const o = built.boxes[i]!;
      if (b.active && !o.visible) built.boxPop[i] = 0;
      o.visible = b.active;
      if (b.active) {
        o.rotation.y = time * 1.6 + i;
        o.position.y = b.y + Math.sin(time * 2.4 + i) * 0.18;
        // reaparece crescendo com um leve passo do ponto (mola criticamente sub-amortecida, analítica)
        const t = (built.boxPop[i]! += dt);
        o.scale.setScalar(t > 1.2 ? 1 : 1 - Math.exp(-7 * t) * Math.cos(9 * t));
      }
    });
    built.mists.forEach((o, i) => {
      const h = sim.items.hazards[i];
      o.visible = !!h;
      if (h) { o.position.set(h.x, h.y, h.z); o.rotation.y = time * 0.5; const s = Math.min(1, h.life) * (1 + Math.sin(time * 3 + i) * 0.05); o.scale.setScalar(s); }
    });
    built.sparks.forEach((o, i) => {
      const p = sim.items.projectiles[i];
      o.visible = !!p;
      if (p) {
        const x = p.px + (p.x - p.px) * alpha, y = p.py + (p.y - p.py) * alpha, z = p.pz + (p.z - p.pz) * alpha;
        o.position.set(x, y, z);
        o.rotation.set(0, Math.atan2(p.x - p.px, p.z - p.pz), time * 14);
      }
    });
    built.waves.forEach((o, i) => {
      const w = sim.items.waves[i];
      o.visible = !!w;
      if (w) { o.position.set(w.x, w.y - 0.4, w.z); o.scale.setScalar(1 + (w.age / 0.6) * WIND_RADIUS); o.rotation.y = time * 6; }
    });
    sim.obstacles.forEach((o, i) => {
      const v = built.obstacles[i]!;
      const x = o.px + (o.x - o.px) * alpha, y = o.py + (o.y - o.py) * alpha, z = o.pz + (o.z - o.pz) * alpha;
      const d = o.data;
      const ax = d.b[0] - d.a[0], az = d.b[2] - d.a[2];
      const len = Math.hypot(ax, az) || 1;
      if (d.kind === 'pendulum') {
        // a cabeça descreve um arco; a haste aponta para o pivô acima do centro do percurso
        const off = (o.t - 0.5) * len;
        const pivot = 7.5;
        const ang = Math.asin(Math.max(-0.95, Math.min(0.95, off / pivot)));
        v.g.position.set(x, y + (1 - Math.cos(ang)) * pivot, z);
        v.g.rotation.set(0, Math.atan2(ax, az) + Math.PI / 2, 0);
        v.spin.rotation.z = ang;
      } else if (d.kind === 'roller') {
        v.g.position.set(x, y - d.radius, z);
        v.g.rotation.set(0, Math.atan2(ax, az), 0);
        v.spin.rotation.x = (o.t * len) / d.radius;
      } else {
        // deslizante: inclina na direção do movimento (proporcional à velocidade), gingando ou flutuando
        const vMax = (Math.PI * len) / d.period * PHYS.dt;
        const along = ((o.x - o.px) * ax + (o.z - o.pz) * az) / len;
        const wantLean = THREE.MathUtils.clamp(along / (vMax || 1), -1, 1) * (v.hover ? 0.22 : 0.1);
        v.lean += (wantLean - v.lean) * (1 - Math.exp(-8 * dt));
        const travel = o.t * len;
        const bob = v.hover ? Math.sin(time * 2.2 + i * 1.3) * 0.18 : Math.abs(Math.sin(travel * 1.6)) * 0.07;
        v.g.position.set(x, y + bob, z);
        v.g.rotation.set(0, Math.atan2(ax, az), 0);
        v.spin.rotation.x = v.lean;
        v.spin.rotation.z = v.hover ? Math.sin(time * 1.7 + i) * 0.05 : Math.sin(travel * 0.8) * 0.04;
      }
    });
  });

  return <primitive object={built.root} />;
}

/**
 * Movimento de uma peça do cenário. Cada instância tem fase e período levemente diferentes (nada se
 * move em uníssono); o balanço tem um segundo harmônico e rajadas lentas de vento; o que flutua também
 * gira e oscila um pouco.
 */
function motionOf(m: AnimatedPropData['motion'], inner: THREE.Object3D, time: number, phase: number, rate: number): void {
  const x = (time / m.period) * rate * Math.PI * 2 + phase;
  if (m.kind === 'spin') inner.rotation[m.axis] = x;
  else if (m.kind === 'sway') {
    const gust = 0.82 + 0.18 * Math.sin(time * 0.41 + phase * 0.7);
    inner.rotation[m.axis] = (Math.sin(x) * 0.85 + Math.sin(x * 2.03 + phase) * 0.15) * m.angle * gust;
  } else {
    inner.position.y = Math.sin(x) * m.height;
    inner.rotation.y = time * 0.06 * rate + phase;
    inner.rotation.z = Math.cos(x) * 0.035;
  }
}

/** Partes móveis do cenário (pás de moinho, bandeiras, plantas, hologramas), animadas em tempo real. */
export function AnimatedProps({ list, view }: { list: AnimatedPropData[]; view: React.MutableRefObject<RaceView> }): JSX.Element {
  const ids = useMemo(() => [...new Set(list.map((p) => p.model))], [list]);
  const models = useModels(ids.map((id) => `props/${id}.glb`));
  const built = useMemo(() => {
    const root = new THREE.Group();
    const items = list.map((p, i) => {
      const g = new THREE.Group();
      g.position.set(p.pos[0], p.pos[1], p.pos[2]);
      g.rotation.y = p.rotY;
      g.scale.setScalar(p.scale);
      const inner = models[ids.indexOf(p.model)]!.scene.clone(true);
      setShadows(inner, true, false);
      g.add(inner);
      root.add(g);
      // período ±8% por instância (determinístico)
      return { inner, motion: p.motion, phase: i * 1.7, rate: 1 + (((i * 0.618034) % 1) - 0.5) * 0.16 };
    });
    return { root, items };
  }, [list, models, ids]);
  useEffect(() => () => { built.root.removeFromParent(); }, [built]);
  useFrame(() => {
    const t = view.current.time;
    for (const it of built.items) motionOf(it.motion, it.inner, t, it.phase, it.rate);
  });
  return <primitive object={built.root} />;
}
