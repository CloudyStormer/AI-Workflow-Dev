# Career SQLite migration contract and execution baseline

This directory defines five independent migration streams for the local SQLite
boundaries approved by the project architecture:

- `governance` → `career-governance.sqlite`
- `public` → `career-public.sqlite`
- `private` → `career-private.sqlite`
- `seed` → `career-seed-demo.sqlite`
- `ledger` → `career-deletion-ledger.sqlite`

Each stream owns one `manifest.json`. Migration SQL, when introduced by an
approved later work item, is addressed by the SHA-256 of its exact file bytes.
IDs and versions are contiguous from `0001`/`1`; duplicate, reordered,
unknown-field, cross-mode, unsafe-path, missing-file, and checksum-mismatch
inputs fail closed. A reversible migration may address an `explicit-down` file
with its own exact-byte checksum. An irreversible migration must declare
`restore-only` and use an isolated verified backup, never fabricated down SQL.

The five current manifests remain intentionally empty and declare
`contract-only-not-applied`. CFR-DW-DATA-201 adds a local execution baseline
that validates those manifests, creates one mode-scoped directory and SQLite
file per stream, enables WAL/foreign keys/busy timeout on every migration
connection, and records exact migration identities in a private framework
history table. Replaying an unchanged stream is a no-op; an applied identity or
checksum mismatch fails closed.

The runner rejects symlinked data boundaries, cross-database `ATTACH`, migration
transaction control, and unregistered SQL bytes. An `explicit-down` migration
can be rolled back transactionally; `restore-only` never fabricates down SQL.
The built-in Node SQLite interface is enabled only for the migration commands:

```bash
npm run test:migration
npm run test:integration
```

These commands use isolated temporary directories. No database under
`backend/var`, no business schema, no user content, and no source batch is
created by this baseline. Executable positive and negative probes live only
under `backend/tests/fixtures/migrations`.
