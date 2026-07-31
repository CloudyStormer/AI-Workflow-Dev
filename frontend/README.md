# AI English Learning 前端

基于 React、TypeScript、Vite 和 Tailwind CSS 的 AI 英语学习前端。

## 环境要求

- Node.js 22.12.0 或更高版本
- npm 10.9.0 或兼容版本

项目提供了 `.nvmrc`。使用 nvm 时先执行：

```bash
nvm use
```

如果本机尚未安装对应版本：

```bash
nvm install
nvm use
```

## 安装与运行

```bash
npm install
npm run dev
```

开发服务启动后，访问终端显示的本地地址。

## 质量检查与构建

```bash
npm run lint
npm run build
```

## 常见启动问题

### `node:util` 没有导出 `styleText`

当前 Node.js 版本过低。执行 `node --version`，确认版本不低于
`22.12.0`，然后重新安装依赖。

### PostCSS 提示不能直接使用 `tailwindcss`

Tailwind CSS 4 必须通过 `@tailwindcss/postcss` 接入。确认依赖已安装，
并重新执行 `npm install`。
