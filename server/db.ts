import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  aiConversations,
  artifacts,
  discoveries,
  experimentNotes,
  InsertUser,
  objectRelationships,
  rooms,
  userActions,
  userCreations,
  userObjectStates,
  userRoomStates,
  users,
  vaultHistory,
  vaultObjects,
  vaultPermissions,
  vaultSettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

const ROOM_BLUEPRINT = [
  { id: "central-chamber", title: "THE VAULT", description: "The central chamber remembers each decision made within it.", visualTone: "amber", sortOrder: 0 },
  { id: "archive", title: "THE ARCHIVE", description: "A living catalog of artifacts you have chosen to understand.", visualTone: "bone", sortOrder: 1 },
  { id: "lab", title: "THE LAB", description: "A quiet workshop where ARIA helps shape fragments into experiments.", visualTone: "violet", sortOrder: 2 },
  { id: "observatory", title: "THE OBSERVATORY", description: "A spatial record of the paths and connections you have made.", visualTone: "verdigris", sortOrder: 3 },
] as const;

const OBJECT_BLUEPRINT = [
  { id: "door-archive", roomId: "central-chamber", name: "Archive Threshold", objectType: "door" as const, description: "A monolithic aperture, held open by attention.", interactionHint: "Enter the Archive", accessibleLabel: "Open the door to THE ARCHIVE", unlocksRoomId: "archive" },
  { id: "door-lab", roomId: "central-chamber", name: "Lab Threshold", objectType: "door" as const, description: "A violet seam in stone, alive with unfinished questions.", interactionHint: "Enter the Lab", accessibleLabel: "Open the door to THE LAB", unlocksRoomId: "lab" },
  { id: "door-observatory", roomId: "central-chamber", name: "Observatory Threshold", objectType: "door" as const, description: "A sealed circle that listens for a remembered signal.", interactionHint: "Requires the Memory Prism", accessibleLabel: "Inspect the locked door to THE OBSERVATORY", unlocksRoomId: "observatory" },
  { id: "object-memory-prism", roomId: "central-chamber", name: "Memory Prism", objectType: "artifact" as const, description: "A suspended instrument that records not what happened, but what was noticed.", interactionHint: "Examine the prism", accessibleLabel: "Examine the Memory Prism and unlock the Observatory", unlocksRoomId: "observatory" },
  { id: "object-echo-sigil", roomId: "central-chamber", name: "Echo Sigil", objectType: "artifact" as const, description: "A mark that appears only after the chamber has remembered you. It contains an unfinished coordinate.", interactionHint: "Trace the hidden sigil", accessibleLabel: "Trace the hidden Echo Sigil", unlocksRoomId: null },
  { id: "object-resonance-needle", roomId: "central-chamber", name: "Resonance Needle", objectType: "artifact" as const, description: "A fine instrument revealed when a remembered signal is answered with an act of creation.", interactionHint: "Align the needle", accessibleLabel: "Inspect the Resonance Needle after following the chamber's linked clues", unlocksRoomId: null },
  { id: "object-palimpsest-lens", roomId: "archive", name: "Palimpsest Lens", objectType: "artifact" as const, description: "A faceted lens that allows one retained record to be read inside another. Its surfaces keep rearranging the Archive's margins.", interactionHint: "Settle the lens into the Archive light", accessibleLabel: "Examine the Palimpsest Lens in THE ARCHIVE", unlocksRoomId: null },
  { id: "object-quiet-cistern", roomId: "lab", name: "Quiet Cistern", objectType: "artifact" as const, description: "A sealed vessel that absorbs unfinished questions and returns their outline as a low, clear tone.", interactionHint: "Listen at the cistern", accessibleLabel: "Examine the Quiet Cistern in THE LAB", unlocksRoomId: null },
  { id: "object-astral-index", roomId: "observatory", name: "Astral Index", objectType: "terminal" as const, description: "A suspended index of routes that only acquires entries when a discovery is carried between rooms.", interactionHint: "Read the living index", accessibleLabel: "Examine the Astral Index in THE OBSERVATORY", unlocksRoomId: null },
  { id: "aria-entity", roomId: "central-chamber", name: "ARIA", objectType: "entity" as const, description: "An intelligence that has learned the vault through its visitors.", interactionHint: "Speak with ARIA", accessibleLabel: "Travel to THE LAB to speak with ARIA", unlocksRoomId: null },
] as const;

