import { useEffect, useState } from 'react';

interface GMaps {
  maps: {
    DirectionsService: new () => {
      route: (req: { origin: string; destination: string; travelMode: string }) => Promise<unknown>;
    };
    TravelMode: { DRIVING: string };
  };
}

export function useRoute(pickup: string, dropoff: string, enabled = true) {
  const [valid, setValid] = useState(false);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
    if (!enabled) {
      setValid(false);
      return;
    }
    let cancelled = false;
    setDirections(null);
    const g = (window as { google?: GMaps }).google;
    if (!pickup || !dropoff || !g?.maps) {
      setValid(false);
      return;
    }

    const svc = new g.maps.DirectionsService();
    svc
      .route({ origin: pickup, destination: dropoff, travelMode: g.maps.TravelMode.DRIVING })
      .then((res) => {
        if (!cancelled) {
          setValid(true);
          setDirections(res as google.maps.DirectionsResult);
        }
      })
      .catch(() => {
        if (!cancelled) setValid(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, enabled]);

  return { valid, directions };
}

export default useRoute;
