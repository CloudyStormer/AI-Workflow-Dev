import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const previousDir = path.resolve(here, "../release-completeness-v1.1/assets");
const svgDir = path.join(here, "assets");
const pngDir = path.join(here, "png");
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
const rect = (x,y,w,h,fill=C.surface,stroke=C.border,r=10,extra="") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const line = (x1,y1,x2,y2,stroke=C.border,width=1,dash="") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
const circle = (cx,cy,r,fill=C.surface,stroke=C.border,width=2,extra="") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const text = (x,y,value,size=14,color=C.text,weight=400,anchor="start",extra="") => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="hanging" ${extra}>${esc(value)}</text>`;
const lines = (x,y,items,size=14,color=C.text,weight=400,gap=1.45) => items.map((item,index)=>text(x,y+index*size*gap,item,size,color,weight)).join("");
const card = (x,y,w,h,title="",subtitle="") => `${rect(x,y,w,h)}${title ? text(x+18,y+16,title,17,C.text,750) : ""}${subtitle ? text(x+18,y+45,subtitle,13,C.muted,450) : ""}`;
const pill = (x,y,label,kind="info",w=Math.max(82,label.length*14+24)) => {
  const palette = { info:[C.softInfo,C.info], success:[C.softSuccess,C.success], warning:[C.softWarn,C.warning], danger:[C.softDanger,C.danger], action:[C.softAction,C.action], infer:["#F0EDFF",C.infer], unknown:[C.softUnknown,C.muted] };
  const [bg,fg] = palette[kind] || palette.unknown;
  return `${rect(x,y,w,30,bg,bg,15)}${text(x+w/2,y+7,label,13,fg,700,"middle")}`;
};
const button = (x,y,label,primary=false,w=156,h=48) => {
  const fontSize = h >= 88 ? 28 : h >= 52 ? 16 : 14;
  return `${rect(x,y,w,h,primary?C.action:C.surface,primary?C.action:C.border,8,`data-touch-target="true" data-touch-height="${h}"`)}${text(x+w/2,y+(h-fontSize)/2,label,fontSize,primary?"#FFFFFF":C.text,700,"middle")}`;
};
const style = `<style>text{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Arial,sans-serif}*{shape-rendering:geometricPrecision;text-rendering:optimizeLegibility}</style>`;
const svg = (w,h,name,body,extra="") => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc" ${extra}>${style}<title id="title">${esc(name)}</title><desc id="desc">Frontend Career Radar CR-UI-002 v1.2 机器可复核设计原型</desc>${body}</svg>`;
const pageHeader = (titleValue,subtitle,truth="研究清单已批准 · 来源 0 · connector 0 · 招聘实例 0") => `${rect(0,0,1440,1024,C.bg,C.bg,0)}${text(32,24,titleValue,28,C.text,800)}${text(32,62,subtitle,14,C.muted,500)}${rect(32,96,1376,48,C.softDanger,C.softDanger,8)}${text(52,111,truth,14,C.danger,750)}${text(1400,111,"CR-UI-002 v1.2",13,C.danger,700,"end")}`;

const assets = [];
const add = (name,width,height,body,meta={}) => assets.push({name,width,height,body,meta});

function versionedBaseline(name, category, surface) {
  const source = path.join(previousDir,name);
  if (!fs.existsSync(source)) throw new Error(`missing immutable v1.1 source ${name}`);
  const previous = fs.readFileSync(source,"utf8");
  const body = previous.replace(/^<svg[^>]*>/,"").replace(/<\/svg>\s*$/,"").replaceAll("v1.1","v1.2");
  add(name,Number(previous.match(/width="(\d+)"/)[1]),Number(previous.match(/height="(\d+)"/)[1]),body,{category,surface,source:"versioned-v1.1-baseline"});
}

