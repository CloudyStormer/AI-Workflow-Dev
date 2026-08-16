import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const projectRequire=createRequire(new URL('../../package.json',import.meta.url));
const runtimeRequire=createRequire(join(dirname(dirname(process.execPath)),'package.json'));
const resolveTool=(name)=>{for(const resolver of [projectRequire,runtimeRequire]){try{return resolver(name);}catch{}}throw new Error(`无法解析验证工具 ${name}`);};
const sharp=resolveTool('sharp');

const root=dirname(fileURLToPath(import.meta.url));
const manifestPath=join(root,'manifest.json');
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const sha=(path)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const visibleSemanticFontSizes=(svg)=>[...svg.matchAll(/<text\b[^>]*font-size="([0-9.]+)"[^>]*>/g)].map((match)=>Number(match[1]));
const visibleSemanticTextMeetsFloor=(svg,floor=12)=>{const sizes=visibleSemanticFontSizes(svg);return sizes.length>0&&sizes.every((size)=>Number.isFinite(size)&&size>=floor);};
const svgAttributes=(source)=>Object.fromEntries([...source.matchAll(/([:\w-]+)="([^"]*)"/g)].map((match)=>[match[1],match[2]]));
const estimatedSvgTextWidth=(value,size)=>[...value].reduce((sum,char)=>sum+(char===' '?size*.34:/[\u3400-\u9fff／]/u.test(char)?size:size*.62),0);
const releaseGateLegendGeometry=(svg)=>[...svg.matchAll(/<g\b([^>]*data-gate-legend="true"[^>]*)>([\s\S]*?)<\/g>/g)].map((match)=>{
  const group=svgAttributes(match[1]);
  const items=[...match[2].matchAll(/<text\b([^>]*)>([^<]+)<\/text>/g)].map((itemMatch)=>{const attributes=svgAttributes(itemMatch[1]),size=Number(attributes['font-size']),x=Number(attributes.x),y=Number(attributes.y);return {label:itemMatch[2],state:attributes['data-gate-legend-item'],row:Number(attributes['data-gate-legend-row']),column:Number(attributes['data-gate-legend-column']),size,x,y,left:x,right:x+estimatedSvgTextWidth(itemMatch[2],size),top:y-size/2,bottom:y+size/2};});
  return {x:Number(group['data-gate-legend-x']),y:Number(group['data-gate-legend-y']),width:Number(group['data-gate-legend-width']),height:Number(group['data-gate-legend-height']),layout:group['data-gate-legend-layout'],context:group['data-gate-legend-context'],items};
});
const validReleaseGateLegend=(legend)=>{if(!legend||legend.layout!=='2x3'||legend.items.length!==6)return false;const expected=['通过','阻塞','待证据','未执行','冻结／未授权','非发布'];if(JSON.stringify(legend.items.map((item)=>item.state).sort())!==JSON.stringify(expected.sort()))return false;if(new Set(legend.items.map((item)=>item.row)).size!==3||new Set(legend.items.map((item)=>item.column)).size!==2)return false;const right=legend.x+legend.width,bottom=legend.y+legend.height;if(!legend.items.every((item)=>item.size>=12&&item.left>=legend.x&&item.right<=right&&item.top>=legend.y&&item.bottom<=bottom))return false;return legend.items.every((item,index)=>legend.items.slice(index+1).every((other)=>item.right<=other.left||other.right<=item.left||item.bottom<=other.top||other.bottom<=item.top));};

assert(!visibleSemanticTextMeetsFloor('<svg><text font-size="11">应被拒绝的业务文字</text></svg>',12),'negative fixture rejects 11px visible semantic text');
const oldSingleLineLegend='<svg><g data-gate-legend="true" data-gate-legend-layout="single-row" data-gate-legend-x="0" data-gate-legend-y="0" data-gate-legend-width="222" data-gate-legend-height="20" data-gate-legend-context="compact"><text x="0" y="10" font-size="12" data-gate-legend-item="通过" data-gate-legend-row="0" data-gate-legend-column="0">✓通过</text><text x="52" y="10" font-size="12" data-gate-legend-item="阻塞" data-gate-legend-row="0" data-gate-legend-column="1">×阻塞</text><text x="104" y="10" font-size="12" data-gate-legend-item="待证据" data-gate-legend-row="0" data-gate-legend-column="2">…待证据</text><text x="170" y="10" font-size="12" data-gate-legend-item="未执行" data-gate-legend-row="0" data-gate-legend-column="3">○未执行</text><text x="236" y="10" font-size="12" data-gate-legend-item="冻结／未授权" data-gate-legend-row="0" data-gate-legend-column="4">锁冻结／未授权</text><text x="330" y="10" font-size="12" data-gate-legend-item="非发布" data-gate-legend-row="0" data-gate-legend-column="5">∅非发布</text></g></svg>';
assert(!validReleaseGateLegend(releaseGateLegendGeometry(oldSingleLineLegend)[0]),'negative fixture rejects old single-line six-state gate legend overflow');

assert(manifest.schema_version===1,'manifest schema_version');
assert(manifest.project_id==='workflow-control-center','manifest project_id');
assert(manifest.work_item==='CC-UI-002','manifest work_item');
assert(manifest.generator?.source==='ui/release-completeness-v1.0/generate-assets.mjs','generator source path');
assert(manifest.generator?.sha256===sha(join(root,'generate-assets.mjs')),'manifest generator sha matches current source');
assert(manifest.support_files?.verifier?.sha256===sha(join(root,'verify-assets.mjs')),'manifest verifier sha matches current source');
assert(manifest.support_files?.browser_checker?.sha256===sha(join(root,'verify-prototype-browser.mjs')),'manifest browser checker sha matches current source');
assert(manifest.support_files?.browser_evidence?.sha256===sha(join(root,'browser-evidence.json')),'manifest browser evidence sha matches current evidence');
assert(manifest.support_files?.generation_notes?.sha256===sha(join(root,'generation-prompts.md')),'manifest generation notes sha matches current source');
assert(manifest.support_files?.design_specification?.sha256===sha(join(root,'../03-release-completeness-ui-design-v1.0.md')),'manifest design specification sha matches current source');
assert(manifest.authoritative_prompt?.sha256==='caafe53a51a77283c363483bf34b9dba843f5a1add8d7fd17c9d74a1d336570e','authoritative prompt sha');
assert(manifest.coverage?.primary_navigation?.length===6,'6 primary navigation items');
assert(manifest.coverage?.p0_destinations?.length===12,'12 p0 destinations');
assert(manifest.coverage?.chart_catalog?.length===19,'19 chart types');
assert(manifest.coverage?.chart_catalog?.every((chart)=>chart.authoritative_mapping?.includes('=')),'19 authoritative chart mappings');
assert(manifest.coverage?.chart_catalog?.every((chart)=>chart.unit&&chart.legend),'19 chart unit and legend declarations');
assert(JSON.stringify(manifest.coverage?.chart_traceability_fields)===JSON.stringify(['单位','图例','筛选','来源 ID','来源 SHA256','来源','覆盖','新鲜度','观测时间','root_head']),'chart traceability field contract');
assert(manifest.coverage?.information_architecture?.primary_count===6&&manifest.coverage?.information_architecture?.secondary_destination_count===12,'unified 6 primary and 12 secondary IA contract');
assert(JSON.stringify(manifest.coverage?.information_architecture?.mobile_bottom_navigation)===JSON.stringify(['总览','项目','质量','更多']),'mobile bottom navigation contract');
assert(manifest.deliverable_counts?.desktop_p0_pages===12,'desktop p0 count declared');
assert(manifest.deliverable_counts?.tablet_key_pages===4,'tablet count declared');
assert(manifest.deliverable_counts?.paired_mobile_groups===8,'mobile paired groups declared');
assert(manifest.deliverable_counts?.mobile_assets===16,'mobile assets declared');

const assets=manifest.assets ?? [];
const generatedPngs=readdirSync(root).filter((name)=>name.endsWith('.png')&&!name.startsWith('00-ai-visual-direction'));
const generatedSvgs=readdirSync(root).filter((name)=>name.endsWith('.svg'));
assert(assets.length===36,`manifest asset count ${assets.length}/36`);
assert(generatedPngs.length===36&&generatedPngs.length===assets.length,`generated png count ${generatedPngs.length}/36`);
assert(generatedSvgs.length===36&&generatedSvgs.length===assets.length,`generated svg count ${generatedSvgs.length}/36`);

for(const asset of assets){
  const pngPath=join(root,asset.path.split('/').at(-1));
  const svgPath=join(root,asset.source_svg.split('/').at(-1));
  assert(existsSync(pngPath),`missing png ${asset.path}`);
  assert(existsSync(svgPath),`missing svg ${asset.source_svg}`);
  if(!existsSync(pngPath)||!existsSync(svgPath))continue;
  const metadata=await sharp(pngPath).metadata();
  assert(metadata.width===asset.pixel_size.width,`png width ${asset.path}`);
  assert(metadata.height===asset.pixel_size.height,`png height ${asset.path}`);
  assert(sha(pngPath)===asset.sha256,`png sha ${asset.path}`);
  assert(sha(svgPath)===asset.source_svg_sha256,`svg sha ${asset.source_svg}`);
  const svg=readFileSync(svgPath,'utf8');
  const ids=[...svg.matchAll(/\sid="([^"]+)"/g)].map((match)=>match[1]);
  assert(new Set(ids).size===ids.length,`duplicate svg id ${asset.source_svg}`);
  const labelled=svg.match(/aria-labelledby="([^"]+)"/)?.[1]?.split(/\s+/)??[];
  assert(labelled.length===2&&labelled.every((id)=>ids.includes(id)),`aria-labelledby resolution ${asset.source_svg}`);
  const title=svg.match(/<title[^>]*>([^<]+)<\/title>/)?.[1]??'';
  assert(/[\u3400-\u9fff]/u.test(title),`simplified Chinese accessible title ${asset.source_svg}`);
  const visibleTexts=[...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match)=>match[1]);
  for(const token of ['not_ready','unknown','degraded','stale','failed','live_demo','none','demo']){
    assert(!visibleTexts.some((value)=>new RegExp(`(^|[^A-Za-z_])${token}([^A-Za-z_]|$)`,'i').test(value)),`bare internal token ${token} in ${asset.source_svg}`);
  }
  assert(visibleSemanticTextMeetsFloor(svg,12),`all user-visible semantic text is at least 12px ${asset.source_svg}`);
  const fontSizes=[...svg.matchAll(/font-size="([0-9.]+)"/g)].map((match)=>Number(match[1]));
  if(/mobile-(390|320)/.test(asset.path)) assert(Math.min(...fontSizes)>=14,`mobile auxiliary font >=14 ${asset.source_svg}`);
  if(asset.path.includes('200-percent')) assert(Math.min(...fontSizes)>=28,`200 percent physical font >=28 ${asset.source_svg}`);
}

