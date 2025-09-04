import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import BookingWizardPage from './BookingWizardPage';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeAll } from 'vitest';
import React from 'react';
import { server } from '@/__tests__/setup/msw.server';
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/__tests__/setup/msw.handlers';

// Stub Stripe components and hooks
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({
    confirmCardSetup: vi.fn(),
    paymentRequest: vi.fn(() => ({
      canMakePayment: vi.fn(),
      on: vi.fn(),
    })),
  }),
  useElements: () => ({ getElement: vi.fn().mockReturnValue({}) }),
}));
vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn() }));

// Stub backend and map related hooks
const createBooking = vi.fn().mockResolvedValue({ clientSecret: 'sec' });
vi.mock('@/hooks/useStripeSetupIntent', () => ({
  useStripeSetupIntent: () => ({ createBooking }),
}));
vi.mock('@/hooks/useAvailability', () => ({
  default: () => ({ data: { slots: [], bookings: [] } }),
}));
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ data: { flagfall: 0, per_km_rate: 0, per_minute_rate: 0 } }),
}));
vi.mock('@/hooks/useRouteMetrics', () => ({
  useRouteMetrics: () => async () => ({ km: 0, min: 0 }),
}));
vi.mock('@/hooks/useAddressAutocomplete', () => ({
  useAddressAutocomplete: (input: string) => ({
    suggestions: input ? [{ address: input, lat: 0, lng: 0 }] : [],
    loading: false,
    onFocus: vi.fn(),
    onBlur: vi.fn(),
  }),
}));
vi.mock('@/components/MapProvider', () => ({
  MapProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/MapRoute', () => ({
  MapRoute: () => <div data-testid="map-route" />,
}));

beforeAll(() => {
  server.use(
    http.get(apiUrl('/geocode/search'), () =>
      HttpResponse.json([{ lat: 0, lon: 0 }])
    )
  );
  vi.stubGlobal('alert', vi.fn());
});

beforeEach(() => {
  localStorage.setItem(
    'auth_tokens',
    JSON.stringify({
      access_token: 'tok',
      refresh_token: 'ref',
      user: { full_name: 'John Doe', email: 'john@example.com', phone: '123' },
    })
  );
});

afterEach(() => {
  localStorage.clear();
});

test('advances through steps and aggregates form data', async () => {
  renderWithProviders(<BookingWizardPage />);
  const input = (re: RegExp) => screen.getByLabelText(re, { selector: 'input' });

  // Step 1: select time
  await userEvent.type(input(/pickup time/i), '2025-01-01T10:00');
  await userEvent.click(screen.getByRole('button', { name: /next/i }));

  // Step 2: trip details
  await userEvent.type(input(/pickup address/i), '123 A St');
  await userEvent.click(await screen.findByText('123 A St'));
  await userEvent.type(input(/dropoff address/i), '456 B St');
  await userEvent.click(await screen.findByText('456 B St'));
  const passengers = input(/passengers/i);
  await userEvent.clear(passengers);
  await userEvent.type(passengers, '2');
  await userEvent.type(input(/notes/i), 'Be quick');
  await userEvent.click(screen.getByRole('button', { name: /next/i }));

  // Step 3: payment details
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(createBooking).toHaveBeenCalledWith({
    pickup_when: new Date('2025-01-01T10:00').toISOString(),
    pickup: { address: '123 A St', lat: 0, lng: 0 },
    dropoff: { address: '456 B St', lat: 0, lng: 0 },
    passengers: 2,
    notes: 'Be quick',
    customer: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '123-4567',
    },
  });
  localStorage.clear();
});
