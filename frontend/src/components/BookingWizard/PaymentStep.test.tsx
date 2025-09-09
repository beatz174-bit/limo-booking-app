import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, beforeEach, expect, test } from 'vitest';
import { DevFeaturesProvider } from '@/contexts/DevFeaturesContext';

// Auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { full_name: 'Test User', email: 'test@example.com', phone: '123' },
  }),
}));

// Hooks
const mockCreateBooking = vi.fn();
const mockSavePaymentMethod = vi.fn();
const mockUseStripeSetupIntent = vi.fn();

vi.mock('@/hooks/useStripeSetupIntent', () => ({
  useStripeSetupIntent: () => mockUseStripeSetupIntent(),
}));
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ data: {} }),
}));
vi.mock('@/hooks/useRouteMetrics', () => ({
  useRouteMetrics: () => async () => ({ km: 0, min: 0 }),
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

const baseData = {
  pickup_when: '2025-01-01T00:00:00Z',
  pickup: { address: 'A', lat: 0, lng: 0 },
  dropoff: { address: 'B', lat: 1, lng: 1 },
  passengers: 1,
  notes: '',
  pickupValid: true,
  dropoffValid: true,
};

beforeEach(() => {
  mockCreateBooking.mockReset();
  mockSavePaymentMethod.mockReset();
});

test('uses saved card without showing card fields', async () => {
  mockCreateBooking.mockResolvedValue({
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
        <PaymentStep data={baseData} onBack={() => {}} />
      </DevFeaturesProvider>
    </MemoryRouter>
  );

  expect(
    await screen.findByText(/using saved card visa ending in 4242/i)
  ).toBeInTheDocument();
  expect(document.querySelector('iframe')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(mockCreateBooking).toHaveBeenCalled();
  const link = await screen.findByRole('link', { name: /track this ride/i });
  expect(link).toHaveAttribute('href', '/t/ABC123');
});

