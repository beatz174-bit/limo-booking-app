import { test, expect } from '@playwright/test';

test('shows error when deposit charge fails', async ({ page }) => {
  const booking = {
    id: '1',
    pickup_address: 'A St',
    dropoff_address: 'B St',
    pickup_when: new Date(Date.now() + 3600_000).toISOString(),
    status: 'PENDING',
  };

  await page.route('**/auth/token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'driver', token_type: 'bearer' })
    });
  });

  await page.route('**/api/v1/driver/bookings*', async route => {
    const url = route.request().url();
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([booking])
      });
      return;
    }
    if (url.endsWith('/confirm')) {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'card declined' })
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/login');
  await page.getByLabel(/email/i).fill('driver@example.com');
  await page.getByLabel(/password/i).fill('pw');
  await Promise.all([
    page.waitForURL('**/book'),
    page.getByRole('button', { name: /log.?in|sign.?in/i }).click(),
  ]);

  await page.goto('/driver');
  await expect(page.getByRole('heading', { name: /driver bookings/i })).toBeVisible();

  await page.getByRole('button', { name: /confirm/i }).click();

  await expect(page.getByText(/card declined/i)).toBeVisible();
});
