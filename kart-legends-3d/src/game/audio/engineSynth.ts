/**
 * Motor do kart sintetizado em tempo real (Web Audio): duas serras + quadrada + sub senoidal +
 * ruído filtrado, passando por saturação leve e passa-baixas. Rotação e brilho sobem com a velocidade,
 * a carga acompanha o acelerador e o turbo acrescenta uma camada aguda.
 */

export interface EngineParams {
  /** 0..1.3 (1 = velocidade máxima normal; acima disso, turbo). */
  speed: number;
  throttle: number;
  boosting: boolean;
  airborne: boolean;
}

/** O que o motor precisa do gerenciador: contexto pronto e nó de saída (barramento de corrida). */
export interface EngineHost {
  engineOutput(): { ctx: AudioContext; out: AudioNode } | null;
}

interface EngineNodes {
  ctx: AudioContext;
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  oscC: OscillatorNode;
  sub: OscillatorNode;
  chug: OscillatorNode;
  boostOsc: OscillatorNode;
  noise: AudioBufferSourceNode;
  gainC: GainNode;
  noiseBand: BiquadFilterNode;
  noiseGain: GainNode;
  boostGain: GainNode;
  boostNoiseGain: GainNode;
  chugDepth: GainNode;
  lowpass: BiquadFilterNode;
  out: GainNode;
}

const ENGINE_VOLUME = 0.2;
const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 0x2f6e2b1;
  for (let i = 0; i < len; i++) {
    // LCG simples: o ruído do motor não precisa de qualidade estatística.
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 2147483648 - 1;
  }
  return buf;
}

function makeDriveCurve(): Float32Array<ArrayBuffer> {
  const n = 257;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2);
  }
  return curve;
}

export class EngineSynth {
  private nodes: EngineNodes | null = null;
  private wanted = false;
  // Estado suavizado (evita degraus quando a simulação muda de valor bruscamente).
  private speed = 0;
  private throttle = 0;
  private boost = 0;
  private air = 0;
  private lastTime = -1;

  constructor(private readonly host: EngineHost) {}

  /** Indica se o jogo pediu o motor ligado (mesmo que o áudio ainda não esteja destravado). */
  get running(): boolean {
    return this.wanted;
  }

  /** Há nós de áudio ativos? (diagnóstico/testes) */
  get active(): boolean {
    return this.nodes !== null;
  }

  start(): void {
    this.wanted = true;
    this.resume();
  }

  /** Constrói o grafo se o motor foi pedido e o áudio já pode tocar. Chamado também no unlock. */
  resume(): void {
    if (!this.wanted || this.nodes) return;
    const host = this.host.engineOutput();
    if (!host) return;
    try {
      this.nodes = this.build(host.ctx, host.out);
      this.lastTime = -1;
      this.apply(0.02);
    } catch (err) {
      this.nodes = null;
      console.warn('[audio] não foi possível iniciar o motor sintetizado:', err);
    }
  }

  update(p: EngineParams): void {
    if (!this.nodes) return;
    const now = this.nodes.ctx.currentTime;
    const dt = this.lastTime < 0 ? 1 / 60 : clamp(now - this.lastTime, 1 / 240, 0.1);
    this.lastTime = now;
    const follow = (cur: number, to: number, tau: number): number => cur + (to - cur) * (1 - Math.exp(-dt / tau));
    const speedTarget = clamp(p.speed, 0, 1.3);
    this.speed = follow(this.speed, speedTarget, speedTarget > this.speed ? 0.14 : 0.22);
    this.throttle = follow(this.throttle, clamp(p.throttle, 0, 1), 0.09);
    this.boost = follow(this.boost, p.boosting ? 1 : 0, 0.1);
    this.air = follow(this.air, p.airborne ? 1 : 0, 0.12);
    this.apply(0.035);
  }

  stop(): void {
    this.wanted = false;
    const n = this.nodes;
    if (!n) return;
    this.nodes = null;
    this.speed = 0;
    this.throttle = 0;
    this.boost = 0;
    this.air = 0;
    const now = n.ctx.currentTime;
    try {
      n.out.gain.cancelScheduledValues(now);
      n.out.gain.setTargetAtTime(0, now, 0.04);
      for (const src of [n.oscA, n.oscB, n.oscC, n.sub, n.chug, n.boostOsc, n.noise]) src.stop(now + 0.3);
    } catch {
      // nós já parados
    }
    n.oscA.onended = () => n.out.disconnect();
  }

