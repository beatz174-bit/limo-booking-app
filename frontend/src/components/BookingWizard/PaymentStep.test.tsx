import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, expect, test, beforeEach } from 'vitest';
import PaymentStep from './PaymentStep';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { full_name: 'Test User', email: 'test@example.com', phone: '123' },
  }),
}));

const mockCreateBooking = vi.fn().mockResolvedValue({ booking: { public_code: 'ABC123' } });
const mockUseBooking = vi.fn();

vi.mock('@/hooks/useBooking', () => ({
  useBooking: () => mockUseBooking(),
}));

beforeEach(() => {
  mockCreateBooking.mockClear();
});

test('creates booking when saved card exists', async () => {
  mockUseBooking.mockReturnValue({
    createBooking: mockCreateBooking,
    savedPaymentMethod: { brand: 'visa', last4: '4242' },
    loading: false,
  });
  render(
    <MemoryRouter>
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
    </MemoryRouter>,
  );
  const link = await screen.findByRole('link', { name: /track this ride/i });
  expect(link).toHaveAttribute('href', '/t/ABC123');
  expect(mockCreateBooking).toHaveBeenCalled();
});

test('shows warning when no saved card', async () => {
  mockUseBooking.mockReturnValue({
    createBooking: mockCreateBooking,
    savedPaymentMethod: null,
    loading: false,
  });
  render(
    <MemoryRouter>
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
    </MemoryRouter>,
  );
  expect(await screen.findByText(/no saved payment method/i)).toBeInTheDocument();
  expect(mockCreateBooking).not.toHaveBeenCalled();
});
