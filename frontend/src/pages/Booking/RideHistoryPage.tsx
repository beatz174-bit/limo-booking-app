import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { customerBookingsApi } from '@/components/ApiConfig';
import type { BookingRead as Booking } from '@/api-client';

function RideHistoryPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await customerBookingsApi.listMyBookingsApiV1CustomersMeBookingsGet();
        if (alive) setBookings(res.data as Booking[]);
      } catch (e: unknown) {
        if (alive)
          setError(
            e instanceof Error ? e.message : 'Failed to load bookings',
          );
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
              <TableCell>Track</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map((b) => {
              const trackable = !['COMPLETED', 'CANCELLED'].includes(
                b.status.toUpperCase(),
              );
              return (
                <TableRow
                  key={b.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/history/${b.id}`, { state: b })}
                >
                  <TableCell>{b.pickup_address}</TableCell>
                  <TableCell>{b.dropoff_address}</TableCell>
                  <TableCell>{new Date(b.pickup_when).toLocaleString()}</TableCell>
                  <TableCell>
                    {((b.final_price_cents ?? b.estimated_price_cents) / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>{b.status}</TableCell>
                  <TableCell>
                    {trackable && (
                      <Button
                        component={RouterLink}
                        to={`/t/${b.public_code}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Track
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

export default RideHistoryPage;

