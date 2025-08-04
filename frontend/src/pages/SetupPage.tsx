// src/pages/SetupPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";


export default function SetupPage() {
  const { loading, setupRequired, completeSetup } = useAuth();
  const navigate = useNavigate();
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
  // ✅ Redirect *only when* the backend says setup is already done
  useEffect(() => {
    if (!loading && setupRequired === false) {
      navigate("/login", { replace: true });
    }
  }, [loading, setupRequired, navigate]);

  if (loading) {
    return <div>Loading setup status…</div>;
  }

  if (!setupRequired) {
    // e.g. setup was completed just now, so we don't render the form anymore
    return <div>Initial setup already performed. Redirecting…</div>;
  }

  // const [form, setForm] = useState({
  //   admin_email: "",
  //   admin_password: "",
  //   full_name: "",
  //   settings: {
  //     allow_public_registration: false,
  //     google_maps_api_key: "",
  //     flagfall: 10,
  //     per_km_rate: 2,
  //     per_min_rate: 1,
  //   },
  // });

  const handleSubmit = async (payload) => {
    try {
      await completeSetup(payload);
      // after setup is saved, you can navigate
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Setup submission failed", err);
    }
  };
  
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

  return (
  <div>
    <form onSubmit={handleSubmit}>
        <input name="full_name" placeholder="Full Name" required className="border p-2 w-full" onChange={handleChange} />
        <input name="admin_email" type="email" placeholder="Email" required className="border p-2 w-full" onChange={handleChange} />
        <input name="admin_password" type="password" placeholder="Password" required className="border p-2 w-full" onChange={handleChange} />
        <input name="google_maps_api_key" placeholder="Google Maps API Key" className="border p-2 w-full" onChange={handleChange} />
        <label className="block">
          <input type="checkbox" name="allow_public_registration" onChange={handleChange} /> Allow Public Registration
        </label>
        <div className="flex gap-2">
          <input name="flagfall" type="number" placeholder="Flagfall" className="border p-2 w-full" onChange={handleChange} step="0.01" />
          <input name="per_km_rate" type="number" placeholder="Per KM" className="border p-2 w-full" onChange={handleChange} step="0.01" />
          <input name="per_min_rate" type="number" placeholder="Per Min" className="border p-2 w-full" onChange={handleChange} step="0.01" />
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Create Admin Account</button>
      </form>
    </div>
  );
}
