import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, expect, test, beforeEach } from 'vitest';
import { DevFeaturesProvider } from '@/contexts/DevFeaturesContext';
import PaymentStep from './PaymentStep';

const mockCreateBooking = vi.fn().mockResolvedValue({
  booking: { public_code: 'ABC123' },
  clientSecret: 'sec',
});
const mockConfirm = vi
  .fn()
  .mockResolvedValue({ setupIntent: { payment_method: 'pm_123' } });
const mockCard = {};
const mockGetMetrics = vi.fn().mockResolvedValue(null);
const mockSavePaymentMethod = vi.fn();
const mockUseStripeSetupIntent = vi.fn();

vi.mock('@/hooks/useStripeSetupIntent', () => ({
  useStripeSetupIntent: () => mockUseStripeSetupIntent(),
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

beforeEach(() => {
  mockCreateBooking.mockClear();
  mockConfirm.mockClear();
  mockSavePaymentMethod.mockClear();
  mockGetMetrics.mockClear();
  mockUseStripeSetupIntent.mockReturnValue({
    createBooking: mockCreateBooking,
    savePaymentMethod: mockSavePaymentMethod,
    savedPaymentMethod: null,
    loading: false,
  });
});

test('handles new card flow', async () => {
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
            customer: { name: '', email: '', phone: '' },
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(mockCreateBooking).toHaveBeenCalledWith(
    expect.objectContaining({ pickup_when: '2025-01-01T00:00:00Z' }),
  );
  expect(mockConfirm).toHaveBeenCalledWith('sec', {
    payment_method: { card: mockCard },
  });
  expect(mockSavePaymentMethod).toHaveBeenCalledWith('pm_123');
  const link = await screen.findByRole('link', { name: /track this ride/i });
  expect(link).toHaveAttribute('href', '/t/ABC123');
});

test('uses saved card when available', async () => {
  mockUseStripeSetupIntent.mockReturnValue({
    createBooking: mockCreateBooking,
    savePaymentMethod: mockSavePaymentMethod,
    savedPaymentMethod: { brand: 'visa', last4: '4242' },
    loading: false,
  });

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
            customer: { name: '', email: '', phone: '' },
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  expect(screen.queryByTestId('card')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(mockCreateBooking).toHaveBeenCalled();
  expect(mockConfirm).not.toHaveBeenCalled();
  expect(mockSavePaymentMethod).not.toHaveBeenCalled();
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
            customer: { name: '', email: '', phone: '' },
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
            customer: { name: '', email: '', phone: '' },
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
            customer: { name: '', email: '', phone: '' },
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
