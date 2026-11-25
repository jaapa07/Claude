import type { CSSProperties } from 'react';
import { useGameStore } from '@/app/gameStore';
import { ARENA_BY_ID, BATTLE_GAME_BY_ID } from '@/data/battle';
import { CHARACTER_BY_ID } from '@/data/characters';
import { KART_BY_ID } from '@/data/karts';
import { assetUrl } from '@/game/core/assets';
import { BattleIcon } from './BattleSelect';
import { AssetImg, Btn, PlayerTag, ScreenShell } from './common';
import { ordinal } from './format';

const UNLOCK_KIND = { character: 'Novo piloto', kart: 'Novo kart', cup: 'Nova copa' } as const;

/** Resultado da Batalha: classificação final, pontuação de cada um, moedas e o que fazer em seguida. */
export function BattleResultsScreen(): JSX.Element | null {
  const result = useGameStore((s) => s.lastBattle);
  const rewards = useGameStore((s) => s.lastRewards);
  const restartRace = useGameStore((s) => s.restartRace);
  const quitToMenu = useGameStore((s) => s.quitToMenu);
  const goTo = useGameStore((s) => s.goTo);
  if (!result) return null;
  const game = BATTLE_GAME_BY_ID[result.game];
  const arena = ARENA_BY_ID[result.arenaId];
  const outs = result.players && result.players.length > 1 ? result.players : null;
  const two = !!outs;
  const best = outs ? Math.min(...outs.map((o) => o.position)) : result.playerPosition;
  const win = best === 1;
  const winner = outs?.find((o) => o.position === 1);
  const changeGame = (): void => { quitToMenu(); goTo('battleGame'); };
  return (
    <ScreenShell id="results" layout="full" title="Resultado da batalha" kicker={`${game.name} · ${arena.name}`}>
      <div className="results" style={{ '--game-color': game.color } as CSSProperties}>
        <div className="panel results__main">
          <p className="results__headline" data-testid="results-headline" data-podium={best <= 3}>
            {outs
              ? (winner ? `Vitória do Jogador ${winner.slot + 1}!` : outs.map((o) => `J${o.slot + 1}: ${ordinal(o.position)}`).join(' · '))
              : win ? 'Vitória!' : `${ordinal(result.playerPosition)} lugar`}
          </p>
          <table className="table results__table" data-testid="results-table">
            <thead>
              <tr><th scope="col">Pos.</th><th scope="col">Piloto</th><th scope="col">{game.scoreLabel}</th><th scope="col">Acertos</th><th scope="col">Golpes sofridos</th></tr>
            </thead>
            <tbody>
              {result.standings.map((r) => {
                const c = CHARACTER_BY_ID[r.characterId];
                return (
                  <tr key={r.racerIndex} data-player={r.isPlayer} data-slot={r.isPlayer ? r.slot ?? 0 : undefined} data-testid={`results-row-${r.position}`} style={{ '--row-color': c.color } as CSSProperties}>
                    <td className="table__pos">{ordinal(r.position)}</td>
                    <td>
                      <span className="racer">
                        <AssetImg className="racer__icon" src={assetUrl(`ui/icons/${c.id}.webp`)} alt="" label={c.name} color={c.color} />
                        <span className="racer__name">{c.name}{r.isPlayer && <PlayerTag slot={r.slot} two={two} />}</span>
                        <span className="racer__kart">{KART_BY_ID[r.kartId].name}</span>
                      </span>
                    </td>
                    <td className="table__num">
                      <span className="battle-results__score"><BattleIcon game={result.game} />{r.score}</span>
                      {r.eliminated && <span className="battle-results__out"> · fora</span>}
                    </td>
                    <td className="table__num">{r.hitsLanded}</td>
                    <td className="table__num">{r.hitsTaken}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="results__side">
          {rewards && rewards.coins > 0 && (
            <div className="panel reward reward--coins" data-testid="results-coins">
              <h2 className="group-title">Moedas</h2>
              <p className="coin-badge coin-badge--big"><span className="coin-badge__icon" aria-hidden="true" />+{rewards.coins.toLocaleString('pt-BR')}</p>
              {rewards.coinsBySlot && (
                <p className="reward__split" data-testid="results-coins-split">
                  {rewards.coinsBySlot.map((c, i) => <span key={i}>Jogador {i + 1}: +{c.toLocaleString('pt-BR')}</span>)}
                </p>
              )}
            </div>
          )}
          {rewards && rewards.unlocks.length > 0 && (
            <div className="panel reward reward--unlock" data-testid="results-unlocks">
              <h2 className="group-title">Desbloqueado</h2>
              <ul>{rewards.unlocks.map((u) => <li key={`${u.kind}-${u.id}`}><span className="tag">{UNLOCK_KIND[u.kind]}</span> {u.name}</li>)}</ul>
            </div>
          )}
          {(outs ?? [{ slot: 0, stats: result.stats }]).map((o) => (
            <div className="panel results__stats" key={o.slot} data-testid={outs ? `results-stats-p${o.slot + 1}` : undefined}>
              <h2 className="group-title">{outs ? `Partida do Jogador ${o.slot + 1}` : 'Sua partida'}</h2>
              <dl className="mini-stats">
                <div><dt>Acertos</dt><dd>{o.stats.hitsLanded}</dd></div>
                <div><dt>Golpes sofridos</dt><dd>{o.stats.hitsTaken}</dd></div>
                <div><dt>Itens usados</dt><dd>{o.stats.itemsUsed}</dd></div>
                <div><dt>Duração</dt><dd>{Math.floor(result.durationMs / 60000)}:{String(Math.floor((result.durationMs % 60000) / 1000)).padStart(2, '0')}</dd></div>
              </dl>
            </div>
          ))}
          <div className="results__actions">
            <Btn testId="btn-retry" onClick={restartRace}>Jogar de novo</Btn>
            <Btn testId="btn-battle-change" onClick={changeGame}>Outro minijogo</Btn>
            <Btn testId="btn-continue" variant="primary" autoFocusNav onClick={quitToMenu}>Voltar ao menu</Btn>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
