import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import {
  access,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { createServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VINEXT_CLI = join(PROJECT_ROOT, "node_modules", "vinext", "dist", "cli.js");
const DEFAULT_FILTERS = {
  project: "all",
  range: "current-iteration",
  iteration: "mvp-v1",
  source: "all",
};
const VIEW_IDS = ["overview", "projects", "roles", "quality", "releases", "governance"];
const VIEWPORTS = [
  { width: 1440, height: 1000, mobile: false },
  { width: 1024, height: 768, mobile: false },
  { width: 390, height: 844, mobile: true },
  { width: 320, height: 720, mobile: true },
];

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function trimLog(value, limit = 12_000) {
  return value.length > limit ? value.slice(-limit) : value;
}

async function isExecutable(path) {
  if (!path) return false;
  try {
    await access(path, process.platform === "win32" ? fsConstants.F_OK : fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findChrome() {
  const override = process.env.CHROME_PATH?.trim();
  if (override) {
    const absoluteOverride = resolve(override);
    if (await isExecutable(absoluteOverride)) return absoluteOverride;
    throw new Error(`CHROME_PATH 指向的浏览器不可执行：${absoluteOverride}`);
  }

  const platformCandidates = process.platform === "darwin"
    ? [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        join(homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      ]
    : process.platform === "win32"
      ? [
          process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
          process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
          process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
          process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
          process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
        ].filter(Boolean)
      : [
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          "/snap/bin/chromium",
          "/usr/bin/microsoft-edge",
          "/usr/bin/microsoft-edge-stable",
        ];

  const pathNames = process.platform === "win32"
    ? ["chrome.exe", "msedge.exe"]
    : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "microsoft-edge-stable"];
  const pathCandidates = (process.env.PATH ?? "")
    .split(process.platform === "win32" ? ";" : ":")
    .flatMap((directory) => pathNames.map((name) => join(directory, name)));
  const candidates = [...platformCandidates, ...pathCandidates];

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) return candidate;
  }

  throw new Error(
    `未找到可执行的 Chrome/Chromium。请安装 Chrome，或通过 CHROME_PATH 指定路径。已检查：${candidates.join(", ")}`,
  );
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  assert(address && typeof address === "object", "无法取得随机测试端口");
  const { port } = address;
  await new Promise((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise()));
  return port;
}

async function waitForExit(child, timeout = 5_000) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return Promise.race([
    new Promise((resolvePromise) => child.once("exit", () => resolvePromise(true))),
    sleep(timeout).then(() => false),
  ]);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  if (await waitForExit(child)) return;
  child.kill("SIGKILL");
  await waitForExit(child, 2_000);
}

async function waitForHttp(url, child, getLogs, timeout = 45_000) {
  const deadline = Date.now() + timeout;
  let lastError = "尚未收到响应";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Control Center 测试服务提前退出（code=${child.exitCode}）\n${getLogs()}`);
    }
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 200 && response.status < 400) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(120);
  }
  throw new Error(`等待 Control Center 测试服务超时：${lastError}\n${getLogs()}`);
}

async function waitForFile(path, child, getLogs, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Chrome 提前退出（code=${child.exitCode}）\n${getLogs()}`);
    }
    try {
      return await readFile(path, "utf8");
    } catch {
      await sleep(80);
    }
  }
  throw new Error(`等待 Chrome DevToolsActivePort 超时\n${getLogs()}`);
}

