import { render, screen } from "@testing-library/react";
import React from "react";
import { PriceSummary } from "./PriceSummary";

describe("PriceSummary", () => {
  test("renders nothing without valid addresses", () => {
    const { container } = render(
      <PriceSummary pickup="" dropoff="" rideTime="" flagfall={0} perKm={1} perMin={1} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("renders formatted price when inputs complete", async () => {
    render(
      <PriceSummary
        pickup="A"
        dropoff="B"
        rideTime="2025-01-01T10:00"
        flagfall={0}
        perKm={2}
        perMin={1}
        distanceKm={10}
        durationMin={5}
      />
    );
    expect(await screen.findByText("$25.00")).toBeInTheDocument();
  });

  test("recalculates when distance changes", async () => {
    const { rerender } = render(
      <PriceSummary
        pickup="A"
        dropoff="B"
        rideTime="2025-01-01T10:00"
        flagfall={0}
        perKm={2}
        perMin={1}
        distanceKm={1}
        durationMin={1}
      />
    );
    expect(await screen.findByText("$3.00")).toBeInTheDocument();
    rerender(
      <PriceSummary
        pickup="A"
        dropoff="B"
        rideTime="2025-01-01T10:00"
        flagfall={0}
        perKm={2}
        perMin={1}
        distanceKm={2}
        durationMin={1}
      />
    );
    expect(await screen.findByText("$5.00")).toBeInTheDocument();
  });
});
