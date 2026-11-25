import { dressPlayer, kartLookOf, useCustomStore } from '@/game/custom/customStore';
import { TireFitting } from '../common/TireFitting';
import { CHARACTER_BY_ID } from '@/data/characters';
import { useFrame, useThree } from '@react-three/fiber';
import { Physics, useRapier } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import { suspend } from 'suspend-react';
import * as THREE from 'three';
import { useGameStore } from '@/app/gameStore';
import { useSettingsStore } from '@/app/settingsStore';
import { ITEM_BY_ID } from '@/data/items';
import { TRACK_BY_ID } from '@/data/tracks';
import { audio } from '@/game/audio/audioManager';
import { ChaseCamera } from '@/game/camera/chaseCamera';
import { useHudStore } from '@/game/core/hudStore';
import type { RaceConfig } from '@/game/core/types';
import { inputManager } from '@/game/input/inputManager';
import type { Rapier } from '@/game/physics/trackColliders';
import type { SimEvent } from '@/game/racing/events';
import { RaceSim } from '@/game/racing/raceSim';
import { ENVIRONMENTS } from '@/game/tracks/environments';
import { loadTrackData } from '@/game/tracks/trackData';
import type { TrackData } from '@/game/tracks/trackTypes';
import { KartModel } from '@/game/vehicles/kartModel';
import type { KartState } from '@/game/vehicles/kartState';
import { PHYS } from '@/game/vehicles/kartTuning';
import { RaceVfx, type KartFx } from '@/game/vfx/raceVfx';
import { speedLinesFragment, speedLinesVertex } from '@/shaders/speedLines';
import { useModel, useModels, useParticleAtlas } from '../assets';
import { SkyAndLights, type SkyHandle } from '../common/SkyAndLights';
import { QUALITY } from '../quality';
import { AnimatedProps, RaceObjects, type RaceView } from './RaceObjects';
import { TrackModel } from './TrackModel';

const ITEM_SFX = {
  'pulso-solar': 'item_pulso', 'bolha-guardia': 'item_bolha', 'nevoa-prisma': 'item_nevoa',
  'faisca-rastreadora': 'item_faisca', 'onda-vento': 'item_onda', 'cristal-salto': 'item_cristal',
} as const;

const lerpAngle = (a: number, b: number, t: number): number => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export function RaceScene({ config }: { config: RaceConfig }): JSX.Element {
  const data = suspend(() => loadTrackData(config.trackId), ['track-data', config.trackId]);
  return (
    <Physics paused gravity={[0, 0, 0]} timeStep={PHYS.dt} colliders={false}>
      <RaceWorld data={data} config={config} />
    </Physics>
  );
}

