export type AuthContextType = {
  token: string | null;
  userID: string | null;  // e.g., "driver" or "rider"
  userName: string;
  // ... any other user info you need globally
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}