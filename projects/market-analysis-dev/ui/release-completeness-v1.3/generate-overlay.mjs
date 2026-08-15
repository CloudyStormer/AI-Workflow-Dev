import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../..");
const previousRoot = path.resolve(here, "../release-completeness-v1.2");
const previousSvgDir = path.join(previousRoot, "assets");
const previousPngDir = path.join(previousRoot, "png");
const svgDir = path.join(here, "assets");
const pngDir = path.join(here, "png");
const models = JSON.parse(fs.readFileSync(path.join(here, "chart-models.json"), "utf8"));
const previousManifest = JSON.parse(fs.readFileSync(path.join(previousSvgDir, "manifest.json"), "utf8"));
fs.mkdirSync(svgDir, { recursive: true });
fs.mkdirSync(pngDir, { recursive: true });

const C = {
  bg: "#F6F8FA", surface: "#FFFFFF", text: "#17212B", muted: "#475467",
  border: "#C8D0DA", action: "#0B6B63", info: "#1D4ED8", success: "#067647",
  warning: "#8A4B08", danger: "#B4233C", infer: "#5B4BC4",
  softAction: "#E8F5F2", softInfo: "#EAF1FF", softSuccess: "#E7F5EE",
  softWarn: "#FFF3E0", softDanger: "#FDECEF", softUnknown: "#EEF1F4"
};
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const rect = (x,y,w,h,fill=C.surface,stroke=C.border,r=10,extra="") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const line = (x1,y1,x2,y2,stroke=C.border,width=1,dash="") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
const circle = (cx,cy,r,fill=C.surface,stroke=C.border,width=2,extra="") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const text = (x,y,value,size=14,color=C.text,weight=400,anchor="start",extra="") => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="hanging" ${extra}>${esc(value)}</text>`;
const multiline = (x,y,items,size=14,color=C.text,weight=400,lineHeight=Math.round(size*1.4),extra="") => items.map((item,index)=>text(x,y+index*lineHeight,item,size,color,weight,"start",extra)).join("");
const card = (x,y,w,h,title="",subtitle="") => `${rect(x,y,w,h)}${title?text(x+18,y+16,title,17,C.text,750):""}${subtitle?text(x+18,y+45,subtitle,13,C.muted,500):""}`;
const pill = (x,y,label,kind="unknown",w=Math.max(90,label.length*14+24)) => {
  const palette={unknown:[C.softUnknown,C.muted],info:[C.softInfo,C.info],warning:[C.softWarn,C.warning],danger:[C.softDanger,C.danger],action:[C.softAction,C.action],infer:["#F0EDFF",C.infer],success:[C.softSuccess,C.success]};
  const [bg,fg]=palette[kind]||palette.unknown;
  return `${rect(x,y,w,30,bg,bg,15)}${text(x+w/2,y+7,label,13,fg,700,"middle")}`;
};
const button = (x,y,label,primary=false,w=176,h=48,id="") => `${rect(x,y,w,h,primary?C.action:C.surface,primary?C.action:C.border,8,`data-button-id="${id}" data-touch-rect="true"`)}${text(x+w/2,y+(h-16)/2,label,16,primary?"#FFFFFF":C.text,700,"middle")}`;
const style = `<style>text{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Arial,sans-serif}*{shape-rendering:geometricPrecision;text-rendering:optimizeLegibility}</style>`;
const svg = (w,h,name,body,extra="") => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc" ${extra}>${style}<title id="title">${esc(name)}</title><desc id="desc">Frontend Career Radar CR-UI-002 v1.3 可追溯设计原型</desc>${body}</svg>`;
const truthFor = (surface) => surface === "public"
  ? "研究清单已批准 · 当前来源 0 · connector 0 · 招聘实例 0"
  : surface === "private"
    ? "演示数据 · 用户提供 · 非真实用户档案 · 未经授权不外发"
    : "公共：获批历史研究快照（运行时来源 0） · 个人：演示数据·用户提供 · 规则：系统配置";
const pageHeader = (titleValue,subtitle,surface="public") => `${rect(0,0,1440,1024,C.bg,C.bg,0)}${text(32,24,titleValue,28,C.text,800)}${text(32,62,subtitle,14,C.muted,500)}${rect(32,96,1376,52,C.softDanger,C.danger,8,`data-complete-truth-strip="true" data-surface="${surface}"`)}${text(52,113,truthFor(surface),14,C.danger,750)}${text(1390,113,"CR-UI-002 v1.3",13,C.danger,700,"end")}`;

const replacements = [];
const add = (name,category,surface,source,svgText,assertions=[]) => replacements.push({name,category,surface,source,svgText,assertions});

function overlayPrevious(name, surface) {
  let source = fs.readFileSync(path.join(previousSvgDir,name),"utf8").replaceAll("v1.2","v1.3");
  const bar = `<g id="v1-3-complete-truth-overlay">${rect(32,96,1376,52,C.softDanger,C.danger,8,`data-complete-truth-strip="true" data-surface="${surface}"`)}${text(52,113,truthFor(surface),14,C.danger,750)}${text(1390,113,"CR-UI-002 v1.3",13,C.danger,700,"end")}</g>`;
  return source.replace("</svg>",`${bar}</svg>`);
}

