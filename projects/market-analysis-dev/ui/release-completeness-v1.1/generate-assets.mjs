import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "assets");
fs.mkdirSync(outDir, { recursive: true });

const C = {
  bg: "#F6F8FA", surface: "#FFFFFF", text: "#17212B", muted: "#475467",
  border: "#D0D7DE", action: "#0B6B63", info: "#1D4ED8", success: "#067647",
  warning: "#8A4B08", danger: "#B4233C", unknown: "#475467", infer: "#5B4BC4",
  softAction: "#E8F5F2", softInfo: "#EAF1FF", softWarn: "#FFF3E0", softDanger: "#FDECEF",
  softUnknown: "#EEF1F4", dark: "#0B2526"
};

const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const rect = (x,y,w,h,fill=C.surface,stroke=C.border,r=10,extra="") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const line = (x1,y1,x2,y2,stroke=C.border,width=1,dash="") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
const circle = (cx,cy,r,fill=C.surface,stroke=C.border,width=2) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const text = (x,y,s,size=14,color=C.text,weight=400,anchor="start",extra="") => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="hanging" ${extra}>${esc(s)}</text>`;
const lines = (x,y,arr,size=14,color=C.text,weight=400,gap=1.42,anchor="start") => arr.map((s,i)=>text(x,y+i*size*gap,s,size,color,weight,anchor)).join("");
const pill = (x,y,label,kind="unknown",w=Math.max(72,label.length*14+24)) => {
  const map = {
    action:[C.softAction,C.action], info:[C.softInfo,C.info], success:["#E7F5EE",C.success],
    warning:[C.softWarn,C.warning], danger:[C.softDanger,C.danger], unknown:[C.softUnknown,C.unknown], infer:["#F0EDFF",C.infer]
  };
  const [bg,fg] = map[kind] || map.unknown;
  return `${rect(x,y,w,28,bg,bg,14)}${text(x+w/2,y+6,label,12,fg,650,"middle")}`;
};
const button = (x,y,label,primary=false,w=128,disabled=false) => {
  const bg = disabled ? "#E5E7EB" : primary ? C.action : C.surface;
  const fg = disabled ? C.unknown : primary ? "#FFFFFF" : C.text;
  const st = disabled ? "#E5E7EB" : primary ? C.action : C.border;
  return `${rect(x,y,w,40,bg,st,8)}${text(x+w/2,y+11,label,14,fg,650,"middle")}`;
};
const cardTitle = (x,y,titleStr,sub="") => `${text(x+18,y+16,titleStr,16,C.text,700)}${sub ? text(x+18,y+43,sub,12,C.muted,400) : ""}`;
const card = (x,y,w,h,titleStr="",sub="") => `${rect(x,y,w,h)}${titleStr ? cardTitle(x,y,titleStr,sub) : ""}`;
const divider = (x,y,w) => line(x,y,x+w,y,C.border,1);
const check = (x,y,label,on=true) => `${rect(x,y,18,18,on?C.action:C.surface,on?C.action:C.border,4)}${on?text(x+9,y+2,"✓",12,"#FFFFFF",800,"middle"):""}${text(x+28,y+1,label,13,C.text,500)}`;
const radio = (x,y,label,on=false) => `${circle(x+9,y+9,9,C.surface,on?C.action:C.border,2)}${on?circle(x+9,y+9,4,C.action,C.action,1):""}${text(x+26,y+1,label,13,C.text,500)}`;
const bar = (x,y,w,val,label,color=C.action) => `${text(x,y,label,12,C.muted,500)}${rect(x,y+22,w,10,"#E6EBEF","#E6EBEF",5)}${rect(x,y+22,Math.max(2,w*val),10,color,color,5)}`;
const spark = (points,stroke=C.info,width=3) => `<polyline points="${points.map(p=>p.join(",")).join(" ")}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;

const truthBar = (y=78, mode="current") => {
  const target = mode === "target";
  const bg = target ? "#FFF3E0" : "#FDECEF";
  const fg = target ? C.warning : C.danger;
  const titleStr = target ? "目标态演示 · 当前未接通" : "当前真实状态";
  return `${rect(226,y,1190,42,bg,bg,7)}${text(244,y+12,titleStr,13,fg,800)}${text(445,y+12,"研究清单已批准 · 运行时来源 0 · connector 0 · 招聘实例 0",13,fg,650)}${text(1210,y+12,"禁止冒充实时",12,fg,700)}`;
};

const navItems = ["01 职业方向总览","02 技术栈全景","03 市场证据与趋势","04 来源与质量","05 信息源工作台","06 个人证据档案","07 差距与成长路线","08 未来方向与历史","09 账号与数据权利","10 质量与恢复"];
const frame = (titleStr,sub,active=1,mode="current",body="") => {
  const nav = navItems.map((n,i)=>{
    const y=132+i*48, on=i===active-1;
    return `${on?rect(18,y-8,188,36,C.softAction,C.softAction,7):""}${text(30,y,n,13,on?C.action:C.muted,on?750:500)}`;
  }).join("");
  return `${rect(0,0,1440,1024,C.bg,C.bg,0)}${rect(0,0,220,1024,C.surface,C.border,0)}${text(24,26,"Frontend Career Radar",17,C.text,800)}${text(24,54,"发布完整性原型 v1.1",12,C.muted,500)}${nav}${text(238,22,titleStr,28,C.text,760)}${text(238,56,sub,13,C.muted,450)}${truthBar(78,mode)}${body}`;
};

const boardFrame = (titleStr,sub,body,w=1440,h=1024) => `${rect(0,0,w,h,C.bg,C.bg,0)}${text(32,24,titleStr,28,C.text,780)}${text(32,60,sub,13,C.muted,450)}${body}`;
const footer = (label="待审设计 · 非业务实现") => `${line(226,992,1190,992,C.border)}${text(226,998,label,11,C.muted,500)}${text(1416,998,"CR-UI-002 v1.1",11,C.muted,500,"end")}`;

const page01 = () => {
  const dirs = [
    ["产品型前端／应用工程",520,300],["平台／设计系统／DevEx",720,230],["AI 应用前端／AI 产品工程",930,315],["数据可视化／实时交互",1025,460],
    ["跨端／桌面／移动",820,520],["全栈产品协作",635,460],["Web 质量工程",460,560],["UX Engineering／设计开发融合",1080,235]
  ];
  let plot = card(240,140,830,610,"二维解释坐标图","横轴：产品交付协作深度；纵轴：平台／体验专项深度（均非好坏或排名）");
  plot += line(315,690,1015,690,C.muted,2)+line(315,690,315,230,C.muted,2);
  plot += text(665,710,"产品交付协作深度 →",12,C.muted,600,"middle")+text(270,420,"专项深度",12,C.muted,600,"middle",`transform="rotate(-90 270 420)"`);
  dirs.forEach(([d,x,y],i)=>{ const r=10+(i%3)*3; plot+=circle(x,y,r,C.surface,i===0?C.action:C.info,3)+text(x+18,y-8,d,12,C.text,i===0?700:500); });
  plot += `${pill(260,648,"获批历史研究快照", "info",155)}${text(428,655,"证据截止 2026-08-03 · 节点大小=直接证据数 · 描边=置信度",12,C.muted,500)}`;
  let side = card(1090,140,326,610,"8 个方向","选中方向只显示定义、证据和限制，不生成适配分");
  dirs.forEach(([d],i)=>{ const y=214+i*52; side += `${rect(1108,y,290,40,i===0?C.softAction:C.surface,i===0?C.action:C.border,7)}${text(1122,y+11,`${String(i+1).padStart(2,"0")} ${d}`,12,i===0?C.action:C.text,i===0?700:500)}`; });
  const details = card(240,770,1176,190,"已选：产品型前端／应用工程","公共研究信息 · 不是个人推荐");
  const body = `${plot}${side}${details}${text(260,834,"价值：围绕真实用户问题完成可发布 Web 产品",14,C.text,650)}${text(260,866,"主要能力域：Web 平台、框架与数据、工程化、产品质量、协作",13,C.muted,500)}${pill(260,902,"证据有限", "warning")}${text(370,908,"限制：目的抽样偏中高级；不得外推岗位总量或市场份额",13,C.muted,500)}${button(1228,896,"查看技术栈",true,150)}${footer()}`;
  return frame("01 职业方向总览","先理解方向，再进入技术栈；二维坐标只解释差异。",1,"current",body);
};

