import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import TripDetails from './TripDetails';
import { MapProvider } from '@/components/MapProvider';
import { MapRoute } from '@/components/MapRoute';
import { BookingFormData } from '@/types/BookingFormData';
import { useBooking } from '@/hooks/useBooking';
import { useAuth } from '@/contexts/AuthContext';
import * as logger from '@/lib/logger';

interface BookingWizardProps {
  onRequirePaymentMethod?: () => void;
}

export default function BookingWizard({
  onRequirePaymentMethod,
}: BookingWizardProps) {
  const [form, setForm] = useState<BookingFormData>({
    passengers: 1,
    notes: '',
    pickupValid: false,
    dropoffValid: false,
  });
  const { user: profile } = useAuth();
  const { createBooking, loading } = useBooking();
  const [bookingData, setBookingData] = useState<{ public_code: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const update = useCallback((data: Partial<BookingFormData>) => {
    setForm((f) => ({ ...f, ...data }));
  }, []);
  const handleConfirm = async () => {
    if (!form.pickup_when || !form.pickup || !form.dropoff) return;
    setError(null);
    try {
      const payload = {
        pickup_when: form.pickup_when,
        pickup: form.pickup,
        dropoff: form.dropoff,
        passengers: form.passengers,
        notes: form.notes,
        customer: profile
          ? {
              name: profile.full_name ?? '',
              email: profile.email ?? '',
              phone: profile.phone ?? '',
            }
          : undefined,
      };
      const res = await createBooking(payload);
      setBookingData(res.booking);
    } catch (err) {
      logger.error(
        'components/BookingWizard/BookingWizard',
        'Booking creation failed',
        err,
      );
      const apiErr = err as Error & { status?: number };
      if (apiErr.status === 400 && /payment method/i.test(apiErr.message)) {
        setError(apiErr.message);
        onRequirePaymentMethod?.();
      } else {
        setError('Failed to create booking. Please try again.');
      }
    }
  };

  if (bookingData) {
    return (
      <Stack spacing={2}>
        <Typography>Your booking is confirmed.</Typography>
        <Button
          component={RouterLink}
          to={`/t/${bookingData.public_code}`}
          variant="contained"
        >
          Track this ride
        </Button>
      </Stack>
    );
  }

  return (
    <Box>
      <TripDetails data={form} onChange={update} />
      {form.pickupValid && form.dropoffValid && (
        <Box mt={2}>
          <MapProvider>
            <MapRoute
              pickup={form.pickup}
              dropoff={form.dropoff}
              rideTime={form.pickup_when}
            />
          </MapProvider>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {loading ? (
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Button
              sx={{ mt: 2 }}
              variant="contained"
              onClick={handleConfirm}
            >
              Confirm booking
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}
