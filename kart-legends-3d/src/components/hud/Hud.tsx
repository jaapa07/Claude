import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { TRAINING_LAPS, useGameStore } from '@/app/gameStore';
import { ITEMS, ITEM_BY_ID } from '@/data/items';
import { assetUrl } from '@/game/core/assets';
import { useHudStore } from '@/game/core/hudStore';
import { AssetImg } from '@/components/ui/common';
import { formatTime } from '@/components/ui/format';
import { Minimap } from './Minimap';
import { TouchControls } from './TouchControls';

/** Velocidade em que o arco do velocímetro fica cheio. */
const SPEEDO_MAX_KMH = 160;
const ARC_LENGTH = 188.5; // ¾ de círculo com r = 40
const DRIFT_NAMES = ['', 'Faísca azul', 'Faísca laranja', 'Faísca magenta'] as const;

function Position(): JSX.Element {
  const position = useHudStore((s) => s.hud.position);
  const total = useHudStore((s) => s.hud.totalRacers);
  return (
    <div className="hud-position" data-testid="hud-position" data-place={position} aria-label={`Posição ${position} de ${total}`}>
      <span className="hud-position__value">{position}º</span><span className="hud-position__total">/{total}</span>
    </div>
  );
}

function LapAndTime({ training }: { training: boolean }): JSX.Element {
  const lap = useHudStore((s) => s.hud.lap);
  const totalLaps = useHudStore((s) => s.hud.totalLaps);
  const timeMs = useHudStore((s) => s.hud.timeMs);
  const lapTimeMs = useHudStore((s) => s.hud.lapTimeMs);
  const bestLapMs = useHudStore((s) => s.hud.bestLapMs);
  const endless = training || totalLaps >= TRAINING_LAPS;
  const shownLap = endless ? Math.max(1, lap) : Math.min(Math.max(1, lap), totalLaps);
  return (
    <div className="hud-timing hud-panel">
      <div className="hud-timing__row hud-timing__row--lap" data-testid="hud-lap">
        <span className="hud-label">Volta</span>
        <span className="hud-value">{endless ? shownLap : `${shownLap}/${totalLaps}`}</span>
      </div>
      <div className="hud-timing__row" data-testid="hud-time">
        <span className="hud-label">Tempo</span>
        <span className="hud-value hud-value--mono">{formatTime(timeMs)}</span>
      </div>
      <div className="hud-timing__row hud-timing__row--small" data-testid="hud-lap-time">
        <span className="hud-label">Volta atual</span>
        <span className="hud-value hud-value--mono">{formatTime(lapTimeMs)}</span>
      </div>
      <div className="hud-timing__row hud-timing__row--small" data-testid="hud-best-lap">
        <span className="hud-label">Melhor volta</span>
        <span className="hud-value hud-value--mono">{formatTime(bestLapMs)}</span>
      </div>
    </div>
  );
}

