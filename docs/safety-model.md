# Safety Model

PortMinder is designed to free local development ports without normalizing risky process killing.

## Statuses

### safe

Processes are safe when they look like local development servers owned by the current user. Examples include `next dev`, `vite`, `webpack-dev-server`, `rails server`, `django runserver`, `flask run`, `uvicorn`, `fastapi dev`, and `python -m http.server`.

### unknown

Unknown processes are owned by the current user but do not match a known safe or protected pattern. PortMinder asks before stopping them.

### protected

Protected processes are never stopped by default. This includes databases, caches, Docker, SSH, VPN clients, reverse proxies, configured protected ports, configured protected process names, and configured protected projects.

### blocked

Blocked processes require `--force --i-understand`. Examples include PID 1, root/admin-owned processes, and processes owned by another user.

## Precedence

1. Blocked system or other-user signals win.
2. Explicit protected config wins over classification.
3. Built-in protected classifications win over trusted config.
4. Trusted config can promote unknown current-user processes to safe.
5. Known dev-server classifications are safe.
6. Everything else is unknown.

## Termination

PortMinder sends a graceful termination signal first. It only sends a forceful termination signal when `--force` is present and the graceful attempt did not free the port.

Dry-run commands never call termination code.
