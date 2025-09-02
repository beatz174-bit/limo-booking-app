// Renders a Google Map showing the route between pickup and dropoff.
import { useEffect } from 'react';
import { GoogleMap, DirectionsRenderer } from '@react-google-maps/api';
import { useRoute } from '@/hooks/useRoute';
import { useRouteMetrics } from '@/hooks/useRouteMetrics';

export type Location = {
  address: string;
  lat: number;
  lng: number;
};

export type Props = {
  pickup?: Location;
  dropoff?: Location;
  rideTime?: string;
  onMetrics?: (km: number, minutes: number) => void;
};

function Placeholder({ text = 'map unavailable' }: { text?: string }) {
  return (
    <div
      id="map"
      style={{
        width: '100%',
        height: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#eee',
      }}
    >
      {text}
    </div>
  );
}


export function MapRoute({ pickup, dropoff, rideTime, onMetrics }: Props) {
  const { valid, directions } = useRoute(
    pickup?.address || '',
    dropoff?.address || '',
    Boolean(pickup?.lat && dropoff?.lat),
  );
  const getMetrics = useRouteMetrics();

  useEffect(() => {
    let cancelled = false;
    async function compute() {
      if (!pickup || !dropoff || !onMetrics) return;
      const rideTimeIso = rideTime ? new Date(rideTime).toISOString() : undefined;
      const res = await getMetrics(
        { lat: pickup.lat, lon: pickup.lng },
        { lat: dropoff.lat, lon: dropoff.lng },
        rideTimeIso,
      );
      if (!cancelled && res) onMetrics(res.km, res.min);
    }
    void compute();
    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, rideTime, onMetrics, getMetrics]);

  // if (loadError) return <Placeholder />;
  // if (!isLoaded) return <Placeholder text="loading..." />;
  if (!valid || !directions) return <Placeholder />;

  return (
    <GoogleMap mapContainerStyle={{ width: '100%', height: 300 }}>
      <DirectionsRenderer directions={directions} />
    </GoogleMap>
  );
}

export default MapRoute;
