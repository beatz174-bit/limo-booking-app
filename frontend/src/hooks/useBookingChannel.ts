import { useEffect, useState } from 'react';

export interface LocationUpdate {
  lat: number;
  lng: number;
  speed?: number;
  ts: number;
}

export function useBookingChannel(bookingId: string | null) {
  const [update, setUpdate] = useState<LocationUpdate | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    const wsUrl = `${import.meta.env.VITE_BACKEND_URL.replace('http', 'ws')}/ws/bookings/${bookingId}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
      try {
        setUpdate(JSON.parse(e.data));
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [bookingId]);

  return update;
}
