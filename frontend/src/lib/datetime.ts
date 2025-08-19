// Helpers for working with HTML datetime-local inputs.
export function toLocalInputValue(date: Date): string {
  // returns `YYYY-MM-DDTHH:mm` for <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function minFutureDateTime(minutesFromNow = 5): string {
  const dt = new Date();
  dt.setMinutes(dt.getMinutes() + minutesFromNow);
  return toLocalInputValue(dt);
}