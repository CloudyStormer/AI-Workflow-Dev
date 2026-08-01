# AI英语智能学习 - 系统架构图

## 一、产品整体架构

```mermaid
flowchart TB
    subgraph 客户端层 [客户端层 - 多端支持]
        PC[PC Web端<br/>React + TypeScript]
        H5[移动端H5<br/>响应式适配]
        direction TB
    end

    subgraph 接入层 [接入层]
        Nginx[Nginx反向代理<br/>HTTPS + 静态资源]
        Gateway[API网关<br/>鉴权 + 限流 + 日志]
    end

    subgraph 应用服务层 [应用服务层 - Node.js]
        User[用户服务<br/>注册/登录/个人信息]
        Learn[学习服务<br/>单词/任务/进度]
        Speak[口语服务<br/>对话/发音/评分]
        AI[AI能力服务<br/>Prompt编排/上下文管理]
        Stat[统计服务<br/>数据/成就/报告]
    end

    subgraph AI能力层 [AI大模型能力层]
        LLM[豆包/GPT大模型<br/>对话/生成/批改]
        ASR[语音识别ASR<br/>Whisper/豆包语音]
        TTS[语音合成TTS<br/>标准发音/多音色]
        Pron[发音评分引擎<br/>音素级评估]
    end

    subgraph 数据层 [数据层]
        DB[(SQLite/PostgreSQL<br/>业务数据)]
        Redis[(Redis缓存<br/>会话/热点数据)]
        Vector[(向量数据库<br/>词向量/对话记忆)]
        OSS[对象存储<br/>音频/用户文件]
    end

    PC --> Nginx
    H5 --> Nginx
    Nginx --> Gateway
    Gateway --> User & Learn & Speak & AI & Stat

    User --> DB
    Learn --> DB & Redis
    Speak --> AI & ASR & TTS & Pron
    AI --> LLM & Vector
    Stat --> DB & Redis
```

---

## 二、核心业务模块架构

```mermaid
flowchart LR
    subgraph 单词学习模块
        W1[词库管理]
        W2[艾宾浩斯记忆引擎]
        W3[AI例句生成]
        W4[单词熟练度计算]
        W5[复习调度器]
    end

    subgraph 口语陪练模块
        S1[场景管理]
        S2[多轮对话引擎]
        S3[实时语音流转]
        S4[发音纠错引擎]
        S5[对话反馈生成]
    end

    subgraph 个性化引擎
        P1[水平评估算法]
        P2[学习路径推荐]
        P3[薄弱点分析]
        P4[动态难度调整]
        P5[今日任务生成]
    end

    W2 --> W4
    W4 --> W5
    W3 --> W1
    S2 --> S3 & S5
    S3 --> S4
    P1 --> P2 & P4
    P2 --> P5
    P3 --> P5
```

---

## 三、口语陪练核心流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant FE as 前端
    participant BE as 后端服务
    participant ASR as 语音识别
    participant LLM as 大模型
    participant TTS as 语音合成
    participant Pron as 发音评分

    User->>FE: 选择场景开始对话
    FE->>BE: 创建对话会话
    BE->>LLM: 生成开场白Prompt
    LLM-->>BE: 开场白文本
    BE->>TTS: 合成AI语音
    TTS-->>BE: 音频文件
    BE-->>FE: 返回AI语音+文本
    FE-->>User: 播放AI语音

    User->>FE: 语音回答
    FE->>BE: 上传用户语音
    par 并行处理
        BE->>ASR: 语音转文字
        BE->>Pron: 发音评分
    end
    ASR-->>BE: 用户说的文本
    Pron-->>BE: 发音分数和问题
    BE->>LLM: 发送对话历史+用户文本
    LLM-->>BE: AI回复文本+语法批改
    BE->>TTS: 合成回复语音
    TTS-->>BE: 回复音频
    BE-->>FE: 返回AI回复+发音分+语法建议
    FE-->>User: 播放语音+显示反馈

    Note over User,BE: 对话结束后生成完整学习报告
```

---

## 四、前端页面架构

```mermaid
flowchart TB
    App[App入口]
    App --> Router[路由管理]

    Router --> Login[登录/注册页]
    Router --> Onboarding[新手引导/水平测试]
    Router --> Home[首页/今日任务]

    Home --> Word[单词学习页]
    Home --> Speak[口语练习入口]
    Home --> Stats[学习统计]
    Home --> Profile[个人中心]

    Speak --> SceneSelect[场景选择]
    Speak --> ChatRoom[对话房间页]
    Speak --> SpeakReport[口语报告页]
    Speak --> FreeChat[自由对话]

    Word --> WordStudy[单词学习卡片]
    Word --> WordReview[单词复习]
    Word --> WordBook[单词本]

    Stats --> Overview[数据概览]
    Stats --> Achievement[成就徽章]

    Profile --> Setting[设置]
    Profile --> Goal[学习目标设置]
```

---

## 五、技术栈选型

| 层级 | 技术选型 | 选型理由 |
|------|----------|----------|
| **前端框架** | React 18 + TypeScript | 生态成熟，多端适配好，类型安全 |
| **UI组件** | TailwindCSS + shadcn/ui | 开发快，设计现代，可定制性强 |
| **状态管理** | Zustand + React Query | 轻量，服务端状态管理优秀 |
| **后端框架** | Express.js + TypeScript | 简单灵活，MVP开发快 |
| **数据库** | SQLite (MVP) → PostgreSQL | 零依赖，后续可无缝升级 |
| **缓存** | Redis (可选) | 会话缓存、热点数据 |
| **大模型** | 豆包API / OpenAI API | 中文支持好，能力强 |
| **语音识别** | 豆包ASR / Whisper | 中文英语识别准确率高 |
| **语音合成** | 豆包TTS / Edge TTS | 发音自然，成本低 |
| **部署** | Docker Compose | 一键部署，环境一致 |
