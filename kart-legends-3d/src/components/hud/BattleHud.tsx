import type { CSSProperties } from 'react';
import { useGameStore } from '@/app/gameStore';
import { BattleIcon } from '@/components/ui/BattleSelect';
import { AssetImg } from '@/components/ui/common';
import { BATTLE_GAME_BY_ID, BATTLE_RULES } from '@/data/battle';
import { CHARACTER_BY_ID } from '@/data/characters';
import { useBattleHudStore } from '@/game/battle/battleHudStore';
import type { BattleHudSnapshot } from '@/game/battle/battleSim';
import { assetUrl } from '@/game/core/assets';
import { useSceneStore } from '@/scenes/sceneStore';
import { Countdown, ItemBox } from './Hud';
import { TouchControls } from './TouchControls';

const mmss = (ms: number): string => {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function Timer({ hud }: { hud: BattleHudSnapshot }): JSX.Element {
  const meta = BATTLE_GAME_BY_ID[hud.game];
  const hurry = hud.phase === 'racing' && hud.timeLeftMs <= 30000;
  return (
    <div className="battle-timer hud-panel" data-testid="hud-battle-timer" data-hurry={hurry} data-frenzy={hud.frenzy}>
      <span className="battle-timer__game"><BattleIcon game={hud.game} className="battle-timer__icon" />{meta.name}</span>
      <span className="battle-timer__clock">{mmss(hud.timeLeftMs)}</span>
      {hud.frenzy && <span className="battle-timer__frenzy">Frenesi!</span>}
    </div>
  );
}

function Status({ hud }: { hud: BattleHudSnapshot }): JSX.Element {
  const color = CHARACTER_BY_ID[hud.board.find((r) => r.isPlayer)?.characterId ?? 'nilo'].color;
  if (hud.game === 'estoura-balao') {
    return (
      <div className="battle-status battle-status--balloons" data-testid="hud-battle-score" data-score={hud.balloons} aria-label={`${hud.balloons} balões`} style={{ '--me': color } as CSSProperties}>
        {Array.from({ length: BATTLE_RULES.balloons.max }, (_, i) => (
          <span key={i} className="battle-balloon" data-on={i < hud.balloons} data-extra={i >= BATTLE_RULES.balloons.start}><BattleIcon game="estoura-balao" /></span>
        ))}
      </div>
    );
  }
  if (hud.game === 'caca-cristais') {
    return (
      <div className="battle-status battle-status--crystals" data-testid="hud-battle-score" data-score={hud.crystals} aria-label={`${hud.crystals} cristais`}>
        <BattleIcon game="caca-cristais" className="battle-status__icon" />
        <span className="battle-status__value">{hud.crystals}</span>
      </div>
    );
  }
  const fill = Math.min(1, hud.crownPoints / BATTLE_RULES.crown.target);
  return (
    <div className="battle-status battle-status--crown" data-testid="hud-battle-score" data-score={hud.crownPoints} data-holding={hud.holdingCrown} aria-label={`${hud.crownPoints} pontos`}>
      <BattleIcon game="rei-da-coroa" className="battle-status__icon" />
      <span className="battle-status__value">{hud.crownPoints}<small>/{BATTLE_RULES.crown.target}</small></span>
      <span className="battle-status__bar"><span style={{ transform: `scaleX(${fill.toFixed(3)})` }} /></span>
      {hud.holdingCrown && <span className="battle-status__tag">Coroado!</span>}
    </div>
  );
}

function Board({ hud }: { hud: BattleHudSnapshot }): JSX.Element {
  return (
    <ol className="battle-board hud-panel" data-testid="hud-battle-board" aria-label="Placar">
      {hud.board.map((r) => {
        const c = CHARACTER_BY_ID[r.characterId];
        return (
          <li key={r.index} className="battle-board__row" data-player={r.isPlayer} data-out={r.out} data-crown={r.crown} style={{ '--row-color': c.color } as CSSProperties}>
            <span className="battle-board__pos">{r.position}</span>
            <AssetImg className="battle-board__icon" src={assetUrl(`ui/icons/${c.id}.webp`)} alt="" label={c.name} color={c.color} />
            <span className="battle-board__name">{r.isPlayer ? 'Você' : c.name}</span>
            <span className="battle-board__score">{r.out ? '✕' : r.score}</span>
          </li>
        );
      })}
    </ol>
  );
}

function BattleMinimap({ hud }: { hud: BattleHudSnapshot }): JSX.Element | null {
  const arena = useBattleHudStore((s) => s.arena);
  if (!arena) return <div className="hud-minimap hud-panel" data-testid="hud-minimap" data-state="loading" />;
  const m = arena.minimap;
  const size = Math.max(m.maxX - m.minX, m.maxZ - m.minZ);
  const pad = size * 0.06;
  const r = size * 0.024;
  const outline = [];
  for (let i = 0; i + 1 < m.outline.length; i += 2) outline.push(`${m.outline[i]},${m.outline[i + 1]}`);
  const holder = hud.dots.find((d) => d.crown && !d.out);
  return (
    <div className="hud-minimap hud-panel battle-minimap" data-testid="hud-minimap" data-state="ready">
      <svg viewBox={`${m.minX - pad} ${m.minZ - pad} ${m.maxX - m.minX + pad * 2} ${m.maxZ - m.minZ + pad * 2}`} role="img" aria-label="Mapa da arena">
        <polygon className="battle-minimap__floor" points={outline.join(' ')} strokeWidth={size * 0.012} />
        {m.rects.map((q, i) => (
          <rect key={i} className="battle-minimap__block" x={-q.hx} y={-q.hz} width={q.hx * 2} height={q.hz * 2} transform={`translate(${q.x} ${q.z}) rotate(${(-q.rotY * 180) / Math.PI})`} />
        ))}
        {m.circles.filter((c) => c.r > 1.5).map((c, i) => <circle key={i} className="battle-minimap__block" cx={c.x} cy={c.z} r={c.r} />)}
        {hud.crystalDots.length > 0 && hud.crystalDots.map((v, i) => (i % 2 === 0 ? <rect key={i} className="battle-minimap__crystal" x={v - r * 0.5} y={hud.crystalDots[i + 1]! - r * 0.5} width={r} height={r} transform={`rotate(45 ${v} ${hud.crystalDots[i + 1]})`} /> : null))}
        {hud.crown && hud.crown.free && <circle className="battle-minimap__crown" cx={hud.crown.x} cy={hud.crown.z} r={r * 1.5} strokeWidth={r * 0.5} />}
        {holder && <circle className="battle-minimap__holder" cx={holder.x} cy={holder.z} r={r * 2.4} strokeWidth={r * 0.6} />}
        {hud.dots.filter((d) => !d.out && !d.isPlayer).map((d) => (
          <circle key={d.characterId} className="hud-minimap__dot" cx={d.x} cy={d.z} r={r} fill={CHARACTER_BY_ID[d.characterId].color} strokeWidth={r * 0.35} />
        ))}
        {hud.dots.filter((d) => !d.out && d.isPlayer).map((d) => (
          <circle key={d.characterId} className="hud-minimap__dot hud-minimap__dot--player" data-testid="hud-minimap-player" cx={d.x} cy={d.z} r={r * 1.5} fill={CHARACTER_BY_ID[d.characterId].color} strokeWidth={r * 0.6} />
        ))}
      </svg>
    </div>
  );
}

function Alerts({ hud }: { hud: BattleHudSnapshot }): JSX.Element {
  return (
    <div className="hud-alerts" data-testid="hud-alerts" aria-live="polite">
      {hud.alerts.map((a) => <div key={a.id} className={`hud-alert hud-alert--${a.kind}`}>{a.text}</div>)}
    </div>
  );
}

function Spectate({ hud }: { hud: BattleHudSnapshot }): JSX.Element | null {
  const fast = useBattleHudStore((s) => s.fast);
  const setFast = useBattleHudStore((s) => s.setFast);
  if (!hud.out || hud.phase === 'finished') return null;
  return (
    <div className="battle-spectate" data-testid="battle-spectate">
      <p className="battle-spectate__title">Você está fora!</p>
      {hud.spectating && <p className="battle-spectate__who">Assistindo {CHARACTER_BY_ID[hud.spectating].name}</p>}
      <button type="button" className="btn btn--secondary battle-spectate__btn" data-testid="btn-battle-fast" aria-pressed={fast} onClick={() => setFast(!fast)}>
        <span className="btn__label">{fast ? 'Velocidade normal' : 'Acelerar até o fim ▸▸'}</span>
      </button>
    </div>
  );
}

function Final({ hud }: { hud: BattleHudSnapshot }): JSX.Element | null {
  if (hud.phase !== 'finished') return null;
  const winner = hud.board[0];
  if (!winner) return null;
  const mine = winner.isPlayer;
  return (
    <div className="battle-final" data-testid="hud-battle-final" data-win={mine}>
      <span className="battle-final__kicker">Fim de jogo!</span>
      <span className="battle-final__text">{mine ? 'Você venceu!' : `${CHARACTER_BY_ID[winner.characterId].name} venceu!`}</span>
    </div>
  );
}

/** HUD da Batalha: relógio, placar do jogador, placar geral, mapa da arena, alertas, item e controles de toque. */
export function BattleHud(): JSX.Element | null {
  const battle = useGameStore((s) => s.battle);
  const hud = useBattleHudStore((s) => s.hud);
  const sceneLoading = useSceneStore((s) => s.loading);
  if (!battle) return null;
  return (
    <div className="hud hud--battle" data-testid="hud" data-mode="battle" data-game={battle.game} data-scene-loading={sceneLoading} style={sceneLoading ? { visibility: 'hidden' } : undefined}>
      {hud && (
        <>
          <div className="hud__top-left battle-top-left">
            <Timer hud={hud} />
            <Status hud={hud} />
          </div>
          <div className="battle-board-wrap"><Board hud={hud} /></div>
          <div className="hud__top-right"><BattleMinimap hud={hud} /></div>
          <div className="hud__top-center"><Alerts hud={hud} /></div>
          <Spectate hud={hud} />
          <Final hud={hud} />
        </>
      )}
      <div className="hud__bottom-left"><ItemBox /></div>
      <Countdown />
      <TouchControls />
    </div>
  );
}
