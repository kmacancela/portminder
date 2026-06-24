---
name: portminder
description: Safely inspect, explain, free, stop, and clean up local development ports with the PortMinder CLI. Use when a user asks what is running on a port, reports EADDRINUSE or "port already in use", wants stale dev servers stopped, or needs end-of-day local development cleanup without killing protected services.
---

# PortMinder

Use the `ports` CLI to inspect and manage local listening ports safely.

## Safety Rules

- Always inspect before stopping processes.
- For bulk cleanup, run `ports cleanup --dry-run` first unless the user explicitly requested non-interactive cleanup.
- Never stop protected services by default: databases, Docker, SSH, VPNs, nginx/apache, root/admin/system processes, or other-user processes.
- Prefer graceful termination. Use force only after graceful termination fails and the user has approved the risk.
- Explain actions in terms of ports, projects, and app names, not only PIDs.
- Report exactly what was stopped and what was preserved.

## Common Commands

- List ports: `ports list --json`
- Explain a port: `ports explain <port>`
- Free a blocked dev port: `ports free <port>`
- Preview cleanup: `ports cleanup --dry-run`
- End-of-day cleanup: `ports end-day`

## Response Style

Summarize what is running, what is safe to stop, what is protected, and what action was taken. If PortMinder refuses to stop something, explain the safety reason and offer the least risky next step.
