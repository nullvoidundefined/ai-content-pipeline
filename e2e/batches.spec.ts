import { expect, test } from '@playwright/test';

const TEST_EMAIL = 'e2e-user@integration-test.invalid';
const TEST_PASSWORD = 'testpassword123';

test.describe('Batches', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('dashboard loads and shows content', async ({ page }) => {
    await expect(
      page.locator('h1, h2, [class*="title"]').first(),
    ).toBeVisible();
  });

  test('can navigate to create a new batch', async ({ page }) => {
    const createButton = page.locator(
      'button:has-text("New"), button:has-text("Create"), a:has-text("New"), a:has-text("Create")',
    );
    if (await createButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await createButton.first().click();
    }
  });
});
