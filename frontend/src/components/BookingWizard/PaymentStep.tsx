import { Stack, TextField, Button, Typography } from '@mui/material';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useStripeSetupIntent } from '@/hooks/useStripeSetupIntent';
import { useSettings } from '@/hooks/useSettings';
import { useRouteMetrics } from '@/hooks/useRouteMetrics';
import FareBreakdown from '@/components/FareBreakdown';
import * as logger from '@/lib/logger';
import { BookingFormData } from '@/types/BookingFormData';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/services/apiFetch';
import { CONFIG } from '@/config';

const stripePromise = (async () => {
  try {
    return await loadStripe(
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
    );
  } catch (error) {
    logger.warn(
      'components/BookingWizard/PaymentStep',
      'Stripe initialization failed',
      error
    );
    return null;
  }
})();

interface Props {
  data: Required<BookingFormData>;
  onBack: () => void;
}

function PaymentInner({ data, onBack }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const { createBooking, savePaymentMethod, savedPaymentMethod } =
    useStripeSetupIntent();
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
  const { user } = useAuth();
  const [profile, setProfile] = useState(user);

  useEffect(() => {
    let ignore = false;
    async function fetchPrice() {
      if (!data.pickup || !data.dropoff) return;
      const metrics = await getMetrics(
        data.pickup.lat,
        data.pickup.lng,
        data.dropoff.lat,
        data.dropoff.lng
      );
      if (!ignore && metrics) {
        logger.debug(
          'components/BookingWizard/PaymentStep',
          'Route distance km',
          metrics.km
        );
        logger.debug(
          'components/BookingWizard/PaymentStep',
          'Route duration min',
          metrics.min
        );
        logger.debug(
          'components/BookingWizard/PaymentStep',
          'Tariff',
          {
            flagfall: tariff.flagfall,
            perKm: tariff.perKm,
            perMin: tariff.perMin,
          }
        );
        const estimate =
          tariff.flagfall +
          metrics.km * tariff.perKm +
          metrics.min * tariff.perMin;
        logger.info(
          'components/BookingWizard/PaymentStep',
          'Price estimate',
          estimate
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
  const [booking, setBooking] = useState<{ public_code: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchUser() {
      try {
        const res = await apiFetch(`${CONFIG.API_BASE_URL}/api/v1/users/me`);
        if (!ignore && res.ok) {
          const json = await res.json();
          setProfile(json);
        }
      } catch {
        /* ignore */
      }
    }
    if (!profile?.full_name || !profile.email || !profile.phone) {
      fetchUser();
    }
    return () => {
      ignore = true;
    };
  }, [profile]);

  async function handleSubmit() {
    const payload = {
      pickup_when: data.pickup_when,
      pickup: data.pickup,
      dropoff: data.dropoff,
      passengers: data.passengers,
      notes: data.notes,
    };
    logger.info(
      'components/BookingWizard/PaymentStep',
      'Submitting booking',
      payload
    );
    const res = await createBooking(payload);

    if (!savedPaymentMethod) {
      if (!stripe || !elements) {
        logger.warn(
          'components/BookingWizard/PaymentStep',
          'Stripe not ready'
        );
        return;
      }
      const card = elements.getElement(CardElement);
      if (res.clientSecret && card) {
        const setup = await stripe.confirmCardSetup(res.clientSecret, {
          payment_method: { card },
        });
        const pm = setup?.setupIntent?.payment_method;
        if (pm) {
          await savePaymentMethod(pm as string);
        }
      } else {
        logger.error(
          'components/BookingWizard/PaymentStep',
          'Booking creation failed',
          res
        );
        return;
      }
    }

    setBooking(res.booking);
    logger.info(
      'components/BookingWizard/PaymentStep',
      'Booking confirmed',
      res.booking
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
      <TextField
        label="Name"
        value={profile?.full_name || ''}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="Email"
        value={profile?.email || ''}
        InputProps={{ readOnly: true }}
      />
      <TextField
        label="Phone"
        value={profile?.phone || ''}
        InputProps={{ readOnly: true }}
      />
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
        <CardElement />
      )}
      <Stack direction="row" spacing={1}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Submit
        </Button>
      </Stack>
    </Stack>
  );
}

export default function PaymentStep(props: Props) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentInner {...props} />
    </Elements>
  );
}
