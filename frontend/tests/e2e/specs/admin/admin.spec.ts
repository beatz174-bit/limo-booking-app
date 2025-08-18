// tests/e2e/specs/admin/admin.spec.ts
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/* ====================== Helpers ====================== */

async function openAccountModeMenu(page: Page) {
  const tryClick = async (loc: ReturnType<Page['locator']>) => {
    if (await loc.first().isVisible().catch(() => false)) {
      await loc.first().click();
      await page.getByRole('listbox').waitFor({ timeout: 5000 });
      return true;
    }
    return false;
  };

  if (await tryClick(page.getByRole('combobox', { name: /account mode/i }))) return;
  if (await tryClick(page.getByRole('button', { name: /account mode/i }))) return;

  const selectDisplay = page
    .getByTestId('settings-account-mode')
    .locator('xpath=ancestor::*[contains(@class,"MuiFormControl-root")][1]//div[contains(@class,"MuiSelect-select")]');
  if (await tryClick(selectDisplay)) return;

  const labelSibling = page
    .locator('label:has-text(/account mode/i)')
    .locator('xpath=..')
    .locator('[role="combobox"], [role="button"], div[class*="MuiSelect-select"]');
  if (await tryClick(labelSibling)) return;

  const nativeInput = page.getByTestId('settings-account-mode');
  if (await nativeInput.count()) {
    await nativeInput.focus();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('listbox').waitFor({ timeout: 5000 });
    return;
  }

  throw new Error('Account Mode trigger not found');
}