function directionsPage() {
  const plot = {left:250,top:190,right:980,bottom:780};
  const panelLeft = 1020;
  const nodes = [
    {id:"product",label:"产品型前端／应用工程",x:430,y:650,lx:455,lw:180},
    {id:"platform",label:"平台／设计系统／DevEx",x:520,y:310,lx:545,lw:185},
    {id:"ai",label:"AI 应用前端／AI 产品工程",x:790,y:560,lx:605,lw:180},
    {id:"dataviz",label:"数据可视化／实时交互",x:700,y:390,lx:720,lw:175},
    {id:"cross",label:"跨端／桌面／移动",x:600,y:530,lx:620,lw:150},
    {id:"fullstack",label:"全栈产品协作",x:350,y:500,lx:370,lw:120},
    {id:"quality",label:"Web 质量工程",x:420,y:260,lx:440,lw:125},
    {id:"ux",label:"UX Engineering／设计开发融合",x:760,y:250,lx:570,lw:185}
  ];
  for (const node of nodes) {
    if (node.x < plot.left || node.x > plot.right || node.y < plot.top || node.y > plot.bottom) throw new Error(`node outside plot: ${node.id}`);
    if (node.lx < plot.left || node.lx + node.lw > plot.right || node.lx + node.lw >= panelLeft) throw new Error(`label crosses plot/right panel: ${node.id}`);
  }
  let body = pageHeader("01 职业方向总览","二维解释坐标只用于理解差异，不表示好坏、热度或个人适配度。");
  body += card(32,166,968,650,"8 个职业方向 · 二维解释坐标","X：产品交付协作深度；Y：平台／体验专项深度；节点大小：直接证据数；描边：置信度");
  body += `<g id="direction-plot" data-left="${plot.left}" data-top="${plot.top}" data-right="${plot.right}" data-bottom="${plot.bottom}" data-right-panel-left="${panelLeft}">`;
  body += `${line(250,750,950,750,C.muted,2)}${line(250,750,250,235,C.muted,2)}${text(610,770,"产品交付协作深度 →",14,C.muted,650,"middle")}${text(200,500,"平台／体验专项深度",14,C.muted,650,"middle",`transform="rotate(-90 200 500)"`)}`;
  nodes.forEach((node,index)=>{ body += `<g data-direction-node="${node.id}" data-x="${node.x}" data-y="${node.y}" data-label-x="${node.lx}" data-label-width="${node.lw}">${circle(node.x,node.y,10+(index%3)*3,C.surface,index===0?C.action:C.info,3)}${text(node.lx,node.y-10,node.label,13,C.text,index===0?750:550)}</g>`; });
  body += `</g>${card(1020,166,388,650,"方向列表与解释","右栏独立边界；图中节点与标签不得侵入")}`;
  nodes.forEach((node,index)=>{const y=240+index*64;body+=`${rect(1040,y,348,48,index===0?C.softAction:C.surface,index===0?C.action:C.border,8)}${text(1056,y+14,`${String(index+1).padStart(2,"0")} ${node.label}`,13,index===0?C.action:C.text,index===0?750:550)}`;});
  body += `${card(32,836,1376,144,"边界说明","获批历史研究快照 · 证据截止 2026-08-03 · 不是岗位排名或市场份额")}${text(54,904,"选择方向后进入 02 技术栈全景；无个人证据时不自动推荐“最适合你”。",15,C.text,650)}${button(1198,884,"查看该方向技术栈",true,188)}`;
  return body;
}

function techPage() {
  const domains = ["Web 平台","框架与状态／数据","工程化","产品质量","设计与协作","方向专项","AI 增量","观察项"];
  const p0=["HTML/CSS/JS","组件与数据","构建与依赖","性能/安全","—","—","—","—"];
  const p1=["浏览器/网络","路由/状态","测试/CI/CD","无障碍/i18n","设计系统/API","可视化/跨端","—","—"];
  const ai=["—","—","—","输出审核","协作责任","流式/工具状态","模型接口/评估","—"];
  const observe=["—","—","—","—","—","—","—","WebGPU/WASM/WebNN"];
  let body=pageHeader("02 技术栈全景","8 类能力域 × P0 / P1 / P1-AI / P2 / 观察项；不虚构不存在的优先级实例。");
  body += card(32,166,1376,760,"五层优先级能力地图","当前方向：产品型前端／应用工程 · 这里是职业能力，不是本产品技术选型");
  const x=[52,250,480,710,940,1170];
  ["能力域","P0","P1","P1-AI","P2","观察项"].forEach((h,i)=>body+=text(x[i],236,h,14,i===4?C.warning:C.muted,750));
  body += line(50,270,1388,270,C.border,2);
  domains.forEach((domain,row)=>{
    const y=286+row*72;
    body += `${text(x[0],y+12,domain,14,C.text,700)}${text(x[1],y+12,p0[row],14,C.text,550)}${text(x[2],y+12,p1[row],14,C.text,550)}${text(x[3],y+12,ai[row],14,ai[row]==="—"?C.muted:C.infer,550)}${text(x[4],y+12,"—",16,C.warning,750)}${text(x[5],y+12,observe[row],14,observe[row]==="—"?C.muted:C.warning,550)}${line(50,y+54,1388,y+54,C.border)}`;
  });
  body += `${rect(920,300,220,510,C.softWarn,C.warning,8,`data-priority-empty-state="P2"`)}${text(1030,430,"P2",24,C.warning,800,"middle")}${text(1030,474,"本样本暂无 P2",17,C.warning,800,"middle")}${lines(948,518,["不补造能力项", "不代表市场没有 P2", "后续出现证据再入列"],14,C.warning,650)}${pill(52,874,"P0 → P1 → P1-AI → P2 → 观察项","action",350)}${text(430,882,"五层结构完整；本样本只对有证据的层级展示实例。",15,C.text,650)}`;
  return body;
}

