(() => { const s = __game.session; if (s.opts.demo) return 'demo'; s.match.score.winner = 0; s.match.score.setHistory = [[3, 1]]; s['beginMatchEnd'](); __game.simulate(7.2); return s.flow; })()
