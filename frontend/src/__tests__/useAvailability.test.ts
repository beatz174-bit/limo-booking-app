import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import useAvailability from '@/hooks/useAvailability';

describe('useAvailability', () => {
  it('fetches availability data', async () => {
    vi.mock('@/config', () => ({ CONFIG: { API_BASE_URL: 'http://api' } }));
    const fake = { slots: [], bookings: [] };
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe('http://api/api/v1/availability?month=2025-01');
      return { ok: true, json: async () => fake } as any;
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAvailability('2025-01'));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data).toEqual(fake);
  });
});
