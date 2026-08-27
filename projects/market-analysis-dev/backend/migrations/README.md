# Career SQLite migration contract and execution baseline

This directory defines five independent migration streams for the local SQLite
boundaries approved by the project architecture:

- `governance` → `career-governance.sqlite`
- `public` → `career-public.sqlite`
- `private` → `career-private.sqlite`
- `seed` → `career-seed-demo.sqlite`
- `ledger` → `career-deletion-ledger.sqlite`

Each stream owns one `manifest.json`. Every migration SQL file is addressed by
the SHA-256 of its exact bytes. IDs and versions are contiguous from `0001`/`1`;
duplicate, reordered,
unknown-field, cross-mode, unsafe-path, missing-file, and checksum-mismatch
inputs fail closed. A reversible migration may address an `explicit-down` file
with its own exact-byte checksum. An irreversible migration must declare
`restore-only` and use an isolated verified backup, never fabricated down SQL.

The current schema heads are `private=1`, `public=1`, `ledger=1`,
`governance=0`, and `seed=0`. The private stream stores encrypted, append-only
user material versions, rights receipts, classification and deterministic
analysis history, evidence, idempotency records, and safe sync metadata. The
public stream stores only exact verified public batches and immutable local
snapshots. The ledger stream establishes deletion generations and immutable
tombstones but does not execute deletion. Governance and seed remain empty.

The local runner validates each manifest, creates one mode-scoped directory
and SQLite file per stream, enables WAL/foreign keys/busy timeout on every
migration connection, and records exact migration identities in a private
framework history table. Replaying an unchanged stream is a no-op; an applied
identity or checksum mismatch fails closed. Production schema migrations are
reversible and are covered by apply/replay/rollback tests.

The runner rejects symlinked data boundaries, cross-database `ATTACH`, migration
transaction control, and unregistered SQL bytes. An `explicit-down` migration
can be rolled back transactionally; `restore-only` never fabricates down SQL.
The built-in Node SQLite interface is enabled only for the migration commands:

```bash
npm run test:migration
npm run test:integration
```

These commands use isolated temporary directories. No database under
`backend/var`, encryption key, private user content, or generated SQLite file
is committed. The approved-static public importer consumes only an exact-byte,
pre-verified local batch; it performs no network requests. Executable migration
probes live under `backend/tests/fixtures/migrations`, while data persistence and
import smoke tests live under `backend/tests/integration`.
