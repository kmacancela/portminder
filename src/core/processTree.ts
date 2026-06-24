import type { DetectedPort } from "./types.js";

export function isLikelyOrphaned(port: DetectedPort): boolean {
  return port.parentPid === 1 && port.safety.status === "safe";
}

export function hasParentDetails(port: DetectedPort): boolean {
  return port.parentPid !== null;
}