const ARTIFACT_BLUEPRINT = [
  { id: "artifact-memory-prism", objectId: "object-memory-prism", title: "Memory Prism", subtitle: "First instrument of the Observatory", description: "The prism translates attention into a map. It was made for people who notice what rooms attempt to hide.", category: "Mnemonic instrument", accent: "#cdb992" },
  { id: "artifact-echo-sigil", objectId: "object-echo-sigil", title: "Echo Sigil", subtitle: "A coordinate beneath the chamber", description: "The sigil was not hidden. It waited for the chamber to have something worth reflecting back to you.", category: "Latent inscription", accent: "#8eb19d" },
  { id: "artifact-resonance-needle", objectId: "object-resonance-needle", title: "Resonance Needle", subtitle: "A reward for joining memory to creation", description: "The needle points not to a place, but to the relationship between what you noticed and what you chose to make of it.", category: "Relational instrument", accent: "#b889d1" },
  { id: "artifact-palimpsest-lens", objectId: "object-palimpsest-lens", title: "Palimpsest Lens", subtitle: "Archive instrument for layered records", description: "The lens draws a second line through any memory you have already kept. In its glass, the Prism's signal becomes a readable margin.", category: "Archive optic", accent: "#d2b879" },
  { id: "artifact-quiet-cistern", objectId: "object-quiet-cistern", title: "Quiet Cistern", subtitle: "Lab vessel for unfinished signals", description: "The cistern does not answer a question. It removes the noise around it until the next relationship can be heard.", category: "Resonant vessel", accent: "#8db9b2" },
  { id: "artifact-astral-index", objectId: "object-astral-index", title: "Astral Index", subtitle: "Observatory register of carried discoveries", description: "Each entry is a route made deliberate: a record moved from attention to understanding, then carried somewhere else.", category: "Living register", accent: "#9fb9e3" },
] as const;

const RELATIONSHIP_BLUEPRINT = [
  { id: "rel-prism-reveals-echo", sourceObjectId: "object-memory-prism", targetObjectId: "object-echo-sigil", relationshipType: "reveals" as const, label: "The Prism leaves an echo in the west buttress.", requiredSourceState: "discovered" as const },
  { id: "rel-echo-resonates-aria", sourceObjectId: "object-echo-sigil", targetObjectId: "aria-entity", relationshipType: "resonates_with" as const, label: "ARIA can interpret a signal the Sigil has made visible.", requiredSourceState: "discovered" as const },
  { id: "rel-echo-reveals-needle", sourceObjectId: "object-echo-sigil", targetObjectId: "object-resonance-needle", relationshipType: "reveals" as const, label: "A completed circuit through Archive and Lab exposes the Needle.", requiredSourceState: "understood" as const },
  { id: "rel-prism-reveals-lens", sourceObjectId: "object-memory-prism", targetObjectId: "object-palimpsest-lens", relationshipType: "reveals" as const, label: "The Prism leaves a second reading in the Archive: the Palimpsest Lens.", requiredSourceState: "discovered" as const },
  { id: "rel-lens-interprets-sigil", sourceObjectId: "object-palimpsest-lens", targetObjectId: "object-echo-sigil", relationshipType: "interprets" as const, label: "The Lens gives the Sigil's coordinate a readable margin.", requiredSourceState: "understood" as const },
  { id: "rel-needle-resonates-cistern", sourceObjectId: "object-resonance-needle", targetObjectId: "object-quiet-cistern", relationshipType: "resonates_with" as const, label: "The Needle tunes the Quiet Cistern to a question that can remain unfinished.", requiredSourceState: "discovered" as const },
  { id: "rel-cistern-reveals-index", sourceObjectId: "object-quiet-cistern", targetObjectId: "object-astral-index", relationshipType: "reveals" as const, label: "A quieted signal appears in the Observatory as a new Astral Index entry.", requiredSourceState: "understood" as const },
] as const;

