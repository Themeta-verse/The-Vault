import type { RoomId } from "./types";

export type WorldSignal = "dormant" | "awakened" | "resonant" | "mastered";

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

export function getChamberGuidance(signal: WorldSignal, isReturnVisit: boolean) {
  if (isReturnVisit) return "The chamber has rearranged its signals for your return.";
  if (signal === "mastered") return "The circuit is closed. Your creation has changed the chamber.";
  if (signal === "resonant") return "An echo points toward the suspended resonance.";
  if (signal === "awakened") return "The Prism has altered the routes through the Vault.";
  return "Move toward the object that answers your attention.";
}
