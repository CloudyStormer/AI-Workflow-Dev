# CR-DATA-101 migration contract

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

The five current manifests are intentionally empty and declare
`contract-only-not-applied`. They do not create a database, apply a schema,
enable runtime readiness, or claim that any business database is online.
Executable positive and negative examples live only under
`backend/tests/fixtures/migrations`.