const page02 = () => {
  const domains = [
    ["Web 平台","HTML · CSS · JavaScript · TypeScript · 浏览器/网络","P0"],
    ["框架与状态／数据范式","组件模型 · 状态管理 · 数据获取 · 路由","P0/P1"],
    ["工程化","构建 · 包依赖 · 质量门 · 测试 · CI/CD · 发布","P0/P1"],
    ["产品质量","性能 · 无障碍 · 安全 · i18n · 兼容 · 可观测性","P0/P1"],
    ["设计与协作","设计系统 · UX Engineering · API · Git · 文档","P1"],
    ["方向专项","数据可视化/实时 · 跨端 · 大规模前端 · 基础全栈","P1"],
    ["AI 增量","模型接口 · 流式/工具状态 · 评估 · 安全 · 审核责任","P1-AI"],
    ["观察项","WebGPU · WASM · 本地 AI · WebNN · MCP/Agent","观察项"]
  ];
  let body = `${text(244,140,"01 职业方向总览 / 产品型前端 → 02 技术栈全景",13,C.action,700)}${pill(1134,132,"不是本产品技术选型","warning",260)}`;
  body += card(240,178,1176,742,"8 类完整能力域 × 5 层优先级","当前方向：产品型前端／应用工程 · 个人证据叠加默认关闭");
  body += `${text(260,244,"能力域",13,C.muted,700)}${text(510,244,"可验证能力内容",13,C.muted,700)}${text(1118,244,"优先级",13,C.muted,700)}${text(1250,244,"证据状态",13,C.muted,700)}${divider(258,270,1138)}`;
  domains.forEach((d,i)=>{ const y=286+i*74; body+=`${text(260,y,d[0],14,C.text,700)}${text(510,y,d[1],13,C.text,500)}${pill(1118,y-5,d[2],d[2]==="观察项"?"warning":d[2]==="P1-AI"?"infer":"info",95)}${pill(1250,y-5,i<4?"历史证据":"待补证据",i<4?"success":"unknown",125)}${text(510,y+30,"字段：方向 · 层级 · 地区 · 时间 · 版本 · 证据 · 失效条件",11,C.muted,450)}${i<7?divider(258,y+55,1138):""}`; });
  body += `${pill(260,874,"P0 → P1 → P1-AI → P2 → 观察项","action",320)}${text(600,880,"AI 增量不得越过 Web 基础与工程质量。",13,C.muted,600)}${button(1234,868,"查看数据表",false,142)}${footer()}`;
  return frame("02 技术栈全景","完整技术域不是标签墙；每域展示可验证内容、优先级与证据状态。",2,"current",body);
};

const page03 = () => {
  let body = `${pill(244,140,"获批历史研究快照","info",160)}${pill(416,140,"持续技术源：未接通","danger",180)}${pill(608,140,"持续招聘源：未接通","danger",190)}${pill(810,140,"用户提供目的样本","warning",180)}`;
  body += card(240,190,566,346,"目的样本内计数","证据截止 2026-08-03 · 核心样本 N=10 · 不是市场份额");
  [["工程质量",10],["React",9],["TypeScript",8],["测试／CI/CD",8],["AI 直接要求",4]].forEach((d,i)=>{ const y=270+i*46; body+=`${text(262,y,d[0],13,C.text,600)}${rect(390,y,330,14,"#E8EDF1","#E8EDF1",7)}${rect(390,y,33*d[1],14,i===4?C.infer:C.action,i===4?C.infer:C.action,7)}${text(738,y-2,`${d[1]}/10`,13,C.text,750)}`; });
  body += `${text(262,505,"中国 4 · 公开远程 6 · 边界样本 2（独立）",12,C.muted,600)}`;
  body += card(826,190,590,346,"7／30／90 日趋势","目标态演示 · 当前未接通 · 禁止把示意折线称为当前趋势");
  body += `${rect(848,260,546,216,"#FFFDF8",C.border,6)}${line(880,448,1364,448,C.muted)}${line(880,448,880,290,C.muted)}${spark([[890,420],[970,400],[1050,410],[1130,350],[1210,370],[1290,320],[1360,330]],C.warning,3)}${pill(862,486,"目标态演示 · 当前未接通","warning",238)}`;
  body += card(240,558,1176,384,"趋势与样本的等价表格","图表关键值不只放 Tooltip；当前持续来源字段均为未就绪");
  const cols=["窗口","样本集合","样本量","覆盖来源","缺失天数","规则版本","as_of","用户可见状态"];
  cols.forEach((c,i)=>body+=text(260+i*140,625,c,12,C.muted,700)); body+=divider(258,650,1138);
  [["7日","持续技术源","—","0 / 13","7","r1","—","数据尚未就绪"],["30日","持续招聘源","—","0 / 3模板","30","r1","—","尚无可执行来源"],["90日","用户目的样本","0","用户提供","90","r1","—","当前条件下0条"]].forEach((row,ri)=>{row.forEach((v,i)=>body+=text(260+i*140,674+ri*64,v,12,i===7?(ri===0?C.warning:C.danger):C.text,i===7?650:500)); body+=divider(258,706+ri*64,1138);});
  body += footer();
  return frame("03 市场证据与趋势","历史目的样本与持续来源严格分区；当前运行时没有趋势数据。",3,"current",body);
};

const page04 = () => {
  let body = `${pill(244,140,"60 条来源记录","info",135)}${pill(390,140,"16 个端点裁决","info",145)}${pill(546,140,"13 个 allow 技术端点","success",190)}${pill(748,140,"3 个 conditional ATS 模板","warning",220)}${pill(980,140,"运行时 connector 0","danger",180)}${pill(1172,140,"招聘实例 0","danger",130)}`;
  body += card(240,190,1176,590,"来源政策轴 × 运行时轴","政策批准与运行时接入必须分列，不能合并为一个绿点");
  const headers=["来源／端点","政策决定","运行时状态","权利/条件","刷新节奏","最近成功","允许操作"];
  const x=[260,520,660,820,1040,1155,1260]; headers.forEach((h,i)=>body+=text(x[i],260,h,12,C.muted,700)); body+=divider(258,286,1138);
  const rows=[
    ["官方技术发布端点（13）","允许 allow","未配置","研究允许；未接入","每6小时","—","查看依据"],
    ["Greenhouse 模板","条件 conditional","未配置","缺公司/board清单","每日","—","查看缺口"],
    ["Lever 模板","条件 conditional","未配置","缺公司/site清单","每日","—","查看缺口"],
    ["Ashby 模板","条件 conditional","未配置","缺公司/board清单","每日","—","查看缺口"],
    ["登录/验证码/付费来源","禁用 disabled","已停用","禁止绕过限制","不调度","—","原链接"]
  ];
  rows.forEach((r,ri)=>{const y=310+ri*82;r.forEach((v,i)=>{const kind=i===1?(ri===0?C.success:ri===4?C.danger:C.warning):i===2?C.danger:C.text;body+=text(x[i],y,v,12,kind,(i===1||i===2)?700:500);});body+=text(260,y+32,"字段：身份 · 所有者 · 地区 · 类型 · 条款/API/robots · 保留 · 署名 · 停用条件",11,C.muted,450);body+=divider(258,y+60,1138);});
  body += card(240,802,1176,140,"质量结论","当前研究清单可供规划；真实刷新、覆盖率、最近成功和在线率均不可生成。");
  body += `${pill(260,862,"数据尚未就绪（not_ready）","danger",225)}${text(510,868,"允许：查看研究依据 / 查看覆盖缺口 / 返回原链接",13,C.text,600)}${text(1008,868,"禁止：启用连接器 / 强制抓取 / 复用登录态",13,C.danger,650)}${footer()}`;
  return frame("04 来源与质量","研究批准 ≠ 运行时接入；来源政策与运行时状态双轴呈现。",4,"current",body);
};

