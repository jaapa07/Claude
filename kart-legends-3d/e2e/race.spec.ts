import { expect, test } from '@playwright/test';
import { boot, finishWithAutopilot, goRacing, hook, snapshot, startRace, trackErrors, waitForRace } from './helpers';

test('corrida rápida completa: controles, drift, turbo, item, pausa, IA, resultados, pódio e salvamento', async ({ page }) => {
  const errors = trackErrors(page);
  await boot(page);
  await startRace(page, { mode: 'quick', track: 'canion-solar', difficulty: 'easy' });
  await expect(page.getByTestId('game-canvas')).toHaveAttribute('data-mode', 'race');
  await expect(page.getByTestId('hud-position')).toBeVisible();
  await expect(page.getByTestId('hud-lap')).toContainText('1/3');
  await expect(page.getByTestId('hud-minimap')).toHaveAttribute('data-state', 'ready');
  await expect(page.getByTestId('hud-speed')).toBeVisible();
  await expect(page.getByTestId('hud-item')).toBeVisible();
  expect((await snapshot(page)).racers).toBe(8);

  // contagem regressiva: parado até o "VAI!"
  await page.keyboard.down('KeyW');
  expect(Math.abs((await snapshot(page)).speed)).toBeLessThan(0.1);
  await goRacing(page);

  // acelerar (tecla real → inputManager → simulação)
  await hook(page, 'fastForward(2.5)');
  const moving = await snapshot(page);
  expect(moving.speed).toBeGreaterThan(12);
  expect(moving.aiMoving).toBe(7);
  await expect(page.getByTestId('hud-time')).not.toHaveText('0:00.000');

  // virar e derrapar: Espaço + esquerda em velocidade (o Cânion Solar vira à esquerda depois da largada)
  const h0 = moving.heading;
  await page.keyboard.down('KeyA');
  await page.keyboard.down('Space');
  await page.waitForTimeout(500); // a direção do teclado é suavizada em tempo real
  await hook(page, 'fastForward(0.3)');
  const drift = await snapshot(page);
  expect(drift.heading).toBeGreaterThan(h0 + 0.1);
  // mantendo o drift a carga sobe de nível; soltar libera o miniturbo.
  // O grid é sorteado: uma batida com o kart vizinho cancela o drift (regra do jogo). Nesse caso o teste faz o que
  // o jogador faria — solta e aperta Espaço de novo — em vez de depender da sorte na largada.
  let level = 0;
  let drifted = drift.drifting;
  for (let attempt = 0; attempt < 4 && level < 1; attempt++) {
    if (attempt > 0) {
      // Recomeça limpo: solta tudo, recupera o kart na pista (R), acelera em reta e tenta o drift de novo.
      await page.keyboard.up('Space');
      await page.keyboard.up('KeyA');
      await hook(page, 'fastForward(3.1)'); // espera do botão de recuperar
      await page.keyboard.down('KeyR');
      await hook(page, 'fastForward(0.1)');
      await page.keyboard.up('KeyR');
      await hook(page, 'fastForward(2.6)');
      await page.keyboard.down('KeyA');
      await page.keyboard.down('Space');
      await page.waitForTimeout(500);
      await hook(page, 'fastForward(0.3)');
    }
    for (let i = 0; i < 12 && level < 1; i++) {
      const s = await snapshot(page);
      drifted ||= s.drifting;
      if (!s.drifting) break;
      level = s.driftLevel;
      if (level < 1) await hook(page, 'fastForward(0.1)');
    }
  }
  expect(drifted).toBe(true);
  expect(level).toBeGreaterThanOrEqual(1);
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyA');
  await page.waitForTimeout(300);
  await hook(page, 'fastForward(0.05)');
  expect((await snapshot(page)).boost).toBeGreaterThan(0.2);

  // frear
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyS');
  await hook(page, 'fastForward(1.2)');
  expect((await snapshot(page)).speed).toBeLessThan(8);
  await page.keyboard.up('KeyS');

  // item: Shift usa o item equipado
  await hook(page, "giveItem('pulso-solar')");
  await page.keyboard.down('ShiftLeft');
  await hook(page, 'fastForward(0.1)');
  await page.keyboard.up('ShiftLeft');
  const used = await snapshot(page);
  expect(used.item).toBeNull();
  expect(used.boost).toBeGreaterThan(1.5);

  // recuperar (R) recoloca o kart parado
  await page.keyboard.down('KeyW');
  await hook(page, 'fastForward(2)');
  await page.keyboard.down('KeyR');
  await hook(page, 'fastForward(0.1)');
  await page.keyboard.up('KeyR');
  expect(Math.abs((await snapshot(page)).speed)).toBeLessThan(1);
  await page.keyboard.up('KeyW');

  // pausa: o tempo de corrida para; continuar retoma
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('screen-pause')).toBeVisible();
  const t1 = (await snapshot(page)).raceTime;
  await page.waitForTimeout(1500);
  expect((await snapshot(page)).raceTime).toBe(t1);
  await page.getByTestId('btn-pause-settings').click();
  await expect(page.getByTestId('screen-settings')).toBeVisible();
  await page.getByTestId('btn-back').click();
  await page.getByTestId('btn-resume').click();
  await expect(page.getByTestId('screen-pause')).toHaveCount(0);

  // chegada → resultados com os 8 pilotos
  await finishWithAutopilot(page);
  for (let i = 1; i <= 8; i++) await expect(page.getByTestId(`results-row-${i}`)).toBeVisible();
  await expect(page.locator('[data-testid^="results-row-"][data-player="true"]')).toHaveCount(1);
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('screen-podium')).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toHaveAttribute('data-mode', 'podium');
  for (let i = 1; i <= 3; i++) await expect(page.getByTestId(`podium-place-${i}`)).toBeVisible();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('screen-menu')).toBeVisible();

  // progresso salvo e mantido depois de recarregar a página
  const read = (): Promise<{ stats: { races: number }; records: Record<string, { bestRaceMs: number | null }> }> =>
    page.evaluate(() => JSON.parse(localStorage.getItem('kl3d.save') ?? '{}'));
  const save = await read();
  expect(save.stats.races).toBe(1);
  expect(save.records['canion-solar']!.bestRaceMs).toBeGreaterThan(60_000);
  await page.reload();
  await page.getByTestId('btn-start').click({ timeout: 180_000 });
  await page.getByTestId('btn-progress').click();
  await expect(page.getByTestId('stat-races')).toContainText('1');
  expect((await read()).stats.races).toBe(1);
  expect(errors).toEqual([]);
});

