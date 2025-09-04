import { useMemo, useState } from 'react';
import {
  Button,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { bookingStatusLabels, type BookingStatus } from '@/types/BookingStatus';
import StatusChip from '@/components/StatusChip';
import type { BookingRead as Booking } from '@/api-client';
import { useBookings } from '@/hooks/useBookings';

const statuses: BookingStatus[] = [
  'PENDING',
  'DEPOSIT_FAILED',
  'DRIVER_CONFIRMED',
  'ON_THE_WAY',
  'ARRIVED_PICKUP',
  'IN_PROGRESS',
  'ARRIVED_DROPOFF',
  'COMPLETED',
  'DECLINED',
  'CANCELLED',
];

export default function DriverDashboard() {
  const { bookings, updateBooking } = useBookings();
  const [error, setError] = useState<string | null>(null);
  const bookingsByStatus = useMemo(() => {
    const groups = statuses.reduce(
      (acc, s) => ({ ...acc, [s]: [] as Booking[] }),
      {} as Record<BookingStatus, Booking[]>,
    );
    bookings.forEach((b) => {
      groups[b.status].push(b);
    });
    return groups;
  }, [bookings]);
  const [tab, setTab] = useState<BookingStatus>('PENDING');

  async function update(
    id: string,
    action:
      | 'confirm'
      | 'decline'
      | 'start-trip'
      | 'complete'
      | 'retry-deposit',
  ) {
    try {
      await updateBooking(id, action);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h5">Driver Bookings</Typography>
      <Button component={Link} to="/driver/availability" variant="outlined">
        Manage availability
      </Button>
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {statuses.map((s) => (
          <Tab key={s} label={bookingStatusLabels[s]} value={s} />
        ))}
      </Tabs>
      {statuses.map((s) => {
        const list = bookingsByStatus[s];
        return (
          <List key={s} hidden={tab !== s}>
            {list.map((b) => (
              <ListItem key={b.id} divider>
                <ListItemText
                  primary={`${b.pickup_address} → ${b.dropoff_address}`}
                  secondary={new Date(b.pickup_when).toLocaleString()}
                />
                <StatusChip status={b.status} sx={{ mr: 1 }} />
                {b.status === 'PENDING' && (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => update(b.id, 'confirm')}
                      sx={{ mr: 1 }}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => update(b.id, 'decline')}
                    >
                      Decline
                    </Button>
                  </>
                )}
                {b.status === 'DEPOSIT_FAILED' && (
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={() => update(b.id, 'retry-deposit')}
                  >
                    Retry deposit
                  </Button>
                )}
                {b.status === 'ARRIVED_PICKUP' && (
                  <Button
                    variant="contained"
                    onClick={() => update(b.id, 'start-trip')}
                  >
                    Start trip
                  </Button>
                )}
                {b.status === 'ARRIVED_DROPOFF' && (
                  <Button
                    variant="contained"
                    onClick={() => update(b.id, 'complete')}
                  >
                    Complete
                  </Button>
                )}
                {b.status === 'COMPLETED' &&
                  b.final_price_cents != null && (
                    <Typography>
                      ${(b.final_price_cents / 100).toFixed(2)}
                    </Typography>
                  )}
              </ListItem>
            ))}
            {list.length === 0 && <Typography>No bookings</Typography>}
          </List>
        );
      })}
      {error && (
        <Snackbar
          open
          onClose={() => setError(null)}
          autoHideDuration={6000}
        >
          <Alert
            onClose={() => setError(null)}
            severity="error"
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        </Snackbar>
      )}
    </Stack>
  );
}
