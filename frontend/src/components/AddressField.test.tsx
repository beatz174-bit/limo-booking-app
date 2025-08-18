import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { AddressField } from "./AddressField";

describe("AddressField", () => {
  test("renders label and triggers onChange", async () => {
    const onChange = vi.fn();
    render(<AddressField id="pickup" label="Pickup" value="" onChange={onChange} />);
    const input = screen.getByLabelText(/pickup/i);
    await userEvent.type(input, "1");
    expect(onChange).toHaveBeenCalled();
  });

  test("shows location button when onUseLocation provided and handles click/disabled", async () => {
    const onUseLocation = vi.fn();
    const { rerender } = render(
      <AddressField id="a" label="Address" value="" onChange={() => void 0} onUseLocation={onUseLocation} locating={false} />
    );
    const btn = screen.getByRole("button", { name: /use my location/i });
    await userEvent.click(btn);
    expect(onUseLocation).toHaveBeenCalled();

    rerender(<AddressField id="a" label="Address" value="" onChange={() => void 0} onUseLocation={onUseLocation} locating={true} />);
    expect(screen.getByRole("button", { name: /use my location/i })).toBeDisabled();
  });

  test("renders helperText on error", () => {
    render(<AddressField id="a" label="A" value="" onChange={() => void 0} errorText="Nope" />);
    expect(screen.getByText("Nope")).toBeInTheDocument();
  });
});
