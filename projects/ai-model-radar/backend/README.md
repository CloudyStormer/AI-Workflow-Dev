# AI Model Radar backend

Local-only Fastify and SQLite service for AI Model Radar. It stores immutable
event revisions and snapshots, refreshes allowlisted official public sources,
and serves the Chinese frontend without requiring a cloud server, external
database, API key, or user-provided data service.

## Requirements

- Node.js 22.12.0 or newer
- npm

## Explicit local configuration

All configuration is explicit. The host is restricted to loopback, the data
directory must be inside this backend directory, and CORS accepts one explicit
loopback frontend origin:

```sh
export AMR_API_HOST=127.0.0.1
export AMR_API_PORT=4317
export AMR_DATA_DIR="$PWD/.local-data"
export AMR_CORS_ORIGINS=http://127.0.0.1:5173,http://127.0.0.1:4174
export AMR_SOURCE_TIMEOUT_MS=12000
export AMR_SOURCE_RETRIES=2
```

SQLite uses foreign keys, WAL, and a 5000 ms busy timeout. Local database and
sidecar files are ignored by Git. The process exits before listening when any
required configuration is missing or invalid.

`AMR_CORS_ORIGINS` is fail-closed: it must contain exactly the Vite development
origin on port 5173 and the fixed local integration origin on port 4174. Wildcard,
non-loopback, extra, or missing origins are rejected at startup.

## Commands

```sh
npm run dev
npm run build
npm run lint
npm run typecheck
npm run db:migrate
npm run import:verified
npm run refresh:now -- manual-YYYYMMDD-HHMMSS
npm run test:unit
npm run test:integration
npm run test:contract
npm test
npm run start
```

`refresh:now` contacts only the source definitions in
`src/sources/definitions.ts`. It records each source attempt and either
atomically publishes a new snapshot or keeps the previous safe snapshot.

## HTTP API

- `GET /health/live`
- `GET /health/ready?capability=query|runtime`
- `POST /api/v1/radar/refresh` with `Idempotency-Key` and optional JSON
  `{ "trigger_kind": "manual" }`
- `GET /api/v1/radar/today`
- `GET /api/v1/radar/events?limit=50`
- `GET /api/v1/radar/events/:eventId`
- `GET /api/v1/radar/history`
- `GET /api/v1/radar/snapshots/:snapshotId`
- `GET /api/v1/radar/sources`
- `GET /api/v1/radar/source-quality`
- `GET /api/v1/radar/trends`
- `GET /api/v1/radar/open-source`

Successful content responses expose snapshot identity, `as_of`, freshness,
coverage and `truth` (`live`, `stale`, `degraded`, or `not_ready`). Control and
error responses use a structured envelope. Every response is `private,
no-store` and carries the same request ID in the body and `x-request-id`.

## Health truth contract

- `GET /health/live` returns `200` and proves only that the process event loop
  can respond.
- `GET /health/ready?capability=query` is ready only after migrations and a
  published snapshot exist.
- `GET /health/ready?capability=runtime` is independently ready after both
  databases are migrated and the configured runtime is initialized.

All health responses use `Cache-Control: private, no-store` and expose the
request ID in both the response body and `x-request-id` header.
