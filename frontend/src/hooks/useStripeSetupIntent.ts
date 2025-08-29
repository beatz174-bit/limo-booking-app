import { useState } from 'react';

interface CreateBookingData {
  pickup_when: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  passengers: number;
  notes?: string;
  customer: { name: string; email: string; phone?: string };
}

export function useStripeSetupIntent() {
  const [loading, setLoading] = useState(false);

  async function createBooking(data: CreateBookingData) {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/bookings`, {
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
      return {
        booking: json.booking,
        clientSecret: json.stripe.setup_intent_client_secret as string,
      };
    } finally {
      setLoading(false);
    }
  }

  return { createBooking, loading };
}