function Speedometer(): JSX.Element {
  const speed = useHudStore((s) => s.hud.speedKmh);
  const boost = useHudStore((s) => s.hud.boost);
  const kmh = Math.max(0, Math.round(speed));
  const fill = Math.min(1, kmh / SPEEDO_MAX_KMH);
  return (
    <div className="hud-speed" data-testid="hud-speed" data-boosting={boost > 0.01} aria-label={`${kmh} quilômetros por hora`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="hud-speed__track" cx="50" cy="50" r="40" strokeDasharray={`${ARC_LENGTH} 251.3`} />
        <circle className="hud-speed__fill" cx="50" cy="50" r="40" strokeDasharray={`${(ARC_LENGTH * fill).toFixed(1)} 251.3`} />
      </svg>
      <span className="hud-speed__value" data-testid="hud-speed-value">{kmh}</span>
      <span className="hud-speed__unit">km/h</span>
    </div>
  );
}

function ItemBox(): JSX.Element {
  const item = useHudStore((s) => s.hud.item);
  const rolling = useHudStore((s) => s.hud.itemRolling);
  const [rollIndex, setRollIndex] = useState(0);
  useEffect(() => {
    if (!rolling) return undefined;
    const timer = window.setInterval(() => setRollIndex((i) => (i + 1) % ITEMS.length), 85);
    return () => window.clearInterval(timer);
  }, [rolling]);
  const shown = rolling ? ITEMS[rollIndex] : item ? ITEM_BY_ID[item] : null;
  return (
    <div
      className="hud-item" data-testid="hud-item" data-item={rolling ? 'rolling' : item ?? 'none'} data-rolling={rolling}
      style={{ '--item-color': shown?.color ?? 'transparent' } as CSSProperties}
      aria-label={rolling ? 'Sorteando item' : shown ? `Item: ${shown.name}` : 'Sem item'}
    >
      <div className="hud-item__box">
        {shown && <AssetImg key={shown.id} className="hud-item__img" src={assetUrl(`ui/items/${shown.id}.webp`)} alt="" label={shown.name} color={shown.color} />}
      </div>
      <span className="hud-item__name">{rolling ? '…' : shown?.name ?? 'Sem item'}</span>
    </div>
  );
}

function DriftAndBoost(): JSX.Element {
  const level = useHudStore((s) => s.hud.driftLevel);
  const charge = useHudStore((s) => s.hud.driftCharge);
  const boost = useHudStore((s) => s.hud.boost);
  const shield = useHudStore((s) => s.hud.shield);
  const c = Math.min(1, Math.max(0, charge));
  return (
    <div className="hud-meters hud-panel">
      <div className="hud-drift" data-testid="hud-drift" data-level={level} aria-label={level > 0 ? `Drift nível ${level}: ${DRIFT_NAMES[level]}` : 'Drift'}>
        <span className="hud-label">Drift</span>
        <div className="hud-drift__segments">
          {[1, 2, 3].map((n) => {
            // Segmento cheio se o nível já foi atingido; o seguinte mostra a carga parcial.
            const fill = level >= n ? 1 : level === n - 1 ? c : 0;
            return (
              <span key={n} className="hud-drift__seg" data-seg={n} data-full={level >= n}>
                <span className="hud-drift__fill" style={{ transform: `scaleX(${fill.toFixed(3)})` }} />
              </span>
            );
          })}
        </div>
      </div>
      <div className="hud-boost" data-testid="hud-boost" data-active={boost > 0.01} aria-label="Turbo">
        <span className="hud-label">Turbo</span>
        <div className="hud-boost__bar"><span className="hud-boost__fill" style={{ transform: `scaleX(${Math.min(1, Math.max(0, boost)).toFixed(3)})` }} /></div>
      </div>
      <div className="hud-shield" data-testid="hud-shield" data-active={shield} aria-label={shield ? 'Escudo ativo' : 'Sem escudo'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 4 5v6c0 5 3.400 9.400 8 11 4.600-1.600 8-6 8-11V5l-8-3Z" /></svg>
        <span>Escudo</span>
      </div>
    </div>
  );
}

function Countdown(): JSX.Element | null {
  const countdown = useHudStore((s) => s.hud.countdown);
  if (countdown < 0) return null;
  const text = countdown === 0 ? 'VAI!' : String(countdown);
  return (
    <div className="hud-countdown" data-testid="hud-countdown" data-go={countdown === 0} role="status" aria-live="assertive">
      <span key={countdown} className="hud-countdown__text">{text}</span>
    </div>
  );
}

function Alerts(): JSX.Element {
  const alerts = useHudStore((s) => s.hud.alerts);
  const wrongWay = useHudStore((s) => s.hud.wrongWay);
  const phase = useHudStore((s) => s.hud.phase);
  return (
    <div className="hud-alerts" data-testid="hud-alerts" aria-live="polite">
      {wrongWay && <div className="hud-alert hud-alert--warn hud-alert--wrongway" data-testid="hud-wrong-way">Contramão!</div>}
      {alerts.map((a) => <div key={a.id} className={`hud-alert hud-alert--${a.kind}`}>{a.text}</div>)}
      {phase === 'finished' && <div className="hud-alert hud-alert--good hud-alert--finish" data-testid="hud-finished">Chegada!</div>}
    </div>
  );
}

export function Hud(): JSX.Element | null {
  const race = useGameStore((s) => s.race);
  if (!race) return null;
  const solo = race.mode === 'timetrial' || race.mode === 'training';
  return (
    <div className="hud" data-testid="hud" data-mode={race.mode}>
      <div className="hud__top-left">
        {!solo && <Position />}
        <LapAndTime training={race.mode === 'training'} />
      </div>
      <div className="hud__top-right">
        <Minimap trackId={race.trackId} />
      </div>
      <div className="hud__top-center"><Alerts /></div>
      <div className="hud__bottom-left"><ItemBox /></div>
      <div className="hud__bottom-right">
        <DriftAndBoost />
        <Speedometer />
      </div>
      {race.mode === 'training' && <p className="hud__hint">Treino livre · pause para sair</p>}
      <Countdown />
      <TouchControls />
    </div>
  );
}