class CdpConnection {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.closed = false;

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8"));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result ?? {});
        return;
      }
      const listeners = this.listeners.get(message.method) ?? [];
      for (const listener of listeners) listener(message.params ?? {}, message.sessionId);
    });

    socket.addEventListener("close", () => {
      this.closed = true;
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error(`CDP 连接已关闭：${pending.method}`));
      }
      this.pending.clear();
    });
  }

  static async connect(url) {
    if (typeof WebSocket !== "function") {
      throw new Error("当前 Node.js 未提供内置 WebSocket；需要项目声明的 Node.js 22.13+ 运行时");
    }
    const socket = new WebSocket(url);
    await new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error("连接 Chrome DevTools 超时")), 15_000);
      socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolvePromise();
      }, { once: true });
      socket.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("无法连接 Chrome DevTools WebSocket"));
      }, { once: true });
    });
    return new CdpConnection(socket);
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}, sessionId) {
    if (this.closed) return Promise.reject(new Error(`CDP 连接已关闭：${method}`));
    const id = this.nextId++;
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP 命令超时：${method}`));
      }, 20_000);
      this.pending.set(id, { method, resolve: resolvePromise, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  async close(timeout = 2_000) {
    if (this.closed || this.socket.readyState === WebSocket.CLOSED) {
      this.closed = true;
      return;
    }
    await new Promise((resolvePromise) => {
      const finish = () => {
        clearTimeout(timer);
        this.closed = true;
        resolvePromise();
      };
      const timer = setTimeout(finish, timeout);
      this.socket.addEventListener("close", finish, { once: true });
      this.socket.close();
    });
  }
}

class BrowserPage {
  constructor(connection, sessionId, origin) {
    this.connection = connection;
    this.sessionId = sessionId;
    this.origin = origin;
  }

  send(method, params = {}) {
    return this.connection.send(method, params, this.sessionId);
  }

  async evaluate(expression) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (response.exceptionDetails) {
      const description = response.exceptionDetails.exception?.description
        ?? response.exceptionDetails.text
        ?? "未知页面脚本异常";
      throw new Error(description);
    }
    return response.result?.value;
  }

  execute(fn, ...args) {
    return this.evaluate(`(${fn.toString()})(...${JSON.stringify(args)})`);
  }

  async waitFor(fn, args = [], label = "页面条件", timeout = 12_000) {
    const deadline = Date.now() + timeout;
    let lastError;
    while (Date.now() < deadline) {
      try {
        if (await this.execute(fn, ...args)) return;
      } catch (error) {
        lastError = error;
      }
      await sleep(70);
    }
    throw new Error(`等待${label}超时${lastError ? `：${lastError.message}` : ""}`);
  }

  waitForSelector(selector, timeout = 12_000) {
    return this.waitFor(
      (target) => Boolean(document.querySelector(target)),
      [selector],
      `选择器 ${selector}`,
      timeout,
    );
  }

  async navigate(path) {
    const url = new URL(path, this.origin).href;
    await this.send("Page.navigate", { url });
    await this.waitFor(
      () => document.readyState === "complete" && Boolean(document.querySelector("[data-filter-summary]")),
      [],
      `页面完成载入 ${url}`,
      20_000,
    );
    await this.waitFor(
      () => !document.querySelector(".view-loading"),
      [],
      `页面视图完成载入 ${url}`,
      20_000,
    );
  }

  async click(selector) {
    const clicked = await this.execute((target) => {
      const element = document.querySelector(target);
      if (!(element instanceof HTMLElement)) return false;
      element.click();
      return true;
    }, selector);
    assert.equal(clicked, true, `应能点击 ${selector}`);
  }

  async focus(selector) {
    const focused = await this.execute((target) => {
      const element = document.querySelector(target);
      if (!(element instanceof HTMLElement)) return false;
      element.focus();
      return document.activeElement === element;
    }, selector);
    assert.equal(focused, true, `应能聚焦 ${selector}`);
  }

  async setSelect(selector, value) {
    const result = await this.execute((target, nextValue) => {
      const select = document.querySelector(target);
      if (!(select instanceof HTMLSelectElement)) return { ok: false, reason: "missing" };
      if (![...select.options].some((option) => option.value === nextValue)) {
        return { ok: false, reason: "option", options: [...select.options].map((option) => option.value) };
      }
      select.value = nextValue;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true };
    }, selector, value);
    assert.equal(result.ok, true, `应能设置 ${selector}=${value}，实际 ${JSON.stringify(result)}`);
  }

  async setTextInput(selector, value) {
    const changed = await this.execute((target, nextValue) => {
      const input = document.querySelector(target);
      if (!(input instanceof HTMLInputElement)) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, nextValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }, selector, value);
    assert.equal(changed, true, `应能输入 ${selector}`);
  }

  async setLabeledSelect(rootSelector, labelText, value) {
    const result = await this.execute((root, text, nextValue) => {
      const container = document.querySelector(root);
      if (!container) return { ok: false, reason: "root" };
      const label = [...container.querySelectorAll("label")].find((item) => item.textContent?.includes(text));
      const select = label?.querySelector("select");
      if (!(select instanceof HTMLSelectElement)) return { ok: false, reason: "select" };
      if (![...select.options].some((option) => option.value === nextValue)) {
        return { ok: false, reason: "option", options: [...select.options].map((option) => option.value) };
      }
      select.value = nextValue;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true };
    }, rootSelector, labelText, value);
    assert.equal(result.ok, true, `应能设置“${labelText}”=${value}，实际 ${JSON.stringify(result)}`);
  }

  async press(key) {
    const keys = {
      Enter: { code: "Enter", virtualKeyCode: 13, text: "\r" },
      Escape: { code: "Escape", virtualKeyCode: 27 },
      Space: { code: "Space", virtualKeyCode: 32, text: " " },
    };
    const descriptor = keys[key];
    assert(descriptor, `未登记的测试按键：${key}`);
    await this.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code: descriptor.code,
      windowsVirtualKeyCode: descriptor.virtualKeyCode,
      nativeVirtualKeyCode: descriptor.virtualKeyCode,
      ...(descriptor.text ? { text: descriptor.text } : {}),
    });
    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code: descriptor.code,
      windowsVirtualKeyCode: descriptor.virtualKeyCode,
      nativeVirtualKeyCode: descriptor.virtualKeyCode,
    });
  }

  async setViewport({ width, height, mobile }) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
      screenWidth: width,
      screenHeight: height,
    });
  }
}

function recordBrowserProblems(connection, sessionId) {
  const problems = [];
  const stringifyArgument = (argument) => {
    if (Object.hasOwn(argument, "value")) {
      try {
        return typeof argument.value === "string" ? argument.value : JSON.stringify(argument.value);
      } catch {
        return String(argument.value);
      }
    }
    return argument.description ?? argument.type ?? "未知参数";
  };

  connection.on("Runtime.consoleAPICalled", (params, eventSessionId) => {
    if (eventSessionId !== sessionId || !["warning", "error", "assert"].includes(params.type)) return;
    problems.push(`console.${params.type}: ${(params.args ?? []).map(stringifyArgument).join(" ")}`);
  });
  connection.on("Runtime.exceptionThrown", (params, eventSessionId) => {
    if (eventSessionId !== sessionId) return;
    problems.push(`exception: ${params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text ?? "未知异常"}`);
  });
  connection.on("Log.entryAdded", (params, eventSessionId) => {
    if (eventSessionId !== sessionId || !["warning", "error"].includes(params.entry?.level)) return;
    problems.push(`log.${params.entry.level}: ${params.entry.text}`);
  });
  return problems;
}

async function createBrowserSession({ chromePath, profileDirectory, origin, captureChromeOutput, getChromeLogs }) {
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-features=Translate,MediaRouter,OptimizationHints",
    "--disable-gpu",
    "--disable-sync",
    "--metrics-recording-only",
    "--no-default-browser-check",
    "--no-first-run",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDirectory}`,
    "--window-size=1440,1000",
    "about:blank",
  ], {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  chrome.stdout.on("data", captureChromeOutput);
  chrome.stderr.on("data", captureChromeOutput);

  try {
    const activePortFile = join(profileDirectory, "DevToolsActivePort");
    const activePort = await waitForFile(activePortFile, chrome, getChromeLogs);
    const [portLine, browserPath] = activePort.trim().split(/\r?\n/);
    assert.match(portLine ?? "", /^\d+$/, "DevToolsActivePort 必须包含随机端口");
    assert(browserPath?.startsWith("/devtools/browser/"), "DevToolsActivePort 必须包含浏览器 WebSocket 路径");

    const connection = await CdpConnection.connect(`ws://127.0.0.1:${portLine}${browserPath}`);
    const { targetId } = await connection.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await connection.send("Target.attachToTarget", { targetId, flatten: true });
    await Promise.all([
      connection.send("Page.enable", {}, sessionId),
      connection.send("Runtime.enable", {}, sessionId),
      connection.send("Log.enable", {}, sessionId),
      connection.send("Accessibility.enable", {}, sessionId),
    ]);

    return {
      chrome,
      connection,
      page: new BrowserPage(connection, sessionId, origin),
      sessionId,
    };
  } catch (error) {
    await stopChild(chrome);
    throw error;
  }
}

