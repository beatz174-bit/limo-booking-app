import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, type Mock } from 'vitest';

vi.mock('@/components/ApiConfig', () => ({
  driverBookingsApi: {
    listBookingsApiV1DriverBookingsGet: vi.fn(),
  },
}));

import DriverDashboard from '@/pages/Driver/DriverDashboard';
import { driverBookingsApi } from '@/components/ApiConfig';

describe('DriverDashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('getAccessToken', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and confirms booking', async () => {
    const bookings = [
      {
        id: '1',
        pickup_address: 'A',
        dropoff_address: 'B',
        pickup_when: new Date().toISOString(),
        status: 'PENDING'
      }
    ];
    (driverBookingsApi.listBookingsApiV1DriverBookingsGet as Mock).mockResolvedValueOnce({ data: bookings });
    vi.stubGlobal('getAccessToken', () => undefined);
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

  it('shows error message when confirm fails', async () => {
    const bookings = [
      {
        id: '1',
        pickup_address: 'A',
        dropoff_address: 'B',
        pickup_when: new Date().toISOString(),
        status: 'PENDING',
      },
    ];
    (driverBookingsApi.listBookingsApiV1DriverBookingsGet as Mock).mockResolvedValueOnce({ data: bookings });
    vi.stubGlobal('getAccessToken', () => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'fail' }),
      }) as unknown as Response,
    );

    render(
      <MemoryRouter>
        <DriverDashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByText('A → B')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() =>
      expect(screen.getByText(/500 fail/i)).toBeInTheDocument(),
    );
  });
});

