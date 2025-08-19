// src/pages/Booking/components/MapRoute.tsx
import { useEffect, useRef, useState } from "react";
import { useRouteMetrics } from "@/hooks/useRouteMetrics";
import { CONFIG } from "@/config";

// Google Maps JavaScript API exposes a global `google` object
declare const google: any;

type Props = {
  pickup: string;
  dropoff: string;
  /**
   * Optional API key to override the default from configuration.
   * Primarily used in tests or when the key is provided dynamically
   * (e.g. fetched from backend settings).
  */
  apiKey?: string;
  onMetrics?: (km: number, minutes: number) => void;
};

export function MapRoute({ pickup, dropoff, onMetrics, apiKey }: Props) {
  const getMetrics = useRouteMetrics();
  const mapRef = useRef<HTMLDivElement>(null);
  const resolvedKey = apiKey ?? CONFIG.GOOGLE_MAPS_API_KEY;
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
    if (!pickup || !dropoff || !resolvedKey || !mapRef.current) return;
    let cancelled = false;

    function loadScript(): Promise<typeof google | undefined> {
      const w = window as any;
      if (w.google?.maps) return Promise.resolve(w.google);
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        w.gm_authFailure = () => reject(new Error("Invalid Google Maps API key"));
        script.src = `https://maps.googleapis.com/maps/api/js?key=${resolvedKey}`;
        script.async = true;
        script.onload = () => (w.google?.maps ? resolve(w.google) : reject(new Error("Google Maps failed to load")));
        script.onerror = () => reject(new Error("Google Maps script error"));
        document.head.appendChild(script);
      });
    }

    loadScript()
      .then((g) => {
        if (cancelled || !mapRef.current) return;
        try {
          const map = new g.maps.Map(mapRef.current, {
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
        } catch (err) {
          console.error(err);
          setFailed(true);
        }
      })
      .catch((err) => {
        console.error(err);
        setFailed(true);
      });

    return () => {
      cancelled = true;
    };

  }, [pickup, dropoff, resolvedKey]);

  if (failed) {
    return (
      <div
        id="map"
        style={{
          width: "100%",
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eee",
        }}
      >
        Map failed to load
      </div>
    );
  }

  return <div id="map" ref={mapRef} style={{ width: "100%", height: 300 }} />;
}
