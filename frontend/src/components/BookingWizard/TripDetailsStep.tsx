import { useState } from 'react';
import { Stack, TextField, Button } from '@mui/material';
import { AddressField } from '@/components/AddressField';
import { CONFIG } from '@/config';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';
import * as logger from '@/lib/logger';

interface Location {
  address: string;
  lat: number;
  lng: number;
}

interface FormData {
  pickup?: Location;
  dropoff?: Location;
  passengers?: number;
  notes?: string;
}

interface Props {
  data: FormData;
  onNext: (data: FormData) => void;
  onBack: () => void;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  logger.debug('components/BookingWizard/TripDetailsStep', 'geocodeAddress input', address);
  if (!address) return null;
  try {
    const backend = CONFIG.API_BASE_URL as string | undefined;
    let url: string;
    if (backend) {
      const u = new URL('/geocode/search', backend || window.location.origin);
      u.searchParams.set('q', address);
      url = u.toString();
    } else {
      url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        address,
      )}`;
    }
    logger.debug('components/BookingWizard/TripDetailsStep', 'geocodeAddress url', url);
    const res = await fetch(url);
    if (!res.ok) {
      logger.error(
        'components/BookingWizard/TripDetailsStep',
        'geocodeAddress non-200 response',
        res.status,
      );
      return null;
    }
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : data?.results?.[0];
    if (!first) return null;
    const lat = Number(first.lat || first.latitude);
    const lng = Number(first.lon || first.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    logger.debug('components/BookingWizard/TripDetailsStep', 'geocodeAddress coords', {
      lat,
      lng,
    });
    return { lat, lng };
  } catch (err) {
    logger.error('components/BookingWizard/TripDetailsStep', 'geocodeAddress error', err);
    return null;
  }
}

export default function TripDetailsStep({ data, onNext, onBack }: Props) {
  const [pickup, setPickup] = useState(data.pickup?.address || '');
  const [pickupLat, setPickupLat] = useState<number>(data.pickup?.lat ?? 0);
  const [pickupLng, setPickupLng] = useState<number>(data.pickup?.lng ?? 0);
  const [dropoff, setDropoff] = useState(data.dropoff?.address || '');
  const [dropLat, setDropLat] = useState<number>(data.dropoff?.lat ?? 0);
  const [dropLng, setDropLng] = useState<number>(data.dropoff?.lng ?? 0);
  const [passengers, setPassengers] = useState<number>(data.passengers ?? 1);
  const [notes, setNotes] = useState(data.notes || '');

  const pickupAuto = useAddressAutocomplete(pickup);
  const dropoffAuto = useAddressAutocomplete(dropoff);

  return (
    <Stack spacing={2}>
      <AddressField
        id="pickup"
        label="Pickup address"
        value={pickup}
        onChange={setPickup}
        onBlur={(v) => {
          void geocodeAddress(v).then((coords) => {
            if (coords) {
              setPickupLat(coords.lat);
              setPickupLng(coords.lng);
            }
          });
        }}
        suggestions={pickupAuto.suggestions}
        loading={pickupAuto.loading}
      />
      <AddressField
        id="dropoff"
        label="Dropoff address"
        value={dropoff}
        onChange={setDropoff}
        onBlur={(v) => {
          void geocodeAddress(v).then((coords) => {
            if (coords) {
              setDropLat(coords.lat);
              setDropLng(coords.lng);
            }
          });
        }}
        suggestions={dropoffAuto.suggestions}
        loading={dropoffAuto.loading}
      />
      <TextField label="Passengers" type="number" value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} />
      <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Stack direction="row" spacing={1}>
        <Button onClick={onBack}>Back</Button>
        <Button
          variant="contained"
          onClick={() =>
            onNext({
              pickup: { address: pickup, lat: pickupLat, lng: pickupLng },
              dropoff: { address: dropoff, lat: dropLat, lng: dropLng },
              passengers,
              notes,
            })
          }
        >
          Next
        </Button>
      </Stack>
    </Stack>
  );
}
