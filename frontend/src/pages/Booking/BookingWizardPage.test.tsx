import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import BookingWizardPage from './BookingWizardPage';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeAll, beforeEach, afterEach, expect, test } from 'vitest';
import React from 'react';
import { server } from '@/__tests__/setup/msw.server';
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/__tests__/setup/msw.handlers';

const createBooking = vi
  .fn()
  .mockResolvedValue({ booking: { public_code: 'test' } });

vi.mock('@/hooks/useBooking', () => ({
  useBooking: () => ({
    createBooking,
    loading: false,
  }),
}));
vi.mock('@/hooks/useAvailability', () => ({
  default: () => ({ data: { slots: [], bookings: [] } }),
}));
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    data: { flagfall: 0, per_km_rate: 0, per_minute_rate: 0 },
  }),
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

const mockConfirm = vi
  .fn()
  .mockResolvedValue({ setupIntent: { payment_method: 'pm_123' } });
const mockElements = {
  submit: vi.fn().mockResolvedValue({}),
};
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmSetup: mockConfirm }),
  useElements: () => mockElements,
}));
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve(null),
}));

beforeAll(() => {
  server.use(
    http.get(apiUrl('/geocode/search'), () =>
      HttpResponse.json([{ lat: 0, lon: 0 }]),
    ),
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
    }),
  );
  server.use(
    http.get(apiUrl('/users/me/payment-method'), () =>
      HttpResponse.json({ brand: 'visa', last4: '4242' }),
    ),
  );
});

afterEach(() => {
  localStorage.clear();
  mockElements.submit.mockClear();
  mockConfirm.mockClear();
});

test('creates booking on confirmation and shows tracking link', async () => {
  renderWithProviders(<BookingWizardPage />);
  const input = (re: RegExp) => screen.getByLabelText(re, { selector: 'input' });

  await userEvent.type(input(/pickup time/i), '2025-01-01T10:00');
  await userEvent.type(input(/pickup address/i), '123 A St');
  await userEvent.click(await screen.findByText('123 A St'));
  await userEvent.type(input(/dropoff address/i), '456 B St');
  await userEvent.click(await screen.findByText('456 B St'));
  const passengers = input(/passengers/i);
  await userEvent.clear(passengers);
  await userEvent.type(passengers, '2');
  await userEvent.type(input(/notes/i), 'Be quick');

  await userEvent.click(
    screen.getByRole('button', { name: /confirm booking/i }),
  );

  await screen.findByRole('link', { name: /track this ride/i });

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
});

test('prompts to add a payment method when missing', async () => {
  server.use(
    http.get(apiUrl('/users/me/payment-method'), () =>
      HttpResponse.json({}),
    ),
    http.post(apiUrl('/users/me/payment-method'), () =>
      HttpResponse.json({ setup_intent_client_secret: 'sec' }),
    ),
    http.put(apiUrl('/users/me/payment-method'), () =>
      HttpResponse.json({}),
    ),
  );

  renderWithProviders(<BookingWizardPage />);
  await screen.findByTestId('payment-element');
  await userEvent.click(screen.getByRole('button', { name: /save card/i }));
  expect(mockElements.submit).toHaveBeenCalled();
  expect(mockConfirm).toHaveBeenCalled();
  await waitFor(() =>
    expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument(),
  );
});

