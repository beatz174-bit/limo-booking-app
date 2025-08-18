import { describe, expect, test, vi } from "vitest";
import { toLocalInputValue, minFutureDateTime } from "./datetime";

describe("datetime lib", () => {
  test("toLocalInputValue formats datetime-local string", () => {
    const s = toLocalInputValue(new Date("2025-08-19T05:06:00"));
    expect(s).toBe("2025-08-19T05:06");
  });

  test("minFutureDateTime adds minutes and formats (uses system time)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-08-19T10:00:00"));
    const s = minFutureDateTime(5);
    expect(s).toBe("2025-08-19T10:05");
    vi.useRealTimers();
  });
});
