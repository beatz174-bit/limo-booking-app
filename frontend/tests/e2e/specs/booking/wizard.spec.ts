import { test, expect } from '@playwright/test';

// Customer booking wizard flow through API endpoints
// Steps: check availability, create booking which returns SetupIntent

test('customer can complete booking wizard', async ({ request }) => {
  const now = Date.now();
  const month = new Date(now).toISOString().slice(0, 7);

  // check availability for the selected month
  const avail = await request.get(`/api/v1/availability?month=${month}`);
  expect(avail.status()).toBe(200);

  const payload = {
    customer: { name: 'Jane', email: 'jane@example.com', phone: '+6100000000' },
    pickup_when: new Date(now + 3600_000).toISOString(),
    pickup: { address: 'A', lat: -27.47, lng: 153.02 },
    dropoff: { address: 'B', lat: -27.5, lng: 153.03 },
    passengers: 2,
    notes: 'e2e test',
  };

  // create booking and obtain Stripe SetupIntent secret
  const res = await request.post('/api/v1/bookings', { data: payload });
  expect(res.status()).toBe(201);
  const json = await res.json();
  expect(json.booking.status).toBe('PENDING');
  expect(json.stripe.setup_intent_client_secret).toBeTruthy();
});
