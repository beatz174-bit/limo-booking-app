import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RideHistoryPage from './RideHistoryPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { BookingsContext, type BookingsContextValue } from '@/contexts/BookingsContext';
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

  const context: BookingsContextValue = {
    bookings,
    loading: false,
    error: null,
    updateBooking: vi.fn(),
  };

  render(
    <AuthProvider>
      <BookingsContext.Provider value={context}>
        <MemoryRouter initialEntries={['/history']}>
          <RideHistoryPage />
        </MemoryRouter>
      </BookingsContext.Provider>
    </AuthProvider>,
  );

  expect(await screen.findByText(/Ride History/i)).toBeInTheDocument();

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
      status: 'on_the_way',
      estimated_price_cents: 1000,
      public_code: 'abc123',
    },
  ];

  const context: BookingsContextValue = {
    bookings,
    loading: false,
    error: null,
    updateBooking: vi.fn(),
  };

  render(
    <AuthProvider>
      <BookingsContext.Provider value={context}>
        <MemoryRouter initialEntries={['/history']}>
          <Routes>
            <Route path="/history" element={<RideHistoryPage />} />
            <Route path="/t/:code" element={<h1>Tracking</h1>} />
          </Routes>
        </MemoryRouter>
      </BookingsContext.Provider>
    </AuthProvider>,
  );

  const link = await screen.findByRole('link', { name: /track/i });
  await userEvent.click(link);
  expect(
    await screen.findByRole('heading', { name: /tracking/i })
  ).toBeInTheDocument();
});
