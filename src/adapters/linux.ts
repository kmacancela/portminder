import { readFile, readlink } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { createDetectedPort } from "../core/detectedPort.js";
import { parseLsofListening } from "./macos.js";
import type {
  DetectedPort,
  PortScanner,
  ProcessDetails,
  TerminateOptions,
  TerminateResult,
} from "../core/types.js";

export class LinuxScanner implements PortScanner {
  async scanListeningPorts(): Promise<DetectedPort[]> {
    const ss = await execa("ss", ["-H", "-ltnp"], { reject: false });
    if (ss.exitCode === 0 && ss.stdout.trim()) {
      return parseSsListening(ss.stdout);
    }

    const lsof = await execa("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"], { reject: false });
    if (lsof.exitCode === 0 || lsof.stdout.trim()) {
      return parseLsofListening(lsof.stdout);
    }

    return [];
  }

  async getProcessDetails(pid: number): Promise<ProcessDetails | null> {
    const cmdline = await readProcCmdline(pid);
    const cwd = await readlink(`/proc/${pid}/cwd`).catch(() => null);
    const ps = await execa(
      "ps",
      ["-p", String(pid), "-o", "ppid=", "-o", "user=", "-o", "comm=", "-o", "lstart="],
      {
        reject: false,
      },
    );

    if (ps.exitCode !== 0 || !ps.stdout.trim()) {
      return cmdline
        ? {
            pid,
            parentPid: null,
            user: null,
            processName: path.basename(cmdline.split(/\s+/)[0] ?? ""),
            command: cmdline,
            cwd,
            startedAt: null,
          }
        : null;
    }

    const match = /^\s*(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/.exec(ps.stdout.trim());
    if (!match?.[1]) {
      return null;
    }

    const command = cmdline || match[3] || null;

    return {
      pid,
      parentPid: Number(match[1]),
      user: match[2] ?? null,
      processName: match[3] ? path.basename(match[3]) : null,
      command,
      cwd,
      startedAt: parseDate(match[4] ?? ""),
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

export function parseSsListening(output: string): DetectedPort[] {
  const ports: DetectedPort[] = [];
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^State\s+/i.test(trimmed)) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    if (parts[0] !== "LISTEN" || parts.length < 4) {
      continue;
    }
    const local = parts[3];
    if (!local) {
      continue;
    }
    const endpoint = parseLinuxEndpoint(local);
    if (!endpoint) {
      continue;
    }
    const processChunk = parts.slice(5).join(" ");
    ports.push(
      createDetectedPort({
        port: endpoint.port,
        address: endpoint.address,
        pid: parsePid(processChunk),
        processName: parseProcessName(processChunk),
      }),
    );
  }
  return ports;
}

function parseLinuxEndpoint(endpoint: string): { address: string; port: number } | null {
  const bracketMatch = /^(.*\]):(\d+)$/.exec(endpoint);
  const plainMatch = /^(.*):(\d+)$/.exec(endpoint);
  const match = bracketMatch ?? plainMatch;
  if (!match?.[2]) {
    return null;
  }
  return {
    address: match[1] ?? "unknown",
    port: Number(match[2]),
  };
}

function parsePid(processChunk: string): number | null {
  const match = /pid=(\d+)/.exec(processChunk);
  return match?.[1] ? Number(match[1]) : null;
}

function parseProcessName(processChunk: string): string | null {
  const match = /"([^"]+)"/.exec(processChunk);
  return match?.[1] ?? null;
}

async function readProcCmdline(pid: number): Promise<string | null> {
  try {
    const raw = await readFile(`/proc/${pid}/cmdline`, "utf8");
    return raw.split("\0").filter(Boolean).join(" ") || null;
  } catch {
    return null;
  }
}

function parseDate(raw: string): string | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
