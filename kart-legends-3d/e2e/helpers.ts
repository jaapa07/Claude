import { expect, type Page } from '@playwright/test';

export interface Snapshot {
  phase: string; raceTime: number; racers: number; lap: number; position: number; speed: number; heading: number; x: number; z: number;
  drifting: boolean; driftLevel: number; boost: number; item: string | null; grounded: boolean; progress: number; finished: number; aiMoving: number;
}

/** Erros de console/página acumulados durante o teste. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  return errors;
}

/** Abre o jogo (qualidade baixa para o renderizador por software) e passa pela tela de carregamento. */
export async function boot(page: Page, opts: { clearSave?: boolean } = {}): Promise<void> {
  await page.addInitScript((clear) => {
    if (clear && !sessionStorage.getItem('e2e-cleared')) { localStorage.clear(); sessionStorage.setItem('e2e-cleared', '1'); }
    if (!localStorage.getItem('kl3d.settings.v1')) localStorage.setItem('kl3d.settings.v1', JSON.stringify({ quality: 'low' }));
  }, opts.clearSave ?? true);
  await page.goto('/?fast=1&e2e=1');
  await expect(page.getByTestId('screen-loading')).toBeVisible();
  await page.getByTestId('btn-start').click({ timeout: 180_000 });
  await expect(page.getByTestId('screen-menu')).toBeVisible();
}

export const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => (window as unknown as { __kl3d: { snapshot: () => Snapshot } }).__kl3d.snapshot());

export const hook = (page: Page, call: string): Promise<void> =>
  page.evaluate((c) => { new Function('k', `k.${c}`)((window as unknown as { __kl3d: unknown }).__kl3d); }, call);

/** Menu → Jogar → escolha de 1 ou 2 jogadores (tela que só existe no computador) → escolha do modo. */
export async function play(page: Page, players: 1 | 2 = 1): Promise<void> {
  await page.getByTestId('btn-play').click();
  await expect(page.getByTestId('screen-players')).toBeVisible();
  await page.getByTestId(`card-players-${players}`).click();
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-mode')).toBeVisible();
}

/** Do menu até a corrida carregada (HUD visível e simulação pronta). */
export async function startRace(page: Page, o: { mode: 'quick' | 'championship' | 'timetrial' | 'training'; track?: string; cup?: string; difficulty?: string; character?: string; kart?: string }): Promise<void> {
  await play(page);
  await page.getByTestId(`card-mode-${o.mode}`).click();
  await page.getByTestId('btn-confirm').click();
  if (o.mode === 'championship') {
    await page.getByTestId(`card-cup-${o.cup ?? 'aurora'}`).click();
  } else {
    await page.getByTestId(`card-track-${o.track ?? 'canion-solar'}`).click();
  }
  await page.getByTestId('btn-confirm').click();
  if (o.mode === 'quick' || o.mode === 'championship') {
    await page.getByTestId(`card-difficulty-${o.difficulty ?? 'easy'}`).click();
    await page.getByTestId('btn-confirm').click();
  }
  await expect(page.getByTestId('screen-character')).toBeVisible();
  await page.getByTestId(`card-character-${o.character ?? 'nilo'}`).click();
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('screen-kart')).toBeVisible();
  await page.getByTestId(`card-kart-${o.kart ?? 'flecha'}`).click();
  await page.getByTestId('btn-confirm').click();
  await waitForRace(page);
}

export async function waitForRace(page: Page): Promise<void> {
  await expect(page.getByTestId('hud')).toBeVisible({ timeout: 120_000 });
  // espera a simulação NOVA (a anterior, já encerrada, some quando a cena é recriada)
  await page.waitForFunction(() => {
    const k = (window as unknown as { __kl3d?: { snapshot: () => Snapshot } }).__kl3d;
    return !!k && k.snapshot().raceTime < 1 && k.snapshot().phase !== 'finished';
  }, undefined, { timeout: 180_000 });
}

/** Passa a contagem regressiva adiantando o relógio da simulação. */
export async function goRacing(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { __kl3d: { snapshot: () => Snapshot } }).__kl3d.snapshot().phase !== 'intro', undefined, { timeout: 120_000 });
  await hook(page, 'fastForward(3.2)');
  expect((await snapshot(page)).phase).toBe('racing');
}

/** Entrega o kart do jogador ao piloto automático e adianta a simulação até a chegada. */
export async function finishWithAutopilot(page: Page): Promise<void> {
  await hook(page, 'setAutopilot(true)');
  for (let i = 0; i < 40; i++) {
    await hook(page, 'fastForward(10)');
    if ((await snapshot(page)).phase === 'finished') break;
  }
  expect((await snapshot(page)).phase).toBe('finished');
  await expect(page.getByTestId('screen-results')).toBeVisible({ timeout: 120_000 });
}
