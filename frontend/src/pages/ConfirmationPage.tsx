// src/pages/ConfirmationPage.tsx
import { useEffect, useState } from "react";
// import axios from "axios";
import { useAuth } from "../AuthContext";
import axios from "axios"

interface Booking {
  id: string;
  user_id: string;
  pickup_location: string;
  dropoff_location: string;
  time: string;
  price: number;
  status: string;
}

export default function ConfirmationPage() {
  const { axiosInstance } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axiosInstance.get("/bookings/pending");
        console.log("Fetched bookings:", response.data); // debug
        setBookings(response.data); // response should be an array
      } catch (error) {
        console.error("Error fetching pending bookings:", error);
      }
    };

    fetchBookings();
  }, [axiosInstance]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(bookings.map(b => b.id));
      setSelectedIds(allIds);
    }
    setSelectAll(!selectAll);
  };

  const confirmBooking = async (ids: string[]) => {
    try {
      await axios.post("/bookings/confirm", { ids }); // assumed API
      setBookings(prev => prev.filter(b => !ids.includes(b.id)));
      ids.forEach(id => console.log(`Notify user for booking ${id}`));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        ids.forEach(id => newSet.delete(id));
        return newSet;
      });
    } catch (error) {
      console.error("Failed to confirm booking(s)", error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pending Bookings</h1>

      <div className="mb-4 flex items-center gap-4">
        <input
          type="checkbox"
          checked={selectAll}
          onChange={handleSelectAll}
        />
        <label>Select All</label>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={selectedIds.size === 0}
          onClick={() => confirmBooking(Array.from(selectedIds))}
        >
          Confirm Selected
        </button>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2"><input type="checkbox" checked={selectAll} onChange={handleSelectAll} /></th>
            <th className="p-2">User ID</th>
            <th className="p-2">Pickup</th>
            <th className="p-2">Dropoff</th>
            <th className="p-2">Time</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(booking => (
            <tr key={booking.id} className="border-t">
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(booking.id)}
                  onChange={() => handleSelect(booking.id)}
                />
              </td>
              <td className="p-2">{booking.user_id}</td>
              <td className="p-2">{booking.pickup_location}</td>
              <td className="p-2">{booking.dropoff_location}</td>
              <td className="p-2">{booking.time}</td>
              <td className="p-2">
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => confirmBooking([booking.id])}
                >
                  Confirm
                </button>
              </td>
            </tr>
          ))}
          {bookings.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-500">
                No pending bookings.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
