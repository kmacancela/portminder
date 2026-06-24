import { PROTECTED_PORT_LABELS } from "../data/knownPorts.js";
import { DEV_SERVER_PATTERNS, PROTECTED_PROCESS_PATTERNS } from "../data/knownProcesses.js";
import type { DetectedPort, PortMinderConfig, ProcessClassification } from "./types.js";

export function classifyProcess(
  port: Pick<DetectedPort, "port" | "processName" | "command">,
  config: PortMinderConfig,
): ProcessClassification {
  const searchable = `${port.processName ?? ""} ${port.command ?? ""}`.trim();
  const reasons: string[] = [];

  if (/\/System\/Library\/|\/usr\/libexec\/|\\Windows\\System32\\/i.test(searchable)) {
    return {
      type: "system-service",
      confidence: 0.9,
      reasons: ["command path looks like an operating system service"],
    };
  }

  for (const known of PROTECTED_PROCESS_PATTERNS) {
    if (known.pattern.test(searchable)) {
      return {
        type: known.type,
        framework: known.framework,
        confidence: 0.96,
        reasons: [known.reason],
      };
    }
  }

  const protectedPortLabel = PROTECTED_PORT_LABELS.get(port.port);
  if (protectedPortLabel && !config.common_dev_ports.includes(port.port)) {
    return {
      type: protectedPortLabel.includes("SSH") ? "ssh" : "system-service",
      framework: protectedPortLabel,
      confidence: 0.72,
      reasons: [`port ${port.port} is commonly used by ${protectedPortLabel}`],
    };
  }

  for (const known of DEV_SERVER_PATTERNS) {
    if (known.pattern.test(searchable)) {
      if (config.common_dev_ports.includes(port.port)) {
        reasons.push(`port ${port.port} is a common development port`);
      }
      return {
        type: known.type,
        framework: known.framework,
        confidence: reasons.length > 0 ? 0.94 : 0.88,
        reasons: [known.reason, ...reasons],
      };
    }
  }

  if (config.common_dev_ports.includes(port.port)) {
    return {
      type: "unknown",
      confidence: 0.25,
      reasons: [
        `port ${port.port} is a common development port, but the process is not recognized`,
      ],
    };
  }

  return {
    type: "unknown",
    confidence: 0,
    reasons: ["process does not match known development or protected service patterns"],
  };
}

export function displayClassification(classification: ProcessClassification): string {
  if (classification.framework) {
    return classification.framework;
  }

  switch (classification.type) {
    case "frontend-dev-server":
      return "frontend dev server";
    case "backend-dev-server":
      return "backend dev server";
    case "container-runtime":
      return "container runtime";
    case "reverse-proxy":
      return "reverse proxy";
    case "security-tool":
      return "security tool";
    case "system-service":
      return "system service";
    default:
      return classification.type;
  }
}
