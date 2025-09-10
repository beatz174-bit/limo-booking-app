/**
 * Lightweight logger with optional Graylog forwarding.
 *
 * The log level can be restricted via the `VITE_LOG_LEVEL` environment
 * variable. Messages below the configured threshold are ignored. Supported
 * levels in ascending order are `debug`, `info`, `warn` and `error`. If the
 * variable is unset or invalid the logger defaults to `info`.
 */
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

const levels: LogLevel[] = ["debug", "info", "warn", "error"];
const levelName = ((import.meta.env.VITE_LOG_LEVEL as string) || "info").toLowerCase();
const threshold: LogLevel = levels.includes(levelName as LogLevel)
  ? (levelName as LogLevel)
  : "info";

function shouldLog(level: LogLevel): boolean {
  return levels.indexOf(level) >= levels.indexOf(threshold);
}

function createPayload(level: LogLevel, facility: string, args: unknown[]): LogPayload {
  const message = args
    .map((a) => {
      if (typeof a === "string") return a;
      if (a instanceof Error) {
        return JSON.stringify({ message: a.message, stack: a.stack });
      }
      return JSON.stringify(a);
    })
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
  if (!shouldLog(level)) return;
  const payload = createPayload(level, facility, args);
  console[level](payload);
  void forward(payload);
}

export const info = (facility: string, ...args: unknown[]) => log("info", facility, ...args);
export const warn = (facility: string, ...args: unknown[]) => log("warn", facility, ...args);
export const error = (facility: string, ...args: unknown[]) => log("error", facility, ...args);
export const debug = (facility: string, ...args: unknown[]) => log("debug", facility, ...args);

export { createPayload };
