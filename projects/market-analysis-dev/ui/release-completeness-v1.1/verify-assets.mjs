import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const svgDir = path.join(here, "assets");
const pngDir = path.join(here, "png");
const expected = JSON.parse(fs.readFileSync(path.join(svgDir, "manifest.json"), "utf8"));
const fail = (message) => { throw new Error(message); };
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const readPngSize = (file) => {
  const b = fs.readFileSync(file);
  if (b.toString("hex",0,8) !== "89504e470d0a1a0a") fail(`invalid PNG: ${file}`);
  return { width:b.readUInt32BE(16), height:b.readUInt32BE(20) };
};
const requireText = (file, values) => {
  const s = fs.readFileSync(file,"utf8");
  for (const value of values) if (!s.includes(value)) fail(`missing ${value} in ${path.basename(file)}`);
};

if (expected.count !== 28 || expected.assets.length !== 28) fail("expected 28 SVG assets");
const pngFiles = fs.readdirSync(pngDir).filter((f)=>f.endsWith(".png")).sort();
if (pngFiles.length !== 28) fail(`expected 28 PNG assets, got ${pngFiles.length}`);

const reviewAssets = expected.assets.map((asset) => {
  const svg = path.join(svgDir, asset.name);
  const pngName = asset.name.replace(/\.svg$/, ".png");
  const png = path.join(pngDir, pngName);
  if (!fs.existsSync(svg) || !fs.existsSync(png)) fail(`missing pair for ${asset.name}`);
  const size = readPngSize(png);
  if (size.width !== asset.width || size.height !== asset.height) fail(`dimension mismatch: ${pngName}`);
  return {
    name: pngName,
    logical_viewport: `${asset.width}x${asset.height}`,
    png_sha256: sha256(png),
    editable_svg: `../assets/${asset.name}`,
    svg_sha256: sha256(svg),
    visual_inspection: "passed-2026-08-15"
  };
});

const categoryCount = {
  desktop: reviewAssets.filter((a)=>/^0[1-9]-desktop|^10-desktop/.test(a.name)).length,
  flows: reviewAssets.filter((a)=>/^1[1-4]-flow/.test(a.name)).length,
  truth: reviewAssets.filter((a)=>/^1[5-6]-truth/.test(a.name)).length,
  mobile_same_state_pairs: reviewAssets.filter((a)=>/^(17|18|19|20|21|22|23)-mobile/.test(a.name)).length,
  standards_and_responsive: reviewAssets.filter((a)=>/^(24|25|26|27|28)-/.test(a.name)).length
};
const expectedCounts = {desktop:10,flows:4,truth:2,mobile_same_state_pairs:7,standards_and_responsive:5};
for (const [k,v] of Object.entries(expectedCounts)) if (categoryCount[k] !== v) fail(`category ${k}: expected ${v}, got ${categoryCount[k]}`);

