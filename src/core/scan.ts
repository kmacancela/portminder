import { readFile } from "node:fs/promises";
import { MacOSScanner } from "../adapters/macos.js";
import { LinuxScanner } from "../adapters/linux.js";
import { WindowsScanner } from "../adapters/windows.js";
import { FixtureScanner } from "../adapters/fixture.js";
import { classifyProcess } from "./classify.js";
import { mergeProcessDetails } from "./detectedPort.js";
import { decideSafety, getCurrentUser } from "./safety.js";
import type { DetectedPort, PortMinderConfig, PortScanner } from "./types.js";

export interface ScannerOptions {
  fixture?: boolean | string | undefined;
}

export async function createScanner(options: ScannerOptions = {}): Promise<PortScanner> {
  if (options.fixture) {
    return createFixtureScanner(options.fixture);
  }

  if (process.platform === "darwin") {
    return new MacOSScanner();
  }
  if (process.platform === "win32") {
    return new WindowsScanner();
  }
  return new LinuxScanner();
}

export async function scanListeningPorts(
  scanner: PortScanner,
  config: PortMinderConfig,
): Promise<DetectedPort[]> {
  const scanned = dedupePorts(await scanner.scanListeningPorts());
  const detailsByPid = new Map<number, Awaited<ReturnType<PortScanner["getProcessDetails"]>>>();

  const enriched = await Promise.all(
    scanned.map(async (port) => {
      if (port.pid == null || hasEnoughDetails(port)) {
        return enrich(port, config);
      }

      if (!detailsByPid.has(port.pid)) {
        detailsByPid.set(port.pid, await scanner.getProcessDetails(port.pid).catch(() => null));
      }

      const details = detailsByPid.get(port.pid);
      if (!details) {
        return enrich(port, config);
      }

      return enrich(
        mergeProcessDetails(port, {
          processName: details.processName,
          command: details.command,
          user: details.user,
          cwd: details.cwd,
          parentPid: details.parentPid,
          startedAt: details.startedAt,
        }),
        config,
      );
    }),
  );

  return enriched.sort((a, b) => a.port - b.port);
}

export function enrich(port: DetectedPort, config: PortMinderConfig): DetectedPort {
  const classified = {
    ...port,
    classification: classifyProcess(port, config),
  };
  return {
    ...classified,
    safety: decideSafety(classified, config, getCurrentUser()),
  };
}

async function createFixtureScanner(fixture: true | string): Promise<FixtureScanner> {
  if (fixture === true || fixture === "true" || fixture === "demo") {
    return new FixtureScanner();
  }

  const raw = await readFile(fixture, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return FixtureScanner.fromPorts(parsed);
  }
  if (isFixtureObject(parsed)) {
    return FixtureScanner.fromPorts(parsed.ports);
  }
  throw new Error("Fixture must be an array of ports or an object with a ports array.");
}

function hasEnoughDetails(port: DetectedPort): boolean {
  return Boolean(port.command && port.user && port.processName);
}

function dedupePorts(ports: DetectedPort[]): DetectedPort[] {
  const seen = new Set<string>();
  const deduped: DetectedPort[] = [];

  for (const port of ports) {
    const key = [port.protocol, port.address, port.port, port.pid ?? "unknown"].join(":");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(port);
  }

  return deduped;
}

function isFixtureObject(value: unknown): value is { ports: unknown[] } {
  return Boolean(
    value && typeof value === "object" && Array.isArray((value as { ports?: unknown }).ports),
  );
}
