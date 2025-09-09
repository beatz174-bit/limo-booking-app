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

import PaymentStep from './PaymentStep';

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

