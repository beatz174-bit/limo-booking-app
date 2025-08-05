// src/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef
} from "react";
import axios from "axios";
import type { AxiosInstance } from "axios";
import { type AdminSetupForm, type Settings } from "./types";

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_approved: boolean;
}

// interface Settings {
//   flagfall: number;
//   per_km_rate: number;
//   per_minute_rate: number;
//   google_maps_api_key: string;
//   account_mode: "open" | "staged";
// }


export type AuthContextType = {
  user: User | null;
  token: string | null;
  settings: Settings | null;
  setupRequired: boolean;
  loading: boolean;
  axiosInstance: AxiosInstance;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  // completeSetup: (payload: Partial<Settings> & { admin_email: string; admin_password: string; full_name: string }) => Promise<void>;
  completeSetup: (payload: Settings) => Promise<void>;
  refreshSettings: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null as any);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const initCalled = useRef(false);

  const axiosInstance: AxiosInstance = axios.create({
    baseURL: "http://localhost:8000",
  });

  axiosInstance.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  /** Refresh settings from backend (only used after setup completes or manually) */
  const refreshSettings = async () => {
    try {
      const res = await fetch("http://localhost:8000/setup", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.warn("Settings fetch failed:", err);
    }
  };

  /** Called by the setup form after successful completion */
  const completeSetup = async (form: AdminSetupForm) => {
    try {
      const payload = {
          admin_email: form.admin_email,
          full_name: form.full_name,
          admin_password: form.admin_password,
          settings: form.settings,
        };
      const res = await fetch("http://localhost:8000/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
    const res = await fetch("http://localhost:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Login failed: ${detail}`);
    }
    const { token: tok, user: u } = await res.json();
    localStorage.setItem("token", tok);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(tok);
    setUser(u);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // useEffect(() => {
  //   if (initCalled.current) return;
  //   initCalled.current = true;

  //   (async () => {
  //     // If there's a token, attempt to restore the user
  //     if (token) {
  //       try {
  //         const res = await fetch("http://localhost:8000/users/me", {
  //           headers: { Authorization: `Bearer ${token}` },
  //           credentials: "include",
  //         });
  //         if (res.ok) {
  //           const userData = await res.json();
  //           setUser(userData);
  //         } else {
  //           logout();
  //         }
  //       } catch (err) {
  //         console.error("Failed to restore user:", err);
  //         logout();
  //       }
  //     }

  //     // Check whether setup is required
  //     try {
  //       const res = await fetch("http://localhost:8000/setup", {
  //         credentials: "include",
  //       });

  //       if (!res.ok) {
  //         setSetupRequired(true);
  //       } else {
  //         const data = await res.json();
  //         if (data === null) {
  //           setSetupRequired(true);
  //         } else {
  //           setSettings(data);
  //           setSetupRequired(false);
  //         }
  //       }
  //     } catch (err) {
  //       console.warn("GET /setup failed:", err);
  //       setSetupRequired(true);
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, [token]);
  useEffect(() => {
  // only run once
    if (initCalled.current) return;
    initCalled.current = true;

    (async () => {
      let config: Settings | null = null;

      // restore user if token exists
      if (token) {
        await fetchUserFromToken();
      }

      try {
        const res = await fetch(`${apiBase}/setup`, { credentials: "include" });
        if (!res.ok) {
          setSetupRequired(true);
        } else {
          const data = await res.json();
          if (data === null) {
            setSetupRequired(true);
          } else {
            config = data;
            setSettings(data);
            setSetupRequired(false);
          }
          console.log("Setup fetch result:", data);
console.log("setupRequired now:", setupRequired);
console.log("RequireSetup, loading:", loading, "setupRequired:", setupRequired, "pathname:", pathname);

        }
        
      } catch {
        setSetupRequired(true);
      } finally {
        setLoading(false);
      }
      
    })();
  }, []);

  return (
    // <AuthContext.Provider
    //   value={{
    //     user,
    //     token,
    //     settings,
    //     setupRequired,
    //     loading,
    //     axiosInstance,
    //     login,
    //     logout,
    //     completeSetup,
    //     refreshSettings,
    //   }}
    // >
    //   {children}
    // </AuthContext.Provider>
    <AuthContext.Provider value={{
      user,
      token,
      settings,
      setupRequired,
      loading,
      login,
      logout,
      completeSetup,
      axiosInstance,
      refreshSettings,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
