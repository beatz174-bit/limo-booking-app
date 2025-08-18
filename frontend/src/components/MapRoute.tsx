// src/pages/Booking/components/MapRoute.tsx
import { useEffect } from "react";
import { useRouteMetrics } from "@/hooks/useRouteMetrics";

type Props = {
  pickup: string;
  dropoff: string;
  onMetrics?: (km: number, minutes: number) => void;
};

export function MapRoute({ pickup, dropoff, onMetrics }: Props) {
  const getMetrics = useRouteMetrics();

  useEffect(() => {
    let cancelled = false;
    async function compute() {
      if (!pickup || !dropoff) return;
      const res = await getMetrics(pickup, dropoff);
      if (!cancelled && res && onMetrics) onMetrics(res.km, res.min);
    }
    void compute();
    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, onMetrics, getMetrics]);

  return <div id="map" />;
}