function RaceWorld({ data, config }: { data: TrackData; config: RaceConfig }): JSX.Element {
  const { world, rapier } = useRapier();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const quality = QUALITY[useSettingsStore((s) => s.quality)];
  const env = ENVIRONMENTS[config.trackId];
  const meta = TRACK_BY_ID[config.trackId];
  const atlas = useParticleAtlas();
  const kartGltfs = useModels(config.racers.map((r) => `karts/${r.kartId}.glb`));
  const charGltfs = useModels(config.racers.map((r) => `characters/${r.characterId}.glb`));
  const shieldGltf = useModel('items/bolha-guardia.glb');

  // simulação (uma por montagem da cena)
  const simRef = useRef<RaceSim | null>(null);
  if (!simRef.current) {
    simRef.current = new RaceSim(rapier as unknown as Rapier, world, data, config, { playerInput: () => inputManager.read() });
  }
  const sim = simRef.current;
  const view = useRef<RaceView>({ sim, alpha: 0, time: 0 });

  const models = useMemo(() => sim.karts.map((_, i) => {
    const model = new KartModel(kartGltfs[i]!, charGltfs[i]!, shieldGltf);
    // Kart repetido na corrida (há mais pilotos que karts): quem não é o "dono" do kart ganha a cor do próprio piloto.
    const r = config.racers[i]!;
    // Jogador: roupa e kart personalizados.
    const customPaint = r.isPlayer && dressPlayer(model, r.characterId, r.kartId);
    const same = config.racers.filter((o) => o.kartId === r.kartId);
    const keeper = same.find((o) => CHARACTER_BY_ID[o.characterId].kartId === r.kartId) ?? same[0]!;
    if (same.length > 1 && keeper !== r && !customPaint) model.repaint(CHARACTER_BY_ID[r.characterId].color);
    return model;
  }), [sim, kartGltfs, charGltfs, shieldGltf, config.racers]);
  const vfx = useMemo(() => new RaceVfx(atlas, env, quality.particles), [atlas, env, quality.particles]);
  const cam = useMemo(() => new ChaseCamera(camera, rapier as unknown as Rapier, world, data.introCamera), [camera, rapier, world, data]);
  const speedLines = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: speedLinesVertex, fragmentShader: speedLinesFragment, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending, uniforms: { uIntensity: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color('#ffffff') } },
  }), []);
  const sky = useRef<SkyHandle>({ flash: 0 });
  const focus = useRef(new THREE.Vector3());

  const state = useRef({
    acc: 0, intro: 0, finishTimer: 0, reported: false, hudTick: 0, lightning: 4 + Math.random() * 6, started: false,
    normals: sim.karts.map(() => new THREE.Vector3(0, 1, 0)),
    spinStart: sim.karts.map(() => 0),
    tmpA: new THREE.Vector3(), tmpB: new THREE.Vector3(), tmpC: new THREE.Vector3(), basis: new THREE.Matrix4(),
    fx: sim.karts.map((): KartFx => ({
      x: 0, y: 0, z: 0, wheelL: new THREE.Vector3(), wheelR: new THREE.Vector3(), exhausts: [new THREE.Vector3(), new THREE.Vector3()], heading: 0, speed: 0,
      drifting: false, driftLevel: 0, boost: 0, boostKind: 0, grounded: true, onRoad: true, surface: 0, braking: false, spinning: false,
    })),
    color: new THREE.Color(),
  });

  useEffect(() => {
    useHudStore.getState().setHud(sim.hud());
    audio.playAmbience(meta.ambience);
    audio.playMusic(null, { fadeMs: 600 });
    const query = new URLSearchParams(window.location.search);
    if (query.has('fast')) state.current.intro = 999;
    // Gancho exclusivo dos testes de ponta a ponta (?e2e=1): lê o estado real da simulação e permite
    // adiantar o relógio rodando os MESMOS passos fixos, sem renderizar. Não existe fora desse modo.
    const w = window as unknown as { __kl3d?: unknown };
    if (query.has('e2e')) {
      w.__kl3d = {
        snapshot: () => {
          const p = sim.player ?? sim.karts[0]!;
          return {
            phase: sim.phase, raceTime: sim.raceTime, racers: sim.karts.length, lap: p.lap, position: p.position, speed: p.speed,
            heading: p.heading, x: p.x, z: p.z, drifting: p.drifting, driftLevel: p.driftLevel, boost: p.boostTime, item: p.item,
            grounded: p.grounded, progress: p.progress, finished: sim.karts.filter((k) => k.finished).length,
            aiMoving: sim.karts.filter((k) => !k.isPlayer && Math.abs(k.speed) > 3).length,
          };
        },
        fastForward: (seconds: number) => {
          const steps = Math.round(seconds / PHYS.dt);
          for (let i = 0; i < steps; i++) { sim.step(); for (const e of sim.drainEvents()) if (e.type === 'finish' || e.type === 'lap') handleEvent(e); }
          useHudStore.getState().setHud(sim.hud());
        },
        setAutopilot: (on: boolean) => { if (sim.player) sim.player.ai = on; },
        giveItem: (item: KartState['item']) => { if (sim.player) sim.player.item = item; },
        /** Acesso direto à simulação (ferramentas de captura de animação). */
        sim,
      };
    }
    return () => {
      delete w.__kl3d;
      audio.stopAllRaceSounds();
      useHudStore.getState().reset();
      for (const m of models) m.dispose();
      vfx.dispose();
      speedLines.dispose();
    };
  }, [sim, models, vfx, speedLines, meta]);

  const handleEvent = (e: SimEvent): void => {
    const player = sim.player;
    const st = state.current;
    const k: KartState | undefined = 'kart' in e ? sim.karts[e.kart] : undefined;
    const mine = !!k && k === player;
    // volume por distância para os outros pilotos
    let vol = 1;
    if (k && player && !mine) {
      const d = Math.hypot(k.x - player.x, k.z - player.z);
      vol = Math.max(0, 1 - d / 60) * 0.7;
    }
    const sfx = (id: Parameters<typeof audio.sfx>[0], v = 1, rate = 1): void => { if (vol * v > 0.03) audio.sfx(id, { volume: vol * v, rate }); };
    switch (e.type) {
      case 'countdown': audio.sfx('countdown_beep'); break;
      case 'go':
        audio.sfx('countdown_go');
        audio.playMusic(meta.music, { fadeMs: 300 });
        audio.engine.start();
        break;
      case 'drift_start': if (mine) audio.sfx('jump', { volume: 0.5, rate: 1.3 }); break;
      case 'drift_level': if (mine) audio.sfx('ui_move', { volume: 0.9, rate: 0.8 + e.level * 0.25 }); break;
      case 'turbo':
        sfx(`turbo_${Math.min(3, e.level)}` as 'turbo_1');
        if (k) vfx.turbo(k.x, k.y - PHYS.rideHeight, k.z, e.level);
        if (mine) cam.addShake(0.12 + e.level * 0.05);
        break;
      case 'boost_pad': sfx('boost_pad'); if (k) vfx.turbo(k.x, k.y - PHYS.rideHeight, k.z, 2); if (mine) cam.addShake(0.15); break;
      case 'jump': sfx('jump'); break;
      case 'land': sfx('land', Math.min(1, 0.4 + e.impact / 14)); if (k) vfx.landing(k.x, k.y - PHYS.rideHeight, k.z, e.impact); if (mine) cam.addShake(Math.min(0.3, e.impact / 40)); break;
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
      case 'item_ready': break;
      case 'item_use': sfx(ITEM_SFX[e.item]); vfx.sparkle(e.x, e.y + 0.3, e.z, st.color.set(ITEM_BY_ID[e.item].color), 18); break;
      case 'lap': if (mine) audio.sfx(e.final ? 'final_lap' : 'lap'); break;
      case 'finish':
        if (mine) { audio.sfx('finish'); if (k) vfx.confetti(k.x, k.y, k.z, 140); }
        break;
      case 'respawn':
        if (e.reason === 'water' && k) {
          if (data.liquid === 'lava') { vfx.lavaSplash(k.px, data.waterY ?? k.py, k.pz); sfx('collision_heavy', 0.7); } else vfx.splash(k.px, data.waterY ?? k.py, k.pz);
          sfx('splash');
        }
        sfx('respawn', 0.8);
        break;
      case 'wrong_way': if (mine) audio.sfx('ui_error'); break;
    }
  };

  useFrame((frame, delta) => {
    const st = state.current;
    const game = useGameStore.getState();
    const paused = game.paused;
    const dt = Math.min(delta, 0.1);
    const player = sim.player ?? sim.karts[0]!;

    if (!paused) {
      // apresentação da pista → contagem
      if (sim.phase === 'intro') {
        st.intro += dt;
        const inp = inputManager.read();
        if (st.intro > cam.introDuration || (st.intro > 0.6 && (inp.throttle > 0.5 || inp.item))) {
          sim.startCountdown();
          cam.setMode('countdown');
        }
      }
      // passo fixo
      st.acc += dt;
      let steps = 0;
      while (st.acc >= PHYS.dt && steps < 5) {
        sim.step();
        st.acc -= PHYS.dt;
        steps++;
        for (const e of sim.drainEvents()) handleEvent(e);
      }
      if (steps === 5) st.acc = 0;
      view.current.time += dt;
      if (sim.phase === 'racing' && cam.mode !== 'chase') cam.setMode('chase');
      if (sim.phase === 'finished') {
        if (cam.mode !== 'finish') cam.setMode('finish');
        st.finishTimer += dt;
        if (st.finishTimer > 3.4 && !st.reported) { st.reported = true; game.finishRace(sim.result()); }
      }
    }
    const alpha = st.acc / PHYS.dt;
    view.current.alpha = alpha;
    const time = view.current.time;

    // karts
    const camPos = camera.position;
    sim.karts.forEach((k, i) => {
      const m = models[i]!;
      const x = k.px + (k.x - k.px) * alpha, y = k.py + (k.y - k.py) * alpha - PHYS.rideHeight, z = k.pz + (k.z - k.pz) * alpha;
      const heading = lerpAngle(k.pHeading, k.heading, alpha);
      const n = st.normals[i]!;
      n.lerp(st.tmpA.set(k.nx, k.ny, k.nz), Math.min(1, dt * 10)).normalize();
      const f = st.tmpA.set(Math.sin(heading), 0, Math.cos(heading));
      f.addScaledVector(n, -f.dot(n)).normalize();
      const left = st.tmpB.crossVectors(n, f);
      st.basis.makeBasis(left, n, f);
      m.group.quaternion.setFromRotationMatrix(st.basis);
      m.group.position.set(x, y, z);
      const spinTotal = st.spinStart[i]!;
      const far = (x - camPos.x) ** 2 + (z - camPos.z) ** 2 > 170 * 170;
      m.group.visible = !far;
      if (far) return;
      if (!paused) {
        m.update(dt, {
          speed: k.speed, steer: k.steer, drifting: k.drifting, driftDir: k.driftDir, driftLevel: k.boostTime > 0 ? k.boostKind : k.driftLevel,
          boost: k.boostTime > 0 ? Math.min(1, k.boostTime / k.boostTotal) : 0,
          spin: k.spinTime > 0 && spinTotal > 0 ? 1 - k.spinTime / spinTotal : 0,
          grounded: k.grounded, shield: k.shield > 0, invulnerable: k.invuln > 0 && k.spinTime <= 0, hop: k.hopTime / 0.22,
          mood: k.finished ? (k.position <= 3 ? 'victory' : 'defeat') : sim.phase === 'intro' || sim.phase === 'countdown' ? 'idle' : 'race',
        });
        const near = (x - camPos.x) ** 2 + (z - camPos.z) ** 2 < 90 * 90;
        if (near) {
          const fx = st.fx[i]!;
          fx.x = x; fx.y = y; fx.z = z; fx.heading = heading; fx.speed = k.speed; fx.drifting = k.drifting; fx.driftLevel = k.driftLevel;
          fx.boost = k.boostTime > 0 ? 1 : 0; fx.boostKind = k.boostKind; fx.grounded = k.grounded; fx.onRoad = k.onRoad; fx.surface = k.surface;
          fx.braking = k.input.brake > 0.5 && k.speed > 10; fx.spinning = k.spinTime > 0;
          m.rearWheelWorld(0, fx.wheelL); m.rearWheelWorld(1, fx.wheelR);
          m.exhausts.forEach((e, j) => e.getWorldPosition(fx.exhausts[j]!));
          fx.exhausts.length = m.exhausts.length;
          vfx.kart(i, fx, dt);
        }
      }
    });

    // itens em ação
    if (!paused) {
      for (const h of sim.items.hazards) vfx.mist(h.x, h.y, h.z, h.radius, dt);
      for (const p of sim.items.projectiles) vfx.trail(p.x, p.y, p.z, dt);
    }

    // câmera
    const px = player.px + (player.x - player.px) * alpha, py = player.py + (player.y - player.py) * alpha - PHYS.rideHeight, pz = player.pz + (player.z - player.pz) * alpha;
    focus.current.set(px, py, pz);
    const boostK = player.boostTime > 0 ? Math.min(1, player.boostTime / 0.5) : 0;
    if (!paused) {
      cam.update(dt, {
        x: px, y: py, z: pz, heading: lerpAngle(player.pHeading, player.heading, alpha), speed: player.speed, steer: player.steer,
        drifting: player.drifting, driftDir: player.driftDir, boost: boostK, grounded: player.grounded,
      }, time);
    }

    // clima, relâmpagos, partículas, riscos de velocidade
    if (!paused) {
      const fwd = st.tmpC.set(0, 0, -1).applyQuaternion(camera.quaternion);
      vfx.weather(env.weather, camera.position, fwd, dt, quality.weather);
      if (env.lightning) {
        st.lightning -= dt;
        if (st.lightning <= 0) {
          st.lightning = 5 + Math.random() * 9;
          sky.current.flash = 1;
          audio.sfx('thunder', { volume: 0.9 });
        }
      }
      vfx.update(dt, frame.size.height, camera.fov);
      const speedK = Math.max(0, (Math.abs(player.speed) - 22) / 12);
      const u = speedLines.uniforms;
      u.uIntensity!.value += ((sim.phase === 'racing' ? Math.min(1, speedK * 0.35 + boostK * 0.75) : 0) - u.uIntensity!.value) * Math.min(1, dt * 6);
      u.uTime!.value += dt;

      // áudio do jogador
      if (sim.phase === 'racing' || sim.phase === 'finished') {
        const top = player.tuning.topSpeed;
        audio.engine.update({ speed: Math.abs(player.speed) / top, throttle: player.input.throttle, boosting: player.boostTime > 0, airborne: !player.grounded });
        audio.setLoop('drift', player.drifting && player.grounded ? 0.8 : 0);
        audio.setLoop('drift_sparks', player.drifting && player.driftLevel > 0 && player.grounded ? 0.5 + player.driftLevel * 0.15 : 0);
        audio.setLoop('brake', player.input.brake > 0.5 && player.speed > 10 && player.grounded ? 0.7 : 0);
        audio.setLoop('offroad', !player.onRoad && player.grounded && Math.abs(player.speed) > 4 ? 0.7 : 0);
        audio.setLoop('wind_speed', Math.min(1, Math.max(0, Math.abs(player.speed) / top - 0.5) * 1.6));
      }
      // HUD (cerca de 15 vezes por segundo)
      st.hudTick += dt;
      if (st.hudTick > 1 / 15) { st.hudTick = 0; useHudStore.getState().setHud(sim.hud()); }
    }
  }, -2);

  return (
    <>
      <SkyAndLights env={env} follow={focus} shadows={quality.shadows} shadowSize={quality.shadowSize} handle={sky} drawDistance={quality.drawDistance} />
      <TrackModel trackId={config.trackId} shadows={quality.shadows} />
      <RaceObjects view={view} />
      {data.animatedProps.length > 0 && <AnimatedProps list={data.animatedProps} view={view} />}
      {models.map((m, i) => <primitive key={i} object={m.group} />)}
      {config.racers.map((r, i) => r.isPlayer && (
        <TireFitting key={`tire-${i}`} model={models[i]!} tireId={kartLookOf(useCustomStore.getState().karts, r.kartId).tire} />
      ))}
      <primitive object={vfx.solid} />
      <primitive object={vfx.glow} />
      <mesh material={speedLines} frustumCulled={false} renderOrder={30}>
        <planeGeometry args={[2, 2]} />
      </mesh>
    </>
  );
}
