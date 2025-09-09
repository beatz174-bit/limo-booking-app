import { test, expect } from '@playwright/test';
import { BookingPage } from '../../pages/booking/BookingPage';

interface Booking {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_when: string;
  status: string;
  public_code: string;
}

test('user logs in, creates booking via UI, views history', async ({ page }) => {
  // Auth
  await page.route('**/auth/token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'user', token_type: 'bearer' })
    });
  });

  // Availability
  await page.route('**/api/v1/availability*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ slots: [], bookings: [] })
    });
  });

  // Address suggestions
  await page.route('**/geocode/search**', async route => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q') || '';
    const suggestion = q.toLowerCase().includes('b')
      ? { address: 'B St', lat: -27.5, lng: 153.03, placeId: 'b' }
      : { address: 'A St', lat: -27.47, lng: 153.02, placeId: 'a' };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: [suggestion] })
    });
  });

  // Route metrics
  await page.route('**/route-metrics*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ km: 1, min: 1 })
    });
  });

  // Settings
  await page.route('**/settings', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ flagfall: 1, per_km_rate: 1, per_minute_rate: 1, account_mode: true })
    });
  });

  // Current user profile
  await page.route('**/users/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: '1', full_name: 'Jane', phone: '000' })
    });
  });

  let created: Booking | null = null;
  await page.route('**/api/v1/bookings', async route => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      expect(body.customer.phone).toBe('000');
      created = {
        id: '1',
        pickup_address: 'A St',
        dropoff_address: 'B St',
        pickup_when: new Date().toISOString(),
        status: 'PENDING',
        public_code: 'abc'
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ booking: created })
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/v1/customers/me/bookings', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(created ? [created] : [])
    });
  });

  // Login and navigate to booking wizard
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('user@example.com');
  await page.getByLabel(/password/i).fill('pw');
  await Promise.all([
    page.waitForURL('**/book'),
    page.getByRole('button', { name: /log.?in|sign.?in/i }).click(),
  ]);
  const bookPage = new BookingPage(page);
  await bookPage.goto();

  // Step 1
  const pickupTime = new Date(Date.now() + 3600_000).toISOString().slice(0,16);
  await page.getByLabel(/pickup time/i).fill(pickupTime);
  await page.getByRole('button', { name: /next/i }).click();

  // Step 2
  await page.getByLabel(/pickup address/i).fill('A');
  await page.waitForSelector('li:has-text("A St")');
  await page.getByText('A St').click();
  await page.getByLabel(/dropoff address/i).fill('B');
  await page.waitForSelector('li:has-text("B St")');
  await page.getByText('B St').click();
  await page.getByLabel(/passengers/i).fill('2');
  await page.getByRole('button', { name: /next/i }).click();

  // Step 3
  await page.getByLabel(/name/i).fill('Jane');
  await page.getByLabel(/^email$/i).fill('jane@example.com');
  await expect(page.getByLabel(/phone/i)).toHaveValue('000');
  await page.getByRole('button', { name: /submit/i }).click();

  // View history
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: /ride history/i })).toBeVisible();
  await expect(page.getByText('A St')).toBeVisible();
  await expect(page.getByText('B St')).toBeVisible();
});