async function assertGlobalFilterRecovery(page) {
  const restored = {
    project: "ai-english-learning",
    range: "7d",
    iteration: "workflow-v03",
    source: "demo",
  };
  await page.navigate(`/?view=projects&project=${restored.project}&range=${restored.range}&iteration=${restored.iteration}&source=${restored.source}`);
  const restoredState = await page.execute(() => ({
    filters: Object.fromEntries([...document.querySelectorAll("select[data-filter]")].map((select) => [select.dataset.filter, select.value])),
    params: Object.fromEntries(new URLSearchParams(location.search)),
    title: document.querySelector("#page-title")?.textContent?.trim(),
  }));
  assert.deepEqual(restoredState.filters, restored, "URL 中四类全局筛选应完整恢复到控件");
  assert.equal(restoredState.params.view, "projects");
  assert.deepEqual(
    Object.fromEntries(Object.keys(restored).map((key) => [key, restoredState.params[key]])),
    restored,
    "四类全局筛选应保留在 URL 中",
  );
  assert.equal(restoredState.title, "项目与阶段");

  await page.navigate("/?view=unknown&project=unknown&range=forever&iteration=unknown&source=live");
  await page.waitFor(
    () => document.querySelector("#page-title")?.textContent?.trim() === "总览",
    [],
    "非法 URL 回退到总览",
  );
  const fallback = await page.execute(() => ({
    filters: Object.fromEntries([...document.querySelectorAll("select[data-filter]")].map((select) => [select.dataset.filter, select.value])),
    params: Object.fromEntries(new URLSearchParams(location.search)),
  }));
  assert.deepEqual(fallback.filters, DEFAULT_FILTERS, "非法筛选值必须回退到默认值");
  assert.equal(fallback.params.view, "overview");
  assert.deepEqual(
    Object.fromEntries(Object.keys(DEFAULT_FILTERS).map((key) => [key, fallback.params[key]])),
    DEFAULT_FILTERS,
    "非法筛选回退后 URL 必须被规范化",
  );

  await page.setSelect('[data-filter="source"]', "pending");
  await page.waitForSelector("[data-filter-unavailable]");
  const pendingState = await page.execute(() => ({
    unavailableText: document.querySelector("[data-filter-unavailable]")?.textContent,
    renderedViews: document.querySelectorAll("[data-view]").length,
    visibleMetrics: document.querySelectorAll(".stat-card").length,
    source: document.querySelector('[data-filter="source"]')?.value,
  }));
  assert.equal(pendingState.source, "pending");
  assert.match(pendingState.unavailableText ?? "", /待接入来源没有可展示记录/);
  assert.equal(pendingState.renderedViews, 0, "待接入来源不能继续呈现未过滤视图");
  assert.equal(pendingState.visibleMetrics, 0, "待接入来源不能继续呈现未过滤指标");

  await page.click("[data-reset-filters]");
  await page.waitForSelector('[data-view="overview"]');
  const resetState = await page.execute(() => ({
    filters: Object.fromEntries([...document.querySelectorAll("select[data-filter]")].map((select) => [select.dataset.filter, select.value])),
    params: Object.fromEntries(new URLSearchParams(location.search)),
  }));
  assert.deepEqual(resetState.filters, DEFAULT_FILTERS, "恢复默认筛选必须重置四类控件");
  assert.deepEqual(
    Object.fromEntries(Object.keys(DEFAULT_FILTERS).map((key) => [key, resetState.params[key]])),
    DEFAULT_FILTERS,
    "恢复默认筛选必须同步规范化 URL",
  );
}

