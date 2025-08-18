import { render, screen } from "@testing-library/react";
import React from "react";
import { PriceSummary } from "./PriceSummary";

describe("PriceSummary", () => {
  test("shows loader when loading", () => {
    render(<PriceSummary price={null} loading />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("shows error when provided", () => {
    render(<PriceSummary price={null} error="Oops" />);
    expect(screen.getByText("Oops")).toBeInTheDocument();
  });

  test("renders formatted price when available", () => {
    render(<PriceSummary price={12.345} />);
    expect(screen.getByText(/\$12\.35/)).toBeInTheDocument();
  });

  test("renders dash when price is null and no error/loading", () => {
    render(<PriceSummary price={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
