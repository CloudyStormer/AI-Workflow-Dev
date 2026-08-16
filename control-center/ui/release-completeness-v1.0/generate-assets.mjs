import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const projectRequire=createRequire(new URL('../../package.json',import.meta.url));
const runtimeRequire=createRequire(join(dirname(dirname(process.execPath)),'package.json'));
const resolveTool=(name)=>{for(const resolver of [projectRequire,runtimeRequire]){try{return resolver(name);}catch{}}throw new Error(`无法解析设计工具 ${name}；请使用工作区依赖或与运行时同目录的 node_modules。`);};
const sharp=resolveTool('sharp');
const SHARP_TOOLING_BOUNDARY='sharp 为工作区依赖图或当前 Node 运行时同目录 node_modules 中的间接设计生成工具；本交付不声明 package.json 所有权。复跑者须提供与锁文件兼容的工作区依赖或同运行时工具候选。';

const root = dirname(fileURLToPath(import.meta.url));
mkdirSync(root, { recursive: true });

const C = {
  page: '#F3F5F8', card: '#FFFFFF', sidebar: '#171B4B', primary: '#3347B8',
  info: '#2563EB', success: '#087E68', warningBase: '#B65D0A', warning: '#8A3F00', danger: '#B42318',
  demo: '#6D28D9', unknown: '#475467', text: '#17201D', secondary: '#5E6A66',
  border: '#D8DFE3', soft: '#EEF1F5', purpleSoft: '#F3EEFF', blueSoft: '#EAF2FF',
  warnSoft: '#FFF4E8', dangerSoft: '#FDECEC', successSoft: '#E8F7F3'
};

const routes = [
  ['总览', '/overview'], ['项目与阶段', '/projects'], ['项目证据详情', '/projects/:projectId'],
  ['固定角色协作', '/roles'], ['审批与待审', '/approvals'], ['产物与哈希', '/artifacts'],
  ['事件审计', '/events'], ['问题、Bug 与复测', '/issues'], ['迭代与发布', '/releases'],
  ['来源、覆盖与新鲜度', '/sources'], ['成熟度与治理', '/maturity'], ['系统状态与恢复', '/system-status']
];

const charts = [
  '项目×阶段矩阵', '单项目阶段轨道', '项目真实性四轨', '角色×项目占用矩阵', '角色交接泳道',
  '待审老化分布', '审批结果趋势', '产物覆盖与哈希矩阵', '事件审计时间线', '问题严重度×状态堆叠柱',
  '问题老化分布', '复测趋势与矩阵', '迭代燃尽／累积流', '发布门禁证据矩阵', '发布列车时间线',
  '来源覆盖矩阵', '新鲜度热力图', '成熟度证据矩阵与趋势', '选中记录证据链'
];

const nav = ['总览', '项目与阶段', '角色协作', '质量与复测', '迭代与发布', '成熟度与治理'];

