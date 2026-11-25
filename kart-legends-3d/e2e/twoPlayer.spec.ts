import { expect, test, type Page } from '@playwright/test';
import { boot, finishWithAutopilot, goRacing, hook, play, trackErrors, waitForRace, type Snapshot } from './helpers';

/** Tela dividida (2 jogadores). */
interface PlayerSnap extends Snapshot { players: number; slot: number; characterId: string }
const snapOf = (page: Page, slot: number): Promise<PlayerSnap> =>
  page.evaluate((s) => (window as unknown as { __kl3d: { snapshotOf: (s: number) => PlayerSnap } }).__kl3d.snapshotOf(s), slot);

/** Escolhe piloto e kart de cada jogador, na vez dele. */
async function pickBoth(page: Page, p1: string, p2: string): Promise<void> {
  await expect(page.getByTestId('screen-character')).toBeVisible();
  await expect(page.getByTestId('player-turn')).toHaveText('Jogador 1');
  await page.getByTestId(`card-character-${p1}`).click();
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-kart')).toBeVisible();
  await expect(page.getByTestId('btn-confirm')).toContainText('Vez do Jogador 2');
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-character2')).toBeVisible();
  await expect(page.getByTestId('player-turn')).toHaveText('Jogador 2');
  // o piloto do Jogador 1 não pode ser escolhido de novo
  await expect(page.getByTestId(`card-character-${p1}`)).toHaveAttribute('data-locked', 'true');
  await page.getByTestId(`card-character-${p2}`).click();
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-kart2')).toBeVisible();
  await expect(page.getByTestId('btn-confirm')).toContainText('Correr!');
  await page.getByTestId('btn-confirm').click();
  await waitForRace(page);
}

test('2 jogadores: corrida rápida em tela dividida com teclas reais até os resultados', async ({ page }) => {
  const errors = trackErrors(page);
  await boot(page);
  await play(page, 2);
  // Contrarrelógio e Treino ficam de fora com dois jogadores
  await expect(page.getByTestId('card-mode-timetrial')).toHaveCount(0);
  await expect(page.getByTestId('card-mode-training')).toHaveCount(0);
  await page.getByTestId('card-mode-quick').click();
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('card-track-canion-solar').click();
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('card-difficulty-easy').click();
  await page.getByTestId('btn-confirm').click();
  await pickBoth(page, 'nilo', 'lumi');

  await expect(page.getByTestId('hud')).toHaveAttribute('data-players', '2');
  await expect(page.getByTestId('hud-p1')).toBeVisible();
  await expect(page.getByTestId('hud-p2')).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toHaveAttribute('data-split', '1');
  const [a, b] = [await snapOf(page, 0), await snapOf(page, 1)];
  expect(a.players).toBe(2);
  expect(a.racers).toBe(8);
  expect([a.characterId, b.characterId]).toEqual(['nilo', 'lumi']);

  await goRacing(page);
  // J1 acelera com W, J2 com ↑ (teclas reais), cada um no próprio kart
  await page.keyboard.down('KeyW');
  await hook(page, 'fastForward(1.5)');
  expect((await snapOf(page, 0)).speed).toBeGreaterThan(5);
  expect(Math.abs((await snapOf(page, 1)).speed)).toBeLessThan(2);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('ArrowRight');
  const h0 = (await snapOf(page, 1)).heading;
  await hook(page, 'fastForward(1.5)');
  const p2 = await snapOf(page, 1);
  expect(p2.speed).toBeGreaterThan(5);
  expect(p2.heading).not.toBeCloseTo(h0, 2);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.up('ArrowRight');
  // item do J2 com Enter
  await hook(page, "giveItem('pulso-solar', 1)");
  await page.keyboard.down('Enter');
  await hook(page, 'fastForward(0.1)');
  await page.keyboard.up('Enter');
  expect((await snapOf(page, 1)).boost).toBeGreaterThan(0.5);
  // pausa (Esc) para os dois e volta
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('screen-pause')).toBeVisible();
  await page.getByTestId('btn-resume').click();
  await expect(page.getByTestId('screen-pause')).toHaveCount(0);

  await finishWithAutopilot(page);
  const rows = page.getByTestId('results-table').locator('tbody tr');
  await expect(rows).toHaveCount(8);
  await expect(page.getByTestId('results-table').locator('tr[data-player="true"]')).toHaveCount(2);
  await expect(page.getByTestId('tag-p1')).toBeVisible();
  await expect(page.getByTestId('tag-p2')).toBeVisible();
  await expect(page.getByTestId('results-headline')).toContainText('J1');
  await expect(page.getByTestId('results-headline')).toContainText('J2');
  await expect(page.getByTestId('results-coins-split')).toContainText('Jogador 2');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('kl3d.save') ?? '{}') as { stats?: { races?: number } });
  expect(saved.stats?.races).toBe(1); // uma corrida no save compartilhado
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('screen-podium')).toBeVisible();
  expect(errors).toEqual([]);
});

test('2 jogadores: batalha começa em tela dividida com um HUD por jogador', async ({ page }) => {
  const errors = trackErrors(page);
  await boot(page);
  await play(page, 2);
  await page.getByTestId('card-mode-battle').click();
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('card-battle-estoura-balao').click();
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('card-arena-praca-coreto').click();
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('card-difficulty-easy').click();
  await page.getByTestId('btn-confirm').click();
  await pickBoth(page, 'boro', 'nilo');

  await expect(page.getByTestId('hud')).toHaveAttribute('data-mode', 'battle');
  await expect(page.getByTestId('hud')).toHaveAttribute('data-players', '2');
  await expect(page.getByTestId('hud-p1').getByTestId('hud-battle-score')).toHaveAttribute('data-score', '3');
  await expect(page.getByTestId('hud-p2').getByTestId('hud-battle-board').locator('li')).toHaveCount(8);
  await goRacing(page);
  await page.keyboard.down('ArrowUp');
  await hook(page, 'fastForward(1.5)');
  await page.keyboard.up('ArrowUp');
  expect((await snapOf(page, 1)).speed).toBeGreaterThan(5);
  expect((await snapOf(page, 1)).characterId).toBe('nilo');
  expect(errors).toEqual([]);
});

test('celular: sem a opção de 2 jogadores', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await boot(page);
  await page.getByTestId('btn-play').click();
  await expect(page.getByTestId('screen-mode')).toBeVisible();
  await expect(page.getByTestId('screen-players')).toHaveCount(0);
  await expect(page.getByTestId('card-mode-timetrial')).toBeVisible();
  await ctx.close();
});
