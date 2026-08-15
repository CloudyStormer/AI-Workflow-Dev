import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const previousRoot = path.resolve(here, "../release-completeness-v1.3");
const previousResolved = JSON.parse(fs.readFileSync(path.join(previousRoot, "resolved-manifest.json"), "utf8"));
const baseModels = JSON.parse(fs.readFileSync(path.join(previousRoot, "chart-models.json"), "utf8"));
const svgDir = path.join(here, "assets");
const pngDir = path.join(here, "png");
fs.mkdirSync(svgDir, { recursive: true });
fs.mkdirSync(pngDir, { recursive: true });

const C = {bg:"#F5F7FA", surface:"#FFFFFF", text:"#17212B", muted:"#475467", border:"#B8C2CC", action:"#0B6B63", info:"#1849A9", warning:"#854A0E", danger:"#B4233C", softAction:"#E8F5F2", softInfo:"#EAF1FF", softWarn:"#FFF3E0", softDanger:"#FDECEF", soft:"#EEF1F4"};
const esc = (v) => String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const rect = (x,y,w,h,fill=C.surface,stroke=C.border,r=8,extra="") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const line = (x1,y1,x2,y2,stroke=C.border,width=1,extra="") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const circle = (cx,cy,r,fill=C.surface,stroke=C.action,width=2,extra="") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const tx = (x,y,value,size=14,color=C.text,weight=400,anchor="start",extra="") => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}" dominant-baseline="hanging" ${extra}>${esc(value)}</text>`;
const ltx = (container,x,y,value,size=14,color=C.text,weight=400,anchor="start",extra="") => tx(x,y,value,size,color,weight,anchor,`data-layout-text="true" data-container-ref="${container}" ${extra}`);
const box = (id,x,y,w,h,fill=C.surface,stroke=C.border,r=8,extra="") => rect(x,y,w,h,fill,stroke,r,`id="${id}" data-layout-container="true" ${extra}`);
const style = `<style>text{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",Arial,sans-serif}*{shape-rendering:geometricPrecision;text-rendering:geometricPrecision}</style>`;
const svg = (w,h,name,body,extra="") => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc" ${extra}>${style}<title id="title">${esc(name)}</title><desc id="desc">前端职业成长雷达发布完整性 v1.4 版本化设计原型</desc>${body}</svg>`;
const truth = (surface) => surface === "public" ? "研究清单已批准 · 当前来源 0 · 连接器 0 · 招聘实例 0" : surface === "private" ? "演示数据 · 用户提供 · 非真实用户档案 · 未经授权不外发" : "公共：获批历史研究快照 · 个人：演示数据·用户提供 · 规则：系统配置";

function header(title, subtitle, surface) {
  let b = rect(0,0,1440,1024,C.bg,C.bg,0);
  b += box("header-title",32,22,1376,44,C.bg,C.bg,0)+ltx("header-title",32,28,title,28,C.text,800);
  b += box("header-subtitle",32,68,1376,28,C.bg,C.bg,0)+ltx("header-subtitle",32,72,subtitle,14,C.muted,550);
  b += box("truth-strip",32,106,1376,48,C.softDanger,C.danger,8,`data-complete-truth-strip="true" data-surface="${surface}"`)+ltx("truth-strip",50,122,truth(surface),14,C.danger,750);
  b += ltx("truth-strip",1390,122,"CR-UI-002 v1.4",13,C.danger,700,"end");
  return b;
}

const replacements=[];
const add=(name,category,surface,source,svgText,assertions=[])=>replacements.push({name,category,surface,source,svgText,assertions});

