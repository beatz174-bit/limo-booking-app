// Hook to fetch distance and duration between two addresses.
import { CONFIG } from "@/config";
import { useCallback } from "react";
import * as logger from "@/lib/logger";
import { apiFetch } from "@/services/apiFetch";

export function useRouteMetrics() {
  return useCallback(
    async function getMetrics(
      pickupLat: number,
      pickupLon: number,
      dropoffLat: number,
      dropoffLon: number,
      rideTime?: string
    ): Promise<{ km: number; min: number } | null> {
      if (
        pickupLat === undefined ||
        pickupLon === undefined ||
        dropoffLat === undefined ||
        dropoffLon === undefined
      )
        return null;
      try {
        const base = CONFIG.API_BASE_URL || '';
        const origin = base || window.location.origin;
        const url = new URL('/route-metrics', origin);
        const params = new URLSearchParams({
          pickupLat: String(pickupLat),
          pickupLon: String(pickupLon),
          dropoffLat: String(dropoffLat),
          dropoffLon: String(dropoffLon),
        });
        if (rideTime) params.set('ride_time', rideTime);
        url.search = params.toString();
        const res = await apiFetch(url.toString());
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
