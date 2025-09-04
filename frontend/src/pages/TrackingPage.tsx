import { useEffect, useMemo, useRef, useState } from 'react';
import type { LatLngLiteral } from 'google.maps';
import { useParams } from 'react-router-dom';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { CONFIG } from '@/config';
import { apiFetch } from '@/services/apiFetch';
import { useBookingChannel } from '@/hooks/useBookingChannel';
import StatusTimeline, { type StatusStep } from '@/components/StatusTimeline';
import { calculateDistance } from '@/lib/calculateDistance';
import type { BookingStatus } from '@/types/BookingStatus';
import pickupIcon from '@/assets/pickup-marker-green.svg';
import dropoffIcon from '@/assets/dropoff-marker-red.svg';

type GoogleLike = {
  maps: {
    DirectionsService: new () => {
      route: (req: {
        origin: unknown;
        destination: unknown;
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
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
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

const DRIVER_ARROW_PATH =
  'M16 0a16 16 0 1 0 0 32a16 16 0 1 0 0-32m0 6l6 8h-4v12h-4V14h-4z';

export default function TrackingPage() {
  const { code } = useParams();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [eta, setEta] = useState<number | null>(null);
  const [pickupCoords, setPickupCoords] = useState<LatLngLiteral | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<LatLngLiteral | null>(null);
  const [nextStop, setNextStop] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [route, setRoute] = useState<google.maps.DirectionsResult | null>(null);
  const update = useBookingChannel(bookingId);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(14);
  const [center, setCenter] = useState<LatLngLiteral>();
  const prevPos = useRef<LatLngLiteral | null>(null);
  const [heading, setHeading] = useState(0);
  const prevDest = useRef<LatLngLiteral | null>(null);

  const isDropoff = useMemo(
    () =>
      ['ARRIVED_PICKUP', 'IN_PROGRESS', 'ARRIVED_DROPOFF', 'COMPLETED'].includes(
        (update?.status ?? status) as BookingStatus,
      ),
    [update?.status, status],
  );

  useEffect(() => {
    (async () => {
      const res = await apiFetch(
        `${CONFIG.API_BASE_URL}/api/v1/track/${code}`
      );
      if (res.ok) {
        const data: TrackResponse = await res.json();
        setBookingId(data.booking.id);
        setStatus(data.booking.status);
        setPickupCoords({
          lat: data.booking.pickup_lat,
          lng: data.booking.pickup_lng,
        });
        setDropoffCoords({
          lat: data.booking.dropoff_lat,
          lng: data.booking.dropoff_lng,
        });
      }
    })();
  }, [code]);

  useEffect(() => {
    if (update?.status) setStatus(update.status as BookingStatus);
  }, [update]);

  useEffect(() => {
    async function calcEta() {
      if (!update || !pickupCoords || !dropoffCoords) return;
      const g = (window as { google?: GoogleLike }).google;
      if (!g?.maps) return;
      const svc = new g.maps.DirectionsService();
      const effectiveStatus = (update?.status ?? status) as BookingStatus;
      const goingToDropoff = [
        'ARRIVED_PICKUP',
        'IN_PROGRESS',
        'ARRIVED_DROPOFF',
        'COMPLETED',
      ].includes(effectiveStatus);
      const destCoords = goingToDropoff ? dropoffCoords : pickupCoords;
      if (
        !prevDest.current ||
        prevDest.current.lat !== destCoords.lat ||
        prevDest.current.lng !== destCoords.lng
      ) {
        setRoute(null);
        prevDest.current = destCoords;
      }
      setNextStop(destCoords);
      try {
        const res = await svc.route({
          origin: new g.maps.LatLng(update.lat, update.lng),
          destination: new g.maps.LatLng(destCoords.lat, destCoords.lng),
          travelMode: g.maps.TravelMode.DRIVING,
        });
        setRoute(res as unknown as google.maps.DirectionsResult);
        const leg = res.routes[0].legs[0];
        const sec = leg.duration.value;
        setEta(Math.round(sec / 60));
      } catch {
        setEta(null);
        setRoute(null);
      }
    }
    void calcEta();
  }, [update, update?.status, status, pickupCoords, dropoffCoords]);

  const pos = useMemo(
    () => (update ? { lat: update.lat, lng: update.lng } : null),
    [update],
  );

  useEffect(() => {
    if (!pos) return;
    if (prevPos.current) {
      const dx = pos.lng - prevPos.current.lng;
      const dy = pos.lat - prevPos.current.lat;
      if (dx !== 0 || dy !== 0) {
        const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
        setHeading(angle);
      }
    }
    prevPos.current = pos;
  }, [pos]);

  useEffect(() => {
    if (!pos) return;
    if (!nextStop) {
      setCenter(pos);
      setZoom(14);
      return;
    }
    const g = (window as { google?: typeof google }).google;
    if (!g?.maps) return;
    const distance = calculateDistance(pos, nextStop, g);
    const km = distance / 1000;
    const newZoom = km > 5 ? 12 : km > 1 ? 14 : 16;
    setZoom(newZoom);
    setCenter({
      lat: (pos.lat + nextStop.lat) / 2,
      lng: (pos.lng + nextStop.lng) / 2,
    });
  }, [pos, nextStop]);

  useEffect(() => {
    if (!mapRef.current || !pos || !nextStop) return;
    const g = (window as { google?: typeof google }).google;
    if (!g?.maps) return;
    const bounds = new g.maps.LatLngBounds();
    bounds.extend(pos);
    bounds.extend(nextStop);
    mapRef.current.fitBounds(bounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextStop]);
  return (
    <div>
      {pos ? (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: 300 }}
          center={center}
          zoom={zoom}
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
          <Marker
            position={pos}
            icon={{
              path: DRIVER_ARROW_PATH,
              fillColor: '#333',
              fillOpacity: 1,
              strokeColor: '#333',
              strokeWeight: 2,
              rotation: heading,
              scale: 0.3,
              anchor: { x: 16, y: 16 } as google.maps.Point,
            }}
          />
          {nextStop && (
            <Marker
              position={nextStop}
              icon={isDropoff ? dropoffIcon : pickupIcon}
              data-testid={isDropoff ? 'dropoff-marker' : 'pickup-marker'}
            />
          )}
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
