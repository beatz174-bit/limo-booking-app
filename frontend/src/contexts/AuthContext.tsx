import { 
  createContext, 
  useState, 
  useEffect, 
  useContext 
} from 'react';
import { type AuthContextType } from "../types/AuthContextType"
// import { AuthApi } from '../api-client/api';
import type { LoginRequest } from '../api-client/api'
// import { Configuration } from "../api-client/configuration"
import { authApi } from "../components/ApiConfig"


interface AuthState {
  token: string | null;
  userRole: string | null;  // e.g., "driver" or "rider"
  userName: string;
  // ... any other user info you need globally
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [token, setToken] = useState<string|null>(null);
  const [userRole, setUserRole] = useState<string|null>(null);
  const [userName, setUserName] = useState<string>('');
  const [error, setError] = useState("");

  // Define login function (calls API, gets token & user info)
  const login = async (email: string, password: string) => {
  // call authService.login(email, password) to get token & user data
  // then set state: setToken(token), setUserRole(role), setUserName(name)
  // const config = new Configuration({ basePath: "http://localhost:8000" });
  // const authApi = new AuthApi(config);

    const loginRequest: LoginRequest = {
        email,
        password,
    };

    try {
        const { data } = await authApi.loginAuthLoginPost(loginRequest);

        // Store token and user info in localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify({
            id: data.id,
            email: data.email,
            full_name: data.full_name,
            role: data.role,
            is_approved: data.is_approved,
        }));

        } catch (err: any) {
        if (err?.response?.status === 422) {
            setError("Validation failed. Please check your email and password.");
        } else if (err?.response?.status === 401) {
            setError("Invalid credentials.");
        } else if (err?.response?.data?.detail) {
            setError(err.response.data.detail);
        } else {
            setError("Login failed. Please try again.");
        }
        console.error("Login error:", err);
    }

  };
  const logout = () => {
    setToken(null);
    setUserRole(null);
    setUserName('');
    // also remove token from storage if stored
  };

  const value = { token, userRole, userName, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};