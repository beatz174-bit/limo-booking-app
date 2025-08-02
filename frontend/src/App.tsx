// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
// import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import BookingPage from "./pages/BookingPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import HistoryPage from "./pages/HistoryPage";
import SetupPage from "./pages/SetupPage";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import { RequireAuth, RequireAdmin } from "./ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import NotFoundPage from "./pages/NotFoundPage";

function AppRoutes() {
  const { loading, setupRequired } = useAuth();

  if (loading) {
    return <div className="p-4 text-center text-gray-600">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={setupRequired ? <Navigate to="/setup" replace /> : <HomePage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={setupRequired ? <Navigate to="/setup" replace /> : <LoginPage />} />
      <Route path="/book" element={<RequireAuth><BookingPage /></RequireAuth>} />
      <Route path="/confirmation" element={<RequireAuth><ConfirmationPage /></RequireAuth>} />
      <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
      <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
      <Route path="*" element={<div className="p-4">404 - Page not found</div>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
      </Router>
    </AuthProvider>
  );
}