const OBJECT_STATE_RANK = { unknown: 0, observed: 1, interacted: 2, discovered: 3, understood: 4, unlocked: 5, mastered: 6 } as const;
type ObjectState = keyof typeof OBJECT_STATE_RANK;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function ensureVaultBlueprint(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("The Vault's memory is temporarily unavailable. Your next action was not recorded.");

  await Promise.all(
    ROOM_BLUEPRINT.map(room => db.insert(rooms).values(room).onDuplicateKeyUpdate({ set: { title: room.title, description: room.description, visualTone: room.visualTone, sortOrder: room.sortOrder } })),
  );
  await Promise.all(
    OBJECT_BLUEPRINT.map(object => db.insert(vaultObjects).values(object).onDuplicateKeyUpdate({ set: { name: object.name, description: object.description, interactionHint: object.interactionHint, accessibleLabel: object.accessibleLabel, unlocksRoomId: object.unlocksRoomId } })),
  );
  await Promise.all(ARTIFACT_BLUEPRINT.map(artifact => db.insert(artifacts).values(artifact).onDuplicateKeyUpdate({ set: { title: artifact.title, subtitle: artifact.subtitle, description: artifact.description, category: artifact.category, accent: artifact.accent } })));
  await Promise.all(RELATIONSHIP_BLUEPRINT.map(relationship => db.insert(objectRelationships).values(relationship).onDuplicateKeyUpdate({ set: { label: relationship.label, requiredSourceState: relationship.requiredSourceState } })));

  await Promise.all(
    ROOM_BLUEPRINT.map(room => db.insert(userRoomStates).values({ userId, roomId: room.id, isUnlocked: room.id !== "observatory" }).onDuplicateKeyUpdate({ set: { userId } })),
  );
  await Promise.all(OBJECT_BLUEPRINT.map(object => db.insert(userObjectStates).values({ userId, objectId: object.id }).onDuplicateKeyUpdate({ set: { userId } })));
  await db.insert(vaultSettings).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  await Promise.all(
    (["save_note", "aria_context", "aria_navigation"] as const).map(permission => db.insert(vaultPermissions).values({ userId, permission }).onDuplicateKeyUpdate({ set: { allowed: true } })),
  );
}

export async function getVaultState(userId: number) {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) throw new Error("The Vault's memory is temporarily unavailable.");
  const [roomList, objectList, artifactList, roomStates, discoveryList, objectStates, relationshipList, historyList, noteList, creationList, settings] = await Promise.all([
    db.select().from(rooms).orderBy(rooms.sortOrder),
    db.select().from(vaultObjects),
    db.select().from(artifacts),
    db.select().from(userRoomStates).where(eq(userRoomStates.userId, userId)),
    db.select().from(discoveries).where(eq(discoveries.userId, userId)),
    db.select().from(userObjectStates).where(eq(userObjectStates.userId, userId)),
    db.select().from(objectRelationships),
    db.select().from(vaultHistory).where(eq(vaultHistory.userId, userId)).orderBy(desc(vaultHistory.createdAt)).limit(100),
    db.select().from(experimentNotes).where(eq(experimentNotes.userId, userId)).orderBy(desc(experimentNotes.updatedAt)),
    db.select().from(userCreations).where(eq(userCreations.userId, userId)).orderBy(desc(userCreations.updatedAt)),
    db.select().from(vaultSettings).where(eq(vaultSettings.userId, userId)).limit(1),
  ]);
  const objectStateById = new Map(objectStates.map(entry => [entry.objectId, entry.state as ObjectState]));
  const relationships = relationshipList.filter(relationship => OBJECT_STATE_RANK[objectStateById.get(relationship.sourceObjectId) ?? "unknown"] >= OBJECT_STATE_RANK[relationship.requiredSourceState as ObjectState]);
  return { rooms: roomList, objects: objectList, artifacts: artifactList, roomStates, discoveries: discoveryList, objectStates, relationships, history: historyList, notes: noteList, creations: creationList, settings: settings[0] };
}

