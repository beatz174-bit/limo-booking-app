import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@tests/utils/renderWithProviders";
import LoginPage from "./LoginPage";

test("logs in successfully", async () => {
  renderWithProviders(<LoginPage />, { route: "/login" });
  await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
  await userEvent.type(screen.getByLabelText(/password/i), "pw");
  await userEvent.click(screen.getByRole("button", { name: /log in/i }));
  expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
});

test("shows error on bad credentials", async () => {
  renderWithProviders(<LoginPage />, { route: "/login" });
  await userEvent.type(screen.getByLabelText(/email/i), "bad@example.com");
  await userEvent.type(screen.getByLabelText(/password/i), "nope");
  await userEvent.click(screen.getByRole("button", { name: /log in/i }));
  expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
});
