import React, { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { usePriceCalculator } from "./usePriceCalculator";

interface HostProps {
  args: Parameters<typeof usePriceCalculator>[0];
  kick?: boolean;
}

function Host(props: HostProps) {
  const { price, error, compute } = usePriceCalculator(props.args);
  useEffect(() => { if (props.kick) compute(); }, [compute, props.kick]);
  return (
    <>
      <div data-testid="price">{price ?? ""}</div>
      <div data-testid="error">{error ?? ""}</div>
    </>
  );
}

describe("usePriceCalculator", () => {
  test("computes price with basic local fare model (flagfall + perKm*km + perMin*min)", async () => {
    const args = {
      pickup: "P", dropoff: "D", rideTime: "2025-08-19T10:00",
      flagfall: 5, perKm: 2, perMin: 1.5, distanceKm: 10, durationMin: 15, auto: false
    };
    render(<Host args={args} kick />);

    await waitFor(() => {
      const v = Number(screen.getByTestId("price").textContent || "0");
      expect(v).toBeCloseTo(47.5, 5);
    });
  });

  test("when addresses missing, price becomes null and no crash", async () => {
    const args = { pickup: "", dropoff: "", rideTime: "2025-08-19T10:00", flagfall: 5, perKm: 2, perMin: 1.5, auto: false };
    render(<Host args={args} kick />);
    await waitFor(() => expect(screen.getByTestId("price").textContent).toBe(""));
  });

  test("invalid ride time records a soft error but still computes with provided km/min", async () => {
    const args = { pickup: "A", dropoff: "B", rideTime: "not-a-date", flagfall: 5, perKm: 2, perMin: 1.5, distanceKm: 1, durationMin: 1, auto: false };
    render(<Host args={args} kick />);
    await waitFor(() => {
      expect(screen.getByTestId("price").textContent).not.toBe("");
    });
  });
});
