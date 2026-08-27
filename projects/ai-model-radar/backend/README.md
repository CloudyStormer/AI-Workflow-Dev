# AI Model Radar backend

Local-only Fastify foundation for AI Model Radar. This unit exposes process
liveness and fail-closed readiness only. It does not create or migrate a
database, import data, access the network, or enable source runtime.

## Requirements

- Node.js 22.12.0 or newer
- npm

## Explicit local configuration

The server has no host or port defaults. Both variables must be supplied, and
the host is restricted to the approved loopback address:

```sh
export AMR_API_HOST=127.0.0.1
export AMR_API_PORT=4317
```

`AMR_API_PORT` is an operator-selected local port because the architecture has
not approved a canonical API port. The process exits before listening when
either value is missing or invalid.

## Commands

```sh
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test:unit
npm test
```

The test suite uses Fastify injection and does not open a listening socket.

## Health truth contract

- `GET /health/live` returns `200` and proves only that the process event loop
  can respond.
- `GET /health/ready?capability=query` returns `503` with
  `operation_state=not_ready` until the approved migrations, live database, and
  snapshot pointer exist.
- `GET /health/ready?capability=runtime` is independently fail-closed and also
  returns `not_ready` in this foundation.

All health responses use `Cache-Control: private, no-store` and expose the
request ID in both the response body and `x-request-id` header.
