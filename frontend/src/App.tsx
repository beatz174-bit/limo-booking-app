// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import HomePage from "./pages/HomePage";
import BookingPage from "./pages/BookingPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <header className="bg-gray-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo.svg" alt="Logo" className="w-10 h-10" />
            <h1 className="text-2xl font-bold">Limo Booking Service</h1>
          </div>
          <nav className="space-x-4">
            <Link to="/" className="text-blue-300 hover:underline">Home</Link>
            <Link to="/book" className="text-blue-300 hover:underline">Book</Link>
            <Link to="/confirmation" className="text-blue-300 hover:underline">Confirmation</Link>
            <Link to="/history" className="text-blue-300 hover:underline">History</Link>
          </nav>
        </header>

        <main className="flex-grow p-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/confirmation" element={<ConfirmationPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>

        <footer className="bg-gray-100 text-center text-sm p-4 border-t">
          &copy; {new Date().getFullYear()} Limo Booking Service. All rights reserved.
        </footer>
      </div>
    </Router>
  );
}