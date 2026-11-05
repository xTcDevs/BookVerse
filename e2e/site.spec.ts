import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const pages = [
  '/',
  '/explore',
  '/explore/manga',
  '/genres',
  '/genres/horror',
  '/authors',
  '/author/mary-shelley',
  '/book/frankenstein',
  '/top',
  '/library',
  '/write',
  '/settings',
  '/settings/appearance',
  '/settings/reading',
  '/settings/account',
  '/signin',
];

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test.describe('every page', () => {
  for (const path of pages) {
    test(`${path} loads without errors and has one main heading`, async ({ page }) => {
      const errors = trackErrors(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await page.waitForLoadState('networkidle');
      expect(errors).toEqual([]);
    });
  }

  test('unknown pages return 404 with a helpful page', async ({ page }) => {
    const response = await page.goto('/no-such-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('layout', () => {
  for (const width of [390, 768, 1024, 1280, 1440]) {
    test(`no horizontal scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/book/frankenstein', '/settings/reading', '/explore']) {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, path).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe('personalisation', () => {
  test('a chosen site theme persists across pages and reloads with no flash', async ({ page }) => {
    await page.goto('/settings/appearance');
    await page.getByRole('radio', { name: /midnight/i }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');

    // The theme must already be set in the first HTML paint, before scripts run.
    await page.route('**/assets/*.js', (route) => route.abort());
    await page.goto('/book/frankenstein');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
  });

  test('reading settings are separate from the site theme', async ({ page }) => {
    await page.goto('/settings/appearance');
    await page.getByRole('radio', { name: /^oled/i }).check();
    await page.goto('/settings/reading');
    await page.getByRole('button', { name: /sepia paper/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'oled');

    const stored = await page.evaluate(() => ({
      appearance: JSON.parse(localStorage.getItem('bookverse:prefs:appearance') ?? '{}').data,
      text: JSON.parse(localStorage.getItem('bookverse:prefs:reader_text') ?? '{}').data,
    }));
    expect(stored.appearance.theme).toBe('oled');
    expect(stored.text.theme).toBe('sepia');
  });
});

test.describe('accessibility', () => {
  for (const theme of ['paper', 'dark', 'sepia', 'contrast']) {
    test(`no axe violations in the ${theme} theme`, async ({ page }) => {
      await page.addInitScript((t) => {
        localStorage.setItem(
          'bookverse:prefs:appearance',
          JSON.stringify({ v: 1, updatedAt: new Date().toISOString(), data: { theme: t } }),
        );
      }, theme);
      for (const path of ['/', '/book/frankenstein', '/settings/reading']) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        // axe may resolve its own copy of playwright-core; the Page objects are the same at runtime.
        const axePage = page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'];
        const results = await new AxeBuilder({ page: axePage }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(results.violations.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([]);
      }
    });
  }
});
