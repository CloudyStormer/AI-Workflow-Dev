import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const projectRoot=path.resolve(here,"../..");
const previousRoot=path.resolve(here,"../release-completeness-v1.2");
const overlay=JSON.parse(fs.readFileSync(path.join(here,"overlay-manifest.json"),"utf8"));
const resolved=JSON.parse(fs.readFileSync(path.join(here,"resolved-manifest.json"),"utf8"));
const models=JSON.parse(fs.readFileSync(path.join(here,"chart-models.json"),"utf8"));
const fail=(message)=>{throw new Error(message)};
const sha256=(file)=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const read=(file)=>fs.readFileSync(file,"utf8");
const attr=(tag,name)=>{const m=tag.match(new RegExp(`${name}="([^"]+)"`));if(!m)fail(`missing ${name} in ${tag.slice(0,120)}`);return m[1]};
const numeric=(tag,name)=>Number(attr(tag,name));
const tagById=(source,id)=>{const m=source.match(new RegExp(`<[^>]+id="${id}"[^>]*>`));if(!m)fail(`missing element #${id}`);return m[0]};
const requireAll=(source,items,label)=>{for(const item of items)if(!source.includes(item))fail(`${label}: missing ${item}`)};
const pngSize=(file)=>{const b=fs.readFileSync(file);if(b.toString("hex",0,8)!=="89504e470d0a1a0a")fail(`invalid PNG ${file}`);return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)}};
const resolvedFile=(value)=>path.resolve(here,value);
const ids=(matches)=>matches.map((entry)=>entry.id).sort();
const sameJson=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

if(overlay.version!=="1.3"||overlay.replacement_count!==39||overlay.assets.length!==39)fail("expected 39 v1.3 overlay assets");
if(resolved.version!=="1.3"||resolved.count!==49||resolved.assets.length!==49||resolved.replaced!==39||resolved.reused!==10)fail("expected resolved 49 = 39 replaced + 10 reused");
if(models.charts.length!==15)fail("expected 15 shared chart models");
if(resolved.review_contract.independent_visual_review!=="pending-root-coordinator"||resolved.review_contract.downstream_route_authorized!==false)fail("independent review/downstream gate incorrect");

for(const asset of resolved.assets){
  const svgPath=resolvedFile(asset.svg_path),pngPath=resolvedFile(asset.png_path);
  if(!fs.existsSync(svgPath)||!fs.existsSync(pngPath))fail(`missing resolved pair ${asset.name}`);
  if(sha256(svgPath)!==asset.svg_sha256||sha256(pngPath)!==asset.png_sha256)fail(`resolved SHA mismatch ${asset.name}`);
  const size=pngSize(pngPath);if(size.width!==asset.outer_pixels.width||size.height!==asset.outer_pixels.height)fail(`resolved dimensions mismatch ${asset.name}`);
}

// All chart marks and all equivalent-table rows must be generated from one record model.
const chartEvidence={};
for(const model of models.charts){
  const file=path.join(here,"assets",`${model.id}.svg`),source=read(file);
  const parse=(kind)=>[...source.matchAll(new RegExp(`<g data-${kind}-record="([^"]+)" data-payload="([^"]+)">`,"g"))].map((m)=>({id:m[1],record:JSON.parse(Buffer.from(m[2],"base64url").toString("utf8"))}));
  const visual=parse("visual"),table=parse("table"),expected=model.records.map((record)=>({id:record.id,record}));
  if(!sameJson(ids(visual),ids(expected))||!sameJson(ids(table),ids(expected)))fail(`${model.id}: record ID sets are not bidirectionally equal`);
  for(const entry of expected){
    const v=visual.find((item)=>item.id===entry.id),t=table.find((item)=>item.id===entry.id);
    if(!sameJson(v.record,entry.record)||!sameJson(t.record,entry.record)||!sameJson(v.record,t.record))fail(`${model.id}/${entry.id}: payload mismatch`);
  }
  if(!source.includes(`data-record-count="${expected.length}"`))fail(`${model.id}: record count metadata mismatch`);
  if(!source.includes("data-complete-truth-strip=\"true\""))fail(`${model.id}: nearby truth strip missing`);
  if(model.surface==="public")requireAll(source,["当前来源 0","connector 0","招聘实例 0"],model.id);
  if(model.surface==="private")requireAll(source,["演示数据 · 用户提供"],model.id);
  if(model.surface==="mixed")requireAll(source,["获批历史研究快照","演示数据·用户提供","规则：系统配置"],model.id);
  chartEvidence[model.id]={records:expected.length,visual_records:visual.length,table_records:table.length,bidirectional_equal:true};
}

