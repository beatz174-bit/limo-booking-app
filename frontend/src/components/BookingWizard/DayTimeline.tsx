import { useMemo } from 'react';
import { Button, Stack } from '@mui/material';
import type { AvailabilityResponse } from '@/api-client';
import { calculateHourlyAvailability } from '@/lib/availabilityUtils';

interface DayTimelineProps {
  date: string;
  availability: AvailabilityResponse | null;
  value?: string;
  onSelect?: (iso: string) => void;
}

export default function DayTimeline({
  date,
  availability,
  value,
  onSelect,
}: DayTimelineProps) {
  const slots = useMemo(
    () => calculateHourlyAvailability(availability, date),
    [availability, date],
  );

  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {slots.map(({ start, disabled }) => {
        const label = `${String(start.getUTCHours()).padStart(2, '0')}:00`;
        const iso = start.toISOString();
        return (
          <Button
            key={iso}
            onClick={() => onSelect?.(iso)}
            disabled={disabled}
            variant={value === iso ? 'contained' : 'outlined'}
            sx={{ minWidth: 64 }}
          >
            {label}
          </Button>
        );
      })}
    </Stack>
  );
}

