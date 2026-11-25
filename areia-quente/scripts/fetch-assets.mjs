// Baixa os pacotes de assets de licença livre (CC0) usados pelo jogo para .cache/src.
// Depois rode `python3 scripts/build_all.py` para gerar public/assets.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, '.cache', 'src');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

const KENNEY = [
  'animated-characters-protagonists', 'animated-characters-survivors', 'animated-characters-retro',
  'mini-characters', 'nature-kit', 'city-kit-commercial', 'watercraft-kit', 'furniture-kit',
  'particle-pack', 'smoke-particles', 'flag-pack', 'ui-pack', 'input-prompts',
  'impact-sounds', 'interface-sounds', 'voiceover-pack',
];
const AMBIENTCG = ['Ground080_2K-JPG', 'Ground093C_2K-JPG'];
const POLYHAVEN = ['kloofendal_48d_partly_cloudy_puresky', 'qwantani_sunset_puresky', 'qwantani_night_puresky'];
const OGA = [
  'crowd_shouting_0.ogg', 'oooooooooo.ogg', 'applause-clapping-church-crowd-immersive.wav',
  'fever_stadium_bpm165_0.ogg', 'fever_stadium_climax_bpm180_0.ogg',
  'Of%20Far%20Different%20Nature%20-%20Funky%20House%20%28CC0%29_0.mp3', 'mad_bossa.zip',
  'crystal_beach_0.mp3', 'wave_01_cc0-18363__jasinski__alkaibeach.flac',
  'wave_02_cc0-18363__jasinski__alkaibeach.flac', 'Seagull%20Ambient%201.wav',
  'Seagull%20Ambient%203.wav', 'sand_footsteps_0.mp3',
];

const exists = (p) => access(p).then(() => true, () => false);
async function get(url, headers = {}) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r;
    } catch (e) {
      if (i === 3) throw e;
      await new Promise((s) => setTimeout(s, 1000 * 2 ** i));
    }
  }
}
async function save(url, file, headers) {
  if (await exists(file)) return console.log('  (cache)', path.basename(file));
  const r = await get(url, headers);
  await writeFile(file, Buffer.from(await r.arrayBuffer()));
  console.log('  ok', path.basename(file));
}
const unzip = (zip, dir) => execFileSync('unzip', ['-qo', zip, '-d', dir]);

async function kenney(slug) {
  const zip = path.join(SRC, 'kenney', `${slug}.zip`);
  if (!(await exists(zip))) {
    const page = await get(`https://kenney.nl/assets/${slug}`);
    const cookie = (page.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
    const id = Buffer.from(`assets/${slug}`).toString('hex');
    const link = await (await get(`https://kenney.nl/download-link/${id}`, { Cookie: cookie, Referer: `https://kenney.nl/assets/${slug}` })).json();
    await save(link.url, zip);
  }
  unzip(zip, path.join(SRC, 'kenney', slug));
}

await mkdir(path.join(SRC, 'kenney'), { recursive: true });
for (const d of ['ambientcg', 'polyhaven', 'oga']) await mkdir(path.join(SRC, d), { recursive: true });

console.log('Kenney (CC0)');
for (const k of KENNEY) await kenney(k);
console.log('ambientCG (CC0)');
for (const a of AMBIENTCG) {
  const z = path.join(SRC, 'ambientcg', `${a}.zip`);
  await save(`https://ambientcg.com/get?file=${a}.zip`, z);
  unzip(z, path.join(SRC, 'ambientcg', a));
}
console.log('Poly Haven (CC0)');
for (const h of POLYHAVEN) {
  const meta = await (await get(`https://api.polyhaven.com/files/${h}`)).json();
  await save(meta.hdri['2k'].hdr.url, path.join(SRC, 'polyhaven', `${h}.hdr`));
}
console.log('OpenGameArt (CC0)');
for (const f of OGA) {
  const out = path.join(SRC, 'oga', decodeURIComponent(f));
  await save(`https://opengameart.org/sites/default/files/${f}`, out);
  if (out.endsWith('.zip')) unzip(out, out.replace(/\.zip$/, ''));
}
console.log('Animações livres (Quaternius UAL CC0 + CMU mocap)');
const git = (args, cwd) => execFileSync('git', args, { cwd, stdio: 'inherit' });
if (!(await exists(path.join(SRC, 'ual', 'glTF')))) git(['clone', '--depth', '1', 'https://github.com/J-Ponzo/gltf-universal-animation-library.git', 'ual'], SRC);
if (!(await exists(path.join(SRC, 'cmu')))) git(['clone', '--depth', '1', '--filter=blob:none', '--no-checkout', 'https://github.com/una-dinosauria/cmu-mocap.git', 'cmu'], SRC);
const CMU = ['010/10_02', '010/10_04', '011/11_01', '013/13_26', '013/13_29', '033/33_01', '042/42_01', '049/49_07'];
git(['checkout', 'HEAD', '--', 'READMEFIRST.txt', ...CMU.map((c) => `data/${c}.bvh`)], path.join(SRC, 'cmu'));
console.log('Pronto. Agora: python3 scripts/build_all.py');