const relation=models.charts.find((chart)=>chart.id==="25-10-relation-matrix");
const expectedRelations=["新增证据","相互印证","重复","冲突","证据不足","不适用"].sort();
if(relation.records.length!==6||!sameJson(relation.records.map((r)=>r.relation).sort(),expectedRelations)||relation.records.filter((r)=>r.selected).length!==1)fail("relationship matrix must contain exactly six mutually exclusive relations with one selected");

const sourceBand=models.charts.find((chart)=>chart.id==="25-08-source-band");
if(sourceBand.records.some((r)=>r.state==="success"||r.last_success!==null))fail("source0/unconfigured band cannot contain success records");
const sourceBandSvg=read(path.join(here,"assets","25-08-source-band.svg"));
if(sourceBandSvg.includes("#067647")||sourceBandSvg.includes("#E7F5EE"))fail("source band contains forbidden success green");

const gap=models.charts.find((chart)=>chart.id==="25-12-gap-matrix");
if(gap.records.some((r)=>r.state!=="unknown"||r.selected!==false))fail("unknown gap matrix cannot contain selected/known records");
const gapSvg=read(path.join(here,"assets","25-12-gap-matrix.svg"));
if(gapSvg.includes("#067647")||gapSvg.includes("#E7F5EE"))fail("unknown gap matrix contains success green");

const version=models.charts.find((chart)=>chart.id==="25-14-version-timeline");
const identityByTrack={"公共快照":new Set(),"个人记录":new Set(),"规则版本":new Set()};
version.records.forEach((r)=>identityByTrack[r.track].add(r.source_identity));
if(!identityByTrack["公共快照"].has("获批历史研究快照")||!identityByTrack["个人记录"].has("演示数据 · 用户提供")||!identityByTrack["规则版本"].has("规则版本 · 系统配置"))fail("version timeline source identities are conflated");

// Every 390/320 helper line must end before the actual CTA rect starts.
const mobileAssets=overlay.assets.filter((asset)=>asset.category==="mobile");
if(mobileAssets.length!==14)fail("expected 14 redrawn mobile assets");
for(const asset of mobileAssets){
  const source=read(path.join(here,asset.svg_path));
  if(/transform="[^"]*scale\(/.test(source))fail(`${asset.name}: overall scale is forbidden`);
  const root=source.match(/^<svg[^>]+>/)?.[0]||fail(`${asset.name}: missing root`);
  const width=numeric(root,"width");if(![320,390].includes(width)||numeric(root,"height")!==844||numeric(root,"data-logical-width")!==width)fail(`${asset.name}: independent viewport mismatch`);
  const helper=tagById(source,"bottom-helper"),cta=tagById(source,"bottom-cta");
  const helperBottom=numeric(helper,"y")+numeric(helper,"data-line-height"),buttonTop=numeric(cta,"y");
  if(!(helperBottom<buttonTop))fail(`${asset.name}: helper bottom ${helperBottom} must be before CTA top ${buttonTop}`);
  if(numeric(helper,"font-size")<14||numeric(cta,"height")<44)fail(`${asset.name}: typography/touch minimum failed`);
  const fonts=[...source.matchAll(/font-size="(\d+)"/g)].map((m)=>Number(m[1]));if(fonts.some((value)=>value<14)||!fonts.includes(16))fail(`${asset.name}: mobile font floor failed`);
  if(asset.surface==="public")requireAll(source,["研究清单已批准","来源 0 · connector 0","招聘实例 0"],asset.name);
  if(asset.surface==="private")requireAll(source,["演示数据 · 用户提供"],asset.name);
}

// Focus ring is separate; actual cancel and confirm rectangles both meet 44px.
const components=read(path.join(here,"assets","24-components-states.svg"));
const dialog=tagById(components,"confirmation-dialog");
for(const id of ["cancel","confirm"]){const tag=tagById(components,id);if(!tag.startsWith("<rect")||numeric(tag,"height")<44)fail(`${id}: actual button rect below 44px`);if(numeric(tag,"x")<numeric(dialog,"x")||numeric(tag,"x")+numeric(tag,"width")>numeric(dialog,"x")+numeric(dialog,"width")||numeric(tag,"y")<numeric(dialog,"y")||numeric(tag,"y")+numeric(tag,"height")>numeric(dialog,"y")+numeric(dialog,"height"))fail(`${id}: actual button rect leaves dialog bounds`)}
requireAll(components,["data-focus-ring-for=\"cancel\"","data-button-id=\"cancel\"","data-button-id=\"confirm\""],"component board");

