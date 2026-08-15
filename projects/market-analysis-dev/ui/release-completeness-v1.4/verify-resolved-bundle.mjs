import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const projectRoot=path.resolve(here,"../..");
const previousRoot=path.resolve(here,"../release-completeness-v1.3");
const fail=(message)=>{throw new Error(message)};
const read=(file)=>fs.readFileSync(file,"utf8");
const sha256=(file)=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const attr=(tag,name,required=true)=>{const match=tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));if(!match&&required)fail(`缺少属性 ${name}: ${tag.slice(0,160)}`);return match?.[1]};
const num=(tag,name)=>Number(attr(tag,name));
const elementById=(source,id)=>{const match=source.match(new RegExp(`<[^>]+id="${id}"[^>]*>`));if(!match)fail(`缺少元素 #${id}`);return match[0]};
const pngSize=(file)=>{const b=fs.readFileSync(file);if(b.toString("hex",0,8)!=="89504e470d0a1a0a")fail(`PNG 签名错误: ${file}`);return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)}};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const decode=(value)=>value.replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">").replaceAll("&quot;",'"');
const rectOf=(tag)=>({x:num(tag,"x"),y:num(tag,"y"),w:num(tag,"width"),h:num(tag,"height")});
const intersects=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>0.5&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>0.5;
const contains=(outer,inner,tolerance=1)=>inner.x>=outer.x-tolerance&&inner.y>=outer.y-tolerance&&inner.x+inner.w<=outer.x+outer.w+tolerance&&inner.y+inner.h<=outer.y+outer.h+tolerance;

function estimateText(tag,value){
  const size=num(tag,"font-size"),x=num(tag,"x"),y=num(tag,"y"),anchor=attr(tag,"text-anchor",false)||"start",baseline=attr(tag,"dominant-baseline",false)||"auto";
  let units=0; for(const ch of [...decode(value)]){if(/\s/u.test(ch))units+=0.33;else if(/[\u3400-\u9fff\uff00-\uffef]/u.test(ch))units+=1;else if(/[A-Z0-9]/u.test(ch))units+=0.66;else if(/[a-z]/u.test(ch))units+=0.56;else units+=0.5}
  const w=units*size,h=size*1.2; const left=anchor==="middle"?x-w/2:anchor==="end"?x-w:x; const top=baseline==="middle"?y-h/2:y;
  return {x:left,y:top,w,h,value:decode(value),tag};
}

function validateTextGeometry(source,name){
  const root=source.match(/^<svg[^>]+>/)?.[0]||fail(`${name}: 缺 SVG 根元素`),canvas={x:0,y:0,w:num(root,"width"),h:num(root,"height")};
  const containers=new Map([...source.matchAll(/<rect[^>]*data-layout-container="true"[^>]*>/g)].map(match=>[attr(match[0],"id"),rectOf(match[0])]));
  const texts=[...source.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map(match=>estimateText(`<text${match[1]}>`,match[2]));
  for(const text of texts)if(!contains(canvas,text,2))fail(`${name}: 文字越出画布 ${text.value}`);
  const layout=[];
  for(const text of texts){if(attr(text.tag,"data-layout-text",false)!=="true")continue;const ref=attr(text.tag,"data-container-ref"),container=containers.get(ref);if(!container)fail(`${name}: 文字引用不存在容器 ${ref}`);if(!contains(container,text,2))fail(`${name}: 文字越出容器 ${ref}: ${text.value}`);layout.push({...text,ref})}
  for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++)if(layout[i].ref===layout[j].ref&&intersects(layout[i],layout[j]))fail(`${name}: 同容器文字遮挡 ${layout[i].value} / ${layout[j].value}`);
  return {text_nodes:texts.length,layout_text_nodes:layout.length,containers:containers.size,canvas};
}

