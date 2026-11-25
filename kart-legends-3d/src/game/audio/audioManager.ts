/**
 * Gerenciador de áudio do Kart Legends 3D — Web Audio API pura.
 *
 * Grafo:
 *   música   → musicDuck ─→ musicBus ─┐
 *   efeitos  ───────────────→ sfxBus ─┤
 *   motor/loops → raceBus ──→ sfxBus  ├→ master → limitador → saída
 *   ambiência → ambPause ───→ ambBus ─┘
 *
 * Seguro fora do navegador: sem `AudioContext` todos os métodos viram no-op e `preload()` resolve.
 */
import { assetUrl } from '@/game/core/assets';
import {
  ALL_AUDIO_FILES,
  MUSIC_LOOPS,
  ambienceFile,
  loopFile,
  musicFile,
  sfxFile,
  type AmbienceId,
  type LoopId,
  type MusicId,
  type SfxId,
} from './audioIds';
import { EngineSynth, type EngineHost, type EngineParams } from './engineSynth';

export type { AmbienceId, LoopId, MusicId, SfxId } from './audioIds';
export type { EngineParams } from './engineSynth';

export interface Volumes {
  music: number;
  sfx: number;
  ambient: number;
}

export interface SfxOptions {
  volume?: number;
  /** Velocidade de reprodução; se omitida, alguns efeitos recebem uma pequena variação aleatória. */
  rate?: number;
  /** -1 (esquerda) .. 1 (direita). */
  pan?: number;
}

/** Motor sintetizado em tempo real (ver `engineSynth.ts`). */
export interface EngineControl {
  start(): void;
  update(p: EngineParams): void;
  stop(): void;
  /** Volume relativo (0..1); a tela dividida toca dois motores mais baixos. */
  setGain(scale: number): void;
}

// ---------------------------------------------------------------------------------------------
// Tabelas de mixagem
// ---------------------------------------------------------------------------------------------

/** Ganho por efeito (os arquivos são normalizados em −1 dBFS de pico). */
const SFX_GAIN: Partial<Record<SfxId, number>> = {
  ui_move: 0.35,
  ui_select: 0.5,
  ui_back: 0.45,
  ui_error: 0.4,
  countdown_beep: 0.55,
  countdown_go: 0.75,
  item_roll: 0.5,
  lap: 0.7,
  jump: 0.6,
  land: 0.75,
  respawn: 0.7,
};
const SFX_GAIN_DEFAULT = 0.85;

/** Máximo de vozes simultâneas por efeito (a mais antiga é cortada). */
const SFX_POLYPHONY: Partial<Record<SfxId, number>> = {
  ui_move: 2,
  ui_select: 2,
  ui_back: 2,
  ui_error: 1,
  countdown_beep: 1,
  countdown_go: 1,
  finish: 1,
  lap: 1,
  final_lap: 1,
  item_roll: 1,
  thunder: 2,
  unlock: 1,
  turbo_1: 2,
  turbo_2: 2,
  turbo_3: 2,
};
const SFX_POLYPHONY_DEFAULT = 3;

/** Variação aleatória de pitch (±fração) para efeitos repetitivos não soarem idênticos. */
const SFX_PITCH_VARIATION: Partial<Record<SfxId, number>> = {
  collision: 0.08,
  collision_heavy: 0.06,
  jump: 0.05,
  land: 0.07,
  item_pickup: 0.03,
  boost_pad: 0.04,
  splash: 0.06,
  shield_break: 0.04,
  spinout: 0.04,
  thunder: 0.08,
  turbo_1: 0.03,
};

const LOOP_GAIN: Record<LoopId, number> = {
  drift: 0.4,
  brake: 0.35,
  offroad: 0.55,
  wind_speed: 0.45,
  drift_sparks: 0.5,
};

