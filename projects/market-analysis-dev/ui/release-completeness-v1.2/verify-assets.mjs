import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const svgDir=path.join(here,"assets");
const pngDir=path.join(here,"png");
const manifestPath=path.join(svgDir,"manifest.json");
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const fail=(message)=>{throw new Error(message)};
const sha256=(file)=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const read=(file)=>fs.readFileSync(file,"utf8");
const count=(value,needle)=>value.split(needle).length-1;
const requireAll=(value,items,label)=>{for(const item of items)if(!value.includes(item))fail(`${label}: missing ${item}`)};
const pngSize=(file)=>{const b=fs.readFileSync(file);if(b.toString("hex",0,8)!=="89504e470d0a1a0a")fail(`invalid PNG ${file}`);return{width:b.readUInt32BE(16),height:b.readUInt32BE(20)}};

if(manifest.version!=="1.2"||manifest.count!==49||manifest.assets.length!==49)fail("expected v1.2 manifest with 49 assets");
if(manifest.review_contract.machine_gate!=="self-verifiable"||manifest.review_contract.independent_visual_review!=="pending-root-coordinator")fail("review contract must separate machine and independent gates");

const categoryCounts={};
const reviewAssets=[];
for(const asset of manifest.assets){
  categoryCounts[asset.category]=(categoryCounts[asset.category]||0)+1;
  const svgPath=path.join(svgDir,asset.name);
  const pngName=asset.name.replace(/\.svg$/,".png");
  const pngPath=path.join(pngDir,pngName);
  if(!fs.existsSync(svgPath)||!fs.existsSync(pngPath))fail(`missing SVG/PNG pair ${asset.name}`);
  const size=pngSize(pngPath);
  if(size.width!==asset.outer_pixels.width||size.height!==asset.outer_pixels.height)fail(`outer dimension mismatch ${asset.name}`);
  if(!Array.isArray(asset.internal_logical_viewports)||asset.internal_logical_viewports.length===0)fail(`missing internal logical viewport ${asset.name}`);
  reviewAssets.push({name:pngName,category:asset.category,outer_pixels:asset.outer_pixels,internal_logical_viewports:asset.internal_logical_viewports,png_sha256:sha256(pngPath),editable_svg:`assets/${asset.name}`,svg_sha256:sha256(svgPath),machine_status:"verified"});
}
const expectedCounts={desktop:10,flow:4,truth:2,mobile:14,chart:15,standard:2,responsive:2};
for(const [key,value] of Object.entries(expectedCounts))if(categoryCounts[key]!==value)fail(`category ${key}: expected ${value}, got ${categoryCounts[key]||0}`);
if(new Set(reviewAssets.map((asset)=>asset.png_sha256)).size!==49)fail("all PNG assets must be distinct");

