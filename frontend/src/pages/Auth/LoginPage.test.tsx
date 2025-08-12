// src/pages/Auth/LoginPage.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./LoginPage";

test("logs in successfully", async () => {
  render(<LoginPage />);
  await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
  await userEvent.type(screen.getByLabelText(/password/i), "pw");
  await userEvent.click(screen.getByRole("button", { name: /LOG IN/i }));

  // Expect success UI effect, token saved, redirect, etc.
  // Example: a success message or redirected heading
  expect(await screen.findByText(/welcome/i)).toBeInTheDocument();
});

test("shows error on bad credentials", async () => {
  render(<LoginPage />);
  await userEvent.type(screen.getByLabelText(/email/i), "bad@example.com");
  await userEvent.type(screen.getByLabelText(/password/i), "nope");
  await userEvent.click(screen.getByRole("button", { name: /log in/i }));

  expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
});