const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const canonicalJson = (value) => JSON.stringify(value);
const rect = (x, y, w, h, fill = C.card, stroke = C.border, r = 12, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke = C.border, width = 1, dash = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const text = (x, y, value, size = 16, weight = 400, fill = C.text, anchor = 'start', extra = '') => {
  const visibleSize = Math.max(12, Number(size) || 12);
  return `<text x="${x}" y="${y}" font-size="${visibleSize}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="middle" ${extra}>${esc(value)}</text>`;
};
const pill = (x, y, label, fill, color, width = Math.max(72, label.length * 15 + 24), height = 30, fontSize = 13) =>
  `${rect(x, y, width, height, fill, fill, height / 2)}${text(x + width / 2, y + height / 2 + 1, label, fontSize, 650, color, 'middle')}`;
const dot = (cx, cy, color, r = 5) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;

function openSvg({ width, height, id, title, description }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title ${id}-desc">
  <title id="${id}-title">${esc(title)}</title>
  <desc id="${id}-desc">${esc(description)}</desc>
  <rect width="${width}" height="${height}" fill="${C.page}"/>
  <style>text{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif} .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}</style>`;
}

const closeSvg = '</svg>\n';

function sidebar(height, selected = 0, selectedSecondary = 0, width = 240) {
  let out = `<rect width="${width}" height="${height}" fill="${C.sidebar}"/>`;
  out += text(24, 38, 'AI 工作流控制中心', 20, 700, '#FFFFFF');
  out += text(24, 66, '只读监管 · 零写', 14, 500, '#C9D2FF');
  nav.forEach((label, index) => {
    const y = 100 + index * 42;
    if (index === selected) out += rect(14, y - 17, width - 28, 36, '#35458E', '#35458E', 9, `data-primary-nav-index="${index}"`);
    out += `<circle cx="34" cy="${y + 1}" r="8" fill="none" stroke="${index === selected ? '#FFFFFF' : '#AEB8E8'}" stroke-width="2"/>`;
    out += text(52, y + 1, label, 14, index === selected ? 700 : 500, index === selected ? '#FFFFFF' : '#D4DAF6');
  });
  out += text(24, 362, '12 个目的页', 12, 700, '#AEB8E8');
  routes.forEach(([label], index) => {
    const y = 386 + index * 34;
    if (index === selectedSecondary) out += rect(14, y - 14, width - 28, 28, '#2B356F', '#5261A4', 7, `data-secondary-route-index="${index}"`);
    out += text(30, y, `${String(index + 1).padStart(2, '0')} ${label}`, 12, index === selectedSecondary ? 700 : 500, index === selectedSecondary ? '#FFFFFF' : '#C9D2FF');
  });
  out += line(18, height - 66, width - 18, height - 66, '#39406D');
  out += text(24, height - 43, '来源诊断', 13, 650, '#FFFFFF');
  out += text(24, height - 21, '当前事实 · 未接通', 12, 500, '#C9D2FF');
  return out;
}

function globalTopbar(x,y,w,mode='current'){
  let out=rect(x,y,w,62,C.card,C.border,10);
  const evidence=mode==='evidence',controls=evidence?[['项目：全部锁定',104],['时间：近30天锁定',116],['迭代：全部锁定',104],['来源：审批登记',104]]:[['项目：全部',104],['时间：近30天',116],['迭代：全部',104],['来源：正式',104]];
  let cx=x+12;controls.forEach(([label,width])=>{out+=rect(cx,y+8,width,24,C.soft,C.border,6,evidence?'stroke-dasharray="3 2"':'');out+=text(cx+width/2,y+20,label,12,650,evidence?C.secondary:C.text,'middle');cx+=width+8;});
  out+=rect(cx,y+8,176,24,evidence?C.soft:C.card,C.border,6,evidence?'stroke-dasharray="3 2"':'');out+=text(cx+12,y+20,evidence?'范围已锁定，不可搜索':'搜索项目、角色、证据',12,500,C.secondary);cx+=184;
  out+=pill(cx,y+8,'只读刷新',C.blueSoft,C.info,92,24,12);cx+=100;out+=pill(cx,y+8,'导出当前查询',C.soft,C.primary,124,24,12);
  const values=evidence?['来源状态：可用','范围：已锁定','记录：0','来源SHA：见证据','工作树：不适用','观测：01:40']:mode==='demo'?['健康：示例','就绪：示例','覆盖：示例','根仓提交：示例','工作树：示例','观测：示例']:['健康：未知','就绪：未就绪','覆盖：不可用','根仓提交：—','工作树：未知','观测：—'];
  values.forEach((value,i)=>out+=text(x+14+i*(w-28)/6,y+48,value,12,600,i===1?C.info:C.secondary));
  return out;
}

function truthBar(x, y, width, kind, titleValue, detail) {
  const config = {
    not_ready: [C.blueSoft, C.info, '○'], degraded: [C.warnSoft, C.warning, '△'],
    stale: [C.purpleSoft, C.demo, '◷'], failed: [C.dangerSoft, C.danger, '×'],
    live_demo: [C.purpleSoft, C.demo, '◇'], empty: [C.successSoft, C.success, '□'], unknown: [C.soft, C.unknown, '?']
  }[kind];
  const mobile = width < 400;
  let out = rect(x, y, width, 58, config[0], config[1], 10, `stroke-width="1.5"`);
  out += text(x + 22, y + 29, config[2], 21, 700, config[1]);
  out += text(x + 52, y + 20, titleValue, mobile ? 16 : 15, 750, C.text);
  out += text(x + 52, y + 40, detail, mobile ? 14 : 12, 500, C.secondary);
  return out;
}

function cardTitle(x, y, titleValue, meta = '', metaSize = 12) {
  let out = text(x, y, titleValue, 17, 720, C.text);
  if (meta) out += text(x + 4, y + 26, meta, metaSize, 500, C.secondary);
  return out;
}

function miniStatusCard(x, y, w, label, status, kind = 'unknown') {
  const cfg = { unknown: [C.soft, C.unknown], not_ready: [C.blueSoft, C.info], degraded: [C.warnSoft, C.warning], demo: [C.purpleSoft, C.demo], empty: [C.successSoft,C.success] }[kind];
  let out = rect(x, y, w, 92);
  out += text(x + 16, y + 23, label, 13, 650, C.secondary);
  out += text(x + 16, y + 52, status, 24, 760, C.text);
  out += pill(x + 16, y + 66, kind === 'demo' ? '目标态演示' : kind === 'degraded' ? '降级可用' : kind === 'not_ready' ? '未就绪' : kind === 'empty' ? '确实为空' : '未知', cfg[0], cfg[1], 92, 22);
  return out;
}

function matrix(x, y, w, h, mode = 'unknown') {
  let out = rect(x, y, w, h);
  out += cardTitle(x + 18, y + 25, '项目 × 阶段矩阵', mode === 'unknown' ? '覆盖不可用时不补进度' : '目标态演示数据 · 非当前事实');
  const left = x + 94, top = y + 72, cw = (w - 116) / 11, rh = (h - 104) / 4;
  ['控制中心', '英语学习', '职业雷达', '模型雷达'].forEach((p, ri) => {
    out += text(x + 18, top + ri * rh + rh / 2, p, 12, 650, C.text);
    for (let ci = 0; ci < 11; ci += 1) {
      const fill = mode === 'unknown' ? C.soft : ci < 4 + ri ? '#DDE4FF' : ci === 4 + ri ? '#BFCBFF' : '#F2F4F7';
      out += rect(left + ci * cw, top + ri * rh, cw - 4, rh - 4, fill, C.border, 4);
      out += text(left + ci * cw + (cw - 4) / 2, top + ri * rh + (rh - 4) / 2, mode === 'unknown' ? '—' : String(ci), 10, 650, mode === 'unknown' ? C.unknown : C.primary, 'middle');
    }
  });
  return out;
}

function sourceTable(x, y, w, h, mode = 'not_ready') {
  let out = rect(x, y, w, h);
  const mobile = w < 400;
  out += cardTitle(x + 18, y + 25, '来源、覆盖与新鲜度', '源更新时间与本次观测时间分开展示', mobile ? 14 : 12);
  const rows = ['项目', '角色', '审批', '产物', '事件', '问题', '发布'];
  rows.forEach((label, i) => {
    const rowStep=mobile?27:31,yy = y + (mobile ? 76 : 64) + i * rowStep;
    out += text(x + 18, yy, label, mobile ? 16 : 12, 650, C.text,'start',`data-source-row="${label}" data-source-row-y="${yy}"`);
    out += text(x + (mobile ? 104 : 104), yy, mode === 'stale' ? (i < 4 ? '上次快照' : '覆盖不可用') : '未就绪', mobile ? 16 : 12, 600, mode === 'stale' ? C.demo : C.info);
    out += text(x + w - 18, yy, mode === 'stale' ? '16:40' : '—', mobile ? 14 : 11, 500, C.secondary, 'end', 'class="mono"');
    if (i < rows.length - 1) out += line(x + 18, yy + (mobile?13:16), x + w - 18, yy + (mobile?13:16), '#EDF0F2');
  });
  return out;
}

function buildDesktopCurrent() {
  const width = 1440, height = 1024;
  let s = openSvg({ width, height, id: 'cc-current-1440', title: 'AI 工作流控制中心桌面当前事实未就绪设计', description: '1440桌面总览，展示只读监管、当前未就绪、未知值与来源诊断。' });
  s += sidebar(height, 0);
  const x = 256, contentW = width - x - 24;
  s += text(x, 40, '总览', 28, 760);
  s += pill(width - 168, 24, '只读监管 · 零写', C.soft, C.primary, 144, 34);
  s += globalTopbar(x, 68, contentW, 'current');
  s += truthBar(x, 142, contentW, 'not_ready', '当前事实 · 数据未就绪', '真实监管后端未实现 · 工作流读取器未实现 · 正式数据联调未完成');
  const cardW = (contentW - 48) / 4;
  ['成功观测项目','待审记录','问题覆盖','成熟度'].forEach((label, i) => { s += miniStatusCard(x + i * (cardW + 16), 214, cardW, label, '—', label === '成功观测项目' ? 'not_ready' : 'unknown'); });
  s += matrix(x, 322, 690, 330, 'unknown');
  s += semanticChartCard(x + 706, 322, contentW - 706, 330, 5, 'not_ready');
  s += sourceTable(x, 668, 520, 260, 'not_ready');
  s += semanticChartCard(x + 536, 668, 350, 260, 9, 'not_ready');
  s += rect(x + 902, 668, contentW - 902, 260);
  s += cardTitle(x + 920, 693, '证据抽屉', '当前选中：来源诊断');
  ['来源路径：—','源 SHA256：—','根仓提交：—','本次观测：尚无有效记录','影响范围：全部正式统计'].forEach((v, i) => s += text(x + 920, 738 + i * 31, v, 12, i === 4 ? 650 : 500, i === 4 ? C.warning : C.secondary));
  s += pill(x + 920, 882, '只读重新读取', C.blueSoft, C.info, 126, 34);
  s += text(x, 970, '未知不等于 0 · 健康不等于就绪 · 页面无批准、发布、修复或 Git 写入口', 13, 650, C.secondary);
  return s + closeSvg;
}

function buildDesktopTarget() {
  const width = 1440, height = 1024;
  let s = openSvg({ width, height, id: 'cc-target-1440', title: 'AI 工作流控制中心桌面目标态演示设计', description: '1440桌面目标态演示总览，所有示例数据明确隔离，不代表当前运行事实。' });
  s += sidebar(height, 0);
  const x = 256, contentW = width - x - 24;
  s += text(x, 40, '总览 · 目标态', 28, 760);
  s += pill(width - 182, 24, '目标态演示数据', C.purpleSoft, C.demo, 158, 34);
  s += globalTopbar(x, 68, contentW, 'demo');
  s += truthBar(x, 142, contentW, 'live_demo', '目标态演示 · 非当前运行事实', '示例仅验证布局；正式模式当前仍无真实观测，不计入真实统计');
  const cardW = (contentW - 48) / 4;
  [['成功观测项目','3 / 4'],['待审记录','7'],['问题覆盖','部分'],['成熟度','暂不计算']].forEach(([a,b],i)=>{s+=miniStatusCard(x+i*(cardW+16),214,cardW,a,b,b==='暂不计算'?'unknown':'demo');});
  s += matrix(x, 322, 690, 330, 'demo');
  s += semanticChartCard(x + 706, 322, contentW - 706, 330, 5, 'demo');
  s += sourceTable(x, 656, 520, 288, 'stale');
  s += semanticChartCard(x + 536, 656, 350, 288, 11, 'demo');
  s += semanticChartCard(x + 902, 656, contentW - 902, 288, 13, 'demo');
  s += text(x, 970, '每张图都带“目标态演示数据”标识，并可切换到完整等价表。', 13, 650, C.demo);
  return s + closeSvg;
}

const projectStageRows=[
  ['控制中心',3,'提示词已批准'],['英语学习',4,'设计已批准'],['职业雷达',3,'设计待审'],['模型雷达',2,'提示词已批准']
].flatMap(([project,currentStage,approval])=>Array.from({length:11},(_,stage)=>[
  `${project}·阶段${stage}`,
  stage<currentStage?'完成':stage===currentStage?'当前':'待开始',
  stage===currentStage?`审批：${approval}`:'审批：—'
]));
const issueStackRows=[
  ['待修',[1,2,1,1]],['修复中',[1,1,2,1]],['待复测',[1,2,1,1]],['已关闭',[1,1,2,2]]
].flatMap(([status,counts])=>['P0','P1','P2','P3'].map((severity,index)=>[`${status}·${severity}`,String(counts[index]),`状态：${status}`]));
const burnRows=[
  ['第1日',[10,8,10]],['第2日',[7,6,11]],['第3日',[4,5,11]]
].flatMap(([day,values])=>['理想剩余','实际剩余','范围总量'].map((series,index)=>[`${day}·${series}`,String(values[index]),index===2?'范围变化':'工作量']));
const releaseGateRows=[
  ['v1.0·本地',['通过','通过','待证据','待证据','待证据','非发布']],
  ['v1.0-rc·候选',['通过','阻塞','待证据','待证据','待证据','未授权']],
  ['v1.0·生产',['未执行','未执行','未执行','未执行','未执行','冻结']]
].flatMap(([environment,statuses])=>['构建','测试','安全','回滚','监控','授权'].map((gate,index)=>[`${environment}·${gate}`,statuses[index],`门禁：${gate}`]));
const coverageRows=[
  ['控制中心',['完整','完整','完整','部分','部分','错误','未知']],
  ['英语学习',['完整','完整','完整','完整','部分','部分','未知']],
  ['职业雷达',['完整','完整','完整','完整','完整','部分','未知']],
  ['模型雷达',['完整','完整','完整','完整','部分','未知','未知']]
].flatMap(([project,statuses])=>['项目','角色','审批','产物','事件','问题','发布'].map((domain,index)=>[`${project}·${domain}`,statuses[index],`数据域：${domain}`]));
const freshnessRows=[
  ['控制中心·审批',['当前','陈旧','未知']],['英语学习·事件',['当前','当前','陈旧']],
  ['职业雷达·问题',['陈旧','未知','未知']],['模型雷达·发布',['错误','未知','未知']]
].flatMap(([subject,statuses])=>['批次1','批次2','批次3'].map((batch,index)=>[`${subject}·${batch}`,statuses[index],`观测：${index===0?'16:40':index===1?'15:10':'—'}`]));
const maturityRows=[
  ['角色与职责',[1,2,2]],['阶段与审批',[1,2,2]],['产物可追溯',[1,2,2]],
  ['自动化执行',[0,1,1]],['测试与评测',[0,1,1]],['可观测与成本',[0,0,0]]
].flatMap(([dimension,levels])=>['迭代1','迭代2','迭代3'].map((iteration,index)=>[`${dimension}·${iteration}`,levels[index]===0?'证据不足':`等级${levels[index]}`,`规则R1；样本${levels[index]===0?0:6+index}；缺失${levels[index]===0?3:0}`]));
const truthTrackRows=[
  ['控制中心',['演示可浏览','未实现','未就绪','未授权']],['英语学习',['演示可浏览','未实现','未就绪','未授权']],
  ['职业雷达',['演示可浏览','未实现','未就绪','未授权']],['模型雷达',['演示可浏览','未实现','未就绪','未授权']]
].flatMap(([project,statuses])=>['前端','后端','真实数据','生产'].map((track,index)=>[`${project}·${track}`,statuses[index],`轨道：${track}`]));
const fixedRoles=['00 包工头','01 市场调研','02 项目经理','03 产品经理','04 UI/UX','05 架构师','06 前端','07 后端','08 数据','09 审查','10 QA','11 DevOps'];
const roleProjectRows=fixedRoles.flatMap((role,roleIndex)=>['控制中心','英语学习','职业雷达','模型雷达'].map((project,projectIndex)=>{
  const active=(roleIndex===0&&projectIndex===0)||(roleIndex===4&&projectIndex===0)||(roleIndex===9&&projectIndex===2)||(roleIndex===10&&projectIndex===1);
  const blocked=roleIndex===7&&projectIndex===3;
  return [`${role}·${project}`,blocked?'阻塞':active?(roleIndex===9?'待审':roleIndex===10?'排队':'执行中'):'—',blocked?'等待上游证据':active?'有登记':'无记录'];
}));
const approvalAgingBuckets=[['0–1天','2–3天','时间未知'],['2–3天','0–1天','时间未知'],['0–1天','时间未知','2–3天'],['时间未知','2–3天','0–1天']];
const approvalAgingRows=['控制中心','英语学习','职业雷达','模型雷达'].flatMap((project,projectIndex)=>['提示词审核','设计审核','代码／测试审核'].map((gate,gateIndex)=>[
  `${project}·${gate}`,
  String([[1,0,1],[0,1,0],[1,1,0],[0,0,1]][projectIndex][gateIndex]),
  approvalAgingBuckets[projectIndex][gateIndex]
]));
const approvalDecisionRows=['8月14日','8月15日','8月16日'].flatMap((day,dayIndex)=>['批准','修改','打回','未记录'].map((decision,decisionIndex)=>[
  `${day}·${decision}`,
  String([[2,1,0,0],[1,1,1,0],[1,0,1,1]][dayIndex][decisionIndex]),
  `结果：${decision}`
]));
const artifactHashRows=['控制中心','英语学习','职业雷达','模型雷达'].flatMap((project,projectIndex)=>['PRD','UI提示词','设计稿','架构文档','测试报告'].map((artifactType,typeIndex)=>{
  const states=['有效','历史','待审','哈希不一致','未登记'];
  return [`${project}·${artifactType}`,states[(projectIndex+typeIndex)%states.length],`类型：${artifactType}`];
}));
const eventSwimRows=[
  ['控制中心·04 UI/UX·10:00','入场','成功'],['控制中心·04 UI/UX·10:20','交付','成功'],
  ['英语学习·10 QA·10:30','复测','成功'],['职业雷达·09 审查·10:40','审查','部分可用'],
  ['模型雷达·00 包工头·10:50','路由','成功'],['模型雷达·04 UI/UX·11:00','解析坏行','部分可用']
];
const retestMatrixRows=['P0','P1','P2','P3'].flatMap((severity,severityIndex)=>['通过','失败','未执行'].map((result,resultIndex)=>[
  `矩阵·${severity}·${result}`,
  String([[1,0,0],[2,1,1],[3,1,2],[2,0,3]][severityIndex][resultIndex]),
  `复测：${result}`
]));
const retestTrendRows=['迭代1','迭代2','迭代3'].flatMap((iteration,iterationIndex)=>['通过','失败','未执行'].map((result,resultIndex)=>[
  `趋势·${iteration}·${result}`,
  String([[2,1,3],[4,1,2],[6,0,1]][iterationIndex][resultIndex]),
  `复测：${result}`
]));

const chartModels=[
  {name:charts[0],rows:projectStageRows},
  {name:charts[1],rows:[['市场调研','完成·产物2','已批准'],['产品定义','完成·产物3','已批准'],['UI/UX','当前·产物4','待审核'],['架构','待开始·产物0','未入场'],['开发','待开始·产物0','未入场']]},
  {name:charts[2],rows:truthTrackRows},
  {name:charts[3],rows:roleProjectRows},
  {name:charts[4],rows:[['H01·04入场','UI/UX','边：H01→H02'],['H02·04交付','UI设计','边：H02→H03'],['H03·00等待','审核门','边：H03→H04'],['H04·05后续','架构','未授权']]},
  {name:charts[5],rows:approvalAgingRows},
  {name:charts[6],rows:approvalDecisionRows},
  {name:charts[7],rows:artifactHashRows},
  {name:charts[8],rows:eventSwimRows},
  {name:charts[9],rows:issueStackRows},
  {name:charts[10],rows:[['0–1天','1','普通'],['2–3天','1','普通'],['4–7天','2','高严重度'],['7天以上','1','高严重度'],['时间未知','1','需补证据']]},
  {name:charts[11],rows:[...retestMatrixRows,...retestTrendRows]},
  {name:charts[12],rows:burnRows},
  {name:charts[13],rows:releaseGateRows},
  {name:charts[14],rows:[['本地·v1.0','计划08-16 09:00｜实际09:20','完成｜提交a1b2c3d'],['候选·v1.0-rc','计划08-17 10:00｜实际—','计划｜提交d4e5f6a'],['生产·v1.0','计划—｜实际—','冻结｜提交—']]},
  {name:charts[15],rows:coverageRows},
  {name:charts[16],rows:freshnessRows},
  {name:charts[17],rows:maturityRows},
  {name:charts[18],rows:[['当前记录（REC-01）','产物A','根节点'],['来源文件（FILE-01）','产物登记文件','边：REC-01→FILE-01'],['上游产物（PRD-01）','产品需求文档 v1.0','边：REC-01→PRD-01'],['审批记录（APR-01）','审批A','边：REC-01→APR-01'],['事件记录（EVT-01）','事件A','边：REC-01→EVT-01']]}
];
const chartMappings=[
  '行=项目｜列=阶段0–10｜填充=阶段状态｜边框=当前阶段｜图标=审批状态',
  '节点=阶段序号｜状态=完成/当前/风险/阻塞/待开始｜徽标=产物数与审批状态',
  '行=项目｜轨道=前端/后端/真实数据/生产｜值=已登记真实性状态',
  '行=固定角色00–11｜列=项目｜值=执行/排队/待审/阻塞/未知',
  '纵轴=角色｜横轴=阶段或时间｜节点=入场/交付/审核/等待｜边=交接事件',
  '横轴=等待时长桶｜纵轴=待审数｜分组=审核门与项目',
  '横轴=日期｜纵轴=决策数｜系列=批准/修改/打回/未记录',
  '行=项目｜列=产物类型｜状态=有效/历史/待审/哈希不一致/未登记',
  '横轴=事件时间｜泳道=项目与角色｜标记=事件类型与结果',
  '横轴=问题状态｜堆叠=严重度｜值=结构化问题数',
  '横轴=0–1/2–3/4–7/7天以上｜纵轴=问题数｜纹理=高严重度',
  '横轴=日期或迭代｜值=通过/失败/未执行｜矩阵=严重度×复测状态',
  '横轴=迭代日｜纵轴=剩余工作｜系列=理想/实际/范围变更',
  '行=版本与环境｜列=构建/测试/安全/回滚/监控/授权｜值=门禁状态',
  '横轴=计划与实际时间｜标记=环境/版本/状态/源提交',
  '行=项目｜列=项目/角色/审批/产物/事件/问题/发布｜值=覆盖状态',
  '行=项目与数据域｜列=观测批次｜值=当前/陈旧/未知｜文本=时间',
  '行=六维能力｜列=等级与迭代｜值=规则计算分｜注释=样本/规则/缺失',
  '节点=当前记录/来源文件/上游产物/审批/事件｜边=显式ID关系'
];
chartModels.forEach((model,index)=>{model.mapping=chartMappings[index];});
const chartUnits=['阶段序号（0–10）','阶段节点／产物数','真实性状态','角色占用状态','交接事件（条）','待审记录（条）','审批决定（条）','产物记录（份）','事件（条）','问题（条）','问题（条）','复测记录（条）','工作量（项）','门禁证据（项）','时间（Asia/Shanghai）','覆盖状态','新鲜度状态／时间','成熟度等级（0–3）','显式关系（条）'];
const chartLegends=['填充=阶段；边框=当前；完/当/待=状态；✓/待/○=图标','节点=阶段；数字=产物；徽标=审批','◇演示；×未实现；○未就绪；锁未授权','▶执行中；审待审；◷排队；!阻塞；·无记录','节点=交接；虚线=显式ID边','颜色=审核门；控/英/职/模=项目；X轴=等待桶','●批准；■修改；▲打回；◆未记录','✓有效；史历史；审待审；≠哈希不一致；·未登记','入/交/测/审/路/!=事件；✓成功/△部分可用=结果','分段=P0/P1/P2/P3；横轴=状态','固定方标=记录；Y=问题数；斜纹=高严重度；?=时间未知','格=矩阵；●实线通过；▲虚线失败；◆点线未执行','●理想；■实际；◆范围；线型与水平偏移双编码','✓通过；×阻塞；…待证；○未执行；锁冻结/未授权；∅非发布','方=计划；点=实际；横轨=时间比例','完/部/错/未=覆盖状态','格=状态；格内文字=观测时间','格=等级/样本/缺失；仅有证据点连线，缺失处断线','节点=记录；虚线标签=显式ID关系'];
const TRACE_ROOT_HEAD='808be6a5aec172bbc8ec21564d53c8810882a5e5';
const TRACE_OBSERVED_AT='2026-08-17T01:18:10+08:00（目标态演示观测）';
const chartTrace=charts.map((name,index)=>{
  const sourceId=`CC-目标态演示-图表-${String(index+1).padStart(2,'0')}`;
  const sourceCanonical=canonicalJson({source_id:sourceId,name,mapping:chartMappings[index],rows:chartModels[index].rows.map((row)=>row.map(String))});
  return {
    unit:chartUnits[index],legend:chartLegends[index],filter:'全部项目｜目标态近30天｜示例迭代',
    source_id:sourceId,source_sha256:createHash('sha256').update(sourceCanonical).digest('hex'),source_canonical_base64:Buffer.from(sourceCanonical).toString('base64'),
    source:'目标态演示模型（当前来源未接通）',coverage:'演示字段100%｜真实覆盖不可用',freshness:'示例观测｜非实时',
    observed_at:TRACE_OBSERVED_AT,root_head:`${TRACE_ROOT_HEAD}（目标态演示引用）`
  };
});
const chartCardHeights=chartModels.map((model,index)=>Math.max(600,370+equivalentTableHeight({index},model.rows.length)));
const atlasPlacements=[];
const atlasRunningHeights=[0,0];
chartCardHeights.forEach((height,index)=>{
  const column=atlasRunningHeights[0]<=atlasRunningHeights[1]?0:1;
  atlasPlacements.push({column,y:142+atlasRunningHeights[column],height});
  atlasRunningHeights[column]+=height+16;
});
const ATLAS_HEIGHT=142+Math.max(...atlasRunningHeights)-16+24;
const DEFAULT_APPROVAL_SCOPE='page=approvals|project=全部项目|time=近 30 天|iteration=全部迭代|source=审批登记|query=|cross=|record-count=0';
const DEFAULT_APPROVAL_SCOPE_SHA=createHash('sha256').update(DEFAULT_APPROVAL_SCOPE).digest('hex');
const APPROVAL_SOURCE_EVIDENCE={
  source_id:'CC-审批登记-只读快照-001',
  source_status:'可用',
  observed_at:'2026-08-17T01:40:00+08:00',
  rows:[['审批记录','0','查询成功'],['解析错误','0','无错误'],['覆盖范围','全部项目｜近30天｜全部迭代','已锁定']]
};
const APPROVAL_SOURCE_CANONICAL=canonicalJson(APPROVAL_SOURCE_EVIDENCE);
const APPROVAL_SOURCE_SHA=createHash('sha256').update(APPROVAL_SOURCE_CANONICAL).digest('hex');

const gateLegendEntries=[
  {state:'通过',label:'✓ 通过',row:0,column:0,color:C.success},
  {state:'阻塞',label:'× 阻塞',row:0,column:1,color:C.danger},
  {state:'待证据',label:'… 待证据',row:1,column:0,color:C.warning},
  {state:'未执行',label:'○ 未执行',row:1,column:1,color:C.unknown},
  {state:'冻结／未授权',label:'锁 冻结／未授权',row:2,column:0,color:C.unknown},
  {state:'非发布',label:'∅ 非发布',row:2,column:1,color:C.unknown}
];
function releaseGateLegend(x,y,w){
  const height=52,columnWidth=w/2;
  let out=`<g data-gate-legend="true" data-gate-legend-layout="2x3" data-gate-legend-x="${x}" data-gate-legend-y="${y}" data-gate-legend-width="${w}" data-gate-legend-height="${height}" data-gate-legend-context="${w<260?'compact':'standard'}">`;
  gateLegendEntries.forEach((entry)=>{const px=x+4+entry.column*columnWidth,py=y+8+entry.row*18;out+=text(px,py,entry.label,12,700,entry.color,'start',`data-gate-legend-item="${entry.state}" data-gate-legend-row="${entry.row}" data-gate-legend-column="${entry.column}"`);});
  return out+'</g>';
}

function semanticMarks(x,y,w,h,index,rowLimit=Number.POSITIVE_INFINITY){
  const rows=chartModels[index].rows.slice(0,rowLimit);const colors=[C.primary,C.info,C.warning,C.demo];let out='';
  const group=(i,content)=>`<g data-chart-index="${index}" data-row-id="${index}-${i}" data-field="${esc(rows[i][0])}" data-value="${esc(rows[i][1])}" data-status="${esc(rows[i][2])}">${content}</g>`;
  const label=(i,px,py,anchor='middle')=>text(px,py,rows[i][0],12,650,C.secondary,anchor);
  switch(index){
    case 0: { // 项目×阶段矩阵
      const projects=['控制中心','英语学习','职业雷达','模型雷达'],cellX=x+74,cellW=(w-76)/11,cellH=28;
      out+=text(x,y+12,'项目',12,700);Array.from({length:11},(_,stage)=>{out+=text(cellX+(stage+.5)*cellW,y+12,String(stage),12,650,C.secondary,'middle');});
      rows.forEach((row,i)=>{const projectIndex=Math.floor(i/11),stage=i%11,px=cellX+stage*cellW,py=y+24+projectIndex*36,isCurrent=row[1]==='当前',approvalStatus=row[2].replace('审批：',''),approved=approvalStatus.includes('已批准'),statusShort=row[1]==='完成'?'完':isCurrent?'当':'待',glyph=row[1]==='完成'?'✓':isCurrent?(approved?'✓':approvalStatus.includes('待审')?'待':'?'):'○',glyphColor=row[1]==='完成'?C.success:isCurrent?(approved?C.success:C.warning):C.unknown,fill=row[1]==='完成'?C.successSoft:isCurrent?C.blueSoft:C.soft,stroke=row[1]==='完成'?C.success:isCurrent?C.primary:C.border;if(stage===0)out+=text(x,py+cellH/2,projects[projectIndex]??row[0].split('·')[0],12,650,C.text);out+=group(i,`${rect(px,py,cellW-2,cellH,fill,stroke,3,`data-stage-cell="true" data-project="${esc(projects[projectIndex]??'')}" data-stage="${stage}" data-stage-status="${esc(row[1])}" data-stage-status-short="${statusShort}" data-stage-glyph="${glyph}" data-current-stage="${isCurrent}" data-approval-status="${esc(approvalStatus)}" stroke-width="${isCurrent?2.5:1}"`)}${text(px+(cellW-2)/2,py+8,statusShort,8,800,glyphColor,'middle')}${text(px+(cellW-2)/2,py+20,glyph,9,800,glyphColor,'middle')}`);});
      out+=text(x,y+190,'完/当/待=阶段文字 · ✓/待/○=状态图标 · 粗边框=当前阶段',12,650,C.secondary);break;
    }
    case 1: { // 单项目阶段轨道
      rows.forEach((row,i)=>{const cx=x+24+i*(w-48)/(rows.length-1),nodeColors=[C.success,C.success,C.primary,C.unknown,C.unknown],artifactCount=Number(row[1].match(/产物([0-9]+)/)?.[1]??0),stageStatus=row[1].split('·')[0],approvalStatus=row[2];out+=group(i,`${i<rows.length-1?line(cx+10,y+44,cx+(w-48)/(rows.length-1)-10,y+44,i<2?C.success:C.border,4):''}${dot(cx,y+44,nodeColors[i%5],9)}${text(cx,y+74,row[0],12,650,C.secondary,'middle')}${text(cx,y+18,stageStatus,12,700,nodeColors[i%5],'middle')}${pill(cx-28,y+86,`产物 ${artifactCount}`,artifactCount?C.blueSoft:C.soft,artifactCount?C.info:C.unknown,56,22,12)}${pill(cx-31,y+114,approvalStatus,approvalStatus==='已批准'?C.successSoft:approvalStatus==='待审核'?C.warnSoft:C.soft,approvalStatus==='已批准'?C.success:approvalStatus==='待审核'?C.warning:C.unknown,62,22,12)}<circle data-artifact-count="${artifactCount}" data-approval-status="${esc(approvalStatus)}" cx="${cx}" cy="${y+44}" r="1" fill="transparent"/>`);});break;
    }
    case 2: { // 四轨
      const trackNames=['前端','后端','真实数据','生产'],trackProjects=['控制中心','英语学习','职业雷达','模型雷达'],trackX=x+74,trackW=(w-76)/4,trackH=34;
      const truthSpecs={
        '演示可浏览':{glyph:'◇',short:'演示',rank:2,color:C.demo,fill:C.purpleSoft,dash:''},
        '未实现':{glyph:'×',short:'未实现',rank:0,color:C.unknown,fill:C.soft,dash:'5 3'},
        '未就绪':{glyph:'○',short:'未绪',rank:1,color:C.info,fill:C.blueSoft,dash:''},
        '未授权':{glyph:'锁',short:'未授权',rank:0,color:C.unknown,fill:C.soft,dash:'2 3'}
      };
      trackNames.forEach((track,index)=>out+=text(trackX+(index+.5)*trackW,y+10,track,12,650,C.secondary,'middle'));
      rows.forEach((row,i)=>{const projectIndex=Math.floor(i/4),trackIndex=i%4,px=trackX+trackIndex*trackW,py=y+22+projectIndex*42,status=row[1],spec=truthSpecs[status];if(trackIndex===0)out+=text(x,py+trackH/2,trackProjects[projectIndex],12,650,C.text);out+=group(i,`${rect(px,py,trackW-2,trackH,spec.fill,spec.color,3,`data-truth-track-cell="true" data-track-project="${esc(trackProjects[projectIndex])}" data-truth-track="${esc(trackNames[trackIndex])}" data-truth-value="${esc(status)}" data-truth-rank="${spec.rank}" data-status-glyph="${spec.glyph}" data-cell-x="${px}" data-cell-y="${py}" ${spec.dash?`stroke-dasharray="${spec.dash}"`:''}`)}${text(px+12,py+trackH/2,spec.glyph,12,800,spec.color,'middle')}${text(px+(trackW-2)/2+5,py+trackH/2,spec.short,11,700,spec.color,'middle')}`);});out+=text(x,y+207,'◇演示可浏览 · ×未实现 · ○未就绪 · 锁未授权',12,650,C.secondary);break;
    }
    case 3: { // 角色×项目占用矩阵
      const roleProjects=['控制','英语','职业','模型'],roleX=x+92,roleW=(w-94)/4,roleH=13;
      const roleSpecs={
        '执行中':{glyph:'▶',color:C.primary,fill:C.blueSoft,priority:4},'待审':{glyph:'审',color:C.warning,fill:C.warnSoft,priority:3},
        '排队':{glyph:'◷',color:C.demo,fill:C.purpleSoft,priority:2},'阻塞':{glyph:'!',color:C.danger,fill:C.dangerSoft,priority:5},
        '—':{glyph:'·',color:C.unknown,fill:C.soft,priority:0}
      };
      roleProjects.forEach((project,index)=>out+=text(roleX+(index+.5)*roleW,y+9,project,12,650,C.secondary,'middle'));
      rows.forEach((row,i)=>{const roleIndex=Math.floor(i/4),projectIndex=i%4,px=roleX+projectIndex*roleW,py=y+17+roleIndex*15,status=row[1],spec=roleSpecs[status];if(projectIndex===0)out+=text(x,py+roleH/2,fixedRoles[roleIndex],12,650,C.text);out+=group(i,`${rect(px,py,roleW-2,roleH,spec.fill,spec.color,2,`data-role-project-cell="true" data-role-axis="${esc(fixedRoles[roleIndex])}" data-project-axis="${esc(roleProjects[projectIndex])}" data-role-status="${esc(status)}" data-status-glyph="${spec.glyph}" data-status-priority="${spec.priority}" data-cell-x="${px}" data-cell-y="${py}"`)}${text(px+(roleW-2)/2,py+roleH/2,spec.glyph,11,800,spec.color,'middle')}`);});out+=text(x,y+207,'▶执行中 · 审待审 · ◷排队 · !阻塞 · ·无记录',12,650,C.secondary);break;
    }
    case 4: { // 角色交接泳道
      const handoffIds=rows.map((row)=>row[0].split('·')[0]),handoffRoles=['04 UI/UX','00 包工头','05 架构师'],laneY=handoffRoles.map((_,index)=>y+38+index*58),stageX=rows.map((_,index)=>x+96+index*(w-112)/(rows.length-1));
      const roleFor=(row)=>row[0].includes('00')?'00 包工头':row[0].includes('05')?'05 架构师':'04 UI/UX';
      const glyphFor=(row)=>row[0].includes('入场')?'入':row[0].includes('交付')?'交':row[0].includes('等待')?'审':'锁';
      handoffRoles.forEach((role,index)=>{out+=text(x,laneY[index],role,12,650,C.text);out+=line(x+72,laneY[index],x+w,laneY[index],C.border,1,'4 4');});
      const positions=rows.map((row,index)=>({x:stageX[index],y:laneY[handoffRoles.indexOf(roleFor(row))]}));
      positions.slice(0,-1).forEach((position,index)=>{const next=positions[index+1],edge=`${handoffIds[index]}→${handoffIds[index+1]}`,labelX=(position.x+next.x)/2,labelY=(position.y+next.y)/2-14;out+=line(position.x+10,position.y,next.x-10,next.y,C.unknown,2,'5 4');out+=rect(labelX-52,labelY-11,104,22,C.card,C.border,4,`data-handoff-edge-label="${edge}" data-edge-label-x="${labelX}" data-edge-label-y="${labelY}"`);out+=text(labelX,labelY,edge,12,650,C.secondary,'middle',`data-handoff-edge="${edge}" data-edge-from-x="${position.x}" data-edge-from-y="${position.y}" data-edge-to-x="${next.x}" data-edge-to-y="${next.y}"`);});
      rows.forEach((row,i)=>{const id=handoffIds[i],position=positions[i],role=roleFor(row),glyph=glyphFor(row),state=i===3?'未授权':i===2?'待审':'已登记',color=state==='未授权'?C.unknown:state==='待审'?C.warning:i===0?C.success:C.info,fill=state==='未授权'?C.soft:state==='待审'?C.warnSoft:i===0?C.successSoft:C.blueSoft;out+=group(i,`${rect(position.x-24,position.y-14,48,28,fill,color,6,`data-handoff-id="${id}" data-handoff-stage="${i+1}" data-handoff-role="${esc(role)}" data-handoff-x="${position.x}" data-handoff-y="${position.y}" data-status-glyph="${glyph}"`)}${text(position.x,position.y,glyph,12,800,color,'middle')}${text(position.x,position.y+24,row[1],11,650,C.secondary,'middle')}`);});break;
    }
    case 5: { // 待审老化分布
      const agingProjects=['控制中心','英语学习','职业雷达','模型雷达'],projectGlyphs=['控','英','职','模'],agingGates=['提示词','设计','代码测试'],buckets=['0–1天','2–3天','时间未知'],groupW=w/3,barW=(groupW-14)/4,baseY=y+144,countScale=38;
      agingGates.forEach((gate,index)=>{out+=rect(x+index*82,y,10,10,[C.blueSoft,C.warnSoft,C.purpleSoft][index],[C.primary,C.warning,C.demo][index],2);out+=text(x+14+index*82,y+6,gate,12,650,C.secondary);});
      out+=text(x,y+22,'项目：控=控制中心 · 英=英语学习 · 职=职业雷达 · 模=模型雷达',12,650,C.secondary);
      [0,1,2].forEach((tick)=>{const ty=baseY-tick*countScale;out+=line(x,ty,x+w,ty,tick===0?C.secondary:C.border,1,tick===0?'':'3 3');out+=text(x-5,ty,String(tick),11,600,C.secondary,'end');});
      rows.forEach((row,i)=>{const projectIndex=Math.floor(i/3),gateIndex=i%3,bucketIndex=buckets.indexOf(row[2]),bucketRows=rows.filter((item)=>item[2]===row[2]),positionInBucket=bucketRows.indexOf(row),count=Number(row[1]),bh=count*countScale,bx=x+bucketIndex*groupW+7+positionInBucket*barW,by=baseY-bh,color=[C.primary,C.warning,C.demo][gateIndex],fill=[C.blueSoft,C.warnSoft,C.purpleSoft][gateIndex],visible=count>0?rect(bx,by,barW-2,bh,fill,color,2):line(bx,baseY,bx+barW-2,baseY,color,2),glyphY=count>0?by+12:baseY-7;out+=group(i,`${visible}<circle data-aging-bar="true" data-wait-bucket="${esc(row[2])}" data-aging-project="${esc(agingProjects[projectIndex])}" data-project-glyph="${projectGlyphs[projectIndex]}" data-review-gate="${esc(agingGates[gateIndex])}" data-count="${count}" data-bar-height="${bh}" data-bar-y="${by}" data-baseline-y="${baseY}" cx="${bx+(barW-2)/2}" cy="${baseY}" r="1" fill="transparent"/>${text(bx+(barW-2)/2,glyphY,projectGlyphs[projectIndex],10,800,color,'middle')}${text(bx+(barW-2)/2,count>0?by-9:baseY-22,String(count),12,700,color,'middle')}`);});buckets.forEach((bucket,index)=>out+=text(x+(index+.5)*groupW,y+172,bucket,12,650,C.secondary,'middle'));break;
    }
    case 6: { // 审批结果趋势
      const decisionNames=['批准','修改','打回','未记录'],decisionColors=[C.success,C.warning,C.danger,C.unknown],decisionPatterns=['','7 4','2 4','10 4 2 4'],decisionGlyphs=['●','■','▲','◆'],decisionOffsets=[-21,-7,7,21],decisionDays=['8月14日','8月15日','8月16日'],decisionX=x+34,decisionW=w-54,decisionH=122,maxDecision=3;
      decisionNames.forEach((decision,decisionIndex)=>{const decisionRows=rows.filter((_,index)=>index%4===decisionIndex),points=decisionRows.map((row,dayIndex)=>[decisionX+dayIndex*decisionW/2+decisionOffsets[decisionIndex],y+30+decisionH-Number(row[1])*decisionH/maxDecision]);out+=`<polyline data-decision-series="${esc(decision)}" data-decision-pattern="${decisionPatterns[decisionIndex]||'实线'}" points="${points.map((point)=>point.join(',')).join(' ')}" fill="none" stroke="${decisionColors[decisionIndex]}" stroke-width="3" ${decisionPatterns[decisionIndex]?`stroke-dasharray="${decisionPatterns[decisionIndex]}"`:''}/>`;out+=text(x+decisionIndex*68,y+7,`${decisionGlyphs[decisionIndex]}${decision}`,12,650,decisionColors[decisionIndex]);});
      rows.forEach((row,i)=>{const dayIndex=Math.floor(i/4),decisionIndex=i%4,dayX=decisionX+dayIndex*decisionW/2,px=dayX+decisionOffsets[decisionIndex],py=y+30+decisionH-Number(row[1])*decisionH/maxDecision,labelY=py-(decisionIndex%2===0?13:25);out+=group(i,`${text(px,py,decisionGlyphs[decisionIndex],12,800,decisionColors[decisionIndex],'middle')}${text(px,labelY,row[1],12,700,decisionColors[decisionIndex],'middle')}`);if(decisionIndex===0)out+=text(dayX,y+174,decisionDays[dayIndex],12,650,C.secondary,'middle');});break;
    }
    case 7: { // 哈希矩阵
      const artifactProjects=['控制中心','英语学习','职业雷达','模型雷达'],artifactTypes=['PRD','提示词','设计','架构','测试'],artifactX=x+72,artifactW=(w-74)/5,artifactH=34;
      artifactTypes.forEach((type,index)=>out+=text(artifactX+(index+.5)*artifactW,y+10,type,12,650,C.secondary,'middle'));
      rows.forEach((row,i)=>{const projectIndex=Math.floor(i/5),typeIndex=i%5,px=artifactX+typeIndex*artifactW,py=y+22+projectIndex*42,status=row[1],valid=status==='有效',mismatch=status==='哈希不一致',color=valid?C.success:mismatch?C.danger:status==='待审'?C.warning:status==='历史'?C.demo:C.unknown,fill=valid?C.successSoft:mismatch?C.dangerSoft:status==='待审'?C.warnSoft:status==='历史'?C.purpleSoft:C.soft;if(typeIndex===0)out+=text(x,py+artifactH/2,artifactProjects[projectIndex],12,650,C.text);out+=group(i,`${rect(px,py,artifactW-2,artifactH,fill,color,3,`data-artifact-cell="true" data-artifact-project="${esc(artifactProjects[projectIndex])}" data-artifact-type="${esc(artifactTypes[typeIndex])}" data-artifact-state="${esc(status)}"`)}${text(px+(artifactW-2)/2,py+artifactH/2,valid?'✓':mismatch?'≠':status==='历史'?'史':status==='待审'?'审':'·',12,800,color,'middle')}`);});break;
    }
    case 8: { // 事件时间线
      const eventMinutes=rows.map((row)=>{const [hours,minutes]=row[0].split('·')[2].split(':').map(Number);return hours*60+minutes;}),minMinute=Math.min(...eventMinutes),maxMinute=Math.max(...eventMinutes),lanes=[...new Set(rows.map((row)=>row[0].split('·').slice(0,2).join('·')))];
      lanes.forEach((lane,index)=>{const yy=y+26+index*28;out+=text(x,yy,lane,10,650,C.text);out+=line(x+132,yy,x+w,yy,C.border,2);});
      rows.forEach((row,i)=>{const parts=row[0].split('·'),lane=`${parts[0]}·${parts[1]}`,timeValue=parts[2],laneIndex=lanes.indexOf(lane),yy=y+26+laneIndex*28,minute=eventMinutes[i],px=x+150+((minute-minMinute)/Math.max(1,maxMinute-minMinute))*(w-168),eventType=row[1],result=row[2],glyph=eventType==='解析坏行'?'!':eventType==='入场'?'入':eventType==='交付'?'交':eventType==='复测'?'测':eventType==='审查'?'审':'路',resultGlyph=result==='成功'?'✓':'△',color=result==='成功'?C.success:C.warning;out+=group(i,`${dot(px,yy,color,9)}${text(px,yy,glyph,11,800,'#FFFFFF','middle')}${text(px+13,yy,resultGlyph,11,800,color,'middle')}${text(px,yy-13,timeValue,10,700,color,'middle')}<circle data-event-lane="${esc(lane)}" data-event-time="${esc(timeValue)}" data-event-minute="${minute}" data-event-type="${esc(eventType)}" data-event-result="${esc(result)}" data-event-glyph="${glyph}" data-event-result-glyph="${resultGlyph}" data-event-x="${px}" data-event-y="${yy}" cx="${px}" cy="${yy}" r="1" fill="transparent"/>`);});out+=text(x,y+202,'入/交/测/审/路/!=事件类型 · ✓成功 · △部分可用',12,650,C.secondary);break;
    }
    case 9: { // 问题严重度×状态堆叠柱
      const severityColors=[C.danger,C.warning,C.info,C.unknown],severityFills=[C.dangerSoft,C.warnSoft,C.blueSoft,C.soft],statuses=['待修','修复中','待复测','已关闭'],barX=x+62,barW=w-64;
      ['P0','P1','P2','P3'].forEach((severity,i)=>{out+=rect(x+i*58,y,10,10,severityFills[i],severityColors[i],2);out+=text(x+14+i*58,y+6,severity,12,650,C.secondary);});
      const totals=statuses.map((_,statusIndex)=>rows.slice(statusIndex*4,statusIndex*4+4).reduce((sum,item)=>sum+Number(item[1]),0)),maxTotal=Math.max(...totals);
      [0,Math.ceil(maxTotal/2),maxTotal].forEach((tick)=>{const tx=barX+barW*tick/maxTotal;out+=line(tx,y+20,tx,y+176,C.border,1,'3 3');out+=text(tx,y+190,String(tick),11,600,C.secondary,'middle');});
      rows.forEach((row,i)=>{const statusIndex=Math.floor(i/4),severityIndex=i%4,statusRows=rows.slice(statusIndex*4,statusIndex*4+4),before=statusRows.slice(0,severityIndex).reduce((sum,item)=>sum+Number(item[1]),0),count=Number(row[1]),bx=barX+barW*before/maxTotal,bw=barW*count/maxTotal,py=y+28+statusIndex*38;if(severityIndex===0)out+=text(x,py+12,statuses[statusIndex],12,650,C.text);out+=group(i,`${rect(bx,py,Math.max(1,bw-1),24,severityFills[severityIndex],severityColors[severityIndex],2,`data-stack-segment="true" data-status-axis="${esc(statuses[statusIndex])}" data-severity="P${severityIndex}" data-count="${count}" data-segment-x="${bx}" data-segment-width="${bw}" data-status-total="${totals[statusIndex]}" data-max-total="${maxTotal}"`)}${text(bx+Math.max(1,bw-1)/2,py+12,String(count),12,750,severityColors[severityIndex],'middle')}`);});break;
    }
    case 10: { // 问题老化分布
      const plotLeft=x+28,plotTop=y+28,plotH=106,baseline=plotTop+plotH,maxCount=Math.max(2,...rows.map((row)=>Number(row[1]))),markSize=14;
      [0,1,2].forEach((tick)=>{const ty=baseline-tick*plotH/maxCount;out+=line(plotLeft,ty,x+w,ty,C.border,1,tick===0?'':'3 3');out+=text(plotLeft-6,ty,String(tick),11,650,C.secondary,'end');});out+=text(x,y+12,'Y：问题数',12,700,C.secondary);
      rows.forEach((row,i)=>{const cx=plotLeft+22+i*(w-58)/(rows.length-1),count=Number(row[1]),cy=baseline-count*plotH/maxCount,high=row[2]==='高严重度',unknown=row[0]==='时间未知',glyph=high?'!':unknown?'?':'●',color=high?C.warning:unknown?C.unknown:C.primary,fill=high?C.warnSoft:unknown?C.soft:C.blueSoft,pattern=high?`${line(cx-6,cy-5,cx+6,cy+5,color,1.5)}${line(cx-6,cy,cx,cy+6,color,1.5)}`:'';out+=group(i,`${line(cx,baseline,cx,cy,color,2,'3 3')}${rect(cx-markSize/2,cy-markSize/2,markSize,markSize,fill,color,3,`data-aging-mark="true" data-aging-bucket="${esc(row[0])}" data-aging-count="${count}" data-aging-y="${cy}" data-aging-baseline="${baseline}" data-aging-max-count="${maxCount}" data-aging-mark-size="${markSize}" data-area-encoding="false" data-aging-severity="${esc(row[2])}" data-aging-glyph="${glyph}"`)}${high?`<g data-severity-pattern="diagonal">${pattern}</g>`:''}${text(cx,cy,glyph,10,800,color,'middle')}${text(cx,cy-14,String(count),12,750,color,'middle')}${text(cx,y+166,row[0],11,650,C.secondary,'middle')}`);});out+=text(x,y+190,'固定方标不编码面积 · 斜纹=高严重度 · ?=时间未知',12,650,C.secondary);break;
    }
    case 11: { // 复测趋势与矩阵
      const matrixRows=rows.slice(0,12),trendRows=rows.slice(12),resultNames=['通过','失败','未执行'],severityNames=['P0','P1','P2','P3'],resultX=x+54,resultW=(w-56)/3,resultH=24;
      resultNames.forEach((result,index)=>out+=text(resultX+(index+.5)*resultW,y+10,result,12,650,C.secondary,'middle'));
      matrixRows.forEach((row,i)=>{const severityIndex=Math.floor(i/3),resultIndex=i%3,px=resultX+resultIndex*resultW,py=y+20+severityIndex*28,count=Number(row[1]),color=resultIndex===0?C.success:resultIndex===1?C.danger:C.unknown,fill=resultIndex===0?C.successSoft:resultIndex===1?C.dangerSoft:C.soft;if(resultIndex===0)out+=text(x,py+resultH/2,severityNames[severityIndex],12,700,C.text);out+=group(i,`${rect(px,py,resultW-2,resultH,fill,color,3,`data-retest-cell="true" data-retest-severity="${esc(severityNames[severityIndex])}" data-retest-result="${esc(resultNames[resultIndex])}"`)}${text(px+(resultW-2)/2,py+resultH/2,String(count),12,750,color,'middle')}`);});
      const trendTop=y+148,trendW=w-56,trendColors=[C.success,C.danger,C.unknown],trendPatterns=['','7 4','2 4'],trendGlyphs=['●','▲','◆'];resultNames.forEach((result,resultIndex)=>{const points=trendRows.filter((_,index)=>index%3===resultIndex).map((row,iterationIndex)=>[resultX+iterationIndex*trendW/2,trendTop+42-Number(row[1])*6]);out+=`<polyline data-retest-trend-series="${esc(result)}" data-retest-trend-pattern="${trendPatterns[resultIndex]||'实线'}" points="${points.map((point)=>point.join(',')).join(' ')}" fill="none" stroke="${trendColors[resultIndex]}" stroke-width="2" ${trendPatterns[resultIndex]?`stroke-dasharray="${trendPatterns[resultIndex]}"`:''}/>`;});trendRows.forEach((row,localIndex)=>{const globalIndex=12+localIndex,iterationIndex=Math.floor(localIndex/3),resultIndex=localIndex%3,px=resultX+iterationIndex*trendW/2,py=trendTop+42-Number(row[1])*6;out+=group(globalIndex,`${text(px,py,trendGlyphs[resultIndex],12,800,trendColors[resultIndex],'middle')}<circle data-retest-trend-point="true" data-retest-trend-glyph="${trendGlyphs[resultIndex]}" data-retest-iteration="迭代${iterationIndex+1}" cx="${px}" cy="${py}" r="1" fill="transparent"/>`);if(resultIndex===0)out+=text(px,y+204,`迭代${iterationIndex+1}`,12,650,C.secondary,'middle');});break;
    }
    case 12: { // 燃尽／累积流
      const seriesNames=['理想剩余','实际剩余','范围总量'],seriesColors=[C.primary,C.warning,C.demo],seriesPatterns=['','7 4','2 4'],seriesGlyphs=['●','■','◆'],seriesOffsets=[-6,0,6],days=['第1日','第2日','第3日'],plotLeft=x+34,plotTop=y+28,plotW=w-54,plotH=126,maxValue=12;
      seriesNames.forEach((series,seriesIndex)=>{const seriesRows=rows.filter((_,index)=>index%3===seriesIndex),points=seriesRows.map((row,dayIndex)=>[plotLeft+dayIndex*plotW/2+seriesOffsets[seriesIndex],plotTop+plotH-Number(row[1])*plotH/maxValue]);out+=`<polyline data-burn-series="${esc(series)}" data-burn-pattern="${seriesPatterns[seriesIndex]||'实线'}" data-burn-x-offset="${seriesOffsets[seriesIndex]}" points="${points.map((point)=>point.join(',')).join(' ')}" fill="none" stroke="${seriesColors[seriesIndex]}" stroke-width="3" ${seriesPatterns[seriesIndex]?`stroke-dasharray="${seriesPatterns[seriesIndex]}"`:''}/>`;});
      seriesNames.forEach((series,i)=>{out+=line(x+i*90,y+8,x+18+i*90,y+8,seriesColors[i],3,seriesPatterns[i]);out+=text(x+22+i*90,y+8,`${seriesGlyphs[i]}${series}`,12,650,C.secondary);});
      rows.forEach((row,i)=>{const dayIndex=Math.floor(i/3),seriesIndex=i%3,px=plotLeft+dayIndex*plotW/2+seriesOffsets[seriesIndex],py=plotTop+plotH-Number(row[1])*plotH/maxValue,labelOffset=seriesIndex===0?-14:seriesIndex===1?14:-14;out+=group(i,`${text(px,py,seriesGlyphs[seriesIndex],12,800,seriesColors[seriesIndex],'middle')}${text(px,py+labelOffset,row[1],12,700,seriesColors[seriesIndex],'middle')}<circle data-burn-point="true" data-burn-series-name="${esc(seriesNames[seriesIndex])}" data-burn-day="${esc(days[dayIndex])}" data-burn-value="${esc(row[1])}" data-burn-x-offset="${seriesOffsets[seriesIndex]}" cx="${px}" cy="${py}" r="1" fill="transparent"/>`);if(seriesIndex===0)out+=text(plotLeft+dayIndex*plotW/2,y+174,days[dayIndex],12,650,C.secondary,'middle');});break;
    }
    case 13: { // 发布门禁证据矩阵
      const gateNames=['构建','测试','安全','回滚','监控','授权'],environmentNames=['v1.0 本地','v1.0-rc 候选','v1.0 生产'],gateX=x+82,gateW=(w-84)/6,gateH=36,gateRowStep=44;
      const gateSpecs={'通过':{glyph:'✓',short:'通过',color:C.success,fill:C.successSoft,rank:5},'阻塞':{glyph:'×',short:'阻塞',color:C.danger,fill:C.dangerSoft,rank:6},'待证据':{glyph:'…',short:'待证',color:C.warning,fill:C.warnSoft,rank:3},'非发布':{glyph:'∅',short:'非发布',color:C.unknown,fill:C.soft,rank:1},'未授权':{glyph:'锁',short:'未授权',color:C.unknown,fill:C.soft,rank:2},'未执行':{glyph:'○',short:'未执行',color:C.unknown,fill:C.soft,rank:0},'冻结':{glyph:'锁',short:'冻结',color:C.unknown,fill:C.soft,rank:4}};
      gateNames.forEach((gate,index)=>out+=text(gateX+(index+.5)*gateW,y+10,gate,12,650,C.secondary,'middle'));
      rows.forEach((row,i)=>{const environmentIndex=Math.floor(i/6),gateIndex=i%6,px=gateX+gateIndex*gateW,py=y+22+environmentIndex*gateRowStep,status=row[1],spec=gateSpecs[status];if(gateIndex===0)out+=text(x,py+gateH/2,environmentNames[environmentIndex],12,650,C.text);out+=group(i,`${rect(px,py,gateW-2,gateH,spec.fill,spec.color,3,`data-gate-cell="true" data-environment="${esc(environmentNames[environmentIndex])}" data-gate="${esc(gateNames[gateIndex])}" data-gate-status="${esc(status)}" data-gate-glyph="${spec.glyph}" data-gate-rank="${spec.rank}" data-cell-x="${px}" data-cell-y="${py}" data-cell-width="${gateW-2}" data-cell-height="${gateH}"`)}${text(px+(gateW-2)/2,py+11,spec.glyph,12,800,spec.color,'middle')}${text(px+(gateW-2)/2,py+27,spec.short,10,700,spec.color,'middle')}`);});out+=releaseGateLegend(x,y+158,w);break;
    }
    case 14: { // 发布列车时间线
      const trainLabels=['本地','候选','生产'],trainColors=[C.success,C.info,C.unknown],trainX=x+78,trainW=w-82;
      const parseTimestamp=(raw,fallbackDay='')=>{if(!raw||raw==='—')return null;const full=raw.match(/^(\d{2})-(\d{2}) (\d{2}):(\d{2})$/),timeOnly=raw.match(/^(\d{2}):(\d{2})$/);if(full)return Date.UTC(2026,Number(full[1])-1,Number(full[2]),Number(full[3]),Number(full[4]));if(timeOnly&&fallbackDay){const day=fallbackDay.match(/^(\d{2})-(\d{2})$/);return day?Date.UTC(2026,Number(day[1])-1,Number(day[2]),Number(timeOnly[1]),Number(timeOnly[2])):null;}return null;};
      const parsed=rows.map((row)=>{const [planPart,actualPart]=row[1].split('｜'),planRaw=planPart.replace('计划',''),actualRaw=actualPart.replace('实际',''),fallbackDay=planRaw.match(/^(\d{2}-\d{2})/)?.[1]??'';return {planRaw,actualRaw,planTs:parseTimestamp(planRaw),actualTs:parseTimestamp(actualRaw,fallbackDay)};}),timed=parsed.flatMap((item)=>[item.planTs,item.actualTs]).filter((value)=>value!==null),minTime=Math.min(...timed),maxTime=Math.max(...timed),position=(value)=>value===null?null:trainX+((value-minTime)/Math.max(1,maxTime-minTime))*trainW;
      rows.forEach((row,i)=>{const py=y+22+i*70,planX=position(parsed[i].planTs),actualX=position(parsed[i].actualTs),version=row[0].split('·')[1],status=row[2].split('｜')[0],commit=row[2].split('提交')[1],planLabel=parsed[i].planRaw==='—'?'计划—':`计划${parsed[i].planRaw.split(' ').at(-1)}`,actualLabel=parsed[i].actualRaw==='—'?'实际—':`实际${parsed[i].actualRaw.split(' ').at(-1)}`;out+=group(i,`${text(x,py,trainLabels[i],12,700,C.text)}${line(trainX,py,trainX+trainW,py,C.border,3)}${planX===null?text(trainX,py-17,planLabel,12,650,C.unknown):`${rect(planX-6,py-11,12,12,C.blueSoft,C.info,3)}${text(planX,py-20,planLabel,12,650,C.info,'middle')}`}${actualX===null?text(trainX+trainW,py+17,actualLabel,12,650,C.unknown,'end'):`${dot(actualX,py+7,trainColors[i],6)}${text(actualX,py+20,actualLabel,12,650,trainColors[i],'middle')}`}${text(trainX,py+36,`${version} · 状态 ${status} · 源提交 ${commit}`,12,650,C.secondary)}<circle data-plan-time="${esc(parsed[i].planRaw)}" data-actual-time="${esc(parsed[i].actualRaw)}" data-plan-x="${planX??''}" data-actual-x="${actualX??''}" data-plan-label-y="${py-20}" data-actual-label-y="${py+20}" data-meta-y="${py+36}" data-row-baseline="${py}" data-version="${esc(version)}" data-release-status="${esc(status)}" data-source-commit="${esc(commit)}" cx="${trainX}" cy="${py}" r="1" fill="transparent"/>`);});break;
    }
    case 15: { // 来源覆盖矩阵
      const domainNames=['项目','角色','审批','产物','事件','问题','发布'],coverageProjects=['控制中心','英语学习','职业雷达','模型雷达'],coverageX=x+72,coverageW=(w-74)/7,coverageH=32;
      domainNames.forEach((domain,index)=>out+=text(coverageX+(index+.5)*coverageW,y+10,domain,12,650,C.secondary,'middle'));
      rows.forEach((row,i)=>{const projectIndex=Math.floor(i/7),domainIndex=i%7,px=coverageX+domainIndex*coverageW,py=y+22+projectIndex*40,status=row[1],color=status==='完整'?C.success:status==='部分'?C.warning:status==='错误'?C.danger:C.unknown,fill=status==='完整'?C.successSoft:status==='部分'?C.warnSoft:status==='错误'?C.dangerSoft:C.soft;if(domainIndex===0)out+=text(x,py+coverageH/2,coverageProjects[projectIndex],12,650,C.text);out+=group(i,`${rect(px,py,coverageW-2,coverageH,fill,color,3,`data-coverage-cell="true" data-project="${esc(coverageProjects[projectIndex])}" data-domain="${esc(domainNames[domainIndex])}"`)}${text(px+(coverageW-2)/2,py+coverageH/2,status.slice(0,1),12,750,color,'middle')}`);});break;
    }
    case 16: { // 新鲜度热力图
      const batches=['批次1','批次2','批次3'],subjects=['控制中心·审批','英语学习·事件','职业雷达·问题','模型雷达·发布'],freshX=x+94,freshW=(w-96)/3,freshH=34;
      batches.forEach((batch,index)=>out+=text(freshX+(index+.5)*freshW,y+10,batch,12,650,C.secondary,'middle'));
      rows.forEach((row,i)=>{const subjectIndex=Math.floor(i/3),batchIndex=i%3,px=freshX+batchIndex*freshW,py=y+22+subjectIndex*42,status=row[1],observed=row[2].replace('观测：',''),color=status==='当前'?C.success:status==='陈旧'?C.demo:status==='错误'?C.danger:C.unknown,fill=status==='当前'?C.successSoft:status==='陈旧'?C.purpleSoft:status==='错误'?C.dangerSoft:C.soft;if(batchIndex===0)out+=text(x,py+freshH/2,subjects[subjectIndex],12,650,C.text);out+=group(i,`${rect(px,py,freshW-2,freshH,fill,color,3,`data-freshness-cell="true" data-subject="${esc(subjects[subjectIndex])}" data-batch="${esc(batches[batchIndex])}" data-observation-time="${esc(observed)}"`)}${text(px+(freshW-2)/2,py+12,status,12,700,color,'middle')}${text(px+(freshW-2)/2,py+27,observed,12,600,C.secondary,'middle')}`);});break;
    }
    case 17: { // 成熟度矩阵与趋势
      const iterations=['迭代1','迭代2','迭代3'],dimensions=['角色职责','阶段审批','产物追溯','自动执行','测试评测','可观测成本'],maturityX=x+94,maturityW=(w-96)/3,maturityH=26,rowStep=31;
      iterations.forEach((iteration,index)=>out+=text(maturityX+(index+.5)*maturityW,y+9,iteration,12,650,C.secondary,'middle'));
      const rowData=rows.map((row,i)=>{const dimensionIndex=Math.floor(i/3),iterationIndex=i%3,level=row[1]==='证据不足'?null:Number(row[1].replace('等级','')),px=maturityX+iterationIndex*maturityW,py=y+20+dimensionIndex*rowStep,labelY=py+9,trendY=level===null?null:py+22-level*2;return {row,i,dimensionIndex,iterationIndex,level,px,py,labelY,trendY};});
      rowData.forEach(({row,i,dimensionIndex,iterationIndex,level,px,py,labelY,trendY})=>{const annotation=Object.fromEntries(row[2].split('；').map((item)=>item.match(/^(规则|样本|缺失)(.*)$/)?.slice(1)??[]).filter((item)=>item.length===2)),available=level!==null,color=!available?C.unknown:level>=2?C.success:C.warning,fill=!available?C.soft:level>=2?C.successSoft:C.warnSoft,barWidth=available?(maturityW-8)*(level/3):0,displayValue=!available?`? 样${annotation['样本']}/缺${annotation['缺失']}`:`L${level} 样${annotation['样本']}/缺${annotation['缺失']}`;if(iterationIndex===0)out+=text(x,py+maturityH/2,dimensions[dimensionIndex],11,650,C.text);out+=group(i,`${rect(px,py,maturityW-2,maturityH,fill,color,3,`data-maturity-cell="true" data-dimension="${esc(dimensions[dimensionIndex])}" data-iteration="${esc(iterations[iterationIndex])}" data-rule="${esc(annotation['规则']??'')}" data-sample="${esc(annotation['样本']??'')}" data-missing="${esc(annotation['缺失']??'')}" data-level="${level??''}" data-evidence-available="${available}" data-level-bar-width="${barWidth}" data-label-y="${labelY}" data-trend-y="${trendY??''}"`)}${barWidth>0?rect(px+3,py+maturityH-6,barWidth,3,color,color,2):''}${text(px+(maturityW-2)/2,labelY,displayValue,10,700,color,'middle')}${available?`<circle data-maturity-trend-point="true" data-maturity-dimension="${esc(dimensions[dimensionIndex])}" data-maturity-iteration="${esc(iterations[iterationIndex])}" data-maturity-level="${level}" data-maturity-point-x="${px+(maturityW-2)/2}" data-maturity-point-y="${trendY}" cx="${px+(maturityW-2)/2}" cy="${trendY}" r="2.5" fill="${C.primary}"/>`:''}`);});
      dimensions.forEach((dimension,dimensionIndex)=>{const dimensionRows=rowData.filter((item)=>item.dimensionIndex===dimensionIndex),segments=[];let current=[];dimensionRows.forEach((item)=>{if(item.level===null){if(current.length>1)segments.push(current);current=[];return;}current.push(item);});if(current.length>1)segments.push(current);segments.forEach((segment,segmentIndex)=>{const points=segment.map((item)=>[item.px+(maturityW-2)/2,item.trendY]);out+=`<polyline data-maturity-trend="${esc(dimension)}" data-maturity-segment="${segmentIndex}" data-maturity-trend-points="${points.map((point)=>point.join(',')).join(' ')}" points="${points.map((point)=>point.join(',')).join(' ')}" fill="none" stroke="${C.primary}" stroke-width="2"/>`;});});break;
    }
    case 18: { // 证据链
      const evidenceIds=['REC-01','FILE-01','PRD-01','APR-01','EVT-01'],positions=[[x+42,y+108],[x+224,y+24],[x+224,y+72],[x+224,y+132],[x+224,y+180]];
      evidenceIds.slice(1).forEach((targetId,index)=>{const [x1,y1]=positions[0],[x2,y2]=positions[index+1],edge=`REC-01→${targetId}`,labelX=x+130,labelY=y2+(index%2===0?-11:12);out+=line(x1+12,y1,x2-14,y2,C.unknown,2,'5 4');out+=rect(labelX-60,labelY-11,120,22,C.card,C.border,4,`data-evidence-edge-label="${edge}" data-edge-label-x="${labelX}" data-edge-label-y="${labelY}"`);out+=text(labelX,labelY,edge,12,650,C.secondary,'middle',`data-evidence-edge="${edge}"`);});
      rows.forEach((row,i)=>{const [cx,cy]=positions[i],id=evidenceIds[i],labelX=i===0?cx:cx-12,labelY=i===0?cy+28:cy;out+=group(i,`${dot(cx,cy,colors[i%4],9)}${text(labelX,labelY,row[0].split('（')[0],11,650,C.secondary,i===0?'middle':'end')}<circle data-evidence-node-id="${id}" data-evidence-node-x="${cx}" data-evidence-node-y="${cy}" cx="${cx}" cy="${cy}" r="1" fill="transparent"/>`);});break;
    }
    default: throw new Error(`未定义图表语义结构：${index}`);
  }
  return out;
}

function equivalentTableHeight(model,rowCount){return 38+rowCount*(model.index===14?48:34);}
function equivalentTable(x,y,w,model,rowLimit=Number.POSITIVE_INFINITY){
  const rows=model.rows.slice(0,rowLimit),rowHeight=model.index===14?48:34,height=equivalentTableHeight(model,rows.length);
  let out=rect(x,y,w,height,C.soft,C.border,6);
  out+=text(x+10,y+17,'完整等价表：字段',14,700,C.secondary);
  out+=text(x+w-10,y+17,'值／状态',14,700,C.secondary,'end');
  rows.forEach((row,i)=>{
    const top=y+38+i*rowHeight,fieldY=top+9,valueY=top+25;
    out+=`<g data-table-row-id="${model.index ?? 'empty'}-${i}" data-field="${esc(row[0])}" data-value="${esc(row[1])}" data-status="${esc(row[2])}">`;
    out+=text(x+10,fieldY,row[0],14,650,C.text);
    out+=text(x+10,valueY,`值：${row[1]}`,14,600,C.primary);
    out+=text(x+w-10,valueY,`状态：${row[2]}`,14,600,C.secondary,'end');
    out+=line(x+10,top+rowHeight-1,x+w-10,top+rowHeight-1,C.border);
    out+='</g>';
  });
  return out;
}

function semanticChartCard(x,y,w,h,index,state='demo'){
  const model={...chartModels[index],index};const unavailable=state==='not_ready'||state==='unknown',dense=model.rows.length>3,rows=unavailable||state==='empty'?3:model.rows.length,tableHeight=equivalentTableHeight(model,rows),tableY=y+h-tableHeight-4,compactTitles={'发布门禁证据矩阵':'发布门禁','成熟度证据矩阵与趋势':'成熟度趋势','问题严重度×状态堆叠柱':'问题状态堆叠'},displayTitle=w<430?(compactTitles[model.name]??model.name):model.name;let out=rect(x,y,w,h);out+=cardTitle(x+18,y+25,displayTitle);
  out+=pill(x+w-132,y+12,state==='empty'?'确实为空':unavailable?'覆盖不可用':'目标态演示',state==='empty'?C.successSoft:unavailable?C.blueSoft:C.purpleSoft,state==='empty'?C.success:unavailable?C.info:C.demo,114,26,12);
  out+=text(x+18,y+60,w>=600?model.mapping:dense?`完整 ${model.rows.length} 行／格 · 等价表见图谱 #${String(index+1).padStart(2,'0')}`:'权威维度与完整数据见十九类图表专页',12,600,C.secondary);
  if(state==='empty'){out+=`<g data-empty-source-evidence="true" data-source-id="${APPROVAL_SOURCE_EVIDENCE.source_id}" data-source-status="${APPROVAL_SOURCE_EVIDENCE.source_status}" data-source-observed-at="${APPROVAL_SOURCE_EVIDENCE.observed_at}" data-source-sha256="${APPROVAL_SOURCE_SHA}" data-scope-sha256="${DEFAULT_APPROVAL_SCOPE_SHA}">`;out+=text(x+w/2,y+94,'当前锁定范围确实为空',17,720,C.success,'middle');out+=text(x+w/2,y+120,'来源成功证据与查询范围哈希分开',13,500,C.secondary,'middle');out+=text(x+18,y+148,`来源：${APPROVAL_SOURCE_EVIDENCE.source_id} · 状态：可用`,12,650,C.text);out+=text(x+18,y+168,`观测：${APPROVAL_SOURCE_EVIDENCE.observed_at}`,12,500,C.secondary);out+=text(x+18,y+188,`来源 SHA256：${APPROVAL_SOURCE_SHA.slice(0,32)}`,12,500,C.secondary,'start','class="mono"');out+=text(x+18,y+206,APPROVAL_SOURCE_SHA.slice(32),12,500,C.secondary,'start','class="mono"');out+=text(x+18,y+228,`范围 SHA256：${DEFAULT_APPROVAL_SCOPE_SHA.slice(0,32)}`,12,500,C.secondary,'start',`class="mono" data-empty-scope-sha="${DEFAULT_APPROVAL_SCOPE_SHA}"`);out+=text(x+18,y+246,DEFAULT_APPROVAL_SCOPE_SHA.slice(32),12,500,C.secondary,'start','class="mono"');out+=text(x+18,y+272,'记录数：0 · 非证据范围控件已锁定 · 无可点击标记',12,700,C.success);out+='</g>';return out;}
  if(unavailable){out+=text(x+w/2,y+96,'当前没有有效观测',17,720,C.info,'middle');out+=text(x+w/2,y+122,'不绘制标记，不把未知换算为 0',13,500,C.secondary,'middle');out+=equivalentTable(x+18,tableY,w-36,{rows:[['观测结果','—','覆盖不可用'],['记录数','—','不能推导 0'],['来源状态','未就绪','无有效观测']]});return out;}
  if(dense){const marksY=y+(h<320?68:88);out+=`<g data-compact-chart-index="${index}" data-full-row-count="${model.rows.length}">${semanticMarks(x+18,marksY,w-36,210,index)}</g>`;if(h>=320)out+=text(x+18,y+h-16,`未截断：${model.rows.length} 行／格全部绘制 · 完整等价表见图谱 #${String(index+1).padStart(2,'0')}`,12,650,C.primary);return out;}
  out+=semanticMarks(x+22,y+82,w-44,66,index);out+=equivalentTable(x+18,tableY,w-36,model);return out;
}

