import { test, expect } from '@playwright/test';

/**
 * NFR-5: Hibajelzés átláthatóság
 * "Toast 5 mp-en belül látható hálózati hiba esetén"
 */
test.describe('Sync státusz toast (NFR-5)', () => {
  test('mentés után toast jelenik meg 5 mp-en belül', async ({ page }) => {
    await page.goto('/workouts');
    await expect(page.locator('h1')).toBeVisible();

    // Edzés kitöltése
    await page.locator('input[formcontrolname="exercise"]').fill('Toast teszt');
    await page.locator('input[formcontrolname="repetitions"]').first().fill('10');
    await page.locator('input[formcontrolname="weight"]').first().fill('50');

    // Mentés
    await page.locator('button[type="submit"]').filter({ hasText: 'Mentés offline' }).click();

    // Toast megjelenik 5 mp-en belül (NFR-5)
    const toast = page.locator('app-toast-container, .toast, [class*="toast"]').first();
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('offline módban szinkron hiba toast jelenik meg manuális sync-nél', async ({ page, context }) => {
    await page.goto('/workouts');
    await expect(page.locator('h1')).toBeVisible();

    // Offline mód
    await context.setOffline(true);

    // Manuális szinkron kísérlet offline állapotban
    await page.locator('.sync-btn').click();

    // Hibaüzenet toast jelenik meg
    const errorToast = page.locator('app-toast-container, .toast, [class*="toast"]').first();
    await expect(errorToast).toBeVisible({ timeout: 5000 });
    await expect(errorToast).toContainText('internet');
  });

  test('az üres állapot CTA gomb megnyitja az űrlapot (US-02 AC2)', async ({ page }) => {
    await page.goto('/workouts');

    // Üres állapot CTA
    const ctaBtn = page.locator('button').filter({ hasText: 'Új sorozat hozzáadása' });
    await expect(ctaBtn).toBeVisible();
    await ctaBtn.click();

    // A form fókuszt kap
    const exerciseInput = page.locator('input[formcontrolname="exercise"]');
    await expect(exerciseInput).toBeFocused({ timeout: 2000 });
  });
});
