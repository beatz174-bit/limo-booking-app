import { 
  createContext, 
  useState, 
  useEffect, 
  useContext 
} from 'react';
import { type AuthContextType } from "../types/AuthContextType"

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

  // Define login function (calls API, gets token & user info)
  const login = async (email: string, password: string) => {
    // call authService.login(email, password) to get token & user data
    // then set state: setToken(token), setUserRole(role), setUserName(name)
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