import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  Typography,
  Link as MuiLink,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import FareBreakdown from '@/components/FareBreakdown';
import { useAuth } from '@/contexts/AuthContext';
import { useRouteMetrics } from '@/hooks/useRouteMetrics';
import { useSettings } from '@/hooks/useSettings';
import { useStripeSetupIntent } from '@/hooks/useStripeSetupIntent';
import * as logger from '@/lib/logger';
import { BookingFormData } from '@/types/BookingFormData';

interface Props {
  data: Required<BookingFormData>;
  onBack: () => void;
}

interface SavedPaymentMethod {
  brand: string;
  last4: string;
}

interface InnerProps extends Props {
  bookingData: { public_code: string };
  savedPaymentMethod: SavedPaymentMethod | null;
}

function PaymentInner({
  data,
  onBack,
  bookingData,
  savedPaymentMethod,
}: InnerProps) {
  const { data: settings } = useSettings();
  interface SettingsAliases {
    flagfall?: number;
    per_km_rate?: number;
    perKm?: number;
    per_minute_rate?: number;
    perMin?: number;
  }
  const s = settings as SettingsAliases | undefined;
  const tariff = {
    flagfall: Number(s?.flagfall ?? 0),
    perKm: Number(s?.per_km_rate ?? s?.perKm ?? 0),
    perMin: Number(s?.per_minute_rate ?? s?.perMin ?? 0),
  };
  const getMetrics = useRouteMetrics();
  const [price, setPrice] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [booking, setBooking] = useState<{ public_code: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchPrice() {
      if (!data.pickup || !data.dropoff) return;
      const metrics = await getMetrics(
        data.pickup.lat,
        data.pickup.lng,
        data.dropoff.lat,
        data.dropoff.lng,
      );
      if (!ignore && metrics) {
        logger.debug(
          'components/BookingWizard/PaymentStep',
          'Route distance km',
          metrics.km,
        );
        logger.debug(
          'components/BookingWizard/PaymentStep',
          'Route duration min',
          metrics.min,
        );
        logger.debug(
          'components/BookingWizard/PaymentStep',
          'Tariff',
          {
            flagfall: tariff.flagfall,
            perKm: tariff.perKm,
            perMin: tariff.perMin,
          },
        );
        const estimate =
          tariff.flagfall +
          metrics.km * tariff.perKm +
          metrics.min * tariff.perMin;
        logger.info(
          'components/BookingWizard/PaymentStep',
          'Price estimate',
          estimate,
        );
        setPrice(estimate);
        setDistanceKm(metrics.km);
        setDurationMin(metrics.min);
      }
    }
    fetchPrice();
    return () => {
      ignore = true;
    };
  }, [
    getMetrics,
    data.pickup,
    data.dropoff,
    tariff.flagfall,
    tariff.perKm,
    tariff.perMin,
  ]);

  async function handleSubmit() {
    setBooking(bookingData);
    logger.info(
      'components/BookingWizard/PaymentStep',
      'Booking confirmed',
      bookingData,
    );
  }

  if (booking) {
    return (
      <Stack spacing={2}>
        <Typography>Booking created</Typography>
        <Button
          component={RouterLink}
          to={`/t/${booking.public_code}`}
          variant="contained"
        >
          Track this ride
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {price != null && (
        <Typography>Estimated fare: ${price.toFixed(2)}</Typography>
      )}
      <FareBreakdown
        price={price}
        flagfall={tariff.flagfall}
        perKm={tariff.perKm}
        perMin={tariff.perMin}
        distanceKm={distanceKm}
        durationMin={durationMin}
      />
      <Typography variant="body2">
        50% deposit{price != null ? ` ($${(price * 0.5).toFixed(2)})` : ''} charged on
        confirmation
      </Typography>
      {savedPaymentMethod ? (
        <Typography>
          Using saved card {savedPaymentMethod.brand} ending in {savedPaymentMethod.last4}
        </Typography>
      ) : (
        <Typography>
          No saved card on file. Please{' '}
          <MuiLink component={RouterLink} to="/profile">
            add a payment method
          </MuiLink>
          .
        </Typography>
      )}
      <Stack direction="row" spacing={1}>
        <Button onClick={onBack}>Back</Button>
        {savedPaymentMethod && (
          <Button variant="contained" onClick={handleSubmit}>
            Submit
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

export default function PaymentStep({ data, onBack }: Props) {
  const { user: profile } = useAuth();
  const { createBooking, savedPaymentMethod } = useStripeSetupIntent();
  const [bookingData, setBookingData] = useState<{ public_code: string } | null>(
    null,
  );
  const [initError, setInitError] = useState<string | null>(null);
  const name = profile?.full_name ?? '';
  const email = profile?.email ?? '';
  const phone = profile?.phone ?? '';
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let ignore = false;
    async function init() {
      const payload = {
        pickup_when: data.pickup_when,
        pickup: data.pickup,
        dropoff: data.dropoff,
        passengers: data.passengers,
        notes: data.notes,
        customer: profile ? { name, email, phone } : undefined,
      };
      try {
        const res = await createBooking(payload);
        if (!ignore) {
          setBookingData(res.booking);
        }
      } catch (error) {
        logger.error(
          'components/BookingWizard/PaymentStep',
          'Booking creation failed',
          error,
        );
        if (!ignore) {
          setInitError('Failed to create booking. Please try again.');
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [createBooking, data, name, email, phone, profile]);

  if (initError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{initError}</Alert>
        <Button onClick={onBack}>Back</Button>
      </Stack>
    );
  }

  if (!bookingData) {
    return (
      <Stack alignItems="center">
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <PaymentInner
      data={data}
      onBack={onBack}
      bookingData={bookingData}
      savedPaymentMethod={savedPaymentMethod}
    />
  );
}

