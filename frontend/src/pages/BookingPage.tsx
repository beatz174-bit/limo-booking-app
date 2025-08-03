// src/pages/BookingPage.tsx
import React, { useEffect, useState } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { useAuth } from "../AuthContext";

interface Location {
  address: string;
  lat: number;
  lng: number;
}

function AutocompleteInput({
  label,
  value,
  onSelect,
}: {
  label: string;
  value: string;
  onSelect: (location: Location) => void;
}) {
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "au" },
      types: ["address"],
    },
    debounce: 300,
  });

  useEffect(() => {
    setValue(value, false);
  }, [value]);

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();
    const results = await getGeocode({ address });
    const { lat, lng } = await getLatLng(results[0]);
    onSelect({ address, lat, lng });
  };

  return (
    <div className="mb-4">
      <label className="block mb-2">{label}</label>
      <input
        value={inputValue}
        disabled={!ready}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}`}
        className="border px-2 py-1 rounded w-full"
      />
      {status === "OK" && (
        <ul className="border bg-white rounded shadow max-h-48 overflow-auto">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(description)}
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BookingPage() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [quote, setQuote] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [flagfall, setFlagfall] = useState(0);
  const [perKmRate, setPerKmRate] = useState(0);
  const [perMinRate, setPerMinRate] = useState(0);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const { axiosInstance, user, token, loading } = useAuth();

  useEffect(() => {
    axiosInstance.get("/setup")
      .then(res => {
        setFlagfall(res.data.flagfall || 0);
        setPerKmRate(res.data.per_km_rate || 0);
        setPerMinRate(res.data.per_min_rate || 0);
      })
      .catch(err => console.error("Failed to fetch pricing:", err));
  }, []);

  useEffect(() => {
    if (!pickup && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const results = await getGeocode({ location: { lat: latitude, lng: longitude } });
            const address = results[0].formatted_address;
            setPickup({ address, lat: latitude, lng: longitude });
          } catch (err) {
            console.error("Failed to reverse geocode device location:", err);
          }
        },
        (err) => {
          console.warn("Geolocation permission denied or error:", err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [pickup]);

  useEffect(() => {
    const generateAvailableTimes = () => {
      const now = new Date();
      const selectedDate = new Date(date);
      const times: string[] = [];

      for (let hour = 0; hour < 24; hour++) {
        for (let min = 0; min < 60; min += 15) {
          const optionTime = new Date(selectedDate);
          optionTime.setHours(hour, min, 0, 0);
          if (optionTime > now) {
            times.push(optionTime.toTimeString().slice(0, 5)); // HH:MM
          }
        }
      }

      setAvailableTimes(times);
    };

    if (date) {
      generateAvailableTimes();
    } else {
      setAvailableTimes([]);
    }
  }, [date]);

  const handleQuote = async () => {
    if (!pickup || !dropoff || !window.google?.maps?.DistanceMatrixService) {
      alert("Google Maps not loaded or missing data");
      return;
    }

    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [pickup.address],
        destinations: [dropoff.address],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== "OK") {
          alert("Distance Matrix failed: " + status);
          return;
        }

        const element = response.rows?.[0]?.elements?.[0];
        if (!element || element.status !== "OK") {
          alert("Could not get route data");
          return;
        }

        const distanceKm = element.distance.value / 1000;
        const durationMin = element.duration.value / 60;
        const price = flagfall + distanceKm.toFixed(1) * perKmRate + durationMin.toFixed(1) * perMinRate;
        setQuote(Number(price.toFixed(2)));
        setDistance(distanceKm);
        setDuration(durationMin);
      }
    );
  };

  const handleBooking = async () => {
    if (loading) {
      alert("Still restoring session. Please wait...");
      return;
    }

    if (!user || !token) {
      alert("You must be logged in to make a booking.");
      return;
    }

    const bookingDateTime = `${date}T${time}:00`;

    try {
      const res = await axiosInstance.post("/booking", {
        user_id: user.id,
        pickup,
        dropoff,
        datetime: bookingDateTime,
        quoted_price: quote,
      });

      setBookingId(res.data.booking_id);
    } catch (err: any) {
      console.error("Booking failed:", err);
      alert("Booking failed: " + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Book a Trip</h1>

      <AutocompleteInput
        label="Pickup Address"
        value={pickup?.address || ""}
        onSelect={setPickup}
      />

      <AutocompleteInput
        label="Dropoff Address"
        value={dropoff?.address || ""}
        onSelect={setDropoff}
      />

      <label className="block mb-2">Select Date:</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        min={new Date().toISOString().split("T")[0]}
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
        disabled={!date || !time || !pickup || !dropoff}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Get Quote
      </button>

      {quote !== null && (
        <div className="mt-4">
          <p className="mb-2">Estimated Distance: <strong>{distance?.toFixed(1)} Km</strong></p>
          <p className="mb-2">Estimated Travel time: <strong>{duration?.toFixed(1)} Min</strong></p>
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
