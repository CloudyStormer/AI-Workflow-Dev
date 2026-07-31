# AI英语智能学习 - 技术架构设计
**版本**：v1.0 MVP
**日期**：2026-07-31
**架构师**：AI Architect

---

## 一、技术栈选型
| 层级 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| 前端框架 | React | 18.x | 成熟稳定，生态完善 |
| 前端语言 | TypeScript | 5.x | 类型安全 |
| 前端样式 | TailwindCSS | 3.x | 原子化CSS，开发效率高 |
| 前端组件 | shadcn/ui | latest | 轻量可定制组件，适合C端极简产品 |
| 前端状态 | Zustand | latest | 轻量状态管理，简单够用 |
| 前端请求 | React Query | latest | 请求缓存、自动重试 |
| 后端框架 | Express | 4.x | 轻量Node.js框架 |
| 后端语言 | TypeScript | 5.x | 前后端同语言 |
| ORM | Prisma | latest | 类型安全的ORM，支持多数据库 |
| 数据库 | SQLite | 3.x | MVP阶段单文件数据库，零配置，后续可无缝迁移PostgreSQL |
| AI能力 | 豆包大模型API | latest | 对话、改错、生成例句 |
| 语音能力 | Web Speech API | 浏览器原生 | MVP阶段先用，后续可替换第三方ASR |
| 部署 | Docker Compose | latest | 一键部署 |

---

## 二、系统架构图
```
┌─────────────────────────────────────────┐
│              前端（React）              │
│  ┌───────┐  ┌───────┐  ┌─────────────┐  │
│  │ 首页  │  │ 单词  │  │ 口语对话     │  │
│  └───────┘  └───────┘  └─────────────┘  │
│  ┌───────┐  ┌───────┐                   │
│  │ 我的  │  │ 设置  │                   │
│  └───────┘  └───────┘                   │
└───────────────────┬─────────────────────┘
                    │ HTTP / SSE
┌───────────────────▼─────────────────────┐
│              后端（Express）            │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ 用户模块 │  │ 单词模块 │  │ 口语模块│ │
│  └──────────┘  └──────────┘  └────────┘ │
│  ┌──────────┐  ┌──────────┐             │
│  │ AI服务   │  │ 记忆算法 │             │
│  └──────────┘  └──────────┘             │
└───────────────────┬─────────────────────┘
                    │
┌───────────────────▼─────────────────────┐
│              SQLite 数据库              │
│  用户表、单词表、学习记录表、对话记录表  │
└─────────────────────────────────────────┘
```

---

## 三、数据库设计
### 1. users 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | 昵称，默认"学习者" |
| avatar | TEXT | 头像URL |
| goal | TEXT | 学习目标：work/exam/daily/kid |
| level | TEXT | 水平：beginner/intermediate/advanced |
| dark_mode | BOOLEAN | 是否深色模式 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 2. words 单词表（预置词库）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| word | TEXT | 单词 |
| phonetic | TEXT | 音标 |
| meaning | TEXT | 中文意思 |
| examples | TEXT | 例句JSON数组 |
| synonyms | TEXT | 同义词JSON数组 |
| tags | TEXT | 标签：cet4/cet6/ielts/work/daily |
| frequency | INTEGER | 词频，越高越常用 |

### 3. user_words 用户单词关联表（记忆算法核心）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户ID，外键 |
| word_id | INTEGER | 单词ID，外键 |
| proficiency | INTEGER | 熟练度0-100 |
| next_review | DATETIME | 下次复习时间 |
| last_review | DATETIME | 上次复习时间 |
| review_count | INTEGER | 复习次数 |
| is_favorite | BOOLEAN | 是否收藏 |
| is_known | BOOLEAN | 是否认识 |
| created_at | DATETIME | 创建时间 |

### 4. conversations 对话记录表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户ID，外键 |
| scene | TEXT | 场景：free/interview/restaurant/... |
| scene_name | TEXT | 场景中文名 |
| duration | INTEGER | 对话时长（秒） |
| summary | TEXT | 对话总结JSON（错误、建议、新词） |
| created_at | DATETIME | 创建时间 |
| ended_at | DATETIME | 结束时间 |