function desktopPage(page) {
  const configs={
    "04":{name:"04-desktop-page-04-sources-quality-1440.svg",title:"04 来源与质量",subtitle:"研究政策与运行时事实分轴呈现；状态条、筛选器和内容卡互不遮挡。",surface:"public",chips:["政策：全部","运行时：未配置","窗口：48小时"],cards:[["政策清单","技术端点 13 · 条件模板 3","批准只代表研究使用范围"],["运行时来源","0 个来源 · 0 个连接器","尚未接入，不显示成功时间块"],["质量说明","招聘实例 0","不可外推市场份额"]]},
    "05":{name:"05-desktop-page-05-workbench-1440.svg",title:"05 用户信息源工作台",subtitle:"六步流程只出现一次；来源渠道与内容类型分别确认。",surface:"private",chips:["仅本次处理","1–100,000 Unicode","双轴人工确认"],cards:[["输入与隐私边界","粘贴网址、职位描述或个人材料","敏感信息先确认"],["分类确认边界","元数据、双轴建议与人工确认","候选可纠正"],["关系与保存边界","六类关系单选与保存边界","失败保留输入"]]},
    "06":{name:"06-desktop-page-06-personal-evidence-1440.svg",title:"06 个人事实与证据",subtitle:"用户自述、可核验证据、系统评估与推断保持分层。",surface:"private",chips:["账号：演示 A","证据：待核验","未经授权不外发"],cards:[["用户自述","熟悉 React 与 TypeScript","不能直接等同已掌握"],["可核验证据","仓库、演示、指标与评审记录","核验状态单独显示"],["系统推断","仅提供待确认建议","不得冒充用户事实"]]},
    "08":{name:"08-desktop-page-08-future-history-1440.svg",title:"08 未来方向与历史",subtitle:"公共快照、个人记录、规则版本使用三条独立来源轨道。",surface:"mixed",chips:["窗口：90日","三轨分别标注","按版本回看"],cards:[["公共快照","获批历史研究快照","运行时来源仍为 0"],["个人记录","演示数据 · 用户提供","不代表真实用户档案"],["规则版本","系统配置与规则变更","保留版本与时间"]]}
  };
  const c=configs[page]; let b=header(c.title,c.subtitle,c.surface);
  b += box(`filters-${page}`,32,174,1376,76,C.surface,C.border,10);
  c.chips.forEach((label,i)=>{const x=52+i*230;b+=box(`chip-${page}-${i}`,x,194,210,36,C.softInfo,C.info,18)+ltx(`chip-${page}-${i}`,x+105,203,label,14,C.info,700,"middle")});
  c.cards.forEach((card,i)=>{const x=32+i*459; b+=box(`card-${page}-${i}`,x,282,435,270,C.surface,C.border,10)+ltx(`card-${page}-${i}`,x+22,304,card[0],20,C.text,800)+ltx(`card-${page}-${i}`,x+22,350,card[1],15,C.text,650)+ltx(`card-${page}-${i}`,x+22,392,card[2],14,C.muted,550);});
  b += box(`detail-${page}`,32,584,1376,360,C.surface,C.border,10)+ltx(`detail-${page}`,54,608,page==="05"?"唯一六步进度":"当前页面说明",18,C.text,800);
  if(page==="05"){
    const steps=["输入","元数据","双轴建议","人工确认","关系单选","保存边界"];
    steps.forEach((s,i)=>{const x=54+i*216;b+=box(`page05-step-${i+1}`,x,668,190,96,i===0?C.softAction:C.surface,i===0?C.action:C.border,8,`data-page05-step="${i+1}"`)+ltx(`page05-step-${i+1}`,x+18,684,`${i+1}. ${s}`,15,C.text,750)+ltx(`page05-step-${i+1}`,x+18,718,i===0?"当前":"待处理",13,i===0?C.action:C.muted,650)});
    b += box("page05-footer",54,802,1288,96,C.softWarn,C.warning,8)+ltx("page05-footer",72,820,"关系必须六选一；未知差距不生成路线；失败时保留输入并只重试失败步骤。",15,C.warning,700);
  } else {
    b += ltx(`detail-${page}`,54,656,"所有状态同时使用文字、形状和图标，不以颜色作为唯一编码。",16,C.text,600);
    b += ltx(`detail-${page}`,54,704,"键盘焦点顺序与视觉顺序一致；状态变化使用礼貌播报。",16,C.text,600);
    b += ltx(`detail-${page}`,54,752,"当前无真实运行时来源、真实账号服务或获批招聘实例。",16,C.danger,700);
  }
  return {name:c.name,surface:c.surface,svgText:svg(1440,1024,c.title,b,`data-desktop-page="${page}" data-overlap-guard="computed"`)};
}
for(const page of ["04","05","06","08"]){const a=desktopPage(page);add(a.name,"desktop",a.surface,"redrawn-v1.4",a.svgText,["computed-text-container-bounds","single-nonoverlapping-truth-strip"])}

