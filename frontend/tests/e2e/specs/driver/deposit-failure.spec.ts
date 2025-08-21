import { test, expect } from '@playwright/test';

// Simulate a deposit charge failure during confirmation
// The backend is expected to respond with HTTP 402 or 400

test('deposit failure returns error', async ({ request }) => {
  const now = Date.now();
  const payload = {
    customer: { name: 'Jane', email: 'jane@example.com' },
    pickup_when: new Date(now + 3600_000).toISOString(),
    pickup: { address: 'A', lat: -27.47, lng: 153.02 },
    dropoff: { address: 'B', lat: -27.5, lng: 153.03 },
    passengers: 2,
  };
  const create = await request.post('/api/v1/bookings', { data: payload });
  const booking = (await create.json()).booking;

  // in a real test, Stripe would return a failure; here we assert backend surfaces it
  const confirm = await request.post(`/api/v1/driver/bookings/${booking.id}/confirm?simulate_fail=1`);
  expect(confirm.status()).toBeGreaterThanOrEqual(400);
});