async function getObjectState(userId: number, objectId: string) {
  const db = await getDb();
  if (!db) throw new Error("The Vault's memory is temporarily unavailable.");
  const [record] = await db.select().from(userObjectStates).where(and(eq(userObjectStates.userId, userId), eq(userObjectStates.objectId, objectId))).limit(1);
  return record;
}

async function advanceObjectState(userId: number, objectId: string, nextState: ObjectState) {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) throw new Error("The Vault's memory is temporarily unavailable.");
  const record = await getObjectState(userId, objectId);
  const currentState = (record?.state ?? "unknown") as ObjectState;
  if (OBJECT_STATE_RANK[nextState] <= OBJECT_STATE_RANK[currentState]) return currentState;
  const now = new Date();
  const timestamps: Partial<Record<"observedAt" | "interactedAt" | "discoveredAt" | "understoodAt" | "masteredAt", Date>> = {};
  if (nextState === "observed") timestamps.observedAt = now;
  if (nextState === "interacted") timestamps.interactedAt = now;
  if (nextState === "discovered") timestamps.discoveredAt = now;
  if (nextState === "understood") timestamps.understoodAt = now;
  if (nextState === "mastered") timestamps.masteredAt = now;
  await db.update(userObjectStates).set({ state: nextState, ...timestamps }).where(and(eq(userObjectStates.userId, userId), eq(userObjectStates.objectId, objectId)));
  return nextState;
}

async function assertDiscoveryPrerequisite(userId: number, objectId: string) {
  if (objectId === "object-echo-sigil") {
    const prism = await getObjectState(userId, "object-memory-prism");
    if (OBJECT_STATE_RANK[(prism?.state ?? "unknown") as ObjectState] < OBJECT_STATE_RANK.discovered) throw new Error("The sigil has not yet received a signal. Begin with the Memory Prism.");
  }
  if (objectId === "object-resonance-needle") {
    const echo = await getObjectState(userId, "object-echo-sigil");
    const db = await getDb();
    if (!db) throw new Error("The Vault's memory is temporarily unavailable.");
    const visits = await db.select().from(userRoomStates).where(eq(userRoomStates.userId, userId));
    const completedCircuit = ["archive", "lab"].every(roomId => visits.find(entry => entry.roomId === roomId)?.firstVisitedAt);
    if (OBJECT_STATE_RANK[(echo?.state ?? "unknown") as ObjectState] < OBJECT_STATE_RANK.understood || !completedCircuit) throw new Error("The Needle requires a completed circuit: understand the Sigil, then return through both THE ARCHIVE and THE LAB.");
  }
  if (objectId === "object-palimpsest-lens") {
    const prism = await getObjectState(userId, "object-memory-prism");
    if (OBJECT_STATE_RANK[(prism?.state ?? "unknown") as ObjectState] < OBJECT_STATE_RANK.discovered) throw new Error("The Lens cannot hold a reading until the Memory Prism has been retained.");
  }
  if (objectId === "object-quiet-cistern") {
    const lens = await getObjectState(userId, "object-palimpsest-lens");
    if (OBJECT_STATE_RANK[(lens?.state ?? "unknown") as ObjectState] < OBJECT_STATE_RANK.understood) throw new Error("The Cistern needs the Palimpsest Lens to make the Archive signal legible.");
  }
  if (objectId === "object-astral-index") {
    const cistern = await getObjectState(userId, "object-quiet-cistern");
    if (OBJECT_STATE_RANK[(cistern?.state ?? "unknown") as ObjectState] < OBJECT_STATE_RANK.understood) throw new Error("The Astral Index is waiting for a quieted Lab signal.");
  }
}

export async function observeVaultObject(userId: number, objectId: string) {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) throw new Error("The Vault's memory is temporarily unavailable.");
  const [object] = await db.select().from(vaultObjects).where(eq(vaultObjects.id, objectId)).limit(1);
  if (!object) throw new Error("That object is not part of this Vault.");
  const state = await advanceObjectState(userId, objectId, "observed");
  return { object, state };
}

