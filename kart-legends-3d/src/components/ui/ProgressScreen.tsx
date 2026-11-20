import { useState } from 'react';
import type { CSSProperties } from 'react';
import { CHARACTERS } from '@/data/characters';
import { KARTS } from '@/data/karts';
import { CUPS, CUP_BY_ID, CUP_UNLOCK, TRACKS } from '@/data/tracks';
import { describeUnlock } from '@/data/unlocks';
import type { UnlockRule } from '@/data/unlocks';
import { useSaveStore } from '@/game/save/saveStore';
import { LockBadge, ScreenShell } from './common';
import { TROPHY_LABEL, formatDuration, formatTime } from './format';
import { uiSfx } from './uiAudio';

type Tab = 'overview' | 'times' | 'unlocks';
const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Troféus e estatísticas' },
  { id: 'times', label: 'Melhores tempos' },
  { id: 'unlocks', label: 'Desbloqueios' },
];

interface UnlockRow { key: string; kind: string; name: string; color: string; rule: UnlockRule; unlocked: boolean }

export function ProgressScreen({ onBack }: { onBack: () => void }): JSX.Element {
  const [tab, setTab] = useState<Tab>('overview');
  const save = useSaveStore();
  const { stats } = save;

  const unlockRows: UnlockRow[] = [
    ...CHARACTERS.map((c) => ({ key: `c-${c.id}`, kind: 'Piloto', name: c.name, color: c.color, rule: c.unlock, unlocked: save.unlocked.characters.includes(c.id) })),
    ...KARTS.map((k) => ({ key: `k-${k.id}`, kind: 'Kart', name: k.name, color: k.primary, rule: k.unlock, unlocked: save.unlocked.karts.includes(k.id) })),
    ...CUPS.map((c) => ({ key: `p-${c.id}`, kind: 'Copa e pistas', name: c.name, color: c.color, rule: CUP_UNLOCK[c.id] as UnlockRule, unlocked: save.unlocked.cups.includes(c.id) })),
  ];
  const unlockedCount = unlockRows.filter((r) => r.unlocked).length;

  return (
    <ScreenShell id="progress" title="Progressão" layout="full" kicker={`${unlockedCount} de ${unlockRows.length} itens liberados`} onBack={onBack}>
      <div className="tabs" role="tablist">
        {TABS.map((t, i) => (
          <button
            key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="tabs__item" data-selected={tab === t.id}
            data-testid={`btn-tab-${t.id}`} data-autofocus={i === 0 ? 'true' : undefined}
            onClick={() => {
              uiSfx('ui_select');
              setTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="progress-grid" data-testid="progress-overview">
          <section className="panel" aria-labelledby="pg-trophies">
            <h2 id="pg-trophies" className="group-title">Troféus</h2>
            <ul className="trophies">
              {CUPS.map((cup) => {
                const tier = save.trophies[cup.id];
                return (
                  <li key={cup.id} className="trophy" data-tier={tier ?? 'none'} data-testid={`trophy-${cup.id}`}>
                    <svg className="trophy__icon" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="currentColor" d="M14 6h20v4h8v6c0 5-3.6 9.2-8.4 9.9A10 10 0 0 1 26 31.8V36h6v6H16v-6h6v-4.200A10 10 0 0 1 14.400 25.900C9.600 25.200 6 21 6 16v-6h8V6Zm0 8h-4v2c0 2.600 1.700 4.800 4 5.700V14Zm20 7.700c2.300-.9 4-3.100 4-5.700v-2h-4v7.700Z" />
                    </svg>
                    <span className="trophy__cup">{cup.name}</span>
                    <span className="trophy__tier">{tier ? TROPHY_LABEL[tier] : save.unlocked.cups.includes(cup.id) ? 'Ainda sem troféu' : 'Copa bloqueada'}</span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="panel" aria-labelledby="pg-stats">
            <h2 id="pg-stats" className="group-title">Estatísticas</h2>
            <dl className="mini-stats mini-stats--wide" data-testid="progress-stats">
              <div><dt>Corridas</dt><dd data-testid="stat-races">{stats.races}</dd></div>
              <div><dt>Vitórias</dt><dd data-testid="stat-wins">{stats.wins}</dd></div>
              <div><dt>Pódios</dt><dd>{stats.podiums}</dd></div>
              <div><dt>Copas concluídas</dt><dd>{stats.championships}</dd></div>
              <div><dt>Contrarrelógios</dt><dd>{stats.timeTrials}</dd></div>
              <div><dt>Miniturbos nível 1</dt><dd>{stats.turbos[0]}</dd></div>
              <div><dt>Miniturbos nível 2</dt><dd>{stats.turbos[1]}</dd></div>
              <div><dt>Miniturbos nível 3</dt><dd>{stats.turbos[2]}</dd></div>
              <div><dt>Itens usados</dt><dd>{stats.itemsUsed}</dd></div>
              <div><dt>Tempo jogado</dt><dd>{formatDuration(stats.playTimeMs)}</dd></div>
            </dl>
          </section>
        </div>
      )}

      {tab === 'times' && (
        <section className="panel" data-testid="progress-times">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Pista</th><th scope="col">Copa</th><th scope="col">Melhor corrida</th><th scope="col">Melhor volta</th>
                <th scope="col">Contrarrelógio</th><th scope="col">Volta (contrarrelógio)</th>
              </tr>
            </thead>
            <tbody>
              {TRACKS.map((t) => {
                const r = save.records[t.id];
                return (
                  <tr key={t.id} data-testid={`times-row-${t.id}`} style={{ '--row-color': t.colorA } as CSSProperties}>
                    <th scope="row">{t.name}</th>
                    <td>{CUP_BY_ID[t.cup].name}</td>
                    <td className="table__num">{formatTime(r.bestRaceMs)}</td>
                    <td className="table__num">{formatTime(r.bestLapMs)}</td>
                    <td className="table__num">{formatTime(r.timeTrialMs)}</td>
                    <td className="table__num">{formatTime(r.timeTrialLapMs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'unlocks' && (
        <section className="panel" data-testid="progress-unlocks">
          <ul className="unlock-list">
            {unlockRows.map((row) => (
              <li key={row.key} className="unlock" data-unlocked={row.unlocked} data-testid={`unlock-${row.key}`} style={{ '--row-color': row.color } as CSSProperties}>
                <span className="unlock__state">{row.unlocked ? '✓' : <LockBadge />}</span>
                <span className="unlock__name">{row.name}<span className="unlock__kind">{row.kind}</span></span>
                <span className="unlock__rule">{describeUnlock(row.rule)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </ScreenShell>
  );
}
