import { test, expect } from '@playwright/test';

test('customer completes booking wizard via UI', async ({ page }) => {
  // Mock Stripe script
  await page.route('https://js.stripe.com/v3', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.Stripe = function(){ return {
        elements(){ return { create(){ return { mount(){} }; }, getElement(){ return {}; } }; },
        confirmCardSetup: async () => ({})
      }; };`
    });
  });

  // Mock auth token
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

  // Booking creation
  await page.route('**/api/v1/bookings', async route => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      expect(body.customer.phone).toBe('000');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          booking: { id: '1', public_code: 'abc', status: 'PENDING' },
          stripe: { setup_intent_client_secret: 'secret' }
        })
      });
    } else {
      await route.continue();
    }
  });

  // Login
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('user@example.com');
  await page.getByLabel(/password/i).fill('pw');
  await Promise.all([
    page.waitForURL('**/book'),
    page.getByRole('button', { name: /log.?in|sign.?in/i }).click(),
  ]);

  // Step 1: time
  const pickupTime = new Date(Date.now() + 3600_000).toISOString().slice(0,16);
  await page.getByLabel(/pickup time/i).fill(pickupTime);
  await page.getByRole('button', { name: /next/i }).click();

  // Step 2: trip details
  await page.getByLabel(/pickup address/i).fill('A');
  await page.waitForSelector('li:has-text("A St")');
  await page.getByText('A St').click();
  await page.getByLabel(/dropoff address/i).fill('B');
  await page.waitForSelector('li:has-text("B St")');
  await page.getByText('B St').click();
  await page.getByLabel(/passengers/i).fill('2');
  await page.getByRole('button', { name: /next/i }).click();

  // Step 3: payment
  await page.getByLabel(/name/i).fill('Jane');
  await page.getByLabel(/email/i).fill('jane@example.com');
  await expect(page.getByLabel(/phone/i)).toHaveValue('000');
  await page.getByRole('button', { name: /submit/i }).click();

  await expect(page.getByText(/booking created/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /track this ride/i })).toHaveAttribute('href', '/t/abc');
});
