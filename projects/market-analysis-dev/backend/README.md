# Frontend Career Radar backend foundation

CR-BE-101 establishes a local-only Fastify process foundation. It has no SQLite database, migrations, source connector, business-analysis endpoint, user-data path, or network collection capability.

## Commands

```bash
cd projects/market-analysis-dev/backend
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test:unit
```

`npm run dev` listens only on `127.0.0.1`. `PORT` is optional and defaults to `0`, so Node selects a local ephemeral port instead of silently declaring an approved API port. `GET /healthz` reports process liveness only; `GET /readyz` intentionally returns `503` with `not_ready` until later, separately approved work implements SQLite, migrations, runtime registrations, snapshots, and a worker.
