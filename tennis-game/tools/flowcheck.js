(() => {
  __game.demoVenue(2);
  const s = () => __game.session;
  s().match.players[0].human = false;
  let seen = { afterPoint: 0, replay: 0, changeEnds: 0 };
  for (let i = 0; i < 1600; i++) {
    __game.simulate(0.25);
    const f = s().flow;
    if (f in seen) seen[f]++;
    if (f === 'replay' && seen.replay > 6) break;
  }
  const m = s().match;
  return JSON.stringify({ seen, flow: s().flow, t: m.time.toFixed(0), games: m.score.games, pts: m.score.points, log: m.pointLog.slice(-12).map((p) => p.winner + '-' + p.reason).join(' ') });
})()
