import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");
const previousRoot = path.resolve(here, "../release-completeness-v1.6");
const previousResolved = JSON.parse(fs.readFileSync(path.join(previousRoot, "resolved-manifest.json"), "utf8"));
const baseModels = JSON.parse(fs.readFileSync(path.join(previousRoot, "resolved-chart-models.json"), "utf8"));
const svgDir = path.join(here, "assets");
const pngDir = path.join(here, "png");
fs.mkdirSync(svgDir, { recursive: true });
fs.mkdirSync(pngDir, { recursive: true });

const C = { bg: "#F5F7FA", surface: "#FFFFFF", text: "#17212B", muted: "#475467", border: "#B8C2CC", action: "#0B6B63", info: "#1849A9", warning: "#854A0E", danger: "#B4233C", softInfo: "#EAF1FF", softWarn: "#FFF3E0", softDanger: "#FDECEF", soft: "#EEF1F4" };
const esc = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const rect = (x, y, w, h, fill = C.surface, stroke = C.border, r = 8, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke = C.border, width = 1, extra = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const tx = (x, y, value, size = 14, color = C.text, weight = 400, anchor = "start", extra = "") => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="hanging" ${extra}>${esc(value)}</text>`;
const style = `<style>text{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Arial,sans-serif}*{shape-rendering:geometricPrecision;text-rendering:geometricPrecision}</style>`;
const b64 = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const pngSize = file => { const bytes = fs.readFileSync(file); return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }; };
const slug = value => String(value).replace(/\.svg$/i, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();

const accessibleNames = {
  "01-desktop-page-01-directions-1440.svg": "职业方向总览桌面页面",
  "02-desktop-page-02-tech-landscape-1440.svg": "技术栈全景桌面页面",
  "03-desktop-page-03-market-trends-1440.svg": "市场趋势桌面页面",
  "07-desktop-page-07-gap-roadmap-1440.svg": "能力差距与成长路线桌面页面",
  "09-desktop-page-09-data-rights-1440.svg": "数据权利与账号隔离桌面页面",
  "10-desktop-page-10-quality-recovery-1440.svg": "质量与异常恢复桌面页面",
  "11-flow-01-workbench-six-step.svg": "用户信息源工作台六步流程",
  "12-flow-02-evidence-confirmation.svg": "个人证据确认流程",
  "13-flow-03-gap-roadmap-recompute.svg": "差距与成长路线重算流程",
  "14-flow-04-sync-export-delete.svg": "同步、导出与删除流程",
  "15-truth-01-source-policy-runtime.svg": "来源政策与运行时真相状态",
  "16-truth-02-eleven-states.svg": "十一类真实性状态示例",
  "01-directions-390.svg": "职业方向总览移动页面，390 像素宽",
  "01-directions-320.svg": "职业方向总览移动页面，320 像素宽",
  "02-tech-390.svg": "技术栈全景移动页面，390 像素宽",
  "02-tech-320.svg": "技术栈全景移动页面，320 像素宽",
  "03-trends-390.svg": "市场趋势移动页面，390 像素宽",
  "03-trends-320.svg": "市场趋势移动页面，320 像素宽",
  "04-workbench-input-390.svg": "用户信息源输入移动页面，390 像素宽",
  "04-workbench-input-320.svg": "用户信息源输入移动页面，320 像素宽",
  "05-workbench-result-390.svg": "用户信息源处理结果移动页面，390 像素宽",
  "05-workbench-result-320.svg": "用户信息源处理结果移动页面，320 像素宽",
  "06-gap-unknown-390.svg": "能力差距未知状态移动页面，390 像素宽",
  "06-gap-unknown-320.svg": "能力差距未知状态移动页面，320 像素宽",
  "07-data-rights-390.svg": "个人数据权利移动页面，390 像素宽",
  "07-data-rights-320.svg": "个人数据权利移动页面，320 像素宽",
  "26-foundation-contrast-tokens.svg": "视觉基础规范与颜色对比度说明",
  "27-responsive-1024.svg": "1024 像素宽响应式布局说明"
};

function normalizeAccessibleMetadata(source, assetName, accessibleName) {
  const titleId = `a11y-title-${slug(assetName)}`;
  const descId = `a11y-desc-${slug(assetName)}`;
  let next = source
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/g, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/g, "")
    .replace(/aria-labelledby="[^"]*"/, `aria-labelledby="${titleId} ${descId}"`)
    .replace(/CR-UI-002 v1\.\d/g, "CR-UI-002 v1.7")
    .replace(/Frontend Career Radar/g, "前端职业成长雷达")
    .replace(/UX Engineering/g, "用户体验工程")
    .replace(/Tooltip/g, "悬浮提示")
    .replace(/URL-only/g, "仅网址")
    .replace(/board\/site/g, "招聘板／站点");
  if (assetName === "09-desktop-page-09-data-rights-1440.svg") {
    next = next.replace(/user-a@example\.test/g, "演示账号甲（示例邮箱）").replace(/user-b@example\.test/g, "演示账号乙（示例邮箱）");
  }
  if (assetName === "10-desktop-page-10-quality-recovery-1440.svg") next = next.replace(/请求 ID/g, "请求编号").replace(/Mock/g, "模拟数据");
  next = next.replace(/<svg\b([^>]*)>/, `<svg$1><title id="${titleId}">${esc(accessibleName)}</title><desc id="${descId}">前端职业成长雷达发布完整性第七次修订：${esc(accessibleName)}。</desc>`);
  if (assetName === "26-foundation-contrast-tokens.svg") {
    next = next
      .replace(/WCAG relative luminance/g, "WCAG 相对亮度")
      .replace(/(#[0-9A-Fa-f]{6})\s+on\s+(#[0-9A-Fa-f]{6})/g, "色值：前景 $1｜背景 $2");
  }
  return next;
}

const models = structuredClone(baseModels);
models.version = "1.7";
const route = models.charts.find(chart => chart.id === "25-13-route-graph");
route.context = "页面07 · 用户确认、公共要求与个人证据齐全后才生成成长路线";
route.filter = "当前：用户未确认 · 三项输入未齐全 · 成长路线未生成";
route.axis = "节点=输入、门禁与输出 · 虚线边=模型真实依赖";
route.records = [
  { id: "route-confirm", node: "用户确认", node_type: "input", depends_on: [], output: "确认结果", state: "missing" },
  { id: "route-public", node: "公共要求", node_type: "input", depends_on: ["用户确认"], output: "要求集合", state: "locked" },
  { id: "route-evidence", node: "个人证据", node_type: "input", depends_on: ["用户确认"], output: "证据集合", state: "insufficient" },
  { id: "route-inputs", node: "三项输入齐全", node_type: "gate", depends_on: ["用户确认", "公共要求", "个人证据"], output: "路线门禁", state: "incomplete" },
  { id: "route-plan", node: "成长路线", node_type: "output", depends_on: ["三项输入齐全"], output: "未生成", state: "locked" }
];
route.encoding_contract = { depends_on: "按模型拓扑绘制虚线边", state: "每节点锁符号与状态文字", node_type: "输入、门禁与输出节点位置" };
route.legend = "锁符号+状态文字=当前阻断；虚线=模型依赖关系；三项输入未齐全时不生成路线";
fs.writeFileSync(path.join(here, "resolved-chart-models.json"), JSON.stringify(models, null, 2) + "\n", "utf8");

const visibleState = { missing: "缺失", locked: "锁定", insufficient: "证据不足", incomplete: "未齐全" };
const nodePosition = {
  "route-confirm": { x: 70, y: 422 },
  "route-public": { x: 360, y: 360 },
  "route-evidence": { x: 360, y: 500 },
  "route-inputs": { x: 720, y: 430 },
  "route-plan": { x: 1070, y: 430 }
};

function lockGlyph(x, y, record) {
  return `<path d="M${x + 18} ${y + 19}v-7a10 10 0 0 1 20 0v7" fill="none" stroke="${C.warning}" stroke-width="3" data-lock-symbol="shackle" data-lock-record="${record.id}" aria-hidden="true"/><rect x="${x + 14}" y="${y + 19}" width="28" height="24" rx="4" fill="${C.softWarn}" stroke="${C.warning}" stroke-width="2" data-lock-symbol="body" data-lock-record="${record.id}" aria-hidden="true"/>`;
}

function routeBoard(model) {
  const titleId = "a11y-title-25-13-route-graph";
  const descId = "a11y-desc-25-13-route-graph";
  const byNode = new Map(model.records.map(record => [record.node, record]));
  let body = rect(0, 0, 1440, 1024, C.bg, C.bg, 0);
  body += tx(32, 28, "图表 13 · 路线依赖图", 28, C.text, 800);
  body += tx(32, 72, "用户确认、公共要求与个人证据共同构成路线生成门禁。", 14, C.muted, 550);
  body += rect(32, 106, 1376, 48, C.softDanger, C.danger, 8, `data-complete-truth-strip="true" data-surface="private"`);
  body += tx(50, 122, "演示数据 · 用户提供 · 非真实用户档案 · 未经授权不外发", 14, C.danger, 750);
  body += rect(32, 174, 1376, 126, C.surface, C.border, 10);
  body += tx(52, 192, model.filter, 14, C.text, 700);
  body += tx(52, 226, model.axis, 13, C.muted, 600);
  body += tx(52, 258, model.legend, 13, C.muted, 600);
  body += rect(32, 320, 1376, 330, "#FBFCFD", C.border, 10, `data-chart-kind="route"`);

  const expectedEdges = [];
  for (const record of model.records) {
    for (const dependency of record.depends_on) {
      const sourceRecord = byNode.get(dependency);
      if (!sourceRecord) throw new Error(`${record.id} 的依赖节点不存在：${dependency}`);
      const from = nodePosition[sourceRecord.id];
      const to = nodePosition[record.id];
      const x1 = from.x + 230;
      const y1 = from.y + 52;
      const x2 = to.x;
      const y2 = to.y + 52;
      expectedEdges.push({ from: sourceRecord.id, to: record.id, dependency });
      body += line(x1, y1, x2, y2, C.info, 2, `stroke-dasharray="7 6" data-topology-edge="true" data-topology-edge-from="${sourceRecord.id}" data-topology-edge-to="${record.id}" data-depends-on-label="${esc(dependency)}"`);
    }
  }

  for (const record of model.records) {
    const { x, y } = nodePosition[record.id];
    const payload = b64(record);
    body += `<g data-visual-record="${record.id}" data-payload="${payload}">`;
    body += rect(x, y, 230, 104, C.surface, record.node_type === "output" ? C.action : C.border, 10, `data-node-type="${record.node_type}"`);
    body += lockGlyph(x + 10, y + 12, record);
    body += tx(x + 126, y + 18, record.node, 15, C.text, 800, "middle");
    body += tx(x + 126, y + 48, `状态：${visibleState[record.state]}`, 13, C.warning, 750, "middle", `data-main-mark-field="state" data-encode-field="state" data-encode-value="${record.state}"`);
    body += tx(x + 126, y + 74, `输出：${record.output}`, 12, C.muted, 600, "middle");
    body += `</g>`;
  }

  body += rect(32, 678, 1376, 330, C.surface, C.border, 10);
  body += tx(52, 690, "等价数据表", 14, C.text, 800);
  const columns = ["节点", "节点类型", "依赖", "输出", "系统状态"];
  columns.forEach((label, index) => body += tx(60 + index * 260, 718, label, 15, C.text, 800));
  model.records.forEach((record, row) => {
    const values = [record.node, ({ input: "输入", gate: "门禁", output: "输出" })[record.node_type], record.depends_on.length ? record.depends_on.join("、") : "无", record.output, visibleState[record.state]];
    const payload = b64(record);
    body += `<g data-table-record="${record.id}" data-payload="${payload}">`;
    values.forEach((value, index) => body += tx(60 + index * 260, 754 + row * 42, value, 14, C.text, 600));
    body += `</g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1024" viewBox="0 0 1440 1024" role="img" aria-labelledby="${titleId} ${descId}" data-record-count="${model.records.length}" data-chart-id="${model.id}" data-visible-language="zh-CN" data-topology-edge-count="${expectedEdges.length}">${style}<title id="${titleId}">成长路线依赖关系图</title><desc id="${descId}">展示用户确认、公共要求、个人证据、三项输入齐全与成长路线之间的真实依赖拓扑；当前所有节点均处于阻断状态。</desc>${body}</svg>`;
}