const models=structuredClone(baseModels);
models.version="1.4";
const scatter=models.charts.find(c=>c.id==="25-01-direction-scatter");
scatter.filter="方向：全部（8/8） · 证据截止：2026-08-03";
scatter.axis="横轴（X）产品交付协作深度 0–5 · 纵轴（Y）平台/体验专项深度 0–5 · 单位：解释坐标";
scatter.records=[
  {id:"dir-product",direction:"产品型前端／应用工程",x:4.5,y:2.0,evidence:6,confidence:"中",state:"historical_snapshot"},
  {id:"dir-platform",direction:"平台／设计系统／开发者体验",x:2.0,y:4.7,evidence:4,confidence:"中",state:"historical_snapshot"},
  {id:"dir-ai",direction:"AI应用前端／AI产品工程",x:4.8,y:3.4,evidence:4,confidence:"低",state:"historical_snapshot"},
  {id:"dir-dataviz",direction:"数据可视化／实时交互",x:3.6,y:4.2,evidence:3,confidence:"低",state:"historical_snapshot"},
  {id:"dir-cross",direction:"跨端／桌面／移动",x:3.0,y:3.0,evidence:3,confidence:"低",state:"historical_snapshot"},
  {id:"dir-fullstack",direction:"全栈产品协作",x:5.0,y:1.4,evidence:3,confidence:"低",state:"historical_snapshot"},
  {id:"dir-quality",direction:"网页质量工程",x:2.6,y:3.8,evidence:2,confidence:"低",state:"historical_snapshot"},
  {id:"dir-ux",direction:"用户体验工程／设计开发融合",x:3.8,y:4.8,evidence:2,confidence:"低",state:"historical_snapshot"}
];
const cap=models.charts.find(c=>c.id==="25-03-capability-map");
cap.columns=["id","domain","p0","p1","p1_ai","p2","observe","evidence","state"];
cap.records=[
  {id:"cap-web",domain:"网页平台",p0:"语义与样式",p1:"浏览器机制",p1_ai:"AI界面安全",p2:"本样本暂无实例",observe:"新平台能力",evidence:"历史目的样本",state:"present"},
  {id:"cap-framework",domain:"框架与状态／数据",p0:"组件基础",p1:"路由与数据流",p1_ai:"流式输出状态",p2:"本样本暂无实例",observe:"信号模型",evidence:"历史目的样本",state:"present"},
  {id:"cap-engineering",domain:"工程化",p0:"构建与版本",p1:"质量门禁",p1_ai:"提示词评测",p2:"本样本暂无实例",observe:"智能流水线",evidence:"历史目的样本",state:"present"},
  {id:"cap-quality",domain:"产品质量",p0:"可用性",p1:"性能安全无障碍",p1_ai:"输出审核",p2:"本样本暂无实例",observe:"自动修复",evidence:"历史目的样本",state:"present"},
  {id:"cap-design",domain:"设计与协作",p0:"设计还原",p1:"系统化协作",p1_ai:"生成设计审查",p2:"本样本暂无实例",observe:"多模态协作",evidence:"历史目的样本",state:"present"},
  {id:"cap-special",domain:"方向专项",p0:"领域基础",p1:"图形或跨端",p1_ai:"领域代理",p2:"本样本暂无实例",observe:"网页图形计算",evidence:"历史目的样本",state:"present"},
  {id:"cap-ai",domain:"AI增量",p0:"使用边界",p1:"检索与工具",p1_ai:"评估与防护",p2:"本样本暂无实例",observe:"端侧模型",evidence:"历史目的样本",state:"present"},
  {id:"cap-observe",domain:"观察项",p0:"基础跟踪",p1:"证据记录",p1_ai:"风险观察",p2:"本样本暂无实例",observe:"网页图形／字节码／神经网络",evidence:"观察清单",state:"observe"}
];
fs.writeFileSync(path.join(here,"resolved-chart-models.json"),JSON.stringify(models,null,2)+"\n","utf8");

