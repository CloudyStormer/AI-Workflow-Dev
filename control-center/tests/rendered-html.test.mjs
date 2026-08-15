import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the AI workflow control center", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>AI Workflow Control Center<\/title>/i);
  assert.match(html, /AI 工作流实验与验证平台/);
  assert.match(html, /演示数据 · 非实时 · 待接入真实工作流状态源/);
  assert.match(html, /正在恢复页面与筛选条件/);
  assert.match(html, /全部项目/);
  assert.match(html, /恢复默认筛选/);
  assert.match(html, /超级无敌帅超超总/);
  for (const label of ["总览", "项目与阶段", "角色协作", "质量与复测", "迭代与发布", "成熟度与治理"]) {
    assert.match(html, new RegExp(label));
  }
  assert.doesNotMatch(html, /上下文已同步|系统运行中|实时同步/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("keeps the approved information architecture, data contract, and responsive shell", async () => {
  const [page, dashboard, viewLoader, shared, overview, projects, rolesView, quality, releases, governance, data, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/Dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard-views.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard-view-shared.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/views/overview-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/views/projects-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/views/roles-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/views/quality-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/views/releases-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/views/governance-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /import Dashboard from "\.\/Dashboard"/);
  assert.match(dashboard, /"use client"/);
  assert.match(dashboard, /aria-label="主导航"/);
  assert.match(dashboard, /aria-label="移动端主导航"/);
  assert.match(dashboard, /<dialog/);
  assert.match(viewLoader, /lazy\(\(\) => import\("\.\/views\/overview-view"\)\)/);
  for (const [source, view] of [[overview, "overview"], [projects, "projects"], [rolesView, "roles"], [quality, "quality"], [releases, "releases"], [governance, "governance"]]) {
    assert.match(source, new RegExp(`data-view="${view}"`));
  }
  assert.match(shared, /<table className="stage-matrix-grid">/);
  assert.doesNotMatch(shared, /role="grid"/);
  assert.match(rolesView, /<ul className="role-lanes"/);
  assert.match(rolesView, /aria-pressed=\{selected\}/);
  assert.doesNotMatch(rolesView, /role="listitem"/);
  assert.match(quality, /本版本不支持状态流转/);
  assert.doesNotMatch(quality, /模拟操作已记录|确认模拟/);
  assert.match(governance, /state-preview-action/);
  assert.doesNotMatch(governance, /<button type="button">清除筛选<\/button>/);
  assert.match(layout, /title:\s*"AI Workflow Control Center"/);
  assert.match(layout, /<html lang="zh-CN">/);
  assert.match(css, /@media \(max-width: 1200px\)/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /@media \(max-width: 420px\)/);
  assert.match(css, /\.mobile-bottom-nav/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(packageJson, /@phosphor-icons\/react/);
  assert.match(packageJson, /recharts/);
  assert.match(packageJson, /test:browser/);
  assert.match(packageJson, /test:performance/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton|site-creator-vinext-starter/);

  const stages = ["市场调研", "项目初始化", "产品定义", "UI/UX", "架构设计", "任务与验收拆解", "小批量开发", "持续代码审查", "测试、Bug 与复测", "发布与回滚", "验收、迭代与复盘"];
  const roles = ["市场调研员", "项目经理", "产品经理", "UI/UX 设计师", "架构师", "前端工程师", "后端工程师", "数据工程师", "代码审查员", "QA", "DevOps"];
  for (const label of [...stages, ...roles]) assert.match(data, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const maturityBlock = data.slice(data.indexOf("export const MATURITY ="), data.indexOf("export const MATURITY_TREND"));
  const maturityScores = [...maturityBlock.matchAll(/score:\s*(\d+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(maturityScores, [90, 62, 55, 18, 12, 15]);
  assert.equal(Math.round(maturityScores.reduce((sum, score) => sum + score, 0) / maturityScores.length), 42);

  const issueBlock = data.slice(data.indexOf("export const ISSUES ="), data.indexOf("export const DEFECT_STACK"));
  assert.equal((issueBlock.match(/severity:\s*"Blocker"/g) ?? []).length, 1);
  assert.equal((issueBlock.match(/severity:\s*"Major"/g) ?? []).length, 3);
  assert.equal((issueBlock.match(/severity:\s*"Minor"/g) ?? []).length, 1);

  await assert.rejects(
    access(new URL("../app/_sites-preview", import.meta.url)),
  );
});

test("preserves the existing Sites/Vinext hosting contract without adding a backend", async () => {
  const [sourceHosting, builtHosting] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../dist/.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  const source = JSON.parse(sourceHosting);
  const built = JSON.parse(builtHosting);
  assert.deepEqual(built, source);
  assert.equal(source.project_id, "appgprj_6a6c6ecb689081919f99b5f98f84821e");
  assert.equal(source.d1, null);
  assert.equal(source.r2, null);
  await access(new URL("../dist/server/index.js", import.meta.url));
});