const replacements = [];
const add = (asset, svgText, source, assertions) => replacements.push({ name: asset.name, category: asset.category, surface: asset.surface, source, svgText, assertions });

for (const [assetName, accessibleName] of Object.entries(accessibleNames)) {
  const asset = previousResolved.assets.find(item => item.name === assetName);
  if (!asset) throw new Error(`找不到无障碍修订资产：${assetName}`);
  const source = fs.readFileSync(path.resolve(previousRoot, asset.svg_path), "utf8");
  add(asset, normalizeAccessibleMetadata(source, assetName, accessibleName), "targeted-v1.7-accessibility-correction", ["complete-simplified-chinese-accessible-name", "unique-resolvable-aria-labelledby", assetName === "26-foundation-contrast-tokens.svg" ? "foundation-copy-localized" : "visual-content-preserved"]);
}

const routeAsset = previousResolved.assets.find(item => item.name === "25-13-route-graph.svg");
add(routeAsset, routeBoard(route), "redrawn-v1.7-dependency-topology", ["model-driven-depends-on-edges", "per-record-lock-symbol-and-state-text", "model-visual-table-bidirectional-equality"]);

if (replacements.length !== 29) throw new Error(`v1.7 必须为29张替换资产，实际 ${replacements.length}`);

const overlayAssets = [];
for (const asset of replacements) {
  const svgPath = path.join(svgDir, asset.name);
  const pngPath = path.join(pngDir, asset.name.replace(/\.svg$/, ".png"));
  fs.writeFileSync(svgPath, asset.svgText, "utf8");
  execFileSync("sips", ["-s", "format", "png", svgPath, "--out", pngPath], { stdio: "ignore" });
  const size = pngSize(pngPath);
  overlayAssets.push({ name: asset.name, category: asset.category, surface: asset.surface, source: asset.source, outer_pixels: size, svg_path: `assets/${asset.name}`, png_path: `png/${path.basename(pngPath)}`, svg_sha256: sha256(svgPath), png_sha256: sha256(pngPath), machine_assertions: asset.assertions });
}

