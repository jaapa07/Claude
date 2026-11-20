import { useEffect, useState } from 'react';
import { CHARACTER_BY_ID } from '@/data/characters';
import type { TrackId } from '@/data/ids';
import { useHudStore } from '@/game/core/hudStore';
import { getMinimap } from '@/game/tracks/minimap';
import type { MinimapData } from '@/game/tracks/minimap';

interface Loaded { trackId: TrackId; data: MinimapData; path: string }

/** Minimapa em SVG: X do mundo → direita, Z do mundo → baixo (vista de cima, sem espelhar). */
export function Minimap({ trackId }: { trackId: TrackId }): JSX.Element {
  const dots = useHudStore((s) => s.hud.minimap);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    getMinimap(trackId).then(
      (data) => {
        if (!alive) return;
        let path = '';
        for (let i = 0; i + 1 < data.points.length; i += 2) path += `${data.points[i].toFixed(1)},${data.points[i + 1].toFixed(1)} `;
        setLoaded({ trackId, data, path });
      },
      (err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      },
    );
    return () => {
      alive = false;
    };
  }, [trackId]);

  const map = loaded && loaded.trackId === trackId ? loaded : null;
  if (!map) {
    return (
      <div className="hud-minimap hud-panel" data-testid="hud-minimap" data-state={error ? 'error' : 'loading'}>
        {error && <span className="hud-minimap__error">Minimapa indisponível: {error}</span>}
      </div>
    );
  }
  const { minX, maxX, minZ, maxZ } = map.data;
  const size = Math.max(maxX - minX, maxZ - minZ, 1);
  const pad = size * 0.08;
  const r = size * 0.028;
  return (
    <div className="hud-minimap hud-panel" data-testid="hud-minimap" data-state="ready">
      <svg viewBox={`${minX - pad} ${minZ - pad} ${maxX - minX + pad * 2} ${maxZ - minZ + pad * 2}`} role="img" aria-label="Minimapa da pista">
        <polygon className="hud-minimap__track-edge" points={map.path} strokeWidth={size * 0.06} />
        <polygon className="hud-minimap__track" points={map.path} strokeWidth={size * 0.034} />
        {dots.filter((d) => !d.isPlayer).map((d) => (
          <circle key={d.characterId} className="hud-minimap__dot" cx={d.x} cy={d.z} r={r} fill={CHARACTER_BY_ID[d.characterId].color} strokeWidth={r * 0.35} />
        ))}
        {dots.filter((d) => d.isPlayer).map((d) => (
          <circle key={d.characterId} className="hud-minimap__dot hud-minimap__dot--player" data-testid="hud-minimap-player" cx={d.x} cy={d.z} r={r * 1.5} fill={CHARACTER_BY_ID[d.characterId].color} strokeWidth={r * 0.6} />
        ))}
      </svg>
    </div>
  );
}
