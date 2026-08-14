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
  observeVaultObject: vi.fn(),
  understandVaultObject: vi.fn(),
  materializeExperiment: vi.fn(),
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
    db.observeVaultObject.mockResolvedValue({ object: { name: "Memory Prism" }, state: "observed" });
    db.understandVaultObject.mockResolvedValue({ state: "understood", unlockedObjectId: "object-resonance-needle" });
    db.materializeExperiment.mockResolvedValue({ id: 12, title: "A Recorded Hypothesis" });
  });

  it("rejects unauthenticated access to persisted Vault state", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.vault.state()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.getVaultState).not.toHaveBeenCalled();
  });

  it("returns persisted unlocked and mastered states plus active relationships only through the owner-scoped Vault state route", async () => {
    db.getVaultState.mockResolvedValue({
      discoveries: [], artifacts: [], rooms: [], roomStates: [], notes: [], creations: [], settings: undefined,
      objectStates: [{ objectId: "object-echo-sigil", state: "understood" }, { objectId: "object-resonance-needle", state: "unlocked" }, { objectId: "object-memory-prism", state: "mastered" }],
      relationships: [{ id: "relationship-echo-needle", label: "The Echo Sigil aligns the Resonance Needle." }],
    });
    const caller = appRouter.createCaller(context(user));
    const state = await caller.vault.state();
    expect(db.getVaultState).toHaveBeenCalledWith(7);
    expect(state.objectStates).toEqual(expect.arrayContaining([expect.objectContaining({ objectId: "object-resonance-needle", state: "unlocked" }), expect.objectContaining({ objectId: "object-memory-prism", state: "mastered" })]));
    expect(state.relationships[0]).toMatchObject({ id: "relationship-echo-needle" });
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

  it("rejects unknown world objects before they can reach a user-scoped discovery transition", async () => {
    const caller = appRouter.createCaller(context(user));
    await expect(caller.vault.discover({ objectId: "object-not-in-the-vault" } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.discoverVaultObject).not.toHaveBeenCalled();
  });

  it("persists explicit low-quality and non-3D preferences only for the active Vault owner", async () => {
    const caller = appRouter.createCaller(context(user));
    await caller.vault.settings({ renderQuality: "low", preferFallback: true });
    expect(db.setVaultSettings).toHaveBeenCalledWith(7, { renderQuality: "low", preferFallback: true });
    expect(db.recordVaultAction).toHaveBeenCalledWith(7, "update_settings", "access_deck", undefined, expect.any(String));
    const payload = db.recordVaultAction.mock.calls[0]?.[4];
    expect(JSON.parse(payload ?? "{}")).toEqual({ renderQuality: "low", preferFallback: true });
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

  it("records object observation and understanding only for the active Vault owner", async () => {
    const caller = appRouter.createCaller(context(user));
    await caller.vault.observe({ objectId: "object-memory-prism" });
    await caller.vault.understand({ objectId: "object-memory-prism" });
    expect(db.observeVaultObject).toHaveBeenCalledWith(7, "object-memory-prism");
    expect(db.understandVaultObject).toHaveBeenCalledWith(7, "object-memory-prism");
    expect(db.recordVaultAction).toHaveBeenCalledWith(7, "understand_object", "world_interaction", "object-memory-prism");
  });

  it("materializes a Lab result only when the current user retains creation permission", async () => {
    const caller = appRouter.createCaller(context(user));
    await caller.vault.materialize({ noteId: 4 });
    expect(db.materializeExperiment).toHaveBeenCalledWith(7, 4);
    expect(db.recordVaultAction).toHaveBeenCalledWith(7, "materialize_experiment", "the_lab", "4");
  });

  it("keeps the full clue-to-mastery sequence owner-scoped and explicit", async () => {
    const caller = appRouter.createCaller(context(user));
    await caller.vault.observe({ objectId: "object-memory-prism" });
    await caller.vault.discover({ objectId: "object-memory-prism" });
    await caller.vault.observe({ objectId: "object-echo-sigil" });
    await caller.vault.discover({ objectId: "object-echo-sigil" });
    const interpretation = await caller.vault.understand({ objectId: "object-echo-sigil" });
    await caller.vault.observe({ objectId: "object-resonance-needle" });
    await caller.vault.discover({ objectId: "object-resonance-needle" });
    await caller.vault.materialize({ noteId: 4 });

    expect(interpretation).toMatchObject({ state: "understood", unlockedObjectId: "object-resonance-needle" });
    expect(db.observeVaultObject).toHaveBeenCalledWith(7, "object-memory-prism");
    expect(db.discoverVaultObject).toHaveBeenCalledWith(7, "object-echo-sigil");
    expect(db.understandVaultObject).toHaveBeenCalledWith(7, "object-echo-sigil");
    expect(db.discoverVaultObject).toHaveBeenCalledWith(7, "object-resonance-needle");
    expect(db.materializeExperiment).toHaveBeenCalledWith(7, 4);
  });
});
