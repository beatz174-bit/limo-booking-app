import { useState } from 'react';
import { Stack, TextField, Button } from '@mui/material';
import { AddressField } from '@/components/AddressField';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';

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
  onChange: (data: Partial<FormData>) => void;
}

export default function TripDetailsStep({ data, onNext, onBack, onChange }: Props) {
  const [pickup, setPickup] = useState(data.pickup?.address || '');
  const [pickupLat, setPickupLat] = useState<number>(data.pickup?.lat ?? 0);
  const [pickupLng, setPickupLng] = useState<number>(data.pickup?.lng ?? 0);
  const [dropoff, setDropoff] = useState(data.dropoff?.address || '');
  const [dropLat, setDropLat] = useState<number>(data.dropoff?.lat ?? 0);
  const [dropLng, setDropLng] = useState<number>(data.dropoff?.lng ?? 0);
  const [dropSelected, setDropSelected] = useState<boolean>(!!data.dropoff);
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
        onChange={(val) => {
          setPickup(val);
          onChange({ pickup: { address: val, lat: pickupLat, lng: pickupLng } });
        }}
        onSelect={(s) => {
          setPickup(s.address);
          setPickupLat(s.lat);
          setPickupLng(s.lng);
          onChange({ pickup: { address: s.address, lat: s.lat, lng: s.lng } });
        }}
        suggestions={pickupAuto.suggestions}
        loading={pickupAuto.loading}
      />
      <AddressField
        id="dropoff"
        label="Dropoff address"
        value={dropoff}
        onChange={(val) => {
          setDropoff(val);
          if (dropSelected) {
            setDropSelected(false);
            setDropLat(0);
            setDropLng(0);
            onChange({ dropoff: undefined });
          }
        }}
        onSelect={(s) => {
          setDropoff(s.address);
          setDropLat(s.lat);
          setDropLng(s.lng);
          setDropSelected(true);
          onChange({ dropoff: { address: s.address, lat: s.lat, lng: s.lng } });
        }}
        suggestions={dropoffAuto.suggestions}
        loading={dropoffAuto.loading}
      />
      <TextField
        label="Passengers"
        type="number"
        value={passengers}
        onChange={(e) => {
          const val = Number(e.target.value);
          setPassengers(val);
          onChange({ passengers: val });
        }}
      />
      <TextField
        label="Notes"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          onChange({ notes: e.target.value });
        }}
      />
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