async function assertGlobalFiltersAcrossViews(page) {
  const unavailableCases = [
    {
      name: "待接入来源",
      query: "project=all&range=current-iteration&iteration=mvp-v1&source=pending",
      title: /待接入来源没有可展示记录/,
    },
    {
      name: "最近 7 天",
      query: "project=all&range=7d&iteration=mvp-v1&source=all",
      title: /该时间范围的覆盖不可用/,
    },
    {
      name: "工作流治理迭代",
      query: "project=all&range=current-iteration&iteration=workflow-v03&source=all",
      title: /该迭代没有完整演示明细/,
    },
  ];

  for (const view of VIEW_IDS) {
    for (const testCase of unavailableCases) {
      await page.navigate(`/?view=${view}&${testCase.query}`);
      await page.waitForSelector("[data-filter-unavailable]");
      const result = await page.execute(() => ({
        title: document.querySelector("[data-filter-unavailable] h2")?.textContent?.trim(),
        renderedViewCount: document.querySelectorAll("[data-view]").length,
        visibleMetricCount: document.querySelectorAll(".stat-card").length,
      }));
      assert.match(result.title ?? "", testCase.title, `${view} 必须诚实应用${testCase.name}筛选`);
      assert.equal(result.renderedViewCount, 0, `${view} 的${testCase.name}筛选不能继续显示未过滤视图`);
      assert.equal(result.visibleMetricCount, 0, `${view} 的${testCase.name}筛选不能继续显示旧指标`);
    }
  }

  const englishProjectAvailability = {
    overview: true,
    projects: true,
    roles: false,
    quality: true,
    releases: true,
    governance: false,
  };
  for (const view of VIEW_IDS) {
    await page.navigate(`/?view=${view}&project=ai-english-learning&range=current-iteration&iteration=mvp-v1&source=demo`);
    if (englishProjectAvailability[view]) {
      await page.waitForSelector(`[data-view="${view}"]`);
      assert.equal(
        await page.execute((viewId) => document.querySelectorAll(`[data-view="${viewId}"]`).length, view),
        1,
        `${view} 必须应用 AI English Learning 项目范围并保持有证据视图可用`,
      );
      if (view === "overview") {
        const overviewScope = await page.execute(() => ({
          projectCount: document.querySelector('.decision-strip .stat-card:first-child > strong')?.textContent?.trim(),
          matrixProjects: [...document.querySelectorAll('.stage-matrix-grid tbody th[scope="row"] strong')].map((item) => item.textContent?.trim()),
          releaseSource: document.querySelector(".release-snapshot .source-badge")?.textContent?.trim(),
          releaseTitle: document.querySelector(".release-snapshot .panel-header p")?.textContent?.trim(),
        }));
        assert.equal(overviewScope.projectCount, "1", "English 总览项目数量必须收敛为 1");
        assert.deepEqual(overviewScope.matrixProjects, ["AI English Learning"], "English 总览矩阵只能显示 English");
        assert.equal(overviewScope.releaseSource, "演示数据", "English 总览必须与发布页使用同一发布样本归属");
        assert.match(overviewScope.releaseTitle ?? "", /当前明确阻塞/);
      }
      if (view === "projects") {
        const projectScope = await page.execute(() => ({
          cards: [...document.querySelectorAll(".project-card-grid article.project-card h2")].map((item) => item.textContent?.trim()),
          matrixProjects: [...document.querySelectorAll('.stage-matrix-grid tbody th[scope="row"] strong')].map((item) => item.textContent?.trim()),
          detailTitles: [...document.querySelectorAll(".project-detail-panel h2")].map((item) => item.textContent?.trim()),
        }));
        assert.deepEqual(projectScope.cards, ["AI English Learning"], "English 项目页卡片只能显示 English");
        assert.deepEqual(projectScope.matrixProjects, ["AI English Learning"], "English 项目页矩阵只能显示 English");
        assert(projectScope.detailTitles.some((title) => title?.startsWith("AI English Learning · 阶段详情")), "English 项目详情必须与筛选一致");
      }
    } else {
      await page.waitForSelector("[data-filter-unavailable]");
      assert.match(
        await page.execute(() => document.querySelector("[data-filter-unavailable] h2")?.textContent?.trim() ?? ""),
        /该视图没有项目级拆分证据/,
        `${view} 缺少项目拆分时必须停止复用全局快照`,
      );
    }
  }

  for (const view of ["quality", "releases"]) {
    await page.navigate(`/?view=${view}&project=ai-model-radar&range=current-iteration&iteration=mvp-v1&source=demo`);
    await page.waitForSelector("[data-filter-unavailable]");
    assert.match(
      await page.execute(() => document.querySelector("[data-filter-unavailable] h2")?.textContent?.trim() ?? ""),
      /当前项目没有该类演示明细/,
      `${view} 不得把 English 演示明细冒充 AI Model Radar 数据`,
    );
  }
}

