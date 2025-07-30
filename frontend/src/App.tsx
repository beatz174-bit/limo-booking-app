// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import HomePage from "./pages/HomePage";
import BookingPage from "./pages/BookingPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import HistoryPage from "./pages/HistoryPage";
import SetupPage from "./pages/SetupPage";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import { RequireAuth, RequireDriver } from "./ProtectedRoute";

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
      <Route path="/admin" element={<RequireDriver><AdminDashboard /></RequireDriver>} />
      <Route path="*" element={<div className="p-4">404 - Page not found</div>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow p-4">
            <AppRoutes />
          </main>
          <footer className="bg-gray-100 text-center text-sm p-4 border-t">
            &copy; {new Date().getFullYear()} Limo Booking Service. All rights reserved.
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