const desktopP0=assets.filter((asset)=>asset.path.includes('01-desktop-1440-current-not-ready')||asset.path.includes('10-desktop-1440-D'));
const tablet=assets.filter((asset)=>asset.path.includes('04-tablet-1024')||asset.path.includes('20-tablet-1024'));
const mobile=assets.filter((asset)=>asset.path.includes('05-mobile-390')||asset.path.includes('06-mobile-320')||asset.path.includes('30-mobile-390')||asset.path.includes('31-mobile-320'));
assert(desktopP0.length===12,`actual desktop p0 pages ${desktopP0.length}/12`);
assert(tablet.length===4,`actual tablet pages ${tablet.length}/4`);
assert(mobile.length===16,`actual mobile pages ${mobile.length}/16`);
assert(assets.some((asset)=>asset.path.includes('00-design-system-1440')),'design system asset');
assert(assets.some((asset)=>asset.path.includes('03-desktop-1440-chart-atlas')),'chart atlas asset');
assert(assets.some((asset)=>asset.path.includes('07-reflow-720-200-percent')),'200 percent asset');

const generatorSource=readFileSync(join(root,'generate-assets.mjs'),'utf8');
const semanticChartSource=generatorSource.slice(generatorSource.indexOf('function semanticMarks'),generatorSource.indexOf('function equivalentTableHeight'));
assert(!semanticChartSource.includes('index%6')&&!semanticChartSource.includes('index % 6'),'semantic chart renderer has no modulo glyph reuse');
assert(!generatorSource.includes('function simpleBars'),'generator has no generic destination bar fallback');
const atlas=readFileSync(join(root,'03-desktop-1440-chart-atlas.svg'),'utf8');
for(const chart of manifest.coverage.chart_catalog) assert(atlas.includes(chart.authoritative_mapping),`atlas authoritative mapping ${chart.id}`);
assert(manifest.coverage.chart_catalog[15]?.legend==='完/部/错/未=覆盖状态'&&atlas.includes('完/部/错/未=覆盖状态'),'chart 16 legend and complete-status cell abbreviation are consistent');
const expectedChartRows=[44,5,16,48,4,12,12,20,6,16,5,21,9,18,3,28,12,18,5];
for(let chartIndex=0;chartIndex<19;chartIndex+=1){
  const markPattern=new RegExp(`<g data-chart-index="${chartIndex}" data-row-id="${chartIndex}-([0-9]+)" data-field="([^"]*)" data-value="([^"]*)" data-status="([^"]*)">`,'g');
  const tablePattern=new RegExp(`<g data-table-row-id="${chartIndex}-([0-9]+)" data-field="([^"]*)" data-value="([^"]*)" data-status="([^"]*)">`,'g');
  const marks=[...atlas.matchAll(markPattern)].map((match)=>match.slice(1).join('|')).sort();
  const table=[...atlas.matchAll(tablePattern)].map((match)=>match.slice(1).join('|')).sort();
  assert(marks.length===expectedChartRows[chartIndex],`chart ${chartIndex+1} authoritative visible mark count ${marks.length}/${expectedChartRows[chartIndex]}`);
  assert(JSON.stringify(marks)===JSON.stringify(table),`chart ${chartIndex+1} mark/table bidirectional field-value-status equality`);
}
const attributeValues=(attribute)=>[...atlas.matchAll(new RegExp(`${attribute}="([^"]+)"`,'g'))].map((match)=>match[1]);
assert(attributeValues('data-trace-chart-index').length===19,'all 19 chart cards have traceability groups');
for(const field of ['unit','legend','filter','source_id','source_sha256','source','coverage','freshness','observed_at','root_head']){
  const values=[...atlas.matchAll(new RegExp(`data-trace-field="${field}" data-trace-value="([^"]+)"`,'g'))].map((match)=>match[1]);
  assert(values.length===19,`all 19 chart cards have actual trace field ${field}`);
  assert(values.every((value)=>value&&!['—','字段占位','示例值'].includes(value)),`chart trace field ${field} has non-placeholder values`);
}
const traceSourceIds=[...new Set(attributeValues('data-trace-value').filter((value)=>/^CC-目标态演示-图表-[0-9]{2}$/.test(value)))];
const traceSourceHashes=[...atlas.matchAll(/data-trace-field="source_sha256" data-trace-value="([0-9a-f]{64})"/g)].map((match)=>match[1]);
const traceRootHeads=[...atlas.matchAll(/data-trace-field="root_head" data-trace-value="([0-9a-f]{40})（目标态演示引用）"/g)].map((match)=>match[1]);
const traceObserved=[...atlas.matchAll(/data-trace-field="observed_at" data-trace-value="([0-9]{4}-[0-9]{2}-[0-9]{2}T[^（]+)（目标态演示观测）"/g)].map((match)=>match[1]);
const traceCanonical=[...atlas.matchAll(/data-trace-chart-index="([0-9]+)" data-source-canonical-base64="([^"]+)"/g)].map((match)=>({index:Number(match[1]),encoded:match[2]}));
assert(traceSourceIds.length===19,'19 chart source IDs are unique');
assert(traceSourceHashes.length===19&&new Set(traceSourceHashes).size===19,'19 chart source SHA256 values are complete and unique');
assert(traceRootHeads.length===19&&traceRootHeads.every((value)=>value.length===40),'19 chart root_head values are full 40-character hashes');
assert(traceObserved.length===19&&traceObserved.every((value)=>!Number.isNaN(Date.parse(value))),'19 chart observed_at values are ISO timestamps');
assert(traceCanonical.length===19,'19 chart normalized source payloads are embedded');
const traceGroups=[...atlas.matchAll(/<g data-trace-chart-index="[0-9]+"[^>]*>([\s\S]*?)<\/g>/g)].map((match)=>match[1]);
assert(traceGroups.length===19&&traceGroups.every((group)=>{const sizes=[...group.matchAll(/font-size="([0-9.]+)"/g)].map((match)=>Number(match[1]));return sizes.length>=10&&Math.min(...sizes)>=12;}),'all chart traceability text is at least 12px');
for(const trace of traceCanonical){
  let canonical='',parsed=null;try{canonical=Buffer.from(trace.encoded,'base64').toString('utf8');parsed=JSON.parse(canonical);}catch{}
  const declared=atlas.match(new RegExp(`data-trace-chart-index="${trace.index}"[\\s\\S]*?data-trace-field="source_sha256" data-trace-value="([0-9a-f]{64})"`))?.[1];
  assert(Boolean(parsed)&&Array.isArray(parsed?.rows)&&parsed.rows.length===expectedChartRows[trace.index],`chart ${trace.index+1} normalized source payload structure`);
  assert(createHash('sha256').update(canonical).digest('hex')===declared,`chart ${trace.index+1} source SHA binds exact normalized rows/source content`);
  if(parsed?.rows?.length){const mutated=structuredClone(parsed);mutated.rows[0][1]=`${mutated.rows[0][1]}-mutation`;assert(createHash('sha256').update(JSON.stringify(mutated)).digest('hex')!==declared,`chart ${trace.index+1} source SHA changes when normalized data changes`);}
}
assert(attributeValues('data-stage-cell').length===44,'chart 01 has 4 projects x 11 stage cells');
assert(new Set(attributeValues('data-project')).size===4,'chart 01 has four project rows');
assert(new Set(attributeValues('data-stage')).size===11,'chart 01 has stages 0 through 10');
assert(attributeValues('data-current-stage').filter((value)=>value==='true').length===4,'chart 01 has one current stage border per project');
const currentStageStatuses=[...atlas.matchAll(/data-current-stage="true" data-approval-status="([^"]+)"/g)].map((match)=>match[1]);
assert(currentStageStatuses.length===4&&currentStageStatuses.includes('设计待审'),'chart 01 current-stage approval includes pending state');
const stageCells=[...atlas.matchAll(/data-stage-cell="true" data-project="([^"]+)" data-stage="([^"]+)" data-stage-status="([^"]+)" data-stage-status-short="([^"]+)" data-stage-glyph="([^"]+)" data-current-stage="([^"]+)" data-approval-status="([^"]+)"/g)].map((match)=>({project:match[1],stage:Number(match[2]),status:match[3],short:match[4],glyph:match[5],current:match[6]==='true',approval:match[7]}));
assert(stageCells.length===44&&stageCells.every((cell)=>cell.short===(cell.status==='完成'?'完':cell.current?'当':'待')),'chart 01 every stage has visible text abbreviation');
assert(stageCells.every((cell)=>cell.glyph===(cell.status==='完成'?'✓':cell.current?(cell.approval.includes('已批准')?'✓':cell.approval.includes('待审')?'待':'?'):'○')),'chart 01 every stage has status icon consistent with stage/approval');
assert(stageCells.every((cell)=>cell.status&&cell.short&&cell.glyph&&typeof cell.current==='boolean'),'chart 01 fourfold value/text/icon/current-border encoding is complete');
assert(attributeValues('data-artifact-count').length===5,'chart 02 has one artifact_count badge per stage node');
assert(new Set(attributeValues('data-approval-status')).has('待审核'),'chart 02 approval_status is visibly encoded');
assert(attributeValues('data-truth-track-cell').length===16,'chart 03 has four projects x four truth tracks');
assert(new Set(attributeValues('data-track-project')).size===4&&new Set(attributeValues('data-truth-track')).size===4,'chart 03 project and truth-track dimensions');
const truthCells=[...atlas.matchAll(/data-truth-track-cell="true" data-track-project="([^"]+)" data-truth-track="([^"]+)" data-truth-value="([^"]+)" data-truth-rank="([^"]+)" data-status-glyph="([^"]+)" data-cell-x="([^"]+)" data-cell-y="([^"]+)"/g)].map((match)=>({project:match[1],track:match[2],value:match[3],rank:Number(match[4]),glyph:match[5],x:Number(match[6]),y:Number(match[7])}));
const truthEncoding={'演示可浏览':['◇',2],'未实现':['×',0],'未就绪':['○',1],'未授权':['锁',0]};
assert(truthCells.length===16&&truthCells.every((cell)=>truthEncoding[cell.value]?.[0]===cell.glyph&&truthEncoding[cell.value]?.[1]===cell.rank),'chart 03 value maps to exact visible glyph and hierarchy rank');
assert(new Set(truthCells.map((cell)=>`${cell.project}|${cell.y}`)).size===4&&new Set(truthCells.map((cell)=>`${cell.track}|${cell.x}`)).size===4,'chart 03 project rows and truth-track columns map to coordinates');
assert(atlas.includes('◇演示可浏览 · ×未实现 · ○未就绪 · 锁未授权'),'chart 03 visible legend matches truth symbols');
assert(attributeValues('data-role-project-cell').length===48,'chart 04 has twelve roles x four projects');
assert(new Set(attributeValues('data-role-axis')).size===12&&new Set(attributeValues('data-project-axis')).size===4,'chart 04 role and project dimensions');
const roleCells=[...atlas.matchAll(/data-role-project-cell="true" data-role-axis="([^"]+)" data-project-axis="([^"]+)" data-role-status="([^"]+)" data-status-glyph="([^"]+)" data-status-priority="([^"]+)" data-cell-x="([^"]+)" data-cell-y="([^"]+)"/g)].map((match)=>({role:match[1],project:match[2],status:match[3],glyph:match[4],priority:Number(match[5]),x:Number(match[6]),y:Number(match[7])}));
const roleEncoding={'执行中':['▶',4],'待审':['审',3],'排队':['◷',2],'阻塞':['!',5],'—':['·',0]};
assert(roleCells.length===48&&roleCells.every((cell)=>roleEncoding[cell.status]?.[0]===cell.glyph&&roleEncoding[cell.status]?.[1]===cell.priority),'chart 04 status maps to exact glyph and hierarchy priority');
assert(roleCells.some((cell)=>cell.status==='阻塞')&&new Set(roleCells.map((cell)=>`${cell.role}|${cell.y}`)).size===12&&new Set(roleCells.map((cell)=>`${cell.project}|${cell.x}`)).size===4,'chart 04 includes blocked state and maps 12 roles x 4 projects to coordinates');
assert(atlas.includes('▶执行中 · 审待审 · ◷排队 · !阻塞 · ·无记录'),'chart 04 visible legend exactly matches matrix symbols');
assert(attributeValues('data-handoff-id').length===4&&attributeValues('data-handoff-edge').length===3,'chart 05 structured handoff ids and explicit edges');
const handoffNodes=[...atlas.matchAll(/data-handoff-id="([^"]+)" data-handoff-stage="([^"]+)" data-handoff-role="([^"]+)" data-handoff-x="([^"]+)" data-handoff-y="([^"]+)"/g)].map((match)=>({id:match[1],stage:Number(match[2]),role:match[3],x:Number(match[4]),y:Number(match[5])}));
const handoffEdges=[...atlas.matchAll(/data-handoff-edge="([^"]+)" data-edge-from-x="([^"]+)" data-edge-from-y="([^"]+)" data-edge-to-x="([^"]+)" data-edge-to-y="([^"]+)"/g)].map((match)=>({id:match[1],fromX:Number(match[2]),fromY:Number(match[3]),toX:Number(match[4]),toY:Number(match[5])}));
assert(handoffNodes.every((node,index)=>node.stage===index+1&&(index===0||node.x>handoffNodes[index-1].x)),'chart 05 stage values map to strictly increasing x positions');
assert(handoffEdges.every((edge,index)=>edge.fromX===handoffNodes[index].x&&edge.fromY===handoffNodes[index].y&&edge.toX===handoffNodes[index+1].x&&edge.toY===handoffNodes[index+1].y),'chart 05 explicit edges connect the visible node coordinates');
const handoffLabels=[...atlas.matchAll(/data-handoff-edge-label="([^"]+)" data-edge-label-x="([^"]+)" data-edge-label-y="([^"]+)"/g)].map((match)=>({id:match[1],x:Number(match[2]),y:Number(match[3])}));
assert(handoffLabels.length===3&&handoffLabels.every((label)=>handoffNodes.every((node)=>Math.hypot(label.x-node.x,label.y-node.y)>32)),'chart 05 edge IDs are offset from handoff nodes');
assert(attributeValues('data-aging-bar').length===12,'chart 06 has four projects x three review gates');
assert(new Set(attributeValues('data-aging-project')).size===4&&new Set(attributeValues('data-review-gate')).size===3,'chart 06 project and review-gate grouping');
assert(new Set(attributeValues('data-wait-bucket')).size===3&&['0–1天','2–3天','时间未知'].every((bucket)=>attributeValues('data-wait-bucket').includes(bucket)),'chart 06 uses authoritative waiting buckets on x axis');
const agingBars=[...atlas.matchAll(/data-aging-bar="true" data-wait-bucket="([^"]+)" data-aging-project="([^"]+)" data-project-glyph="([^"]+)" data-review-gate="([^"]+)" data-count="([^"]+)" data-bar-height="([^"]+)" data-bar-y="([^"]+)" data-baseline-y="([^"]+)"/g)].map((match)=>({bucket:match[1],project:match[2],glyph:match[3],gate:match[4],count:Number(match[5]),height:Number(match[6]),y:Number(match[7]),baseline:Number(match[8])}));
assert(agingBars.length===12&&agingBars.every((bar)=>bar.height===bar.count*38&&bar.y===bar.baseline-bar.height),'chart 06 count maps to bar height and zero remains zero-height baseline');
const agingProjectGlyphs=attributeValues('data-project-glyph');
assert(agingProjectGlyphs.length===12&&new Set(agingProjectGlyphs).size===4,'chart 06 every bucket contains four visible project identities');
assert(atlas.includes('控=控制中心')&&atlas.includes('英=英语学习')&&atlas.includes('职=职业雷达')&&atlas.includes('模=模型雷达'),'chart 06 visible project legend');
assert(attributeValues('data-decision-series').length===4,'chart 07 has four separate approval-result series');
assert(new Set(attributeValues('data-decision-pattern')).size===4,'chart 07 approval series have non-color patterns');
assert(attributeValues('data-artifact-cell').length===20,'chart 08 has four projects x five artifact types');
assert(new Set(attributeValues('data-artifact-project')).size===4&&new Set(attributeValues('data-artifact-type')).size===5,'chart 08 project and artifact-type dimensions');
assert(JSON.stringify([...new Set(attributeValues('data-artifact-state'))].sort())===JSON.stringify(['历史','哈希不一致','待审','有效','未登记'].sort()),'chart 08 exact five artifact states');
assert(attributeValues('data-event-lane').length===6&&new Set(attributeValues('data-event-lane')).size>=4,'chart 09 has project-role swimlanes');
assert(attributeValues('data-event-time').length===6,'chart 09 event-time marks');
assert(attributeValues('data-event-minute').includes('600')&&attributeValues('data-event-minute').includes('660')&&new Set(attributeValues('data-event-minute')).size===6,'chart 09 uses complete HH:mm positions without minute collision');
const eventMarks=[...atlas.matchAll(/data-event-lane="([^"]+)" data-event-time="([^"]+)" data-event-minute="([^"]+)" data-event-type="([^"]+)" data-event-result="([^"]+)" data-event-glyph="([^"]+)" data-event-result-glyph="([^"]+)" data-event-x="([^"]+)" data-event-y="([^"]+)"/g)].map((match)=>({lane:match[1],time:match[2],minute:Number(match[3]),type:match[4],result:match[5],glyph:match[6],resultGlyph:match[7],x:Number(match[8]),y:Number(match[9])})).sort((a,b)=>a.minute-b.minute);
const eventGlyphs={'解析坏行':'!','入场':'入','交付':'交','复测':'测','审查':'审','路由':'路'};
const eventScale=(eventMarks.at(-1).x-eventMarks[0].x)/(eventMarks.at(-1).minute-eventMarks[0].minute);
assert(eventMarks.every((mark)=>eventGlyphs[mark.type]===mark.glyph&&Math.abs(mark.x-(eventMarks[0].x+(mark.minute-eventMarks[0].minute)*eventScale))<.001),'chart 09 full timestamp and event type map to x position and visible glyph');
assert(eventMarks.every((mark)=>mark.resultGlyph===(mark.result==='成功'?'✓':'△'))&&atlas.includes('✓成功')&&atlas.includes('△部分可用'),'chart 09 result has visible non-color symbol and legend');
assert(attributeValues('data-stack-segment').length===16,'chart 10 has four statuses x four severity stack segments');
assert(new Set(attributeValues('data-status-axis')).size===4&&new Set(attributeValues('data-severity')).size===4,'chart 10 severity x status dimensions');
const stackSegments=[...atlas.matchAll(/data-stack-segment="true" data-status-axis="([^"]+)" data-severity="([^"]+)" data-count="([^"]+)" data-segment-x="([^"]+)" data-segment-width="([^"]+)" data-status-total="([^"]+)" data-max-total="([^"]+)"/g)].map((match)=>({status:match[1],severity:match[2],count:Number(match[3]),x:Number(match[4]),width:Number(match[5]),total:Number(match[6]),max:Number(match[7])}));
const positiveWidthRatios=stackSegments.filter((segment)=>segment.count>0).map((segment)=>segment.width/segment.count);
assert(stackSegments.length===16&&Math.max(...positiveWidthRatios)-Math.min(...positiveWidthRatios)<.001,'chart 10 absolute count maps to segment width on one common maximum scale');
assert([...new Set(stackSegments.map((segment)=>segment.status))].every((status)=>stackSegments.filter((segment)=>segment.status===status).reduce((sum,segment)=>sum+segment.count,0)===stackSegments.find((segment)=>segment.status===status).total),'chart 10 visible segments sum to each status total');
assert(attributeValues('data-severity-pattern').length>=1,'chart 11 high severity uses non-color pattern encoding');
assert(atlas.includes('7天以上')&&atlas.includes('时间未知'),'chart 11 separates seven-plus-day and unknown-time buckets');
const issueAging=[...atlas.matchAll(/data-aging-mark="true" data-aging-bucket="([^"]+)" data-aging-count="([^"]+)" data-aging-y="([^"]+)" data-aging-baseline="([^"]+)" data-aging-max-count="([^"]+)" data-aging-mark-size="([^"]+)" data-area-encoding="([^"]+)" data-aging-severity="([^"]+)" data-aging-glyph="([^"]+)"/g)].map((match)=>({bucket:match[1],count:Number(match[2]),y:Number(match[3]),baseline:Number(match[4]),max:Number(match[5]),markSize:Number(match[6]),area:match[7],severity:match[8],glyph:match[9]}));
const agingScale=(issueAging[0].baseline-issueAging[0].y)/issueAging[0].count;
assert(issueAging.length===5&&issueAging.every((item)=>Math.abs((item.baseline-item.y)-item.count*agingScale)<.001),'chart 11 Y coordinate maps to issue count');
assert(issueAging.every((item)=>item.markSize===14&&item.area==='false'),'chart 11 uses fixed-size marks and forbids bubble-area encoding');
assert(issueAging.every((item)=>(item.severity==='高严重度'?item.glyph==='!':item.bucket==='时间未知'?item.glyph==='?':item.glyph==='●')),'chart 11 severity and unknown-time states map to visible symbols');
assert(attributeValues('data-retest-cell').length===12,'chart 12 has four severities x three retest states');
assert(new Set(attributeValues('data-retest-severity')).size===4&&new Set(attributeValues('data-retest-result')).size===3,'chart 12 severity and retest-result dimensions');
assert(attributeValues('data-retest-trend-series').length===3&&attributeValues('data-retest-trend-point').length===9,'chart 12 has date/iteration trend series and nine points');
assert(new Set(attributeValues('data-retest-trend-pattern')).size===3&&new Set(attributeValues('data-retest-trend-glyph')).size===3,'chart 12 trend has line and point-shape non-color encoding');
assert(attributeValues('data-burn-series').length===3,'chart 13 has ideal, actual and scope series');
assert(new Set(attributeValues('data-burn-pattern')).size===3,'chart 13 burn series have non-color patterns');
const burnPoints=[...atlas.matchAll(/data-burn-point="true" data-burn-series-name="([^"]+)" data-burn-day="([^"]+)" data-burn-value="([^"]+)" data-burn-x-offset="([^"]+)"/g)].map((match)=>({series:match[1],day:match[2],value:Number(match[3]),offset:Number(match[4])}));
for(const day of new Set(burnPoints.map((point)=>point.day))){const dayPoints=burnPoints.filter((point)=>point.day===day);assert(new Set(dayPoints.map((point)=>point.offset)).size===3,`chart 13 ${day} series use separate horizontal positions even for equal values`);}
assert(attributeValues('data-gate-cell').length===18,'chart 14 has three version/environment rows x six gates');
assert(new Set(attributeValues('data-environment')).size===3&&new Set(attributeValues('data-gate')).size===6,'chart 14 version/environment and gate dimensions');
const gateCells=[...atlas.matchAll(/data-gate-cell="true" data-environment="([^"]+)" data-gate="([^"]+)" data-gate-status="([^"]+)" data-gate-glyph="([^"]+)" data-gate-rank="([^"]+)" data-cell-x="([^"]+)" data-cell-y="([^"]+)" data-cell-width="([^"]+)" data-cell-height="([^"]+)"/g)].map((match)=>({environment:match[1],gate:match[2],status:match[3],glyph:match[4],rank:Number(match[5]),x:Number(match[6]),y:Number(match[7]),width:Number(match[8]),height:Number(match[9])}));
const gateEncoding={'通过':'✓','阻塞':'×','待证据':'…','非发布':'∅','未授权':'锁','未执行':'○','冻结':'锁'};
assert(gateCells.length===18&&gateCells.every((cell)=>gateEncoding[cell.status]===cell.glyph),'chart 14 gate state maps to exact visible symbol');
assert(new Set(gateCells.map((cell)=>`${cell.environment}|${cell.y}`)).size===3&&new Set(gateCells.map((cell)=>`${cell.gate}|${cell.x}`)).size===6,'chart 14 environments and six gates map to rows and columns');
const atlasGateLegends=releaseGateLegendGeometry(atlas).filter((legend)=>legend.context==='standard');
assert(atlasGateLegends.length===1&&validReleaseGateLegend(atlasGateLegends[0]),'chart 14 six-state legend uses non-overlapping two-column three-row geometry');
const atlasGateTraceBlock=atlas.match(/<g data-trace-chart-index="13"[^>]*>([\s\S]*?)<\/g>/)?.[1]??'';
const atlasGateTraceXs=[...atlasGateTraceBlock.matchAll(/<text\b[^>]*x="([^"]+)"/g)].map((match)=>Number(match[1]));
assert(atlasGateTraceXs.length>0&&Math.max(...atlasGateLegends[0].items.map((item)=>item.right))+16<=Math.min(...atlasGateTraceXs),'chart 14 gate legend clears traceability column by at least 16px');
assert(Math.max(...gateCells.map((cell)=>cell.y+cell.height))+8<=Math.min(...atlasGateLegends[0].items.map((item)=>item.top)),'chart 14 gate legend clears the matrix cells vertically');
assert(attributeValues('data-plan-time').length===3&&attributeValues('data-actual-time').length===3,'chart 15 plan and actual time marks');
assert(attributeValues('data-version').length===3&&attributeValues('data-source-commit').length===3,'chart 15 version and source commit encoding');
assert(attributeValues('data-release-status').length===3,'chart 15 release status is data-visible');
const planXs=attributeValues('data-plan-x').map(Number),actualXs=attributeValues('data-actual-x').map(Number);
assert(planXs.length===2&&actualXs.length===1&&planXs[0]<actualXs[0]&&actualXs[0]<planXs[1],'chart 15 plan/actual x positions derive from 09:00/09:20/next-day 10:00 timestamps');
assert(attributeValues('data-coverage-cell').length===28,'chart 16 has four projects x seven data domains');
assert(new Set(attributeValues('data-domain')).size===7,'chart 16 seven coverage domains');
assert(attributeValues('data-freshness-cell').length===12,'chart 17 has four project-domain subjects x three batches');
assert(new Set(attributeValues('data-subject')).size===4&&new Set(attributeValues('data-batch')).size===3,'chart 17 subject and batch dimensions');
assert(attributeValues('data-observation-time').length===12,'chart 17 every cell has observation time');
assert(attributeValues('data-maturity-cell').length===18,'chart 18 has six capability dimensions x three iterations');
assert(new Set(attributeValues('data-dimension')).size===6&&new Set(attributeValues('data-iteration')).size===3,'chart 18 capability and iteration dimensions');
assert(attributeValues('data-maturity-trend').length===5,'chart 18 draws only five contiguous evidence-backed trend segments and leaves fully missing dimension disconnected');
assert(attributeValues('data-rule').length===18&&attributeValues('data-sample').length===18&&attributeValues('data-missing').length===18,'chart 18 every cell has rule sample missing annotations');
const maturityCells=[...atlas.matchAll(/data-maturity-cell="true" data-dimension="([^"]+)" data-iteration="([^"]+)" data-rule="([^"]*)" data-sample="([^"]*)" data-missing="([^"]*)" data-level="([^"]*)" data-evidence-available="([^"]+)" data-level-bar-width="([^"]+)" data-label-y="([^"]+)" data-trend-y="([^"]*)"/g)].map((match)=>({dimension:match[1],iteration:match[2],rule:match[3],sample:match[4],missing:match[5],level:match[6]===''?null:Number(match[6]),available:match[7]==='true',barWidth:Number(match[8]),labelY:Number(match[9]),trendY:match[10]===''?null:Number(match[10])}));
const maturityScale=maturityCells.find((cell)=>cell.level===1)?.barWidth;
assert(maturityCells.every((cell)=>cell.available===(cell.level!==null)&&Math.abs(cell.barWidth-(cell.level===null?0:maturityScale*cell.level))<.001),'chart 18 maturity level maps to visible bar width and unavailable evidence maps to zero');
assert(['rule','sample','missing'].every((field)=>maturityCells.every((cell)=>String(cell[field]).length>0)),'chart 18 rule sample and missing evidence are visible model values');
const maturityPoints=[...atlas.matchAll(/data-maturity-trend-point="true" data-maturity-dimension="([^"]+)" data-maturity-iteration="([^"]+)" data-maturity-level="([^"]+)" data-maturity-point-x="([^"]+)" data-maturity-point-y="([^"]+)"/g)].map((match)=>({dimension:match[1],iteration:match[2],level:Number(match[3]),x:Number(match[4]),y:Number(match[5])}));
assert(maturityPoints.length===maturityCells.filter((cell)=>cell.available).length,'chart 18 draws exactly one point per evidence-backed cell and none for insufficient evidence');
assert(maturityCells.filter((cell)=>!cell.available).every((cell)=>cell.trendY===null&&!maturityPoints.some((point)=>point.dimension===cell.dimension&&point.iteration===cell.iteration)),'chart 18 evidence-insufficient cells have no synthetic zero point');
assert(maturityCells.filter((cell)=>cell.available).every((cell)=>cell.trendY-cell.labelY>=8),'chart 18 trend marks do not overlap value text');
const maturitySegments=[...atlas.matchAll(/data-maturity-trend="([^"]+)" data-maturity-segment="([^"]+)" data-maturity-trend-points="([^"]+)"/g)].map((match)=>({dimension:match[1],points:match[3].trim().split(/\s+/)}));
assert(maturitySegments.every((segment)=>segment.points.length>=2&&segment.points.every((point)=>/^[-0-9.]+,[-0-9.]+$/.test(point))),'chart 18 trend segments contain only contiguous numeric evidence points');
assert(attributeValues('data-evidence-node-id').length===5&&attributeValues('data-evidence-edge').length===4,'chart 19 explicit node ids and semantic edges');
const evidenceNodes=[...atlas.matchAll(/data-evidence-node-id="([^"]+)" data-evidence-node-x="([^"]+)" data-evidence-node-y="([^"]+)"/g)].map((match)=>({id:match[1],x:Number(match[2]),y:Number(match[3])}));
const evidenceLabels=[...atlas.matchAll(/data-evidence-edge-label="([^"]+)" data-edge-label-x="([^"]+)" data-edge-label-y="([^"]+)"/g)].map((match)=>({id:match[1],x:Number(match[2]),y:Number(match[3])}));
assert(evidenceLabels.length===4&&evidenceLabels.every((label)=>evidenceNodes.every((node)=>Math.hypot(label.x-node.x,label.y-node.y)>24)),'chart 19 edge ID labels avoid evidence nodes');
assert(evidenceLabels.every((label,index)=>evidenceLabels.every((other,otherIndex)=>index===otherIndex||Math.hypot(label.x-other.x,label.y-other.y)>=28)),'chart 19 edge ID labels do not collide with one another');

