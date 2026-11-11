// ep0: model sheet. Not part of the season: it checks the cast's look, expressions and lip-sync shapes.
import { juninho, cleide, controle, ze, coco, toilet, chinelo } from '../../lib/chars.js';
import { text } from '../../lib/fx.js';
import { alien, imperador, salsicha, coxinha, cafe, sanduiche, mortadela, pastel, hamburguer, pizza, queijo, tomate, requeijao, pipoca, bola, disco } from '../../lib/chars2.js';
export const META = { num: 0, title: 'FOLHA DE MODELO', total: 8 };
export const LINES = [], SFX = [];
export async function makeShots() {
  return [{ t0: 0, draw(g, lt) {
    if (lt >= 4) {
      g.fillStyle = '#e6f7ff'; g.fillRect(0, 0, 1080, 1920); const f = lt % 2 < 1 ? 'angry' : 'cry';
      text(g, 'ELENCO 2 · ' + f, 540, 70, { size: 60 });
      alien(g, { x: 270, y: 800, s: .95, t: lt, face: f, talk: .5, armR: 2.4, inR: g2 => sanduiche(g2, { s: .5, y: 40 }) });
      imperador(g, { x: 780, y: 860, s: .9, t: lt, talk: .4 });
      salsicha(g, { x: 120, y: 1260, s: .9, t: lt }); salsicha(g, { x: 300, y: 1260, s: .9, t: lt, seed: 2 });
      coxinha(g, { x: 560, y: 1290, s: 1.0, t: lt, armR: 2.8, talk: .5 });
      cafe(g, { x: 880, y: 1300, s: 1, t: lt, talk: .6 });
      sanduiche(g, { x: 150, y: 1560, s: .7, alive: true }); mortadela(g, { x: 330, y: 1560, s: .8, alive: true, face: 'shock' }); pastel(g, { x: 500, y: 1560, s: .8, alive: true, face: 'hero' });
      hamburguer(g, { x: 680, y: 1560, s: .7, alive: true, face: 'angry' }); pizza(g, { x: 860, y: 1580, s: .7, alive: true });
      queijo(g, { x: 150, y: 1820, s: .7, alive: true }); tomate(g, { x: 330, y: 1820, s: .8, alive: true, face: 'shock' }); requeijao(g, { x: 500, y: 1820, s: .8 });
      pipoca(g, 640, 1760, 1.2); bola(g, 760, 1760, 60, lt); disco(g, 930, 1760, .6, lt);
      return;
    }
    g.fillStyle = '#efe6ff'; g.fillRect(0, 0, 1080, 1920);
    const faces = ['smug', 'shock', 'panic', 'dumb', 'think', 'pain', 'happy', 'angry'];
    const f = faces[Math.floor(lt) % faces.length];
    text(g, 'FOLHA DE MODELO · ' + f, 540, 70, { size: 60 });
    juninho(g, { x: 280, y: 760, s: 1, face: f, t: lt, talk: lt % 1 > .5 ? .7 : 0, armR: { a: 1.2, b: .9 }, inR: g => controle(g, { s: .3, glow: 0 }) });
    cleide(g, { x: 800, y: 760, s: 1, face: lt % 2 < 1 ? 'angry' : 'shock', t: lt, talk: .6, armR: { a: 2.6, b: .3 } });
    ze(g, { x: 280, y: 1560, s: .95, t: lt, talk: lt % 1 > .5 ? .6 : 0 });
    controle(g, { x: 700, y: 1080, s: .9, t: lt, face: ['neutral', 'bored', 'evil', 'alarm'][Math.floor(lt) % 4], talk: .6, press: 'red' });
    coco(g, { x: 880, y: 1560, s: 1.2, crown: true, t: lt, talk: .5, face: 'happy', dance: true });
    coco(g, { x: 640, y: 1560, s: .6, t: lt, face: 'smug', dance: true, seed: 2 });
  } }];
}
