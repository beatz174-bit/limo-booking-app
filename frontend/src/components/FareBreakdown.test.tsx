import { render, screen } from "@testing-library/react";
import React from "react";
import { FareBreakdown } from "./FareBreakdown";

describe("FareBreakdown", () => {
  test("renders breakdown values", () => {
    render(
      <FareBreakdown
        flagfall={5}
        perKm={2}
        perMin={1}
        distanceKm={3}
        durationMin={4}
      />
    );
    expect(screen.getByText(/flagfall: \$5\.00/)).toBeInTheDocument();
    expect(screen.getByText(/3\.00 km x \$2\.00/)).toBeInTheDocument();
    expect(screen.getByText(/4\.00 min x \$1\.00/)).toBeInTheDocument();
  });
});
