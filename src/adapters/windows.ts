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

export class WindowsScanner implements PortScanner {
  async scanListeningPorts(): Promise<DetectedPort[]> {
    const script =
      "Get-NetTCPConnection -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Depth 2";
    const ps = await execa("powershell.exe", ["-NoProfile", "-Command", script], { reject: false });
    if (ps.exitCode === 0 && ps.stdout.trim()) {
      return parsePowerShellListening(ps.stdout);
    }

    const netstat = await execa("netstat.exe", ["-ano", "-p", "tcp"], { reject: false });
    if (netstat.exitCode === 0) {
      return parseNetstatListening(netstat.stdout);
    }
    return [];
  }

  async getProcessDetails(pid: number): Promise<ProcessDetails | null> {
    const script = [
      `$proc = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}"`,
      "if ($proc) {",
      "  $owner = Invoke-CimMethod -InputObject $proc -MethodName GetOwner -ErrorAction SilentlyContinue",
      "  [PSCustomObject]@{",
      "    ProcessId = $proc.ProcessId;",
      "    ParentProcessId = $proc.ParentProcessId;",
      "    Name = $proc.Name;",
      "    CommandLine = $proc.CommandLine;",
      "    ExecutablePath = $proc.ExecutablePath;",
      "    CreationDate = $proc.CreationDate;",
      '    User = if ($owner.User) { "$($owner.Domain)\\$($owner.User)" } else { $null }',
      "  } | ConvertTo-Json -Depth 2",
      "}",
    ].join("\n");

    const result = await execa("powershell.exe", ["-NoProfile", "-Command", script], {
      reject: false,
    });
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      return null;
    }

    const parsed = JSON.parse(result.stdout) as {
      ProcessId: number;
      ParentProcessId?: number;
      Name?: string;
      CommandLine?: string;
      ExecutablePath?: string;
      CreationDate?: string;
      User?: string;
    };

    return {
      pid: parsed.ProcessId,
      parentPid: parsed.ParentProcessId ?? null,
      user: parsed.User ?? null,
      processName:
        parsed.Name ?? (parsed.ExecutablePath ? path.basename(parsed.ExecutablePath) : null),
      command: parsed.CommandLine ?? parsed.ExecutablePath ?? parsed.Name ?? null,
      cwd: null,
      startedAt: parseWindowsDate(parsed.CreationDate),
    };
  }

  async terminate(pid: number, options: TerminateOptions): Promise<TerminateResult> {
    const command = options.force ? `Stop-Process -Id ${pid} -Force` : `Stop-Process -Id ${pid}`;
    const result = await execa("powershell.exe", ["-NoProfile", "-Command", command], {
      reject: false,
    });
    return {
      pid,
      signal: "Stop-Process",
      success: result.exitCode === 0,
      error:
        result.exitCode === 0 ? undefined : result.stderr || result.stdout || "Stop-Process failed",
    };
  }
}

export function parsePowerShellListening(output: string): DetectedPort[] {
  const parsed = JSON.parse(output) as unknown;
  const entries = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const value = entry as { LocalAddress?: string; LocalPort?: number; OwningProcess?: number };
    if (!value.LocalPort) {
      return [];
    }
    return [
      createDetectedPort({
        port: Number(value.LocalPort),
        address: value.LocalAddress ?? "unknown",
        pid: value.OwningProcess ?? null,
      }),
    ];
  });
}

export function parseNetstatListening(output: string): DetectedPort[] {
  const ports: DetectedPort[] = [];
  for (const line of output.split(/\r?\n/)) {
    const match = /^\s*TCP\s+(\S+):(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i.exec(line);
    if (!match?.[2]) {
      continue;
    }
    ports.push(
      createDetectedPort({
        port: Number(match[2]),
        address: match[1] ?? "unknown",
        pid: match[3] ? Number(match[3]) : null,
      }),
    );
  }
  return ports;
}

function parseWindowsDate(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