  private build(ctx: AudioContext, dest: AudioNode): EngineNodes {
    const mix = ctx.createGain();
    mix.gain.value = 0.8;
    const osc = (type: OscillatorType, gain: number): { osc: OscillatorNode; gain: GainNode } => {
      const o = ctx.createOscillator();
      o.type = type;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g);
      g.connect(mix);
      return { osc: o, gain: g };
    };
    const a = osc('sawtooth', 0.34);
    const b = osc('square', 0.2);
    const c = osc('sawtooth', 0.1);
    const sub = osc('sine', 0.4);

    const noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer(ctx);
    noise.loop = true;
    const noiseBand = ctx.createBiquadFilter();
    noiseBand.type = 'bandpass';
    noiseBand.Q.value = 0.9;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.05;
    noise.connect(noiseBand);
    noiseBand.connect(noiseGain);
    noiseGain.connect(mix);

    // "Chug": modulação de amplitude na frequência de explosão, que dá o caráter de motor pequeno.
    const chug = ctx.createOscillator();
    chug.type = 'sine';
    const chugDepth = ctx.createGain();
    chugDepth.gain.value = 0.25;
    chug.connect(chugDepth);
    chugDepth.connect(mix.gain);

    const drive = ctx.createWaveShaper();
    drive.curve = makeDriveCurve();
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.Q.value = 1.3;
    const out = ctx.createGain();
    out.gain.value = 0;
    mix.connect(drive);
    drive.connect(lowpass);
    lowpass.connect(out);

    // Camada de turbo: serra aguda + chiado, fora do passa-baixas principal.
    const boostOsc = ctx.createOscillator();
    boostOsc.type = 'sawtooth';
    const boostHp = ctx.createBiquadFilter();
    boostHp.type = 'highpass';
    boostHp.frequency.value = 900;
    const boostGain = ctx.createGain();
    boostGain.gain.value = 0;
    boostOsc.connect(boostHp);
    boostHp.connect(boostGain);
    boostGain.connect(out);
    const boostNoiseHp = ctx.createBiquadFilter();
    boostNoiseHp.type = 'highpass';
    boostNoiseHp.frequency.value = 3200;
    const boostNoiseGain = ctx.createGain();
    boostNoiseGain.gain.value = 0;
    noise.connect(boostNoiseHp);
    boostNoiseHp.connect(boostNoiseGain);
    boostNoiseGain.connect(out);

    out.connect(dest);
    for (const src of [a.osc, b.osc, c.osc, sub.osc, chug, boostOsc, noise]) src.start();
    return {
      ctx, oscA: a.osc, oscB: b.osc, oscC: c.osc, sub: sub.osc, chug, boostOsc, noise, gainC: c.gain,
      noiseBand, noiseGain, boostGain, boostNoiseGain, chugDepth, lowpass, out,
    };
  }

  /** Converte o estado suavizado em parâmetros de áudio, com rampa curta. */
  private apply(tc: number): void {
    const n = this.nodes;
    if (!n) return;
    const now = n.ctx.currentTime;
    const set = (param: AudioParam, value: number): void => {
      param.setTargetAtTime(value, now, tc);
    };
    const s = this.speed;
    const sn = clamp(s / 1.3, 0, 1);
    // Rotação: marcha lenta ~46 Hz; sobe com a velocidade; alivia sem acelerador; sobe no ar e no turbo.
    const freq = (46 + 150 * s ** 0.85) * (0.93 + 0.07 * this.throttle) * (1 + 0.12 * this.air) * (1 + 0.06 * this.boost);
    set(n.oscA.frequency, freq);
    set(n.oscB.frequency, freq * 0.502);
    set(n.oscC.frequency, freq * 2.01);
    set(n.sub.frequency, freq * 0.5);
    set(n.chug.frequency, freq * 0.5);
    set(n.boostOsc.frequency, freq * 4.03);
    set(n.gainC.gain, 0.06 + 0.2 * sn);
    set(n.chugDepth.gain, 0.3 - 0.18 * sn);
    set(n.noiseBand.frequency, 500 + 2200 * sn);
    set(n.noiseGain.gain, 0.04 + 0.14 * sn + 0.05 * this.throttle);
    set(n.lowpass.frequency, 420 + 2500 * sn + 1300 * this.throttle + 1600 * this.boost);
    set(n.boostGain.gain, 0.16 * this.boost);
    set(n.boostNoiseGain.gain, 0.22 * this.boost);
    set(n.out.gain, ENGINE_VOLUME * (0.5 + 0.32 * this.throttle + 0.18 * sn));
  }
}
