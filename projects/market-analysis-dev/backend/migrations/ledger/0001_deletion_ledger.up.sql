CREATE TABLE deletion_generations (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  resource_kind TEXT NOT NULL CHECK (resource_kind IN ('account', 'material', 'evidence', 'analysis', 'export')),
  resource_alias TEXT NOT NULL,
  generation INTEGER NOT NULL CHECK (generation >= 1),
  operation_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('planned', 'in_progress', 'failed', 'completed')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, account_id, resource_kind, resource_alias, generation),
  UNIQUE (tenant_id, account_id, operation_id)
) STRICT;

CREATE TABLE deletion_tombstones (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  tombstone_id TEXT NOT NULL,
  resource_kind TEXT NOT NULL,
  resource_alias TEXT NOT NULL,
  generation INTEGER NOT NULL,
  reason_code TEXT NOT NULL,
  receipt_sha256 TEXT NOT NULL CHECK (length(receipt_sha256) = 64),
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, tombstone_id),
  UNIQUE (tenant_id, account_id, resource_kind, resource_alias, generation),
  FOREIGN KEY (tenant_id, account_id, resource_kind, resource_alias, generation)
    REFERENCES deletion_generations (tenant_id, account_id, resource_kind, resource_alias, generation)
) STRICT;

CREATE INDEX deletion_tombstones_replay_idx
  ON deletion_tombstones (tenant_id, account_id, generation, created_at);

CREATE TRIGGER deletion_tombstones_immutable_update
BEFORE UPDATE ON deletion_tombstones
BEGIN
  SELECT RAISE(ABORT, 'deletion tombstones are immutable');
END;

CREATE TRIGGER deletion_tombstones_immutable_delete
BEFORE DELETE ON deletion_tombstones
BEGIN
  SELECT RAISE(ABORT, 'deletion tombstones cannot be deleted');
END;
