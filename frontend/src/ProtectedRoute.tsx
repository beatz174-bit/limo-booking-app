// src/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import AppLayout from "./layouts/AppLayout";

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

export const RequireDriver = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  if (!user || user.role !== "driver") return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};
