import { test, expect } from '@playwright/test';
import { BookingPage } from '../../pages/booking/BookingPage';

interface Booking {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_when: string;
  status: string;
  public_code: string;
  estimated_price_cents: number;
}

const token = 'test-token';
let created: Booking | null = null;

test('user logs in, creates booking, views history', async ({ page, request }) => {
  await page.route('**/auth/token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: token, token_type: 'bearer' })
    });
  });

  await page.route('**/api/v1/bookings', async route => {
    if (route.request().method() === 'POST') {
      created = {
        id: '1',
        pickup_address: 'A St',
        dropoff_address: 'B St',
        pickup_when: new Date().toISOString(),
        status: 'PENDING',
        public_code: 'abc',
        estimated_price_cents: 1000
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ booking: created })
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/v1/customers/me/bookings', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(created ? [created] : [])
    });
  });

  await page.goto('/login');
  await page.getByLabel(/email/i).fill('user@example.com');
  await page.getByLabel(/password/i).fill('pw');
  await Promise.all([
    page.waitForURL('**/book'),
    page.getByRole('button', { name: /log.?in|sign.?in/i }).click()
  ]);

  const book = new BookingPage(page);
  await book.goto();

  await request.post('/api/v1/bookings', {
    data: {},
    headers: { Authorization: `Bearer ${token}` }
  });

  await page.goto('/history');
  await expect(page.getByRole('heading', { name: /ride history/i })).toBeVisible();
  await expect(page.getByText('A St')).toBeVisible();
  await expect(page.getByText('B St')).toBeVisible();
});