function rightsPage() {
  let body=pageHeader("09 账号与数据权利","目标态演示 · 当前未接通；账号边界、双导出和跨账号零可见性必须显式可见。","演示数据 · 用户提供 · 目标态演示 · 当前未接通");
  body += card(32,166,430,300,"登录与退出状态","游客只读公共研究；登录后才有私有能力");
  body += `${text(54,238,"游客",16,C.text,750)}${text(150,238,"私有数据不可见",14,C.muted,600)}${button(54,280,"登录账号",true,150)}${text(54,350,"当前账号 A · user-a@example.test",15,C.text,700)}${button(54,390,"退出登录",false,150)}`;
  body += card(482,166,454,300,"A / B 账号切换","切换前显示影响；私有内容不跨账号泄露");
  body += `${pill(504,238,"账号 A · 3 条私有证据","success",210)}${button(504,286,"切换到账号 B",false,176)}${rect(504,354,410,84,C.softDanger,C.danger,8,`data-cross-account-proof="zero-visible"`)}${text(524,370,"账号 B 私有可见记录：0",16,C.danger,800)}${text(524,400,"账号 A 的 3 条记录在 B 中不可见",14,C.danger,650)}`;
  body += card(956,166,452,300,"设备与同步","目标态能力，不代表当前服务已接通");
  body += `${text(978,238,"设备：Mac A / Windows B",15,C.text,700)}${text(978,278,"最近成功同步：—",14,C.muted,600)}${pill(978,318,"同步尚未接通","danger",160)}${text(978,366,"目标：两在线设备下一次成功同步后 10 秒内收敛",14,C.muted,550)}`;
  body += card(32,490,904,250,"两种导出必须同时可获得","不是互斥单选；两个独立下载入口可分别触发");
  body += `${rect(54,566,410,122,C.surface,C.border,8)}${text(74,586,"人类可读摘要",16,C.text,750)}${text(74,618,"PDF/HTML · 范围、版本、生成时间",14,C.muted,550)}${button(252,626,"下载人类可读摘要",true,192)}${rect(484,566,430,122,C.surface,C.border,8)}${text(504,586,"机器可读数据",16,C.text,750)}${text(504,618,"JSON/CSV · 字段说明与版本",14,C.muted,550)}${button(704,626,"下载机器可读数据",false,190)}`;
  body += card(956,490,452,250,"第三方处理记录","未授权时发送次数为 0");
  body += `${text(978,570,"接收方：无",15,C.text,700)}${text(978,606,"已发送字段：0",15,C.text,700)}${text(978,642,"本次明确同意：未提供",14,C.muted,600)}`;
  body += card(32,764,1376,216,"删除与恢复语义","单条证据删除先展示重算影响；账号删除为独立危险流程，默认焦点在取消");
  body += `${text(54,838,"活动数据目标 24 小时内删除 · 备份最长 30 天到期 · 删除后登录立即失效",15,C.danger,700)}${button(54,888,"取消（默认焦点）",false,180)}${button(250,888,"删除单条证据",false,166)}${button(432,888,"删除账号…",false,150)}`;
  return body;
}

function exportFlow() {
  let body=pageHeader("关键流程 04 · 同步／导出／删除","目标态演示 · 当前未接通；两种导出是并列动作，不是互斥选择。","演示数据 · 用户提供 · 目标态演示 · 当前未接通");
  const steps=["查看设备版本","处理同步冲突","预览导出范围","并列下载两格式","预览删除影响","确认删除／重算"];
  steps.forEach((step,index)=>{const x=54+index*224;body+=`${circle(x+54,240,34,index<2?C.action:C.surface,index<2?C.action:C.border,3)}${text(x+54,228,String(index+1),18,index<2?"#FFFFFF":C.text,800,"middle")}${text(x,296,step,14,C.text,700)}${index<5?line(x+92,240,x+210,240,C.border,3):""}`;});
  body += card(54,360,858,270,"导出步骤 · 两个独立入口","用户可先后或分别下载；任一失败不影响另一格式重试");
  body += `${button(84,444,"下载人类可读摘要",true,210)}${button(312,444,"下载机器可读数据",false,210)}${text(84,516,"可读摘要：PDF/HTML · 版本 v1.2 · 生成时间待执行",14,C.muted,600)}${text(84,552,"机器数据：JSON/CSV · 字段清单 · 版本 v1.2",14,C.muted,600)}`;
  body += card(936,360,450,270,"失败与恢复","两条任务各自拥有状态和重试入口");
  body += `${pill(958,438,"可读摘要：待执行","unknown",178)}${pill(958,484,"机器数据：待执行","unknown",178)}${button(1176,468,"仅重试失败项",false,176)}`;
  body += card(54,660,1332,270,"删除分支","删除证据展示受影响路线；删除账号单独确认；默认焦点为取消");
  body += `${text(82,736,"证据删除 → 影响预览 → 确认 → 标记需要重算 → 重算或可恢复失败",16,C.text,700)}${text(82,782,"账号删除 → 身份确认 → 24h 活动数据 / 30 天备份说明 → 取消 / 确认删除",16,C.text,700)}${button(82,844,"取消（默认焦点）",false,188)}${button(286,844,"确认删除",false,160)}`;
  return body;
}

