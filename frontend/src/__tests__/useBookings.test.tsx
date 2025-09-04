import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import { BookingsProvider } from '@/contexts/BookingsContext';
import { useBookings } from '@/hooks/useBookings';
import { driverBookingsApi, customerBookingsApi } from '@/components/ApiConfig';
import { useDriverTracking } from '@/hooks/useDriverTracking';
import type { ReactNode } from 'react';

vi.mock('@/components/ApiConfig', () => ({
  driverBookingsApi: {
    listBookingsApiV1DriverBookingsGet: vi.fn(),
  },
  customerBookingsApi: {
    listMyBookingsApiV1CustomersMeBookingsGet: vi.fn(),
  },
}));

const authState = {
  accessToken: 'test-token',
  userID: 'driver-1',
  adminID: 'driver-1',
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/hooks/useDriverTracking', () => ({
  useDriverTracking: vi.fn(),
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
  authState.accessToken = 'test-token';
  authState.userID = 'driver-1';
  authState.adminID = 'driver-1';
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
    expect(
      driverBookingsApi.listBookingsApiV1DriverBookingsGet,
    ).toHaveBeenCalled();
    expect(
      customerBookingsApi.listMyBookingsApiV1CustomersMeBookingsGet,
    ).not.toHaveBeenCalled();
    expect(useDriverTracking).toHaveBeenLastCalledWith(bookings);
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
    expect(
      driverBookingsApi.listBookingsApiV1DriverBookingsGet,
    ).toHaveBeenCalled();
    expect(
      customerBookingsApi.listMyBookingsApiV1CustomersMeBookingsGet,
    ).not.toHaveBeenCalled();

    act(() => {
      WSStub.instances[0].onmessage?.({
        data: JSON.stringify({ id: '1', status: 'COMPLETED' }),
      });
    });

    expect(result.current.bookings[0].status).toBe('COMPLETED');
  });

  it('refreshes when user changes and tracking stays disabled for non-admins', async () => {
    authState.userID = 'customer-1';
    authState.adminID = 'admin-1';
    const bookings = [
      {
        id: '1',
        pickup_address: 'A',
        dropoff_address: 'B',
        pickup_when: new Date().toISOString(),
        status: 'PENDING',
      },
    ];
    (customerBookingsApi.listMyBookingsApiV1CustomersMeBookingsGet as Mock).mockResolvedValue({
      data: bookings,
    });
    vi.stubGlobal('WebSocket', WSStub as unknown as typeof WebSocket);

    const { result, rerender } = renderHook(() => useBookings(), { wrapper });
    await waitFor(() => expect(result.current.bookings).toEqual(bookings));
    expect(useDriverTracking).toHaveBeenLastCalledWith([]);
    expect(
      customerBookingsApi.listMyBookingsApiV1CustomersMeBookingsGet,
    ).toHaveBeenCalledTimes(1);

    authState.userID = 'customer-2';
    (customerBookingsApi.listMyBookingsApiV1CustomersMeBookingsGet as Mock).mockResolvedValue({
      data: [],
    });

    rerender();

    await waitFor(() =>
      expect(
        customerBookingsApi.listMyBookingsApiV1CustomersMeBookingsGet,
      ).toHaveBeenCalledTimes(2),
    );
    expect(useDriverTracking).toHaveBeenLastCalledWith([]);
  });
});

