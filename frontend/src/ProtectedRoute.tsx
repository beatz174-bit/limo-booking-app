// src/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export const RequireAdmin = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;
  return children;
};
