import { Stack, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useBooking } from '@/hooks/useBooking';
import { BookingFormData } from '@/types/BookingFormData';
import { useAuth } from '@/contexts/AuthContext';
import * as logger from '@/lib/logger';

interface Props {
  data: Required<BookingFormData>;
  onBack: () => void;
}

export default function PaymentStep({ data, onBack }: Props) {
  const { user: profile } = useAuth();
  const { createBooking, savedPaymentMethod, loading } = useBooking();
  const [bookingData, setBookingData] = useState<{ public_code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!savedPaymentMethod) return;
    let ignore = false;
    async function init() {
      const payload = {
        pickup_when: data.pickup_when,
        pickup: data.pickup,
        dropoff: data.dropoff,
        passengers: data.passengers,
        notes: data.notes,
        customer: profile
          ? {
              name: profile.full_name ?? '',
              email: profile.email ?? '',
              phone: profile.phone ?? '',
            }
          : undefined,
      };
      try {
        const res = await createBooking(payload);
        if (!ignore) {
          setBookingData(res.booking);
        }
      } catch (err) {
        logger.error(
          'components/BookingWizard/PaymentStep',
          'Booking creation failed',
          err,
        );
        if (!ignore) {
          setError('Failed to create booking. Please try again.');
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [createBooking, data, profile, savedPaymentMethod]);

  if (!savedPaymentMethod) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">No saved payment method found.</Alert>
        <Button onClick={onBack}>Back</Button>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={onBack}>Back</Button>
      </Stack>
    );
  }

  if (loading || !bookingData) {
    return (
      <Stack alignItems="center">
        <CircularProgress />
      </Stack>
    );
  }

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