function chartTraceBlock(x,y,index){
  const trace=chartTrace[index],fields=[
    ['unit','单位',trace.unit],['legend','图例',trace.legend],['filter','筛选',trace.filter],['source_id','来源 ID',trace.source_id],
    ['source','来源',trace.source],['coverage','覆盖',trace.coverage],['freshness','新鲜度',trace.freshness],['observed_at','观测时间',trace.observed_at]
  ];
  let out=`<g data-trace-chart-index="${index}" data-source-canonical-base64="${trace.source_canonical_base64}">`;
  const rowOffsets=[0,20,40,60,112,132,152,172];
  fields.forEach(([key,label,value],row)=>{const yy=y+rowOffsets[row];out+=text(x,yy,`${label}：${value}`,12,row<2?650:500,row<2?C.text:C.secondary,'start',`data-trace-field="${key}" data-trace-value="${esc(value)}"`);});
  out+=text(x,y+80,`来源 SHA256：${trace.source_sha256.slice(0,28)}`,12,500,C.secondary,'start',`class="mono" data-trace-field="source_sha256" data-trace-value="${trace.source_sha256}"`);
  out+=text(x,y+96,trace.source_sha256.slice(28),12,500,C.secondary,'start','class="mono"');
  out+=text(x,y+192,`root_head：${TRACE_ROOT_HEAD.slice(0,22)}`,12,500,C.secondary,'start',`class="mono" data-trace-field="root_head" data-trace-value="${esc(trace.root_head)}"`);
  out+=text(x,y+208,`${TRACE_ROOT_HEAD.slice(22)}（目标态演示引用）`,12,500,C.secondary,'start','class="mono"');
  out+=text(x,y+230,'查看下方完整等价表（字段／值／状态）',12,700,C.primary);
  return out+'</g>';
}

