import type { CSSProperties } from 'react';
import { MODE_INFO } from '@/app/flow';
import { pointsForPosition, useGameStore } from '@/app/gameStore';
import { CHARACTER_BY_ID } from '@/data/characters';
import { KART_BY_ID } from '@/data/karts';
import { CUP_BY_ID, TRACK_BY_ID } from '@/data/tracks';
import { assetUrl } from '@/game/core/assets';
import { AssetImg, Btn, PlayerTag, ScreenShell } from './common';
import { formatTime, ordinal } from './format';

const UNLOCK_KIND = { character: 'Novo piloto', kart: 'Novo kart', cup: 'Nova copa' } as const;

export function ResultsScreen(): JSX.Element | null {
  const result = useGameStore((s) => s.lastResult);
  const rewards = useGameStore((s) => s.lastRewards);
  const championship = useGameStore((s) => s.championship);
  const continueAfterResults = useGameStore((s) => s.continueAfterResults);
  const restartRace = useGameStore((s) => s.restartRace);
  if (!result) return null;

  const solo = result.mode === 'timetrial' || result.mode === 'training';
  const rows = [...result.results].sort((a, b) => a.position - b.position);
  const track = TRACK_BY_ID[result.trackId];
  const modeName = MODE_INFO.find((m) => m.id === result.mode)?.name ?? '';
  const player = rows.find((r) => r.isPlayer);
  // tela dividida: os dois jogadores destacados, colocações e moedas de cada um
  const outs = result.players && result.players.length > 1 ? result.players : null;
  const two = !!outs;
  const fastestLap = rows.reduce<number | null>((best, r) => (r.bestLapMs !== null && (best === null || r.bestLapMs < best) ? r.bestLapMs : best), null);

  let continueLabel = 'Voltar ao menu';
  if (championship) continueLabel = championship.finished ? 'Ver pódio' : 'Próxima corrida';
  else if (result.mode === 'quick') continueLabel = 'Ver pódio';

  const headline = solo
    ? (result.playerTimeMs !== null ? formatTime(result.playerTimeMs) : 'Sessão encerrada')
    : outs
      ? outs.map((o) => `J${o.slot + 1}: ${ordinal(o.position)}`).join(' · ')
      : `${ordinal(result.playerPosition)} lugar`;
  const bestPlace = outs ? Math.min(...outs.map((o) => o.position)) : result.playerPosition;

  return (
    <ScreenShell id="results" layout="full" title="Resultados" kicker={`${modeName} · ${track.name}`}>
      <div className="results">
        <div className="panel results__main">
          <p className="results__headline" data-testid="results-headline" data-podium={!solo && bestPlace <= 3}>{headline}</p>
          <table className="table results__table" data-testid="results-table">
            <thead>
              <tr>
                <th scope="col">Pos.</th><th scope="col">Piloto</th><th scope="col">Tempo</th><th scope="col">Melhor volta</th>
                {!solo && <th scope="col">Pontos</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
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
                    <td className="table__num">{r.totalTimeMs === null ? 'Não concluiu' : r.estimated ? <span title="Estimado: ainda não tinha cruzado a chegada">≈ {formatTime(r.totalTimeMs)}</span> : formatTime(r.totalTimeMs)}</td>
                    <td className="table__num" data-best={r.bestLapMs !== null && r.bestLapMs === fastestLap}>{formatTime(r.bestLapMs)}</td>
                    {!solo && <td className="table__num">+{pointsForPosition(r.position)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {solo && player && player.lapTimesMs.length > 0 && (
            <ol className="laps" data-testid="results-laps">
              {player.lapTimesMs.map((ms, i) => (
                <li key={i} data-best={ms === player.bestLapMs}><span>Volta {i + 1}</span><span>{formatTime(ms)}</span></li>
              ))}
            </ol>
          )}
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
          {rewards && (rewards.newRecords.raceTime || rewards.newRecords.bestLap) && (
            <div className="panel reward reward--record" data-testid="results-records">
              <h2 className="group-title">Novo recorde!</h2>
              {rewards.newRecords.raceTime && <p>Melhor tempo na pista: <strong>{formatTime(result.playerTimeMs)}</strong></p>}
              {rewards.newRecords.bestLap && <p>Melhor volta: <strong>{formatTime(result.playerBestLapMs)}</strong></p>}
            </div>
          )}
          {rewards && rewards.unlocks.length > 0 && (
            <div className="panel reward reward--unlock" data-testid="results-unlocks">
              <h2 className="group-title">Desbloqueado</h2>
              <ul>
                {rewards.unlocks.map((u) => <li key={`${u.kind}-${u.id}`}><span className="tag">{UNLOCK_KIND[u.kind]}</span> {u.name}</li>)}
              </ul>
            </div>
          )}
          {championship && (
            <div className="panel" data-testid="results-standings">
              <h2 className="group-title">
                {CUP_BY_ID[championship.cupId].name} · {championship.finished ? 'classificação final' : `após a corrida ${championship.raceIndex + 1} de ${CUP_BY_ID[championship.cupId].tracks.length}`}
              </h2>
              <table className="table table--compact">
                <tbody>
                  {championship.standings.map((e, i) => {
                    const c = CHARACTER_BY_ID[e.characterId];
                    return (
                      <tr key={e.characterId} data-player={e.isPlayer} style={{ '--row-color': c.color } as CSSProperties}>
                        <td className="table__pos">{ordinal(i + 1)}</td>
                        <td>{c.name}{e.isPlayer && <PlayerTag slot={e.slot} two={two} />}</td>
                        <td className="table__num">{e.points} pts</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!solo && (outs ?? [{ slot: 0, stats: result.stats }]).map((o) => (
            <div className="panel results__stats" key={o.slot} data-testid={outs ? `results-stats-p${o.slot + 1}` : undefined}>
              <h2 className="group-title">{outs ? `Corrida do Jogador ${o.slot + 1}` : 'Sua corrida'}</h2>
              <dl className="mini-stats">
                <div><dt>Miniturbos</dt><dd>{o.stats.turbos[0] + o.stats.turbos[1] + o.stats.turbos[2]}</dd></div>
                <div><dt>Itens usados</dt><dd>{o.stats.itemsUsed}</dd></div>
                <div><dt>Golpes sofridos</dt><dd>{o.stats.hitsTaken}</dd></div>
                <div><dt>Vel. máxima</dt><dd>{Math.round(o.stats.topSpeedKmh)} km/h</dd></div>
              </dl>
            </div>
          ))}
          <div className="results__actions">
            {!championship && <Btn testId="btn-retry" onClick={restartRace}>{solo ? 'Tentar de novo' : 'Correr de novo'}</Btn>}
            <Btn testId="btn-continue" variant="primary" autoFocusNav onClick={continueAfterResults}>{continueLabel}</Btn>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
