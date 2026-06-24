# Command Reference

## Global Options

- `--fixture [path]`: use built-in demo data or a JSON fixture instead of live processes.
- `--json`: emit stable JSON where supported.

## `ports list`

Lists active local listening ports.

Options:

- `--json`
- `--all`
- `--dev-only`
- `--protected`
- `--watch`

## `ports explain <target>`

Explains a port, PID, process name, framework, command, or project path.

Targets:

- `3000`: port
- `pid:48291`: PID
- `next`: process, command, framework, or project match

## `ports stop <target>`

Stops exactly one matching process after safety checks.

Options:

- `--yes`: skip confirmation for allowed actions.
- `--force`: allow forceful termination after graceful termination fails.
- `--i-understand`: required with `--force` for blocked processes.
- `--dry-run`: preview without terminating.
- `--json`

## `ports free <port>`

Explains and frees one blocked development port.

Options:

- `--yes`
- `--force`
- `--i-understand`
- `--dry-run`
- `--json`

## `ports cleanup`

Stops safe dev servers in bulk.

Options:

- `--dry-run`
- `--yes`
- `--older-than <duration>` where duration is like `30m`, `2h`, or `1d`.
- `--dev-only`
- `--json`

## `ports end-day`

Runs the cleanup workflow with end-of-day wording.

Options:

- `--dry-run`
- `--yes`
- `--json`

## `ports doctor [target]`

Diagnoses port issues without stopping anything.

## `ports protect <target>`

Adds a protected port, process, or project to the config file.

## `ports trust <target>`

Adds a trusted command or project to the config file.
