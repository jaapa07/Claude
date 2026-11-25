import { Howl, Howler } from 'howler';
import { A } from './Assets';
import { settings } from './Save';

type Music = 'menu' | 'select' | 'halftime' | 'fire' | 'victory';
const SFX = ['kick_soft', 'kick', 'kick_hard', 'bounce', 'post', 'net', 'tackle', 'body', 'catch', 'step1', 'step2', 'ui_move', 'ui_ok', 'ui_back',
  'ui_error', 'ui_tick', 'ui_pop', 'style', 'combo', 'fire_on', 'whistle_short', 'whistle_long', 'whistle_end', 'whistle_foul', 'sand_run'] as const;
export type Sfx = (typeof SFX)[number];

/** Áudio: músicas com crossfade, efeitos, camadas de torcida e ambiente de praia. */
class AudioSys {
  private music = new Map<string, Howl>();
  private sfx = new Map<string, Howl>();
  private crowdLoop?: Howl;
  private waves: Howl[] = [];
  private gulls: Howl[] = [];
  private crowdFx = new Map<string, Howl>();
  current?: Music;
  private currentId = 0;
  private crowdLevel = 0.4;
  private ambTimer = 0;

  init() {
    for (const m of ['menu', 'select', 'halftime', 'fire', 'victory'] as Music[]) {
      this.music.set(m, new Howl({ src: [A(`audio/music/${m}.mp3`)], loop: m !== 'victory', volume: 0, html5: false, preload: m === 'menu' }));
    }
    for (const s of SFX) this.sfx.set(s, new Howl({ src: [A(`audio/sfx/${s}.mp3`)], volume: 0.8 }));
    this.crowdLoop = new Howl({ src: [A('audio/crowd/ambience.mp3')], loop: true, volume: 0 });
    for (const c of ['ooh', 'applause', 'goal']) this.crowdFx.set(c, new Howl({ src: [A(`audio/crowd/${c}.mp3`)], volume: 0.8 }));
    this.waves = [1, 2].map((i) => new Howl({ src: [A(`audio/ambient/waves${i}.mp3`)], volume: 0.3 }));
    this.gulls = [1, 2].map((i) => new Howl({ src: [A(`audio/ambient/gull${i}.mp3`)], volume: 0.25 }));
  }

  get vm() { return settings.data.music; }
  get vs() { return settings.data.sfx; }
  get vc() { return settings.data.crowd; }

  playMusic(m: Music | null, fade = 900) {
    if (m === this.current) return;
    const old = this.current ? this.music.get(this.current) : undefined;
    if (old) { const id = this.currentId; old.fade(old.volume(id) as number, 0, fade, id); setTimeout(() => old.stop(id), fade + 50); }
    this.current = m ?? undefined;
    if (!m) return;
    const h = this.music.get(m)!;
    if (h.state() === 'unloaded') h.load();
    this.currentId = h.play();
    h.volume(0, this.currentId);
    h.fade(0, 0.55 * this.vm, fade, this.currentId);
  }

  refreshVolumes() {
    if (this.current) this.music.get(this.current)!.volume(0.55 * this.vm, this.currentId);
    this.crowdLoop?.volume(this.crowdLevel * 0.6 * this.vc);
  }

  play(s: Sfx, vol = 1, rate = 1) {
    const h = this.sfx.get(s);
    if (!h) return;
    const id = h.play();
    h.volume(Math.min(1, vol * this.vs), id);
    h.rate(rate * (0.94 + Math.random() * 0.12), id);
  }

  crowd(on: boolean) {
    if (!this.crowdLoop) return;
    if (on && !this.crowdLoop.playing()) { this.crowdLoop.play(); this.crowdLoop.fade(0, this.crowdLevel * 0.6 * this.vc, 1500); }
    if (!on && this.crowdLoop.playing()) { this.crowdLoop.fade(this.crowdLoop.volume(), 0, 800); setTimeout(() => this.crowdLoop?.stop(), 850); }
  }
  /** Intensidade 0..1 da torcida (sobe perto do gol). */
  setCrowd(level: number) {
    this.crowdLevel += (level - this.crowdLevel) * 0.05;
    if (this.crowdLoop?.playing()) this.crowdLoop.volume(Math.min(1, this.crowdLevel * 0.6 * this.vc));
  }
  crowdReact(k: 'ooh' | 'applause' | 'goal', vol = 1) {
    const h = this.crowdFx.get(k)!;
    const id = h.play();
    h.volume(Math.min(1, vol * this.vc), id);
  }

  /** Ondas e gaivotas de vez em quando. */
  ambient(dt: number, enabled: boolean) {
    if (!enabled) return;
    this.ambTimer -= dt;
    if (this.ambTimer <= 0) {
      this.ambTimer = 3 + Math.random() * 5;
      const w = this.waves[(Math.random() * this.waves.length) | 0];
      w.volume(0.18 * this.vs); w.play();
      if (Math.random() < 0.35) { const g = this.gulls[(Math.random() * this.gulls.length) | 0]; g.volume(0.15 * this.vs); g.play(); }
    }
  }

  unlock() { if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume(); }
}

export const audio = new AudioSys();
