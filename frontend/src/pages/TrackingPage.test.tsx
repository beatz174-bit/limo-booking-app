import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type { LocationUpdate } from '@/hooks/useBookingChannel';
import TrackingPage from './TrackingPage';

vi.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  Marker: ({ position }: { position: { lat: number; lng: number } }) => (
    <div data-testid="marker">{position.lat},{position.lng}</div>
  ),
}));

let currentUpdate: LocationUpdate | null = null;
vi.mock('@/hooks/useBookingChannel', () => ({
  useBookingChannel: () => currentUpdate,
}));

describe('TrackingPage', () => {
  beforeEach(() => {
    currentUpdate = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              booking: {
                id: '1',
                pickup_address: 'P',
                dropoff_address: 'D',
                status: 'confirm',
              },
              ws_url: '',
            }),
        }) as unknown as Response,
      ),
    );
    const maps = {
      DirectionsService: class {
        route() {
          return Promise.resolve({
            routes: [{ legs: [{ duration: { value: 600 } }] }],
          });
        }
      },
      LatLng: class {
        constructor(public lat: number, public lng: number) {}
      },
      TravelMode: { DRIVING: 'DRIVING' },
    };
    (window as unknown as { google: { maps: typeof maps } }).google = { maps };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates marker and timeline', async () => {
    const wrapper = (
      <MemoryRouter initialEntries={['/track/abc']}>
        <Routes>
          <Route path="/track/:code" element={<TrackingPage />} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender, findByTestId } = render(wrapper);
    currentUpdate = { lat: 1, lng: 2, status: 'leave', ts: 0 };
    rerender(wrapper);
    const marker = await findByTestId('marker');
    expect(marker.textContent).toBe('1,2');
    await waitFor(() =>
      expect(
        screen.getByText('En route to pickup').getAttribute('data-active'),
      ).toBe('true'),
    );

    await screen.findByText('ETA: 10 min');
  });
});

