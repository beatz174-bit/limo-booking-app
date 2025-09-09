import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import BookingWizard from '@/components/BookingWizard/BookingWizard';
import { useAuth } from '@/contexts/AuthContext';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';
import * as logger from '@/lib/logger';
import PaymentMethodForm from '@/components/PaymentMethodForm';

const stripePromise = (async () => {
  try {
    return await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
  } catch (err) {
    logger.warn('pages/Booking/BookingWizardPage', 'Stripe init failed', err);
    return null;
  }
})();

export default function BookingWizardPage() {
  const { user, ensureFreshToken } = useAuth();
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
              <PaymentMethodForm
                clientSecret={clientSecret}
                billingDetails={{
                  name: user?.full_name ?? '',
                  email: user?.email ?? '',
                  phone: user?.phone ?? '',
                }}
                ensureFreshToken={ensureFreshToken}
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
