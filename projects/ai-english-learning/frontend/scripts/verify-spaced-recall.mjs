import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import ts from "typescript";

const sourceUrl = new URL("../src/utils/spacedRecall.ts", import.meta.url);
const source = readFileSync(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
  fileName: sourceUrl.pathname,
});
const spacedRecall = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`
);

const {
  SPACED_RECALL_STORAGE_KEY,
  addStudyDays,
  beginRecallAttempt,
  buildReviewQueue,
  confirmRecallReveal,
  createInitialSpacedRecallState,
  createRecallSession,
  detectDeviceTimeZoneChange,
  evaluateRecallReminder,
  loadSpacedRecallState,
  markDataException,
  pauseRecallItem,
  recordIncorrectSubmission,
  recordRecallHint,
  recordRecallReminderRequest,
  registerRecallItem,
  reserveNextSameDayItem,
  resetRecallMastery,
  resumeDueRecallItems,
  saveSpacedRecallState,
  settleRecallAttempt,
  skipRecallItem,
  studyDayAt,
  switchLearningTimeZone,
  updateReminderSettings,
} = spacedRecall;

const SHANGHAI = "Asia/Shanghai";
const at = (day, time = "12:00:00") => `${day}T${time}+08:00`;
const env = (now, random = 3, connectivity = "online") => ({
  now,
  connectivity,
  randomIntInclusive: (minimum, maximum) => Math.min(maximum, Math.max(minimum, random)),
});

const stateOf = (result) => {
  assert.notEqual(result.status, "rejected", result.reason);
  return result.state;
};

const valueOf = (result) => {
  assert.notEqual(result.status, "rejected", result.reason);
  return result.value;
};

const register = (state, itemId, now = at("2026-08-01")) =>
  stateOf(registerRecallItem(state, { itemId, targetAnswer: itemId, meaning: `含义-${itemId}` }, now));

const weakByIncorrect = (state, itemId, attemptId, now, random = 3) => {
  state = stateOf(beginRecallAttempt(state, { attemptId, itemId }, { now }));
  state = stateOf(
    recordIncorrectSubmission(
      state,
      { attemptId, complete: true, inputSnapshot: "wrong" },
      env(now, random),
    ),
  );
  state = stateOf(settleRecallAttempt(state, { attemptId, correct: false }, env(now, random)));
  return state;
};

const settleClean = (state, itemId, attemptId, now, context = "auto", sessionId) => {
  state = stateOf(beginRecallAttempt(state, { attemptId, itemId, context }, { now }));
  const result = settleRecallAttempt(state, { attemptId, correct: true, sessionId }, env(now));
  return { state: stateOf(result), outcome: valueOf(result) };
};

function createMemoryStorage(initial) {
  const values = new Map();
  if (initial !== undefined) values.set(SPACED_RECALL_STORAGE_KEY, initial);
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    raw(key = SPACED_RECALL_STORAGE_KEY) {
      return values.get(key);
    },
  };
}

// Weak evidence is stable by attemptId + event type and never duplicates effects.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "apple");
  state = stateOf(beginRecallAttempt(state, { attemptId: "a1", itemId: "apple" }, { now: at("2026-08-01") }));
  const first = recordIncorrectSubmission(
    state,
    { attemptId: "a1", complete: true, inputSnapshot: "appla" },
    env(at("2026-08-01"), 5),
  );
  state = stateOf(first);
  assert.equal(state.items.apple.weakEvidenceCount, 1);
  assert.equal(state.items.apple.dueDay, "2026-08-02");
  assert.deepEqual(
    state.items.apple.sameDayPlan.opportunities.map((entry) => [entry.offset, entry.status]),
    [
      [5, "pending"],
      [5, "blocked"],
    ],
  );

  const replay = recordIncorrectSubmission(
    state,
    { attemptId: "a1", complete: true, inputSnapshot: "appla" },
    env(at("2026-08-01"), 7),
  );
  assert.equal(replay.status, "duplicate");
  assert.equal(replay.state.items.apple.weakEvidenceCount, 1);
  assert.equal(replay.state.items.apple.sameDayPlan.opportunities[0].offset, 5);

  state = stateOf(
    confirmRecallReveal(
      state,
      { attemptId: "a1", inputSnapshot: "appla", standardAnswer: "apple" },
      env(at("2026-08-01"), 7),
    ),
  );
  assert.equal(state.items.apple.weakEvidenceCount, 2);
  assert.equal(state.items.apple.sameDayPlan.opportunities.length, 2);
  assert.equal(
    confirmRecallReveal(
      state,
      { attemptId: "a1", inputSnapshot: "appla", standardAnswer: "apple" },
      env(at("2026-08-01")),
    ).status,
    "duplicate",
  );

  state = stateOf(settleRecallAttempt(state, { attemptId: "a1", correct: false }, env(at("2026-08-01"))));
  assert.equal(state.attempts.a1.outcome, "revealed");
  const settledReplay = settleRecallAttempt(state, { attemptId: "a1", correct: true }, env(at("2026-08-01")));
  assert.equal(settledReplay.status, "duplicate");
  assert.equal(settledReplay.value, "revealed");

  state = stateOf(beginRecallAttempt(state, { attemptId: "a2", itemId: "apple" }, { now: at("2026-08-01") }));
  state = stateOf(
    confirmRecallReveal(
      state,
      { attemptId: "a2", inputSnapshot: "", standardAnswer: "apple" },
      env(at("2026-08-01")),
    ),
  );
  assert.equal(state.items.apple.weakEvidenceCount, 3);
  assert.equal(state.items.apple.sameDayPlan.opportunities.length, 2);

  state = stateOf(beginRecallAttempt(state, { attemptId: "a3", itemId: "apple" }, { now: at("2026-08-01") }));
  state = stateOf(
    confirmRecallReveal(
      state,
      { attemptId: "a3", inputSnapshot: "", standardAnswer: "apple" },
      env(at("2026-08-01")),
    ),
  );
  const afterReveal = settleRecallAttempt(state, { attemptId: "a3", correct: true }, env(at("2026-08-01")));
  assert.equal(valueOf(afterReveal), "correct-after-reveal");
}

// Incomplete submissions do not create weak evidence.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "book");
  state = stateOf(beginRecallAttempt(state, { attemptId: "incomplete", itemId: "book" }, { now: at("2026-08-01") }));
  const result = recordIncorrectSubmission(
    state,
    { attemptId: "incomplete", complete: false, inputSnapshot: "bo" },
    env(at("2026-08-01")),
  );
  assert.equal(result.status, "duplicate");
  assert.equal(result.state.items.book.weakEvidenceCount, 0);
}

// Stable 3-question spacing, two appearances, and the session cap.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  for (const itemId of ["weak", "f1", "f2", "f3", "f4", "f5", "f6"]) state = register(state, itemId);
  state = weakByIncorrect(state, "weak", "weak-0", at("2026-08-01"), 3);
  state = stateOf(createRecallSession(state, { sessionId: "session", basePlannedCount: 10, now: at("2026-08-01") }));
  assert.equal(state.sessions.session.sameDayExtraCap, 3);

  for (let index = 1; index <= 3; index += 1) {
    state = settleClean(state, `f${index}`, `filler-${index}`, at("2026-08-01")).state;
  }
  let reserved = reserveNextSameDayItem(state, "session");
  assert.equal(valueOf(reserved).itemId, "weak");
  assert.equal(valueOf(reserved).ordinal, 1);
  state = stateOf(reserved);
  let reinforcement = settleClean(state, "weak", "weak-reinforce-1", at("2026-08-01"), "same-day", "session");
  state = reinforcement.state;
  assert.equal(reinforcement.outcome, "same-day-correct");
  assert.equal(state.items.weak.sameDayPlan.opportunities[1].status, "pending");
  assert.equal(state.items.weak.sameDayPlan.opportunities[1].otherItemsSettled, 0);

  for (let index = 4; index <= 6; index += 1) {
    state = settleClean(state, `f${index}`, `filler-${index}`, at("2026-08-01")).state;
  }
  reserved = reserveNextSameDayItem(state, "session");
  assert.equal(valueOf(reserved).ordinal, 2);
  state = stateOf(reserved);
  reinforcement = settleClean(state, "weak", "weak-reinforce-2", at("2026-08-01"), "same-day", "session");
  state = reinforcement.state;
  assert.equal(reinforcement.outcome, "same-day-correct");
  assert.equal(state.items.weak.sameDayPlan.opportunities[1].status, "completed");
  assert.equal(reserveNextSameDayItem(state, "session").status, "rejected");

  state = stateOf(createRecallSession(state, { sessionId: "small", basePlannedCount: 1, now: at("2026-08-01") }));
  assert.equal(state.sessions.small.sameDayExtraCap, 1);
  state = stateOf(createRecallSession(state, { sessionId: "large", basePlannedCount: 27, now: at("2026-08-01") }));
  assert.equal(state.sessions.large.sameDayExtraCap, 8);
}

// A missed hard window cannot be inserted after more than seven other items;
// a new same-day session re-anchors it instead of silently dropping D+1.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "window");
  state = register(state, "window-filler");
  state = weakByIncorrect(state, "window", "window-weak", at("2026-08-01"), 3);
  state = stateOf(createRecallSession(state, { sessionId: "window-1", basePlannedCount: 20, now: at("2026-08-01") }));
  for (let index = 0; index < 8; index += 1) {
    state = settleClean(state, "window-filler", `window-filler-${index}`, at("2026-08-01")).state;
  }
  assert.equal(state.items.window.sameDayPlan.opportunities[0].otherItemsSettled, 8);
  assert.equal(reserveNextSameDayItem(state, "window-1").status, "rejected");
  assert.equal(state.items.window.dueDay, "2026-08-02");

  state = stateOf(createRecallSession(state, { sessionId: "window-2", basePlannedCount: 10, now: at("2026-08-01") }));
  assert.equal(state.items.window.sameDayPlan.opportunities[0].otherItemsSettled, 0);
  for (let index = 8; index < 11; index += 1) {
    state = settleClean(state, "window-filler", `window-filler-${index}`, at("2026-08-01")).state;
  }
  assert.equal(valueOf(reserveNextSameDayItem(state, "window-2")).itemId, "window");
}

// Second skip suppresses an otherwise eligible same-day opportunity.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "suppressed");
  state = register(state, "suppressed-filler");
  state = weakByIncorrect(state, "suppressed", "suppressed-weak", at("2026-08-01"));
  state = stateOf(createRecallSession(state, { sessionId: "suppressed-session", basePlannedCount: 10, now: at("2026-08-01") }));
  for (let index = 0; index < 3; index += 1) {
    state = settleClean(state, "suppressed-filler", `suppressed-filler-${index}`, at("2026-08-01")).state;
  }
  state = stateOf(skipRecallItem(state, "suppressed", at("2026-08-01")));
  state = stateOf(skipRecallItem(state, "suppressed", at("2026-08-01")));
  assert.equal(reserveNextSameDayItem(state, "suppressed-session").status, "rejected");
}

// D+1 / D+3 / D+7 / D+14 / D+30 nominal path.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "curve");
  state = weakByIncorrect(state, "curve", "curve-weak", at("2026-08-01"));
  const checkpoints = [
    ["2026-08-02", "S2", "2026-08-04"],
    ["2026-08-04", "S3", "2026-08-08"],
    ["2026-08-08", "S4", "2026-08-15"],
  ];
  for (const [day, nextStage, nextDue] of checkpoints) {
    const attemptId = `curve-${day}`;
    const settled = settleClean(state, "curve", attemptId, at(day));
    state = settled.state;
    assert.equal(settled.outcome, "clean-independent-correct");
    assert.equal(state.items.curve.stage, nextStage);
    assert.equal(state.items.curve.dueDay, nextDue);
  }
  state = settleClean(state, "curve", "curve-s4", at("2026-08-15")).state;
  assert.equal(state.items.curve.status, "mastered");
  assert.equal(state.items.curve.maintenanceDueDay, "2026-08-31");
  assert.equal(buildReviewQueue(state, at("2026-08-31")).visible[0].stage, "maintenance");
  state = stateOf(beginRecallAttempt(state, { attemptId: "curve-maintenance-assisted", itemId: "curve" }, { now: at("2026-08-31") }));
  state = stateOf(recordRecallHint(state, "curve-maintenance-assisted", env(at("2026-08-31"))));
  const assistedMaintenance = settleRecallAttempt(
    state,
    { attemptId: "curve-maintenance-assisted", correct: true },
    env(at("2026-08-31")),
  );
  state = stateOf(assistedMaintenance);
  assert.equal(valueOf(assistedMaintenance), "assisted-correct");
  assert.equal(state.items.curve.maintenanceDueDay, "2026-09-01");
  state = settleClean(state, "curve", "curve-maintenance", at("2026-09-01")).state;
  assert.equal(state.items.curve.status, "mastered");
  assert.equal(state.items.curve.maintenanceDueDay, null);
}

// Assistance never advances a stage and blocks later same-day mastery credit.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "assist");
  state = weakByIncorrect(state, "assist", "assist-weak", at("2026-08-01"));
  state = stateOf(beginRecallAttempt(state, { attemptId: "assist-s1", itemId: "assist" }, { now: at("2026-08-02") }));
  state = stateOf(recordRecallHint(state, "assist-s1", env(at("2026-08-02"))));
  const result = settleRecallAttempt(state, { attemptId: "assist-s1", correct: true }, env(at("2026-08-02")));
  state = stateOf(result);
  assert.equal(valueOf(result), "assisted-correct");
  assert.equal(state.items.assist.stage, "S1");
  assert.equal(state.items.assist.dueDay, "2026-08-03");
}

// A later-stage failure clears current-cycle credits, preserves event history, and restarts at S0.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "restart");
  state = weakByIncorrect(state, "restart", "restart-weak", at("2026-08-01"));
  state = settleClean(state, "restart", "restart-s1", at("2026-08-02")).state;
  assert.equal(state.items.restart.stage, "S2");
  assert.equal(state.items.restart.cleanStageDays.S1, "2026-08-02");
  state = weakByIncorrect(state, "restart", "restart-fail-s2", at("2026-08-04"));
  assert.equal(state.items.restart.stage, "S0");
  assert.equal(state.items.restart.dueDay, "2026-08-05");
  assert.deepEqual(state.items.restart.cleanStageDays, {});
  assert.ok(state.eventsByEffectKey["restart-s1:stage-advanced"]);
}

// Skip, pause/resume, and confirmed reset preserve stage/history semantics.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "control");
  state = weakByIncorrect(state, "control", "control-weak", at("2026-08-01"));
  let skipped = skipRecallItem(state, "control", at("2026-08-02"));
  state = stateOf(skipped);
  assert.equal(valueOf(skipped), 1);
  skipped = skipRecallItem(state, "control", at("2026-08-02"));
  state = stateOf(skipped);
  assert.equal(valueOf(skipped), 2);
  assert.equal(state.items.control.suppressedUntilDay, "2026-08-03");

  const paused = pauseRecallItem(state, { itemId: "control", learningDays: 3 }, at("2026-08-02"));
  state = stateOf(paused);
  assert.equal(valueOf(paused), "2026-08-05");
  assert.equal(buildReviewQueue(state, at("2026-08-04")).visible.length, 0);
  assert.equal(resumeDueRecallItems(state, at("2026-08-04")).status, "duplicate");
  state = stateOf(resumeDueRecallItems(state, at("2026-08-05")));
  assert.equal(state.items.control.status, "weak");
  assert.equal(state.items.control.stage, "S0");

  assert.equal(resetRecallMastery(state, { itemId: "control", confirmed: false }, at("2026-08-05")).status, "rejected");
  state = stateOf(resetRecallMastery(state, { itemId: "control", confirmed: true }, at("2026-08-05")));
  assert.equal(state.items.control.stage, "S0");
  assert.equal(state.items.control.dueDay, "2026-08-06");
  assert.equal(state.items.control.sameDayPlan, null);
}

// Reminder permission, quiet hours, once-per-day, and travel-day guards are truthful.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "remind");
  state = weakByIncorrect(state, "remind", "remind-weak", at("2026-08-01"));
  state = stateOf(updateReminderSettings(state, { enabled: true }));
  const now = at("2026-08-02", "20:00:00");
  assert.deepEqual(evaluateRecallReminder(state, { now, connectivity: "online", permission: "denied" }), {
    kind: "in-app-only",
    reason: "permission-not-granted",
  });
  const reminder = recordRecallReminderRequest(state, {
    now,
    connectivity: "online",
    permission: "granted",
  });
  state = stateOf(reminder);
  assert.equal(state.reminderRequests.length, 1);
  assert.equal(
    evaluateRecallReminder(state, { now, connectivity: "online", permission: "granted" }).reason,
    "already-requested-today",
  );

  let quiet = createInitialSpacedRecallState(SHANGHAI);
  quiet = register(quiet, "quiet");
  quiet = weakByIncorrect(quiet, "quiet", "quiet-weak", at("2026-08-01"));
  quiet = stateOf(updateReminderSettings(quiet, { enabled: true, localTime: "23:00" }));
  assert.equal(
    evaluateRecallReminder(quiet, {
      now: at("2026-08-02", "23:00:00"),
      connectivity: "online",
      permission: "granted",
    }).kind,
    "defer-until-quiet-end",
  );

  const released = evaluateRecallReminder(quiet, {
    now: at("2026-08-03", "08:00:00"),
    connectivity: "online",
    permission: "granted",
  });
  assert.deepEqual(released, {
    kind: "request-browser-notification",
    forStudyDay: "2026-08-02",
  });
  quiet = stateOf(
    recordRecallReminderRequest(quiet, {
      now: at("2026-08-03", "08:00:00"),
      connectivity: "online",
      permission: "granted",
    }),
  );
  assert.equal(
    evaluateRecallReminder(quiet, {
      now: at("2026-08-03", "08:00:00"),
      connectivity: "online",
      permission: "granted",
    }).reason,
    "already-requested-today",
  );

  const detected = detectDeviceTimeZoneChange(quiet, "America/Los_Angeles");
  quiet = stateOf(detected);
  assert.equal(
    evaluateRecallReminder(quiet, {
      now: at("2026-08-03", "09:00:00"),
      connectivity: "online",
      permission: "granted",
    }).reason,
    "time-zone-decision-pending",
  );
  const originalEvidenceDay = quiet.attempts["quiet-weak"].studyDay;
  quiet = stateOf(switchLearningTimeZone(quiet, "America/Los_Angeles", at("2026-08-03", "09:00:00")));
  assert.equal(quiet.attempts["quiet-weak"].studyDay, originalEvidenceDay);
  assert.equal(quiet.learningTimeZone, "America/Los_Angeles");
}

// Time-zone switching shifts future schedule days but never rewrites attempt/event history.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "zone-item");
  state = register(state, "zone-paused");
  state = weakByIncorrect(state, "zone-item", "zone-weak", at("2026-08-02"));
  state = stateOf(skipRecallItem(state, "zone-item", at("2026-08-02")));
  state = stateOf(skipRecallItem(state, "zone-item", at("2026-08-02")));
  state = stateOf(pauseRecallItem(state, { itemId: "zone-paused", learningDays: 3 }, at("2026-08-02")));
  state = stateOf(beginRecallAttempt(state, { attemptId: "old-zone-attempt", itemId: "zone-item", context: "ordinary" }, { now: at("2026-08-02") }));
  const historicalAttemptDay = state.attempts["old-zone-attempt"].studyDay;

  state = stateOf(switchLearningTimeZone(state, "America/Los_Angeles", at("2026-08-02")));
  assert.equal(state.items["zone-item"].dueDay, "2026-08-02");
  assert.equal(state.items["zone-item"].suppressedUntilDay, "2026-08-02");
  assert.equal(state.items["zone-item"].sameDayPlan.studyDay, "2026-08-01");
  assert.equal(state.items["zone-paused"].pause.resumeDay, "2026-08-04");
  assert.equal(state.attempts["old-zone-attempt"].studyDay, historicalAttemptDay);

  state = stateOf(
    settleRecallAttempt(
      state,
      { attemptId: "old-zone-attempt", correct: true },
      env(at("2026-08-02")),
    ),
  );
  assert.equal(
    state.eventsByEffectKey["old-zone-attempt:attempt-settled"].learningTimeZone,
    SHANGHAI,
  );
}

// Offline/unknown connectivity cannot settle or fabricate reminder delivery.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "offline");
  state = stateOf(beginRecallAttempt(state, { attemptId: "offline-attempt", itemId: "offline" }, { now: at("2026-08-01") }));
  assert.equal(
    recordIncorrectSubmission(
      state,
      { attemptId: "offline-attempt", complete: true, inputSnapshot: "x" },
      env(at("2026-08-01"), 3, "offline"),
    ).status,
    "rejected",
  );
  assert.equal(
    settleRecallAttempt(state, { attemptId: "offline-attempt", correct: true }, env(at("2026-08-01"), 3, "unknown")).status,
    "rejected",
  );
  assert.equal(state.items.offline.status, "ordinary");
}

// Data exceptions never enter the queue and do not reduce mastery.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = stateOf(registerRecallItem(state, { itemId: "broken", targetAnswer: "", meaning: "坏数据" }, at("2026-08-01")));
  assert.equal(state.items.broken.status, "data-exception");
  assert.equal(beginRecallAttempt(state, { attemptId: "broken-a", itemId: "broken" }, { now: at("2026-08-01") }).status, "rejected");
  state = register(state, "invalid-due");
  state = stateOf(markDataException(state, { itemId: "invalid-due", code: "invalid-due", detail: "非法到期日" }, at("2026-08-01")));
  assert.equal(buildReviewQueue(state, at("2026-08-02")).visible.length, 0);
}

// Default queue limit keeps the remainder visibly overdue.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  for (let index = 0; index < 21; index += 1) {
    const itemId = `overdue-${index}`;
    state = register(state, itemId);
    state = stateOf(resetRecallMastery(state, { itemId, confirmed: true }, at("2026-08-01")));
  }
  const queue = buildReviewQueue(state, at("2026-08-03"));
  assert.equal(queue.visible.length, 20);
  assert.equal(queue.totalOverdueCount, 21);
  assert.equal(queue.remainingOverdueCount, 1);

  const dueToday = buildReviewQueue(state, at("2026-08-02"));
  assert.equal(dueToday.visible.length, 20);
  assert.equal(dueToday.totalDueTodayCount, 21);
  assert.equal(dueToday.remainingDueTodayCount, 1);
}

// Versioned localStorage preserves corrupt/unknown data and detects revision conflicts.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  const storage = createMemoryStorage();
  assert.equal(saveSpacedRecallState(storage, state, 0), "saved");
  assert.equal(loadSpacedRecallState(storage, SHANGHAI).status, "loaded");

  state = register(state, "persist");
  assert.equal(saveSpacedRecallState(storage, state, 0), "saved");
  assert.equal(loadSpacedRecallState(storage, SHANGHAI).state.items.persist.itemId, "persist");
  assert.equal(saveSpacedRecallState(storage, state, 0), "revision-conflict");

  const corrupt = createMemoryStorage("{not-json");
  assert.deepEqual(loadSpacedRecallState(corrupt, SHANGHAI), {
    status: "storage-error",
    reason: "corrupt",
    rawPreserved: true,
  });
  assert.equal(corrupt.raw(), "{not-json");

  const future = createMemoryStorage(JSON.stringify({ storageVersion: 99, revision: 1 }));
  assert.equal(loadSpacedRecallState(future, SHANGHAI).reason, "unsupported-version");

  for (const mutate of [
    (value) => {
      value.reminderSettings.localTime = "99:99";
    },
    (value) => {
      value.reminderRequests = {};
    },
    (value) => {
      value.items.persist.weakEvidenceCount = "broken";
    },
    (value) => {
      value.items.persist.sameDayPlan = { studyDay: "2026-08-01", evidenceCount: 1, opportunities: [{}] };
    },
  ]) {
    const damaged = structuredClone(state);
    mutate(damaged);
    const damagedStorage = createMemoryStorage(JSON.stringify(damaged));
    assert.deepEqual(loadSpacedRecallState(damagedStorage, SHANGHAI), {
      status: "storage-error",
      reason: "corrupt",
      rawPreserved: true,
    });
  }
}

// Civil-date helpers do not use fixed local 24-hour arithmetic.
assert.equal(addStudyDays("2026-03-08", 1), "2026-03-09");
assert.equal(studyDayAt("2026-08-01T16:30:00.000Z", SHANGHAI), "2026-08-02");

console.log("spaced-recall verification passed");
