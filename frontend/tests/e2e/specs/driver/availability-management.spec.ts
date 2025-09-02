import { test, expect } from '@playwright/test';
import { DriverAvailabilityPage } from '../../pages/driver/DriverAvailabilityPage';

interface Slot {
  start_dt?: string;
  end_dt?: string;
  reason?: string;
}

const token = 'driver-token';
let captured: Slot | null = null;

test('driver manages availability slots', async ({ page }) => {
  await page.route('**/auth/token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: token, token_type: 'bearer' })
    });
  });

  await page.route('**/api/v1/availability', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ slots: [] })
      });
    } else {
      captured = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: '1', ...captured })
      });
    }
  });

  await page.goto('/login');
  await page.getByLabel(/email/i).fill('driver@example.com');
  await page.getByLabel(/password/i).fill('pw');
  await Promise.all([
    page.waitForURL('**/book'),
    page.getByRole('button', { name: /log.?in|sign.?in/i }).click()
  ]);

  const availability = new DriverAvailabilityPage(page);
  await availability.goto();

  const start = '2024-01-01T10:00';
  const end = '2024-01-01T11:00';
  const reason = 'Busy';
  await availability.addSlot(start, end, reason);

  expect(captured.start_dt).toBe(start);
  expect(captured.end_dt).toBe(end);
  expect(captured.reason).toBe(reason);
});

