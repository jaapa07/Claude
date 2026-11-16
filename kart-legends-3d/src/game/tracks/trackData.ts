import type { TrackId } from '@/data/ids';
import { assetUrl } from '@/game/core/assets';
import type { TrackData } from './trackTypes';

const cache = new Map<TrackId, Promise<TrackData>>();

export function loadTrackData(trackId: TrackId): Promise<TrackData> {
  let p = cache.get(trackId);
  if (!p) {
    p = fetch(assetUrl(`tracks/${trackId}.json`)).then((r) => {
      if (!r.ok) throw new Error(`Dados da pista ausentes: ${trackId} (${r.status})`);
      return r.json() as Promise<TrackData>;
    });
    cache.set(trackId, p);
  }
  return p;
}
