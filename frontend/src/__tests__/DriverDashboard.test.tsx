import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, type Mock } from 'vitest';

vi.mock('@/components/ApiConfig', () => ({
  driverBookingsApi: {
    listBookingsApiV1DriverBookingsGet: vi.fn(),
    confirmBookingApiV1DriverBookingsBookingIdConfirmPost: vi.fn(),
  },
}));

import DriverDashboard from '@/pages/Driver/DriverDashboard';
import { driverBookingsApi } from '@/components/ApiConfig';

describe('DriverDashboard', () => {
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
    (driverBookingsApi.confirmBookingApiV1DriverBookingsBookingIdConfirmPost as Mock).mockResolvedValueOnce({ data: { status: 'DRIVER_CONFIRMED' } });

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
});