function truthPolicyRuntime() {
  let body=pageHeader("真相态 01 · 来源政策轴 × 运行时轴","失败与停用仅是允许呈现的状态示例；当前没有连接器运行历史。");
  body += card(32,166,1376,740,"政策决策与运行时必须分列","当前事实：13 个 allow 技术端点、3 个 conditional ATS 模板、connector 0、招聘实例 0");
  const headers=["来源类别","政策轴","运行时轴","是否有运行历史","允许呈现的解释"];
  const x=[58,350,610,850,1080];headers.forEach((h,i)=>body+=text(x[i],238,h,14,C.muted,750));
  const rows=[
    ["官方技术端点（13）","允许 allow","未配置","无","研究允许；尚未接入"],
    ["ATS 条件模板（3）","条件 conditional","未配置","无","缺公司/board/site 允许清单"],
    ["受限来源","禁用 disabled","已停用（示例）","无","允许呈现的状态示例 · 无运行历史"],
    ["未来技术连接器","允许 allow","部分失败（示例）","无","允许呈现的状态示例 · 当前未接通"],
    ["未来招聘连接器","条件 conditional","失败（示例）","无","允许呈现的状态示例 · 当前无实例"]
  ];
  rows.forEach((row,index)=>{const y=286+index*100;row.forEach((cell,i)=>body+=text(x[i],y+18,cell,14,i===2&&index>1?C.warning:C.text,i===2?700:550));body+=line(54,y+72,1386,y+72,C.border);});
  body += `${rect(54,802,1332,76,C.softWarn,C.warning,8)}${text(76,824,"状态示例不是遥测记录：不得据此声称发生过失败、停用、刷新或恢复。",16,C.warning,800)}`;
  return body;
}

const mobileScreens = [
  {id:"01-directions",title:"01 职业方向",kind:"public",lines:["8 个方向","二维解释坐标（列表替代）","查看该方向技术栈"],action:"查看技术栈"},
  {id:"02-tech",title:"02 技术栈全景",kind:"public",lines:["8 类能力域","P0 / P1 / P1-AI","P2：本样本暂无实例","观察项"],action:"查看等价表"},
  {id:"03-trends",title:"03 市场趋势",kind:"public",lines:["目的样本 N=10","持续来源趋势：未就绪","当前条件下 0 条 ≠ 市场无需求"],action:"查看数据表"},
  {id:"04-workbench-input",title:"05 工作台 · 输入",kind:"private",lines:["1–100,000 Unicode","仅本次处理（推荐）","来源渠道与内容类型分别确认"],action:"继续分类"},
  {id:"05-workbench-result",title:"05 工作台 · 关系",kind:"private",lines:["每条候选只选一种关系","新增 / 印证 / 重复","冲突 / 证据不足 / 不适用"],action:"逐条确认"},
  {id:"06-gap-unknown",title:"07 差距与路线",kind:"private",lines:["当前差距保持未知","目标或证据不足","路线未生成"],action:"补充证据"},
  {id:"07-data-rights",title:"09 数据权利",kind:"private",lines:["账号 A / B 严格隔离","下载可读摘要","下载机器数据","删除前预览影响"],action:"管理数据"}
];

function mobile(screen,width) {
  const isPublic=screen.kind==="public";
  const pad=16, inner=width-pad*2;
  let body=`${rect(0,0,width,844,C.bg,C.bg,0)}${text(pad,20,screen.title,width===320?20:22,C.text,800)}${text(pad,52,`独立 ${width} CSS px 重排`,14,C.muted,600)}`;
  if(isPublic){
    body+=`${rect(pad,84,inner,92,C.softDanger,C.danger,8)}${text(pad+14,98,"研究清单已批准",14,C.danger,800)}${text(pad+14,124,"来源 0　/　connector 0",14,C.danger,750)}${text(pad+14,150,"招聘实例 0",14,C.danger,750)}`;
  }else{
    body+=`${rect(pad,84,inner,54,C.softWarn,C.warning,8)}${text(pad+14,101,"演示数据 · 用户提供",14,C.warning,800)}`;
  }
  const start=isPublic?198:160;
  body+=`${rect(pad,start,inner,90,C.surface,C.border,8)}${text(pad+16,start+16,isPublic?"当前状态":"私有空间",16,C.text,750)}${text(pad+16,start+48,isPublic?"数据尚未就绪；不可冒充实时":"不代表真实用户或已保存档案",14,C.muted,550)}`;
  screen.lines.forEach((item,index)=>{const y=start+112+index*72;body+=`${rect(pad,y,inner,58,index===screen.lines.length-1&&screen.id.includes("gap")?C.softDanger:C.surface,C.border,8)}${text(pad+16,y+18,item,16,index===screen.lines.length-1&&screen.id.includes("gap")?C.danger:C.text,index===0?700:550)}`;});
  const actionY=760;
  body+=`${rect(0,744,width,100,C.surface,C.border,0)}${button(pad,actionY,screen.action,true,inner,52)}${text(width/2,820,"触控 ≥44px · 正文 ≥16px · 辅助 ≥14px",14,C.muted,600,"middle")}`;
  return svg(width,844,`${screen.id}-${width}.svg`,body,`data-layout="independent-reflow" data-logical-width="${width}" data-logical-height="844" data-min-body-font="16" data-min-helper-font="14" data-min-touch="44" data-page-kind="${screen.kind}"`);
}