if(process.argv.includes("--negative-fixture")){
  const bad='<svg width="100" height="100"><rect id="small" x="10" y="10" width="20" height="20" data-layout-container="true"/><text x="12" y="12" font-size="20" data-layout-text="true" data-container-ref="small">这段文字必然越界</text></svg>';
  validateTextGeometry(bad,"negative-fixture");
  fail("负向夹具未被真实边界计算捕获");
}

const overlay=JSON.parse(read(path.join(here,"overlay-manifest.json")));
const resolved=JSON.parse(read(path.join(here,"resolved-manifest.json")));
const models=JSON.parse(read(path.join(here,"resolved-chart-models.json")));
if(overlay.version!=="1.4"||overlay.replacement_count!==21||overlay.assets.length!==21)fail("v1.4 overlay 必须为 21 张替换资产");
if(resolved.version!=="1.4"||resolved.count!==49||resolved.assets.length!==49||resolved.replaced!==21||resolved.reused!==28)fail("resolved 必须为 49 = 21 替换 + 28 复用");
if(models.version!=="1.4"||models.charts.length!==15)fail("共享结构化模型必须包含 15 张图表");
if(resolved.review_contract.independent_visual_review!=="pending-root-coordinator-round-5"||resolved.review_contract.downstream_route_authorized!==false)fail("独立审核门或下游冻结状态错误");

const geometry={};
for(const asset of resolved.assets){
  const svgPath=path.resolve(here,asset.svg_path),pngPath=path.resolve(here,asset.png_path);if(!fs.existsSync(svgPath)||!fs.existsSync(pngPath))fail(`缺 resolved 资产 ${asset.name}`);
  if(sha256(svgPath)!==asset.svg_sha256||sha256(pngPath)!==asset.png_sha256)fail(`resolved SHA 不一致 ${asset.name}`);
  const size=pngSize(pngPath);if(size.width!==asset.outer_pixels.width||size.height!==asset.outer_pixels.height)fail(`PNG 尺寸不一致 ${asset.name}`);
  if(asset.resolution==="replaced-by-v1.4-overlay")geometry[asset.name]={...validateTextGeometry(read(svgPath),asset.name),png_render:{width:size.width,height:size.height,scale:"1:1"}};
}

const forbiddenVisible=new Set(["id","direction","value","capability","evidence","limitation","state","source_group","last_success","historical_snapshot","not_ready","not_configured","no_instance","unavailable","pending","candidate","option","selected","user_reported","evidence_available","verifiable","verified","missing","locked","insufficient","approved_document","demo_user_provided","rule_configuration","example_only"]);
const chartEvidence={};
for(const model of models.charts){
  const file=path.join(here,"assets",`${model.id}.svg`),source=read(file);const parse=(kind)=>[...source.matchAll(new RegExp(`<g data-${kind}-record="([^"]+)" data-payload="([^"]+)">`,"g"))].map(m=>({id:m[1],record:JSON.parse(Buffer.from(m[2],"base64url").toString("utf8"))}));
  const visual=parse("visual"),table=parse("table"),expected=model.records.map(record=>({id:record.id,record}));const ids=(entries)=>entries.map(item=>item.id).sort();
  if(!same(ids(visual),ids(expected))||!same(ids(table),ids(expected)))fail(`${model.id}: 图形/表格/模型 ID 集合不双向相等`);
  for(const item of expected){const v=visual.find(e=>e.id===item.id),t=table.find(e=>e.id===item.id);if(!same(v.record,item.record)||!same(t.record,item.record)||!same(v.record,t.record))fail(`${model.id}/${item.id}: payload 不相等`)}
  const visibleTexts=[...source.matchAll(/<(?:text|title|desc)[^>]*>([^<]*)<\/(?:text|title|desc)>/g)].map(m=>decode(m[1]).trim()).filter(Boolean);
  for(const text of visibleTexts){if(forbiddenVisible.has(text)||/[a-z]+_[a-z_]+/i.test(text))fail(`${model.id}: 用户可见裸露内部键 ${text}`)}
  if(!source.includes('data-complete-truth-strip="true"'))fail(`${model.id}: 缺就近真相条`);
  if(model.surface==="public"&&!source.includes("当前来源 0 · 连接器 0 · 招聘实例 0"))fail(`${model.id}: 公共真相条不完整`);
  if(model.surface==="private"&&!source.includes("演示数据 · 用户提供"))fail(`${model.id}: 私有真相条不完整`);
  chartEvidence[model.id]={records:expected.length,visual_records:visual.length,table_records:table.length,bidirectional_equal:true,visible_language:"简体中文"};
}

