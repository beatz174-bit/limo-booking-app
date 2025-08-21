import { useState } from 'react';
import { Stack, TextField, Button } from '@mui/material';

interface Props {
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

export default function TripDetailsStep({ data, onNext, onBack }: Props) {
  const [pickup, setPickup] = useState(data.pickup?.address || '');
  const [pickupLat, setPickupLat] = useState(data.pickup?.lat ?? 0);
  const [pickupLng, setPickupLng] = useState(data.pickup?.lng ?? 0);
  const [dropoff, setDropoff] = useState(data.dropoff?.address || '');
  const [dropLat, setDropLat] = useState(data.dropoff?.lat ?? 0);
  const [dropLng, setDropLng] = useState(data.dropoff?.lng ?? 0);
  const [passengers, setPassengers] = useState(data.passengers ?? 1);
  const [notes, setNotes] = useState(data.notes || '');
  return (
    <Stack spacing={2}>
      <TextField label="Pickup address" value={pickup} onChange={(e) => setPickup(e.target.value)} />
      <TextField label="Pickup lat" type="number" value={pickupLat} onChange={(e) => setPickupLat(Number(e.target.value))} />
      <TextField label="Pickup lng" type="number" value={pickupLng} onChange={(e) => setPickupLng(Number(e.target.value))} />
      <TextField label="Dropoff address" value={dropoff} onChange={(e) => setDropoff(e.target.value)} />
      <TextField label="Dropoff lat" type="number" value={dropLat} onChange={(e) => setDropLat(Number(e.target.value))} />
      <TextField label="Dropoff lng" type="number" value={dropLng} onChange={(e) => setDropLng(Number(e.target.value))} />
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
