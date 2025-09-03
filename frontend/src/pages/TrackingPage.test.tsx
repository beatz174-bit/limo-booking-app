import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type { LocationUpdate } from '@/hooks/useBookingChannel';
import TrackingPage from './TrackingPage';
import carIcon from '@/assets/car-marker.svg';
import dropoffIcon from '@/assets/dropoff-marker-red.svg';

type MapProps = {
  children: React.ReactNode;
  options?: Record<string, unknown>;
  onLoad?: (map: unknown) => void;
};

let mockMap: {
  fitBounds: ReturnType<typeof vi.fn>;
  setZoom: ReturnType<typeof vi.fn>;
  setCenter: ReturnType<typeof vi.fn>;
};
vi.mock('@react-google-maps/api', () => ({
    GoogleMap: (props: MapProps) => {
      props.onLoad?.(mockMap);
      return <div data-testid="map">{props.children}</div>;
    },
  Marker: ({
    position,
    icon,
    'data-testid': testId,
  }: {
    position: { lat: number; lng: number };
    icon?: string;
    'data-testid'?: string;
  }) => (
    <div data-testid={testId ?? 'marker'} data-icon={icon}>
      {position.lat},{position.lng}
    </div>
  ),
  DirectionsRenderer: () => <div data-testid="route">route</div>,
}));

let currentUpdate: LocationUpdate | null = null;
let endLocation: { lat: number; lng: number };
vi.mock('@/hooks/useBookingChannel', () => ({
  useBookingChannel: () => currentUpdate,
}));

describe('TrackingPage', () => {
  beforeEach(() => {
    currentUpdate = null;
    mockMap = { fitBounds: vi.fn(), setZoom: vi.fn(), setCenter: vi.fn() };
    endLocation = { lat: 3, lng: 4 };
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
                  status: 'DRIVER_CONFIRMED',
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
            routes: [
              {
                legs: [
                  {
                    duration: { value: 600 },
                    end_location: { toJSON: () => endLocation },
                  },
                ],
              },
            ],
          });
        }
      },
      LatLng: class {
        constructor(public lat: number, public lng: number) {}
      },
      LatLngBounds: class {
        extend() {}
      },
      TravelMode: { DRIVING: 'DRIVING' },
    };
    (window as unknown as { google: { maps: typeof maps } }).google = { maps };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('updates marker, timeline and route', async () => {
    const wrapper = (
      <MemoryRouter initialEntries={['/t/abc']}>
        <Routes>
          <Route path="/t/:code" element={<TrackingPage />} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender, unmount } = render(wrapper);
    currentUpdate = { lat: 1, lng: 2, status: 'ON_THE_WAY', ts: 0 };
    rerender(wrapper);
    await waitFor(() =>
      expect(screen.getByTestId('pickup-marker')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('marker').textContent).toBe('1,2');
    expect(screen.getByTestId('marker')).toHaveAttribute('data-icon', carIcon);
    expect(screen.getByTestId('pickup-marker').textContent).toBe('3,4');
    expect(screen.queryByTestId('dropoff-marker')).toBeNull();
    await waitFor(() =>
      expect(
        screen.getByText('En route to pickup').getAttribute('data-active'),
      ).toBe('true'),
    );

    await screen.findByText('ETA: 10 min');
    await screen.findByTestId('route');
    await waitFor(() => expect(mockMap.fitBounds).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockMap.setCenter).toHaveBeenCalledWith({ lat: 2, lng: 3 }),
    );
    unmount();
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
                  status: 'ARRIVED_PICKUP',
                },
                ws_url: '',
              }),
          }) as unknown as Response,
        ),
      );
    currentUpdate = { lat: 1, lng: 2, status: 'ARRIVED_PICKUP', ts: 0 };
    const wrapper2 = (
      <MemoryRouter initialEntries={['/t/abc']}>
        <Routes>
          <Route path="/t/:code" element={<TrackingPage />} />
        </Routes>
      </MemoryRouter>
    );
    render(wrapper2);
    await waitFor(() =>
      expect(screen.getByTestId('dropoff-marker')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('pickup-marker')).toBeNull();
  });

  it('uses dropoff icon when heading to dropoff', async () => {
    currentUpdate = { lat: 1, lng: 2, status: 'IN_PROGRESS', ts: 0 };
    endLocation = { lat: 5, lng: 6 };
    (fetch as unknown as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          booking: {
            id: '1',
            pickup_address: 'P',
            dropoff_address: 'D',
            status: 'IN_PROGRESS',
          },
          ws_url: '',
        }),
    } as Response);
    render(
      <MemoryRouter initialEntries={['/t/abc']}>
        <Routes>
          <Route path="/t/:code" element={<TrackingPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await new Promise((r) => setTimeout(r, 0));
    await waitFor(() =>
      expect(screen.getByTestId('dropoff-marker')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('dropoff-marker')).toHaveAttribute(
      'data-icon',
      dropoffIcon,
    );
  });

  it('sets zoom to 12 when distance is greater than 5 km', async () => {
    const wrapper = (
      <MemoryRouter initialEntries={['/t/abc']}>
        <Routes>
          <Route path="/t/:code" element={<TrackingPage />} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(wrapper);
    currentUpdate = { lat: 1, lng: 2, status: 'ON_THE_WAY', ts: 0 };
    rerender(wrapper);
    await waitFor(() => expect(mockMap.setZoom).toHaveBeenCalledWith(12));
  });

  it('sets zoom to 14 when distance is between 1 and 5 km', async () => {
    endLocation = { lat: 1.02, lng: 2 };
    const wrapper = (
      <MemoryRouter initialEntries={['/t/abc']}>
        <Routes>
          <Route path="/t/:code" element={<TrackingPage />} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(wrapper);
    currentUpdate = { lat: 1, lng: 2, status: 'ON_THE_WAY', ts: 0 };
    rerender(wrapper);
    await waitFor(() => expect(mockMap.setZoom).toHaveBeenCalledWith(14));
  });

  it('sets zoom to 16 when distance is less than 1 km', async () => {
    endLocation = { lat: 1.005, lng: 2 };
    const wrapper = (
      <MemoryRouter initialEntries={['/t/abc']}>
        <Routes>
          <Route path="/t/:code" element={<TrackingPage />} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(wrapper);
    currentUpdate = { lat: 1, lng: 2, status: 'ON_THE_WAY', ts: 0 };
    rerender(wrapper);
    await waitFor(() => expect(mockMap.setZoom).toHaveBeenCalledWith(16));
  });
});

