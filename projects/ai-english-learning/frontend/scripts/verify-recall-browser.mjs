import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const STORAGE_KEY = "ai-english-learning:spaced-recall:v1";
const CLOZE_SESSION_KEY = "ai-english-learning:cloze-session:v1";

async function isExecutable(path) {
  try {
    await access(path, constants.X_OK);
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function getChromeCandidates(platform, environment = {}, pathValue = "") {
  const pathApi = platform === "win32" ? win32 : posix;
  const candidates = [];
  if (platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  } else if (platform === "win32") {
    for (const base of [
      environment.PROGRAMFILES,
      environment["PROGRAMFILES(X86)"],
      environment.LOCALAPPDATA,
    ].filter(Boolean)) {
      candidates.push(
        pathApi.join(base, "Google", "Chrome", "Application", "chrome.exe"),
        pathApi.join(base, "Chromium", "Application", "chrome.exe"),
      );
    }
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
    );
  }

  const executableNames = platform === "win32"
    ? ["chrome.exe", "chromium.exe"]
    : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  for (const directory of pathValue.split(pathApi.delimiter).filter(Boolean)) {
    for (const name of executableNames) candidates.push(pathApi.join(directory, name));
  }

  return [...new Set(candidates)];
}

async function verifyChromeCandidateSelection() {
  assert.ok(getChromeCandidates("darwin").includes(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ));
  const windowsCandidates = getChromeCandidates(
    "win32",
    { PROGRAMFILES: "C:\\Program Files" },
    "C:\\tools;D:\\browser",
  );
  assert.ok(windowsCandidates.includes("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"));
  assert.ok(windowsCandidates.includes("D:\\browser\\chrome.exe"));
  assert.ok(getChromeCandidates("linux").includes("/usr/bin/google-chrome"));

  assert.equal(await resolveChromePath({
    platform: "linux",
    environment: { CHROME_PATH: "/custom/chrome", PATH: "/usr/bin" },
    executableCheck: async (candidate) => candidate === "/custom/chrome",
  }), "/custom/chrome");
  await assert.rejects(
    resolveChromePath({
      platform: "linux",
      environment: { CHROME_PATH: "/invalid/chrome" },
      executableCheck: async () => false,
    }),
    /CHROME_PATH 指向的文件不可执行/,
  );
  await assert.rejects(
    resolveChromePath({
      platform: "linux",
      environment: { PATH: "" },
      executableCheck: async () => false,
    }),
    /找不到可执行的 Chrome\/Chromium（平台：linux）/,
  );
}

async function resolveChromePath({
  platform = process.platform,
  environment = process.env,
  executableCheck = isExecutable,
} = {}) {
  const override = environment.CHROME_PATH?.trim();
  if (override) {
    if (await executableCheck(override)) return override;
    throw new Error(`CHROME_PATH 指向的文件不可执行：${override}`);
  }

  for (const candidate of getChromeCandidates(platform, environment, environment.PATH ?? "")) {
    if (await executableCheck(candidate)) return candidate;
  }
  throw new Error(
    `找不到可执行的 Chrome/Chromium（平台：${platform}）。` +
    "请安装浏览器或设置 CHROME_PATH 为浏览器可执行文件的绝对路径。",
  );
}

async function loadDomain() {
  const sourceUrl = new URL("../src/utils/spacedRecall.ts", import.meta.url);
  const source = await readFile(sourceUrl, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
    fileName: sourceUrl.pathname,
  });
  return import(`data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`);
}

function stateOf(result) {
  assert.notEqual(result.status, "rejected", result.reason);
  return result.state;
}

async function getFreePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const { port } = address;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitFor(check, message, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`${message}${lastError ? `: ${lastError.message}` : ""}`);
}

class CdpClient {
  static async connect(url) {
    const client = new CdpClient(url);
    await client.ready;
    return client;
  }

  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result ?? {});
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message);
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 500)),
  ]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 1_000)),
    ]);
  }
}

