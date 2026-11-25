import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { CHARACTER_BY_ID } from '@/data/characters';
import type { BattleSim } from '@/game/battle/battleSim';
import { WIND_RADIUS } from '@/game/items/itemSystem';
import type { KartModel } from '@/game/vehicles/kartModel';
import { PHYS } from '@/game/vehicles/kartTuning';
import { cloneScene, setShadows, useModels } from '../assets';

export interface BattleView {
  sim: BattleSim;
  alpha: number;
  time: number;
}

const MAX_CRYSTALS = 64;
const BALLOON_SLOTS = 5;

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

/** Coroa dourada (geometria própria, leve). */
function makeCrown(): THREE.Group {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: '#ffd04a', metalness: 0.85, roughness: 0.25, emissive: '#7a4a00', emissiveIntensity: 0.6 });
  const gem = new THREE.MeshStandardMaterial({ color: '#ff3d6e', emissive: '#ff2050', emissiveIntensity: 1.6, roughness: 0.2 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.55, 0.42, 20, 1, true), gold);
  band.material.side = THREE.DoubleSide;
  g.add(band);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.45, 6), gold);
    spike.position.set(Math.cos(a) * 0.6, 0.42, Math.sin(a) * 0.6);
    g.add(spike);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), gold);
    ball.position.set(Math.cos(a) * 0.6, 0.66, Math.sin(a) * 0.6);
    g.add(ball);
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), gem);
    jewel.position.set(Math.cos(a + 0.52) * 0.6, 0, Math.sin(a + 0.52) * 0.6);
    g.add(jewel);
  }
  return g;
}

/**
 * Objetos da arena e da batalha: rampas, placas de turbo, caixas de item, itens em ação (névoas, faíscas, ondas),
 * balões presos nos karts, cristais (instanciados) e a coroa com o facho de luz.
 */
