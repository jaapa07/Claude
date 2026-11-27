#!/usr/bin/env node
// Turns the raw downloads in .asset-cache/ into optimized, game-ready files in public/assets/.
// Run after `npm run fetch-assets`.  Idempotent.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, simplify, weld, resample, quantize, unpartition } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = process.cwd();
const CACHE = process.env.ASSET_CACHE || join(ROOT, '.asset-cache');
const OUT = join(ROOT, 'public', 'assets');
const only = process.argv[2];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const md = (p) => (mkdirSync(p, { recursive: true }), p);
const step = (name) => !only || only === name;

const Q = join(CACHE, 'quaternius');
const ual1 = join(Q, 'Universal Animation Library[Standard]/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb');
const ual2 = join(Q, 'Universal Animation Library 2[Standard]/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb');
const UBC = join(Q, 'Universal Base Characters[Standard]/Universal Base Characters[Standard]');
const baseDir = join(UBC, 'Base Characters/Godot - UE');
const hairDir = join(UBC, 'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)');

// Quaternius ships glTFs that reference "<name>_png.png" files that do not exist; create them.
function fixPngSuffix(dir) {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.png') || f.endsWith('_png.png')) continue;
    const alt = join(dir, f.replace(/\.png$/, '_png.png'));
    if (!existsSync(alt)) copyFileSync(join(dir, f), alt);
  }
}

async function compressTextures(doc, size, quality = 85) {
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality }));
}

// ---------------------------------------------------------------- characters
if (step('characters')) {
  console.log('characters');
  fixPngSuffix(baseDir);
  fixPngSuffix(hairDir);
  md(join(OUT, 'models'));
  for (const [src, dst, tex] of [
    ['Superhero_Male_FullBody.gltf', 'athlete_m.glb', 2048],
    ['Superhero_Female_FullBody.gltf', 'athlete_f.glb', 2048],
  ]) {
    const doc = await io.read(join(baseDir, src));
    for (const a of doc.getRoot().listAnimations()) a.dispose();
    await doc.transform(prune(), dedup());
    await compressTextures(doc, tex);
    await io.write(join(OUT, 'models', dst), doc);

    // low-poly crowd variant
    const crowd = await io.read(join(baseDir, src));
    for (const a of crowd.getRoot().listAnimations()) a.dispose();
    for (const n of crowd.getRoot().listNodes()) if (/Eyebrows|Eyes/i.test(n.getName()) && n.getMesh()) { n.getMesh().dispose(); n.setMesh(null); }
    await MeshoptSimplifier.ready;
    await crowd.transform(prune(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.1, error: 0.01, lockBorder: true }), prune());
    await compressTextures(crowd, 256, 70);
    await io.write(join(OUT, 'models', dst.replace('athlete', 'crowd')), crowd);
  }
  for (const h of ['Hair_SimpleParted', 'Hair_Long', 'Hair_Buns', 'Hair_Buzzed', 'Hair_BuzzedFemale', 'Hair_Beard']) {
    const doc = await io.read(join(hairDir, h + '.gltf'));
    await doc.transform(prune(), dedup());
    await compressTextures(doc, 512);
    await io.write(join(OUT, 'models', h.toLowerCase() + '.glb'), doc);
  }
}

