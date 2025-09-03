import { useEffect, useState } from "react";
import { getAccessToken, onTokenChange } from "@/services/tokenStore";
import type { BookingStatus } from "@/types/BookingStatus";

export interface LocationUpdate {
  lat: number;
  lng: number;
  speed?: number;
  ts: number;
  status?: BookingStatus;
}

export function useBookingChannel(bookingId: string | null) {
  const [update, setUpdate] = useState<LocationUpdate | null>(null);
  const [token, setToken] = useState<string | null>(() => getAccessToken());

  useEffect(() => {
    const unsubscribe = onTokenChange(() => {
      setToken(getAccessToken());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!bookingId || !token) return;
    const wsUrl = `${import.meta.env.VITE_BACKEND_URL.replace("http", "ws")}/ws/bookings/${bookingId}/watch?token=${token}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e) => {
      try {
        setUpdate(JSON.parse(e.data));
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [bookingId, token]);

  return update;
}
