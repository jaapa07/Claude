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
        // No modo manual os botões (Drift e analógico) já se explicam; a dica ficaria por cima do analógico.
        !manual && <span className="touch-steer__hint">◀ arraste para virar ▶</span>
      )}
    </div>
  );
}

/** Curso máximo (px) do pino do analógico a partir do centro: no limite, esterço total. */
const STICK_RANGE = 40;
/** Zona morta do analógico (fração do curso), para o polegar apoiado não virar o kart. */
const STICK_DEAD = 0.08;

/**
 * Analógico (modo manual, embaixo do Drift): o pino segue o polegar dentro da base; o deslocamento horizontal vira
 * esterço proporcional, como o direcional analógico de um controle.
 */
function AnalogStick(): JSX.Element {
  const finger = useRef<number | null>(null);
  const base = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const update = (cx: number, cy: number): void => {
    const r = base.current?.getBoundingClientRect();
    if (!r) return;
    let x = cx - (r.left + r.width / 2);
    let y = cy - (r.top + r.height / 2);
    const len = Math.hypot(x, y);
    if (len > STICK_RANGE) { x *= STICK_RANGE / len; y *= STICK_RANGE / len; }
    setPos({ x, y });
    const raw = x / STICK_RANGE;
    const mag = Math.max(0, (Math.abs(raw) - STICK_DEAD) / (1 - STICK_DEAD));
    const steer = Math.sign(raw) * mag * useSettingsStore.getState().sensitivity;
    inputManager.setTouch({ steer: Math.max(-1, Math.min(1, steer)) });
  };
  const end = (e: ReactPointerEvent): void => {
    if (finger.current !== e.pointerId) return;
    finger.current = null;
    setPos(null);
    inputManager.setTouch({ steer: 0 });
  };
  return (
    <div
      ref={base} className="touch-stick" data-testid="touch-stick" data-down={pos !== null}
      role="slider" aria-label="Analógico: arraste para os lados para virar" aria-valuemin={-1} aria-valuemax={1}
      aria-valuenow={pos ? Math.round((pos.x / STICK_RANGE) * 100) / 100 : 0}
      onPointerDown={(e) => {
        if (finger.current !== null) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        finger.current = e.pointerId;
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => { if (finger.current === e.pointerId) update(e.clientX, e.clientY); }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="touch-stick__knob" style={pos ? { transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` } : undefined} />
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
      {manual && <AnalogStick />}
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
