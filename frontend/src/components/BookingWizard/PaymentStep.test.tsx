import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, expect, test, beforeEach } from 'vitest';
import { DevFeaturesProvider } from '@/contexts/DevFeaturesContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { full_name: 'Test User', email: 'test@example.com', phone: '123' },
  }),
}));

import PaymentStep from './PaymentStep';

const mockCreateBooking = vi.fn().mockResolvedValue({
  booking: { public_code: 'ABC123' },
});
const mockUseStripeSetupIntent = vi.fn();
const mockGetMetrics = vi.fn().mockResolvedValue(null);

vi.mock('@/hooks/useStripeSetupIntent', () => ({
  useStripeSetupIntent: () => mockUseStripeSetupIntent(),
}));
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ data: {} }),
}));
vi.mock('@/hooks/useRouteMetrics', () => ({
  useRouteMetrics: () => mockGetMetrics,
}));

beforeEach(() => {
  mockCreateBooking.mockClear();
  mockGetMetrics.mockClear();
  mockUseStripeSetupIntent.mockReturnValue({
    createBooking: mockCreateBooking,
    savedPaymentMethod: null,
    loading: false,
  });
});

const baseData = {
  pickup_when: '2025-01-01T00:00:00Z',
  pickup: { address: 'A', lat: 0, lng: 0 },
  dropoff: { address: 'B', lat: 1, lng: 1 },
  passengers: 1,
  notes: '',
  pickupValid: true,
  dropoffValid: true,
};

test('shows profile link when no saved card', async () => {
  render(
    <MemoryRouter>
      <DevFeaturesProvider>
        <PaymentStep data={baseData} onBack={() => {}} />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  const link = await screen.findByRole('link', { name: /add a payment method/i });
  expect(link).toHaveAttribute('href', '/profile');
  expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
});

test('uses saved card when available', async () => {
  mockUseStripeSetupIntent.mockReturnValue({
    createBooking: mockCreateBooking,
    savedPaymentMethod: { brand: 'visa', last4: '4242' },
    loading: false,
  });

  render(
    <MemoryRouter>
      <DevFeaturesProvider>
        <PaymentStep data={baseData} onBack={() => {}} />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  await screen.findByText(/using saved card visa ending in 4242/i);
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  const link = await screen.findByRole('link', { name: /track this ride/i });
  expect(link).toHaveAttribute('href', '/t/ABC123');
});

test('updates metrics from route service', async () => {
  mockGetMetrics.mockResolvedValueOnce({ km: 12, min: 34 });
  mockUseStripeSetupIntent.mockReturnValue({
    createBooking: mockCreateBooking,
    savedPaymentMethod: { brand: 'visa', last4: '4242' },
    loading: false,
  });

  render(
    <MemoryRouter>
      <DevFeaturesProvider>
        <PaymentStep data={baseData} onBack={() => {}} />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/distance: 12 km/i)).toBeInTheDocument();
  expect(screen.getByText(/duration: 34 minutes/i)).toBeInTheDocument();
});

test('renders fare breakdown when dev features enabled', async () => {
  mockUseStripeSetupIntent.mockReturnValue({
    createBooking: mockCreateBooking,
    savedPaymentMethod: { brand: 'visa', last4: '4242' },
    loading: false,
  });

  render(
    <MemoryRouter>
      <DevFeaturesProvider>
        <PaymentStep data={baseData} onBack={() => {}} />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/fare breakdown/i)).toBeInTheDocument();
});

test('hides fare breakdown when dev features disabled', async () => {
  vi.stubEnv('ENV', 'production');
  localStorage.setItem('devFeaturesEnabled', 'false');

  mockUseStripeSetupIntent.mockReturnValue({
    createBooking: mockCreateBooking,
    savedPaymentMethod: { brand: 'visa', last4: '4242' },
    loading: false,
  });

  render(
    <MemoryRouter>
      <DevFeaturesProvider>
        <PaymentStep data={baseData} onBack={() => {}} />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  await screen.findByRole('button', { name: /submit/i });
  expect(screen.queryByText(/fare breakdown/i)).not.toBeInTheDocument();

  vi.unstubAllEnvs();
  localStorage.clear();
});

test('shows error when booking creation fails', async () => {
  mockCreateBooking.mockRejectedValueOnce(new Error('boom'));

  render(
    <MemoryRouter>
      <DevFeaturesProvider>
        <PaymentStep data={baseData} onBack={() => {}} />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  expect(
    await screen.findByText(/failed to create booking/i),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /back/i }),
  ).toBeInTheDocument();
});

