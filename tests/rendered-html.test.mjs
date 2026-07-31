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
  assert.match(html, /摸清、走通、验证一套真正可复用的 AI 软件工程工作流/);
  assert.match(html, /角色协作与当前入场顺序/);
  assert.match(html, /缺陷、修复与复测/);
  assert.match(html, /齐总/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("removes starter-only assets and keeps the finished product responsive", async () => {
  const [page, dashboard, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/Dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /import Dashboard from "\.\/Dashboard"/);
  assert.match(dashboard, /"use client"/);
  assert.match(dashboard, /aria-label="主导航"/);
  assert.match(layout, /title:\s*"AI Workflow Control Center"/);
  assert.match(layout, /<html lang="zh-CN">/);
  assert.match(css, /@media \(max-width: 850px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton|site-creator-vinext-starter/);

  await assert.rejects(
    access(new URL("../app/_sites-preview", import.meta.url)),
  );
});
