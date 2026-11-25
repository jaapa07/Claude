import { test, expect } from '@playwright/test';
import { boot, startRace, goRacing } from './helpers';
test('pausa: Esc, configurações e voltar à escolha da pista', async ({ page }) => {
  await boot(page, { clearSave: true });
  await startRace(page, { mode: 'quick' });
  await goRacing(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-hint')).toBeVisible();
  await page.getByTestId('btn-pause-settings').click();
  await expect(page.getByTestId('settings-esc-hint')).toContainText('pausa');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('btn-back-select')).toBeVisible();
  await page.getByTestId('btn-back-select').click();
  await expect(page.getByTestId('screen-track')).toBeVisible();
});
