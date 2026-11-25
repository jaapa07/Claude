import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Physics, useRapier } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import { suspend } from 'suspend-react';
import * as THREE from 'three';
import { useGameStore } from '@/app/gameStore';
import { useSettingsStore } from '@/app/settingsStore';
import { ARENA_BY_ID, type ArenaId } from '@/data/battle';
import { CHARACTER_BY_ID } from '@/data/characters';
import { ITEM_BY_ID } from '@/data/items';
import { audio } from '@/game/audio/audioManager';
import type { ArenaData } from '@/game/battle/arenaTypes';
import { useBattleHudStore } from '@/game/battle/battleHudStore';
import { BattleSim, type BattleConfig, type BattleEvent } from '@/game/battle/battleSim';
import { ChaseCamera } from '@/game/camera/chaseCamera';
import { assetUrl } from '@/game/core/assets';
import { EMPTY_HUD, useHudStore } from '@/game/core/hudStore';
import { dressPlayer, kartLookOf, useCustomStore } from '@/game/custom/customStore';
import { inputManager } from '@/game/input/inputManager';
import type { Rapier } from '@/game/physics/trackColliders';
import { ENVIRONMENTS, type Environment } from '@/game/tracks/environments';
import { KartModel, type KartVisualState } from '@/game/vehicles/kartModel';
import type { KartState } from '@/game/vehicles/kartState';
import { PHYS } from '@/game/vehicles/kartTuning';
import { RaceVfx, type KartFx } from '@/game/vfx/raceVfx';
import { useModel, useModels, useParticleAtlas } from '../assets';
import { SkyAndLights, type SkyHandle } from '../common/SkyAndLights';
import { TireFitting } from '../common/TireFitting';
import { QUALITY } from '../quality';
import { AnimatedProps, type RaceView } from '../race/RaceObjects';
import { BattleObjects, type BattleView } from './BattleObjects';

const ITEM_SFX: Record<string, Parameters<typeof audio.sfx>[0]> = {
  'pulso-solar': 'item_pulso', 'bolha-guardia': 'item_bolha', 'nevoa-prisma': 'item_nevoa',
  'faisca-rastreadora': 'item_faisca', 'onda-vento': 'item_onda', 'cristal-salto': 'item_cristal',
};

/** Céu, luz e clima das arenas (somente renderização). */
export const ARENA_ENVIRONMENTS: Record<ArenaId, Environment> = {
  'praca-coreto': {
    ...ENVIRONMENTS['vale-moinhos'], skyTop: '#3a86e0', skyHorizon: '#ffd9a8', skyBottom: '#fff1dc', sunDir: [0.45, 0.62, 0.55], sunColor: '#ffe6c0',
    sunIntensity: 2.8, ambientSky: '#d8e8ff', ambientGround: '#8a7458', fogColor: '#f2dcc0', fogNear: 120, fogFar: 520, clouds: 0.6, weather: 'leaves', bloom: 0.35,
    dust: '#c9b08a',
  },
  'cratera-lunar': { ...ENVIRONMENTS['estacao-lunar'], fogNear: 140, fogFar: 640 },
};

const arenaCache = new Map<ArenaId, Promise<ArenaData>>();
function loadArena(id: ArenaId): Promise<ArenaData> {
  let p = arenaCache.get(id);
  if (!p) {
    p = fetch(assetUrl(`arenas/${id}.json`)).then((r) => {
      if (!r.ok) throw new Error(`Dados da arena ausentes: ${id} (${r.status})`);
      return r.json() as Promise<ArenaData>;
    });
    arenaCache.set(id, p);
  }
  return p;
}

const lerpAngle = (a: number, b: number, t: number): number => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/** Última arena carregada: ao trocar, a anterior sai da memória (celular). */
let loadedArena: ArenaId | null = null;

