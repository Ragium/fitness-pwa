import { test, expect } from '@playwright/test';

/**
 * NFR-2: Offline működés
 * "Fő flow teljesen használható repülőgép módban"
 * Mérés: Playwright offline acceptance teszt 100% sikerrel.
 */
test.describe('Offline workout rögzítés (NFR-2)', () => {
  test('az edzésoldal offline módban is mutatja az offline státuszt', async ({ page, context }) => {
    // Betöltés
    await page.goto('/workouts');
    await expect(page.locator('h1')).toBeVisible();

    // Online pill először megjelenik
    const statusPill = page.locator('.status-pill').first();
    await expect(statusPill).toContainText('Online');

    // Offline kapcsoló — az oldal újratöltése nélkül frissül a státusz
    await context.setOffline(true);

    // Offline státusz pill megjelenik (OnlineStatusService figyeli a window 'offline' eventet)
    await expect(statusPill).toContainText('Offline', { timeout: 5000 });
  });

  test('offline módban edzést lehet menteni és az megjelenik a listában (US-03 AC1)', async ({ page, context }) => {
    // Online betöltés
    await page.goto('/workouts');
    await expect(page.locator('h1')).toBeVisible();

    // Offline
    await context.setOffline(true);

    // Workout form kitöltése
    await page.locator('input[formcontrolname="exercise"]').fill('Fekvenyomás');
    await page.locator('input[formcontrolname="repetitions"]').first().fill('10');
    await page.locator('input[formcontrolname="weight"]').first().fill('80');

    // Mentés
    await page.locator('button[type="submit"]').filter({ hasText: 'Mentés offline' }).click();

    // Az edzés megjelenik a listában (scope-olt az app-workout-list-re, mert a progress-card is mutathatja a nevét)
    await expect(page.locator('app-workout-list')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('app-workout-list').getByText('Fekvenyomás')).toBeVisible();
  });

  test('offline mentés után "Szinkron várakozik" státusz jelenik meg (US-03 AC1)', async ({ page, context }) => {
    await page.goto('/workouts');
    await expect(page.locator('h1')).toBeVisible();

    await context.setOffline(true);

    await page.locator('input[formcontrolname="exercise"]').fill('Guggolás');
    await page.locator('input[formcontrolname="repetitions"]').first().fill('8');
    await page.locator('input[formcontrolname="weight"]').first().fill('100');

    await page.locator('button[type="submit"]').filter({ hasText: 'Mentés offline' }).click();

    // Várakozó (waiting) státuszjelző megjelenik
    await expect(page.locator('app-workout-list')).toBeVisible({ timeout: 5000 });

    // Pending count counter nő (sync btn)
    const syncBtn = page.locator('.sync-btn');
    await expect(syncBtn).toBeVisible();
  });

  test('többször is lehet offline menteni (US-03 AC3)', async ({ page, context }) => {
    await page.goto('/workouts');
    await context.setOffline(true);

    const exercises = ['Fekvenyomás', 'Guggolás', 'Felhúzás'];
    for (const exercise of exercises) {
      await page.locator('input[formcontrolname="exercise"]').fill(exercise);
      await page.locator('input[formcontrolname="repetitions"]').first().fill('5');
      await page.locator('input[formcontrolname="weight"]').first().fill('60');
      await page.locator('button[type="submit"]').filter({ hasText: 'Mentés offline' }).click();
      // Rövid várakozás az IndexedDB írásra
      await page.waitForTimeout(300);
    }

    // Mindhárom edzés megjelenik (scope-olt az app-workout-list-re)
    for (const exercise of exercises) {
      await expect(page.locator('app-workout-list').getByText(exercise)).toBeVisible({ timeout: 5000 });
    }
  });
});
