(() => {
  // realistic human: presses the shot button with random timing (early/late), no stick input
  const S = () => __game.session; const key = (t, c) => window.dispatchEvent(new KeyboardEvent(t, { code: c }));
  const s = S(); s.match.players[0].human = true; s.opts.demo = false;
  let returns = 0, chances = 0, prevHitter = null, pressAt = null;
  for (let i = 0; i < 60 * 150; i++) {
    const x = S().match; const me = x.players[0];
    if (x.phase === 'preServe' && x.server === 0 && x.phaseT > 0.6) { key('keydown', 'KeyJ'); key('keyup', 'KeyJ'); }
    if (x.phase === 'toss' && x.server === 0 && x.serveMeter > 0.85) { key('keydown', 'KeyJ'); key('keyup', 'KeyJ'); }
    if (x.lastHitter !== prevHitter) {
      if (x.lastHitter === 1 && x.phase === 'rally') { chances++; pressAt = x.time + 0.15 + Math.random() * 0.9; }
      if (x.lastHitter === 0 && prevHitter === 1) returns++;
      prevHitter = x.lastHitter;
    }
    if (pressAt !== null && x.time >= pressAt) { key('keydown', 'KeyJ'); key('keyup', 'KeyJ'); pressAt = null; }
    __game.simulate(1 / 60);
  }
  const x = S().match;
  return JSON.stringify({ chances, returns, rate: (returns / Math.max(1, chances)).toFixed(2), log: x.pointLog.map((p) => p.winner + '-' + p.reason).join(' ') });
})()
