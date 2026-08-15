import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const projectRoot=path.resolve(here,"../..");
const previousRoot=path.resolve(here,"../release-completeness-v1.5");
const fail=(message)=>{throw new Error(message)};
const read=(file)=>fs.readFileSync(file,"utf8");
const sha256=(file)=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const decode=(value)=>value.replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&quot;",'"');
const attr=(tag,name,required=true)=>{const match=tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));if(!match&&required)fail(`缺少属性 ${name}: ${tag.slice(0,160)}`);return match?.[1]};
const num=(tag,name)=>Number(attr(tag,name));
const elementById=(source,id)=>{const match=source.match(new RegExp(`<[^>]+id="${id}"[^>]*>`));if(!match)fail(`缺少元素 #${id}`);return match[0]};
const boxOf=(tag)=>({x:num(tag,"x"),y:num(tag,"y"),w:num(tag,"width"),h:num(tag,"height")});
const intersects=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>0&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>0;
const contains=(outer,inner,padding=0)=>inner.x>=outer.x+padding&&inner.y>=outer.y+padding&&inner.x+inner.w<=outer.x+outer.w-padding&&inner.y+inner.h<=outer.y+outer.h-padding;
const pngSize=(file)=>{const b=fs.readFileSync(file);if(b.toString("hex",0,8)!=="89504e470d0a1a0a")fail(`PNG 签名错误: ${file}`);return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)}};
const C_SOFT_ACTION_SENTINEL='fill="#E8F5F2" stroke="#0B6B63"';

function validateViewport(contract){
  const {base_css,zoom_css,physical_scale}=contract;
  if(base_css!==720||zoom_css!==360||physical_scale!==2||base_css/physical_scale!==zoom_css)fail("authored SVG 200%示意属性必须为720→360且物理缩放2倍");
}

function validateBaseline({container,baseline,ascent,descent,safe_top=0,safe_bottom=0}){
  if(baseline-ascent<container.y+safe_top||baseline+descent>container.y+container.h-safe_bottom)fail("字体基线安全区越界");
}

function validateLineContainers(containers){
  for(const container of containers){
    for(const line of container.lines){if(!contains(container.box,line.box,0))fail(` authored line-box 越出容器: ${container.id}/${line.id}`)}
    for(let i=0;i<container.lines.length;i++)for(let j=i+1;j<container.lines.length;j++)if(intersects(container.lines[i].box,container.lines[j].box))fail(` authored line-box 互撞: ${container.id}/${container.lines[i].id}/${container.lines[j].id}`);
  }
}

const fixtures={
  baseline:()=>validateBaseline({container:{x:0,y:10,w:100,h:30},baseline:12,ascent:8,descent:4,safe_top:4,safe_bottom:4}),
  container:()=>validateLineContainers([{id:"容器越界夹具",box:{x:10,y:10,w:40,h:30},lines:[{id:"越界行",box:{x:44,y:18,w:20,h:14}}]}]),
  collision:()=>validateLineContainers([{id:"互撞夹具",box:{x:0,y:0,w:100,h:100},lines:[{id:"行一",box:{x:10,y:10,w:70,h:20}},{id:"行二",box:{x:10,y:25,w:70,h:20}}]}]),
  viewport:()=>validateViewport({base_css:720,zoom_css:400,physical_scale:2})
};
const argMap={"--negative-baseline":"baseline","--negative-container":"container","--negative-collision":"collision","--negative-viewport":"viewport"};
for(const [flag,name] of Object.entries(argMap))if(process.argv.includes(flag)){fixtures[name]();fail(`${name} 负向夹具未被捕获`)}
function exerciseFixtures(){const result={};for(const [name,fn] of Object.entries(fixtures)){let caught=false;try{fn()}catch{caught=true}if(!caught)fail(`${name} 负向夹具未失败`);result[name]={status:"caught",expected_exit_code:1,cli_flag:Object.entries(argMap).find(([,value])=>value===name)[0]}}return result}

