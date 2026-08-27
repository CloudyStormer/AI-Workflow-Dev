# Career material analysis data/API handoff

Version: `1.0.0`

Data owner: fixed 08

API owner: fixed 07
Frontend consumer: fixed 06

## Storage truth

- `private` schema head `1`: encrypted material versions, rights receipts,
  classification requests/jobs/attempts/suggestions/decision revisions,
  analysis requests/jobs/attempts/revisions/findings/evidence, idempotency and
  safe sync changes.
- `ledger` schema head `1`: deletion generations and immutable tombstones. The
  schema exists, but this handoff does not authorize or execute a real delete.
- `public` schema head `1`: exact verified import batch, public event revisions,
  evidence, immutable approved-static snapshots/items and the local pointer.
- `governance` and `seed` remain at schema head `0`.
- Private bodies are AES-256-GCM ciphertext in SQLite. The 32-byte key is a
  runtime secret supplied by fixed 07; it must never enter Git, logs, public,
  governance, seed or response metadata.

The source-of-truth TypeScript contract is
`backend/src/contracts/material-analysis.ts`. Fixed 07 should adapt HTTP to the
`MaterialAnalysisStore`; fixed 06 must consume HTTP only and must not read DB,
repository JSON, localStorage, fixture or mock data as formal truth.

## Required HTTP contract for fixed 07

All private routes require a Career account-derived `tenant_id/account_id` from
the server session. The browser never sends or overrides those IDs. Responses
use `Cache-Control: private, no-store` and include a request ID. Mutations
require exact `Origin`/CSRF handling in the API layer.

### Save a material version

`POST /api/v1/materials`

Headers: `Idempotency-Key` (8–200 printable characters)

```json
{
  "material_id": "client-or-server-stable-id",
  "body": "1–100000 Unicode code points",
  "storage_scope": "private_user",
  "metadata": {
    "source_channel": "user_input",
    "content_type": "resume|job_description|interview_note|project_record|article_or_note",
    "title": "optional",
    "user_provided_url": "optional-metadata-only-never-fetched",
    "locale": "zh-CN",
    "timezone": "Asia/Shanghai"
  },
  "rights_confirmation": {
    "user_has_rights": true,
    "sensitive_data_acknowledged": true,
    "policy_revision": "career-private-rights-1.0.0"
  }
}
```

Success `201` (new) or `200` (idempotent replay):

```json
{
  "material_id": "...",
  "version_id": "...",
  "version_no": 1,
  "body_sha256": "private-response-only-64-hex",
  "unicode_count": 80,
  "metadata": {},
  "created_at": "ISO-8601",
  "state": "saved"
}
```

The save response may echo neither ciphertext nor encryption metadata. A URL-
only body is rejected and produces zero DNS/HTTP bytes.

### Read exact content and version history

- `GET /api/v1/materials/{material_id}/versions/{version_id}` returns the exact
  decrypted body only to the owning account, plus version identity/hash.
- `GET /api/v1/materials/{material_id}/versions` returns append-only version
  metadata and must omit every body.
- `GET /api/v1/history` returns the owning account's material histories from
  `listHistories(tenantId, accountId)`; optional `material_id` narrows it through
  `getHistory`. Both return exact version, classification and analysis revision
  identities and never resolve an old reference to current.

History envelope:

```json
{
  "material_id": "...",
  "current_version_no": 2,
  "current_classification_revision": 1,
  "current_analysis_revision": 1,
  "versions": [],
  "classifications": [],
  "analyses": []
}
```

### Classify and confirm

`POST /api/v1/materials/{material_id}:classify` with `material_version_id` and
`Idempotency-Key` returns:

```json
{
  "suggestion_id": "...",
  "request_id": "...",
  "material_id": "...",
  "material_version_id": "...",
  "source_channel": "user_input",
  "content_type": "project_record",
  "basis": ["检测到项目与职责陈述"],
  "confidence": 0.83,
  "rule_revision": "career-local-classification-1.0.0",
  "status": "awaiting_confirmation",
  "created_at": "ISO-8601"
}
```

`PATCH /api/v1/materials/{material_id}/classification` requires
`If-Match: <current-classification-revision>` and the exact material version.
It appends a `user-confirmed` decision. A suggestion is never treated as
confirmation; confirmation never upgrades content to externally verified.

