// Hook that fetches route metrics and computes fare estimate.
import { useEffect, useState } from "react";
import { useRouteMetrics } from "./useRouteMetrics";
import { usePriceCalculator } from "./usePriceCalculator";

interface Args {
  pickup: string;
  dropoff: string;
  rideTime: string;
  flagfall: number;
  perKm: number;
  perMin: number;
}

/**
 * Returns a function that retrieves driving directions between two points.
 * Results are memoized in-memory to avoid duplicate calls for the same
 * pickup and dropoff combination.
 */
export function useDirections() {
  const cache = useRef(new Map<string, DirectionsMetrics>());

  return useCallback(
    async (pickup: string, dropoff: string): Promise<DirectionsMetrics | null> => {
      if (!pickup || !dropoff) return null;
      const key = `${pickup}|${dropoff}`;
      const cached = cache.current.get(key);
      if (cached) return cached;

      try {
        const params = new URLSearchParams({
          origin: pickup,
          destination: dropoff,
          mode: "driving",
          key: CONFIG.GOOGLE_MAPS_API_KEY ?? "",
        });
        const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const leg = data?.routes?.[0]?.legs?.[0];
        const dist = leg?.distance?.value; // meters
        const dur = leg?.duration?.value; // seconds
        if (!Number.isFinite(dist) || !Number.isFinite(dur)) return null;
        const metrics = { km: dist / 1000, min: dur / 60 };
        cache.current.set(key, metrics);
        return metrics;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    []
  );
}

export default useDirections;