const MUSIC_GAIN: Record<MusicId, number> = { menu: 0.9, race_aurora: 0.8, race_eclipse: 0.8, victory: 1, defeat: 1 };
const AMBIENCE_GAIN = 0.9;
const PAUSED_MUSIC_GAIN = 0.35;
const DEFAULT_MUSIC_FADE_MS = 700;
const AMBIENCE_FADE_S = 0.9;

// ---------------------------------------------------------------------------------------------

type AudioContextCtor = new () => AudioContext;

function contextCtor(): AudioContextCtor | null {
  const g = globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
const clamp01 = (x: number): number => (Number.isFinite(x) ? clamp(x, 0, 1) : 0);
const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  musicBus: GainNode;
  musicDuck: GainNode;
  sfxBus: GainNode;
  raceBus: GainNode;
  ambBus: GainNode;
  ambPause: GainNode;
}

interface Track<Id> {
  id: Id;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface SfxVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  tail: AudioNode;
}

interface LoopVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export interface AudioDebugState {
  hasContext: boolean;
  contextState: string | null;
  unlocked: boolean;
  paused: boolean;
  volumes: Volumes;
  /** Valores atuais dos GainNode de cada barramento (null sem contexto). */
  buses: { music: number; sfx: number; ambient: number; race: number; musicDuck: number; ambientPause: number } | null;
  wantedMusic: MusicId | null;
  playingMusic: MusicId | null;
  wantedAmbience: AmbienceId | null;
  playingAmbience: AmbienceId | null;
  loadedFiles: number;
  sfxVoices: Partial<Record<SfxId, number>>;
  activeLoops: LoopId[];
  engineRunning: boolean;
  engineActive: boolean;
}

export class AudioManager implements EngineHost {
  readonly engine: EngineControl;
  /** Motor do Jogador 2 (tela dividida). */
  readonly engine2: EngineControl;

  private readonly engineSynth: EngineSynth;
  private readonly engineSynth2: EngineSynth;
  private graph: Graph | null = null;
  private contextFailed = false;
  private unlocked = false;
  private paused = false;
  private volumes: Volumes = { music: 0.7, sfx: 0.85, ambient: 0.6 };

  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly loading = new Map<string, Promise<AudioBuffer>>();
  private preloadPromise: Promise<void> | null = null;

  private wantedMusic: MusicId | null = null;
  private musicFadeMs = DEFAULT_MUSIC_FADE_MS;
  private music: Track<MusicId> | null = null;
  private wantedAmbience: AmbienceId | null = null;
  private ambience: Track<AmbienceId> | null = null;

  private readonly loopTargets = new Map<LoopId, number>();
  private readonly loops = new Map<LoopId, LoopVoice>();
  private readonly voices = new Map<SfxId, SfxVoice[]>();

  constructor() {
    this.engineSynth = new EngineSynth(this);
    this.engine = this.engineSynth;
    this.engineSynth2 = new EngineSynth(this);
    this.engine2 = this.engineSynth2;
  }

  // -------------------------------------------------------------------------------------------
  // API do contrato
  // -------------------------------------------------------------------------------------------

  /** Chamar no primeiro gesto do usuário: cria/retoma o contexto e toca o que estava pendente. */
  async unlock(): Promise<void> {
    const g = this.ensureGraph();
    if (!g) return;
    this.unlocked = true;
    if (g.ctx.state !== 'running') {
      try {
        await g.ctx.resume();
      } catch (err) {
        console.warn('[audio] o navegador não permitiu retomar o áudio ainda:', err);
        return;
      }
    }
    this.syncAll();
  }

  /** Busca e decodifica todos os arquivos. Rejeita listando os que falharem. */
  preload(): Promise<void> {
    if (!contextCtor()) return Promise.resolve();
    if (!this.preloadPromise) {
      const p = this.preloadAll();
      this.preloadPromise = p;
      // Em caso de falha, uma nova chamada tenta de novo (os arquivos já carregados ficam em cache).
      p.catch(() => {
        if (this.preloadPromise === p) this.preloadPromise = null;
      });
    }
    return this.preloadPromise;
  }

