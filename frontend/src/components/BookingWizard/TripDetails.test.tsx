import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';

vi.mock('@/hooks/useAvailability', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('@/hooks/useAddressAutocomplete', () => ({
  useAddressAutocomplete: () => ({
    suggestions: [],
    loading: false,
    onFocus: vi.fn(),
    onBlur: vi.fn(),
  }),
}));

vi.mock('./AvailabilityCalendar', () => ({
  __esModule: true,
  default: ({ value }: { value?: string }) => (
    <div data-testid="availability-calendar" data-value={value} />
  ),
}));

import type { AvailabilityResponse } from '@/api-client';
import TripDetails from './TripDetails';
import type { BookingFormData } from '@/types/BookingFormData';
import useAvailability from '@/hooks/useAvailability';
import { formatSlotLabel } from '@/lib/availabilityUtils';

describe('TripDetails', () => {
  const useAvailabilityMock = vi.mocked(useAvailability);

  beforeEach(() => {
    useAvailabilityMock.mockReset();
  });

  it('keeps blocked hours disabled with UTC-normalized availability', async () => {
    const availability: AvailabilityResponse = {
      slots: [
        { id: 1, start_dt: '2025-01-01T05:00:00Z', end_dt: '2025-01-01T06:00:00Z' },
      ],
      bookings: [{ id: 'b1', pickup_when: '2025-01-01T10:00:00Z' }],
    };
    useAvailabilityMock.mockReturnValue({ data: availability });

    const onChange = vi.fn();
    const data: BookingFormData = {
      passengers: 1,
      pickup_when: '2025-01-01T05:00:00.000Z',
    };

    renderWithProviders(<TripDetails data={data} onChange={onChange} />);

    const labelForHour = (hour: number) =>
      formatSlotLabel(new Date(Date.UTC(2025, 0, 1, hour, 0, 0, 0)));

    expect(
      await screen.findByRole('button', { name: labelForHour(5) }),
    ).toBeDisabled();
    expect(screen.getByText('Time unavailable')).toBeInTheDocument();

    const eleven = screen.getByRole('button', { name: labelForHour(11) });
    await userEvent.click(eleven);
    expect(onChange).toHaveBeenCalledWith({
      pickup_when: new Date(Date.UTC(2025, 0, 1, 11, 0, 0, 0)).toISOString(),
    });
  });
});
