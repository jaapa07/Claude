import { expect, test } from '@playwright/test';
import { boot, play, trackErrors } from './helpers';

const CHARACTERS = ['nilo', 'boro', 'lumi', 'kora', 'tiko', 'mavi', 'runi', 'zera', 'capi', 'tuca'];
/** Segunda página da seleção: os ninjas exclusivos da loja. */
const NINJAS = ['yuki', 'kaito', 'ren', 'sora'];
const KARTS = ['flecha', 'engrenagem', 'cometa', 'broto', 'faisca', 'mare', 'duna', 'geada'];
const TRACKS = ['porto-lanternas', 'bosque-cristal', 'vale-moinhos', 'canion-solar', 'cidade-neon', 'pico-boreal', 'jardim-celeste', 'fortaleza-tempestade',
  'recife-coral', 'templo-esmeralda', 'vulcao-rubro', 'estacao-lunar'];

test('inicialização: carrega todos os assets e chega ao menu sem erros', async ({ page }) => {
  const errors = trackErrors(page);
  await boot(page);
  await expect(page.getByTestId('loading-error')).toHaveCount(0);
  await expect(page.getByTestId('game-canvas').locator('canvas')).toBeVisible();
  await expect(page.getByTestId('btn-play')).toBeVisible();
  await expect(page.getByTestId('btn-progress')).toBeVisible();
  await expect(page.getByTestId('btn-settings')).toBeVisible();
  // o manifesto e todos os recursos listados nele respondem (nenhuma referência quebrada)
  const broken = await page.evaluate(async () => {
    const m = await (await fetch('assets/manifest.json')).json() as { assets: { path: string }[] };
    const bad: string[] = [];
    for (const a of m.assets) { const r = await fetch(`assets/${a.path}`, { method: 'HEAD' }); if (!r.ok) bad.push(a.path); }
    return { total: m.assets.length, bad };
  });
  expect(broken.total).toBeGreaterThan(200);
  expect(broken.bad).toEqual([]);
  expect(errors).toEqual([]);
});

test('menus: todos os modos, copas, pistas, personagens e karts aparecem e a navegação volta', async ({ page }) => {
  const errors = trackErrors(page);
  await boot(page);
  await play(page);
  await expect(page.getByTestId('screen-mode')).toBeVisible();
  for (const m of ['quick', 'championship', 'timetrial', 'training']) await expect(page.getByTestId(`card-mode-${m}`)).toBeVisible();

  // campeonato → copas (Eclipse bloqueada no save novo)
  await page.getByTestId('card-mode-championship').click();
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-cup')).toBeVisible();
  await expect(page.getByTestId('card-cup-aurora')).toHaveAttribute('data-locked', 'false');
  await expect(page.getByTestId('card-cup-eclipse')).toHaveAttribute('data-locked', 'true');
  await expect(page.getByTestId('card-cup-meteoro')).toHaveAttribute('data-locked', 'true');
  await page.getByTestId('btn-back').click();
  await expect(page.getByTestId('screen-mode')).toBeVisible();

  // corrida rápida → 12 pistas → dificuldade → 8 personagens → 8 karts
  await page.getByTestId('card-mode-quick').click();
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-track')).toBeVisible();
  for (const t of TRACKS) await expect(page.getByTestId(`card-track-${t}`)).toBeVisible();
  await page.getByTestId('card-track-vale-moinhos').click();
  await expect(page.getByTestId('card-track-vale-moinhos')).toHaveAttribute('data-selected', 'true');
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-difficulty')).toBeVisible();
  for (const d of ['easy', 'normal', 'hard']) await expect(page.getByTestId(`card-difficulty-${d}`)).toBeVisible();
  await page.getByTestId('card-difficulty-hard').click();
  await page.getByTestId('btn-confirm').click();

  await expect(page.getByTestId('screen-character')).toBeVisible();
  for (const c of CHARACTERS) await expect(page.getByTestId(`card-character-${c}`)).toBeVisible();
  await page.getByTestId('roster-page-ninjas').click();
  for (const c of NINJAS) await expect(page.getByTestId(`card-character-${c}`)).toBeVisible();
  await expect(page.getByTestId('card-coming-soon')).toHaveCount(4);
  await page.getByTestId('card-character-kaito').click();
  await expect(page.getByTestId('lock-condition')).toContainText('Loja');
  await page.getByTestId('roster-page-main').click();
  await page.getByTestId('card-character-zera').click();
  await expect(page.getByTestId('lock-condition')).toBeVisible();
  await page.getByTestId('card-character-kora').click();
  await expect(page.getByTestId('card-character-kora')).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('game-canvas')).toHaveAttribute('data-mode', 'showcase');
  await page.getByTestId('btn-confirm').click();

  await expect(page.getByTestId('screen-kart')).toBeVisible();
  for (const k of KARTS) await expect(page.getByTestId(`card-kart-${k}`)).toBeVisible();
  await page.getByTestId('card-kart-cometa').click();
  await expect(page.getByTestId('kart-stats')).toBeVisible();
  for (const s of ['topSpeed', 'acceleration', 'braking', 'handling', 'grip', 'mass', 'driftEfficiency', 'recovery']) await expect(page.getByTestId(`stat-${s}`)).toBeVisible();

  // voltar por toda a cadeia até o menu
  await page.getByTestId('btn-back').click();
  await expect(page.getByTestId('screen-character')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('screen-difficulty')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('screen-mode')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('screen-players')).toBeVisible();
  // O quadro de teclas acompanha a escolha: 1 jogador mostra as teclas configuradas; 2 jogadores, o padrão fixo.
  await page.getByTestId('card-players-1').click();
  await expect(page.getByTestId('players-keys')).toHaveAttribute('data-players', '1');
  await expect(page.getByTestId('players-key-drift')).toContainText('Espaço');
  await page.getByTestId('card-players-2').click();
  await expect(page.getByTestId('players-keys')).toHaveAttribute('data-players', '2');
  await expect(page.getByTestId('players-keys')).toContainText('Backspace');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('screen-menu')).toBeVisible();
  expect(errors).toEqual([]);
});

