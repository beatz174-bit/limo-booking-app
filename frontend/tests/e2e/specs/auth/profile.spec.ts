import { test, expect } from '@playwright/test';

const uniqueEmail = `user+${Date.now()}@example.com`;
const password = 'pw';

test('user can update profile details', async ({ page }) => {
  // Register and auto-login
  await page.goto('/register');
  await page.getByLabel(/full name/i).fill('E2E User');
  await page.getByLabel(/email/i).fill(uniqueEmail);
  await page.getByLabel(/password/i).fill(password);
  await Promise.all([
    page.waitForURL('**/book'),
    page.getByRole('button', { name: /register/i }).click(),
  ]);

  // Navigate to profile page
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible();

  // Fields populated from server
  await expect(page.getByLabel(/full name/i)).toHaveValue('E2E User');
  await expect(page.getByLabel(/email/i)).toHaveValue(uniqueEmail);

  // Update full name and default pickup
  await page.getByLabel(/full name/i).fill('Updated User');
  await page.getByLabel(/default pickup address/i).fill('456 Ave');

  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/users/me') && r.request().method() === 'PATCH'),
    page.getByRole('button', { name: /save/i }).click(),
  ]);
  expect(resp.ok()).toBeTruthy();

  const storedName = await page.evaluate(() => localStorage.getItem('userName'));
  expect(storedName).toBe('Updated User');
});
