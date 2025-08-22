import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RideHistoryPage from './RideHistoryPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { customerBookingsApi } from '@/components/ApiConfig';
import { vi } from 'vitest';

test('shows track link for trackable bookings', async () => {
  const bookings = [
    {
      id: '1',
      pickup_address: 'A',
      dropoff_address: 'B',
      pickup_when: new Date().toISOString(),
      status: 'on_the_way',
      estimated_price_cents: 1000,
      public_code: 'abc123',
    },
    {
      id: '2',
      pickup_address: 'C',
      dropoff_address: 'D',
      pickup_when: new Date().toISOString(),
      status: 'completed',
      estimated_price_cents: 2000,
      public_code: 'def456',
    },
  ];

  vi
    .spyOn(customerBookingsApi, 'listMyBookingsApiV1CustomersMeBookingsGet')
    .mockResolvedValue({ data: bookings } as never);

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/history']}>
        <RideHistoryPage />
      </MemoryRouter>
    </AuthProvider>,
  );

  expect(await screen.findByText(/Ride History/i)).toBeInTheDocument();

  const trackLinks = screen.getAllByRole('link', { name: /track/i });
  expect(trackLinks).toHaveLength(1);
  expect(trackLinks[0]).toHaveAttribute('href', '/t/abc123');
});
