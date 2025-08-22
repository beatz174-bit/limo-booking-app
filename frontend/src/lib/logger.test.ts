import { describe, expect, test } from "vitest";
import { createPayload } from "./logger";

describe("logger", () => {
  test("creates payload with standard fields", () => {
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
});
