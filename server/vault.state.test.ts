import { describe, expect, it } from "vitest";
import { normalizeDiscoveredObjectStates } from "./db";

describe("Vault progression reconciliation", () => {
  it("promotes a legacy discovered object from an incomplete state record before consumers assemble world state", () => {
    const discoveredAt = new Date("2026-08-20T09:00:00.000Z");
    const normalized = normalizeDiscoveredObjectStates(
      [{ objectId: "object-memory-prism", state: "unknown", discoveredAt: null }],
      [{ objectId: "object-memory-prism", discoveredAt }],
    );

    expect(normalized).toEqual([{ objectId: "object-memory-prism", state: "discovered", discoveredAt }]);
  });

  it("does not downgrade stronger progression or mutate unrelated state records", () => {
    const discoveredAt = new Date("2026-08-20T09:00:00.000Z");
    const source = [
      { objectId: "object-memory-prism", state: "understood", discoveredAt },
      { objectId: "object-echo-sigil", state: "unknown", discoveredAt: null },
    ];

    expect(normalizeDiscoveredObjectStates(source, [{ objectId: "object-memory-prism", discoveredAt }])).toEqual(source);
  });
});
