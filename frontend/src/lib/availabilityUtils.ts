import type { AvailabilityResponse } from '@/api-client';

export type DayState = 'free' | 'partial' | 'full';

export function summarizeMonthlyAvailability(
  data: AvailabilityResponse,
  month: Date,
): Record<string, DayState> {
  const states: Record<string, DayState> = {};
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStart = Date.UTC(year, monthIndex, d, 0, 0, 0, 0);
    const dayEnd = Date.UTC(year, monthIndex, d, 23, 59, 59, 999);
    const day = new Date(dayStart);
    const start = new Date(dayStart);
    const end = new Date(dayEnd);
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
  const [yearString, monthString, dayString] = date.split('-');
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;
  const dayOfMonth = Number(dayString);
  return Array.from({ length: 24 }).map((_, h) => {
    const start = new Date(Date.UTC(year, monthIndex, dayOfMonth, h, 0, 0, 0));
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