### Analyze

`POST /api/v1/materials/{material_id}:analyze` requires an exact confirmed
classification decision and `Idempotency-Key`:

```json
{
  "material_version_id": "...",
  "classification_decision_id": "...",
  "public_snapshot": {
    "snapshot_id": "optional-exact-id",
    "manifest_sha256": "optional-exact-64-hex"
  }
}
```

Result fields:

```json
{
  "analysis_revision_id": "...",
  "analysis_job_id": "...",
  "material_id": "...",
  "material_version_id": "...",
  "material_version_sha256": "...",
  "classification_decision_id": "...",
  "revision_no": 1,
  "status": "completed|uncertain",
  "rule_bundle_id": "career-local-deterministic-analysis",
  "rule_bundle_version": "1.0.0",
  "rule_bundle_sha256": "...",
  "public_snapshot_id": null,
  "public_snapshot_sha256": null,
  "result_sha256": "...",
  "summary": {
    "headline": "new structured conclusion, not source echo",
    "counts": {
      "skill": 2,
      "tool": 2,
      "framework": 1,
      "responsibility": 1,
      "project": 1,
      "outcome": 1,
      "unknown": 0
    },
    "strongest_signals": [],
    "unknown_kinds": [],
    "truth_notice": "..."
  },
  "findings": [
    {
      "finding_id": "...",
      "kind": "skill|tool|framework|responsibility|project|outcome|unknown",
      "label": "React",
      "fact_layer": "externally-verifiable|user-stated|system-inference|UNKNOWN",
      "confidence": 0.96,
      "rule_revision": "1.0.0",
      "evidence": {
        "evidence_id": "...",
        "start_codepoint": 12,
        "end_codepoint": 17,
        "snippet": "React",
        "relation": "supports|insufficient"
      }
    }
  ],
  "created_at": "ISO-8601"
}
```

Direct extraction from user material is `user-stated`; deterministic derived
signals are `system-inference`; missing categories are `UNKNOWN`. Only a future
independent verification revision may emit `externally-verifiable`.

## Public snapshot contract

`GET /api/v1/research/snapshots/current?content_mode=approved_static`
returns the exact local pointer and manifest for the verified 2026-08-25 batch:
8 records, technology 4, recruitment purpose samples 4, mainland China 0,
`runtime_enabled=false`, `live_connectors=0`. A live request must not silently
fall back to this snapshot.

## Health and readiness

- `GET /healthz`: process liveness only; it does not prove storage readiness.
- `GET /readyz`: remains `503` until fixed 07 verifies all required components.
- Data component may become ready only when migrations are at
  `private=1/public=1/ledger=1`, WAL/FK/busy timeout are active, the private
  encryption key is exactly 32 bytes, and the approved-static snapshot pointer
  hash is readable. Missing any component is `not_ready`, never an empty 200.

Suggested component names: `private_db`, `public_db`, `ledger_db`,
`private_encryption_key`, `approved_static_snapshot`. Source runtime remains a
separate false component and does not block reading approved-static history.

## Errors and limits

| Code | HTTP | Meaning |
|---|---:|---|
| `EMPTY_INPUT` | 422 | Empty/whitespace body |
| `INPUT_TOO_LARGE` | 413 | Over 100000 Unicode code points |
| `INVALID_UNICODE` | 422 | Unpaired surrogate |
| `URL_ONLY_INPUT` | 422 | URL-only input; never fetched |
| `RIGHTS_CONFIRMATION_REQUIRED` | 422 | Rights receipt missing |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Same key, different payload |
| `MATERIAL_NOT_FOUND` | 404 | No owning-account resource |
| `MATERIAL_VERSION_NOT_FOUND` | 404 | Exact version absent |
| `REVISION_CONFLICT` | 409 | Stale `If-Match`/base revision |
| `CLASSIFICATION_REQUIRED` | 409 | Exact confirmed decision absent |
| `HISTORICAL_REFERENCE_MISMATCH` | 409 | Exact hash/version mismatch |
| `STORAGE_NOT_READY` | 503 | Schema/key/config unavailable |

The API must not include private body, body hash, raw URL query, ciphertext,
key material, Cookie, token or stack trace in ordinary logs or error bodies.