const page05 = () => {
  let body = `${pill(244,140,"演示数据 · 用户提供","warning",185)}${pill(442,140,"仅本次处理（推荐）","action",185)}${text(650,147,"关闭会话后不进入长期档案 · 未授权第三方发送",13,C.muted,600)}`;
  body += card(240,190,1176,92,"六步工作台","1 粘贴 → 2 保存模式 → 3 双轴确认 → 4 摘要 → 5 对照 → 6 合并");
  ["粘贴","保存模式","双轴确认","摘要","对照","合并"].forEach((s,i)=>{const x=270+i*180;body+=`${circle(x,252,14,i<3?C.action:C.surface,i<3?C.action:C.border,2)}${text(x+23,243,s,12,i<3?C.action:C.muted,i<3?700:500)}${i<5?line(x+82,252,x+165,252,C.border,2):""}`;});
  body += card(240,300,560,320,"输入正文","支持文章、招聘/面试、简历、经历、项目材料");
  body += `${rect(260,366,520,154,C.surface,C.border,8)}${lines(278,386,["粘贴正文；仅 URL 时不会自动抓取。","字符按 Unicode 计数，超限不截断。"],14,C.muted,450)}${text(278,490,"1–100,000 Unicode",12,C.action,700)}${text(762,490,"328 / 100,000",12,C.muted,600,"end")}${check(260,540,"我有权将此内容用于个人研究",true)}${text(260,576,"敏感信息：检测到联系方式（约第 5 行），不回显完整值",12,C.warning,650)}`;
  body += card(820,300,596,320,"双轴人工确认","两个维度分别选择；确认前保持待确认");
  body += `${text(842,366,"来源渠道（可多属性）",13,C.text,700)}${pill(842,394,"公司招聘页","info",120)}${pill(972,394,"搜索引擎","unknown",106)}${text(842,432,"内容类型（可多属性）",13,C.text,700)}${pill(842,460,"职位描述","info",106)}${pill(958,460,"面试要求","unknown",106)}${text(842,508,"建议置信度 0.72 · 依据：职位职责、公司域名",12,C.muted,500)}${button(842,550,"确认分类",true,132)}${button(986,550,"纠正建议",false,132)}`;
  body += card(240,640,1176,300,"研究关系：每条候选必须且只能选择一种","互斥单选；不是“可多选”");
  const rels=["新增证据","相互印证","重复","冲突","证据不足","不适用"];
  rels.forEach((r,i)=>body+=radio(272+i*178,716,r,i===3));
  body += `${rect(260,768,1136,104,"#FFF8F0",C.border,7)}${text(280,786,"候选 01 · 用户主张：该岗位要求 TypeScript 5.x",13,C.text,650)}${pill(280,820,"冲突","danger",72)}${text(370,825,"公共研究只记录 TypeScript 要求，未记录 5.x；并列保留，等待证据。",13,C.text,500)}${button(1180,812,"逐条合并",false,180,true)}${text(260,896,"处理失败时保留原输入；分类、摘要或保存失败不得自动确认。",12,C.danger,650)}${footer()}`;
  return frame("05 信息源工作台","输入、双轴分类、研究关系和保存边界都需要人工确认。",5,"current",body);
};

const page06 = () => {
  let body = `${pill(244,140,"演示数据 · 用户提供","warning",185)}${pill(442,140,"个人判断：部分有证据","info",190)}${text(646,147,"不代表真实用户、个人能力或已保存档案",13,C.muted,600)}`;
  body += card(240,190,350,730,"证据类型阶梯","证据类型不是人的等级");
  [["同行审查","可核验审查记录"],["生产结果","指标与本人贡献"],["独立项目","仓库/文档/演示"],["练习","一次性练习"],["阅读/收藏","不支持掌握结论"]].forEach((d,i)=>{const y=270+i*116;const w=270-i*24;body+=`${rect(270+i*12,y,w,72,i<2?C.softAction:C.softUnknown,i<2?C.action:C.border,8)}${text(288+i*12,y+14,d[0],14,C.text,700)}${text(288+i*12,y+40,d[1],12,C.muted,500)}`;});
  body += card(610,190,806,730,"个人事实与证据","每条记录独立确认、历史和删除");
  const rows=[
    ["项目：可访问性改造","可外部核验（externally-verifiable）","项目文档 · 2026-07","success"],
    ["自述：熟悉 TypeScript","用户已确认（user-confirmed）","用户确认 · 尚未外部核验","info"],
    ["摘要命中 React","系统推断（system-inferred）","依据：关键词 · 可能失效","infer"],
    ["性能指标相互矛盾","冲突（conflict）","两份材料待裁决","danger"],
    ["部署与回滚能力","未知（unknown）","尚无信息 · 待补证据","unknown"]
  ];
  rows.forEach((r,i)=>{const y=270+i*118;body+=`${rect(634,y,758,94,C.surface,C.border,8)}${text(654,y+16,r[0],14,C.text,700)}${pill(654,y+45,r[1],r[3],270)}${text(942,y+51,r[2],12,C.muted,500)}${text(1250,y+51,"查看历史",12,C.action,700)}`;});
  body += `${button(1230,866,"进入工作台",true,146)}${footer("演示数据 · 用户提供 · 待审设计 · 非真实个人档案")}`;
  return frame("06 个人证据档案","证据状态、事实来源和核验边界必须逐条可见。",6,"current",body);
};

const page07 = () => {
  let body = `${pill(244,140,"演示数据 · 用户提供","warning",185)}${pill(442,140,"当前差距保持未知","danger",190)}${text(646,147,"缺少任一输入时，不生成路线、优先级或个人分数",13,C.danger,700)}`;
  body += card(240,190,1176,205,"差距计算的三个必要输入","三项必须同时成立");
  const inputs=[["目标方向／层级","未确认","danger","确认目标"],["公共能力要求版本","获批历史快照","success","查看版本"],["个人可用证据","不足","danger","补充证据"]];
  inputs.forEach((d,i)=>{const x=260+i*378;body+=`${rect(x,260,350,104,C.surface,C.border,8)}${text(x+18,278,d[0],13,C.text,700)}${pill(x+18,314,d[1],d[2],110)}${button(x+202,306,d[3],false,128)}`;});
  body += card(240,418,1176,350,"未知态：路线不得生成","只提供补证据与确认入口");
  body += `${rect(262,486,1132,210,"#F9FAFB",C.border,8)}${circle(430,590,52,C.surface,C.unknown,3)}${text(430,570,"?",32,C.unknown,800,"middle")}${text(520,520,"当前无法判断差距",22,C.text,750)}${lines(520,562,["目标方向或层级尚未确认；个人证据不足。","系统不会生成三步路线、学习优先级或“已掌握”结论。","补齐后才进入差距矩阵与路线草案。"],15,C.muted,500)}${button(520,650,"确认目标",true,132)}${button(666,650,"补充证据",false,132)}`;
  body += card(240,790,1176,150,"路线区域","未生成");
  body += `${pill(260,852,"暂无路线（no-evidence）","unknown",205)}${text(486,858,"允许动作：补证据、确认目标、查看公共要求；不允许生成确定路线。",13,C.muted,600)}${footer()}`;
  return frame("07 差距与成长路线","未知态先补输入；证据不足时绝不生成确定路线。",7,"current",body);
};

