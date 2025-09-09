import { Stack, TextField, Button, Typography } from '@mui/material';
import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  loadStripe,
  PaymentRequest as StripePaymentRequest,
  PaymentRequestCanMakePaymentResult,
} from '@stripe/stripe-js';
import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useStripeSetupIntent } from '@/hooks/useStripeSetupIntent';
import { useSettings } from '@/hooks/useSettings';
import { useRouteMetrics } from '@/hooks/useRouteMetrics';
import FareBreakdown from '@/components/FareBreakdown';
import * as logger from '@/lib/logger';
import { BookingFormData } from '@/types/BookingFormData';
import { useAuth } from '@/contexts/AuthContext';

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
interface SavedPaymentMethod {
  brand: string;
  last4: string;
}

interface InnerProps extends Props {
  clientSecret: string;
  bookingData: { public_code: string };
  savePaymentMethod: (paymentMethodId: string) => Promise<void>;
  savedPaymentMethod: SavedPaymentMethod | null;
}

function PaymentInner({
  data,
  onBack,
  clientSecret,
  bookingData,
  savePaymentMethod,
  savedPaymentMethod,
}: InnerProps) {
  const { user: profile } = useAuth();
  const name = profile?.full_name ?? '';
  const email = profile?.email ?? '';
  const phone = profile?.phone ?? '';

  const stripe = useStripe();
  const elements = useElements();
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
  const [paymentRequest, setPaymentRequest] =
    useState<StripePaymentRequest | null>(null);
  const [booking, setBooking] =
    useState<{ public_code: string } | null>(null);

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

  useEffect(() => {
    async function initPaymentRequest() {
      if (!stripe || savedPaymentMethod) return;
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: { label: 'Deposit', amount: 0 },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
      });
      const result = (await pr.canMakePayment()) as
        | PaymentRequestCanMakePaymentResult
        | null;
      if (result?.googlePay) {
        setPaymentRequest(pr);
      }
    }
    initPaymentRequest();
  }, [stripe, savedPaymentMethod]);

  async function handleGooglePay() {
    if (!stripe || !paymentRequest) {
      logger.warn(
        'components/BookingWizard/PaymentStep',
        'Stripe or payment request not ready',
      );
      return;
    }
    const tokenRes = (await paymentRequest.show()) as {
      token?: { id: string };
      complete: (status: string) => Promise<void>;
    };
    const token = tokenRes.token?.id;
    if (token) {
      const setup = await stripe.confirmSetup({
        clientSecret,
        payment_method: token,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });
      logger.info(
        'components/BookingWizard/PaymentStep',
        'confirmSetup result',
        setup,
      );
      const pm = setup?.setupIntent?.payment_method;
      if (pm) {
        await savePaymentMethod(pm as string);
      }
      if (typeof tokenRes.complete === 'function') {
        await tokenRes.complete('success');
      }
      setBooking(bookingData);
      logger.info(
        'components/BookingWizard/PaymentStep',
        'Booking confirmed via Google Pay',
        bookingData,
      );
    }
  }

  async function handleSubmit() {
    if (!savedPaymentMethod) {
      if (!stripe || !elements) {
        logger.warn(
          'components/BookingWizard/PaymentStep',
          'Stripe not ready',
        );
        return;
      }
      const setup = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });
      logger.info(
        'components/BookingWizard/PaymentStep',
        'confirmSetup result',
        setup,
      );
      const pm = setup?.setupIntent?.payment_method;
      if (pm) {
        await savePaymentMethod(pm as string);
      }
    }
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
      <TextField label="Name" value={name} InputProps={{ readOnly: true }} />
      <TextField label="Email" value={email} InputProps={{ readOnly: true }} />
      <TextField label="Phone" value={phone} InputProps={{ readOnly: true }} />
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
      {paymentRequest && !savedPaymentMethod && (
        <PaymentRequestButtonElement
          options={{ paymentRequest }}
          onClick={handleGooglePay}
        />
      )}
      {savedPaymentMethod ? (
        <Typography>
          Using saved card {savedPaymentMethod.brand} ending in {savedPaymentMethod.last4}
        </Typography>
      ) : (
        <PaymentElement />
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

export default function PaymentStep({ data, onBack }: Props) {
  const { user: profile } = useAuth();
  const { createBooking, savePaymentMethod, savedPaymentMethod } =
    useStripeSetupIntent();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingData, setBookingData] =
    useState<{ public_code: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (clientSecret) return;
      const name = profile?.full_name ?? '';
      const email = profile?.email ?? '';
      const phone = profile?.phone ?? '';
      const payload = {
        pickup_when: data.pickup_when,
        pickup: data.pickup,
        dropoff: data.dropoff,
        passengers: data.passengers,
        notes: data.notes,
        customer: profile ? { name, email, phone } : undefined,
      };
      const res = await createBooking(payload);
      if (!ignore) {
        setClientSecret(res.clientSecret);
        setBookingData(res.booking);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [createBooking, data, profile, clientSecret]);

  if (!clientSecret || !bookingData) {
    return null;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentInner
        data={data}
        onBack={onBack}
        clientSecret={clientSecret}
        bookingData={bookingData}
        savePaymentMethod={savePaymentMethod}
        savedPaymentMethod={savedPaymentMethod}
      />
    </Elements>
  );
}
