import { describe, expect, it } from "vitest";
import { getWayfindingVector } from "./wayfinding";

describe("central chamber wayfinding", () => {
  it("points dormant and awakened routes to the Memory Prism", () => {
    expect(getWayfindingVector("dormant", false)).toMatchObject({ label: "BEGIN WITH THE PRISM", mode: "next" });
    expect(getWayfindingVector("awakened", false)).toMatchObject({ label: "REVISIT THE PRISM", mode: "next" });
  });

  it("points resonant and mastered routes to their next spatial target", () => {
    expect(getWayfindingVector("resonant", false)).toMatchObject({ label: "FOLLOW THE RESONANCE", mode: "next" });
    expect(getWayfindingVector("mastered", false)).toMatchObject({ label: "TRACE THE OBSERVATORY", mode: "next" });
  });

  it("changes a persisted return visit into a return vector without changing its target", () => {
    const next = getWayfindingVector("resonant", false);
    const returning = getWayfindingVector("resonant", true);
    expect(returning).toMatchObject({ label: next.label, position: next.position, mode: "return" });
  });
});
