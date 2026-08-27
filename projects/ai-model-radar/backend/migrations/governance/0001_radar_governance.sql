PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (migration_id TEXT PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS sources (
  source_id TEXT PRIMARY KEY, name TEXT NOT NULL, publisher TEXT NOT NULL, region TEXT NOT NULL,
  source_kind TEXT NOT NULL, endpoint_url TEXT NOT NULL UNIQUE, homepage_url TEXT NOT NULL,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)), runtime_enabled INTEGER NOT NULL CHECK (runtime_enabled IN (0, 1)),
  poll_interval_minutes INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS source_runs (
  source_run_id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(source_id),
  started_at TEXT NOT NULL, finished_at TEXT NOT NULL, outcome TEXT NOT NULL, http_status INTEGER,
  record_count INTEGER NOT NULL, bytes_received INTEGER NOT NULL, duration_ms INTEGER NOT NULL,
  retry_count INTEGER NOT NULL, safe_error TEXT
) STRICT;
CREATE INDEX IF NOT EXISTS idx_source_runs_source_time ON source_runs(source_id, started_at DESC);
CREATE TABLE IF NOT EXISTS source_status (
  source_id TEXT PRIMARY KEY REFERENCES sources(source_id), last_attempt_at TEXT, last_success_at TEXT,
  last_outcome TEXT NOT NULL, last_http_status INTEGER, last_record_count INTEGER NOT NULL,
  consecutive_failures INTEGER NOT NULL, safe_error TEXT
) STRICT;
CREATE TABLE IF NOT EXISTS audit_events (
  audit_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, subject_id TEXT NOT NULL,
  outcome TEXT NOT NULL, details_json TEXT NOT NULL, created_at TEXT NOT NULL
) STRICT;
CREATE TRIGGER IF NOT EXISTS source_runs_no_update BEFORE UPDATE ON source_runs BEGIN SELECT RAISE(ABORT, 'source runs are immutable'); END;
CREATE TRIGGER IF NOT EXISTS source_runs_no_delete BEFORE DELETE ON source_runs BEGIN SELECT RAISE(ABORT, 'source runs are immutable'); END;
CREATE TRIGGER IF NOT EXISTS audit_events_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit events are immutable'); END;
CREATE TRIGGER IF NOT EXISTS audit_events_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit events are immutable'); END;
