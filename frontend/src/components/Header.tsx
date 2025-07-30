// src/components/Header.tsx
import React from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Header() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // const { user, logout } = useAuth();

  const hideNav = ["/login", "/setup"].includes(location.pathname);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

    return (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">Limo Booking App</h1>

      {!hideNav && (
      <nav className="flex items-center space-x-4">
        <Link to="/" className="text-blue-300 hover:underline">Home</Link>
        <Link to="/book" className="text-blue-300 hover:underline">Book</Link>
        <Link to="/confirmation" className="text-blue-300 hover:underline">Confirmation</Link>
        <Link to="/history" className="text-blue-300 hover:underline">History</Link>
        {user?.role === "driver" && (
          <Link to="/admin" className="text-blue-300 hover:underline">Admin</Link>
        )}
        {token ? (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Login
          </button>
        )}
      </nav>
      )}
    </header>
  );
}
