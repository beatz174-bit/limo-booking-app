import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/__tests__/setup/renderWithProviders';
import AvailabilityCalendar from '@/components/BookingWizard/AvailabilityCalendar';

const useAvailabilityMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAvailability', () => ({
  __esModule: true,
  default: useAvailabilityMock,
}));

beforeEach(() => {
  useAvailabilityMock.mockReset();
  useAvailabilityMock.mockImplementation((month: string) => ({
    dayStates: {
      [`${month}-01`]: 'free',
      [`${month}-02`]: 'partial',
      [`${month}-03`]: 'full',
    },
  }));
});

describe('AvailabilityCalendar', () => {
  it('navigates months and handles day states', async () => {
    const originalTZ = process.env.TZ;
    process.env.TZ = 'Asia/Kolkata';

    const onSelect = vi.fn();
    const onMonthChange = vi.fn();
    try {
      renderWithProviders(
        <AvailabilityCalendar
          value="2025-01-01"
          onSelect={onSelect}
          onMonthChange={onMonthChange}
        />,
      );

      const buttons = screen.getAllByRole('button');
      const prev = buttons[0];
      const next = buttons[1];

      const day1 = screen.getByRole('button', { name: '1' });
      const day2 = screen.getByRole('button', { name: '2' });
      const day3 = screen.getByRole('button', { name: '3' });

      expect(useAvailabilityMock).toHaveBeenCalledWith('2025-01');

      expect(day1).toBeEnabled();
      expect(day2).toBeEnabled();
      expect(day3).toBeDisabled();

      await userEvent.click(day2);
      expect(onSelect).toHaveBeenCalledWith('2025-01-02');

      await userEvent.click(prev);
      await userEvent.click(next);
      await userEvent.click(next);

      expect(onMonthChange.mock.calls).toEqual([
        ['2024-12'],
        ['2025-01'],
        ['2025-02'],
      ]);

      expect(useAvailabilityMock.mock.calls.map(([month]) => month)).toEqual([
        '2025-01',
        '2024-12',
        '2025-01',
        '2025-02',
      ]);
    } finally {
      if (originalTZ === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTZ;
      }
    }
  });
});
