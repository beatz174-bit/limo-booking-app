import { type ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

export function renderWithProviders(ui: ReactNode, { route = "/" } = {}) {
  window.history.pushState({}, "Test page", route);
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AuthProvider>
  );
}
