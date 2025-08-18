// tests/e2e/global-setup.ts
import { request, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";

// Load the e2e env so we point at the TEST backend & TEST DB
dotenv.config({ path: path.resolve(process.cwd(), ".env.e2e") });

const API = process.env.API_BASE_URL ?? "http://localhost:8000";
const UI  = process.env.E2E_BASE_URL ?? "http://localhost:5173";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "pw";
const ADMIN_FULLNAME = process.env.ADMIN_FULLNAME ?? "Admin User";

const STORAGE_PATH = path.join(process.cwd(), "storage", "admin.json");

async function bodyText(res: any) {
  try { return await res.text(); } catch { return ""; }
}

export default async function globalSetup(_config: FullConfig) {
  // Ensure storage dir
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });

  // Speak to the API behind API_BASE_URL (TEST backend)
  const api = await request.newContext({ baseURL: API });

  // 1) Register admin (JSON), tolerate "already exists"
  const registerRes = await api.post("/auth/register", {
    data: { email: ADMIN_EMAIL, full_name: ADMIN_FULLNAME, password: ADMIN_PASSWORD },
  });
  if (!registerRes.ok() && registerRes.status() !== 400 && registerRes.status() !== 409) {
    throw new Error(
      `Register failed: ${registerRes.status()} ${registerRes.statusText()} ${await bodyText(registerRes)}`
    );
  }

  // 2) OAuth2 password flow (FORM) for token per spec
  const tokenRes = await api.post("/auth/token", {
    form: { username: ADMIN_EMAIL, password: ADMIN_PASSWORD, grant_type: "password" },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!tokenRes.ok()) {
    throw new Error(`Token fetch failed: ${tokenRes.status()} ${tokenRes.statusText()} ${await bodyText(tokenRes)}`);
  }
  const tokenJson = await tokenRes.json();
  const accessToken: string | undefined = tokenJson?.access_token; // spec: OAuth2Token { access_token, token_type }
  if (!accessToken) throw new Error("Token fetch succeeded but no access_token in response.");

  // 3) Persist storage for the UI origin (front-end reads localStorage.access_token)
const storageState = {
  cookies: [],
  origins: [
    {
      origin: UI.replace(/\/+$/, ""),
      localStorage: [
        // THIS is what AuthContext boots from:
        {
          name: "auth_tokens",
          value: JSON.stringify({
            access_token: accessToken,
            refresh_token: null,                   // if you want, you could fetch and store a real refresh token
            user: { email: ADMIN_EMAIL, full_name: ADMIN_FULLNAME },
          }),
        },
        // Your app also reads these:
        { name: "userID", value: "1" },           // gates admin
        { name: "userName", value: ADMIN_FULLNAME }
      ],
    },
  ],
};
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(storageState, null, 2));

  await api.dispose();
}
