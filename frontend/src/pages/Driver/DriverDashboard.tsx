import { useEffect, useMemo, useState } from 'react';
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
  Alert
} from '@mui/material';
import { Link } from 'react-router-dom';
import { driverBookingsApi as bookingsApi } from '@/components/ApiConfig';
import { bookingStatusLabels, type BookingStatus } from '@/types/BookingStatus';
import StatusChip from '@/components/StatusChip';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';
import type { BookingRead as Booking } from '@/api-client';
import { getAccessToken } from '@/services/tokenStore';

const statuses: BookingStatus[] = [
  'PENDING',
  'DEPOSIT_FAILED',
  'DRIVER_CONFIRMED',
  'DEPOSIT_FAILED',
  'ON_THE_WAY',
  'ARRIVED_PICKUP',
  'IN_PROGRESS',
  'ARRIVED_DROPOFF',
  'COMPLETED',
  'DECLINED',
  'CANCELLED',
];

export default function DriverDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  useEffect(() => {
    (async () => {
      try {
        const token = getAccessToken();
        const { data } = await bookingsApi.listBookingsApiV1DriverBookingsGet(
          undefined,
          token
            ? { headers: { Authorization: `Bearer ${token}` } }
            : undefined,
        );
        setBookings(data as Booking[]);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function update(
    id: string,
    action:
      | 'confirm'
      | 'decline'
      | 'leave'
      | 'arrive-pickup'
      | 'start-trip'
      | 'arrive-dropoff'
      | 'complete'
      | 'retry-deposit',
  ) {
    const res = await apiFetch(
      `${CONFIG.API_BASE_URL}/api/v1/driver/bookings/${id}/${action}`,
      {
        method: 'POST',
      }
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setBookings((b) =>
        b.map((item) =>
          item.id === id
            ? {
                ...item,
                status: data.status,
                final_price_cents:
                  data.final_price_cents ?? item.final_price_cents,
              }
            : item,
        ),
      );
    } else {
      setError(`${res.status} ${data.message ?? data.detail ?? res.statusText}`);
    }
  }

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

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
                {b.status === 'DRIVER_CONFIRMED' && (
                  <Button
                    variant="contained"
                    onClick={async () => {
                      await update(b.id, 'leave');
                    }}
                    disabled={b.leave_at ? new Date(b.leave_at).getTime() > now : true}
                  >
                    Leave now
                  </Button>
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
                {b.status === 'ON_THE_WAY' && (
                  <Button
                    variant="contained"
                    onClick={() => update(b.id, 'arrive-pickup')}
                  >
                    Arrived pickup
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
                {b.status === 'IN_PROGRESS' && (
                  <Button
                    variant="contained"
                    onClick={() => update(b.id, 'arrive-dropoff')}
                  >
                    Arrived dropoff
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
                  b.final_price_cents !== undefined && (
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
