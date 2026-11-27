(() => {
  if (__game.session) __game.session.match.paused = false;
  __game.demoVenue(0);
  const s = __game.session; const m = s.match; m.players[0].human = false;
  const stats = {};
  for (let i = 0; i < 60 * 240; i++) {
    for (const p of m.players) {
      if (p.swingT >= 0 && p.swingT < 1 / 60 && m.lastHitter !== p.side) {
        const h = p.athlete.racketHeadWorld(); const b = m.ball.pos;
        const loc = (v) => ({ r: (v.x - p.pos.x) * p.end, f: -(v.z - p.pos.z) * p.end, h: v.y });
        const k = p.athlete.oneShotName;
        (stats[k] = stats[k] || []).push([loc(h), loc(b)]);
      }
    }
    __game.simulate(1 / 60);
  }
  const out = {};
  for (const [k, arr] of Object.entries(stats)) {
    const avg = (f) => (arr.reduce((a, x) => a + f(x), 0) / arr.length).toFixed(2);
    out[k] = { n: arr.length, head: [avg((x) => x[0].r), avg((x) => x[0].f), avg((x) => x[0].h)], ball: [avg((x) => x[1].r), avg((x) => x[1].f), avg((x) => x[1].h)] };
  }
  return JSON.stringify(out);
})()
