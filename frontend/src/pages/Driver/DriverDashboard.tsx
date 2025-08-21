import { useEffect, useState } from 'react';
import { Button, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { CONFIG } from '@/config';
import { getAccessToken } from '@/services/tokenStore';

interface Booking {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_when: string;
}

export default function DriverDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    (async () => {
      const token = getAccessToken();
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/v1/driver/bookings?status=PENDING`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBookings(await res.json());
      }
    })();
  }, []);

  async function update(id: string, action: 'confirm' | 'decline') {
    const token = getAccessToken();
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/v1/driver/bookings/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setBookings(bookings.filter(b => b.id !== id));
    }
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h5">Pending Bookings</Typography>
      <List>
        {bookings.map(b => (
          <ListItem key={b.id} divider>
            <ListItemText primary={`${b.pickup_address} → ${b.dropoff_address}`} secondary={new Date(b.pickup_when).toLocaleString()} />
            <Button variant="contained" color="success" onClick={() => update(b.id, 'confirm')} sx={{ mr: 1 }}>Confirm</Button>
            <Button variant="outlined" color="error" onClick={() => update(b.id, 'decline')}>Decline</Button>
          </ListItem>
        ))}
        {bookings.length === 0 && <Typography>No pending bookings</Typography>}
      </List>
    </Stack>
  );
}
