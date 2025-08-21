import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import useDirections from '@/hooks/useDirections';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useDirections', () => {
  it('memoizes results and parses distance and duration', async () => {
    vi.mock('@/config', () => ({ CONFIG: { GOOGLE_MAPS_API_KEY: 'KEY' } }));
    const fake = {
      routes: [
        {
          legs: [
            {
              distance: { value: 1000 },
              duration: { value: 600 },
            },
          ],
        },
      ],
    };
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe(
        'https://maps.googleapis.com/maps/api/directions/json?origin=A&destination=B&mode=driving&key=KEY'
      );
      return { ok: true, json: async () => fake } as any;
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useDirections());
    const res = await result.current('A', 'B');
    expect(res).toEqual({ km: 1, min: 10 });
    await result.current('A', 'B');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
