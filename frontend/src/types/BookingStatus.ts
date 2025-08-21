import { type ChipProps } from '@mui/material';

export type BookingStatus =
  | 'PENDING'
  | 'DRIVER_CONFIRMED'
  | 'DECLINED'
  | 'ON_THE_WAY'
  | 'ARRIVED_PICKUP'
  | 'IN_PROGRESS'
  | 'ARRIVED_DROPOFF'
  | 'COMPLETED'
  | 'CANCELLED';

export const bookingStatusLabels: Record<BookingStatus, string> = {
  PENDING: 'Pending',
  DRIVER_CONFIRMED: 'Driver confirmed',
  DECLINED: 'Declined',
  ON_THE_WAY: 'On the way',
  ARRIVED_PICKUP: 'Arrived pickup',
  IN_PROGRESS: 'In progress',
  ARRIVED_DROPOFF: 'Arrived dropoff',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const bookingStatusColors: Record<BookingStatus, ChipProps['color']> = {
  PENDING: 'warning',
  DRIVER_CONFIRMED: 'info',
  DECLINED: 'error',
  ON_THE_WAY: 'info',
  ARRIVED_PICKUP: 'info',
  IN_PROGRESS: 'primary',
  ARRIVED_DROPOFF: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error'
};
