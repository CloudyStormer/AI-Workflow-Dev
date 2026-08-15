import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");
const previousRoot = path.resolve(here, "../release-completeness-v1.6");
const previousResolved = JSON.parse(fs.readFileSync(path.join(previousRoot, "resolved-manifest.json"), "utf8"));
const fail = message => { throw new Error(message); };
const read = file => fs.readFileSync(file, "utf8");
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const decode = value => value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"');
const attr = (tag, name, required = true) => { const match = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`)); if (!match && required) fail(`缺少属性 ${name}: ${tag.slice(0, 160)}`); return match?.[1]; };
const num = (tag, name) => Number(attr(tag, name));
const elementById = (source, id) => { const match = source.match(new RegExp(`<[^>]+id="${id}"[^>]*>`)); if (!match) fail(`缺少元素 #${id}`); return match[0]; };
const boxOf = tag => ({ x: num(tag, "x"), y: num(tag, "y"), w: num(tag, "width"), h: num(tag, "height") });
const intersects = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0;
const contains = (outer, inner, padding = 0) => inner.x >= outer.x + padding && inner.y >= outer.y + padding && inner.x + inner.w <= outer.x + outer.w - padding && inner.y + inner.h <= outer.y + outer.h - padding;
const pngSize = file => { const bytes = fs.readFileSync(file); if (bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a") fail(`PNG 签名错误: ${file}`); return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }; };
const C_SOFT_ACTION_SENTINEL = 'fill="#E8F5F2" stroke="#0B6B63"';

function validateViewport(contract) {
  const { base_css, zoom_css, physical_scale } = contract;
  if (base_css !== 720 || zoom_css !== 360 || physical_scale !== 2 || base_css / physical_scale !== zoom_css) fail("authored SVG 200%示意属性必须为720→360且物理缩放2倍");
}

function validateBaseline({ container, baseline, ascent, descent, safe_top = 0, safe_bottom = 0 }) {
  if (baseline - ascent < container.y + safe_top || baseline + descent > container.y + container.h - safe_bottom) fail("字体基线安全区越界");
}

function validateLineContainers(containers) {
  for (const container of containers) {
    for (const line of container.lines) if (!contains(container.box, line.box, 0)) fail(`authored line-box 越出容器: ${container.id}/${line.id}`);
    for (let i = 0; i < container.lines.length; i++) for (let j = i + 1; j < container.lines.length; j++) if (intersects(container.lines[i].box, container.lines[j].box)) fail(`authored line-box 互撞: ${container.id}/${container.lines[i].id}/${container.lines[j].id}`);
  }
}

const fixtures = {
  baseline: () => validateBaseline({ container: { x: 0, y: 10, w: 100, h: 30 }, baseline: 12, ascent: 8, descent: 4, safe_top: 4, safe_bottom: 4 }),
  container: () => validateLineContainers([{ id: "容器越界夹具", box: { x: 10, y: 10, w: 40, h: 30 }, lines: [{ id: "越界行", box: { x: 44, y: 18, w: 20, h: 14 } }] }]),
  collision: () => validateLineContainers([{ id: "互撞夹具", box: { x: 0, y: 0, w: 100, h: 100 }, lines: [{ id: "行一", box: { x: 10, y: 10, w: 70, h: 20 } }, { id: "行二", box: { x: 10, y: 25, w: 70, h: 20 } }] }]),
  viewport: () => validateViewport({ base_css: 720, zoom_css: 400, physical_scale: 2 })
};
const argMap = { "--negative-baseline": "baseline", "--negative-container": "container", "--negative-collision": "collision", "--negative-viewport": "viewport" };
for (const [flag, name] of Object.entries(argMap)) if (process.argv.includes(flag)) { fixtures[name](); fail(`${name} 负向夹具未被捕获`); }
function exerciseFixtures() { const result = {}; for (const [name, fn] of Object.entries(fixtures)) { let caught = false; try { fn(); } catch { caught = true; } if (!caught) fail(`${name} 负向夹具未失败`); result[name] = { status: "caught", expected_exit_code: 1, cli_flag: Object.entries(argMap).find(([, value]) => value === name)[0] }; } return result; }

const overlay = JSON.parse(read(path.join(here, "overlay-manifest.json")));
const resolved = JSON.parse(read(path.join(here, "resolved-manifest.json")));
const models = JSON.parse(read(path.join(here, "resolved-chart-models.json")));
const layout = JSON.parse(read(path.join(here, "authored-layout-contract.json")));
const buttonContract = JSON.parse(read(path.join(here, "button-raster-contract.json")));
if (overlay.version !== "1.7" || overlay.replacement_count !== 29 || overlay.assets.length !== 29) fail("v1.7 overlay 必须为29张替换资产");
const accessibilityCorrections = overlay.assets.filter(asset => asset.source === "targeted-v1.7-accessibility-correction");
const routeCorrections = overlay.assets.filter(asset => asset.source === "redrawn-v1.7-dependency-topology");
if (accessibilityCorrections.length !== 28 || routeCorrections.length !== 1 || routeCorrections[0].name !== "25-13-route-graph.svg") fail("v1.7 必须精确包含28张无障碍修订与1张路线拓扑重绘");
let legacyFilenameTitleCount = 0;
for (const correction of accessibilityCorrections) {
  const previousAsset = previousResolvedAsset(correction.name);
  const source = read(path.resolve(previousRoot, previousAsset.svg_path));
  legacyFilenameTitleCount += [...source.matchAll(/<title\b[^>]*>([^<]*)<\/title>/g)].filter(match => /\.svg\b|^\d{2}[-_][A-Za-z]/i.test(decode(match[1]).trim())).length;
}
if (legacyFilenameTitleCount !== 33) fail(`v1.6 基线应有33个文件名式 title，实际 ${legacyFilenameTitleCount}`);
if (resolved.version !== "1.7" || resolved.count !== 49 || resolved.assets.length !== 49 || resolved.replaced !== 29 || resolved.reused !== 20) fail("resolved 必须为49=29替换+20复用");
if (models.version !== "1.7" || models.charts.length !== 15) fail("共享结构化模型必须包含15张图表");
if (buttonContract.entries.length !== 20 || buttonContract.method !== "rendered-png-glyph-pixel-bounds-via-coregraphics") fail("按钮真实栅格契约必须为20项");
if (resolved.review_contract.independent_visual_review !== "pending-root-coordinator-round-8" || resolved.review_contract.downstream_route_authorized !== false || resolved.review_contract.font_glyph_geometry !== "button-label-pixels-only-no-general-font-geometry-claim") fail("独立审核门、字体几何边界或下游冻结状态错误");
if (layout.method !== "authored-line-box-contract-not-font-glyph-measurement") fail("布局门必须诚实声明为 authored contract");
validateViewport(layout.viewport);
validateLineContainers(layout.containers);
const negativeFixtures = exerciseFixtures();

const assetByName = new Map(resolved.assets.map(asset => [asset.name, asset]));
function previousResolvedAsset(name) { const asset = previousResolved.assets.find(item => item.name === name); if (!asset) fail(`v1.6 基线缺资产 ${name}`); return asset; }
const svgForName = name => {
  const asset = assetByName.get(name);
  if (!asset) fail(`resolved manifest 缺资产 ${name}`);
  return read(path.resolve(here, asset.svg_path));
};
const svgFor = id => svgForName(`${id}.svg`);

const internalKeyPattern = /(?<![A-Za-z0-9_-])(as_of|no-evidence|no_evidence|disabled|connector|conditional|not_ready|not_configured|unavailable|failed|partial|stale|live|loading|empty|seed_demo|no-source|no_source|offline|unknown|pending|option|selected|counted|historical_snapshot|no_instance|example_only|demo_user_provided|rule_configuration|approved_document|user_reported|evidence_available|verifiable|verified|missing|locked|insufficient|incomplete)(?![A-Za-z0-9_-])/gi;
const filenamePattern = /(?:\.svg\b|\b\d{2}[-_][A-Za-z][A-Za-z0-9._-]*(?:\.svg)?\b)/i;
const latinWordPattern = /\b[A-Za-z][A-Za-z0-9+.#/-]*\b/g;
const latinAllowlist = new Set(["AI", "API", "ATS", "CI/CD", "CSS", "CSV", "DevEx", "Escape", "H1", "H2", "H3", "HTML", "HTML/CSS/JS", "HTTP", "i18n", "JS", "JSON", "JSON/CSV", "Mac", "ms", "N", "n", "P0", "P1", "P1-AI", "P2", "PDF", "PDF/HTML", "PNG", "px", "React", "SVG", "Tab", "TypeScript", "UI", "Unicode", "URL", "UTC", "WASM", "WCAG", "Web", "WebGPU", "WebGPU/WASM/WebNN", "WebNN", "Windows", "AA", "A", "B", "CR", "X", "Y", "v"]);
const visibleByAsset = {};
const languageSummary = { scanned_assets: 0, scanned_nodes: 0, annotated_internal_key_occurrences: 0, allowed_proper_noun_occurrences: 0, filename_like_violations: 0, unannotated_internal_key_violations: 0, unapproved_latin_phrase_violations: 0 };
const ariaSummary = { scanned_assets: 0, documents_with_duplicate_ids: 0, labelledby_reference_count: 0, unresolved_or_ambiguous_references: 0 };

for (const asset of resolved.assets) {
  const svgPath = path.resolve(here, asset.svg_path), pngPath = path.resolve(here, asset.png_path);
  if (!fs.existsSync(svgPath) || !fs.existsSync(pngPath)) fail(`缺 resolved 资产 ${asset.name}`);
  if (sha256(svgPath) !== asset.svg_sha256 || sha256(pngPath) !== asset.png_sha256) fail(`resolved SHA 不一致 ${asset.name}`);
  const size = pngSize(pngPath);
  if (size.width !== asset.outer_pixels.width || size.height !== asset.outer_pixels.height) fail(`PNG 尺寸不一致 ${asset.name}`);
  const source = read(svgPath);
  const nodes = [...source.matchAll(/<(title|text|desc)\b[^>]*>([^<]*)<\/(?:title|text|desc)>/g)].map(match => ({ tag: match[1], value: decode(match[2]).trim() })).filter(node => node.value);
  languageSummary.scanned_assets += 1;
  languageSummary.scanned_nodes += nodes.length;
  for (const node of nodes) {
    if (filenamePattern.test(node.value)) { languageSummary.filename_like_violations += 1; fail(`${asset.name}: ${node.tag} 含裸文件名或文件样式名称：${node.value}`); }
    const keys = [...node.value.matchAll(internalKeyPattern)].map(match => match[1]);
    if (keys.length) {
      if (!/(?:内部键|开发附注)[:：]/.test(node.value)) { languageSummary.unannotated_internal_key_violations += keys.length; fail(`${asset.name}: 用户可见内部键未置于明确附注：${keys.join(",")} / ${node.value}`); }
      languageSummary.annotated_internal_key_occurrences += keys.length;
    }
    const latinWords = [...node.value.matchAll(latinWordPattern)];
    for (const match of latinWords) {
      const word = match[0];
      if (match.index > 0 && node.value[match.index - 1] === "#") { languageSummary.allowed_proper_noun_occurrences += 1; continue; }
      const normalized = word.replace(/[+.#/-]+$/g, "");
      const slashParts = normalized.split("/").filter(Boolean);
      if (latinAllowlist.has(normalized) || (slashParts.length > 1 && slashParts.every(part => latinAllowlist.has(part))) || /^[rv]\d+(?:\.\d+)*$/i.test(word) || /^[a-z]+-v?\d+(?:\.\d+)*$/i.test(word) || /^demo-[xy]$/i.test(word) || /^CR-UI-\d+$/i.test(word) || /^[A-Z]{1,4}-\d+$/.test(word)) { languageSummary.allowed_proper_noun_occurrences += 1; continue; }
      if (/(?:内部键|开发附注)[:：]/.test(node.value)) { languageSummary.annotated_internal_key_occurrences += 1; continue; }
      languageSummary.unapproved_latin_phrase_violations += 1;
      fail(`${asset.name}: ${node.tag} 含未批准的裸英文词：${word} / ${node.value}`);
    }
  }
  const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const idCounts = new Map();
  ids.forEach(id => idCounts.set(id, (idCounts.get(id) || 0) + 1));
  const duplicates = [...idCounts.entries()].filter(([, count]) => count !== 1);
  if (duplicates.length) { ariaSummary.documents_with_duplicate_ids += 1; fail(`${asset.name}: 文档内 ID 不唯一：${duplicates.map(([id, count]) => `${id}×${count}`).join(", ")}`); }
  const labelledBy = [...source.matchAll(/aria-labelledby="([^"]+)"/g)].flatMap(match => match[1].trim().split(/\s+/));
  ariaSummary.labelledby_reference_count += labelledBy.length;
  for (const target of labelledBy) if (idCounts.get(target) !== 1) { ariaSummary.unresolved_or_ambiguous_references += 1; fail(`${asset.name}: aria-labelledby 目标不可唯一解析：${target}`); }
  ariaSummary.scanned_assets += 1;
  visibleByAsset[asset.name] = { user_visible_nodes: nodes.length, duplicate_ids: 0, aria_labelledby_targets: labelledBy.length, png_dimensions: size };
}
const foundation = svgForName("26-foundation-contrast-tokens.svg");
if (foundation.includes("WCAG relative luminance") || /#[0-9A-Fa-f]{6}\s+on\s+#[0-9A-Fa-f]{6}/.test(foundation) || (foundation.match(/色值：前景/g) || []).length !== 8) fail("26-foundation 的公式或8组颜色对未完整简中化");

const chartEvidence = {};
for (const model of models.charts) {
  if (!model.encoding_contract || Object.keys(model.encoding_contract).length < 2) fail(`${model.id}: 缺模型字段→视觉通道契约`);
  const source = svgFor(model.id);
  const parse = kind => [...source.matchAll(new RegExp(`<g data-${kind}-record="([^"]+)" data-payload="([^"]+)">(.*?)<\\/g>`, "g"))].map(match => ({ id: match[1], record: JSON.parse(Buffer.from(match[2], "base64url").toString("utf8")), body: match[3] }));
  const visual = parse("visual"), table = parse("table"), expected = model.records.map(record => ({ id: record.id, record }));
  const ids = entries => entries.map(item => item.id).sort();
  if (!same(ids(visual), ids(expected)) || !same(ids(table), ids(expected))) fail(`${model.id}: 图形/表格/模型 ID 集合不双向相等`);
  for (const item of expected) {
    const visualItem = visual.find(entry => entry.id === item.id), tableItem = table.find(entry => entry.id === item.id);
    if (!same(visualItem.record, item.record) || !same(tableItem.record, item.record) || !same(visualItem.record, tableItem.record)) fail(`${model.id}/${item.id}: payload 不相等`);
  }
  if (!source.includes(model.legend.replaceAll("&", "&amp;"))) fail(`${model.id}: 用户可见图例与模型契约不一致`);
  for (const group of source.matchAll(/<g data-table-record="[^"]+"[^>]*>(.*?)<\/g>/g)) for (const text of group[1].matchAll(/<text[^>]*font-size="([^"]+)"/g)) if (Number(text[1]) < 14) fail(`${model.id}: 等价表正文小于14px`);
  if (!source.includes('data-complete-truth-strip="true"')) fail(`${model.id}: 缺就近真相条`);
  let mainMarkStateRecords = null;
  if (model.id === "25-11-evidence-stair" || model.id === "25-15-sync-timeline") {
    mainMarkStateRecords = [];
    for (const item of expected) {
      const body = visual.find(entry => entry.id === item.id).body;
      const label = model.id === "25-11-evidence-stair" ? `状态：${({ user_reported: "用户自述", evidence_available: "有证据待核验", verifiable: "可核验", verified: "已核验" })[item.record.state]}` : `系统状态：${({ not_ready: "未就绪", unavailable: "不可用", example_only: "允许状态示例" })[item.record.state]}`;
      if (!body.includes('data-main-mark-field="state"') || !body.includes(`data-encode-value="${item.record.state}"`) || !body.includes(label)) fail(`${model.id}/${item.id}: 主图 mark 未显式显示 state 状态文字`);
      mainMarkStateRecords.push({ id: item.id, state: item.record.state, visible_label: label, status: "matched-in-main-mark" });
    }
  }
  chartEvidence[model.id] = { records: expected.length, visual_records: visual.length, table_records: table.length, bidirectional_equal: true, encoding_contract: model.encoding_contract, legend: model.legend, table_body_min_px: 14, main_mark_state_records: mainMarkStateRecords };
}

const scatter = svgFor("25-01-direction-scatter"); if ((scatter.match(/data-encode-field="confidence"/g) || []).length !== 8 || !scatter.includes('stroke-width="4"') || !scatter.includes('stroke-dasharray="5 4"')) fail("25-01 8/8方向与置信度描边回归");
const capability = svgFor("25-03-capability-map"); if ((capability.match(/data-matrix-cell=/g) || []).length !== 40 || (capability.match(/data-encode-field="p2"/g) || []).length !== 8) fail("25-03 8×5矩阵回归");
const comparison = svgFor("25-02-direction-comparison"); if ((comparison.match(/data-equal-weight="true"/g) || []).length !== 3 || comparison.includes(C_SOFT_ACTION_SENTINEL)) fail("25-02等权对比回归");
const relationModel = models.charts.find(chart => chart.id === "25-10-relation-matrix"), relation = svgFor("25-10-relation-matrix"), selectedRelations = relationModel.records.filter(record => record.selected); if (selectedRelations.length !== 1 || selectedRelations[0].id !== "rel-insufficient" || selectedRelations[0].relation !== "证据不足" || selectedRelations[0].basis !== "缺少版本证据" || !relation.includes("缺少版本证据")) fail("25-10 证据不足唯一选择回归");
const stairModel = models.charts.find(chart => chart.id === "25-11-evidence-stair"), stair = svgFor("25-11-evidence-stair"); if ((stair.match(/data-main-mark-field="state"/g) || []).length !== stairModel.records.length) fail("25-11 主图状态回归");
const timelineModel = models.charts.find(chart => chart.id === "25-14-version-timeline"), timeline = svgFor("25-14-version-timeline"), publicSources = new Set(timelineModel.records.filter(record => record.track === "公共快照").map(record => record.source_identity)); if (!publicSources.has("获批历史研究快照") || !publicSources.has("获批产品文档") || (timeline.match(/data-encode-field="state"/g) || []).length !== 5 || !timeline.includes("规则=菱形")) fail("25-14 真相轨道回归");
const syncModel = models.charts.find(chart => chart.id === "25-15-sync-timeline"), sync = svgFor("25-15-sync-timeline"); if (!sync.includes("!") || !sync.includes("↻") || (sync.match(/data-main-mark-field="state"/g) || []).length !== syncModel.records.length) fail("25-15 状态与符号回归");

const routeModel = models.charts.find(chart => chart.id === "25-13-route-graph");
const routeSvg = svgFor("25-13-route-graph");
const expectedEdges = routeModel.records.flatMap(record => record.depends_on.map(dependency => ({ from: routeModel.records.find(candidate => candidate.node === dependency)?.id, to: record.id, dependency })));
if (expectedEdges.some(edge => !edge.from)) fail("25-13 模型含不可解析依赖节点");
const actualEdges = [...routeSvg.matchAll(/<line\b[^>]*data-topology-edge="true"[^>]*\/>/g)].map(match => ({ from: attr(match[0], "data-topology-edge-from"), to: attr(match[0], "data-topology-edge-to"), dependency: attr(match[0], "data-depends-on-label"), dashed: Boolean(attr(match[0], "stroke-dasharray", false)) }));
const sortEdges = edges => edges.map(edge => ({ from: edge.from, to: edge.to, dependency: edge.dependency })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
if (!same(sortEdges(actualEdges), sortEdges(expectedEdges)) || actualEdges.some(edge => !edge.dashed)) fail("25-13 主图虚线边与 depends_on 拓扑不双向相等");
for (const record of routeModel.records) {
  const group = routeSvg.match(new RegExp(`<g data-visual-record="${record.id}"[^>]*>(.*?)<\\/g>`));
  if (!group) fail(`25-13/${record.id}: 缺主图节点`);
  const body = group[1];
  if ((body.match(new RegExp(`data-lock-record="${record.id}"`, "g")) || []).length !== 2 || !body.includes('data-lock-symbol="shackle"') || !body.includes('data-lock-symbol="body"')) fail(`25-13/${record.id}: 未真实画锁符号`);
  if (!body.includes('data-main-mark-field="state"') || !body.includes(`data-encode-value="${record.state}"`) || !body.includes(`状态：${({ missing: "缺失", locked: "锁定", insufficient: "证据不足", incomplete: "未齐全" })[record.state]}`)) fail(`25-13/${record.id}: 缺状态文字映射`);
}
const evidenceRecord = routeModel.records.find(record => record.node === "个人证据");
const planRecord = routeModel.records.find(record => record.node === "成长路线");
if (!same(evidenceRecord.depends_on, ["用户确认"]) || !same(planRecord.depends_on, ["三项输入齐全"])) fail("25-13 个人证据→用户确认或成长路线→三项输入齐全语义错误");

for (const page of ["04", "05", "06", "08"]) { const suffix = page === "04" ? "sources-quality" : page === "05" ? "workbench" : page === "06" ? "personal-evidence" : "future-history"; const source = svgForName(`${page}-desktop-page-${page}-${suffix}-1440.svg`); if ((source.match(/data-authored-baseline-offset="5"/g) || []).length !== 3) fail(`page${page}: chip基线回归`); }
const component = svgForName("24-components-states.svg"); if ((component.match(/data-pill-label="true"/g) || []).length !== 4 || (component.match(/data-authored-baseline-offset="5"/g) || []).length < 4) fail("组件状态胶囊回归"); for (const id of ["cancel-button", "confirm-button"]) if (boxOf(elementById(component, id)).h < 44) fail(`${id}: 触控矩形不足44px`);
const page10 = svgForName("10-desktop-page-10-quality-recovery-1440.svg"); if (page10.includes("未就绪（未就绪）") || page10.includes("不可用（不可用）")) fail("page10 重复状态翻译回归");
if (resolved.assets.filter(asset => asset.category === "mobile").length !== 14) fail("14张移动稿回归");
const zoom = svgForName("28-accessibility-zoom-200.svg"), tag = id => elementById(zoom, id), textTag = (container, key) => { const match = zoom.match(new RegExp(`<text[^>]*data-container-ref="${container}"[^>]*data-content-key="${key}"[^>]*>`)); if (!match) fail(`zoom缺${container}/${key}`); return match[0]; };
if (num(tag("zoom-200-panel"), "data-css-viewport") !== 360 || num(tag("zoom-200-panel"), "data-base-css-viewport") !== 720 || num(tag("zoom-200-panel"), "data-physical-scale") !== 2) fail("200%视口回归");
if (num(textTag("zoom-200-card", "title"), "font-size") !== 48 || num(textTag("zoom-200-card", "body"), "font-size") !== 32 || num(textTag("zoom-200-card", "helper"), "font-size") !== 28) fail("200%字体Token回归");

const rasterOutput = execFileSync("swift", [path.join(here, "verify-button-raster.swift"), path.join(here, "button-raster-contract.json")], { encoding: "utf8" });
const rasterReport = JSON.parse(rasterOutput);
if (rasterReport.status !== "machine_passed" || rasterReport.button_count !== 20 || rasterReport.scope !== "button-label-glyph-pixels-only") fail("20个按钮真实 PNG 字形中心验证未通过");
fs.writeFileSync(path.join(here, "button-raster-report.json"), JSON.stringify(rasterReport, null, 2) + "\n", "utf8");

const immutable = {
  prompt: [path.join(projectRoot, "ui/04-release-completeness-ui-prompt.md"), "983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900"],
  v1: [path.join(projectRoot, "ui/05-release-completeness-ui-design.md"), "ffc0251ac0c2bfc077e47a9b3352f1d6ccd30f584e6e352e160f07557afcfe3e"],
  v1_1: [path.join(projectRoot, "ui/06-release-completeness-ui-design-v1.1.md"), "f8377d001684a40d26513d4c02ccb1fa3fe1aea325300ee7357537c218b79aae"],
  v1_2: [path.join(projectRoot, "ui/07-release-completeness-ui-design-v1.2.md"), "768050aba1b7a959510b8f252a8d8628e25cc3b8f3be53bd04efb122630307cc"],
  v1_3: [path.join(projectRoot, "ui/08-release-completeness-ui-design-v1.3.md"), "2278c7ecee8826fe2f8afa90c94af28070b3295dc88020f8c29e7442ee3175ba"],
  v1_4: [path.join(projectRoot, "ui/09-release-completeness-ui-design-v1.4.md"), "371c4b1e703b5718853b304477b1507fe0de3a100ef0d2993dac4b245a4b04d2"],
  v1_5: [path.join(projectRoot, "ui/10-release-completeness-ui-design-v1.5.md"), "6decc0a7c72286724fc9b3c940c5d998ac6f73ec6c2bfa0ee98213759cab7bf7"],
  v1_6: [path.join(projectRoot, "ui/11-release-completeness-ui-design-v1.6.md"), "199ab0bbef1a57cac0c5d31e83a52f380775631fcc2455cce9481e80b7aeba47"],
  v1_6_resolved: [path.join(previousRoot, "resolved-manifest.json"), "85965fa1580f3ec6e07213b71e87f530bf6e299826f8efb57dae68021a61551b"]
};
const immutableChecks = {};
for (const [id, [file, expected]] of Object.entries(immutable)) { if (sha256(file) !== expected) fail(`不可变历史SHA改变 ${id}`); immutableChecks[id] = "matched"; }
const categories = {};
resolved.assets.forEach(asset => categories[asset.category] = (categories[asset.category] || 0) + 1);
for (const [name, count] of Object.entries({ desktop: 10, flow: 4, truth: 2, mobile: 14, chart: 15, standard: 2, responsive: 2 })) if (categories[name] !== count) fail(`分类${name}预期${count}，实际${categories[name] || 0}`);

const result = {
  schema_version: 1,
  version: "1.7",
  generated_at: "2026-08-16T03:10:00+08:00",
  machine_validation: { status: "machine_passed", scope: ["resolved-49-sha-png-signature-and-dimensions", "all-title-text-desc-language-and-filename-rule", "document-id-uniqueness-and-aria-labelledby-resolution", "25-13-model-driven-dependency-topology-lock-symbol-and-state", "authored-line-box-container-and-collision-contract", "four-independent-negative-fixture-families", "15-chart-model-visual-table-bidirectional-data-equality", "locked-v1.6-regression-assertions", "rendered-png-button-label-glyph-centering-20-of-20", "immutable-v1.0-through-v1.6-history"] },
  independent_visual_review: { status: "pending", owner: "AIWorkFlow-root-coordinator", round: 8, note: "机器门核对 49 张的哈希、尺寸、全部 title/text/desc 文案规则、文档内 ID 与 aria-labelledby 解析、25-13 模型拓扑，以及已锁定回归项；不声称通用字体几何、浏览器 CSS 运行时或独立视觉已经通过。" },
  downstream_route_authorized: false,
  bundle: { resolved_assets: 49, replaced_by_v1_7: 29, reused_immutable_v1_6_resolved: 20, category_counts: categories },
  truth_boundary: models.truth_boundary,
  accessible_language: languageSummary,
  aria_integrity: ariaSummary,
  chart_equivalence: { model: "resolved-chart-models.json", models: 15, data_equality: "15-of-15", visual_encoding_claim: "named-assertions-only-no-blanket-visual-claim", checks: chartEvidence },
  route_topology: { model_records: routeModel.records.length, expected_edges: expectedEdges.length, actual_edges: actualEdges.length, edge_set_bidirectional_equal: true, per_record_lock_and_state: `${routeModel.records.length}-of-${routeModel.records.length}` },
  authored_layout_validation: { method: layout.method, caveat: layout.caveat, containers: layout.containers.length, negative_fixtures: negativeFixtures },
  raster_integrity: { general_assets: "PNG签名、外层像素尺寸与SHA；不做通用字体轮廓或逐像素碰撞识别", button_labels: { method: rasterReport.method, scope: rasterReport.scope, count: rasterReport.button_count, report: "button-raster-report.json", report_sha256: sha256(path.join(here, "button-raster-report.json")) }, assets: visibleByAsset },
  critical_fixes: { accessible_titles: "28-assets-33-filename-like-titles-replaced", foundation_copy: "wcag-relative-luminance-and-eight-color-pair-lines-localized", duplicate_ids: "03-07-12-13-26-fixed-and-all-49-verified", route_graph: "depends_on-edge-set-lock-symbol-state-text-verified" },
  immutable_checks: immutableChecks
};
const serialized = JSON.stringify(result, null, 2) + "\n";
if (/browser-runtime-passed|all-token-groups-runtime-passed|actual-svg-text-container-bounds|manual_visual_inspection|independent_visual_review_passed|general-font-glyph-bounds-passed/.test(serialized)) fail("机器门禁止过度声明浏览器、通用字形或独立视觉通过");
fs.writeFileSync(path.join(here, "review-manifest.json"), serialized, "utf8");
console.log(JSON.stringify({ status: "machine_passed", resolved_assets: 49, replaced: 29, reused: 20, accessible_nodes: languageSummary.scanned_nodes, duplicate_ids: 0, aria_unresolved: 0, route_topology: `${actualEdges.length}-edges-model-equal`, button_raster_centers: "20-of-20", negative_fixtures: "4-of-4-caught", independent_visual_review: "pending-round-8" }, null, 2));