const page08 = () => {
  let body = `${pill(244,140,"获批历史研究快照","info",160)}${pill(416,140,"未来建议：暂不可生成","danger",190)}${text(620,147,"持续来源 0，7/30/90 日趋势不可用",13,C.danger,700)}`;
  body += card(240,190,566,360,"未来方向","系统推断要求当前趋势、目标和邻接证据");
  body += `${rect(260,266,526,210,"#F9FAFB",C.border,8)}${pill(282,288,"系统推断（system-inferred）","infer",230)}${text(282,332,"当前未生成建议",20,C.text,750)}${lines(282,372,["缺少已接入来源趋势（7/30/90 日）。","不会补造置信度、薪资或成功保证。","可查看未来建议所需证据清单。"],14,C.muted,500)}${button(282,438,"查看所需证据",false,150)}`;
  body += card(826,190,590,360,"变化概览","公共历史可读；个人变化为演示数据");
  body += `${text(850,270,"2026-08-03",13,C.info,700)}${text(960,270,"获批研究快照 v1.0",14,C.text,700)}${text(850,318,"2026-08-14",13,C.info,700)}${text(960,318,"来源研究清单获批（research-only）",14,C.text,700)}${text(850,366,"当前",13,C.danger,700)}${text(960,366,"运行时来源 0 · 招聘实例 0",14,C.text,700)}${pill(850,416,"演示数据 · 用户提供","warning",185)}${text(1048,423,"个人路线历史未接通",13,C.muted,600)}`;
  body += card(240,572,1176,366,"历史时间线与“当时依据”","发生时间、发现时间、公共快照、个人版本和规则版本分开保存");
  const hist=[
    ["发生 08-03 · 发现 08-03","公共快照 research-20260803","证据截止、样本边界、规则 r1"],
    ["发生 08-14 · 发现 08-14","来源清单 source-allowlist-v1","政策允许，不代表接入"],
    ["目标态演示 · 当前未接通","个人事实版本 user-v3","演示数据 · 用户提供"]
  ];
  hist.forEach((r,i)=>{const y=650+i*82;body+=`${circle(286,y+14,8,i===2?C.warning:C.info,i===2?C.warning:C.info,2)}${i<2?line(286,y+22,286,y+88,C.border,2):""}${text(316,y,r[0],12,C.muted,600)}${text(540,y,r[1],14,C.text,700)}${text(900,y,r[2],13,C.text,500)}${text(1284,y,"当时依据",12,C.action,700)}`;});
  body += footer();
  return frame("08 未来方向与历史","缺实时趋势时不生成未来建议；历史版本仍可追溯。",8,"current",body);
};

const page09 = () => {
  let body = `${pill(244,140,"目标态演示 · 当前未接通","warning",225)}${pill(482,140,"演示数据 · 用户提供","warning",185)}${text(680,147,"账号、同步、导出和删除尚非运行时能力",13,C.warning,700)}`;
  body += card(240,190,380,300,"数据保存清单","目标态演示");
  [["仅本次处理","2 条","会话关闭即不保留"],["私有原文","1 条","明确选择保存"],["结构化证据","3 条","逐条确认"],["第三方处理","0 次","未授权，未发送"]].forEach((r,i)=>{const y=264+i*58;body+=`${text(262,y,r[0],13,C.text,650)}${text(416,y,r[1],13,C.text,700)}${text(480,y,r[2],12,C.muted,500)}`;});
  body += card(640,190,380,300,"设备与同步","目标态演示 · 当前未接通");
  body += `${pill(662,264,"数据尚未就绪（not_ready）","danger",225)}${text(662,312,"最近成功同步：—",13,C.text,600)}${text(662,348,"在线设备：0",13,C.text,600)}${text(662,384,"未保存变更：演示 2",13,C.muted,500)}${button(662,428,"重试检查",false,132)}`;
  body += card(1040,190,376,300,"导出","人类可读 + 机器可读");
  body += `${radio(1062,264,"人类可读摘要",true)}${radio(1062,306,"机器可读数据",false)}${text(1062,352,"范围、版本、生成时间均需可见",12,C.muted,500)}${button(1062,410,"生成导出",false,138,true)}`;
  body += card(240,514,1176,426,"删除账号确认","独立危险流程；默认焦点在“取消”");
  body += `${rect(480,590,696,270,C.surface,C.danger,10,`stroke-width="2"`)}${pill(510,616,"危险操作","danger",100)}${text(510,662,"删除账号与全部私有数据？",20,C.text,750)}${lines(510,706,["登录立即失效；活动个人数据目标 24 小时内删除。","备份残留最长 30 天到期，不恢复为活动账号。","删除单条证据会单独展示差距/路线重算范围。"],14,C.muted,500)}${button(770,800,"取消（默认焦点）",false,170)}${button(956,800,"确认删除账号",false,170)}${rect(764,794,182,52,"none",C.info,10,`stroke-width="3"`)}`;
  body += footer("目标态演示 · 当前未接通 · 演示数据 · 用户提供 · 非真实账号");
  return frame("09 账号与数据权利","保存、同步、导出与删除必须分范围、分状态、可撤销。",9,"target",body);
};

const page10 = () => {
  let body = `${pill(244,140,"当前状态：未就绪","danger",160)}${pill(416,140,"静态内容可读","info",140)}${text(570,147,"可读不等于服务健康、数据就绪或来源最新",13,C.danger,700)}`;
  body += card(240,190,1176,420,"健康、就绪与能力分离","全部用户可见状态使用简体中文；内部键仅作括注");
  const rows=[
    ["服务健康","未知","未启动真实服务检查","not_ready"],
    ["数据就绪","数据尚未就绪","运行时来源 0","not_ready"],
    ["公共来源刷新","尚无可执行来源","connector 0 · 招聘实例 0","no-source"],
    ["私有用户服务","目标态未接通","保存/整合/差距/同步不可用","not_ready"],
    ["静态回退","内容可读","只证明历史快照存在","degraded"],
    ["导出与同步","不可用","没有真实账号和私有服务","failed"]
  ];
  rows.forEach((r,i)=>{const y=270+i*52;body+=`${text(264,y,r[0],13,C.text,700)}${pill(472,y-6,`${r[1]}（${r[3]}）`,r[3]==="degraded"?"warning":"danger",210)}${text(706,y,r[2],13,C.muted,500)}${text(1270,y,i===4?"查看上一版本":"错误详情",12,C.action,700)}`;});
  body += card(240,634,1176,304,"统一完成门","HTTP 200、静态页、Mock、禁用入口和空后端均不是完成证据");
  const gates=["真实前后端联调","跨重启持久化","全真相态","完整简体中文","320px/键盘/读屏/200%","安全与权限","备份/回滚","P0/P1=0"];
  gates.forEach((g,i)=>{const x=262+(i%4)*280,y=714+Math.floor(i/4)*74;body+=`${rect(x,y,258,52,C.surface,C.border,8)}${circle(x+24,y+26,9,C.surface,C.danger,2)}${text(x+44,y+17,g,13,C.text,600)}`;});
  body += `${button(1110,864,"只重试失败区域",false,170)}${button(1290,864,"查看错误详情",false,124)}${footer()}`;
  return frame("10 质量、刷新与恢复","真实状态优先；静态回退不能证明任何运行时能力。",10,"current",body);
};

