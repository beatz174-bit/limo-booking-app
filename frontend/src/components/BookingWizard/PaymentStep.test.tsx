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
  clientSecret: 'sec',
});
const mockConfirm = vi
  .fn()
  .mockResolvedValue({ setupIntent: { payment_method: 'pm_123' } });
const mockElements = {
  submit: vi.fn().mockResolvedValue({}),
};
const mockGetMetrics = vi.fn().mockResolvedValue(null);
const mockSavePaymentMethod = vi.fn();
const mockUseStripeSetupIntent = vi.fn();
const mockCanMakePayment = vi.fn().mockResolvedValue(null);
const mockShow = vi.fn();
const mockPaymentRequest = {
  canMakePayment: mockCanMakePayment,
  show: mockShow,
};
const mockStripe = {
  confirmSetup: mockConfirm,
  paymentRequest: vi.fn(() => mockPaymentRequest),
};

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
  PaymentElement: () => <div data-testid="payment-element" />,
  PaymentRequestButtonElement: ({
    onClick,
  }: {
    onClick: () => void;
  }) => <button data-testid="google-pay" onClick={onClick} />,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
}));
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve(null),
}));

beforeEach(() => {
  mockCreateBooking.mockClear();
  mockConfirm.mockClear();
  mockSavePaymentMethod.mockClear();
  mockGetMetrics.mockClear();
  mockCanMakePayment.mockClear();
  mockShow.mockClear();
  mockElements.submit.mockClear();
  mockStripe.paymentRequest.mockClear();
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
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: /submit/i });
  expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument();
  expect(mockCreateBooking).toHaveBeenCalledWith(
    expect.objectContaining({
      pickup_when: '2025-01-01T00:00:00Z',
      customer: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '123',
      },
    }),
  );
  await userEvent.click(
    screen.getByRole('button', { name: /submit/i })
  );
  expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  expect(mockElements.submit).toHaveBeenCalled();
  expect(
    mockElements.submit.mock.invocationCallOrder[0] <
      mockConfirm.mock.invocationCallOrder[0],
  ).toBe(true);
  expect(mockConfirm).toHaveBeenCalledWith({
    elements: mockElements,
    clientSecret: 'sec',
    confirmParams: {
      payment_method_data: {
        billing_details: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '123',
          address: { country: 'AU' },
        },
      },
      return_url: window.location.href,
    },
    redirect: 'if_required',
  });
  expect(mockSavePaymentMethod).toHaveBeenCalledWith('pm_123');
  const link = await screen.findByRole('link', { name: /track this ride/i });
  expect(link).toHaveAttribute('href', '/t/ABC123');
});

test('renders google pay button when supported', async () => {
  mockCanMakePayment.mockResolvedValueOnce({ googlePay: true });

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

  const gpButton = await screen.findByTestId('google-pay');
  expect(gpButton).toBeInTheDocument();
  expect(mockStripe.paymentRequest).toHaveBeenCalledWith(
    expect.objectContaining({ country: 'AU', currency: 'aud' })
  );
});

test('does not render google pay button when unsupported', async () => {
  mockCanMakePayment.mockResolvedValueOnce(null);

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

  await screen.findByRole('button', { name: /submit/i });
  expect(screen.queryByTestId('google-pay')).not.toBeInTheDocument();
});

test('handles google pay flow', async () => {
  mockCanMakePayment.mockResolvedValueOnce({ googlePay: true });
  mockShow.mockResolvedValueOnce({ token: { id: 'tok_123' }, complete: vi.fn() });

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

  const gpButton = await screen.findByTestId('google-pay');
  await userEvent.click(gpButton);

  expect(mockStripe.paymentRequest).toHaveBeenCalledWith(
    expect.objectContaining({ country: 'AU', currency: 'aud' })
  );
  expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  expect(mockShow).toHaveBeenCalled();
  expect(mockConfirm).toHaveBeenCalledWith({
    clientSecret: 'sec',
    payment_method: 'tok_123',
    confirmParams: { return_url: window.location.href },
    redirect: 'if_required',
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
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  await screen.findByRole('button', { name: /submit/i });
  expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  expect(mockConfirm).not.toHaveBeenCalled();
  expect(mockElements.submit).not.toHaveBeenCalled();
  expect(mockSavePaymentMethod).not.toHaveBeenCalled();
  const link = await screen.findByRole('link', { name: /track this ride/i });
  expect(link).toHaveAttribute('href', '/t/ABC123');
});

test('uses saved card when no client secret returned', async () => {
  mockCreateBooking.mockResolvedValueOnce({
    booking: { public_code: 'ABC123' },
    clientSecret: null,
  });
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
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );

  await screen.findByRole('button', { name: /submit/i });
  expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  expect(mockConfirm).not.toHaveBeenCalled();
  expect(mockElements.submit).not.toHaveBeenCalled();
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

test('renders fare breakdown when dev features enabled', async () => {
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
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
      </DevFeaturesProvider>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/fare breakdown/i)).toBeInTheDocument();
});

test('hides fare breakdown when dev features disabled', async () => {
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
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
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
        <PaymentStep
          data={{
            pickup_when: '2025-01-01T00:00:00Z',
            pickup: { address: 'A', lat: 0, lng: 0 },
            dropoff: { address: 'B', lat: 1, lng: 1 },
            passengers: 1,
            notes: '',
            pickupValid: true,
            dropoffValid: true,
          }}
          onBack={() => {}}
        />
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