for (const [name,surface] of [
  ["02-desktop-page-02-tech-landscape-1440.svg","public"],
  ["04-desktop-page-04-sources-quality-1440.svg","public"],
  ["06-desktop-page-06-personal-evidence-1440.svg","private"],
  ["08-desktop-page-08-future-history-1440.svg","mixed"]
]) add(name,"desktop",surface,"v1.2-with-v1.3-truth-overlay",overlayPrevious(name,surface),["complete-nearby-truth-strip"]);

function page10() {
  let b=pageHeader("10 质量、刷新与恢复","当前没有真实账号、服务或连接器；状态名称按触发条件严格分层。","public");
  b+=card(32,170,430,250,"当前就绪状态","无真实服务请求，因此只能是未就绪或不可用");
  b+=`${pill(54,238,"未就绪（not_ready）","warning",200)}${text(54,286,"健康检查：未接通",15,C.text,700)}${text(54,320,"数据来源：0 · connector：0",15,C.text,700)}${text(54,354,"最近成功刷新：—",15,C.muted,650)}`;
  b+=card(482,170,430,250,"当前能力状态","没有账号服务，不把空白误报为请求失败");
  b+=`${pill(504,238,"不可用（unavailable）","danger",210)}${text(504,286,"账号 / 同步 / 导出服务：不可用",15,C.text,700)}${text(504,320,"入口保持禁用并说明原因",15,C.text,700)}${text(504,354,"不会显示“重试失败请求”",15,C.muted,650)}`;
  b+=card(932,170,476,250,"failed 的使用门槛","只有真实请求已经执行并返回失败时使用");
  b+=`${rect(954,238,432,116,C.softUnknown,C.border,8,`data-current-failed="false"`)}${text(976,258,"允许呈现的状态示例",15,C.text,750)}${text(976,292,"真实请求失败 → failed → 保留输入 → 重试",14,C.muted,600)}${text(976,326,"当前没有这种运行历史",14,C.danger,750)}`;
  b+=card(32,448,1376,230,"状态转换规则","未配置→not_ready；能力不存在→unavailable；真实请求执行失败→failed");
  const states=[["未配置","not_ready","说明缺少来源/服务"],["当前不可调用","unavailable","禁用操作并给替代路径"],["真实请求失败","failed","显示请求 ID、保留输入和重试"],["局部成功","partial","只重试失败分片"]];
  states.forEach((s,i)=>{const x=54+i*330;b+=`${rect(x,530,308,108,C.surface,C.border,8)}${text(x+16,548,s[0],16,C.text,750)}${text(x+16,578,s[1],14,C.info,700)}${text(x+16,606,s[2],13,C.muted,550)}`;});
  b+=card(32,706,1376,274,"发布完成门","静态可读、Mock、HTTP 200 或禁用入口均不等于真实服务完成");
  b+=`${multiline(54,780,["完成必须同时具备：真实允许来源、运行时 connector、时间戳/新鲜度、局部失败恢复、可追溯版本。","当前结果：0 个运行时来源、0 个 connector、0 个招聘实例；继续停在设计审查门。"],16,C.text,650,34)}${button(1130,874,"查看状态等价表",true,230,48,"page10-state-table")}`;
  return svg(1440,1024,"10-desktop-page-10-quality-recovery-1440.svg",b,`data-current-service-state="not_ready" data-current-account-state="unavailable" data-failed-requires-real-request="true"`);
}
add("10-desktop-page-10-quality-recovery-1440.svg","desktop","public","redrawn-v1.3",page10(),["not-ready-unavailable-current","failed-only-after-real-request"]);

function workbenchFlow() {
  let b=pageHeader("关键流程 01 · 信息源六步工作台","每一步只出现一次；失败保留输入并局部重试。","private");
  const steps=["输入内容","补充元数据","双轴建议","人工确认","互斥关系","保存或仅本次"];
  steps.forEach((step,i)=>{const x=38+i*231;b+=`<g data-flow-step="${i+1}">${rect(x,214,208,150,i===0?C.softAction:C.surface,i===0?C.action:C.border,10)}${circle(x+30,242,18,i===0?C.action:C.surface,i===0?C.action:C.border,2)}${text(x+30,233,String(i+1),14,i===0?"#FFFFFF":C.text,800,"middle")}${text(x+20,286,step,16,C.text,750)}${text(x+20,320,i<5?"完成后进入下一步":"明确保存边界",13,C.muted,550)}</g>${i<5?line(x+208,289,x+231,289,C.border,3):""}`;});
  b+=card(32,400,880,250,"当前步骤 · 输入内容","1–100,000 Unicode；空白、URL-only、超长、敏感信息均给明确状态");
  b+=`${rect(54,476,836,112,C.surface,C.border,8)}${text(72,494,"粘贴职位描述、招聘网址、简历片段或学习记录…",15,C.muted,500)}${text(872,556,"0 / 100,000 Unicode",14,C.muted,650,"end")}${button(694,602,"继续：补充元数据",true,196,48,"workbench-next")}`;
  b+=card(936,400,472,250,"恢复规则","不会从头重跑已成功步骤");
  b+=`${multiline(958,474,["· 处理中：逐步播报当前阶段","· 部分成功：保留成功项","· 失败：保留输入与人工修正","· 重试：只重试失败步骤"],15,C.text,600,34)}`;
  b+=card(32,678,1376,302,"流程边界","六类研究关系互斥；未知差距不生成路线；未经授权不长期保存或第三方传输");
  b+=`${pill(54,760,"当前步骤 1 / 6","info",150)}${pill(220,760,"已完成 0","unknown",120)}${pill(356,760,"待处理 5","warning",120)}${multiline(54,820,["键盘：Tab 顺序与视觉顺序一致；Escape 关闭非破坏弹窗。","读屏：步骤、状态、错误和重试结果使用礼貌状态播报。"],15,C.text,600,32)}`;
  return svg(1440,1024,"11-flow-01-workbench-six-step.svg",b,`data-step-label-mode="single"`);
}
add("11-flow-01-workbench-six-step.svg","flow","private","redrawn-v1.3",workbenchFlow(),["no-duplicate-step-string-or-label"]);

