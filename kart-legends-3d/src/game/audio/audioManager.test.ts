import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager, audio } from './audioManager';
import { ALL_AUDIO_FILES, AMBIENCE_IDS, LOOP_IDS, MUSIC_IDS, SAMPLE_ONLY_SFX_IDS, SFX_IDS, sfxFiles } from './audioIds';

// ---------------------------------------------------------------------------------------------
// AudioContext falso mínimo: registra nós, conexões e fontes iniciadas.
// ---------------------------------------------------------------------------------------------

class FakeParam {
  constructor(public value = 0) {}
  setValueAtTime(v: number): this {
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number): this {
    this.value = v;
    return this;
  }
  setTargetAtTime(v: number): this {
    this.value = v;
    return this;
  }
  cancelScheduledValues(): this {
    return this;
  }
}

class FakeNode {
  outputs: unknown[] = [];
  constructor(readonly kind: string) {}
  connect(dest: unknown): unknown {
    this.outputs.push(dest);
    return dest;
  }
  disconnect(): void {
    this.outputs = [];
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam(1);
  constructor() {
    super('gain');
  }
}

class FakeSource extends FakeNode {
  buffer: unknown = null;
  loop = false;
  playbackRate = new FakeParam(1);
  frequency = new FakeParam(440);
  type = 'sine';
  started = false;
  stopped = false;
  onended: ((ev: unknown) => void) | null = null;
  constructor(kind: string, private readonly ctx: FakeAudioContext) {
    super(kind);
  }
  start(): void {
    this.started = true;
    this.ctx.started.push(this);
  }
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.onended?.({});
  }
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam(350);
  Q = new FakeParam(1);
  pan = new FakeParam(0);
  curve: Float32Array | null = null;
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  destination = new FakeNode('destination');
  started: FakeSource[] = [];
  decoded = 0;
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  async resume(): Promise<void> {
    this.state = 'running';
  }
  createGain(): FakeGain {
    return new FakeGain();
  }
  createBufferSource(): FakeSource {
    return new FakeSource('buffer', this);
  }
  createOscillator(): FakeSource {
    return new FakeSource('oscillator', this);
  }
  createStereoPanner(): FakeFilter {
    return new FakeFilter('panner');
  }
  createBiquadFilter(): FakeFilter {
    return new FakeFilter('biquad');
  }
  createWaveShaper(): FakeFilter {
    return new FakeFilter('shaper');
  }
  createDynamicsCompressor(): FakeFilter {
    return new FakeFilter('compressor');
  }
  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  async decodeAudioData(data: ArrayBuffer): Promise<{ duration: number; tag: number }> {
    this.decoded++;
    return { duration: 1, tag: data.byteLength };
  }
  /** Fontes de buffer que estão tocando agora. */
  playing(): FakeSource[] {
    return this.started.filter((s) => s.kind === 'buffer' && !s.stopped);
  }
}

/** Valores de ganho encontrados no caminho de um nó até a saída. */
function gainsToDestination(node: FakeNode): number[] {
  const found: number[] = [];
  const seen = new Set<unknown>();
  const walk = (n: unknown): void => {
    if (!(n instanceof FakeNode) || seen.has(n)) return;
    seen.add(n);
    if (n instanceof FakeGain) found.push(n.gain.value);
    n.outputs.forEach(walk);
  };
  walk(node);
  return found;
}

