// src/hooks/useRouteMetrics.ts
// Placeholder example for future Distance Matrix integration.
export function useRouteMetrics() {
  // expose a function to compute (distanceKm, durationMin) given addresses.
  return async function getMetrics(pickup: string, dropoff: string): Promise<{ km: number; min: number } | null> {
    // TODO: Implement using Google Distance Matrix via your backend proxy.
    return null;
  };
}