function ArenaModel({ id, shadows }: { id: ArenaId; shadows: boolean }): JSX.Element {
  const gltf = useModel(`arenas/${id}.glb`);
  useEffect(() => {
    if (loadedArena && loadedArena !== id) useGLTF.clear(assetUrl(`arenas/${loadedArena}.glb`));
    loadedArena = id;
  }, [id]);
  const water = useMemo(() => {
    const list: THREE.Texture[] = [];
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      m.receiveShadow = true;
      m.castShadow = shadows && o.name !== 'arena_floor' && !mat.transparent;
      mat.envMapIntensity = 0.7;
      if ((mat.name === 'water_fall' || mat.name === 'ecl_agua') && mat.map && !list.includes(mat.map)) {
        mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
        list.push(mat.map);
      }
    });
    return list;
  }, [gltf, shadows]);
  useFrame((_, dt) => { for (const t of water) t.offset.y = (t.offset.y - Math.min(dt, 0.1) * 0.6) % 1; });
  return <primitive object={gltf.scene} />;
}

export function BattleScene({ config }: { config: BattleConfig }): JSX.Element {
  const data = suspend(() => loadArena(config.arenaId), ['arena-data', config.arenaId]);
  return (
    <Physics paused gravity={[0, 0, 0]} timeStep={PHYS.dt} colliders={false}>
      <BattleWorld data={data} config={config} />
    </Physics>
  );
}