const overlay=JSON.parse(read(path.join(here,"overlay-manifest.json")));
const resolved=JSON.parse(read(path.join(here,"resolved-manifest.json")));
const models=JSON.parse(read(path.join(here,"resolved-chart-models.json")));
const layout=JSON.parse(read(path.join(here,"authored-layout-contract.json")));
const buttonContract=JSON.parse(read(path.join(here,"button-raster-contract.json")));
if(overlay.version!=="1.6"||overlay.replacement_count!==41||overlay.assets.length!==41)fail("v1.6 overlay 必须为41张替换资产");
if(resolved.version!=="1.6"||resolved.count!==49||resolved.assets.length!==49||resolved.replaced!==41||resolved.reused!==8)fail("resolved 必须为49=41替换+8复用");
if(models.version!=="1.6"||models.charts.length!==15)fail("共享结构化模型必须包含15张图表");
if(buttonContract.entries.length!==20||buttonContract.method!=="rendered-png-glyph-pixel-bounds-via-coregraphics")fail("按钮真实栅格契约必须为20项");
if(resolved.review_contract.independent_visual_review!=="pending-root-coordinator-round-7"||resolved.review_contract.downstream_route_authorized!==false||resolved.review_contract.font_glyph_geometry!=="button-label-pixels-only-no-general-font-geometry-claim")fail("独立审核门、字体几何边界或下游冻结状态错误");
if(layout.method!=="authored-line-box-contract-not-font-glyph-measurement")fail("布局门必须诚实声明为 authored contract");
validateViewport(layout.viewport);
validateLineContainers(layout.containers);
const negativeFixtures=exerciseFixtures();

const visibleByAsset={};
const internalKeyPattern=/(?<![A-Za-z0-9_-])(as_of|no-evidence|no_evidence|disabled|connector|conditional|not_ready|not_configured|unavailable|failed|partial|stale|live|loading|empty|seed_demo|no-source|no_source|offline|unknown|pending|option|selected|counted|historical_snapshot|no_instance|example_only|demo_user_provided|rule_configuration|approved_document|user_reported|evidence_available|verifiable|verified)(?![A-Za-z0-9_-])/gi;
for(const asset of resolved.assets){
  const svgPath=path.resolve(here,asset.svg_path),pngPath=path.resolve(here,asset.png_path);
  if(!fs.existsSync(svgPath)||!fs.existsSync(pngPath))fail(`缺 resolved 资产 ${asset.name}`);
  if(sha256(svgPath)!==asset.svg_sha256||sha256(pngPath)!==asset.png_sha256)fail(`resolved SHA 不一致 ${asset.name}`);
  const size=pngSize(pngPath);if(size.width!==asset.outer_pixels.width||size.height!==asset.outer_pixels.height)fail(`PNG 尺寸不一致 ${asset.name}`);
  const source=read(svgPath),texts=[...source.matchAll(/<(?:text|title|desc)[^>]*>([^<]*)<\/(?:text|title|desc)>/g)].map(m=>decode(m[1]).trim()).filter(Boolean);
  for(const value of texts){
    const keys=[...value.matchAll(internalKeyPattern)].map(match=>match[1]);
    if(keys.length&&!/(?:内部键|开发附注)[:：]/.test(value))fail(`${asset.name}: 用户可见内部键未置于明确附注：${keys.join(",")} / ${value}`);
  }
  visibleByAsset[asset.name]={text_nodes:texts.length,unannotated_internal_keys:0,png_dimensions:size};
}

