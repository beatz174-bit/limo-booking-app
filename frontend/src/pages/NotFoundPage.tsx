// src/pages/NotFoundPage.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="mb-6 text-gray-600">
        Oops! The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        className="text-blue-600 underline hover:text-blue-800 transition"
      >
        Return to Home
      </Link>
    </div>
  );
}
