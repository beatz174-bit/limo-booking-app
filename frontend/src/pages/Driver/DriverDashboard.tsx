import { useEffect, useState } from 'react';
import { Button, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { CONFIG } from '@/config';
import { getAccessToken } from '@/services/tokenStore';

interface Booking {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_when: string;
  status: string;
  leave_at?: string;
  final_price_cents?: number;
}

export default function DriverDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    (async () => {
      const token = getAccessToken();
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/v1/driver/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBookings(await res.json());
      }
    })();
  }, []);

  async function update(
    id: string,
    action: 'confirm' | 'decline' | 'leave' | 'arrive-pickup' | 'start-trip' | 'arrive-dropoff' | 'complete'
  ) {

    const token = getAccessToken();
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/v1/driver/bookings/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setBookings(b =>
        b.map(item =>
          item.id === id
            ? { ...item, status: data.status, final_price_cents: data.final_price_cents ?? item.final_price_cents }
            : item
        )
      );
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
      <List>
        {bookings.map(b => (
          <ListItem key={b.id} divider>
            <ListItemText primary={`${b.pickup_address} → ${b.dropoff_address}`} secondary={new Date(b.pickup_when).toLocaleString()} />
            {b.status === 'PENDING' && (
              <>
                <Button variant="contained" color="success" onClick={() => update(b.id, 'confirm')} sx={{ mr: 1 }}>Confirm</Button>
                <Button variant="outlined" color="error" onClick={() => update(b.id, 'decline')}>Decline</Button>
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
              <Button variant="contained" onClick={() => update(b.id, 'arrive-pickup')}>Arrived pickup</Button>
            )}
            {b.status === 'ARRIVED_PICKUP' && (
              <Button variant="contained" onClick={() => update(b.id, 'start-trip')}>Start trip</Button>
            )}
            {b.status === 'IN_PROGRESS' && (
              <Button variant="contained" onClick={() => update(b.id, 'arrive-dropoff')}>Arrived dropoff</Button>
            )}
            {b.status === 'ARRIVED_DROPOFF' && (
              <Button variant="contained" onClick={() => update(b.id, 'complete')}>Complete</Button>
            )}
            {b.status === 'COMPLETED' && b.final_price_cents !== undefined && (
              <Typography>${(b.final_price_cents / 100).toFixed(2)}</Typography>
            )}

          </ListItem>
        ))}
        {bookings.length === 0 && <Typography>No bookings</Typography>}
      </List>
    </Stack>
  );
}
