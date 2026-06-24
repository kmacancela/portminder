# Codex Usage

Use PortMinder from Codex when a user asks what is running locally, why a dev server cannot bind a port, or how to safely clean up local development servers.

Recommended flow:

1. Run `ports list --json`.
2. Use `ports explain <target>` when the user asks what something is.
3. Use `ports free <port>` for `EADDRINUSE` and "port already in use" errors.
4. Use `ports cleanup --dry-run` before bulk cleanup.
5. Only pass `--yes` after the user has approved the specific action.
6. Never force-stop protected or blocked processes unless the user explicitly acknowledges the risk.

Example:

```bash
ports list --json
ports explain 3000
ports free 3000 --dry-run
ports free 3000 --yes
```
