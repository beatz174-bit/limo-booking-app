// src/pages/HistoryPage.tsx
import React, { useEffect, useState } from "react";

interface Location {
  address: string;
  lat: number;
  lng: number;
}

interface Booking {
  id: string;
  pickup: Location;
  dropoff: Location;
  datetime: string;
  quoted_price: number;
  status: string;
}

export default function HistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("http://localhost:8000/customer/bookings?email=test@example.com");
        const data = await res.json();
        setBookings(data);
      } catch (err) {
        setError("Failed to load bookings.");
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Trip History</h1>
      {bookings.length === 0 ? (
        <p>No trips found.</p>
      ) : (
        <ul className="space-y-4">
          {bookings.map((b) => (
            <li key={b.id} className="border p-4 rounded shadow">
              <p><strong>Date:</strong> {new Date(b.datetime).toLocaleString()}</p>
              <p><strong>From:</strong> {b.pickup.address}</p>
              <p><strong>To:</strong> {b.dropoff.address}</p>
              <p><strong>Price:</strong> ${b.quoted_price.toFixed(2)}</p>
              <p><strong>Status:</strong> {b.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
