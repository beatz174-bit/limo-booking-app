import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Alert, Button, Stack } from '@mui/material';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import BookingWizard from '@/components/BookingWizard/BookingWizard';
import { useAuth } from '@/contexts/AuthContext';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';
import * as logger from '@/lib/logger';

const stripePromise = (async () => {
  try {
    return await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
  } catch (err) {
    logger.warn('pages/Booking/BookingWizardPage', 'Stripe init failed', err);
    return null;
  }
})();

function CardSetup({ clientSecret, onSaved }: { clientSecret: string; onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user, ensureFreshToken } = useAuth();
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
              name: user?.full_name ?? '',
              email: user?.email ?? '',
              phone: user?.phone ?? '',
            },
          },
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });
      const pm = setup?.setupIntent?.payment_method;
      if (!pm) {
        const message = setup?.error?.message || 'Failed to confirm card.';
        logger.warn('pages/Booking/BookingWizardPage', 'save card failed', message);
        setCardError(message);
        return;
      }
      const putRes = await apiFetch(`${base}/users/me/payment-method`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: pm }),
      });
      if (!putRes.ok) {
        setCardError('Failed to save payment method.');
        return;
      }
      onSaved();
    } catch (err) {
      logger.warn('pages/Booking/BookingWizardPage', 'save card failed', err);
      setCardError('Failed to save payment method.');
    }
  };

  return (
    <Stack spacing={2} sx={{ mt: 1 }}>
      {cardError && <Alert severity="error">{cardError}</Alert>}
      <PaymentElement
        options={{
          fields: {
            billingDetails: { name: 'never', email: 'never', phone: 'never' },
          },
        }}
      />
      <Button variant="contained" onClick={handleSaveCard}>
        Save Card
      </Button>
    </Stack>
  );
}

export default function BookingWizardPage() {
  const { ensureFreshToken } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const checkPaymentMethod = async () => {
      await ensureFreshToken();
      const base = CONFIG.API_BASE_URL ?? '';
      try {
        const res = await apiFetch(`${base}/users/me/payment-method`);
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.last4) {
            return;
          }
        }
      } catch {
        /* ignore */
      }
      try {
        const res = await apiFetch(`${base}/users/me/payment-method`, {
          method: 'POST',
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.setup_intent_client_secret) {
          setClientSecret(json.setup_intent_client_secret);
          setModalOpen(true);
        }
      } catch (err) {
        logger.warn('pages/Booking/BookingWizardPage', 'setup intent request failed', err);
      }
    };
    checkPaymentMethod();
  }, [ensureFreshToken]);

  return (
    <>
      <BookingWizard />
      <Dialog open={modalOpen} onClose={() => {}} disableEscapeKeyDown>
        <DialogTitle>Add payment method</DialogTitle>
        <DialogContent>
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CardSetup
                clientSecret={clientSecret}
                onSaved={() => {
                  setModalOpen(false);
                  setClientSecret(null);
                }}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
