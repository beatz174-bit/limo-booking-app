// Type definitions for the authentication context values.
export type UserShape = { email?: string; full_name?: string; role?: string; phone?: string } | null;

export type AuthContextType = {
  accessToken: string | null;
  user: UserShape | null;
  loading: boolean;

  userName: string | null;
  userID: string | null;
  role: string | null;
  adminID: string | null;
  phone: string | null;

  loginWithPassword: (email: string, password: string) => Promise<string | null>;
  registerWithPassword: (fullName: string, email: string, password: string) => Promise<void>;

  loginWithOAuth: () => void;
  finishOAuthIfCallback: () => Promise<void>;

  logout: () => void;
  ensureFreshToken: () => Promise<string | null>;
};
