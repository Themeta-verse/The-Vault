import { describe, expect, it } from "vitest";
import { getWorldFailureCopy } from "./worldFailures";

describe("world client failure messages", () => {
  it("keeps state-load failures actionable without exposing transport details", () => {
    expect(getWorldFailureCopy("state")).toContain("YOUR DISCOVERIES REMAIN SAFE");
    expect(getWorldFailureCopy("state")).not.toContain("http");
  });

  it("keeps ARIA mutation failures bounded and non-destructive", () => {
    expect(getWorldFailureCopy("aria")).toContain("QUESTION WAS NOT CHANGED");
  });

  it("explains settings mutation failures without claiming a preference was saved", () => {
    expect(getWorldFailureCopy("settings")).toContain("CURRENT WORLD REMAINS UNCHANGED");
  });
});