const fieldNames={id:"记录",direction:"方向",x:"横轴值",y:"纵轴值",evidence:"证据",confidence:"置信度",state:"状态",value:"价值",capability:"能力",limitation:"限制",domain:"能力域",priority:"优先级",item:"项目",p0:"P0",p1:"P1",p1_ai:"P1（AI增量）",p2:"P2",observe:"观察项",requirement:"要求",n:"样本计数",N:"样本总数",sample:"样本",slot:"时间槽",event_count:"事件数",source_coverage:"来源覆盖",missing:"缺失",as_of:"截至时间",timezone:"时区",authorization:"许可",contract:"合同",disclosure:"披露",source_group:"来源组",policy:"政策",runtime:"运行时",instances:"实例数",history:"历史",last_success:"最近成功",h24:"24小时",h48:"48小时",axis:"分类轴",suggestion:"建议",confirmation:"确认",basis:"依据",candidate:"候选",relation:"关系",selected:"已选择",level:"层级",evidence_type:"证据类型",material:"材料",proves_mastery:"掌握证明",target:"目标",public_requirement:"公共要求",personal_evidence:"个人证据",judgement:"判断",node:"节点",node_type:"节点类型",depends_on:"依赖",output:"输出",time:"时间",track:"轨道",event:"事件",version:"版本",source_identity:"来源身份",local_version:"本地版本",service_version:"服务版本",status:"状态",action:"操作"};
const values={historical_snapshot:"历史快照",present:"已有实例",observe:"观察项",counted:"已计数",not_ready:"未就绪",unknown:"未知",not_configured:"未配置",no_instance:"无获批实例",unavailable:"不可用",pending:"待确认",candidate:"候选",option:"未选择",selected:"已选择",user_reported:"用户自述",evidence_available:"有证据待核验",verifiable:"可核验",verified:"已核验",missing:"缺失",locked:"锁定",insufficient:"证据不足",approved_document:"已批准文档",demo_user_provided:"演示数据·用户提供",rule_configuration:"规则版本·系统配置",example_only:"允许状态示例",allow:"允许",conditional:"有条件允许",disabled:"停用",input:"输入",output:"输出","P1-AI":"P1（AI增量）",true:"是",false:"否"};
const visible=(v)=>v===null||v===undefined?"—":typeof v==="boolean"?(v?"是":"否"):(values[String(v)]??String(v));
const payload=(r)=>Buffer.from(JSON.stringify(r),"utf8").toString("base64url");
const visualRecord=(r,content)=>`<g data-visual-record="${esc(r.id)}" data-payload="${payload(r)}">${content}</g>`;
const tableRecord=(r,content)=>`<g data-table-record="${esc(r.id)}" data-payload="${payload(r)}">${content}</g>`;

