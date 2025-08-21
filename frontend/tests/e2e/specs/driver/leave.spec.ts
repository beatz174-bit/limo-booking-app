import { test, expect } from '@playwright/test';

test('driver can leave for booking', async ({ request }) => {
  const now = Date.now();
  const payload = {
    customer: { name: 'Jane', email: 'jane@example.com' },
    pickup_when: new Date(now + 3600_000).toISOString(),
    pickup: { address: 'A', lat: -27.47, lng: 153.02 },
    dropoff: { address: 'B', lat: -27.5, lng: 153.03 },
    passengers: 2,
  };
  const create = await request.post('/api/v1/bookings', { data: payload });
  expect(create.status()).toBe(201);
  const booking = (await create.json()).booking;
  await request.post(`/api/v1/driver/bookings/${booking.id}/confirm`);
  const leave = await request.post(`/api/v1/driver/bookings/${booking.id}/leave`);
  expect(leave.ok()).toBeTruthy();
});