test('reiniciar e sair pela pausa', async ({ page }) => {
  await boot(page);
  await startRace(page, { mode: 'quick', track: 'jardim-celeste', difficulty: 'normal' });
  await goRacing(page);
  await hook(page, 'fastForward(4)');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('screen-pause')).toBeVisible();
  await page.getByTestId('btn-restart').click();
  await waitForRace(page);
  await page.waitForFunction(() => (window as unknown as { __kl3d: { snapshot: () => { raceTime: number } } }).__kl3d.snapshot().raceTime < 1);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('screen-pause')).toBeVisible();
  await page.getByTestId('btn-quit').click();
  await expect(page.getByTestId('screen-menu')).toBeVisible();
  await expect(page.getByTestId('game-canvas')).toHaveAttribute('data-mode', 'showcase');
});

test('contrarrelógio: corre sozinho, sem posição, e registra o tempo', async ({ page }) => {
  await boot(page);
  await startRace(page, { mode: 'timetrial', track: 'vale-moinhos' });
  await expect(page.getByTestId('hud-position')).toHaveCount(0);
  expect((await snapshot(page)).racers).toBe(1);
  await goRacing(page);
  await finishWithAutopilot(page);
  await expect(page.getByTestId('results-laps')).toBeVisible();
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('kl3d.save') ?? '{}') as { records: Record<string, { timeTrialMs: number | null }> });
  expect(save.records['vale-moinhos']!.timeTrialMs).toBeGreaterThan(60_000);
});

test('treino: pista livre sem adversários, termina pelo menu de pausa', async ({ page }) => {
  await boot(page);
  await startRace(page, { mode: 'training', track: 'pico-boreal' });
  expect((await snapshot(page)).racers).toBe(1);
  await goRacing(page);
  await hook(page, 'setAutopilot(true)');
  await hook(page, 'fastForward(60)');
  const s = await snapshot(page);
  expect(s.lap).toBeGreaterThanOrEqual(1);
  expect(s.phase).toBe('racing');
  await page.keyboard.press('Escape');
  await page.getByTestId('btn-quit').click();
  await expect(page.getByTestId('screen-menu')).toBeVisible();
});

test('campeonato: quatro corridas da Copa Aurora, classificação geral, troféu e desbloqueio da Copa Eclipse', async ({ page }) => {
  await boot(page);
  await startRace(page, { mode: 'championship', cup: 'aurora', difficulty: 'easy', character: 'lumi', kart: 'cometa' });
  for (let race = 0; race < 4; race++) {
    await goRacing(page);
    await finishWithAutopilot(page);
    await expect(page.getByTestId('results-standings')).toBeVisible();
    await page.getByTestId('btn-continue').click();
    if (race < 3) await waitForRace(page);
  }
  await expect(page.getByTestId('screen-podium')).toBeVisible();
  await expect(page.getByTestId('podium-trophy')).toBeVisible();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('screen-menu')).toBeVisible();
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('kl3d.save') ?? '{}') as { stats: { races: number; championships: number }; unlocked: { cups: string[] }; trophies: Record<string, string | null> });
  expect(save.stats.races).toBe(4);
  expect(save.stats.championships).toBe(1);
  // a Copa Eclipse abre com qualquer troféu da Copa Aurora
  const tier = await page.evaluate(() => (JSON.parse(localStorage.getItem('kl3d.save') ?? '{}') as { trophies: Record<string, string | null> }).trophies.aurora);
  if (tier) expect(save.unlocked.cups).toContain('eclipse');
  else expect(save.unlocked.cups).not.toContain('eclipse');
});