function installFetch(missing: string[] = []): ReturnType<typeof vi.fn> {
  const mock = vi.fn(async (url: string) => {
    if (missing.some((m) => url.endsWith(m))) return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(16) };
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

const ctxOf = (): FakeAudioContext => {
  const ctx = FakeAudioContext.instances.at(-1);
  if (!ctx) throw new Error('nenhum AudioContext foi criado');
  return ctx;
};

const VOLUMES = { music: 0.11, sfx: 0.22, ambient: 0.33 };

describe('audioManager com AudioContext falso', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);
    installFetch();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('cria o AudioContext de forma preguiçosa', () => {
    const m = new AudioManager();
    m.setVolumes(VOLUMES);
    m.playMusic('menu');
    m.sfx('ui_move');
    m.setLoop('drift', 1);
    m.engine.start();
    expect(FakeAudioContext.instances).toHaveLength(0);
    expect(m.debugState().hasContext).toBe(false);
  });

  it('preload busca todos os arquivos do contrato', async () => {
    const fetchMock = installFetch();
    const m = new AudioManager();
    await m.preload();
    // efeitos: o sintetizado e/ou as gravações CC0 que cada um toca (substituídos não são baixados)
    const sfxCount = [...SFX_IDS, ...SAMPLE_ONLY_SFX_IDS].reduce((n, id) => n + sfxFiles(id).length, 0);
    expect(ALL_AUDIO_FILES).toHaveLength(MUSIC_IDS.length + sfxCount + LOOP_IDS.length + AMBIENCE_IDS.length);
    expect(new Set(ALL_AUDIO_FILES).size).toBe(ALL_AUDIO_FILES.length);
    expect(ALL_AUDIO_FILES).toContain('audio/kenney/impactPlate_medium_000.ogg');
    expect(ALL_AUDIO_FILES).not.toContain('audio/sfx/collision.ogg');
    expect(fetchMock).toHaveBeenCalledTimes(ALL_AUDIO_FILES.length);
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.endsWith('assets/audio/music/race_eclipse.ogg'))).toBe(true);
    expect(urls.some((u) => u.endsWith('assets/audio/sfx/item_cristal.ogg'))).toBe(true);
    expect(urls.some((u) => u.endsWith('assets/audio/sfx/amb_storm.ogg'))).toBe(true);
    expect(m.debugState().loadedFiles).toBe(ALL_AUDIO_FILES.length);
    // Segunda chamada reaproveita a mesma carga.
    await m.preload();
    expect(fetchMock).toHaveBeenCalledTimes(ALL_AUDIO_FILES.length);
  });

  it('volumes separados chegam aos barramentos certos', async () => {
    const m = new AudioManager();
    m.setVolumes(VOLUMES); // antes de existir contexto: fica guardado
    await m.preload();
    await m.unlock();
    expect(m.debugState().buses).toMatchObject({ music: 0.11, sfx: 0.22, ambient: 0.33, race: 1 });

    const ctx = ctxOf();
    m.playMusic('menu', { fadeMs: 0 });
    const music = ctx.playing().at(-1)!;
    expect(music.loop).toBe(true);
    expect(gainsToDestination(music)).toContain(0.11);
    expect(gainsToDestination(music)).not.toContain(0.22);
    expect(gainsToDestination(music)).not.toContain(0.33);

    m.sfx('collision', { pan: -0.5 });
    const fx = ctx.playing().at(-1)!;
    expect(fx.outputs).toHaveLength(1);
    expect(gainsToDestination(fx)).toContain(0.22);
    expect(gainsToDestination(fx)).not.toContain(0.11);
    expect(gainsToDestination(fx)).not.toContain(0.33);

    m.playAmbience('sea');
    const amb = ctx.playing().at(-1)!;
    expect(amb.loop).toBe(true);
    expect(gainsToDestination(amb)).toContain(0.33);
    expect(gainsToDestination(amb)).not.toContain(0.11);
    expect(gainsToDestination(amb)).not.toContain(0.22);

    // Loops de corrida e motor vão pelo barramento de efeitos.
    m.setLoop('drift', 0.5);
    const loop = ctx.playing().at(-1)!;
    expect(loop.loop).toBe(true);
    expect(gainsToDestination(loop)).toContain(0.22);
    expect(gainsToDestination(loop)).not.toContain(0.11);
    m.engine.start();
    m.engine.update({ speed: 0.8, throttle: 1, boosting: true, airborne: false });
    const osc = ctx.started.find((s) => s.kind === 'oscillator')!;
    expect(osc).toBeDefined();
    expect(gainsToDestination(osc)).toContain(0.22);
    expect(gainsToDestination(osc)).not.toContain(0.11);

    // Mudar um volume não mexe nos outros.
    m.setVolumes({ music: 0.5, sfx: 0.22, ambient: 0.33 });
    expect(m.debugState().buses).toMatchObject({ music: 0.5, sfx: 0.22, ambient: 0.33 });
    m.setVolumes({ music: 5, sfx: -1, ambient: Number.NaN });
    expect(m.debugState().buses).toMatchObject({ music: 1, sfx: 0, ambient: 0 });
  });

  it('a intenção de música antes do unlock é tocada depois', async () => {
    const m = new AudioManager();
    await m.preload();
    const ctx = ctxOf();
    expect(ctx.state).toBe('suspended');

    m.playMusic('menu');
    m.playMusic('race_aurora'); // só a última intenção vale
    m.playAmbience('forest');
    expect(ctx.started).toHaveLength(0);
    expect(m.debugState()).toMatchObject({ wantedMusic: 'race_aurora', playingMusic: null });

    await m.unlock();
    expect(ctx.state).toBe('running');
    expect(m.debugState()).toMatchObject({ playingMusic: 'race_aurora', playingAmbience: 'forest', unlocked: true });
    expect(ctx.playing()).toHaveLength(2);
  });

  it('toca a música pedida mesmo que o unlock venha antes do preload', async () => {
    const m = new AudioManager();
    await m.unlock();
    m.playMusic('menu');
    expect(m.debugState().playingMusic).toBeNull();
    await vi.waitFor(() => expect(m.debugState().playingMusic).toBe('menu'));
  });

  it('troca de música faz crossfade e para a anterior', async () => {
    const m = new AudioManager();
    await m.preload();
    await m.unlock();
    const ctx = ctxOf();
    m.playMusic('menu');
    const first = ctx.playing().at(-1)!;
    m.playMusic('menu'); // mesma música: não reinicia
    expect(ctx.playing()).toHaveLength(1);
    m.playMusic('victory');
    expect(first.stopped).toBe(true);
    const fanfare = ctx.playing().at(-1)!;
    expect(fanfare.loop).toBe(false);
    expect(m.debugState().playingMusic).toBe('victory');
    // A fanfarra termina sozinha e deixa de ser a música atual.
    fanfare.stop();
    expect(m.debugState()).toMatchObject({ playingMusic: null, wantedMusic: null });
    m.playMusic(null);
    expect(ctx.playing()).toHaveLength(0);
  });

  it('sem o Ogg (Safari), usa a cópia AAC e passa a pedir AAC primeiro', async () => {
    const fetchMock = installFetch(['audio/music/menu.ogg']);
    const m = new AudioManager();
    await m.preload();
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.endsWith('audio/aac/music/menu.m4a'))).toBe(true);
  });

  it('preload rejeita listando os arquivos ausentes', async () => {
    installFetch(['audio/sfx/finish.ogg', 'audio/music/menu.ogg', 'audio/aac/sfx/finish.m4a', 'audio/aac/music/menu.m4a']);
    const m = new AudioManager();
    const err = await m.preload().then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(Error);
    const message = (err as Error).message;
    expect(message).toContain('2 arquivo(s)');
    expect(message).toContain('audio/sfx/finish.ogg');
    expect(message).toContain('audio/music/menu.ogg');
    expect(message).toContain('404');
    expect(message).not.toContain('audio/sfx/land.ogg');

    // Com os arquivos de volta, uma nova tentativa funciona e só busca o que faltou.
    const retry = installFetch();
    await expect(m.preload()).resolves.toBeUndefined();
    expect(retry).toHaveBeenCalledTimes(2);
  });

  it('preload rejeita quando a decodificação falha', async () => {
    const m = new AudioManager();
    vi.spyOn(FakeAudioContext.prototype, 'decodeAudioData').mockRejectedValue(new Error('formato ruim'));
    await expect(m.preload()).rejects.toThrow(/falha ao decodificar: formato ruim/);
  });

  it('limita a polifonia por efeito', async () => {
    const m = new AudioManager();
    await m.preload();
    await m.unlock();
    const ctx = ctxOf();
    for (let i = 0; i < 12; i++) m.sfx('collision');
    expect(ctx.started.filter((s) => s.kind === 'buffer')).toHaveLength(12);
    expect(ctx.playing()).toHaveLength(3);
    expect(m.debugState().sfxVoices.collision).toBe(3);

    for (let i = 0; i < 5; i++) m.sfx('countdown_beep');
    expect(m.debugState().sfxVoices.countdown_beep).toBe(1);
    // Ids diferentes têm contagens independentes.
    expect(m.debugState().sfxVoices.collision).toBe(3);

    // Uma voz que termina libera a vaga.
    ctx.playing()[0].stop();
    expect(m.debugState().sfxVoices.collision).toBe(2);
  });

  it('aplica rate, volume e variação de pitch', async () => {
    const m = new AudioManager();
    await m.preload();
    await m.unlock();
    const ctx = ctxOf();
    m.sfx('ui_select', { rate: 1.5, volume: 0.5 });
    const fixed = ctx.playing().at(-1)!;
    expect(fixed.playbackRate.value).toBe(1.5);
    expect(fixed.outputs).toHaveLength(1);
    vi.spyOn(Math, 'random').mockReturnValue(1);
    m.sfx('collision');
    const varied = ctx.playing().at(-1)!;
    expect(varied.playbackRate.value).toBeGreaterThan(1);
    expect(varied.playbackRate.value).toBeLessThan(1.15);
    m.sfx('ui_move'); // sem variação configurada
    expect(ctx.playing().at(-1)!.playbackRate.value).toBe(1);
  });

  it('setPaused silencia a corrida e abaixa a música; stopAllRaceSounds limpa tudo menos a música', async () => {
    const m = new AudioManager();
    await m.preload();
    await m.unlock();
    const ctx = ctxOf();
    m.playMusic('race_eclipse', { fadeMs: 0 });
    m.playAmbience('storm');
    m.setLoop('drift', 1);
    m.setLoop('wind_speed', 0.4);
    m.engine.start();
    m.sfx('turbo_3');
    m.sfx('ui_move');

    m.setPaused(true);
    let s = m.debugState();
    expect(s.buses).toMatchObject({ race: 0, ambientPause: 0 });
    expect(s.buses!.musicDuck).toBeGreaterThan(0);
    expect(s.buses!.musicDuck).toBeLessThan(1);
    m.setPaused(false);
    expect(m.debugState().buses).toMatchObject({ race: 1, ambientPause: 1, musicDuck: 1 });

    m.setPaused(true);
    m.stopAllRaceSounds();
    s = m.debugState();
    expect(s).toMatchObject({ playingMusic: 'race_eclipse', playingAmbience: null, engineRunning: false, engineActive: false, paused: false });
    expect(s.activeLoops).toEqual([]);
    expect(s.sfxVoices.turbo_3).toBeUndefined();
    expect(s.sfxVoices.ui_move).toBe(1);
    expect(s.buses).toMatchObject({ race: 1, musicDuck: 1 });
    expect(ctx.started.filter((x) => x.kind === 'oscillator').every((x) => x.stopped)).toBe(true);
  });

  it('setLoop usa rampa e não inicia fonte com intensidade zero', async () => {
    const m = new AudioManager();
    await m.preload();
    await m.unlock();
    const ctx = ctxOf();
    m.setLoop('brake', 0);
    expect(ctx.playing()).toHaveLength(0);
    m.setLoop('brake', 1);
    m.setLoop('brake', 0.25);
    expect(ctx.playing()).toHaveLength(1);
    const gain = ctx.playing()[0].outputs[0] as FakeGain;
    expect(gain.gain.value).toBeGreaterThan(0);
    expect(gain.gain.value).toBeLessThan(0.25);
    m.setLoop('brake', 0);
    expect(gain.gain.value).toBe(0);
  });

  it('motor pedido antes do unlock liga depois, e a frequência sobe com a velocidade', async () => {
    const m = new AudioManager();
    m.engine.start();
    expect(m.debugState()).toMatchObject({ engineRunning: true, engineActive: false });
    await m.unlock();
    expect(m.debugState().engineActive).toBe(true);
    const ctx = ctxOf();
    const saw = ctx.started.find((s) => s.kind === 'oscillator' && s.type === 'sawtooth')!;
    const idle = saw.frequency.value;
    for (let i = 0; i < 200; i++) m.engine.update({ speed: 1, throttle: 1, boosting: false, airborne: false });
    const fast = saw.frequency.value;
    expect(fast).toBeGreaterThan(idle * 2.5);
    for (let i = 0; i < 200; i++) m.engine.update({ speed: 1, throttle: 1, boosting: false, airborne: true });
    expect(saw.frequency.value).toBeGreaterThan(fast * 1.05);
    // Suavização: um único update não salta direto para o alvo.
    m.engine.stop();
    m.engine.start();
    const saw2 = ctx.started.filter((s) => s.kind === 'oscillator' && s.type === 'sawtooth')[3];
    m.engine.update({ speed: 1.3, throttle: 1, boosting: true, airborne: false });
    expect(saw2.frequency.value).toBeLessThan(fast * 0.6);
  });
});

describe('audioManager sem Web Audio', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('todos os métodos são no-op e preload resolve', async () => {
    const fetchMock = installFetch();
    for (const m of [audio, new AudioManager()]) {
      await expect(m.unlock()).resolves.toBeUndefined();
      await expect(m.preload()).resolves.toBeUndefined();
      expect(() => {
        m.setVolumes({ music: 0.5, sfx: 0.5, ambient: 0.5 });
        m.playMusic('menu', { fadeMs: 100 });
        m.playAmbience('city');
        m.sfx('ui_select', { volume: 1, rate: 1.1, pan: 0.3 });
        m.setLoop('offroad', 0.7);
        m.engine.start();
        m.engine.update({ speed: 1.3, throttle: 1, boosting: true, airborne: true });
        m.engine.stop();
        m.setPaused(true);
        m.setPaused(false);
        m.stopAllRaceSounds();
        m.playMusic(null);
        m.playAmbience(null);
      }).not.toThrow();
      expect(m.debugState()).toMatchObject({ hasContext: false, buses: null, playingMusic: null });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
