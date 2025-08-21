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

export function useDirections({
  pickup,
  dropoff,
  rideTime,
  flagfall,
  perKm,
  perMin,
}: Args) {
  const getMetrics = useRouteMetrics();
  const [distanceKm, setDistanceKm] = useState<number | undefined>();
  const [durationMin, setDurationMin] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchMetrics() {
      if (!pickup || !dropoff) {
        setDistanceKm(undefined);
        setDurationMin(undefined);
        return;
      }
      setLoading(true);
      const res = await getMetrics(pickup, dropoff, rideTime);
      if (!cancelled) {
        setDistanceKm(res?.km);
        setDurationMin(res?.min);
        setLoading(false);
      }
    }
    void fetchMetrics();
    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, rideTime, getMetrics]);

  const { price } = usePriceCalculator({
    pickup,
    dropoff,
    rideTime,
    flagfall,
    perKm,
    perMin,
    distanceKm,
    durationMin,
    auto: true,
  });

  return { distanceKm, durationMin, price, loading } as const;
}

export default useDirections;
