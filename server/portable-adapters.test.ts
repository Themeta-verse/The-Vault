import { describe, expect, it } from "vitest";
import { authProvider } from "./_core/authProvider";
import { storageGet } from "./storage";

describe("portable adapter compatibility", () => {
  it("keeps application-owned storage URLs stable regardless of provider", async () => {
    await expect(storageGet("/recovery/example.json")).resolves.toEqual({
      key: "recovery/example.json",
      url: "/manus-storage/recovery/example.json",
    });
  });

  it("creates opaque, one-time login state values", () => {
    const first = authProvider.createLoginState();
    const second = authProvider.createLoginState();
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second).not.toBe(first);
  });
});