function chartMarks(model){
  let g=""; const r=model.records; const area={x:54,y:334,w:1332,h:292};
  if(model.id==="25-01-direction-scatter"){
    g+=line(120,580,1250,580,C.text,2,`data-axis="x"`)+line(120,580,120,360,C.text,2,`data-axis="y"`);
    for(let i=0;i<=5;i++){const x=120+i*226,y=580-i*44;g+=line(x,574,x,586,C.text,1)+tx(x,592,String(i),12,C.muted,600,"middle")+line(114,y,126,y,C.text,1)+tx(100,y-7,String(i),12,C.muted,600,"end")}
    g+=tx(1250,606,"横轴（X）产品交付协作深度",14,C.text,700,"end")+tx(136,342,"纵轴（Y）平台／体验专项深度",14,C.text,700);
    r.forEach((item,i)=>{const x=120+item.x*226,y=580-item.y*44;const labelX=i%2?x+16:x-16,anchor=i%2?"start":"end";g+=visualRecord(item,circle(x,y,8+item.evidence/2,C.surface,C.action,3,`data-point-id="${item.id}"`)+tx(labelX,y-18,item.direction,12,C.text,650,anchor))});
    return g;
  }
  if(model.id==="25-03-capability-map"){
    const cols=["P0","P1","P1（AI增量）","P2","观察项"]; cols.forEach((label,i)=>g+=tx(410+i*180,344,label,13,C.text,700,"middle"));
    r.forEach((item,row)=>{const y=374+row*30;g+=visualRecord(item,tx(66,y+5,item.domain,13,C.text,700)+[item.p0,item.p1,item.p1_ai,item.p2,item.observe].map((value,col)=>rect(320+col*180,y,168,26,col===3?C.softWarn:C.softInfo,col===3?C.warning:C.border,4,`data-matrix-cell="${item.id}-${col}" data-cell-value="${esc(value)}"`)+tx(404+col*180,y+5,value,11,col===3?C.warning:C.text,600,"middle")).join(""))}); return g;
  }
  if(model.kind==="comparison") r.forEach((item,i)=>{const x=62+i*438;g+=visualRecord(item,rect(x,362,404,228,i===0?C.softAction:C.surface,i===0?C.action:C.border,10)+tx(x+18,382,item.direction,18,C.text,800)+tx(x+18,424,`价值：${item.value}`,13,C.text,600)+tx(x+18,456,`能力：${item.capability}`,13,C.text,600)+tx(x+18,488,`证据：${item.evidence}`,13,C.text,600)+tx(x+18,520,`限制：${item.limitation}`,13,C.text,600))});
  else if(model.kind==="dotplot") r.forEach((item,i)=>{const y=378+i*54;g+=visualRecord(item,tx(72,y,item.requirement,14,C.text,700)+line(250,y+9,1230,y+9,C.border,2)+circle(250+(item.n/item.N)*920,y+9,9,C.surface,C.action,3)+tx(1260,y-2,`${item.n}/${item.N} 条`,13,C.text,700))});
  else if(model.kind==="trend") {g+=line(130,546,1270,546,C.border,2);r.forEach((item,i)=>{const x=220+i*280;g+=visualRecord(item,line(x,400,x,546,C.border,2,"stroke-dasharray=\"5 5\"")+circle(x,458,13,C.surface,C.warning,3)+tx(x,492,item.slot,14,C.text,700,"middle")+tx(x,522,"缺失 · 来源覆盖 0/13",12,C.warning,700,"middle"))})}
  else if(model.kind==="remote") r.forEach((item,i)=>{const y=370+i*72;g+=visualRecord(item,rect(62,y,1290,54,C.surface,C.border,7)+tx(78,y+15,item.sample,14,C.text,750)+tx(250,y+15,item.timezone,13,C.text,600)+tx(500,y+15,item.authorization,13,C.text,600)+tx(760,y+15,item.contract,13,C.text,600)+tx(1010,y+15,item.disclosure,13,C.text,600))});
  else if(model.kind==="policy") r.forEach((item,i)=>{const x=72+i*430;g+=visualRecord(item,rect(x,370,398,214,item.state==="unavailable"?C.softDanger:C.soft,C.border,10)+tx(x+20,390,item.source_group,18,C.text,800)+tx(x+20,436,`政策：${visible(item.policy)}`,14,C.text,650)+tx(x+20,470,`运行时：${visible(item.runtime)}`,14,C.text,650)+tx(x+20,504,`实例：${item.instances}`,14,C.text,650)+tx(x+20,538,`状态：${visible(item.state)}`,14,C.muted,650))});
  else if(model.kind==="source_band") r.forEach((item,row)=>{const y=374+row*72;let cells="";for(let col=0;col<8;col++)cells+=rect(300+col*104,y,82,30,col<4?C.soft:C.softWarn,col<4?C.border:C.warning,4,`data-source-cell="${item.id}-${col}"`);g+=visualRecord(item,tx(70,y+7,item.source_group,14,C.text,700)+cells+tx(1160,y+7,visible(item.state),13,C.warning,700))});
  else if(model.kind==="dual_axis") r.forEach((item,i)=>{const left=item.axis==="来源渠道",col=left?0:1,row=left?i:i-2,x=62+col*660,y=382+row*100;g+=visualRecord(item,rect(x,y,620,78,left?C.softInfo:"#F0EDFF",left?C.info:"#5B4BC4",8)+tx(x+18,y+14,`${item.axis} · ${item.suggestion}`,15,C.text,750)+tx(x+18,y+44,`${item.confirmation} · 置信度 ${item.confidence}`,13,C.muted,600))});
  else if(model.kind==="relation") r.forEach((item,i)=>{const x=48+i*220;g+=visualRecord(item,rect(x,384,204,176,item.selected?C.softAction:C.surface,item.selected?C.action:C.border,8)+tx(x+102,402,item.selected?"●":"○",24,item.selected?C.action:C.muted,800,"middle")+tx(x+102,446,item.relation,15,C.text,750,"middle")+tx(x+102,482,item.basis,12,C.muted,600,"middle")+tx(x+102,516,visible(item.state),12,item.selected?C.action:C.muted,700,"middle"))});
  else if(model.kind==="stair") r.forEach((item,i)=>{const x=62+i*252,y=560-i*34,h=46+i*34;g+=visualRecord(item,rect(x,y,228,h,i>=3?C.softAction:C.soft,C.border,7)+tx(x+114,y+13,`${item.level} · ${item.evidence_type}`,13,C.text,750,"middle"))});
  else if(model.kind==="gap") r.forEach((item,i)=>{const y=374+i*58;g+=visualRecord(item,tx(70,y+10,item.capability,14,C.text,700)+rect(280,y,220,40,C.soft,C.border,6)+tx(390,y+11,item.target,13,C.text,600,"middle")+rect(520,y,220,40,C.softInfo,C.border,6)+tx(630,y+11,visible(item.public_requirement),13,C.text,600,"middle")+rect(760,y,220,40,C.soft,C.border,6)+tx(870,y+11,item.personal_evidence,13,C.text,600,"middle")+tx(1080,y+7,"◇",22,C.warning,800,"middle")+tx(1120,y+11,item.judgement,13,C.warning,700))});
  else if(model.kind==="route") r.forEach((item,i)=>{const x=70+i*318;g+=visualRecord(item,(i?line(x-54,470,x,470,C.border,2,"stroke-dasharray=\"6 6\""):"")+rect(x,410,260,122,C.soft,C.border,10)+tx(x+130,432,item.node,16,C.text,750,"middle")+tx(x+130,468,`依赖：${item.depends_on}`,12,C.muted,600,"middle")+tx(x+130,496,visible(item.state),12,C.warning,700,"middle"))});
  else if(model.kind==="version_timeline") {const ys={"公共快照":390,"个人记录":472,"规则版本":554};Object.entries(ys).forEach(([label,y])=>{g+=tx(64,y-10,label,14,C.text,750)+line(190,y,1300,y,C.border,3)});r.forEach((item,i)=>{const y=ys[item.track],x=310+i*190;g+=visualRecord(item,circle(x,y,10,C.surface,item.track==="个人记录"?C.warning:C.info,3)+tx(x,y-34,item.event,12,C.text,650,"middle")+tx(x,y+18,item.source_identity,11,C.muted,600,"middle"))})}
  else if(model.kind==="sync") {const ys={"Mac A":390,"Windows B":462,"服务":534,"目标态示例":606};r.forEach((item,i)=>{const y=ys[item.track]??390+i*68;g+=visualRecord(item,tx(64,y-8,item.track,14,C.text,750)+line(210,y,1260,y,C.border,3)+rect(470+i*150,y-18,220,36,C.softWarn,C.warning,18)+tx(580+i*150,y-8,`${item.status} · ${item.action}`,12,C.warning,700,"middle"))})}
  else throw new Error(`unsupported chart kind ${model.kind}`);
  return g;
}

