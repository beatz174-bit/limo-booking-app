import { render, screen } from '@testing-library/react';
import { capitalize } from '@mui/material/utils';
import StatusChip from './StatusChip';
import {
  bookingStatusLabels,
  bookingStatusColors,
  type BookingStatus
} from '@/types/BookingStatus';

describe('StatusChip', () => {
  const statuses = Object.keys(bookingStatusColors) as BookingStatus[];

  it('has mapping for all statuses', () => {
    expect(statuses.length).toBeGreaterThan(0);
    statuses.forEach(status => {
      expect(bookingStatusColors[status]).toBeDefined();
    });
  });

  statuses.forEach(status => {
    it(`renders ${status} with correct label and color`, () => {
      render(<StatusChip status={status} />);
      const chipLabel = screen.getByText(bookingStatusLabels[status]);
      const chip = chipLabel.parentElement;
      expect(chipLabel).toBeInTheDocument();
      expect(chip).toHaveClass(
        `MuiChip-color${capitalize(bookingStatusColors[status])}`
      );
    });
  });
});
