import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { bookingsApi } from '@/components/ApiConfig';
import type { BookingRead } from '@/api-client';

function RideHistoryPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<BookingRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await bookingsApi.apiListBookingsBookingsGet();
        if (alive) setBookings(res.data as BookingRead[]);
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load bookings');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Ride History
      </Typography>

      {bookings.length === 0 ? (
        <Typography>No rides found.</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Pickup</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>Ride Time</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map((b) => (
              <TableRow
                key={b.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/history/${b.id}`, { state: b })}
              >
                <TableCell>{b.pickup_location}</TableCell>
                <TableCell>{b.dropoff_location}</TableCell>
                <TableCell>{new Date(b.time).toLocaleString()}</TableCell>
                <TableCell>${b.price}</TableCell>
                <TableCell>{b.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

export default RideHistoryPage;

