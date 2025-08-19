// Hook to fetch distance and duration between two addresses.
import { CONFIG } from "@/config";
import { useCallback } from "react";

export function useRouteMetrics() {
  return async function getMetrics(
    pickup: string,
    dropoff: string
  ): Promise<{ km: number; min: number } | null> {
    if (!pickup || !dropoff) return null;
    try {
      const base = CONFIG.API_BASE_URL || "";
      const origin = base || window.location.origin;
      const url = new URL("/route-metrics", origin);
      url.search = `pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}`;
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.error("Route metrics request failed", res.status);
        return null;
      }
      const data = await res.json();
      const km = Number(data?.km);
      const min = Number(data?.min);
      if (!Number.isFinite(km) || !Number.isFinite(min)) return null;
      return { km, min };
    } catch (err) {
      console.error(err);
      return null;
    }
  };
}
