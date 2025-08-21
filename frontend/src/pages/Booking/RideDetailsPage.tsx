import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { bookingsApi } from '@/components/ApiConfig';
import type { BookingRead } from '@/api-client';
import { MapRoute } from '@/components/MapRoute';
import { MapProvider } from '@/components/MapProvider';

function RideDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [booking, setBooking] = useState<BookingRead | null>(
    (location.state as BookingRead) || null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (booking || !id) return;

    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await bookingsApi.apiListBookingsBookingsGet();
        const found = (res.data as BookingRead[]).find((b) => b.id === Number(id));
        if (alive) {
          if (found) {
            setBooking(found);
          } else {
            setError('Ride not found');
          }
        }
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load ride');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [booking, id]);

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

  if (!booking) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Ride not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton
          component={RouterLink}
          to="/history"
          aria-label="Back to history"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">Ride Details</Typography>
      </Stack>

      <Stack spacing={1} sx={{ mb: 2 }}>
        <Typography>
          <strong>Pickup:</strong> {booking.pickup_location}
        </Typography>
        <Typography>
          <strong>Destination:</strong> {booking.dropoff_location}
        </Typography>
        <Typography>
          <strong>Ride Time:</strong> {new Date(booking.time).toLocaleString()}
        </Typography>
        <Typography>
          <strong>Price:</strong> ${booking.price}
        </Typography>
        <Typography>
          <strong>Status:</strong> {booking.status}
        </Typography>
        {!['COMPLETED', 'CANCELLED'].includes(booking.status.toUpperCase()) && (
          <Button component={RouterLink} to={`/t/${booking.public_code}`}>
            Track
          </Button>
        )}
      </Stack>

      <MapProvider>
        <MapRoute pickup={booking.pickup_location} dropoff={booking.dropoff_location} />
      </MapProvider>
    </Box>
  );
}

export default RideDetailsPage;

