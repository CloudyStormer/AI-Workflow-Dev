CREATE TABLE event_original_revisions (
  event_id TEXT NOT NULL,
  original_revision INTEGER NOT NULL CHECK (original_revision > 0),
  source_language TEXT NOT NULL CHECK (
    length(source_language) BETWEEN 2 AND 35
    AND source_language NOT GLOB '*[^A-Za-z0-9-]*'
  ),
  original_title TEXT,
  permitted_excerpt TEXT,
  fact_payload_json TEXT NOT NULL CHECK (json_valid(fact_payload_json)),
  payload_sha256 TEXT NOT NULL CHECK (
    length(payload_sha256) = 64
    AND payload_sha256 NOT GLOB '*[^0-9a-f]*'
  ),
  quality_state TEXT NOT NULL CHECK (
    quality_state IN ('available', 'legacy_original_unavailable')
  ),
  observed_at TEXT NOT NULL,
  PRIMARY KEY (event_id, original_revision),
  UNIQUE (event_id, payload_sha256),
  FOREIGN KEY (event_id, original_revision)
    REFERENCES event_revisions(event_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (quality_state = 'available' AND original_title IS NOT NULL AND length(trim(original_title)) > 0)
    OR
    (quality_state = 'legacy_original_unavailable' AND original_title IS NULL AND permitted_excerpt IS NULL)
  )
) STRICT;

CREATE INDEX idx_event_original_revisions_language
  ON event_original_revisions(source_language, observed_at DESC);

CREATE TABLE chinese_counterpart_revisions (
  event_id TEXT NOT NULL,
  original_revision INTEGER NOT NULL CHECK (original_revision > 0),
  locale TEXT NOT NULL CHECK (locale = 'zh-CN'),
  chinese_revision INTEGER NOT NULL CHECK (chinese_revision > 0),
  formation_kind TEXT NOT NULL CHECK (
    formation_kind IN ('human', 'machine', 'rule', 'none')
  ),
  status TEXT NOT NULL CHECK (
    status IN ('source_is_zh', 'ready', 'partial', 'stale', 'needs_review')
  ),
  title_zh TEXT,
  fact_summary_zh TEXT,
  key_changes_json TEXT NOT NULL DEFAULT '[]' CHECK (
    json_valid(key_changes_json) AND json_type(key_changes_json) = 'array'
  ),
  system_assessment_zh TEXT,
  input_sha256 TEXT NOT NULL CHECK (
    length(input_sha256) = 64
    AND input_sha256 NOT GLOB '*[^0-9a-f]*'
  ),
  output_sha256 TEXT NOT NULL CHECK (
    length(output_sha256) = 64
    AND output_sha256 NOT GLOB '*[^0-9a-f]*'
  ),
  formed_at TEXT NOT NULL,
  reviewed_at TEXT,
  PRIMARY KEY (event_id, original_revision, locale, chinese_revision),
  UNIQUE (event_id, original_revision, locale, input_sha256, output_sha256),
  FOREIGN KEY (event_id, original_revision)
    REFERENCES event_original_revisions(event_id, original_revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (
    (status = 'source_is_zh'
      AND formation_kind = 'none'
      AND title_zh IS NULL
      AND fact_summary_zh IS NULL
      AND system_assessment_zh IS NULL)
    OR
    (status = 'ready'
      AND formation_kind <> 'none'
      AND title_zh IS NOT NULL
      AND length(trim(title_zh)) > 0
      AND fact_summary_zh IS NOT NULL
      AND length(trim(fact_summary_zh)) > 0)
    OR
    (status = 'partial'
      AND formation_kind <> 'none'
      AND (title_zh IS NOT NULL OR fact_summary_zh IS NOT NULL))
    OR status IN ('stale', 'needs_review')
  )
) STRICT;

CREATE INDEX idx_chinese_counterpart_revision_lookup
  ON chinese_counterpart_revisions(
    event_id,
    original_revision,
    locale,
    chinese_revision DESC
  );

CREATE TRIGGER event_original_revisions_no_update
BEFORE UPDATE ON event_original_revisions
BEGIN
  SELECT RAISE(ABORT, 'event original revisions are immutable');
END;

CREATE TRIGGER event_original_revisions_no_delete
BEFORE DELETE ON event_original_revisions
BEGIN
  SELECT RAISE(ABORT, 'event original revisions are immutable');
END;

CREATE TRIGGER chinese_counterpart_revisions_no_update
BEFORE UPDATE ON chinese_counterpart_revisions
BEGIN
  SELECT RAISE(ABORT, 'chinese counterpart revisions are immutable');
END;

CREATE TRIGGER chinese_counterpart_revisions_no_delete
BEFORE DELETE ON chinese_counterpart_revisions
BEGIN
  SELECT RAISE(ABORT, 'chinese counterpart revisions are immutable');
END;