async function assertSearchAndExportScope(page) {
  await page.navigate("/?view=overview&project=ai-model-radar&range=current-iteration&iteration=mvp-v1&source=demo");
  await page.setTextInput('.global-search input[aria-label="全局搜索"]', "AI English Learning");
  await page.click(".global-search button[type=submit]");
  await page.waitForSelector("dialog.detail-drawer[open] [data-search-empty]");
  assert.equal(
    await page.execute(() => document.querySelectorAll('dialog.detail-drawer[open] [data-search-result="project-ai-english-learning"]').length),
    0,
    "Model 项目范围不能搜索到被隐藏的 English 项目",
  );
  await page.click('dialog.detail-drawer[open] button[aria-label="关闭详情"]');

  await page.setSelect('[data-filter="source"]', "pending");
  await page.waitForSelector("[data-filter-unavailable]");
  await page.setTextInput('.global-search input[aria-label="全局搜索"]', "AI");
  await page.click(".global-search button[type=submit]");
  await page.waitForSelector("dialog.detail-drawer[open] [data-search-empty]");
  assert.equal(
    await page.execute(() => document.querySelectorAll("dialog.detail-drawer[open] [data-search-result]").length),
    0,
    "待接入来源不能返回演示搜索结果",
  );
  await page.click('dialog.detail-drawer[open] button[aria-label="关闭详情"]');

  await page.navigate("/?view=overview&project=all&range=current-iteration&iteration=mvp-v1&source=all");
  await page.setTextInput('.global-search input[aria-label="全局搜索"]', "AI English Learning");
  await page.click(".global-search button[type=submit]");
  await page.waitForSelector('dialog.detail-drawer[open] [data-search-result="project-ai-english-learning"]');
  await page.click('dialog.detail-drawer[open] [data-search-result="project-ai-english-learning"]');
  await page.waitForSelector('[data-view="projects"]');
  await page.waitFor(
    () => document.querySelector('[data-filter="project"]')?.value === "ai-english-learning"
      && document.querySelectorAll(".project-card-grid article.project-card").length === 1
      && new URLSearchParams(location.search).get("project") === "ai-english-learning",
    [],
    "搜索项目结果定位并同步筛选",
  );
  assert.deepEqual(await projectCardNames(page), ["AI English Learning"], "搜索项目后必须只显示目标项目");

  await page.execute(() => {
    window.__controlExportCapture = {
      originalCreateObjectURL: URL.createObjectURL,
      originalRevokeObjectURL: URL.revokeObjectURL,
      originalAnchorClick: HTMLAnchorElement.prototype.click,
      blob: null,
      download: "",
      clickCount: 0,
    };
    URL.createObjectURL = (blob) => {
      window.__controlExportCapture.blob = blob;
      return "blob:control-test-report";
    };
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function captureClick() {
      window.__controlExportCapture.clickCount += 1;
      window.__controlExportCapture.download = this.download;
    };
  });
  await page.click("[data-export-report]");
  const exported = await page.execute(async () => {
    const capture = window.__controlExportCapture;
    const report = JSON.parse(await capture.blob.text());
    URL.createObjectURL = capture.originalCreateObjectURL;
    URL.revokeObjectURL = capture.originalRevokeObjectURL;
    HTMLAnchorElement.prototype.click = capture.originalAnchorClick;
    return { report, download: capture.download, clickCount: capture.clickCount };
  });
  assert.equal(exported.clickCount, 1);
  assert.equal(exported.download, "ai-workflow-control-center-demo-report.json");
  assert.equal(exported.report.filters.project, "ai-english-learning");
  assert.deepEqual(exported.report.projects.map((project) => project.id), ["ai-english-learning"], "单项目导出不能夹带被隐藏项目");

  await page.setSelect('[data-filter="source"]', "pending");
  await page.waitForSelector("[data-filter-unavailable]");
  await page.execute(() => {
    window.__controlBlockedExportCapture = {
      originalCreateObjectURL: URL.createObjectURL,
      originalAnchorClick: HTMLAnchorElement.prototype.click,
      objectUrlCount: 0,
      clickCount: 0,
    };
    URL.createObjectURL = () => {
      window.__controlBlockedExportCapture.objectUrlCount += 1;
      return "blob:unexpected";
    };
    HTMLAnchorElement.prototype.click = function captureBlockedClick() {
      window.__controlBlockedExportCapture.clickCount += 1;
    };
  });
  await page.click("[data-export-report]");
  await page.waitFor(
    () => document.querySelector(".toast")?.textContent?.includes("当前筛选覆盖不可用，未导出演示报告"),
    [],
    "待接入来源导出被诚实阻止",
  );
  const blockedExport = await page.execute(() => {
    const capture = window.__controlBlockedExportCapture;
    URL.createObjectURL = capture.originalCreateObjectURL;
    HTMLAnchorElement.prototype.click = capture.originalAnchorClick;
    return {
      objectUrlCount: capture.objectUrlCount,
      clickCount: capture.clickCount,
      message: document.querySelector(".toast")?.textContent?.trim(),
    };
  });
  assert.deepEqual(
    { objectUrlCount: blockedExport.objectUrlCount, clickCount: blockedExport.clickCount },
    { objectUrlCount: 0, clickCount: 0 },
    "覆盖不可用时不得创建或点击下载",
  );
  assert.match(blockedExport.message ?? "", /待接入来源没有可展示记录/);
}

