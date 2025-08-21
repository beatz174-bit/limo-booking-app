import { useState } from 'react';
import { Stack, TextField, Button, Typography } from '@mui/material';
import useAvailability from '@/hooks/useAvailability';

interface FormData {
  pickup_when?: string;
}

interface Props {
  data: FormData;
  onNext: (data: FormData) => void;
}

export default function SelectTimeStep({ data, onNext }: Props) {
  const [when, setWhen] = useState(data.pickup_when || '');
  const month = when ? when.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const { data: availability } = useAvailability(month);
  const blocked = availability
    ? availability.slots.some(
        s => new Date(when) >= new Date(s.start_dt) && new Date(when) < new Date(s.end_dt)
      ) ||
      availability.bookings.some(b => {
        const start = new Date(b.pickup_when);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return new Date(when) >= start && new Date(when) < end;
      })
    : false;
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
      <Button variant="contained" onClick={() => onNext({ pickup_when: when })} disabled={!when || blocked}>
        Next
      </Button>
    </Stack>
  );
}
