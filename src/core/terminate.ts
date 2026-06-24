import { setTimeout as delay } from "node:timers/promises";
import type {
  DetectedPort,
  ExitCode,
  PortMinderConfig,
  PortScanner,
  TerminateResult,
} from "./types.js";
import { EXIT_CODES } from "./types.js";

export interface StopOptions {
  dryRun?: boolean | undefined;
  force?: boolean | undefined;
  iUnderstand?: boolean | undefined;
  timeoutMs?: number | undefined;
}

export interface StopOutcome {
  port: DetectedPort;
  status: "dry-run" | "terminated" | "refused" | "failed";
  exitCode: ExitCode;
  message: string;
  graceful?: TerminateResult;
  forced?: TerminateResult;
}

export async function stopDetectedPort(
  scanner: PortScanner,
  port: DetectedPort,
  config: PortMinderConfig,
  options: StopOptions,
): Promise<StopOutcome> {
  if (options.dryRun) {
    return {
      port,
      status: "dry-run",
      exitCode: EXIT_CODES.dryRun,
      message: `Dry run: would stop PID ${port.pid ?? "unknown"} on port ${port.port}.`,
    };
  }

  if (port.pid == null) {
    return {
      port,
      status: "failed",
      exitCode: EXIT_CODES.terminationFailed,
      message: `Cannot stop port ${port.port} because the owning PID is unavailable.`,
    };
  }

  if (port.safety.status === "protected" && !options.force) {
    return {
      port,
      status: "refused",
      exitCode: EXIT_CODES.protectedRefused,
      message: `Refused to stop protected service on port ${port.port}: ${port.safety.reasons.join("; ")}.`,
    };
  }

  if (port.safety.status === "blocked" && !(options.force && options.iUnderstand)) {
    return {
      port,
      status: "refused",
      exitCode: EXIT_CODES.protectedRefused,
      message: `Refused to stop blocked service on port ${port.port}: ${port.safety.reasons.join("; ")}. Use --force --i-understand only if you accept the risk.`,
    };
  }

  const graceful = await scanner.terminate(port.pid, { force: false });
  if (!graceful.success) {
    return {
      port,
      status: "failed",
      exitCode: EXIT_CODES.terminationFailed,
      message: graceful.error ?? `Failed to gracefully stop PID ${port.pid}.`,
      graceful,
    };
  }

  const freedAfterGraceful = await waitForPortFree(
    scanner,
    port,
    options.timeoutMs ?? config.cleanup.graceful_timeout_ms,
  );
  if (freedAfterGraceful) {
    return {
      port,
      status: "terminated",
      exitCode: EXIT_CODES.success,
      message: `Stopped PID ${port.pid} gracefully. Port ${port.port} is free.`,
      graceful,
    };
  }

  if (!options.force) {
    return {
      port,
      status: "failed",
      exitCode: EXIT_CODES.portStillOccupied,
      message: `PID ${port.pid} was sent a graceful stop, but port ${port.port} is still occupied. Re-run with --force if appropriate.`,
      graceful,
    };
  }

  const forced = await scanner.terminate(port.pid, { force: true });
  if (!forced.success) {
    return {
      port,
      status: "failed",
      exitCode: EXIT_CODES.terminationFailed,
      message: forced.error ?? `Failed to force-stop PID ${port.pid}.`,
      graceful,
      forced,
    };
  }

  const freedAfterForce = await waitForPortFree(
    scanner,
    port,
    options.timeoutMs ?? config.cleanup.graceful_timeout_ms,
  );
  if (!freedAfterForce) {
    return {
      port,
      status: "failed",
      exitCode: EXIT_CODES.portStillOccupied,
      message: `Force-stopped PID ${port.pid}, but port ${port.port} still appears occupied.`,
      graceful,
      forced,
    };
  }

  return {
    port,
    status: "terminated",
    exitCode: EXIT_CODES.success,
    message: `Stopped PID ${port.pid}. Port ${port.port} is free.`,
    graceful,
    forced,
  };
}

async function waitForPortFree(
  scanner: PortScanner,
  original: DetectedPort,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const ports = await scanner.scanListeningPorts().catch(() => []);
    const stillOccupied = ports.some(
      (port) =>
        port.port === original.port &&
        (original.pid == null || port.pid == null || port.pid === original.pid),
    );
    if (!stillOccupied) {
      return true;
    }
    await delay(200);
  }
  return false;
}