const flowBoard = (idx,titleStr,steps,notes,branch=false) => {
  let body = `${rect(32,104,1376,72,C.surface,C.border,10)}${text(54,124,"流程边界",13,C.muted,700)}${text(150,124,notes,14,C.text,600)}`;
  const y=322; const gap=(1320)/(steps.length-1);
  steps.forEach((s,i)=>{const x=60+i*gap; body+=`${circle(x,y,26,i===0?C.action:C.surface,i===0?C.action:C.info,3)}${text(x,y-9,String(i+1),14,i===0?"#FFFFFF":C.info,800,"middle")}${text(x,y+46,s[0],13,C.text,700,"middle")}${text(x,y+72,s[1],11,C.muted,500,"middle")}${i<steps.length-1?line(x+28,y,x+gap-28,y,C.border,3):""}`;});
  if(branch){
    body += `${card(80,520,580,320,"分支 A：输入不足","终止，不生成路线")}${pill(110,596,"当前差距保持未知","danger",190)}${lines(110,646,["目标／公共要求／个人证据任一缺失", "只允许：补证据、确认目标、查看版本", "禁止：生成路线、优先级、个人分数"],15,C.muted,500)}${card(780,520,580,320,"分支 B：三项输入齐全","目标态演示 · 当前未接通")}${pill(810,596,"路线草案（系统推断）","infer",205)}${lines(810,646,["每步：能力、证据产物、完成判定", "投入区间、依赖、来源、复评条件", "用户可调整、暂停或删除"],15,C.muted,500)}`;
  } else {
    body += `${card(80,520,1280,320,"状态与恢复","每一步都能返回、取消、保留输入或查看影响")}${lines(110,600,["默认 / 焦点 / 加载 / 待确认 / 部分成功 / 失败 / 离线均使用文字+图标+形状。", "失败后只重试失败区域；已确认内容不得重复写入；危险操作默认焦点在取消。", "键盘与读屏按阶段播报，不逐字播报字符数。"],16,C.text,500)}`;
  }
  return boardFrame(`流程 ${idx} · ${titleStr}`,"1440×1024 逻辑画板 · 完整简体中文 · 可恢复交互",body);
};

const truthSources = () => {
  let body = `${truthBar(102,"current")}${card(32,170,1376,730,"来源政策轴 × 运行时轴","当前真实 0 接入；目标状态不得混入当前状态")}`;
  const policies=["允许（allow）","条件允许（conditional）","仅人工（manual_only）","禁用（disabled）"];
  const runtime=["未配置","校验中","已启用","正常","部分失败","失败","已停用"];
  policies.forEach((p,i)=>body+=`${rect(72,252+i*130,214,94,i===0?C.softAction:i===1?C.softWarn:C.softUnknown,C.border,8)}${text(90,278+i*130,p,14,C.text,700)}${text(90,312+i*130,i===0?"研究允许，不代表接入":i===1?"条件缺口未满足":"不可自动运行",12,C.muted,500)}`);
  runtime.forEach((r,i)=>{const x=340+(i%4)*250,y=244+Math.floor(i/4)*228;const target=i>=1&&i<=4;body+=`${rect(x,y,220,180,target?"#FFFDF8":C.surface,target?C.warning:C.border,8)}${pill(x+16,y+18,target?"目标态演示":"当前真实",target?"warning":"danger",100)}${text(x+16,y+62,r,16,C.text,750)}${text(x+16,y+96,target?"当前未接通":"0 connector",12,target?C.warning:C.danger,700)}${text(x+16,y+126,"需显示最近成功/失败",11,C.muted,500)}`;});
  body += `${text(72,848,"强制结论：研究清单已批准 · 运行时来源 0 · connector 0 · 招聘实例 0",15,C.danger,750)}${text(72,884,"Greenhouse / Lever / Ashby：条件模板，缺具体公司 board/site 允许清单。",13,C.text,600)}`;
  return boardFrame("真相态 01 · 来源政策与运行时","两轴独立；不使用一个绿点概括政策与接入。",body);
};

const truthStates = () => {
  const states=[
    ["当前来源快照可用","live","目标态演示 · 当前未接通","success"],["当前条件下 0 条","empty","不是市场需求为零","unknown"],
    ["数据尚未就绪","not_ready","缺少服务／来源","danger"],["数据可能过期","stale","24/48h + 最近成功","warning"],
    ["使用上一已核验版本","degraded","显示旧版本与失败范围","warning"],["部分步骤成功","partial","成功/失败项分列","warning"],
    ["当前无可用结果","failed","保留输入，可重试","danger"],["当前离线","offline","本地可读，待同步","unknown"],
    ["演示数据","seed_demo","不代表真实来源或用户","warning"],["尚无可执行来源","no-source","运行时 0","danger"],
    ["暂无个人证据","no-evidence","未知，只补证据","unknown"]
  ];
  let body=`${truthBar(102,"current")}`;
  states.forEach((s,i)=>{const col=i%3,row=Math.floor(i/3),x=32+col*458,y=170+row*190;body+=`${rect(x,y,426,162,C.surface,C.border,10)}${pill(x+20,y+18,`${s[0]}（${s[1]}）`,s[3],280)}${text(x+20,y+64,s[2],13,C.text,600)}${text(x+20,y+98,"图标 + 形状 + 中文状态；颜色仅冗余",12,C.muted,500)}${text(x+20,y+126,s[1]==="live"?"必须显著标目标态":"允许查看详情／恢复动作",11,s[1]==="live"?C.warning:C.action,650)}`;});
  return boardFrame("真相态 02 · 11 类用户可见状态","简体中文为主，内部键只放括号；所有状态非颜色唯一表达。",body);
};

const phone = (x,y,w,label,titleStr,state,content) => {
  const scale=w/390; const h=844*scale;
  return `${text(x+w/2,y-26,label,13,C.text,750,"middle")}${rect(x,y,w,h,C.surface,C.dark,24,`stroke-width="3"`)}${rect(x+w*.36,y+10*scale,w*.28,5*scale,C.dark,C.dark,3)}${text(x+18*scale,y+34*scale,titleStr,17*scale,C.text,750)}${pill(x+18*scale,y+68*scale,state[0],state[1],Math.min(w-36*scale,state[2]*scale))}${content(x,y,scale,w,h)}${rect(x+12*scale,y+h-56*scale,w-24*scale,44*scale,C.surface,C.border,12)}${text(x+w/2,y+h-43*scale,"方向　技术栈　工作台　个人　更多",10*scale,C.muted,600,"middle")}`;
};

const mobileBoard = (idx,name,titleStr,state,content) => {
  const body=`${phone(120,130,390,"逻辑视口 390×844",titleStr,state,content)}${phone(850,130,320,"逻辑视口 320×844",titleStr,state,content)}${text(120,986,"同一页面 · 同一状态 · 两种宽度并列；320px 无整页横向滚动。",14,C.text,700)}`;
  return boardFrame(`移动 ${idx} · ${name}`,"画板按逻辑 CSS 像素等比缩放展示；触控目标 ≥44×44 CSS px。",body,1320,1030);
};

