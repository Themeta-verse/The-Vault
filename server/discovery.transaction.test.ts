import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const databaseSource = readFileSync(fileURLToPath(new URL("./db.ts", import.meta.url)), "utf8");
const discoveryStart = databaseSource.indexOf("export async function discoverVaultObject");
const nextExport = databaseSource.indexOf("\nexport async function", discoveryStart + 1);
const discoveryFunction = databaseSource.slice(discoveryStart, nextExport === -1 ? undefined : nextExport);

describe("discovery critical-write boundary", () => {
  it("keeps discovery, fragment, history, unlock, and state writes inside one database transaction", () => {
    expect(discoveryStart).toBeGreaterThanOrEqual(0);
    expect(discoveryFunction).toContain("return db.transaction(async tx =>");
    expect(discoveryFunction).toContain("await tx.insert(discoveries)");
    expect(discoveryFunction).toContain("await tx.insert(userArtifactFragments)");
    expect(discoveryFunction).toContain("await tx.insert(vaultHistory)");
    expect(discoveryFunction).toContain("await tx.update(userRoomStates)");
    expect(discoveryFunction).toContain("await tx.update(userObjectStates)");
    expect(discoveryFunction).not.toMatch(/await db\.(insert|update)/);
  });
});