function stateBoard() {
  let b=pageHeader("真相态 02 · 11 类状态","主标题明确：live 只是允许状态示例；当前目标态尚未接通。","public");
  b+=`${rect(32,170,670,92,C.softInfo,C.info,10)}${text(54,192,"live状态示例",22,C.info,800)}${text(54,226,"仅在真实来源、时间戳和运行时连接全部存在时使用",14,C.info,600)}${rect(722,170,686,92,C.softDanger,C.danger,10)}${text(744,192,"目标态未接通",22,C.danger,800)}${text(744,226,"当前来源0 · connector0 · 招聘实例0",14,C.danger,700)}`;
  const states=[["加载中","loading"],["可用示例","live"],["空结果","empty"],["未就绪","not_ready"],["已过期","stale"],["部分可用","partial"],["降级","degraded"],["请求失败","failed"],["无来源","no_source"],["无证据","no_evidence"],["离线","offline"]];
  states.forEach((s,i)=>{const col=i%4,row=Math.floor(i/4),x=32+col*344,y=292+row*184;const current=["not_ready","no_source","no_evidence","offline"].includes(s[1]);b+=`<g data-state="${s[1]}">${rect(x,y,320,150,current?C.softWarn:C.surface,current?C.warning:C.border,10)}${text(x+20,y+20,s[0],18,C.text,750)}${text(x+20,y+54,`内部键：${s[1]}`,14,C.info,650)}${text(x+20,y+88,current?"当前可用表达":"允许呈现的状态示例",14,current?C.warning:C.muted,700)}${text(x+20,y+116,s[1]==="failed"?"仅真实请求失败后":"非颜色单一编码",13,C.muted,550)}</g>`;});
  return svg(1440,1024,"16-truth-02-eleven-states.svg",b);
}
add("16-truth-02-eleven-states.svg","truth","public","redrawn-v1.3",stateBoard(),["live-example-peer-title","target-not-connected-peer-title"]);

const mobileScreens=[
  {id:"01-directions",title:"01 职业方向",surface:"public",items:["8 个方向","二维解释坐标（列表替代）","进入技术栈全景"],action:"查看技术栈"},
  {id:"02-tech",title:"02 技术栈全景",surface:"public",items:["8 类能力域","P0 / P1 / P1-AI","P2：本样本暂无实例","观察项"],action:"查看等价表"},
  {id:"03-trends",title:"03 市场趋势",surface:"public",items:["目的样本 N=10","持续来源趋势：未就绪","0 条不等于市场无需求"],action:"查看数据表"},
  {id:"04-workbench-input",title:"05 工作台 · 输入",surface:"private",items:["1–100,000 Unicode","仅本次处理（推荐）","双轴分别确认"],action:"继续分类"},
  {id:"05-workbench-result",title:"05 工作台 · 关系",surface:"private",items:["每条候选只选一种关系","六类关系互斥","可人工纠正"],action:"逐条确认"},
  {id:"06-gap-unknown",title:"07 差距与路线",surface:"private",items:["当前差距保持未知","目标或证据不足","路线未生成"],action:"补充证据"},
  {id:"07-data-rights",title:"09 数据权利",surface:"private",items:["账号 A / B 严格隔离","两种导出独立可用","删除前预览影响"],action:"管理数据"}
];