export async function understandVaultObject(userId: number, objectId: string) {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) throw new Error("The Vault's memory is temporarily unavailable.");
  const current = await getObjectState(userId, objectId);
  if (OBJECT_STATE_RANK[(current?.state ?? "unknown") as ObjectState] < OBJECT_STATE_RANK.discovered) throw new Error("Understanding follows discovery. Stay with the object a little longer.");
  if (objectId === "object-echo-sigil") {
    const ariaMessages = await getAriaMessages(userId);
    if (!ariaMessages.some(message => message.role === "aria")) throw new Error("ARIA has not yet helped you interpret this signal. Bring the Sigil to THE LAB.");
  }
  const state = await advanceObjectState(userId, objectId, "understood");
  let unlockedObjectId: string | null = null;
  if (objectId === "object-echo-sigil") {
    await advanceObjectState(userId, "object-resonance-needle", "unlocked");
    unlockedObjectId = "object-resonance-needle";
  }
  await db.insert(vaultHistory).values({ userId, eventType: "discovery", title: `Understood: ${objectId === "object-echo-sigil" ? "Echo Sigil" : "Memory Prism"}`, detail: "A relationship in the Vault has become legible.", targetId: objectId });
  return { state, unlockedObjectId };
}

export async function markRoomVisited(userId: number, roomId: string) {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) throw new Error("The Vault's memory is temporarily unavailable.");
  const state = await db.select().from(userRoomStates).where(and(eq(userRoomStates.userId, userId), eq(userRoomStates.roomId, roomId))).limit(1);
  if (!state[0]?.isUnlocked) throw new Error("This threshold is still sealed. Follow the chamber's clues first.");
  const now = new Date();
  await db.update(userRoomStates).set({ firstVisitedAt: state[0].firstVisitedAt ?? now, lastVisitedAt: now }).where(eq(userRoomStates.id, state[0].id));
  await db.update(vaultSettings).set({ lastRoomId: roomId }).where(eq(vaultSettings.userId, userId));
  await db.insert(vaultHistory).values({ userId, eventType: "visit", title: `Entered ${roomId === "central-chamber" ? "THE VAULT" : roomId === "archive" ? "THE ARCHIVE" : roomId === "lab" ? "THE LAB" : "THE OBSERVATORY"}`, detail: "The room acknowledged your return.", targetId: roomId });
  if (roomId === "observatory") {
    const prism = await getObjectState(userId, "object-memory-prism");
    if (OBJECT_STATE_RANK[(prism?.state ?? "unknown") as ObjectState] >= OBJECT_STATE_RANK.discovered) await advanceObjectState(userId, "object-memory-prism", "understood");
  }
}

export async function discoverVaultObject(userId: number, objectId: string) {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) throw new Error("The Vault's memory is temporarily unavailable.");
  const [object] = await db.select().from(vaultObjects).where(eq(vaultObjects.id, objectId)).limit(1);
  if (!object) throw new Error("That object is not part of this Vault.");
  await assertDiscoveryPrerequisite(userId, objectId);
  const previous = await db.select().from(discoveries).where(and(eq(discoveries.userId, userId), eq(discoveries.objectId, objectId))).limit(1);
  if (previous[0]) return { isNew: false, object, artifact: null, unlockedRoomId: null };
  const [artifact] = await db.select().from(artifacts).where(eq(artifacts.objectId, objectId)).limit(1);
  await advanceObjectState(userId, objectId, "interacted");
  await db.insert(discoveries).values({ userId, objectId, artifactId: artifact?.id });
  await advanceObjectState(userId, objectId, "discovered");
  await db.insert(vaultHistory).values({ userId, eventType: "discovery", title: `Discovered: ${object.name}`, detail: object.description, targetId: object.id });
  if (object.unlocksRoomId) {
    await db.update(userRoomStates).set({ isUnlocked: true }).where(and(eq(userRoomStates.userId, userId), eq(userRoomStates.roomId, object.unlocksRoomId)));
    await db.insert(vaultHistory).values({ userId, eventType: "unlock", title: `Threshold unsealed: ${object.unlocksRoomId === "observatory" ? "THE OBSERVATORY" : object.unlocksRoomId}`, detail: "A new room has entered your possible routes.", targetId: object.unlocksRoomId });
  }
  return { isNew: true, object, artifact: artifact ?? null, unlockedRoomId: object.unlocksRoomId };
}

