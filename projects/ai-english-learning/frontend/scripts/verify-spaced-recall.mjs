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
  listEligibleSameDayItemIds,
  loadSpacedRecallState,
  markDataException,
  pauseRecallItem,
  recordIncorrectSubmission,
  recordRecallHint,
  recordRecallReminderRequest,
  recoverDataException,
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
  const completedMaintenanceStorage = createMemoryStorage();
  assert.equal(saveSpacedRecallState(completedMaintenanceStorage, state, 0), "saved");
  const completedMaintenanceReload = loadSpacedRecallState(
    completedMaintenanceStorage,
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-09-02"),
  );
  assert.equal(completedMaintenanceReload.status, "loaded");
  assert.equal(completedMaintenanceReload.isolatedItemIds, undefined);
  assert.equal(completedMaintenanceReload.state.items.curve.status, "mastered");
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
  assert.deepEqual(
    state.eventsByEffectKey["restart-fail-s2:submitted-incorrect"].metadata,
    {
      masteryGain: 0,
      dueDay: "2026-08-05",
      fromStatus: "weak",
      fromStage: "S2",
      toStatus: "weak",
      toStage: "S0",
      reason: "submitted-incorrect",
      inputSnapshot: "wrong",
    },
  );
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
  assert.deepEqual(
    state.eventsByEffectKey[`mastery-reset:control:${at("2026-08-05")}`].metadata,
    {
      dueDay: "2026-08-06",
      historyPreserved: true,
      fromStatus: "weak",
      fromStage: "S0",
      toStatus: "weak",
      toStage: "S0",
      reason: "user-confirmed-reset",
    },
  );
}

// Reveal and failure events keep truthful from/to stages at S4 and M1 boundaries.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  state = register(state, "boundary-metadata");
  state = weakByIncorrect(state, "boundary-metadata", "boundary-weak", at("2026-08-01"));
  state = settleClean(state, "boundary-metadata", "boundary-s1", at("2026-08-02")).state;
  state = settleClean(state, "boundary-metadata", "boundary-s2", at("2026-08-04")).state;
  state = settleClean(state, "boundary-metadata", "boundary-s3", at("2026-08-08")).state;

  let revealBranch = structuredClone(state);
  revealBranch = stateOf(beginRecallAttempt(
    revealBranch,
    { attemptId: "boundary-reveal-s4", itemId: "boundary-metadata" },
    { now: at("2026-08-15") },
  ));
  revealBranch = stateOf(confirmRecallReveal(
    revealBranch,
    { attemptId: "boundary-reveal-s4", inputSnapshot: "", standardAnswer: "boundary-metadata" },
    env(at("2026-08-15")),
  ));
  assert.deepEqual(
    Object.fromEntries(
      ["masteryGain", "fromStatus", "fromStage", "toStatus", "toStage", "reason"]
        .map((key) => [key, revealBranch.eventsByEffectKey["boundary-reveal-s4:reveal"].metadata[key]]),
    ),
    {
      masteryGain: 0,
      fromStatus: "weak",
      fromStage: "S4",
      toStatus: "weak",
      toStage: "S0",
      reason: "reveal",
    },
  );

  state = settleClean(state, "boundary-metadata", "boundary-s4", at("2026-08-15")).state;
  assert.equal(state.items["boundary-metadata"].status, "mastered");
  state = weakByIncorrect(
    state,
    "boundary-metadata",
    "boundary-maintenance-fail",
    at("2026-08-31"),
  );
  assert.deepEqual(
    Object.fromEntries(
      ["masteryGain", "fromStatus", "fromStage", "toStatus", "toStage", "reason"]
        .map((key) => [key, state.eventsByEffectKey["boundary-maintenance-fail:submitted-incorrect"].metadata[key]]),
    ),
    {
      masteryGain: 0,
      fromStatus: "mastered",
      fromStage: "M1",
      toStatus: "weak",
      toStage: "S0",
      reason: "submitted-incorrect",
    },
  );
}