export function BattleObjects({ view, models }: { view: React.MutableRefObject<BattleView>; models: KartModel[] }): JSX.Element {
  const sim = view.current.sim;
  const arena = sim.arena;
  const [box, pad, ramp, mist, spark, wave] = useModels([
    'items/item-box.glb', 'items/boost-pad.glb', 'items/ramp.glb', 'items/nevoa-prisma.glb', 'items/faisca-rastreadora.glb', 'items/onda-vento.glb',
  ]);

  const built = useMemo(() => {
    const root = new THREE.Group();
    const disposables: { dispose: () => void }[] = [];
    for (const p of arena.boostPads) {
      const o = cloneScene(pad!);
      o.position.set(p.pos[0], p.pos[1] + 0.02, p.pos[2]);
      o.rotation.y = p.heading;
      root.add(o);
    }
    for (const r of arena.ramps) {
      const o = fitToBox(cloneScene(ramp!), r.width, r.height, r.length);
      o.position.set(r.pos[0], r.pos[1] - 0.05, r.pos[2]);
      o.rotation.y = r.heading;
      setShadows(o, true, true);
      root.add(o);
    }
    const boxes = sim.items.boxes.map((b) => {
      const o = cloneScene(box!);
      o.position.set(b.x, b.y, b.z);
      root.add(o);
      return o;
    });
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

    // balões: cinco por kart (só os que o piloto tem ficam visíveis), presos atrás do banco por fios
    const balloonGeo = new THREE.SphereGeometry(0.34, 16, 12);
    balloonGeo.scale(1, 1.18, 1);
    const knotGeo = new THREE.ConeGeometry(0.08, 0.14, 8);
    const stringMat = new THREE.LineBasicMaterial({ color: '#f4f0ff', transparent: true, opacity: 0.85 });
    disposables.push(balloonGeo, knotGeo, stringMat);
    const balloons = sim.karts.map((k, i) => {
      const color = new THREE.Color(CHARACTER_BY_ID[k.characterId].color);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.05, emissive: color, emissiveIntensity: 0.18 });
      disposables.push(mat);
      const holder = new THREE.Group();
      const slots = Array.from({ length: BALLOON_SLOTS }, (_, s) => {
        const g = new THREE.Group();
        const ball = new THREE.Mesh(balloonGeo, mat);
        ball.castShadow = true;
        const knot = new THREE.Mesh(knotGeo, mat);
        knot.position.y = -0.52;
        knot.rotation.x = Math.PI;
        const pts = [new THREE.Vector3(0, -0.58, 0), new THREE.Vector3(0, -1.5, 0)];
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), stringMat);
        disposables.push(line.geometry);
        g.add(ball, knot, line);
        // em leque atrás do kart
        const spread = (s - (BALLOON_SLOTS - 1) / 2) * 0.55;
        g.position.set(spread * 0.85, 1.95 - Math.abs(spread) * 0.2 + (s % 2) * 0.2, -1.05 - Math.abs(spread) * 0.15);
        g.userData.base = g.position.clone();
        holder.add(g);
        return g;
      });
      holder.visible = sim.game === 'estoura-balao';
      models[i]!.group.add(holder);
      return { holder, slots };
    });

    // cristais (instanciados: uma chamada de desenho)
    const crystalGeo = new THREE.OctahedronGeometry(0.8, 0);
    crystalGeo.scale(0.8, 1.3, 0.8);
    const crystalMat = new THREE.MeshStandardMaterial({ color: '#7ff3ff', emissive: '#22c8e8', emissiveIntensity: 2.2, roughness: 0.15, metalness: 0.2, flatShading: true });
    const crystals = new THREE.InstancedMesh(crystalGeo, crystalMat, MAX_CRYSTALS);
    crystals.count = 0;
    crystals.frustumCulled = false;
    root.add(crystals);
    disposables.push(crystalGeo, crystalMat);

    // coroa + facho de luz quando está livre
    const crown = makeCrown();
    crown.visible = false;
    root.add(crown);
    const beamMat = new THREE.MeshBasicMaterial({ color: '#ffd04a', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.4, 30, 16, 1, true), beamMat);
    beam.visible = false;
    root.add(beam);
    disposables.push(beamMat, beam.geometry);
    crown.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { disposables.push(m.geometry); disposables.push(m.material as THREE.Material); } });
    return { root, boxes, boxPop, mists, sparks, waves, balloons, crystals, crown, beam, disposables };
  }, [sim, arena, box, pad, ramp, mist, spark, wave, models]);
  useEffect(() => () => {
    built.root.removeFromParent();
    for (const b of built.balloons) b.holder.removeFromParent();
    for (const d of built.disposables) d.dispose();
  }, [built]);

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1) }), []);

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
        const t = (built.boxPop[i]! += dt);
        o.scale.setScalar(t > 1.2 ? 1 : 1 - Math.exp(-7 * t) * Math.cos(9 * t));
      }
    });
    built.mists.forEach((o, i) => {
      const h = sim.items.hazards[i];
      o.visible = !!h;
      if (h) { o.position.set(h.x, h.y, h.z); o.rotation.y = time * 0.5; o.scale.setScalar(Math.min(1, h.life) * (1 + Math.sin(time * 3 + i) * 0.05)); }
    });
    built.sparks.forEach((o, i) => {
      const p = sim.items.projectiles[i];
      o.visible = !!p;
      if (p) {
        o.position.set(p.px + (p.x - p.px) * alpha, p.py + (p.y - p.py) * alpha, p.pz + (p.z - p.pz) * alpha);
        o.rotation.set(0, Math.atan2(p.x - p.px, p.z - p.pz), time * 14);
      }
    });
    built.waves.forEach((o, i) => {
      const w = sim.items.waves[i];
      o.visible = !!w;
      if (w) { o.position.set(w.x, w.y - 0.4, w.z); o.scale.setScalar(1 + (w.age / 0.6) * WIND_RADIUS); o.rotation.y = time * 6; }
    });

    // balões
    if (sim.game === 'estoura-balao') {
      sim.karts.forEach((k, i) => {
        const b = built.balloons[i]!;
        const n = sim.battlers[i]!.balloons;
        const out = sim.battlers[i]!.out;
        b.holder.visible = !out;
        b.slots.forEach((g, s) => {
          // mostra os balões a partir do centro do leque
          const order = [2, 1, 3, 0, 4][s]!;
          g.visible = order < n;
          const base = g.userData.base as THREE.Vector3;
          const sway = Math.sin(time * 2.1 + i + s * 1.3);
          g.position.set(base.x + sway * 0.06, base.y + Math.sin(time * 2.6 + s) * 0.06, base.z - Math.min(0.5, Math.abs(k.speed) * 0.02));
          g.rotation.set(-0.25 - Math.min(0.5, Math.abs(k.speed) * 0.016), 0, sway * 0.12);
        });
      });
    }

    // cristais (voo do cristal derrubado: arco até o chão)
    let n = 0;
    for (const c of sim.crystals) {
      if (n >= MAX_CRYSTALS) break;
      let x = c.x, y = c.y, z = c.z;
      if (c.fly > 0 && c.flyTotal > 0) {
        const t = 1 - c.fly / c.flyTotal;
        x = c.fx + (c.x - c.fx) * t; z = c.fz + (c.z - c.fz) * t;
        y = c.fy + (c.y - c.fy) * t + Math.sin(t * Math.PI) * 2.2;
      } else y += Math.sin(time * 2.2 + c.id) * 0.18;
      tmp.p.set(x, y, z);
      tmp.q.setFromEuler(tmp.e.set(0, time * 1.8 + c.id, 0));
      tmp.s.setScalar(c.lock > 0 && c.fly <= 0 ? 0.8 : 1);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      built.crystals.setMatrixAt(n++, tmp.m);
    }
    built.crystals.count = n;
    built.crystals.instanceMatrix.needsUpdate = true;

    // coroa
    const c = sim.crown;
    built.crown.visible = sim.game === 'rei-da-coroa' && c.active;
    built.beam.visible = built.crown.visible && c.holder < 0;
    if (built.crown.visible) {
      if (c.holder >= 0) {
        const k = sim.karts[c.holder]!;
        built.crown.position.set(k.px + (k.x - k.px) * alpha, k.py + (k.y - k.py) * alpha - PHYS.rideHeight + 2.35 + Math.sin(time * 4) * 0.06, k.pz + (k.z - k.pz) * alpha);
        built.crown.scale.setScalar(0.62);
      } else {
        built.crown.position.set(c.x, c.y + Math.sin(time * 2.5) * 0.25, c.z);
        built.crown.scale.setScalar(1.25);
        built.beam.position.set(c.x, c.y + 14, c.z);
      }
      built.crown.rotation.y = time * 1.7;
    }
  });

  return <primitive object={built.root} />;
}