const chartSpecs = [
  {id:"01-direction-scatter",title:"方向坐标图",context:"页面 01 · 解释方向差异",filter:"方向：全部；证据截止：2026-08-03",axis:"X=协作深度；Y=专项深度；单位=解释坐标",legend:"圆大小=证据数；描边=置信度",kind:"scatter",table:[["方向","X","Y","证据","限制"],["产品型前端","3","2","历史样本","非排名"],["数据可视化","4","4","历史样本","非适配度"]]},
  {id:"02-direction-comparison",title:"方向比较矩阵",context:"页面 01 · 最多比较 3 个方向",filter:"方向：产品型 / 平台 / 数据可视化",axis:"行=价值/层级/能力/证据/限制；列=方向",legend:"文字+边框，不生成总分",kind:"compare",table:[["维度","产品型","平台","数据可视化"],["价值","产品交付","工程效率","数据交互"],["限制","样本偏高阶","证据有限","非岗位排名"]]},
  {id:"03-capability-map",title:"分层能力地图",context:"页面 02 · 8 域与五层优先级",filter:"方向：产品型；层级：全部",axis:"X=P0/P1/P1-AI/P2/观察项；Y=能力域",legend:"实线=已有证据；空框=本样本暂无",kind:"layers",table:[["能力域","P0","P1","P1-AI","P2","观察"],["Web平台","HTML/CSS/JS","网络","—","暂无","—"],["AI增量","—","—","评估/审核","暂无","—"]]},
  {id:"04-sample-dotplot",title:"样本内计数点图",context:"页面 03 · 目的抽样计数",filter:"地区：中国4 / 公开远程6",axis:"X=n/N；单位=条，不是百分比",legend:"点=计数；空心=证据不足",kind:"dot",table:[["要求","n","N","样本","口径"],["React","9","10","目的样本","非份额"],["AI直接要求","4","10","目的样本","非份额"]]},
  {id:"05-trend-line",title:"7/30/90 趋势线",context:"页面 03 · 目标态结构示例；当前来源未接通",filter:"窗口：30日；来源：持续技术源",axis:"X=日期；Y=事件数（条）",legend:"虚线=目标态结构示例；当前态只显示空态",kind:"line",table:[["日期","事件数","覆盖源","缺失","as_of"],["—","—","0/13","30日","—"],["空态","来源未接通","0","是","—"]]},
  {id:"06-remote-constraints",title:"远程约束矩阵",context:"页面 03 · 远程不等于全球可申请",filter:"地区：公开远程；层级：全部",axis:"行=岗位样本；列=时区/许可/合同/披露",legend:"✓明确；?未披露；×不满足",kind:"remote",table:[["样本","时区","许可","合同","披露"],["R-01","UTC±3","需确认","合同工","部分"],["R-02","未披露","未知","未知","不足"]]},
  {id:"07-policy-runtime",title:"来源政策 × 运行时",context:"页面 04 · 两轴不可合并",filter:"类型：全部；政策：全部",axis:"X=运行时；Y=政策决定",legend:"矩形=来源组；斜纹=目标态示例",kind:"policy",table:[["来源","政策","运行时","实例","历史"],["技术端点13","allow","未配置","0","无"],["ATS模板3","conditional","未配置","0","无"]]},
  {id:"08-source-band",title:"来源覆盖时间带",context:"页面 04/10 · 刷新与缺失",filter:"窗口：48小时；来源：全部",axis:"X=时间（小时）；Y=来源组",legend:"实心=成功；空白=缺失；斜线=示例",kind:"band",table:[["来源组","最近成功","24h","48h","状态"],["技术源","—","缺失","缺失","未配置"],["招聘源","—","缺失","缺失","无实例"]]},
  {id:"09-dual-classification",title:"双轴分类面板",context:"页面 05 · 渠道与内容类型独立确认",filter:"候选：当前输入；状态：待确认",axis:"左=来源渠道；右=内容类型",legend:"建议/候选/人工确认用形状+文字",kind:"dual",table:[["轴","建议","置信度","确认","依据"],["渠道","公司招聘页","0.72","待确认","公司域名"],["类型","职位描述","0.84","待确认","职责段落"]]},
  {id:"10-relation-matrix",title:"研究关系矩阵",context:"页面 05 · 每条候选互斥一种关系",filter:"候选：全部；关系：全部",axis:"行=候选；列=六类关系",legend:"●唯一选择；○未选",kind:"relation",table:[["候选","唯一关系","公共结论","依据"],["版本主张","冲突","仅记录技术要求","缺版本证据"],["React要求","相互印证","9/10目的样本","来源一致"]]},
  {id:"11-evidence-stair",title:"证据阶梯",context:"页面 06 · 证据类型不是人的等级",filter:"目标方向：产品型；状态：全部",axis:"阶梯=阅读→练习→项目→生产→同行审查",legend:"高度=可核验性层次，不是个人得分",kind:"stair",table:[["证据类型","可核验材料","能否证明掌握","状态"],["阅读收藏","记录","不能","用户自述"],["生产结果","指标+贡献","需审查","可核验"]]},
  {id:"12-gap-matrix",title:"差距证据矩阵",context:"页面 07 · 三项输入缺一即未知",filter:"目标：未确认；版本：历史；证据：不足",axis:"行=能力要求；列=目标/公共要求/个人证据/判断",legend:"空心=未知；虚线=系统推断",kind:"gap",table:[["能力","目标","公共要求","个人证据","判断"],["部署回滚","未确认","P1","不足","未知"],["可访问性","未确认","P1","项目证据","未知"]]},
  {id:"13-route-graph",title:"路线依赖图",context:"页面 07 · 仅三输入齐全时出现",filter:"目标态演示；当前未生成",axis:"节点=能力/证据产物；边=依赖",legend:"虚线=系统推断；锁=输入不足",kind:"route",table:[["步骤","能力","证据产物","依赖","复评"],["—","—","—","目标未确认","不生成"],["目标态示例","性能","基准报告","Web基础","证据变化"]]},
  {id:"14-version-timeline",title:"版本／变化时间线",context:"页面 08 · 还原当时依据",filter:"范围：公共+个人；窗口：90日",axis:"X=发生时间；轨道=公共/个人/规则",legend:"实心=发生；空心=发现；菱形=推断",kind:"history",table:[["时间","轨道","事件","版本","当时依据"],["2026-08-03","公共","快照冻结","research-v1","目的样本10"],["—","个人","无真实记录","—","演示数据"]]},
  {id:"15-sync-timeline",title:"同步状态时间线",context:"页面 09 · 多设备目标态",filter:"账号：演示A；设备：全部",axis:"X=时间；轨道=设备A/设备B/服务",legend:"✓成功；!冲突；↻重试；—未接通",kind:"sync",table:[["设备","本地版本","服务版本","状态","动作"],["Mac A","demo-3","—","未接通","不上传"],["Windows B","demo-0","—","未接通","跨账号0可见"]]}
];

