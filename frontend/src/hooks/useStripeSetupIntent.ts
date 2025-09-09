import { useEffect, useState } from 'react';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';
import * as logger from '@/lib/logger';

interface CreateBookingData {
  pickup_when: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  passengers: number;
  notes?: string;
  customer?: { name: string; email: string; phone: string };
}

interface SavedPaymentMethod {
  brand: string;
  last4: string;
  exp_month?: number;
  exp_year?: number;
}

export function useStripeSetupIntent() {
  const [loading, setLoading] = useState(false);
  const [savedPaymentMethod, setSavedPaymentMethod] =
    useState<SavedPaymentMethod | null>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchPaymentMethod() {
      try {
        const res = await apiFetch(
          `${CONFIG.API_BASE_URL}/users/me/payment-method`,
        );
        if (!ignore && res.ok) {
          try {
            const json = await res.json();
            if (json && json.last4) {
              setSavedPaymentMethod(json as SavedPaymentMethod);
            }
          } catch {
            /* ignore JSON errors */
          }
        }
      } catch {
        /* ignore network errors */
      }
    }
    fetchPaymentMethod();
    return () => {
      ignore = true;
    };
  }, []);

  async function createBooking(data: CreateBookingData) {
    setLoading(true);
    try {
      const res = await apiFetch(`${CONFIG.API_BASE_URL}/api/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let message = 'booking failed';
        try {
          const errJson = await res.json();
          if (typeof errJson.detail === 'string') {
            message = errJson.detail;
          } else if (Array.isArray(errJson.detail)) {
            message = errJson.detail.map((d: { msg?: string }) => d.msg).join(', ');
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }
      const json = await res.json();
      logger.info(
        'hooks/useStripeSetupIntent',
        'setup-intent response',
        { clientSecret: json.stripe.setup_intent_client_secret },
      );
      return {
        booking: json.booking,
        clientSecret: json.stripe.setup_intent_client_secret as string,
      };
    } finally {
      setLoading(false);
    }
  }

  async function savePaymentMethod(paymentMethodId: string) {
    logger.info(
      'hooks/useStripeSetupIntent',
      'saving payment method',
      { payment_method_id: paymentMethodId },
    );
    const res = await apiFetch(
      `${CONFIG.API_BASE_URL}/users/me/payment-method`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: paymentMethodId }),
      },
    );
    logger.info(
      'hooks/useStripeSetupIntent',
      'save payment method response',
      { status: res.status, payment_method_id: paymentMethodId },
    );
  }

  return { createBooking, savePaymentMethod, savedPaymentMethod, loading };
}