const mobileContents = {
  direction:(x,y,s,w,h)=>{const names=["产品型前端","平台/DevEx","AI 应用前端","数据可视化","跨端/移动","全栈协作","Web 质量","UX Engineering"];let z=`${text(x+18*s,y+112*s,"二维解释坐标（非排名）",12*s,C.muted,600)}${rect(x+18*s,y+142*s,w-36*s,236*s,"#F9FAFB",C.border,8)}`;names.forEach((n,i)=>{const cx=x+(52+(i%2)*158)*s,cy=y+(170+Math.floor(i/2)*48)*s;z+=`${circle(cx,cy,6*s,C.surface,i===0?C.action:C.info,2)}${text(cx+12*s,cy-7*s,n,10*s,C.text,600)}`;});z+=`${button(x+18*s,y+400*s,"查看该方向技术栈",true,w-36*s)}${text(x+18*s,y+458*s,"8 个方向完整可达",11*s,C.muted,600)}`;return z;},
  tech:(x,y,s,w,h)=>{const d=["Web平台｜HTML/CSS/JS/TS","框架数据｜组件/状态/请求","工程化｜构建/测试/CI/CD","产品质量｜性能/a11y/安全","设计协作｜系统/API/Git/文档","方向专项｜实时/跨端/全栈","AI增量｜接口/流式/评估/审核","观察项｜WASM/WebGPU/MCP"];let z=text(x+18*s,y+112*s,"P0 → P1 → P1-AI → P2 → 观察项",11*s,C.action,700);d.forEach((v,i)=>z+=`${rect(x+18*s,y+(145+i*60)*s,w-36*s,48*s,C.surface,C.border,7)}${text(x+30*s,y+(158+i*60)*s,v,10*s,C.text,600)}`);return z;},
  trend:(x,y,s,w,h)=>`${pill(x+18*s,y+112*s,"获批历史研究快照","info",150*s)}${text(x+18*s,y+158*s,"核心目的样本 N=10",12*s,C.text,700)}${bar(x+18*s,y+196*s,w-36*s,.9,"React 9/10（不是市场份额）",C.action)}${bar(x+18*s,y+252*s,w-36*s,.8,"TypeScript 8/10",C.info)}${rect(x+18*s,y+326*s,w-36*s,150*s,"#FFFDF8",C.warning,8)}${text(x+30*s,y+344*s,"7/30/90 日趋势",12*s,C.text,700)}${text(x+30*s,y+380*s,"目标态演示 · 当前未接通",11*s,C.warning,700)}${text(x+30*s,y+414*s,"来源 0 · 缺失天数 —",11*s,C.danger,600)}`,
  workInput:(x,y,s,w,h)=>`${text(x+18*s,y+112*s,"步骤 1/6 · 粘贴内容",12*s,C.action,700)}${rect(x+18*s,y+150*s,w-36*s,220*s,C.surface,C.border,8)}${text(x+30*s,y+172*s,"仅 URL 不自动抓取",11*s,C.muted,500)}${text(x+30*s,y+330*s,"328 / 100,000 Unicode",11*s,C.action,700)}${radio(x+18*s,y+398*s,"仅本次处理（推荐）",true)}${radio(x+18*s,y+438*s,"保存到私有档案",false)}${check(x+18*s,y+486*s,"权利与敏感信息已确认",true)}${button(x+18*s,y+540*s,"继续分类",true,w-36*s)}`,
  workResult:(x,y,s,w,h)=>`${text(x+18*s,y+112*s,"步骤 5/6 · 对照关系",12*s,C.action,700)}${text(x+18*s,y+152*s,"每条候选互斥单选",11*s,C.danger,650)}${radio(x+18*s,y+192*s,"新增证据",false)}${radio(x+18*s,y+230*s,"相互印证",false)}${radio(x+18*s,y+268*s,"重复",false)}${radio(x+18*s,y+306*s,"冲突",true)}${radio(x+18*s,y+344*s,"证据不足",false)}${radio(x+18*s,y+382*s,"不适用",false)}${rect(x+18*s,y+438*s,w-36*s,112*s,"#FFF8F0",C.border,8)}${text(x+30*s,y+456*s,"公共研究与用户主张并列",11*s,C.text,650)}${text(x+30*s,y+492*s,"不静默覆盖；逐条确认",11*s,C.muted,500)}`,
  gap:(x,y,s,w,h)=>`${pill(x+18*s,y+112*s,"当前差距保持未知","danger",180*s)}${rect(x+18*s,y+160*s,w-36*s,270*s,"#F9FAFB",C.border,8)}${text(x+w/2,y+202*s,"?",34*s,C.unknown,800,"middle")}${text(x+w/2,y+254*s,"路线未生成",18*s,C.text,750,"middle")}${lines(x+34*s,y+298*s,["目标或证据不足", "只能补证据/确认目标", "不生成优先级或三步路线"],11*s,C.muted,600)}${button(x+18*s,y+458*s,"确认目标",true,w-36*s)}${button(x+18*s,y+512*s,"补充证据",false,w-36*s)}`,
  rights:(x,y,s,w,h)=>`${pill(x+18*s,y+112*s,"目标态演示 · 当前未接通","warning",220*s)}${pill(x+18*s,y+154*s,"演示数据 · 用户提供","warning",185*s)}${text(x+18*s,y+208*s,"仅本次处理　2 条",12*s,C.text,650)}${text(x+18*s,y+250*s,"私有原文　1 条",12*s,C.text,650)}${text(x+18*s,y+292*s,"第三方发送　0 次",12*s,C.success,700)}${divider(x+18*s,y+334*s,w-36*s)}${button(x+18*s,y+366*s,"导出人类可读摘要",false,w-36*s)}${button(x+18*s,y+420*s,"导出机器可读数据",false,w-36*s)}${rect(x+18*s,y+492*s,w-36*s,120*s,"#FFF4F5",C.danger,8)}${text(x+30*s,y+512*s,"危险操作：删除账号",12*s,C.danger,750)}${text(x+30*s,y+552*s,"默认焦点：取消",11*s,C.text,650)}${text(x+30*s,y+582*s,"24h 活动数据 / 30天备份",10*s,C.muted,500)}`
};

