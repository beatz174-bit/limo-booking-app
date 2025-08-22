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
} from '@mui/material';
import { Link } from 'react-router-dom';
import { driverBookingsApi as bookingsApi } from '@/components/ApiConfig';
import { bookingStatusLabels, type BookingStatus } from '@/types/BookingStatus';
import StatusChip from '@/components/StatusChip';

const statuses: BookingStatus[] = [
  'PENDING',
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
  const [bookings, setBookings] = useState<Booking[]>([]);
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
        const { data } = await bookingsApi.listBookingsApiV1DriverBookingsGet();
        setBookings(data as unknown as Booking[]);
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
      | 'complete',
  ) {
    const apiMap = {
      confirm: bookingsApi.confirmBookingApiV1DriverBookingsBookingIdConfirmPost,
      decline: bookingsApi.declineBookingApiV1DriverBookingsBookingIdDeclinePost,
      leave: bookingsApi.leaveBookingApiV1DriverBookingsBookingIdLeavePost,
      'arrive-pickup': bookingsApi.arrivePickupApiV1DriverBookingsBookingIdArrivePickupPost,
      'start-trip': bookingsApi.startTripApiV1DriverBookingsBookingIdStartTripPost,
      'arrive-dropoff': bookingsApi.arriveDropoffApiV1DriverBookingsBookingIdArriveDropoffPost,
      complete: bookingsApi.completeBookingApiV1DriverBookingsBookingIdCompletePost,
    } as const;
    try {
      const { data } = await apiMap[action](id);
      setBookings(b =>
        b.map(item =>
          item.id === id
            ? {
                ...item,
                status: data.status,
                final_price_cents:
                  data.final_price_cents ?? item.final_price_cents,
              }
            : item,
        )
      );
    } catch {
      /* ignore */
    }
    const data = res.data as Booking;
    setBookings((b) =>
      b.map((item) =>
        item.id === id
          ? {
              ...item,
              status: data.status,
              final_price_cents: data.final_price_cents ?? item.final_price_cents,
            }
          : item,
      ),
    );
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
    </Stack>
  );
}