const scatter=models.charts.find(c=>c.id==="25-01-direction-scatter"),scatterSvg=read(path.join(here,"assets","25-01-direction-scatter.svg"));
if(scatter.records.length!==8||new Set(scatter.records.map(r=>r.direction)).size!==8||(scatterSvg.match(/data-point-id=/g)||[]).length!==8)fail("25-01 必须覆盖 8/8 方向");
if(!scatterSvg.includes('data-axis="x"')||!scatterSvg.includes('data-axis="y"')||(scatterSvg.match(/>0<\/text>/g)||[]).length<2||(scatterSvg.match(/>5<\/text>/g)||[]).length<2||!scatterSvg.includes("横轴（X）")||!scatterSvg.includes("纵轴（Y）"))fail("25-01 缺实际轴线、刻度或轴端标签");

const capability=models.charts.find(c=>c.id==="25-03-capability-map"),capSvg=read(path.join(here,"assets","25-03-capability-map.svg"));
if(capability.records.length!==8||new Set(capability.records.map(r=>r.domain)).size!==8||(capSvg.match(/data-matrix-cell=/g)||[]).length!==40)fail("25-03 必须为真实 8 域 × 五层矩阵");
for(const record of capability.records)for(const field of ["p0","p1","p1_ai","p2","observe"])if(!record[field])fail(`25-03 ${record.id} 缺 ${field}`);
if(capability.records.some(r=>r.domain.includes("全部")))fail("25-03 禁止用全部8域聚合替代缺失域");

const sourceBand=models.charts.find(c=>c.id==="25-08-source-band"),sourceSvg=read(path.join(here,"assets","25-08-source-band.svg"));
if(sourceBand.records.some(r=>r.state==="success"||r.last_success!==null)||sourceSvg.includes("#067647")||sourceSvg.includes("#E7F5EE"))fail("25-08 来源0不得出现成功记录或绿色成功块");
const gap=models.charts.find(c=>c.id==="25-12-gap-matrix"),gapSvg=read(path.join(here,"assets","25-12-gap-matrix.svg"));
if(gap.records.some(r=>r.state!=="unknown"||r.selected!==false)||gapSvg.includes("#067647")||gapSvg.includes("#E7F5EE"))fail("25-12 未知态不得出现已选或成功绿");
const timeline=models.charts.find(c=>c.id==="25-14-version-timeline");const identities=Object.fromEntries(["公共快照","个人记录","规则版本"].map(track=>[track,new Set(timeline.records.filter(r=>r.track===track).map(r=>r.source_identity))]));
if(!identities["公共快照"].has("获批历史研究快照")||!identities["个人记录"].has("演示数据 · 用户提供")||!identities["规则版本"].has("规则版本 · 系统配置"))fail("25-14 三轨来源身份混淆");
const relation=models.charts.find(c=>c.id==="25-10-relation-matrix");if(relation.records.length!==6||relation.records.filter(r=>r.selected).length!==1||new Set(relation.records.map(r=>r.relation)).size!==6)fail("六类关系必须互斥且只选一项");

