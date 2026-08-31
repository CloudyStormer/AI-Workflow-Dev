INSERT INTO chinese_counterpart_revisions (
  event_id, original_revision, locale, chinese_revision, formation_kind,
  status, title_zh, fact_summary_zh, key_changes_json,
  system_assessment_zh, input_sha256, output_sha256, formed_at, reviewed_at
) VALUES (
  'event_bilingual_fixture', 1, 'zh-TW', 2, 'rule', 'ready',
  '不允许的地区语言', '该行必须被 locale 约束拒绝。', '[]', NULL,
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  '2026-08-28T00:02:00.000Z', NULL
);