function mobile(screen,width) {
  const pad=16,inner=width-32,isPublic=screen.surface==="public";
  let b=`${rect(0,0,width,844,C.bg,C.bg,0)}${text(pad,20,screen.title,width===320?20:22,C.text,800)}${text(pad,52,`独立 ${width}px 回流`,14,C.muted,600)}`;
  if(isPublic) b+=`${rect(pad,82,inner,94,C.softDanger,C.danger,8,`data-complete-truth-strip="true"`)}${text(pad+12,96,"研究清单已批准",14,C.danger,800)}${text(pad+12,122,"来源 0 · connector 0",14,C.danger,750)}${text(pad+12,148,"招聘实例 0",14,C.danger,750)}`;
  else b+=`${rect(pad,82,inner,54,C.softWarn,C.warning,8,`data-complete-truth-strip="true"`)}${text(pad+12,99,"演示数据 · 用户提供",14,C.warning,800)}`;
  const start=isPublic?196:156;
  b+=`${rect(pad,start,inner,82,C.surface,C.border,8)}${text(pad+14,start+14,isPublic?"当前状态：未就绪":"私有演示空间",16,C.text,750)}${text(pad+14,start+46,isPublic?"不可冒充实时连接":"不代表真实保存档案",14,C.muted,550)}`;
  screen.items.forEach((item,i)=>{const y=start+104+i*68;b+=`${rect(pad,y,inner,54,C.surface,C.border,8)}${text(pad+14,y+17,item,16,C.text,i===0?700:550)}`;});
  b+=`${text(pad,724,"辅助说明：状态变化会由读屏礼貌播报。",14,C.muted,600,"start",`data-helper-id="bottom-helper" data-line-height="18"`)}${button(pad,772,screen.action,true,inner,52,"bottom-cta")}`;
  return svg(width,844,`${screen.id}-${width}.svg`,b,`data-layout="independent-reflow" data-logical-width="${width}" data-logical-height="844" data-min-body-font="16" data-min-helper-font="14" data-min-touch="44" data-page-kind="${screen.surface}"`);
}
for(const screen of mobileScreens) for(const width of [390,320]) add(`${screen.id}-${width}.svg`,"mobile",screen.surface,"redrawn-v1.3",mobile(screen,width),["helper-bottom-before-cta-top","actual-touch-rect-at-least-44"]);

const payload=(record)=>Buffer.from(JSON.stringify(record),"utf8").toString("base64url");
const visualRecord=(record,content)=>`<g data-visual-record="${esc(record.id)}" data-payload="${payload(record)}">${content}</g>`;
const tableRecord=(record,content)=>`<g data-table-record="${esc(record.id)}" data-payload="${payload(record)}">${content}</g>`;
const wrap=(value,max=14)=>{const chars=[...String(value??"—")],out=[];for(let i=0;i<chars.length;i+=max)out.push(chars.slice(i,i+max).join(""));return out.slice(0,2)};

