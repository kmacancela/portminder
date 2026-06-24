import type { ProcessType } from "../core/types.js";

export interface KnownProcessPattern {
  pattern: RegExp;
  type: ProcessType;
  framework?: string;
  reason: string;
}

export const PROTECTED_PROCESS_PATTERNS: KnownProcessPattern[] = [
  {
    pattern: /\bpostgres(?:ql)?\b|postmaster/i,
    type: "database",
    framework: "Postgres",
    reason: "known database process",
  },
  {
    pattern: /\bmysqld?\b|\bmariadbd?\b/i,
    type: "database",
    framework: "MySQL/MariaDB",
    reason: "known database process",
  },
  {
    pattern: /\bmongod\b/i,
    type: "database",
    framework: "MongoDB",
    reason: "known database process",
  },
  {
    pattern: /\bredis-server\b|\bredis\b/i,
    type: "cache",
    framework: "Redis",
    reason: "known cache process",
  },
  {
    pattern: /\bmemcached\b/i,
    type: "cache",
    framework: "Memcached",
    reason: "known cache process",
  },
  {
    pattern: /\bdocker\b|\bdockerd\b|com\.docker/i,
    type: "container-runtime",
    framework: "Docker",
    reason: "known container runtime",
  },
  {
    pattern: /\bcontainerd\b|\bcolima\b|\bpodman\b/i,
    type: "container-runtime",
    reason: "known container runtime",
  },
  {
    pattern: /\bnginx\b|\bapache2?\b|\bhttpd\b/i,
    type: "reverse-proxy",
    reason: "known reverse proxy or web server",
  },
  { pattern: /\bsshd\b|\bssh\b/i, type: "ssh", framework: "SSH", reason: "known SSH process" },
  {
    pattern:
      /\bopenvpn\b|\bwireguard\b|\btailscale\b|\bzerotier\b|\bglobalprotect\b|\banyconnect\b/i,
    type: "security-tool",
    reason: "known VPN or security tool",
  },
  {
    pattern: /\bsystemd\b|\blaunchd\b|\bsvchost\.exe\b|\bservices\.exe\b/i,
    type: "system-service",
    reason: "known system service manager",
  },
];

export const DEV_SERVER_PATTERNS: KnownProcessPattern[] = [
  {
    pattern: /\bnext(?:\.js)?\b.*\bdev\b|\bnext-dev\b/i,
    type: "frontend-dev-server",
    framework: "Next.js",
    reason: "command contains next dev",
  },
  {
    pattern: /\bvite\b/i,
    type: "frontend-dev-server",
    framework: "Vite",
    reason: "command contains vite",
  },
  {
    pattern: /\bwebpack-dev-server\b|\bwebpack serve\b/i,
    type: "frontend-dev-server",
    framework: "Webpack dev server",
    reason: "command contains webpack dev server",
  },
  {
    pattern: /\breact-scripts\b.*\bstart\b/i,
    type: "frontend-dev-server",
    framework: "Create React App",
    reason: "command contains react-scripts start",
  },
  {
    pattern: /\bastro\b.*\bdev\b/i,
    type: "frontend-dev-server",
    framework: "Astro",
    reason: "command contains astro dev",
  },
  {
    pattern: /\bremix\b.*\bdev\b/i,
    type: "frontend-dev-server",
    framework: "Remix",
    reason: "command contains remix dev",
  },
  {
    pattern: /\bsvelte-kit\b|\bkit dev\b/i,
    type: "frontend-dev-server",
    framework: "SvelteKit",
    reason: "command contains SvelteKit dev server",
  },
  {
    pattern: /\bnuxt\b.*\bdev\b/i,
    type: "frontend-dev-server",
    framework: "Nuxt",
    reason: "command contains nuxt dev",
  },
  {
    pattern: /\bng serve\b|\bangular\b.*\bserve\b/i,
    type: "frontend-dev-server",
    framework: "Angular",
    reason: "command contains Angular dev server",
  },
  {
    pattern: /\bnpm\b.*\brun\b.*\bdev\b|\bpnpm\b.*\bdev\b|\byarn\b.*\bdev\b|\bbun\b.*\bdev\b/i,
    type: "frontend-dev-server",
    framework: "package dev script",
    reason: "command is a package manager dev script",
  },
  {
    pattern: /\brails\b.*\bserver\b|\brails\b.*\bs\b/i,
    type: "backend-dev-server",
    framework: "Rails",
    reason: "command contains rails server",
  },
  {
    pattern: /\bmanage\.py\b.*\brunserver\b|\bdjango-admin\b.*\brunserver\b/i,
    type: "backend-dev-server",
    framework: "Django",
    reason: "command contains django runserver",
  },
  {
    pattern: /\bflask\b.*\brun\b/i,
    type: "backend-dev-server",
    framework: "Flask",
    reason: "command contains flask run",
  },
  {
    pattern: /\buvicorn\b|\bfastapi\b.*\bdev\b/i,
    type: "backend-dev-server",
    framework: "Uvicorn/FastAPI",
    reason: "command contains uvicorn or fastapi dev",
  },
  {
    pattern: /\bpython(?:3)?\b.*-m\s+http\.server\b/i,
    type: "backend-dev-server",
    framework: "Python http.server",
    reason: "command contains python -m http.server",
  },
  {
    pattern: /\bphp\b.*-S\b/i,
    type: "backend-dev-server",
    framework: "PHP built-in server",
    reason: "command contains php -S",
  },
  {
    pattern: /\bdotnet\b.*\bwatch\b|\bdotnet\b.*\brun\b/i,
    type: "backend-dev-server",
    framework: ".NET dev server",
    reason: "command contains dotnet watch or run",
  },
  {
    pattern: /\bair\b|\bgo\b.*\brun\b/i,
    type: "backend-dev-server",
    framework: "Go dev server",
    reason: "command contains go run or air",
  },
];