async function projectCardNames(page) {
  return page.execute(() => [...document.querySelectorAll(".project-card-grid article.project-card h2")]
    .map((heading) => heading.textContent?.trim()));
}

async function assertProjectFiltersAndMatrix(page) {
  await page.navigate("/?view=projects&project=all&range=current-iteration&iteration=mvp-v1&source=all");
  await page.waitForSelector('[data-view="projects"]');

  const structure = await page.execute(() => ({
    filterCount: document.querySelectorAll('[data-view="projects"] .filter-row label > select').length,
    cards: [...document.querySelectorAll(".project-card-grid article.project-card")].every((card) => (
      Boolean(card.querySelector("h2"))
      && Boolean(card.querySelector("dl"))
      && card.querySelector('button[aria-pressed]')?.tagName === "BUTTON"
    )),
  }));
  assert.equal(structure.filterCount, 3, "项目页必须提供状态、责任角色、数据来源三类结构化筛选");
  assert.equal(structure.cards, true, "项目卡片必须保留 article/h2/dl 与独立选择按钮语义");
  assert.deepEqual(await projectCardNames(page), [
    "AI Workflow Control Center",
    "AI English Learning",
    "AI Model Radar",
    "Market Analysis Dev",
  ]);

  await page.setLabeledSelect('[data-view="projects"] .filter-row', "项目状态", "blocked");
  await page.waitFor(() => document.querySelectorAll(".project-card-grid article.project-card").length === 1, [], "项目状态筛选");
  assert.deepEqual(await projectCardNames(page), ["AI English Learning"], "状态筛选必须使用当前阶段结构化状态");

  await page.click('[data-view="projects"] .filter-row button');
  await page.waitFor(() => document.querySelectorAll(".project-card-grid article.project-card").length === 4, [], "清除项目筛选");
  await page.setLabeledSelect('[data-view="projects"] .filter-row', "阶段责任角色", "架构师");
  await page.waitFor(() => document.querySelectorAll(".project-card-grid article.project-card").length === 1, [], "责任角色筛选");
  assert.deepEqual(await projectCardNames(page), ["Market Analysis Dev"], "责任角色筛选必须使用当前阶段责任角色");

  await page.click('[data-view="projects"] .filter-row button');
  await page.setLabeledSelect('[data-view="projects"] .filter-row', "数据来源", "pending");
  await page.waitForSelector('[data-view="projects"] .empty-result');
  assert.match(
    await page.execute(() => document.querySelector('[data-view="projects"] .empty-result')?.textContent ?? ""),
    /没有符合全部筛选条件的项目/,
  );

  await page.click('[data-view="projects"] .empty-result button');
  await page.waitFor(() => document.querySelectorAll(".project-card-grid article.project-card").length === 4, [], "空结果恢复");
  await page.click('button[aria-label*="选择AI English Learning并查看阶段详情"]');
  await page.waitFor(
    () => document.querySelector('button[aria-label*="AI English Learning并查看阶段详情"]')?.getAttribute("aria-pressed") === "true",
    [],
    "选择 English 项目",
  );
  await page.setLabeledSelect('[data-view="projects"] .filter-row', "项目状态", "active");
  await page.waitFor(() => document.querySelectorAll(".project-card-grid article.project-card").length === 1, [], "排除已选项目");
  const consistentSelection = await page.execute(() => ({
    names: [...document.querySelectorAll(".project-card-grid article.project-card h2")].map((item) => item.textContent?.trim()),
    pressedLabel: document.querySelector('.project-card-grid button[aria-pressed="true"]')?.getAttribute("aria-label"),
    detailHeadings: [...document.querySelectorAll('[data-view="projects"] .panel h2')].map((item) => item.textContent?.trim()),
  }));
  assert.deepEqual(consistentSelection.names, ["AI Workflow Control Center"]);
  assert.match(consistentSelection.pressedLabel ?? "", /AI Workflow Control Center/);
  assert(consistentSelection.detailHeadings.some((heading) => heading?.startsWith("AI Workflow Control Center · 阶段详情")), "详情必须跟随过滤后的可见项目");

  await page.click('[data-view="projects"] .filter-row button');
  await page.waitFor(() => document.querySelectorAll(".stage-matrix-grid tbody tr").length === 4, [], "矩阵恢复四项目");
  const matrix = await page.execute(() => {
    const table = document.querySelector("table.stage-matrix-grid");
    return {
      tag: table?.tagName,
      headerRows: table?.querySelectorAll("thead > tr").length,
      headerCells: table?.querySelectorAll("thead > tr > th").length,
      bodyRows: table?.querySelectorAll("tbody > tr").length,
      validRows: [...(table?.querySelectorAll("tbody > tr") ?? [])].every((row) => (
        row.querySelector(':scope > th[scope="row"]')
        && row.querySelectorAll(":scope > td > button").length === 11
      )),
    };
  });
  assert.deepEqual(matrix, { tag: "TABLE", headerRows: 1, headerCells: 12, bodyRows: 4, validRows: true }, "阶段矩阵必须使用完整原生 table 结构");

  const matrixButton = ".stage-matrix-grid tbody tr:first-child td:first-of-type button";
  await page.focus(matrixButton);
  await page.press("Enter");
  await page.waitFor(() => Boolean(document.querySelector("dialog.detail-drawer[open]")), [], "Enter 打开矩阵详情");
  assert.equal(
    await page.execute(() => document.activeElement?.getAttribute("aria-label")),
    "关闭详情",
    "详情打开后焦点必须进入关闭按钮",
  );
  await page.press("Escape");
  await page.waitFor(() => !document.querySelector("dialog.detail-drawer[open]"), [], "Escape 关闭矩阵详情");
  await page.waitFor(
    (selector) => document.activeElement === document.querySelector(selector),
    [matrixButton],
    "详情关闭后焦点恢复触发按钮",
  );
}

