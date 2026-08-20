import type { RoomId } from "./types";

export type WorldSignal = "dormant" | "awakened" | "resonant" | "mastered";
export type ObjectInteractionStage = "approach" | "attune" | "retained";
export type HandsetGuideStage = "attention" | "retain" | "north" | "complete" | "dismissed";
export type ObservatoryEra = "founding" | "returning";

const objectStateRank: Record<string, number> = { unknown: 0, observed: 1, interacted: 2, discovered: 3, understood: 4, unlocked: 5, mastered: 6 };

/**
 * The server reconciles this invariant durably. This client safeguard keeps a
 * just-returned or legacy record visually truthful while the normalized state
 * response is being persisted: a discovery is always at least discovered.
 */
export function getRetainedObjectStates(objectStates: Record<string, string>, discoveredObjectIds: string[]) {
  const retained = { ...objectStates };
  for (const objectId of discoveredObjectIds) {
    if ((objectStateRank[retained[objectId] ?? "unknown"] ?? 0) < objectStateRank.discovered) retained[objectId] = "discovered";
  }
  return retained;
}

export function shouldEnterPersistentWorld(entered: boolean, introSeen: boolean) {
  return entered || introSeen;
}

export function getWorldSignal(objectStates: Record<string, string>): WorldSignal {
  if (objectStates["object-resonance-needle"] === "mastered") return "mastered";
  if (objectStates["object-echo-sigil"] === "understood") return "resonant";
  if (["discovered", "understood", "unlocked", "mastered"].includes(objectStates["object-memory-prism"] ?? "unknown")) return "awakened";
  return "dormant";
}

export function canEnterWorldRoom(room: RoomId, unlockedRoomIds: string[]) {
  return room === "central-chamber" || unlockedRoomIds.includes(room);
}

export function getObjectInteractionCue(state?: string): { stage: ObjectInteractionStage; caption: string; prompt: string } {
  if (["discovered", "understood", "unlocked", "mastered"].includes(state ?? "unknown")) return { stage: "retained", caption: "RETAINED", prompt: "The Prism is held in your record. Follow the reply it left in the chamber." };
  if (["observed", "interacted"].includes(state ?? "unknown")) return { stage: "attune", caption: "ATTUNED — RETURN", prompt: "The signal has noticed you. Approach it once more to retain its trace." };
  return { stage: "approach", caption: "UNRESOLVED", prompt: "Approach the unresolved Prism. Its first response is quiet." };
}

export function getChamberGuidance(signal: WorldSignal, isReturnVisit: boolean) {
  const remembered = isReturnVisit ? "The chamber kept your route. " : "";
  if (signal === "mastered") return `${remembered}The circuit is closed. Your creation has changed the chamber.`;
  if (signal === "resonant") return `${remembered}The Echo is understood. Follow the suspended resonance.`;
  if (signal === "awakened") return `${remembered}The Prism left a reply in the west buttress. Seek the Echo Sigil.`;
  return `${remembered}Approach the unresolved Prism. Its first response is quiet.`;
}

export function getHandsetGuide(stage: HandsetGuideStage, prismState: string | undefined, observatoryUnlocked: boolean, establishedVisitor: boolean) {
  if (stage === "complete" || stage === "dismissed" || establishedVisitor) return null;
  const prismRank = objectStateRank[prismState ?? "unknown"] ?? 0;
  if (prismRank < objectStateRank.observed) return { stage: "attention" as const, marker: "1 / 3", prompt: "Attend the datum. Touch the Memory Prism and wait for its answer.", actionLabel: "Attend the Prism" };
  if (prismRank < objectStateRank.discovered) return { stage: "retain" as const, marker: "2 / 3", prompt: "Retain the signal. Attend the Prism again to keep its route.", actionLabel: "Retain the signal" };
  if (observatoryUnlocked) return { stage: "north" as const, marker: "3 / 3", prompt: "Trace north. Enter THE OBSERVATORY; the record will take a second form.", actionLabel: "Enter Observatory" };
  return null;
}

export function canReadReturningRegister(discoveryCount: number) {
  return discoveryCount >= 2;
}
