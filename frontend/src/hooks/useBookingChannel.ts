import { useEffect, useState } from "react";
import { getAccessToken, onTokenChange } from "@/services/tokenStore";
import type { BookingStatus } from "@/types/BookingStatus";
import { createReconnectingWebSocket } from "@/lib/reconnectingWebSocket";

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
      return createReconnectingWebSocket(wsUrl, {
        onMessage: (e) => {
          try {
            const data = JSON.parse(e.data);
            if (typeof data.lat === "number" && typeof data.lng === "number") {
              setUpdate(data);
            } else if (typeof data.status === "string") {
              setUpdate((prev) =>
                prev
                  ? { ...prev, status: data.status }
                  : { status: data.status, lat: 0, lng: 0, ts: Date.now() },
              );
            }
          } catch {
            /* ignore */
          }
        },
        onError: () => setUpdate(null),
        onClose: () => setUpdate(null),
      });
    }, [bookingId, token]);

  return update;
}
