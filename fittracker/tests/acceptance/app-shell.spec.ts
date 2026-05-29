import { test, expect } from '@playwright/test';

/**
 * App shell smoke tesztek
 * Ellenőrzi, hogy az alkalmazás alapvető struktúrája betölt.
 */
test.describe('App shell', () => {
  test('a login oldal betölt és tartalmazza az űrlapot', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('Jelentkezz be');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('az edzéslista oldal betölt (US-02)', async ({ page }) => {
    await page.goto('/workouts');

    await expect(page.locator('h1')).toContainText('Jegyezd fel a sorozatot');
  });

  test('a login form megköveteli az email formátumot (AC: validáció)', async ({ page }) => {
    await page.goto('/login');

    // Érintés + elhagyás triggereli a touched állapotot (gomb disabled marad invalid formnál)
    await page.locator('input[type="email"]').click();
    await page.locator('input[type="email"]').blur();
    await page.locator('input[type="password"]').click();
    await page.locator('input[type="password"]').blur();

    // Validációs hibaüzenetek megjelennek
    await expect(page.locator('small').first()).toBeVisible();
  });

  test('a jelszó mező minimum 6 karaktert vár el', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill('teszt@example.com');
    await page.locator('input[type="password"]').fill('123');
    // Blur triggereli a validációt (gomb disabled marad invalid formnál)
    await page.locator('input[type="password"]').blur();

    // Jelszó validációs hiba jelenik meg
    await expect(page.locator('small').filter({ hasText: '6 karakter' })).toBeVisible();
  });

  test('az üres állapot kártya megjelenik ha nincs edzés (US-02 AC1)', async ({ page }) => {
    await page.goto('/workouts');

    // Üres állapot kártya
    await expect(page.locator('h2').filter({ hasText: 'Nincs még edzésed' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Új sorozat hozzáadása' })).toBeVisible();
  });
});
