import { render, screen } from "@testing-library/react";
import React from "react";
import { DevFeaturesProvider } from "@/contexts/DevFeaturesContext";
import { FareBreakdown } from "./FareBreakdown";

describe("FareBreakdown", () => {
  test("renders breakdown values", () => {
    render(
      <DevFeaturesProvider>
        <FareBreakdown
          price={null}
          flagfall={5}
          perKm={2}
          perMin={1}
          distanceKm={3}
          durationMin={4}
        />
      </DevFeaturesProvider>
    );
    expect(screen.getByText(/Flagfall: \$5\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Distance: \$6\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Duration: \$4\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$15\.00/i)).toBeInTheDocument();
  });
});
