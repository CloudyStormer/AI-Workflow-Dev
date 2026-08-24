# Frontend Career Radar backend local runtime contract

CR-BE-101 establishes the Fastify process foundation. CR-BE-102 adds explicit local runtime configuration and graceful process lifecycle behavior. The backend still has no SQLite database, migrations, source connector, business-analysis endpoint, user-data path, or network collection capability.

## Commands

```bash
cd projects/market-analysis-dev/backend
PORT=0 DATA_DIR=/absolute/local/path npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run test:unit
```

`PORT` and `DATA_DIR` are both required. `PORT=0` explicitly requests a local ephemeral port; a fixed port must also be supplied explicitly. `DATA_DIR` must be an absolute, non-root path. CR-BE-102 validates and exposes this path but does not create it or write any data.

The API always listens on `127.0.0.1`; no environment variable can widen the binding. `SIGINT` and `SIGTERM` close the Fastify server once, while startup and shutdown failures set a non-zero process exit code. `GET /healthz` reports process liveness only; `GET /readyz` intentionally returns `503` with `not_ready` until later, separately approved work implements SQLite, migrations, runtime registrations, snapshots, and a worker.
