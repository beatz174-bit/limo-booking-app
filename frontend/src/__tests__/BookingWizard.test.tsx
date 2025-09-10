import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import BookingWizard from '@/components/BookingWizard/BookingWizard';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, test, expect, afterEach } from 'vitest';
import React, { useEffect } from 'react';

const createBooking = vi.fn().mockResolvedValue({ booking: { id: '1', public_code: 'code' } });
const addBooking = vi.fn();

vi.mock('@/hooks/useBooking', () => ({
  useBooking: () => ({ createBooking, loading: false }),
}));
vi.mock('@/hooks/useBookings', () => ({
  useBookings: () => ({ addBooking }),
}));
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ data: { flagfall: 0, per_km_rate: 0, per_minute_rate: 0 } }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/MapProvider', () => ({
  MapProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/MapRoute', () => ({
  MapRoute: () => <div />,
}));
vi.mock('@/components/PriceSummary', () => ({
  PriceSummary: () => <div />,
}));
vi.mock('@/components/FareBreakdown', () => ({
  default: () => <div />,
}));
vi.mock('@/components/BookingWizard/TripDetails', () => {
  function TripDetailsMock({
    onChange,
  }: {
    onChange: (data: Record<string, unknown>) => void;
  }) {
    useEffect(() => {
      onChange({
        pickup_when: new Date('2025-01-01T10:00').toISOString(),
        pickup: { address: 'A', lat: 0, lng: 0 },
        dropoff: { address: 'B', lat: 0, lng: 0 },
        passengers: 1,
        notes: '',
        pickupValid: true,
        dropoffValid: true,
      });
    }, [onChange]);
    return <div />;
  }
  return { default: TripDetailsMock };
});

afterEach(() => {
  createBooking.mockClear();
  addBooking.mockClear();
});

test('adds new booking to context on confirmation', async () => {
  renderWithProviders(<BookingWizard />);
  await userEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
  await screen.findByRole('link', { name: /track this ride/i });
  expect(addBooking).toHaveBeenCalledWith({ id: '1', public_code: 'code' });
});