function chartGraphic(model) {
  const x=44,y=278,w=1352,h=388,records=model.records;
  let g=`${rect(x,y,w,h,"#FBFCFD",C.border,8,`data-chart-kind="${model.kind}"`)}${text(x+18,y+14,"可视图 · 与下方表格共用同一结构化数据模型",14,C.muted,700)}`;
  if(model.kind==="scatter") records.forEach((r,i)=>g+=visualRecord(r,`${circle(x+160+r.x*150,y+330-r.y*48,10+r.evidence,C.surface,i%2?C.info:C.action,3)}${text(x+180+r.x*150,y+317-r.y*48,r.direction,13,C.text,650)}`));
  else if(model.kind==="comparison") records.forEach((r,i)=>g+=visualRecord(r,`${rect(x+42+i*430,y+76,392,246,i===0?C.softAction:C.surface,i===0?C.action:C.border,10)}${text(x+64+i*430,y+98,r.direction,20,C.text,800)}${multiline(x+64+i*430,y+142,[`价值：${r.value}`,`能力：${r.capability}`,`证据：${r.evidence}`,`限制：${r.limitation}`],14,C.text,600,36)}`));
  else if(model.kind==="capability") records.forEach((r,i)=>g+=visualRecord(r,`${rect(x+42+i*213,y+82,190,238,r.state==="empty"?C.softWarn:r.state==="observe"?C.softUnknown:C.softInfo,r.state==="empty"?C.warning:C.border,8)}${text(x+58+i*213,y+102,r.priority,16,r.state==="empty"?C.warning:C.info,800)}${multiline(x+58+i*213,y+144,wrap(r.domain,10),14,C.text,700,24)}${multiline(x+58+i*213,y+214,wrap(r.item,10),13,C.muted,600,22)}`));
  else if(model.kind==="dotplot") records.forEach((r,i)=>g+=visualRecord(r,`${text(x+56,y+92+i*64,r.requirement,14,C.text,650)}${line(x+210,y+103+i*64,x+1240,y+103+i*64,C.border)}${circle(x+210+(r.n/r.N)*1000,y+103+i*64,10,C.surface,C.action,3)}${text(x+1260,y+92+i*64,`${r.n}/${r.N} 条`,14,C.text,700)}`));
  else if(model.kind==="trend") records.forEach((r,i)=>g+=visualRecord(r,`${circle(x+220+i*270,y+210,14,C.surface,C.warning,3)}${text(x+220+i*270,y+246,r.slot,14,C.text,650,"middle")}${text(x+220+i*270,y+274,"缺失 · 0/13",13,C.warning,700,"middle")}`));
  else if(model.kind==="remote") records.forEach((r,i)=>g+=visualRecord(r,`${rect(x+50,y+82+i*86,1250,66,C.surface,C.border,7)}${text(x+70,y+102+i*86,r.sample,15,C.text,750)}${text(x+245,y+102+i*86,r.timezone,14,C.text,600)}${text(x+510,y+102+i*86,r.authorization,14,C.text,600)}${text(x+770,y+102+i*86,r.contract,14,C.text,600)}${text(x+1030,y+102+i*86,r.disclosure,14,C.text,600)}`));
  else if(model.kind==="policy") records.forEach((r,i)=>g+=visualRecord(r,`${rect(x+70+i*420,y+88,378,236,r.state==="unavailable"?C.softDanger:C.softUnknown,r.state==="unavailable"?C.danger:C.border,10)}${text(x+92+i*420,y+110,r.source_group,18,C.text,800)}${multiline(x+92+i*420,y+158,[`政策：${r.policy}`,`运行时：${r.runtime}`,`实例：${r.instances}`,`历史：${r.history}`],14,C.text,600,36)}`));
  else if(model.kind==="source_band") records.forEach((r,i)=>{let cells="";for(let c=0;c<8;c++)cells+=rect(x+300+c*105,y+102+i*78,82,30,c<4?C.softUnknown:C.softWarn,c<4?C.border:C.warning,4,`data-band-state="${r.state}"`);g+=visualRecord(r,`${text(x+60,y+106+i*78,r.source_group,15,C.text,700)}${cells}${text(x+1160,y+106+i*78,r.state,13,C.warning,700)}`)});
  else if(model.kind==="dual_axis") records.forEach((r,i)=>{const left=r.axis==="来源渠道",col=left?0:1,row=left?i: i-2,px=x+70+col*640,py=y+112+row*112;g+=visualRecord(r,`${rect(px,py,580,88,left?C.softInfo:"#F0EDFF",left?C.info:C.infer,8)}${text(px+18,py+16,r.suggestion,16,C.text,750)}${text(px+18,py+48,`${r.confirmation} · 置信度 ${r.confidence}`,14,C.muted,600)}`)});
  else if(model.kind==="relation") records.forEach((r,i)=>{const px=x+42+i*216;g+=visualRecord(r,`${rect(px,y+104,194,176,r.selected?C.softAction:C.surface,r.selected?C.action:C.border,8)}${text(px+97,y+128,r.selected?"●":"○",24,r.selected?C.action:C.muted,800,"middle")}${text(px+97,y+174,r.relation,15,C.text,750,"middle")}${text(px+97,y+212,r.basis,13,C.muted,550,"middle")}`)});
  else if(model.kind==="stair") records.forEach((r,i)=>g+=visualRecord(r,`${rect(x+60+i*250,y+294-i*42,220,44+i*42,r.level>=4?C.softAction:C.softUnknown,r.level>=4?C.action:C.border,7)}${text(x+170+i*250,y+306-i*42,`${r.level} · ${r.evidence_type}`,14,C.text,750,"middle")}`));
  else if(model.kind==="gap") records.forEach((r,i)=>g+=visualRecord(r,`${rect(x+50,y+84+i*70,1252,54,C.surface,C.border,7)}${text(x+68,y+101+i*70,r.capability,15,C.text,700)}${text(x+330,y+101+i*70,r.target,14,C.muted,600)}${text(x+600,y+101+i*70,r.personal_evidence,14,C.text,600)}<polygon points="${x+990},${y+96+i*70} ${x+1002},${y+108+i*70} ${x+990},${y+120+i*70} ${x+978},${y+108+i*70}" fill="${C.surface}" stroke="${C.warning}" stroke-width="3"/><text x="${x+1030}" y="${y+100+i*70}" font-size="14" fill="${C.warning}" font-weight="700">未知</text>`));
  else if(model.kind==="route") records.forEach((r,i)=>{const px=x+58+i*315;g+=visualRecord(r,`${rect(px,y+128,276,112,r.state==="missing"?C.softDanger:C.softUnknown,r.state==="missing"?C.danger:C.border,9)}${text(px+18,y+148,r.node,16,C.text,750)}${text(px+18,y+184,`${r.state} · ${r.output}`,13,C.muted,600)}${i<3?line(px+276,y+184,px+315,y+184,C.border,3,"7 5"):""}`)});
  else if(model.kind==="version_timeline") {const tracks=["公共快照","个人记录","规则版本"];tracks.forEach((track,i)=>{g+=`${text(x+54,y+104+i*92,track,14,C.text,750)}${line(x+180,y+116+i*92,x+1280,y+116+i*92,C.border,3)}`});const count={"公共快照":0,"个人记录":0,"规则版本":0};records.forEach((r)=>{const ti=tracks.indexOf(r.track),idx=count[r.track]++,cx=x+330+idx*360,cy=y+116+ti*92,color=ti===0?C.info:ti===1?C.warning:C.infer;g+=visualRecord(r,`${circle(cx,cy,11,C.surface,color,3)}${text(cx,cy+22,r.event,13,C.text,650,"middle")}${text(cx,cy+44,r.source_identity,12,color,700,"middle")}`)})}
  else if(model.kind==="sync") records.forEach((r,i)=>g+=visualRecord(r,`${rect(x+54,y+80+i*68,1244,50,r.state==="example_only"?C.softWarn:C.softUnknown,r.state==="example_only"?C.warning:C.border,7)}${text(x+72,y+96+i*68,r.track,14,C.text,750)}${text(x+300,y+96+i*68,r.local_version,14,C.text,600)}${text(x+520,y+96+i*68,r.service_version,14,C.text,600)}${text(x+730,y+96+i*68,r.status,14,C.warning,700)}${text(x+960,y+96+i*68,r.action,14,C.text,600)}`));
  return g;
}

