import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, type Mock } from 'vitest';

vi.mock('@/components/ApiConfig', () => ({
  __esModule: true,
  driverBookingsApi: {
    listBookingsApiV1DriverBookingsGet: vi.fn(),
  },
}));

import DriverDashboard from '@/pages/Driver/DriverDashboard';
import { driverBookingsApi } from '@/components/ApiConfig';
import { CONFIG } from '@/config';
import { BookingsProvider } from '@/contexts/BookingsContext';
import { setTokens } from '@/services/tokenStore';

describe('DriverDashboard', () => {
  it.skip('loads and confirms booking', async () => {
    const bookings = [
      {
        id: '1',
        pickup_address: 'A',
        dropoff_address: 'B',
        pickup_when: new Date().toISOString(),
        status: 'PENDING'
      }
    ];
    (driverBookingsApi.listBookingsApiV1DriverBookingsGet as Mock).mockResolvedValue({ data: bookings });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'DRIVER_CONFIRMED' }) }) as unknown as Response);

    render(
      <MemoryRouter>
        <DriverDashboard />
      </MemoryRouter>
    );
    expect(await screen.findByText('A → B')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm'));
    fireEvent.click(screen.getByRole('tab', { name: /driver confirmed/i }));
    await waitFor(() => expect(screen.getByText('Leave now')).toBeInTheDocument());
  });

  it.skip('shows error message when confirm fails', async () => {
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'fail' }),
      }) as unknown as Response,
    );

    class WSStub {
      close() {}
      onmessage: ((event: { data: string }) => void) | null = null;
      constructor(public url: string) {}
      send() {}
    }
    vi.stubGlobal('WebSocket', WSStub as unknown as typeof WebSocket);

    render(
      <MemoryRouter>
        <BookingsProvider>
          <DriverDashboard />
        </BookingsProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('A → B')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() =>
      expect(screen.getByText(/500 fail/i)).toBeInTheDocument(),
    );
  });

  it('retries deposit when booking deposit failed', async () => {
    const bookings = [
      {
        id: '1',
        pickup_address: 'A',
        dropoff_address: 'B',
        pickup_when: new Date().toISOString(),
        status: 'DEPOSIT_FAILED',
      },
    ];
    (driverBookingsApi.listBookingsApiV1DriverBookingsGet as Mock).mockResolvedValue({
      data: bookings,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'DRIVER_CONFIRMED' }),
      } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    class WSStub {
      close() {}
      onmessage: ((event: { data: string }) => void) | null = null;
      constructor(public url: string) {}
      send() {}
    }
    vi.stubGlobal('WebSocket', WSStub as unknown as typeof WebSocket);
    setTokens('test-token');

    render(
      <MemoryRouter>
        <BookingsProvider>
          <DriverDashboard />
        </BookingsProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('A → B')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry deposit'));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `${CONFIG.API_BASE_URL}/api/v1/driver/bookings/1/retry-deposit`,
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});