function BattleWorld({ data, config }: { data: ArenaData; config: BattleConfig }): JSX.Element {
  const { world, rapier } = useRapier();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const quality = QUALITY[useSettingsStore((s) => s.quality)];
  const env = ARENA_ENVIRONMENTS[config.arenaId];
  const meta = ARENA_BY_ID[config.arenaId];
  const atlas = useParticleAtlas();
  const kartGltfs = useModels(config.racers.map((r) => `karts/${r.kartId}.glb`));
  const charGltfs = useModels(config.racers.map((r) => `characters/${r.characterId}.glb`));
  const shieldGltf = useModel('items/bolha-guardia.glb');

  const simRef = useRef<BattleSim | null>(null);
  if (!simRef.current) {
    simRef.current = new BattleSim(rapier as unknown as Rapier, world, data, config, { playerInput: () => inputManager.read() });
  }
  const sim = simRef.current;
  const view = useRef<BattleView>({ sim, alpha: 0, time: 0 });

  const models = useMemo(() => sim.karts.map((_, i) => {
    const model = new KartModel(kartGltfs[i]!, charGltfs[i]!, shieldGltf);
    const r = config.racers[i]!;
    const customPaint = r.isPlayer && dressPlayer(model, r.characterId, r.kartId);
    const same = config.racers.filter((o) => o.kartId === r.kartId);
    const keeper = same.find((o) => CHARACTER_BY_ID[o.characterId].kartId === r.kartId) ?? same[0]!;
    if (same.length > 1 && keeper !== r && !customPaint) model.repaint(CHARACTER_BY_ID[r.characterId].color);
    return model;
  }), [sim, kartGltfs, charGltfs, shieldGltf, config.racers]);
  const vfx = useMemo(() => new RaceVfx(atlas, env, quality.particles), [atlas, env, quality.particles]);
  const cam = useMemo(() => new ChaseCamera(camera, rapier as unknown as Rapier, world, data.introCamera, quality.shake), [camera, rapier, world, data, quality.shake]);
  const sky = useRef<SkyHandle>({ flash: 0 });
  const focus = useRef(new THREE.Vector3());

  const state = useRef({
    acc: 0, intro: 0, endTimer: 0, reported: false, hudTick: 0,
    normals: sim.karts.map(() => new THREE.Vector3(0, 1, 0)),
    spinStart: sim.karts.map(() => 0),
    /** Tempo desde a eliminação (o kart some depois do "puf"). */
    gone: sim.karts.map(() => -1),
    vis: sim.karts.map((): KartVisualState => ({
      speed: 0, steer: 0, drifting: false, driftDir: 0, driftLevel: 0, boost: 0, spin: 0, grounded: true, shield: false, invulnerable: false, hop: 0, mood: 'idle',
    })),
    tmpA: new THREE.Vector3(), tmpB: new THREE.Vector3(), basis: new THREE.Matrix4(),
    fx: sim.karts.map((): KartFx => ({
      x: 0, y: 0, z: 0, wheelL: new THREE.Vector3(), wheelR: new THREE.Vector3(), exhausts: [new THREE.Vector3(), new THREE.Vector3()], heading: 0, speed: 0,
      drifting: false, driftLevel: 0, boost: 0, boostKind: 0, grounded: true, onRoad: true, surface: 0, braking: false, spinning: false,
    })),
    color: new THREE.Color(),
  });

  const publishHud = (): void => {
    const p = sim.player ?? sim.karts[0]!;
    const h = sim.hud();
    useBattleHudStore.getState().setHud(h);
    useHudStore.getState().setHud({ ...EMPTY_HUD, phase: sim.phase, countdown: h.countdown, item: p.item, itemRolling: p.itemRoll > 0, shield: p.shield > 0, totalRacers: sim.karts.length });
  };

  useEffect(() => {
    useBattleHudStore.getState().setArena(data);
    useBattleHudStore.getState().setFast(false);
    publishHud();
    audio.playAmbience(meta.ambience);
    audio.playMusic(null, { fadeMs: 600 });
    const query = new URLSearchParams(window.location.search);
    if (query.has('fast')) state.current.intro = 999;
    const w = window as unknown as { __kl3d?: unknown };
    if (query.has('e2e')) {
      w.__kl3d = {
        snapshot: () => {
          const p = sim.player ?? sim.karts[0]!;
          const b = sim.battlers[p.index]!;
          return {
            phase: sim.phase, raceTime: sim.matchTime, racers: sim.karts.length, lap: 0, position: p.position, speed: p.speed, heading: p.heading,
            x: p.x, z: p.z, drifting: p.drifting, driftLevel: p.driftLevel, boost: p.boostTime, item: p.item, grounded: p.grounded, progress: 0,
            finished: sim.battlers.filter((q) => q.out).length, aiMoving: sim.karts.filter((k) => !k.isPlayer && Math.abs(k.speed) > 3).length,
            battle: { game: sim.game, score: sim.scoreOf(p.index), timeLeft: sim.timeLeft, out: b.out, balloons: b.balloons, crystals: b.crystals, crown: sim.crown.holder },
          };
        },
        fastForward: (seconds: number) => {
          const steps = Math.round(seconds / PHYS.dt);
          for (let i = 0; i < steps; i++) { sim.step(); sim.drainEvents(); }
          publishHud();
        },
        setAutopilot: (on: boolean) => { if (sim.player) sim.player.ai = on; },
        giveItem: (item: KartState['item']) => { if (sim.player) sim.giveItem(sim.player.index, item); },
        sim,
      };
    }
    return () => {
      delete w.__kl3d;
      audio.stopAllRaceSounds();
      useHudStore.getState().reset();
      useBattleHudStore.getState().reset();
      for (const m of models) m.dispose();
      vfx.dispose();
    };
  }, [sim, models, vfx, meta, data]);

  const handleEvent = (e: BattleEvent): void => {
    const player = sim.player;
    const st = state.current;
    const k: KartState | undefined = 'kart' in e ? sim.karts[e.kart] : undefined;
    const mine = !!k && k === player;
    const ref = sim.karts[sim.focusIndex()]!;
    let vol = 1;
    if (k && !mine) vol = Math.max(0, 1 - Math.hypot(k.x - ref.x, k.z - ref.z) / 60) * 0.7;
    const sfx = (id: Parameters<typeof audio.sfx>[0], v = 1, rate = 1): void => { if (vol * v > 0.03) audio.sfx(id, { volume: vol * v, rate }); };
    switch (e.type) {
      case 'countdown': audio.sfx('countdown_beep'); break;
      case 'go': audio.sfx('countdown_go'); audio.playMusic(meta.music, { fadeMs: 300 }); audio.engine.start(); break;
      case 'drift_level': if (mine) audio.sfx('ui_move', { volume: 0.9, rate: 0.8 + e.level * 0.25 }); break;
      case 'turbo': sfx(`turbo_${Math.min(3, e.level)}` as 'turbo_1'); if (k) vfx.turbo(k.x, k.y - PHYS.rideHeight, k.z, e.level); if (mine) { cam.addShake(0.08 + e.level * 0.04); cam.kick(2.5 + e.level * 1.5); } break;
      case 'boost_pad': sfx('boost_pad'); if (k) vfx.turbo(k.x, k.y - PHYS.rideHeight, k.z, 2); if (mine) { cam.addShake(0.1); cam.kick(5); } break;
      case 'jump': sfx('jump'); break;
      case 'land': sfx('land', Math.min(1, 0.4 + e.impact / 14)); if (k) vfx.landing(k.x, k.y - PHYS.rideHeight, k.z, e.impact); if (mine) cam.landing(e.impact); break;
      case 'collision':
        sfx(e.strength > 9 ? 'collision_heavy' : 'collision', Math.min(1, 0.35 + e.strength / 16));
        vfx.impact(e.x, e.y - 0.2, e.z, e.strength);
        if (mine) cam.addShake(Math.min(0.4, e.strength / 30));
        break;
      case 'hit':
        sfx('spinout');
        if (k) { vfx.burst(k.x, k.y - 0.4, k.z, 1, 0.5, 0.25); models[k.index]!.triggerHit(); st.spinStart[k.index] = k.spinTime; }
        if (mine) cam.addShake(0.45);
        break;
      case 'shield_break': sfx('shield_break'); if (k) vfx.sparkle(k.x, k.y, k.z, st.color.set('#4fd8e8'), 22); break;
      case 'pushed': if (k) { vfx.sparkle(k.x, k.y, k.z, st.color.set('#9cf0c3'), 10); models[k.index]!.triggerHit(); } break;
      case 'item_pickup': if (mine) { audio.sfx('item_pickup'); audio.sfx('item_roll', { volume: 0.8 }); } if (k) vfx.sparkle(k.x, k.y + 0.4, k.z, st.color.set('#ffe66b')); break;
      case 'item_use': { const id = ITEM_SFX[e.item]; if (id) sfx(id); vfx.sparkle(e.x, e.y + 0.3, e.z, st.color.set(ITEM_BY_ID[e.item]?.color ?? '#ffffff'), 18); break; }
      case 'respawn': sfx('respawn', 0.8); break;
      // ---- batalha ----
      case 'balloon_pop': {
        sfx('shield_break', 1, 1.45);
        const c = st.color.set(CHARACTER_BY_ID[sim.karts[e.kart]!.characterId].color);
        vfx.sparkle(e.x, e.y + 1.6, e.z, c, 26);
        vfx.burst(e.x, e.y + 1.6, e.z, c.r, c.g, c.b);
        if (mine) cam.addShake(0.3);
        break;
      }
      case 'balloon_steal': if (mine) audio.sfx('item_pickup', { rate: 1.3 }); if (k) vfx.sparkle(k.x, k.y + 2, k.z, st.color.set('#ff4f7b'), 14); break;
      case 'eliminated':
        sfx('collision_heavy', 1, 0.8);
        vfx.confetti(e.x, e.y, e.z, 60);
        vfx.burst(e.x, e.y, e.z, 1, 0.9, 0.6);
        st.gone[e.kart] = 0;
        break;
      case 'crystal_pickup': sfx('item_pickup', 0.8, 1.55); if (k) vfx.sparkle(e.x, e.y, e.z, st.color.set('#7ff3ff'), 10); break;
      case 'crystal_drop': sfx('shield_break', 0.9, 1.1); vfx.sparkle(e.x, e.y + 0.5, e.z, st.color.set('#7ff3ff'), 30); break;
      case 'crown_take': sfx(mine ? 'final_lap' : 'lap', mine ? 1 : 0.8); if (k) vfx.sparkle(k.x, k.y + 2.2, k.z, st.color.set('#ffd04a'), 30); if (mine) cam.addShake(0.2); break;
      case 'crown_drop': sfx('shield_break', 0.8, 0.9); vfx.sparkle(e.x, e.y + 1, e.z, st.color.set('#ffd04a'), 20); break;
      case 'frenzy': audio.sfx('final_lap'); break;
      case 'match_end': audio.sfx('finish'); { const f = sim.karts[sim.order()[0]!]!; vfx.confetti(f.x, f.y, f.z, 160); } break;
      default: break;
    }
  };

  useFrame((frame, delta) => {
    const st = state.current;
    const game = useGameStore.getState();
    const paused = game.paused;
    const dt = Math.min(delta, 0.1);
    const fast = useBattleHudStore.getState().fast;

    if (!paused) {
      if (sim.phase === 'intro') {
        st.intro += dt;
        const inp = inputManager.read();
        if (st.intro > cam.introDuration || (st.intro > 0.6 && (inp.throttle > 0.5 || inp.item))) { sim.startCountdown(); cam.setMode('countdown'); }
      }
      // espectador: pode acelerar a partida (mesmos passos fixos, mais por quadro)
      st.acc += dt * (fast && sim.phase === 'racing' ? 8 : 1);
      let steps = 0;
      const cap = fast ? 48 : 5;
      while (st.acc >= PHYS.dt && steps < cap) {
        sim.step();
        st.acc -= PHYS.dt;
        steps++;
        for (const e of sim.drainEvents()) handleEvent(e);
      }
      if (steps === cap) st.acc = 0;
      view.current.time += dt;
      if (sim.phase === 'racing' && cam.mode !== 'chase') cam.setMode('chase');
      if (sim.phase === 'finished') {
        if (cam.mode !== 'finish') cam.setMode('finish');
        st.endTimer += dt;
        if (st.endTimer > 4 && !st.reported) { st.reported = true; game.finishBattle(sim.result()); }
      }
    }
    const alpha = st.acc / PHYS.dt;
    view.current.alpha = alpha;

    const camPos = camera.position;
    sim.karts.forEach((k, i) => {
      const m = models[i]!;
      if (st.gone[i]! >= 0) {
        st.gone[i]! += dt;
        m.group.scale.setScalar(Math.max(0.001, 1 - st.gone[i]! * 3));
        if (st.gone[i]! > 0.35) { m.group.visible = false; return; }
      }
      if (sim.battlers[i]!.out && st.gone[i]! < 0) { m.group.visible = false; return; }
      const x = k.px + (k.x - k.px) * alpha, y = k.py + (k.y - k.py) * alpha - PHYS.rideHeight, z = k.pz + (k.z - k.pz) * alpha;
      const heading = lerpAngle(k.pHeading, k.heading, alpha);
      const n = st.normals[i]!;
      n.lerp(st.tmpA.set(k.nx, k.ny, k.nz), 1 - Math.exp(-10 * dt)).normalize();
      const f = st.tmpA.set(Math.sin(heading), 0, Math.cos(heading));
      f.addScaledVector(n, -f.dot(n)).normalize();
      const left = st.tmpB.crossVectors(n, f);
      st.basis.makeBasis(left, n, f);
      m.group.quaternion.setFromRotationMatrix(st.basis);
      if (!sim.battlers[i]!.out) m.group.position.set(x, y, z);
      const far = (x - camPos.x) ** 2 + (z - camPos.z) ** 2 > 170 * 170;
      m.group.visible = !far;
      if (far || paused) return;
      m.detail = (x - camPos.x) ** 2 + (z - camPos.z) ** 2 < quality.animDetail * quality.animDetail ? 1 : 0;
      const v = st.vis[i]!;
      const spinTotal = st.spinStart[i]!;
      v.speed = k.speed; v.steer = k.steer; v.drifting = k.drifting; v.driftDir = k.driftDir; v.driftLevel = k.boostTime > 0 ? k.boostKind : k.driftLevel;
      v.boost = k.boostTime > 0 ? Math.min(1, k.boostTime / k.boostTotal) : 0;
      v.spin = k.spinTime > 0 && spinTotal > 0 ? 1 - k.spinTime / spinTotal : 0;
      v.grounded = k.grounded; v.shield = k.shield > 0; v.invulnerable = k.invuln > 0 && k.spinTime <= 0; v.hop = k.hopTime / 0.22;
      v.mood = sim.phase === 'finished' ? (k.position === 1 ? 'victory' : 'defeat') : sim.phase === 'racing' ? 'race' : 'idle';
      m.update(dt, v);
      if ((x - camPos.x) ** 2 + (z - camPos.z) ** 2 < 90 * 90) {
        const fx = st.fx[i]!;
        fx.x = x; fx.y = y; fx.z = z; fx.heading = heading; fx.speed = k.speed; fx.drifting = k.drifting; fx.driftLevel = k.driftLevel;
        fx.boost = k.boostTime > 0 ? 1 : 0; fx.boostKind = k.boostKind; fx.grounded = k.grounded; fx.onRoad = true; fx.surface = 0;
        fx.braking = k.input.brake > 0.5 && k.speed > 10; fx.spinning = k.spinTime > 0;
        m.rearWheelWorld(0, fx.wheelL); m.rearWheelWorld(1, fx.wheelR);
        m.exhausts.forEach((ex, j) => ex.getWorldPosition(fx.exhausts[j]!));
        fx.exhausts.length = m.exhausts.length;
        vfx.kart(i, fx, dt);
      }
    });

    if (!paused) {
      for (const h of sim.items.hazards) vfx.mist(h.x, h.y, h.z, h.radius, dt);
      for (const p of sim.items.projectiles) vfx.trail(p.x, p.y, p.z, dt);
    }

    // câmera: o jogador, ou o líder ainda na arena depois de eliminado
    const target = sim.karts[sim.focusIndex()]!;
    const px = target.px + (target.x - target.px) * alpha, py = target.py + (target.y - target.py) * alpha - PHYS.rideHeight, pz = target.pz + (target.z - target.pz) * alpha;
    focus.current.set(px, py, pz);
    if (!paused) {
      const boostK = target.boostTime > 0 ? Math.min(1, target.boostTime / 0.5) : 0;
      cam.update(dt, {
        x: px, y: py, z: pz, heading: lerpAngle(target.pHeading, target.heading, alpha), speed: target.speed, steer: target.steer,
        drifting: target.drifting, driftDir: target.driftDir, boost: boostK, grounded: target.grounded,
      });
      const fwd = st.tmpA.set(0, 0, -1).applyQuaternion(camera.quaternion);
      vfx.weather(env.weather, camera.position, fwd, dt, quality.weather);
      vfx.update(dt, frame.size.height, camera.fov);
      const player = sim.player;
      if (player && !sim.battlers[player.index]!.out && (sim.phase === 'racing' || sim.phase === 'finished')) {
        const top = player.tuning.topSpeed;
        audio.engine.update({ speed: Math.abs(player.speed) / top, throttle: player.input.throttle, boosting: player.boostTime > 0, airborne: !player.grounded });
        audio.setLoop('drift', player.drifting && player.grounded ? 0.8 : 0);
        audio.setLoop('drift_sparks', player.drifting && player.driftLevel > 0 && player.grounded ? 0.5 + player.driftLevel * 0.15 : 0);
        audio.setLoop('brake', player.input.brake > 0.5 && player.speed > 10 && player.grounded ? 0.7 : 0);
      } else {
        audio.engine.update({ speed: 0, throttle: 0, boosting: false, airborne: false });
        audio.setLoop('drift', 0); audio.setLoop('drift_sparks', 0); audio.setLoop('brake', 0);
      }
      st.hudTick += dt;
      if (st.hudTick > 1 / 15) { st.hudTick = 0; publishHud(); }
    }
  }, -2);

  return (
    <>
      <SkyAndLights env={env} follow={focus} shadows={quality.shadows} shadowSize={quality.shadowSize} handle={sky} drawDistance={quality.drawDistance} />
      <ArenaModel id={config.arenaId} shadows={quality.shadows} />
      <BattleObjects view={view} models={models} />
      {data.animatedProps.length > 0 && <AnimatedProps list={data.animatedProps} view={view as unknown as React.MutableRefObject<RaceView>} />}
      {models.map((m, i) => <primitive key={i} object={m.group} />)}
      {config.racers.map((r, i) => r.isPlayer && (
        <TireFitting key={`tire-${i}`} model={models[i]!} tireId={kartLookOf(useCustomStore.getState().karts, r.kartId).tire} />
      ))}
      <primitive object={vfx.solid} />
      <primitive object={vfx.glow} />
    </>
  );
}