async function createFixture() {
  const domain = await loadDomain();
  const now = new Date().toISOString();
  const timeZone = "Asia/Shanghai";
  const today = domain.studyDayAt(now, timeZone);
  const yesterday = domain.addStudyDays(today, -1);
  const twoDaysAgo = domain.addStudyDays(today, -2);
  const yesterdayAtNoon = `${yesterday}T12:00:00+08:00`;
  const twoDaysAgoAtNoon = `${twoDaysAgo}T12:00:00+08:00`;
  let state = domain.createInitialSpacedRecallState(timeZone);

  const fixtureItems = [
    ["lexeme-ephemeral-adjective-transient", "ephemeral", "短暂的"],
    ["lexeme-serendipity-noun-fortunate-discovery", "serendipity", "意外发现美好事物的幸运"],
    ["lexeme-resilient-adjective-recover", "resilient", "有韧性的"],
    ["orphan-due", "orphan", "浏览器回归-已移出当前题库"],
  ];
  for (const [itemId, targetAnswer, meaning] of fixtureItems) {
    state = stateOf(domain.registerRecallItem(
      state,
      { itemId, targetAnswer, meaning },
      twoDaysAgoAtNoon,
    ));
  }
  state = stateOf(domain.resetRecallMastery(
    state,
    { itemId: "lexeme-serendipity-noun-fortunate-discovery", confirmed: true },
    twoDaysAgoAtNoon,
  ));
  for (const itemId of [
    "lexeme-ephemeral-adjective-transient",
    "lexeme-resilient-adjective-recover",
    "orphan-due",
  ]) {
    state = stateOf(domain.resetRecallMastery(
      state,
      { itemId, confirmed: true },
      yesterdayAtNoon,
    ));
  }
  state = stateOf(domain.markDataException(state, {
    itemId: "lexeme-ephemeral-adjective-transient",
    code: "missing-content",
    detail: "旧版本题库中曾暂时缺少这条内容；当前规范题库已重新提供",
  }, yesterdayAtNoon));
  state = stateOf(domain.updateReminderSettings(state, {
    enabled: true,
    paused: false,
    localTime: "20:00",
    quietStart: "22:00",
    quietEnd: "08:00",
  }));
  const rawState = structuredClone(state);
  rawState.items["orphan-due"].dueDay = "not-a-date";
  return JSON.stringify(rawState);
}

