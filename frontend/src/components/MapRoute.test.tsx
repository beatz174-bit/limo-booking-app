import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MapRoute, type Location } from './MapRoute';
import { MapProvider } from './MapProvider';

vi.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DirectionsRenderer: () => null,
  useJsApiLoader: () => ({ isLoaded: true, loadError: undefined }),
}));

beforeEach(() => {
  (globalThis as Record<string, unknown>).google = {
    maps: {
      DirectionsService: vi.fn(() => ({
        route: vi.fn(() =>
          Promise.resolve({ routes: [{ legs: [{ distance: { value: 1000 }, duration: { value: 600 } }] }] })
        ),
      })),
      TravelMode: { DRIVING: 'DRIVING' },
    },
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
  delete (globalThis as Record<string, unknown>).google;
});

describe('MapRoute', () => {
  test('calls onMetrics when both pickup and dropoff are set', async () => {
    vi.mock('@/config', () => ({ CONFIG: { API_BASE_URL: 'http://api', GOOGLE_MAPS_API_KEY: 'KEY' } }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ km: 10, min: 15 }) }));
    vi.stubGlobal('fetch', fetchMock);
    const onMetrics = vi.fn();
    const pickup: Location = { address: 'A', lat: 1, lng: 2 };
    const dropoff: Location = { address: 'B', lat: 3, lng: 4 };
    render(
      <MapProvider>
        <MapRoute pickup={pickup} dropoff={dropoff} rideTime="2020-01-01T00:00" onMetrics={onMetrics} />
      </MapProvider>
    );
    await waitFor(() => expect(onMetrics).toHaveBeenCalledWith(10, 15));
  });

  test('does not refetch metrics on rerender with same addresses and time', async () => {
    vi.mock('@/config', () => ({ CONFIG: { API_BASE_URL: 'http://api', GOOGLE_MAPS_API_KEY: 'KEY' } }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ km: 10, min: 15 }) }));
    vi.stubGlobal('fetch', fetchMock);
    const onMetrics = vi.fn();
    const pickup: Location = { address: 'A', lat: 1, lng: 2 };
    const dropoff: Location = { address: 'B', lat: 3, lng: 4 };
    const { rerender } = render(
      <MapProvider>
        <MapRoute pickup={pickup} dropoff={dropoff} rideTime="2020-01-01T00:00" onMetrics={onMetrics} />
      </MapProvider>
    );
    await waitFor(() => expect(onMetrics).toHaveBeenCalledWith(10, 15));
    fetchMock.mockClear();
    onMetrics.mockClear();

    rerender(
      <MapProvider>
        <MapRoute pickup={pickup} dropoff={dropoff} rideTime="2020-01-01T00:00" onMetrics={onMetrics} />
      </MapProvider>
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onMetrics).not.toHaveBeenCalled();
  });

  test('refetches metrics when rideTime changes', async () => {
    vi.mock('@/config', () => ({ CONFIG: { API_BASE_URL: 'http://api', GOOGLE_MAPS_API_KEY: 'KEY' } }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ km: 10, min: 15 }) }));
    vi.stubGlobal('fetch', fetchMock);
    const onMetrics = vi.fn();
    const pickup: Location = { address: 'A', lat: 1, lng: 2 };
    const dropoff: Location = { address: 'B', lat: 3, lng: 4 };
    const { rerender } = render(
      <MapProvider>
        <MapRoute pickup={pickup} dropoff={dropoff} rideTime="2020-01-01T00:00" onMetrics={onMetrics} />
      </MapProvider>
    );
    await waitFor(() => expect(onMetrics).toHaveBeenCalledWith(10, 15));
    fetchMock.mockClear();
    onMetrics.mockClear();

    rerender(
      <MapProvider>
        <MapRoute pickup={pickup} dropoff={dropoff} rideTime="2020-01-01T01:00" onMetrics={onMetrics} />
      </MapProvider>
    );
    await waitFor(() => expect(onMetrics).toHaveBeenCalledWith(10, 15));
    expect(fetchMock).toHaveBeenCalled();
  });

  test('does not call onMetrics when either location missing', async () => {
    vi.mock('@/config', () => ({ CONFIG: { API_BASE_URL: 'http://api', GOOGLE_MAPS_API_KEY: 'KEY' } }));
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ km: 10, min: 15 }) }));
    vi.stubGlobal('fetch', fetchMock);
    const onMetrics = vi.fn();
    const { rerender } = render(
      <MapProvider>
        <MapRoute pickup={undefined as unknown as Location} dropoff={{ address: 'B', lat: 3, lng: 4 }} rideTime="2020-01-01T00:00" onMetrics={onMetrics} />
      </MapProvider>
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(onMetrics).not.toHaveBeenCalled();

    rerender(
      <MapProvider>
        <MapRoute pickup={{ address: 'A', lat: 1, lng: 2 }} dropoff={undefined as unknown as Location} rideTime="2020-01-01T00:00" onMetrics={onMetrics} />
      </MapProvider>
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(onMetrics).not.toHaveBeenCalled();
  });
});