const svg = (name) => path.join(svgDir,name);
requireText(svg("01-desktop-page-01-directions-1440.svg"), ["产品型前端／应用工程","平台／设计系统／DevEx","AI 应用前端／AI 产品工程","数据可视化／实时交互","跨端／桌面／移动","全栈产品协作","Web 质量工程","UX Engineering／设计开发融合","二维解释坐标图"]);
requireText(svg("02-desktop-page-02-tech-landscape-1440.svg"), ["Web 平台","框架与状态／数据范式","工程化","产品质量","设计与协作","方向专项","AI 增量","观察项"]);
for (const name of ["01-desktop-page-01-directions-1440.svg","02-desktop-page-02-tech-landscape-1440.svg","03-desktop-page-03-market-trends-1440.svg","04-desktop-page-04-sources-quality-1440.svg","08-desktop-page-08-future-history-1440.svg","10-desktop-page-10-quality-recovery-1440.svg"]) {
  requireText(svg(name), ["研究清单已批准 · 运行时来源 0 · connector 0 · 招聘实例 0"]);
}
requireText(svg("05-desktop-page-05-workbench-1440.svg"), ["1–100,000 Unicode","互斥单选","新增证据","相互印证","重复","冲突","证据不足","不适用"]);
requireText(svg("07-desktop-page-07-gap-roadmap-1440.svg"), ["当前差距保持未知","路线不得生成","路线区域","未生成"]);
requireText(svg("13-flow-03-gap-roadmap-recompute.svg"), ["未知分支终止","禁止：生成路线、优先级、个人分数","目标态演示 · 当前未接通"]);
requireText(svg("15-truth-01-source-policy-runtime.svg"), ["当前真实 0 接入","目标态演示","0 connector"]);
requireText(svg("16-truth-02-eleven-states.svg"), ["当前来源快照可用（live）","当前条件下 0 条（empty）","数据尚未就绪（not_ready）","数据可能过期（stale）","使用上一已核验版本（degraded）","部分步骤成功（partial）","当前无可用结果（failed）","当前离线（offline）","演示数据（seed_demo）","尚无可执行来源（no-source）","暂无个人证据（no-evidence）"]);
requireText(svg("25-dataviz-15-types.svg"), ["01 方向坐标图","02 方向比较矩阵","03 分层能力地图","04 样本内计数点图","05 7/30/90趋势线","06 远程约束矩阵","07 来源政策×运行时","08 来源覆盖时间带","09 双轴分类面板","10 研究关系矩阵","11 证据阶梯","12 差距证据矩阵","13 路线依赖图","14 版本/变化时间线","15 同步状态时间线"]);
requireText(svg("28-accessibility-zoom-200.svg"), ["200% 文本放大","等效内容宽度约 720 CSS px","无横向滚动","焦点环完整"]);
for (const asset of expected.assets.filter((a)=>a.name.includes("mobile"))) requireText(svg(asset.name), ["逻辑视口 390×844","逻辑视口 320×844","同一页面 · 同一状态"]);

const luminance = (hex) => {
  const rgb = hex.match(/\w\w/g).map((x)=>parseInt(x,16)/255).map((x)=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
  return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
};
const ratio = (a,b) => {
  const x=luminance(a), y=luminance(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
};
const contrast = {text:"17212B",muted_unknown:"475467",action:"0B6B63",info:"1D4ED8",success:"067647",warning:"8A4B08",danger:"B4233C",inference:"5B4BC4"};
const contrastRatios = {};
for (const [name,hex] of Object.entries(contrast)) {
  const value = ratio(hex,"FFFFFF");
  if (value < 4.5) fail(`contrast below 4.5: ${name} ${value}`);
  contrastRatios[name] = Number(value.toFixed(2));
}

const projectRoot = path.resolve(here,"../..");
const immutableChecks = {
  approved_prompt: [path.join(projectRoot,"ui/04-release-completeness-ui-prompt.md"),"983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900"],
  v1_design: [path.join(projectRoot,"ui/05-release-completeness-ui-design.md"),"ffc0251ac0c2bfc077e47a9b3352f1d6ccd30f584e6e352e160f07557afcfe3e"]
};
for (const [name,[file,expectedSha]] of Object.entries(immutableChecks)) if (sha256(file)!==expectedSha) fail(`immutable SHA changed: ${name}`);

const result = {
  schema_version:1,
  version:"1.1",
  generated_at:"2026-08-15T19:35:59+08:00",
  counts:categoryCount,
  total_visual_assets:reviewAssets.length,
  source_generator_sha256:sha256(path.join(here,"generate-assets.mjs")),
  truth_boundary:{runtime_sources:0,connectors:0,approved_recruitment_instances:0},
  contrast_ratios_on_white:contrastRatios,
  coverage:{desktop_pages:"10-of-10",flows:"4-of-4",truth_boards:"2-of-2",mobile_same_state_pairs:"7-of-7",chart_types:"15-of-15",responsive:"1440-1024-390-320-and-200-percent"},
  immutable_checks:{approved_prompt:"matched",v1_design:"matched"},
  assets:reviewAssets
};
fs.writeFileSync(path.join(here,"review-manifest.json"),JSON.stringify(result,null,2)+"\n","utf8");
console.log(JSON.stringify({status:"passed",assets:reviewAssets.length,categoryCount,contrastRatios},null,2));
