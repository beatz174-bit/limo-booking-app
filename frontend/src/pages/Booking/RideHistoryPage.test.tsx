import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RideHistoryPage from './RideHistoryPage';
import { BookingsProvider } from '@/contexts/BookingsContext';
import { driverBookingsApi, customerBookingsApi } from '@/components/ApiConfig';
import { vi, type Mock } from 'vitest';

vi.mock('@/components/ApiConfig', () => ({
  driverBookingsApi: {
    listBookingsApiV1DriverBookingsGet: vi.fn(),
  },
  customerBookingsApi: {
    listMyBookingsApiV1CustomersMeBookingsGet: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
    userID: 'driver-1',
    adminID: 'driver-1',
  }),
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

test('shows track link for trackable bookings', async () => {
  const bookings = [
    {
      id: '1',
      pickup_address: 'A',
      dropoff_address: 'B',
      pickup_when: new Date().toISOString(),
      status: 'ON_THE_WAY',
      estimated_price_cents: 1000,
      public_code: 'abc123',
    },
    {
      id: '2',
      pickup_address: 'C',
      dropoff_address: 'D',
      pickup_when: new Date().toISOString(),
      status: 'COMPLETED',
      estimated_price_cents: 2000,
      public_code: 'def456',
    },
  ];
  (driverBookingsApi.listBookingsApiV1DriverBookingsGet as Mock).mockResolvedValue({ data: bookings });
  vi.stubGlobal('WebSocket', WSStub as unknown as typeof WebSocket);

  render(
    <MemoryRouter initialEntries={['/history']}>
      <BookingsProvider>
        <RideHistoryPage />
      </BookingsProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/Ride History/i)).toBeInTheDocument();
  expect(
    driverBookingsApi.listBookingsApiV1DriverBookingsGet,
  ).toHaveBeenCalled();
  expect(
    customerBookingsApi.listMyBookingsApiV1CustomersMeBookingsGet,
  ).not.toHaveBeenCalled();
  const trackLinks = screen.getAllByRole('link', { name: /track/i });
  expect(trackLinks).toHaveLength(1);
  expect(trackLinks[0]).toHaveAttribute('href', '/t/abc123');
});

test('track link navigates to tracking page', async () => {
  const bookings = [
    {
      id: '1',
      pickup_address: 'A',
      dropoff_address: 'B',
      pickup_when: new Date().toISOString(),
      status: 'ON_THE_WAY',
      estimated_price_cents: 1000,
      public_code: 'abc123',
    },
  ];
  (driverBookingsApi.listBookingsApiV1DriverBookingsGet as Mock).mockResolvedValue({ data: bookings });
  vi.stubGlobal('WebSocket', WSStub as unknown as typeof WebSocket);

  render(
    <MemoryRouter initialEntries={['/history']}>
      <BookingsProvider>
        <Routes>
          <Route path="/history" element={<RideHistoryPage />} />
          <Route path="/t/:code" element={<h1>Tracking</h1>} />
        </Routes>
      </BookingsProvider>
    </MemoryRouter>,
  );

  const link = await screen.findByRole('link', { name: /track/i });
  expect(
    driverBookingsApi.listBookingsApiV1DriverBookingsGet,
  ).toHaveBeenCalled();
  expect(
    customerBookingsApi.listMyBookingsApiV1CustomersMeBookingsGet,
  ).not.toHaveBeenCalled();
  await userEvent.click(link);
  expect(
    await screen.findByRole('heading', { name: /tracking/i }),
  ).toBeInTheDocument();
});

test('updates status when websocket message received', async () => {
  const booking = {
    id: '1',
    pickup_address: 'A',
    dropoff_address: 'B',
    pickup_when: new Date().toISOString(),
    status: 'PENDING',
    estimated_price_cents: 1000,
    public_code: 'abc123',
  };
  (driverBookingsApi.listBookingsApiV1DriverBookingsGet as Mock).mockResolvedValue({ data: [booking] });
  vi.stubGlobal('WebSocket', WSStub as unknown as typeof WebSocket);

  render(
    <MemoryRouter initialEntries={['/history']}>
      <BookingsProvider>
        <RideHistoryPage />
      </BookingsProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByText('PENDING')).toBeInTheDocument();
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

  expect(await screen.findByText('COMPLETED')).toBeInTheDocument();
});