function chartTable(model) {
  const x=44,y=690,w=1352,h=302,cols=model.columns,cw=w/cols.length,rowH=Math.floor((h-54)/model.records.length);
  let out=`${rect(x,y,w,h,C.surface,C.border,8)}${text(x+16,y+12,"完整等价表 · 每个可视 mark 与每行使用相同 record ID 和 payload",14,C.text,750)}`;
  cols.forEach((c,i)=>out+=`${rect(x+i*cw,y+42,cw,28,C.softUnknown,C.border,0)}${text(x+6+i*cw,y+48,c,12,C.muted,750)}`);
  model.records.forEach((r,ri)=>{const ry=y+70+ri*rowH;let cells="";cols.forEach((c,ci)=>{const values=wrap(r[c],Math.max(7,Math.floor(cw/11)));cells+=`${line(x+ci*cw,ry,x+ci*cw,ry+rowH,C.border)}${multiline(x+5+ci*cw,ry+5,values,12,C.text,550,15)}`});out+=tableRecord(r,`${rect(x,ry,w,rowH,C.surface,C.border,0)}${cells}`)});
  return out;
}

function chartBoard(model,index) {
  let b=pageHeader(`图表 ${String(index+1).padStart(2,"0")} · ${model.title}`,model.context,model.surface);
  b+=`${pill(32,164,model.filter,"info",Math.min(900,model.filter.length*15+30))}${text(32,210,model.axis,14,C.text,650)}${text(32,236,`图例：${model.legend} · 同条件空态需保留筛选与重置入口`,13,C.muted,600)}${chartGraphic(model)}${chartTable(model)}`;
  return svg(1440,1024,`${model.id}.svg`,b,`data-chart-id="${model.id}" data-chart-model="chart-models.json" data-record-count="${model.records.length}"`);
}
models.charts.forEach((model,index)=>add(`${model.id}.svg`,"chart",model.surface,"shared-structured-model-v1.3",chartBoard(model,index),["visual-table-bidirectional-record-equality","complete-nearby-truth-strip"]));

function componentsBoard(){
  let b=pageHeader("组件与状态规范","触控区域以实际矩形为准；焦点环只是可见反馈，不能代替 44px 触控面积。","mixed");
  b+=card(32,170,650,320,"确认弹窗按钮","取消默认焦点；两个实际按钮均为 48px 高");
  b+=`${rect(54,246,606,190,C.surface,C.border,10,`id="confirmation-dialog"`)}${text(76,268,"确认删除这条证据？",18,C.text,800)}${text(76,306,"删除后相关差距将回到未知并等待重算。",14,C.muted,600)}${rect(72,346,202,60,"none",C.info,10,`stroke-width="3" data-focus-ring-for="cancel"`)}${button(78,352,"取消",false,190,48,"cancel")}${button(450,352,"确认删除",false,190,48,"confirm")}`;
  b+=card(710,170,698,320,"状态与播报","颜色、图形和简中文字同时存在");
  b+=`${pill(734,246,"未就绪","warning",112)}${pill(860,246,"不可用","danger",112)}${pill(986,246,"处理中","info",112)}${pill(1112,246,"已保存","success",112)}${multiline(734,304,["读屏：状态变化礼貌播报","错误：关联字段并移动焦点","减少动效：移除位移，保留反馈"],15,C.text,600,38)}`;
  b+=card(32,522,1376,432,"输入、按钮与空态尺寸","正文16px；辅助14px；触控区域≥44px；键盘焦点清晰可见");
  b+=`${rect(54,604,622,64,C.surface,C.border,8)}${text(72,622,"输入框默认态 · 1–100,000 Unicode",16,C.text,600)}${rect(54,696,622,64,C.surface,C.danger,8)}${text(72,714,"错误态 · 请删除敏感内容或取消处理",16,C.danger,700)}${button(732,604,"主操作",true,190,48,"primary")}${button(940,604,"次操作",false,190,48,"secondary")}${rect(732,696,620,124,C.softUnknown,C.border,8)}${text(1042,724,"当前条件下暂无数据",16,C.text,750,"middle")}${text(1042,758,"显示原因、保留筛选，并提供重置入口",14,C.muted,600,"middle")}`;
  return svg(1440,1024,"24-components-states.svg",b);
}
add("24-components-states.svg","standard","mixed","redrawn-v1.3",componentsBoard(),["actual-button-rect-height-at-least-44"]);

