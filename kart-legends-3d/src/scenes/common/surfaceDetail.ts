import * as THREE from 'three';
import { assetUrl } from '@/game/core/assets';
import { DETAIL_BY_TEXTURE, type DetailRule } from '@/game/tracks/iblSources';

/**
 * Relevo das superfícies (qualidade Média/Alta): mapas de normal ladrilháveis (Poly Haven, CC0, ou derivados das
 * texturas próprias) e rugosidade variável no asfalto, aplicados pelo nome da textura de cor de cada material.
 * Os mapas são baixados só quando a pista/arena que os usa é aberta; o material troca de shader quando chegam.
 */
const loader = new THREE.TextureLoader();
const images = new Map<string, Promise<THREE.Texture>>();

function load(file: string): Promise<THREE.Texture> {
  let p = images.get(file);
  if (!p) {
    p = loader.loadAsync(assetUrl(`detail/${file}`)).then((t) => {
      t.flipY = false; // mesma convenção de UV das texturas do glTF
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
      return t;
    });
    images.set(file, p);
  }
  return p;
}

/** Instância com a repetição pedida (a imagem é a mesma; só a transformação de UV muda). */
function variant(base: THREE.Texture, repeat: number, offset: THREE.Vector2): THREE.Texture {
  if (repeat === 1 && offset.lengthSq() === 0) return base;
  const t = base.clone();
  t.repeat.set(repeat, repeat);
  t.offset.copy(offset);
  t.needsUpdate = true;
  return t;
}

export interface DetailHandle { cancel: () => void }

/**
 * Aplica o relevo aos materiais de `root`. `cancel()` desfaz (os materiais vêm do cache do GLB e podem voltar a
 * ser usados na qualidade Baixa) e impede aplicar o que ainda estiver chegando.
 */
export function applySurfaceDetail(root: THREE.Object3D): DetailHandle {
  let cancelled = false;
  const undo: (() => void)[] = [];
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
      if (seen.has(mat) || !mat.isMeshStandardMaterial || !mat.map || mat.normalMap) continue;
      seen.add(mat);
      const rule: DetailRule | undefined = DETAIL_BY_TEXTURE[mat.map.name];
      if (!rule) continue;
      const repeat = rule.repeat * mat.map.repeat.x;
      const offset = mat.map.offset.clone();
      void load(`${rule.id}_n.webp`).then((n) => {
        if (cancelled) return;
        const tex = variant(n, repeat, offset);
        undo.push(() => { mat.normalMap = null; mat.normalScale.set(1, 1); mat.needsUpdate = true; if (tex !== n) tex.dispose(); });
        mat.normalMap = tex;
        // glTF: UV com v para baixo → o verde do mapa (convenção OpenGL) entra invertido, como faz o GLTFLoader
        mat.normalScale.set(rule.strength, -rule.strength);
        mat.needsUpdate = true;
      }).catch((e: unknown) => console.warn('[relevo] falha ao carregar', rule.id, e));
      if (rule.rough) {
        void load(`${rule.id}_r.webp`).then((r) => {
          if (cancelled) return;
          const tex = variant(r, repeat, offset);
          const rough = mat.roughness;
          undo.push(() => { mat.roughnessMap = null; mat.roughness = rough; mat.needsUpdate = true; if (tex !== r) tex.dispose(); });
          mat.roughnessMap = tex;
          // o mapa foi normalizado para média 0,8: o fator sobe na mesma proporção
          mat.roughness = Math.min(1, rough / 0.8);
          mat.needsUpdate = true;
        }).catch((e: unknown) => console.warn('[relevo] falha ao carregar', rule.id, e));
      }
    }
  });
  return { cancel: () => { cancelled = true; for (const u of undo) u(); undo.length = 0; } };
}
