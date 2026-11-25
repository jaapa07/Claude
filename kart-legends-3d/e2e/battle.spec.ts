import { expect, test, type Page } from '@playwright/test';
import { boot, goRacing, hook, snapshot, trackErrors, waitForRace } from './helpers';

interface BattleSnap { game: string; score: number; timeLeft: number; out: boolean; balloons: number; crystals: number; crown: number }
const battle = (page: Page): Promise<BattleSnap> =>
  page.evaluate(() => (window as unknown as { __kl3d: { snapshot: () => { battle: BattleSnap } } }).__kl3d.snapshot().battle);

test('menus da Batalha: modo → minijogo (regras) → arena → voltar', async ({ page }) => {
  const errors = trackErrors(page);
  await boot(page);
  await page.getByTestId('btn-play').click();
  await page.getByTestId('card-mode-battle').click();
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-battleGame')).toBeVisible();
  for (const id of ['estoura-balao', 'caca-cristais', 'rei-da-coroa']) await expect(page.getByTestId(`card-battle-${id}`)).toBeVisible();
  await page.getByTestId('card-battle-caca-cristais').click();
  await expect(page.getByTestId('battle-rules')).toContainText('Metade');
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-arena')).toBeVisible();
  await expect(page.getByTestId('card-arena-praca-coreto')).toBeVisible();
  await expect(page.getByTestId('card-arena-cratera-lunar')).toBeVisible();
  await page.getByTestId('btn-back').click();
  await expect(page.getByTestId('screen-battleGame')).toBeVisible();
  await page.getByTestId('btn-back').click();
  await expect(page.getByTestId('screen-mode')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Batalha completa: Estoura-Balão na Cratera Lunar até o resultado, moedas e volta ao menu', async ({ page }) => {
  const errors = trackErrors(page);
  await boot(page);
  await page.getByTestId('btn-play').click();
  await page.getByTestId('card-mode-battle').click();
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('card-battle-estoura-balao').click();
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('card-arena-cratera-lunar').click();
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('card-difficulty-easy').click();
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-character')).toBeVisible();
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-kart')).toBeVisible();
  await page.getByTestId('btn-confirm').click();
  await waitForRace(page);

  await expect(page.getByTestId('hud')).toHaveAttribute('data-mode', 'battle');
  await expect(page.getByTestId('hud-battle-timer')).toContainText('3:00');
  await expect(page.getByTestId('hud-battle-score')).toHaveAttribute('data-score', '3');
  await expect(page.getByTestId('hud-battle-board').locator('li')).toHaveCount(8);
  await expect(page.getByTestId('hud-minimap')).toHaveAttribute('data-state', 'ready');
  expect((await snapshot(page)).racers).toBe(8);

  await goRacing(page);
  // item pela tecla real (Shift) passa pela API genérica de itens
  await hook(page, "giveItem('pulso-solar')");
  await page.keyboard.down('ShiftLeft');
  await hook(page, 'fastForward(0.1)');
  await page.keyboard.up('ShiftLeft');
  await hook(page, 'fastForward(0.1)');
  expect((await snapshot(page)).boost).toBeGreaterThan(0.5);

  await hook(page, 'setAutopilot(true)');
  await hook(page, 'fastForward(5)');
  expect((await snapshot(page)).aiMoving).toBeGreaterThanOrEqual(5);
  for (let i = 0; i < 25; i++) {
    await hook(page, 'fastForward(10)');
    if ((await snapshot(page)).phase === 'finished') break;
  }
  expect((await snapshot(page)).phase).toBe('finished');
  expect((await battle(page)).timeLeft).toBeGreaterThanOrEqual(0);
  await expect(page.getByTestId('hud-battle-final')).toBeVisible();
  await expect(page.getByTestId('screen-results')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('results-table').locator('tbody tr')).toHaveCount(8);
  await expect(page.getByTestId('results-coins')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kl3d.save') ?? '{}') as { stats?: { battles?: number } });
  expect(saved.stats?.battles).toBe(1);
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('screen-menu')).toBeVisible();
  expect(errors).toEqual([]);
});
