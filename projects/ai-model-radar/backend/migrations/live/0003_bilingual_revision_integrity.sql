CREATE TABLE migration_0003_integrity_guard (
  check_name TEXT PRIMARY KEY,
  invalid_count INTEGER NOT NULL CHECK (invalid_count = 0)
) STRICT;

INSERT INTO migration_0003_integrity_guard (check_name, invalid_count)
SELECT 'original_payload_lineage', COUNT(*)
FROM event_original_revisions AS original
LEFT JOIN event_revisions AS parent
  ON parent.event_id = original.event_id
 AND parent.revision = original.original_revision
 AND parent.payload_sha256 = original.payload_sha256
WHERE parent.event_id IS NULL;

INSERT INTO migration_0003_integrity_guard (check_name, invalid_count)
SELECT 'canonical_source_language', COUNT(*)
FROM event_original_revisions
WHERE source_language <> canonical_bcp47(source_language);

INSERT INTO migration_0003_integrity_guard (check_name, invalid_count)
SELECT 'chinese_counterpart_truth_matrix', COUNT(*)
FROM chinese_counterpart_revisions AS counterpart
JOIN event_original_revisions AS original
  ON original.event_id = counterpart.event_id
 AND original.original_revision = counterpart.original_revision
WHERE NOT (
  (
    counterpart.status = 'source_is_zh'
    AND counterpart.formation_kind = 'none'
    AND (original.source_language = 'zh' OR original.source_language LIKE 'zh-%')
    AND counterpart.title_zh IS NULL
    AND counterpart.fact_summary_zh IS NULL
    AND json_array_length(counterpart.key_changes_json) = 0
    AND counterpart.system_assessment_zh IS NULL
  )
  OR
  (
    counterpart.status IN ('ready', 'partial', 'stale', 'needs_review')
    AND counterpart.formation_kind IN ('human', 'machine', 'rule')
    AND original.source_language <> 'zh'
    AND original.source_language NOT LIKE 'zh-%'
    AND (counterpart.title_zh IS NULL OR length(trim(counterpart.title_zh)) > 0)
    AND (
      counterpart.fact_summary_zh IS NULL
      OR length(trim(counterpart.fact_summary_zh)) > 0
    )
    AND (
      counterpart.system_assessment_zh IS NULL
      OR length(trim(counterpart.system_assessment_zh)) > 0
    )
    AND (
      (
        counterpart.status = 'ready'
        AND counterpart.title_zh IS NOT NULL
        AND counterpart.fact_summary_zh IS NOT NULL
      )
      OR
      (
        counterpart.status IN ('partial', 'stale', 'needs_review')
        AND (
          counterpart.title_zh IS NOT NULL
          OR counterpart.fact_summary_zh IS NOT NULL
        )
      )
    )
  )
);

DROP TABLE migration_0003_integrity_guard;

CREATE UNIQUE INDEX idx_event_revisions_payload_identity
  ON event_revisions(event_id, revision, payload_sha256);

CREATE TRIGGER event_original_revisions_payload_identity_insert
BEFORE INSERT ON event_original_revisions
WHEN NOT EXISTS (
  SELECT 1
  FROM event_revisions AS parent
  WHERE parent.event_id = NEW.event_id
    AND parent.revision = NEW.original_revision
    AND parent.payload_sha256 = NEW.payload_sha256
)
BEGIN
  SELECT RAISE(ABORT, 'event original payload sha256 must match parent revision');
END;

CREATE TRIGGER event_original_revisions_canonical_language_insert
BEFORE INSERT ON event_original_revisions
WHEN NEW.source_language <> canonical_bcp47(NEW.source_language)
BEGIN
  SELECT RAISE(ABORT, 'source language must be canonical BCP 47');
END;

CREATE TRIGGER chinese_counterpart_revisions_truth_matrix_insert
BEFORE INSERT ON chinese_counterpart_revisions
WHEN NOT (
  (
    NEW.status = 'source_is_zh'
    AND NEW.formation_kind = 'none'
    AND EXISTS (
      SELECT 1
      FROM event_original_revisions AS original
      WHERE original.event_id = NEW.event_id
        AND original.original_revision = NEW.original_revision
        AND (original.source_language = 'zh' OR original.source_language LIKE 'zh-%')
    )
    AND NEW.title_zh IS NULL
    AND NEW.fact_summary_zh IS NULL
    AND json_array_length(NEW.key_changes_json) = 0
    AND NEW.system_assessment_zh IS NULL
  )
  OR
  (
    NEW.status IN ('ready', 'partial', 'stale', 'needs_review')
    AND NEW.formation_kind IN ('human', 'machine', 'rule')
    AND EXISTS (
      SELECT 1
      FROM event_original_revisions AS original
      WHERE original.event_id = NEW.event_id
        AND original.original_revision = NEW.original_revision
        AND original.source_language <> 'zh'
        AND original.source_language NOT LIKE 'zh-%'
    )
    AND (NEW.title_zh IS NULL OR length(trim(NEW.title_zh)) > 0)
    AND (NEW.fact_summary_zh IS NULL OR length(trim(NEW.fact_summary_zh)) > 0)
    AND (
      NEW.system_assessment_zh IS NULL
      OR length(trim(NEW.system_assessment_zh)) > 0
    )
    AND (
      (
        NEW.status = 'ready'
        AND NEW.title_zh IS NOT NULL
        AND NEW.fact_summary_zh IS NOT NULL
      )
      OR
      (
        NEW.status IN ('partial', 'stale', 'needs_review')
        AND (NEW.title_zh IS NOT NULL OR NEW.fact_summary_zh IS NOT NULL)
      )
    )
  )
)
BEGIN
  SELECT RAISE(ABORT, 'invalid chinese counterpart truth matrix');
END;
