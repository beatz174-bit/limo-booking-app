// tests/setup/server.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  // Example: auth login mock
  http.post("/auth/login", async ({ request }) => {
    const body = await request.json();
    if (body.email === "test@example.com" && body.password === "pw") {
      return HttpResponse.json({ token: "fake-token", userID: 1 }, { status: 200 });
    }
    return HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 });
  }),
];

export const server = setupServer(...handlers);
