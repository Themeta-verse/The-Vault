import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const rooms = mysqlTable("rooms", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: varchar("title", { length: 96 }).notNull(),
  description: text("description").notNull(),
  visualTone: varchar("visualTone", { length: 32 }).notNull(),
  sortOrder: int("sortOrder").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const vaultObjects = mysqlTable("vaultObjects", {
  id: varchar("id", { length: 64 }).primaryKey(),
  roomId: varchar("roomId", { length: 64 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  objectType: mysqlEnum("objectType", ["artifact", "door", "entity", "terminal", "unknown"]).notNull(),
  description: text("description").notNull(),
  interactionHint: varchar("interactionHint", { length: 180 }).notNull(),
  unlocksRoomId: varchar("unlocksRoomId", { length: 64 }),
  accessibleLabel: varchar("accessibleLabel", { length: 180 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const artifacts = mysqlTable("artifacts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  objectId: varchar("objectId", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 120 }).notNull(),
  subtitle: varchar("subtitle", { length: 160 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 48 }).notNull(),
  accent: varchar("accent", { length: 16 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userRoomStates = mysqlTable(
  "userRoomStates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    roomId: varchar("roomId", { length: 64 }).notNull(),
    isUnlocked: boolean("isUnlocked").default(false).notNull(),
    firstVisitedAt: timestamp("firstVisitedAt"),
    lastVisitedAt: timestamp("lastVisitedAt"),
  },
  table => [uniqueIndex("user_room_unique").on(table.userId, table.roomId)],
);

export const discoveries = mysqlTable(
  "discoveries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    objectId: varchar("objectId", { length: 64 }).notNull(),
    artifactId: varchar("artifactId", { length: 64 }),
    discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("user_object_discovery_unique").on(table.userId, table.objectId)],
);

export const userObjectStates = mysqlTable(
  "userObjectStates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    objectId: varchar("objectId", { length: 64 }).notNull(),
    state: mysqlEnum("state", ["unknown", "observed", "interacted", "discovered", "understood", "unlocked", "mastered"]).default("unknown").notNull(),
    observedAt: timestamp("observedAt"),
    interactedAt: timestamp("interactedAt"),
    discoveredAt: timestamp("discoveredAt"),
    understoodAt: timestamp("understoodAt"),
    masteredAt: timestamp("masteredAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("user_object_state_unique").on(table.userId, table.objectId)],
);

export const objectRelationships = mysqlTable(
  "objectRelationships",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    sourceObjectId: varchar("sourceObjectId", { length: 64 }).notNull(),
    targetObjectId: varchar("targetObjectId", { length: 64 }).notNull(),
    relationshipType: mysqlEnum("relationshipType", ["reveals", "resonates_with", "unlocks", "interprets", "created_from"]).notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    requiredSourceState: mysqlEnum("requiredSourceState", ["unknown", "observed", "interacted", "discovered", "understood", "unlocked", "mastered"]).default("discovered").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("object_relationship_unique").on(table.sourceObjectId, table.targetObjectId, table.relationshipType)],
);

export const vaultHistory = mysqlTable("vaultHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: mysqlEnum("eventType", ["entry", "discovery", "visit", "note", "conversation", "unlock", "setting"]).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  detail: text("detail").notNull(),
  targetId: varchar("targetId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const experimentNotes = mysqlTable("experimentNotes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userCreations = mysqlTable("userCreations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sourceNoteId: int("sourceNoteId").notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["result", "artifact"]).default("result").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("user_creation_source_note_unique").on(table.userId, table.sourceNoteId)]);

export const aiConversations = mysqlTable("aiConversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  roomId: varchar("roomId", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["user", "aria"]).notNull(),
  content: text("content").notNull(),
  actionType: varchar("actionType", { length: 64 }),
  actionPayload: text("actionPayload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userActions = mysqlTable("userActions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  actionType: varchar("actionType", { length: 64 }).notNull(),
  source: varchar("source", { length: 64 }).notNull(),
  targetId: varchar("targetId", { length: 64 }),
  payload: text("payload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const vaultSettings = mysqlTable("vaultSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  soundEnabled: boolean("soundEnabled").default(false).notNull(),
  ambientVolume: int("ambientVolume").default(38).notNull(),
  interactionVolume: int("interactionVolume").default(62).notNull(),
  reducedMotion: boolean("reducedMotion").default(false).notNull(),
  highContrast: boolean("highContrast").default(false).notNull(),
  preferFallback: boolean("preferFallback").default(false).notNull(),
  renderQuality: mysqlEnum("renderQuality", ["auto", "high", "low"]).default("auto").notNull(),
  introSeen: boolean("introSeen").default(false).notNull(),
  lastRoomId: varchar("lastRoomId", { length: 64 }).default("central-chamber").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const vaultPermissions = mysqlTable(
  "vaultPermissions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    permission: mysqlEnum("permission", ["save_note", "aria_context", "aria_navigation"]).notNull(),
    allowed: boolean("allowed").default(true).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("user_permission_unique").on(table.userId, table.permission)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
