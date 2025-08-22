import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RideDetailsPage from './RideDetailsPage';
import { http, HttpResponse } from 'msw';
import { server } from '@/__tests__/setup/msw.server';
import { apiUrl } from '@/__tests__/setup/msw.handlers';
import { AuthProvider } from '@/contexts/AuthContext';
import { vi } from 'vitest';

vi.mock('@/components/MapRoute', () => ({ MapRoute: () => <div /> }));

test('Back button navigates to /history', async () => {
  const booking = {
    id: '1',
    pickup_address: 'A',
    dropoff_address: 'B',
    pickup_when: new Date().toISOString(),
    estimated_price_cents: 1000,
    deposit_required_cents: 500,
    status: 'COMPLETED',
    public_code: 'abc123',
  };

  server.use(
    http.get(apiUrl('/api/v1/driver/bookings'), () => HttpResponse.json([booking]))
  );

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/history/1']}>
        <Routes>
          <Route path="/history/:id" element={<RideDetailsPage />} />
          <Route path="/history" element={<h1>Ride History</h1>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  expect(await screen.findByText(/Ride Details/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('link', { name: /back/i }));

  expect(
    await screen.findByRole('heading', { name: /ride history/i })
  ).toBeInTheDocument();
});

test('shows tracking link when booking trackable', async () => {
  const booking = {
    id: '1',
    pickup_address: 'A',
    dropoff_address: 'B',
    pickup_when: new Date().toISOString(),
    estimated_price_cents: 1000,
    deposit_required_cents: 500,
    status: 'ON_THE_WAY',
    public_code: 'abc123',
  };

  server.use(
    http.get(apiUrl('/api/v1/driver/bookings'), () => HttpResponse.json([booking]))
  );

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/history/1']}>
        <Routes>
          <Route path="/history/:id" element={<RideDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  const link = await screen.findByRole('link', { name: /track/i });
  expect(link).toHaveAttribute('href', '/t/abc123');
});
