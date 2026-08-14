import { canEnterWorldRoom, getChamberGuidance, getWorldSignal } from "./worldExperience";
import { describe, expect, it } from "vitest";
import { canEnterWorldRoom, getChamberGuidance, getObjectInteractionCue, getWorldSignal, shouldEnterPersistentWorld } from "./worldExperience";

describe("world-first experience helpers", () => {
  it("enters saved world context directly for returning users", () => {
    expect(shouldEnterPersistentWorld(false, false)).toBe(false);
    expect(shouldEnterPersistentWorld(true, false)).toBe(true);
    expect(shouldEnterPersistentWorld(false, true)).toBe(true);
  });

  it("maps persisted progression to the strongest available chamber signal", () => {
    expect(getWorldSignal({})).toBe("dormant");
    expect(getWorldSignal({ "object-memory-prism": "discovered" })).toBe("awakened");
    expect(getWorldSignal({ "object-memory-prism": "understood", "object-echo-sigil": "understood" })).toBe("resonant");
    expect(getWorldSignal({ "object-echo-sigil": "understood", "object-resonance-needle": "mastered" })).toBe("mastered");
  });

  it("only enters destination rooms after their persistent threshold is unlocked", () => {
    expect(canEnterWorldRoom("central-chamber", [])).toBe(true);
    expect(canEnterWorldRoom("archive", ["archive", "lab"])).toBe(true);
    expect(canEnterWorldRoom("observatory", ["archive", "lab"])).toBe(false);
  });

  it("keeps the next progression signal clear while acknowledging a return visit", () => {
    expect(getChamberGuidance("resonant", false)).toContain("Echo");
    expect(getChamberGuidance("resonant", true)).toContain("kept your route");
  });

  it("stages a first object encounter before treating the object as retained", () => {
    expect(getObjectInteractionCue()).toMatchObject({ stage: "approach", caption: "UNRESOLVED" });
    expect(getObjectInteractionCue("observed")).toMatchObject({ stage: "attune", caption: "ATTUNED — RETURN" });
    expect(getObjectInteractionCue("discovered")).toMatchObject({ stage: "retained", caption: "RETAINED" });
  });
});
