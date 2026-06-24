import path from "node:path";
import { compactHome } from "./config.js";
import { displayClassification } from "./classify.js";
import type { DetectedPort } from "./types.js";

export interface CleanupPlan {
  safeToStop: DetectedPort[];
  preserved: DetectedPort[];
}

export function jsonOutput(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function formatPortTable(ports: DetectedPort[]): string {
  if (ports.length === 0) {
    return "Active local services\n\nNo listening ports found.\n";
  }

  const rows = ports
    .slice()
    .sort((a, b) => a.port - b.port)
    .map((port) => [
      String(port.port),
      port.protocol,
      truncate(port.address, 24),
      port.pid == null ? "-" : String(port.pid),
      port.processName ?? "unknown",
      formatProject(port.cwd),
      displayClassification(port.classification),
      port.safety.status,
      formatCommand(port.command),
    ]);

  return `Active local services\n\n${renderTable(
    ["Port", "Proto", "Address", "PID", "App", "Project", "Type", "Safety", "Command"],
    rows,
  )}\n`;
}

export function formatExplain(port: DetectedPort): string {
  const type = displayClassification(port.classification);
  const owner = port.processName ?? "an unknown process";
  const project = formatProject(port.cwd);
  const started = formatStarted(port.startedAt);
  const reasons = [
    ...port.classification.reasons.map((reason) => `- Classification: ${reason}`),
    ...port.safety.reasons.map((reason) => `- Safety: ${reason}`),
  ].join("\n");

  return [
    `Port ${port.port} is occupied by ${owner}${type === "unknown" ? "" : ` (${type})`}.`,
    "",
    `Port:       ${port.port}`,
    `Protocol:   ${port.protocol}`,
    `Address:    ${port.address}`,
    `PID:        ${port.pid ?? "unknown"}`,
    `Process:    ${owner}`,
    `Command:    ${port.command ?? "unknown"}`,
    `Project:    ${project}`,
    `Started:    ${started}`,
    `Type:       ${type}`,
    `Safety:     ${port.safety.status}`,
    "",
    reasons,
    "",
    port.safety.status === "safe"
      ? `To stop it: ports stop ${port.port}`
      : "PortMinder will not stop this automatically without explicit approval.",
    "",
  ].join("\n");
}

export function formatCleanupPreview(plan: CleanupPlan, heading = "Cleanup preview"): string {
  const safeRows = plan.safeToStop.map((port) => [
    String(port.port),
    displayClassification(port.classification),
    formatProject(port.cwd),
    runningFor(port.startedAt),
  ]);
  const preservedRows = plan.preserved.map((port) => [
    String(port.port),
    displayClassification(port.classification),
    port.safety.status,
    port.safety.reasons[0] ?? "preserved",
  ]);

  const safeSection =
    safeRows.length > 0
      ? renderTable(["Port", "Type", "Project", "Running"], safeRows)
      : "No safe dev servers found.";
  const preservedSection =
    preservedRows.length > 0
      ? renderTable(["Port", "Type", "Safety", "Reason"], preservedRows)
      : "No protected or unknown services found.";

  return [
    heading,
    "",
    "Safe to stop:",
    safeSection,
    "",
    "Will keep running:",
    preservedSection,
    "",
  ].join("\n");
}

export function formatStoppedSummary(
  stopped: DetectedPort[],
  preserved: DetectedPort[],
  heading: string,
): string {
  const stoppedRows = stopped.map((port) => [
    String(port.port),
    displayClassification(port.classification),
    formatProject(port.cwd),
  ]);
  const preservedRows = preserved.map((port) => [
    String(port.port),
    displayClassification(port.classification),
    port.safety.status,
  ]);

  return [
    heading,
    "",
    "Stopped:",
    stoppedRows.length > 0 ? renderTable(["Port", "Type", "Project"], stoppedRows) : "None.",
    "",
    "Left running:",
    preservedRows.length > 0 ? renderTable(["Port", "Type", "Safety"], preservedRows) : "None.",
    "",
  ].join("\n");
}

export function formatDoctor(ports: DetectedPort[], target?: string): string {
  if (ports.length === 0) {
    return target
      ? `No matching service found for ${target}.\n`
      : "No listening ports found. Your local ports look quiet.\n";
  }

  const lines = target ? [`Doctor report for ${target}`, ""] : ["Doctor report", ""];
  for (const port of ports) {
    lines.push(
      `Port ${port.port}: ${displayClassification(port.classification)} (${port.safety.status})`,
    );
    lines.push(`- Process: ${port.processName ?? "unknown"} (${port.pid ?? "unknown PID"})`);
    lines.push(`- Project: ${formatProject(port.cwd)}`);
    lines.push(`- Recommendation: ${doctorRecommendation(port)}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length)),
  );
  const renderRow = (row: string[]) =>
    row
      .map((cell, index) => cell.padEnd(widths[index] ?? 0))
      .join("  ")
      .trimEnd();

  return [
    renderRow(headers),
    renderRow(widths.map((width) => "-".repeat(width))),
    ...rows.map(renderRow),
  ].join("\n");
}

function formatProject(cwd: string | null): string {
  if (!cwd) {
    return "unknown";
  }
  const compact = compactHome(cwd);
  const base = path.basename(cwd);
  return compact.length > 36 ? `.../${base}` : compact;
}

function formatCommand(command: string | null): string {
  return truncate(command ?? "unknown", 44);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function formatStarted(startedAt: string | null): string {
  if (!startedAt) {
    return "unknown";
  }
  return `${runningFor(startedAt)} ago`;
}

function runningFor(startedAt: string | null): string {
  if (!startedAt) {
    return "unknown";
  }
  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) {
    return "unknown";
  }
  const deltaMs = Date.now() - started.getTime();
  if (deltaMs < 0) {
    return "just now";
  }
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) {
    return "under 1m";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function doctorRecommendation(port: DetectedPort): string {
  if (port.safety.status === "safe") {
    return `Use ports free ${port.port} if this dev server is stale.`;
  }
  if (port.safety.status === "protected") {
    return "Leave it running unless you intentionally want to manage this service yourself.";
  }
  if (port.safety.status === "blocked") {
    return "Do not stop this from PortMinder without explicit risk acknowledgement.";
  }
  return "Inspect the command and project before stopping it.";
}
