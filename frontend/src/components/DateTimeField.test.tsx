import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { DateTimeField } from "./DateTimeField";

describe("DateTimeField", () => {
  test("renders datetime-local input with min attr and handles change", async () => {
    const onChange = vi.fn();
    render(
      <DateTimeField
        id="rideTime"
        label="Ride Time"
        value="2025-08-19T10:00"
        min="2025-08-19T09:00"
        onChange={onChange}
      />
    );
    const input = screen.getByLabelText(/ride time/i) as HTMLInputElement;
    expect(input).toHaveAttribute("type", "datetime-local");
    expect(input).toHaveAttribute("min", "2025-08-19T09:00");
    await userEvent.type(input, "1");
    expect(onChange).toHaveBeenCalled();
  });
});
