// Hook to fetch distance and duration between two addresses.
import { CONFIG } from "@/config";
import { useCallback } from "react";
import * as logger from "@/lib/logger";

export function useRouteMetrics() {
  return useCallback(
    async function getMetrics(
      pickup: { lat: number; lon: number },
      dropoff: { lat: number; lon: number },
      rideTime?: string
    ): Promise<{ km: number; min: number } | null> {
      if (!pickup || !dropoff) return null;
      try {
        const base = CONFIG.API_BASE_URL || '';
        const origin = base || window.location.origin;
        const url = new URL('/route-metrics', origin);
        const params = new URLSearchParams({
          pickup: `${pickup.lat},${pickup.lon}`,
          dropoff: `${dropoff.lat},${dropoff.lon}`,
        });
        if (rideTime) params.set('ride_time', rideTime);
        url.search = params.toString();
        const res = await fetch(url.toString());
        if (!res.ok) {
          logger.error(
            'hooks/useRouteMetrics',
            'Route metrics request failed',
            res.status,
          );
          return null;
        }
        const data = await res.json();
        const km = Number(data?.km);
        const min = Number(data?.min);
        if (!Number.isFinite(km) || !Number.isFinite(min)) return null;
        return { km, min };
      } catch (err) {
        logger.error('hooks/useRouteMetrics', err);
        return null;
      }
    },
    []
  );
}