// The first skip moves an item to the persisted global queue tail; the second hides it until tomorrow.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  for (const itemId of ["queue-a", "queue-b", "queue-c"]) {
    state = register(state, itemId);
    state = stateOf(resetRecallMastery(state, { itemId, confirmed: true }, at("2026-08-01")));
  }
  const queueNow = at("2026-08-02", "09:00:00");
  const before = buildReviewQueue(state, queueNow).visible.map((entry) => entry.itemId);
  const firstItemId = before[0];
  state = stateOf(skipRecallItem(state, firstItemId, queueNow));
  assert.deepEqual(
    buildReviewQueue(state, queueNow).visible.map((entry) => entry.itemId),
    [...before.slice(1), firstItemId],
  );

  const storage = createMemoryStorage();
  assert.equal(saveSpacedRecallState(storage, state, 0), "saved");
  const reloaded = loadSpacedRecallState(storage, SHANGHAI, SPACED_RECALL_STORAGE_KEY, queueNow);
  assert.equal(reloaded.status, "loaded");
  state = reloaded.state;
  assert.deepEqual(
    buildReviewQueue(state, queueNow).visible.map((entry) => entry.itemId),
    [...before.slice(1), firstItemId],
  );
  state = stateOf(skipRecallItem(state, firstItemId, at("2026-08-02", "09:05:00")));
  assert.equal(buildReviewQueue(state, queueNow).visible.some((entry) => entry.itemId === firstItemId), false);
  assert.equal(state.items[firstItemId].suppressedUntilDay, "2026-08-03");
}

// A first skip overrides group priority and moves the item behind the entire current queue.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  for (const itemId of ["overdue-a", "overdue-b"]) {
    state = register(state, itemId);
    state = stateOf(resetRecallMastery(state, { itemId, confirmed: true }, at("2026-08-01")));
  }
  state = register(state, "due-today");
  state = stateOf(resetRecallMastery(state, { itemId: "due-today", confirmed: true }, at("2026-08-02")));
  const queueNow = at("2026-08-03", "09:00:00");
  assert.deepEqual(
    buildReviewQueue(state, queueNow).visible.map((entry) => entry.itemId),
    ["overdue-a", "overdue-b", "due-today"],
  );
  state = stateOf(skipRecallItem(state, "overdue-a", queueNow));
  assert.deepEqual(
    buildReviewQueue(state, queueNow).visible.map((entry) => entry.itemId),
    ["overdue-b", "due-today", "overdue-a"],
  );
}

// Final same-day ties use a stable session rank rather than permanent item-id order.
{
  let base = createInitialSpacedRecallState(SHANGHAI);
  for (const itemId of ["rank-a", "rank-b", "rank-c", "rank-d"]) {
    base = register(base, itemId);
    base = weakByIncorrect(base, itemId, `${itemId}-weak`, at("2026-08-01"));
  }
  for (const itemId of ["rank-a", "rank-b", "rank-c", "rank-d"]) {
    base.items[itemId].sameDayPlan.opportunities[0].otherItemsSettled = 3;
  }
  const choices = new Set();
  for (let index = 0; index < 16; index += 1) {
    let candidateState = structuredClone(base);
    candidateState = stateOf(createRecallSession(candidateState, {
      sessionId: `stable-rank-${index}`,
      basePlannedCount: 10,
      now: at("2026-08-01"),
    }));
    const first = valueOf(reserveNextSameDayItem(candidateState, `stable-rank-${index}`)).itemId;
    choices.add(first);

    let repeatState = structuredClone(base);
    repeatState = stateOf(createRecallSession(repeatState, {
      sessionId: `stable-rank-${index}`,
      basePlannedCount: 10,
      now: at("2026-08-01"),
    }));
    const rankedIds = listEligibleSameDayItemIds(repeatState, `stable-rank-${index}`);
    assert.equal(rankedIds[0], first);
    const preferredId = rankedIds.at(-1);
    assert.equal(
      valueOf(reserveNextSameDayItem(repeatState, `stable-rank-${index}`, preferredId)).itemId,
      preferredId,
    );

    const storage = createMemoryStorage();
    assert.equal(saveSpacedRecallState(storage, repeatState, 0), "saved");
    const reloaded = loadSpacedRecallState(storage, SHANGHAI);
    assert.equal(reloaded.status, "loaded");
    assert.deepEqual(
      listEligibleSameDayItemIds(reloaded.state, `stable-rank-${index}`),
      rankedIds,
    );
  }
  assert.ok(choices.size > 1, "different sessions should not permanently favor item-id order");
}

