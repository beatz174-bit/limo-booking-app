import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CONFIG } from '@/config';
import { useBookingChannel } from '@/hooks/useBookingChannel';

interface TrackResponse {
  booking: { id: string; pickup_address: string; dropoff_address: string; status: string };
  ws_url: string;
}

export default function TrackingPage() {
  const { code } = useParams();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const update = useBookingChannel(bookingId);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/v1/track/${code}`);
      if (res.ok) {
        const data: TrackResponse = await res.json();
        setBookingId(data.booking.id);
      }
    })();
  }, [code]);

  return (
    <div>
      {update ? (
        <p>Driver at {update.lat.toFixed(5)}, {update.lng.toFixed(5)}</p>
      ) : (
        <p>Waiting for driver...</p>
      )}
    </div>
  );
}
