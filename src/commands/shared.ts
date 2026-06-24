import { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { loadConfig } from "../core/config.js";
import { createScanner, scanListeningPorts } from "../core/scan.js";
import { resolveTarget } from "../core/resolve.js";
import { jsonOutput } from "../core/format.js";
import type { DetectedPort, PortMinderConfig, PortScanner } from "../core/types.js";
import { EXIT_CODES, type ExitCode } from "../core/types.js";

export interface Runtime {
  config: PortMinderConfig;
  scanner: PortScanner;
}

export function withCommonOptions(command: Command): Command {
  return command.option("--fixture [path]", "use built-in demo data or read a fixture JSON file");
}

export async function createRuntime(command: Command): Promise<Runtime> {
  const options = command.optsWithGlobals() as { fixture?: string | boolean };
  const config = await loadConfig();
  const scanner = await createScanner({ fixture: options.fixture });
  return { config, scanner };
}

export async function scanForCommand(
  command: Command,
): Promise<{ runtime: Runtime; ports: DetectedPort[] }> {
  const runtime = await createRuntime(command);
  const ports = await scanListeningPorts(runtime.scanner, runtime.config);
  return { runtime, ports };
}

export function write(value: string): void {
  process.stdout.write(value);
}

export function writeJson(value: unknown): void {
  write(jsonOutput(value));
}

export function fail(
  message: string,
  code: ExitCode = EXIT_CODES.genericError,
  json = false,
): void {
  process.exitCode = code;
  if (json) {
    writeJson({ ok: false, error: message, exitCode: code });
  } else {
    process.stderr.write(`${message}\n`);
  }
}

export async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
  } finally {
    rl.close();
  }
}

export async function resolveOneTarget(
  ports: DetectedPort[],
  target: string,
  options: {
    json?: boolean | undefined;
    yes?: boolean | undefined;
    purpose?: string | undefined;
  } = {},
): Promise<DetectedPort | null> {
  const matches = resolveTarget(ports, target);
  if (matches.length === 0) {
    fail(`No matching service found for ${target}.`, EXIT_CODES.noMatch, options.json);
    return null;
  }

  if (matches.length === 1) {
    return matches[0] ?? null;
  }

  if (options.json || options.yes || !process.stdin.isTTY || !process.stdout.isTTY) {
    fail(
      `Target ${target} matched ${matches.length} services. Refusing ambiguous non-interactive action.`,
      EXIT_CODES.ambiguousTarget,
      options.json,
    );
    return null;
  }

  write(`Target ${target} matched multiple services:\n\n`);
  matches.forEach((port, index) => {
    write(
      `${index + 1}. port ${port.port}, PID ${port.pid ?? "unknown"}, ${port.processName ?? "unknown"}\n`,
    );
  });
  write("\n");

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(
      `Choose a service to ${options.purpose ?? "use"} [1-${matches.length}], or press Enter to cancel: `,
    );
    const index = Number(answer.trim());
    if (!Number.isInteger(index) || index < 1 || index > matches.length) {
      fail("Cancelled.", EXIT_CODES.ambiguousTarget, options.json);
      return null;
    }
    return matches[index - 1] ?? null;
  } finally {
    rl.close();
  }
}

export function parseDurationMs(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const match = /^(\d+)(ms|s|m|h|d)?$/i.exec(value.trim());
  if (!match?.[1]) {
    throw new Error(`Invalid duration: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = (match[2] ?? "ms").toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] ?? 1);
}

export function filterOlderThan(ports: DetectedPort[], durationMs: number | null): DetectedPort[] {
  if (!durationMs) {
    return ports;
  }
  const cutoff = Date.now() - durationMs;
  return ports.filter((port) => {
    if (!port.startedAt) {
      return true;
    }
    const started = new Date(port.startedAt).getTime();
    return Number.isNaN(started) || started <= cutoff;
  });
}

export function splitCleanupPlan(ports: DetectedPort[]): {
  safeToStop: DetectedPort[];
  preserved: DetectedPort[];
} {
  const safeToStop = ports.filter((port) => port.safety.status === "safe");
  const preserved = ports.filter((port) => port.safety.status !== "safe");
  return { safeToStop, preserved };
}