// ---------------------------------------------------------------- animations
// Clip name in source -> name used by the game.
const CLIPS = {
  Idle_Loop: 'idle',
  Jog_Fwd_Loop: 'run',
  Sprint_Loop: 'sprint',
  Walk_Loop: 'walk',
  Crouch_Idle_Loop: 'ready',
  Sword_Regular_A: 'forehand',
  Sword_Regular_B: 'backhand',
  Sword_Attack: 'smash',
  Melee_Hook: 'volley',
  OverhandThrow: 'serve',
  Slide_Start: 'dive',
  Slide_Exit: 'dive_up',
  Roll: 'roll',
  Yes: 'cheer',
  Dance_Loop: 'dance',
  Idle_No_Loop: 'upset',
  Hit_Chest: 'frustrated',
  Idle_FoldArms_Loop: 'arms_folded',
  Sitting_Idle_Loop: 'sit',
  Sitting_Talking_Loop: 'sit_talk',
  Idle_Talking_Loop: 'talk',
  PickUp_Table: 'pickup',
  Spell_Simple_Shoot: 'point',
  Jump_Start: 'jump',
  Jump_Land: 'land',
  Interact: 'interact',
  Punch_Cross: 'fist_pump',
  Idle_Rail_Call: 'call',
  Sword_Regular_A_Rec: 'x_a_rec',
  Sword_Regular_B_Rec: 'x_b_rec',
  Sword_Regular_C: 'x_c',
  Melee_Hook_Rec: 'x_hook_rec',
  Sword_Dash: 'x_dash',
  Shield_Dash: 'x_shield_dash',
  Sword_Block: 'x_block',
  Sword_Regular_Combo: 'x_combo',
  Spell_Simple_Enter: 'x_spell_enter',
  Punch_Jab: 'x_jab',
  NinjaJump_Start: 'x_ninja',
  Idle_Shield_Break: 'x_shield_break',
  Shield_OneShot: 'x_shield_one',
};
if (step('anims')) {
  console.log('animations');
  const a = await io.read(ual1);
  const b = await io.read(ual2);
  // move UAL2 clips into UAL1 doc by rebinding channels to same-named nodes
  const byName = new Map(a.getRoot().listNodes().map((n) => [n.getName(), n]));
  const { mergeDocuments } = await import('@gltf-transform/functions');
  const map = mergeDocuments(a, b);
  for (const anim of a.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const t = ch.getTargetNode();
      if (t && byName.get(t.getName()) && byName.get(t.getName()) !== t) ch.setTargetNode(byName.get(t.getName()));
    }
  }
  void map;
  for (const anim of a.getRoot().listAnimations()) {
    const n = CLIPS[anim.getName()];
    if (!n) anim.dispose();
    else anim.setName(n);
  }
  // strip meshes, keep skeleton
  for (const n of a.getRoot().listNodes()) if (n.getMesh()) n.setMesh(null);
  for (const s of a.getRoot().listScenes()) if (s !== a.getRoot().listScenes()[0]) s.dispose();
  await a.transform(prune({ keepLeaves: true }), resample(), unpartition());
  await io.write(join(OUT, 'models', 'anims.glb'), a);
}

// ---------------------------------------------------------------- textures
const ACG = {
  Grass005: 'grass', Ground037: 'worn', Clay005: 'clay', Asphalt031: 'hard', Carpet016: 'carpet',
  Concrete034: 'concrete', Metal032: 'metal', Wood049: 'wood', Fabric026: 'fabric', Plastic010: 'plastic',
};
if (step('textures')) {
  console.log('textures');
  const out = md(join(OUT, 'textures'));
  for (const [id, name] of Object.entries(ACG)) {
    const dir = join(CACHE, 'ambientcg', id);
    for (const [suffix, key] of [['Color', 'color'], ['NormalGL', 'normal'], ['Roughness', 'rough']]) {
      const f = readdirSync(dir).find((x) => x.endsWith(`_${suffix}.jpg`));
      if (!f) continue;
      await sharp(join(dir, f)).resize(1024, 1024).webp({ quality: 82 }).toFile(join(out, `${name}_${key}.webp`));
    }
  }
  md(join(OUT, 'hdri'));
  for (const f of readdirSync(join(CACHE, 'hdri'))) copyFileSync(join(CACHE, 'hdri', f), join(OUT, 'hdri', f));
}

// ---------------------------------------------------------------- props (Poly Haven)
if (step('props')) {
  console.log('props');
  const out = md(join(OUT, 'models', 'props'));
  for (const id of readdirSync(join(CACHE, 'polyhaven'))) {
    const dir = join(CACHE, 'polyhaven', id);
    const g = readdirSync(dir).find((f) => f.endsWith('.gltf'));
    const doc = await io.read(join(dir, g));
    await MeshoptSimplifier.ready;
    await doc.transform(prune(), dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.002 }));
    await compressTextures(doc, 512, 80);
    await io.write(join(out, id + '.glb'), doc);
  }
}

