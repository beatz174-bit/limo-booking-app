// frontend/tests/msw/handlers.ts
import { http, HttpResponse } from "msw";
import { CONFIG } from "@/config"

type LoginBody = { email: string; password: string };
type RegisterBody = { full_name: string; email: string; password: string };
type SettingsBody = {
  account_mode: boolean;
  google_maps_api_key: string;
  flagfall: number;
  per_km_rate: number;
  per_minute_rate: number;
};

const BASE_URL = CONFIG.API_BASE_URL
export const apiUrl = (path: string) => `${BASE_URL}/${path.replace(/^\/+/, '')}`;

// Default in-memory settings for tests; individual tests can override with server.use(...)
let __settings: SettingsBody = {
  account_mode: true,
  google_maps_api_key: "XYZ",
  flagfall: 10.5,
  per_km_rate: 2.75,
  per_minute_rate: 1.1,
};

export const handlers = [
  // ---- POST /auth/register ----
  http.post(apiUrl('/auth/register'), async ({ request }) => {
    const body = (await request.json()) as RegisterBody;
    if (!body.email || !body.password || !body.full_name) {
      return HttpResponse.json({ detail: "Invalid input" }, { status: 422 });
    }
    if (body.email === 'dupe@example.com') {
      return HttpResponse.json({ detail: 'Email already registered' }, { status: 400 });
    }
    return HttpResponse.json({ id: 123, full_name: body.full_name, email: body.email }, { status: 201 });
  }),

  // ---- POST /auth/login ----
  http.post(apiUrl('/auth/login'), async ({ request }) => {
    const body = (await request.json()) as LoginBody;

    if (body.email === 'bad@example.com') {
      return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
    }

    return HttpResponse.json({
      access_token: 'test-token',
      token_type: 'bearer',
      user: { id: 1, full_name: 'Test User', email: body.email },
    });
  }),

  // ---- GET /users/me : return current user based on token ----
  http.get(apiUrl('/users/me'), () => {
    return HttpResponse.json({
      id: 1,
      full_name: 'Test User',
      email: 'test@example.com',
    });
  }),

  // ---- Settings endpoints used by AdminDashboard ----
  http.get(apiUrl('/settings'), () => {
    return HttpResponse.json(__settings);
  }),

  http.put(apiUrl('/settings'), async ({ request }) => {
    const body = (await request.json()) as SettingsBody;
    __settings = body; // naive in-memory update
    return HttpResponse.json({ ok: true });
  }),
];