const componentsBoard = () => {
  let body=`${card(32,110,1376,830,"核心组件状态","全部状态中文可见，颜色仅作冗余；焦点环不被裁切")}`;
  const states=["默认","悬停","焦点","按下","选中","禁用","加载","成功","待确认","警告","错误","危险"];
  states.forEach((s,i)=>{const x=62+(i%6)*220,y=190+Math.floor(i/6)*120;const kind=i===7?"success":i===8||i===9?"warning":i>=10?"danger":"unknown";body+=`${rect(x,y,190,88,C.surface,i===2?C.info:C.border,8,`stroke-width="${i===2?3:1}"`)}${pill(x+14,y+14,s,kind,72)}${text(x+14,y+54,i===5?"操作不可用":i===6?"正在处理…":"按钮 / 输入 / 标签",12,i===5?C.unknown:C.text,600)}`;});
  body += `${text(62,468,"删除确认",16,C.text,750)}${rect(62,508,600,218,C.surface,C.danger,10,`stroke-width="2"`)}${pill(84,530,"危险操作","danger",98)}${text(84,574,"删除证据并重算？",18,C.text,750)}${text(84,614,"说明对象、影响、可恢复性与后续重算。",13,C.muted,500)}${button(324,658,"取消（默认焦点）",false,156)}${button(494,658,"确认删除",false,140)}${rect(318,652,168,52,"none",C.info,10,`stroke-width="3"`)}`;
  body += `${text(720,468,"表单与状态播报",16,C.text,750)}${rect(720,508,650,218,C.surface,C.border,10)}${text(742,530,"来源 URL（可选）",13,C.text,700)}${rect(742,562,606,44,C.surface,C.danger,7,`stroke-width="2"`)}${text(754,574,"仅 URL 不会自动抓取，请粘贴正文",12,C.danger,600)}${rect(742,628,606,62,"#F9FAFB",C.border,7)}${text(756,642,"礼貌状态播报",12,C.text,700)}${text(756,666,"“摘要完成；保存失败；原输入仍保留。”",12,C.muted,500)}`;
  body += `${text(62,772,"触控目标 ≥44×44 CSS px　·　危险/普通操作间距 ≥12px　·　减少动效　·　Escape 取消非破坏操作",14,C.text,650)}${text(62,816,"正文与状态标签文字对比度 ≥4.5:1；焦点、图形边界 ≥3:1。",14,C.action,700)}`;
  return boardFrame("组件状态总览","默认、焦点、选中、禁用、加载、成功、待确认、警告、错误与危险状态。",body);
};

const datavizBoard = () => {
  const charts=["方向坐标图","方向比较矩阵","分层能力地图","样本内计数点图","7/30/90趋势线","远程约束矩阵","来源政策×运行时","来源覆盖时间带","双轴分类面板","研究关系矩阵","证据阶梯","差距证据矩阵","路线依赖图","版本/变化时间线","同步状态时间线"];
  let body=`${truthBar(102,"current")}`;
  charts.forEach((c,i)=>{const col=i%5,row=Math.floor(i/5),x=32+col*278,y=170+row*230;body+=`${rect(x,y,250,202,C.surface,C.border,9)}${text(x+16,y+16,`${String(i+1).padStart(2,"0")} ${c}`,13,C.text,700)}${rect(x+16,y+52,218,92,"#F9FAFB",C.border,6)}`;if(i%3===0){body+=`${line(x+34,y+130,x+34,y+70,C.muted)}${line(x+34,y+130,x+216,y+130,C.muted)}${circle(x+86,y+104,7,C.surface,C.action,2)}${circle(x+140,y+86,9,C.surface,C.info,2)}${circle(x+190,y+112,6,C.surface,C.warning,2)}`;}else if(i%3===1){for(let j=0;j<4;j++)body+=`${rect(x+34,y+70+j*18,40+j*34,10,j===3?C.warning:C.info,j===3?C.warning:C.info,4)}`;}else{body+=spark([[x+34,y+126],[x+72,y+104],[x+110,y+114],[x+148,y+82],[x+190,y+96],[x+216,y+70]],C.action,3);}body+=`${text(x+16,y+154,"数据表：必备",11,C.action,700)}${text(x+110,y+154,"口径/样本/as_of",11,C.muted,500)}${text(x+16,y+178,"关键值不只藏在 Tooltip",10,C.muted,500)}`;});
  body += `${text(32,876,"统一要求：标题 · 结论 · 口径 · 样本量 · 来源覆盖 · 时间 · 筛选 · 数据模式 · 查看数据表",14,C.text,700)}${text(32,912,"禁止：3D、双Y轴、装饰性饼图、无刻度仪表盘、伪精确面积图；当前来源为0时不绘制伪趋势。",13,C.danger,650)}`;
  return boardFrame("数据可视化规范 · 15 类","每类均有等价表格、真相注释和非颜色编码。",body);
};

const foundationBoard = () => {
  const colors=[["正文",C.text,"#FFFFFF","16.29:1"],["次正文/未知",C.muted,"#FFFFFF","7.69:1"],["主操作",C.action,"#FFFFFF","6.37:1"],["信息",C.info,"#FFFFFF","6.70:1"],["成功",C.success,"#FFFFFF","5.69:1"],["警告",C.warning,"#FFFFFF","6.79:1"],["危险",C.danger,"#FFFFFF","6.47:1"],["系统推断",C.infer,"#FFFFFF","6.46:1"]];
  let body=`${card(32,110,680,810,"颜色与机器可复核对比度","公式：WCAG relative luminance；普通文字目标 ≥4.5:1")}`;
  colors.forEach((r,i)=>{const y=182+i*82;body+=`${rect(58,y,76,52,r[1],r[1],7)}${text(154,y+4,r[0],13,C.text,700)}${text(154,y+28,`${r[1]} on ${r[2]}`,12,C.muted,500)}${pill(426,y+10,r[3],parseFloat(r[3])>=4.5?"success":"danger",90)}${text(536,y+18,"AA 普通文字",12,C.text,600)}`;});
  body += `${card(736,110,672,370,"排版、网格与形状","1440/1024/390/320 逻辑 CSS 像素")}${lines(764,182,["字体：系统无衬线；正文 14–16，移动 ≥16 CSS px", "字号：H1 28 / H2 20 / H3 16 / 辅助 12–13", "间距：4 / 8 / 12 / 16 / 24 / 32 / 48", "圆角：8 / 10 / 12；阴影非默认，仅浮层使用", "桌面 12 列；1024 折叠侧栏；移动单栏", "焦点环：#1D4ED8 3px + 2px 间隔", "动效：150–220ms；支持减少动效"],14,C.text,550)}${card(736,504,672,416,"非颜色唯一编码","图标 + 形状 + 中文文字")}`;
  const codes=[["公共事实","● 实心圆"],["来源观点","❝ 引号"],["系统推断","◇ 虚线菱形"],["未知","○ 空心圆"],["用户提供","▤ 文档"],["用户确认","✓ 印章"],["外部核验","⬡ 盾牌"],["冲突","↔ 双向箭头"],["演示数据","▧ 斜纹底"]];
  codes.forEach((r,i)=>{const x=764+(i%3)*206,y=576+Math.floor(i/3)*92;body+=`${rect(x,y,184,66,C.surface,C.border,8)}${text(x+14,y+12,r[1],14,i===2?C.infer:i===7?C.danger:C.action,750)}${text(x+14,y+38,r[0],12,C.text,600)}`;});
  return boardFrame("视觉基础规范","action / info / success / warning / danger / unknown 统一到文档与系统板。",body);
};

const responsive1024 = () => {
  const body=`${rect(62,118,1024,768,C.surface,C.dark,12,`stroke-width="3"`)}${rect(62,118,64,768,"#F9FAFB",C.border,0)}${text(144,142,"04 来源与质量",22,C.text,750)}${rect(144,186,920,64,C.softDanger,C.softDanger,7)}${text(164,206,"当前真实：研究清单已批准 · 运行时来源 0 · connector 0 · 招聘实例 0",13,C.danger,700)}${rect(144,272,920,250,C.surface,C.border,8)}${text(166,292,"来源政策×运行时矩阵",16,C.text,700)}${text(166,332,"组件内部允许横向滚动；页面整体不横滚",13,C.muted,500)}${rect(166,370,876,112,"#F9FAFB",C.border,6)}${text(184,390,"官方技术端点（13）　允许　未配置　最近成功 —",12,C.text,600)}${text(184,430,"ATS 条件模板（3）　conditional　未配置　招聘实例 0",12,C.text,600)}${rect(144,544,920,300,C.surface,C.border,8)}${text(166,566,"等价列表",16,C.text,700)}${lines(166,608,["来源身份 / 政策 / 运行时 / 权利条件 / 最近成功 / 失败原因", "图形与详情上下排列；焦点顺序保持标题→筛选→矩阵→列表。", "1024×768 逻辑视口，无内容遮挡，无整页横向滚动。"],14,C.text,500)}${text(1120,140,"实际导出画板 1440×1024；内部 1024×768 框按 1:1 CSS 逻辑像素绘制。",13,C.muted,600)}`;
  return boardFrame("响应式证据 · 1024×768","折叠侧栏、上下布局、组件内滚动与等价列表。",body);
};

