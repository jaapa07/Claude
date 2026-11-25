import { Suspense, useEffect } from 'react';
import type { KartModel } from '@/game/vehicles/kartModel';
import { useModel } from '../assets';

function Fit({ model, tireId }: { model: KartModel; tireId: string }): null {
  const gltf = useModel(`tires/${tireId}.glb`);
  useEffect(() => {
    model.setTire(gltf);
    return () => model.setTire(null);
  }, [model, gltf]);
  return null;
}

/** Monta no kart o pneu da loja escolhido na Oficina ('original' = rodas do próprio kart). */
export function TireFitting({ model, tireId }: { model: KartModel; tireId: string | undefined }): JSX.Element | null {
  if (!tireId || tireId === 'original') return null;
  // Suspense próprio: enquanto o pneu carrega, o kart aparece com as rodas originais.
  return <Suspense fallback={null}><Fit key={tireId} model={model} tireId={tireId} /></Suspense>;
}