function responsive1024(){
  let b=`${rect(0,0,1440,1024,C.bg,C.bg,0)}${text(32,24,"1024px 响应式重排证据",28,C.text,800)}${text(32,64,"外层画布 1440×1024；内部逻辑视口 1024×768。",14,C.muted,600)}`;
  b+=`${rect(208,128,1024,768,C.surface,C.text,12,`data-logical-viewport="1024x768"`)}${rect(232,152,976,54,C.softDanger,C.danger,8,`data-complete-truth-strip="true"`)}${text(250,169,"研究清单已批准 · 来源0 · connector0 · 招聘实例0",14,C.danger,750)}`;
  b+=`${rect(232,226,590,620,C.surface,C.border,8)}${text(254,246,"主内容 · 两列改为 58/42",18,C.text,800)}${rect(254,292,546,208,C.softInfo,C.info,8)}${text(274,314,"图表与等价表纵向排列",16,C.info,750)}${rect(254,522,546,282,C.softUnknown,C.border,8)}${text(274,544,"列表保持可操作，不横向滚动",16,C.text,700)}`;
  const noteX=842,noteY=226,noteW=366,noteH=620;
  b+=`${rect(noteX,noteY,noteW,noteH,C.surface,C.border,8,`data-note-box="true"`)}${text(noteX+20,noteY+20,"右侧说明与操作",18,C.text,800)}${multiline(noteX+20,noteY+70,["长说明已拆成多行，","每一行都在 366px 卡片内。","状态、时间戳与来源边界","不会越出内部逻辑视口。"],15,C.text,600,30,`data-note-lines="true"`)}${text(noteX+20,noteY+220,"操作改为纵向堆叠",15,C.text,700)}${button(noteX+20,noteY+264,"查看完整等价表",true,326,48,"tablet-table")}${button(noteX+20,noteY+328,"重置筛选",false,326,48,"tablet-reset")}`;
  const noteLines=["长说明已拆成多行，","每一行都在 366px 卡片内。","状态、时间戳与来源边界","不会越出内部逻辑视口。"];
  noteLines.forEach((value,index)=>{const estimated=[...value].length*15;b+=`<metadata data-note-line="${index+1}" data-x="${noteX+20}" data-estimated-width="${estimated}" data-box-right="${noteX+noteW}"/>`});
  return svg(1440,1024,"27-responsive-1024.svg",b,`data-internal-width="1024" data-internal-height="768"`);
}
add("27-responsive-1024.svg","responsive","public","redrawn-v1.3",responsive1024(),["note-lines-within-logical-canvas"]);

function zoom200(){
  let b=`${rect(0,0,1440,1024,C.bg,C.bg,0)}${text(32,24,"浏览器 200%：有效 CSS 视口减半并回流",28,C.text,800)}${text(32,64,"同一 base token 计算；右侧物理渲染值必须等于左侧基准值 ×2。",14,C.muted,600)}`;
  b+=`${rect(32,118,600,820,C.surface,C.border,8,`id="zoom-base-card" stroke-width="1"`)}${text(48,136,"100% 基准 token",24,C.text,800,"start",`id="zoom-base-title"`)}${text(48,184,"CSS 视口 720px · 物理缩放 1×",16,C.text,600,"start",`id="zoom-base-body"`)}${rect(48,232,568,214,C.softUnknown,C.border,8,`id="zoom-base-inner" stroke-width="1"`)}${text(64,248,"卡片内容",16,C.text,750)}${text(64,286,"正文 16px · 辅助 14px",16,C.text,600)}${text(64,326,"padding 16 · radius 8 · border 1",14,C.muted,600,"start",`id="zoom-base-helper"`)}${button(64,374,"基准操作",true,220,44,"zoom-base-button")}${rect(48,462,568,124,C.softWarn,C.warning,8)}${text(64,480,"间距 16px 后回流",16,C.warning,750)}${text(64,518,"下一卡片从 y=602 开始",14,C.warning,600)}${rect(48,602,568,190,C.surface,C.border,8)}${text(64,622,"第二张卡片",16,C.text,750)}`;
  b+=`${rect(688,118,720,820,C.surface,C.border,16,`id="zoom-200-card" stroke-width="2" data-base-css-viewport-width="720" data-effective-css-viewport-width="360" data-physical-scale="2" data-physical-width="720"`)}${text(720,136,"200% 回流 token",48,C.text,800,"start",`id="zoom-200-title"`)}${text(720,202,"有效 CSS 视口 360px · 物理渲染 720px",32,C.text,600,"start",`id="zoom-200-body"`)}${rect(720,282,656,360,C.softUnknown,C.border,16,`id="zoom-200-inner" stroke-width="2"`)}${text(752,314,"卡片内容",32,C.text,750)}${text(752,374,"正文 32px",32,C.text,600)}${text(752,430,"辅助 28px",28,C.muted,600,"start",`id="zoom-200-helper"`)}${text(752,484,"padding 32 · radius 16 · border 2",28,C.muted,600)}${rect(752,522,440,88,C.action,C.action,16,`id="zoom-200-button" data-button-id="zoom-200-button"`)}${text(972,542,"放大操作",32,"#FFFFFF",750,"middle")}${rect(720,674,656,200,C.softWarn,C.warning,16,`stroke-width="2"`)}${text(752,706,"间距 32px 后回流",32,C.warning,750)}${text(752,766,"无横向滚动",28,C.warning,650)}${text(752,814,"无文字或组件遮挡",28,C.warning,650)}`;
  b+=`${rect(48,900,16,16,C.info,C.info,2,`id="zoom-base-gap-a"`)}${rect(80,900,16,16,C.info,C.info,2,`id="zoom-base-gap-b"`)}${rect(720,898,32,32,C.infer,C.infer,4,`id="zoom-200-gap-a"`)}${rect(784,898,32,32,C.infer,C.infer,4,`id="zoom-200-gap-b"`)}<metadata id="zoom-token-contract" data-base-title="24" data-zoom-title="48" data-base-body="16" data-zoom-body="32" data-base-helper="14" data-zoom-helper="28" data-base-control="44" data-zoom-control="88" data-base-padding="16" data-zoom-padding="32" data-base-radius="8" data-zoom-radius="16" data-base-border="1" data-zoom-border="2" data-base-gap="16" data-zoom-gap="32"/>`;
  return svg(1440,1024,"28-accessibility-zoom-200.svg",b,`data-browser-zoom="200" data-horizontal-scroll="false" data-overlap="false"`);
}
add("28-accessibility-zoom-200.svg","responsive","private","redrawn-v1.3",zoom200(),["browser-200-effective-css-viewport-half","all-base-tokens-physical-2x"]);