function chartTable(model){
  const cols=model.columns.filter(c=>c!=="id"); const maxCols=Math.min(cols.length,8); const tableCols=cols.slice(0,maxCols); const cellW=1320/maxCols; let g="";
  tableCols.forEach((col,i)=>g+=tx(60+i*cellW,710,fieldNames[col]||col,12,C.text,750));
  model.records.forEach((record,row)=>{const y=738+row*25;g+=tableRecord(record,tableCols.map((col,i)=>tx(60+i*cellW,y,visible(record[col]),11,C.text,550)).join(""))});
  return g;
}

function chartBoard(model){
  const zh=(value)=>String(value).replaceAll("P1-AI","P1（AI增量）").replaceAll("connector","连接器");
  let b=header(`图表 ${model.id.slice(3,5)} · ${model.title}`,`${zh(model.context)}；图形与完整等价表由同一结构化记录生成。`,model.surface);
  b+=box(`chart-meta-${model.id}`,32,174,1376,126,C.surface,C.border,10)+ltx(`chart-meta-${model.id}`,52,192,zh(model.filter),14,C.text,700)+ltx(`chart-meta-${model.id}`,52,226,zh(model.axis),13,C.muted,600)+ltx(`chart-meta-${model.id}`,52,258,zh(model.legend),13,C.muted,600);
  b+=box(`chart-area-${model.id}`,32,320,1376,330,"#FBFCFD",C.border,10,`data-chart-kind="${model.kind}"`)+chartMarks(model);
  b+=box(`table-area-${model.id}`,32,678,1376,314,C.surface,C.border,10)+ltx(`table-area-${model.id}`,52,690,"等价数据表",14,C.text,800)+chartTable(model);
  return svg(1440,1024,`图表 ${model.id.slice(3,5)} · ${model.title}`,b,`data-record-count="${model.records.length}" data-chart-id="${model.id}" data-visible-language="zh-CN"`);
}
for(const model of models.charts)add(`${model.id}.svg`,"chart",model.surface,"shared-structured-model-v1.4",chartBoard(model),["visual-table-model-bidirectional-equality","complete-simplified-chinese","computed-text-container-bounds"]);

function components(){
  let b=header("24 组件与状态规范","状态胶囊文字按真实字体包围盒垂直居中；按钮触控区不小于 44px。","mixed");
  const states=[["未就绪",C.softWarn,C.warning],["证据不足",C.softDanger,C.danger],["待确认",C.softInfo,C.info],["已核验",C.softAction,C.action]];
  states.forEach((s,i)=>{const x=52+i*330; b+=box(`state-pill-${i}`,x,208,292,36,s[1],s[2],18,`data-pill="true"`)+`<text x="${x+146}" y="226" font-size="13" fill="${s[2]}" font-weight="750" text-anchor="middle" dominant-baseline="middle" data-layout-text="true" data-container-ref="state-pill-${i}" data-pill-label="true">${s[0]}</text>`});
  b+=box("component-dialog",320,330,800,430,C.surface,C.border,12)+ltx("component-dialog",352,362,"确认删除个人记录？",24,C.text,800)+ltx("component-dialog",352,414,"此操作需要再次确认；当前只展示设计状态，不执行删除。",16,C.text,600);
  b+=box("component-note",352,476,736,102,C.softWarn,C.warning,8)+ltx("component-note",372,498,"影响：演示记录、路线草稿与导出历史将被移除。",15,C.warning,700)+ltx("component-note",372,534,"账号 A 与账号 B 仍保持零可见性。",14,C.warning,600);
  b+=box("cancel-button",646,640,190,48,C.surface,C.border,8,`data-button-id="cancel" data-touch-rect="true"`)+ltx("cancel-button",741,655,"取消",16,C.text,750,"middle");
  b+=box("confirm-button",858,640,230,48,C.danger,C.danger,8,`data-button-id="confirm" data-touch-rect="true"`)+ltx("confirm-button",973,655,"确认删除",16,"#FFFFFF",750,"middle");
  return svg(1440,1024,"组件与状态规范",b,`data-pill-count="4"`);
}
add("24-components-states.svg","standard","mixed","redrawn-v1.4",components(),["pill-labels-vertically-centered","actual-buttons-at-least-44"]);