export async function saveExperimentNote(userId: number, title: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error("The Lab could not preserve this note. Please try again.");
  await ensureVaultBlueprint(userId);
  const result = await db.insert(experimentNotes).values({ userId, title, content });
  await db.insert(vaultHistory).values({ userId, eventType: "note", title: `Experiment recorded: ${title}`, detail: "A new fragment was placed in THE LAB.", targetId: String(result[0].insertId) });
  return result[0].insertId;
}

export async function materializeExperiment(userId: number, noteId: number) {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) throw new Error("The Lab could not materialize this result. Please try again.");
  const [note] = await db.select().from(experimentNotes).where(and(eq(experimentNotes.id, noteId), eq(experimentNotes.userId, userId))).limit(1);
  if (!note) throw new Error("That experiment does not belong to this Vault.");
  await db.insert(userCreations).values({ userId, sourceNoteId: note.id, title: note.title, description: note.content, status: "artifact" }).onDuplicateKeyUpdate({ set: { title: note.title, description: note.content, status: "artifact" } });
  const [creation] = await db.select().from(userCreations).where(and(eq(userCreations.userId, userId), eq(userCreations.sourceNoteId, note.id))).limit(1);
  const needle = await getObjectState(userId, "object-resonance-needle");
  if (OBJECT_STATE_RANK[(needle?.state ?? "unknown") as ObjectState] >= OBJECT_STATE_RANK.discovered) await advanceObjectState(userId, "object-resonance-needle", "mastered");
  await db.insert(vaultHistory).values({ userId, eventType: "note", title: `Artifact materialized: ${note.title}`, detail: "A Lab result entered the Archive as a persistent creation.", targetId: `creation-${creation?.id}` });
  return creation;
}

export async function setVaultSettings(userId: number, changes: Partial<{ soundEnabled: boolean; ambientVolume: number; interactionVolume: number; reducedMotion: boolean; highContrast: boolean; preferFallback: boolean; renderQuality: "auto" | "high" | "low"; introSeen: boolean }>) {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) throw new Error("Settings could not be saved. Please try again.");
  await db.update(vaultSettings).set(changes).where(eq(vaultSettings.userId, userId));
  await db.insert(vaultHistory).values({ userId, eventType: "setting", title: "Environment preferences updated", detail: "The Vault adapted to your chosen conditions." });
}

export async function recordVaultAction(userId: number, actionType: string, source: string, targetId?: string, payload?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userActions).values({ userId, actionType, source, targetId, payload });
}

export async function hasVaultPermission(userId: number, permission: "save_note" | "aria_context" | "aria_navigation") {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) return false;
  const [record] = await db.select().from(vaultPermissions).where(and(eq(vaultPermissions.userId, userId), eq(vaultPermissions.permission, permission))).limit(1);
  return record?.allowed === true;
}

export async function getAriaMessages(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiConversations).where(eq(aiConversations.userId, userId)).orderBy(desc(aiConversations.createdAt)).limit(30);
}

export async function recordAriaMessage(userId: number, roomId: string, role: "user" | "aria", content: string, actionType?: string, actionPayload?: string) {
  const db = await getDb();
  if (!db) throw new Error("ARIA is temporarily beyond reach. Your message was not sent.");
  await db.insert(aiConversations).values({ userId, roomId, role, content, actionType, actionPayload });
  await db.insert(vaultHistory).values({ userId, eventType: "conversation", title: role === "user" ? "You addressed ARIA" : "ARIA replied", detail: content.slice(0, 280), targetId: "aria-entity" });
}