### 5. messages 消息表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| conversation_id | INTEGER | 对话ID，外键 |
| role | TEXT | 角色：user/assistant |
| content | TEXT | 消息内容 |
| tips | TEXT | AI提示JSON（语法错误、用词建议） |
| created_at | DATETIME | 创建时间 |

### 6. daily_stats 每日学习统计表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户ID，外键 |
| date | DATE | 日期 |
| words_learned | INTEGER | 新学单词数 |
| words_reviewed | INTEGER | 复习单词数 |
| talk_duration | INTEGER | 口语练习时长（秒） |
| created_at | DATETIME | 创建时间 |

---

## 四、API接口设计
### 基础约定
- 接口前缀：`/api`
- 请求格式：JSON
- 响应格式：`{ code: 0, data: {}, msg: "success" }`
- 流式响应：SSE格式，用于对话接口

### 用户相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/user/init | 初始化用户（游客模式，自动生成用户ID） |
| GET | /api/user/info | 获取用户信息 |
| PUT | /api/user/info | 更新用户信息/设置 |

### 单词相关
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/words/today | 获取今日要学+要复习的单词列表 |
| POST | /api/words/review | 提交单词复习结果（认识/不认识） |
| POST | /api/words/check | 填空模式检查答案（支持同义词判断） |
| GET | /api/words/favorites | 获取收藏的单词列表 |
| POST | /api/words/favorite | 收藏/取消收藏单词 |
| GET | /api/words/mistakes | 获取错词列表 |

### 口语相关
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/scenes | 获取场景列表 |
| POST | /api/chat/start | 开始新对话，选择场景 |
| POST | /api/chat/send | 发送消息，返回AI回复（支持SSE流式） |
| GET | /api/chat/history/:id | 获取对话历史 |
| POST | /api/chat/end/:id | 结束对话，返回总结反馈 |

### 统计相关
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/stats/summary | 获取总统计数据 |
| GET | /api/stats/daily | 获取每日统计 |

---

## 五、项目目录结构
```
projects/ai-english-learning/
├── docs/                     # 项目文档
│   ├── 00-project-plan.md    # 项目计划书
│   ├── 01-prd.md             # 产品需求文档
│   └── 02-architecture.md    # 架构设计文档
├── frontend/                 # 前端React项目
│   ├── src/
│   │   ├── pages/            # 页面
│   │   │   ├── Home.tsx      # 首页
│   │   │   ├── Word.tsx      # 背单词页
│   │   │   ├── Chat.tsx      # 口语对话页
│   │   │   └── Profile.tsx   # 个人中心
│   │   ├── components/       # 公共组件
│   │   ├── store/            # Zustand状态
│   │   ├── api/              # 接口请求
│   │   ├── hooks/            # 自定义hooks
│   │   └── lib/              # 工具函数
│   ├── public/               # 静态资源
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/                  # 后端Express项目
│   ├── src/
│   │   ├── routes/           # 路由
│   │   ├── controllers/      # 控制器
│   │   ├── services/         # 业务逻辑
│   │   │   ├── ai.ts         # AI大模型服务
│   │   │   └── memory.ts     # 艾宾浩斯记忆算法
│   │   ├── prisma/           # Prisma schema
│   │   └── db/               # 数据库初始化、预置词库
│   ├── package.json
│   └── tsconfig.json
├── docker/                   # Docker部署
│   └── docker-compose.yml
└── output/                   # 构建产物
```

---

## 六、核心算法说明
### 艾宾浩斯记忆算法
- 初始熟练度：0
- 认识：熟练度+20，复习间隔按1天→2天→4天→7天→15天→30天递增
- 不认识：熟练度-10，复习间隔重置为10分钟后
- 熟练度100：视为掌握，30天后再复习一次

### 口语智能纠错Prompt逻辑
1. 先理解用户想表达的意思，即使有语法错误、中式英语、中英混杂
2. 先正常回应用户的内容，不打断对话
3. 再温柔指出问题，说明正确说法，不说"你错了"
4. 分场景给出更地道的表达建议