const chartEvidence={};
for(const model of models.charts){
  if(!model.encoding_contract||Object.keys(model.encoding_contract).length<2)fail(`${model.id}: 缺模型字段→视觉通道契约`);
  const file=path.join(here,"assets",`${model.id}.svg`),source=read(file);
  const parse=(kind)=>[...source.matchAll(new RegExp(`<g data-${kind}-record="([^"]+)" data-payload="([^"]+)">(.*?)<\\/g>`,"g"))].map(m=>({id:m[1],record:JSON.parse(Buffer.from(m[2],"base64url").toString("utf8")),body:m[3]}));
  const visual=parse("visual"),table=parse("table"),expected=model.records.map(record=>({id:record.id,record}));const ids=(entries)=>entries.map(item=>item.id).sort();
  if(!same(ids(visual),ids(expected))||!same(ids(table),ids(expected)))fail(`${model.id}: 图形/表格/模型 ID 集合不双向相等`);
  for(const item of expected){const v=visual.find(e=>e.id===item.id),t=table.find(e=>e.id===item.id);if(!same(v.record,item.record)||!same(t.record,item.record)||!same(v.record,t.record))fail(`${model.id}/${item.id}: payload 不相等`)}
  if(!source.includes(model.legend.replaceAll("&","&amp;")))fail(`${model.id}: 用户可见图例与模型契约不一致`);
  for(const group of source.matchAll(/<g data-table-record="[^"]+"[^>]*>(.*?)<\/g>/g)){for(const text of group[1].matchAll(/<text[^>]*font-size="([^"]+)"/g))if(Number(text[1])<14)fail(`${model.id}: 等价表正文小于14px`)}
  if(!source.includes('data-complete-truth-strip="true"'))fail(`${model.id}: 缺就近真相条`);
  let mainMarkStateRecords=null;
  if(model.id==="25-11-evidence-stair"||model.id==="25-15-sync-timeline"){
    mainMarkStateRecords=[];
    for(const item of expected){
      const body=visual.find(entry=>entry.id===item.id).body;
      const label=model.id==="25-11-evidence-stair"?`状态：${({user_reported:"用户自述",evidence_available:"有证据待核验",verifiable:"可核验",verified:"已核验"})[item.record.state]}`:`系统状态：${({not_ready:"未就绪",unavailable:"不可用",example_only:"允许状态示例"})[item.record.state]}`;
      if(!body.includes('data-main-mark-field="state"')||!body.includes(`data-encode-value="${item.record.state}"`)||!body.includes(label))fail(`${model.id}/${item.id}: 主图 mark 未显式显示 state 状态文字`);
      mainMarkStateRecords.push({id:item.id,state:item.record.state,visible_label:label,status:"matched-in-main-mark"});
    }
  }
  chartEvidence[model.id]={records:expected.length,visual_records:visual.length,table_records:table.length,bidirectional_equal:true,encoding_contract:model.encoding_contract,legend:model.legend,table_body_min_px:14,main_mark_state_records:mainMarkStateRecords};
}

