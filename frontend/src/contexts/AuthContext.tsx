import { 
  createContext, 
  useState, 
  useEffect, 
  useContext 
} from 'react';
import { type AuthContextType } from "../types/AuthContextType"
import type { LoginRequest } from '../api-client/api'
import { authApi } from "../components/ApiConfig"


interface AuthState {
  token: string | null;
  userID: string | null;  // e.g., "driver" or "rider"
  userName: string;
  // ... any other user info you need globally
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [token, setToken] = useState<string|null>(null);
  const [userID, setUserID] = useState<string|null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedID = localStorage.getItem("userID");
    const storedName = localStorage.getItem("userName");

    if (storedToken) {
      setToken(storedToken);
      setUserID(storedID);
      if (storedName) { setUserName(storedName) };
    }
    setLoading(false);
  }, []);


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
        localStorage.setItem("userID", data.id)
        localStorage.setItem("userName", data.full_name)
        localStorage.setItem("user", JSON.stringify({
            id: data.id,
            email: data.email,
            full_name: data.full_name,
            role: data.role,
            is_approved: data.is_approved,
        }));
        setUserName(data.full_name);
        setToken(data.token);
        setUserID(data.id)
    } catch (err: any) {
      throw err;
  }

  };
  const logout = () => {
    setToken(null);
    setUserID(null);
    setUserName('');
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userID");
    // also remove token from storage if stored
  };

  const value = { token, userID, userName, login, logout, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};