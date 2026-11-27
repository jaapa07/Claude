import { describe, it, expect } from 'vitest';
import { newScore, awardPoint, pointLabels, defaultConfig, callFor, serviceCourt, breakPoint, matchPointFor, type Side } from '../src/game/rules';

const play = (s: ReturnType<typeof newScore>, seq: Side[], cfg = defaultConfig()) => seq.map((w) => awardPoint(s, w, cfg));

describe('rules', () => {
  it('counts 15-30-40-game', () => {
    const s = newScore(0);
    play(s, [0]); expect(pointLabels(s)).toEqual(['15', '0']);
    play(s, [0, 0]); expect(callFor(s)).toBe('40 - LOVE');
    const [o] = play(s, [0]);
    expect(o.gameWon).toBe(0);
    expect(s.games).toEqual([1, 0]);
    expect(s.server).toBe(1);
    expect(o.changeEnds).toBe(true); // after game 1
  });
  it('handles deuce and advantage', () => {
    const s = newScore(0);
    play(s, [0, 1, 0, 1, 0, 1]);
    expect(callFor(s)).toBe('DEUCE');
    play(s, [1]);
    expect(pointLabels(s)).toEqual(['40', 'AD']);
    expect(callFor(s)).toBe('ADVANTAGE RECEIVER');
    expect(breakPoint(s, defaultConfig())).toBe(true);
    play(s, [0]);
    expect(callFor(s)).toBe('DEUCE');
    const r = play(s, [0, 0]);
    expect(r[1].gameWon).toBe(0);
  });
  it('alternates service court', () => {
    const s = newScore(0);
    expect(serviceCourt(s)).toBe('deuce');
    play(s, [1]);
    expect(serviceCourt(s)).toBe('ad');
  });
  it('plays a tie-break at 6-6 and wins the set 7-6', () => {
    const cfg = defaultConfig();
    const s = newScore(0);
    const game = (w: Side) => play(s, [w, w, w, w], cfg);
    for (let i = 0; i < 6; i++) { game(0); game(1); }
    expect(s.games).toEqual([6, 6]);
    expect(s.tiebreak).toBe(true);
    const tbServer = s.server;
    const outs = play(s, [0, 0, 0, 0, 0, 0, 0], cfg);
    expect(s.server).not.toBe(undefined);
    expect(outs[6].setWon).toBe(0);
    expect(outs[6].matchWon).toBe(0);
    expect(s.setHistory[0]).toEqual([7, 6]);
    expect(s.winner).toBe(0);
    void tbServer;
  });
  it('detects match point', () => {
    const cfg = { ...defaultConfig(), gamesPerSet: 2, tiebreakAt: 2 };
    const s = newScore(0);
    play(s, [0, 0, 0, 0], cfg);
    play(s, [0, 0, 0], cfg);
    expect(matchPointFor(s, cfg)).toBe(0);
  });
  it('best of 3 needs two sets', () => {
    const cfg = { ...defaultConfig(), sets: 3 as const, gamesPerSet: 1, tiebreakAt: null };
    const s = newScore(0);
    const r1 = play(s, [0, 0, 0, 0], cfg);
    expect(r1[3].setWon).toBe(null); // 1-0 is not 2 clear
    play(s, [0, 0, 0, 0], cfg);
    expect(s.sets).toEqual([1, 0]);
    expect(s.winner).toBe(null);
  });
});
