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

  async function update(id: string, action: 'confirm' | 'decline' | 'leave') {
    const token = getAccessToken();
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/v1/driver/bookings/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      if (action === 'leave') {
        setBookings(bookings.map(b => b.id === id ? { ...b, status: 'ON_THE_WAY' } : b));
      } else {
        setBookings(bookings.filter(b => b.id !== id));
      }
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
          </ListItem>
        ))}
        {bookings.length === 0 && <Typography>No bookings</Typography>}
      </List>
    </Stack>
  );
}
