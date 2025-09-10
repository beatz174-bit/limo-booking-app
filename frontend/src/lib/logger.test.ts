import { describe, expect, test, vi } from "vitest";

describe("logger", () => {
  test("creates payload with standard fields", async () => {
    vi.resetModules();
    const { createPayload } = await import("./logger");
    const payload = createPayload("info", "testFacility", ["hello", { foo: "bar" }]);
    expect(payload).toMatchObject({
      level: "info",
      message: `hello ${JSON.stringify({ foo: "bar" })}`,
      env: import.meta.env.ENV || import.meta.env.MODE,
      source: "limo-booking-app",
      node: "frontend",
      facility: "testFacility",
    });
  });

  test("skips logs below threshold", async () => {
    const originalLevel = import.meta.env.VITE_LOG_LEVEL;
    const originalUrl = import.meta.env.VITE_GRAYLOG_URL;
    import.meta.env.VITE_LOG_LEVEL = "warn";
    import.meta.env.VITE_GRAYLOG_URL = "http://example.com";
    vi.resetModules();
    const { info } = await import("./logger");
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue({} as Response);
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    info("test", "hello");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(infoSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
    fetchSpy.mockRestore();
    import.meta.env.VITE_LOG_LEVEL = originalLevel;
    import.meta.env.VITE_GRAYLOG_URL = originalUrl;
  });

  test("logs at or above threshold", async () => {
    const originalLevel = import.meta.env.VITE_LOG_LEVEL;
    const originalUrl = import.meta.env.VITE_GRAYLOG_URL;
    import.meta.env.VITE_LOG_LEVEL = "warn";
    import.meta.env.VITE_GRAYLOG_URL = "http://example.com";
    vi.resetModules();
    const { warn } = await import("./logger");
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue({} as Response);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warn("test", "hello");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(warnSpy).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    fetchSpy.mockRestore();
    import.meta.env.VITE_LOG_LEVEL = originalLevel;
    import.meta.env.VITE_GRAYLOG_URL = originalUrl;
  });

  test("serializes Error objects", async () => {
    const originalUrl = import.meta.env.VITE_GRAYLOG_URL;
    import.meta.env.VITE_GRAYLOG_URL = "";
    vi.resetModules();
    const { createPayload, error } = await import("./logger");
    const err = new Error("fail");
    const payload = createPayload("error", "facility", [err]);
    const parsed = JSON.parse(payload.message);
    expect(parsed.message).toBe("fail");
    expect(parsed.stack).toBe(err.stack);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    error("facility", err);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("fail"),
      }),
    );
    errorSpy.mockRestore();
    import.meta.env.VITE_GRAYLOG_URL = originalUrl;
  });
});
