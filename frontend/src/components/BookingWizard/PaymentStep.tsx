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
import { settingsApi } from '@/components/ApiConfig';
import { useRouteMetrics } from '@/hooks/useRouteMetrics';

const stripePromise = (async () => {
  try {
    return await loadStripe(
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
    );
  } catch (error) {
    console.warn('Stripe initialization failed', error);
    return null;
  }
})();

interface Location {
  address: string;
  lat: number;
  lng: number;
}

interface BookingData {
  pickup_when: string;
  pickup: Location;
  dropoff: Location;
  passengers: number;
  notes?: string;
  customer?: { name?: string; email?: string; phone?: string };
}

interface Props {
  data: BookingData;
  onBack: () => void;
}

function PaymentInner({ data, onBack }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const { createBooking } = useStripeSetupIntent();
  const { data: settings } = useSettings(settingsApi);
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

  useEffect(() => {
    let ignore = false;
    async function fetchPrice() {
      const metrics = await getMetrics(
        data.pickup?.address || '',
        data.dropoff?.address || ''
      );
      if (!ignore && metrics) {
        const estimate =
          tariff.flagfall +
          metrics.km * tariff.perKm +
          metrics.min * tariff.perMin;
        setPrice(estimate);
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
  const [name, setName] = useState(data.customer?.name || '');
  const [email, setEmail] = useState(data.customer?.email || '');
  const [phone, setPhone] = useState(data.customer?.phone || '');
  const [booking, setBooking] = useState<{ public_code: string } | null>(null);

  async function handleSubmit() {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    const payload = {
      ...data,
      customer: { name, email, phone },
    };
    const res = await createBooking(payload);
    if (res.clientSecret && card) {
      await stripe.confirmCardSetup(res.clientSecret, {
        payment_method: { card },
      });
      setBooking(res.booking);
    }
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
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      {price != null && (
        <Typography>Estimated fare: ${price.toFixed(2)}</Typography>
      )}
      <Typography variant="body2">
        50% deposit{price != null ? ` ($${(price * 0.5).toFixed(2)})` : ''} charged on
        confirmation
      </Typography>
      <CardElement />
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
