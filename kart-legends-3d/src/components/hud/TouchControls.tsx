import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { isTouchDevice } from '@/app/settingsStore';
import { inputManager } from '@/game/input/inputManager';

/** Distância (px) do dedo até o ponto inicial para esterço total. */
const STEER_RANGE = 70;

type HoldKey = 'brake' | 'drift' | 'item' | 'reset';

function HoldButton({ k, label, className, testId }: { k: HoldKey; label: string; className: string; testId: string }): JSX.Element {
  const [down, setDown] = useState(false);
  const set = (on: boolean): void => {
    setDown(on);
    inputManager.setTouch(k === 'brake' ? { brake: on ? 1 : 0 } : { [k]: on });
  };
  return (
    <button
      type="button" className={`touch-btn ${className}`} data-testid={testId} data-down={down} aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); set(true); }}
      onPointerUp={() => set(false)} onPointerCancel={() => set(false)} onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

/** Volante: arraste o polegar para os lados em qualquer ponto da metade esquerda. */
function SteerZone(): JSX.Element {
  const origin = useRef<{ id: number; x: number } | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number; dx: number } | null>(null);
  const end = (e: ReactPointerEvent): void => {
    if (origin.current?.id !== e.pointerId) return;
    origin.current = null;
    setKnob(null);
    inputManager.setTouch({ steer: 0 });
  };
  return (
    <div
      className="touch-steer" data-testid="touch-steer"
      onPointerDown={(e) => {
        if (origin.current) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        origin.current = { id: e.pointerId, x: e.clientX };
        setKnob({ x: e.clientX, y: e.clientY, dx: 0 });
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || o.id !== e.pointerId) return;
        let dx = e.clientX - o.x;
        // Passou do limite: a origem acompanha o dedo, para inverter o sentido sem atraso.
        if (dx > STEER_RANGE) { o.x = e.clientX - STEER_RANGE; dx = STEER_RANGE; }
        else if (dx < -STEER_RANGE) { o.x = e.clientX + STEER_RANGE; dx = -STEER_RANGE; }
        inputManager.setTouch({ steer: dx / STEER_RANGE });
        setKnob((k) => (k ? { ...k, x: o.x, dx } : k));
      }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
    >
      {knob ? (
        <div className="touch-steer__base" style={{ left: knob.x, top: knob.y }}>
          <div className="touch-steer__knob" style={{ transform: `translate(calc(-50% + ${knob.dx}px), -50%)` }} />
        </div>
      ) : (
        <span className="touch-steer__hint">◀ arraste para virar ▶</span>
      )}
    </div>
  );
}

/**
 * Controles de toque para celular: o kart acelera sozinho; volante à esquerda;
 * drift, item, freio/ré e recuperar à direita; pausa no topo.
 */
export function TouchControls(): JSX.Element | null {
  const [enabled] = useState(isTouchDevice);
  useEffect(() => {
    if (!enabled) return undefined;
    inputManager.setTouch({ throttle: 1 });
    return () => inputManager.clearTouch();
  }, [enabled]);
  if (!enabled) return null;
  return (
    <div className="touch-controls" data-testid="touch-controls">
      <SteerZone />
      <div className="touch-right">
        <HoldButton k="item" label="Item" className="touch-btn--item" testId="touch-item" />
        <HoldButton k="drift" label="Drift" className="touch-btn--drift" testId="touch-drift" />
        <HoldButton k="brake" label="Freio" className="touch-btn--brake" testId="touch-brake" />
        <HoldButton k="reset" label="↺" className="touch-btn--reset" testId="touch-reset" />
      </div>
      <button
        type="button" className="touch-btn touch-btn--pause" data-testid="touch-pause" aria-label="Pausar"
        onPointerDown={(e) => { e.preventDefault(); inputManager.requestPause(); }}
      >
        ❚❚
      </button>
    </div>
  );
}
