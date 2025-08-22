import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DriverDashboard from '@/pages/Driver/DriverDashboard';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
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
    vi
      .spyOn(driverBookingsApi, 'listBookingsApiV1DriverBookingsGet')
      .mockResolvedValue({ data: bookings } as never);
    vi
      .spyOn(driverBookingsApi, 'confirmBookingApiV1DriverBookingsBookingIdConfirmPost')
      .mockResolvedValue({
        data: { ...bookings[0], status: 'DRIVER_CONFIRMED' },
      } as never);

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
