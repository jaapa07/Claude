import { Howl, Howler } from 'howler';

type Channel = 'music' | 'sfx' | 'voice' | 'crowd';

const MUSIC = new Set(['music_menu', 'music_match', 'music_victory']);
const LOOPS = new Set(['music_menu', 'music_match', 'crowd_ambience']);

class AudioManager {
  private sounds = new Map<string, Howl>();
  volume: Record<Channel, number> = { music: 0.55, sfx: 0.9, voice: 1, crowd: 0.7 };
  private currentMusic: { name: string; id: number } | null = null;
  private ambience: number | null = null;

  async init() {
    const manifest: Record<string, string> = await (await fetch('assets/audio/manifest.json')).json();
    for (const [name, url] of Object.entries(manifest)) {
      this.sounds.set(name, new Howl({ src: [url], loop: LOOPS.has(name), preload: true, html5: MUSIC.has(name) }));
    }
  }

  channelOf(name: string): Channel {
    if (name.startsWith('music_')) return 'music';
    if (name.startsWith('ump_') || name.startsWith('vo_')) return 'voice';
    if (name.startsWith('crowd_') || name === 'applause') return 'crowd';
    return 'sfx';
  }

  play(name: string, opts: { vol?: number; rate?: number; pan?: number } = {}): number | null {
    const s = this.sounds.get(name);
    if (!s) return null;
    const id = s.play();
    s.volume((opts.vol ?? 1) * this.volume[this.channelOf(name)], id);
    if (opts.rate) s.rate(opts.rate, id);
    if (opts.pan !== undefined) s.stereo(Math.max(-1, Math.min(1, opts.pan)), id);
    return id;
  }

  music(name: string | null, fade = 800) {
    if (this.currentMusic?.name === name) return;
    if (this.currentMusic) {
      const old = this.sounds.get(this.currentMusic.name)!;
      const oid = this.currentMusic.id;
      old.fade(old.volume(oid) as number, 0, fade, oid);
      setTimeout(() => old.stop(oid), fade + 50);
      this.currentMusic = null;
    }
    if (!name) return;
    const s = this.sounds.get(name);
    if (!s) return;
    const id = s.play();
    s.volume(0, id);
    s.fade(0, this.volume.music, fade, id);
    this.currentMusic = { name, id };
  }

  crowdAmbience(on: boolean, level = 0.35) {
    const s = this.sounds.get('crowd_ambience');
    if (!s) return;
    if (on && this.ambience === null) {
      this.ambience = s.play();
      s.volume(level * this.volume.crowd, this.ambience);
    } else if (!on && this.ambience !== null) {
      s.stop(this.ambience);
      this.ambience = null;
    } else if (on && this.ambience !== null) {
      s.fade(s.volume(this.ambience) as number, level * this.volume.crowd, 600, this.ambience);
    }
  }

  setVolume(ch: Channel, v: number) {
    this.volume[ch] = v;
    if (ch === 'music' && this.currentMusic) this.sounds.get(this.currentMusic.name)!.volume(v, this.currentMusic.id);
  }

  setRateAll(rate: number) {
    // used by slow-motion replays
    for (const [n, s] of this.sounds) if (!MUSIC.has(n)) s.rate(rate);
  }

  unlock() {
    if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume();
  }
}

export const Audio = new AudioManager();
