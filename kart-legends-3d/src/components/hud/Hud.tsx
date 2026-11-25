import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { TRAINING_LAPS, useGameStore } from '@/app/gameStore';
import { ITEMS, ITEM_BY_ID } from '@/data/items';
import { assetUrl } from '@/game/core/assets';
import { CHARACTER_BY_ID } from '@/data/characters';
import { AssetImg } from '@/components/ui/common';
import { formatTime } from '@/components/ui/format';
import { useSceneStore } from '@/scenes/sceneStore';
import { HudSlotContext, useHud } from './hudSlot';
import { Minimap } from './Minimap';
import { TouchControls } from './TouchControls';

/** Velocidade em que o arco do velocímetro fica cheio. */
const SPEEDO_MAX_KMH = 160;
const ARC_LENGTH = 188.5; // ¾ de círculo com r = 40
const DRIFT_NAMES = ['', 'Faísca azul', 'Faísca laranja', 'Faísca magenta'] as const;

function Position(): JSX.Element {
  const position = useHud((h) => h.position);
  const total = useHud((h) => h.totalRacers);
  return (
    <div className="hud-position" data-testid="hud-position" data-place={position} aria-label={`Posição ${position} de ${total}`}>
      <span className="hud-position__value">{position}º</span><span className="hud-position__total">/{total}</span>
    </div>
  );
}

function LapAndTime({ training }: { training: boolean }): JSX.Element {
  const lap = useHud((h) => h.lap);
  const totalLaps = useHud((h) => h.totalLaps);
  const timeMs = useHud((h) => h.timeMs);
  const lapTimeMs = useHud((h) => h.lapTimeMs);
  const bestLapMs = useHud((h) => h.bestLapMs);
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
  const speed = useHud((h) => h.speedKmh);
  const boost = useHud((h) => h.boost);
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

export function ItemBox(): JSX.Element {
  const item = useHud((h) => h.item);
  const rolling = useHud((h) => h.itemRolling);
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
  const level = useHud((h) => h.driftLevel);
  const charge = useHud((h) => h.driftCharge);
  const boost = useHud((h) => h.boost);
  const shield = useHud((h) => h.shield);
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

export function Countdown(): JSX.Element | null {
  const countdown = useHud((h) => h.countdown);
  if (countdown < 0) return null;
  const text = countdown === 0 ? 'VAI!' : String(countdown);
  return (
    <div className="hud-countdown" data-testid="hud-countdown" data-go={countdown === 0} role="status" aria-live="assertive">
      <span key={countdown} className="hud-countdown__text">{text}</span>
    </div>
  );
}

function Alerts(): JSX.Element {
  const alerts = useHud((h) => h.alerts);
  const wrongWay = useHud((h) => h.wrongWay);
  const phase = useHud((h) => h.phase);
  // Este jogador já chegou (na tela dividida o outro pode ainda estar correndo).
  const done = useHud((h) => h.finished ?? h.phase === 'finished');
  return (
    <div className="hud-alerts" data-testid="hud-alerts" aria-live="polite">
      {wrongWay && <div className="hud-alert hud-alert--warn hud-alert--wrongway" data-testid="hud-wrong-way">Contramão!</div>}
      {alerts.map((a) => <div key={a.id} className={`hud-alert hud-alert--${a.kind}`}>{a.text}</div>)}
      {(done || phase === 'finished') && <div className="hud-alert hud-alert--good hud-alert--finish" data-testid="hud-finished">Chegada!</div>}
    </div>
  );
}

/** Etiqueta "J1"/"J2" com a cor do piloto, no canto de cada metade da tela dividida. */
export function PlayerBadge({ slot, characterId }: { slot: number; characterId: string | undefined }): JSX.Element {
  const c = characterId ? CHARACTER_BY_ID[characterId as keyof typeof CHARACTER_BY_ID] : undefined;
  return (
    <div className="hud-player-badge" data-testid={`hud-badge-p${slot + 1}`} style={{ '--badge-color': c?.color ?? '#fff' } as CSSProperties}>
      <span className="hud-player-badge__tag">J{slot + 1}</span>
      <span className="hud-player-badge__name">{c?.name ?? `Jogador ${slot + 1}`}</span>
    </div>
  );
}

/** Painéis de um jogador (posição, voltas, mapa, alertas, item, drift/turbo, velocidade). */
function PlayerPanels({ race, solo }: { race: NonNullable<ReturnType<typeof useGameStore.getState>['race']>; solo: boolean }): JSX.Element {
  return (
    <>
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
    </>
  );
}

export function Hud(): JSX.Element | null {
  const race = useGameStore((s) => s.race);
  const sceneLoading = useSceneStore((s) => s.loading);
  const phase = useHud((h) => h.phase);
  if (!race) return null;
  const solo = race.mode === 'timetrial' || race.mode === 'training';
  const humans = race.racers.filter((r) => r.isPlayer);
  if (humans.length >= 2) {
    // Tela dividida: Jogador 1 em cima, Jogador 2 embaixo; contagem no centro, comum aos dois.
    const bySlot = (slot: number) => humans.find((r) => (r.slot ?? 0) === slot) ?? humans[slot];
    return (
      <div className="hud hud--split" data-testid="hud" data-mode={race.mode} data-players="2" data-phase={phase} data-scene-loading={sceneLoading} style={sceneLoading ? { visibility: 'hidden' } : undefined}>
        {[0, 1].map((slot) => (
          <HudSlotContext.Provider key={slot} value={slot}>
            <div className={`hud hud--player hud--p${slot + 1}`} data-testid={`hud-p${slot + 1}`} data-slot={slot}>
              <PlayerPanels race={race} solo={solo} />
              <PlayerBadge slot={slot} characterId={bySlot(slot)?.characterId} />
            </div>
          </HudSlotContext.Provider>
        ))}
        <div className="hud-split__divider" aria-hidden="true" />
        <Countdown />
      </div>
    );
  }
  return (
    <div className="hud" data-testid="hud" data-mode={race.mode} data-scene-loading={sceneLoading} style={sceneLoading ? { visibility: 'hidden' } : undefined}>
      <PlayerPanels race={race} solo={solo} />
      {race.mode === 'training' && <p className="hud__hint">Treino livre · pause para sair</p>}
      <Countdown />
      <TouchControls />
    </div>
  );
}
