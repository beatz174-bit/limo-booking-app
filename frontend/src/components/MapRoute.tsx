// Renders a Google Map showing the route between pickup and dropoff.
import { useEffect } from 'react';
import { GoogleMap, DirectionsRenderer } from '@react-google-maps/api';
import { useRoute } from '@/hooks/useRoute';
import { useRouteMetrics } from '@/hooks/useRouteMetrics';
import { useMap } from './MapProvider';

export type Props = {
  pickup: string;
  dropoff: string;
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

export function MapRoute({ pickup, dropoff, onMetrics }: Props) {
  const { isLoaded, loadError } = useMap();
  const { valid, directions } = useRoute(pickup, dropoff, isLoaded);
  const getMetrics = useRouteMetrics();

  useEffect(() => {
    let cancelled = false;
    async function compute() {
      if (!pickup || !dropoff || !onMetrics) return;
      const res = await getMetrics(pickup, dropoff);
      if (!cancelled && res) onMetrics(res.km, res.min);
    }
    void compute();
    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, onMetrics, getMetrics]);

  if (loadError) return <Placeholder />;
  if (!isLoaded) return <Placeholder text="loading..." />;
  if (!valid || !directions) return <Placeholder />;

  return (
    <GoogleMap mapContainerStyle={{ width: '100%', height: 300 }}>
      <DirectionsRenderer directions={directions} />
    </GoogleMap>
  );
}

export default MapRoute;
