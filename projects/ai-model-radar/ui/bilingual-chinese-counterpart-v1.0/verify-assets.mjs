import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const bundleDir = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(bundleDir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const failures = [];
const passes = [];

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function check(condition, label, detail = '') {
  if (condition) passes.push(label);
  else failures.push(`${label}${detail ? `：${detail}` : ''}`);
}

function checkFile(record, label) {
  const filePath = resolve(bundleDir, record.path);
  const actual = sha256(filePath);
  check(actual === record.sha256, `${label} SHA256`, `expected ${record.sha256}, got ${actual}`);
  return filePath;
}

function pngDimensions(filePath) {
  const data = readFileSync(filePath);
  const signature = '89504e470d0a1a0a';
  if (data.subarray(0, 8).toString('hex') !== signature || data.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error(`不是有效 PNG：${filePath}`);
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

checkFile(manifest.input, '已批准 Prompt 输入');
const designPath = checkFile(manifest.artifacts.design_document, '设计说明');
const prototypePath = checkFile(manifest.artifacts.prototype, '交互原型');
const design = readFileSync(designPath, 'utf8');
const prototype = readFileSync(prototypePath, 'utf8');

const requiredViews = ['today', 'events', 'detail', 'trends', 'open', 'history', 'sources', 'states'];
for (const view of requiredViews) {
  check(prototype.includes(`<template id="${view}-view">`), `视图 ${view} 有真实模板`);
  check(prototype.includes(`data-view="${view}"`), `视图 ${view} 有可达入口`);
}
check(manifest.coverage.view_count === requiredViews.length, 'manifest 视图计数为 8');

const requiredStates = [
  '人工译文',
  '机器翻译',
  '规则生成',
  '暂无译文',
  '译文生成中',
  '译文待更新',
  '部分译文生成失败',
  '译文生成失败',
  '译文处理超时',
  '服务暂不可用',
  '历史译文待补齐',
  '译法待确认'
];
for (const state of requiredStates) check(prototype.includes(state), `状态“${state}”可见`);
check(manifest.coverage.translation_state_count === requiredStates.length, 'manifest 状态计数为 12');

check(prototype.includes('目标态界面示例 · 逐条中文对照尚未接通'), '全局目标态真相条存在');
check(prototype.includes('原文事实根'), '原文事实根声明存在');
check(prototype.includes('失败行为') && prototype.includes('不阻断新闻'), '译文失败非阻断声明存在');
check(prototype.includes('下列译文均为界面演示内容'), '界面演示内容标识存在');

const forbiddenControlLabels = ['编辑译文', '重新翻译', '确认译文', '发布译文', '删除译文', '批量处理'];
const controlText = [...prototype.matchAll(/<(?:button|a)\b[^>]*>([\s\S]*?)<\/(?:button|a)>/g)]
  .map((match) => match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
  .join('\n');
for (const label of forbiddenControlLabels) check(!controlText.includes(label), `只读原型不含“${label}”控件`);

check(prototype.includes('<html lang="zh-CN">'), '根语言为 zh-CN');
check(prototype.includes('class="skip" href="#main"'), '存在跳过导航链接');
check(prototype.includes('aria-live="polite"'), '存在礼貌动态播报区');
check(prototype.includes(':focus-visible'), '存在可见焦点样式');
check(prototype.includes('@media (prefers-reduced-motion:reduce)'), '支持减少动态效果');
check(prototype.includes('lang="en"'), '原文片段标注实际语言');

for (const breakpoint of ['1100px', '760px', '350px']) {
  check(prototype.includes(`@media (max-width:${breakpoint})`), `响应式断点 ${breakpoint} 存在`);
}
check(prototype.includes('min-height:44px'), '移动触控目标下限 44px 已写入样式');
check(prototype.includes('font-size:16px'), '移动正文 16px 规则存在');
check(prototype.includes('font-size:14px'), '移动辅助文字 14px 规则存在');
check(prototype.includes('overflow-x:auto'), '代码和表格局部横向滚动规则存在');

const acMatches = new Set([...design.matchAll(/`AC-AMR-BI-(\d{2})`/g)].map((match) => match[1]));
check(acMatches.size === 18, '设计说明唯一验收映射为 18 项', `got ${acMatches.size}`);
check(design.includes('静态设计不能证明真实键盘、读屏、播报和 200% 浏览器行为'), '设计说明诚实标注静态验证边界');
check(design.includes('未修改前端、后端、数据库、采集器或 4174/4317 服务'), '设计说明保持业务与服务边界');

check(manifest.artifacts.screenshots.length === 5, 'manifest 登记 5 张目检截图');
for (const shot of manifest.artifacts.screenshots) {
  const filePath = checkFile(shot, `截图 ${shot.path}`);
  const dimensions = pngDimensions(filePath);
  check(
    dimensions.width === shot.width && dimensions.height === shot.height,
    `截图 ${shot.path} 尺寸`,
    `expected ${shot.width}x${shot.height}, got ${dimensions.width}x${dimensions.height}`
  );
}

check(manifest.truth_boundary.current_chinese_counterpart_implemented === false, '未把中文对照写成已实现');
check(manifest.truth_boundary.frontend_modified === false, '未把前端写成已修改');
check(manifest.truth_boundary.backend_modified === false, '未把后端写成已修改');
check(manifest.truth_boundary.service_4174_or_4317_restarted === false, '未把服务写成已重启');
check(manifest.validation.independent_visual_review === 'pending', '独立视觉审查仍为 pending');
check(manifest.validation.assistive_technology_review === 'pending-frontend-and-qa', '辅助技术实测仍待前端与 QA');
check(manifest.stop_gate === 'ui-design-review', '停止门为 ui-design-review');
check(manifest.downstream_role_authorized === false, '未授权下游角色');

if (failures.length) {
  console.error(`FAIL ${failures.length}/${passes.length + failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS ${passes.length}/${passes.length}`);
console.log('机器门仅验证静态结构、声明、SHA256 与 PNG IHDR 尺寸；不代替独立视觉、真实读屏或生产实现验收。');
