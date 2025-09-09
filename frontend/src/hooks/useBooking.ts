import { useState } from 'react';
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

export function useBooking() {
  const [loading, setLoading] = useState(false);

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
      logger.info('hooks/useBooking', 'booking created', { id: json?.booking?.id });
      return { booking: json.booking };
    } finally {
      setLoading(false);
    }
  }

  return { createBooking, loading };
}
