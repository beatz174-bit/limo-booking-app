// src/pages/PageNotFound.test.tsx
import { render, screen } from "@testing-library/react";
import PageNotFound from "./PageNotFound";

test("shows 404 content", () => {
  render(<PageNotFound />);
  expect(screen.getByRole("heading", { name: /404/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /back to home/i })).toBeInTheDocument();
});
