/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';
import { useBookingChannel } from '@/hooks/useBookingChannel';
import StatusTimeline, { type StatusStep } from '@/components/StatusTimeline';
import { calculateDistance } from '@/lib/calculateDistance';
import type { BookingStatus } from '@/types/BookingStatus';
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
    status: BookingStatus;
  };
  ws_url: string;
}

const STATUS_STEPS: StatusStep[] = [
  { key: 'DRIVER_CONFIRMED', label: 'Confirmed' },
  { key: 'ON_THE_WAY', label: 'En route to pickup' },
  { key: 'ARRIVED_PICKUP', label: 'Arrived pickup' },
  { key: 'IN_PROGRESS', label: 'Trip started' },
  { key: 'ARRIVED_DROPOFF', label: 'Arrived dropoff' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function TrackingPage() {
  const { code } = useParams();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [eta, setEta] = useState<number | null>(null);
  const [nextStop, setNextStop] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [route, setRoute] = useState<google.maps.DirectionsResult | null>(null);
  const update = useBookingChannel(bookingId);
  const mapRef = useRef<google.maps.Map | null>(null);

  const isDropoff = useMemo(
    () =>
      ['ARRIVED_PICKUP', 'IN_PROGRESS', 'ARRIVED_DROPOFF', 'COMPLETED'].includes(
        status as BookingStatus,
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
    if (update?.status) setStatus(update.status as BookingStatus);
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

  const center = useMemo(
    () =>
      pos && nextStop
        ? { lat: (pos.lat + nextStop.lat) / 2, lng: (pos.lng + nextStop.lng) / 2 }
        : pos,
    [pos, nextStop],
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

    const mid = {
      lat: (pos.lat + nextStop.lat) / 2,
      lng: (pos.lng + nextStop.lng) / 2,
    };
    mapRef.current.setCenter(mid);
  }, [pos, nextStop, isDropoff]);
  return (
    <div>
      {pos ? (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: 300 }}
          center={center ?? undefined}
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
          <Marker position={pos} icon={carIcon} />
          {nextStop &&
            (isDropoff ? (
              <>
                <Marker
                  position={nextStop}
                  icon={dropoffIcon}
                  data-testid="dropoff-marker"
                />
                <div data-testid="marker" data-icon={dropoffIcon} />
              </>
            ) : (
              <Marker
                position={nextStop}
                icon={pickupIcon}
                data-testid="pickup-marker"
              />
            ))}
          {route && (
            <DirectionsRenderer
              directions={route}
              options={{ suppressMarkers: true }}
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