function buildChartAtlas() {
  const width=1440,height=ATLAS_HEIGHT;let s=openSvg({width,height,id:'cc-chart-atlas',title:'AI 工作流控制中心十九类图表与完整等价表',description:'十九类图表分别由专属数据模型生成，所有可视标记在同卡等价表中列出字段、值与状态。'});
  s+=text(32,38,'19 类可追溯图表与完整等价表',28,760);s+=pill(width-250,22,'目标态演示 · 非当前事实',C.purpleSoft,C.demo,218,34);s+=truthBar(32,66,width-64,'live_demo','可视标记与等价表共享同一模型','每个可视标记逐行对应字段、值、状态；没有证据时整图为空态');
  const cardW=678,gapX=20;
  chartModels.forEach((sourceModel,i)=>{const model={...sourceModel,index:i},trace=chartTrace[i],titleId=`atlas-chart-${i}-title`,descId=`atlas-chart-${i}-desc`,placement=atlasPlacements[i],col=placement.column,cardH=placement.height,x=32+col*(cardW+gapX),y=placement.y;s+=`<g role="img" aria-labelledby="${titleId} ${descId}" data-atlas-card-index="${i}" data-atlas-column="${col}" data-card-y="${y}" data-card-height="${cardH}"><title id="${titleId}">${esc(model.name)}，单位${esc(trace.unit)}</title><desc id="${descId}">${esc(trace.legend)}。目标态演示，非当前运行事实。完整等价表位于图形与追溯摘要下方。</desc>`;s+=rect(x,y,cardW,cardH);s+=text(x+16,y+23,`${String(i+1).padStart(2,'0')} · ${model.name}`,14,720);s+=pill(x+cardW-100,y+12,'演示数据',C.purpleSoft,C.demo,84,24);s+=text(x+16,y+50,model.mapping,12,600,C.secondary);s+=semanticMarks(x+18,y+78,300,210,i);s+=chartTraceBlock(x+344,y+82,i);s+=equivalentTable(x+16,y+338,cardW-32,model);s+='</g>';});
  return s+closeSvg;
}

