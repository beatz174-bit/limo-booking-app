export type UserShape = { email?: string; full_name?: string } | null;

export type AuthContextType = {
  accessToken: string | null;
  user: UserShape;
  loading: boolean;
  
  userName: string;
  userID: string | null;

  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (fullName: string, email: string, password: string) => Promise<void>;

  loginWithOAuth: () => void;
  finishOAuthIfCallback: () => Promise<void>;

  logout: () => void;
  ensureFreshToken: () => Promise<string | null>;
};
