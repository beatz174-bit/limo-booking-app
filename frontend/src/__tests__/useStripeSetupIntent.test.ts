import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useStripeSetupIntent } from '@/hooks/useStripeSetupIntent';
import { CONFIG } from '@/config';

describe('useStripeSetupIntent', () => {
  it('creates booking and returns client secret when no saved card', async () => {
    const fakeResp = {
      booking: { id: '1', status: 'PENDING', public_code: 'ABC', estimated_price_cents: 1000, deposit_required_cents: 500 },
      stripe: { setup_intent_client_secret: 'sec' },
    };
    const fetchMock = vi
      .fn()
      // initial call to check saved payment method
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      // booking creation
      .mockResolvedValueOnce({ ok: true, json: async () => fakeResp });
    global.fetch = fetchMock as unknown as typeof fetch;
    const { result } = renderHook(() => useStripeSetupIntent());
    let data;
    await act(async () => {
      data = await result.current.createBooking({
        pickup_when: '2025-01-01T00:00:00Z',
        pickup: { address: 'A', lat: 0, lng: 0 },
        dropoff: { address: 'B', lat: 0, lng: 1 },
        passengers: 1,
      });
    });
    const [, opts] = fetchMock.mock.calls[1];
    expect(JSON.parse(opts.body as string).pickup_when).toBe('2025-01-01T00:00:00Z');
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${CONFIG.API_BASE_URL}/users/me/payment-method`,
    );
    expect(data.clientSecret).toBe('sec');
    expect(result.current.savedPaymentMethod).toBeNull();
  });

  it('returns saved card info when available', async () => {
    const pm = { brand: 'visa', last4: '4242' };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => pm });
    global.fetch = fetchMock as unknown as typeof fetch;
    const { result } = renderHook(() => useStripeSetupIntent());
    await act(async () => {});
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${CONFIG.API_BASE_URL}/users/me/payment-method`,
    );
    expect(result.current.savedPaymentMethod).toEqual(pm);
  });

  it('propagates null client secret when absent', async () => {
    const pm = { brand: 'visa', last4: '4242' };
    const fakeResp = {
      booking: {
        id: '1',
        status: 'PENDING',
        public_code: 'ABC',
        estimated_price_cents: 1000,
        deposit_required_cents: 500,
      },
      stripe: { setup_intent_client_secret: null },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => pm })
      .mockResolvedValueOnce({ ok: true, json: async () => fakeResp });
    global.fetch = fetchMock as unknown as typeof fetch;
    const { result } = renderHook(() => useStripeSetupIntent());
    let data;
    await act(async () => {
      data = await result.current.createBooking({
        pickup_when: '2025-01-01T00:00:00Z',
        pickup: { address: 'A', lat: 0, lng: 0 },
        dropoff: { address: 'B', lat: 0, lng: 1 },
        passengers: 1,
      });
    });
    expect(data.clientSecret).toBeNull();
    expect(result.current.savedPaymentMethod).toEqual(pm);
  });

  it('throws detailed error when booking fails', async () => {
    const errorResp = { detail: 'invalid booking' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, json: async () => errorResp });
    global.fetch = fetchMock as unknown as typeof fetch;
    const { result } = renderHook(() => useStripeSetupIntent());
    await act(async () => {
      await expect(
        result.current.createBooking({
          pickup_when: '2025-01-01T00:00:00Z',
          pickup: { address: 'A', lat: 0, lng: 0 },
          dropoff: { address: 'B', lat: 0, lng: 1 },
          passengers: 1,
        }),
      ).rejects.toThrow('invalid booking');
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${CONFIG.API_BASE_URL}/users/me/payment-method`,
    );
  });
});