const svgFor=(id)=>read(path.join(here,"assets",`${id}.svg`));
const scatter=svgFor("25-01-direction-scatter");if((scatter.match(/data-encode-field="confidence"/g)||[]).length!==8||!scatter.includes('stroke-width="4"')||!scatter.includes('stroke-dasharray="5 4"'))fail("25-01置信度描边未真实实现");
const comparison=svgFor("25-02-direction-comparison");if((comparison.match(/data-equal-weight="true"/g)||[]).length!==3||comparison.includes(C_SOFT_ACTION_SENTINEL))fail("25-02存在任意首卡高亮");
const capability=svgFor("25-03-capability-map");if((capability.match(/data-matrix-cell=/g)||[]).length!==40||(capability.match(/data-encode-field="p2"/g)||[]).length!==8||(capability.match(/stroke-dasharray="5 4"/g)||[]).length<8)fail("25-03空框/实色编码未实现");
const dotplot=svgFor("25-04-sample-dotplot");if((dotplot.match(/data-encode-field="state"/g)||[]).length!==4||!dotplot.includes('fill="#0B6B63"'))fail("25-04 counted实心点未实现");
const remote=svgFor("25-06-remote-constraints");if((remote.match(/data-encode-field="disclosure"/g)||[]).length!==3||!["●","▲","◇"].every(symbol=>remote.includes(symbol)))fail("25-06形状/文字双编码未实现");
const policy=svgFor("25-07-policy-runtime");if((policy.match(/data-encode-field="policy"/g)||[]).length!==3||!policy.includes('id="policy-hatch"')||!policy.includes('id="policy-cross"')||!["✓","△","×"].every(symbol=>policy.includes(symbol)))fail("25-07纹理/符号双编码未实现");
const sourceBand=svgFor("25-08-source-band");if((sourceBand.match(/data-encode-field="h24"/g)||[]).length!==3||(sourceBand.match(/data-encode-field="h48"/g)||[]).length!==3||(sourceBand.match(/data-encode-field="state"/g)||[]).length!==3||!sourceBand.includes('id="band-missing"')||!sourceBand.includes('id="band-unavailable"')||sourceBand.includes("#067647")||sourceBand.includes("#E7F5EE"))fail("25-08三字段驱动纹理不完整或出现成功绿");
const dual=svgFor("25-09-dual-classification");if((dual.match(/data-encode-field="axis"/g)||[]).length!==4||!dual.includes("◇ 候选")||!dual.includes("● 待确认"))fail("25-09形状/线型双编码未实现");
const relationModel=models.charts.find(c=>c.id==="25-10-relation-matrix"),relation=svgFor("25-10-relation-matrix"),selectedRelations=relationModel.records.filter(record=>record.selected);if(selectedRelations.length!==1||selectedRelations[0].id!=="rel-insufficient"||selectedRelations[0].relation!=="证据不足"||selectedRelations[0].basis!=="缺少版本证据"||!relation.includes("●")||!relation.includes("缺少版本证据"))fail("25-10 缺版本证据必须唯一归为证据不足");
const stairModel=models.charts.find(c=>c.id==="25-11-evidence-stair"),stair=svgFor("25-11-evidence-stair");if((stair.match(/data-main-mark-field="state"/g)||[]).length!==stairModel.records.length)fail("25-11 主图逐记录状态文字映射不完整");
const timelineModel=models.charts.find(c=>c.id==="25-14-version-timeline"),timeline=svgFor("25-14-version-timeline");const publicSources=new Set(timelineModel.records.filter(r=>r.track==="公共快照").map(r=>r.source_identity));if(!publicSources.has("获批历史研究快照")||!publicSources.has("获批产品文档")||(timeline.match(/data-encode-field="state"/g)||[]).length!==5||!timeline.includes("规则=菱形"))fail("25-14公共真相或形状/实空编码不完整");
const syncModel=models.charts.find(c=>c.id==="25-15-sync-timeline"),sync=svgFor("25-15-sync-timeline");if(!sync.includes("!")||!sync.includes("↻")||!sync.includes("同步结果")||!sync.includes("系统状态")||syncModel.columns.indexOf("status")<0||syncModel.columns.indexOf("state")<0||(sync.match(/data-main-mark-field="state"/g)||[]).length!==syncModel.records.length)fail("25-15符号、双语义字段或主图逐记录状态文字不完整");

