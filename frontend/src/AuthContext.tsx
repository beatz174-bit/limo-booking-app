// src/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_approved: boolean;
}

interface Settings {
  flagfall: number;
  per_km_rate: number;
  per_minute_rate: number;
  google_maps_api_key: string;
  account_mode: "open" | "staged";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
  setupRequired: boolean;
  settings: Settings | null;
  refreshSettings: () => void;
  completeSetup: (payload: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  const refreshSettings = async () => {
    try {
      const res = await fetch("http://localhost:8000/users/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.warn("Settings fetch failed:", err);
    }
  };

  const completeSetup = async (payload: any) => {
    try {
        const res = await fetch("http://localhost:8000/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        });
        if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Setup failed: ${detail}`);
        }
      setSetupRequired(false);
      await refreshSettings();
    } catch (err) {
      console.error("Setup failed:", err);
      throw err;
    }
  };

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch("http://localhost:8000/users/admin/settings");
        if (!res.ok) {
          setSetupRequired(true);
        } else {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.warn("Setup check failed:", err);
        setSetupRequired(true);
      } finally {
        setLoading(false);
      }
    };

    if (!token) {
      checkSetup();
    } else {
      fetch("http://localhost:8000/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.ok ? res.json() : Promise.reject("unauthorized"))
        .then((data) => {
          setUser(data);
          checkSetup();
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem("token");
          checkSetup();
        });
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setupRequired, settings, refreshSettings, completeSetup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};