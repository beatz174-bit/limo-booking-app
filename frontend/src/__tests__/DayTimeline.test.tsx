import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import DayTimeline from '@/components/BookingWizard/DayTimeline';
import {
  calculateHourlyAvailability,
  formatSlotLabel,
} from '@/lib/availabilityUtils';

describe('DayTimeline', () => {
  it('disables unavailable hours and emits selection', async () => {
    const availability = {
      slots: [
        { id: 1, start_dt: '2025-01-01T05:00:00Z', end_dt: '2025-01-01T06:00:00Z' },
        { id: 2, start_dt: '2025-01-01T15:30:00Z', end_dt: '2025-01-01T16:30:00Z' },
      ],
      bookings: [{ id: 'b1', pickup_when: '2025-01-01T10:00:00Z' }],
    };
    const onSelect = vi.fn();
    const slots = calculateHourlyAvailability(availability, '2025-01-01');
    renderWithProviders(
      <DayTimeline slots={slots} onSelect={onSelect} />,
    );
    const labelForHour = (hour: number) =>
      formatSlotLabel(new Date(Date.UTC(2025, 0, 1, hour, 0, 0, 0)));
    expect(screen.getByRole('button', { name: labelForHour(5) })).toBeDisabled();
    expect(screen.getByRole('button', { name: labelForHour(10) })).toBeDisabled();
    expect(screen.getByRole('button', { name: labelForHour(15) })).toBeDisabled();
    expect(screen.getByRole('button', { name: labelForHour(16) })).toBeDisabled();
    const eleven = screen.getByRole('button', { name: labelForHour(11) });
    expect(eleven).toBeEnabled();
    await userEvent.click(eleven);
    const expectedIso = new Date(Date.UTC(2025, 0, 1, 11, 0, 0, 0)).toISOString();
    expect(onSelect).toHaveBeenCalledWith(expectedIso);
    const [[selectedIso]] = onSelect.mock.calls;
    expect(selectedIso).toBe(expectedIso);
  });
});

