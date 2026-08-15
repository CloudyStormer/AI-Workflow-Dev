import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let filtering;
let vite;

before(async () => {
  vite = await createServer({
    appType: "custom",
    configFile: false,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  filtering = await vite.ssrLoadModule("/app/dashboard-filtering.ts");
});

after(async () => {
  await vite?.close();
});

const defaults = {
  project: "all",
  range: "current-iteration",
  iteration: "mvp-v1",
  source: "all",
};

test("搜索范围服从项目、来源和覆盖边界", () => {
  const allItems = filtering.getDashboardSearchItems(defaults);
  assert(allItems.some((item) => item.id === "project-ai-english-learning"));
  assert(allItems.some((item) => item.type === "角色"));
  assert(allItems.some((item) => item.type === "缺陷"));

  const modelItems = filtering.getDashboardSearchItems({ ...defaults, project: "ai-model-radar" });
  assert.deepEqual(modelItems.map((item) => item.id), ["project-ai-model-radar"]);

  const englishItems = filtering.getDashboardSearchItems({ ...defaults, project: "ai-english-learning" });
  assert(englishItems.some((item) => item.id === "project-ai-english-learning"));
  assert(englishItems.some((item) => item.type === "缺陷"));
  assert(englishItems.some((item) => item.type === "发布"));
  assert(!englishItems.some((item) => item.type === "角色" || item.type === "治理"));

  for (const filters of [
    { ...defaults, source: "pending" },
    { ...defaults, range: "7d" },
    { ...defaults, iteration: "workflow-v03" },
  ]) {
    assert.deepEqual(filtering.getDashboardSearchItems(filters), []);
  }
});

test("导出范围只返回当前视图可证明的筛选内项目", () => {
  const allScope = filtering.getDashboardExportScope("overview", defaults);
  assert.equal(allScope.available, true);
  assert.equal(allScope.projects.length, 4);

  const modelScope = filtering.getDashboardExportScope("overview", { ...defaults, project: "ai-model-radar" });
  assert.equal(modelScope.available, true);
  assert.deepEqual(modelScope.projects.map((project) => project.id), ["ai-model-radar"]);

  const pendingScope = filtering.getDashboardExportScope("overview", { ...defaults, source: "pending" });
  assert.equal(pendingScope.available, false);
  assert.match(pendingScope.title, /待接入来源/);

  const unsupportedProjectScope = filtering.getDashboardExportScope("quality", { ...defaults, project: "ai-model-radar" });
  assert.equal(unsupportedProjectScope.available, false);
  assert.match(unsupportedProjectScope.title, /当前项目没有该类演示明细/);
});

test("English 单项目在总览与发布视图使用同一演示发布覆盖", () => {
  const english = { ...defaults, project: "ai-english-learning" };
  assert.equal(filtering.getViewFilterAvailability("overview", english).available, true);
  assert.equal(filtering.getViewFilterAvailability("releases", english).available, true);
  assert.deepEqual(filtering.getScopedProjects(english).map((project) => project.id), ["ai-english-learning"]);
});