const zoomContent=[
  ["title","个人证据确认"],["body","同一内容在浏览器 200% 下完整保留并单列回流。"],["helper","状态、错误和操作结果会由读屏礼貌播报。"],["notice-title","演示数据 · 用户提供"],["notice-body","未经授权不保存、不外发。"],["button","继续确认"]
];
function zoom200(){
  let b=header("28 浏览器 200% 回流证据","同一内容集合；720 CSS 像素视口在 200% 下等效为 360 CSS 像素并以 720 物理像素渲染。","private");
  b+=box("zoom-base-panel",32,186,656,784,C.surface,C.border,8,`data-css-viewport="720" data-physical-width="720"`)+ltx("zoom-base-panel",52,204,"100% 基准 · CSS视口720",14,C.muted,700);
  b+=box("zoom-base-card",52,250,616,560,C.surface,C.border,8,`stroke-width="1" data-token-padding="16" data-token-gap="16"`);
  b+=ltx("zoom-base-card",68,272,zoomContent[0][1],24,C.text,800,"start",`data-content-key="title" data-token="title"`);
  b+=ltx("zoom-base-card",68,326,zoomContent[1][1],16,C.text,600,"start",`data-content-key="body" data-token="body"`);
  b+=ltx("zoom-base-card",68,370,zoomContent[2][1],14,C.muted,550,"start",`data-content-key="helper" data-token="helper"`);
  b+=box("zoom-base-notice",68,420,584,104,C.softWarn,C.warning,8)+ltx("zoom-base-notice",84,438,zoomContent[3][1],16,C.warning,750,"start",`data-content-key="notice-title"`)+ltx("zoom-base-notice",84,476,zoomContent[4][1],14,C.warning,600,"start",`data-content-key="notice-body"`);
  b+=box("zoom-base-button",68,558,240,44,C.action,C.action,8,`data-token="control"`)+ltx("zoom-base-button",188,571,zoomContent[5][1],16,"#FFFFFF",750,"middle",`data-content-key="button"`);
  b+=box("zoom-200-panel",720,186,688,784,C.surface,C.border,16,`data-css-viewport="360" data-base-css-viewport="720" data-physical-width="720" data-physical-scale="2"`)+ltx("zoom-200-panel",752,204,"200% 回流 · 等效CSS视口360",28,C.muted,700);
  b+=box("zoom-200-card",752,270,624,650,C.surface,C.border,16,`stroke-width="2" data-token-padding="32" data-token-gap="32"`);
  b+=ltx("zoom-200-card",784,304,zoomContent[0][1],48,C.text,800,"start",`data-content-key="title" data-token="title"`);
  b+=ltx("zoom-200-card",784,386,"同一内容在浏览器 200% 下",32,C.text,600,"start",`data-content-key="body" data-content-part="1"`);
  b+=ltx("zoom-200-card",784,430,"完整保留并单列回流。",32,C.text,600,"start",`data-content-key="body" data-content-part="2"`);
  b+=ltx("zoom-200-card",784,490,"状态、错误和操作结果会由读屏",28,C.muted,550,"start",`data-content-key="helper" data-content-part="1"`);
  b+=ltx("zoom-200-card",784,530,"礼貌播报。",28,C.muted,550,"start",`data-content-key="helper" data-content-part="2"`);
  b+=box("zoom-200-notice",784,590,560,156,C.softWarn,C.warning,16,`stroke-width="2"`)+ltx("zoom-200-notice",816,616,zoomContent[3][1],32,C.warning,750,"start",`data-content-key="notice-title"`)+ltx("zoom-200-notice",816,674,zoomContent[4][1],28,C.warning,600,"start",`data-content-key="notice-body"`);
  b+=box("zoom-200-button",784,784,480,88,C.action,C.action,16,`stroke-width="2" data-token="control"`)+ltx("zoom-200-button",1024,808,zoomContent[5][1],32,"#FFFFFF",750,"middle",`data-content-key="button"`);
  b+=rect(68,840,16,16,C.info,C.info,2,`id="zoom-base-gap-a"`)+rect(100,840,16,16,C.info,C.info,2,`id="zoom-base-gap-b"`);
  b+=rect(784,880,32,32,C.action,C.action,4,`id="zoom-200-gap-a"`)+rect(848,880,32,32,C.action,C.action,4,`id="zoom-200-gap-b"`);
  b+=`<metadata id="zoom-token-contract" data-title="24:48" data-body="16:32" data-helper="14:28" data-control="44:88" data-padding="16:32" data-radius="8:16" data-border="1:2" data-gap="16:32"/>`;
  return svg(1440,1024,"浏览器 200% 回流证据",b,`data-browser-zoom="200" data-content-set="same"`);
}
add("28-accessibility-zoom-200.svg","responsive","private","redrawn-v1.4",zoom200(),["same-content-reflow","eight-token-groups-exactly-two-times","computed-text-container-bounds"]);

