(() => {
  if (__game.session) __game.session.match.paused = false;
  __game.demoVenue(1);
  const s = __game.session; const m = s.match; m.players[0].human = false;
  for (let i = 0; i < 8000; i++) {
    __game.simulate(1 / 60);
    const p = m.players.find((q) => q.swingT >= 0 && q.swingT < 0.02 && m.lastHitter !== q.side);
    if (p && m.time > 6) {
      const V = s.cam.cam.position.constructor;
      const at = p.pos.clone();
      s.cam.set({ kind: 'track', from: new V(at.x - 4.2, 1.5, at.z - 2.2 * p.end), target: () => new V(at.x, 1.0, at.z - 0.6 * p.end), fov: 38 });
      __game.simulate(1 / 60);
      m.paused = true;
      return JSON.stringify({ t: m.time.toFixed(1), anim: p.athlete.oneShotName, rally: m.rally, log: m.pointLog.map((x) => x.reason).join(' '), d: p.athlete.racketHeadWorld().distanceTo(m.ball.mesh.position).toFixed(2) });
    }
  }
  return 'none';
})()
