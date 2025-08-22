export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogPayload {
  level: LogLevel;
  message: string;
  env: string;
  source: string;
  node: "frontend";
  facility: string;
  [key: string]: unknown;
}

const env = (import.meta.env.ENV as string) || import.meta.env.MODE || "development";
const source = "limo-booking-app";

function createPayload(level: LogLevel, facility: string, args: unknown[]): LogPayload {
  const message = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
  return {
    level,
    message,
    env,
    source,
    node: "frontend",
    facility,
  };
}

async function forward(payload: LogPayload): Promise<void> {
  const url = import.meta.env.VITE_GRAYLOG_URL || import.meta.env.VITE_LOG_PROXY;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore network errors
  }
}

function log(level: LogLevel, facility: string, ...args: unknown[]): void {
  const payload = createPayload(level, facility, args);
  console[level](payload);
  void forward(payload);
}

export const info = (facility: string, ...args: unknown[]) => log("info", facility, ...args);
export const warn = (facility: string, ...args: unknown[]) => log("warn", facility, ...args);
export const error = (facility: string, ...args: unknown[]) => log("error", facility, ...args);
export const debug = (facility: string, ...args: unknown[]) => log("debug", facility, ...args);

export { createPayload };
