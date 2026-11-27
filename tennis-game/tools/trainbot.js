(() => {
  const S = () => __game.session;
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
  let down = false;
  for (let i = 0; i < 600; i++) {
    const x = S().match; const me = x.players[0];
    const incoming = x.lastHitter === 1 && x.ball.active;
    if (incoming && !down && me.swingT < 0) { key('keydown', 'KeyJ'); down = true; }
    if (!incoming && down) { key('keyup', 'KeyJ'); down = false; }
    __game.simulate(1 / 30);
  }
  return document.querySelector('.banner')?.innerText;
})()
