import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./AuthContext"; // ← wrap in AuthProvider
import "./index.css";
import AppRoutes from "./App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
          <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);