  setVolumes(v: Volumes): void {
    this.volumes = { music: clamp01(v.music), sfx: clamp01(v.sfx), ambient: clamp01(v.ambient) };
    const g = this.graph;
    if (!g) return;
    this.ramp(g.musicBus.gain, this.volumes.music, 0.03);
    this.ramp(g.sfxBus.gain, this.volumes.sfx, 0.03);
    this.ramp(g.ambBus.gain, this.volumes.ambient, 0.03);
  }

  /** Troca a música com crossfade. Antes do unlock/preload a intenção fica guardada. */
  playMusic(id: MusicId | null, opts?: { fadeMs?: number }): void {
    this.wantedMusic = id;
    this.musicFadeMs = Math.max(0, opts?.fadeMs ?? DEFAULT_MUSIC_FADE_MS);
    this.syncMusic();
  }

  playAmbience(id: AmbienceId | null): void {
    this.wantedAmbience = id;
    this.syncAmbience();
  }

  sfx(id: SfxId, opts?: SfxOptions): void {
    const g = this.playable();
    if (!g) return;
    const file = sfxFile(id);
    const buffer = this.buffers.get(file);
    if (!buffer) {
      // Ainda não carregado: carrega para a próxima vez (este disparo é perdido, com aviso em caso de erro).
      this.loadInBackground(file);
      return;
    }
    let list = this.voices.get(id);
    if (!list) {
      list = [];
      this.voices.set(id, list);
    }
    const max = SFX_POLYPHONY[id] ?? SFX_POLYPHONY_DEFAULT;
    while (list.length >= max) {
      const oldest = list.shift();
      if (oldest) this.releaseVoice(oldest);
    }

    const { ctx } = g;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const variation = SFX_PITCH_VARIATION[id] ?? 0;
    const rate = opts?.rate ?? 1 + (Math.random() * 2 - 1) * variation;
    source.playbackRate.value = clamp(rate, 0.25, 4);
    const gain = ctx.createGain();
    gain.gain.value = clamp(opts?.volume ?? 1, 0, 2) * (SFX_GAIN[id] ?? SFX_GAIN_DEFAULT);
    source.connect(gain);
    let tail: AudioNode = gain;
    const pan = clamp(opts?.pan ?? 0, -1, 1);
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      tail = panner;
    }
    tail.connect(g.sfxBus);

