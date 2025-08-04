// src/components/RequireAuth.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function RequireAuth() {
  const { token, user, setupRequired, loading } = useAuth();
  const location = useLocation();

  // Wait for auth and setup initialization to complete
  if (loading) {
    return null;
  }

  // Let setup completion redirect flow (RequireSetup) handle unconfigured installs
  if (setupRequired) {
    return <Outlet />;
  }

  // Not authenticated: redirect to /login; store original location
  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Authenticated: render the routed children (with <Outlet /> support)
  return <Outlet />;
}
