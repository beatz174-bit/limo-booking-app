// src/pages/SetupPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function SetupPage() {
  const navigate = useNavigate();
  const { completeSetup } = useAuth();

  const [form, setForm] = useState({
    admin_email: "",
    admin_password: "",
    full_name: "",
    settings: {
      allow_public_registration: false,
      google_maps_api_key: "",
      flagfall: 10,
      per_km_rate: 2,
      per_min_rate: 1,
    },
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/setup")
      .then((res) => {
        if (res.ok) {
          navigate("/login");
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (name in form.settings) {
      setForm((prev) => ({
        ...prev,
        settings: { ...prev.settings, [name]: type === "checkbox" ? checked : value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

  const payload = {
    admin_email: form.admin_email,
    full_name: form.full_name,
    admin_password: form.admin_password,
    settings: {
      flagfall: form.settings.flagfall,
      per_km_rate: form.settings.per_km_rate,
      per_min_rate: form.settings.per_min_rate,
      google_maps_api_key: form.settings.google_maps_api_key,
      allow_public_registration: form.settings.allow_public_registration, // or a value from form if you support toggling
    },
  };

    setError("");
    try {
      await completeSetup(payload);
      navigate("/admin");
    } catch (err: any) {
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error("Setup error:", err);
  setError(`Setup failed: ${message}`);
}
  };

  if (loading) return <p className="p-4">Checking system state...</p>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Initial Admin Setup</h1>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="full_name" placeholder="Full Name" required className="border p-2 w-full" onChange={handleChange} />
        <input name="admin_email" type="email" placeholder="Email" required className="border p-2 w-full" onChange={handleChange} />
        <input name="admin_password" type="password" placeholder="Password" required className="border p-2 w-full" onChange={handleChange} />
        <input name="google_maps_api_key" placeholder="Google Maps API Key" className="border p-2 w-full" onChange={handleChange} />
        <label className="block">
          <input type="checkbox" name="allow_public_registration" onChange={handleChange} /> Allow Public Registration
        </label>
        <div className="flex gap-2">
          <input name="flagfall" type="number" placeholder="Flagfall" className="border p-2 w-full" onChange={handleChange} />
          <input name="per_km_rate" type="number" placeholder="Per KM" className="border p-2 w-full" onChange={handleChange} />
          <input name="per_min_rate" type="number" placeholder="Per Min" className="border p-2 w-full" onChange={handleChange} />
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Create Admin Account</button>
      </form>
    </div>
  );
}
