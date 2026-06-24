import type { DetectedPort, ProcessClassification, SafetyDecision } from "./types.js";

export const UNKNOWN_CLASSIFICATION: ProcessClassification = {
  type: "unknown",
  confidence: 0,
  reasons: ["no classification has been applied"],
};

export const UNKNOWN_SAFETY: SafetyDecision = {
  status: "unknown",
  confidence: 0,
  reasons: ["no safety decision has been applied"],
  requiresConfirmation: true,
};

export function createDetectedPort(input: Partial<DetectedPort> & { port: number }): DetectedPort {
  return {
    port: input.port,
    protocol: input.protocol ?? "tcp",
    address: input.address ?? "unknown",
    pid: input.pid ?? null,
    processName: input.processName ?? null,
    command: input.command ?? null,
    user: input.user ?? null,
    cwd: input.cwd ?? null,
    parentPid: input.parentPid ?? null,
    startedAt: input.startedAt ?? null,
    classification: input.classification ?? UNKNOWN_CLASSIFICATION,
    safety: input.safety ?? UNKNOWN_SAFETY,
  };
}

export function mergeProcessDetails(
  port: DetectedPort,
  details: Partial<DetectedPort>,
): DetectedPort {
  return {
    ...port,
    processName: details.processName ?? port.processName,
    command: details.command ?? port.command,
    user: details.user ?? port.user,
    cwd: details.cwd ?? port.cwd,
    parentPid: details.parentPid ?? port.parentPid,
    startedAt: details.startedAt ?? port.startedAt,
  };
}