function chartGraphic(spec) {
  const x=54,y=300,w=820,h=350;
  let g=`${rect(x,y,w,h,"#FBFCFD",C.border,8)}${text(x+18,y+16,"图形区",14,C.muted,700)}`;
  if(spec.kind==="scatter") g+=`${line(x+80,y+300,x+w-40,y+300,C.muted,2)}${line(x+80,y+300,x+80,y+70,C.muted,2)}${circle(x+250,y+220,14,C.surface,C.action,3)}${circle(x+480,y+130,19,C.surface,C.info,3)}${circle(x+670,y+190,11,C.surface,C.warning,3)}`;
  if(spec.kind==="compare") for(let r=0;r<5;r++)for(let c=0;c<3;c++)g+=rect(x+170+c*190,y+70+r*50,160,36,c===0?C.softAction:C.surface,C.border,5);
  if(spec.kind==="layers") for(let c=0;c<5;c++)for(let r=0;r<4;r++)g+=rect(x+40+c*150,y+70+r*60,120,38,c===3?C.softWarn:c===2?"#F0EDFF":C.softInfo,c===3?C.warning:C.border,6);
  if(spec.kind==="dot") [0.9,0.8,1,0.4].forEach((v,i)=>g+=`${line(x+160,y+90+i*60,x+740,y+90+i*60,C.border)}${circle(x+160+v*560,y+90+i*60,9,C.surface,i===3?C.infer:C.action,3)}`);
  if(spec.kind==="line") g+=`${pill(x+500,y+18,"目标态演示 · 当前未接通","warning",250)}${line(x+70,y+300,x+760,y+300,C.muted,2)}${line(x+70,y+300,x+70,y+70,C.muted,2)}<polyline points="${x+80},${y+250} ${x+180},${y+210} ${x+280},${y+235} ${x+380},${y+150} ${x+480},${y+185} ${x+580},${y+110}" fill="none" stroke="${C.warning}" stroke-width="4" stroke-dasharray="8 6"/>`;
  if(spec.kind==="remote"||spec.kind==="policy"||spec.kind==="relation"||spec.kind==="gap") for(let r=0;r<4;r++)for(let c=0;c<5;c++)g+=`${rect(x+80+c*130,y+70+r*58,106,38,c===r%5?C.softAction:C.surface,C.border,5)}${text(x+133+c*130,y+80+r*58,c===r%5?"●":"○",16,c===r%5?C.action:C.muted,700,"middle")}`;
  if(spec.kind==="band") for(let r=0;r<4;r++){g+=text(x+30,y+82+r*60,`源 ${r+1}`,13,C.text,600);for(let c=0;c<10;c++)g+=rect(x+120+c*60,y+76+r*60,46,24,c<2?C.softSuccess:c<5?C.softWarn:C.softUnknown,c<2?C.success:c<5?C.warning:C.border,3);}
  if(spec.kind==="dual") g+=`${rect(x+50,y+70,330,230,C.softInfo,C.info,8)}${text(x+78,y+92,"来源渠道",18,C.info,800)}${pill(x+78,y+140,"公司招聘页","info",140)}${pill(x+78,y+188,"搜索引擎","unknown",120)}${rect(x+440,y+70,330,230,"#F0EDFF",C.infer,8)}${text(x+468,y+92,"内容类型",18,C.infer,800)}${pill(x+468,y+140,"职位描述","infer",120)}${pill(x+468,y+188,"面试要求","unknown",120)}`;
  if(spec.kind==="stair") for(let i=0;i<5;i++)g+=`${rect(x+70+i*140,y+260-i*48,118,40,i>2?C.softAction:C.softUnknown,i>2?C.action:C.border,5)}${text(x+129+i*140,y+270-i*48,String(i+1),14,C.text,700,"middle")}`;
  if(spec.kind==="route") g+=`${rect(x+70,y+140,150,60,C.softDanger,C.danger,8)}${text(x+145,y+158,"输入不足",16,C.danger,800,"middle")}${line(x+220,y+170,x+360,y+170,C.border,3,"8 6")}${rect(x+360,y+140,160,60,C.softUnknown,C.border,8)}${text(x+440,y+158,"路线未生成",16,C.muted,750,"middle")}${line(x+520,y+170,x+660,y+170,C.border,3,"8 6")}${rect(x+660,y+140,120,60,C.softUnknown,C.border,8)}${text(x+720,y+158,"锁定",16,C.muted,750,"middle")}`;
  if(spec.kind==="history"||spec.kind==="sync") {for(let r=0;r<3;r++){g+=`${text(x+30,y+94+r*82,spec.kind==="sync"?["设备A","设备B","服务"][r]:["公共","个人","规则"][r],13,C.text,700)}${line(x+120,y+104+r*82,x+760,y+104+r*82,C.border,3)}`;[220,430,650].forEach((px,i)=>g+=circle(x+px,y+104+r*82,8,C.surface,i===1?C.warning:C.info,3));}}
  return g;
}

