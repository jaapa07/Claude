/**
 * Texturas e materiais dos objetos de cenário da Copa Meteoro (recife.ts, templo.ts, vulcao.ts, lunar.ts).
 * Os materiais `met_*` com textura recebem UV triplanar em `finMet` (kit-meteoro.ts).
 * Também usa texturas de piso registradas em scripts/tracks/textures.ts (trk_basalt, trk_temple, trk_lava, trk_plate).
 */
import { defineMaterial } from '../lib/materials';
import { fbm, makeTexture, vnoise } from '../lib/textures';
import { registerTrackTextures } from '../tracks/textures';

const g3 = (v: number): [number, number, number] => [v, v, v];
let done = false;

export async function registerMeteoroTextures(): Promise<void> {
  if (done) return;
  done = true;
  await registerTrackTextures();
  // painéis de módulos espaciais: chapas brancas com juntas e rebites
  await makeTexture('met_painel', 256, (u, v) => {
    const cu = (u * 2) % 1, cv = (v * 3) % 1;
    const seam = Math.min(cu, 1 - cu) < 0.012 || Math.min(cv, 1 - cv) < 0.016 ? 0.55 : 1;
    const rivet = Math.min(cu, 1 - cu) < 0.04 && Math.abs(((cv * 8) % 1) - 0.5) < 0.08 ? 0.82 : 1;
    const id = vnoise(Math.floor(u * 2) / 4 + 0.01, Math.floor(v * 3) / 4 + 0.01, 4, 7);
    return g3((0.84 + id * 0.1 + fbm(u, v, 8, 3, 9) * 0.06) * seam * rivet);
  });
  // palha trançada dos telhados de cabana (fibras inclinadas)
  await makeTexture('met_palha', 256, (u, v) => {
    const fiber = 0.75 + 0.25 * Math.sin((u * 40 + Math.sin(v * 30) * 0.3) * Math.PI * 2) * Math.sin(v * Math.PI * 2 * 12);
    const t = 0.7 + fbm(u, v, 8, 3, 21) * 0.3;
    return [t * fiber, t * fiber * 0.86, t * fiber * 0.55];
  });

  defineMaterial('met_painel', { map: 'met_painel', roughness: 0.5, metalness: 0.15 });
  defineMaterial('met_palha', { map: 'met_palha', roughness: 0.95 });
  defineMaterial('met_basalto', { map: 'trk_basalt', roughness: 0.9 });
  defineMaterial('met_templo', { map: 'trk_temple', roughness: 0.9 });
  defineMaterial('met_chapa', { map: 'trk_plate', roughness: 0.4, metalness: 0.6 });
  defineMaterial('met_brasa', { roughness: 0.6, emissive: [1, 0.32, 0.06], emissiveStrength: 2.2 });
  defineMaterial('met_vidro', { color: [0.55, 0.8, 1], roughness: 0.06, metalness: 0.2, alpha: 0.5, doubleSided: true, emissive: [0.05, 0.12, 0.22], emissiveStrength: 1 });
  defineMaterial('met_obsidiana', { roughness: 0.12, metalness: 0.35 });
  defineMaterial('met_planeta', { roughness: 0.9, emissive: [0.32, 0.22, 0.18], emissiveStrength: 1 });
  defineMaterial('met_coral', { roughness: 0.7, emissive: [0.12, 0.06, 0.08], emissiveStrength: 1 });
  defineMaterial('met_agua_rasa', { color: [0.55, 0.95, 0.95], roughness: 0.08, alpha: 0.6, doubleSided: true, emissive: [0.04, 0.16, 0.16], emissiveStrength: 1 });
  defineMaterial('lava_fall', { map: 'trk_lava', emissive: [1, 0.8, 0.7], emissiveMap: 'trk_lava', emissiveStrength: 1.8, roughness: 0.7, doubleSided: true });
}
