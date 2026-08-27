CREATE TABLE materials (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  storage_scope TEXT NOT NULL CHECK (storage_scope IN ('private_user', 'ephemeral_user')),
  current_version_no INTEGER NOT NULL DEFAULT 0 CHECK (current_version_no >= 0),
  current_classification_revision INTEGER NOT NULL DEFAULT 0 CHECK (current_classification_revision >= 0),
  current_analysis_revision INTEGER NOT NULL DEFAULT 0 CHECK (current_analysis_revision >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, material_id)
) STRICT;

CREATE TABLE material_versions (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  version_no INTEGER NOT NULL CHECK (version_no >= 1),
  body_ciphertext BLOB NOT NULL,
  body_nonce BLOB NOT NULL CHECK (length(body_nonce) = 12),
  body_auth_tag BLOB NOT NULL CHECK (length(body_auth_tag) = 16),
  body_sha256 TEXT NOT NULL CHECK (length(body_sha256) = 64 AND body_sha256 = lower(body_sha256)),
  unicode_count INTEGER NOT NULL CHECK (unicode_count BETWEEN 1 AND 100000),
  metadata_json TEXT NOT NULL CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, version_id),
  UNIQUE (tenant_id, account_id, material_id, version_no),
  UNIQUE (tenant_id, account_id, material_id, body_sha256),
  FOREIGN KEY (tenant_id, account_id, material_id)
    REFERENCES materials (tenant_id, account_id, material_id)
) STRICT;

CREATE INDEX material_versions_history_idx
  ON material_versions (tenant_id, account_id, material_id, version_no DESC);

CREATE TABLE material_rights_receipts (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  material_version_id TEXT NOT NULL,
  user_has_rights INTEGER NOT NULL CHECK (user_has_rights = 1),
  sensitive_data_acknowledged INTEGER NOT NULL CHECK (sensitive_data_acknowledged IN (0, 1)),
  policy_revision TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, receipt_id),
  UNIQUE (tenant_id, account_id, material_version_id, policy_revision),
  FOREIGN KEY (tenant_id, account_id, material_version_id)
    REFERENCES material_versions (tenant_id, account_id, version_id)
) STRICT;

CREATE TABLE operation_idempotency (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  operation_kind TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  response_resource_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, operation_kind, resource_id, idempotency_key)
) STRICT;

CREATE TABLE classification_requests (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  material_version_id TEXT NOT NULL,
  material_version_sha256 TEXT NOT NULL CHECK (length(material_version_sha256) = 64),
  rule_revision TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  processor_permit_revision TEXT NOT NULL CHECK (processor_permit_revision = 'NONE'),
  status TEXT NOT NULL CHECK (status IN ('suggested', 'failed', 'cancelled')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, request_id),
  FOREIGN KEY (tenant_id, account_id, material_version_id)
    REFERENCES material_versions (tenant_id, account_id, version_id)
) STRICT;

CREATE TABLE classification_suggestions (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  suggestion_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  content_type TEXT NOT NULL,
  basis_json TEXT NOT NULL CHECK (json_valid(basis_json)),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  rule_revision TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, suggestion_id),
  UNIQUE (tenant_id, account_id, request_id),
  FOREIGN KEY (tenant_id, account_id, request_id)
    REFERENCES classification_requests (tenant_id, account_id, request_id)
) STRICT;

CREATE TABLE classification_jobs (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('suggested', 'failed', 'cancelled')),
  status_revision INTEGER NOT NULL CHECK (status_revision >= 1),
  created_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, job_id),
  UNIQUE (tenant_id, account_id, request_id),
  FOREIGN KEY (tenant_id, account_id, request_id)
    REFERENCES classification_requests (tenant_id, account_id, request_id)
) STRICT;

CREATE TABLE classification_step_attempts (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  input_sha256 TEXT NOT NULL CHECK (length(input_sha256) = 64),
  rule_revision TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('suggested', 'failed')),
  result_sha256 TEXT NOT NULL CHECK (length(result_sha256) = 64),
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, attempt_id),
  UNIQUE (tenant_id, account_id, job_id),
  FOREIGN KEY (tenant_id, account_id, job_id)
    REFERENCES classification_jobs (tenant_id, account_id, job_id)
) STRICT;

