import { useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import * as logger from '@/lib/logger';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';

interface BillingDetails {
  name: string;
  email: string;
  phone: string;
}

interface PaymentMethodFormProps {
  clientSecret: string;
  billingDetails: BillingDetails;
  ensureFreshToken: () => Promise<string | null>;
  onSaved: () => void;
  onCancel?: () => void;
}

const PaymentMethodForm = ({
  clientSecret,
  billingDetails,
  ensureFreshToken,
  onSaved,
  onCancel,
}: PaymentMethodFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSaveCard = async () => {
    if (!stripe || !elements) return;
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setCardError(submitError.message || 'Failed to submit card details.');
      return;
    }
    await ensureFreshToken();
    setCardError(null);
    try {
      const base = CONFIG.API_BASE_URL ?? '';
      const setup = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: billingDetails.name,
              email: billingDetails.email,
              phone: billingDetails.phone,
            },
          },
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });
      const pm = setup?.setupIntent?.payment_method;
      if (!pm) {
        const message = setup?.error?.message || 'Failed to confirm card.';
        logger.warn('components/PaymentMethodForm', 'save card failed', message);
        setCardError(message);
        return;
      }
      const putRes = await apiFetch(`${base}/users/me/payment-method`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: pm }),
      });
      if (!putRes.ok) {
        const text = await putRes.text().catch(() => '');
        logger.warn('components/PaymentMethodForm', 'save card failed', {
          status: putRes.status,
          body: text,
        });
        setCardError('Failed to save payment method.');
        return;
      }
      onSaved();
    } catch (err) {
      logger.warn('components/PaymentMethodForm', 'save card failed', err);
      setCardError('Failed to save payment method.');
    }
  };

  return (
    <Stack spacing={1}>
      {cardError && <Alert severity="error">{cardError}</Alert>}
      <PaymentElement
        options={{
          defaultValues: { billingDetails },
          fields: {
            billingDetails: {
              name: 'never',
              email: 'never',
              phone: 'never',
            },
          },
        }}
      />
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={handleSaveCard}>
          Save Card
        </Button>
        {onCancel && (
          <Button onClick={onCancel}>Cancel</Button>
        )}
      </Stack>
    </Stack>
  );
};

export default PaymentMethodForm;
