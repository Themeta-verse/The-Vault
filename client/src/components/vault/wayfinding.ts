export type WorldSignal = "dormant" | "awakened" | "resonant" | "mastered";

export type WayfindingVector = {
  position: [number, number, number];
  label: string;
  mode: "next" | "return";
};

export function getWayfindingVector(worldSignal: WorldSignal, isReturnVisit: boolean): WayfindingVector {
  const base = worldSignal === "mastered"
    ? { position: [0, 4.7, -7.2] as [number, number, number], label: "TRACE THE OBSERVATORY" }
    : worldSignal === "resonant"
      ? { position: [-3.6, 4.2, 1.3] as [number, number, number], label: "FOLLOW THE RESONANCE" }
      : worldSignal === "awakened"
        ? { position: [0, 2.45, 0] as [number, number, number], label: "REVISIT THE PRISM" }
        : { position: [0, 2.45, 0] as [number, number, number], label: "BEGIN WITH THE PRISM" };
  return { ...base, mode: isReturnVisit ? "return" : "next" };
}
