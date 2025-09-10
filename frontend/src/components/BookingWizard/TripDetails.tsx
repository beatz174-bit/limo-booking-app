import { useState } from 'react';
import { Stack, TextField, Typography } from '@mui/material';
import useAvailability from '@/hooks/useAvailability';
import AvailabilityCalendar from './AvailabilityCalendar';
import DayTimeline from './DayTimeline';
import { AddressField } from '@/components/AddressField';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';
import { BookingFormData } from '@/types/BookingFormData';

interface Props {
  data: BookingFormData;
  onChange: (data: Partial<BookingFormData>) => void;
}

export default function TripDetails({ data, onChange }: Props) {
  const initialDate = data.pickup_when ? data.pickup_when.slice(0, 10) : '';
  const initialTime = data.pickup_when ? data.pickup_when : '';
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [month, setMonth] = useState(
    initialDate ? initialDate.slice(0, 7) : new Date().toISOString().slice(0, 7),
  );
  const { data: availability } = useAvailability(month);

  const isBlocked = (iso: string) => {
    if (!availability) return false;
    const when = new Date(iso);
    return (
      availability.slots.some(
        (s) =>
          when >= new Date(s.start_dt) && when < new Date(s.end_dt),
      ) ||
      availability.bookings.some((b) => {
        const start = new Date(b.pickup_when);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return when >= start && when < end;
      })
    );
  };

  const blocked = selectedTime ? isBlocked(selectedTime) : false;

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setMonth(date.slice(0, 7));
  };

  const handleTimeSelect = (iso: string) => {
    setSelectedTime(iso);
    if (!isBlocked(iso)) {
      onChange({ pickup_when: new Date(iso).toISOString() });
    }
  };

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
      <AvailabilityCalendar
        value={selectedDate}
        onSelect={handleDateSelect}
        onMonthChange={setMonth}
      />
      {selectedDate && (
        <>
          <DayTimeline
            date={selectedDate}
            availability={availability}
            value={selectedTime}
            onSelect={handleTimeSelect}
          />
          {blocked && <Typography color="error">Time unavailable</Typography>}
          {selectedTime && !blocked && (
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
        </>
      )}
    </Stack>
  );
}

