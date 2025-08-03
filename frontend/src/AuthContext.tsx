// src/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import type { AxiosInstance } from "axios";

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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  setupRequired: boolean;
  settings: Settings | null;
  refreshSettings: () => void;
  completeSetup: (payload: any) => Promise<void>;
  axiosInstance: AxiosInstance;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  // ✅ Create Axios instance locally
  const axiosInstance: AxiosInstance = axios.create({
    baseURL: "http://localhost:8000",
  });

  // ✅ Attach token to requests automatically
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  const refreshSettings = async () => {
    try {
      const res = await fetch("http://localhost:8000/setup");
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

  const login = async (email: string, password: string) => {
    console.log("Login started with", email, password);
    const res = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Login failed: ${detail}`);
    }

    const data = await res.json();
    console.log("Login successful. Response data:", data);
    const token = data.token
    const user = data.user
        console.log("Setting token to:", token);
console.log("Setting user to:", user);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setToken(token);
    // setUser({
    //   id: data.user_id,
    //   email,
    //   full_name: data.full_name,
    //   role: data.role,
    //   is_approved: true,
    // });
    setUser({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_approved: user.is_approved,
});
    console.log("Context state after login - token:", token, "user:", user);
console.log("localStorage token now:", localStorage.getItem("token"));
console.log("localStorage user now:", localStorage.getItem("user"));


console.log("Login successful. Response data:", res.body);

  };

  const restoreUser = async () => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return;

    try {
      const res = await fetch("http://localhost:8000/users/me", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setToken(storedToken);
        setUser(data);
      } else {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to restore user:", err);
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    restoreUser();
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    console.log("Loading from localStorage:", storedToken, storedUser);
  }, []);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch("http://localhost:8000/setup");
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
        .then((res) => (res.ok ? res.json() : Promise.reject("unauthorized")))
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

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };
  console.log("AuthContext.Provider render: token =", token, "user =", user);
  return (
    
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
        setupRequired,
        settings,
        refreshSettings,
        completeSetup,
        axiosInstance, // ✅ Provided here
      }}
    >
      {children}
    </AuthContext.Provider>
    
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
