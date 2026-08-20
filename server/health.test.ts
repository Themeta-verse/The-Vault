import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));
import { getDb } from "./db";
import { getHealthStatus } from "./_core/health";
const mockedGetDb = vi.mocked(getDb);
describe("HTTP health dependency status", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it("reports a healthy database when the minimal probe succeeds", async () => {
    mockedGetDb.mockResolvedValue({
      execute: vi.fn().mockResolvedValue(undefined),
    } as never);
    const status = await getHealthStatus();
    expect(status.application).toBe("healthy");
    expect(status.database).toBe("healthy");
    expect(status.requiredServices).toBe("not_configured");
    expect(Number.isNaN(Date.parse(status.timestamp))).toBe(false);
  });
  it("reports database unavailability without leaking probe details", async () => {
    mockedGetDb.mockResolvedValue({
      execute: vi.fn().mockRejectedValue(new Error("connection failed")),
    } as never);
    const status = await getHealthStatus();
    expect(status).toMatchObject({
      application: "healthy",
      database: "unavailable",
      requiredServices: "not_configured",
    });
    expect(status).not.toHaveProperty("error");
  });
});
