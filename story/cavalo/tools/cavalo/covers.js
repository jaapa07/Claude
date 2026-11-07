// covers.js — the three parts' covers (1080 x 1920 JPG): a clean frame of the film (no part tag, no captions) under the
// series pill and a two-line title, in the style of the earlier series. From story/cavalo/, with serve.py on 8765:
//   node tools/cavalo/covers.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const COVERS = [
  // dy: how far down the frame is moved, so the faces sit under the title (the gap above is the same frame, blurred)
  { part: 1, beat: 0, t: 0.95, a: 'TEM UM CAVALO', b: 'NO BANHEIRO', dy: 330 },
  { part: 2, beat: 1, t: 4.7, a: 'O CAVALO', b: 'ROUBOU MEU BAR', dy: 300 },
  { part: 3, beat: 3, t: 11.4, a: 'A ÉGUA TEVE', b: 'UMA ZEBRA', dy: 300 },
];
const font = f => 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, 'fonts', f)).toString('base64');
(async () => {
  const b = await chromium.launch();
  for (const c of COVERS) {
    const pg = await b.newPage({ viewport: { width: 900, height: 1700 }, deviceScaleFactor: 1.2 });
    await pg.goto(`http://localhost:8765/cavalo/ch0${c.part}/?beat=${c.beat}&t=${c.t}`);
    await pg.waitForTimeout(2500);
    // drop the PARTE N tag and the player around the stage
    await pg.evaluate(() => { for (const t of document.querySelectorAll('#stage text')) if (/^PARTE \d$/.test(t.textContent)) t.parentNode.remove(); });
    const shot = await (await pg.$('#stage')).screenshot({ type: 'png' });
    await pg.close();
    const html = `<!doctype html><html><head><style>
      @font-face { font-family: Osw; font-weight: 600; src: url(${font('Oswald-normal-600-latin.woff2')}); unicode-range: U+0000-00FF; }
      @font-face { font-family: Osw; font-weight: 600; src: url(${font('Oswald-normal-600-latin-ext.woff2')}); unicode-range: U+0100-024F; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; }
      .blur { position: absolute; inset: -60px; background: url(data:image/png;base64,${shot.toString('base64')}) center top / cover; filter: blur(28px) brightness(.8); }
      .bg { position: absolute; left: 0; right: 0; top: ${c.dy}px; height: 1920px; background: url(data:image/png;base64,${shot.toString('base64')}) center top / cover;
            -webkit-mask: linear-gradient(transparent, #000 160px); }
      .shade { position: absolute; left: 0; right: 0; top: 0; height: 980px; background: linear-gradient(#1b0f08dd, #1b0f0888 55%, #1b0f0800); }
      .wrap { position: absolute; top: 255px; left: 40px; right: 40px; text-align: center; font-family: Osw; font-weight: 600; }
      .pill { display: inline-block; background: #d6372b; color: #fff; font-size: 50px; letter-spacing: 1px; padding: 6px 38px 10px; border-radius: 60px; }
      .t { line-height: 1.02; text-transform: uppercase; paint-order: stroke fill; -webkit-text-stroke: 18px #141010; }
      .a { color: #fff; margin-top: 24px; } .b { color: #ff5a4d; }
    </style></head><body><div class="blur"></div><div class="bg"></div><div class="shade"></div><div class="wrap">
      <div class="pill">PÕE NA CONTA DO CAVALO · PT ${c.part}</div>
      <div class="t a" id="a">${c.a}</div><div class="t b" id="b">${c.b}</div></div>
      <script>for (const id of ['a', 'b']) { const e = document.getElementById(id); let s = 170; e.style.fontSize = s + 'px';
        e.style.whiteSpace = 'nowrap'; while (e.scrollWidth > 1000 && s > 60) e.style.fontSize = (s -= 4) + 'px'; }</script></body></html>`;
    const cp = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    await cp.setContent(html); await cp.waitForTimeout(400);
    const out = `parte${c.part}-capa.jpg`;
    await cp.screenshot({ path: out, type: 'jpeg', quality: 90 });
    await cp.close(); console.log('wrote', out);
  }
  await b.close();
})();
