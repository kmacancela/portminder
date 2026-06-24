import os from "node:os";
import path from "node:path";
import { createDetectedPort } from "../core/detectedPort.js";
import type {
  DetectedPort,
  PortScanner,
  ProcessDetails,
  TerminateOptions,
  TerminateResult,
} from "../core/types.js";

export class FixtureScanner implements PortScanner {
  private ports: DetectedPort[];

  constructor(ports = defaultFixturePorts()) {
    this.ports = ports.map((port) => createDetectedPort(port));
  }

  static fromPorts(rawPorts: unknown[]): FixtureScanner {
    const ports = rawPorts.map((raw) => {
      if (!raw || typeof raw !== "object") {
        throw new Error("Invalid fixture port entry.");
      }
      return createDetectedPort(raw as Partial<DetectedPort> & { port: number });
    });
    return new FixtureScanner(ports);
  }

  async scanListeningPorts(): Promise<DetectedPort[]> {
    return this.ports.map((port) => createDetectedPort(port));
  }

  async getProcessDetails(pid: number): Promise<ProcessDetails | null> {
    const match = this.ports.find((port) => port.pid === pid);
    if (!match) {
      return null;
    }
    return {
      pid,
      parentPid: match.parentPid,
      user: match.user,
      processName: match.processName,
      command: match.command,
      cwd: match.cwd,
      startedAt: match.startedAt,
    };
  }

  async terminate(pid: number, options: TerminateOptions): Promise<TerminateResult> {
    this.ports = this.ports.filter((port) => port.pid !== pid);
    return {
      pid,
      signal: options.force ? "SIGKILL" : "SIGTERM",
      success: true,
    };
  }
}

function defaultFixturePorts(): DetectedPort[] {
  const home = os.homedir();
  const user = os.userInfo().username;
  const now = Date.now();

  return [
    createDetectedPort({
      port: 3000,
      address: "127.0.0.1",
      pid: 48291,
      processName: "node",
      command: "node ./node_modules/.bin/next dev",
      user,
      cwd: path.join(home, "work", "site"),
      parentPid: 1200,
      startedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    }),
    createDetectedPort({
      port: 5173,
      address: "127.0.0.1",
      pid: 48292,
      processName: "node",
      command: "pnpm vite --host 127.0.0.1",
      user,
      cwd: path.join(home, "work", "admin"),
      parentPid: 1200,
      startedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    }),
    createDetectedPort({
      port: 8000,
      address: "127.0.0.1",
      pid: 48293,
      processName: "python",
      command: "uvicorn app:app --reload",
      user,
      cwd: path.join(home, "work", "api"),
      parentPid: 1200,
      startedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    }),
    createDetectedPort({
      port: 5432,
      address: "127.0.0.1",
      pid: 48294,
      processName: "postgres",
      command: "postgres -D /usr/local/var/postgres",
      user,
      cwd: "/usr/local/var/postgres",
      parentPid: 1,
      startedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    }),
    createDetectedPort({
      port: 6379,
      address: "127.0.0.1",
      pid: 48295,
      processName: "redis-server",
      command: "redis-server 127.0.0.1:6379",
      user,
      cwd: "/usr/local/var",
      parentPid: 1,
      startedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    }),
  ];
}
