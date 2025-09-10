import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import DayTimeline from '@/components/BookingWizard/DayTimeline';

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
    renderWithProviders(
      <DayTimeline date="2025-01-01" availability={availability} onSelect={onSelect} />,
    );
    expect(screen.getByRole('button', { name: '05:00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '10:00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '15:00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '16:00' })).toBeDisabled();
    const eleven = screen.getByRole('button', { name: '11:00' });
    expect(eleven).toBeEnabled();
    await userEvent.click(eleven);
    expect(onSelect).toHaveBeenCalledWith(
      new Date('2025-01-01T11:00:00').toISOString(),
    );
  });
});

