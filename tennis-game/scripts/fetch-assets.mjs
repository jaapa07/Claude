#!/usr/bin/env node
// Downloads every third-party asset used by the game into .asset-cache/ (git-ignored).
// All sources are CC0 or CC-BY; see assets-src/CREDITS.md for the attribution list.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CACHE = process.env.ASSET_CACHE || join(process.cwd(), '.asset-cache');
mkdirSync(CACHE, { recursive: true });
const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });

async function dl(url, dest) {
  if (existsSync(dest)) return;
  mkdirSync(join(dest, '..'), { recursive: true });
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { redirect: 'follow' });
    if (res.ok) {
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      console.log('  ok', url.split('/').pop());
      return;
    }
    console.warn('  retry', res.status, url);
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error('failed ' + url);
}
const unzip = (zip, dir) => {
  if (existsSync(dir) && readdirSync(dir).length) return;
  mkdirSync(dir, { recursive: true });
  sh(`unzip -q -o "${zip}" -d "${dir}"`);
};

// 1) Quaternius Universal Base Characters + Universal Animation Library 1 & 2 (CC0)
//    Mirrored on GitHub; sparse checkout of the glTF variants only.
{
  const dir = join(CACHE, 'quaternius');
  if (!existsSync(join(dir, '.git'))) {
    console.log('Quaternius characters + animations');
    sh(`git clone -q --depth 1 --filter=blob:none --sparse https://github.com/NafisRayan/Animate-Rigged-Humanoid-No-Blender "${dir}"`);
    sh(`git -C "${dir}" sparse-checkout set --no-cone "/Universal Animation Library*/**/Unreal-Godot/UAL*_Standard.glb" "/Universal Animation Library*/**/License.txt" "/Universal Base Characters*/**/Base Characters/Godot - UE/*" "/Universal Base Characters*/**/Hairstyles/Rigged to Head Bone/**" "/Universal Base Characters*/**/License_Standard.txt" "/Universal Base Characters*/**/Base Characters/Textures/*.png"`);
  }
}

// 2) Poly Haven HDRIs (CC0)
const HDRIS = {
  harbor: 'kloofendal_48d_partly_cloudy_puresky',
  clay: 'qwantani_late_afternoon_puresky',
  lawn: 'kloofendal_overcast_puresky',
  neon: 'events_hall_interior',
};
for (const [k, id] of Object.entries(HDRIS)) {
  await dl(`https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/${id}_2k.hdr`, join(CACHE, 'hdri', `${k}.hdr`));
}

// 3) Poly Haven models (CC0) - glTF 1k
const PH_MODELS = ['potted_plant_01', 'potted_plant_04', 'shrub_01', 'flood_lights', 'plastic_crate_01', 'planter_box_01'];
for (const id of PH_MODELS) {
  const meta = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  const g = meta.gltf['1k'].gltf;
  const base = join(CACHE, 'polyhaven', id);
  await dl(g.url, join(base, g.url.split('/').pop()));
  for (const [rel, inc] of Object.entries(g.include || {})) await dl(inc.url, join(base, rel));
}

// 4) ambientCG PBR materials (CC0) - 1K JPG
const ACG = ['Grass005', 'Ground037', 'Clay005', 'Asphalt031', 'Carpet016', 'Concrete034', 'Metal032', 'Wood049', 'Fabric026', 'Plastic010'];
for (const id of ACG) {
  const zip = join(CACHE, 'ambientcg', `${id}.zip`);
  await dl(`https://ambientcg.com/get?file=${id}_1K-JPG.zip`, zip);
  unzip(zip, join(CACHE, 'ambientcg', id));
}

// 5) Audio from OpenGameArt (CC0 / CC-BY, see CREDITS)
const OGA = 'https://opengameart.org/sites/default/files/';
const AUDIO = [
  'Sports.zip', // CC-BY 4.0 Aimee Smith - tennis umpire calls
  'gregor_quendel_-_free_crowd_cheering_sounds_-_mp3.zip', // CC-BY 4.0 Gregor Quendel
  'crowd_shouting_0.ogg', // CC0 starninjas
  'oooooooooo.ogg', // CC0 nocturnalvanguard
  'applause.wav', // CC-BY 3.0 leezh
  'swishes.zip', // CC0 artisticdude
  'thwack-1.0.zip', // CC0 AntumDeluge
  'pingpongbat.ogg', 'pingpongboard.ogg', // CC0 aj-0
  '100-CC0-SFX_0.zip', 'sfx_100_v2.zip', // CC0 rubberduck
  'kenney_interfaceSounds.zip', 'UI_SFX_Set.zip', 'jingleSounds_Kenney.zip', 'Voiceover%20Pack.zip', // CC0 Kenney
  'photo.ogg', // CC0 themightyglider
  'ogg_beachtheme_3.ogg', // CC0 trex0n
  'funky-victory-loop_0.mp3', // CC0 archonic
  'hella%20bumps_0.mp3', // CC0 cynicmusic
];
for (const f of AUDIO) {
  const name = decodeURIComponent(f);
  const dest = join(CACHE, 'audio', name);
  await dl(OGA + f, dest);
  if (name.endsWith('.zip')) unzip(dest, join(CACHE, 'audio', name.replace(/\.zip$/, '')));
}

// 6) Fonts (SIL OFL) from the Google Fonts GitHub repo
const FONTS = {
  'Anton-Regular.ttf': 'ofl/anton/Anton-Regular.ttf',
  'BarlowCondensed-SemiBold.ttf': 'ofl/barlowcondensed/BarlowCondensed-SemiBold.ttf',
  'BarlowCondensed-BoldItalic.ttf': 'ofl/barlowcondensed/BarlowCondensed-BoldItalic.ttf',
  'BarlowCondensed-Black.ttf': 'ofl/barlowcondensed/BarlowCondensed-Black.ttf',
};
for (const [n, p] of Object.entries(FONTS)) await dl(`https://raw.githubusercontent.com/google/fonts/main/${p}`, join(CACHE, 'fonts', n));

console.log('\nAll assets fetched into', CACHE);