// ---------------------------------------------------------------- audio
const A = join(CACHE, 'audio');
const AUDIO = {
  // racket & ball
  'hit_hard': ['thwack-1.0/PCM/thwack-03.wav'],
  'hit_mid': ['thwack-1.0/PCM/thwack-06.wav'],
  'hit_soft': ['thwack-1.0/PCM/thwack-09.wav'],
  'hit_pop': ['pingpongbat.ogg'],
  'bounce': ['pingpongboard.ogg'],
  'net': ['100-CC0-SFX_0/hit_02.ogg'],
  'swish1': ['swishes/swishes/swish-1.wav'],
  'swish2': ['swishes/swishes/swish-4.wav'],
  'swish3': ['swishes/swishes/swish-9.wav'],
  'camera': ['photo.ogg'],
  // crowd
  'crowd_ambience': ['gregor_quendel_-_free_crowd_cheering_sounds_-_mp3/Gregor Quendel - Free Crowd Cheering Sounds - MP3/Gregor Quendel - Crowd Cheering Sounds - 10 - Ambience.mp3'],
  'crowd_cheer_big': ['gregor_quendel_-_free_crowd_cheering_sounds_-_mp3/Gregor Quendel - Free Crowd Cheering Sounds - MP3/Gregor Quendel - Crowd Cheering Sounds - 04 - Strong cheering - II - Short.mp3'],
  'crowd_cheer': ['gregor_quendel_-_free_crowd_cheering_sounds_-_mp3/Gregor Quendel - Free Crowd Cheering Sounds - MP3/Gregor Quendel - Crowd Cheering Sounds - 05 - Soft cheering - I.mp3'],
  'crowd_rhythm': ['gregor_quendel_-_free_crowd_cheering_sounds_-_mp3/Gregor Quendel - Free Crowd Cheering Sounds - MP3/Gregor Quendel - Crowd Cheering Sounds - 08 - Rhythmic cheering.mp3'],
  'crowd_ooh': ['oooooooooo.ogg'],
  'applause': ['applause.wav'],
  // umpire
  ...Object.fromEntries(['love', 'fifteen', 'thirty', 'fourty_five', 'advantage_server', 'advantage_receiver', 'game_server', 'game_receiver', 'set_server', 'set_receiver', 'set_point', 'match_point', 'game_point', 'game_over', 'congratulations'].map((n) => ['ump_' + n, ['Sports/Sports/tennis/' + n + '.wav']])),
  // music
  'music_menu': ['hella bumps_0.mp3'],
  'music_match': ['ogg_beachtheme_3.ogg'],
  'music_victory': ['funky-victory-loop_0.mp3'],
};
if (step('audio')) {
  console.log('audio');
  const out = md(join(OUT, 'audio'));
  // Kenney UI + voice
  const ui = {
    ui_move: 'kenney_interfaceSounds/Audio/tick_002.ogg',
    ui_ok: 'kenney_interfaceSounds/Audio/confirmation_002.ogg',
    ui_back: 'kenney_interfaceSounds/Audio/back_002.ogg',
    ui_start: 'kenney_interfaceSounds/Audio/maximize_006.ogg',
    jingle_win: 'jingleSounds_Kenney/OGG/jingles_NES/jingles_NES09.ogg',
    jingle_lose: 'jingleSounds_Kenney/OGG/jingles_NES/jingles_NES03.ogg',
    jingle_point: 'jingleSounds_Kenney/OGG/jingles_STEEL/jingles_STEEL00.ogg',
    vo_ready: 'Voiceover Pack/Female/ready.ogg',
    vo_go: 'Voiceover Pack/Female/go.ogg',
    vo_you_win: 'Voiceover Pack/Female/you_win.ogg',
    vo_you_lose: 'Voiceover Pack/Female/you_lose.ogg',
  };
  for (const [k, v] of Object.entries(ui)) AUDIO[k] = [v];
  const manifest = {};
  for (const [name, [src]] of Object.entries(AUDIO)) {
    const inp = join(A, src);
    if (!existsSync(inp)) { console.warn('  missing', src); continue; }
    const isMusic = name.startsWith('music_') || name.startsWith('crowd_');
    const br = isMusic ? '128k' : '96k';
    execSync(`ffmpeg -v error -y -i "${inp}" -ac ${isMusic ? 2 : 1} -ar 44100 -b:a ${br} "${join(out, name + '.mp3')}"`);
    manifest[name] = `assets/audio/${name}.mp3`;
  }
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
}

// ---------------------------------------------------------------- fonts
if (step('fonts')) {
  const out = md(join(OUT, 'fonts'));
  for (const f of readdirSync(join(CACHE, 'fonts'))) copyFileSync(join(CACHE, 'fonts', f), join(out, basename(f)));
}
console.log('done');