// Same-day business priority beats stable random, while a first skip still moves globally last.
{
  let state = createInitialSpacedRecallState(SHANGHAI);
  for (const itemId of ["priority-evidence", "priority-urgent", "priority-ordinal-two"]) {
    state = register(state, itemId);
    state = weakByIncorrect(state, itemId, `${itemId}-weak`, at("2026-08-01"));
  }
  state = stateOf(createRecallSession(state, {
    sessionId: "priority-session",
    basePlannedCount: 10,
    now: at("2026-08-01"),
  }));
  state.items["priority-evidence"].sameDayPlan.evidenceCount = 2;
  state.items["priority-evidence"].sameDayPlan.opportunities[0].otherItemsSettled = 6;
  state.items["priority-urgent"].sameDayPlan.opportunities[0].otherItemsSettled = 6;
  state.items["priority-ordinal-two"].sameDayPlan.opportunities[0].status = "completed";
  state.items["priority-ordinal-two"].sameDayPlan.opportunities[1].status = "pending";
  state.items["priority-ordinal-two"].sameDayPlan.opportunities[1].otherItemsSettled = 7;
  assert.deepEqual(listEligibleSameDayItemIds(state, "priority-session"), [
    "priority-evidence",
    "priority-urgent",
    "priority-ordinal-two",
  ]);
  state = stateOf(skipRecallItem(state, "priority-urgent", at("2026-08-01", "13:00:00")));
  assert.deepEqual(listEligibleSameDayItemIds(state, "priority-session"), [
    "priority-evidence",
    "priority-ordinal-two",
    "priority-urgent",
  ]);
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
  assert.deepEqual(
    evaluateRecallReminder(quiet, {
      now: at("2026-08-03", "08:05:00"),
      connectivity: "online",
      permission: "granted",
    }),
    {
      kind: "request-browser-notification",
      forStudyDay: "2026-08-02",
    },
  );
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
  assert.equal(state.items["zone-item"].skipCountsByDay["2026-08-01"], 2);
  assert.equal(state.items["zone-item"].skipCountsByDay["2026-08-02"], undefined);
  assert.equal(state.items["zone-item"].queueTailAfterByDay["2026-08-01"], at("2026-08-02"));
  assert.equal(state.items["zone-item"].queueTailAfterByDay["2026-08-02"], undefined);
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

  let missingWeakDue = createInitialSpacedRecallState(SHANGHAI);
  missingWeakDue = register(missingWeakDue, "missing-weak-due");
  missingWeakDue = weakByIncorrect(
    missingWeakDue,
    "missing-weak-due",
    "missing-weak-due-evidence",
    at("2026-08-01"),
  );
  missingWeakDue.items["missing-weak-due"].dueDay = null;
  const missingWeakLoaded = loadSpacedRecallState(
    createMemoryStorage(JSON.stringify(missingWeakDue)),
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-02"),
  );
  assert.equal(missingWeakLoaded.status, "loaded");
  assert.deepEqual(missingWeakLoaded.isolatedItemIds, ["missing-weak-due"]);
  assert.match(
    missingWeakLoaded.state.items["missing-weak-due"].dataException.detail,
    /缺少下一到期时间/,
  );
  assert.equal(
    stateOf(recoverDataException(
      missingWeakLoaded.state,
      "missing-weak-due",
      at("2026-08-02"),
    )).items["missing-weak-due"].dueDay,
    "2026-08-02",
  );

  let missingMaintenanceDue = createInitialSpacedRecallState(SHANGHAI);
  missingMaintenanceDue = register(missingMaintenanceDue, "missing-maintenance-due");
  Object.assign(missingMaintenanceDue.items["missing-maintenance-due"], {
    status: "mastered",
    stage: null,
    dueDay: null,
    masteredDay: "2026-08-05",
    maintenanceDueDay: null,
  });
  const missingMaintenanceLoaded = loadSpacedRecallState(
    createMemoryStorage(JSON.stringify(missingMaintenanceDue)),
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-06"),
  );
  assert.equal(missingMaintenanceLoaded.status, "loaded");
  assert.deepEqual(missingMaintenanceLoaded.isolatedItemIds, ["missing-maintenance-due"]);
  assert.match(
    missingMaintenanceLoaded.state.items["missing-maintenance-due"].dataException.detail,
    /缺少维护到期时间/,
  );

  let pausedMissingDue = createInitialSpacedRecallState(SHANGHAI);
  pausedMissingDue = register(pausedMissingDue, "paused-missing-due");
  pausedMissingDue = weakByIncorrect(
    pausedMissingDue,
    "paused-missing-due",
    "paused-missing-due-evidence",
    at("2026-08-01"),
  );
  pausedMissingDue = stateOf(pauseRecallItem(
    pausedMissingDue,
    { itemId: "paused-missing-due", learningDays: 3 },
    at("2026-08-02"),
  ));
  pausedMissingDue.items["paused-missing-due"].pause.previous.dueDay = null;
  const pausedMissingLoaded = loadSpacedRecallState(
    createMemoryStorage(JSON.stringify(pausedMissingDue)),
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-03"),
  );
  assert.equal(pausedMissingLoaded.status, "loaded");
  assert.deepEqual(pausedMissingLoaded.isolatedItemIds, ["paused-missing-due"]);
  assert.match(
    pausedMissingLoaded.state.items["paused-missing-due"].dataException.detail,
    /暂停前状态异常/,
  );
  assert.equal(
    pausedMissingLoaded.state.items["paused-missing-due"].dataException.previous,
    undefined,
  );

  let pausedMissingMaintenance = createInitialSpacedRecallState(SHANGHAI);
  pausedMissingMaintenance = register(pausedMissingMaintenance, "paused-missing-maintenance");
  Object.assign(pausedMissingMaintenance.items["paused-missing-maintenance"], {
    status: "mastered",
    stage: null,
    dueDay: null,
    masteredDay: "2026-08-05",
    maintenanceDueDay: null,
  });
  pausedMissingMaintenance = stateOf(pauseRecallItem(
    pausedMissingMaintenance,
    { itemId: "paused-missing-maintenance", learningDays: 3 },
    at("2026-08-06"),
  ));
  const pausedMaintenanceLoaded = loadSpacedRecallState(
    createMemoryStorage(JSON.stringify(pausedMissingMaintenance)),
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-07"),
  );
  assert.equal(pausedMaintenanceLoaded.status, "loaded");
  assert.deepEqual(pausedMaintenanceLoaded.isolatedItemIds, ["paused-missing-maintenance"]);
  assert.match(
    pausedMaintenanceLoaded.state.items["paused-missing-maintenance"].dataException.detail,
    /暂停前状态异常.*缺少维护到期时间/,
  );

  let semanticEarly = createInitialSpacedRecallState(SHANGHAI);
  semanticEarly = register(semanticEarly, "semantic-early");
  semanticEarly = weakByIncorrect(
    semanticEarly,
    "semantic-early",
    "semantic-early-weak",
    at("2026-08-03"),
  );
  semanticEarly.items["semantic-early"].dueDay = "2026-08-02";
  const semanticEarlyLoaded = loadSpacedRecallState(
    createMemoryStorage(JSON.stringify(semanticEarly)),
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-04"),
  );
  assert.equal(semanticEarlyLoaded.status, "loaded");
  assert.deepEqual(semanticEarlyLoaded.isolatedItemIds, ["semantic-early"]);
  assert.equal(semanticEarlyLoaded.state.items["semantic-early"].status, "data-exception");
  assert.match(
    semanticEarlyLoaded.state.items["semantic-early"].dataException.detail,
    /早于最近有效证据/,
  );

  let maintenanceEarly = createInitialSpacedRecallState(SHANGHAI);
  maintenanceEarly = register(maintenanceEarly, "maintenance-early");
  Object.assign(maintenanceEarly.items["maintenance-early"], {
    status: "mastered",
    stage: null,
    dueDay: null,
    masteredDay: "2026-08-05",
    maintenanceDueDay: "2026-08-04",
  });
  const maintenanceLoaded = loadSpacedRecallState(
    createMemoryStorage(JSON.stringify(maintenanceEarly)),
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-06"),
  );
  assert.equal(maintenanceLoaded.status, "loaded");
  assert.deepEqual(maintenanceLoaded.isolatedItemIds, ["maintenance-early"]);
  assert.equal(
    maintenanceLoaded.state.items["maintenance-early"].dataException.previous.maintenanceDueDay,
    "2026-08-06",
  );

  const dueAndOtherDamage = structuredClone(semanticEarly);
  dueAndOtherDamage.items["semantic-early"].dueDay = "not-a-date";
  dueAndOtherDamage.items["semantic-early"].weakEvidenceCount = "broken";
  const dueAndOtherStorage = createMemoryStorage(JSON.stringify(dueAndOtherDamage));
  assert.deepEqual(loadSpacedRecallState(dueAndOtherStorage, SHANGHAI), {
    status: "storage-error",
    reason: "corrupt",
    rawPreserved: true,
  });

  let pausedDamage = createInitialSpacedRecallState(SHANGHAI);
  pausedDamage = register(pausedDamage, "paused-damage");
  pausedDamage = weakByIncorrect(pausedDamage, "paused-damage", "paused-damage-weak", at("2026-08-01"));
  pausedDamage = stateOf(pauseRecallItem(
    pausedDamage,
    { itemId: "paused-damage", learningDays: 3 },
    at("2026-08-02"),
  ));
  pausedDamage.items["paused-damage"].dueDay = "not-a-date";
  const pausedLoaded = loadSpacedRecallState(
    createMemoryStorage(JSON.stringify(pausedDamage)),
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-03"),
  );
  assert.equal(pausedLoaded.status, "loaded");
  assert.equal(pausedLoaded.state.items["paused-damage"].status, "data-exception");
  assert.equal(pausedLoaded.state.items["paused-damage"].dataException.previous, undefined);
  assert.equal(pausedLoaded.state.items["paused-damage"].pause, undefined);
  assert.equal(
    recoverDataException(pausedLoaded.state, "paused-damage", at("2026-08-03")).status,
    "rejected",
  );

  let singleTaskDamage = createInitialSpacedRecallState(SHANGHAI);
  singleTaskDamage = register(singleTaskDamage, "single-task");
  singleTaskDamage = weakByIncorrect(singleTaskDamage, "single-task", "single-task-weak", at("2026-08-01"));
  singleTaskDamage.items["single-task"].dueDay = "not-a-date";
  singleTaskDamage.items["single-task"].suppressedUntilDay = "2026-08-09";
  singleTaskDamage.items["single-task"].skipCountsByDay["2026-08-04"] = 1;
  singleTaskDamage.items["single-task"].queueTailAfterByDay = {
    "2026-08-04": at("2026-08-04", "09:00:00"),
  };
  const singleTaskLoaded = loadSpacedRecallState(
    createMemoryStorage(JSON.stringify(singleTaskDamage)),
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-04"),
  );
  assert.equal(singleTaskLoaded.status, "loaded");
  const isolatedSingleTask = singleTaskLoaded.state.items["single-task"];
  assert.equal(isolatedSingleTask.sameDayPlan, null);
  assert.equal(isolatedSingleTask.suppressedUntilDay, null);
  assert.equal(isolatedSingleTask.dataException.previous.sameDayPlan, null);
  const recoveredSingleTask = stateOf(recoverDataException(
    singleTaskLoaded.state,
    "single-task",
    at("2026-08-04", "13:00:00"),
  ));
  assert.equal(recoveredSingleTask.items["single-task"].sameDayPlan, null);
  assert.equal(recoveredSingleTask.items["single-task"].suppressedUntilDay, null);
  assert.equal(recoveredSingleTask.items["single-task"].skipCountsByDay["2026-08-04"], undefined);
  assert.equal(recoveredSingleTask.items["single-task"].queueTailAfterByDay["2026-08-04"], undefined);
  assert.deepEqual(
    buildReviewQueue(recoveredSingleTask, at("2026-08-04")).visible.map((entry) => entry.itemId),
    ["single-task"],
  );

  const mixed = structuredClone(state);
  mixed.items.persist.dueDay = "not-a-date";
  mixed.items.persist.status = "weak";
  mixed.items.persist.stage = "S2";
  mixed.items.persist.latestWeakDay = "2026-08-01";
  const healthy = register(mixed, "healthy");
  const mixedRaw = JSON.stringify(healthy);
  const mixedStorage = createMemoryStorage(mixedRaw);
  const isolated = loadSpacedRecallState(
    mixedStorage,
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-02"),
  );
  assert.equal(isolated.status, "loaded");
  assert.deepEqual(isolated.isolatedItemIds, ["persist"]);
  assert.equal(isolated.normalizedFromRevision, healthy.revision);
  assert.equal(isolated.state.revision, healthy.revision + 1);
  assert.equal(isolated.state.items.persist.status, "data-exception");
  assert.equal(isolated.state.items.persist.dataException.code, "invalid-due");
  assert.equal(isolated.state.items.persist.dataException.originalSnapshot.dueDay, "not-a-date");
  assert.equal(isolated.state.items.persist.dueDay, null);
  assert.equal(isolated.state.items.healthy.status, "ordinary");
  assert.equal(mixedStorage.raw(), mixedRaw, "loading must not overwrite the original raw value");

  assert.equal(
    saveSpacedRecallState(mixedStorage, isolated.state, isolated.normalizedFromRevision),
    "saved",
  );
  let persistedIsolation = loadSpacedRecallState(
    mixedStorage,
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-02"),
  );
  assert.equal(persistedIsolation.status, "loaded");
  assert.equal(persistedIsolation.isolatedItemIds, undefined);
  assert.equal(persistedIsolation.normalizedFromRevision, undefined);
  assert.equal(persistedIsolation.state.items.persist.dataException.originalSnapshot.dueDay, "not-a-date");
  assert.equal(
    Object.keys(persistedIsolation.state.eventsByEffectKey)
      .filter((key) => key === "load-isolated:persist:invalid-due").length,
    1,
  );

  let continued = stateOf(skipRecallItem(
    persistedIsolation.state,
    "healthy",
    at("2026-08-02"),
  ));
  assert.equal(
    saveSpacedRecallState(mixedStorage, continued, persistedIsolation.state.revision),
    "saved",
  );
  persistedIsolation = loadSpacedRecallState(
    mixedStorage,
    SHANGHAI,
    SPACED_RECALL_STORAGE_KEY,
    at("2026-08-02"),
  );
  assert.equal(persistedIsolation.status, "loaded");
  assert.equal(persistedIsolation.state.items.healthy.skipCountsByDay["2026-08-02"], 1);

  const recovered = recoverDataException(
    persistedIsolation.state,
    "persist",
    at("2026-08-02", "13:00:00"),
  );
  continued = stateOf(recovered);
  assert.equal(continued.items.persist.status, "weak");
  assert.equal(continued.items.persist.stage, "S2");
  assert.equal(continued.items.persist.dueDay, "2026-08-02");
  assert.equal(buildReviewQueue(continued, at("2026-08-02")).visible.some((entry) => entry.itemId === "persist"), true);
  assert.equal(
    continued.eventsByEffectKey[`data-recovered:persist:${at("2026-08-02", "13:00:00")}`]
      .metadata.originalSnapshot.dueDay,
    "not-a-date",
  );

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
    (value) => {
      value.items.persist.status = "paused";
      delete value.items.persist.pause;
    },
    (value) => {
      value.items.persist.status = "data-exception";
      delete value.items.persist.dataException;
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
