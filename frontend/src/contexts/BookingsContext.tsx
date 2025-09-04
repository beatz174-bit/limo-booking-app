import { createContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { driverBookingsApi as bookingsApi } from '@/components/ApiConfig';
import type { BookingRead as Booking } from '@/api-client';
import { apiFetch } from '@/services/apiFetch';
import { CONFIG } from '@/config';
import { getAccessToken, onTokenChange } from '@/services/tokenStore';

export type DriverAction =
  | 'confirm'
  | 'decline'
  | 'leave'
  | 'arrive-pickup'
  | 'start-trip'
  | 'arrive-dropoff'
  | 'complete'
  | 'retry-deposit';

export interface BookingsContextValue {
  bookings: Booking[];
  updateBooking: (id: string, action: DriverAction) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const BookingsContext = createContext<BookingsContextValue | undefined>(
  undefined,
);

export function BookingsProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const socketsRef = useRef<Record<string, WebSocket>>({});

  useEffect(() => {
    const unsubscribe = onTokenChange(() => {
      setToken(getAccessToken());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!token) {
      setBookings([]);
      return;
    }
    (async () => {
      try {
        const { data } = await bookingsApi.listBookingsApiV1DriverBookingsGet(
          undefined,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setBookings(data as Booking[]);
      } catch {
        // ignore
      }
    })();
  }, [token]);

  useEffect(() => {
    const t = token;
    if (!t) return;
    const wsBase = (CONFIG.API_BASE_URL || window.location.origin).replace(
      'http',
      'ws',
    );
    const ids = new Set(bookings.map((b) => b.id));
    Object.entries(socketsRef.current).forEach(([id, ws]) => {
      if (!ids.has(id)) {
        ws.close();
        delete socketsRef.current[id];
      }
    });
    bookings.forEach((b) => {
      if (socketsRef.current[b.id]) return;
      const ws = new WebSocket(
        `${wsBase}/ws/bookings/${b.id}?token=${t}`,
      );
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as Partial<Booking> & { id: string };
          setBookings((prev) =>
            prev.map((item) =>
              item.id === data.id ? { ...item, ...data } : item,
            ),
          );
        } catch {
          // ignore
        }
      };
      socketsRef.current[b.id] = ws;
    });
  }, [bookings, token]);

  useEffect(() => () => {
    Object.values(socketsRef.current).forEach((ws) => ws.close());
  }, []);

  async function updateBooking(id: string, action: DriverAction) {
    const res = await apiFetch(
      `${CONFIG.API_BASE_URL}/api/v1/driver/bookings/${id}/${action}`,
      { method: 'POST' },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `${res.status} ${data.message ?? data.detail ?? res.statusText}`,
      );
    }
    setBookings((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: data.status,
              final_price_cents:
                data.final_price_cents ?? item.final_price_cents,
            }
          : item,
      ),
    );
  }

  return (
    <BookingsContext.Provider value={{ bookings, updateBooking }}>
      {children}
    </BookingsContext.Provider>
  );
}

export default BookingsProvider;

