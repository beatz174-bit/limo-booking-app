import type { AvailabilityResponse } from '@/api-client';

export type DayState = 'free' | 'partial' | 'full';

export function summarizeMonthlyAvailability(
  data: AvailabilityResponse,
  month: Date,
): Record<string, DayState> {
  const states: Record<string, DayState> = {};
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(month.getFullYear(), month.getMonth(), d);
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    let hasFull = false;
    let hasAny = false;
    data.slots.forEach((s) => {
      const slotStart = new Date(s.start_dt);
      const slotEnd = new Date(s.end_dt);
      if (slotStart <= start && slotEnd >= end) {
        hasFull = true;
      } else if (slotEnd > start && slotStart < end) {
        hasAny = true;
      }
    });
    data.bookings.forEach((b) => {
      const bookingStart = new Date(b.pickup_when);
      const bookingEnd = new Date(bookingStart.getTime() + 60 * 60 * 1000);
      if (bookingEnd > start && bookingStart < end) {
        hasAny = true;
      }
    });
    const key = day.toISOString().slice(0, 10);
    states[key] = hasFull ? 'full' : hasAny ? 'partial' : 'free';
  }
  return states;
}

export function calculateHourlyAvailability(
  availability: AvailabilityResponse | null,
  date: string,
) {
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
}
