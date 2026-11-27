(() => {
  __game.demoDoubles(0);
  const s = __game.session; const m = s.match; m.players[0].human = false;
  const servers = [];
  for (let i = 0; i < 60 * 240; i++) { __game.simulate(1 / 60); if (m.phase === 'toss' && servers[servers.length - 1] !== m.serverP.def.short) servers.push(m.serverP.def.short); }
  return JSON.stringify({ games: m.score.games, pts: m.score.points, log: m.pointLog.map((p) => p.winner + '-' + p.reason).join(' '), servers: servers.join(','), rally: m.rally });
})()
