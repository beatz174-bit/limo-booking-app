import { renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useRouteMetrics } from "./useRouteMetrics";

describe("useRouteMetrics", () => {
  test("returns a function that currently resolves to null", async () => {
    const { result } = renderHook(() => useRouteMetrics());
    const fn = result.current;
    expect(typeof fn).toBe("function");
    const out = await fn("A", "B");
    expect(out).toBeNull();
  });
});
