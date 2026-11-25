import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { isTouchDevice, useSettingsStore } from '@/app/settingsStore';
import { inputManager } from '@/game/input/inputManager';

/** Distância (px) do dedo até o ponto inicial para esterço total. */
const STEER_RANGE = 70;

type ButtonKey = 'gas' | 'brake' | 'drift' | 'item' | 'reset';

const BUTTONS: ReadonlyArray<{ k: ButtonKey; label: string }> = [
  { k: 'gas', label: 'Acelerar' }, { k: 'drift', label: 'Drift' }, { k: 'item', label: 'Item' },
  { k: 'brake', label: 'Freio' }, { k: 'reset', label: '↺' },
];

/**
 * Botões da direita como uma zona única: cada dedo vale pelo botão que está embaixo dele,
 * então dá para deslizar o polegar de Acelerar para Drift sem levantar. No modo manual,
 * segurar Drift também acelera.
 */
function ButtonCluster({ manual }: { manual: boolean }): JSX.Element {
  const fingers = useRef(new Map<number, ButtonKey | null>());
  const [held, setHeld] = useState<ReadonlySet<ButtonKey>>(new Set());
  const apply = (): void => {
    const on = new Set<ButtonKey>();
    for (const k of fingers.current.values()) if (k) on.add(k);
    const drift = on.has('drift');
    inputManager.setTouch({
      throttle: manual ? (on.has('gas') || drift ? 1 : 0) : 1,
      brake: on.has('brake') ? 1 : 0, drift, item: on.has('item'), reset: on.has('reset'),
    });
    setHeld(on);
  };
  const root = useRef<HTMLDivElement>(null);
  /** Botão circular sob o dedo (com 8 px de folga), por geometria. */
  const keyAt = (x: number, y: number): ButtonKey | null => {
    let best: ButtonKey | null = null;
    let bestD = Infinity;
    for (const el of root.current?.querySelectorAll<HTMLElement>('[data-touch-key]') ?? []) {
      const r = el.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) - r.width / 2;
      if (d < 8 && d < bestD) { bestD = d; best = el.dataset.touchKey as ButtonKey; }
    }
    return best;
  };
  const end = (e: ReactPointerEvent): void => {
    if (fingers.current.delete(e.pointerId)) apply();
  };
  return (
    <div
      ref={root} className="touch-right" data-manual={manual}
      onPointerDown={(e) => {
        const k = keyAt(e.clientX, e.clientY);
        if (!k) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        fingers.current.set(e.pointerId, k);
        apply();
      }}
      onPointerMove={(e) => {
        if (!fingers.current.has(e.pointerId)) return;
        const k = keyAt(e.clientX, e.clientY);
        if (k !== fingers.current.get(e.pointerId)) { fingers.current.set(e.pointerId, k); apply(); }
      }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Modo manual: o Drift vai para o polegar esquerdo (botão que se arrasta para o lado da curva). */}
      {BUTTONS.filter((b) => (manual ? b.k !== 'drift' : b.k !== 'gas')).map((b) => (
        <div
          key={b.k} role="button" aria-label={b.label} className={`touch-btn touch-btn--${b.k}`}
          data-touch-key={b.k} data-testid={`touch-${b.k}`} data-down={held.has(b.k)}
        >
          {b.label}
        </div>
      ))}
    </div>
  );
}

/**
 * Volante: arraste o polegar para os lados em qualquer ponto da metade esquerda.
 * Modo manual: começar o toque no botão Drift (canto esquerdo) segura o drift enquanto o arraste vira.
 */
function SteerZone({ manual }: { manual: boolean }): JSX.Element {
  const origin = useRef<{ id: number; x: number } | null>(null);
  const pad = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState<{ x: number; y: number; dx: number; drift: boolean } | null>(null);
  const end = (e: ReactPointerEvent): void => {
    if (origin.current?.id !== e.pointerId) return;
    origin.current = null;
    setKnob(null);
    inputManager.setTouch({ steer: 0, driftPad: false });
  };
  const onPad = (x: number, y: number): boolean => {
    const r = pad.current?.getBoundingClientRect();
    if (!r) return false;
    return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) <= r.width / 2 + 14;
  };
  return (
    <div
      className="touch-steer" data-testid="touch-steer"
      onPointerDown={(e) => {
        if (origin.current) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        origin.current = { id: e.pointerId, x: e.clientX };
        const drift = manual && onPad(e.clientX, e.clientY);
        if (drift) inputManager.setTouch({ driftPad: true });
        setKnob({ x: e.clientX, y: e.clientY, dx: 0, drift });
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || o.id !== e.pointerId) return;
        let dx = e.clientX - o.x;
        // Passou do limite: a origem acompanha o dedo, para inverter o sentido sem atraso.
        if (dx > STEER_RANGE) { o.x = e.clientX - STEER_RANGE; dx = STEER_RANGE; }
        else if (dx < -STEER_RANGE) { o.x = e.clientX + STEER_RANGE; dx = -STEER_RANGE; }
        inputManager.setTouch({ steer: Math.max(-1, Math.min(1, (dx / STEER_RANGE) * useSettingsStore.getState().sensitivity)) });
        setKnob((k) => (k ? { ...k, x: o.x, dx } : k));
      }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
    >
      {manual && (
        <div ref={pad} className="touch-btn touch-btn--driftpad" data-testid="touch-drift" data-down={!!knob?.drift} aria-label="Drift: segure e arraste para o lado da curva">
          <span>Drift</span><span className="touch-btn--driftpad__arrows">◀ ▶</span>
        </div>
      )}
      {knob ? (
        <div className="touch-steer__base" data-drift={knob.drift} style={{ left: knob.x, top: knob.y }}>
          <div className="touch-steer__knob" style={{ transform: `translate(calc(-50% + ${knob.dx}px), -50%)` }} />
        </div>
      ) : (
        <span className="touch-steer__hint">{manual ? '◀ arraste para virar · puxe o Drift para derrapar ▶' : '◀ arraste para virar ▶'}</span>
      )}
    </div>
  );
}

/**
 * Controles de toque para celular. Automático: o kart acelera sozinho; volante à esquerda; drift, item, freio/ré e
 * recuperar à direita. Manual: Acelerar à direita e o Drift vai para a esquerda, junto do volante. Pausa no topo.
 */
export function TouchControls(): JSX.Element | null {
  const [enabled] = useState(isTouchDevice);
  const manual = !useSettingsStore((s) => s.autoAccelerate);
  useEffect(() => {
    if (!enabled) return undefined;
    inputManager.setTouch({ throttle: manual ? 0 : 1 });
    return () => inputManager.clearTouch();
  }, [enabled, manual]);
  if (!enabled) return null;
  return (
    <div className="touch-controls" data-testid="touch-controls">
      <SteerZone manual={manual} />
      <ButtonCluster manual={manual} />
      <button
        type="button" className="touch-btn touch-btn--pause" data-testid="touch-pause" aria-label="Pausar"
        onPointerDown={(e) => { e.preventDefault(); inputManager.requestPause(); }}
      >
        ❚❚
      </button>
    </div>
  );
}
