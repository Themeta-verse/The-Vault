import type { InteractiveObjectDefinition } from "./types";

export const centralChamberObjects: InteractiveObjectDefinition[] = [
  { id: "door-archive", type: "portal", roomId: "central-chamber", position: [-6.5, 2.4, -3.6], destination: "archive", metadata: { title: "THE ARCHIVE", caption: "THRESHOLD", accent: "#c4a668" } },
  { id: "door-lab", type: "portal", roomId: "central-chamber", position: [6.5, 2.4, -3.6], destination: "lab", metadata: { title: "THE LAB", caption: "THRESHOLD", accent: "#89608d" } },
  { id: "door-observatory", type: "portal", roomId: "central-chamber", position: [0, 4, -8], destination: "observatory", metadata: { title: "THE OBSERVATORY", caption: "THRESHOLD", accent: "#67a38b" } },
  { id: "object-memory-prism", type: "artifact", roomId: "central-chamber", position: [0, 1.35, 0], metadata: { title: "MEMORY PRISM", caption: "UNRESOLVED", accent: "#d6c08a" } },
  { id: "object-echo-sigil", type: "artifact", roomId: "central-chamber", position: [-3.6, 3.45, 1.3], metadata: { title: "ECHO SIGIL", caption: "UNEXPECTED SIGNAL", accent: "#a9ceb6" } },
  { id: "aria-entity", type: "entity", roomId: "central-chamber", position: [3.6, 0, 1.4], destination: "lab", metadata: { title: "ARIA", caption: "INTELLIGENCE", accent: "#bc8bd0" } },
];