// Browser 200% uses actual SVG numbers calculated from the same base token.
const zoom=read(path.join(here,"assets","28-accessibility-zoom-200.svg"));
const pair=(baseId,zoomId,attribute)=>{const a=numeric(tagById(zoom,baseId),attribute),b=numeric(tagById(zoom,zoomId),attribute);if(b!==a*2)fail(`${baseId}/${zoomId} ${attribute}: expected ${a*2}, got ${b}`);return [a,b]};
pair("zoom-base-title","zoom-200-title","font-size");
pair("zoom-base-body","zoom-200-body","font-size");
pair("zoom-base-helper","zoom-200-helper","font-size");
pair("zoom-base-button","zoom-200-button","height");
pair("zoom-base-card","zoom-200-card","rx");
pair("zoom-base-card","zoom-200-card","stroke-width");
const baseCard=tagById(zoom,"zoom-base-card"),baseInner=tagById(zoom,"zoom-base-inner"),zoomCard=tagById(zoom,"zoom-200-card"),zoomInner=tagById(zoom,"zoom-200-inner");
const basePadding=numeric(baseInner,"x")-numeric(baseCard,"x"),zoomPadding=numeric(zoomInner,"x")-numeric(zoomCard,"x");if(zoomPadding!==basePadding*2)fail("card padding is not 2x");
const baseGap=numeric(tagById(zoom,"zoom-base-gap-b"),"x")-(numeric(tagById(zoom,"zoom-base-gap-a"),"x")+numeric(tagById(zoom,"zoom-base-gap-a"),"width"));
const zoomGap=numeric(tagById(zoom,"zoom-200-gap-b"),"x")-(numeric(tagById(zoom,"zoom-200-gap-a"),"x")+numeric(tagById(zoom,"zoom-200-gap-a"),"width"));if(zoomGap!==baseGap*2)fail("spacing token is not 2x");
if(numeric(zoomCard,"data-effective-css-viewport-width")!==numeric(zoomCard,"data-base-css-viewport-width")/2||numeric(zoomCard,"data-physical-width")!==numeric(zoomCard,"data-base-css-viewport-width")||numeric(zoomCard,"data-physical-scale")!==2)fail("browser 200% viewport semantics invalid");
requireAll(zoom,["data-horizontal-scroll=\"false\"","data-overlap=\"false\""],"zoom board");