const layoutContract = JSON.parse(fs.readFileSync(path.join(previousRoot, "authored-layout-contract.json"), "utf8"));
layoutContract.version = "1.7";
layoutContract.caveat = "沿用 v1.6 已通过的 authored 保守布局约束；本轮只改变无障碍元数据、foundation 简中文案与 25-13 拓扑图。它仍不是通用字体字形或浏览器运行时证明。";
fs.writeFileSync(path.join(here, "authored-layout-contract.json"), JSON.stringify(layoutContract, null, 2) + "\n", "utf8");

const overlay = { schema_version: 1, version: "1.7", generated_at: "2026-08-16T03:10:00+08:00", base_version: "1.6", replacement_count: 29, truth_boundary: models.truth_boundary, authored_layout_contract: "authored-layout-contract.json", authored_layout_contract_sha256: sha256(path.join(here, "authored-layout-contract.json")), assets: overlayAssets };
fs.writeFileSync(path.join(here, "overlay-manifest.json"), JSON.stringify(overlay, null, 2) + "\n", "utf8");

const byName = new Map(overlayAssets.map(asset => [asset.name, asset]));
const resolvedAssets = previousResolved.assets.map(asset => {
  if (byName.has(asset.name)) {
    const next = byName.get(asset.name);
    const baseSvg = path.resolve(previousRoot, asset.svg_path);
    const basePng = path.resolve(previousRoot, asset.png_path);
    return { ...next, resolution: "replaced-by-v1.7-overlay", base_svg_sha256: sha256(baseSvg), base_png_sha256: sha256(basePng) };
  }
  const svgPath = path.resolve(previousRoot, asset.svg_path);
  const pngPath = path.resolve(previousRoot, asset.png_path);
  return { ...asset, resolution: "reused-immutable-v1.6-resolved-by-sha", svg_path: path.relative(here, svgPath), png_path: path.relative(here, pngPath), svg_sha256: sha256(svgPath), png_sha256: sha256(pngPath) };
});

