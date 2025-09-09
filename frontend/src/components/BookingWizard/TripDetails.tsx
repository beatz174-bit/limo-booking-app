import { useState, useEffect } from 'react';
import { Stack, TextField, Typography } from '@mui/material';
import useAvailability from '@/hooks/useAvailability';
import { AddressField } from '@/components/AddressField';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';
import { BookingFormData } from '@/types/BookingFormData';

interface Props {
  data: BookingFormData;
  onChange: (data: Partial<BookingFormData>) => void;
}

export default function TripDetails({ data, onChange }: Props) {
  const [when, setWhen] = useState(data.pickup_when || '');
  const month = when ? when.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const { data: availability } = useAvailability(month);
  const blocked = availability
    ? availability.slots.some(
        s =>
          new Date(when) >= new Date(s.start_dt) &&
          new Date(when) < new Date(s.end_dt),
      ) ||
      availability.bookings.some(b => {
        const start = new Date(b.pickup_when);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return new Date(when) >= start && new Date(when) < end;
      })
    : false;

  useEffect(() => {
    if (when && !blocked) {
      onChange({ pickup_when: new Date(when).toISOString() });
    }
  }, [when, blocked, onChange]);

  const [pickup, setPickup] = useState(data.pickup?.address || '');
  const [pickupValid, setPickupValid] = useState<boolean>(data.pickupValid ?? false);
  const [pickupTouched, setPickupTouched] = useState(false);
  const pickupAuto = useAddressAutocomplete(pickup);

  const [dropoff, setDropoff] = useState(data.dropoff?.address || '');
  const [dropoffValid, setDropoffValid] = useState<boolean>(data.dropoffValid ?? false);
  const [dropoffTouched, setDropoffTouched] = useState(false);
  const dropoffAuto = useAddressAutocomplete(dropoff);

  const [passengers, setPassengers] = useState<number>(data.passengers ?? 1);
  const [notes, setNotes] = useState(data.notes || '');

  return (
    <Stack spacing={2}>
      <TextField
        type="datetime-local"
        label="Pickup time"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
      {blocked && <Typography color="error">Time unavailable</Typography>}
      {when && !blocked && (
        <>
          <AddressField
            id="pickup"
            label="Pickup address"
            value={pickup}
            onChange={(val) => {
              setPickup(val);
              setPickupValid(false);
              onChange({
                pickup: { address: val, lat: 0, lng: 0 },
                pickupValid: false,
              });
            }}
            onSelect={(s) => {
              setPickup(s.address);
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
              setDropoffValid(false);
              onChange({
                dropoff: { address: val, lat: 0, lng: 0 },
                dropoffValid: false,
              });
            }}
            onSelect={(s) => {
              setDropoff(s.address);
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
        </>
      )}
    </Stack>
  );
}

