PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (migration_id TEXT PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS refresh_requests (
  request_id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
  trigger_kind TEXT NOT NULL, status TEXT NOT NULL, requested_at TEXT NOT NULL, completed_at TEXT,
  snapshot_id TEXT, result_json TEXT, safe_error TEXT
) STRICT;
CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY, canonical_url TEXT NOT NULL UNIQUE, source_id TEXT NOT NULL,
  publisher TEXT NOT NULL, region TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL,
  category TEXT NOT NULL, event_kind TEXT NOT NULL, version_label TEXT, published_at TEXT NOT NULL,
  first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, current_revision INTEGER NOT NULL,
  current_payload_sha256 TEXT NOT NULL, confidence TEXT NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_events_published_at ON events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_source_id ON events(source_id);
CREATE INDEX IF NOT EXISTS idx_events_kind ON events(event_kind);
CREATE TABLE IF NOT EXISTS event_revisions (
  event_id TEXT NOT NULL REFERENCES events(event_id), revision INTEGER NOT NULL, previous_revision INTEGER,
  payload_json TEXT NOT NULL, payload_sha256 TEXT NOT NULL, observed_at TEXT NOT NULL,
  revision_reason TEXT NOT NULL, PRIMARY KEY (event_id, revision), UNIQUE (event_id, payload_sha256)
) STRICT;
CREATE TABLE IF NOT EXISTS observations (
  observation_id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(event_id), source_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL, source_record_sha256 TEXT NOT NULL, published_at TEXT NOT NULL,
  collected_at TEXT NOT NULL, UNIQUE (source_id, canonical_url, source_record_sha256)
) STRICT;
CREATE TABLE IF NOT EXISTS evidence (
  evidence_id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(event_id),
  observation_id TEXT NOT NULL REFERENCES observations(observation_id), source_id TEXT NOT NULL,
  url TEXT NOT NULL, evidence_kind TEXT NOT NULL, fact_or_assessment TEXT NOT NULL,
  confidence TEXT NOT NULL, collected_at TEXT NOT NULL, UNIQUE (event_id, source_id, url)
) STRICT;
CREATE TABLE IF NOT EXISTS import_batches (
  import_batch_id TEXT PRIMARY KEY, input_path_alias TEXT NOT NULL, input_sha256 TEXT NOT NULL,
  schema_version TEXT NOT NULL, importer_revision TEXT NOT NULL, collection_mode TEXT NOT NULL,
  observed_at TEXT NOT NULL, record_count INTEGER NOT NULL, status TEXT NOT NULL,
  validation_report_sha256 TEXT NOT NULL, UNIQUE (input_sha256, schema_version, importer_revision)
) STRICT;
CREATE TABLE IF NOT EXISTS import_records (
  import_batch_id TEXT NOT NULL REFERENCES import_batches(import_batch_id), source_record_id TEXT NOT NULL,
  source_record_sha256 TEXT NOT NULL, ordinal INTEGER NOT NULL, status TEXT NOT NULL, safe_error TEXT,
  PRIMARY KEY (import_batch_id, source_record_id)
) STRICT;
CREATE TABLE IF NOT EXISTS snapshots (
  snapshot_id TEXT PRIMARY KEY, snapshot_date TEXT NOT NULL, timezone TEXT NOT NULL,
  acquisition_mode TEXT NOT NULL, as_of TEXT NOT NULL, published_at TEXT NOT NULL,
  previous_snapshot_id TEXT REFERENCES snapshots(snapshot_id), manifest_sha256 TEXT NOT NULL UNIQUE,
  truth TEXT NOT NULL, event_count INTEGER NOT NULL, source_success_count INTEGER NOT NULL,
  source_failure_count INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS snapshot_items (
  snapshot_id TEXT NOT NULL REFERENCES snapshots(snapshot_id), event_id TEXT NOT NULL REFERENCES events(event_id),
  event_revision INTEGER NOT NULL, rank INTEGER NOT NULL, item_sha256 TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, event_id), UNIQUE (snapshot_id, rank),
  FOREIGN KEY (event_id, event_revision) REFERENCES event_revisions(event_id, revision)
) STRICT;
CREATE TABLE IF NOT EXISTS snapshot_source_watermarks (
  snapshot_id TEXT NOT NULL REFERENCES snapshots(snapshot_id), source_id TEXT NOT NULL, outcome TEXT NOT NULL,
  included_until TEXT, last_success_at TEXT, safe_error TEXT, PRIMARY KEY (snapshot_id, source_id)
) STRICT;
CREATE TABLE IF NOT EXISTS current_snapshot_pointer (
  pointer_scope TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES snapshots(snapshot_id),
  revision INTEGER NOT NULL, updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS publication_records (
  publication_id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES refresh_requests(request_id),
  candidate_manifest_sha256 TEXT NOT NULL, result TEXT NOT NULL, snapshot_id TEXT REFERENCES snapshots(snapshot_id),
  pointer_before TEXT, pointer_after TEXT, created_at TEXT NOT NULL
) STRICT;
CREATE TRIGGER IF NOT EXISTS event_revisions_no_update BEFORE UPDATE ON event_revisions BEGIN SELECT RAISE(ABORT, 'event revisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS event_revisions_no_delete BEFORE DELETE ON event_revisions BEGIN SELECT RAISE(ABORT, 'event revisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS snapshots_no_update BEFORE UPDATE ON snapshots BEGIN SELECT RAISE(ABORT, 'snapshots are immutable'); END;
CREATE TRIGGER IF NOT EXISTS snapshots_no_delete BEFORE DELETE ON snapshots BEGIN SELECT RAISE(ABORT, 'snapshots are immutable'); END;
CREATE TRIGGER IF NOT EXISTS snapshot_items_no_update BEFORE UPDATE ON snapshot_items BEGIN SELECT RAISE(ABORT, 'snapshot items are immutable'); END;
CREATE TRIGGER IF NOT EXISTS snapshot_items_no_delete BEFORE DELETE ON snapshot_items BEGIN SELECT RAISE(ABORT, 'snapshot items are immutable'); END;
