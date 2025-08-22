import { useState } from 'react';
import { Stack, TextField, Button, List, ListItem, ListItemText, Typography } from '@mui/material';
import useAvailability from '@/hooks/useAvailability';
import { availabilityApi } from '@/components/ApiConfig';

export default function AvailabilityPage() {
  const month = new Date().toISOString().slice(0, 7);
  const { data, refresh } = useAvailability(month);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  async function create() {
    await availabilityApi.createSlotApiV1AvailabilityPost({
      start_dt: start,
      end_dt: end,
    });
    setStart('');
    setEnd('');
    await refresh();
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h5">Availability</Typography>
      <Stack direction="row" spacing={2}>
        <TextField
          type="datetime-local"
          label="Start"
          value={start}
          onChange={e => setStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="datetime-local"
          label="End"
          value={end}
          onChange={e => setEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={create} disabled={!start || !end}>
          Add
        </Button>
      </Stack>
      <List>
        {data?.slots.map(s => (
          <ListItem key={s.id}>
            <ListItemText
              primary={`${new Date(s.start_dt).toLocaleString()} - ${new Date(s.end_dt).toLocaleString()}`}
              secondary={s.reason || 'Block'}
            />
          </ListItem>
        ))}
        {data && data.slots.length === 0 && <Typography>No blocks</Typography>}
      </List>
    </Stack>
  );
}