async function assertSemanticViews(page) {
  await page.click('[data-nav-view="roles"]');
  await page.waitForSelector('[data-view="roles"]');
  const roleSemantics = await page.execute(() => ({
    listTag: document.querySelector(".role-lanes")?.tagName,
    itemCount: document.querySelectorAll(".role-lanes > li").length,
    allButtons: [...document.querySelectorAll(".role-lanes > li")].every((item) => item.querySelector(":scope > button")?.tagName === "BUTTON"),
    overriddenRoles: document.querySelectorAll(".role-lanes button[role]").length,
    pressedCount: document.querySelectorAll('.role-lanes button[aria-pressed="true"]').length,
  }));
  assert.deepEqual(roleSemantics, {
    listTag: "UL",
    itemCount: 11,
    allButtons: true,
    overriddenRoles: 0,
    pressedCount: 1,
  }, "角色泳道必须使用 ul/li/button 并保留按钮语义与单选状态");

  const keyboardRole = ".role-lanes > li:nth-child(7) > button";
  await page.focus(keyboardRole);
  await page.press("Enter");
  await page.waitFor(
    (selector) => document.querySelector(selector)?.getAttribute("aria-pressed") === "true",
    [keyboardRole],
    "键盘选择角色",
  );
  assert.equal(
    await page.execute(() => document.querySelectorAll('.role-lanes button[aria-pressed="true"]').length),
    1,
    "键盘选择后仍只能有一个 aria-pressed=true",
  );

  await page.click('[data-nav-view="quality"]');
  await page.waitForSelector('[data-view="quality"]');
  const quality = await page.execute(() => {
    const view = document.querySelector('[data-view="quality"]');
    const mutationButtons = [...(view?.querySelectorAll("button") ?? [])]
      .filter((button) => button.textContent?.includes("本版本不支持状态流转"));
    return {
      text: view?.textContent,
      mutationButtonCount: mutationButtons.length,
      allDisabled: mutationButtons.length > 0 && mutationButtons.every((button) => button.disabled),
    };
  });
  assert.match(quality.text ?? "", /只读监管界面/);
  assert(quality.mutationButtonCount >= 5, "质量页必须明确展示只读状态流转边界");
  assert.equal(quality.allDisabled, true, "质量页状态流转控件必须原生 disabled");

  await page.click('[data-nav-view="governance"]');
  await page.waitForSelector('[data-view="governance"]');
  const governance = await page.execute(() => ({
    galleryButtons: document.querySelectorAll('[data-view="governance"] .state-gallery button').length,
    previewActions: document.querySelectorAll('[data-view="governance"] .state-gallery .state-preview-action').length,
    articleCount: document.querySelectorAll('[data-view="governance"] .state-gallery article').length,
  }));
  assert.equal(governance.articleCount, 6);
  assert.equal(governance.galleryButtons, 0, "治理状态规范不得保留无行为伪按钮");
  assert.equal(governance.previewActions, 6, "治理状态动作应明确降级为非交互样例");
}

function axProperty(node, name) {
  return node.properties?.find((property) => property.name === name)?.value?.value;
}

function axBoolean(node, name) {
  return String(axProperty(node, name)) === "true";
}

async function assertAccessibilityTree(page) {
  await page.navigate("/?view=projects&project=all&range=current-iteration&iteration=mvp-v1&source=all");
  const projectTree = (await page.send("Accessibility.getFullAXTree")).nodes.filter((node) => !node.ignored);
  const projectNode = (role, name) => projectTree.find((node) => node.role?.value === role && name.test(node.name?.value ?? ""));
  for (const name of [/项目范围/, /时间范围/, /当前迭代/, /数据来源/]) {
    assert(projectNode("combobox", name), `无障碍树必须包含命名清晰的筛选框：${name}`);
  }
  assert(projectNode("button", /^导出演示报告$/), "无障碍树必须包含导出按钮名称");
  assert(projectNode("table", /项目与阶段 0 至 10 状态矩阵/), "阶段矩阵必须暴露原生 table 名称");
  assert(projectNode("columnheader", /^项目$/), "阶段矩阵必须暴露列标题");
  assert(projectNode("rowheader", /AI English Learning/), "阶段矩阵必须暴露项目行标题");
  const selectedProjectButton = projectNode("button", /已选择AI Workflow Control Center并查看阶段详情/);
  assert(selectedProjectButton, "项目选择按钮必须进入无障碍树");
  assert.equal(axBoolean(selectedProjectButton, "pressed"), true, "当前项目按钮必须暴露 pressed=true");

  await page.click('[data-nav-view="roles"]');
  await page.waitForSelector('[data-view="roles"]');
  const roleTree = (await page.send("Accessibility.getFullAXTree")).nodes.filter((node) => !node.ignored);
  const roleButton = roleTree.find((node) => node.role?.value === "button" && /前端工程师/.test(node.name?.value ?? ""));
  assert(roleButton, "角色选择控件必须保留 button 角色和可读名称");
  assert(["true", "false"].includes(String(axProperty(roleButton, "pressed"))), "角色选择控件必须暴露 pressed 状态");

  await page.click('[data-nav-view="quality"]');
  await page.waitForSelector('[data-view="quality"]');
  const qualityTree = (await page.send("Accessibility.getFullAXTree")).nodes.filter((node) => !node.ignored);
  const readonlyActions = qualityTree.filter((node) => node.role?.value === "button" && /本版本不支持状态流转/.test(node.name?.value ?? ""));
  assert(readonlyActions.length >= 5, "质量页只读动作必须进入无障碍树并有中文名称");
  assert(readonlyActions.every((node) => axBoolean(node, "disabled")), "质量页只读动作必须暴露 disabled=true");
}

