/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';
import { useBookingChannel } from '@/hooks/useBookingChannel';
import StatusTimeline, { type StatusStep } from '@/components/StatusTimeline';
import { calculateDistance } from '@/lib/calculateDistance';
import carIcon from '@/assets/car-marker.svg';

const pickupIcon = '/assets/pickup-marker-green.svg';
const dropoffIcon = '/assets/dropoff-marker-red.svg';

type GoogleLike = {
  maps: {
    DirectionsService: new () => {
      route: (req: {
        origin: unknown;
        destination: string;
        travelMode: string;
      }) => Promise<{
        routes: {
          legs: {
            duration: { value: number };
            end_location: { toJSON: () => { lat: number; lng: number } };
          }[];
        }[];
      }>;
    };
    LatLng: new (lat: number, lng: number) => unknown;
    LatLngBounds: new () => {
      extend: (pos: { lat: number; lng: number }) => void;
    };
    TravelMode: { DRIVING: string };
  };
};

interface TrackResponse {
  booking: {
    id: string;
    pickup_address: string;
    dropoff_address: string;
    status: string;
  };
  ws_url: string;
}

const STATUS_STEPS: StatusStep[] = [
  { key: 'confirm', label: 'Confirmed' },
  { key: 'leave', label: 'En route to pickup' },
  { key: 'arrive-pickup', label: 'Arrived pickup' },
  { key: 'start-trip', label: 'Trip started' },
  { key: 'arrive-dropoff', label: 'Arrived dropoff' },
  { key: 'complete', label: 'Completed' },
];

export default function TrackingPage() {
  const { code } = useParams();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [status, setStatus] = useState('');
  const [eta, setEta] = useState<number | null>(null);
  const [nextStop, setNextStop] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [route, setRoute] = useState<google.maps.DirectionsResult | null>(null);
  const update = useBookingChannel(bookingId);
  const mapRef = useRef<google.maps.Map | null>(null);

  const isDropoff = useMemo(
    () =>
      ['arrive-pickup', 'start-trip', 'arrive-dropoff', 'complete'].includes(
        status,
      ),
    [status],
  );

  useEffect(() => {
    (async () => {
      const res = await apiFetch(
        `${CONFIG.API_BASE_URL}/api/v1/track/${code}`
      );
      if (res.ok) {
        const data: TrackResponse = await res.json();
        setBookingId(data.booking.id);
        setPickup(data.booking.pickup_address);
        setDropoff(data.booking.dropoff_address);
        setStatus(data.booking.status);
      }
    })();
  }, [code]);

  useEffect(() => {
    if (update?.status) setStatus(update.status);
  }, [update?.status]);

  useEffect(() => {
    async function calcEta() {
      if (!update || !pickup || !dropoff) return;
      const g = (window as { google?: GoogleLike }).google;
      if (!g?.maps) return;
      const svc = new g.maps.DirectionsService();
      const dest = isDropoff ? dropoff : pickup;
      try {
        const res = await svc.route({
          origin: new g.maps.LatLng(update.lat, update.lng),
          destination: dest,
          travelMode: g.maps.TravelMode.DRIVING,
        });
        setRoute(res as unknown as google.maps.DirectionsResult);
        const leg = res.routes[0].legs[0];
        const sec = leg.duration.value;
        setEta(Math.round(sec / 60));
        setNextStop(leg.end_location.toJSON());
      } catch {
        setEta(null);
        setNextStop(null);
        setRoute(null);
      }
    }
    void calcEta();
  }, [update, pickup, dropoff, isDropoff]);

  const pos = useMemo(
    () => (update ? { lat: update.lat, lng: update.lng } : null),
    [update],
  );

  useEffect(() => {
    if (!mapRef.current || !pos || !nextStop) return;
    const g = (window as { google?: typeof google }).google;
    if (!g?.maps) return;
    const bounds = new g.maps.LatLngBounds();
    bounds.extend(pos);
    bounds.extend(nextStop);
    mapRef.current.fitBounds(bounds);

    const distance = calculateDistance(pos, nextStop, g);
    const km = distance / 1000;
    const zoom = km > 5 ? 12 : km > 1 ? 14 : 16;
    mapRef.current.setZoom(zoom);
  }, [pos, nextStop, isDropoff]);
    const nextStopIcon = ['ARRIVED_PICKUP', 'IN_PROGRESS', 'ARRIVED_DROPOFF', 'COMPLETED'].includes(
      status as BookingStatus,
  return (
    <div>
      {pos ? (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: 300 }}
          center={pos}
          zoom={14}
          onLoad={(m) => {
            mapRef.current = m;
          }}
          options={{
            disableDefaultUI: true,
            draggable: false,
            keyboardShortcuts: false,
            scrollwheel: false,
            disableDoubleClickZoom: true,
            gestureHandling: 'none',
          }}
        >
          <Marker position={pos} />
          {route && <DirectionsRenderer directions={route} />}
          {nextStop && (
            <Marker
              position={nextStop}
              icon={nextStopIcon}
              data-testid={nextStopTestId}
            />
          )}
        </GoogleMap>
      ) : (
        <p>Waiting for driver...</p>
      )}
      {eta !== null && <p>ETA: {eta} min</p>}
      <StatusTimeline steps={STATUS_STEPS} currentKey={status} />
    </div>
  );
}
