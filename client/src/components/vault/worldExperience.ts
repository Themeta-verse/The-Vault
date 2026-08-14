import type { RoomId } from "./types";

export type WorldSignal = "dormant" | "awakened" | "resonant" | "mastered";
export type ObjectInteractionStage = "approach" | "attune" | "retained";

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
