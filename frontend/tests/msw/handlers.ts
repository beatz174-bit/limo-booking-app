// frontend/tests/msw/handlers.ts
import { http, HttpResponse } from "msw";
import { CONFIG } from "../../src/config"

type LoginBody = { email: string; password: string };
type RegisterBody = { full_name: string; email: string; password: string };

const BASE_URL = CONFIG.API_BASE_URL
export const apiUrl = (path: string) => `${BASE_URL}/${path.replace(/^\/+/, '')}`;
// const api = (path: string | RegExp) => path; // adjust if you prefix with /api

// Default success: create user and return 201-ish shape
export const registerSuccess = http.post(apiUrl('/auth/register'), async ({ request }) => {
  const body = (await request.json()) as RegisterBody;
  if (!body.email || !body.password || !body.full_name) {
    return HttpResponse.json({ detail: "Invalid input" }, { status: 422 });
  }
  // Simulate created user id 1 so admin route is reachable in tests if needed
  return HttpResponse.json({ id: 1, email: body.email, full_name: body.full_name }, { status: 201 });
});

// Common 400/422 variants
export const registerInvalid422 = http.post(apiUrl('/auth/register'), async () => {
  return HttpResponse.json({ detail: "Invalid input. Please check all fields." }, { status: 422 });
});
export const registerBad400 = http.post(apiUrl('/auth/register'), async () => {
  return HttpResponse.json({ detail: "Email already registered" }, { status: 400 });
});


export const handlers = [
  registerSuccess,
  // ---- POST /auth/login : default success ----
  http.post(apiUrl('/auth/login'), async ({ request }) => {
    const body = (await request.json()) as LoginBody;

    if (body.email === 'bad@example.com') {
      // Let the "bad credentials" test switch this to 401 explicitly,
      // but we can support it here as a fallback too.
      return HttpResponse.json(
        { detail: 'Invalid credentials' },
        { status: 401 },
      );
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

  // If your app calls other boot-time endpoints, stub them here:
  // http.get(api('/setup/summary'), () => HttpResponse.json({ ... })),
  // http.get(api('/bookings'), () => HttpResponse.json([])),
];

