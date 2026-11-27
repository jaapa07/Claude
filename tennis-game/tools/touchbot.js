(() => {
  // play with the on-screen controls API (Input.setTouch is what the stick and buttons call)
  const S = () => __game.session;
  const gm = __game;
  let hits = 0;
  for (let i = 0; i < 1500; i++) {
    const x = S().match; const me = x.players[0];
    const incoming = x.lastHitter === 1 && x.ball.active && x.phase === 'rally';
    const serve = (x.phase === 'preServe' && x.server === 0 && x.phaseT > 0.6) || (x.phase === 'toss' && x.server === 0 && x.serveMeter > 0.85);
    gm.touch({ shot: incoming || serve, x: incoming ? Math.sign(x.ball.pos.x - me.pos.x) * 0.5 : 0 });
    const r = x.rally;
    gm.simulate(1 / 30);
    if (serve) gm.touch({ shot: false }), gm.simulate(1 / 30);
    if (x.rally !== r && x.lastHitter === 0) hits++;
  }
  gm.touch({ shot: false, x: 0 });
  const x = S().match;
  return JSON.stringify({ hits, games: x.score.games, pts: x.score.points, log: x.pointLog.map((p) => p.winner + '-' + p.reason).join(' ') });
})()