for(const page of ["04","05","06","08"]){const suffix=page==="04"?"sources-quality":page==="05"?"workbench":page==="06"?"personal-evidence":"future-history",source=read(path.join(here,"assets",`${page}-desktop-page-${page}-${suffix}-1440.svg`));if((source.match(/data-authored-baseline-offset="5"/g)||[]).length!==3)fail(`page${page}: 三个chip未应用5px基线补偿`)}
const component=read(path.join(here,"assets","24-components-states.svg"));if((component.match(/data-pill-label="true"/g)||[]).length!==4||(component.match(/data-authored-baseline-offset="5"/g)||[]).length<4)fail("组件四状态胶囊未应用5px基线补偿");for(const id of ["cancel-button","confirm-button"]){if(boxOf(elementById(component,id)).h<44)fail(`${id}: 触控矩形不足44px`)}
const page10=read(path.join(here,"assets","10-desktop-page-10-quality-recovery-1440.svg"));if(page10.includes("未就绪（未就绪）")||page10.includes("不可用（不可用）"))fail("page10 仍有重复状态翻译");
const zoom=read(path.join(here,"assets","28-accessibility-zoom-200.svg")),tag=id=>elementById(zoom,id),textTag=(container,key)=>{const match=zoom.match(new RegExp(`<text[^>]*data-container-ref="${container}"[^>]*data-content-key="${key}"[^>]*>`));if(!match)fail(`zoom缺${container}/${key}`);return match[0]};
if(num(tag("zoom-200-panel"),"data-css-viewport")!==360||num(tag("zoom-200-panel"),"data-base-css-viewport")!==720||num(tag("zoom-200-panel"),"data-physical-scale")!==2)fail("200%视口不符合720→360");
if(num(textTag("zoom-200-card","title"),"font-size")!==48||num(textTag("zoom-200-card","body"),"font-size")!==32||num(textTag("zoom-200-card","helper"),"font-size")!==28)fail("200%字体Token不是严格2倍");
if(num(textTag("zoom-200-card","title"),"y")<330||num(elementById(zoom,"zoom-200-panel"),"data-css-viewport")!==360)fail("200%标题未获得保守上内距");
const exact2=(baseId,zoomId,key)=>{if(num(tag(zoomId),key)!==num(tag(baseId),key)*2)fail(`${baseId}/${zoomId} ${key}非严格2倍`)};exact2("zoom-base-button","zoom-200-button","height");exact2("zoom-base-card","zoom-200-card","rx");exact2("zoom-base-card","zoom-200-card","stroke-width");

const rasterOutput=execFileSync("swift",[path.join(here,"verify-button-raster.swift"),path.join(here,"button-raster-contract.json")],{encoding:"utf8"});
const rasterReport=JSON.parse(rasterOutput);
if(rasterReport.status!=="machine_passed"||rasterReport.button_count!==20||rasterReport.scope!=="button-label-glyph-pixels-only")fail("按钮真实 PNG 字形中心验证未通过");
fs.writeFileSync(path.join(here,"button-raster-report.json"),JSON.stringify(rasterReport,null,2)+"\n","utf8");

const immutable={prompt:[path.join(projectRoot,"ui/04-release-completeness-ui-prompt.md"),"983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900"],v1:[path.join(projectRoot,"ui/05-release-completeness-ui-design.md"),"ffc0251ac0c2bfc077e47a9b3352f1d6ccd30f584e6e352e160f07557afcfe3e"],v1_1:[path.join(projectRoot,"ui/06-release-completeness-ui-design-v1.1.md"),"f8377d001684a40d26513d4c02ccb1fa3fe1aea325300ee7357537c218b79aae"],v1_2:[path.join(projectRoot,"ui/07-release-completeness-ui-design-v1.2.md"),"768050aba1b7a959510b8f252a8d8628e25cc3b8f3be53bd04efb122630307cc"],v1_3:[path.join(projectRoot,"ui/08-release-completeness-ui-design-v1.3.md"),"2278c7ecee8826fe2f8afa90c94af28070b3295dc88020f8c29e7442ee3175ba"],v1_4:[path.join(projectRoot,"ui/09-release-completeness-ui-design-v1.4.md"),"371c4b1e703b5718853b304477b1507fe0de3a100ef0d2993dac4b245a4b04d2"],v1_5:[path.join(projectRoot,"ui/10-release-completeness-ui-design-v1.5.md"),"6decc0a7c72286724fc9b3c940c5d998ac6f73ec6c2bfa0ee98213759cab7bf7"],v1_5_resolved:[path.join(previousRoot,"resolved-manifest.json"),"5d7a7e2101f4725b82a91b8e9fbe47601bb4877c5d072007129099d3aa10c551"]};
const immutableChecks={};for(const [id,[file,expected]] of Object.entries(immutable)){if(sha256(file)!==expected)fail(`不可变历史SHA改变 ${id}`);immutableChecks[id]="matched"}
const categories={};resolved.assets.forEach(a=>categories[a.category]=(categories[a.category]||0)+1);for(const [name,count] of Object.entries({desktop:10,flow:4,truth:2,mobile:14,chart:15,standard:2,responsive:2}))if(categories[name]!==count)fail(`分类${name}预期${count}，实际${categories[name]||0}`);