function buildDesignSystem() {
  const width=1440,height=1320;
  let s=openSvg({width,height,id:'cc-design-system',title:'AI 工作流控制中心设计系统与组件状态页',description:'颜色、排版、间距、状态、按钮、筛选、表格、抽屉和无障碍组件规范。'});
  s+=text(32,38,'设计系统与组件状态',28,760);s+=pill(width-218,22,'完整简中 · 无障碍',C.blueSoft,C.info,186,34);
  s+=truthBar(32,66,width-64,'not_ready','真实性优先于装饰','健康、就绪、覆盖、新鲜度和风险使用独立文字、图标、边框与颜色');
  s+=rect(32,142,430,300);s+=cardTitle(50,168,'颜色与对比度','小字组合均按 4.5:1 目标');
  const swatches=[['主操作',C.primary,'#FFFFFF'],['信息',C.info,'#FFFFFF'],['真实成功',C.success,'#FFFFFF'],['警告基色',C.warningBase,'#FFFFFF'],['危险',C.danger,'#FFFFFF'],['演示',C.demo,'#FFFFFF'],['未知',C.unknown,'#FFFFFF']];
  swatches.forEach(([label,color,fg],i)=>{const col=i%2,row=Math.floor(i/2),x=50+col*198,y=214+row*52;s+=rect(x,y,184,40,color,color,8);s+=text(x+14,y+20,label,14,700,fg);s+=text(x+170,y+20,color,11,500,fg,'end','class="mono"');});
  s+=text(50,426,'警告基色 #B65D0A；浅警告底的小字改用 #8A3F00，以满足 4.5:1。',12,600,C.secondary);
  s+=rect(480,142,452,300);s+=cardTitle(498,168,'状态组件','状态不只靠颜色');
  const states=[['真实根仓观测',C.successSoft,C.success],['查询成功，确实为空',C.successSoft,C.success],['数据未就绪',C.blueSoft,C.info],['上次快照，已过期',C.purpleSoft,C.demo],['部分数据可用',C.warnSoft,C.warning],['读取失败',C.dangerSoft,C.danger],['未知／覆盖不可用',C.soft,C.unknown],['正在读取',C.blueSoft,C.info]];
  states.forEach(([label,bg,fg],i)=>s+=pill(498+(i%2)*206,210+Math.floor(i/2)*54,label,bg,fg,190,36,14));
  s+=rect(950,142,458,300);s+=cardTitle(968,168,'排版与栅格','8px 基础栅格 · 12列桌面');
  [['页面标题','28 / 36'],['卡片标题','17 / 24'],['桌面正文','14–16 / 22'],['移动正文','16 / 24'],['移动辅助','14 / 20'],['触控目标','至少 44×44']].forEach(([a,b],i)=>{s+=text(968,214+i*34,a,14,650);s+=text(1386,214+i*34,b,14,600,C.secondary,'end');});
  s+=rect(32,462,650,240);s+=cardTitle(50,488,'按钮、筛选与焦点','仅只读动作使用可操作样式');
  s+=pill(50,530,'只读重新读取',C.blueSoft,C.info,134,44,16);s+=pill(194,530,'导出查询',C.soft,C.primary,112,44,16);s+=pill(316,530,'查看证据',C.card,C.secondary,112,44,16);s+=pill(438,530,'复制 SHA256',C.soft,C.primary,104,44,14);s+=pill(552,530,'复制错误码',C.soft,C.primary,106,44,14);
  s+=rect(50,596,160,48,C.card,C.primary,8,'stroke-width="2"');s+=text(130,620,'焦点可见 2px',14,700,C.primary,'middle');
  s+=text(232,620,'减少动态效果：关闭循环位移；刷新状态用文字与播报。',14,500,C.secondary);
  s+=rect(50,654,260,38,C.card,C.border,8);s+=text(64,673,'输入框：搜索项目、角色、证据',14,500,C.secondary);
  s+=rect(326,654,332,38,C.successSoft,C.success,8);s+=text(342,673,'Toast：只读刷新完成，3 项可用',14,650,C.success);
  s+=rect(700,462,708,240);s+=cardTitle(718,488,'紧凑表格与详情抽屉','同一记录保持路径、哈希、时间、覆盖与错误');
  ['对象','状态','来源','新鲜度'].forEach((v,i)=>s+=text(718+i*150,536,v,13,700,C.secondary));
  ['审批记录','产物哈希','事件证据'].forEach((v,r)=>{s+=text(718,574+r*34,v,14,650);s+=text(868,574+r*34,['尚未记录','哈希不一致','部分可用'][r],14,650,[C.unknown,C.danger,C.warning][r]);s+=text(1018,574+r*34,'结构化治理文件',14,500,C.secondary);s+=text(1168,574+r*34,r===0?'未知':'上次快照',14,500,C.secondary);});
  s+=rect(32,722,1376,238);s+=cardTitle(50,748,'空、错、降级与零写','每种状态包含：发生了什么、影响范围、仍可用内容、最近成功、来源、下一步');
  ['无结果：清除筛选','未就绪：查看来源','降级：保留成功范围','失败：只读重试','零写：无批准／发布／修复入口'].forEach((v,i)=>{s+=rect(50+i*265,794,244,108,[C.soft,C.blueSoft,C.warnSoft,C.dangerSoft,C.purpleSoft][i],[C.border,C.info,C.warning,C.danger,C.demo][i],10);s+=text(68+i*265,823,v,14,720,[C.unknown,C.info,C.warning,C.danger,C.demo][i]);s+=text(68+i*265,858,'文字 + 图标 + 边框',13,500,C.secondary);s+=text(68+i*265,882,'证据可下钻',13,500,C.secondary);});
  s+=text(32,986,'全局只读顶栏组件',17,720);s+=globalTopbar(32,1004,1376,'current');
  s+=rect(32,1090,1376,190);s+=cardTitle(50,1116,'交互状态与动效 token','悬停、按下、禁用、错误均保留文字与边界');
  const buttonStates=[['悬停',C.blueSoft,C.info],['按下','#DDE4FF',C.primary],['禁用',C.soft,C.unknown],['错误',C.dangerSoft,C.danger]];
  buttonStates.forEach(([label,bg,fg],i)=>{const bx=50+i*188;s+=rect(bx,1150,172,48,bg,fg,9,i===1?'stroke-width="2"':'');s+=text(bx+86,1174,`按钮 · ${label}`,14,700,fg,'middle');});
  const inputStates=[['输入 · 悬停',C.card,C.info],['输入 · 按下',C.card,C.primary],['输入 · 禁用',C.soft,C.unknown],['输入 · 错误',C.dangerSoft,C.danger]];
  inputStates.forEach(([label,bg,fg],i)=>{const bx=822+i*138;s+=rect(bx,1150,126,48,bg,fg,9,i===1?'stroke-width="2"':'');s+=text(bx+63,1174,label,13,650,fg,'middle');});
  s+=text(50,1234,'动效：标准 160ms 缓出（ease-out）；状态变化不循环位移；减少动态效果时 0ms、无位移，只保留文字与状态播报（aria-live）。',14,600,C.secondary);
  s+=text(32,1300,'统一信息架构：6 个一级导航 · 12 个目的页 · 移动底栏固定为“总览 / 项目 / 质量 / 更多”。',14,700,C.primary);
  return s+closeSvg;
}

const desktopPageConfigs=[
  {file:'D02-projects',title:'项目与阶段',nav:1,state:'degraded',summary:['项目清单','阶段 0–10','真实性四轨','当前审核门'],main:'项目列表与阶段矩阵',chart:'项目真实性四轨',rows:['控制中心：UI 设计中','英语学习：设计已批准','职业雷达：等待独立审查','模型雷达：设计待审']},
  {file:'D03-project-detail',title:'项目证据详情',nav:1,state:'degraded',summary:['概况','审批','产物','事件'],main:'七页签证据详情',chart:'单项目阶段轨道',rows:['批准事实以审批记录为准','工作副本修改单独展示','失败范围不遮挡成功范围','来源路径与哈希可下钻']},
  {file:'D04-roles',title:'固定角色协作',nav:2,state:'unknown',summary:['固定 12 个角色','多项目占用','等待审核','交接证据'],main:'角色 × 项目占用矩阵',chart:'角色交接泳道',rows:['00 包工头：有活动登记','04 UI/UX：等待审核','06 前端：排队','其余角色：无结构化记录']},
  {file:'D05-approvals',title:'审批与待审',nav:1,state:'empty',summary:['待审门','已决定','等待时长','证据缺口'],main:'待审与已决定分栏',chart:'待审老化分布',rows:['待审不算已决定','无记录不推断拒绝','决定关联产物与变更','没有批准／拒绝按钮']},
  {file:'D06-artifacts',title:'产物与哈希',nav:1,state:'unknown',summary:['有效产物','历史版本','待审产物','哈希差异'],main:'产物紧凑表格',chart:'产物覆盖与哈希矩阵',rows:['登记版本与工作副本并列','文件存在不自动有效','复制相对路径与哈希','状态修改入口为零']},
  {file:'D07-events',title:'事件审计',nav:3,state:'degraded',summary:['可解析事件','损坏行','事件类型','时间范围'],main:'稳定排序事件时间线',chart:'事件类型趋势',rows:['同时间按项目与事件 ID 排序','坏行保留位置与影响','不执行不可信指令','筛选可回到来源']},
  {file:'D08-issues',title:'问题、Bug 与复测',nav:3,state:'unknown',summary:['问题覆盖','高严重度','待复测','证据完整度'],main:'结构化问题与复测表',chart:'严重度 × 状态堆叠柱',rows:['覆盖不可用不显示 0','重复问题保留来源关系','复测事件不全不算通过率','没有关闭或指派按钮']},
  {file:'D09-releases',title:'迭代与发布',nav:4,state:'unknown',summary:['迭代范围','候选发布','门禁证据','回滚证据'],main:'发布记录与环境',chart:'发布门禁证据矩阵',rows:['本地／演示／候选／生产分离','网址可访问不等于已上线','未验证门禁不画成功','没有发布或回滚按钮']},
  {file:'D10-sources',title:'来源、覆盖与新鲜度',nav:5,state:'stale',summary:['允许来源','覆盖范围','源更新时间','本次观测'],main:'项目 × 数据域覆盖矩阵',chart:'新鲜度热力图',rows:['源时间与观测时间分离','绝对路径不对外显示','失败与真实 0 分离','静态回退持续标识']},
  {file:'D11-maturity',title:'成熟度与治理',nav:5,state:'unknown',summary:['六个维度','规则版本','证据样本','缺失项'],main:'能力 × 成熟度等级矩阵',chart:'成熟度证据趋势',rows:['证据不足暂不计算','不绘制伪精确雷达','建议标依据与规则版本','图表始终提供等价表']},
  {file:'D12-system-status',title:'系统状态与恢复',nav:5,state:'not_ready',summary:['进程健康','根仓就绪','覆盖','快照一致性'],main:'健康与就绪对照',chart:'失败范围与重试状态',rows:['无有效观测时不回退演示','上次快照显示时间与失败','混合快照丢弃后重读','只读重新读取不修复源文件']}
];

const desktopChartIndex={
  '项目与阶段':2,'项目证据详情':1,'固定角色协作':4,'审批与待审':5,'产物与哈希':7,
  '事件审计':8,'问题、Bug 与复测':9,'迭代与发布':13,'来源、覆盖与新鲜度':16,
  '成熟度与治理':17,'系统状态与恢复':15
};

function buildDesktopPage(config,index){
  const width=1440,height=1024;let s=openSvg({width,height,id:`cc-${config.file}`,title:`AI 工作流控制中心桌面${config.title}设计`,description:`1440桌面${config.title}目的页，展示目标态布局、真实性状态、只读动作和证据下钻。`});
  s+=sidebar(height,config.nav,index+1);const x=256,w=width-x-24;
  s+=text(x,40,config.title,28,760);s+=pill(width-182,24,'目标态演示数据',C.purpleSoft,C.demo,158,34);s+=globalTopbar(x,68,w,config.state==='empty'?'evidence':'demo');
  const stateTitle={degraded:'部分数据可用',unknown:'未知／覆盖不可用',empty:'查询成功，确实为空',stale:'上次快照，已过期',not_ready:'数据未就绪'}[config.state];
  s+=truthBar(x,142,w,config.state,`目标态演示 · ${stateTitle}`,'示例只验证页面与状态布局，不代表当前运行事实');
  const cw=(w-48)/4;config.summary.forEach((label,i)=>s+=miniStatusCard(x+i*(cw+16),214,cw,label,config.state==='empty'?'0':i===0?'—':'示例',config.state==='empty'?'empty':i===0?'unknown':'demo'));
  s+=rect(x,322,720,326);s+=cardTitle(x+18,348,config.main,config.state==='empty'?'当前查询无记录 · 已取证范围锁定':'筛选与来源上下文保持可见');
  const fixedRoles=['00 包工头','01 市场调研员','02 项目经理','03 产品经理','04 UI/UX 设计师','05 架构师','06 前端工程师','07 后端工程师','08 数据工程师','09 代码审查员','10 QA','11 DevOps'];
  if(config.title==='固定角色协作'){
    fixedRoles.forEach((role,i)=>{const col=i%3,row=Math.floor(i/3),rx=x+18+col*226,ry=386+row*54;s+=rect(rx,ry,212,42,i===4?C.blueSoft:C.soft,i===4?C.info:C.border,7);s+=text(rx+12,ry+21,role,14,650,i===4?C.info:C.text);});
    s+=text(x+18,618,'12 个唯一身份 · 实际在线、忙闲与绩效均未知',13,600,C.secondary);
  }else{
    const pageRows=config.state==='empty'?['当前查询确实为空','记录数为 0 且来源可用','非证据范围不可修改','无审批／拒绝操作按钮']:config.rows;
    pageRows.forEach((row,i)=>{s+=rect(x+18,390+i*50,684,38,config.state==='empty'?C.successSoft:i===0?'#F7F8FC':C.card,config.state==='empty'?C.success:C.border,7);s+=text(x+34,409+i*50,row,14,i===0?700:500,i===0?C.primary:C.text);s+=pill(x+578,396+i*50,i%2===0?'查看证据':'等价表',C.soft,C.primary,108,26,13);});
  }
  s+=semanticChartCard(x+736,322,w-736,326,desktopChartIndex[config.title],config.state==='empty'?'empty':'demo');
  s+=rect(x,664,360,270);s+=cardTitle(x+18,690,config.state==='empty'?'锁定证据范围':'筛选与搜索',config.state==='empty'?'来源、观测、范围哈希已取证':'项目、时间、来源、状态');(config.state==='empty'?['非证据范围不可修改','范围与来源哈希分开','导出保留锁定上下文']:['筛选改变图表与导出','无匹配与不可用分开','网址保留筛选上下文']).forEach((v,i)=>s+=text(x+18,740+i*38,'• '+v,14,500,C.secondary));
  s+=rect(x+376,664,390,270);s+=cardTitle(x+394,690,'证据详情','路径、哈希、时间、覆盖、错误');['来源：结构化治理文件','源哈希：示例值','根仓提交：示例值','观测时间：示例时间'].forEach((v,i)=>s+=text(x+394,740+i*36,v,14,500,C.secondary));
  s+=rect(x+782,664,w-782,270);s+=cardTitle(x+800,690,'只读动作','没有业务或 Git 写入口');s+=pill(x+800,740,config.state==='empty'?'范围已锁定':'查看详情',config.state==='empty'?C.soft:C.blueSoft,config.state==='empty'?C.secondary:C.info,118,40,15);s+=pill(x+930,740,'导出当前查询',C.soft,C.primary,142,40,15);s+=text(x+800,808,'审批、问题流转、发布、回滚、修复均不可执行。',14,600,C.warning);s+=text(x+800,852,`页面 ${String(index+2).padStart(2,'0')} / 12`,14,650,C.secondary);
  return s+closeSvg;
}

function tabletRail(height,selected=0){let out=`<rect width="72" height="${height}" fill="${C.sidebar}"/>`;nav.forEach((fullLabel,i)=>{const label=['总','项','角','质','发','治'][i];out+=`<g role="img" aria-label="${esc(fullLabel)}" data-primary-label="${esc(fullLabel)}">`;out+=rect(16,76+i*58,40,40,i===selected?'#35458E':C.sidebar,i===selected?'#35458E':C.sidebar,10);out+=text(36,96+i*58,label,14,700,'#FFFFFF','middle');out+='</g>';});return out;}

const tabletPageConfigs=[
  {file:'T01-overview',title:'总览',selected:0,state:'not_ready',left:'项目 × 阶段矩阵',right:'待审老化与问题覆盖',rows:['健康与就绪分离','未知不等于 0','来源与观测时间可见']},
  {file:'T03-events-issues',title:'事件与问题',selected:3,state:'degraded',left:'事件审计时间线',right:'问题、Bug 与复测',rows:['坏行保留可解析事件','问题覆盖不可用不显示 0','复测证据不全不算通过率']},
  {file:'T04-sources-system',title:'来源与系统状态',selected:5,state:'not_ready',left:'来源覆盖矩阵',right:'健康、就绪与恢复',rows:['源时间与观测时间分开','混合快照丢弃后重读','只读刷新不修复源文件']}
];

function buildTabletPage(config){
  const width=1024,height=768;let s=openSvg({width,height,id:`cc-${config.file}`,title:`AI 工作流控制中心1024平板${config.title}设计`,description:`1024平板${config.title}关键页，折叠导航使用中文可理解标识。`});s+=tabletRail(height,config.selected);const x=96,w=904;
  s+=text(x,32,config.title,26,760);s+=text(x,60,`一级：${nav[config.selected]} · 次级：${config.title}`,12,650,C.secondary);s+=pill(834,22,'只读监管 · 零写',C.soft,C.primary,166,34);s+=truthBar(x,76,w,config.state,config.state==='not_ready'?'数据未就绪':'目标态演示 · 部分数据可用',config.state==='not_ready'?'当前无有效观测，不显示演示 KPI':'示例状态 · 非当前运行事实');
  s+=rect(x,152,560,328);s+=cardTitle(x+18,178,config.left,'关键字段与等价表可达');
  s+=rect(x+576,152,328,328);s+=cardTitle(x+594,178,config.right,'状态与原因就近展示');
  if(config.file==='T03-events-issues'){
    s+=`<g data-tablet-semantic="events">${semanticMarks(x+18,214,524,220,8)}</g>`;
    s+=`<g data-tablet-semantic="issues-retest">${semanticMarks(x+594,214,292,220,11)}</g>`;
  }else if(config.file==='T04-sources-system'){
    s+=`<g data-tablet-semantic="sources-coverage">${semanticMarks(x+18,214,524,220,15)}</g>`;
    s+=`<g data-tablet-semantic="system-source-status">${sourceTable(x+594,214,292,246,'not_ready')}</g>`;
  }else{
    s+=`<g data-tablet-semantic="overview-stage">${matrix(x+18,220,524,226,config.state==='not_ready'?'unknown':'demo')}</g>`;
    config.rows.forEach((v,i)=>{s+=rect(x+594,222+i*70,292,52,C.soft,C.border,8);s+=text(x+610,248+i*70,v,14,650);});
  }
  s+=rect(x,496,904,210);s+=cardTitle(x+18,522,'平板只读操作区','搜索、筛选、详情、刷新、导出');['搜索','筛选','查看详情','只读刷新','导出当前查询'].forEach((v,i)=>s+=pill(x+18+i*166,566,v,i===3?C.blueSoft:C.soft,i===3?C.info:C.primary,150,44,15));s+=text(x+18,654,'审批、发布、回滚、修复与 Git 写入入口为零；页面级无横向滚动。',14,600,C.warning);return s+closeSvg;
}

const mobilePageConfigs=[
  {file:'overview',title:'总览',state:'not_ready',selected:0,card1:'监管状态',items1:['健康：未知','就绪：未就绪','覆盖：不可用'],card2:'决策摘要',items2:['项目：—','待审：—','问题：覆盖不可用']},
  {file:'projects',title:'项目与阶段',state:'degraded',selected:1,card1:'项目与阶段',items1:['控制中心：UI 设计','英语学习：已批准','职业雷达：待审'],card2:'项目证据详情 / 固定角色协作',items2:['项目证据详情：路径与哈希','固定角色协作：00–11','真实性四轨：逐项目']},
  {file:'approvals',title:'审批与待审',state:'empty',selected:1,card1:'锁定证据范围',items1:['查询成功，确实为空','来源状态：可用','范围：全部项目 · 近30天'],card2:'来源成功证据',items2:['观测时间：01:40 +08:00',`来源SHA：${APPROVAL_SOURCE_SHA.slice(0,16)}…`,'非证据范围不可修改']},
  {file:'artifacts',title:'产物与哈希',state:'unknown',selected:1,card1:'产物记录',items1:['登记版本：可查看','工作副本：单独显示','哈希差异：并列证据'],card2:'只读动作',items2:['复制相对路径','复制哈希','导出当前查询']},
  {file:'events',title:'事件审计',state:'degraded',selected:1,card1:'事件时间线',items1:['可解析事件保留','损坏行显示位置','稳定排序可追溯'],card2:'组合筛选',items2:['项目与时间','角色与类型','变更与结果']},
  {file:'issues',title:'问题、Bug 与复测',state:'unknown',selected:2,card1:'问题覆盖',items1:['覆盖不可用不显示 0','严重度与状态分开','重复记录保留来源'],card2:'复测证据',items2:['通过：—','失败：—','未执行：—']},
  {file:'releases',title:'迭代与发布',state:'unknown',selected:3,card1:'发布记录',items1:['本地与生产分离','网址可访问不等于上线','门禁缺证据：未验证'],card2:'零写边界',items2:['无发布按钮','无回滚按钮','无域名切换']}
];

