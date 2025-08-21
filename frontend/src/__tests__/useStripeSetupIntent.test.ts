import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useStripeSetupIntent } from '@/hooks/useStripeSetupIntent';

describe('useStripeSetupIntent', () => {
  it('creates booking and returns client secret', async () => {
    const fakeResp = {
      booking: { id: '1', status: 'PENDING', public_code: 'ABC', estimated_price_cents: 1000, deposit_required_cents: 500 },
      stripe: { setup_intent_client_secret: 'sec' },
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => fakeResp }) as unknown as typeof fetch;
    const { result } = renderHook(() => useStripeSetupIntent());
    const data = await result.current.createBooking({
      pickup_when: '2025-01-01T00:00:00Z',
      pickup: { address: 'A', lat: 0, lng: 0 },
      dropoff: { address: 'B', lat: 0, lng: 1 },
      passengers: 1,
      customer: { name: 'x', email: 'y@example.com' },
    });
    expect(data.clientSecret).toBe('sec');
  });
});