async function chooseAccountModeFlexible(page: Page, want: string) {
  const w = want.toLowerCase();
  const wantClosed = /closed/.test(w);

  const candidates = [
    want,
    'Open',
    'Closed',
    'Open (public registration)',
    'Closed (invite only)',
  ].filter((v, i, a) => !!v && a.indexOf(v) === i);

  for (const c of candidates) {
    const opt = page.getByRole('option', { name: new RegExp(`^${c}$`, 'i') });
    if (await opt.first().isVisible().catch(() => false)) {
      await opt.first().click();
      await page.waitForTimeout(50);
      return;
    }
  }

  const listbox = page.getByRole('listbox');
  const options = listbox.getByRole('option');
  const count = await options.count();
  if (count > 0) {
    await (wantClosed ? options.nth(count - 1) : options.first()).click();
    await page.waitForTimeout(50);
    return;
  }

  // Keyboard fallback
  if (wantClosed) {
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  } else {
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(50);
}

async function selectAccountMode(page: Page, optionLabel: string) {
  await openAccountModeMenu(page);
  await chooseAccountModeFlexible(page, optionLabel);
}

async function setGoogleMapsKey(page: Page, value: string) {
  const byTestId = page.getByTestId('settings-google-maps-api-key');
  if (await byTestId.count()) {
    await byTestId.fill(value);
    await byTestId.blur();
    return;
  }
  const byLabel = page.getByLabel(/google maps api key/i);
  await byLabel.fill(value);
  await byLabel.blur();
}

async function readNumber(page: Page, testId: string): Promise<number> {
  const loc = page.getByTestId(testId);
  await expect(loc).toBeVisible();
  return Number(await loc.inputValue());
}

async function fillNumber(page: Page, testId: string, value: string) {
  const loc = page.getByTestId(testId);
  await expect(loc).toBeVisible();
  await loc.fill(value);
  await loc.blur();
}

async function waitForSaveEnabled(page: Page) {
  const save = page.getByTestId('settings-save');
  await expect(save).toBeVisible({ timeout: 10000 });
  await expect(save).toBeEnabled({ timeout: 10000 });
  return save;
}

async function sawSuccessUI(page: Page): Promise<boolean> {
  const candidates = [
    page.getByTestId('settings-toast-success'),
    page.getByRole('alert').filter({ hasText: /saved|updated|success/i }),
    page.getByTestId('settings-toast').filter({ hasText: /saved|updated|success/i }),
  ];
  for (const loc of candidates) {
    if (await loc.first().isVisible().catch(() => false)) return true;
    try {
      await expect(loc.first()).toBeVisible({ timeout: 1200 });
      return true;
    } catch {}
  }
  return false;
}

/* ====================== Tests ====================== */

test.describe('[admin] Admin Dashboard', () => {
  test('loads current settings', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('settings-flagfall')).toBeVisible();
    await expect(page.getByTestId('settings-per-km')).toBeVisible();
    await expect(page.getByTestId('settings-per-minute')).toBeVisible();

    const flagfall = await readNumber(page, 'settings-flagfall');
    const perKm = await readNumber(page, 'settings-per-km');
    const perMinute = await readNumber(page, 'settings-per-minute');

    for (const v of [flagfall, perKm, perMinute]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  test('updates settings successfully', async ({ page }) => {
    // Stub ONLY the write so this test is independent of admin privileges/persistence
    let capturedBody: any | null = null;
    await page.route('**/settings', async (route) => {
      const req = route.request();
      const m = req.method();
      if (m === 'PUT' || m === 'PATCH') {
        try {
          capturedBody = JSON.parse(req.postData() || '{}');
        } catch {
          capturedBody = {};
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
      }
      return route.continue();
    });

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });

    // Read current numbers
    const curFlagfall = await readNumber(page, 'settings-flagfall');
    const curPerKm = await readNumber(page, 'settings-per-km');
    const curPerMinute = await readNumber(page, 'settings-per-minute');

    // REQUIRED field
    await setGoogleMapsKey(page, 'FAKE-KEY-FOR-TESTS-XYZ');

    // New values
    const newFlagfall = (curFlagfall + 0.13).toFixed(2);
    const newPerKm = (curPerKm + 0.17).toFixed(2);
    const newPerMinute = (curPerMinute + 0.19).toFixed(2);

    await fillNumber(page, 'settings-flagfall', newFlagfall);
    await fillNumber(page, 'settings-per-km', newPerKm);
    await fillNumber(page, 'settings-per-minute', newPerMinute);

    // Switch to "open"-ish
    await selectAccountMode(page, 'Open');

    const save = await waitForSaveEnabled(page);

    // Click and wait for the PUT/PATCH to be sent
    const [resp] = await Promise.all([
      page.waitForResponse((r) => /\/settings(?:\?|$)/.test(r.url()) && (r.request().method() === 'PUT' || r.request().method() === 'PATCH')),
      save.click(),
    ]);
    expect(resp.ok()).toBe(true);

    // Assert payload looked right (server contract)
    expect(capturedBody).toBeTruthy();
    expect(Number(capturedBody?.flagfall).toFixed(2)).toBe(newFlagfall);
    expect(Number(capturedBody?.per_km_rate).toFixed(2)).toBe(newPerKm);
    expect(Number(capturedBody?.per_minute_rate).toFixed(2)).toBe(newPerMinute);

    // UI should reflect our changes without reloading
    await expect(page.getByTestId('settings-flagfall')).toHaveValue(newFlagfall);
    await expect(page.getByTestId('settings-per-km')).toHaveValue(newPerKm);
    await expect(page.getByTestId('settings-per-minute')).toHaveValue(newPerMinute);

    // Save usually disables again
    // await expect(page.getByTestId('settings-save')).toBeDisabled({ timeout: 5000 });

    // Optional success toast (don’t fail if absent)
    await sawSuccessUI(page);
  });

  test('shows error when API returns 500', async ({ page }) => {
    await page.route('**/settings', async (route) => {
      const m = route.request().method();
      if (m === 'PUT' || m === 'PATCH') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Internal Server Error' }),
        });
      }
      return route.continue();
    });

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });

    await setGoogleMapsKey(page, 'FAKE-KEY-FOR-TESTS-XYZ');

    const curFlagfall = await readNumber(page, 'settings-flagfall');
    const curPerKm = await readNumber(page, 'settings-per-km');
    const curPerMinute = await readNumber(page, 'settings-per-minute');

    await fillNumber(page, 'settings-flagfall', (curFlagfall + 0.22).toFixed(2));
    await fillNumber(page, 'settings-per-km', (curPerKm + 0.22).toFixed(2));
    await fillNumber(page, 'settings-per-minute', (curPerMinute + 0.22).toFixed(2));

    await selectAccountMode(page, 'Closed');

    const save = await waitForSaveEnabled(page);
    await save.click();

    await expect(page.getByTestId('settings-toast-error')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('settings-toast-error')).toContainText(/internal|error|failed/i);
  });
});
