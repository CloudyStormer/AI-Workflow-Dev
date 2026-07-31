# AI Workflow Control Center

AI 工作流学习与验证项目的可视化控制中心。第一版用于验证信息架构和视觉表达，当前项目、阶段、角色、缺陷与成熟度仍是演示数据，不是实时事实源。

在接入 `workflow/state.yaml`、`approvals.yaml`、`artifacts.yaml` 与事件流以前，界面不得宣称状态已实时同步。

## 统一结构

本项目已由 `workflow-project-init` 收编，和两个 `projects/` 项目共享 `project.yaml`、`workflow/`、项目级 `skills/`、`docs/`、`scripts/`、`tests/` 与 `output/` 治理外壳。

实现采用 `sites-fullstack` Profile，因此保留 Sites 所需的根目录 `app/`、`db/`、`worker/`、`public/` 与 `.openai/`。它不会为了表面一致被搬进 `frontend/`；真正统一的是治理契约和项目 Skill，不是技术入口的文件夹名字。

## Prerequisites

- Node.js `>=22.13.0`

## 本地运行

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## 当前实现

- 界面代码位于 `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## 已知边界

- 6 个导航入口尚未形成独立页面。
- 缺陷状态只保存在 React 内存，刷新后恢复。
- 数据库 Schema 为空，所有管理数据尚未持久化。
- 当前测试只覆盖服务端渲染和基础响应式标记。
- 下一版图表化设计必须先通过齐总对 UI/UX 设计提示词的审核。

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
