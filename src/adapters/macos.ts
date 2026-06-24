import path from "node:path";
import { execa } from "execa";
import { createDetectedPort } from "../core/detectedPort.js";
import type {
  DetectedPort,
  PortScanner,
  ProcessDetails,
  TerminateOptions,
  TerminateResult,
} from "../core/types.js";

export class MacOSScanner implements PortScanner {
  async scanListeningPorts(): Promise<DetectedPort[]> {
    const result = await execa("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"], { reject: false });
    if (result.exitCode !== 0 && !result.stdout.trim()) {
      return [];
    }
    return parseLsofListening(result.stdout);
  }

  async getProcessDetails(pid: number): Promise<ProcessDetails | null> {
    const ps = await execa(
      "ps",
      ["-ww", "-p", String(pid), "-o", "pid=", "-o", "ppid=", "-o", "user=", "-o", "args="],
      { reject: false },
    );
    if (ps.exitCode !== 0 || !ps.stdout.trim()) {
      return null;
    }

    const match = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/.exec(ps.stdout.trim());
    if (!match?.[1] || !match[2]) {
      return null;
    }

    const started = await execa("ps", ["-p", String(pid), "-o", "lstart="], { reject: false });
    const cwd = await getMacCwd(pid);
    const command = match[4]?.trim() ?? null;

    return {
      pid: Number(match[1]),
      parentPid: Number(match[2]),
      user: match[3] ?? null,
      processName: command ? path.basename(command.split(/\s+/)[0] ?? command) : null,
      command,
      cwd,
      startedAt: parseDate(started.stdout.trim()),
    };
  }

  async terminate(pid: number, options: TerminateOptions): Promise<TerminateResult> {
    try {
      process.kill(pid, options.force ? "SIGKILL" : "SIGTERM");
      return { pid, signal: options.force ? "SIGKILL" : "SIGTERM", success: true };
    } catch (error) {
      return {
        pid,
        signal: options.force ? "SIGKILL" : "SIGTERM",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export function parseLsofListening(output: string): DetectedPort[] {
  const ports: DetectedPort[] = [];
  const lines = output.split(/\r?\n/).filter(Boolean);

  for (const line of lines) {
    if (/^COMMAND\s+PID\s+/i.test(line)) {
      continue;
    }

    const match = /^(\S+)\s+(\d+)\s+(\S+)\s+.*?\s+(TCP|UDP)\s+(.+)$/.exec(line.trim());
    if (!match?.[1] || !match[2] || !match[4] || !match[5]) {
      continue;
    }

    const endpoint = match[5].replace(/\s+\(LISTEN\)$/i, "");
    const parsed = parseEndpoint(endpoint);
    if (!parsed) {
      continue;
    }

    ports.push(
      createDetectedPort({
        port: parsed.port,
        protocol: match[4].toLowerCase() as "tcp" | "udp",
        address: parsed.address,
        pid: Number(match[2]),
        processName: match[1],
        user: match[3] ?? null,
      }),
    );
  }

  return ports;
}

export function parseEndpoint(endpoint: string): { address: string; port: number } | null {
  const match = /^(.*):(\d+)$/.exec(endpoint.trim());
  if (!match?.[2]) {
    return null;
  }
  return {
    address: match[1] || "unknown",
    port: Number(match[2]),
  };
}

async function getMacCwd(pid: number): Promise<string | null> {
  const result = await execa("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], {
    reject: false,
  });
  if (result.exitCode !== 0) {
    return null;
  }
  const cwdLine = result.stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("n") && line.length > 1);
  return cwdLine ? cwdLine.slice(1) : null;
}

function parseDate(raw: string): string | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