const page10=read(path.join(here,"assets","10-desktop-page-10-quality-recovery-1440.svg"));
requireAll(page10,["data-current-service-state=\"not_ready\"","data-current-account-state=\"unavailable\"","data-current-failed=\"false\"","data-failed-requires-real-request=\"true\"","只有真实请求已经执行并返回失败时使用"],"page10");
const states=read(path.join(here,"assets","16-truth-02-eleven-states.svg"));requireAll(states,["live状态示例","目标态未接通"],"state board");
const flow=read(path.join(here,"assets","11-flow-01-workbench-six-step.svg"));
if((flow.match(/data-flow-step="/g)||[]).length!==6||flow.includes("1→6")||flow.includes("1 → 6"))fail("workbench flow has duplicate six-step labels");

const responsive=read(path.join(here,"assets","27-responsive-1024.svg"));
for(const m of responsive.matchAll(/<metadata data-note-line="(\d+)" data-x="(\d+)" data-estimated-width="(\d+)" data-box-right="(\d+)"\/>/g)){if(Number(m[2])+Number(m[3])>Number(m[4]))fail(`1024 note line ${m[1]} overflows canvas`)}
if((responsive.match(/data-note-line=/g)||[]).length!==4)fail("1024 wrapped note evidence missing");
const visibleNoteLines=[...responsive.matchAll(/<text[^>]*data-note-lines="true"[^>]*>([^<]*)<\/text>/g)];if(visibleNoteLines.length!==4)fail("1024 note must render as four independent text nodes");
for(const match of visibleNoteLines){const tag=match[0].slice(0,match[0].indexOf(">")+1),estimated=[...match[1]].length*numeric(tag,"font-size");if(numeric(tag,"x")+estimated>1208)fail(`1024 visible line overflows: ${match[1]}`)}

for(const name of ["02-desktop-page-02-tech-landscape-1440.svg","04-desktop-page-04-sources-quality-1440.svg","06-desktop-page-06-personal-evidence-1440.svg","08-desktop-page-08-future-history-1440.svg"]){const source=read(path.join(here,"assets",name));if(!source.includes("data-complete-truth-strip=\"true\""))fail(`${name}: complete truth strip missing`);requireAll(source,truthForSurface(name),name)}
function truthForSurface(name){if(name.startsWith("06-"))return["演示数据 · 用户提供","非真实用户档案"];if(name.startsWith("08-"))return["获批历史研究快照","演示数据·用户提供","规则：系统配置"];return["当前来源 0","connector 0","招聘实例 0"]}

const immutable={
  approved_prompt:[path.join(projectRoot,"ui/04-release-completeness-ui-prompt.md"),"983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900"],
  v1_design:[path.join(projectRoot,"ui/05-release-completeness-ui-design.md"),"ffc0251ac0c2bfc077e47a9b3352f1d6ccd30f584e6e352e160f07557afcfe3e"],
  v1_1_design:[path.join(projectRoot,"ui/06-release-completeness-ui-design-v1.1.md"),"f8377d001684a40d26513d4c02ccb1fa3fe1aea325300ee7357537c218b79aae"],
  v1_2_design:[path.join(projectRoot,"ui/07-release-completeness-ui-design-v1.2.md"),"768050aba1b7a959510b8f252a8d8628e25cc3b8f3be53bd04efb122630307cc"],
  v1_2_manifest:[path.join(previousRoot,"assets/manifest.json"),"05dddcef7a9e68e60a11f162928a77f25db8b5c37e32adc04b3d6a2906b05ccf"]
};
const immutableChecks={};for(const [id,[file,expected]]of Object.entries(immutable)){if(sha256(file)!==expected)fail(`immutable SHA changed: ${id}`);immutableChecks[id]="matched"}

const categoryCounts={};resolved.assets.forEach((asset)=>categoryCounts[asset.category]=(categoryCounts[asset.category]||0)+1);
const expectedCounts={desktop:10,flow:4,truth:2,mobile:14,chart:15,standard:2,responsive:2};for(const [key,value] of Object.entries(expectedCounts))if(categoryCounts[key]!==value)fail(`category ${key}: expected ${value}, got ${categoryCounts[key]||0}`);

const result={
  schema_version:1,version:"1.3",generated_at:"2026-08-15T23:55:00+08:00",
  machine_validation:{status:"machine_passed",scope:["resolved-asset-sha-and-dimensions","shared-chart-model-bidirectional-equality","truth-state-conflict-guards","mobile-helper-cta-bounds","actual-touch-rects","browser-200-percent-numeric-tokens","page-state-semantics","responsive-text-bounds","immutable-history"]},
  independent_visual_review:{status:"pending",owner:"AIWorkFlow-root-coordinator",round:4,note:"机器验证不能替代独立视觉审查。"},
  downstream_route_authorized:false,
  bundle:{resolved_assets:49,replaced_by_v1_3:39,reused_immutable_v1_2:10,category_counts:categoryCounts},
  chart_equivalence:{model:"chart-models.json",models:15,relation_options:6,checks:chartEvidence},
  truth_boundary:models.truth_boundary,
  mobile:{assets:14,helper_cta_non_overlap:"14-of-14",minimum_touch_rect:"14-of-14",viewports:[390,320]},
  zoom_200:{base_css_viewport:720,effective_css_viewport:360,physical_scale:2,actual_tokens_exactly_2x:["title","body","helper","control","padding","radius","border","gap"]},
  immutable_checks:immutableChecks
};
const serialized=JSON.stringify(result,null,2)+"\n";
if(serialized.includes("visual_inspection_passed")||serialized.includes("manual_visual_inspection")||serialized.includes("independent_visual_review_passed"))fail("forbidden independent-review overclaim");
fs.writeFileSync(path.join(here,"review-manifest.json"),serialized,"utf8");
console.log(JSON.stringify({status:"machine_passed",resolved_assets:49,replaced:39,reused:10,charts:"15-bidirectional-equal",mobile:"14-no-helper-cta-overlap",zoom:"actual-token-values-2x",independent_visual_review:"pending-round-4"},null,2));
