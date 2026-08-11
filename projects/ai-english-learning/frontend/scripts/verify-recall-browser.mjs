import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import ts from "typescript";

const STORAGE_KEY = "ai-english-learning:spaced-recall:v1";
const CLOZE_SESSION_KEY = "ai-english-learning:cloze-session:v1";

async function isExecutable(path) {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveChromePath() {
  const override = process.env.CHROME_PATH?.trim();
  if (override) {
    if (await isExecutable(override)) return override;
    throw new Error(`CHROME_PATH 指向的文件不可执行：${override}`);
  }

  const candidates = [];
  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    );
  } else if (process.platform === "win32") {
    for (const base of [
      process.env.PROGRAMFILES,
      process.env["PROGRAMFILES(X86)"],
      process.env.LOCALAPPDATA,
    ].filter(Boolean)) {
      candidates.push(
        join(base, "Google", "Chrome", "Application", "chrome.exe"),
        join(base, "Chromium", "Application", "chrome.exe"),
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

  const executableNames = process.platform === "win32"
    ? ["chrome.exe", "chromium.exe"]
    : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  for (const directory of (process.env.PATH ?? "").split(delimiter).filter(Boolean)) {
    for (const name of executableNames) candidates.push(join(directory, name));
  }

  for (const candidate of [...new Set(candidates)]) {
    if (await isExecutable(candidate)) return candidate;
  }
  throw new Error(
    `找不到可执行的 Chrome/Chromium（平台：${process.platform}）。` +
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
  state = stateOf(domain.updateReminderSettings(state, {
    enabled: true,
    paused: false,
    localTime: "20:00",
    quietStart: "22:00",
    quietEnd: "08:00",
  }));
  const rawState = structuredClone(state);
  rawState.items["lexeme-ephemeral-adjective-transient"].dueDay = "not-a-date";
  rawState.items["orphan-due"].dueDay = "not-a-date";
  return JSON.stringify(rawState);
}

async function run() {
  assert.equal(typeof WebSocket, "function", "Node 24 WebSocket is required");
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
      vitePath.pathname,
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
    assert.equal(await evaluate("document.body.innerText.includes('2 条记录需要恢复')"), true);

    await clickButton("查看队列");
    await waitForDom(`Boolean(document.querySelector('[role="dialog"]'))`, "Recall dialog did not open");
    assert.deepEqual((await activeQueueOrder()).slice(0, 2), [
      "serendipity",
      "resilient",
    ]);
    assert.equal(await evaluate("document.querySelectorAll('.recall-queue-group--exception .recall-queue-item').length"), 2);
    assert.equal(await clickItemAction("orphan", "恢复这条记录"), false);
    assert.equal(
      await evaluate("document.body.innerText.includes('当前题库中找不到对应学习内容，因此不能恢复或开始作答')"),
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

    assert.deepEqual(browserProblems, []);
    console.log("recall browser integration verification passed (1440px + 390px + 320px, console clean)");
  } finally {
    client?.close();
    await stopProcess(chromeProcess);
    await stopProcess(viteProcess);
    await rm(userDataDirectory, { recursive: true, force: true });
  }
}

await run();
