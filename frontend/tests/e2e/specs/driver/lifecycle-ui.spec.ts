import { test, expect } from '@playwright/test';

interface Booking {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_when: string;
  status: string;
  leave_at?: string;
  final_price_cents?: number;
}

test('driver progresses booking through lifecycle via UI', async ({ page }) => {
  const booking: Booking = {
    id: '1',
    pickup_address: 'A St',
    dropoff_address: 'B St',
    pickup_when: new Date(Date.now() + 3600_000).toISOString(),
    status: 'PENDING',
  };

  // Mock auth token
  await page.route('**/auth/token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'driver', token_type: 'bearer' })
    });
  });

  // Mock booking list and lifecycle transitions
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
    const action = url.split('/').pop();
    switch (action) {
      case 'confirm':
        booking.status = 'DRIVER_CONFIRMED';
        booking.leave_at = new Date().toISOString();
        break;
      case 'leave':
        booking.status = 'ON_THE_WAY';
        break;
      case 'arrive-pickup':
        booking.status = 'ARRIVED_PICKUP';
        break;
      case 'start-trip':
        booking.status = 'IN_PROGRESS';
        break;
      case 'arrive-dropoff':
        booking.status = 'ARRIVED_DROPOFF';
        break;
      case 'complete':
        booking.status = 'COMPLETED';
        booking.final_price_cents = 12345;
        break;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(booking)
    });
  });

  // Login as driver
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('driver@example.com');
  await page.getByLabel(/password/i).fill('pw');
  await Promise.all([
    page.waitForURL('**/book'),
    page.getByRole('button', { name: /log.?in|sign.?in/i }).click(),
  ]);

  // Navigate to driver dashboard
  await page.goto('/driver');
  await expect(page.getByRole('heading', { name: /driver bookings/i })).toBeVisible();

  // Confirm booking
  await page.getByRole('button', { name: /confirm/i }).click();
  await page.getByRole('tab', { name: /driver confirmed/i }).click();
  await expect(page.getByText('Leave now')).toBeVisible();

  // Leave
  await page.getByRole('button', { name: /leave now/i }).click();
  await page.getByRole('tab', { name: /on the way/i }).click();
  await expect(page.getByRole('button', { name: /arrived pickup/i })).toBeVisible();

  // Arrive pickup
  await page.getByRole('button', { name: /arrived pickup/i }).click();
  await page.getByRole('tab', { name: /arrived pickup/i }).click();
  await expect(page.getByRole('button', { name: /start trip/i })).toBeVisible();

  // Start trip
  await page.getByRole('button', { name: /start trip/i }).click();
  await page.getByRole('tab', { name: /in progress/i }).click();
  await expect(page.getByRole('button', { name: /arrived dropoff/i })).toBeVisible();

  // Arrive dropoff
  await page.getByRole('button', { name: /arrived dropoff/i }).click();
  await page.getByRole('tab', { name: /arrived dropoff/i }).click();
  await expect(page.getByRole('button', { name: /complete/i })).toBeVisible();

  // Complete
  await page.getByRole('button', { name: /complete/i }).click();
  await page.getByRole('tab', { name: /completed/i }).click();
  await expect(page.getByText('$123.45')).toBeVisible();
});
