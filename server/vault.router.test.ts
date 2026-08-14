import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({
  getVaultState: vi.fn(),
  markRoomVisited: vi.fn(),
  discoverVaultObject: vi.fn(),
  saveExperimentNote: vi.fn(),
  setVaultSettings: vi.fn(),
  recordVaultAction: vi.fn(),
  getAriaMessages: vi.fn(),
  recordAriaMessage: vi.fn(),
  hasVaultPermission: vi.fn(),
}));

const llm = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("./db", () => db);
vi.mock("./_core/llm", () => llm);

import { appRouter } from "./routers";

function context(user: TrpcContext["user"]): TrpcContext {
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as TrpcContext["res"] };
}

const user = { id: 7, openId: "vault-user", name: "Vault User", email: "vault@example.com", loginMethod: "manus", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("THE VAULT protected router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.hasVaultPermission.mockResolvedValue(true);
    db.discoverVaultObject.mockResolvedValue({ isNew: true, object: { name: "Memory Prism" }, artifact: null, unlockedRoomId: "observatory" });
    db.saveExperimentNote.mockResolvedValue(4);
    db.getAriaMessages.mockResolvedValue([]);
    db.getVaultState.mockResolvedValue({ discoveries: [], artifacts: [], rooms: [], roomStates: [] });
  });

  it("rejects unauthenticated access to persisted Vault state", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.vault.state()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.getVaultState).not.toHaveBeenCalled();
  });

  it("records an authenticated discovery against the current user only", async () => {
    const caller = appRouter.createCaller(context(user));
    await caller.vault.discover({ objectId: "object-memory-prism" });
    expect(db.discoverVaultObject).toHaveBeenCalledWith(7, "object-memory-prism");
    expect(db.recordVaultAction).toHaveBeenCalledWith(7, "discover_object", "world_interaction", "object-memory-prism");
  });

  it("does not save a Lab note when the owner has revoked that permission", async () => {
    db.hasVaultPermission.mockResolvedValue(false);
    const caller = appRouter.createCaller(context(user));
    await expect(caller.vault.saveNote({ title: "Unfiled", content: "This must not persist." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.saveExperimentNote).not.toHaveBeenCalled();
  });

  it("blocks invalid room identifiers before they can reach persistence", async () => {
    const caller = appRouter.createCaller(context(user));
    await expect(caller.vault.enterRoom({ roomId: "elsewhere" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.markRoomVisited).not.toHaveBeenCalled();
  });

  it("persists an explicit low-quality preference only for the active Vault owner", async () => {
    const caller = appRouter.createCaller(context(user));
    await caller.vault.settings({ renderQuality: "low" });
    expect(db.setVaultSettings).toHaveBeenCalledWith(7, { renderQuality: "low" });
    expect(db.recordVaultAction).toHaveBeenCalledWith(7, "update_settings", "access_deck", undefined, JSON.stringify({ renderQuality: "low" }));
  });

  it("rejects invalid rendering quality before it can reach persistence", async () => {
    const caller = appRouter.createCaller(context(user));
    await expect(caller.vault.settings({ renderQuality: "maximum" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.setVaultSettings).not.toHaveBeenCalled();
  });

  it("persists ARIA's reply but rejects unknown suggested actions", async () => {
    llm.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ answer: "The threshold remains quiet.", suggestedAction: "open_everything" }) } }] });
    const caller = appRouter.createCaller(context(user));
    const result = await caller.aria.send({ roomId: "lab", message: "What changed?" });
    expect(result).toEqual({ answer: "The threshold remains quiet.", suggestedAction: "none" });
    expect(db.recordAriaMessage).toHaveBeenLastCalledWith(7, "lab", "aria", "The threshold remains quiet.", "none");
  });
});
