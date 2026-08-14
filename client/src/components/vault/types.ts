export type RoomId = "central-chamber" | "archive" | "lab" | "observatory";
export type AriaState = "idle" | "listening" | "thinking" | "responding" | "success" | "warning" | "error";
export type VaultObjectId = "door-archive" | "door-lab" | "door-observatory" | "object-memory-prism" | "object-echo-sigil" | "object-resonance-needle" | "aria-entity";

export type InteractiveObjectDefinition = {
  id: VaultObjectId;
  type: "portal" | "artifact" | "entity";
  roomId: RoomId;
  position: [number, number, number];
  destination?: RoomId;
  locked?: boolean;
  discovered?: boolean;
  metadata: { title: string; caption: string; accent: string };
};

export type VaultState = {
  rooms: Array<{ id: string; title: string; description: string; visualTone: string; sortOrder: number }>;
  objects: Array<{ id: string; roomId: string; name: string; objectType: string; description: string; interactionHint: string; unlocksRoomId: string | null; accessibleLabel: string }>;
  artifacts: Array<{ id: string; objectId: string; title: string; subtitle: string; description: string; category: string; accent: string }>;
  roomStates: Array<{ roomId: string; isUnlocked: boolean; firstVisitedAt: Date | null; lastVisitedAt: Date | null }>;
  discoveries: Array<{ id: number; objectId: string; artifactId: string | null; discoveredAt: Date }>;
  objectStates: Array<{ objectId: string; state: "unknown" | "observed" | "interacted" | "discovered" | "understood" | "unlocked" | "mastered"; observedAt: Date | null; interactedAt: Date | null; discoveredAt: Date | null; understoodAt: Date | null; masteredAt: Date | null }>;
  relationships: Array<{ id: string; sourceObjectId: string; targetObjectId: string; relationshipType: "reveals" | "resonates_with" | "unlocks" | "interprets" | "created_from"; label: string; requiredSourceState: string }>;
  history: Array<{ id: number; eventType: string; title: string; detail: string; targetId: string | null; createdAt: Date }>;
  notes: Array<{ id: number; title: string; content: string; createdAt: Date; updatedAt: Date }>;
  creations: Array<{ id: number; sourceNoteId: number; title: string; description: string; status: "result" | "artifact"; createdAt: Date; updatedAt: Date }>;
  settings: { soundEnabled: boolean; reducedMotion: boolean; highContrast: boolean; preferFallback: boolean; renderQuality: "auto" | "high" | "low"; introSeen: boolean; lastRoomId: string } | undefined;
};

export const roomNames: Record<RoomId, string> = {
  "central-chamber": "THE VAULT",
  archive: "THE ARCHIVE",
  lab: "THE LAB",
  observatory: "THE OBSERVATORY",
};
