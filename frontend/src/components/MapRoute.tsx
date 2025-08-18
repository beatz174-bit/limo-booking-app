// src/pages/Booking/components/MapRoute.tsx
import { useEffect } from "react";

type Props = {
  pickup: string;
  dropoff: string;
  onMetrics?: (km: number, minutes: number) => void;
};

export function MapRoute({ pickup, dropoff, onMetrics }: Props) {
  useEffect(() => {
    let cancelled = false;
    async function compute() {
      if (!pickup || !dropoff) return;

      // Use YOUR existing routing method here:
      // const { km, minutes } = await backend.distanceMatrix({ pickup, dropoff });
      // --- OR if you’ve already got it in state from the map SDK, just call onMetrics(...)
      const km = 10/* your computed distance in km */;
      const minutes = 15/* your computed duration in minutes */;

      if (!cancelled && onMetrics) onMetrics(km, minutes);
    }
    void compute();
    return () => { cancelled = true; };
  }, [pickup, dropoff, onMetrics]);

  return <div id="map" />;
}
