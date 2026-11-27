(() => {
  if (__game.session) __game.session.match.paused = false;
  __game.demoVenue(0);
  const s = __game.session; const m = s.match; m.players[0].human = false;
  const target = +(window.__serveFrac ?? 0.5);
  for (let i = 0; i < 60 * 30; i++) {
    __game.simulate(1 / 60);
    const sv = m.players[m.server];
    const act = sv.athlete.oneShot;
    if (m.phase === 'toss' && act && act.time >= target) {
      const V = s.cam.cam.position.constructor; const at = sv.pos.clone();
      s.cam.set({ kind: 'track', from: new V(at.x - 4.5, 1.8, at.z - 3.5 * sv.end), target: () => new V(at.x, 1.6, at.z), fov: 40 });
      __game.simulate(1 / 60); m.paused = true;
      return JSON.stringify({ t: act.time.toFixed(2), ballY: m.ball.mesh.position.y.toFixed(2), head: sv.athlete.racketHeadWorld().y.toFixed(2), hop: sv.athlete.root.position.y.toFixed(2) });
    }
  }
  return 'none ' + m.phase;
})()
