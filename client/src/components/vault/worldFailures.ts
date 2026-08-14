export type WorldFailureKind = "state" | "aria" | "settings";

const failureCopy: Record<WorldFailureKind, string> = {
  state: "THE VAULT COULD NOT BE OPENED. YOUR DISCOVERIES REMAIN SAFE. REFRESH, THEN TRY AGAIN.",
  aria: "ARIA'S SIGNAL IS QUIET. YOUR QUESTION WAS NOT CHANGED. TRY AGAIN WHEN THE CHAMBER SETTLES.",
  settings: "THE ENVIRONMENT COULD NOT RETAIN THAT PREFERENCE. YOUR CURRENT WORLD REMAINS UNCHANGED.",
};

export function getWorldFailureCopy(kind: WorldFailureKind) {
  return failureCopy[kind];
}
