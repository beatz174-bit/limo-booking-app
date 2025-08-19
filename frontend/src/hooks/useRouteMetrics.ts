// src/hooks/useRouteMetrics.ts
import { CONFIG } from "@/config";
import { useCallback } from "react";

export function useRouteMetrics() {
  return useCallback(
    async function getMetrics(
      pickup: string,
      dropoff: string
    ): Promise<{ km: number; min: number } | null> {
      if (!pickup || !dropoff) return null;
      try {
        const base = CONFIG.API_BASE_URL || "";
        const url = new URL("/route-metrics", base || window.location.origin);
        url.searchParams.set("pickup", pickup);
        url.searchParams.set("dropoff", dropoff);
        const res = await fetch(url.toString());
        if (!res.ok) return null;
        const data = await res.json();
        const km = Number(data?.km);
        const min = Number(data?.min);
        if (!Number.isFinite(km) || !Number.isFinite(min)) return null;
        return { km, min };
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    []
  );
}
