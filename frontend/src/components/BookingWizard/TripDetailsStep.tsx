import { useState } from 'react';
import { Stack, TextField, Button } from '@mui/material';
import { AddressField } from '@/components/AddressField';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';
import { BookingFormData } from '@/types/BookingFormData';

interface Props {
  data: BookingFormData;
  onNext: (data: Partial<BookingFormData>) => void;
  onBack: () => void;
  onChange: (data: Partial<BookingFormData>) => void;
}

export default function TripDetailsStep({ data, onNext, onBack, onChange }: Props) {
  const [pickup, setPickup] = useState(data.pickup?.address || '');
  const [pickupLat, setPickupLat] = useState<number>(data.pickup?.lat ?? 0);
  const [pickupLng, setPickupLng] = useState<number>(data.pickup?.lng ?? 0);
  const [pickupValid, setPickupValid] = useState<boolean>(data.pickupValid ?? false);
  const [pickupTouched, setPickupTouched] = useState(false);
  const [dropoff, setDropoff] = useState(data.dropoff?.address || '');
  const [dropLat, setDropLat] = useState<number>(data.dropoff?.lat ?? 0);
  const [dropLng, setDropLng] = useState<number>(data.dropoff?.lng ?? 0);
  const [dropoffValid, setDropoffValid] = useState<boolean>(data.dropoffValid ?? false);
  const [dropoffTouched, setDropoffTouched] = useState(false);
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
          setPickupLat(0);
          setPickupLng(0);
          setPickupValid(false);
          onChange({
            pickup: { address: val, lat: 0, lng: 0 },
            pickupValid: false,
          });
        }}
        onSelect={(s) => {
          setPickup(s.address);
          setPickupLat(s.lat);
          setPickupLng(s.lng);
          setPickupValid(true);
          onChange({
            pickup: { address: s.address, lat: s.lat, lng: s.lng },
            pickupValid: true,
          });
        }}
        onFocus={pickupAuto.onFocus}
        onBlur={() => {
          pickupAuto.onBlur();
          setPickupTouched(true);
        }}
        errorText={!pickupValid && pickupTouched ? 'Select a pickup address' : undefined}
        suggestions={pickupAuto.suggestions}
        loading={pickupAuto.loading}
      />
      <AddressField
        id="dropoff"
        label="Dropoff address"
        value={dropoff}
        onChange={(val) => {
          setDropoff(val);
          setDropLat(0);
          setDropLng(0);
          setDropoffValid(false);
          onChange({
            dropoff: { address: val, lat: 0, lng: 0 },
            dropoffValid: false,
          });
        }}
        onSelect={(s) => {
          setDropoff(s.address);
          setDropLat(s.lat);
          setDropLng(s.lng);
          setDropoffValid(true);
          onChange({
            dropoff: { address: s.address, lat: s.lat, lng: s.lng },
            dropoffValid: true,
          });
        }}
        onFocus={dropoffAuto.onFocus}
        onBlur={() => {
          dropoffAuto.onBlur();
          setDropoffTouched(true);
        }}
        errorText={!dropoffValid && dropoffTouched ? 'Select a dropoff address' : undefined}
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
          disabled={!pickupValid || !dropoffValid}
          onClick={() =>
            onNext({
              pickup:
                pickupLat !== undefined && pickupLng !== undefined
                  ? { address: pickup, lat: pickupLat, lng: pickupLng }
                  : undefined,
              dropoff:
                dropLat !== undefined && dropLng !== undefined
                  ? { address: dropoff, lat: dropLat, lng: dropLng }
                  : undefined,
              passengers,
              notes,
              pickupValid,
              dropoffValid,
            })
          }
        >
          Next
        </Button>
      </Stack>
    </Stack>
  );
}
