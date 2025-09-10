import { useMemo } from 'react';
import { Button, Stack } from '@mui/material';
import type { AvailabilityResponse } from '@/api-client';

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
  const slots = useMemo(() => {
    const day = new Date(`${date}T00:00:00`);
    return Array.from({ length: 24 }).map((_, h) => {
      const start = new Date(day);
      start.setHours(h, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const disabled = availability
        ? availability.bookings.some((b) => {
            const bStart = new Date(b.pickup_when);
            const bEnd = new Date(bStart.getTime() + 60 * 60 * 1000);
            return bStart < end && bEnd > start;
          }) ||
          availability.slots.some((s) => {
            const sStart = new Date(s.start_dt);
            const sEnd = new Date(s.end_dt);
            return sStart < end && sEnd > start;
          })
        : false;
      return { start, disabled };
    });
  }, [date, availability]);

  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {slots.map(({ start, disabled }) => {
        const label = `${String(start.getHours()).padStart(2, '0')}:00`;
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