function chartBoard(spec,index) {
  const truth = index < 8 ? "研究清单已批准 · 来源 0 · connector 0 · 招聘实例 0" : "演示数据 · 用户提供";
  let body=pageHeader(`图表 ${String(index+1).padStart(2,"0")} · ${spec.title}`,spec.context,truth);
  body+=`${pill(32,164,spec.filter,"info",Math.min(650,spec.filter.length*15+30))}${card(32,210,1376,84,"坐标、单位与图例",`${spec.axis}　｜　${spec.legend}`)}${chartGraphic(spec)}`;
  body+=`${card(900,300,508,350,"空态","相同筛选下必须有独立空态，不用 0 冒充未知")}${rect(924,372,460,126,C.softUnknown,C.border,8)}${text(1154,396,"当前条件下无可绘制数据",16,C.text,750,"middle")}${text(1154,432,"显示筛选、样本集合、来源覆盖与重置入口",14,C.muted,550,"middle")}${button(1078,516,"重置筛选",false,152)}`;
  body+=card(32,680,1376,294,"完整等价表","字段、关键值、状态和限制均可键盘读取；表格不是只写“查看数据表”的占位");
  const table=spec.table;const cols=table[0].length;const colW=1320/cols;
  table.forEach((row,r)=>{row.forEach((cell,c)=>body+=text(54+c*colW,750+r*58,cell,13,r===0?C.muted:C.text,r===0?750:550));body+=line(52,780+r*58,1386,780+r*58,C.border);});
  return body;
}

function zoom200() {
  let body=pageHeader("无障碍证据 · 真正 200% 文本与组件放大","基准与放大后使用同一 720×900 CSS 逻辑视口；放大后单栏回流，无整页横滚或遮挡。","演示数据 · 用户提供");
  body+=`${card(32,166,650,808,"100% 基准","逻辑视口 720×900；正文 16px；触控 44px")}${rect(54,230,606,690,C.surface,C.border,8)}${text(78,256,"07 差距与成长路线",24,C.text,800)}${text(78,300,"目标或证据不足，当前差距保持未知。",16,C.text,600)}${rect(78,346,260,110,C.surface,C.border,8)}${text(96,362,"目标方向：未确认",16,C.text,650)}${button(96,400,"确认目标",false,130,44)}${rect(356,346,260,110,C.surface,C.border,8)}${text(374,362,"个人证据：不足",16,C.text,650)}${button(374,400,"补充证据",true,130,44)}`;
  body+=`${card(706,166,702,808,"200% 放大后回流","正文 32px = 16×2；触控 88px = 44×2；同一逻辑宽度内单栏")}${rect(728,230,658,690,C.surface,C.border,8)}<g id="zoom-200-content" data-scale="2" data-base-font="16" data-rendered-font="32" data-base-control="44" data-rendered-control="88" data-viewport-width="720" data-scroll-x="false" data-overlap="false">${text(754,254,"07 差距与成长路线",36,C.text,800)}${lines(754,312,["目标或证据不足，", "当前差距保持未知。"],32,C.text,650,1.2)}${rect(754,408,604,166,C.surface,C.border,8)}${text(780,428,"目标方向：未确认",32,C.text,700)}${button(780,474,"确认目标",false,250,88)}${rect(754,590,604,166,C.surface,C.border,8)}${text(780,610,"个人证据：不足",32,C.text,700)}${button(780,656,"补充证据",true,250,88)}${text(754,778,"路线未生成",32,C.danger,800)}${text(754,826,"✓ 无横向滚动　✓ 无遮挡",28,C.success,750)}</g>`;
  return body;
}