test('configurações e progressão: volumes, qualidade, remapeamento e abas funcionam e persistem', async ({ page }) => {
  await boot(page);
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('screen-settings')).toBeVisible();
  await page.getByTestId('slider-volume-music').fill('30');
  await page.getByTestId('slider-volume-sfx').fill('70');
  await page.getByTestId('slider-volume-ambient').fill('10');
  await page.getByTestId('btn-quality-medium').click();
  await expect(page.getByTestId('btn-quality-medium')).toHaveAttribute('data-selected', 'true');
  await page.getByTestId('btn-quality-low').click();
  await page.getByTestId('slider-sensitivity').fill('120');
  // remapeia "drift" para a tecla K
  await page.getByTestId('btn-remap-drift-0').click();
  await expect(page.getByTestId('btn-remap-drift-0')).toHaveAttribute('data-capturing', 'true');
  await page.keyboard.press('KeyK');
  await expect(page.getByTestId('btn-remap-drift-0')).toContainText('K');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kl3d.settings.v1') ?? '{}') as { volumes: { music: number; sfx: number; ambient: number }; bindings: { drift: string[] }; sensitivity: number });
  expect(saved.volumes.music).toBeCloseTo(0.3, 2);
  expect(saved.volumes.sfx).toBeCloseTo(0.7, 2);
  expect(saved.volumes.ambient).toBeCloseTo(0.1, 2);
  expect(saved.bindings.drift[0]).toBe('KeyK');
  expect(saved.sensitivity).toBeCloseTo(1.2, 2);
  await page.getByTestId('btn-reset-bindings').click();
  await expect(page.getByTestId('btn-remap-drift-0')).not.toContainText('K');
  await page.getByTestId('btn-back').click();
  await expect(page.getByTestId('screen-menu')).toBeVisible();

  await page.getByTestId('btn-progress').click();
  await expect(page.getByTestId('screen-progress')).toBeVisible();
  await expect(page.getByTestId('trophy-aurora')).toBeVisible();
  await expect(page.getByTestId('trophy-meteoro')).toBeVisible();
  await page.getByTestId('btn-tab-times').click();
  await expect(page.getByTestId('times-row-porto-lanternas')).toBeVisible();
  await page.getByTestId('btn-tab-unlocks').click();
  await expect(page.getByTestId('unlock-c-nilo')).toHaveAttribute('data-unlocked', 'true');
  await expect(page.getByTestId('unlock-c-zera')).toHaveAttribute('data-unlocked', 'false');
  await page.getByTestId('btn-back').click();
  await expect(page.getByTestId('screen-menu')).toBeVisible();
});