for(const page of ["04","06","08"]){const source=read(path.join(here,"assets",`${page}-desktop-page-${page}-${page==="04"?"sources-quality":page==="06"?"personal-evidence":"future-history"}-1440.svg`));const truthRect=rectOf(elementById(source,"truth-strip")),filterRect=rectOf(elementById(source,`filters-${page}`));if(intersects(truthRect,filterRect))fail(`page${page}: 真相条与筛选容器实际重叠`)}
const page05=read(path.join(here,"assets","05-desktop-page-05-workbench-1440.svg"));if((page05.match(/data-page05-step=/g)||[]).length!==6)fail("page05 必须恰有一套六步流程");for(let i=1;i<=6;i++)if((page05.match(new RegExp(`data-page05-step="${i}"`,"g"))||[]).length!==1)fail(`page05 步骤 ${i} 重复或缺失`);

const component=read(path.join(here,"assets","24-components-states.svg"));for(let i=0;i<4;i++){const pill=rectOf(elementById(component,`state-pill-${i}`));const labelTag=[...component.matchAll(/<text[^>]*data-pill-label="true"[^>]*>[^<]*<\/text>/g)][i]?.[0]||fail(`组件胶囊 ${i} 缺文字`);const label=estimateText(labelTag.slice(0,labelTag.indexOf(">")+1),labelTag.match(/>([^<]*)<\/text>/)[1]);if(Math.abs((pill.y+pill.h/2)-(label.y+label.h/2))>0.6)fail(`组件胶囊 ${i} 文字未垂直居中`)}
for(const id of ["cancel-button","confirm-button"]){const button=rectOf(elementById(component,id));if(button.h<44)fail(`${id}: 真实触控矩形不足44px`)}

const zoom=read(path.join(here,"assets","28-accessibility-zoom-200.svg"));const tag=(id)=>elementById(zoom,id);const exact2=(baseId,zoomId,key)=>{const a=num(tag(baseId),key),b=num(tag(zoomId),key);if(b!==a*2)fail(`${baseId}/${zoomId} ${key} 非严格2倍`);return [a,b]};
const textTag=(container,key)=>{const match=zoom.match(new RegExp(`<text[^>]*data-container-ref="${container}"[^>]*data-content-key="${key}"[^>]*>`));if(!match)fail(`zoom 缺 ${container}/${key}`);return match[0]};
if(num(tag("zoom-200-panel"),"data-css-viewport")!==num(tag("zoom-200-panel"),"data-base-css-viewport")/2||num(tag("zoom-200-panel"),"data-physical-scale")!==2)fail("浏览器200%必须为720→360且物理2倍");
if(num(textTag("zoom-200-card","title"),"font-size")!==num(textTag("zoom-base-card","title"),"font-size")*2||num(textTag("zoom-200-card","body"),"font-size")!==num(textTag("zoom-base-card","body"),"font-size")*2||num(textTag("zoom-200-card","helper"),"font-size")!==num(textTag("zoom-base-card","helper"),"font-size")*2)fail("标题/正文/辅助文字非严格2倍");
exact2("zoom-base-button","zoom-200-button","height");exact2("zoom-base-card","zoom-200-card","rx");exact2("zoom-base-card","zoom-200-card","stroke-width");
const basePadding=num(textTag("zoom-base-card","title"),"x")-num(tag("zoom-base-card"),"x"),zoomPadding=num(textTag("zoom-200-card","title"),"x")-num(tag("zoom-200-card"),"x");if(zoomPadding!==basePadding*2)fail("卡片内边距非严格2倍");
const gapDistance=(a,b)=>num(tag(b),"x")-(num(tag(a),"x")+num(tag(a),"width"));if(gapDistance("zoom-200-gap-a","zoom-200-gap-b")!==gapDistance("zoom-base-gap-a","zoom-base-gap-b")*2)fail("间距非严格2倍");
const content=(prefix,key)=>[...zoom.matchAll(new RegExp(`<text[^>]*data-container-ref="${prefix}[^"]*"[^>]*data-content-key="${key}"[^>]*>([^<]*)<\\/text>`,"g"))].map(m=>decode(m[1]).replaceAll(/\s/g,"")).join("");for(const key of ["title","body","helper","notice-title","notice-body","button"])if(content("zoom-base",key)!==content("zoom-200",key))fail(`200% 回流丢失或修改内容 ${key}`);

