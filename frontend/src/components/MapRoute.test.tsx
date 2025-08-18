import { render, waitFor } from "@testing-library/react";
import React from "react";
import { MapRoute } from "./MapRoute";

describe("MapRoute", () => {
  test("calls onMetrics when both pickup and dropoff are set", async () => {
    const onMetrics = vi.fn();
    render(<MapRoute pickup="A" dropoff="B" onMetrics={onMetrics} />);
    await waitFor(() => expect(onMetrics).toHaveBeenCalledWith(10, 15));
  });

  test("does not call onMetrics when either address missing", async () => {
    const onMetrics = vi.fn();
    const { rerender } = render(<MapRoute pickup="" dropoff="B" onMetrics={onMetrics} />);
    await new Promise(r => setTimeout(r, 20));
    expect(onMetrics).not.toHaveBeenCalled();

    rerender(<MapRoute pickup="A" dropoff="" onMetrics={onMetrics} />);
    await new Promise(r => setTimeout(r, 20));
    expect(onMetrics).not.toHaveBeenCalled();
  });
});
