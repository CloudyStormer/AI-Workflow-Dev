# Frontend Career Radar backend local runtime contract

Local Fastify and SQLite service for private Career material storage,
classification, deterministic structured analysis, and append-only history. It
uses the fixed 08 encrypted data layer and requires no external server,
database, API key, or network source.

## Commands

```bash
cd projects/market-analysis-dev/backend
export PORT=4318
export DATA_DIR="$PWD/var/local-runtime"
export CORS_ORIGINS=http://127.0.0.1:4177,http://127.0.0.1:5173
export LOCAL_TENANT_ID=local-career-owner
export LOCAL_ACCOUNT_ID=local-career-account
export MATERIAL_ENCRYPTION_KEY_HEX=<64-lowercase-hex-characters>
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run test:unit
npm run test:integration
npm run test:contract
```

All values are explicit. The normal integration port is 4318. `DATA_DIR` must
be absolute and non-root. The encryption key is a runtime-only 32-byte key and
must never be committed or logged. The API derives the local tenant/account
from configuration; request bodies cannot override either identity.

The listener is always `127.0.0.1`. CORS must contain exactly the fixed local
frontend (4177) and Vite development (5173) origins; wildcard and other origins
fail closed. Mutations additionally require an exact Origin. No cookies or
credentialed CORS are used.

## API

- `GET /healthz` and `GET /health/live`
- `GET /readyz` and `GET /health/ready`
- `POST /api/v1/materials`
- `GET /api/v1/materials/:materialId/versions/:versionId`
- `GET /api/v1/materials/:materialId/versions`
- `GET /api/v1/history`
- `POST /api/v1/materials/:materialId:classify`
- `PATCH /api/v1/materials/:materialId/classification`
- `POST /api/v1/materials/:materialId:analyze`
- `GET /api/v1/materials/:materialId/analyses/:analysisRevisionId`
- `GET /api/v1/research/snapshots/current`

Material save, classify, and analyze require `Idempotency-Key`. Classification
confirmation requires `If-Match`. Every request is Zod-validated, every
response is `private, no-store`, and failures use a request-ID-bearing error
envelope without raw input, key material, ciphertext, or stack traces.

At startup the service applies checksummed migrations, imports the exact
approved-static 2026-08-25 public batch idempotently, verifies the private
encryption key, and only then reports readiness. User material is encrypted in
the Git-ignored local SQLite database; deterministic analysis never performs a
network request.