const buttonEntries = [];
for (const asset of resolvedAssets) {
  const source = fs.readFileSync(path.resolve(here, asset.svg_path), "utf8");
  for (const match of source.matchAll(/<rect\b[^>]*id="([^"]+)"[^>]*data-button-id="([^"]+)"[^>]*\/>/g)) {
    const rectTag = match[0], containerId = match[1], buttonId = match[2];
    const number = name => Number((rectTag.match(new RegExp(`${name}="([^"]+)"`)) || [])[1]);
    const string = name => (rectTag.match(new RegExp(`${name}="([^"]+)"`)) || [])[1];
    const labelMatch = source.match(new RegExp(`<text\\b[^>]*data-container-ref="${containerId}"[^>]*data-button-label="true"[^>]*>([^<]*)<\\/text>|<text\\b[^>]*data-button-label="true"[^>]*data-container-ref="${containerId}"[^>]*>([^<]*)<\\/text>`));
    if (!labelMatch) throw new Error(`${asset.name}/${buttonId} 缺按钮标签映射`);
    const labelTag = labelMatch[0], label = labelMatch[1] || labelMatch[2];
    const labelFill = (labelTag.match(/fill="([^"]+)"/) || [])[1];
    buttonEntries.push({ asset: asset.name, button_id: buttonId, container_id: containerId, png_path: asset.png_path, rect: { x: number("x"), y: number("y"), width: number("width"), height: number("height") }, background_hex: string("fill"), foreground_hex: labelFill, label, expected_raster_center_tolerance_px: 1.5 });
  }
}
if (buttonEntries.length !== 20) throw new Error(`按钮栅格契约必须为20项，实际 ${buttonEntries.length}`);
const buttonContract = { schema_version: 1, version: "1.7", method: "rendered-png-glyph-pixel-bounds-via-coregraphics", coordinate_system: "SVG top-left equals PNG top-left", tolerance_px: 1.5, entries: buttonEntries };
fs.writeFileSync(path.join(here, "button-raster-contract.json"), JSON.stringify(buttonContract, null, 2) + "\n", "utf8");

