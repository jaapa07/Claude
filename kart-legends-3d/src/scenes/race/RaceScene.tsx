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
import { audio, type EngineControl } from '@/game/audio/audioManager';
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
import { KartModel, type KartVisualState } from '@/game/vehicles/kartModel';
import type { KartState } from '@/game/vehicles/kartState';
import { PHYS } from '@/game/vehicles/kartTuning';
import { RaceVfx, type KartFx } from '@/game/vfx/raceVfx';
import { speedLinesFragment, speedLinesVertex } from '@/shaders/speedLines';
import { useModel, useModels, useParticleAtlas } from '../assets';
import { SkyAndLights, type SkyHandle } from '../common/SkyAndLights';
import { QUALITY } from '../quality';
import { SplitRenderer, nearestCamDist2, splitQuality } from '../split';
import { AnimatedProps, RaceObjects, type RaceView } from './RaceObjects';
import { TrackModel } from './TrackModel';
import { KitDressing } from '../common/KitDressing';

const ITEM_SFX = {
  'pulso-solar': 'item_pulso', 'bolha-guardia': 'item_bolha', 'nevoa-prisma': 'item_nevoa',
  'faisca-rastreadora': 'item_faisca', 'onda-vento': 'item_onda', 'cristal-salto': 'item_cristal',
  'raio-corrente': 'item_raio', 'cometa-guia': 'item_cometa',
} as const;

