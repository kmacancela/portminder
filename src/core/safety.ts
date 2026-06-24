import os from "node:os";
import { matchesProject } from "./config.js";
import type { DetectedPort, PortMinderConfig, SafetyDecision } from "./types.js";

export function decideSafety(
  port: DetectedPort,
  config: PortMinderConfig,
  currentUser = getCurrentUser(),
): SafetyDecision {
  const reasons: string[] = [];
  const command = port.command ?? "";
  const processName = port.processName ?? "";

  if (port.pid === 1) {
    return blocked("PID 1 is a system process");
  }

  if (port.user && isPrivilegedUser(port.user)) {
    return blocked(`process is owned by privileged user ${port.user}`);
  }

  if (port.user && currentUser && !sameUser(port.user, currentUser)) {
    return blocked(`process is owned by ${port.user}, not ${currentUser}`);
  }

  if (config.protected.ports.includes(port.port)) {
    return protectedDecision(`port ${port.port} is protected by config`);
  }

  if (matchesAnyConfiguredProcess(processName, command, config.protected.processes)) {
    return protectedDecision("process matches protected config");
  }

  if (matchesProject(port.cwd, config.protected.projects)) {
    return protectedDecision("project is protected by config");
  }

  if (isProtectedClassification(port.classification.type)) {
    return protectedDecision(
      port.classification.reasons[0] ?? "process is protected by classification",
    );
  }

  if (port.parentPid === 1 && port.cwd === "/" && port.classification.type === "unknown") {
    return protectedDecision("process looks like a login or system-managed service");
  }

  if (matchesProject(port.cwd, config.safe_to_stop.projects)) {
    reasons.push("project is trusted by config");
    return safe(reasons, 0.93);
  }

  if (
    port.classification.type === "frontend-dev-server" ||
    port.classification.type === "backend-dev-server"
  ) {
    reasons.push(...port.classification.reasons);
    if (port.user && currentUser && sameUser(port.user, currentUser)) {
      reasons.push("process is owned by the current user");
    }
    return safe(reasons, Math.max(0.82, port.classification.confidence));
  }

  if (matchesAnyConfiguredCommand(command, config.safe_to_stop.commands)) {
    reasons.push("command is trusted by config");
    return safe(reasons, 0.9);
  }

  return {
    status: "unknown",
    confidence: Math.max(0.25, port.classification.confidence),
    reasons: port.classification.reasons,
    requiresConfirmation: true,
  };
}

export function getCurrentUser(): string | null {
  try {
    return os.userInfo().username;
  } catch {
    return process.env.USER ?? process.env.USERNAME ?? null;
  }
}

function safe(reasons: string[], confidence: number): SafetyDecision {
  return {
    status: "safe",
    confidence,
    reasons: reasons.length > 0 ? reasons : ["known local development server"],
    requiresConfirmation: false,
  };
}

function protectedDecision(reason: string): SafetyDecision {
  return {
    status: "protected",
    confidence: 0.96,
    reasons: [reason],
    requiresConfirmation: true,
  };
}

function blocked(reason: string): SafetyDecision {
  return {
    status: "blocked",
    confidence: 1,
    reasons: [reason],
    requiresConfirmation: true,
  };
}

function isProtectedClassification(type: DetectedPort["classification"]["type"]): boolean {
  return [
    "database",
    "cache",
    "container-runtime",
    "reverse-proxy",
    "ssh",
    "system-service",
    "security-tool",
  ].includes(type);
}

function matchesAnyConfiguredProcess(
  processName: string,
  command: string,
  configuredProcesses: string[],
): boolean {
  const haystack = `${processName} ${command}`.toLowerCase();
  return configuredProcesses.some((configured) => {
    const needle = configured.toLowerCase();
    return needle.length > 0 && haystack.includes(needle);
  });
}

function matchesAnyConfiguredCommand(command: string, configuredCommands: string[]): boolean {
  const lowerCommand = command.toLowerCase();
  return configuredCommands.some((configured) => {
    const lowerConfigured = configured.toLowerCase();
    return lowerConfigured.length > 0 && lowerCommand.includes(lowerConfigured);
  });
}

function isPrivilegedUser(user: string): boolean {
  const normalized = user.toLowerCase();
  return normalized === "root" || normalized === "administrator" || normalized === "system";
}

function sameUser(left: string, right: string): boolean {
  const normalize = (value: string) =>
    value.toLowerCase().split(/[\\/]/).at(-1) ?? value.toLowerCase();
  return normalize(left) === normalize(right);
}
