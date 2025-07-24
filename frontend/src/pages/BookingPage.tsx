// src/pages/BookingPage.tsx
import React, { useEffect, useState } from "react";

interface Location {
  address: string;
  lat: number;
  lng: number;
}

const defaultPickup: Location = {
  address: "Brisbane Airport",
  lat: -27.3842,
  lng: 153.1175,
};

const defaultDropoff: Location = {
  address: "Gold Coast",
  lat: -28.0167,
  lng: 153.4000,
};

export default function BookingPage() {
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [quote, setQuote] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

    useEffect(() => {
    console.log("useEffect fired, date:", date); // ← ADD THIS
    if (date) {
        fetch(`http://localhost:8000/availability?date=${date}`)
        .then((res) => res.json())
        .then((data) => {
            console.log("Fetched slots:", data);
            setAvailableTimes(data.available_times);
        })
        .catch((err) => {
            console.error("Error fetching slots:", err);
            setAvailableTimes([]);
        });
    }
    }, [date]);

  const handleQuote = async () => {
    const bookingDateTime = `${date}T${time}:00`;
    const res = await fetch("http://localhost:8000/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup: defaultPickup,
        dropoff: defaultDropoff,
        datetime: bookingDateTime,
      }),
    });
    const data = await res.json();
    setQuote(data.price);
  };

  const handleBooking = async () => {
    const bookingDateTime = `${date}T${time}:00`;
    const res = await fetch("http://localhost:8000/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: "John Smith",
        customer_email: "test@example.com",
        pickup: defaultPickup,
        dropoff: defaultDropoff,
        datetime: bookingDateTime,
        quoted_price: quote,
      }),
    });
    const data = await res.json();
    setBookingId(data.booking_id);
  };

//   console.log("Available times:", availableTimes);
//   console.log("Selected date:", date);
//   console.log("typeof date:", typeof date, "value:", date);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Book a Trip</h1>

      <label className="block mb-2">Select Date:</label>
      <input
        type="date"
        value={date}
        onChange={(e) => {
            // console.log("Date changed:", e.target.value); // ← ADD THIS
            setDate(e.target.value);
        }}
        className="border px-2 py-1 rounded mb-4 w-full"
      />

      {availableTimes.length > 0 && (
        <>
          <label className="block mb-2">Select Time:</label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="border px-2 py-1 rounded mb-4 w-full"
          >
            <option value="">Select a time</option>
            {availableTimes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </>
      )}

      <button
        onClick={handleQuote}
        disabled={!date || !time}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Get Quote
      </button>

      {quote !== null && (
        <div className="mt-4">
          <p className="mb-2">Estimated Price: <strong>${quote.toFixed(2)}</strong></p>
          <button
            onClick={handleBooking}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Confirm Booking
          </button>
        </div>
      )}

      {bookingId && (
        <p className="mt-4 text-green-700">Booking confirmed! ID: {bookingId}</p>
      )}
    </div>
  );
}
