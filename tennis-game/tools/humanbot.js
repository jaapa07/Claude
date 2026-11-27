(() => {
  const S = () => __game.session;
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
  // start an exhibition-like human session quickly: replace attract session's p1 with human
  const s = S(); const m = s.match; m.players[0].human = true; s.opts.demo = false;
  let hits = 0, returns = 0, misses = 0, log = [];
  let down = false;
  for (let i = 0; i < 4000; i++) {
    const x = S().match;
    const me = x.players[0];
    const incoming = x.lastHitter === 1 && x.ball.active && x.phase === 'rally';
    if (x.phase === 'preServe' && x.server === 0 && x.phaseT > 0.6) { key('keydown', 'KeyJ'); key('keyup', 'KeyJ'); }
    if (x.phase === 'toss' && x.server === 0 && x.serveMeter > 0.9) { key('keydown', 'KeyJ'); key('keyup', 'KeyJ'); }
    if (incoming && !me.charging && me.swingT < 0 && !down) { key('keydown', 'KeyJ'); down = true; }
    if (!incoming && down) { key('keyup', 'KeyJ'); down = false; }
    const before = x.rally;
    __game.simulate(1 / 30);
    if (x.lastHitter === 0 && before !== x.rally) hits++;
  }
  const x = S().match;
  return JSON.stringify({ hits, log: x.pointLog.map((p) => p.winner + '-' + p.reason).join(' '), games: x.score.games, st: x.players.map((p) => [p.stats.pointsWon, p.stats.winners, p.stats.errors]) });
})()