const currentSvg=readFileSync(join(root,'01-desktop-1440-current-not-ready.svg'),'utf8');
assert(currentSvg.includes('<rect width="240"'),'desktop sidebar approved width 240');
assert(currentSvg.includes('当前没有有效观测'),'current not-ready has no-observation copy');
assert(currentSvg.includes('不绘制标记，不把未知换算为 0'),'current not-ready does not infer zero');
assert(!currentSvg.includes('0 有来源证据'),'current not-ready does not claim evidenced zero');
assert(!currentSvg.includes('data-chart-index='),'current not-ready renders no semantic marks');
for(const excluded of ['目标态演示','历史记录','上次快照']) assert(!currentSvg.includes(excluded),`current not-ready physically excludes ${excluded}`);
const unavailableCopyY=Number(currentSvg.match(/<text x="[^"]+" y="([^"]+)"[^>]*>不绘制标记，不把未知换算为 0<\/text>/)?.[1]);
const currentAfterUnavailable=currentSvg.slice(currentSvg.indexOf('不绘制标记，不把未知换算为 0'));
const unavailableHeaderY=Number(currentAfterUnavailable.match(/<text x="[^"]+" y="([^"]+)"[^>]*>完整等价表：字段<\/text>/)?.[1]);
assert(Number.isFinite(unavailableCopyY)&&Number.isFinite(unavailableHeaderY)&&unavailableHeaderY-unavailableCopyY>=24,'unavailable explanation/table header vertical gap >=24');
const approvalSvg=readFileSync(join(root,'10-desktop-1440-D05-approvals.svg'),'utf8');
assert(approvalSvg.includes('查询成功，确实为空')&&approvalSvg.includes('来源成功证据'),'approval empty has successful-query evidence');
assert(approvalSvg.includes('记录数为 0 且来源可用'),'approval empty explicitly shows evidenced zero');
assert(!approvalSvg.includes('data-chart-index='),'approval empty renders no chart marks');
const expectedDefaultApprovalSha=createHash('sha256').update('page=approvals|project=全部项目|time=近 30 天|iteration=全部迭代|source=审批登记|query=|cross=|record-count=0').digest('hex');
assert(approvalSvg.includes(`data-empty-scope-sha="${expectedDefaultApprovalSha}"`),'approval static empty evidence hashes the visible default query scope');
for(const copy of ['项目：全部锁定','时间：近30天锁定','迭代：全部锁定','来源：审批登记','范围已锁定，不可搜索','锁定证据范围','来源、观测、范围哈希已取证','非证据范围不可修改','范围与来源哈希分开','范围已锁定'])assert(approvalSvg.includes(copy),`approval visual evidence scope is visibly locked: ${copy}`);
const approvalEvidence=approvalSvg.match(/data-empty-source-evidence="true" data-source-id="([^"]+)" data-source-status="([^"]+)" data-source-observed-at="([^"]+)" data-source-sha256="([0-9a-f]{64})" data-scope-sha256="([0-9a-f]{64})"/);
const approvalCanonical=JSON.stringify({source_id:'CC-审批登记-只读快照-001',source_status:'可用',observed_at:'2026-08-17T01:40:00+08:00',rows:[['审批记录','0','查询成功'],['解析错误','0','无错误'],['覆盖范围','全部项目｜近30天｜全部迭代','已锁定']]});
assert(Boolean(approvalEvidence)&&approvalEvidence[1]==='CC-审批登记-只读快照-001'&&approvalEvidence[2]==='可用'&&!Number.isNaN(Date.parse(approvalEvidence[3])),'approval empty has explicit source identity/status/observed_at evidence');
assert(approvalEvidence?.[4]===createHash('sha256').update(approvalCanonical).digest('hex'),'approval empty source SHA binds normalized source evidence model');
assert(approvalEvidence?.[5]===expectedDefaultApprovalSha&&approvalEvidence?.[4]!==approvalEvidence?.[5],'approval empty keeps source SHA separate from query scope SHA');
for(const asset of desktopP0){
  const svg=readFileSync(join(root,asset.source_svg.split('/').at(-1)),'utf8');
  const approvalPage=asset.path.includes('D05-approvals'),controls=approvalPage?['项目：全部锁定','时间：近30天锁定','迭代：全部锁定','来源：审批登记','范围已锁定，不可搜索','只读刷新','导出当前查询']:['项目：全部','时间：近30天','迭代：全部','来源：正式','搜索项目、角色、证据','只读刷新','导出当前查询'];
  for(const control of controls) assert(svg.includes(control),`desktop global control ${control} in ${asset.source_svg}`);
}
const systemSvg=readFileSync(join(root,'00-design-system-1440.svg'),'utf8');
for(const component of ['输入框：搜索项目、角色、证据','Toast：只读刷新完成，3 项可用','正在读取','全局只读顶栏组件','复制 SHA256','复制错误码','焦点可见 2px','按钮 · 悬停','按钮 · 按下','按钮 · 禁用','按钮 · 错误','输入 · 悬停','输入 · 按下','输入 · 禁用','输入 · 错误','160ms 缓出（ease-out）','状态播报（aria-live）','统一信息架构：6 个一级导航 · 12 个目的页','警告基色 #B65D0A']) assert(systemSvg.includes(component),`design system component ${component}`);
const staleSvg=readFileSync(join(root,'05-mobile-390-source-stale.svg'),'utf8');
assert(staleSvg.includes('来源解析失败')&&staleSvg.includes('SOURCE_PARSE_FAILED'),'390 stale error reason and code');
const staleRowYs=[...staleSvg.matchAll(/data-source-row="[^"]+" data-source-row-y="([^"]+)"/g)].map((match)=>Number(match[1]));
assert(staleRowYs.length===7&&Math.max(...staleRowYs)+14<610,'390 source rows clear recovery card without overlap');
const stale320Svg=readFileSync(join(root,'06-mobile-320-source-stale.svg'),'utf8');
for(const copy of ['目标态演示 · 数据已过期','来源解析失败','SOURCE_PARSE_FAILED','零写：无批准、发布、修复','或 Git 写入']) assert(stale320Svg.includes(copy),`320 stale paired truth ${copy}`);
const stale320SubtitleY=Number(stale320Svg.match(/<text x="[^\"]+" y="([^"]+)"[^>]*>源时间和观测时间分开<\/text>/)?.[1]),stale320FirstRowY=Number(stale320Svg.match(/<text x="[^\"]+" y="([^"]+)"[^>]*>来源：工作流治理文件<\/text>/)?.[1]);
assert(Number.isFinite(stale320SubtitleY)&&Number.isFinite(stale320FirstRowY)&&stale320FirstRowY-stale320SubtitleY>=24,'320 stale source subtitle and first row maintain >=24px baseline gap');
const roleSvg=readFileSync(join(root,'10-desktop-1440-D04-roles.svg'),'utf8');
for(const role of ['00 包工头','01 市场调研员','02 项目经理','03 产品经理','04 UI/UX 设计师','05 架构师','06 前端工程师','07 后端工程师','08 数据工程师','09 代码审查员','10 QA','11 DevOps']) assert(roleSvg.includes(role),`fixed role identity ${role}`);
for(const asset of assets.filter((item)=>item.path.includes('31-mobile-320-'))){const svg=readFileSync(join(root,asset.source_svg.split('/').at(-1)),'utf8');assert(svg.includes('零写：无批准、发布、修复或 Git 写入口'),`320 zero-write boundary ${asset.source_svg}`);}
for(const asset of mobile){const svg=readFileSync(join(root,asset.source_svg.split('/').at(-1)),'utf8');for(const label of ['总览','项目','质量','更多'])assert(svg.includes(`data-mobile-nav-label="${label}"`),`mobile unified bottom nav ${label} in ${asset.source_svg}`);}
for(const asset of tablet){const svg=readFileSync(join(root,asset.source_svg.split('/').at(-1)),'utf8');for(const label of ['总览','项目与阶段','角色协作','质量与复测','迭代与发布','成熟度与治理'])assert(svg.includes(`data-primary-label="${label}"`),`tablet primary accessible label ${label} in ${asset.source_svg}`);}
const tabletEvents=readFileSync(join(root,'20-tablet-1024-T03-events-issues.svg'),'utf8');
assert(tabletEvents.includes('data-tablet-semantic="events"')&&tabletEvents.includes('data-event-lane=')&&tabletEvents.includes('data-tablet-semantic="issues-retest"')&&tabletEvents.includes('data-retest-cell='),'T03 tablet uses real event timeline and issue/retest semantics');
assert(!tabletEvents.includes('data-tablet-semantic="overview-stage"'),'T03 tablet does not reuse project-stage matrix');
const tabletSources=readFileSync(join(root,'20-tablet-1024-T04-sources-system.svg'),'utf8');
assert(tabletSources.includes('data-tablet-semantic="sources-coverage"')&&tabletSources.includes('data-coverage-cell=')&&tabletSources.includes('data-tablet-semantic="system-source-status"')&&tabletSources.includes('data-source-row='),'T04 tablet uses real source coverage and system/source semantics');
assert(!tabletSources.includes('data-tablet-semantic="overview-stage"'),'T04 tablet does not reuse project-stage matrix');
assert((staleSvg.match(/data-machine-value="true"/g)??[]).length>=1&&(stale320Svg.match(/data-machine-value="true"/g)??[]).length>=1,'390 and 320 machine values use dedicated wrapping lines');
const approval390=readFileSync(join(root,'30-mobile-390-approvals.svg'),'utf8');
const approval320=readFileSync(join(root,'31-mobile-320-approvals.svg'),'utf8');
for(const svg of [approval390,approval320]){assert(svg.includes('查询成功，确实为空'),'mobile empty Chinese state');assert(svg.includes('#E8F7F3'),'mobile empty success-empty visual token');}
for(const svg of [approval390,approval320]){assert(svg.includes('data-mobile-empty-evidence="true"')&&svg.includes('data-scope-locked="true"')&&svg.includes('CC-审批登记-只读快照-001'),'mobile approval empty binds source evidence and locks scope');}
const mobileProjects390=readFileSync(join(root,'30-mobile-390-projects.svg'),'utf8'),mobileProjects320=readFileSync(join(root,'31-mobile-320-projects.svg'),'utf8');
for(const svg of [mobileProjects390,mobileProjects320])for(const heading of ['项目与阶段','项目证据详情','固定角色协作'])assert(svg.includes(heading),`shared mobile project asset exposes destination content ${heading}`);
for(const [file,heading] of [['30-mobile-390-artifacts.svg','产物与哈希'],['31-mobile-320-artifacts.svg','产物与哈希'],['30-mobile-390-events.svg','事件审计'],['31-mobile-320-events.svg','事件审计'],['30-mobile-390-issues.svg','问题、Bug 与复测'],['31-mobile-320-issues.svg','问题、Bug 与复测'],['30-mobile-390-releases.svg','迭代与发布'],['31-mobile-320-releases.svg','迭代与发布']])assert(readFileSync(join(root,file),'utf8').includes(heading),`mobile destination content matches H1 ${heading}`);
for(const svg of [staleSvg,stale320Svg])for(const heading of ['来源、覆盖与新鲜度','成熟度与治理','系统状态与恢复'])assert(svg.includes(heading),`shared stale mobile asset exposes destination content ${heading}`);
for(const svg of [staleSvg,stale320Svg])for(const label of ['角色职责','阶段审批','产物追溯','自动执行','测试评测','可观测成本','规则：R1','样本：0','缺失：6'])assert(svg.includes(label),`mobile maturity includes six dimensions and evidence metadata ${label}`);
for(const [svg,width] of [[staleSvg,390],[stale320Svg,320]]){const lines=[...svg.matchAll(/<text[^>]*\sy="([0-9.]+)"[^>]*data-mobile-maturity-line="([0-9]+)"[^>]*>/g)].map((match)=>({y:Number(match[1]),index:Number(match[2])})).sort((a,b)=>a.index-b.index);assert(lines.length===6,`${width} mobile maturity exposes six auditable text lines`);for(let index=1;index<lines.length;index+=1)assert(lines[index].y-lines[index-1].y>=(index===1?26:20),`${width} mobile maturity line ${index} clears previous line`);}
const mobileCurrentContracts=[
  ['30-mobile-390-overview.svg','总览'],['31-mobile-320-overview.svg','总览'],
  ['30-mobile-390-projects.svg','项目'],['31-mobile-320-projects.svg','项目'],
  ['30-mobile-390-approvals.svg','项目'],['31-mobile-320-approvals.svg','项目'],
  ['30-mobile-390-artifacts.svg','项目'],['31-mobile-320-artifacts.svg','项目'],
  ['30-mobile-390-events.svg','项目'],['31-mobile-320-events.svg','项目'],
  ['30-mobile-390-issues.svg','质量'],['31-mobile-320-issues.svg','质量'],
  ['30-mobile-390-releases.svg','更多'],['31-mobile-320-releases.svg','更多'],
  ['05-mobile-390-source-stale.svg','更多'],['06-mobile-320-source-stale.svg','更多']
];
for(const [file,label] of mobileCurrentContracts){const svg=readFileSync(join(root,file),'utf8');assert((svg.match(/aria-current="page"/g)??[]).length===1,`mobile static asset has exactly one current bottom item ${file}`);assert(new RegExp(`<g[^>]*aria-label="${label}"[^>]*aria-current="page"`).test(svg),`mobile static current bottom item ${file} -> ${label}`);}
const targetSvg=readFileSync(join(root,'02-desktop-1440-target-live-demo.svg'),'utf8');
assert(targetSvg.includes('data-compact-chart-index="11" data-full-row-count="21"'),'target retest card renders all 21 matrix/trend rows');
assert(targetSvg.includes('data-compact-chart-index="13" data-full-row-count="18"'),'target release card renders all 18 cells / six gates');
const targetGateLegends=releaseGateLegendGeometry(targetSvg).filter((legend)=>legend.context==='compact');
assert(targetGateLegends.length===1&&validReleaseGateLegend(targetGateLegends[0]),'target release card six-state legend uses non-overlapping two-column three-row geometry');
assert(Math.max(...targetGateLegends[0].items.map((item)=>item.right))<=1440-24&&Math.max(...targetGateLegends[0].items.map((item)=>item.bottom))<=944,'target release legend remains inside the 1440 canvas and release card');
const d09Svg=readFileSync(join(root,'10-desktop-1440-D09-releases.svg'),'utf8');
const d09GateLegends=releaseGateLegendGeometry(d09Svg).filter((legend)=>legend.context==='standard');
const d09GateCells=[...d09Svg.matchAll(/data-gate-cell="true"[^>]*data-cell-y="([^"]+)"[^>]*data-cell-height="([^"]+)"/g)].map((match)=>({y:Number(match[1]),height:Number(match[2])}));
assert(d09GateLegends.length===1&&validReleaseGateLegend(d09GateLegends[0]),'D09 release page six-state legend uses non-overlapping two-column three-row geometry');
assert(Math.max(...d09GateLegends[0].items.map((item)=>item.right))<=1440-24&&Math.max(...d09GateLegends[0].items.map((item)=>item.bottom))<=640,'D09 release legend remains inside the 1440 canvas and release matrix card');
assert(d09GateCells.length===18&&Math.max(...d09GateCells.map((cell)=>cell.y+cell.height))+8<=Math.min(...d09GateLegends[0].items.map((item)=>item.top)),'D09 release legend clears the complete three-by-six gate matrix vertically');
const destinationFullRows=[
  ['10-desktop-1440-D09-releases.svg','13','18','D09 complete three environments x six gates'],
  ['10-desktop-1440-D10-sources.svg','16','12','D10 complete four subjects x three batches'],
  ['10-desktop-1440-D12-system-status.svg','15','28','D12 complete four projects x seven data domains']
];
for(const [file,index,count,message] of destinationFullRows){const svg=readFileSync(join(root,file),'utf8');assert(svg.includes(`data-compact-chart-index="${index}" data-full-row-count="${count}"`),message);}
const trainSvg=readFileSync(join(root,'03-desktop-1440-chart-atlas.svg'),'utf8');
const trainRows=[...trainSvg.matchAll(/data-plan-time="([^"]+)" data-actual-time="([^"]+)" data-plan-x="([^"]*)" data-actual-x="([^"]*)" data-plan-label-y="([^"]+)" data-actual-label-y="([^"]+)" data-meta-y="([^"]+)" data-row-baseline="([^"]+)"/g)].map((match)=>({plan:match[1],actual:match[2],planX:match[3],actualX:match[4],planLabelY:Number(match[5]),actualLabelY:Number(match[6]),metaY:Number(match[7]),baseline:Number(match[8])}));
assert(trainRows.length===3,'release timeline exposes three coordinate-auditable rows');
for(let index=1;index<trainRows.length;index+=1) assert(trainRows[index].planLabelY-trainRows[index-1].metaY>=14,`release timeline row ${index} plan label clears previous metadata`);
const atlasCards=[...atlas.matchAll(/data-atlas-card-index="([^"]+)" data-atlas-column="([^"]+)" data-card-y="([^"]+)" data-card-height="([^"]+)"/g)].map((match)=>({index:Number(match[1]),column:Number(match[2]),y:Number(match[3]),height:Number(match[4])}));
assert(atlasCards.length===19,'atlas has 19 auditable card placements');
const atlasBottoms=[];for(const column of [0,1]){const cards=atlasCards.filter((card)=>card.column===column).sort((a,b)=>a.y-b.y);for(let index=1;index<cards.length;index+=1)assert(cards[index].y-(cards[index-1].y+cards[index-1].height)>=16,`atlas column ${column} card gap`);atlasBottoms.push(cards.at(-1).y+cards.at(-1).height);}
assert(manifest.atlas_layout.canvas_height-Math.max(...atlasBottoms)===24,'atlas canvas trims tallest column to 24px bottom margin');
assert(Math.max(...atlasBottoms)-Math.min(...atlasBottoms)<=Math.max(...atlasCards.map((card)=>card.height))+16,'atlas greedy packing avoids structural blank column');
assert(manifest.atlas_layout?.strategy==='two-column shortest-column packing'&&manifest.atlas_layout?.placements?.length===19,'atlas shortest-column placement manifest');
const reflow=readFileSync(join(root,'07-reflow-720-200-percent.svg'),'utf8');
for(const section of ['导航完整回流','筛选与搜索','图表、图例与完整等价表','数据表／卡片回流','证据详情抽屉','只读动作与零写边界']) assert(reflow.includes(section),`200 percent complete reflow ${section}`);
const reflowAsset=assets.find((asset)=>asset.path.includes('200-percent'));
assert(reflowAsset?.pixel_size?.width===720&&reflowAsset?.pixel_size?.height===2600,'200 percent physical canvas 720x2600');
assert(reflowAsset?.logical_viewport?.width===360&&reflowAsset?.logical_viewport?.height===1300,'200 percent effective CSS viewport 360x1300');
assert(!JSON.stringify(manifest).includes('/Users/'),'manifest contains no local absolute macOS path');
assert(manifest.generator?.rasterization?.includes('explicit NODE_PATH candidate')&&manifest.generator?.rasterization?.includes('reproducibility requires'),'honest indirect sharp dependency and reproduction prerequisite');
assert(manifest.generator?.sharp_tooling_boundary?.includes('间接设计生成工具')&&manifest.generator?.sharp_tooling_boundary?.includes('不声明 package.json 所有权'),'honest sharp tooling ownership boundary');
assert(manifest.design_token_decisions?.warning_base==='#B65D0A'&&manifest.design_token_decisions?.warning_text_on_warning_soft==='#8A3F00','warning base and accessible warning text adjudication');

const prototypePath=join(root,'prototype.html');
assert(existsSync(prototypePath),'prototype exists');
if(existsSync(prototypePath)){
  const html=readFileSync(prototypePath,'utf8');
  assert((html.match(/data-index=/g)??[]).length===12,'prototype 12 route buttons');
  assert((html.match(/data-primary-group=/g)??[]).length===6,'prototype six primary groups');
  assert(html.includes('buttonByPageIndex=new Map')&&html.includes('const pageIndex=Number(button.dataset.index)')&&html.includes('buttonByPageIndex.get(index).setAttribute'), 'prototype route click keyboard and aria-current use explicit data-index mapping');
  assert(!html.includes('buttons.forEach((button,index)=>'),'prototype does not use DOM NodeList order as business page index');
  assert(html.includes('CC-UI-002 设计评审工具栏')&&html.includes('不属于产品导航'),'prototype outer shell is a review toolbar, not a second product shell');
  assert(html.includes('h1 id="page-title"')&&html.includes('document.body.dataset.pageIndex')&&html.includes('document.body.dataset.dataMode'),'prototype exposes auditable H1 page index and dataMode');
  assert(html.includes('aria-live="polite"'),'prototype aria-live');
  assert(html.includes(':focus-visible'),'prototype focus-visible');
  assert(html.includes('outline:2px solid var(--focus)'),'prototype 2px focus ring');
  for(const control of ['project-filter','time-filter','iteration-filter','source-filter','search-input','chart-mark','issue-retest','release-gate','status-source','clear-filter','close-drawer','copy-sha','copy-error','result-count','result-list','interactive-chart','interactive-table-body','chart-context']) assert(html.includes(`id="${control}"`),`prototype control ${control}`);
  assert(html.includes('ArrowRight')&&html.includes('ArrowLeft'),'prototype keyboard route navigation');
  assert(html.includes('screen-390')&&html.includes('screen-320'),'prototype responsive asset sources');
  assert(html.includes('30-mobile-390-')&&html.includes('31-mobile-320-'),'prototype mobile asset mapping');
  assert(html.includes('id="mobile-bottom-nav"')&&html.includes('id="mobile-more-menu"')&&html.includes('data-mobile-page="0"')&&html.includes('data-mobile-page="1"')&&html.includes('data-mobile-page="7"'),'prototype has visible mobile bottom navigation and more menu destinations');
  for(const label of ['总览','项目','质量','更多'])assert(html.includes(`>${label}</button>`),`prototype mobile bottom navigation label ${label}`);
  assert(html.includes('问题与复测证据')&&html.includes('发布门禁证据')&&html.includes('来源错误详情'),'prototype critical drilldown flows');
  assert(html.includes('function renderQuery(')&&html.includes('rows.length')&&html.includes('resultList.innerHTML'),'prototype filters/search update visible result set');
  assert(html.includes('record.ageHours<=24')&&html.includes('record.iteration===iteration')&&html.includes('record.sourceMode===source'),'prototype time iteration and source mode participate in record filtering');
  for(const mode of ['current_unavailable','evidenced_empty','target_demo','stale_snapshot']) assert(html.includes(`"dataMode":"${mode}"`),`prototype page data mode ${mode}`);
  assert(html.includes('function eligibleRecordsForMode(mode)')&&html.includes("mode==='stale_snapshot'")&&html.includes("record.truth==='上次快照，已过期'")&&html.includes("record.truth==='目标态演示数据'"),'prototype page-level truth builds eligible records before filters');
  assert(html.includes('dataMode=pages[activePageIndex].dataMode')&&html.includes("evidencedEmpty=dataMode==='evidenced_empty'"),'prototype query and export consume page-level truth mode');
  assert(html.includes("type:'事件',name:'目标态审计事件'")&&html.includes("type:'问题',name:'目标态复测证据'")&&html.includes("truth:'目标态演示数据'"),'prototype target-demo event and issue/retest records remain inside the same target truth mode');
  assert(html.includes("type:'产物',name:'目标态发布完整性设计产物'")&&html.includes("type:'产物',name:'历史视觉母版'")&&html.includes("record.truth==='目标态演示数据'"),'prototype artifact page has a target-demo artifact while historical artifacts remain truth-isolated');
  assert(html.includes('审批查询成功，确实为空')&&html.includes('范围已锁定')&&html.includes('CC-审批登记-只读快照-001'),'prototype approval success-empty exposes locked source evidence and excludes existing records');
  assert(html.includes('async function sha256Hex(value)')&&html.includes('function currentEmptyEvidenceSeed()')&&html.includes('await sha256Hex(currentEmptyEvidenceSeed())'),'prototype evidenced-empty export hashes the current query scope');
  assert(html.includes("approvalSourceEvidence.source_sha256")&&html.includes("document.querySelector('#export-scope-hash').textContent=scopeHash"),'prototype export separates source SHA from query scope SHA');
  assert(html.includes("controls=['project-filter','time-filter','iteration-filter','source-filter','search-input','search-submit','clear-filter']")&&html.includes("dataMode==='evidenced_empty'"),'prototype non-evidence approval scopes are locked and disabled');
  assert(html.includes('查询范围变化后')===false,'prototype contains no test-only user copy');
  assert(html.includes('目标态、历史与陈旧记录已排除'),'prototype current fact excludes demo history stale records and export');
  assert(html.includes("[...new Set(rows.map((record)=>record.error))]")&&html.includes('来源解析失败（SOURCE_PARSE_FAILED）')&&html.includes('连接器未接通（CONNECTOR_NOT_READY）'),'prototype stale export preserves visible source and connector errors');
  assert(html.includes("pages[activePageIndex].dataMode==='stale_snapshot'?'静态回退':'正式来源'"),'prototype clear-filter restores page-default static fallback for stale pages');
  for(const role of ['00 包工头','01 市场调研','02 项目经理','03 产品经理','04 UI/UX','05 架构师','06 前端','07 后端','08 数据','09 审查','10 QA','11 DevOps']) assert(html.includes(role),`prototype search data includes fixed role ${role}`);
  assert(html.includes('result-group')&&html.includes('record.updatedAt'),'prototype results group by object type and display updated time');
  assert(html.includes('data-chart-type')&&html.includes('crossFilter===type?\'\':type'),'prototype chart point toggles and clears same cross-filter');
  assert(html.includes('renderInteractive(baseRows,rows,dataMode)')&&html.includes('interactiveTable.innerHTML'),'prototype chart and equivalent table share filtered rows');
  assert(html.includes('function syncUrl({push=false}={})')&&html.includes('function restoreFromUrl()')&&html.includes("url.searchParams.set")&&html.includes("history[push?'pushState':'replaceState']")&&html.includes("window.addEventListener('popstate'"),'prototype URL push/replace, forward/back and filter context restoration');
  for(const field of ['export-preview','export-filters','export-source','export-hash','export-scope-hash','export-error','export-time','export-truth','export-records']) assert(html.includes(`id="${field}"`),`prototype visible export preview field ${field}`);
  for(const copy of ['当前查询导出预览','来源哈希','生成时间','真实性标签','new Date().toISOString()']) assert(html.includes(copy),`prototype visible export preview content ${copy}`);
  assert((html.match(/aria-controls="drawer"/g)??[]).length>=5&&html.includes('setDrawerExpanded(trigger)'),'prototype drawer aria-controls and expanded state');
  assert(html.includes("event.key==='Escape'")&&html.includes('lastTrigger.focus()'),'prototype drawer Escape close and focus return');
  assert(html.includes('closeMobileMore({returnFocus:true})')&&html.includes('focusTitle:fromMore')&&html.includes('if(focusTitle)title.focus()'),'prototype mobile More close/selection restores focus to toggle or destination H1');
  assert(html.includes("if(drawer.dataset.open==='true')closeEvidence({returnFocus:false,announceClose:false})"),'prototype page switch clears drawer');
  assert(html.includes('错误名称：来源解析失败（SOURCE_PARSE_FAILED）'),'prototype Chinese error name with internal code secondary');
  assert(html.includes('06-mobile-320-source-stale.png'),'prototype 390/320 stale truth pairing');
  assert(html.includes('真实读取器尚未接通'),'prototype readonly refresh boundary');
  assert(html.includes('复制权威 Prompt SHA256')&&html.includes('caafe53a51a77283c363483bf34b9dba843f5a1add8d7fd17c9d74a1d336570e'),'prototype copies an actual 64-character SHA256 with accurate label');
  assert(html.includes('function syncMarkAvailability(dataMode,hasMarks=false)')&&html.includes('control.hidden=disabled')&&html.includes("syncMarkAvailability(page.dataMode,false)")&&html.includes('标记下钻已禁用'),'prototype page switch and no-mark states synchronously disable and hide fake chart interactions');
  assert(html.includes("const markType=pages[activePageIndex].markType")&&html.includes("crossFilter=crossFilter===markType?'':markType"),'prototype chart-mark action follows the current page object context instead of a hard-coded problem type');
  assert(html.includes('index>=1&&index<=6?1:index===7?7:null')&&html.includes("mobileMoreToggle.setAttribute('aria-current','page')"),'prototype mobile bottom navigation maps pages 2–6 to 项目, page 7 to 质量, and pages 8–11 to 更多');
  const script=html.match(/<script>([\s\S]*)<\/script>/)?.[1]??'';
  try{new Function(script);}catch(error){assert(false,`prototype script syntax ${error.message}`);}
  assert(sha(prototypePath)===manifest.clickable_prototype.sha256,'prototype sha');
}

const browserEvidence=JSON.parse(readFileSync(join(root,'browser-evidence.json'),'utf8'));
const browserPassed=browserEvidence.status==='passed',browserPending=String(browserEvidence.status).startsWith('pending');
assert(browserPassed||browserPending,'browser evidence status is passed or honestly pending');
if(browserPassed){
  assert(browserEvidence.prototype_sha256===sha(prototypePath),'browser evidence prototype sha matches current prototype');
  assert(browserEvidence.generator_sha256===sha(join(root,'generate-assets.mjs')),'browser evidence generator sha matches current generator');
  assert(browserEvidence.browser_checker_sha256===sha(join(root,'verify-prototype-browser.mjs')),'browser evidence checker sha matches current checker');
  assert(Array.isArray(browserEvidence.cases)&&browserEvidence.cases.length>=11&&browserEvidence.cases.every((item)=>item.status==='passed'),'browser evidence has per-use-case pass facts');
}else{
  assert(browserEvidence.prototype_sha256==='pending'&&browserEvidence.generator_sha256==='pending'&&browserEvidence.browser_checker_sha256==='pending','pending browser evidence does not retain stale current candidate hashes');
}
assert(browserEvidence.independent_visual_review==='pending','browser evidence does not self-approve independent review');

const luminance=(hex)=>{const rgb=hex.slice(1).match(/.{2}/g).map((v)=>parseInt(v,16)/255).map((v)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
const contrastPairs=[['未知文字／浅灰底','#475467','#EEF1F5'],['警告文字／警告浅底','#8A3F00','#FFF4E8'],['次文字／白底','#5E6A66','#FFFFFF'],['主操作／白字','#3347B8','#FFFFFF']];
for(const [name,fg,bg] of contrastPairs)assert(contrast(fg,bg)>=4.5,`${name} contrast ${contrast(fg,bg).toFixed(2)}`);

assert(existsSync(join(root,'00-ai-visual-direction-current-not-ready.png')),'image_gen visual direction asset');
assert(sha(join(root,'00-ai-visual-direction-current-not-ready.png'))===manifest.ai_visual_direction_asset.sha256,'image_gen asset sha');

if(failures.length){console.error(failures.map((item)=>`FAIL ${item}`).join('\n'));process.exit(1);}

manifest.status=browserPassed?'machine-and-browser-passed-awaiting-independent-visual-review':'machine-passed-awaiting-root-browser-and-independent-visual-review';
manifest.review.machine_validation='passed';
manifest.review.visual_inspection='fixed-04 prior full 36-PNG original review; fixed-00 reviewed current 02/03 assets; independent reviewer reviewed current 02/03/D09 assets with visual P0/P1=0; final independent decision pending governance closure';
manifest.review.independent_visual_review='pending new independent review';
manifest.review.browser_validation=browserPassed?'passed for current prototype/generator/checker hashes':'pending root-level rerun for current candidate';
manifest.review.machine_checks=[
  '36 generated PNG signatures/dimensions/SHA256 match manifest',
  '36 SVG SHA256, unique title/desc ids and aria-labelledby targets; every user-visible SVG text is >=12px and an 11px negative fixture is rejected',
  '12 desktop P0 pages, 4 tablet pages, 8 paired mobile groups/16 assets',
  '19 chart-specific authored structures, authoritative dimension mappings, expected mark cardinalities, actual unit/legend and trace fields, and one chart atlas',
  'release-gate six-state legends use two-column three-row geometry in target summary, chart 14 and D09 release page; bounds, matrix clearance, trace-column clearance and an overflowing single-line negative fixture are checked',
  '19 normalized source payloads are embedded; each source SHA256 is recomputed from exact source identity, mapping and rows, and a mutated-row negative assertion proves the hash changes',
  '19 chart structural dimensions include fourfold stage encoding, artifact_count and approval badges, project x truth tracks, role x project, handoff IDs/edges, project-identified aging buckets, four approval series with non-color patterns and offset labels, exact five artifact states, full-time project-role event lanes plus result glyphs, fixed-size issue-count marks, severity/retest matrix plus three line/point-shape trend encodings, three-series burn with non-color patterns, 3x6 release gates, release plan/actual timestamp-proportional positions plus version/commit/status, 4x7 coverage, 4x3 freshness with per-cell times, evidence-discontinuous 6x3 maturity, and spaced evidence IDs/edges',
  '19 chart visual-mark and equivalent-table field/value/status sets are bidirectionally equal',
  'each chart includes non-placeholder unit, legend, filter, source, coverage, freshness, observation time and root_head values marked as target-state demo',
  'not-ready/unknown renders no marks and never infers evidenced zero; empty is reserved for successful evidenced zero',
  'target summary and D09/D10/D12 compact cards retain full source-model rows without Math.min truncation',
  '12 desktop pages expose project/time/iteration/source/search/refresh/export controls',
  'design system includes input, Toast and loading state',
  '240px desktop sidebar; button/input hover/pressed/disabled/error states and motion tokens',
  'mobile authored font floor 14px; body tokens authored at 16px; empty uses distinct success-empty token; every 320 key page includes zero-write boundary; maturity mobile views expose six dimensions plus rule/sample/missing metadata with auditable line gaps; static bottom navigation has one mapped current item',
  '390/320 source pages share stale truth, failure reason and Chinese error name',
  '200% authored physical font floor 28px and 720→360 complete reflow covering navigation, filters, legend, chart/table, drawer and actions',
  'no bare internal truth-state keys in visible SVG text',
  'four critical text/background contrast pairs >=4.5:1',
  'prototype 12 route buttons with current-unavailable/evidenced-empty/target-demo/stale-snapshot data modes, target-demo event, issue/retest and artifact records with historical truth isolation, project/time/iteration/source/search participating after page-level eligibility, stale clear restoring static fallback, 00–11 role search grouped by object type with update time, dynamic contextual chart/equivalent-table/export sharing rows, stale error preservation, evidenced-empty source identity/status/observed_at plus separate source/query SHA256 and locked scope, same-point cross-filter toggle, URL push/replace/popstate restoration, visible export preview with filters/source/hashes/error/time/truth, mobile bottom navigation mapping for all 12 destinations, three critical drilldowns, accurate 64-character Prompt SHA256 copy, drawer and mobile More focus return, paired stale mobile assets, arrow-key navigation, 2px focus-visible, aria-live and readonly boundary structure'
  ,'manifest has no local absolute path; sharp reproduction boundary declares installed dependency graph or explicit NODE_PATH candidate'
];
manifest.review.machine_boundary='File integrity plus authored SVG/HTML structure only. The gate proves shared field/value/status sets, normalized source hashes, declared controls, font floors and static attributes; it does not by itself prove browser reflow, keyboard order, screen-reader utterances, aria-live timing or real service behavior. Root-level browser interaction and independent visual review remain separate and are never inferred from this pass.';
const aggregateEntries=[
  ...assets.flatMap((asset)=>[[asset.path,join(root,asset.path.split('/').at(-1))],[asset.source_svg,join(root,asset.source_svg.split('/').at(-1))]]),
  ['ui/release-completeness-v1.0/00-ai-visual-direction-current-not-ready.png',join(root,'00-ai-visual-direction-current-not-ready.png')],
  ['ui/release-completeness-v1.0/prototype.html',prototypePath],
  ['ui/release-completeness-v1.0/generate-assets.mjs',join(root,'generate-assets.mjs')],
  ['ui/release-completeness-v1.0/verify-assets.mjs',join(root,'verify-assets.mjs')],
  ['ui/release-completeness-v1.0/verify-prototype-browser.mjs',join(root,'verify-prototype-browser.mjs')],
  ['ui/release-completeness-v1.0/generation-prompts.md',join(root,'generation-prompts.md')],
  ['ui/03-release-completeness-ui-design-v1.0.md',join(root,'../03-release-completeness-ui-design-v1.0.md')],
  ['ui/02-release-completeness-ui-prompt.md',join(root,'../02-release-completeness-ui-prompt.md')]
].map(([path,file])=>({path:path.normalize('NFC'),sha256:sha(file)})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
const aggregatePayload=aggregateEntries.map((entry)=>`${entry.path}\t${entry.sha256}`).join('\n')+'\n';
manifest.content_aggregate={
  algorithm:'UTF-8 NFC relative path + TAB + lowercase SHA256 per line; sort by relative-path code point; terminal LF; SHA256 over the complete line set',
  file_count:aggregateEntries.length,
  exclusions:['manifest.json (avoids self-reference)','browser-evidence.json (mutable root-level review evidence)','workflow review ledgers'],
  sha256:createHash('sha256').update(aggregatePayload,'utf8').digest('hex')
};
writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`,'utf8');
console.log(`PASS ${assets.length} assets; desktop=${desktopP0.length}; tablet=${tablet.length}; mobile=${mobile.length}; charts=19; prototype=12 routes`);
