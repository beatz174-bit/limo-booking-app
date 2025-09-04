import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, expect, test } from 'vitest';
import { DevFeaturesProvider } from '@/contexts/DevFeaturesContext';
import PaymentStep from './PaymentStep';

const mockCreateBooking = vi.fn().mockResolvedValue({
  booking: { public_code: 'ABC123' },
  clientSecret: 'sec',
});
const mockConfirm = vi.fn().mockResolvedValue({});
const mockCard = {};
const mockGetMetrics = vi.fn().mockResolvedValue(null);

vi.mock('@/hooks/useStripeSetupIntent', () => ({
  useStripeSetupIntent: () => ({ createBooking: mockCreateBooking, loading: false }),
}));
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ data: {} }),
}));
vi.mock('@/hooks/useRouteMetrics', () => ({
  useRouteMetrics: () => mockGetMetrics,
}));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardElement: () => <div data-testid="card" />,
  useStripe: () => ({ confirmCardSetup: mockConfirm }),
  useElements: () => ({ getElement: () => mockCard }),
}));
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve(null),
}));

test('shows tracking link after booking', async () => {
  render(
    <MemoryRouter>
      <DevFeaturesProvider>
        <PaymentStep
          data={{
            pickup_when: '2025-01-01T00:00:00Z',
            pickup: { address: 'A', lat: 0, lng: 0 },
            dropoff: { address: 'B', lat: 1, lng: 1 },
            passengers: 1,
            notes: '',
            customer: { name: '', email: '', phone: '123' },
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  const phoneField = screen.getByLabelText(/phone/i);
  expect(phoneField).toHaveAttribute('readonly');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(mockCreateBooking).toHaveBeenCalledWith(
    expect.objectContaining({
      pickup_when: '2025-01-01T00:00:00Z',
      customer: { name: '', email: '', phone: '123' },
    }),
  );
  const link = await screen.findByRole('link', { name: /track this ride/i });
  expect(link).toHaveAttribute('href', '/t/ABC123');
});

test('updates metrics from route service', async () => {
  mockGetMetrics.mockResolvedValueOnce({ km: 12, min: 34 });
  render(
    <MemoryRouter>
      <DevFeaturesProvider>
        <PaymentStep
          data={{
            pickup_when: '2025-01-01T00:00:00Z',
            pickup: { address: 'A', lat: 0, lng: 0 },
            dropoff: { address: 'B', lat: 1, lng: 1 },
            passengers: 1,
            notes: '',
            customer: { name: '', email: '', phone: '123' },
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
      </DevFeaturesProvider>
    </MemoryRouter>
  );

  expect(await screen.findByText(/distance: 12 km/i)).toBeInTheDocument();
  expect(
    screen.getByText(/duration: 34 minutes/i)
  ).toBeInTheDocument();
});

test('renders fare breakdown when dev features enabled', () => {
  render(
    <MemoryRouter>
      <DevFeaturesProvider>
        <PaymentStep
          data={{
            pickup_when: '2025-01-01T00:00:00Z',
            pickup: { address: 'A', lat: 0, lng: 0 },
            dropoff: { address: 'B', lat: 1, lng: 1 },
            passengers: 1,
            notes: '',
            customer: { name: '', email: '', phone: '123' },
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/fare breakdown/i)).toBeInTheDocument();
});

test('hides fare breakdown when dev features disabled', () => {
  vi.stubEnv('ENV', 'production');
  localStorage.setItem('devFeaturesEnabled', 'false');

  render(
    <MemoryRouter>
      <DevFeaturesProvider>
        <PaymentStep
          data={{
            pickup_when: '2025-01-01T00:00:00Z',
            pickup: { address: 'A', lat: 0, lng: 0 },
            dropoff: { address: 'B', lat: 1, lng: 1 },
            passengers: 1,
            notes: '',
            customer: { name: '', email: '', phone: '123' },
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  expect(screen.queryByText(/fare breakdown/i)).not.toBeInTheDocument();

  vi.unstubAllEnvs();
  localStorage.clear();
});
