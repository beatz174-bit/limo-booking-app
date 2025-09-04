import { useEffect, useRef, useState } from 'react';
import type { BookingRead as Booking } from '@/api-client';
import { getAccessToken, onTokenChange } from '@/services/tokenStore';
import type { BookingStatus } from '@/types/BookingStatus';

const ACTIVE_STATUSES: BookingStatus[] = ['ON_THE_WAY', 'IN_PROGRESS'];

type Watchers = Record<string, { watchId: number; ws: WebSocket }>;

export function useDriverTracking(bookings: Booking[]) {
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const watchersRef = useRef<Watchers>({});

  useEffect(() => {
    const unsubscribe = onTokenChange(() => {
      setToken(getAccessToken());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const watchers = watchersRef.current;
    if (!token) {
      Object.values(watchers).forEach(({ watchId, ws }) => {
        navigator.geolocation.clearWatch(watchId);
        ws.close();
      });
      watchersRef.current = {};
      return;
    }

    const isActive = (status: BookingStatus) =>
      ACTIVE_STATUSES.includes(status);

    bookings.forEach((b) => {
      const active = isActive(b.status as BookingStatus);
      const existing = watchers[b.id];
      if (active && !existing) {
        const wsUrl = `${import.meta.env.VITE_BACKEND_URL.replace(
          'http',
          'ws',
        )}/ws/bookings/${b.id}?token=${token}`;
        const ws = new WebSocket(wsUrl);
        let opened = false;
        ws.onopen = () => {
          opened = true;
        };
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const payload = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              ts: pos.timestamp,
              speed: pos.coords.speed ?? undefined,
            };
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(payload));
            }
          },
          undefined,
          { enableHighAccuracy: true },
        );

        const handleEarlyTermination = (ev: Event) => {
          if (!opened) {
            navigator.geolocation.clearWatch(watchId);
            if (watchersRef.current[b.id]?.watchId === watchId) {
              delete watchersRef.current[b.id];
            }
            console.warn(
              `driver tracking socket ${ev.type} before open for booking ${b.id}`,
            );
          }
        };
        ws.onerror = handleEarlyTermination;
        ws.onclose = handleEarlyTermination;

        watchers[b.id] = { watchId, ws };
      } else if (!active && existing) {
        navigator.geolocation.clearWatch(existing.watchId);
        existing.ws.close();
        delete watchers[b.id];
      }
    });

    Object.keys(watchers).forEach((id) => {
      if (!bookings.some((b) => b.id === id && isActive(b.status as BookingStatus))) {
        const { watchId, ws } = watchers[id];
        navigator.geolocation.clearWatch(watchId);
        ws.close();
        delete watchers[id];
      }
    });

    return () => {
      Object.values(watchersRef.current).forEach(({ watchId, ws }) => {
        navigator.geolocation.clearWatch(watchId);
        ws.close();
      });
      watchersRef.current = {};
    };
  }, [bookings, token]);
}

export default useDriverTracking;