    const voice: SfxVoice = { source, gain, tail };
    const owner = list;
    list.push(voice);
    source.onended = () => {
      const i = owner.indexOf(voice);
      if (i >= 0) owner.splice(i, 1);
      tail.disconnect();
    };
    source.start();
  }

  /** Loops de corrida: 0 silencia; 0..1 é o volume. A mudança é sempre em rampa. */
  setLoop(id: LoopId, intensity: number): void {
    this.loopTargets.set(id, clamp01(intensity));
    this.syncLoop(id);
  }

  /** Pausa: silencia motor, loops e ambiência e abaixa a música. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    const g = this.graph;
    if (!g) return;
    this.ramp(g.raceBus.gain, paused ? 0 : 1, 0.04);
    this.ramp(g.ambPause.gain, paused ? 0 : 1, 0.08);
    this.ramp(g.musicDuck.gain, paused ? PAUSED_MUSIC_GAIN : 1, 0.12);
  }

  /** Fim de corrida/saída para o menu: para motor, loops, ambiência e efeitos em andamento (a música fica). */
  stopAllRaceSounds(): void {
    this.engineSynth.stop();
    this.engineSynth2.stop();
    this.engineSynth.setGain(1);
    this.engineSynth2.setGain(1);
    this.loopTargets.clear();
    for (const [id, loop] of this.loops) {
      this.fadeOutAndStop(loop.source, loop.gain, 0.08);
      this.loops.delete(id);
    }
    this.wantedAmbience = null;
    this.syncAmbience();
    for (const [id, list] of this.voices) {
      if (id.startsWith('ui_')) continue;
      for (const v of list.splice(0)) this.releaseVoice(v);
    }
    if (this.paused) this.setPaused(false);
  }

  // -------------------------------------------------------------------------------------------
  // Diagnóstico
  // -------------------------------------------------------------------------------------------

  /** Estado interno resumido (painel de depuração e testes). */
  debugState(): AudioDebugState {
    const g = this.graph;
    const sfxVoices: Partial<Record<SfxId, number>> = {};
    for (const [id, list] of this.voices) if (list.length) sfxVoices[id] = list.length;
    return {
      hasContext: g !== null,
      contextState: g ? g.ctx.state : null,
      unlocked: this.unlocked,
      paused: this.paused,
      volumes: { ...this.volumes },
      buses: g
        ? {
            music: g.musicBus.gain.value,
            sfx: g.sfxBus.gain.value,
            ambient: g.ambBus.gain.value,
            race: g.raceBus.gain.value,
            musicDuck: g.musicDuck.gain.value,
            ambientPause: g.ambPause.gain.value,
          }
        : null,
      wantedMusic: this.wantedMusic,
      playingMusic: this.music?.id ?? null,
      wantedAmbience: this.wantedAmbience,
      playingAmbience: this.ambience?.id ?? null,
      loadedFiles: this.buffers.size,
      sfxVoices,
      activeLoops: [...this.loops.keys()],
      engineRunning: this.engineSynth.running,
      engineActive: this.engineSynth.active,
    };
  }

  /** Usado pelo motor sintetizado: só há saída quando o áudio já pode tocar. */
  engineOutput(): { ctx: AudioContext; out: AudioNode } | null {
    const g = this.playable();
    return g ? { ctx: g.ctx, out: g.raceBus } : null;
  }

  // -------------------------------------------------------------------------------------------
  // Contexto e grafo
  // -------------------------------------------------------------------------------------------

  private ensureGraph(): Graph | null {
    if (this.graph) return this.graph;
    if (this.contextFailed) return null;
    const Ctor = contextCtor();
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      // Limitador de segurança: muitas vozes ao mesmo tempo não podem estourar a saída.
      if (typeof ctx.createDynamicsCompressor === 'function') {
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -4;
        limiter.knee.value = 4;
        limiter.ratio.value = 14;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.2;
        master.connect(limiter);
        limiter.connect(ctx.destination);
      } else {
        master.connect(ctx.destination);
      }
      const bus = (value: number, dest: AudioNode): GainNode => {
        const node = ctx.createGain();
        node.gain.value = value;
        node.connect(dest);
        return node;
      };
      const musicBus = bus(this.volumes.music, master);
      const sfxBus = bus(this.volumes.sfx, master);
      const ambBus = bus(this.volumes.ambient, master);
      const musicDuck = bus(this.paused ? PAUSED_MUSIC_GAIN : 1, musicBus);
      const raceBus = bus(this.paused ? 0 : 1, sfxBus);
      const ambPause = bus(this.paused ? 0 : 1, ambBus);
      this.graph = { ctx, master, musicBus, musicDuck, sfxBus, raceBus, ambBus, ambPause };
      // Se o navegador retomar o contexto mais tarde (ou depois de uma interrupção), toca o que estava pendente.
      if (typeof ctx.addEventListener === 'function') {
        ctx.addEventListener('statechange', () => {
          if (ctx.state === 'running') this.syncAll();
        });
      }
    } catch (err) {
      this.contextFailed = true;
      console.warn('[audio] não foi possível criar o AudioContext; o jogo seguirá sem som:', err);
      return null;
    }
    return this.graph;
  }

  /** Grafo pronto para emitir som (contexto existente e rodando). */
  private playable(): Graph | null {
    const g = this.graph;
    return g && g.ctx.state === 'running' ? g : null;
  }

  private ramp(param: AudioParam, value: number, timeConstant: number): void {
    const now = this.graph?.ctx.currentTime ?? 0;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, timeConstant);
  }

  private fadeOutAndStop(source: AudioBufferSourceNode, gain: GainNode, seconds: number): void {
    const now = this.graph?.ctx.currentTime ?? 0;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + seconds);
      source.stop(now + seconds + 0.02);
    } catch {
      // fonte já parada
    }
  }

  private releaseVoice(v: SfxVoice): void {
    this.fadeOutAndStop(v.source, v.gain, 0.03);
  }

  // -------------------------------------------------------------------------------------------
  // Carregamento
  // -------------------------------------------------------------------------------------------

  private async preloadAll(): Promise<void> {
    if (!this.ensureGraph()) return;
    const failures: string[] = [];
    const queue = [...ALL_AUDIO_FILES];
    const worker = async (): Promise<void> => {
      for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
        try {
          await this.load(file);
        } catch (err) {
          failures.push(errorText(err));
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    if (failures.length) {
      failures.sort();
      throw new Error(`Falha ao carregar ${failures.length} arquivo(s) de áudio: ${failures.join('; ')}`);
    }
    this.syncAll();
  }

  /** Carrega e decodifica um arquivo (com cache). O erro sempre nomeia o arquivo. */
  private load(file: string): Promise<AudioBuffer> {
    const ready = this.buffers.get(file);
    if (ready) return Promise.resolve(ready);
    let pending = this.loading.get(file);
    if (!pending) {
      pending = this.fetchAndDecode(file).finally(() => this.loading.delete(file));
      this.loading.set(file, pending);
    }
    return pending;
  }

  private async fetchAndDecode(file: string): Promise<AudioBuffer> {
    const g = this.ensureGraph();
    if (!g) throw new Error(`${file} (Web Audio indisponível)`);
    if (typeof fetch !== 'function') throw new Error(`${file} (fetch indisponível)`);
    // Ogg primeiro; se o navegador não decodificar (Safari antigo/iPhone), a cópia AAC em audio/aac/.
    const aac = file.endsWith('.ogg') ? file.replace(/^audio\//, 'audio/aac/').replace(/\.ogg$/, '.m4a') : null;
    const order = aac && this.preferAac ? [aac, file] : aac ? [file, aac] : [file];
    const reasons: string[] = [];
    for (const candidate of order) {
      const label = candidate === aac ? 'cópia AAC: ' : '';
      let data: ArrayBuffer;
      try {
        const res = await fetch(assetUrl(candidate));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.arrayBuffer();
      } catch (err) {
        reasons.push(`${label}${errorText(err)}`);
        continue;
      }
      try {
        const buffer = await decode(g.ctx, data);
        if (candidate === aac) this.preferAac = true;
        this.buffers.set(file, buffer);
        return buffer;
      } catch (err) {
        reasons.push(`${label}falha ao decodificar: ${errorText(err) || 'formato não suportado'}`);
      }
    }
    throw new Error(`${file} (${reasons.join('; ')})`);
  }

  /** Depois que um Ogg falha e o AAC funciona, os próximos arquivos vão direto ao AAC. */
  private preferAac = (() => {
    try {
      return typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs="vorbis"') === '';
    } catch {
      return false;
    }
  })();

  private loadInBackground(file: string, then?: () => void): void {
    this.load(file).then(
      () => then?.(),
      (err: unknown) => console.warn(`[audio] arquivo indisponível: ${errorText(err)}`),
    );
  }

  // -------------------------------------------------------------------------------------------
  // Sincronização entre o que foi pedido e o que está tocando
  // -------------------------------------------------------------------------------------------

  private syncAll(): void {
    this.syncMusic();
    this.syncAmbience();
    for (const id of this.loopTargets.keys()) this.syncLoop(id);
    this.engineSynth.resume();
    this.engineSynth2.resume();
  }

  private syncMusic(): void {
    const g = this.playable();
    if (!g) return; // toca no unlock()
    const want = this.wantedMusic;
    if ((this.music?.id ?? null) === want) return;
    const fade = this.musicFadeMs / 1000;
    if (want === null) {
      this.stopTrack(this.music, fade);
      this.music = null;
      return;
    }
    const buffer = this.buffers.get(musicFile(want));
    if (!buffer) {
      this.loadInBackground(musicFile(want), () => this.syncMusic());
      return;
    }
    this.stopTrack(this.music, fade);
    const loop = MUSIC_LOOPS[want];
    const track = this.startTrack(g, want, buffer, loop, MUSIC_GAIN[want], fade, g.musicDuck);
    this.music = track;
    if (!loop) {
      // Fanfarras tocam uma vez: ao terminar, deixam de ser a música pedida.
      const prev = track.source.onended;
      track.source.onended = (ev) => {
        prev?.call(track.source, ev);
        if (this.music === track) {
          this.music = null;
          if (this.wantedMusic === want) this.wantedMusic = null;
        }
      };
    }
  }

  private syncAmbience(): void {
    const g = this.playable();
    if (!g) return;
    const want = this.wantedAmbience;
    if ((this.ambience?.id ?? null) === want) return;
    if (want === null) {
      this.stopTrack(this.ambience, AMBIENCE_FADE_S);
      this.ambience = null;
      return;
    }
    const buffer = this.buffers.get(ambienceFile(want));
    if (!buffer) {
      this.loadInBackground(ambienceFile(want), () => this.syncAmbience());
      return;
    }
    this.stopTrack(this.ambience, AMBIENCE_FADE_S);
    this.ambience = this.startTrack(g, want, buffer, true, AMBIENCE_GAIN, AMBIENCE_FADE_S, g.ambPause);
  }

  private startTrack<Id>(g: Graph, id: Id, buffer: AudioBuffer, loop: boolean, level: number, fade: number, dest: AudioNode): Track<Id> {
    const { ctx } = g;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    if (fade > 0) {
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(level, now + fade);
    } else {
      gain.gain.value = level;
    }
    source.connect(gain);
    gain.connect(dest);
    source.onended = () => gain.disconnect();
    source.start();
    return { id, source, gain };
  }

  private stopTrack<Id>(track: Track<Id> | null, fade: number): void {
    if (track) this.fadeOutAndStop(track.source, track.gain, Math.max(0.02, fade));
  }

  private syncLoop(id: LoopId): void {
    const g = this.playable();
    if (!g) return;
    const target = this.loopTargets.get(id) ?? 0;
    let loop = this.loops.get(id);
    if (!loop) {
      if (target <= 0) return;
      const buffer = this.buffers.get(loopFile(id));
      if (!buffer) {
        this.loadInBackground(loopFile(id), () => this.syncLoop(id));
        return;
      }
      const source = g.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = g.ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(g.raceBus);
      source.onended = () => gain.disconnect();
      source.start();
      loop = { source, gain };
      this.loops.set(id, loop);
    }
    this.ramp(loop.gain.gain, target * LOOP_GAIN[id], 0.06);
  }
}

/** `decodeAudioData` com suporte à forma antiga (callbacks) e à nova (Promise). */
function decode(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    const fail = (err: unknown): void => reject(err instanceof Error ? err : new Error(String(err ?? 'erro desconhecido')));
    try {
      const maybe = ctx.decodeAudioData(data, resolve, fail) as Promise<AudioBuffer> | undefined;
      if (maybe && typeof maybe.then === 'function') maybe.then(resolve, fail);
    } catch (err) {
      fail(err);
    }
  });
}

/** Singleton usado pelo jogo inteiro. */
export const audio = new AudioManager();
