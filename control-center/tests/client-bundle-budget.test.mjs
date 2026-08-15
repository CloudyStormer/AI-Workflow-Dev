import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const MANIFEST_URL = new URL("../dist/client/.vite/manifest.json", import.meta.url);
const CLIENT_URL = new URL("../dist/client/", import.meta.url);
const VIEW_SOURCES = [
  "app/views/overview-view.tsx",
  "app/views/projects-view.tsx",
  "app/views/roles-view.tsx",
  "app/views/quality-view.tsx",
  "app/views/releases-view.tsx",
  "app/views/governance-view.tsx",
];

async function loadManifest() {
  return JSON.parse(await readFile(MANIFEST_URL, "utf8"));
}

async function fileSize(file) {
  return (await stat(new URL(file, CLIENT_URL))).size;
}

test("keeps every emitted client JavaScript chunk below the 500 kB warning boundary", async () => {
  const manifest = await loadManifest();
  const files = [...new Set(Object.values(manifest).map((entry) => entry.file).filter((file) => file.endsWith(".js")))];
  const sizes = await Promise.all(files.map(async (file) => [file, await fileSize(file)]));
  const oversized = sizes.filter(([, size]) => size > 500_000);
  assert.deepEqual(oversized, [], `发现超过 500 kB 的客户端块：${JSON.stringify(oversized)}`);
});

test("emits six independently lazy-loaded first-level view modules", async () => {
  const manifest = await loadManifest();
  const dashboard = manifest["app/Dashboard.tsx"];
  assert.ok(dashboard, "缺少 Dashboard 客户端入口");

  for (const source of VIEW_SOURCES) {
    const entry = manifest[source];
    assert.ok(entry, `缺少视图动态入口：${source}`);
    assert.equal(entry.isDynamicEntry, true, `${source} 必须是动态入口`);
    assert.ok(dashboard.dynamicImports?.includes(source), `Dashboard 必须按需导入 ${source}`);
  }

  const dashboardSize = await fileSize(dashboard.file);
  assert.ok(dashboardSize <= 180_000, `Dashboard 壳块 ${dashboardSize}B 超过 180 kB 预算`);
});
