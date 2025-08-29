import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useAddressAutocomplete } from './useAddressAutocomplete';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

describe('useAddressAutocomplete', () => {
  test('resolves SFO to full address with coordinates', async () => {
    vi.mock('@/config', () => ({ CONFIG: { GOOGLE_MAPS_API_KEY: 'KEY' } }));
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('autocomplete')) {
        return {
          ok: true,
          json: async () => ({ predictions: [{ place_id: 'sfo1' }] }),
        };
      }
      if (url.includes('details')) {
        return {
          ok: true,
          json: async () => ({
            result: {
              name: 'San Francisco International Airport',
              formatted_address:
                'San Francisco International Airport, San Francisco, CA, USA',
              geometry: { location: { lat: 37.62, lng: -122.38 } },
              place_id: 'sfo1',
            },
          }),
        };
      }
      throw new Error('unexpected url');
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAddressAutocomplete('SFO', { debounceMs: 0 }));

    await waitFor(() => {
      expect(result.current.suggestions[0]).toEqual({
        name: 'San Francisco International Airport',
        address:
          'San Francisco International Airport, San Francisco, CA, USA',
        lat: 37.62,
        lng: -122.38,
        placeId: 'sfo1',
      });
    });
  });
});
