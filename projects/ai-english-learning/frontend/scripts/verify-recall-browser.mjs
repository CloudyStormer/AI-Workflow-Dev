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
  const resolvedMessage = typeof message === "function" ? message() : message;
  throw new Error(`${resolvedMessage}${lastError ? `: ${lastError.message}` : ""}`);
}

async function withTimeout(promise, message, timeoutMs = 2_000) {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
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

async function removeTemporaryDirectory(path) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function createFixture(domain) {
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
  const domain = await loadDomain();
  const rebuildLockName = domain.SPACED_RECALL_STORAGE_WRITE_LOCK;
  assert.equal(typeof rebuildLockName, "string");
  const fixture = await createFixture(domain);
  const vitePort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${vitePort}`;
  const userDataDirectory = await mkdtemp(join(tmpdir(), "english-recall-cdp-"));
  let debugPort;
  let viteProcess;
  let chromeProcess;
  let client;
  let secondaryTargetId;
  let secondarySessionId;
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
    viteProcess.once("error", (error) => {
      viteError += `\n${error.message}`;
    });
    await waitFor(async () => {
      const response = await fetch(`${baseUrl}/word`);
      return response.ok;
    }, () => `Vite did not become ready${viteError ? ` (${viteError.trim()})` : ""}`);

    debugPort = await getFreePort();
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
    chromeProcess.once("error", (error) => {
      chromeError += `\n${error.message}`;
    });
    const version = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      return response.ok ? response.json() : null;
    }, () => `Chrome CDP did not become ready${chromeError ? ` (${chromeError.trim()})` : ""}`);

    client = await CdpClient.connect(version.webSocketDebuggerUrl);
    const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
    const send = (method, params = {}) => client.send(method, params, sessionId);
    const trackedSessionIds = new Set([sessionId]);
    client.on("Runtime.exceptionThrown", (message) => {
      if (trackedSessionIds.has(message.sessionId)) {
        browserProblems.push(`exception: ${message.params.exceptionDetails.text}`);
      }
    });
    client.on("Log.entryAdded", (message) => {
      if (trackedSessionIds.has(message.sessionId) && ["error", "warning"].includes(message.params.entry.level)) {
        browserProblems.push(`${message.params.entry.level}: ${message.params.entry.text}`);
      }
    });
    client.on("Runtime.consoleAPICalled", (message) => {
      if (!trackedSessionIds.has(message.sessionId) || !["error", "warning"].includes(message.params.type)) return;
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
      globalThis.__recallBackupDownloads = [];
      globalThis.__recallBackupError = null;
      globalThis.__recallBackupObjectUrl = null;
      const createObjectUrl = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (value) => {
        const objectUrl = createObjectUrl(value);
        if (value instanceof Blob) {
          globalThis.__recallBackupText = null;
          globalThis.__recallBackupError = null;
          globalThis.__recallBackupObjectUrl = objectUrl;
          value.text()
            .then((text) => { globalThis.__recallBackupText = text; })
            .catch((error) => { globalThis.__recallBackupError = String(error); });
        }
        return objectUrl;
      };
      const nativeAnchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function click() {
        if (this.hasAttribute("download") || this.href.startsWith("blob:")) {
          globalThis.__recallBackupDownload = {
            download: this.download,
            href: this.href,
            nativeClickSuppressed: true,
          };
          globalThis.__recallBackupDownloads.push(globalThis.__recallBackupDownload);
          return;
        }
        return nativeAnchorClick.call(this);
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

    async function evaluateInSession(targetSessionId, expression) {
      const result = await client.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
      }, targetSessionId);
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    }

    async function evaluate(expression) {
      return evaluateInSession(sessionId, expression);
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
    await send("Page.bringToFront");
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
    assert.equal(await evaluate(`(() => {
      const button = document.querySelector(".recall-attempt-banner button");
      if (!button || button.textContent.trim() !== "跳过本题") return false;
      button.click();
      button.click();
      return true;
    })()`), true);
    await waitForDom(
      `JSON.parse(sessionStorage.getItem(${JSON.stringify(CLOZE_SESSION_KEY)}))?.wordKey !==
          "lexeme-resilient-adjective-recover" &&
        (() => {
          const counts = Object.values(JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}))
            ?.items?.["lexeme-resilient-adjective-recover"]?.skipCountsByDay ?? {});
          return counts.length === 1 && counts[0] === 1;
        })()`,
      "Rapid active-recall skip did not settle exactly once before navigating",
    );
    assert.equal(await evaluate(`document.body.innerText.includes("正在安全保存…")`), false);
    await clickButton("查看队列");
    await waitForDom(`Boolean(document.querySelector('[role="dialog"]'))`, "Recall dialog did not reopen after starting");

    const recovered = await clickItemAction("ephemeral", "恢复这条记录");
    assert.equal(recovered, true);
    await waitForDom(
      `document.querySelectorAll(".recall-queue-group--exception .recall-queue-item").length === 1 &&
        document.body.innerText.includes("异常记录已恢复为单一当前任务")`,
      "Isolated item did not recover",
    );
    await waitForDom(
      `document.activeElement?.id === "recall-center-tab-queue"`,
      "Recovered item did not return focus to the queue tab",
    );

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

    assert.equal(await evaluate(`(() => {
      const inputs = Array.from(document.querySelectorAll('.recall-settings input[type="time"]'));
      const checkbox = document.querySelector('.recall-settings input[type="checkbox"]');
      if (inputs.length !== 3 || !checkbox) return false;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      const checkedSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked").set;
      const updateValue = (input, value) => {
        valueSetter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const updateChecked = (value) => {
        checkedSetter.call(checkbox, value);
        checkbox.dispatchEvent(new Event("input", { bubbles: true }));
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      };
      updateValue(inputs[0], "19:15");
      updateValue(inputs[1], "23:10");
      updateValue(inputs[2], "07:20");
      updateChecked(false);
      updateValue(inputs[0], "19:45");
      updateChecked(true);
      return true;
    })()`), true);
    await waitForDom(
      `(() => {
        const settings = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})).reminderSettings;
        return settings.enabled === true && settings.paused === false &&
          settings.localTime === "19:45" && settings.quietStart === "23:10" &&
          settings.quietEnd === "07:20";
      })()`,
      "Rapid reminder edits did not persist the final combined user intent",
    );
    assert.equal(await evaluate(`(() => {
      const settings = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})).reminderSettings;
      return JSON.stringify(settings);
    })()`), JSON.stringify({
      enabled: true,
      paused: false,
      localTime: "19:45",
      quietStart: "23:10",
      quietEnd: "07:20",
    }));
    const validReminderRaw = await evaluate(
      `localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`,
    );
    assert.equal(await evaluate(`(() => {
      const input = document.querySelector('.recall-settings input[type="time"]');
      if (!input) return false;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      valueSetter.call(input, "");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`), true);
    await waitForDom(
      `document.body.innerText.includes("提醒时间格式无效；本次没有保存") &&
        document.querySelector('.recall-settings input[type="time"]')?.value === "19:45"`,
      "Invalid empty reminder time did not fail closed and restore the last valid value",
    );
    assert.equal(
      await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`),
      validReminderRaw,
      "An invalid reminder edit must not corrupt the persisted v1 state",
    );

    // Exercise the real React save path when Storage.setItem returns without
    // making the requested bytes observable. The UI must describe the result
    // as unverifiable (not a definite failure), keep the last verified draft,
    // and recover its truth boundary after a later exact-readback save.
    assert.equal(await evaluate(`(() => {
      const nativeSetItem = Storage.prototype.setItem;
      let intercepted = false;
      Storage.prototype.setItem = function (key, value) {
        if (!intercepted && key === ${JSON.stringify(STORAGE_KEY)}) {
          intercepted = true;
          globalThis.__recallSwallowedWrite = value;
          Storage.prototype.setItem = nativeSetItem;
          return;
        }
        return nativeSetItem.call(this, key, value);
      };
      return true;
    })()`), true);
    assert.equal(await evaluate(`(() => {
      const input = document.querySelector('.recall-settings input[type="time"]');
      if (!input) return false;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      valueSetter.call(input, "18:30");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`), true);
    await waitForDom(
      `document.body.innerText.includes("本次保存结果无法回读核验；可能已写入，也可能未完成") &&
        document.querySelector('.recall-center-truth-boundary')?.innerText.includes(
          "保存结果暂时无法回读核验；可能已写入，也可能未完成"
        ) &&
        document.querySelector('.recall-settings input[type="time"]')?.value === "19:45"`,
      "An unverifiable React save did not report uncertainty and restore the last verified draft",
    );
    assert.equal(
      await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`),
      validReminderRaw,
      "The swallowed React write must leave the last verified bytes intact",
    );
    assert.equal(
      await evaluate(`document.body.innerText.includes("复习记录暂时无法保存，本次没有伪装成已同步")`),
      false,
      "An unverifiable write must not be described as a definite save failure",
    );

    assert.equal(await evaluate(`(() => {
      const input = document.querySelector('.recall-settings input[type="time"]');
      if (!input) return false;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      valueSetter.call(input, "18:45");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`), true);
    await waitForDom(
      `(() => {
        const persisted = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
        const truth = document.querySelector('.recall-center-truth-boundary')?.innerText ?? "";
        return persisted.reminderSettings.localTime === "18:45" &&
          truth.includes("复习记录只保存在当前浏览器与当前设备") &&
          !truth.includes("保存结果暂时无法回读核验");
      })()`,
      "A later verified React save did not restore the ready truth boundary",
    );

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

    const secondaryTarget = await client.send("Target.createTarget", { url: "about:blank" });
    secondaryTargetId = secondaryTarget.targetId;
    const secondaryAttachment = await client.send("Target.attachToTarget", {
      targetId: secondaryTargetId,
      flatten: true,
    });
    secondarySessionId = secondaryAttachment.sessionId;
    trackedSessionIds.add(secondarySessionId);
    await client.send("Page.enable", {}, secondarySessionId);
    await client.send("Runtime.enable", {}, secondarySessionId);
    await client.send("Log.enable", {}, secondarySessionId);
    await client.send("Page.navigate", { url: `${baseUrl}/word` }, secondarySessionId);
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `document.readyState === "complete" && location.pathname === "/word"`,
      ),
      "Second tab did not load the same-origin Word page",
    );
    assert.equal(await evaluate("typeof navigator.locks?.request"), "function");
    assert.equal(
      await evaluateInSession(secondarySessionId, "typeof navigator.locks?.request"),
      "function",
    );
    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      const nativeRequest = navigator.locks.request.bind(navigator.locks);
      globalThis.__recallProductionLockRequests = [];
      globalThis.__holdNextProductionWrite = false;
      Object.defineProperty(navigator.locks, "request", {
        configurable: true,
        value(name, options, callback) {
          globalThis.__recallProductionLockRequests.push({
            name,
            mode: options?.mode ?? null,
            ifAvailable: options?.ifAvailable ?? false,
          });
          if (
            globalThis.__holdNextProductionWrite &&
            name === ${JSON.stringify(rebuildLockName)}
          ) {
            globalThis.__holdNextProductionWrite = false;
            const request = nativeRequest(name, options, async (lock) => {
              const result = await callback(lock);
              globalThis.__productionWriterCallbackResult = result;
              globalThis.__productionWriterRaw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
              globalThis.__productionWriterLockHeld = true;
              await new Promise((resolve) => {
                globalThis.__releaseProductionWriter = resolve;
              });
              return result;
            });
            globalThis.__productionWriterRequest = request.then(
              (result) => {
                globalThis.__productionWriterRequestDone = true;
                globalThis.__productionWriterRequestResult = result;
              },
              (error) => {
                globalThis.__productionWriterRequestDone = true;
                globalThis.__productionWriterRequestError = String(error);
              },
            );
            return request;
          }
          return nativeRequest(name, options, callback);
        },
      });
      return true;
    })()`), true);
    await evaluateInSession(secondarySessionId, "new Promise((resolve) => setTimeout(resolve, 150))");
    const secondaryBaselineRaw = await evaluateInSession(
      secondarySessionId,
      `localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`,
    );
    assert.equal(JSON.parse(secondaryBaselineRaw).storageVersion, 1);
    await evaluateInSession(secondarySessionId, "globalThis.__recallProductionLockRequests = []");

    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      const open = Array.from(document.querySelectorAll("button"))
        .find((entry) => entry.textContent.trim() === "查看队列");
      open?.click();
      return Boolean(open);
    })()`), true);
    await waitFor(
      () => evaluateInSession(secondarySessionId, `Boolean(document.querySelector("[role=dialog]"))`),
      "Second tab queue did not open for lock-busy item-action verification",
    );
    assert.equal(await evaluate(`(() => {
      globalThis.__busyItemWriteLockHeld = false;
      globalThis.__busyItemWriteLockPromise = navigator.locks.request(
        ${JSON.stringify(rebuildLockName)},
        { mode: "exclusive" },
        async () => {
          globalThis.__busyItemWriteLockHeld = true;
          await new Promise((resolve) => {
            globalThis.__releaseBusyItemWriteLock = resolve;
          });
        },
      );
      return true;
    })()`), true);
    await waitForDom(
      `globalThis.__busyItemWriteLockHeld === true`,
      "Test lock holder did not acquire the shared production write lock",
    );
    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      const skip = document.querySelector(".recall-center-dialog .recall-item-actions__skip");
      skip?.click();
      return Boolean(skip);
    })()`), true);
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `document.body.innerText.includes("另一页面正在写入本地复习记录；本次未保存或推进，请稍后重试") &&
          !document.body.innerText.includes("正在安全保存跳过结果") &&
          !document.querySelector('.recall-center-truth-boundary')?.innerText.includes(
            "保存结果暂时无法回读核验"
          ) &&
          document.activeElement?.id === "recall-center-tab-queue"`,
      ),
      "Lock-busy item action did not clear pending, report failure, and restore queue focus",
    );
    assert.deepEqual(
      await evaluateInSession(secondarySessionId, "globalThis.__recallProductionLockRequests"),
      [{ name: rebuildLockName, mode: "exclusive", ifAvailable: true }],
    );
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`), secondaryBaselineRaw);
    await evaluate(`(async () => {
      globalThis.__releaseBusyItemWriteLock();
      await globalThis.__busyItemWriteLockPromise;
      return true;
    })()`);
    await evaluateInSession(secondarySessionId, "globalThis.__recallProductionLockRequests = []");

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

    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      const open = Array.from(document.querySelectorAll("button"))
        .find((entry) => entry.textContent.trim() === "查看队列");
      open?.click();
      return Boolean(open);
    })()`), true);
    await waitFor(
      () => evaluateInSession(secondarySessionId, `Boolean(document.querySelector("[role=dialog]"))`),
      "Second tab queue did not open for the production writer check",
    );
    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      const skip = document.querySelector(".recall-center-dialog .recall-item-actions__skip");
      skip?.click();
      return Boolean(skip);
    })()`), true);
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `document.body.innerText.includes("检测到另一页面更新了复习记录，已停止覆盖；请刷新后继续") &&
          !document.body.innerText.includes("正在安全保存跳过结果") &&
          document.activeElement?.id === "recall-center-tab-queue"`,
      ),
      "Production normal writer did not fail closed over the unknown-version source",
    );
    assert.deepEqual(
      await evaluateInSession(secondarySessionId, "globalThis.__recallProductionLockRequests"),
      [{ name: rebuildLockName, mode: "exclusive", ifAvailable: true }],
      "The real Word save path must use the same exclusive write lock as rebuild",
    );
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`), futureRaw);

    await clickButton("先导出原始备份");
    await waitForDom(
      `globalThis.__recallBackupText === ${JSON.stringify(futureRaw)}`,
      "Exported backup bytes did not match the unknown-version snapshot",
    );
    assert.equal(await evaluate("globalThis.__recallBackupError"), null);
    assert.equal(await evaluate(`globalThis.__recallBackupDownload?.download.startsWith(
      "ai-english-learning-recall-backup-"
    ) && globalThis.__recallBackupDownload.download.endsWith(".json") &&
      globalThis.__recallBackupDownload.href === globalThis.__recallBackupObjectUrl &&
      globalThis.__recallBackupDownload.nativeClickSuppressed === true &&
      globalThis.__recallBackupDownloads.length === 1`), true);
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
    await evaluateInSession(secondarySessionId, `(() => {
      localStorage.setItem(
        ${JSON.stringify(STORAGE_KEY)},
        ${JSON.stringify(secondaryBaselineRaw)},
      );
      globalThis.__recallProductionLockRequests = [];
      globalThis.__productionWriterCallbackResult = null;
      globalThis.__productionWriterRaw = null;
      globalThis.__productionWriterLockHeld = false;
      globalThis.__productionWriterRequestDone = false;
      globalThis.__productionWriterRequestResult = null;
      globalThis.__productionWriterRequestError = null;
      globalThis.__holdNextProductionWrite = true;
      globalThis.__recallRaceStorageEvents = [];
      addEventListener("storage", (event) => {
        if (event.key === ${JSON.stringify(STORAGE_KEY)}) {
          globalThis.__recallRaceStorageEvents.push(event.newValue);
        }
      });
      return true;
    })()`);
    await evaluate(`(() => {
      globalThis.__recallRaceStorageEvents = [];
      addEventListener("storage", (event) => {
        if (event.key === ${JSON.stringify(STORAGE_KEY)}) {
          globalThis.__recallRaceStorageEvents.push(event.newValue);
        }
      });
      return true;
    })()`);
    await evaluate("new Promise((resolve) => setTimeout(resolve, 80))");
    await evaluate("globalThis.__recallRaceStorageEvents = []");
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`), secondaryBaselineRaw);
    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      const skip = document.querySelector(".recall-center-dialog .recall-item-actions__skip");
      skip?.click();
      return Boolean(skip);
    })()`), true);
    await waitFor(
      () => evaluateInSession(secondarySessionId, "globalThis.__productionWriterLockHeld === true"),
      "Real second-tab Word action did not acquire and hold the production write lock",
    );
    const productionNewRaw = await evaluateInSession(
      secondarySessionId,
      "globalThis.__productionWriterRaw",
    );
    assert.notEqual(productionNewRaw, secondaryBaselineRaw);
    assert.equal(JSON.parse(productionNewRaw).storageVersion, 1);
    assert.equal(await evaluateInSession(
      secondarySessionId,
      "globalThis.__productionWriterCallbackResult",
    ), "saved");
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `document.body.innerText.includes("正在安全保存跳过结果") &&
          document.querySelector(".recall-center-dialog .recall-item-actions__skip")?.disabled === true`,
      ),
      "Real second-tab Word action did not keep its UI pending while the production lock was held",
    );
    assert.deepEqual(
      await evaluateInSession(secondarySessionId, "globalThis.__recallProductionLockRequests"),
      [{ name: rebuildLockName, mode: "exclusive", ifAvailable: true }],
      "The successful real Word writer must use the shared exclusive write lock",
    );
    assert.deepEqual(
      await evaluate("globalThis.__recallRaceStorageEvents"),
      [productionNewRaw],
      "The rebuilding tab must observe the real production writer's new value",
    );
    assert.equal(await evaluate(`(() => {
      const nativeRequest = navigator.locks.request.bind(navigator.locks);
      globalThis.__recallRebuildLockRequestCount = 0;
      Object.defineProperty(navigator.locks, "request", {
        configurable: true,
        value(name, options, callback) {
          if (name === ${JSON.stringify(rebuildLockName)}) {
            globalThis.__recallRebuildLockRequestCount += 1;
          }
          return nativeRequest(name, options, callback);
        },
      });
      return true;
    })()`), true);

    assert.equal(await evaluate(`(() => {
      const button = Array.from(document.querySelectorAll("button"))
        .find((entry) => entry.textContent.trim() === "确认重建");
      if (!button) return false;
      button.click();
      button.click();
      return true;
    })()`), true);
    await waitForDom(
      `!document.getElementById("recall-storage-rebuild-title") &&
        document.body.innerText.includes("另一页面正在写入本地复习记录，本次未执行重建")`,
      "Busy cross-tab lock did not fail rebuild closed without waiting",
    );
    assert.equal(await evaluate("globalThis.__recallRebuildLockRequestCount"), 1);
    assert.deepEqual(await evaluate(`navigator.locks.query().then((value) => ({
      held: (value.held ?? []).filter((entry) => entry.name === ${JSON.stringify(rebuildLockName)}).length,
      pending: (value.pending ?? []).filter((entry) => entry.name === ${JSON.stringify(rebuildLockName)}).length,
    }))`), { held: 1, pending: 0 });
    await waitForDom(
      `document.activeElement?.id === "recall-center-live-status" ||
        document.activeElement?.textContent.trim() === "重建本地复习记录"`,
      "Busy-lock result did not return focus to a reachable recovery control or status",
    );
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`), productionNewRaw);

    const secondaryRaceResult = await evaluateInSession(secondarySessionId, `(async () => {
      globalThis.__releaseProductionWriter();
      await globalThis.__productionWriterRequest;
      return {
        done: globalThis.__productionWriterRequestDone,
        result: globalThis.__productionWriterRequestResult,
        error: globalThis.__productionWriterRequestError,
        raw: localStorage.getItem(${JSON.stringify(STORAGE_KEY)}),
      };
    })()`);
    assert.deepEqual(secondaryRaceResult, {
      done: true,
      result: "saved",
      error: null,
      raw: productionNewRaw,
    });
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `(document.body.innerText.includes("已移到当前队列末尾") ||
          document.body.innerText.includes("已安排到下一个学习日")) &&
          !document.body.innerText.includes("正在安全保存跳过结果") &&
          document.activeElement?.id === "recall-center-tab-queue"`,
      ),
      "Real second-tab writer did not clear pending, report success, and restore queue focus",
    );

    await clickButton("重建本地复习记录");
    await waitForDom(
      `Boolean(document.getElementById("recall-storage-rebuild-title"))`,
      "Storage rebuild confirmation did not reopen after the busy lock",
    );
    await clickButton("确认重建");
    await waitForDom(
      `document.body.innerText.includes("另一页面已更新原始记录，未执行重建")`,
      "Unlocked retry did not re-read the newer second-tab source",
    );
    await waitForDom(
      `document.activeElement?.id === "recall-center-live-status"`,
      "Source-change recovery did not move focus to the status message",
    );
    assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`), productionNewRaw);
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
    assert.equal(
      await evaluateInSession(
        secondarySessionId,
        `localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`,
      ),
      productionNewRaw,
    );
    assert.deepEqual(
      await evaluateInSession(secondarySessionId, "globalThis.__recallRaceStorageEvents"),
      [],
      "The rebuilding tab must never write a transient v1 value over the newer tab",
    );
    await waitFor(
      async () => {
        const snapshot = await evaluate(`navigator.locks.query().then((value) => ({
          held: (value.held ?? []).filter((entry) => entry.name === ${JSON.stringify(rebuildLockName)}).length,
          pending: (value.pending ?? []).filter((entry) => entry.name === ${JSON.stringify(rebuildLockName)}).length,
        }))`);
        return snapshot.held === 0 && snapshot.pending === 0;
      },
      "Cross-context rebuild lock was not released after the race",
    );
    const changedFutureRaw = JSON.stringify({
      storageVersion: 99,
      revision: 8,
      sentinel: "另一页面的新原始记录",
    });
    await evaluate(`localStorage.setItem(
      ${JSON.stringify(STORAGE_KEY)},
      ${JSON.stringify(changedFutureRaw)},
    )`);

    await send("Page.reload", { ignoreCache: true });
    await send("Page.bringToFront");
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
    assert.equal(await evaluate("globalThis.__recallBackupError"), null);
    assert.equal(await evaluate(`globalThis.__recallBackupDownload?.download.endsWith(".json") &&
      globalThis.__recallBackupDownload.href === globalThis.__recallBackupObjectUrl &&
      globalThis.__recallBackupDownload.nativeClickSuppressed === true &&
      globalThis.__recallBackupDownloads.length === 1`), true);
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
    const rebuiltGenerationRaw = await evaluate(
      `localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`,
    );
    await client.send("Page.bringToFront", {}, secondarySessionId);
    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      globalThis.__recallProductionLockRequests = [];
      const skip = document.querySelector(".recall-center-dialog .recall-item-actions__skip");
      skip?.click();
      return Boolean(skip);
    })()`), true);
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `document.body.innerText.includes("检测到另一页面的新记录，已安全刷新；请重试刚才的操作") &&
          !document.body.innerText.includes("正在安全保存跳过结果") &&
          document.activeElement?.id === "recall-center-tab-queue"`,
      ),
      "A pre-rebuild real Word tab did not fail its stale post-rebuild save closed",
    );
    assert.deepEqual(
      await evaluateInSession(secondarySessionId, "globalThis.__recallProductionLockRequests"),
      [{ name: rebuildLockName, mode: "exclusive", ifAvailable: true }],
      "The stale post-rebuild Word action must still use the production write lock",
    );
    assert.equal(
      await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`),
      rebuiltGenerationRaw,
      "A pre-rebuild tab must not overwrite the rebuilt generation after the lock is released",
    );
    assert.equal(
      await evaluateInSession(
        secondarySessionId,
        `localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`,
      ),
      rebuiltGenerationRaw,
    );
    trackedSessionIds.delete(secondarySessionId);
    await client.send("Target.closeTarget", { targetId: secondaryTargetId });
    secondaryTargetId = undefined;
    secondarySessionId = undefined;

    // Prove the equal-value ABA boundary with two real destructive rebuilds
    // and a stale React writer. A fixed business clock makes both rebuilt
    // envelopes byte-identical after omitting `generation`; generation itself
    // must still rotate. The old tab then edits reminder settings through the
    // production UI and must fail closed instead of overwriting the new epoch.
    const abaClockStorageKey = "__recall_cdp_aba_clock__";
    const abaFrozenInstant = new Date().toISOString();
    const fixedBusinessClockSource = `(() => {
      try {
        const frozenInstant = localStorage.getItem(${JSON.stringify(abaClockStorageKey)});
        if (!frozenInstant) return;
        const NativeDate = Date;
        class FixedDate extends NativeDate {
          constructor(...args) {
            super(...(args.length > 0 ? args : [frozenInstant]));
          }
          static now() {
            return NativeDate.parse(frozenInstant);
          }
        }
        Object.defineProperty(globalThis, "Date", {
          configurable: true,
          writable: true,
          value: FixedDate,
        });
      } catch {}
    })();`;
    await send("Page.addScriptToEvaluateOnNewDocument", { source: fixedBusinessClockSource });

    async function prepareEqualValueAbaRebuild(raw, label) {
      await evaluate(`(() => {
        localStorage.setItem(${JSON.stringify(abaClockStorageKey)}, ${JSON.stringify(abaFrozenInstant)});
        localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(raw)});
        sessionStorage.removeItem(${JSON.stringify(CLOZE_SESSION_KEY)});
        return true;
      })()`);
      await send("Page.reload", { ignoreCache: true });
      await send("Page.bringToFront");
      await waitForDom(
        `document.readyState === "complete" && document.body.innerText.includes("当前版本无法识别") &&
          Array.from(document.querySelectorAll("button"))
            .some((entry) => entry.textContent.trim() === "先导出原始备份")`,
        `${label}: unknown-version recovery controls did not render`,
      );
      await clickButton("先导出原始备份");
      await waitForDom(
        `globalThis.__recallBackupText === ${JSON.stringify(raw)}`,
        `${label}: exported backup did not preserve the exact ABA source bytes`,
      );
      assert.equal(await evaluate("globalThis.__recallBackupError"), null);
      assert.equal(await evaluate(`globalThis.__recallBackupDownload?.nativeClickSuppressed === true &&
        globalThis.__recallBackupDownloads.length === 1`), true);
      await clickButton("重建本地复习记录");
      await waitForDom(
        `Boolean(document.getElementById("recall-storage-rebuild-title"))`,
        `${label}: rebuild confirmation did not open`,
      );
    }

    async function confirmEqualValueAbaRebuild(label) {
      // The rebuild generation receives a real UUID, while any later attempt
      // identifier created by the cloze activation is stable across the two
      // rebuilds. This keeps the persisted business envelope exactly equal
      // without weakening the production generation rotation.
      await evaluate(`(() => {
        const nativeRandomUuid = crypto.randomUUID.bind(crypto);
        globalThis.__recallAbaUuidCalls = 0;
        Object.defineProperty(crypto, "randomUUID", {
          configurable: true,
          value() {
            globalThis.__recallAbaUuidCalls += 1;
            return globalThis.__recallAbaUuidCalls === 1
              ? nativeRandomUuid()
              : "a11ce000-0000-4000-8000-000000000001";
          },
        });
        return true;
      })()`);
      await clickButton("确认重建");
      await waitForDom(
        `JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}))?.storageVersion === 1 &&
          !document.getElementById("recall-storage-recovery-title")`,
        `${label}: confirmed rebuild did not create a valid current-version store`,
      );
      await waitForDom(
        `document.activeElement?.id === "cloze-answer"`,
        `${label}: confirmed rebuild did not restore the cloze focus target`,
      );
      assert.ok(
        await evaluate("globalThis.__recallAbaUuidCalls >= 2"),
        `${label}: generation and stable attempt identifiers were not both created`,
      );
      return evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
    }

    const abaUnknownRawOne = JSON.stringify({
      storageVersion: 99,
      revision: 41,
      sentinel: "ABA 中间态 B-1",
    });
    await prepareEqualValueAbaRebuild(abaUnknownRawOne, "ABA first rebuild");
    const abaGenerationOneRaw = await confirmEqualValueAbaRebuild("ABA first rebuild");
    const abaGenerationOne = JSON.parse(abaGenerationOneRaw);
    assert.ok(abaGenerationOne.generation, "The first rebuilt envelope did not include generation");

    const sharedRecallSession = await evaluate(`(() => {
      const key = Object.keys(sessionStorage)
        .find((entry) => entry.startsWith("ai-english-learning:recall-session:"));
      return key ? { key, value: sessionStorage.getItem(key) } : null;
    })()`);
    assert.ok(sharedRecallSession?.key && sharedRecallSession.value);

    const abaSecondaryTarget = await client.send("Target.createTarget", { url: "about:blank" });
    secondaryTargetId = abaSecondaryTarget.targetId;
    const abaSecondaryAttachment = await client.send("Target.attachToTarget", {
      targetId: secondaryTargetId,
      flatten: true,
    });
    secondarySessionId = abaSecondaryAttachment.sessionId;
    trackedSessionIds.add(secondarySessionId);
    await client.send("Page.enable", {}, secondarySessionId);
    await client.send("Runtime.enable", {}, secondarySessionId);
    await client.send("Log.enable", {}, secondarySessionId);
    await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `${fixedBusinessClockSource}\n(() => {
        try {
          sessionStorage.setItem(
            ${JSON.stringify(sharedRecallSession.key)},
            ${JSON.stringify(sharedRecallSession.value)},
          );
          class AbaTestNotification {
            static permission = "denied";
            static requestPermission = async () => "denied";
            close() {}
          }
          Object.defineProperty(globalThis, "Notification", {
            configurable: true,
            value: AbaTestNotification,
          });
        } catch {}
      })();`,
    }, secondarySessionId);
    await client.send("Page.navigate", { url: `${baseUrl}/word` }, secondarySessionId);
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `document.readyState === "complete" && location.pathname === "/word" &&
          Array.from(document.querySelectorAll("button"))
            .some((entry) => entry.textContent.trim() === "查看队列")`,
      ),
      "ABA stale tab did not load the first rebuilt generation",
    );
    await evaluateInSession(secondarySessionId, "new Promise((resolve) => setTimeout(resolve, 250))");
    assert.equal(
      await evaluateInSession(
        secondarySessionId,
        `localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`,
      ),
      abaGenerationOneRaw,
      "Loading the stale ABA tab unexpectedly changed the first generation bytes",
    );
    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      const open = Array.from(document.querySelectorAll("button"))
        .find((entry) => entry.textContent.trim() === "查看队列");
      open?.click();
      return Boolean(open);
    })()`), true);
    await waitFor(
      () => evaluateInSession(secondarySessionId, `Boolean(document.querySelector("[role=dialog]"))`),
      "ABA stale tab queue did not open",
    );
    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      const settings = Array.from(document.querySelectorAll("button"))
        .find((entry) => entry.textContent.trim() === "提醒与时区");
      settings?.click();
      return Boolean(settings);
    })()`), true);
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `document.querySelector('.recall-settings input[type="time"]')?.value === "20:00"`,
      ),
      "ABA stale tab reminder settings did not render the generation-A value",
    );
    await evaluateInSession(secondarySessionId, `(() => {
      globalThis.__recallProductionLockRequests = [];
      globalThis.__recallAbaStorageEvents = [];
      addEventListener("storage", (event) => {
        if (event.key === ${JSON.stringify(STORAGE_KEY)}) {
          globalThis.__recallAbaStorageEvents.push(event.newValue);
        }
      });
      const nativeRequest = navigator.locks.request.bind(navigator.locks);
      Object.defineProperty(navigator.locks, "request", {
        configurable: true,
        value(name, options, callback) {
          globalThis.__recallProductionLockRequests.push({
            name,
            mode: options?.mode ?? null,
            ifAvailable: options?.ifAvailable ?? false,
          });
          return nativeRequest(name, options, callback);
        },
      });
      return true;
    })()`);

    const abaUnknownRawTwo = JSON.stringify({
      storageVersion: 99,
      revision: 42,
      sentinel: "ABA 中间态 B-2",
    });
    await prepareEqualValueAbaRebuild(abaUnknownRawTwo, "ABA second rebuild");
    await evaluateInSession(secondarySessionId, "globalThis.__recallAbaStorageEvents = []");
    const abaGenerationTwoRaw = await confirmEqualValueAbaRebuild("ABA second rebuild");
    const abaGenerationTwo = JSON.parse(abaGenerationTwoRaw);
    assert.ok(abaGenerationTwo.generation, "The second rebuilt envelope did not include generation");
    assert.notEqual(
      abaGenerationTwo.generation,
      abaGenerationOne.generation,
      "A destructive rebuild must rotate generation even when business data returns to A",
    );
    const abaBusinessOne = structuredClone(abaGenerationOne);
    const abaBusinessTwo = structuredClone(abaGenerationTwo);
    delete abaBusinessOne.generation;
    delete abaBusinessTwo.generation;
    assert.deepEqual(
      abaBusinessTwo,
      abaBusinessOne,
      "The browser ABA fixture must return to the exact same business value after omitting generation",
    );
    assert.notEqual(abaGenerationTwoRaw, abaGenerationOneRaw);
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `globalThis.__recallAbaStorageEvents.includes(${JSON.stringify(abaGenerationTwoRaw)})`,
      ),
      "The stale ABA tab did not observe the replacement generation storage event",
    );

    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      const input = document.querySelector('.recall-settings input[type="checkbox"]');
      input?.click();
      return Boolean(input);
    })()`), true);
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `document.body.innerText.includes("检测到另一页面的新记录，已安全刷新；请重试刚才的操作") &&
          document.querySelector('.recall-settings input[type="checkbox"]')?.checked === false`,
      ),
      "The stale generation-A React writer did not fail closed and refresh generation B",
    );
    assert.deepEqual(
      await evaluateInSession(secondarySessionId, "globalThis.__recallProductionLockRequests"),
      [{ name: rebuildLockName, mode: "exclusive", ifAvailable: true }],
      "The stale ABA attempt must use the real shared production write lock",
    );
    assert.equal(
      await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`),
      abaGenerationTwoRaw,
      "The stale React writer overwrote the new generation after an equal-value ABA",
    );
    assert.equal(
      await evaluateInSession(
        secondarySessionId,
        `localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`,
      ),
      abaGenerationTwoRaw,
    );
    assert.equal(
      JSON.parse(await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`))
        .reminderSettings.enabled,
      false,
      "The stale generation-A reminder setting leaked into the rebuilt generation",
    );
    assert.equal(await evaluateInSession(secondarySessionId, `(() => {
      const input = document.querySelector('.recall-settings input[type="checkbox"]');
      input?.click();
      return Boolean(input);
    })()`), true);
    await waitFor(
      () => evaluateInSession(
        secondarySessionId,
        `(() => {
          const stored = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
          return stored.generation === ${JSON.stringify(abaGenerationTwo.generation)} &&
            stored.reminderSettings.enabled === true &&
            document.querySelector('.recall-settings input[type="checkbox"]')?.checked === true &&
            document.body.innerText.includes("提醒偏好已保存为 20:00");
        })()`,
      ),
      "The refreshed generation-B React writer did not save successfully with generation B",
    );
    const abaGenerationTwoSavedRaw = await evaluateInSession(
      secondarySessionId,
      `localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`,
    );
    assert.equal(JSON.parse(abaGenerationTwoSavedRaw).generation, abaGenerationTwo.generation);
    assert.deepEqual(
      await evaluateInSession(secondarySessionId, "globalThis.__recallProductionLockRequests"),
      [
        { name: rebuildLockName, mode: "exclusive", ifAvailable: true },
        { name: rebuildLockName, mode: "exclusive", ifAvailable: true },
      ],
      "Both the stale rejection and refreshed generation-B save must use the production write lock",
    );
    assert.equal(
      await evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`),
      abaGenerationTwoSavedRaw,
      "The verified generation-B retry was not observed consistently by both tabs",
    );
    await waitFor(
      async () => {
        const snapshots = await Promise.all([
          evaluate(`navigator.locks.query().then((value) => ({
            held: (value.held ?? []).filter((entry) => entry.name === ${JSON.stringify(rebuildLockName)}).length,
            pending: (value.pending ?? []).filter((entry) => entry.name === ${JSON.stringify(rebuildLockName)}).length,
          }))`),
          evaluateInSession(secondarySessionId, `navigator.locks.query().then((value) => ({
            held: (value.held ?? []).filter((entry) => entry.name === ${JSON.stringify(rebuildLockName)}).length,
            pending: (value.pending ?? []).filter((entry) => entry.name === ${JSON.stringify(rebuildLockName)}).length,
          }))`),
        ]);
        return snapshots.every((snapshot) => snapshot.held === 0 && snapshot.pending === 0);
      },
      "The shared write lock leaked after the equal-value ABA rejection",
    );
    trackedSessionIds.delete(secondarySessionId);
    await client.send("Target.closeTarget", { targetId: secondaryTargetId });
    secondaryTargetId = undefined;
    secondarySessionId = undefined;

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
    console.log("recall browser integration verification passed (item recovery + equal-value A→B→A generation guard + storage rebuild + 1440px/390px/320px, console clean)");
  } finally {
    if (client && secondaryTargetId) {
      try {
        await withTimeout(
          client.send("Target.closeTarget", { targetId: secondaryTargetId }),
          "Timed out while closing the secondary CDP target",
        );
      } catch {}
    }
    client?.close();
    await Promise.allSettled([
      stopProcess(chromeProcess),
      stopProcess(viteProcess),
    ]);
    await removeTemporaryDirectory(userDataDirectory);
  }
}

await run();