const result={
  schema_version:1,version:"1.6",generated_at:"2026-08-16T02:15:00+08:00",
  machine_validation:{status:"machine_passed",scope:["resolved-49-sha-png-signature-and-dimensions","authored-line-box-container-and-collision-contract","four-independent-negative-fixture-families","15-chart-model-visual-table-bidirectional-data-equality","named-chart-encoding-dom-assertions-only","25-11-and-25-15-per-record-main-mark-state-mapping","25-10-evidence-insufficient-single-selection","table-body-minimum-14px","all-visible-text-internal-key-scan-with-annotation-rule","rendered-png-button-label-glyph-centering-20-of-20","authored-svg-zoom-attribute-pairs-only","immutable-history"]},
  independent_visual_review:{status:"pending",owner:"AIWorkFlow-root-coordinator",round:7,note:"机器门验证设计源结构、authored line-box、指定 SVG DOM 编码、PNG签名/尺寸/SHA，以及20个按钮标签在已渲染PNG中的前景字形像素中心；不声称通用字体几何、浏览器CSS运行时布局、所有图表视觉编码或独立视觉已经通过。"},
  downstream_route_authorized:false,
  bundle:{resolved_assets:49,replaced_by_v1_6:41,reused_immutable_v1_5_resolved:8,category_counts:categories},
  truth_boundary:models.truth_boundary,
  chart_equivalence:{model:"resolved-chart-models.json",models:15,data_equality:"15-of-15",visual_encoding_claim:"named-assertions-only-no-blanket-15-of-15-claim",checks:chartEvidence},
  authored_layout_validation:{method:layout.method,caveat:layout.caveat,containers:layout.containers.length,negative_fixtures:negativeFixtures},
  raster_integrity:{general_assets:"PNG签名、外层像素尺寸与SHA；不做通用字体轮廓或逐像素碰撞识别",button_labels:{method:rasterReport.method,scope:rasterReport.scope,count:rasterReport.button_count,report:"button-raster-report.json",report_sha256:sha256(path.join(here,"button-raster-report.json"))},assets:visibleByAsset},
  authored_svg_zoom_attributes:{runtime_claim:"not-browser-runtime-validated",verified_pairs:["CSS视口属性720→360与physical_scale=2","标题字号24→48","正文字号16→32","辅助字号14→28","按钮高度44→88","卡片圆角8→16","卡片描边1→2"],not_verified_as_runtime:["浏览器CSS回流","padding实际布局","gap实际布局","真实浏览器缩放"]},
  critical_fixes:{chart_main_mark_state:"25-11=5-of-5-and-25-15=4-of-4",relation:"missing-version-evidence-mapped-to-evidence-insufficient",visible_language:"all-49-visible-text-internal-key-scan",page10:"deduplicated-status-labels",button_raster:"20-of-20-within-plus-minus-1.5px",zoom_claim:"authored-svg-attributes-only"},
  immutable_checks:immutableChecks
};
const serialized=JSON.stringify(result,null,2)+"\n";
if(/browser-runtime-passed|all-token-groups-runtime-passed|actual-svg-text-container-bounds|manual_visual_inspection|independent_visual_review_passed|general-font-glyph-bounds-passed/.test(serialized))fail("机器门禁止过度声明浏览器、通用字形或独立视觉通过");
fs.writeFileSync(path.join(here,"review-manifest.json"),serialized,"utf8");
console.log(JSON.stringify({status:"machine_passed",resolved_assets:49,replaced:41,reused:8,chart_data:"15-model-visual-table-bidirectional-equal",chart_visual_encoding:"named-assertions-only",button_raster_centers:"20-of-20",zoom:"authored-svg-attributes-only",negative_fixtures:"4-of-4-caught",independent_visual_review:"pending-round-7"},null,2));