async function assertResponsiveLayouts(page) {
  const measurements = [];
  for (const viewport of VIEWPORTS) {
    await page.setViewport(viewport);
    for (const view of VIEW_IDS) {
      await page.navigate(`/?view=${view}&project=all&range=current-iteration&iteration=mvp-v1&source=all`);
      await page.waitForSelector(`[data-view="${view}"]`);
      await sleep(100);
      const measurement = await page.execute((expectedWidth, viewId) => ({
        view: viewId,
        expectedWidth,
        innerWidth: window.innerWidth,
        rootClientWidth: document.documentElement.clientWidth,
        rootScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
      }), viewport.width, view);
      measurements.push(measurement);
      assert.equal(measurement.innerWidth, viewport.width, `${view} 应使用 ${viewport.width}px 视口`);
      assert(
        measurement.rootScrollWidth <= measurement.rootClientWidth + 1,
        `${view} 在 ${viewport.width}px 发生页面级横向溢出：${JSON.stringify(measurement)}`,
      );
      assert(
        measurement.bodyScrollWidth <= measurement.rootClientWidth + 1,
        `${view} 在 ${viewport.width}px 的 body 发生横向溢出：${JSON.stringify(measurement)}`,
      );
    }
  }
  return measurements;
}

test("真实 Chrome 覆盖筛选、语义、键盘与多视口交互", { timeout: 180_000 }, async (context) => {
  await access(VINEXT_CLI, fsConstants.R_OK).catch(() => {
    throw new Error(`缺少 Vinext CLI：${VINEXT_CLI}。请先在项目内准备现有依赖。`);
  });
  await access(join(PROJECT_ROOT, "dist", "server", "index.js"), fsConstants.R_OK).catch(() => {
    throw new Error("缺少 dist/server/index.js；请先运行 npm run build，再执行浏览器门禁。");
  });

  const chromePath = await findChrome();
  const temporaryRoot = await mkdtemp(join(tmpdir(), "ai-workflow-control-browser-"));
  const profileDirectory = join(temporaryRoot, "chrome-profile");
  const appPort = await reservePort();
  const origin = `http://127.0.0.1:${appPort}`;
  let server;
  let chrome;
  let connection;
  let serverOutput = "";
  let chromeOutput = "";

  try {
    server = spawn(process.execPath, [VINEXT_CLI, "start", "--hostname", "127.0.0.1", "--port", String(appPort)], {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(appPort),
        WRANGLER_LOG_PATH: join(temporaryRoot, "wrangler.log"),
        MINIFLARE_REGISTRY_PATH: join(temporaryRoot, "miniflare-registry"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (chunk) => { serverOutput = trimLog(serverOutput + chunk); });
    server.stderr.on("data", (chunk) => { serverOutput = trimLog(serverOutput + chunk); });
    await waitForHttp(origin, server, () => serverOutput);

    const browser = await createBrowserSession({
      chromePath,
      profileDirectory,
      origin,
      captureChromeOutput: (chunk) => { chromeOutput = trimLog(chromeOutput + chunk); },
      getChromeLogs: () => chromeOutput,
    });
    chrome = browser.chrome;
    connection = browser.connection;
    const problems = recordBrowserProblems(connection, browser.sessionId);

    await assertGlobalFilterRecovery(browser.page);
    await assertGlobalFiltersAcrossViews(browser.page);
    await assertSearchAndExportScope(browser.page);
    await assertProjectFiltersAndMatrix(browser.page);
    await assertSemanticViews(browser.page);
    await assertAccessibilityTree(browser.page);
    const measurements = await assertResponsiveLayouts(browser.page);

    assert.deepEqual(problems, [], `浏览器控制台必须保持 0 error/warning：\n${problems.join("\n")}`);
    context.diagnostic(`Chrome：${basename(chromePath)}`);
    context.diagnostic(`全局筛选、项目筛选、键盘/语义与 ${measurements.length} 个视图视口组合均通过`);
  } finally {
    if (connection) {
      try {
        if (!connection.closed) await connection.send("Browser.close");
      } catch {
        // Chrome may close the DevTools transport before acknowledging Browser.close.
      } finally {
        await connection.close();
      }
    }
    if (chrome && !await waitForExit(chrome, 4_000)) await stopChild(chrome);
    await stopChild(server);
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
