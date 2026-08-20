import { describe, expect, it } from "vitest";
import { assertStagingTarget } from "../scripts/staging/preflight.mts";

const safeEnvironment = {
  DEPLOYMENT_ENV: "staging",
  DATABASE_URL: "mysql://production.example.invalid/the_vault",
  STAGING_DATABASE_URL: "mysql://staging.example.invalid/the_vault_staging",
};

describe("staging target preflight", () => {
  it("accepts an explicitly marked, separate MySQL staging target", () => {
    const target = assertStagingTarget(safeEnvironment);
    expect(target.hostname).toBe("staging.example.invalid");
    expect(target.pathname).toBe("/the_vault_staging");
  });

  it("rejects a staging URL that exactly matches production", () => {
    expect(() =>
      assertStagingTarget({
        ...safeEnvironment,
        STAGING_DATABASE_URL: safeEnvironment.DATABASE_URL,
      })
    ).toThrow("must never equal DATABASE_URL");
  });

  it("requires explicit staging intent before any migration command can run", () => {
    expect(() =>
      assertStagingTarget({ ...safeEnvironment, DEPLOYMENT_ENV: "production" })
    ).toThrow("DEPLOYMENT_ENV must be explicitly set to staging");
  });
});
