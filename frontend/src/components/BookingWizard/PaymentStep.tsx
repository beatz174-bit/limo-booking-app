import { Stack, TextField, Button } from '@mui/material';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';
import { useStripeSetupIntent } from '@/hooks/useStripeSetupIntent';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface Props {
  data: any;
  onBack: () => void;
}

function PaymentInner({ data, onBack }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const { createBooking } = useStripeSetupIntent();
  const [name, setName] = useState(data.customer?.name || '');
  const [email, setEmail] = useState(data.customer?.email || '');
  const [phone, setPhone] = useState(data.customer?.phone || '');

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
      // eslint-disable-next-line no-alert
      alert('Booking created');
    }
  }

  return (
    <Stack spacing={2}>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <CardElement />
      <Stack direction="row" spacing={1}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={handleSubmit}>Submit</Button>
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