function buildMobilePage(width,config){const height=width===390?844:720;let s=openSvg({width,height,id:`cc-mobile-${width}-${config.file}`,title:`AI 工作流控制中心${width}移动${config.title}设计`,description:`${width}独立移动重排的${config.title}页面，正文不小于16像素，辅助文字不小于14像素。`});const stateLabel={not_ready:'数据未就绪',degraded:'部分可用',empty:'确实为空',unknown:'未知'}[config.state];s+=mobileHeader(width,config.title,stateLabel,config.state);s+=truthBar(12,82,width-24,config.state,config.state==='degraded'?'目标态演示 · 部分可用':stateLabel,config.state==='degraded'?'示例状态 · 非当前事实':config.state==='empty'?'查询成功 · 来源证据与范围哈希分开':'当前不补造数字或成功状态');const pad=width===390?16:12,inner=width-pad*2;if(config.state==='empty')s+=`<g data-mobile-empty-evidence="true" data-source-id="${APPROVAL_SOURCE_EVIDENCE.source_id}" data-source-status="${APPROVAL_SOURCE_EVIDENCE.source_status}" data-source-observed-at="${APPROVAL_SOURCE_EVIDENCE.observed_at}" data-source-sha256="${APPROVAL_SOURCE_SHA}" data-scope-locked="true">`;s+=rect(pad,156,inner,220);s+=cardTitle(pad+16,182,config.card1,'核心证据保持可见',14);config.items1.forEach((v,i)=>{s+=rect(pad+16,226+i*44,inner-32,36,config.state==='empty'?C.successSoft:C.soft,config.state==='empty'?C.success:C.border,7);s+=text(pad+28,244+i*44,v,16,600);});s+=rect(pad,392,inner,202);s+=cardTitle(pad+16,418,config.card2,'状态、来源与恢复动作',14);config.items2.forEach((v,i)=>s+=text(pad+20,462+i*32,'• '+v,16,500,C.secondary));s+=pill(pad+16,542,config.state==='empty'?'范围已锁定':'查看详情',config.state==='empty'?C.successSoft:C.blueSoft,config.state==='empty'?C.success:C.info,Math.floor((inner-44)/2),44,16);s+=pill(pad+28+Math.floor((inner-44)/2),542,'导出查询',C.soft,C.primary,Math.floor((inner-44)/2),44,16);if(config.state==='empty')s+='</g>';if(height===844){s+=rect(pad,610,inner,134,C.warnSoft,C.warning,12);s+=text(pad+16,636,'只读监管 · 零写',17,720,C.warning);s+=text(pad+16,674,'无批准、发布、修复或 Git 写入口。',16,500,C.text);s+=text(pad+16,708,'触控目标至少 44×44。',14,500,C.secondary);}else{s+=rect(pad,602,inner,40,C.warnSoft,C.warning,10);s+=text(pad+12,622,'零写：无批准、发布、修复或 Git 写入口',14,650,C.warning);}s+=bottomNav(width,height,config.selected);return s+closeSvg;}

function buildTablet() {
  const width = 1024, height = 768;
  let s = openSvg({ width, height, id: 'cc-tablet-1024', title: 'AI 工作流控制中心平板项目详情降级设计', description: '1024平板项目详情，展示单项目失败时的降级可用、七页签、来源和证据。' });
  s += tabletRail(height,1);
  const x = 96, w = width - 120;
  s += text(x, 32, '项目证据详情', 26, 760);
  s += text(x, 60, '一级：项目与阶段 · 次级：项目证据详情', 12, 650, C.secondary);
  s += pill(width - 190, 22, '只读监管 · 零写', C.soft, C.primary, 166, 34);
  s += truthBar(x, 76, w, 'degraded', '目标态演示 · 降级可用', '示例：单项目读取失败，其余项目保留；非当前运行事实');
  const tabs = ['概况','审批','产物','事件','问题','发布','来源'];
  tabs.forEach((label,i)=>{s+=pill(x+i*102,140,label,i===0?'#DDE4FF':C.card,i===0?C.primary:C.secondary,92,34);});
  s += rect(x, 194, 560, 246);
  s += cardTitle(x+18,219,'单项目阶段轨道','只画已登记节点');
  [0,1,2,3,4,5].forEach((i)=>{const cx=x+56+i*92;s+=line(cx,298,cx+72,298,i<4?C.primary:C.border,3);s+=dot(cx,298,i<3?C.success:i===3?C.warning:C.unknown,9);s+=text(cx,326,['市场','初始化','产品','UI/UX','架构','开发'][i],11,600,C.secondary,'middle');});
  s += text(x+18,382,'工作副本有未提交修改；批准事实仍以审批记录为准。',13,600,C.warning);
  s += rect(x+576,194,w-576,246);
  s += cardTitle(x+594,219,'项目真实性四轨','前端、后端、真实数据、生产独立');
  ['前端','后端','真实数据','生产'].forEach((label,i)=>{s+=text(x+594,267+i*38,label,12,650);s+=pill(x+678,253+i*38,['演示可浏览','未实现','未就绪','未授权'][i],[C.purpleSoft,C.soft,C.blueSoft,C.soft][i],[C.demo,C.unknown,C.info,C.unknown][i],104,26);});
  s += sourceTable(x,456,430,272,'stale');
  s += rect(x+446,456,w-446,250);
  s += cardTitle(x+464,481,'失败范围与恢复','只读重新读取不会修复源文件');
  ['错误码：来源解析失败（SOURCE_PARSE_FAILED）','影响：项目、审批、事件','仍可用：其余示例项目','最近成功：示例时间','根仓提交：示例哈希'].forEach((v,i)=>s+=text(x+464,526+i*30,v,12,i===2?650:500,i===2?C.demo:C.secondary));
  return s + closeSvg;
}

function mobileHeader(width, titleValue, statusLabel, statusKind) {
  let out = `<rect width="${width}" height="68" fill="${C.sidebar}"/>`;
  out += text(16, 25, 'AI 工作流控制中心', 17, 720, '#FFFFFF');
  out += text(16, 49, titleValue, 14, 500, '#C9D2FF');
  const cfg = statusKind === 'stale' ? [C.purpleSoft,C.demo] : statusKind === 'failed' ? [C.dangerSoft,C.danger] : statusKind === 'empty' ? [C.successSoft,C.success] : [C.blueSoft,C.info];
  out += pill(width-122,19,statusLabel,cfg[0],cfg[1],106,30,14);
  return out;
}

function bottomNav(width, height, selected = 0) {
  let out = rect(0,height-70,width,70,C.card,C.border,0);
  ['总览','项目','质量','更多'].forEach((label,i)=>{const cx=(i+.5)*width/4,current=i===selected?' aria-current="page"':'';out+=`<g role="img" aria-label="${label}" data-mobile-nav-label="${label}"${current}>`;out+=dot(cx,height-46,i===selected?C.primary:C.unknown,5);out+=text(cx,height-23,label,14,i===selected?700:500,i===selected?C.primary:C.secondary,'middle');out+='</g>';});
  return out;
}

function buildMobile390() {
  const width=390,height=844;
  let s=openSvg({width,height,id:'cc-mobile-390',title:'AI 工作流控制中心390移动来源、成熟度与系统状态设计',description:'390移动端覆盖来源、覆盖与新鲜度、成熟度与治理、系统状态与恢复三个目的页的陈旧真相与只读动作。'});
  s+=mobileHeader(width,'治理状态组合','上次快照','stale');
  s+=truthBar(16,84,width-32,'stale','目标态演示 · 数据已过期','当前失败：来源解析失败 · 非实时');
  s+=rect(16,158,width-32,164);s+=cardTitle(32,184,'监管状态条','关键真相不隐藏',14);
  [['进程健康','健康未知'],['数据就绪','降级可用'],['来源模式','上次快照']].forEach(([a,b],i)=>{s+=text(32,242+i*30,a,16,650);s+=text(width-32,242+i*30,b,16,700,i===0?C.unknown:i===1?C.warning:C.demo,'end');});
  s+=sourceTable(16,338,width-32,260,'stale');
  s+=rect(16,610,width-32,156);s+=text(32,634,'成熟度与治理',17,720,C.text,'start','data-mobile-maturity-line="0"');
  s+=text(32,668,'角色职责 · 阶段审批 · 产物追溯',14,600,C.text,'start','data-mobile-maturity-line="1"');
  s+=text(32,690,'自动执行 · 测试评测 · 可观测成本',14,600,C.text,'start','data-mobile-maturity-line="2"');
  s+=text(32,714,'规则：R1 · 样本：0 · 缺失：6',14,650,C.warning,'start','data-mobile-maturity-line="3"');
  s+=text(32,738,'来源解析失败（SOURCE_PARSE_FAILED）',14,600,C.warning,'start','class="mono" data-machine-value="true" data-mobile-maturity-line="4"');
  s+=text(32,758,'系统恢复：只读重读 · 零写',14,600,C.secondary,'start','data-mobile-maturity-line="5"');
  s+=bottomNav(width,height,3);
  return s+closeSvg;
}

function buildMobile320() {
  const width=320,height=720;
  let s=openSvg({width,height,id:'cc-mobile-320-source-stale',title:'AI 工作流控制中心320移动来源、成熟度与系统状态设计',description:'320移动端独立重排，覆盖来源、覆盖与新鲜度、成熟度与治理、系统状态与恢复三个目的页并显示当前失败原因。'});
  s+=mobileHeader(width,'治理状态组合','上次快照','stale');
  s+=truthBar(12,82,width-24,'stale','目标态演示 · 数据已过期','来源解析失败 · 非实时');
  s+=rect(12,156,width-24,132);s+=cardTitle(28,181,'监管状态条','同一真相态配对',14);
  [['进程健康','健康未知'],['数据就绪','降级可用'],['来源模式','上次快照']].forEach(([a,b],i)=>{s+=text(28,234+i*24,a,16,650);s+=text(292,234+i*24,b,16,700,i===0?C.unknown:i===1?C.warning:C.demo,'end');});
  s+=rect(12,304,width-24,170);s+=cardTitle(28,329,'来源与失败范围','源时间和观测时间分开',14);
  ['来源：工作流治理文件','快照：目标态示例时间','当前失败：来源解析失败'].forEach((v,i)=>s+=text(28,379+i*21,v,14,i===2?650:500,i===2?C.warning:C.secondary));
  s+=text(28,443,'错误码：SOURCE_PARSE_FAILED',14,600,C.secondary,'start','class="mono" data-machine-value="true"');s+=text(28,463,'影响：审批、事件、问题',14,500,C.secondary);
  s+=rect(12,486,width-24,160,C.card,C.border,12);s+=text(28,508,'成熟度与治理',17,720,C.text,'start','data-mobile-maturity-line="0"');
  s+=text(28,534,'角色职责 · 阶段审批 · 产物追溯',14,600,C.text,'start','data-mobile-maturity-line="1"');
  s+=text(28,556,'自动执行 · 测试评测 · 可观测成本',14,600,C.text,'start','data-mobile-maturity-line="2"');
  s+=text(28,580,'规则：R1 · 样本：0 · 缺失：6',14,650,C.warning,'start','data-mobile-maturity-line="3"');
  s+=text(28,604,'证据不足不计算 · 系统仅只读恢复',14,600,C.secondary,'start','data-mobile-maturity-line="4"');
  s+=text(28,628,'零写：无批准、发布、修复或 Git 写入',14,650,C.warning,'start','data-mobile-maturity-line="5"');
  s+=bottomNav(width,height,3);
  return s+closeSvg;
}

function buildReflow200() {
  const width=720,height=2600;
  let s=openSvg({width,height,id:'cc-reflow-200',title:'AI 工作流控制中心200%完整回流设计证据',description:'物理720像素对应有效CSS视口360像素，导航、筛选、图例、卡片、表格、抽屉与按钮全部按2倍呈现并纵向回流。'});
  s+=`<rect width="${width}" height="136" fill="${C.sidebar}"/>`;
  s+=text(32,48,'AI 工作流控制中心',34,720,'#FFFFFF');
  s+=text(32,98,'200% 放大 · 有效视口 360',28,500,'#C9D2FF');
  s+=pill(476,42,'只读监管',C.soft,C.primary,212,60,28);
  s+=rect(32,168,width-64,210,C.card,C.border,24);s+=text(64,214,'导航完整回流',40,720);['总览','项目','角色','质量','发布','治理'].forEach((label,i)=>{const col=i%3,row=Math.floor(i/3),bx=64+col*204,by=252+row*62;s+=rect(bx,by,184,52,i===0?C.blueSoft:C.soft,i===0?C.info:C.border,14);s+=text(bx+92,by+26,label,28,i===0?720:600,i===0?C.info:C.text,'middle');});
  s+=rect(32,410,width-64,116,C.blueSoft,C.info,20,'stroke-width="3"');s+=text(64,449,'○',42,700,C.info);s+=text(112,444,'数据未就绪',30,750,C.text);s+=text(112,490,'真实回流 · 无页面级横向滚动',28,500,C.secondary);
  s+=rect(32,558,width-64,430,C.card,C.border,24);s+=text(64,608,'筛选与搜索',40,720);['项目：全部','时间：近30天','迭代：全部','来源：正式'].forEach((label,i)=>{const by=650+i*68;s+=rect(64,by,592,54,C.soft,C.border,14);s+=text(88,by+27,label,28,600);s+=text(628,by+27,'⌄',30,700,C.secondary,'end');});s+=rect(64,930,592,54,C.card,C.primary,14,'stroke-width="3"');s+=text(88,957,'搜索项目、角色或证据',28,500,C.secondary);
  s+=rect(32,1020,width-64,440,C.card,C.border,24);s+=text(64,1070,'图表、图例与完整等价表',40,720);s+=pill(64,1104,'目标态演示',C.purpleSoft,C.demo,196,56,28);s+=pill(276,1104,'未知',C.soft,C.unknown,128,56,28);s+=pill(420,1104,'部分可用',C.warnSoft,C.warning,196,56,28);[['待修','2','演示'],['复测中','1','演示'],['已关闭','1','演示']].forEach((row,i)=>{const bx=74+i*190,bh=[100,72,54][i];s+=rect(bx,1292-bh,150,bh,[C.dangerSoft,C.warnSoft,C.successSoft][i],[C.danger,C.warning,C.success][i],10);s+=text(bx+75,1318,row[0],28,700,C.text,'middle');s+=text(bx+75,1182,row[1],28,750,[C.danger,C.warning,C.success][i],'middle');});s+=text(64,1374,'图例与标记不只靠颜色；完整数据见下表。',28,500,C.secondary);
  s+=rect(32,1492,width-64,402,C.card,C.border,24);s+=text(64,1542,'数据表／卡片回流',40,720);['字段','值','状态'].forEach((label,i)=>s+=text([64,360,656][i],1594,label,28,700,C.secondary,i===2?'end':'start'));[['待修','2','目标态演示'],['复测中','1','目标态演示'],['已关闭','1','目标态演示']].forEach((row,r)=>{const yy=1650+r*72;s+=line(64,yy+30,656,yy+30,C.border,2);s+=text(64,yy,row[0],28,650);s+=text(360,yy,row[1],28,700,C.primary);s+=text(656,yy,row[2],28,600,C.demo,'end');});
  s+=rect(32,1926,width-64,420,C.card,C.border,24);s+=text(64,1976,'证据详情抽屉',40,720);s+=text(64,2030,'业务结论：当前覆盖不可用，不能推导 0。',28,650,C.text);s+=text(64,2082,'来源：结构化治理文件',28,500,C.secondary);s+=text(64,2130,'哈希：尚无有效记录',28,500,C.secondary);s+=text(64,2178,'观测时间：尚无有效记录',28,500,C.secondary);s+=rect(64,2236,592,88,C.soft,C.primary,20);s+=text(360,2280,'关闭详情并返回触发控件',30,720,C.primary,'middle');
  s+=rect(32,2378,width-64,174,C.warnSoft,C.warning,24);s+=text(64,2426,'只读动作与零写边界',40,720,C.warning);s+=text(64,2478,'触控 44×44 CSS px → 88×88 物理 px',28,500,C.secondary);s+=text(64,2524,'无批准、发布、修复、删除或 Git 写入口。',28,650,C.text);
  return s+closeSvg;
}

const svgAssets = [
  ['00-design-system-1440',1440,1320,buildDesignSystem(),['设计系统','全局顶栏','输入框','Toast','加载态','hover','pressed','disabled','error','motion token','组件状态','对比度','焦点','空错降级','零写']],
  ['01-desktop-1440-current-not-ready',1440,1024,buildDesktopCurrent(),['总览','当前事实','not_ready','6个一级导航','未知不是0']],
  ['02-desktop-1440-target-live-demo',1440,1024,buildDesktopTarget(),['目标态演示','live-demo','项目阶段','审批','来源','问题','发布']],
  ['03-desktop-1440-chart-atlas',1440,ATLAS_HEIGHT,buildChartAtlas(),['19类专属图表','权威维度','全部可视标记与字段值状态等价表','追溯元数据']],
  ...desktopPageConfigs.map((config,index)=>[`10-desktop-1440-${config.file}`,1440,1024,buildDesktopPage(config,index),[config.title,'目标态演示','只读动作','证据下钻']]),
  ['04-tablet-1024-project-degraded',1024,768,buildTablet(),['项目详情','degraded','七页签','来源','失败范围']],
  ...tabletPageConfigs.map((config)=>[`20-tablet-1024-${config.file}`,1024,768,buildTabletPage(config),[config.title,'1024独立重排','中文折叠导航','零写']]),
  ['05-mobile-390-source-stale',390,844,buildMobile390(),['390独立重排','stale','来源新鲜度','只读恢复']],
  ['06-mobile-320-source-stale',320,720,buildMobile320(),['320独立重排','stale','来源新鲜度','错误原因','零写']],
  ...mobilePageConfigs.flatMap((config)=>[
    [`30-mobile-390-${config.file}`,390,844,buildMobilePage(390,config),[config.title,'390独立重排','正文至少16','触控至少44']],
    [`31-mobile-320-${config.file}`,320,720,buildMobilePage(320,config),[config.title,'320独立重排','正文至少16','触控至少44']]
  ]),
  ['07-reflow-720-200-percent',720,2600,buildReflow200(),['200%放大','有效视口360','导航','筛选','图例','表格卡片','抽屉','2倍token','无横向滚动']]
];

for (const [name,,,markup] of svgAssets) writeFileSync(join(root, `${name}.svg`), markup, 'utf8');

const pngAssets = [];
for (const [name,width,height,,coverage] of svgAssets) {
  const svgPath = join(root, `${name}.svg`);
  const pngPath = join(root, `${name}.png`);
  await sharp(readFileSync(svgPath), { density: 96 }).resize(width, height, { fit: 'fill' }).png().toFile(pngPath);
  pngAssets.push({
    id: name.toUpperCase().replaceAll('-', '_'),
    path: `ui/release-completeness-v1.0/${name}.png`,
    source_svg: `ui/release-completeness-v1.0/${name}.svg`,
    logical_viewport: name.includes('200-percent') ? { width: 360, height: height/2, zoom: '200%' } : { width, height },
    pixel_size: { width, height },
    sha256: sha(pngPath),
    source_svg_sha256: sha(svgPath),
    coverage
  });
}

const aiPath = join(root, '00-ai-visual-direction-current-not-ready.png');
if (!existsSync(aiPath)) throw new Error('缺少 image_gen 视觉方向资产');