// P1-1: mobile viewports are independent files, not a scaled 390 layout.
const mobileAssets=manifest.assets.filter((asset)=>asset.category==="mobile");
for(const asset of mobileAssets){
  const source=read(path.join(svgDir,asset.name));
  const expectedWidth=asset.name.endsWith("-320.svg")?320:390;
  if(asset.outer_pixels.width!==expectedWidth||asset.outer_pixels.height!==844)fail(`mobile outer dimensions ${asset.name}`);
  const logical=asset.internal_logical_viewports[0];
  if(logical.width!==expectedWidth||logical.height!==844||logical.scale!==1)fail(`mobile logical viewport ${asset.name}`);
  requireAll(source,[`data-layout="independent-reflow"`,`data-logical-width="${expectedWidth}"`,`data-min-body-font="16"`,`data-min-helper-font="14"`,`data-min-touch="44"`],asset.name);
  if(/transform="[^\"]*scale\(/.test(source))fail(`mobile overall scaling found ${asset.name}`);
  const touchHeights=[...source.matchAll(/data-touch-height="(\d+)"/g)].map((match)=>Number(match[1]));
  if(touchHeights.length===0||touchHeights.some((height)=>height<44))fail(`mobile touch target below 44 ${asset.name}`);
  const fontSizes=[...source.matchAll(/font-size="(\d+)"/g)].map((match)=>Number(match[1]));
  if(fontSizes.some((size)=>size<14)||!fontSizes.includes(16))fail(`mobile typography floor ${asset.name}`);
  if(asset.surface==="public")requireAll(source,["研究清单已批准","来源 0","connector 0","招聘实例 0"],asset.name);
  if(asset.surface==="private"){
    requireAll(source,["演示数据 · 用户提供"],asset.name);
    if(count(source,"演示数据 · 用户提供")!==1)fail(`duplicate private truth label ${asset.name}`);
  }
}

// P1-2: true 200% proof is numeric and asserts reflow rather than a small font bump.
const zoomAsset=manifest.assets.find((asset)=>asset.name==="28-accessibility-zoom-200.svg");
const zoomSource=read(path.join(svgDir,zoomAsset.name));
const zoomMatch=zoomSource.match(/id="zoom-200-content"[^>]*data-scale="(\d+)"[^>]*data-base-font="(\d+)"[^>]*data-rendered-font="(\d+)"[^>]*data-base-control="(\d+)"[^>]*data-rendered-control="(\d+)"[^>]*data-viewport-width="(\d+)"[^>]*data-scroll-x="(true|false)"[^>]*data-overlap="(true|false)"/);
if(!zoomMatch)fail("missing 200% numeric proof");
const [,scale,baseFont,renderedFont,baseControl,renderedControl,zoomWidth,scrollX,overlap]=zoomMatch;
if(Number(scale)!==2||Number(renderedFont)!==Number(baseFont)*2||Number(renderedControl)!==Number(baseControl)*2||Number(zoomWidth)!==720||scrollX!=="false"||overlap!=="false")fail("invalid 200% reflow proof");
const zoomLogical=zoomAsset.internal_logical_viewports;
if(zoomLogical[0].body_font!==16||zoomLogical[1].body_font!==32||zoomLogical[0].control_height!==44||zoomLogical[1].control_height!==88||zoomLogical[1].horizontal_scroll!==false||zoomLogical[1].overlap!==false)fail("zoom manifest dimensions invalid");

// P1-3: recompute every direction node and label boundary from SVG attributes.
const directionSource=read(path.join(svgDir,"01-desktop-page-01-directions-1440.svg"));
const plotMatch=directionSource.match(/id="direction-plot" data-left="(\d+)" data-top="(\d+)" data-right="(\d+)" data-bottom="(\d+)" data-right-panel-left="(\d+)"/);
if(!plotMatch)fail("direction plot bounds missing");
const [,left,top,right,bottom,panelLeft]=plotMatch.map(Number);
const nodes=[...directionSource.matchAll(/data-direction-node="([^"]+)" data-x="(\d+)" data-y="(\d+)" data-label-x="(\d+)" data-label-width="(\d+)"/g)];
if(nodes.length!==8)fail(`expected 8 direction nodes, got ${nodes.length}`);
for(const node of nodes){const [,id,x,y,labelX,labelWidth]=node;const values=[x,y,labelX,labelWidth].map(Number);if(values[0]<left||values[0]>right||values[1]<top||values[1]>bottom||values[2]<left||values[2]+values[3]>right||values[2]+values[3]>=panelLeft)fail(`direction boundary failed ${id}`)}
requireAll(directionSource,["UX Engineering／设计开发融合","数据可视化／实时交互"],"direction page");

// P1-4: the five-layer structure exists, while P2 truthfully renders an empty state.
const techSource=read(path.join(svgDir,"02-desktop-page-02-tech-landscape-1440.svg"));
requireAll(techSource,["P0","P1","P1-AI","P2","观察项","本样本暂无 P2","不补造能力项","不代表市场没有 P2","Web 平台","框架与状态／数据","工程化","产品质量","设计与协作","方向专项","AI 增量","观察项"],"technology landscape");

// P1-5: each chart has its own actual board and a complete machine-readable contract.
const chartAssets=manifest.assets.filter((asset)=>asset.category==="chart");
if(new Set(chartAssets.map((asset)=>asset.chart_type)).size!==15)fail("chart semantic types are not unique");
for(const asset of chartAssets){const source=read(path.join(svgDir,asset.name));requireAll(source,[asset.chart_type,"坐标、单位与图例","图形区","空态","完整等价表","重置筛选"],asset.name);if(asset.surface==="public")requireAll(source,["来源 0","connector 0","招聘实例 0"],asset.name);else requireAll(source,["演示数据 · 用户提供"],asset.name)}
requireAll(read(path.join(svgDir,"25-05-trend-line.svg")),["目标态结构示例","目标态演示 · 当前未接通","来源未接通"],"trend chart truth");

// P1-6/P1-7: account isolation and two independent exports are visible in page and flow.
for(const name of ["09-desktop-page-09-data-rights-1440.svg","14-flow-04-sync-export-delete.svg"]){const source=read(path.join(svgDir,name));requireAll(source,["下载人类可读摘要","下载机器可读数据"],name)}
const rightsSource=read(path.join(svgDir,"09-desktop-page-09-data-rights-1440.svg"));
requireAll(rightsSource,["游客","登录账号","退出登录","切换到账号 B","账号 B 私有可见记录：0","账号 A 的 3 条记录在 B 中不可见","data-cross-account-proof=\"zero-visible\""],"account isolation");

// P1-8/P2 truth language: examples cannot be presented as connector history.
const truthSource=read(path.join(svgDir,"15-truth-01-source-policy-runtime.svg"));
requireAll(truthSource,["允许呈现的状态示例 · 无运行历史","允许呈现的状态示例 · 当前未接通","状态示例不是遥测记录","当前没有连接器运行历史"],"truth policy/runtime");

// Contrast checks are machine facts, not an independent visual review.
const luminance=(hex)=>{const rgb=hex.match(/\w\w/g).map((value)=>parseInt(value,16)/255).map((value)=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2]};
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
const colors={text:"17212B",muted:"475467",action:"0B6B63",info:"1D4ED8",success:"067647",warning:"8A4B08",danger:"B4233C",inference:"5B4BC4"};
const contrast={};for(const [name,hex]of Object.entries(colors)){const value=ratio(hex,"FFFFFF");if(value<4.5)fail(`contrast below 4.5 ${name}`);contrast[name]=Number(value.toFixed(2))}

const projectRoot=path.resolve(here,"../..");
const immutable={
  approved_prompt:[path.join(projectRoot,"ui/04-release-completeness-ui-prompt.md"),"983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900"],
  v1_design:[path.join(projectRoot,"ui/05-release-completeness-ui-design.md"),"ffc0251ac0c2bfc077e47a9b3352f1d6ccd30f584e6e352e160f07557afcfe3e"],
  v1_1_design:[path.join(projectRoot,"ui/06-release-completeness-ui-design-v1.1.md"),"f8377d001684a40d26513d4c02ccb1fa3fe1aea325300ee7357537c218b79aae"]
};
for(const [name,[file,expected]]of Object.entries(immutable))if(sha256(file)!==expected)fail(`immutable SHA changed ${name}`);

const result={
  schema_version:2,
  version:"1.2",
  generated_at:"2026-08-15T22:20:00+08:00",
  machine_validation:{status:"machine_passed",scope:["file-pairs","dimensions","hashes","layout-metadata","mobile-minimums","direction-boundaries","zoom-2x","truth-copy","chart-contracts","contrast","immutable-inputs"]},
  independent_visual_review:{status:"pending",owner:"AIWorkFlow-root-coordinator",note:"机器生成字符串和固定04自查不构成独立人工目检结论。"},
  counts:categoryCounts,
  total_visual_assets:reviewAssets.length,
  truth_boundary:{runtime_sources:0,connectors:0,approved_recruitment_instances:0},
  contrast_ratios_on_white:contrast,
  immutable_checks:{approved_prompt:"matched",v1_design:"matched",v1_1_design:"matched"},
  coverage:{desktop_pages:"10-of-10",flows:"4-of-4",truth_boards:"2-of-2",mobile_independent_viewports:"7-at-390-and-7-at-320",chart_types:"15-distinct-boards",responsive:"1440-1024-390-320-and-true-200-percent"},
  assets:reviewAssets
};
const serialized=JSON.stringify(result,null,2)+"\n";
if(serialized.includes("visual_inspection")||serialized.includes("manual_visual_inspection")||serialized.includes("independent_visual_review_passed"))fail("forbidden self-claimed visual review field");
fs.writeFileSync(path.join(here,"review-manifest.json"),serialized,"utf8");
console.log(JSON.stringify({status:"machine_passed",assets:reviewAssets.length,categoryCounts,independent_visual_review:"pending",contrast},null,2));
