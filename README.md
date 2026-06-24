# PortMinder

A safe local development port manager.

PortMinder shows what is running on your local ports, explains which project owns each service, and helps you free blocked dev ports without accidentally killing databases, Docker, SSH, VPNs, or system services.

```bash
ports
ports explain 3000
ports free 3000
ports cleanup --dry-run
ports end-day
```

Built for developers, teams, and AI coding agents that need predictable local development cleanup.

## Install

```bash
npm install -g portminder
```

From a checkout:

```bash
npm install
npm run build
npm link
```

## Commands

### `ports`

Alias for `ports list`. Shows active local listening ports.

```bash
ports
ports list --json
ports list --dev-only
ports list --protected
ports list --all
```

### `ports explain <port|pid|name|project>`

Explains what is using a port or process and why PortMinder classifies it as safe, unknown, protected, or blocked.

```bash
ports explain 3000
ports explain pid:48291
ports explain next
```

### `ports free <port>`

Solves the common "port already in use" problem. Safe dev servers can be stopped directly; unknown processes require confirmation; protected services are refused unless forced.

```bash
ports free 3000
ports free 3000 --dry-run
ports free 3000 --yes
```

### `ports stop <target>`

Stops one matching process safely. PortMinder sends a graceful signal first and only force-kills when `--force` is explicitly passed.

```bash
ports stop 3000
ports stop next
ports stop pid:48291
ports stop 3000 --force --yes
```

Blocked processes require both `--force` and `--i-understand`.

### `ports cleanup`

Previews or stops likely stale dev servers while preserving protected services.

```bash
ports cleanup --dry-run
ports cleanup --yes
ports cleanup --older-than 2h
```

### `ports end-day`

A friendlier cleanup workflow for shutting down safe dev servers at the end of a work session.

```bash
ports end-day
ports end-day --yes
ports end-day --dry-run
```

### `ports doctor`

Diagnoses common local development port problems without stopping anything.

```bash
ports doctor
ports doctor 3000
```

### `ports protect` and `ports trust`

Persist local safety preferences in `~/.config/portminder/config.yaml` on macOS/Linux or `%APPDATA%\portminder\config.yaml` on Windows.

```bash
ports protect 5432
ports protect postgres
ports protect ~/work/critical-db

ports trust "npm run dev"
ports trust ~/work/demo-app
```

## Fixture Mode

Every command accepts `--fixture [path]` so tests, demos, and AI agents can exercise the CLI without touching live processes.

```bash
ports list --fixture
ports explain 3000 --fixture --json
```

Passing `--fixture` with no value uses built-in demo data. Passing a path reads a JSON fixture shaped as either an array of ports or `{ "ports": [...] }`.

## Safety Model

PortMinder classifies each listening process as:

- `safe`: likely local development server owned by the current user.
- `unknown`: unrecognized process; confirmation required before stopping.
- `protected`: database, Docker, SSH, VPN, proxy, or configured protected entry.
- `blocked`: system/root/admin/other-user process that requires an explicit risk acknowledgement.

Bulk cleanup always previews what will be stopped and what will be preserved unless `--yes` is passed.

## JSON Output

All operational commands support `--json` for agents and scripts:

```bash
ports list --json
ports explain 3000 --json
ports cleanup --dry-run --json
```

## Development

```bash
npm install
npm test
npm run build
npm run check
```
