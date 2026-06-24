import path from "node:path";
import { displayClassification } from "./classify.js";
import type { DetectedPort } from "./types.js";

export type ParsedTarget =
  | { kind: "port"; value: number }
  | { kind: "pid"; value: number }
  | { kind: "text"; value: string };

export function parseTarget(target: string): ParsedTarget {
  const trimmed = target.trim();
  const pidMatch = /^pid:(\d+)$/i.exec(trimmed);
  if (pidMatch?.[1]) {
    return { kind: "pid", value: Number(pidMatch[1]) };
  }
  const numeric = Number(trimmed);
  if (Number.isInteger(numeric) && numeric > 0 && numeric <= 65535) {
    return { kind: "port", value: numeric };
  }
  return { kind: "text", value: trimmed.toLowerCase() };
}

export function resolveTarget(ports: DetectedPort[], target: string): DetectedPort[] {
  const parsed = parseTarget(target);
  if (parsed.kind === "port") {
    return ports.filter((port) => port.port === parsed.value);
  }
  if (parsed.kind === "pid") {
    return ports.filter((port) => port.pid === parsed.value);
  }

  return ports.filter((port) => {
    const values = [
      port.processName,
      port.command,
      port.cwd,
      port.cwd ? path.basename(port.cwd) : null,
      port.classification.framework ?? null,
      displayClassification(port.classification),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    return values.some((value) => value.includes(parsed.value));
  });
}
