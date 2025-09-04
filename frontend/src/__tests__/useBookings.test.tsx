import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import { BookingsProvider } from '@/contexts/BookingsContext';
import { useBookings } from '@/hooks/useBookings';
import { driverBookingsApi } from '@/components/ApiConfig';
import type { ReactNode } from 'react';

vi.mock('@/components/ApiConfig', () => ({
  driverBookingsApi: {
    listBookingsApiV1DriverBookingsGet: vi.fn(),
  },
  customerBookingsApi: {
    listMyBookingsApiV1CustomersMeBookingsGet: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'test-token', role: 'driver' }),
}));

class WSStub {
  static instances: WSStub[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  constructor(public url: string) {
    WSStub.instances.push(this);
  }
  close() {}
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  WSStub.instances = [];
});

function wrapper({ children }: { children: ReactNode }) {
  return <BookingsProvider>{children}</BookingsProvider>;
}

describe('useBookings', () => {
  it('initial fetch populates state', async () => {
    const bookings = [
      {
        id: '1',
        pickup_address: 'A',
        dropoff_address: 'B',
        pickup_when: new Date().toISOString(),
        status: 'PENDING',
      },
    ];
    (driverBookingsApi.listBookingsApiV1DriverBookingsGet as Mock).mockResolvedValue({ data: bookings });
    vi.stubGlobal('WebSocket', WSStub as unknown as typeof WebSocket);

    const { result } = renderHook(() => useBookings(), { wrapper });
    await waitFor(() => expect(result.current.bookings).toEqual(bookings));
  });

  it('websocket message updates a booking\'s status', async () => {
    const booking = {
      id: '1',
      pickup_address: 'A',
      dropoff_address: 'B',
      pickup_when: new Date().toISOString(),
      status: 'PENDING',
    };
    (driverBookingsApi.listBookingsApiV1DriverBookingsGet as Mock).mockResolvedValue({ data: [booking] });
    vi.stubGlobal('WebSocket', WSStub as unknown as typeof WebSocket);

    const { result } = renderHook(() => useBookings(), { wrapper });
    await waitFor(() => expect(result.current.bookings[0].status).toBe('PENDING'));

    act(() => {
      WSStub.instances[0].onmessage?.({
        data: JSON.stringify({ id: '1', status: 'COMPLETED' }),
      });
    });

    expect(result.current.bookings[0].status).toBe('COMPLETED');
  });
});

