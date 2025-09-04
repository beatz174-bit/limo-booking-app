import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  driverBookingsApi,
  customerBookingsApi,
} from '@/components/ApiConfig';
import type { BookingRead as Booking } from '@/api-client';
import { apiFetch } from '@/services/apiFetch';
import { CONFIG } from '@/config';
import { useAuth } from '@/contexts/AuthContext';

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
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateBooking: (id: string, action: DriverAction) => Promise<void>;
  addBooking: (booking: Booking) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const BookingsContext =
  createContext<BookingsContextValue | undefined>(undefined);

export function BookingsProvider({ children }: { children: ReactNode }) {
  const { accessToken, userID, adminID } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketsRef = useRef<Record<string, WebSocket>>({});

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setBookings([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiCall =
        userID === adminID
          ? driverBookingsApi.listBookingsApiV1DriverBookingsGet.bind(
              driverBookingsApi,
            )
          : customerBookingsApi.listMyBookingsApiV1CustomersMeBookingsGet.bind(
              customerBookingsApi,
            );
      const { data } = await apiCall();
      setBookings(data as Booking[]);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to load bookings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, userID, adminID]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addBooking = useCallback((booking: Booking) => {
    setBookings((prev) => {
      if (prev.some((b) => b.id === booking.id)) return prev;
      return [...prev, booking];
    });
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

  useEffect(() => {
    const t = accessToken;
    const wsBase = (CONFIG.API_BASE_URL || window.location.origin).replace(
      'http',
      'ws',
    );
    const sockets = socketsRef.current;
    if (!t) {
      Object.values(sockets).forEach((ws) => ws.close());
      socketsRef.current = {};
      return;
    }
    const ids = new Set(bookings.map((b) => b.id));
    Object.entries(sockets).forEach(([id, ws]) => {
      if (!ids.has(id)) {
        ws.close();
        delete sockets[id];
      }
    });
    bookings.forEach((b) => {
      if (sockets[b.id]) return;
      const ws = new WebSocket(
        `${wsBase}/ws/bookings/${b.id}/watch?token=${t}`,
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
          /* ignore */
        }
      };
      sockets[b.id] = ws;
    });
  }, [bookings, accessToken]);

  useEffect(
    () => () => {
      Object.values(socketsRef.current).forEach((ws) => ws.close());
    },
    [],
  );

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const msg = event.data as {
        type?: string;
        notification?: { type?: string };
        data?: { type?: string };
      };
      const type = msg?.type || msg?.notification?.type || msg?.data?.type;
      if (type === 'NEW_BOOKING') {
        refresh();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () =>
      navigator.serviceWorker.removeEventListener('message', handler);
  }, [refresh]);

  return (
    <BookingsContext.Provider
      value={{ bookings, loading, error, refresh, updateBooking, addBooking }}
    >
      {children}
    </BookingsContext.Provider>
  );
}

export default BookingsProvider;