overlay.button_raster_contract = "button-raster-contract.json";
overlay.button_raster_contract_sha256 = sha256(path.join(here, "button-raster-contract.json"));
fs.writeFileSync(path.join(here, "overlay-manifest.json"), JSON.stringify(overlay, null, 2) + "\n", "utf8");

const resolved = { schema_version: 1, version: "1.7", generated_at: "2026-08-16T03:10:00+08:00", base_resolved_manifest: "../release-completeness-v1.6/resolved-manifest.json", base_resolved_manifest_sha256: sha256(path.join(previousRoot, "resolved-manifest.json")), overlay_manifest: "overlay-manifest.json", overlay_manifest_sha256: sha256(path.join(here, "overlay-manifest.json")), chart_model: "resolved-chart-models.json", chart_model_sha256: sha256(path.join(here, "resolved-chart-models.json")), button_raster_contract: "button-raster-contract.json", button_raster_contract_sha256: sha256(path.join(here, "button-raster-contract.json")), count: resolvedAssets.length, replaced: 29, reused: 20, truth_boundary: models.truth_boundary, review_contract: { machine_validation: "machine-verifiable-accessible-metadata-route-topology-and-targeted-raster-button-centering", font_glyph_geometry: "button-label-pixels-only-no-general-font-geometry-claim", independent_visual_review: "pending-root-coordinator-round-8", downstream_route_authorized: false }, assets: resolvedAssets };
fs.writeFileSync(path.join(here, "resolved-manifest.json"), JSON.stringify(resolved, null, 2) + "\n", "utf8");

console.log(JSON.stringify({ status: "generated", version: "1.7", overlay_assets: 29, resolved_assets: 49, replaced: 29, reused: 20, raster_button_contracts: 20 }, null, 2));