if(replacements.length!==21)throw new Error(`expected 21 replacements, got ${replacements.length}`);
const pngSize=(file)=>{const b=fs.readFileSync(file);return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)}};
const overlayAssets=[];
for(const asset of replacements){
  const svgPath=path.join(svgDir,asset.name),pngPath=path.join(pngDir,asset.name.replace(/\.svg$/,".png"));
  fs.writeFileSync(svgPath,asset.svgText,"utf8"); execFileSync("sips",["-s","format","png",svgPath,"--out",pngPath],{stdio:"ignore"}); const size=pngSize(pngPath);
  overlayAssets.push({name:asset.name,category:asset.category,surface:asset.surface,source:asset.source,outer_pixels:size,svg_path:`assets/${asset.name}`,png_path:`png/${path.basename(pngPath)}`,svg_sha256:sha256(svgPath),png_sha256:sha256(pngPath),machine_assertions:asset.assertions});
}
const overlay={schema_version:1,version:"1.4",generated_at:"2026-08-15T20:47:45+08:00",base_version:"1.3",replacement_count:21,truth_boundary:models.truth_boundary,assets:overlayAssets};
fs.writeFileSync(path.join(here,"overlay-manifest.json"),JSON.stringify(overlay,null,2)+"\n","utf8");
const byName=new Map(overlayAssets.map(a=>[a.name,a]));
const resolvedAssets=previousResolved.assets.map(asset=>{
  if(byName.has(asset.name)){const next=byName.get(asset.name);const baseSvg=path.resolve(previousRoot,asset.svg_path),basePng=path.resolve(previousRoot,asset.png_path);return {...next,resolution:"replaced-by-v1.4-overlay",base_svg_sha256:sha256(baseSvg),base_png_sha256:sha256(basePng)};}
  const svgPath=path.resolve(previousRoot,asset.svg_path),pngPath=path.resolve(previousRoot,asset.png_path);return {...asset,resolution:"reused-immutable-v1.3-resolved-by-sha",svg_path:path.relative(here,svgPath),png_path:path.relative(here,pngPath),svg_sha256:sha256(svgPath),png_sha256:sha256(pngPath)};
});
const resolved={schema_version:1,version:"1.4",generated_at:"2026-08-15T20:47:45+08:00",base_resolved_manifest:"../release-completeness-v1.3/resolved-manifest.json",base_resolved_manifest_sha256:sha256(path.join(previousRoot,"resolved-manifest.json")),overlay_manifest:"overlay-manifest.json",overlay_manifest_sha256:sha256(path.join(here,"overlay-manifest.json")),chart_model:"resolved-chart-models.json",chart_model_sha256:sha256(path.join(here,"resolved-chart-models.json")),count:resolvedAssets.length,replaced:21,reused:28,truth_boundary:models.truth_boundary,review_contract:{machine_validation:"self-verifiable",independent_visual_review:"pending-root-coordinator-round-5",downstream_route_authorized:false},assets:resolvedAssets};
fs.writeFileSync(path.join(here,"resolved-manifest.json"),JSON.stringify(resolved,null,2)+"\n","utf8");
console.log(JSON.stringify({status:"generated",version:"1.4",overlay_assets:21,resolved_assets:49,replaced:21,reused:28},null,2));