CREATE TABLE classification_decision_revisions (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  material_version_id TEXT NOT NULL,
  revision_no INTEGER NOT NULL CHECK (revision_no >= 1),
  base_revision_no INTEGER NOT NULL CHECK (base_revision_no >= 0),
  source_channel TEXT NOT NULL,
  content_type TEXT NOT NULL,
  actor TEXT NOT NULL CHECK (actor IN ('user', 'system_fixture')),
  reason TEXT NOT NULL,
  fact_layer TEXT NOT NULL CHECK (fact_layer = 'user-confirmed'),
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, decision_id),
  UNIQUE (tenant_id, account_id, material_id, revision_no),
  FOREIGN KEY (tenant_id, account_id, material_version_id)
    REFERENCES material_versions (tenant_id, account_id, version_id)
) STRICT;

CREATE INDEX classification_decision_history_idx
  ON classification_decision_revisions (tenant_id, account_id, material_id, revision_no DESC);

CREATE TABLE analysis_requests (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  material_version_id TEXT NOT NULL,
  material_version_sha256 TEXT NOT NULL CHECK (length(material_version_sha256) = 64),
  classification_decision_id TEXT NOT NULL,
  rule_bundle_id TEXT NOT NULL,
  rule_bundle_version TEXT NOT NULL,
  rule_bundle_sha256 TEXT NOT NULL CHECK (length(rule_bundle_sha256) = 64),
  public_snapshot_id TEXT,
  public_snapshot_sha256 TEXT,
  processor_permit_revision TEXT NOT NULL CHECK (processor_permit_revision = 'NONE'),
  payload_sha256 TEXT NOT NULL CHECK (length(payload_sha256) = 64),
  logical_identity_sha256 TEXT NOT NULL CHECK (length(logical_identity_sha256) = 64),
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, request_id),
  UNIQUE (tenant_id, account_id, logical_identity_sha256),
  FOREIGN KEY (tenant_id, account_id, material_version_id)
    REFERENCES material_versions (tenant_id, account_id, version_id),
  FOREIGN KEY (tenant_id, account_id, classification_decision_id)
    REFERENCES classification_decision_revisions (tenant_id, account_id, decision_id)
) STRICT;

CREATE TABLE analysis_jobs (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'partial', 'completed', 'uncertain', 'failed', 'cancelled')),
  status_revision INTEGER NOT NULL CHECK (status_revision >= 1),
  fencing_token INTEGER NOT NULL CHECK (fencing_token >= 1),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, account_id, job_id),
  UNIQUE (tenant_id, account_id, request_id),
  FOREIGN KEY (tenant_id, account_id, request_id)
    REFERENCES analysis_requests (tenant_id, account_id, request_id)
) STRICT;

CREATE TABLE analysis_step_attempts (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  step_kind TEXT NOT NULL CHECK (step_kind IN ('extract', 'relations', 'summary')),
  attempt_no INTEGER NOT NULL CHECK (attempt_no >= 1),
  input_sha256 TEXT NOT NULL CHECK (length(input_sha256) = 64),
  rule_revision TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('completed', 'uncertain', 'failed')),
  result_sha256 TEXT NOT NULL CHECK (length(result_sha256) = 64),
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, attempt_id),
  UNIQUE (tenant_id, account_id, job_id, step_kind, attempt_no),
  FOREIGN KEY (tenant_id, account_id, job_id)
    REFERENCES analysis_jobs (tenant_id, account_id, job_id)
) STRICT;

CREATE TABLE analysis_revisions (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  analysis_revision_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  material_version_id TEXT NOT NULL,
  material_version_sha256 TEXT NOT NULL CHECK (length(material_version_sha256) = 64),
  classification_decision_id TEXT NOT NULL,
  analysis_job_id TEXT NOT NULL,
  revision_no INTEGER NOT NULL CHECK (revision_no >= 1),
  rule_bundle_id TEXT NOT NULL,
  rule_bundle_version TEXT NOT NULL,
  rule_bundle_sha256 TEXT NOT NULL CHECK (length(rule_bundle_sha256) = 64),
  public_snapshot_id TEXT,
  public_snapshot_sha256 TEXT,
  structured_summary_json TEXT NOT NULL CHECK (json_valid(structured_summary_json)),
  result_sha256 TEXT NOT NULL CHECK (length(result_sha256) = 64),
  supersedes_revision_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, analysis_revision_id),
  UNIQUE (tenant_id, account_id, material_id, revision_no),
  FOREIGN KEY (tenant_id, account_id, material_version_id)
    REFERENCES material_versions (tenant_id, account_id, version_id),
  FOREIGN KEY (tenant_id, account_id, classification_decision_id)
    REFERENCES classification_decision_revisions (tenant_id, account_id, decision_id),
  FOREIGN KEY (tenant_id, account_id, analysis_job_id)
    REFERENCES analysis_jobs (tenant_id, account_id, job_id)
) STRICT;