if(replacements.length!==39) throw new Error(`expected 39 replacement SVGs, got ${replacements.length}`);
const pngSize=(file)=>{const b=fs.readFileSync(file);return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)}};
const overlayAssets=[];
for(const asset of replacements){
  const svgPath=path.join(svgDir,asset.name),pngPath=path.join(pngDir,asset.name.replace(/\.svg$/, ".png"));
  fs.writeFileSync(svgPath,asset.svgText,"utf8");
  execFileSync("sips",["-s","format","png",svgPath,"--out",pngPath],{stdio:"ignore"});
  const size=pngSize(pngPath);
  overlayAssets.push({name:asset.name,category:asset.category,surface:asset.surface,source:asset.source,outer_pixels:size,svg_path:`assets/${asset.name}`,png_path:`png/${path.basename(pngPath)}`,svg_sha256:sha256(svgPath),png_sha256:sha256(pngPath),machine_assertions:asset.assertions});
}
const overlayManifest={schema_version:1,version:"1.3",generated_at:"2026-08-15T23:45:00+08:00",base_version:"1.2",replacement_count:39,truth_boundary:models.truth_boundary,assets:overlayAssets};
fs.writeFileSync(path.join(here,"overlay-manifest.json"),JSON.stringify(overlayManifest,null,2)+"\n","utf8");

const overlayByName=new Map(overlayAssets.map((asset)=>[asset.name,asset]));
const resolvedAssets=previousManifest.assets.map((asset)=>{
  if(overlayByName.has(asset.name)){
    const next=overlayByName.get(asset.name);
    return {...next,resolution:"replaced-by-v1.3-overlay",base_svg_sha256:sha256(path.join(previousSvgDir,asset.name)),base_png_sha256:sha256(path.join(previousPngDir,asset.name.replace(/\.svg$/, ".png")))};
  }
  const pngName=asset.name.replace(/\.svg$/, ".png");
  return {name:asset.name,category:asset.category,surface:asset.surface,source:asset.source,resolution:"reused-immutable-v1.2-by-sha",outer_pixels:asset.outer_pixels,svg_path:`../release-completeness-v1.2/assets/${asset.name}`,png_path:`../release-completeness-v1.2/png/${pngName}`,svg_sha256:sha256(path.join(previousSvgDir,asset.name)),png_sha256:sha256(path.join(previousPngDir,pngName)),machine_assertions:asset.machine_assertions||[]};
});
const resolved={schema_version:1,version:"1.3",generated_at:"2026-08-15T23:45:00+08:00",base_manifest:"../release-completeness-v1.2/assets/manifest.json",base_manifest_sha256:sha256(path.join(previousSvgDir,"manifest.json")),overlay_manifest:"overlay-manifest.json",overlay_manifest_sha256:sha256(path.join(here,"overlay-manifest.json")),count:resolvedAssets.length,replaced:resolvedAssets.filter((a)=>a.resolution.startsWith("replaced")).length,reused:resolvedAssets.filter((a)=>a.resolution.startsWith("reused")).length,truth_boundary:models.truth_boundary,review_contract:{machine_validation:"self-verifiable",independent_visual_review:"pending-root-coordinator",downstream_route_authorized:false},assets:resolvedAssets};
fs.writeFileSync(path.join(here,"resolved-manifest.json"),JSON.stringify(resolved,null,2)+"\n","utf8");
console.log(JSON.stringify({status:"generated",version:"1.3",overlay_assets:overlayAssets.length,resolved_assets:resolvedAssets.length,replaced:resolved.replaced,reused:resolved.reused},null,2));
