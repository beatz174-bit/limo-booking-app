// export type AuthContextType = {
//   token: string | null;
//   userID: string | null;  // e.g., "driver" or "rider"
//   userName: string;
//   // ... any other user info you need globally
//   login: (email: string, password: string) => Promise<void>;
//   logout: () => void;
//   loading: boolean;
// }

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
