import { Stack, TextField, Button, Typography } from '@mui/material';
import {
  Elements,
  CardElement,
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

function PaymentInner({ data, onBack }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const { createBooking, savePaymentMethod, savedPaymentMethod } =
    useStripeSetupIntent();
  const { data: settings } = useSettings();
  const { profile } = useAuth();
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
    const payload = {
      pickup_when: data.pickup_when,
      pickup: data.pickup,
      dropoff: data.dropoff,
      passengers: data.passengers,
      notes: data.notes,
      customer: { name, email, phone },
    };
    logger.info(
      'components/BookingWizard/PaymentStep',
      'Submitting booking with Google Pay',
      payload,
    );
    const res = await createBooking(payload);
    if (!stripe || !paymentRequest) {
      logger.warn(
        'components/BookingWizard/PaymentStep',
        'Stripe or payment request not ready',
      );
      return;
    }
    if (res.clientSecret) {
      const tokenRes = (await paymentRequest.show()) as {
        token?: { id: string };
        complete: (status: string) => Promise<void>;
      };
      const token = tokenRes.token?.id;
      if (token) {
        const setup = await stripe.confirmCardSetup(res.clientSecret, {
          payment_method: token,
        });
        const pm = setup?.setupIntent?.payment_method;
        if (pm) {
          await savePaymentMethod(pm as string);
        }
        if (typeof tokenRes.complete === 'function') {
          await tokenRes.complete('success');
        }
        setBooking(res.booking);
        logger.info(
          'components/BookingWizard/PaymentStep',
          'Booking confirmed via Google Pay',
          res.booking,
        );
      }
    } else {
      logger.error(
        'components/BookingWizard/PaymentStep',
        'Booking creation failed',
        res,
      );
    }
  }

  async function handleSubmit() {
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