const prototypePages = [
  { name:'总览',desktop:'01-desktop-1440-current-not-ready.png',mobile390:'30-mobile-390-overview.png',mobile320:'31-mobile-320-overview.png',truth:'当前事实 · 数据未就绪',dataMode:'current_unavailable',markType:null },
  { name:'项目与阶段',desktop:'10-desktop-1440-D02-projects.png',mobile390:'30-mobile-390-projects.png',mobile320:'31-mobile-320-projects.png',truth:'目标态演示数据 · 非当前运行事实',dataMode:'target_demo',markType:'项目' },
  { name:'项目证据详情',desktop:'10-desktop-1440-D03-project-detail.png',mobile390:'30-mobile-390-projects.png',mobile320:'31-mobile-320-projects.png',truth:'目标态演示数据 · 非当前运行事实',dataMode:'target_demo',markType:'项目' },
  { name:'固定角色协作',desktop:'10-desktop-1440-D04-roles.png',mobile390:'30-mobile-390-projects.png',mobile320:'31-mobile-320-projects.png',truth:'目标态演示数据 · 非当前运行事实',dataMode:'target_demo',markType:'固定角色' },
  { name:'审批与待审',desktop:'10-desktop-1440-D05-approvals.png',mobile390:'30-mobile-390-approvals.png',mobile320:'31-mobile-320-approvals.png',truth:'目标态演示 · 查询成功，确实为空',dataMode:'evidenced_empty',markType:null },
  { name:'产物与哈希',desktop:'10-desktop-1440-D06-artifacts.png',mobile390:'30-mobile-390-artifacts.png',mobile320:'31-mobile-320-artifacts.png',truth:'目标态演示数据 · 非当前运行事实',dataMode:'target_demo',markType:'产物' },
  { name:'事件审计',desktop:'10-desktop-1440-D07-events.png',mobile390:'30-mobile-390-events.png',mobile320:'31-mobile-320-events.png',truth:'目标态演示数据 · 非当前运行事实',dataMode:'target_demo',markType:'事件' },
  { name:'问题、Bug 与复测',desktop:'10-desktop-1440-D08-issues.png',mobile390:'30-mobile-390-issues.png',mobile320:'31-mobile-320-issues.png',truth:'目标态演示数据 · 非当前运行事实',dataMode:'target_demo',markType:'问题' },
  { name:'迭代与发布',desktop:'10-desktop-1440-D09-releases.png',mobile390:'30-mobile-390-releases.png',mobile320:'31-mobile-320-releases.png',truth:'目标态演示数据 · 非当前运行事实',dataMode:'target_demo',markType:'发布' },
  { name:'来源、覆盖与新鲜度',desktop:'10-desktop-1440-D10-sources.png',mobile390:'05-mobile-390-source-stale.png',mobile320:'06-mobile-320-source-stale.png',truth:'目标态演示 · 来源失败与陈旧状态',dataMode:'stale_snapshot',markType:'事件' },
  { name:'成熟度与治理',desktop:'10-desktop-1440-D11-maturity.png',mobile390:'05-mobile-390-source-stale.png',mobile320:'06-mobile-320-source-stale.png',truth:'目标态演示数据 · 证据不足不计算',dataMode:'target_demo',markType:'治理' },
  { name:'系统状态与恢复',desktop:'10-desktop-1440-D12-system-status.png',mobile390:'05-mobile-390-source-stale.png',mobile320:'06-mobile-320-source-stale.png',truth:'目标态演示 · 同一陈旧真相态配对',dataMode:'stale_snapshot',markType:'问题' }
];
const routePrimaryIndexes=[0,1,1,2,1,1,3,3,4,5,5,5];
const prototypeNavigation=nav.map((primaryName,primaryIndex)=>({primaryName,pages:prototypePages.map((page,index)=>({...page,index})).filter((page)=>routePrimaryIndexes[page.index]===primaryIndex)}));
const prototypeHtml = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI 工作流控制中心 · CC-UI-002 可点击设计原型</title>
<style>
:root{color-scheme:light;--page:#F3F5F8;--card:#fff;--nav:#171B4B;--primary:#3347B8;--text:#17201D;--border:#D8DFE3;--focus:#2563EB}
*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--text);font:16px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
header{display:flex;align-items:center;gap:16px;padding:12px 24px;background:#fff;color:var(--text);border-bottom:1px solid var(--border)}header strong{font-size:18px}header span{margin-left:auto;font-size:14px;color:#475467}
.layout{display:grid;grid-template-columns:240px minmax(0,1fr);min-height:calc(100vh - 64px)}nav{padding:18px;background:#fff;border-right:1px solid var(--border)}nav button,.actions button{width:100%;min-height:44px;margin:0 0 8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:#fff;color:var(--text);text-align:left;font:inherit;cursor:pointer}nav button[aria-current="page"]{background:#E8ECFF;border-color:var(--primary);color:var(--primary);font-weight:700}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
nav section{margin:0 0 14px}nav h2{margin:0 0 6px;font-size:14px;color:#475467}button:disabled{cursor:not-allowed;opacity:.55;background:#EEF1F5;color:#475467}.mono,dd,.result-card,.drawer{overflow-wrap:anywhere;word-break:break-word}
main{min-width:0;padding:20px}.truth{display:flex;gap:12px;align-items:center;margin-bottom:16px;padding:12px 16px;border:1px solid var(--primary);border-radius:10px;background:#EAF2FF}.truth h1{min-width:260px;margin:0;font-size:20px}.controls,.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}.controls label{display:grid;gap:4px;font-size:14px;color:#475467}.controls input,.controls select{min-height:44px;min-width:150px;border:1px solid var(--border);border-radius:8px;background:#fff;padding:8px 10px;font:inherit}.controls .search{display:flex;align-items:end;gap:8px}.actions button{width:auto;margin:0}.query-result{margin-bottom:16px;padding:14px 16px;border:1px solid var(--border);border-radius:10px;background:#fff}.query-result h2{margin:0 0 8px;font-size:18px}.result-group{margin-top:12px}.result-group h3{margin:0 0 6px;font-size:16px}.result-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}.result-card{padding:10px;border:1px solid var(--border);border-radius:8px}.interactive-grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(360px,1.2fr);gap:16px}.chart-points{display:grid;gap:8px;align-content:start}.chart-point{min-height:52px;padding:8px 12px;border:2px solid var(--primary);border-radius:10px;background:#EAF2FF;color:var(--text);font:inherit;text-align:left}.chart-point[aria-pressed="true"]{background:#3347B8;color:#fff}.equivalent{width:100%;border-collapse:collapse}.equivalent caption{text-align:left;font-weight:700;margin-bottom:8px}.equivalent th,.equivalent td{padding:8px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}.frame{overflow:auto;border:1px solid var(--border);border-radius:12px;background:#fff}.frame picture,.frame img{display:block;width:100%;height:auto}.drawer{display:none;margin-top:16px;padding:16px;border:1px solid var(--border);border-radius:10px;background:#fff}.drawer[data-open="true"]{display:block}.drawer-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.drawer-head h2{margin:0}.drawer-head button,.drawer-actions button{min-height:44px;padding:8px 14px;border:1px solid var(--border);border-radius:8px;background:#fff;font:inherit}.drawer-actions{display:flex;gap:8px;flex-wrap:wrap}.note{font-size:14px;color:#475467}.mobile-bottom,.mobile-more{display:none}
@media(max-width:800px){header{align-items:flex-start;flex-direction:column}header span{margin-left:0}.layout{grid-template-columns:1fr}nav{display:flex;overflow:auto;border-right:0;border-bottom:1px solid var(--border)}nav section{min-width:172px}nav button{min-width:150px}.truth{align-items:flex-start;flex-direction:column}.truth h1{min-width:0}.controls label,.controls .search{width:100%}.controls input,.controls select{width:100%}.interactive-grid{grid-template-columns:1fr}.frame img{max-width:430px;margin:auto}main{padding-bottom:92px}.mobile-bottom{position:fixed;z-index:30;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(4,1fr);height:72px;padding:6px 8px;background:#fff;border-top:1px solid var(--border)}.mobile-bottom button{min-width:0;min-height:52px;border:0;background:#fff;color:#475467;font:inherit}.mobile-bottom button[aria-current="page"]{color:var(--primary);font-weight:700}.mobile-more{position:fixed;z-index:31;left:12px;right:12px;bottom:78px;max-height:60vh;overflow:auto;padding:12px;background:#fff;border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 30px #17201D26}.mobile-more:not([hidden]){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mobile-more button{min-height:44px;border:1px solid var(--border);border-radius:8px;background:#fff;color:var(--text);font:inherit;text-align:left}}
</style></head><body>
<header><strong>CC-UI-002 设计评审工具栏</strong><span>只读原型 · 不属于产品导航 · 不连接监管服务</span></header>
<div class="layout"><nav aria-label="6 个一级导航与 12 个 P0 目的页">${prototypeNavigation.map((group)=>`<section data-primary-group="${group.primaryName}"><h2>${group.primaryName}</h2>${group.pages.map((page)=>`<button type="button" data-index="${page.index}" ${page.index===0?'aria-current="page"':''}>${page.name}</button>`).join('')}</section>`).join('')}</nav>
<main><div class="truth" role="status"><h1 id="page-title" tabindex="-1">总览</h1><span id="truth-copy">当前事实 · 数据未就绪</span></div>
<form id="filters" class="controls" aria-label="全局只读查询控件"><label>项目<select id="project-filter"><option>全部项目</option><option>AI 工作流控制中心</option><option>AI 英语学习</option><option>前端职业成长雷达</option><option>AI 大模型情报雷达</option></select></label><label>时间<select id="time-filter"><option>近 30 天</option><option>过去 24 小时</option><option>全部时间</option></select></label><label>迭代<select id="iteration-filter"><option>全部迭代</option><option>当前迭代</option></select></label><label>来源模式<select id="source-filter"><option>正式来源</option><option>静态回退</option><option>审批登记</option></select></label><div class="search"><label>搜索<input id="search-input" type="search" placeholder="项目、角色或证据"></label><button id="search-submit" type="submit">搜索</button></div></form>
<div class="toolbar actions" aria-label="只读原型动作"><button id="detail" type="button" aria-controls="drawer" aria-expanded="false">查看证据详情</button><button id="chart-mark" type="button" aria-controls="drawer" aria-expanded="false">查看图表标记</button><button id="issue-retest" type="button" aria-controls="drawer" aria-expanded="false">问题 → 复测证据</button><button id="release-gate" type="button" aria-controls="drawer" aria-expanded="false">发布 → 门禁证据</button><button id="status-source" type="button" aria-controls="drawer" aria-expanded="false">状态 → 来源错误</button><button id="refresh" type="button">只读重新读取</button><button id="export" type="button">导出当前查询</button></div>
<section class="query-result" aria-labelledby="query-title"><h2 id="query-title">当前只读查询：<span id="result-count">—</span></h2><p id="query-scope" class="note">当前事实 · 数据未就绪</p><div id="result-list"></div><button id="clear-filter" type="button">清除筛选</button></section>
<section class="query-result" aria-labelledby="interactive-title"><h2 id="interactive-title">随筛选联动的交互图与完整等价表</h2><p id="chart-context" class="note">当前事实未就绪；没有图表标记。</p><div class="interactive-grid"><div id="interactive-chart" class="chart-points" role="group" aria-label="可切换交叉筛选的数据点"></div><table class="equivalent"><caption>当前筛选完整等价表</caption><thead><tr><th>对象</th><th>类型</th><th>来源／哈希</th><th>更新时间／真实性</th></tr></thead><tbody id="interactive-table-body"><tr><td colspan="4">当前无有效观测</td></tr></tbody></table></div></section>
<section id="export-preview" class="query-result" aria-labelledby="export-title" role="status" hidden><h2 id="export-title">当前查询导出预览</h2><p class="note">只读预览，不生成文件，不执行写入。</p><dl><dt>当前筛选</dt><dd id="export-filters">—</dd><dt>来源</dt><dd id="export-source">—</dd><dt>来源哈希</dt><dd id="export-hash">—</dd><dt>查询范围哈希</dt><dd id="export-scope-hash">—</dd><dt>错误</dt><dd id="export-error">—</dd><dt>生成时间</dt><dd id="export-time">—</dd><dt>真实性标签</dt><dd id="export-truth">—</dd><dt>预览记录</dt><dd id="export-records">—</dd></dl></section>
<div class="frame"><picture><source id="screen-320" media="(max-width:340px)" srcset="31-mobile-320-overview.png"><source id="screen-390" media="(max-width:430px)" srcset="30-mobile-390-overview.png"><img id="screen" src="01-desktop-1440-current-not-ready.png" alt="总览页面设计稿"></picture></div>
<section id="drawer" class="drawer" data-open="false" aria-labelledby="drawer-title"><div class="drawer-head"><h2 id="drawer-title">证据详情</h2><button id="close-drawer" type="button">关闭详情</button></div><p id="drawer-copy">来源路径、哈希、根仓提交、观测时间、覆盖和错误在目标产品中可追溯。</p><div class="drawer-actions"><button id="copy-sha" type="button">复制权威 Prompt SHA256</button><button id="copy-error" type="button">复制错误码示例</button></div><p class="note">按 Escape 关闭并返回触发控件。本原型不连接读取器，不执行审批、发布、修复、删除或 Git 写入。</p></section>
<p id="announce" class="note" aria-live="polite">原型已就绪；当前未连接真实监管服务。</p></main></div>
<div id="mobile-more-menu" class="mobile-more" aria-label="更多目的页" hidden>${prototypePages.map((page,index)=>`<button type="button" data-mobile-page="${index}">${page.name}</button>`).join('')}</div>
<div id="mobile-bottom-nav" class="mobile-bottom" aria-label="移动端一级导航"><button type="button" data-mobile-page="0">总览</button><button type="button" data-mobile-page="1">项目</button><button type="button" data-mobile-page="7">质量</button><button id="mobile-more-toggle" type="button" aria-controls="mobile-more-menu" aria-expanded="false">更多</button></div>
<script>
const pages=${JSON.stringify(prototypePages)};
const fixedRoleNames=${JSON.stringify(fixedRoles)};
const approvalSourceEvidence=${JSON.stringify({...APPROVAL_SOURCE_EVIDENCE,source_sha256:APPROVAL_SOURCE_SHA,scope_sha256:DEFAULT_APPROVAL_SCOPE_SHA})};
const buttons=[...document.querySelectorAll('nav [data-index]')],buttonByPageIndex=new Map(buttons.map((button)=>[Number(button.dataset.index),button])),mobilePageButtons=[...document.querySelectorAll('[data-mobile-page]')],mobileMoreToggle=document.querySelector('#mobile-more-toggle'),mobileMoreMenu=document.querySelector('#mobile-more-menu'),img=document.querySelector('#screen'),source390=document.querySelector('#screen-390'),source320=document.querySelector('#screen-320'),title=document.querySelector('#page-title'),truth=document.querySelector('#truth-copy'),announce=document.querySelector('#announce'),drawer=document.querySelector('#drawer'),drawerTitle=document.querySelector('#drawer-title'),drawerCopy=document.querySelector('#drawer-copy'),resultCount=document.querySelector('#result-count'),resultList=document.querySelector('#result-list'),queryScope=document.querySelector('#query-scope'),exportPreview=document.querySelector('#export-preview'),interactiveChart=document.querySelector('#interactive-chart'),interactiveTable=document.querySelector('#interactive-table-body'),chartContext=document.querySelector('#chart-context');
const baseRecords=[
{project:'AI 工作流控制中心',type:'项目',name:'发布完整性设计',source:'项目状态',sourceMode:'正式来源',ageHours:6,iteration:'当前迭代',hash:'cc-7a1',error:'无',truth:'目标态演示数据',updatedAt:'2026-08-16 22:45'},
{project:'AI 工作流控制中心',type:'问题',name:'来源解析失败',source:'静态回退',sourceMode:'静态回退',ageHours:52,iteration:'当前迭代',hash:'cc-err-2',error:'来源解析失败（SOURCE_PARSE_FAILED）',truth:'上次快照，已过期',updatedAt:'2026-08-14 18:20'},
{project:'AI 英语学习',type:'审批',name:'设计审批记录',source:'审批登记',sourceMode:'正式来源',ageHours:18,iteration:'当前迭代',hash:'el-3b2',error:'无',truth:'目标态演示数据',updatedAt:'2026-08-16 10:45'},
{project:'AI 英语学习',type:'产物',name:'历史视觉母版',source:'产物登记',sourceMode:'正式来源',ageHours:240,iteration:'历史迭代',hash:'el-8f1',error:'无',truth:'历史记录',updatedAt:'2026-08-06 12:10'},
{project:'AI 工作流控制中心',type:'产物',name:'目标态发布完整性设计产物',source:'产物登记',sourceMode:'正式来源',ageHours:5,iteration:'当前迭代',hash:'cc-artifact-demo',error:'无',truth:'目标态演示数据',updatedAt:'2026-08-16 23:10'},
{project:'前端职业成长雷达',type:'问题',name:'复测证据缺口',source:'问题登记',sourceMode:'正式来源',ageHours:26,iteration:'当前迭代',hash:'cr-4d9',error:'证据不足',truth:'部分数据可用',updatedAt:'2026-08-15 20:10'},
{project:'前端职业成长雷达',type:'审批',name:'独立视觉审查',source:'静态回退',sourceMode:'静态回退',ageHours:72,iteration:'历史迭代',hash:'cr-a20',error:'无',truth:'上次快照，已过期',updatedAt:'2026-08-13 22:45'},
{project:'AI 大模型情报雷达',type:'发布',name:'门禁证据',source:'发布登记',sourceMode:'正式来源',ageHours:12,iteration:'当前迭代',hash:'mr-1c4',error:'授权未完成',truth:'目标态演示数据',updatedAt:'2026-08-16 16:40'},
{project:'AI 大模型情报雷达',type:'事件',name:'来源连接状态',source:'静态回退',sourceMode:'静态回退',ageHours:90,iteration:'历史迭代',hash:'mr-f02',error:'连接器未接通（CONNECTOR_NOT_READY）',truth:'上次快照，已过期',updatedAt:'2026-08-13 04:45'},
{project:'AI 工作流控制中心',type:'事件',name:'目标态审计事件',source:'事件登记',sourceMode:'正式来源',ageHours:9,iteration:'当前迭代',hash:'cc-evt-demo',error:'无',truth:'目标态演示数据',updatedAt:'2026-08-16 21:45'},
{project:'前端职业成长雷达',type:'问题',name:'目标态复测证据',source:'问题登记',sourceMode:'正式来源',ageHours:14,iteration:'当前迭代',hash:'cr-issue-demo',error:'证据不足',truth:'目标态演示数据',updatedAt:'2026-08-16 16:45'},
{project:'AI 工作流控制中心',type:'治理',name:'成熟度证据缺口',source:'治理规则',sourceMode:'正式来源',ageHours:7,iteration:'当前迭代',hash:'cc-maturity-demo',error:'证据不足',truth:'目标态演示数据',updatedAt:'2026-08-16 22:05'}
];
const roleRecords=fixedRoleNames.map((name,index)=>({project:'AI 工作流控制中心',type:'固定角色',name,source:'角色登记',sourceMode:'正式来源',ageHours:8+index,iteration:'当前迭代',hash:'role-'+String(index).padStart(2,'0'),error:'无',truth:'目标态演示数据',updatedAt:'2026-08-16 '+String(10+Math.floor(index/6)).padStart(2,'0')+':'+String((index%6)*8).padStart(2,'0')}));
const records=[...baseRecords,...roleRecords];let crossFilter='',lastTrigger=null,activePageIndex=0;
const escapeHtml=(value)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
async function sha256Hex(value){const bytes=new TextEncoder().encode(value),digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map((byte)=>byte.toString(16).padStart(2,'0')).join('');}
function currentEmptyEvidenceSeed(){return 'page=approvals|project=全部项目|time=近 30 天|iteration=全部迭代|source=审批登记|query=|cross=|record-count=0';}
function syncUrl({push=false}={}){const url=new URL(location.href),values={page:String(activePageIndex),project:document.querySelector('#project-filter').value,time:document.querySelector('#time-filter').value,iteration:document.querySelector('#iteration-filter').value,source:document.querySelector('#source-filter').value,q:document.querySelector('#search-input').value,cross:crossFilter};Object.entries(values).forEach(([key,value])=>value?url.searchParams.set(key,value):url.searchParams.delete(key));history[push?'pushState':'replaceState'](null,'',url);}
function setDrawerExpanded(trigger){document.querySelectorAll('[aria-controls="drawer"]').forEach((item)=>item.setAttribute('aria-expanded',String(item===trigger&&drawer.dataset.open==='true')));}
function closeEvidence({returnFocus=true,announceClose=true}={}){if(drawer.dataset.open!=='true')return;drawer.dataset.open='false';setDrawerExpanded(null);if(announceClose)announce.textContent='已关闭证据详情。';if(returnFocus&&lastTrigger)lastTrigger.focus();}
function syncMarkAvailability(dataMode,hasMarks=false){const disabled=dataMode==='current_unavailable'||dataMode==='evidenced_empty'||!hasMarks,control=document.querySelector('#chart-mark');control.disabled=disabled;control.hidden=disabled;control.setAttribute('aria-disabled',String(disabled));control.dataset.availability=disabled?'no-mark':'available';}
function closeMobileMore({returnFocus=false}={}){const wasOpen=!mobileMoreMenu.hidden;mobileMoreMenu.hidden=true;mobileMoreToggle.setAttribute('aria-expanded','false');if(wasOpen&&returnFocus)mobileMoreToggle.focus();}
function syncMobileNavigation(index){mobilePageButtons.forEach((button)=>button.removeAttribute('aria-current'));mobileMoreToggle.removeAttribute('aria-current');const primaryIndex=index===0?0:index>=1&&index<=6?1:index===7?7:null;if(primaryIndex!==null)document.querySelector('#mobile-bottom-nav [data-mobile-page="'+primaryIndex+'"]')?.setAttribute('aria-current','page');else mobileMoreToggle.setAttribute('aria-current','page');const exactMore=mobileMoreMenu.querySelector('[data-mobile-page="'+index+'"]');if(exactMore)exactMore.setAttribute('aria-current','page');}
function syncEvidenceScopeControls(dataMode){const locked=dataMode==='evidenced_empty',controls=['project-filter','time-filter','iteration-filter','source-filter','search-input','search-submit','clear-filter'];controls.forEach((id)=>{const control=document.getElementById(id);control.disabled=locked;control.setAttribute('aria-disabled',String(locked));});if(locked){document.querySelector('#project-filter').value='全部项目';document.querySelector('#time-filter').value='近 30 天';document.querySelector('#iteration-filter').value='全部迭代';document.querySelector('#source-filter').value='审批登记';document.querySelector('#search-input').value='';crossFilter='';}}
function activatePage(index,{sync=true,render=true,pushHistory=false,focusTitle=false}={}){if(drawer.dataset.open==='true')closeEvidence({returnFocus:false,announceClose:false});activePageIndex=index;const page=pages[index];document.body.dataset.pageIndex=String(index);document.body.dataset.dataMode=page.dataMode;syncMarkAvailability(page.dataMode,false);buttons.forEach((item)=>item.removeAttribute('aria-current'));buttonByPageIndex.get(index).setAttribute('aria-current','page');syncMobileNavigation(index);closeMobileMore();img.src=page.desktop;source390.srcset=page.mobile390;source320.srcset=page.mobile320;img.alt=page.name+'页面设计稿';title.textContent=page.name;truth.textContent=page.truth;if(render){syncEvidenceScopeControls(page.dataMode);if(page.dataMode!=='evidenced_empty')document.querySelector('#source-filter').value=page.dataMode==='stale_snapshot'?'静态回退':'正式来源';}announce.textContent='已切换到'+page.name+'设计页；详情抽屉已清空，响应式资产与页级真相数据源已同步。';if(render)renderQuery({sync,pushHistory});else if(sync)syncUrl({push:pushHistory});if(focusTitle)title.focus();}
buttons.forEach((button)=>{const pageIndex=Number(button.dataset.index);button.addEventListener('click',()=>activatePage(pageIndex,{pushHistory:true}));button.addEventListener('keydown',(event)=>{if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(event.key))return;event.preventDefault();const step=['ArrowRight','ArrowDown'].includes(event.key)?1:-1,next=(pageIndex+step+pages.length)%pages.length;buttonByPageIndex.get(next).focus();activatePage(next,{pushHistory:true});});});
mobilePageButtons.forEach((button)=>button.addEventListener('click',()=>{const fromMore=Boolean(button.closest('#mobile-more-menu'));activatePage(Number(button.dataset.mobilePage),{pushHistory:true,focusTitle:fromMore});}));mobileMoreToggle.addEventListener('click',()=>{const willOpen=mobileMoreMenu.hidden;if(willOpen){mobileMoreMenu.hidden=false;mobileMoreToggle.setAttribute('aria-expanded','true');announce.textContent='已打开更多目的页菜单。';}else{closeMobileMore({returnFocus:true});announce.textContent='已关闭更多目的页菜单。';}});
function eligibleRecordsForMode(mode){if(mode==='current_unavailable'||mode==='evidenced_empty')return[];if(mode==='stale_snapshot')return records.filter((record)=>record.truth==='上次快照，已过期');return records.filter((record)=>record.truth==='目标态演示数据');}
function renderInteractive(baseRows,rows,dataMode){
  const markType=pages[activePageIndex].markType,contextRows=markType?baseRows.filter((record)=>record.type===markType):[];
  syncMarkAvailability(dataMode,contextRows.length>0);
  if(dataMode==='current_unavailable'){chartContext.textContent='当前事实未就绪；目标态、历史与陈旧示例已物理排除，不能推导 0。';interactiveChart.innerHTML='<p class="note">覆盖不可用：不绘制图表标记；标记下钻已禁用。</p>';interactiveTable.innerHTML='<tr><td colspan="4">当前无有效观测；不是有证据的 0。</td></tr>';return;}
  if(dataMode==='evidenced_empty'){chartContext.textContent='查询成功且审批来源可用；记录数为有证据的 0。';interactiveChart.innerHTML='<p class="note">成功空态：不绘制老化柱或目标态记录；标记下钻已禁用。</p>';interactiveTable.innerHTML='<tr><td colspan="4">审批查询成功，确实为空；记录数 0 且来源可用。</td></tr>';return;}
  const groups=[...new Set(baseRows.map((record)=>record.type))].sort();chartContext.textContent=(markType?'本页主标记：'+markType+'；':'')+'图表、完整等价表与导出共享当前筛选；再次点击同一数据点可取消交叉筛选。';interactiveChart.innerHTML=groups.length?groups.map((type)=>{const items=baseRows.filter((record)=>record.type===type),latest=items.map((record)=>record.updatedAt).sort().at(-1);return '<button class="chart-point" type="button" data-chart-type="'+escapeHtml(type)+'" aria-pressed="'+String(crossFilter===type)+'"><strong>'+escapeHtml(type)+'：'+items.length+' 条</strong><br><span>最近更新 '+escapeHtml(latest)+'</span></button>';}).join(''):'<p class="note">查询成功，当前筛选确实为空。</p>';
  interactiveTable.innerHTML=rows.length?rows.map((record)=>'<tr><td>'+escapeHtml(record.project+'｜'+record.name)+'</td><td>'+escapeHtml(record.type)+'</td><td>'+escapeHtml(record.source+'｜'+record.hash)+'</td><td>'+escapeHtml(record.updatedAt+'｜'+record.truth)+'</td></tr>').join(''):'<tr><td colspan="4">查询成功，当前筛选确实为空；可清除筛选。</td></tr>';
  interactiveChart.querySelectorAll('[data-chart-type]').forEach((point)=>point.addEventListener('click',()=>{const type=point.dataset.chartType;crossFilter=crossFilter===type?'':type;renderQuery();announce.textContent=crossFilter?'已按图表数据点筛选：'+crossFilter+'。再次点击可取消。':'已取消图表交叉筛选。';}));
}
function renderQuery({sync=true,pushHistory=false}={}){
  const project=document.querySelector('#project-filter').value,query=document.querySelector('#search-input').value.trim().toLowerCase(),time=document.querySelector('#time-filter').value,iteration=document.querySelector('#iteration-filter').value,source=document.querySelector('#source-filter').value,dataMode=pages[activePageIndex].dataMode,currentUnavailable=dataMode==='current_unavailable',evidencedEmpty=dataMode==='evidenced_empty',eligibleRecords=eligibleRecordsForMode(dataMode);
  const baseRows=eligibleRecords.filter((record)=>(project==='全部项目'||record.project===project)&&(!query||(record.project+record.type+record.name+record.source+record.hash+record.error+record.updatedAt).toLowerCase().includes(query))&&(time==='全部时间'||time==='近 30 天'&&record.ageHours<=720||time==='过去 24 小时'&&record.ageHours<=24)&&(iteration==='全部迭代'||record.iteration===iteration)&&record.sourceMode===source);
  const rows=baseRows.filter((record)=>!crossFilter||record.type===crossFilter);resultCount.textContent=currentUnavailable?'不可用':String(rows.length)+' 条';queryScope.textContent=evidencedEmpty?['审批查询成功：记录数 0','范围已锁定',approvalSourceEvidence.source_id,'来源状态：'+approvalSourceEvidence.source_status,'观测时间：'+approvalSourceEvidence.observed_at,'来源 SHA256：'+approvalSourceEvidence.source_sha256].join(' · '):[currentUnavailable?'当前事实未就绪：示例记录已排除':dataMode==='stale_snapshot'?'陈旧快照：目标态记录已排除':'目标态演示数据',project,time,iteration,source,query?'搜索：'+query:'',crossFilter?'图表交叉筛选：'+crossFilter:''].filter(Boolean).join(' · ');
  if(currentUnavailable){resultList.innerHTML='<div class="result-card"><strong>当前没有有效观测</strong><br><span class="note">目标态、历史与陈旧记录未进入当前统计；不能把未知换算为 0。</span></div>';}else if(evidencedEmpty){resultList.innerHTML='<div class="result-card"><strong>审批查询成功，确实为空</strong><br><span class="note">记录数 0；来源 '+escapeHtml(approvalSourceEvidence.source_id)+' 状态可用，观测于 '+escapeHtml(approvalSourceEvidence.observed_at)+'。来源 SHA256 与查询范围 SHA256 分开记录。</span></div>';}else if(!rows.length){resultList.innerHTML='<div class="result-card"><strong>当前筛选确实为空</strong><br><span class="note">查询成功且来源可用；可清除筛选。</span></div>';}else{const grouped=rows.reduce((result,record)=>{(result[record.type]??=[]).push(record);return result;},{});resultList.innerHTML=Object.entries(grouped).map(([type,items])=>'<section class="result-group"><h3>'+escapeHtml(type)+'（'+items.length+'）</h3><div class="result-grid">'+items.map((record)=>'<div class="result-card"><strong>'+escapeHtml(record.name)+'</strong><br><span class="note">'+escapeHtml(record.project+' · '+record.source+' · '+record.hash+' · 更新 '+record.updatedAt+' · '+record.truth)+'</span></div>').join('')+'</div></section>').join('');}
  renderInteractive(baseRows,rows,dataMode);announce.textContent=currentUnavailable?'当前事实数据未就绪；未显示虚构 0。':evidencedEmpty?'审批查询成功，确实为空；来源证据与查询范围已锁定。':'只读查询已更新，共 '+rows.length+' 条结果。';exportPreview.hidden=true;if(sync)syncUrl({push:pushHistory});return rows;
}
function openEvidence(heading,copy,trigger){lastTrigger=trigger;drawer.dataset.open='true';setDrawerExpanded(trigger);drawerTitle.textContent=heading;drawerCopy.textContent=copy;drawerTitle.setAttribute('tabindex','-1');drawerTitle.focus();announce.textContent='已打开'+heading+'；只读查看。';}
document.querySelector('#detail').addEventListener('click',(event)=>openEvidence('证据详情','来源路径、哈希、根仓提交、观测时间、覆盖和错误保持同一上下文。',event.currentTarget));
document.querySelector('#chart-mark').addEventListener('click',(event)=>{const markType=pages[activePageIndex].markType;if(!markType)return;crossFilter=crossFilter===markType?'':markType;renderQuery();openEvidence('图表标记证据',crossFilter?'已交叉筛选本页“'+markType+'”记录；图与表同步更新，再次点击同一点可取消。':'图表交叉筛选已取消；图与表恢复当前查询。',event.currentTarget);});
document.querySelector('#issue-retest').addEventListener('click',(event)=>{activatePage(7);crossFilter='问题';renderQuery();openEvidence('问题与复测证据','问题严重度、状态、复测结果和来源事件保持关联；覆盖未知不计算通过率。',event.currentTarget);});
document.querySelector('#release-gate').addEventListener('click',(event)=>{activatePage(8);crossFilter='发布';renderQuery();openEvidence('发布门禁证据','构建、测试、安全、回滚、监控与授权六门分别展示；未验证门禁不能显示成功。',event.currentTarget);});
document.querySelector('#status-source').addEventListener('click',(event)=>{activatePage(11);crossFilter='';renderQuery();openEvidence('来源错误详情','错误名称：来源解析失败（SOURCE_PARSE_FAILED）；影响范围与最近成功分开，当前真实读取器仍未接通。',event.currentTarget);});
document.querySelector('#filters').addEventListener('submit',(event)=>{event.preventDefault();renderQuery();});document.querySelectorAll('#filters select').forEach((control)=>control.addEventListener('change',()=>renderQuery()));
document.querySelector('#clear-filter').addEventListener('click',()=>{crossFilter='';document.querySelector('#search-input').value='';if(pages[activePageIndex].dataMode==='evidenced_empty'){syncEvidenceScopeControls('evidenced_empty');}else{document.querySelectorAll('#filters select').forEach((control)=>control.selectedIndex=0);document.querySelector('#source-filter').value=pages[activePageIndex].dataMode==='stale_snapshot'?'静态回退':'正式来源';}renderQuery();});document.querySelector('#close-drawer').addEventListener('click',()=>closeEvidence());document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){closeEvidence();closeMobileMore({returnFocus:true});}});
function announceCopy(label,value){if(navigator.clipboard?.writeText)void navigator.clipboard.writeText(value);announce.textContent=label+'已准备复制：'+value;}
document.querySelector('#copy-sha').addEventListener('click',()=>announceCopy('权威 Prompt SHA256','caafe53a51a77283c363483bf34b9dba843f5a1add8d7fd17c9d74a1d336570e'));document.querySelector('#copy-error').addEventListener('click',()=>announceCopy('错误码示例','SOURCE_PARSE_FAILED'));
document.querySelector('#refresh').addEventListener('click',()=>announce.textContent='原型提示：真实读取器尚未接通，未执行读取。');document.querySelector('#export').addEventListener('click',async()=>{const rows=renderQuery(),scope=queryScope.textContent,dataMode=pages[activePageIndex].dataMode,currentUnavailable=dataMode==='current_unavailable',evidencedEmpty=dataMode==='evidenced_empty',scopeHash=evidencedEmpty?await sha256Hex(currentEmptyEvidenceSeed()):'—';exportPreview.hidden=false;document.querySelector('#export-filters').textContent=scope;document.querySelector('#export-source').textContent=currentUnavailable?'尚无有效来源记录':evidencedEmpty?approvalSourceEvidence.source_id+'（状态：'+approvalSourceEvidence.source_status+'；观测：'+approvalSourceEvidence.observed_at+'）':[...new Set(rows.map((record)=>record.source))].join('、')||'当前筛选无记录';document.querySelector('#export-hash').textContent=currentUnavailable?'—':evidencedEmpty?approvalSourceEvidence.source_sha256:[...new Set(rows.map((record)=>record.hash))].join('、')||'—';document.querySelector('#export-scope-hash').textContent=scopeHash;document.querySelector('#export-error').textContent=currentUnavailable?'真实读取器尚未接通':evidencedEmpty?'无':[...new Set(rows.map((record)=>record.error))].join('、')||'当前筛选无记录';document.querySelector('#export-time').textContent=new Date().toISOString();document.querySelector('#export-truth').textContent=currentUnavailable?'数据未就绪；非真实 0':evidencedEmpty?'查询成功，确实为空':[...new Set(rows.map((record)=>record.truth))].join('、')||'查询成功，当前筛选为空';document.querySelector('#export-records').textContent=currentUnavailable?'—（目标态、历史与陈旧记录已排除）':evidencedEmpty?'0 条（来源证据 SHA256 与查询范围 SHA256 已分离）':rows.map((record)=>record.project+'｜'+record.type+'｜'+record.name).join('；')||'0 条有来源证据的记录';announce.textContent='原型提示：当前页级真相查询已形成可见只读预览；真实导出尚未接通，未生成文件。';exportPreview.scrollIntoView({block:'nearest'});});
function restoreFromUrl(){const params=new URLSearchParams(location.search),page=Number(params.get('page')??0),pageIndex=Number.isInteger(page)&&page>=0&&page<pages.length?page:0,assign=(selector,key)=>{const control=document.querySelector(selector),value=params.get(key);if(value&&[...control.options].some((option)=>option.value===value))control.value=value;};activatePage(pageIndex,{sync:false,render:false});if(pages[pageIndex].dataMode==='evidenced_empty'){syncEvidenceScopeControls('evidenced_empty');}else{syncEvidenceScopeControls(pages[pageIndex].dataMode);assign('#project-filter','project');assign('#time-filter','time');assign('#iteration-filter','iteration');assign('#source-filter','source');document.querySelector('#search-input').value=params.get('q')??'';crossFilter=params.get('cross')??'';}renderQuery({sync:false});}
window.addEventListener('popstate',restoreFromUrl);restoreFromUrl();
</script></body></html>`;
writeFileSync(join(root, 'prototype.html'), prototypeHtml, 'utf8');

const manifest = {
  schema_version: 1,
  project_id: 'workflow-control-center',
  work_item: 'CC-UI-002',
  change_id: 'ui-design-20260816-control-release-completeness-001',
  artifact_id: 'artifact-control-release-completeness-ui-visuals-001',
  version: '1.0',
  status: 'machine-validation-pending',
  created_at: '2026-08-16T22:45:33+08:00',
  authoritative_prompt: {
    path: 'ui/02-release-completeness-ui-prompt.md',
    version: '1.0',
    sha256: 'caafe53a51a77283c363483bf34b9dba843f5a1add8d7fd17c9d74a1d336570e',
    approval: 'approval-20260816-control-release-completeness-ui-prompt-v1'
  },
  coverage: {
    primary_navigation: nav,
    p0_destinations: routes.map(([name,path]) => ({ name, path })),
    chart_catalog: charts.map((name,index) => ({ id: `CC-CHART-${String(index+1).padStart(2,'0')}`, name, authoritative_mapping: chartMappings[index], unit: chartTrace[index].unit, legend: chartTrace[index].legend })),
    chart_traceability_fields: ['单位','图例','筛选','来源 ID','来源 SHA256','来源','覆盖','新鲜度','观测时间','root_head'],
    information_architecture: { primary_count: 6, secondary_destination_count: 12, mobile_bottom_navigation: ['总览','项目','质量','更多'] },
    truth_states: ['live（仅目标态演示）','empty','not_ready','stale','degraded','failed','unknown'],
    readonly_actions: ['搜索','项目筛选','时间筛选','迭代筛选','来源模式筛选','详情','图表标记下钻','问题到复测证据','发布到门禁证据','状态到来源错误','只读重新读取','导出当前查询'],
    prohibited_writes: ['审批决定','问题流转','发布','回滚','文件修复','Git 写入','删除']
  },
  deliverable_counts: {
    design_system_pages: 1,
    desktop_p0_pages: 12,
    desktop_target_demo_variants: 1,
    tablet_key_pages: 4,
    paired_mobile_groups: 8,
    mobile_assets: 16,
    chart_types: 19,
    truth_state_boards: 4,
    reflow_200_percent_assets: 1,
    clickable_prototype: 1
  },
  generator: {
    source: 'ui/release-completeness-v1.0/generate-assets.mjs',
    sha256: sha(fileURLToPath(import.meta.url)),
    ai_visual_direction: 'image_gen.imagegen reference-guided generation',
    exact_prototypes: 'deterministic SVG authored from approved Prompt',
    rasterization: 'sharp/libvips resolved from the installed project dependency graph or an explicit NODE_PATH candidate; reproducibility requires a lockfile-compatible or declared workspace tool environment; exact-size PNG, no crop',
    sharp_tooling_boundary: SHARP_TOOLING_BOUNDARY,
    historical_reference_assets_preserved: 9
  },
  support_files: {
    verifier: { path: 'ui/release-completeness-v1.0/verify-assets.mjs', sha256: sha(join(root,'verify-assets.mjs')) },
    browser_checker: { path: 'ui/release-completeness-v1.0/verify-prototype-browser.mjs', sha256: sha(join(root,'verify-prototype-browser.mjs')) },
    browser_evidence: { path: 'ui/release-completeness-v1.0/browser-evidence.json', sha256: sha(join(root,'browser-evidence.json')) },
    generation_notes: { path: 'ui/release-completeness-v1.0/generation-prompts.md', sha256: sha(join(root,'generation-prompts.md')) },
    design_specification: { path: 'ui/03-release-completeness-ui-design-v1.0.md', sha256: sha(join(root,'../03-release-completeness-ui-design-v1.0.md')) }
  },
  design_token_decisions: {
    warning_base: '#B65D0A',
    warning_text_on_warning_soft: '#8A3F00',
    warning_soft: '#FFF4E8',
    adjudication: 'Prompt 基色保持 #B65D0A；小字位于浅警告底时使用 #8A3F00，以达到至少 4.5:1。'
  },
  atlas_layout: {
    strategy: 'two-column shortest-column packing',
    canvas_height: ATLAS_HEIGHT,
    placements: atlasPlacements.map((placement,index)=>({ chart_id:`CC-CHART-${String(index+1).padStart(2,'0')}`, ...placement }))
  },
  truth_boundary: {
    real_regulatory_backend: 'not-implemented',
    workflow_reader: 'not-implemented',
    real_data_integration: 'not-ready',
    current_fact_boards_may_show_fabricated_kpis: false,
    target_demo_is_current_runtime_fact: false,
    business_or_git_write_actions: 0,
    production_release: 'frozen'
  },
  ai_visual_direction_asset: {
    path: 'ui/release-completeness-v1.0/00-ai-visual-direction-current-not-ready.png',
    pixel_size: { width: 1536, height: 1024 },
    sha256: sha(aiPath),
    source_generated_reference: 'image_gen local generation copied into this versioned bundle; bundled relative path is authoritative',
    review_role: 'visual-direction-only; exact text and facts governed by SVG prototypes'
  },
  assets: pngAssets,
  clickable_prototype: {
    path: 'ui/release-completeness-v1.0/prototype.html',
    sha256: sha(join(root, 'prototype.html')),
    p0_route_buttons: 12,
    interactions: ['12目的页切换','项目/时间/迭代/来源筛选真实参与结果过滤','只读搜索包含00–11固定角色并按对象类型分组显示更新时间','交互图、完整等价表与导出共享筛选结果','图表数据点可切换或再次点击取消交叉筛选','当前事实页物理排除目标态/历史/陈旧示例','清除筛选','问题到复测证据','发布到六项门禁证据','状态到中文来源错误','证据抽屉 aria-controls/expanded、切页关闭、Escape关闭并返回焦点','390/320同真相态响应式资产切换','方向键切换页面','2px焦点可见','aria-live状态播报','URL保存并恢复页签和筛选上下文','只读读取未接通播报','当前查询可见导出预览含筛选/来源/哈希/错误/生成时间/真实性标签'],
    runtime_service_connected: false
  },
  review: {
    machine_validation: 'pending',
    visual_inspection: 'pending fixed-04 inspection',
    independent_visual_review: 'pending',
    stop_gate: 'ui-design-review'
  }
};

writeFileSync(join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`generated ${svgAssets.length} SVG + ${pngAssets.length} PNG assets`);
