export type SafetyStatus = "safe" | "unknown" | "protected" | "blocked";

export type ProcessType =
  | "frontend-dev-server"
  | "backend-dev-server"
  | "database"
  | "cache"
  | "container-runtime"
  | "reverse-proxy"
  | "ssh"
  | "system-service"
  | "security-tool"
  | "unknown";

export interface ProcessClassification {
  type: ProcessType;
  framework?: string | undefined;
  confidence: number;
  reasons: string[];
}

export interface SafetyDecision {
  status: SafetyStatus;
  confidence: number;
  reasons: string[];
  requiresConfirmation: boolean;
}

export interface DetectedPort {
  port: number;
  protocol: "tcp" | "udp";
  address: string;
  pid: number | null;
  processName: string | null;
  command: string | null;
  user: string | null;
  cwd: string | null;
  parentPid: number | null;
  startedAt: string | null;
  classification: ProcessClassification;
  safety: SafetyDecision;
}

export interface ProcessDetails {
  pid: number;
  parentPid: number | null;
  user: string | null;
  processName: string | null;
  command: string | null;
  cwd: string | null;
  startedAt: string | null;
}

export interface TerminateOptions {
  force: boolean;
}

export interface TerminateResult {
  pid: number;
  signal: "SIGTERM" | "SIGKILL" | "Stop-Process";
  success: boolean;
  error?: string | undefined;
}

export interface PortScanner {
  scanListeningPorts(): Promise<DetectedPort[]>;
  getProcessDetails(pid: number): Promise<ProcessDetails | null>;
  terminate(pid: number, options: TerminateOptions): Promise<TerminateResult>;
}

export interface PortMinderConfig {
  protected: {
    ports: number[];
    processes: string[];
    projects: string[];
  };
  safe_to_stop: {
    commands: string[];
    projects: string[];
  };
  common_dev_ports: number[];
  cleanup: {
    default_older_than: string | null;
    require_confirmation: boolean;
    graceful_timeout_ms: number;
  };
}

export const EXIT_CODES = {
  success: 0,
  genericError: 1,
  invalidArguments: 2,
  noMatch: 3,
  ambiguousTarget: 4,
  protectedRefused: 5,
  permissionDenied: 6,
  terminationFailed: 7,
  portStillOccupied: 8,
  dryRun: 9,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