const zoom200 = () => {
  const body=`${card(32,110,660,830,"100% · 1440 CSS px","12列 + 220px 侧栏")}${rect(64,176,596,690,C.surface,C.dark,10)}${rect(64,176,92,690,"#F9FAFB",C.border,0)}${text(178,202,"07 差距与成长路线",18,C.text,750)}${pill(178,242,"当前差距保持未知","danger",178)}${rect(178,296,450,186,"#F9FAFB",C.border,8)}${text(204,326,"三项输入并列",14,C.text,700)}${text(204,372,"未知时路线不生成",13,C.muted,500)}${button(204,424,"补充证据",true,128)}${card(724,110,684,830,"200% 文本放大","等效内容宽度约 720 CSS px；重排为单栏")}${rect(756,176,620,690,C.surface,C.dark,10)}${text(786,204,"07 差距与成长路线",22,C.text,750)}${pill(786,252,"当前差距保持未知","danger",220)}${rect(786,304,560,122,C.surface,C.border,8)}${text(812,328,"目标方向／层级：未确认",16,C.text,650)}${button(812,368,"确认目标",false,150)}${rect(786,446,560,122,C.surface,C.border,8)}${text(812,470,"个人证据：不足",16,C.text,650)}${button(812,510,"补充证据",true,150)}${rect(786,588,560,186,"#F9FAFB",C.border,8)}${text(812,614,"路线未生成",18,C.text,750)}${lines(812,658,["无横向滚动", "操作顺序与焦点不丢失", "正文、按钮和状态均未遮挡"],14,C.muted,550)}${text(756,894,"检查证据：内容重排，不缩小字体；主要操作可达；焦点环完整。",13,C.action,700)}`;
  return boardFrame("200% 放大检查","逻辑视口不变，文本放大后按可用宽度重排；不以缩放截图冒充验证。",body);
};

const artifacts = [
  ["01-desktop-page-01-directions-1440.svg",1440,1024,page01()],
  ["02-desktop-page-02-tech-landscape-1440.svg",1440,1024,page02()],
  ["03-desktop-page-03-market-trends-1440.svg",1440,1024,page03()],
  ["04-desktop-page-04-sources-quality-1440.svg",1440,1024,page04()],
  ["05-desktop-page-05-workbench-1440.svg",1440,1024,page05()],
  ["06-desktop-page-06-personal-evidence-1440.svg",1440,1024,page06()],
  ["07-desktop-page-07-gap-roadmap-1440.svg",1440,1024,page07()],
  ["08-desktop-page-08-future-history-1440.svg",1440,1024,page08()],
  ["09-desktop-page-09-data-rights-1440.svg",1440,1024,page09()],
  ["10-desktop-page-10-quality-recovery-1440.svg",1440,1024,page10()],
  ["11-flow-01-workbench-six-step.svg",1440,1024,flowBoard("01","信息源六步",[["粘贴","保留原文"],["保存模式","互斥选择"],["敏感确认","不回显值"],["双轴确认","人工纠正"],["摘要/对照","关系互斥"],["合并","逐条确认"]],"1–100,000 Unicode；仅本次/私有保存；失败保留输入")],
  ["12-flow-02-evidence-confirmation.svg",1440,1024,flowBoard("02","个人证据确认",[["候选证据","用户自述"],["逐条查看","依据/时间"],["接受/编辑","不批量隐藏"],["拒绝/未知","不支持结论"],["版本形成","保留历史"],["影响预览","再决定重算"]],"用户确认 ≠ 外部核验；冲突项先裁决")],
  ["13-flow-03-gap-roadmap-recompute.svg",1440,1024,flowBoard("03","差距与路线重算",[["目标","需确认"],["公共要求","需版本"],["个人证据","需确认/核验"],["差距判断","可解释"],["路线草案","系统推断"],["用户调整","留历史"]],"未知分支终止；仅三项输入齐全才允许路线",true)],
  ["14-flow-04-sync-export-delete.svg",1440,1024,flowBoard("04","同步／导出／删除",[["设备版本","查看冲突"],["同步","10秒目标"],["选择导出","双格式"],["影响预览","证据/路线"],["二次确认","默认取消"],["删除/重算","分状态恢复"]],"目标态演示 · 当前未接通；删除账号为独立流程")],
  ["15-truth-01-source-policy-runtime.svg",1440,1024,truthSources()],
  ["16-truth-02-eleven-states.svg",1440,1024,truthStates()],
  ["17-mobile-01-directions-390-320.svg",1320,1030,mobileBoard("01","方向总览 390/320","01 职业方向",["当前真实状态","danger",180],mobileContents.direction)],
  ["18-mobile-02-tech-390-320.svg",1320,1030,mobileBoard("02","技术栈 390/320","02 技术栈全景",["当前真实状态","danger",180],mobileContents.tech)],
  ["19-mobile-03-trends-390-320.svg",1320,1030,mobileBoard("03","市场趋势 390/320","03 市场趋势",["运行时来源 0","danger",150],mobileContents.trend)],
  ["20-mobile-04-workbench-input-390-320.svg",1320,1030,mobileBoard("04","工作台输入 390/320","05 信息源工作台",["演示数据 · 用户提供","warning",185],mobileContents.workInput)],
  ["21-mobile-05-workbench-result-390-320.svg",1320,1030,mobileBoard("05","工作台结果 390/320","05 关系确认",["演示数据 · 用户提供","warning",185],mobileContents.workResult)],
  ["22-mobile-06-gap-unknown-390-320.svg",1320,1030,mobileBoard("06","差距未知 390/320","07 差距与路线",["当前差距未知","danger",150],mobileContents.gap)],
  ["23-mobile-07-data-rights-390-320.svg",1320,1030,mobileBoard("07","数据权利 390/320","09 数据权利",["目标态演示 · 未接通","warning",190],mobileContents.rights)],
  ["24-components-states.svg",1440,1024,componentsBoard()],
  ["25-dataviz-15-types.svg",1440,1024,datavizBoard()],
  ["26-foundation-contrast-tokens.svg",1440,1024,foundationBoard()],
  ["27-responsive-1024.svg",1440,1024,responsive1024()],
  ["28-accessibility-zoom-200.svg",1440,1024,zoom200()]
];

const style = `<style>
  text { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", Arial, sans-serif; }
  * { shape-rendering: geometricPrecision; text-rendering: optimizeLegibility; }
</style>`;

for (const [name,w,h,body] of artifacts) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc">${style}<title id="title">${esc(name)}</title><desc id="desc">Frontend Career Radar CR-UI-002 v1.1 可复核设计原型</desc>${body}</svg>`;
  fs.writeFileSync(path.join(outDir,name), svg, "utf8");
}

const manifest = artifacts.map(([name,w,h])=>({name,width:w,height:h}));
fs.writeFileSync(path.join(outDir,"manifest.json"), JSON.stringify({version:"1.1",count:artifacts.length,assets:manifest}, null, 2)+"\n", "utf8");
console.log(`generated ${artifacts.length} SVG assets in ${outDir}`);
