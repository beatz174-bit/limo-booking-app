// src/pages/AdminDashboard.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";

interface Settings {
  allow_public_registration: boolean;
  google_maps_api_key: string;
  flagfall: number;
  per_km_rate: number;
  per_min_rate: number;
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token) {
      fetch("http://localhost:8000/users/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.ok ? res.json() : Promise.reject("Failed"))
        .then(setSettings)
        .catch(() => setError("Failed to load settings"));
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const { name, type, checked, value } = e.target;
    setSettings({
      ...settings,
      [name]: type === "checkbox" ? checked : parseFloat(value) || value,
    });
  };

  const handleSave = async () => {
    setError("");
    setMessage("");
    const res = await fetch("http://localhost:8000/users/admin/settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setMessage("Settings saved");
    } else {
      const err = await res.json();
      setError(err.detail || "Failed to save settings");
    }
  };

  if (!settings) return <p className="p-4">Loading settings...</p>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Admin Dashboard</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      {message && <p className="text-green-600 mb-2">{message}</p>}
      <div className="space-y-4">
        <label className="block">
          <input
            type="checkbox"
            name="allow_public_registration"
            checked={settings.allow_public_registration}
            onChange={handleChange}
          /> Allow public registration
        </label>
        <input
          type="text"
          name="google_maps_api_key"
          value={settings.google_maps_api_key}
          onChange={handleChange}
          placeholder="Google Maps API Key"
          className="border p-2 w-full"
        />
        <input
          type="number"
          name="flagfall"
          value={settings.flagfall}
          onChange={handleChange}
          placeholder="Flagfall"
          className="border p-2 w-full"
        />
        <input
          type="number"
          name="per_km_rate"
          value={settings.per_km_rate}
          onChange={handleChange}
          placeholder="Per KM Rate"
          className="border p-2 w-full"
        />
        <input
          type="number"
          name="per_min_rate"
          value={settings.per_min_rate}
          onChange={handleChange}
          placeholder="Per Minute Rate"
          className="border p-2 w-full"
        />
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