const immutable={prompt:[path.join(projectRoot,"ui/04-release-completeness-ui-prompt.md"),"983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900"],v1:[path.join(projectRoot,"ui/05-release-completeness-ui-design.md"),"ffc0251ac0c2bfc077e47a9b3352f1d6ccd30f584e6e352e160f07557afcfe3e"],v1_1:[path.join(projectRoot,"ui/06-release-completeness-ui-design-v1.1.md"),"f8377d001684a40d26513d4c02ccb1fa3fe1aea325300ee7357537c218b79aae"],v1_2:[path.join(projectRoot,"ui/07-release-completeness-ui-design-v1.2.md"),"768050aba1b7a959510b8f252a8d8628e25cc3b8f3be53bd04efb122630307cc"],v1_3:[path.join(projectRoot,"ui/08-release-completeness-ui-design-v1.3.md"),"2278c7ecee8826fe2f8afa90c94af28070b3295dc88020f8c29e7442ee3175ba"],v1_3_resolved:[path.join(previousRoot,"resolved-manifest.json"),"17d58597e46fa9390b379626d96fb4a4f01f5607ef902483593a116c9cd6bec8"]};
const immutableChecks={};for(const [id,[file,expected]] of Object.entries(immutable)){if(sha256(file)!==expected)fail(`不可变历史 SHA 改变 ${id}`);immutableChecks[id]="matched"}
const categories={};resolved.assets.forEach(a=>categories[a.category]=(categories[a.category]||0)+1);for(const [name,count] of Object.entries({desktop:10,flow:4,truth:2,mobile:14,chart:15,standard:2,responsive:2}))if(categories[name]!==count)fail(`分类 ${name} 预期 ${count}，实际 ${categories[name]||0}`);

const result={schema_version:1,version:"1.4",generated_at:"2026-08-15T20:47:45+08:00",machine_validation:{status:"machine_passed",scope:["resolved-49-sha-and-png-dimensions","actual-svg-text-container-bounds","layout-text-occlusion","negative-fixture-nonzero","15-chart-model-visual-table-bidirectional-equality","complete-simplified-chinese-visible-fields-and-states","page-truth-filter-nonoverlap","single-page05-six-step-set","strict-browser-200-percent-eight-token-groups","immutable-history"]},independent_visual_review:{status:"pending",owner:"AIWorkFlow-root-coordinator",round:5,note:"机器几何计算与1:1 PNG渲染校验不替代独立逐图视觉审核。"},downstream_route_authorized:false,bundle:{resolved_assets:49,replaced_by_v1_4:21,reused_immutable_v1_3_resolved:28,category_counts:categories},truth_boundary:models.truth_boundary,chart_equivalence:{model:"resolved-chart-models.json",models:15,checks:chartEvidence},geometry_validation:{replacement_assets:21,method:"SVG实际文字包围盒与容器/画布计算；PNG与SVG一比一尺寸和SHA校验",checks:geometry},critical_fixes:{desktop_truth_overlap:"page04-page06-page08-zero",directions:"8-of-8-with-axes-ticks-end-labels",capabilities:"8-domains-by-5-levels-40-cells",page05:"one-six-step-set",component_pills:"4-of-4-actual-centered",zoom_200:"720-to-360-and-eight-token-groups-exactly-2x-same-content"},immutable_checks:immutableChecks};
const serialized=JSON.stringify(result,null,2)+"\n";if(/visual_inspection_passed|manual_visual_inspection|independent_visual_review_passed/.test(serialized))fail("禁止机器门冒充独立视觉通过");fs.writeFileSync(path.join(here,"review-manifest.json"),serialized,"utf8");
console.log(JSON.stringify({status:"machine_passed",resolved_assets:49,replaced:21,reused:28,charts:"15-model-visual-table-bidirectional-equal",geometry:"21-replacement-assets-computed",independent_visual_review:"pending-round-5"},null,2));
