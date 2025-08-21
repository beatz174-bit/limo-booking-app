import { test, expect } from '@playwright/test';

// End-to-end driver lifecycle from confirm to completion

test('driver can progress booking through full lifecycle', async ({ request }) => {
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
  await request.post(`/api/v1/driver/bookings/${booking.id}/leave`);
  await request.post(`/api/v1/driver/bookings/${booking.id}/arrive-pickup`);
  await request.post(`/api/v1/driver/bookings/${booking.id}/start-trip`);
  const wsUrl = `${process.env.API_BASE_URL?.replace('http', 'ws')}/ws/bookings/${booking.id}`;
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));
  const ts = Date.now() / 1000;
  ws.send(JSON.stringify({ ts, lat: payload.pickup.lat, lng: payload.pickup.lng }));
  ws.send(
    JSON.stringify({ ts: ts + 60, lat: payload.dropoff.lat, lng: payload.dropoff.lng })
  );
  ws.close();
  await new Promise((resolve) => ws.addEventListener('close', resolve));
  await request.post(`/api/v1/driver/bookings/${booking.id}/arrive-dropoff`);
  const complete = await request.post(`/api/v1/driver/bookings/${booking.id}/complete`);
  expect(complete.status()).toBeLessThan(500);
});
