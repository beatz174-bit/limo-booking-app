import { Chip, type ChipProps } from '@mui/material';
import {
  bookingStatusLabels,
  bookingStatusColors,
  type BookingStatus
} from '@/types/BookingStatus';

interface StatusChipProps extends Omit<ChipProps, 'label' | 'color'> {
  status: BookingStatus;
}

export default function StatusChip({ status, ...props }: StatusChipProps) {
  return (
    <Chip
      label={bookingStatusLabels[status]}
      color={bookingStatusColors[status]}
      {...props}
    />
  );
}
