import type { TrackId } from '@/data/ids';
import { loadTrackData } from './trackData';

export interface MinimapData { points: number[]; minX: number; maxX: number; minZ: number; maxZ: number }

export async function getMinimap(trackId: TrackId): Promise<MinimapData> {
  return (await loadTrackData(trackId)).minimap;
}
