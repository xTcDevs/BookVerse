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

test.describe('search', () => {
  test('announces result counts without making the entire results list a live region', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    const results = page.locator('section[aria-labelledby="results-title"]');
    const count = page.getByRole('status');
    await expect(results).not.toHaveAttribute('aria-live');
    await expect(count).toHaveText(/^\d+ books?$/);
    await expect(count).toHaveAttribute('aria-atomic', 'true');

    await page.getByRole('searchbox', { name: 'Search the catalogue' }).fill('no-book-with-this-title');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(count).toHaveText('0 books');
  });
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

test.describe('hosting', () => {
  // Netlify's free tier edits the HTML after the build (a comment in <head>, a
  // toolbar script after </html> that adds a badge). Hydration must survive it.
  test('pages hydrate cleanly with Netlify-injected markup, and the badge is kept', async ({ page }) => {
    const errors = trackErrors(page);
    await page.route('**/.netlify/scripts/hud*', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: "var f=document.createElement('iframe');f.id='nl-badge-frame';document.body.appendChild(f);",
      }),
    );
    await page.route(/\/(settings\/account|book\/frankenstein)?\/?$/, async (route) => {
      const response = await route.fetch();
      let html = await response.text();
      html = html.replace(
        '<meta charSet="utf-8"/>',
        '<meta charSet="utf-8"/>\n<!-- This site is hosted on Netlify. -->\n',
      );
      html += '<script async src="/.netlify/scripts/hud?variant=public"></script>\n';
      await route.fulfill({ response, body: html });
    });
    for (const path of ['/', '/settings/account', '/book/frankenstein']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#nl-badge-frame')).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });
});

test.describe('sign-in links', () => {
  test('an expired emailed link explains itself instead of failing silently', async ({ page }) => {
    await page.goto(
      '/settings/account#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    );
    await expect(page.getByRole('alert')).toContainText('expired or was already used');
    await expect(page).toHaveURL(/\/settings\/account\/?$/);
  });
});
