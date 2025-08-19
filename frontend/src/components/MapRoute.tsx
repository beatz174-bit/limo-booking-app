// src/pages/Booking/components/MapRoute.tsx
import { useEffect, useRef } from "react";
import { useRouteMetrics } from "@/hooks/useRouteMetrics";

// Google Maps JavaScript API exposes a global `google` object
declare const google: any;

type Props = {
  pickup: string;
  dropoff: string;
  apiKey?: string;
  onMetrics?: (km: number, minutes: number) => void;
};

export function MapRoute({ pickup, dropoff, apiKey, onMetrics }: Props) {
  const getMetrics = useRouteMetrics();
  const mapRef = useRef<HTMLDivElement>(null);

  // Compute distance & duration via backend proxy (Distance Matrix)
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

  // Load Google Maps script & render route using Directions API
  useEffect(() => {
    if (!pickup || !dropoff || !apiKey || !mapRef.current) return;
    let cancelled = false;

    function loadScript(): Promise<typeof google> {
      const w = window as any;
      if (w.google?.maps) return Promise.resolve(w.google);
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.onload = () => resolve(w.google);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    loadScript()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const map = new google.maps.Map(mapRef.current, {
          zoom: 7,
          center: { lat: 0, lng: 0 },
        });
        const service = new google.maps.DirectionsService();
        const renderer = new google.maps.DirectionsRenderer();
        renderer.setMap(map);
        service
          .route({
            origin: pickup,
            destination: dropoff,
            travelMode: google.maps.TravelMode.DRIVING,
          })
          .then((result) => {
            if (!cancelled) renderer.setDirections(result);
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => console.error(err));

    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, apiKey]);

  return <div id="map" ref={mapRef} style={{ width: "100%", height: 300 }} />;
}
