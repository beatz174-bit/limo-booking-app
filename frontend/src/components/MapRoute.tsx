// src/pages/Booking/components/MapRoute.tsx
import { useEffect, useRef, useState } from "react";
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
  const [failed, setFailed] = useState(false);

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
    if (!pickup || !dropoff || !apiKey) return;
    const container = mapRef.current;
    if (!(container instanceof HTMLElement)) return;
    let cancelled = false;

    function loadScript(): Promise<typeof google | undefined> {
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
      .then((g) => {
        if (cancelled || !g?.maps) {
          setFailed(true);
          return;
        }
        const map = new g.maps.Map(container, {
          zoom: 7,
          center: { lat: 0, lng: 0 },
        });
        const service = new g.maps.DirectionsService();
        const renderer = new g.maps.DirectionsRenderer();
        renderer.setMap(map);
        service
          .route({
            origin: pickup,
            destination: dropoff,
            travelMode: g.maps.TravelMode.DRIVING,
          })
          .then((result) => {
            if (!cancelled) renderer.setDirections(result);
          })
          .catch((err) => console.error(err));
      })
      .catch((err) => {
        console.error(err);
        setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, apiKey]);

  if (failed) {
    return (
      <div id="map" style={{ width: "100%", height: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "#eee" }}>
        Map unavailable
      </div>
    );
  }
  return <div id="map" ref={mapRef} style={{ width: "100%", height: 300 }} />;
}
