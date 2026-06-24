import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import { DEFAULT_COMMON_DEV_PORTS, DEFAULT_PROTECTED_PORTS } from "../data/knownPorts.js";
import { PROTECTED_PROCESS_PATTERNS } from "../data/knownProcesses.js";
import type { PortMinderConfig } from "./types.js";

const stringArraySchema = z.array(z.string()).default([]);

const partialConfigSchema = z
  .object({
    protected: z
      .object({
        ports: z.array(z.number().int().min(1).max(65535)).optional(),
        processes: stringArraySchema.optional(),
        projects: stringArraySchema.optional(),
      })
      .optional(),
    safe_to_stop: z
      .object({
        commands: stringArraySchema.optional(),
        projects: stringArraySchema.optional(),
      })
      .optional(),
    common_dev_ports: z.array(z.number().int().min(1).max(65535)).optional(),
    cleanup: z
      .object({
        default_older_than: z.string().nullable().optional(),
        require_confirmation: z.boolean().optional(),
        graceful_timeout_ms: z.number().int().positive().optional(),
      })
      .optional(),
  })
  .default({});

export const DEFAULT_CONFIG: PortMinderConfig = {
  protected: {
    ports: DEFAULT_PROTECTED_PORTS,
    processes: [
      ...new Set(
        PROTECTED_PROCESS_PATTERNS.flatMap((entry) => {
          const source = entry.framework?.toLowerCase();
          return source ? [source] : [];
        }).concat([
          "postgres",
          "postmaster",
          "mysql",
          "mysqld",
          "mariadb",
          "redis",
          "redis-server",
          "mongodb",
          "mongod",
          "docker",
          "dockerd",
          "nginx",
          "apache",
          "apache2",
          "httpd",
          "sshd",
          "ssh",
          "launchd",
          "systemd",
        ]),
      ),
    ],
    projects: [],
  },
  safe_to_stop: {
    commands: [
      "npm run dev",
      "pnpm dev",
      "yarn dev",
      "bun dev",
      "next dev",
      "vite",
      "rails server",
      "uvicorn",
      "flask run",
      "python -m http.server",
    ],
    projects: [],
  },
  common_dev_ports: DEFAULT_COMMON_DEV_PORTS,
  cleanup: {
    default_older_than: null,
    require_confirmation: true,
    graceful_timeout_ms: 3000,
  },
};

export function getConfigPath(): string {
  if (process.env.PORTMINDER_CONFIG) {
    return expandHome(process.env.PORTMINDER_CONFIG);
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "portminder", "config.yaml");
  }

  const configHome = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(configHome, "portminder", "config.yaml");
}

export async function loadConfig(configPath = getConfigPath()): Promise<PortMinderConfig> {
  try {
    const raw = await readFile(configPath, "utf8");
    return normalizeConfig(YAML.parse(raw) ?? {});
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return normalizeConfig({});
    }
    throw error;
  }
}

export async function saveConfig(
  config: PortMinderConfig,
  configPath = getConfigPath(),
): Promise<void> {
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, YAML.stringify(config), "utf8");
}

export function normalizeConfig(raw: unknown): PortMinderConfig {
  const parsed = partialConfigSchema.parse(raw);

  return {
    protected: {
      ports: uniqueNumbers(parsed.protected?.ports ?? DEFAULT_CONFIG.protected.ports),
      processes: uniqueStrings(parsed.protected?.processes ?? DEFAULT_CONFIG.protected.processes),
      projects: uniqueStrings(parsed.protected?.projects ?? DEFAULT_CONFIG.protected.projects),
    },
    safe_to_stop: {
      commands: uniqueStrings(
        parsed.safe_to_stop?.commands ?? DEFAULT_CONFIG.safe_to_stop.commands,
      ),
      projects: uniqueStrings(
        parsed.safe_to_stop?.projects ?? DEFAULT_CONFIG.safe_to_stop.projects,
      ),
    },
    common_dev_ports: uniqueNumbers(parsed.common_dev_ports ?? DEFAULT_CONFIG.common_dev_ports),
    cleanup: {
      default_older_than:
        parsed.cleanup?.default_older_than ?? DEFAULT_CONFIG.cleanup.default_older_than,
      require_confirmation:
        parsed.cleanup?.require_confirmation ?? DEFAULT_CONFIG.cleanup.require_confirmation,
      graceful_timeout_ms:
        parsed.cleanup?.graceful_timeout_ms ?? DEFAULT_CONFIG.cleanup.graceful_timeout_ms,
    },
  };
}

export function expandHome(input: string): string {
  if (input === "~") {
    return os.homedir();
  }
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

export function compactHome(input: string | null): string {
  if (!input) {
    return "unknown";
  }
  const home = os.homedir();
  if (input === home) {
    return "~";
  }
  if (input.startsWith(`${home}${path.sep}`)) {
    return `~${path.sep}${path.relative(home, input)}`;
  }
  return input;
}

export function matchesProject(cwd: string | null, projects: string[]): boolean {
  if (!cwd) {
    return false;
  }
  const normalizedCwd = path.resolve(expandHome(cwd));
  return projects.some((project) => {
    const normalizedProject = path.resolve(expandHome(project));
    return (
      normalizedCwd === normalizedProject ||
      normalizedCwd.startsWith(`${normalizedProject}${path.sep}`)
    );
  });
}

export function looksLikePath(target: string): boolean {
  return (
    target.startsWith("~") ||
    target.startsWith(".") ||
    target.startsWith("/") ||
    target.includes(path.sep) ||
    /^[A-Za-z]:[\\/]/.test(target)
  );
}

export function addProtectedTarget(config: PortMinderConfig, target: string): PortMinderConfig {
  const next = structuredClone(config);
  const numeric = Number(target);
  if (Number.isInteger(numeric) && numeric > 0 && numeric <= 65535) {
    next.protected.ports = uniqueNumbers([...next.protected.ports, numeric]);
    return next;
  }
  if (looksLikePath(target)) {
    next.protected.projects = uniqueStrings([...next.protected.projects, expandHome(target)]);
    return next;
  }
  next.protected.processes = uniqueStrings([...next.protected.processes, target]);
  return next;
}

export function addTrustedTarget(config: PortMinderConfig, target: string): PortMinderConfig {
  const next = structuredClone(config);
  if (looksLikePath(target)) {
    next.safe_to_stop.projects = uniqueStrings([...next.safe_to_stop.projects, expandHome(target)]);
    return next;
  }
  next.safe_to_stop.commands = uniqueStrings([...next.safe_to_stop.commands, target]);
  return next;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
