import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  aiConversations,
  artifacts,
  discoveries,
  experimentNotes,
  InsertUser,
  rooms,
  userActions,
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
  { id: "aria-entity", roomId: "central-chamber", name: "ARIA", objectType: "entity" as const, description: "An intelligence that has learned the vault through its visitors.", interactionHint: "Speak with ARIA", accessibleLabel: "Travel to THE LAB to speak with ARIA", unlocksRoomId: null },
] as const;

const ARTIFACT_BLUEPRINT = [
  { id: "artifact-memory-prism", objectId: "object-memory-prism", title: "Memory Prism", subtitle: "First instrument of the Observatory", description: "The prism translates attention into a map. It was made for people who notice what rooms attempt to hide.", category: "Mnemonic instrument", accent: "#cdb992" },
  { id: "artifact-echo-sigil", objectId: "object-echo-sigil", title: "Echo Sigil", subtitle: "A coordinate beneath the chamber", description: "The sigil was not hidden. It waited for the chamber to have something worth reflecting back to you.", category: "Latent inscription", accent: "#8eb19d" },
] as const;

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

  await Promise.all(
    ROOM_BLUEPRINT.map(room => db.insert(userRoomStates).values({ userId, roomId: room.id, isUnlocked: room.id !== "observatory" }).onDuplicateKeyUpdate({ set: { userId } })),
  );
  await db.insert(vaultSettings).values({ userId }).onDuplicateKeyUpdate({ set: { userId } });
  await Promise.all(
    (["save_note", "aria_context", "aria_navigation"] as const).map(permission => db.insert(vaultPermissions).values({ userId, permission }).onDuplicateKeyUpdate({ set: { allowed: true } })),
  );
}

export async function getVaultState(userId: number) {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) throw new Error("The Vault's memory is temporarily unavailable.");
  const [roomList, objectList, artifactList, roomStates, discoveryList, historyList, noteList, settings] = await Promise.all([
    db.select().from(rooms).orderBy(rooms.sortOrder),
    db.select().from(vaultObjects),
    db.select().from(artifacts),
    db.select().from(userRoomStates).where(eq(userRoomStates.userId, userId)),
    db.select().from(discoveries).where(eq(discoveries.userId, userId)),
    db.select().from(vaultHistory).where(eq(vaultHistory.userId, userId)).orderBy(desc(vaultHistory.createdAt)).limit(100),
    db.select().from(experimentNotes).where(eq(experimentNotes.userId, userId)).orderBy(desc(experimentNotes.updatedAt)),
    db.select().from(vaultSettings).where(eq(vaultSettings.userId, userId)).limit(1),
  ]);
  return { rooms: roomList, objects: objectList, artifacts: artifactList, roomStates, discoveries: discoveryList, history: historyList, notes: noteList, settings: settings[0] };
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
}

export async function discoverVaultObject(userId: number, objectId: string) {
  await ensureVaultBlueprint(userId);
  const db = await getDb();
  if (!db) throw new Error("The Vault's memory is temporarily unavailable.");
  const [object] = await db.select().from(vaultObjects).where(eq(vaultObjects.id, objectId)).limit(1);
  if (!object) throw new Error("That object is not part of this Vault.");
  const previous = await db.select().from(discoveries).where(and(eq(discoveries.userId, userId), eq(discoveries.objectId, objectId))).limit(1);
  if (previous[0]) return { isNew: false, object, artifact: null, unlockedRoomId: null };
  const [artifact] = await db.select().from(artifacts).where(eq(artifacts.objectId, objectId)).limit(1);
  await db.insert(discoveries).values({ userId, objectId, artifactId: artifact?.id });
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

export async function setVaultSettings(userId: number, changes: Partial<{ soundEnabled: boolean; reducedMotion: boolean; highContrast: boolean; preferFallback: boolean; renderQuality: "auto" | "high" | "low"; introSeen: boolean }>) {
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
