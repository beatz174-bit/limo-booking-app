// src/components/Header.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-gray-800 text-white p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <img src="/logo.svg" alt="Logo" className="w-10 h-10" />
        <h1 className="text-2xl font-bold">Limo Booking Service</h1>
      </div>
      <nav className="flex items-center space-x-4">
        <Link to="/" className="text-blue-300 hover:underline">Home</Link>
        <Link to="/book" className="text-blue-300 hover:underline">Book</Link>
        <Link to="/confirmation" className="text-blue-300 hover:underline">Confirmation</Link>
        <Link to="/history" className="text-blue-300 hover:underline">History</Link>
        {user?.role === "driver" && (
          <Link to="/admin" className="text-blue-300 hover:underline">Admin</Link>
        )}
        {user ? (
          <>
            <span className="text-sm">Hi, {user.full_name}</span>
            <button onClick={logout} className="text-sm text-red-300 hover:underline">Logout</button>
          </>
        ) : (
          <Link to="/login" className="text-blue-300 hover:underline">Login</Link>
        )}
      </nav>
    </header>
  );
}
