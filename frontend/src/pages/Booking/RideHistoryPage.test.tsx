import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RideHistoryPage from './RideHistoryPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { server } from '@/__tests__/setup/msw.server';
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/__tests__/setup/msw.handlers';

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

  server.use(
    http.get(apiUrl('/api/v1/customers/me/bookings'), () =>
      HttpResponse.json(bookings),
    ),
  );

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

  server.use(
    http.get(apiUrl('/api/v1/customers/me/bookings'), () =>
      HttpResponse.json(bookings),
    ),
  );

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<RideHistoryPage />} />
          <Route path="/t/:code" element={<h1>Tracking</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  const link = await screen.findByRole('link', { name: /track/i });
  await userEvent.click(link);
  expect(
    await screen.findByRole('heading', { name: /tracking/i })
  ).toBeInTheDocument();
});
