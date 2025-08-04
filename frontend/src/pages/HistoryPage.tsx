// src/pages/HistoryPage.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

interface Booking {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  time: string;
  price: number;
  status: string;
}

const HistoryPage: React.FC = () => {
  const { axiosInstance } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axiosInstance
      .get("/customer/bookings")
      .then((res) => {
        setBookings(res.data);
      })
      .catch((err) => {
        console.error("Error fetching bookings:", err);
        setError("Failed to fetch booking history. Are you logged in?");
      });
  }, [axiosInstance]);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Booking History</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {bookings.length === 0 ? (
        <p>No past bookings found.</p>
      ) : (
        <ul className="space-y-4">
          {bookings.map((booking) => (
            <li key={booking.id} className="border p-4 rounded shadow">
              <p><strong>From:</strong> {booking.pickup_location}</p>
              <p><strong>To:</strong> {booking.dropoff_location}</p>
              <p><strong>Date:</strong> {new Date(booking.time).toLocaleString()}</p>
              <p>Price: ${booking.price.toFixed(2)}</p>
              <p><strong>Status:</strong> {booking.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HistoryPage;