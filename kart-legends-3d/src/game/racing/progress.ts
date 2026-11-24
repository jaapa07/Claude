import type { TrackRuntime } from '@/game/tracks/trackRuntime';
import type { KartState } from '@/game/vehicles/kartState';

export interface ProgressEvents {
  onLap: (k: KartState, lapTimeMs: number) => void;
  onCheckpoint?: (k: KartState, checkpoint: number) => void;
}

/** Distância máxima (m) da linha central para um checkpoint valer. */
const CHECKPOINT_TOLERANCE = 16;

/**
 * Atualiza a posição do kart ao longo da pista (principal ou atalho), valida checkpoints em ordem
 * e conta voltas. A busca é incremental (janela ao redor do índice anterior), então cortar caminho
 * por fora da pista não avança o progresso.
 */
export function updateProgress(k: KartState, track: TrackRuntime, timeMs: number, ev: ProgressEvents): void {
  const main = track.main;
  const n = track.n;
  const prevMain = k.mainIndex;

  if (k.pathId >= 0) {
    const sc = track.shortcuts[k.pathId]!;
    const i = sc.path.nearest(k.pathIndex, 3, 8, k.x, k.y, k.z);
    k.pathIndex = i;
    k.lateral = sc.path.lateral(i, k.x, k.y, k.z);
    k.surface = sc.path.surface[i]!;
    k.onRoad = Math.abs(k.lateral) <= sc.path.halfWidth[i]! + 0.6;
    k.mainIndex = main.wrap(sc.data.from + Math.round((i / (sc.path.n - 1)) * sc.span));
    const mi = main.nearest(sc.data.to, 6, 6, k.x, k.y, k.z);
    const dMain = main.dist2(mi, k.x, k.y, k.z);
    if (i >= sc.path.n - 2 || (dMain < sc.path.dist2(i, k.x, k.y, k.z) && i > sc.path.n * 0.6)) {
      k.pathId = -1;
      k.pathIndex = k.mainIndex = mi;
    } else if (!k.onRoad && Math.abs(k.lateral) > sc.path.halfWidth[i]! + 14) {
      // saiu do atalho pelo lado: volta a ser medido pela pista principal
      k.pathId = -1;
      k.pathIndex = k.mainIndex = main.nearest(k.mainIndex, 12, 12, k.x, k.y, k.z);
    }
  }
  if (k.pathId < 0) {
    const i = main.nearest(k.pathIndex, 6, 12, k.x, k.y, k.z);
    k.pathIndex = k.mainIndex = i;
    k.lateral = main.lateral(i, k.x, k.y, k.z);
    k.surface = main.surface[i]!;
    k.onRoad = Math.abs(k.lateral) <= main.halfWidth[i]! + 0.9;
    // entrada em atalho
    for (let s = 0; s < track.shortcuts.length; s++) {
      const sc = track.shortcuts[s]!;
      const rel = (i - sc.data.from + n) % n;
      if (rel > 16 && rel < n - 6) continue;
      const si = sc.path.nearest(2, 2, 12, k.x, k.y, k.z);
      if (si < 2) continue;
      const lat = sc.path.lateral(si, k.x, k.y, k.z);
      // Já fora da pista principal (passou do muro na boca do atalho): tolerância maior para "entrar" no atalho,
      // senão o kart fica na fresta entre os dois, sem pertencer a nenhum, empurrando o muro.
      const tol = Math.abs(k.lateral) > main.halfWidth[i]! + 0.5 ? 3.5 : 0.5;
      if (Math.abs(lat) <= sc.path.halfWidth[si]! + tol && sc.path.dist2(si, k.x, k.y, k.z) + 4 < main.dist2(i, k.x, k.y, k.z)
        && Math.abs(k.lateral) > main.halfWidth[i]! - 1) {
        k.pathId = s; k.pathIndex = si;
        k.lateral = lat; k.surface = sc.path.surface[si]!; k.onRoad = true;
        break;
      }
    }
    if (!k.onRoad) k.surface = track.data.offroad;
  }

  // checkpoints e voltas (cruzamento para a frente, perto da pista)
  const cps = track.data.checkpoints;
  const cur = k.mainIndex;
  const moved = (cur - prevMain + n) % n;
  if (moved > 0 && moved < n / 4) {
    for (let guard = 0; guard < 3; guard++) {
      const target = cps[k.nextCheckpoint]!;
      const toTarget = (target - prevMain + n) % n;
      if (toTarget === 0 || toTarget > moved) break;
      const near = k.pathId >= 0 || Math.abs(k.lateral) <= main.halfWidth[cur]! + CHECKPOINT_TOLERANCE;
      if (!near) break;
      if (k.nextCheckpoint === 0) {
        const lapMs = timeMs - k.lapStart;
        k.lap++;
        k.lapTimes.push(lapMs);
        k.lapStart = timeMs;
        k.nextCheckpoint = 1;
        k.checkpointsPassed = 0;
        ev.onLap(k, lapMs);
      } else {
        k.checkpointsPassed = k.nextCheckpoint;
        ev.onCheckpoint?.(k, k.nextCheckpoint);
        k.nextCheckpoint = (k.nextCheckpoint + 1) % cps.length;
      }
    }
  }

  // progresso total: voltas + posição relativa ao último checkpoint validado
  const lastCp = cps[k.checkpointsPassed]!;
  let rel = (cur - lastCp + n) % n;
  if (rel > n / 2) rel -= n;
  // não deixa o progresso passar do próximo checkpoint sem validá-lo (corte de caminho)
  const span = (cps[k.nextCheckpoint]! - lastCp + n) % n || n;
  rel = Math.min(rel, span);
  k.progress = k.lap * n + lastCp + rel;
  if (k.onRoad && k.pathId < 0 && k.grounded) k.lastSafeIndex = cur;
}

/** Ordena e atribui posições (1 = líder). Quem já terminou fica à frente, por tempo de chegada. */
export function rankKarts(karts: KartState[]): void {
  const order = [...karts].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.progress - a.progress;
  });
  order.forEach((k, i) => { k.position = i + 1; });
}
