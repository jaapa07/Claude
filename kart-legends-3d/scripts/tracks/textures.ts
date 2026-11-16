/** Texturas e materiais de piso, muros, terreno e água das pistas. */
import { defineMaterial } from '../lib/materials';
import { fbm, makeTexture, voronoi, vnoise } from '../lib/textures';

const g = (v: number): [number, number, number] => [v, v, v];
const lerp3 = (a: number[], b: number[], t: number): [number, number, number] =>
  [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t, a[2]! + (b[2]! - a[2]!) * t];

let done = false;

export async function registerTrackTextures(): Promise<void> {
  if (done) return;
  done = true;
  const S = 512;
  await makeTexture('trk_asphalt', S, (u, v) => {
    const n = fbm(u, v, 8, 4, 3) * 0.5 + vnoise(u, v, 128, 5) * 0.5;
    const speck = vnoise(u, v, 256, 9) > 0.86 ? 0.16 : 0;
    return g(0.3 + n * 0.16 + speck);
  });
  await makeTexture('trk_wet', S, (u, v) => {
    const n = fbm(u, v, 6, 4, 13);
    const puddle = n > 0.56 ? 0.1 : 0;
    return [0.2 + n * 0.1 - puddle, 0.21 + n * 0.1 - puddle, 0.27 + n * 0.12 - puddle * 0.5];
  });
  await makeTexture('trk_cobble', S, (u, v) => {
    const [d1, edge, id] = voronoi(u, v, 9, 21, 0.75);
    const mortar = Math.min(1, edge * 9);
    const tone = 0.5 + id * 0.32 - d1 * 0.25 + fbm(u, v, 16, 3, 2) * 0.12;
    return lerp3([0.2, 0.17, 0.16], [tone * 1.02, tone * 0.93, tone * 0.84], mortar);
  });
  await makeTexture('trk_dirt', S, (u, v) => {
    const n = fbm(u, v, 6, 5, 31);
    const rut = Math.abs(Math.sin(u * Math.PI * 4 + n * 2)) < 0.12 ? -0.07 : 0;
    const peb = voronoi(u, v, 26, 33)[0] < 0.16 ? 0.12 : 0;
    const t = 0.62 + n * 0.3 + rut + peb;
    return [t * 0.78, t * 0.56, t * 0.36];
  });
  await makeTexture('trk_grass', S, (u, v) => {
    const n = fbm(u, v, 8, 5, 41);
    const blade = vnoise(u * 1.0, v * 6, 96, 43) * 0.2;
    const t = 0.55 + n * 0.4 + blade;
    return [t * 0.62, t * 0.95, t * 0.42];
  });
  await makeTexture('trk_sand', S, (u, v) => {
    const n = fbm(u, v, 6, 4, 51);
    const ripple = Math.sin((v + n * 0.12) * Math.PI * 28) * 0.05;
    const t = 0.82 + n * 0.16 + ripple;
    return [t, t * 0.86, t * 0.62];
  });
  await makeTexture('trk_snow', S, (u, v) => {
    const n = fbm(u, v, 6, 4, 61);
    const sparkle = vnoise(u, v, 200, 63) > 0.93 ? 0.06 : 0;
    const t = 0.88 + n * 0.1 + sparkle;
    return [t * 0.95, t * 0.98, t];
  });
  await makeTexture('trk_ice', S, (u, v) => {
    const n = fbm(u, v, 5, 4, 71);
    const [, edge] = voronoi(u, v, 5, 73, 1);
    const crack = edge < 0.025 ? 0.22 : 0;
    const t = 0.72 + n * 0.18 + crack;
    return [t * 0.78, t * 0.93, t];
  });
  await makeTexture('trk_wood', S, (u, v) => {
    const plank = Math.floor(v * 8);
    const gap = (v * 8) % 1 < 0.05 ? 0.4 : 1;
    const grain = fbm(u * 0.4 + plank * 0.37, v * 5, 8, 4, 81 + (plank % 5));
    const t = (0.5 + grain * 0.4 + ((plank * 37) % 7) * 0.02) * gap;
    return [t * 0.86, t * 0.6, t * 0.36];
  });
  await makeTexture('trk_marble', S, (u, v) => {
    const tile = (Math.floor(u * 4) + Math.floor(v * 4)) % 2;
    const edge = Math.min((u * 4) % 1, 1 - ((u * 4) % 1), (v * 4) % 1, 1 - ((v * 4) % 1)) < 0.02 ? 0.75 : 1;
    const vein = Math.abs(Math.sin((u + fbm(u, v, 4, 4, 91) * 0.6) * Math.PI * 6)) < 0.05 ? -0.1 : 0;
    const t = (tile ? 0.92 : 0.8) * edge + vein;
    return [t, t * 0.97, t * 0.94];
  });
  await makeTexture('trk_flagstone', S, (u, v) => {
    const row = Math.floor(v * 6);
    const uu = u * 4 + (row % 2) * 0.5;
    const e = Math.min(uu % 1, 1 - (uu % 1)) * 0.25 < 0.012 || Math.min((v * 6) % 1, 1 - ((v * 6) % 1)) < 0.05;
    const id = vnoise(Math.floor(uu) / 8 + 0.01, row / 8 + 0.01, 8, 101);
    const t = e ? 0.2 : 0.42 + id * 0.2 + fbm(u, v, 16, 3, 103) * 0.12;
    return [t * 0.92, t * 0.9, t];
  });
  await makeTexture('trk_brick', S, (u, v) => {
    const row = Math.floor(v * 8);
    const uu = u * 4 + (row % 2) * 0.5;
    const e = Math.min(uu % 1, 1 - (uu % 1)) < 0.03 || Math.min((v * 8) % 1, 1 - ((v * 8) % 1)) < 0.07;
    const id = vnoise(Math.floor(uu) / 8 + 0.01, row / 8 + 0.01, 8, 111);
    const t = e ? 0.45 : 0.72 + id * 0.24 + fbm(u, v, 16, 3, 113) * 0.1;
    return g(t);
  });
  await makeTexture('trk_rock', S, (u, v) => {
    const n = fbm(u, v, 5, 5, 121);
    const strata = Math.sin((v + n * 0.2) * Math.PI * 14) * 0.07;
    const t = 0.68 + n * 0.3 + strata;
    return g(t);
  });
  await makeTexture('trk_ground', S, (u, v) => g(0.78 + fbm(u, v, 6, 5, 131) * 0.3));
  await makeTexture('trk_water', S, (u, v) => {
    const n = fbm(u, v, 5, 4, 141);
    const cau = 1 - Math.min(1, voronoi(u, v, 7, 143, 1)[1] * 6);
    const t = 0.6 + n * 0.25 + cau * cau * 0.3;
    return [t * 0.72, t * 0.92, t];
  });
  await makeTexture('trk_checker', 64, (u, v) => g((Math.floor(u * 2) + Math.floor(v * 2)) % 2 ? 0.95 : 0.06));
  await makeTexture('trk_neonstrip', 64, (u) => g(Math.abs(u - 0.5) < 0.3 ? 1 : 0.15));

  const road = (name: string, map: string, roughness: number, metalness = 0): void => {
    defineMaterial(name, { map, roughness, metalness });
  };
  road('road_asphalt', 'trk_asphalt', 0.86);
  road('road_wet', 'trk_wet', 0.24, 0.3);
  road('road_cobble', 'trk_cobble', 0.8);
  road('road_dirt', 'trk_dirt', 0.95);
  road('road_grass', 'trk_grass', 0.95);
  road('road_sand', 'trk_sand', 0.95);
  road('road_snow', 'trk_snow', 0.85);
  road('road_ice', 'trk_ice', 0.12, 0.1);
  road('road_wood', 'trk_wood', 0.82);
  road('road_marble', 'trk_marble', 0.35);
  road('road_flagstone', 'trk_flagstone', 0.78);
  road('wall_stone', 'trk_brick', 0.9);
  road('wall_wood', 'trk_wood', 0.85);
  road('wall_rock', 'trk_rock', 0.95);
  road('wall_ice', 'trk_ice', 0.2);
  road('wall_marble', 'trk_marble', 0.4);
  defineMaterial('wall_neon', { map: 'trk_neonstrip', roughness: 0.4, emissive: [0.25, 0.9, 1], emissiveStrength: 1.6 });
  road('terr_ground', 'trk_ground', 0.95);
  road('terr_grass', 'trk_grass', 0.95);
  road('terr_sand', 'trk_sand', 0.95);
  road('terr_snow', 'trk_snow', 0.9);
  road('terr_rock', 'trk_rock', 0.95);
  defineMaterial('water', { map: 'trk_water', roughness: 0.08, metalness: 0.2, alpha: 0.86 });
  defineMaterial('mark', { roughness: 0.6 });
  defineMaterial('checker', { map: 'trk_checker', roughness: 0.6 });
}