CREATE INDEX analysis_revision_history_idx
  ON analysis_revisions (tenant_id, account_id, material_id, revision_no DESC);

CREATE TABLE analysis_findings (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  finding_id TEXT NOT NULL,
  analysis_revision_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  finding_kind TEXT NOT NULL CHECK (finding_kind IN ('skill', 'tool', 'framework', 'responsibility', 'project', 'outcome', 'unknown')),
  label TEXT NOT NULL,
  fact_layer TEXT NOT NULL CHECK (fact_layer IN ('externally-verifiable', 'user-stated', 'system-inference', 'UNKNOWN')),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  rule_revision TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, finding_id),
  UNIQUE (tenant_id, account_id, analysis_revision_id, ordinal),
  FOREIGN KEY (tenant_id, account_id, analysis_revision_id)
    REFERENCES analysis_revisions (tenant_id, account_id, analysis_revision_id)
) STRICT;

CREATE INDEX analysis_findings_kind_idx
  ON analysis_findings (tenant_id, account_id, analysis_revision_id, finding_kind);

CREATE TABLE analysis_evidence (
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  finding_id TEXT NOT NULL,
  material_version_id TEXT NOT NULL,
  material_version_sha256 TEXT NOT NULL CHECK (length(material_version_sha256) = 64),
  start_codepoint INTEGER NOT NULL CHECK (start_codepoint >= 0),
  end_codepoint INTEGER NOT NULL CHECK (end_codepoint >= start_codepoint),
  snippet TEXT NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('supports', 'insufficient')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, account_id, evidence_id),
  UNIQUE (tenant_id, account_id, finding_id),
  FOREIGN KEY (tenant_id, account_id, finding_id)
    REFERENCES analysis_findings (tenant_id, account_id, finding_id),
  FOREIGN KEY (tenant_id, account_id, material_version_id)
    REFERENCES material_versions (tenant_id, account_id, version_id)
) STRICT;

CREATE TABLE sync_changes (
  server_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  revision_no INTEGER NOT NULL CHECK (revision_no >= 1),
  operation_id TEXT NOT NULL,
  safe_delta_json TEXT NOT NULL CHECK (json_valid(safe_delta_json)),
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX sync_changes_account_sequence_idx
  ON sync_changes (tenant_id, account_id, server_sequence);

CREATE TRIGGER material_versions_immutable_update
BEFORE UPDATE ON material_versions
BEGIN
  SELECT RAISE(ABORT, 'material versions are immutable');
END;

CREATE TRIGGER material_versions_immutable_delete
BEFORE DELETE ON material_versions
BEGIN
  SELECT RAISE(ABORT, 'material versions require authorized deletion workflow');
END;

CREATE TRIGGER classification_decisions_immutable_update
BEFORE UPDATE ON classification_decision_revisions
BEGIN
  SELECT RAISE(ABORT, 'classification decisions are immutable');
END;

CREATE TRIGGER analysis_revisions_immutable_update
BEFORE UPDATE ON analysis_revisions
BEGIN
  SELECT RAISE(ABORT, 'analysis revisions are immutable');
END;

CREATE TRIGGER analysis_findings_immutable_update
BEFORE UPDATE ON analysis_findings
BEGIN
  SELECT RAISE(ABORT, 'analysis findings are immutable');
END;

CREATE TRIGGER analysis_evidence_immutable_update
BEFORE UPDATE ON analysis_evidence
BEGIN
  SELECT RAISE(ABORT, 'analysis evidence is immutable');
END;