// 10 desktop pages: seven unchanged pages are versioned from the immutable v1.1 source.
add("01-desktop-page-01-directions-1440.svg",1440,1024,directionsPage(),{category:"desktop",surface:"public",source:"redrawn-v1.2",machine_assertions:["direction-node-and-label-bounds"]});
add("02-desktop-page-02-tech-landscape-1440.svg",1440,1024,techPage(),{category:"desktop",surface:"public",source:"redrawn-v1.2",machine_assertions:["p2-empty-state"]});
for (const name of ["03-desktop-page-03-market-trends-1440.svg","04-desktop-page-04-sources-quality-1440.svg","05-desktop-page-05-workbench-1440.svg","06-desktop-page-06-personal-evidence-1440.svg","07-desktop-page-07-gap-roadmap-1440.svg","08-desktop-page-08-future-history-1440.svg"]) versionedBaseline(name,"desktop",/^(05|06|07)-/.test(name)?"private":"public");
add("09-desktop-page-09-data-rights-1440.svg",1440,1024,rightsPage(),{category:"desktop",surface:"private",source:"redrawn-v1.2",machine_assertions:["ac27-account-isolation","ac29-dual-export"]});
versionedBaseline("10-desktop-page-10-quality-recovery-1440.svg","desktop","public");

for (const name of ["11-flow-01-workbench-six-step.svg","12-flow-02-evidence-confirmation.svg","13-flow-03-gap-roadmap-recompute.svg"]) versionedBaseline(name,"flow","mixed");
add("14-flow-04-sync-export-delete.svg",1440,1024,exportFlow(),{category:"flow",surface:"private",source:"redrawn-v1.2",machine_assertions:["ac29-two-independent-exports"]});
add("15-truth-01-source-policy-runtime.svg",1440,1024,truthPolicyRuntime(),{category:"truth",surface:"public",source:"redrawn-v1.2",machine_assertions:["no-runtime-history-claim"]});
versionedBaseline("16-truth-02-eleven-states.svg","truth","mixed");

for (const screen of mobileScreens) for (const width of [390,320]) {
  const name=`${screen.id}-${width}.svg`;
  assets.push({name,width,height:844,body:mobile(screen,width),completeSvg:true,meta:{category:"mobile",surface:screen.kind,source:"independent-v1.2-reflow",internal_logical_viewports:[{width,height:844,scale:1}],machine_assertions:["font-minimums","touch-minimum","no-overall-scaling"]}});
}

versionedBaseline("24-components-states.svg","standard","mixed");
chartSpecs.forEach((spec,index)=>add(`25-${spec.id}.svg`,1440,1024,chartBoard(spec,index),{category:"chart",surface:index<8?"public":"mixed",source:"redrawn-v1.2",chart_type:spec.title,machine_assertions:["distinct-semantic-structure","title-axis-unit-legend-filter-context-empty-equivalent-table"]}));
versionedBaseline("26-foundation-contrast-tokens.svg","standard","mixed");
versionedBaseline("27-responsive-1024.svg","responsive","public");
add("28-accessibility-zoom-200.svg",1440,1024,zoom200(),{category:"responsive",surface:"private",source:"redrawn-v1.2",internal_logical_viewports:[{name:"baseline",width:720,height:900,text_scale:1,body_font:16,control_height:44},{name:"zoom-200",width:720,height:900,text_scale:2,body_font:32,control_height:88,reflow:true,horizontal_scroll:false,overlap:false}],machine_assertions:["true-2x-text-and-controls","reflow-no-scroll-no-overlap"]});

const manifestAssets=[];
for (const asset of assets) {
  const output = asset.completeSvg ? asset.body : svg(asset.width,asset.height,asset.name,asset.body);
  fs.writeFileSync(path.join(svgDir,asset.name),output,"utf8");
  execFileSync("sips",["-s","format","png",path.join(svgDir,asset.name),"--out",path.join(pngDir,asset.name.replace(/\.svg$/,".png"))],{stdio:"ignore"});
  const internal = asset.meta.internal_logical_viewports || (asset.name==="27-responsive-1024.svg" ? [{name:"tablet",width:1024,height:768,scale:1}] : [{name:"canvas",width:asset.width,height:asset.height,scale:1}]);
  manifestAssets.push({name:asset.name,category:asset.meta.category,surface:asset.meta.surface,source:asset.meta.source,outer_pixels:{width:asset.width,height:asset.height},internal_logical_viewports:internal,chart_type:asset.meta.chart_type||null,machine_assertions:asset.meta.machine_assertions||[]});
}

const manifest={schema_version:2,version:"1.2",generated_at:"2026-08-15T22:20:00+08:00",count:manifestAssets.length,truth_boundary:{runtime_sources:0,connectors:0,approved_recruitment_instances:0},review_contract:{machine_gate:"self-verifiable",independent_visual_review:"pending-root-coordinator",forbidden_claims:["self-claimed-independent-visual-pass","generated-string-as-manual-review"]},assets:manifestAssets};
fs.writeFileSync(path.join(svgDir,"manifest.json"),JSON.stringify(manifest,null,2)+"\n","utf8");
console.log(JSON.stringify({status:"generated",version:"1.2",assets:manifestAssets.length,svgDir,pngDir},null,2));