async function run() {
  const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
  assert.ok(
    nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 12),
    `浏览器门禁需要 Node >=22.12，当前为 ${process.versions.node}`,
  );
  assert.equal(typeof WebSocket, "function", "当前 Node 运行时缺少内置 WebSocket");
  await verifyChromeCandidateSelection();
  const chromePath = await resolveChromePath();
  const vitePort = await getFreePort();
  const debugPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${vitePort}`;
  const userDataDirectory = await mkdtemp(join(tmpdir(), "english-recall-cdp-"));
  const fixture = await createFixture();
  let viteProcess;
  let chromeProcess;
  let client;
  const browserProblems = [];

  try {
    const vitePath = new URL("../node_modules/vite/bin/vite.js", import.meta.url);
    viteProcess = spawn(process.execPath, [
      fileURLToPath(vitePath),
      "--host",
      "127.0.0.1",
      "--port",
      String(vitePort),
      "--strictPort",
    ], {
      cwd: new URL("..", import.meta.url),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let viteError = "";
    viteProcess.stderr.on("data", (chunk) => {
      viteError += chunk.toString();
    });
    await waitFor(async () => {
      const response = await fetch(`${baseUrl}/word`);
      return response.ok;
    }, `Vite did not become ready${viteError ? ` (${viteError.trim()})` : ""}`);

    chromeProcess = spawn(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${userDataDirectory}`,
      `--remote-debugging-port=${debugPort}`,
      "about:blank",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, TZ: "Asia/Shanghai" },
    });
    let chromeError = "";
    chromeProcess.stderr.on("data", (chunk) => {
      chromeError += chunk.toString();
    });
    const version = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      return response.ok ? response.json() : null;
    }, `Chrome CDP did not become ready${chromeError ? ` (${chromeError.trim()})` : ""}`);

    client = await CdpClient.connect(version.webSocketDebuggerUrl);
    const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
    const send = (method, params = {}) => client.send(method, params, sessionId);
    client.on("Runtime.exceptionThrown", (message) => {
      if (message.sessionId === sessionId) {
        browserProblems.push(`exception: ${message.params.exceptionDetails.text}`);
      }
    });
    client.on("Log.entryAdded", (message) => {
      if (message.sessionId === sessionId && ["error", "warning"].includes(message.params.entry.level)) {
        browserProblems.push(`${message.params.entry.level}: ${message.params.entry.text}`);
      }
    });
    client.on("Runtime.consoleAPICalled", (message) => {
      if (message.sessionId !== sessionId || !["error", "warning"].includes(message.params.type)) return;
      browserProblems.push(`${message.params.type}: ${message.params.args.map((entry) => entry.value ?? entry.description).join(" ")}`);
    });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const initSource = `(() => {
      try {
        if (location.origin === ${JSON.stringify(baseUrl)} && !sessionStorage.getItem("__recall_cdp_seeded__")) {
          localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(fixture)});
          sessionStorage.setItem("__recall_cdp_seeded__", "1");
        }
      } catch {}
      const createObjectUrl = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (value) => {
        if (value instanceof Blob) {
          globalThis.__recallBackupText = null;
          value.text().then((text) => { globalThis.__recallBackupText = text; });
        }
        return createObjectUrl(value);
      };
      const clickAnchor = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function click() {
        globalThis.__recallBackupDownload = {
          download: this.download,
          href: this.href,
        };
        return clickAnchor.call(this);
      };
      class TestNotification {
        static permission = "denied";
        static requestPermission = async () => "denied";
        constructor() { globalThis.__recallNotificationCount = (globalThis.__recallNotificationCount ?? 0) + 1; }
        close() {}
      }
      Object.defineProperty(globalThis, "Notification", { configurable: true, value: TestNotification });
    })();`;
    await send("Page.addScriptToEvaluateOnNewDocument", { source: initSource });

    async function evaluate(expression) {
      const result = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    }

    async function waitForDom(expression, message) {
      return waitFor(() => evaluate(expression), message);
    }

    async function clickButton(label) {
      const clicked = await evaluate(`(() => {
        const button = Array.from(document.querySelectorAll("button"))
          .find((entry) => entry.textContent.trim() === ${JSON.stringify(label)});
        if (!button) return false;
        button.focus();
        button.click();
        return true;
      })()`);
      assert.equal(clicked, true, `button not found: ${label}`);
    }

    async function activeQueueOrder() {
      return evaluate(`Array.from(document.querySelectorAll(
        ".recall-queue-group--overdue .recall-queue-item h4, " +
        ".recall-queue-group--due-today .recall-queue-item h4, " +
        ".recall-queue-group--same-day .recall-queue-item h4, " +
        ".recall-queue-group--queue-tail .recall-queue-item h4"
      )).map((entry) => entry.textContent.trim())`);
    }

    async function clickItemAction(word, label) {
      return evaluate(`(() => {
        const card = Array.from(document.querySelectorAll(".recall-queue-item"))
          .find((entry) => entry.querySelector("h4")?.textContent.trim() === ${JSON.stringify(word)});
        const button = Array.from(card?.querySelectorAll("button") ?? [])
          .find((entry) => entry.textContent.trim() === ${JSON.stringify(label)});
        if (!button) return false;
        button.focus();
        button.click();
        return true;
      })()`);
    }

    async function assertResponsiveViewport(width, height) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: true,
      });
      const layout = await evaluate(`(() => {
        const dialog = document.querySelector(".recall-center-dialog")?.getBoundingClientRect();
        return {
          viewport: innerWidth,
          htmlWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          dialogLeft: dialog?.left ?? -1,
          dialogRight: dialog?.right ?? -1,
        };
      })()`);
      assert.equal(layout.viewport, width, JSON.stringify(layout));
      assert.ok(layout.htmlWidth <= layout.viewport, JSON.stringify(layout));
      assert.ok(layout.bodyWidth <= layout.viewport, JSON.stringify(layout));
      assert.ok(
        layout.dialogLeft >= 0 && layout.dialogRight <= layout.viewport,
        JSON.stringify(layout),
      );
    }

    await send("Page.navigate", { url: `${baseUrl}/word` });
    await waitForDom(
      `document.readyState === "complete" && Array.from(document.querySelectorAll("button"))
        .some((entry) => entry.textContent.trim() === "查看队列")`,
      "Word page did not render",
    );
    assert.equal(await evaluate("document.documentElement.lang"), "zh-CN");
    assert.equal(await evaluate("document.body.innerText.includes('2 条记录异常')"), true);

    await clickButton("查看队列");
    await waitForDom(`Boolean(document.querySelector('[role="dialog"]'))`, "Recall dialog did not open");
    assert.deepEqual((await activeQueueOrder()).slice(0, 2), [
      "serendipity",
      "resilient",
    ]);
    assert.equal(await evaluate("document.querySelectorAll('.recall-queue-group--exception .recall-queue-item').length"), 2);
    assert.equal(await clickItemAction("orphan", "恢复这条记录"), false);
    assert.equal(
      await evaluate("document.body.innerText.includes('请等待同一学习项的完整题库内容恢复，在此之前不能恢复或开始作答')"),
      true,
    );

    const skipped = await clickItemAction("serendipity", "跳过本题");
    assert.equal(skipped, true);
    await waitForDom(
      `document.body.innerText.includes("已移到当前队列末尾")`,
      "First-skip feedback did not render",
    );
    await waitFor(
      async () => JSON.stringify((await activeQueueOrder()).slice(0, 2)) === JSON.stringify([
        "resilient",
        "serendipity",
      ]),
      "First skip did not move behind the entire current queue",
    );
    assert.equal(
      await evaluate(`document.querySelector(".recall-queue-group--queue-tail h4")?.textContent.includes("队尾")`),
      true,
    );

    await send("Page.reload", { ignoreCache: true });
    await waitForDom(
      `performance.getEntriesByType("navigation")[0]?.type === "reload" &&
        document.readyState === "complete" && Array.from(document.querySelectorAll("button"))
        .some((entry) => entry.textContent.trim() === "查看队列")`,
      "Word page did not recover after refresh",
    );
    await clickButton("查看队列");
    await waitForDom(`Boolean(document.querySelector('[role="dialog"]'))`, "Recall dialog did not reopen");
    assert.deepEqual((await activeQueueOrder()).slice(0, 2), [
      "resilient",
      "serendipity",
    ]);

    await clickButton("开始复习");
    await waitForDom(
      `!document.querySelector('[role="dialog"]') &&
        JSON.parse(sessionStorage.getItem(${JSON.stringify(CLOZE_SESSION_KEY)}))?.wordKey ===
          "lexeme-resilient-adjective-recover"`,
      "Start review did not select the same first item shown by the queue",
    );
    await clickButton("查看队列");
    await waitForDom(`Boolean(document.querySelector('[role="dialog"]'))`, "Recall dialog did not reopen after starting");

    const recovered = await clickItemAction("ephemeral", "恢复这条记录");
    assert.equal(recovered, true);
    await waitForDom(
      `document.querySelectorAll(".recall-queue-group--exception .recall-queue-item").length === 1 &&
        document.body.innerText.includes("异常记录已恢复为单一当前任务")`,
      "Isolated item did not recover",
    );
    assert.equal(await evaluate("document.activeElement?.id"), "recall-center-tab-queue");

    assert.equal(await clickItemAction("ephemeral", "开始本题"), true);
    await waitForDom(
      `!document.querySelector('[role="dialog"]') &&
        JSON.parse(sessionStorage.getItem(${JSON.stringify(CLOZE_SESSION_KEY)}))?.wordKey ===
          "lexeme-ephemeral-adjective-transient"`,
      "Recovered item could not be started",
    );
    assert.equal(await evaluate(`(() => {
      const input = document.getElementById("cloze-answer");
      input?.focus();
      return document.activeElement === input;
    })()`), true);
    await send("Input.insertText", { text: "ephemeral" });
    await waitForDom(
      `document.querySelectorAll('[data-slot-kind="user"]').length === 9`,
      "Recovered item input did not accept the standard answer",
    );
    await clickButton("检查答案");
    await waitForDom(
      `document.body.innerText.includes("独立拼写正确")`,
      "Recovered item did not reach the correct state",
    );
    await clickButton("下一题");
    await waitForDom(
      `Object.values(JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})).attempts)
        .some((attempt) => attempt.itemId === "lexeme-ephemeral-adjective-transient" &&
          attempt.outcome === "clean-independent-correct")`,
      "Recovered item was not settled",
    );

    await clickButton("查看队列");
    await waitForDom(`Boolean(document.querySelector('[role="dialog"]'))`, "Recall dialog did not reopen after settlement");

    await clickButton("提醒与时区");
    await waitForDom(
      `document.body.innerText.includes("系统通知未授权；应用内待复习仍会正常显示。")`,
      "Denied notification copy is not reachable",
    );
    assert.equal(await evaluate(`Array.from(document.querySelectorAll("body *"))
      .filter((entry) => entry.children.length === 0)
      .some((entry) => /^(系统)?通知已送达[！。]?$/.test(entry.textContent.trim()))`), false);

    await assertResponsiveViewport(390, 844);
    await assertResponsiveViewport(320, 844);

    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await waitForDom(`!document.querySelector('[role="dialog"]')`, "Escape did not close the dialog");
    assert.equal(await evaluate("document.activeElement?.textContent.trim()"), "查看队列");

    if (process.env.WRITE_DESIGN_QA === "1") {
      await send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await clickButton("查看队列");
      await waitForDom(`Boolean(document.querySelector('[role="dialog"]'))`, "Recall dialog did not open for evidence");
      const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
      const evidencePath = new URL("../../design-qa/implementation-browser-recall-fix-desktop.png", import.meta.url);
      await writeFile(evidencePath, Buffer.from(screenshot.data, "base64"));
    }

    if (await evaluate("Boolean(document.querySelector('.recall-center-dialog'))")) {
      await clickButton("关闭");
      await waitForDom(`!document.querySelector('.recall-center-dialog')`, "Recall dialog did not close before storage recovery test");
    }
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const futureRaw = JSON.stringify({
      storageVersion: 99,
      revision: 7,
      sentinel: "未来版本 ✓\n逐字保留",
    });
    await evaluate(`(() => {
      localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(futureRaw)});
      sessionStorage.removeItem(${JSON.stringify(CLOZE_SESSION_KEY)});
    })()`);
    await send("Page.reload", { ignoreCache: true });
    await waitForDom(
      `document.readyState === "complete" && document.body.innerText.includes("当前版本无法识别") &&
        Array.from(document.querySelectorAll("button")).some((entry) => entry.textContent.trim() === "先导出原始备份")`,
      "Unknown-version recovery controls did not render",
    );
    assert.equal(await evaluate("document.body.innerText.includes('复习统计暂不可读')"), true);
    assert.equal(await evaluate("document.querySelector('.recall-center-summary__metrics')"), null);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll("button"))
      .find((entry) => entry.textContent.trim() === "队列暂不可读")?.disabled`), true);
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`), futureRaw);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll("button"))
      .find((entry) => entry.textContent.trim() === "重建本地复习记录")?.disabled`), true);

    await clickButton("先导出原始备份");
    await waitForDom(
      `globalThis.__recallBackupText === ${JSON.stringify(futureRaw)}`,
      "Exported backup bytes did not match the unknown-version snapshot",
    );
    assert.equal(await evaluate(`globalThis.__recallBackupDownload?.download.startsWith(
      "ai-english-learning-recall-backup-"
    ) && globalThis.__recallBackupDownload.download.endsWith(".json") &&
      globalThis.__recallBackupDownload.href.startsWith("blob:")`), true);
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`), futureRaw);
    await clickButton("重建本地复习记录");
    await waitForDom(
      `Boolean(document.getElementById("recall-storage-rebuild-title"))`,
      "Storage rebuild confirmation did not open",
    );
    assert.equal(await evaluate("document.activeElement?.textContent.trim()"), "取消");
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await waitForDom(
      `!document.getElementById("recall-storage-rebuild-title")`,
      "Escape did not cancel storage rebuild",
    );
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`), futureRaw);

    await clickButton("重建本地复习记录");
    await waitForDom(
      `Boolean(document.getElementById("recall-storage-rebuild-title"))`,
      "Storage rebuild confirmation did not reopen",
    );
    const changedFutureRaw = JSON.stringify({
      storageVersion: 99,
      revision: 8,
      sentinel: "另一页面的新原始记录",
    });
    await evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(changedFutureRaw)})`);
    await clickButton("确认重建");
    await waitForDom(
      `document.body.innerText.includes("另一页面已更新原始记录，未执行重建")`,
      "Changed source was not protected from rebuild",
    );
    await waitForDom(
      `document.activeElement?.id === "recall-center-live-status"`,
      "Source-change recovery did not move focus to the status message",
    );
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`), changedFutureRaw);
    assert.equal(await evaluate("document.body.innerText.includes('复习统计暂不可读')"), true);
    assert.equal(await evaluate("document.querySelector('.recall-center-summary__metrics')"), null);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll("button"))
      .find((entry) => entry.textContent.trim() === "队列暂不可读")?.disabled`), true);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll("button"))
      .find((entry) => entry.textContent.trim() === "复习结算已暂停")?.disabled`), true);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll("button"))
      .find((entry) => entry.textContent.trim() === "刷新后重新导出")?.disabled`), true);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll("button"))
      .find((entry) => entry.textContent.trim() === "重建本地复习记录")?.disabled`), true);

    await send("Page.reload", { ignoreCache: true });
    await waitForDom(
      `document.readyState === "complete" && Array.from(document.querySelectorAll("button"))
        .some((entry) => entry.textContent.trim() === "先导出原始备份")`,
      "Updated unknown-version snapshot did not reload",
    );
    await clickButton("先导出原始备份");
    await waitForDom(
      `globalThis.__recallBackupText === ${JSON.stringify(changedFutureRaw)}`,
      "Updated backup bytes did not match the latest snapshot",
    );
    assert.equal(await evaluate(`globalThis.__recallBackupDownload?.download.endsWith(".json") &&
      globalThis.__recallBackupDownload.href.startsWith("blob:")`), true);
    await clickButton("重建本地复习记录");
    await waitForDom(
      `Boolean(document.getElementById("recall-storage-rebuild-title"))`,
      "Final storage rebuild confirmation did not open",
    );
    await send("Emulation.setDeviceMetricsOverride", {
      width: 320,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    const rebuildLayout = await evaluate(`(() => {
      const dialog = document.querySelector(".recall-storage-rebuild-dialog")?.getBoundingClientRect();
      return {
        viewport: innerWidth,
        htmlWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        dialogLeft: dialog?.left ?? -1,
        dialogRight: dialog?.right ?? -1,
      };
    })()`);
    assert.equal(rebuildLayout.viewport, 320, JSON.stringify(rebuildLayout));
    assert.ok(rebuildLayout.htmlWidth <= 320, JSON.stringify(rebuildLayout));
    assert.ok(rebuildLayout.bodyWidth <= 320, JSON.stringify(rebuildLayout));
    assert.ok(rebuildLayout.dialogLeft >= 0 && rebuildLayout.dialogRight <= 320, JSON.stringify(rebuildLayout));
    await clickButton("确认重建");
    await waitForDom(
      `JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}))?.storageVersion === 1 &&
        !document.getElementById("recall-storage-recovery-title")`,
      "Confirmed rebuild did not create a valid v1 store",
    );
    await waitForDom(
      `document.activeElement?.id === "cloze-answer"`,
      "Confirmed rebuild did not move focus to the cloze textbox",
    );
    const rebuiltItemIds = await evaluate(`Object.keys(
      JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})).items
    )`);
    for (const requiredItemId of [
      "lexeme-ephemeral-adjective-transient",
      "lexeme-resilient-adjective-recover",
      "lexeme-serendipity-noun-fortunate-discovery",
    ]) {
      assert.ok(rebuiltItemIds.includes(requiredItemId));
    }
    const rebuiltWordKey = await evaluate(`JSON.parse(sessionStorage.getItem(
      ${JSON.stringify(CLOZE_SESSION_KEY)}
    ))?.wordKey`);
    const rebuiltAnswer = {
      "lexeme-ephemeral-adjective-transient": "ephemeral",
      "lexeme-resilient-adjective-recover": "resilient",
      "lexeme-serendipity-noun-fortunate-discovery": "serendipity",
    }[rebuiltWordKey];
    assert.ok(rebuiltAnswer, `Unexpected rebuilt word: ${rebuiltWordKey}`);
    assert.equal(await evaluate(`(() => {
      const input = document.getElementById("cloze-answer");
      const data = new DataTransfer();
      data.setData("text/plain", ${JSON.stringify(rebuiltAnswer)});
      return input?.dispatchEvent(new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      })) === false;
    })()`), true);
    await clickButton("检查答案");
    await waitForDom(
      `document.body.innerText.includes("辅助练习答对") || document.body.innerText.includes("独立拼写正确")`,
      "A cloze answer could not be completed after storage rebuild",
    );

    assert.deepEqual(browserProblems, []);
    console.log("recall browser integration verification passed (item recovery + storage rebuild + 1440px/390px/320px, console clean)");
  } finally {
    client?.close();
    await stopProcess(chromeProcess);
    await stopProcess(viteProcess);
    await rm(userDataDirectory, { recursive: true, force: true });
  }
}

await run();
