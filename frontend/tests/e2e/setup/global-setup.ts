// tests/e2e/global-setup.ts
import { request, type APIResponse } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the e2e env so we point at the TEST backend & TEST DB
dotenv.config({ path: path.resolve(__dirname, "../.env.e2e") });

const API = process.env.API_BASE_URL ?? "http://localhost:8000";
const UI  = process.env.E2E_BASE_URL ?? "http://localhost:5173";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "pw";
const ADMIN_FULLNAME = process.env.ADMIN_FULLNAME ?? "Admin User";

const DRIVER_EMAIL = process.env.DRIVER_EMAIL ?? "driver@example.com";
const DRIVER_PASSWORD = process.env.DRIVER_PASSWORD ?? "pw";
const DRIVER_FULLNAME = process.env.DRIVER_FULLNAME ?? "Driver";

const STORAGE_PATH = path.join(process.cwd(), "storage", "admin.json");

async function bodyText(res: APIResponse) {
  try { return await res.text(); } catch { return ""; }
}

export default async function globalSetup(): Promise<void> {
  // Ensure storage dir
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });

  // Ensure WebSocket support for backend routes
  await new Promise<void>((resolve, reject) => {
    const pip = spawn("pip", ["install", "websockets"], { stdio: "inherit" });
    pip.on("close", (code) => (code === 0 ? resolve() : reject(new Error("pip install failed"))));
  });

  // Start the FastAPI backend for API interactions
  const backend = spawn(
    "uvicorn",
    ["app.main:app", "--host", "0.0.0.0", "--port", "8000"],
    {
      cwd: path.resolve(process.cwd(), "../backend"),
      env: {
        ...process.env,
        ENV: "test",
        STRIPE_SECRET_KEY: "",
        GOOGLE_MAPS_API_KEY: "",
        FCM_PROJECT_ID: "",
        FCM_CLIENT_EMAIL: "",
        FCM_PRIVATE_KEY: "",
      },
      stdio: "inherit",
    }
  );

  let ready = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${API}/docs`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      /* ignore until timeout */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) {
    backend.kill();
    throw new Error("Backend failed to start");
  }

  process.on("exit", () => backend.kill());

  // Speak to the API behind API_BASE_URL (TEST backend)
  const api = await request.newContext({ baseURL: API });

  // 1) Seed admin user and default settings via setup endpoint
  const setupRes = await api.post("/setup", {
    data: {
      admin_email: ADMIN_EMAIL,
      full_name: ADMIN_FULLNAME,
      admin_password: ADMIN_PASSWORD,
      settings: {
        account_mode: false,
        flagfall: 5,
        per_km_rate: 2,
        per_minute_rate: 1,
      },
    },
  });
  if (!setupRes.ok() && setupRes.status() !== 400) {
    throw new Error(
      `Setup failed: ${setupRes.status()} ${setupRes.statusText()} ${await bodyText(setupRes)}`
    );
  }

  // 2) Ensure a driver user exists for login flows
  const driverRes = await api.post("/auth/register", {
    data: { email: DRIVER_EMAIL, full_name: DRIVER_FULLNAME, password: DRIVER_PASSWORD },
  });
  if (!driverRes.ok() && driverRes.status() !== 400 && driverRes.status() !== 409) {
    throw new Error(
      `Driver seed failed: ${driverRes.status()} ${driverRes.statusText()} ${await bodyText(driverRes)}`
    );
  }

  // 3) OAuth2 password flow (FORM) for admin token per spec
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

  // 4) Verify settings endpoint returns seeded config
  const settingsRes = await api.get("/settings", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!settingsRes.ok()) {
    throw new Error(
      `Fetching settings failed: ${settingsRes.status()} ${settingsRes.statusText()} ${await bodyText(settingsRes)}`
    );
  }

  // 5) Persist storage for the UI origin (front-end reads localStorage.access_token)
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
            user: { email: ADMIN_EMAIL, full_name: ADMIN_FULLNAME, role: "admin" },
            role: "admin",
          }),
        },
        // Your app also reads these:
        { name: "userID", value: "1" },           // gates admin
        { name: "userName", value: ADMIN_FULLNAME },
        { name: "role", value: "admin" },
      ],
    },
  ],
};
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(storageState, null, 2));

  await api.dispose();
}
