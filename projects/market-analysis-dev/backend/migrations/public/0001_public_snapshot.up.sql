CREATE TABLE import_batches (
  batch_id TEXT PRIMARY KEY,
  input_sha256 TEXT NOT NULL CHECK (length(input_sha256) = 64),
  schema_version TEXT NOT NULL,
  importer_revision TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  batch_date TEXT NOT NULL,
  record_count INTEGER NOT NULL CHECK (record_count >= 0),
  technology_count INTEGER NOT NULL CHECK (technology_count >= 0),
  recruitment_count INTEGER NOT NULL CHECK (recruitment_count >= 0),
  mainland_china_recruitment_count INTEGER NOT NULL CHECK (mainland_china_recruitment_count >= 0),
  acquisition_mode TEXT NOT NULL CHECK (acquisition_mode = 'manual_verified_import'),
  runtime_enabled INTEGER NOT NULL CHECK (runtime_enabled = 0),
  live_connectors INTEGER NOT NULL CHECK (live_connectors = 0),
  imported_at TEXT NOT NULL,
  UNIQUE (input_sha256, schema_version, importer_revision),
  UNIQUE (idempotency_key)
) STRICT;

CREATE TABLE public_events (
  event_id TEXT PRIMARY KEY,
  identity_sha256 TEXT NOT NULL UNIQUE CHECK (length(identity_sha256) = 64),
  evidence_domain TEXT NOT NULL CHECK (evidence_domain IN ('technology_trend', 'recruitment_sample')),
  publisher TEXT NOT NULL,
  canonical_url TEXT NOT NULL CHECK (canonical_url LIKE 'https://%'),
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE public_event_revisions (
  event_revision_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  revision_no INTEGER NOT NULL CHECK (revision_no >= 1),
  batch_id TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  published_at TEXT,
  observed_at TEXT NOT NULL,
  region TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  career_impact TEXT NOT NULL,
  rights_access TEXT NOT NULL,
  fact_layer TEXT NOT NULL CHECK (fact_layer IN ('source_fact', 'source_claim', 'purpose_sample')),
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256) = 64),
  created_at TEXT NOT NULL,
  UNIQUE (event_id, revision_no),
  UNIQUE (batch_id, source_record_id),
  FOREIGN KEY (event_id) REFERENCES public_events (event_id),
  FOREIGN KEY (batch_id) REFERENCES import_batches (batch_id)
) STRICT;

CREATE INDEX public_event_revisions_domain_time_idx
  ON public_event_revisions (observed_at DESC, event_id);

CREATE TABLE public_evidence (
  evidence_id TEXT PRIMARY KEY,
  event_revision_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL CHECK (canonical_url LIKE 'https://%'),
  evidence_sha256 TEXT NOT NULL CHECK (length(evidence_sha256) = 64),
  rights_access TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (event_revision_id),
  FOREIGN KEY (event_revision_id) REFERENCES public_event_revisions (event_revision_id)
) STRICT;

CREATE TABLE public_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  timezone TEXT NOT NULL,
  content_mode TEXT NOT NULL CHECK (content_mode = 'approved_static'),
  environment TEXT NOT NULL CHECK (environment = 'local'),
  manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
  manifest_sha256 TEXT NOT NULL UNIQUE CHECK (length(manifest_sha256) = 64),
  record_count INTEGER NOT NULL CHECK (record_count >= 0),
  technology_count INTEGER NOT NULL CHECK (technology_count >= 0),
  recruitment_count INTEGER NOT NULL CHECK (recruitment_count >= 0),
  mainland_china_recruitment_count INTEGER NOT NULL CHECK (mainland_china_recruitment_count >= 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES import_batches (batch_id)
) STRICT;

CREATE TABLE public_snapshot_items (
  snapshot_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  event_id TEXT NOT NULL,
  event_revision_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, ordinal),
  UNIQUE (snapshot_id, event_id),
  FOREIGN KEY (snapshot_id) REFERENCES public_snapshots (snapshot_id),
  FOREIGN KEY (event_id) REFERENCES public_events (event_id),
  FOREIGN KEY (event_revision_id) REFERENCES public_event_revisions (event_revision_id),
  FOREIGN KEY (evidence_id) REFERENCES public_evidence (evidence_id)
) STRICT;

CREATE TABLE public_snapshot_pointers (
  content_mode TEXT NOT NULL CHECK (content_mode = 'approved_static'),
  environment TEXT NOT NULL CHECK (environment = 'local'),
  snapshot_id TEXT NOT NULL,
  pointer_revision INTEGER NOT NULL CHECK (pointer_revision >= 1),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (content_mode, environment),
  FOREIGN KEY (snapshot_id) REFERENCES public_snapshots (snapshot_id)
) STRICT;

CREATE TRIGGER public_event_revisions_immutable_update
BEFORE UPDATE ON public_event_revisions
BEGIN
  SELECT RAISE(ABORT, 'public event revisions are immutable');
END;

CREATE TRIGGER public_snapshots_immutable_update
BEFORE UPDATE ON public_snapshots
BEGIN
  SELECT RAISE(ABORT, 'public snapshots are immutable');
END;