const lerpAngle = (a: number, b: number, t: number): number => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/** Volume de cada motor na tela dividida (dois motores somados ficam perto de um só). */
const SPLIT_ENGINE_GAIN = 0.62;

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
  const humans = config.racers.filter((r) => r.isPlayer).length;
  const split = humans >= 2;
  const baseQuality = QUALITY[useSettingsStore((s) => s.quality)];
  const quality = useMemo(() => (split ? splitQuality(baseQuality) : baseQuality), [split, baseQuality]);
  const env = ENVIRONMENTS[config.trackId];
  const meta = TRACK_BY_ID[config.trackId];
  const atlas = useParticleAtlas();
  const kartGltfs = useModels(config.racers.map((r) => `karts/${r.kartId}.glb`));
  const charGltfs = useModels(config.racers.map((r) => `characters/${r.characterId}.glb`));
  const shieldGltf = useModel('items/bolha-guardia.glb');

  // simulação (uma por montagem da cena)
  const simRef = useRef<RaceSim | null>(null);
  if (!simRef.current) {
    inputManager.setPlayerCount(humans);
    simRef.current = new RaceSim(rapier as unknown as Rapier, world, data, config, { playerInput: (slot) => inputManager.readPlayer(slot) });
  }
  const sim = simRef.current;
  const view = useRef<RaceView>({ sim, alpha: 0, time: 0 });

  const models = useMemo(() => sim.karts.map((_, i) => {
    const model = new KartModel(kartGltfs[i]!, charGltfs[i]!, shieldGltf);
    // Kart repetido na corrida (há mais pilotos que karts): quem não é o "dono" do kart ganha a cor do próprio piloto.
    const r = config.racers[i]!;
    // Jogadores: roupa e kart personalizados.
    const customPaint = r.isPlayer && dressPlayer(model, r.characterId, r.kartId);
    const same = config.racers.filter((o) => o.kartId === r.kartId);
    const keeper = same.find((o) => CHARACTER_BY_ID[o.characterId].kartId === r.kartId) ?? same[0]!;
    if (same.length > 1 && keeper !== r && !customPaint) model.repaint(CHARACTER_BY_ID[r.characterId].color);
    return model;
  }), [sim, kartGltfs, charGltfs, shieldGltf, config.racers]);
  const vfx = useMemo(() => new RaceVfx(atlas, env, quality.particles), [atlas, env, quality.particles]);
  // Uma câmera por jogador: a do Jogador 1 é a câmera do Canvas; a do Jogador 2 é criada aqui (tela dividida).
  const cameras = useMemo(() => (split ? [camera, new THREE.PerspectiveCamera(60, 2, 0.3, 1600)] : [camera]), [split, camera]);
  const cams = useMemo(
    () => cameras.map((c) => new ChaseCamera(c, rapier as unknown as Rapier, world, data.introCamera, quality.shake)),
    [cameras, rapier, world, data, quality.shake],
  );
  const cam = cams[0]!;
  const engines: EngineControl[] = useMemo(() => (split ? [audio.engine, audio.engine2] : [audio.engine]), [split]);
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
    /** Última colocação vista de cada kart (o rosto comemora a ultrapassagem e fecha a cara quando perde posição). */
    lastPos: sim.karts.map((k) => k.position),
    vis: sim.karts.map((): KartVisualState => ({
      speed: 0, steer: 0, drifting: false, driftDir: 0, driftLevel: 0, boost: 0, spin: 0, grounded: true, shield: false, invulnerable: false, hop: 0, mood: 'idle',
    })),
    tmpA: new THREE.Vector3(), tmpB: new THREE.Vector3(), tmpC: new THREE.Vector3(), basis: new THREE.Matrix4(),
    fx: sim.karts.map((): KartFx => ({
      x: 0, y: 0, z: 0, wheelL: new THREE.Vector3(), wheelR: new THREE.Vector3(), exhausts: [new THREE.Vector3(), new THREE.Vector3()], heading: 0, speed: 0,
      drifting: false, driftLevel: 0, boost: 0, boostKind: 0, grounded: true, onRoad: true, surface: 0, braking: false, spinning: false,
    })),
    color: new THREE.Color(),
    /** Intensidade dos riscos de velocidade de cada jogador (cada metade da tela tem a sua). */
    lines: [0, 0],
  });

  const publishHud = (): void => {
    useHudStore.getState().setHud(sim.hud(0), split ? sim.hud(1) : null);
  };

  useEffect(() => {
    publishHud();
    audio.playAmbience(meta.ambience);
    audio.playMusic(null, { fadeMs: 600 });
    for (const e of engines) e.setGain(split ? SPLIT_ENGINE_GAIN : 1);
    const query = new URLSearchParams(window.location.search);
    if (query.has('fast')) state.current.intro = 999;
    // Gancho exclusivo dos testes de ponta a ponta (?e2e=1): lê o estado real da simulação e permite
    // adiantar o relógio rodando os MESMOS passos fixos, sem renderizar. Não existe fora desse modo.
    // Com dois jogadores, `snapshot()` é o Jogador 1 e `snapshotOf(1)` o Jogador 2.
    const w = window as unknown as { __kl3d?: unknown };
    if (query.has('e2e')) {
      const snap = (slot: number) => {
        const p = sim.players[slot] ?? sim.player ?? sim.karts[0]!;
        return {
          phase: sim.phase, raceTime: sim.raceTime, racers: sim.karts.length, lap: p.lap, position: p.position, speed: p.speed,
          heading: p.heading, x: p.x, z: p.z, drifting: p.drifting, driftLevel: p.driftLevel, boost: p.boostTime, item: p.item,
          grounded: p.grounded, progress: p.progress, finished: sim.karts.filter((k) => k.finished).length,
          aiMoving: sim.karts.filter((k) => !k.isPlayer && Math.abs(k.speed) > 3).length,
          players: sim.players.length, slot: Math.max(0, p.slot), characterId: p.characterId, playerFinished: p.finished,
        };
      };
      const target = (slot?: number): KartState[] => (slot === undefined ? sim.players : sim.players[slot] ? [sim.players[slot]] : []);
      w.__kl3d = {
        snapshot: () => snap(0),
        snapshotOf: (slot: number) => snap(slot),
        fastForward: (seconds: number) => {
          const steps = Math.round(seconds / PHYS.dt);
          for (let i = 0; i < steps; i++) { sim.step(); for (const e of sim.drainEvents()) if (e.type === 'finish' || e.type === 'lap') handleEvent(e); }
          publishHud();
        },
        /** Sem `slot`: todos os jogadores humanos. */
        setAutopilot: (on: boolean, slot?: number) => { for (const k of target(slot)) k.ai = on; },
        giveItem: (item: KartState['item'], slot = 0) => { const k = sim.players[slot] ?? sim.player; if (k) k.item = item; },
        /** Acesso direto à simulação (ferramentas de captura de animação). */
        sim,
      };
    }
    return () => {
      delete w.__kl3d;
      inputManager.setPlayerCount(1);
      audio.stopAllRaceSounds();
      useHudStore.getState().reset();
      for (const m of models) m.dispose();
      vfx.dispose();
      speedLines.dispose();
    };
  }, [sim, models, vfx, speedLines, meta]);

  /** Câmera do jogador humano que pilota `k` (ou null para a IA). */
  const camOf = (k: KartState | undefined): ChaseCamera | null => (k && k.isPlayer ? cams[k.slot] ?? null : null);

  const handleEvent = (e: SimEvent): void => {
    const st = state.current;
    const k: KartState | undefined = 'kart' in e ? sim.karts[e.kart] : undefined;
    const mine = !!k && k.isPlayer;
    const kc = camOf(k);
    // volume por distância (até o jogador mais próximo) para os outros pilotos
    let vol = 1;
    if (k && !mine && sim.players.length) {
      let d = Infinity;
      for (const p of sim.players) d = Math.min(d, Math.hypot(k.x - p.x, k.z - p.z));
      vol = Math.max(0, 1 - d / 60) * 0.7;
    }
    const sfx = (id: Parameters<typeof audio.sfx>[0], v = 1, rate = 1): void => { if (vol * v > 0.03) audio.sfx(id, { volume: vol * v, rate }); };
    switch (e.type) {
      case 'countdown': audio.sfx('countdown_beep'); break;
      case 'go':
        audio.sfx('countdown_go');
        audio.playMusic(meta.music, { fadeMs: 300 });
        for (const en of engines) en.start();
        break;
      case 'drift_start': if (mine) audio.sfx('jump', { volume: 0.5, rate: 1.3 }); break;
      case 'drift_level': if (mine) audio.sfx('ui_move', { volume: 0.9, rate: 0.8 + e.level * 0.25 }); break;
      case 'turbo':
        sfx(`turbo_${Math.min(3, e.level)}` as 'turbo_1');
        if (k) vfx.turbo(k.x, k.y - PHYS.rideHeight, k.z, e.level);
        if (kc) { kc.addShake(0.08 + e.level * 0.04); kc.kick(2.5 + e.level * 1.5); }
        break;
      case 'boost_pad': sfx('boost_pad'); if (k) vfx.turbo(k.x, k.y - PHYS.rideHeight, k.z, 2); if (kc) { kc.addShake(0.1); kc.kick(5); } break;
      case 'jump': sfx('jump'); break;
      case 'land': sfx('land', Math.min(1, 0.4 + e.impact / 14)); if (k) vfx.landing(k.x, k.y - PHYS.rideHeight, k.z, e.impact); if (kc) { kc.addShake(Math.min(0.25, e.impact / 45)); kc.landing(e.impact); } break;
      case 'collision':
        sfx(e.strength > 9 ? 'collision_heavy' : 'collision', Math.min(1, 0.35 + e.strength / 16));
        vfx.impact(e.x, e.y - 0.2, e.z, e.strength);
        if (kc) kc.addShake(Math.min(0.4, e.strength / 30));
        break;
      case 'hit':
        sfx('spinout');
        if (k) { vfx.burst(k.x, k.y - 0.4, k.z, 1, 0.5, 0.25); models[k.index]!.triggerHit(); st.spinStart[k.index] = k.spinTime; }
        if (kc) kc.addShake(0.45);
        break;
      case 'shield_break': sfx('shield_break'); if (k) vfx.sparkle(k.x, k.y, k.z, st.color.set('#4fd8e8'), 22); break;
      case 'pushed': if (k) { vfx.sparkle(k.x, k.y, k.z, st.color.set('#9cf0c3'), 10); models[k.index]!.triggerHit(); } break;
      case 'zapped':
        sfx('zap', 1 - e.link * 0.25);
        if (k) { vfx.zap(k.x, k.y, k.z, 1 - e.link * 0.25); if (e.link === 0) models[k.index]!.triggerHit(); }
        if (kc) kc.addShake(0.3 - e.link * 0.08);
        break;
      case 'rammed': {
        sfx('comet_ram');
        if (k) { vfx.sparkle(k.x, k.y, k.z, st.color.set('#ff6fae'), 16); models[k.index]!.triggerHit(); }
        if (kc) kc.addShake(0.35);
        const bc = camOf(sim.karts[e.by]);
        if (bc && bc !== kc) bc.addShake(0.15);
        break;
      }
      case 'comet_end': if (k) vfx.sparkle(k.x, k.y + 0.4, k.z, st.color.set('#ff6fae'), 12); break;
      case 'item_pickup': if (mine) { audio.sfx('item_pickup'); audio.sfx('item_roll', { volume: 0.8 }); } if (k) { vfx.sparkle(k.x, k.y + 0.4, k.z, st.color.set('#ffe66b')); models[k.index]!.emote('wow', 0.5); } break;
      case 'item_ready': break;
      case 'item_use': sfx(ITEM_SFX[e.item]); vfx.sparkle(e.x, e.y + 0.3, e.z, st.color.set(ITEM_BY_ID[e.item].color), 18); if (k) models[k.index]!.emote('grit', 0.7); break;
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
    const humansNow = sim.players.length ? sim.players : [sim.karts[0]!];
    const player = humansNow[0]!;

    if (!paused) {
      // apresentação da pista → contagem (qualquer jogador pode pular)
      if (sim.phase === 'intro') {
        st.intro += dt;
        let skip = false;
        if (st.intro > 0.6) {
          for (let s = 0; s < Math.max(1, sim.players.length); s++) {
            const inp = inputManager.readPlayer(s);
            if (inp.throttle > 0.5 || inp.item) skip = true;
          }
        }
        if (st.intro > cam.introDuration || skip) {
          sim.startCountdown();
          for (const c of cams) c.setMode('countdown');
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
      // câmera de cada jogador: perseguição na corrida; órbita de chegada quando ELE cruza a linha
      cams.forEach((c, i) => {
        const k = humansNow[i];
        const done = sim.phase === 'finished' || (!!k && k.isPlayer && k.finished);
        if (done) { if (c.mode !== 'finish') c.setMode('finish'); } else if (sim.phase === 'racing' && c.mode !== 'chase') c.setMode('chase');
      });
      if (sim.phase === 'finished') {
        st.finishTimer += dt;
        if (st.finishTimer > 3.4 && !st.reported) { st.reported = true; game.finishRace(sim.result()); }
      }
    }
    const alpha = st.acc / PHYS.dt;
    view.current.alpha = alpha;

    // karts (visíveis e animados se perto de QUALQUER câmera)
    sim.karts.forEach((k, i) => {
      const m = models[i]!;
      const x = k.px + (k.x - k.px) * alpha, y = k.py + (k.y - k.py) * alpha - PHYS.rideHeight, z = k.pz + (k.z - k.pz) * alpha;
      const heading = lerpAngle(k.pHeading, k.heading, alpha);
      const n = st.normals[i]!;
      n.lerp(st.tmpA.set(k.nx, k.ny, k.nz), 1 - Math.exp(-10 * dt)).normalize();
      const f = st.tmpA.set(Math.sin(heading), 0, Math.cos(heading));
      f.addScaledVector(n, -f.dot(n)).normalize();
      const left = st.tmpB.crossVectors(n, f);
      st.basis.makeBasis(left, n, f);
      m.group.quaternion.setFromRotationMatrix(st.basis);
      m.group.position.set(x, y, z);
      const spinTotal = st.spinStart[i]!;
      const d2 = nearestCamDist2(x, z, cameras);
      const far = d2 > 170 * 170;
      m.group.visible = !far;
      if (far) return;
      if (!paused) {
        m.detail = d2 < quality.animDetail * quality.animDetail ? 1 : 0;
        // estado visual reaproveitado (sem alocação por quadro)
        const v = st.vis[i]!;
        v.speed = k.speed; v.steer = k.steer; v.drifting = k.drifting; v.driftDir = k.driftDir; v.driftLevel = k.boostTime > 0 ? k.boostKind : k.driftLevel;
        v.boost = k.boostTime > 0 ? Math.min(1, k.boostTime / k.boostTotal) : 0;
        v.spin = k.spinTime > 0 && spinTotal > 0 ? 1 - k.spinTime / spinTotal : 0;
        v.grounded = k.grounded; v.shield = k.shield > 0; v.invulnerable = k.invuln > 0 && k.spinTime <= 0; v.hop = k.hopTime / 0.22;
        v.mood = k.finished ? (k.position <= 3 ? 'victory' : 'defeat') : sim.phase === 'intro' || sim.phase === 'countdown' ? 'idle' : 'race';
        // rosto: sorriso ao ultrapassar, cara fechada ao ser ultrapassado (só visual)
        const lp = st.lastPos[i]!;
        if (k.position !== lp) {
          if (sim.phase === 'racing' && !k.finished) m.emote(k.position < lp ? 'happy' : 'grit', k.position < lp ? 1.3 : 0.8);
          st.lastPos[i] = k.position;
        }
        m.update(dt, v);
        if (d2 < 90 * 90) {
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
      for (const k of sim.karts) {
        if (k.comet > 0) vfx.comet(k.index, k.x, k.y - PHYS.rideHeight, k.z, k.heading, dt);
        if (k.slowTime > 0) vfx.zapped(k.index, k.x, k.y - PHYS.rideHeight, k.z, dt);
      }
    }

    // câmeras (uma por jogador)
    cams.forEach((c, i) => {
      const p = humansNow[i] ?? player;
      const px = p.px + (p.x - p.px) * alpha, py = p.py + (p.y - p.py) * alpha - PHYS.rideHeight, pz = p.pz + (p.z - p.pz) * alpha;
      if (i === 0) focus.current.set(px, py, pz);
      if (paused) return;
      const boostK = p.boostTime > 0 ? Math.min(1, p.boostTime / 0.5) : 0;
      c.update(dt, {
        x: px, y: py, z: pz, heading: lerpAngle(p.pHeading, p.heading, alpha), speed: p.speed, steer: p.steer,
        drifting: p.drifting, driftDir: p.driftDir, boost: boostK, grounded: p.grounded,
      });
    });

    // clima, relâmpagos, partículas, riscos de velocidade
    if (!paused) {
      cameras.forEach((c) => {
        const fwd = st.tmpC.set(0, 0, -1).applyQuaternion(c.quaternion);
        vfx.weather(env.weather, c.position, fwd, dt / cameras.length, quality.weather);
      });
      if (env.lightning) {
        st.lightning -= dt;
        if (st.lightning <= 0) {
          st.lightning = 5 + Math.random() * 9;
          sky.current.flash = 1;
          audio.sfx('thunder', { volume: 0.9 });
        }
      }
      vfx.update(dt, split ? frame.size.height / 2 : frame.size.height, camera.fov);
      const u = speedLines.uniforms;
      humansNow.forEach((p, i) => {
        if (i > 1) return;
        const speedK = Math.max(0, (Math.abs(p.speed) - 22) / 12);
        const boostK = p.boostTime > 0 ? Math.min(1, p.boostTime / 0.5) : 0;
        const want = sim.phase === 'racing' && !(p.isPlayer && p.finished && split) ? Math.min(1, speedK * 0.35 + boostK * 0.75) : 0;
        st.lines[i] = st.lines[i]! + (want - st.lines[i]!) * (1 - Math.exp(-6 * dt));
      });
      u.uIntensity!.value = st.lines[0]!;
      u.uTime!.value += dt;

      // áudio dos jogadores: um motor por humano; loops pelo mais "intenso" dos dois
      if (sim.phase === 'racing' || sim.phase === 'finished') {
        let drift = 0, sparks = 0, brake = 0, offroad = 0, wind = 0;
        humansNow.forEach((p, i) => {
          const top = p.tuning.topSpeed;
          engines[i]?.update({ speed: Math.abs(p.speed) / top, throttle: p.input.throttle, boosting: p.boostTime > 0, airborne: !p.grounded });
          drift = Math.max(drift, p.drifting && p.grounded ? 0.8 : 0);
          sparks = Math.max(sparks, p.drifting && p.driftLevel > 0 && p.grounded ? 0.5 + p.driftLevel * 0.15 : 0);
          brake = Math.max(brake, p.input.brake > 0.5 && p.speed > 10 && p.grounded ? 0.7 : 0);
          offroad = Math.max(offroad, !p.onRoad && p.grounded && Math.abs(p.speed) > 4 ? 0.7 : 0);
          wind = Math.max(wind, Math.min(1, Math.max(0, Math.abs(p.speed) / top - 0.5) * 1.6));
        });
        audio.setLoop('drift', drift);
        audio.setLoop('drift_sparks', sparks);
        audio.setLoop('brake', brake);
        audio.setLoop('offroad', offroad);
        audio.setLoop('wind_speed', wind);
      }
      // HUD (cerca de 15 vezes por segundo)
      st.hudTick += dt;
      if (st.hudTick > 1 / 15) { st.hudTick = 0; publishHud(); }
    }
  }, -2);

  return (
    <>
      <SkyAndLights env={env} follow={focus} shadows={quality.shadows} shadowSize={quality.shadowSize} handle={sky} drawDistance={quality.drawDistance} envResolution={quality.envResolution} />
      <TrackModel trackId={config.trackId} shadows={quality.shadows} detail={quality.surfaceDetail} />
      <KitDressing file={`tracks/${config.trackId}.dress.json`} maxTier={quality.dressing} shadows={quality.shadows} />
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
      {split && (
        <SplitRenderer
          cameras={cameras}
          full={() => sim.phase === 'intro'}
          before={(slot) => { speedLines.uniforms.uIntensity!.value = state.current.lines[slot] ?? 0; }}
        />
      )}
    </>
  );
}
