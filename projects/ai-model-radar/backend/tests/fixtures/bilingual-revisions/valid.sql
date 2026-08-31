INSERT INTO events (
  event_id, canonical_url, source_id, publisher, region, title, summary,
  category, event_kind, version_label, published_at, first_seen_at,
  last_seen_at, current_revision, current_payload_sha256, confidence
) VALUES (
  'event_bilingual_fixture', 'https://example.com/releases/model-r1',
  'source_fixture', 'Fixture Publisher', 'global', 'Model R1 released',
  'A controlled fixture summary.', 'model', 'model-release', 'r1',
  '2026-08-28T00:00:00.000Z', '2026-08-28T00:00:00.000Z',
  '2026-08-28T00:00:00.000Z', 1,
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'high'
);

INSERT INTO event_revisions (
  event_id, revision, previous_revision, payload_json, payload_sha256,
  observed_at, revision_reason
) VALUES (
  'event_bilingual_fixture', 1, NULL, '{"title":"Model R1 released"}',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '2026-08-28T00:00:00.000Z', 'fixture'
);

INSERT INTO event_original_revisions (
  event_id, original_revision, source_language, original_title,
  permitted_excerpt, fact_payload_json, payload_sha256, quality_state,
  observed_at
) VALUES (
  'event_bilingual_fixture', 1, 'en', 'Model R1 released',
  'A controlled fixture excerpt.', '{"version":"r1"}',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'available', '2026-08-28T00:00:00.000Z'
);

INSERT INTO chinese_counterpart_revisions (
  event_id, original_revision, locale, chinese_revision, formation_kind,
  status, title_zh, fact_summary_zh, key_changes_json,
  system_assessment_zh, input_sha256, output_sha256, formed_at, reviewed_at
) VALUES (
  'event_bilingual_fixture', 1, 'zh-CN', 1, 'rule', 'ready',
  'Model R1 已发布', '这是受控 fixture 的事实摘要。', '["保留版本号 R1"]',
  '这是与译文事实分离的系统评估。',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  '2026-08-28T00:01:00.000Z', NULL
);
