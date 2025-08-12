import { screen } from "@testing-library/react";
import { renderWithProviders } from "@tests/utils/renderWithProviders";
import PageNotFound from "./PageNotFound";

test("shows 404 content", () => {
  renderWithProviders(<PageNotFound />);
  expect(screen.getByRole("heading", { name: /404/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /back to home/i })).toBeInTheDocument();
});
