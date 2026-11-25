import './style.css';
import { World } from './game/World';
import { Flow } from './ui/Flow';
import { input } from './core/Input';
import { TouchControls, setupMobileBrowser } from './ui/Touch';
import Stats from 'stats.js';

const world = new World(document.getElementById('view')!);
const flow = new Flow(world);
// iPhone/Android: joystick e botões na tela + ajustes do navegador
const touch = input.touch ? new TouchControls(flow) : null;
setupMobileBrowser();
const G = ((window as any).__game = { world, flow, input, touch, speed: 1 });

// ?stats mostra o painel de FPS (stats.js)
const stats = new URLSearchParams(location.search).has('stats') ? new Stats() : null;
if (stats) { stats.showPanel(0); stats.dom.style.zIndex = '100'; document.body.appendChild(stats.dom); }
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  input.update(dt);
  // G.speed > 1 acelera o tempo de jogo (usado pelos testes automatizados)
  for (let i = 0; i < G.speed; i++) flow.update(dt);
  touch?.update();
  world.render();
  stats?.update();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
flow.boot().catch((e) => {
  console.error(e);
  document.getElementById('ui')!.innerHTML = `<div class="screen boot"><h1 class="title">Erro ao carregar</h1><p>${String(e)}</p></div>`;
});
