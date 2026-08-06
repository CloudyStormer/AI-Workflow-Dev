/**
 * PRD v1.3 spaced-recall domain engine.
 *
 * This module intentionally has no React or backend dependency. It models the
 * single-browser MVP and keeps every state transition deterministic so the UI
 * can persist the returned state in localStorage after each successful command.
 */

export const SPACED_RECALL_STORAGE_VERSION = 1 as const;
export const SPACED_RECALL_STORAGE_KEY = "ai-english-learning:spaced-recall:v1";

export type StudyDay = `${number}-${number}-${number}`;
export type ReviewStage = "S0" | "S1" | "S2" | "S3" | "S4";
export type ItemStatus = "ordinary" | "weak" | "mastered" | "paused" | "data-exception";
export type WeakEvidenceType = "reveal" | "submitted-incorrect";
export type AttemptOutcome =
  | "clean-independent-correct"
  | "same-day-correct"
  | "assisted-correct"
  | "revealed"
  | "correct-after-reveal"
  | "submitted-incorrect";
export type AttemptContext = "ordinary" | "same-day" | ReviewStage | "maintenance";
export type Connectivity = "online" | "offline" | "unknown";
export type NotificationPermissionState = "granted" | "prompt" | "denied" | "unsupported";
export type DataExceptionCode =
  | "missing-item-id"
  | "missing-answer"
  | "missing-meaning"
  | "invalid-due";

export interface DeterministicEnv {
  now: string;
  connectivity: Connectivity;
  randomIntInclusive: (minimum: number, maximum: number, stableKey: string) => number;
}

export interface SameDayOpportunity {
  ordinal: 1 | 2;
  offset: 3 | 4 | 5 | 6 | 7;
  otherItemsSettled: number;
  status: "blocked" | "pending" | "scheduled" | "completed";
  scheduledSessionId?: string;
}

export interface SameDayPlan {
  studyDay: StudyDay;
  evidenceCount: number;
  opportunities: [SameDayOpportunity, SameDayOpportunity];
}

interface RestorableItemState {
  status: Exclude<ItemStatus, "paused" | "data-exception">;
  stage: ReviewStage | null;
  dueDay: StudyDay | null;
  masteredDay: StudyDay | null;
  maintenanceDueDay: StudyDay | null;
  sameDayPlan: SameDayPlan | null;
}

export interface RecallItemState {
  itemId: string;
  targetAnswer: string;
  meaning: string;
  status: ItemStatus;
  stage: ReviewStage | null;
  dueDay: StudyDay | null;
  latestWeakDay: StudyDay | null;
  masteredDay: StudyDay | null;
  maintenanceDueDay: StudyDay | null;
  sameDayPlan: SameDayPlan | null;
  cleanStageDays: Partial<Record<Exclude<ReviewStage, "S0">, StudyDay>>;
  masteryBlockedDays: Record<StudyDay, "weak-evidence" | "assistance">;
  skipCountsByDay: Record<StudyDay, 1 | 2>;
  suppressedUntilDay: StudyDay | null;
  weakEvidenceCount: number;
  lastAppearanceAt: string | null;
  pause?: {
    resumeDay: StudyDay;
    previous: RestorableItemState;
  };
  dataException?: {
    code: DataExceptionCode;
    detail: string;
    previous?: RestorableItemState;
  };
}

export interface RecallAttempt {
  attemptId: string;
  itemId: string;
  openedAt: string;
  studyDay: StudyDay;
  learningTimeZone: string;
  context: AttemptContext;
  usedHint: boolean;
  revealed: boolean;
  hadCompleteIncorrect: boolean;
  preRevealInput?: string;
  standardAnswer?: string;
  outcome?: AttemptOutcome;
  settledAt?: string;
}

export interface RecallEvent {
  eventId: string;
  effectKey: string;
  itemId?: string;
  attemptId?: string;
  type:
    | WeakEvidenceType
    | "hint-used"
    | "attempt-settled"
    | "stage-advanced"
    | "same-day-reinforced"
    | "skipped"
    | "paused"
    | "resumed"
    | "mastery-reset"
    | "reminder-requested"
    | "time-zone-switched"
    | "data-exception";
  occurredAt: string;
  studyDay: StudyDay;
  learningTimeZone: string;
  metadata: Record<string, unknown>;
}

export interface RecallSession {
  sessionId: string;
  studyDay: StudyDay;
  basePlannedCount: number;
  sameDayExtraCap: number;
  sameDayExtrasUsed: number;
}

export interface ReminderSettings {
  enabled: boolean;
  paused: boolean;
  localTime: string;
  quietStart: string;
  quietEnd: string;
}

export interface ReminderRequestRecord {
  studyDay: StudyDay;
  timeZone: string;
  requestedAt: string;
}

export interface SpacedRecallState {
  storageVersion: typeof SPACED_RECALL_STORAGE_VERSION;
  revision: number;
  learningTimeZone: string;
  pendingDeviceTimeZone: string | null;
  timeZoneGuard: {
    fromStudyDay: StudyDay;
    toStudyDay: StudyDay;
    changedAt: string;
  } | null;
  items: Record<string, RecallItemState>;
  attempts: Record<string, RecallAttempt>;
  eventsByEffectKey: Record<string, RecallEvent>;
  sessions: Record<string, RecallSession>;
  reminderSettings: ReminderSettings;
  reminderRequests: ReminderRequestRecord[];
}

export type DomainResult<T = undefined> =
  | { status: "applied"; state: SpacedRecallState; value: T }
  | { status: "duplicate"; state: SpacedRecallState; value: T }
  | {
      status: "rejected";
      state: SpacedRecallState;
      reason:
        | "offline-settlement-disabled"
        | "item-not-found"
        | "attempt-not-found"
        | "attempt-already-settled"
        | "item-unavailable"
        | "invalid-time-zone"
        | "confirmation-required"
        | "session-not-found"
        | "session-cap-reached"
        | "no-eligible-same-day-item"
        | "reminder-not-eligible";
    };

export interface ReviewQueueEntry {
  itemId: string;
  kind: "overdue" | "due-today" | "same-day";
  stage: ReviewStage | "maintenance";
  dueDay: StudyDay;
  reason: string;
}

export interface ReviewQueue {
  visible: ReviewQueueEntry[];
  remainingOverdueCount: number;
  remainingDueTodayCount: number;
  totalOverdueCount: number;
  totalDueTodayCount: number;
}

export type ReminderDecision =
  | {
      kind: "none";
      reason:
        | "disabled"
        | "paused"
        | "before-reminder-time"
        | "all-due-completed"
        | "already-requested-today"
        | "time-zone-decision-pending";
    }
  | { kind: "in-app-only"; reason: "permission-not-granted" | "unsupported" | "offline-or-unknown" }
  | { kind: "defer-until-quiet-end"; localTime: string; forStudyDay: StudyDay }
  | { kind: "request-browser-notification"; forStudyDay: StudyDay };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type LoadResult =
  | { status: "empty"; state: SpacedRecallState }
  | { status: "loaded"; state: SpacedRecallState }
  | { status: "storage-error"; reason: "corrupt" | "unsupported-version"; rawPreserved: true };

const REVIEW_STAGE_INTERVALS: Record<Exclude<ReviewStage, "S0" | "S4">, number> = {
  S1: 2,
  S2: 4,
  S3: 7,
};

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  paused: false,
  localTime: "20:00",
  quietStart: "22:00",
  quietEnd: "08:00",
};

function cloneState(state: SpacedRecallState): SpacedRecallState {
  return structuredClone(state);
}

function applied<T>(state: SpacedRecallState, value: T): DomainResult<T> {
  state.revision += 1;
  return { status: "applied", state, value };
}

function duplicate<T>(state: SpacedRecallState, value: T): DomainResult<T> {
  return { status: "duplicate", state, value };
}

function rejected<T>(
  state: SpacedRecallState,
  reason: Extract<DomainResult<T>, { status: "rejected" }>['reason'],
): DomainResult<T> {
  return { status: "rejected", state, reason };
}

function assertValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function dateParts(instant: string, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

export function studyDayAt(instant: string, timeZone: string): StudyDay {
  const { year, month, day } = dateParts(instant, timeZone);
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}` as StudyDay;
}

export function addStudyDays(studyDay: StudyDay, amount: number): StudyDay {
  const [year, month, day] = studyDay.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}` as StudyDay;
}

export function differenceInStudyDays(from: StudyDay, to: StudyDay): number {
  const toUtc = (value: StudyDay): number => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export function createInitialSpacedRecallState(learningTimeZone: string): SpacedRecallState {
  if (!assertValidTimeZone(learningTimeZone)) {
    throw new Error(`Invalid IANA time zone: ${learningTimeZone}`);
  }
  return {
    storageVersion: SPACED_RECALL_STORAGE_VERSION,
    revision: 0,
    learningTimeZone,
    pendingDeviceTimeZone: null,
    timeZoneGuard: null,
    items: {},
    attempts: {},
    eventsByEffectKey: {},
    sessions: {},
    reminderSettings: { ...DEFAULT_REMINDER_SETTINGS },
    reminderRequests: [],
  };
}

function emptyItem(itemId: string, targetAnswer: string, meaning: string): RecallItemState {
  return {
    itemId,
    targetAnswer,
    meaning,
    status: "ordinary",
    stage: null,
    dueDay: null,
    latestWeakDay: null,
    masteredDay: null,
    maintenanceDueDay: null,
    sameDayPlan: null,
    cleanStageDays: {},
    masteryBlockedDays: {},
    skipCountsByDay: {},
    suppressedUntilDay: null,
    weakEvidenceCount: 0,
    lastAppearanceAt: null,
  };
}

function snapshotItem(item: RecallItemState): RestorableItemState {
  return {
    status:
      item.status === "paused" || item.status === "data-exception" ? "ordinary" : item.status,
    stage: item.stage,
    dueDay: item.dueDay,
    masteredDay: item.masteredDay,
    maintenanceDueDay: item.maintenanceDueDay,
    sameDayPlan: item.sameDayPlan ? structuredClone(item.sameDayPlan) : null,
  };
}

function appendEvent(
  state: SpacedRecallState,
  input: Omit<RecallEvent, "eventId" | "learningTimeZone"> & { learningTimeZone?: string },
): boolean {
  if (state.eventsByEffectKey[input.effectKey]) return false;
  const { learningTimeZone = state.learningTimeZone, ...event } = input;
  state.eventsByEffectKey[input.effectKey] = {
    ...event,
    eventId: input.effectKey,
    learningTimeZone,
  };
  return true;
}

export function registerRecallItem(
  current: SpacedRecallState,
  input: { itemId: string; targetAnswer: string; meaning: string },
  now: string,
): DomainResult<RecallItemState> {
  const existing = current.items[input.itemId];
  if (existing) return duplicate(current, existing);
  const state = cloneState(current);
  const day = studyDayAt(now, state.learningTimeZone);
  const item = emptyItem(input.itemId, input.targetAnswer, input.meaning);
  const exception = !input.itemId.trim()
    ? { code: "missing-item-id" as const, detail: "学习项身份缺失" }
    : !input.targetAnswer.trim()
      ? { code: "missing-answer" as const, detail: "目标答案缺失" }
      : !input.meaning.trim()
        ? { code: "missing-meaning" as const, detail: "目标含义缺失" }
        : null;
  if (exception) {
    item.status = "data-exception";
    item.dataException = exception;
    appendEvent(state, {
      effectKey: `item:${input.itemId || "<missing>"}:data-exception:${exception.code}`,
      itemId: input.itemId,
      type: "data-exception",
      occurredAt: now,
      studyDay: day,
      metadata: exception,
    });
  }
  state.items[input.itemId] = item;
  return applied(state, item);
}

function deriveAttemptContext(item: RecallItemState, day: StudyDay): AttemptContext {
  if (item.status === "mastered" && item.maintenanceDueDay && item.maintenanceDueDay <= day) {
    return "maintenance";
  }
  if (item.status === "weak" && item.stage && item.dueDay && item.dueDay <= day) {
    return item.stage === "S0" ? "S1" : item.stage;
  }
  return "ordinary";
}

export function beginRecallAttempt(
  current: SpacedRecallState,
  input: { attemptId: string; itemId: string; context?: "auto" | "same-day" | "ordinary" },
  env: Pick<DeterministicEnv, "now">,
): DomainResult<RecallAttempt> {
  const existing = current.attempts[input.attemptId];
  if (existing) return duplicate(current, existing);
  const item = current.items[input.itemId];
  if (!item) return rejected(current, "item-not-found");
  if (item.status === "paused" || item.status === "data-exception") {
    return rejected(current, "item-unavailable");
  }
  const state = cloneState(current);
  const day = studyDayAt(env.now, state.learningTimeZone);
  const context =
    input.context === "same-day" || input.context === "ordinary"
      ? input.context
      : deriveAttemptContext(item, day);
  const attempt: RecallAttempt = {
    attemptId: input.attemptId,
    itemId: input.itemId,
    openedAt: env.now,
    studyDay: day,
    learningTimeZone: state.learningTimeZone,
    context,
    usedHint: false,
    revealed: false,
    hadCompleteIncorrect: false,
  };
  const nextItem = state.items[input.itemId];
  if (context === "S1" && nextItem.status === "weak" && nextItem.stage === "S0") {
    nextItem.stage = "S1";
  }
  state.attempts[input.attemptId] = attempt;
  return applied(state, attempt);
}

export function recordRecallHint(
  current: SpacedRecallState,
  attemptId: string,
  env: Pick<DeterministicEnv, "now" | "connectivity">,
): DomainResult<RecallAttempt> {
  if (env.connectivity !== "online") return rejected(current, "offline-settlement-disabled");
  const attempt = current.attempts[attemptId];
  if (!attempt) return rejected(current, "attempt-not-found");
  const effectKey = `${attemptId}:hint-used`;
  if (current.eventsByEffectKey[effectKey]) return duplicate(current, attempt);
  const state = cloneState(current);
  const nextAttempt = state.attempts[attemptId];
  const item = state.items[nextAttempt.itemId];
  nextAttempt.usedHint = true;
  item.masteryBlockedDays[nextAttempt.studyDay] = "assistance";
  appendEvent(state, {
    effectKey,
    itemId: item.itemId,
    attemptId,
    type: "hint-used",
    occurredAt: env.now,
    studyDay: nextAttempt.studyDay,
    learningTimeZone: nextAttempt.learningTimeZone,
    metadata: {},
  });
  return applied(state, nextAttempt);
}

function createSameDayPlan(
  itemId: string,
  studyDay: StudyDay,
  effectKey: string,
  randomIntInclusive: DeterministicEnv["randomIntInclusive"],
): SameDayPlan {
  const offset1 = randomIntInclusive(3, 7, `${effectKey}:${itemId}:same-day:1`) as 3 | 4 | 5 | 6 | 7;
  const offset2 = randomIntInclusive(3, 7, `${effectKey}:${itemId}:same-day:2`) as 3 | 4 | 5 | 6 | 7;
  return {
    studyDay,
    evidenceCount: 1,
    opportunities: [
      { ordinal: 1, offset: offset1, otherItemsSettled: 0, status: "pending" },
      { ordinal: 2, offset: offset2, otherItemsSettled: 0, status: "blocked" },
    ],
  };
}

function applyWeakEvidence(
  state: SpacedRecallState,
  attempt: RecallAttempt,
  evidenceType: WeakEvidenceType,
  env: DeterministicEnv,
): boolean {
  const effectKey = `${attempt.attemptId}:${evidenceType}`;
  if (state.eventsByEffectKey[effectKey]) return false;
  const item = state.items[attempt.itemId];
  const day = attempt.studyDay;
  item.status = "weak";
  item.stage = "S0";
  item.latestWeakDay = day;
  item.dueDay = addStudyDays(day, 1);
  item.masteredDay = null;
  item.maintenanceDueDay = null;
  item.weakEvidenceCount += 1;
  item.cleanStageDays = {};
  item.masteryBlockedDays[day] = "weak-evidence";
  if (item.sameDayPlan?.studyDay === day) {
    item.sameDayPlan.evidenceCount += 1;
  } else {
    item.sameDayPlan = createSameDayPlan(item.itemId, day, effectKey, env.randomIntInclusive);
  }
  appendEvent(state, {
    effectKey,
    itemId: item.itemId,
    attemptId: attempt.attemptId,
    type: evidenceType,
    occurredAt: env.now,
    studyDay: day,
    learningTimeZone: attempt.learningTimeZone,
    metadata: { masteryGain: 0, dueDay: item.dueDay },
  });
  return true;
}

export function recordIncorrectSubmission(
  current: SpacedRecallState,
  input: { attemptId: string; complete: boolean; inputSnapshot: string },
  env: DeterministicEnv,
): DomainResult<RecallAttempt> {
  if (env.connectivity !== "online") return rejected(current, "offline-settlement-disabled");
  const attempt = current.attempts[input.attemptId];
  if (!attempt) return rejected(current, "attempt-not-found");
  if (!input.complete) return duplicate(current, attempt);
  const effectKey = `${attempt.attemptId}:submitted-incorrect`;
  if (current.eventsByEffectKey[effectKey]) return duplicate(current, attempt);
  const state = cloneState(current);
  const nextAttempt = state.attempts[input.attemptId];
  nextAttempt.hadCompleteIncorrect = true;
  applyWeakEvidence(state, nextAttempt, "submitted-incorrect", env);
  state.eventsByEffectKey[effectKey].metadata.inputSnapshot = input.inputSnapshot;
  return applied(state, nextAttempt);
}

export function confirmRecallReveal(
  current: SpacedRecallState,
  input: { attemptId: string; inputSnapshot: string; standardAnswer: string },
  env: DeterministicEnv,
): DomainResult<RecallAttempt> {
  if (env.connectivity !== "online") return rejected(current, "offline-settlement-disabled");
  const attempt = current.attempts[input.attemptId];
  if (!attempt) return rejected(current, "attempt-not-found");
  const effectKey = `${attempt.attemptId}:reveal`;
  if (current.eventsByEffectKey[effectKey]) return duplicate(current, attempt);
  const state = cloneState(current);
  const nextAttempt = state.attempts[input.attemptId];
  nextAttempt.revealed = true;
  nextAttempt.preRevealInput = input.inputSnapshot;
  nextAttempt.standardAnswer = input.standardAnswer;
  applyWeakEvidence(state, nextAttempt, "reveal", env);
  state.eventsByEffectKey[effectKey].metadata.inputSnapshot = input.inputSnapshot;
  state.eventsByEffectKey[effectKey].metadata.standardAnswer = input.standardAnswer;
  return applied(state, nextAttempt);
}

function advanceOtherItemCounters(state: SpacedRecallState, settledItemId: string, day: StudyDay): void {
  for (const item of Object.values(state.items)) {
    if (item.itemId === settledItemId || item.sameDayPlan?.studyDay !== day) continue;
    const opportunity = item.sameDayPlan.opportunities.find((entry) => entry.status === "pending");
    if (opportunity) opportunity.otherItemsSettled += 1;
  }
}

function completeSameDayOpportunity(item: RecallItemState, sessionId?: string): void {
  const plan = item.sameDayPlan;
  if (!plan) return;
  const opportunity = plan.opportunities.find(
    (entry) =>
      entry.status === "scheduled" && (!sessionId || entry.scheduledSessionId === sessionId),
  );
  if (!opportunity) return;
  opportunity.status = "completed";
  delete opportunity.scheduledSessionId;
  if (opportunity.ordinal === 1) {
    const second = plan.opportunities[1];
    second.status = "pending";
    second.otherItemsSettled = 0;
  }
}

function advanceCleanStage(
  state: SpacedRecallState,
  item: RecallItemState,
  attempt: RecallAttempt,
  now: string,
): void {
  const stage = attempt.context;
  if (stage !== "S1" && stage !== "S2" && stage !== "S3" && stage !== "S4") return;
  if (item.status !== "weak" || item.stage !== stage) return;
  if (item.masteryBlockedDays[attempt.studyDay]) {
    item.dueDay = addStudyDays(attempt.studyDay, 1);
    return;
  }
  if (Object.values(item.cleanStageDays).includes(attempt.studyDay)) return;
  item.cleanStageDays[stage] = attempt.studyDay;
  if (stage === "S4") {
    if (!item.latestWeakDay || differenceInStudyDays(item.latestWeakDay, attempt.studyDay) < 14) {
      item.dueDay = addStudyDays(attempt.studyDay, 1);
      return;
    }
    item.status = "mastered";
    item.stage = null;
    item.dueDay = null;
    item.masteredDay = attempt.studyDay;
    item.maintenanceDueDay = addStudyDays(attempt.studyDay, 16);
  } else {
    const nextStage = stage === "S1" ? "S2" : stage === "S2" ? "S3" : "S4";
    item.stage = nextStage;
    item.dueDay = addStudyDays(attempt.studyDay, REVIEW_STAGE_INTERVALS[stage]);
  }
  appendEvent(state, {
    effectKey: `${attempt.attemptId}:stage-advanced`,
    itemId: item.itemId,
    attemptId: attempt.attemptId,
    type: "stage-advanced",
    occurredAt: now,
    studyDay: attempt.studyDay,
    learningTimeZone: attempt.learningTimeZone,
    metadata: {
      fromStage: stage,
      toStage: item.stage,
      status: item.status,
      dueDay: item.dueDay,
      maintenanceDueDay: item.maintenanceDueDay,
    },
  });
}

function deriveOutcome(attempt: RecallAttempt, correct: boolean): AttemptOutcome {
  if (attempt.revealed) return correct ? "correct-after-reveal" : "revealed";
  if (attempt.hadCompleteIncorrect) return "submitted-incorrect";
  if (correct && attempt.usedHint) return "assisted-correct";
  if (correct && attempt.context === "same-day") return "same-day-correct";
  return correct ? "clean-independent-correct" : "submitted-incorrect";
}

export function settleRecallAttempt(
  current: SpacedRecallState,
  input: { attemptId: string; correct: boolean; sessionId?: string },
  env: DeterministicEnv,
): DomainResult<AttemptOutcome> {
  if (env.connectivity !== "online") return rejected(current, "offline-settlement-disabled");
  const attempt = current.attempts[input.attemptId];
  if (!attempt) return rejected(current, "attempt-not-found");
  if (attempt.outcome) return duplicate(current, attempt.outcome);
  let state = cloneState(current);
  let nextAttempt = state.attempts[input.attemptId];
  if (!input.correct && !nextAttempt.revealed && !nextAttempt.hadCompleteIncorrect) {
    const evidenceResult = recordIncorrectSubmission(
      state,
      { attemptId: input.attemptId, complete: true, inputSnapshot: "" },
      env,
    );
    if (evidenceResult.status === "applied") state = evidenceResult.state;
    nextAttempt = state.attempts[input.attemptId];
  }
  const outcome = deriveOutcome(nextAttempt, input.correct);
  nextAttempt.outcome = outcome;
  nextAttempt.settledAt = env.now;
  const item = state.items[nextAttempt.itemId];
  item.lastAppearanceAt = env.now;

  if (nextAttempt.context === "same-day") {
    completeSameDayOpportunity(item, input.sessionId);
    appendEvent(state, {
      effectKey: `${nextAttempt.attemptId}:same-day-reinforced`,
      itemId: item.itemId,
      attemptId: nextAttempt.attemptId,
      type: "same-day-reinforced",
      occurredAt: env.now,
      studyDay: nextAttempt.studyDay,
      learningTimeZone: nextAttempt.learningTimeZone,
      metadata: { outcome },
    });
  } else if (outcome === "clean-independent-correct") {
    if (nextAttempt.context === "maintenance" && item.status === "mastered") {
      item.maintenanceDueDay = null;
    } else {
      advanceCleanStage(state, item, nextAttempt, env.now);
    }
  } else if (
    outcome === "assisted-correct" &&
    nextAttempt.context === "maintenance" &&
    item.status === "mastered"
  ) {
    item.maintenanceDueDay = addStudyDays(nextAttempt.studyDay, 1);
  } else if (
    outcome === "assisted-correct" &&
    nextAttempt.context !== "ordinary" &&
    nextAttempt.context !== "maintenance" &&
    item.status === "weak" &&
    item.stage === nextAttempt.context
  ) {
    item.dueDay = addStudyDays(nextAttempt.studyDay, 1);
  }

  appendEvent(state, {
    effectKey: `${nextAttempt.attemptId}:attempt-settled`,
    itemId: item.itemId,
    attemptId: nextAttempt.attemptId,
    type: "attempt-settled",
    occurredAt: env.now,
    studyDay: nextAttempt.studyDay,
    learningTimeZone: nextAttempt.learningTimeZone,
    metadata: { outcome, context: nextAttempt.context },
  });
  advanceOtherItemCounters(state, item.itemId, nextAttempt.studyDay);
  return applied(state, outcome);
}

export function createRecallSession(
  current: SpacedRecallState,
  input: { sessionId: string; basePlannedCount: number; now: string },
): DomainResult<RecallSession> {
  const existing = current.sessions[input.sessionId];
  if (existing) return duplicate(current, existing);
  const state = cloneState(current);
  const basePlannedCount = Math.max(0, Math.floor(input.basePlannedCount));
  const studyDay = studyDayAt(input.now, state.learningTimeZone);
  // A pending opportunity that missed its hard 3..7 window is not inserted
  // late. A genuinely new session on the same learning day gives it a fresh
  // window; if no such session happens, S1 remains due on the next day.
  for (const item of Object.values(state.items)) {
    if (item.sameDayPlan?.studyDay !== studyDay) continue;
    const pending = item.sameDayPlan.opportunities.find((entry) => entry.status === "pending");
    if (pending && pending.otherItemsSettled > 7) pending.otherItemsSettled = 0;
  }
  const session: RecallSession = {
    sessionId: input.sessionId,
    studyDay,
    basePlannedCount,
    sameDayExtraCap: Math.min(8, Math.ceil(basePlannedCount * 0.3)),
    sameDayExtrasUsed: 0,
  };
  state.sessions[input.sessionId] = session;
  return applied(state, session);
}

function sameDayCandidates(state: SpacedRecallState, session: RecallSession): RecallItemState[] {
  return Object.values(state.items)
    .filter((item) => {
      if (item.status !== "weak" || item.sameDayPlan?.studyDay !== session.studyDay) return false;
      if (item.suppressedUntilDay && item.suppressedUntilDay > session.studyDay) return false;
      const opportunity = item.sameDayPlan.opportunities.find((entry) => entry.status === "pending");
      return Boolean(
        opportunity &&
          opportunity.otherItemsSettled >= opportunity.offset &&
          opportunity.otherItemsSettled <= 7,
      );
    })
    .sort((left, right) => {
      const leftPlan = left.sameDayPlan as SameDayPlan;
      const rightPlan = right.sameDayPlan as SameDayPlan;
      const leftOpportunity = leftPlan.opportunities.find((entry) => entry.status === "pending") as SameDayOpportunity;
      const rightOpportunity = rightPlan.opportunities.find((entry) => entry.status === "pending") as SameDayOpportunity;
      if (leftOpportunity.ordinal !== rightOpportunity.ordinal) {
        return leftOpportunity.ordinal - rightOpportunity.ordinal;
      }
      const leftRemaining = 7 - leftOpportunity.otherItemsSettled;
      const rightRemaining = 7 - rightOpportunity.otherItemsSettled;
      if (leftRemaining !== rightRemaining) return leftRemaining - rightRemaining;
      if (leftPlan.evidenceCount !== rightPlan.evidenceCount) {
        return rightPlan.evidenceCount - leftPlan.evidenceCount;
      }
      const leftLast = left.lastAppearanceAt ?? "";
      const rightLast = right.lastAppearanceAt ?? "";
      if (leftLast !== rightLast) return leftLast.localeCompare(rightLast);
      return left.itemId.localeCompare(right.itemId);
    });
}

export function reserveNextSameDayItem(
  current: SpacedRecallState,
  sessionId: string,
): DomainResult<{ itemId: string; ordinal: 1 | 2 }> {
  const session = current.sessions[sessionId];
  if (!session) return rejected(current, "session-not-found");
  if (session.sameDayExtrasUsed >= session.sameDayExtraCap) {
    return rejected(current, "session-cap-reached");
  }
  const candidate = sameDayCandidates(current, session)[0];
  if (!candidate) return rejected(current, "no-eligible-same-day-item");
  const state = cloneState(current);
  const nextSession = state.sessions[sessionId];
  const item = state.items[candidate.itemId];
  const opportunity = item.sameDayPlan?.opportunities.find((entry) => entry.status === "pending");
  if (!opportunity) return rejected(current, "no-eligible-same-day-item");
  opportunity.status = "scheduled";
  opportunity.scheduledSessionId = sessionId;
  nextSession.sameDayExtrasUsed += 1;
  return applied(state, { itemId: item.itemId, ordinal: opportunity.ordinal });
}

function isItemSuppressed(item: RecallItemState, day: StudyDay): boolean {
  return Boolean(item.suppressedUntilDay && item.suppressedUntilDay > day);
}

export function buildReviewQueue(
  state: SpacedRecallState,
  now: string,
  limit = 20,
): ReviewQueue {
  const day = studyDayAt(now, state.learningTimeZone);
  const entries: ReviewQueueEntry[] = [];
  for (const item of Object.values(state.items)) {
    if (item.status === "paused" || item.status === "data-exception" || isItemSuppressed(item, day)) continue;
    const isMaintenance = item.status === "mastered" && item.maintenanceDueDay;
    const dueDay = isMaintenance ? item.maintenanceDueDay : item.status === "weak" ? item.dueDay : null;
    if (!dueDay || dueDay > day) continue;
    const overdue = dueDay < day;
    entries.push({
      itemId: item.itemId,
      kind: overdue ? "overdue" : "due-today",
      stage: isMaintenance ? "maintenance" : item.stage === "S0" ? "S1" : (item.stage ?? "S1"),
      dueDay,
      reason: isMaintenance
        ? "D+30 维护复习到期"
        : overdue
          ? `${item.stage === "S0" ? "S1" : (item.stage ?? "S1")} 已逾期 ${differenceInStudyDays(dueDay, day)} 个学习日`
          : `${item.stage === "S0" ? "S1" : (item.stage ?? "S1")} 复习到期`,
    });
  }
  entries.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "overdue" ? -1 : 1;
    if (left.dueDay !== right.dueDay) return left.dueDay.localeCompare(right.dueDay);
    const leftItem = state.items[left.itemId];
    const rightItem = state.items[right.itemId];
    if (leftItem.weakEvidenceCount !== rightItem.weakEvidenceCount) {
      return rightItem.weakEvidenceCount - leftItem.weakEvidenceCount;
    }
    return (leftItem.lastAppearanceAt ?? "").localeCompare(rightItem.lastAppearanceAt ?? "");
  });
  const totalOverdueCount = entries.filter((entry) => entry.kind === "overdue").length;
  const totalDueTodayCount = entries.length - totalOverdueCount;
  const visible = entries.slice(0, Math.max(0, limit));
  const visibleOverdue = visible.filter((entry) => entry.kind === "overdue").length;
  const visibleDueToday = visible.length - visibleOverdue;
  return {
    visible,
    remainingOverdueCount: Math.max(0, totalOverdueCount - visibleOverdue),
    remainingDueTodayCount: Math.max(0, totalDueTodayCount - visibleDueToday),
    totalOverdueCount,
    totalDueTodayCount,
  };
}

export function skipRecallItem(
  current: SpacedRecallState,
  itemId: string,
  now: string,
): DomainResult<1 | 2> {
  const existing = current.items[itemId];
  if (!existing) return rejected(current, "item-not-found");
  if (existing.status === "paused" || existing.status === "data-exception") {
    return rejected(current, "item-unavailable");
  }
  const state = cloneState(current);
  const day = studyDayAt(now, state.learningTimeZone);
  const item = state.items[itemId];
  const nextCount = item.skipCountsByDay[day] === 1 ? 2 : 1;
  item.skipCountsByDay[day] = nextCount;
  if (nextCount === 2) item.suppressedUntilDay = addStudyDays(day, 1);
  appendEvent(state, {
    effectKey: `skip:${itemId}:${day}:${nextCount}`,
    itemId,
    type: "skipped",
    occurredAt: now,
    studyDay: day,
    metadata: { count: nextCount, suppressedUntilDay: item.suppressedUntilDay },
  });
  return applied(state, nextCount);
}

export function pauseRecallItem(
  current: SpacedRecallState,
  input: { itemId: string; learningDays: 1 | 3 | 7 | 30 },
  now: string,
): DomainResult<StudyDay> {
  const existing = current.items[input.itemId];
  if (!existing) return rejected(current, "item-not-found");
  if (existing.status === "data-exception") return rejected(current, "item-unavailable");
  const state = cloneState(current);
  const day = studyDayAt(now, state.learningTimeZone);
  const item = state.items[input.itemId];
  const resumeDay = addStudyDays(day, input.learningDays);
  if (item.status !== "paused") {
    item.pause = { resumeDay, previous: snapshotItem(item) };
  } else if (item.pause) {
    item.pause.resumeDay = resumeDay;
  }
  item.status = "paused";
  appendEvent(state, {
    effectKey: `pause:${input.itemId}:${day}:${input.learningDays}`,
    itemId: input.itemId,
    type: "paused",
    occurredAt: now,
    studyDay: day,
    metadata: { resumeDay },
  });
  return applied(state, resumeDay);
}

export function resumeRecallItem(
  current: SpacedRecallState,
  itemId: string,
  now: string,
): DomainResult<RecallItemState> {
  const existing = current.items[itemId];
  if (!existing) return rejected(current, "item-not-found");
  if (existing.status !== "paused" || !existing.pause) return duplicate(current, existing);
  const state = cloneState(current);
  const item = state.items[itemId];
  const previous = item.pause?.previous;
  if (!previous) return duplicate(current, item);
  Object.assign(item, previous);
  delete item.pause;
  appendEvent(state, {
    effectKey: `resume:${itemId}:${now}`,
    itemId,
    type: "resumed",
    occurredAt: now,
    studyDay: studyDayAt(now, state.learningTimeZone),
    metadata: {},
  });
  return applied(state, item);
}

export function resumeDueRecallItems(current: SpacedRecallState, now: string): DomainResult<string[]> {
  const day = studyDayAt(now, current.learningTimeZone);
  const dueIds = Object.values(current.items)
    .filter((item) => item.status === "paused" && item.pause && item.pause.resumeDay <= day)
    .map((item) => item.itemId);
  if (dueIds.length === 0) return duplicate(current, []);
  let state = current;
  for (const itemId of dueIds) {
    const result = resumeRecallItem(state, itemId, now);
    if (result.status === "applied") state = result.state;
  }
  return { status: "applied", state, value: dueIds };
}

export function resetRecallMastery(
  current: SpacedRecallState,
  input: { itemId: string; confirmed: boolean },
  now: string,
): DomainResult<RecallItemState> {
  if (!input.confirmed) return rejected(current, "confirmation-required");
  const existing = current.items[input.itemId];
  if (!existing) return rejected(current, "item-not-found");
  if (existing.status === "paused" || existing.status === "data-exception") {
    return rejected(current, "item-unavailable");
  }
  const state = cloneState(current);
  const day = studyDayAt(now, state.learningTimeZone);
  const item = state.items[input.itemId];
  item.status = "weak";
  item.stage = "S0";
  item.dueDay = addStudyDays(day, 1);
  item.latestWeakDay = day;
  item.masteredDay = null;
  item.maintenanceDueDay = null;
  item.sameDayPlan = null;
  item.cleanStageDays = {};
  appendEvent(state, {
    effectKey: `mastery-reset:${input.itemId}:${now}`,
    itemId: input.itemId,
    type: "mastery-reset",
    occurredAt: now,
    studyDay: day,
    metadata: { dueDay: item.dueDay, historyPreserved: true },
  });
  return applied(state, item);
}

export function markDataException(
  current: SpacedRecallState,
  input: { itemId: string; code: DataExceptionCode; detail: string },
  now: string,
): DomainResult<RecallItemState> {
  const existing = current.items[input.itemId];
  if (!existing) return rejected(current, "item-not-found");
  const effectKey = `data-exception:${input.itemId}:${input.code}:${input.detail}`;
  if (current.eventsByEffectKey[effectKey]) return duplicate(current, existing);
  const state = cloneState(current);
  const item = state.items[input.itemId];
  item.dataException = {
    code: input.code,
    detail: input.detail,
    previous: item.status === "data-exception" ? item.dataException?.previous : snapshotItem(item),
  };
  item.status = "data-exception";
  appendEvent(state, {
    effectKey,
    itemId: item.itemId,
    type: "data-exception",
    occurredAt: now,
    studyDay: studyDayAt(now, state.learningTimeZone),
    metadata: { code: input.code, detail: input.detail },
  });
  return applied(state, item);
}

export function detectDeviceTimeZoneChange(
  current: SpacedRecallState,
  deviceTimeZone: string,
): DomainResult<string | null> {
  if (!assertValidTimeZone(deviceTimeZone)) return rejected(current, "invalid-time-zone");
  if (deviceTimeZone === current.learningTimeZone) {
    if (!current.pendingDeviceTimeZone) return duplicate(current, null);
    const state = cloneState(current);
    state.pendingDeviceTimeZone = null;
    return applied(state, null);
  }
  if (current.pendingDeviceTimeZone === deviceTimeZone) return duplicate(current, deviceTimeZone);
  const state = cloneState(current);
  state.pendingDeviceTimeZone = deviceTimeZone;
  return applied(state, deviceTimeZone);
}

export function keepLearningTimeZone(current: SpacedRecallState): DomainResult<null> {
  if (!current.pendingDeviceTimeZone) return duplicate(current, null);
  const state = cloneState(current);
  state.pendingDeviceTimeZone = null;
  return applied(state, null);
}

function shiftFutureDay(
  value: StudyDay | null,
  fromStudyDay: StudyDay,
  dayDelta: number,
): StudyDay | null {
  return value && value >= fromStudyDay ? addStudyDays(value, dayDelta) : value;
}

function shiftRestorableSchedule(
  restorable: RestorableItemState,
  fromStudyDay: StudyDay,
  toStudyDay: StudyDay,
  dayDelta: number,
): void {
  restorable.dueDay = shiftFutureDay(restorable.dueDay, fromStudyDay, dayDelta);
  restorable.maintenanceDueDay = shiftFutureDay(
    restorable.maintenanceDueDay,
    fromStudyDay,
    dayDelta,
  );
  if (
    restorable.sameDayPlan?.studyDay === fromStudyDay &&
    restorable.sameDayPlan.opportunities.some((entry) => entry.status !== "completed")
  ) {
    restorable.sameDayPlan.studyDay = toStudyDay;
  }
}

export function switchLearningTimeZone(
  current: SpacedRecallState,
  timeZone: string,
  now: string,
): DomainResult<string> {
  if (!assertValidTimeZone(timeZone)) return rejected(current, "invalid-time-zone");
  if (current.learningTimeZone === timeZone && !current.pendingDeviceTimeZone) {
    return duplicate(current, timeZone);
  }
  const state = cloneState(current);
  const fromStudyDay = studyDayAt(now, state.learningTimeZone);
  const toStudyDay = studyDayAt(now, timeZone);
  const dayDelta = differenceInStudyDays(fromStudyDay, toStudyDay);
  const previous = state.learningTimeZone;
  if (dayDelta !== 0) {
    for (const item of Object.values(state.items)) {
      item.dueDay = shiftFutureDay(item.dueDay, fromStudyDay, dayDelta);
      item.maintenanceDueDay = shiftFutureDay(item.maintenanceDueDay, fromStudyDay, dayDelta);
      item.suppressedUntilDay = shiftFutureDay(item.suppressedUntilDay, fromStudyDay, dayDelta);
      if (
        item.sameDayPlan?.studyDay === fromStudyDay &&
        item.sameDayPlan.opportunities.some((entry) => entry.status !== "completed")
      ) {
        item.sameDayPlan.studyDay = toStudyDay;
      }
      if (item.pause) {
        item.pause.resumeDay = addStudyDays(item.pause.resumeDay, dayDelta);
        shiftRestorableSchedule(item.pause.previous, fromStudyDay, toStudyDay, dayDelta);
      }
      if (item.dataException?.previous) {
        shiftRestorableSchedule(item.dataException.previous, fromStudyDay, toStudyDay, dayDelta);
      }
    }
  }
  state.learningTimeZone = timeZone;
  state.pendingDeviceTimeZone = null;
  state.timeZoneGuard = { fromStudyDay, toStudyDay, changedAt: now };
  appendEvent(state, {
    effectKey: `time-zone-switched:${previous}:${timeZone}:${now}`,
    type: "time-zone-switched",
    occurredAt: now,
    studyDay: toStudyDay,
    metadata: { previous, next: timeZone, historicalEvidenceRewritten: false },
  });
  return applied(state, timeZone);
}

export function updateReminderSettings(
  current: SpacedRecallState,
  patch: Partial<ReminderSettings>,
): DomainResult<ReminderSettings> {
  const state = cloneState(current);
  state.reminderSettings = { ...state.reminderSettings, ...patch };
  return applied(state, state.reminderSettings);
}

function minutesOfDay(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isWithinQuietHours(nowMinutes: number, startMinutes: number, endMinutes: number): boolean {
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

function reminderAlreadyRequestedForTravelDay(state: SpacedRecallState, day: StudyDay): boolean {
  const guardedDays = state.timeZoneGuard
    ? new Set([state.timeZoneGuard.fromStudyDay, state.timeZoneGuard.toStudyDay])
    : new Set<StudyDay>();
  return state.reminderRequests.some(
    (request) => request.studyDay === day || (guardedDays.has(day) && guardedDays.has(request.studyDay)),
  );
}

export function evaluateRecallReminder(
  state: SpacedRecallState,
  input: {
    now: string;
    connectivity: Connectivity;
    permission: NotificationPermissionState;
  },
): ReminderDecision {
  const settings = state.reminderSettings;
  if (!settings.enabled) return { kind: "none", reason: "disabled" };
  if (settings.paused) return { kind: "none", reason: "paused" };
  if (state.pendingDeviceTimeZone) return { kind: "none", reason: "time-zone-decision-pending" };
  const parts = dateParts(input.now, state.learningTimeZone);
  const day = studyDayAt(input.now, state.learningTimeZone);
  const nowMinutes = parts.hour * 60 + parts.minute;
  const reminderMinutes = minutesOfDay(settings.localTime);
  const quietStartMinutes = minutesOfDay(settings.quietStart);
  const quietEndMinutes = minutesOfDay(settings.quietEnd);
  // A reminder such as 23:00 inside 22:00..08:00 belongs to the
  // previous learning day when it is released exactly at 08:00.
  const releasingPreviousDayReminder =
    quietStartMinutes > quietEndMinutes &&
    reminderMinutes >= quietStartMinutes &&
    nowMinutes === quietEndMinutes;
  const forStudyDay = releasingPreviousDayReminder ? addStudyDays(day, -1) : day;
  if (!releasingPreviousDayReminder && nowMinutes < reminderMinutes) {
    return { kind: "none", reason: "before-reminder-time" };
  }
  if (buildReviewQueue(state, input.now, 1).visible.length === 0) {
    return { kind: "none", reason: "all-due-completed" };
  }
  if (reminderAlreadyRequestedForTravelDay(state, forStudyDay)) {
    return { kind: "none", reason: "already-requested-today" };
  }
  if (
    isWithinQuietHours(
      nowMinutes,
      quietStartMinutes,
      quietEndMinutes,
    )
  ) {
    return { kind: "defer-until-quiet-end", localTime: settings.quietEnd, forStudyDay };
  }
  if (input.connectivity !== "online") {
    return { kind: "in-app-only", reason: "offline-or-unknown" };
  }
  if (input.permission === "unsupported") {
    return { kind: "in-app-only", reason: "unsupported" };
  }
  if (input.permission !== "granted") {
    return { kind: "in-app-only", reason: "permission-not-granted" };
  }
  return { kind: "request-browser-notification", forStudyDay };
}

export function recordRecallReminderRequest(
  current: SpacedRecallState,
  input: { now: string; connectivity: Connectivity; permission: NotificationPermissionState },
): DomainResult<ReminderRequestRecord> {
  const decision = evaluateRecallReminder(current, input);
  if (decision.kind !== "request-browser-notification") {
    return rejected(current, "reminder-not-eligible");
  }
  const effectKey = `reminder-requested:${decision.forStudyDay}`;
  const existing = current.eventsByEffectKey[effectKey];
  if (existing) {
    const record = current.reminderRequests.find((entry) => entry.studyDay === decision.forStudyDay);
    if (record) return duplicate(current, record);
  }
  const state = cloneState(current);
  const record: ReminderRequestRecord = {
    studyDay: decision.forStudyDay,
    timeZone: state.learningTimeZone,
    requestedAt: input.now,
  };
  state.reminderRequests.push(record);
  appendEvent(state, {
    effectKey,
    type: "reminder-requested",
    occurredAt: input.now,
    studyDay: decision.forStudyDay,
    metadata: { deliveryClaimed: false },
  });
  return applied(state, record);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStudyDayValue(value: unknown): value is StudyDay {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return addStudyDays(value as StudyDay, 0) === value;
}

function isNullableStudyDay(value: unknown): value is StudyDay | null {
  return value === null || isStudyDayValue(value);
}

function isLocalTimeValue(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isStageValue(value: unknown): value is ReviewStage {
  return value === "S0" || value === "S1" || value === "S2" || value === "S3" || value === "S4";
}

function isItemStatusValue(value: unknown): value is ItemStatus {
  return (
    value === "ordinary" ||
    value === "weak" ||
    value === "mastered" ||
    value === "paused" ||
    value === "data-exception"
  );
}

function isAttemptOutcomeValue(value: unknown): value is AttemptOutcome {
  return (
    value === "clean-independent-correct" ||
    value === "same-day-correct" ||
    value === "assisted-correct" ||
    value === "revealed" ||
    value === "correct-after-reveal" ||
    value === "submitted-incorrect"
  );
}

function isAttemptContextValue(value: unknown): value is AttemptContext {
  return value === "ordinary" || value === "same-day" || value === "maintenance" || isStageValue(value);
}

function isSameDayOpportunityValue(value: unknown): value is SameDayOpportunity {
  if (!isRecord(value)) return false;
  return (
    (value.ordinal === 1 || value.ordinal === 2) &&
    Number.isInteger(value.offset) &&
    Number(value.offset) >= 3 &&
    Number(value.offset) <= 7 &&
    Number.isInteger(value.otherItemsSettled) &&
    Number(value.otherItemsSettled) >= 0 &&
    (value.status === "blocked" ||
      value.status === "pending" ||
      value.status === "scheduled" ||
      value.status === "completed") &&
    (value.scheduledSessionId === undefined || typeof value.scheduledSessionId === "string")
  );
}

function isSameDayPlanValue(value: unknown): value is SameDayPlan {
  if (!isRecord(value) || !isStudyDayValue(value.studyDay)) return false;
  if (!Number.isInteger(value.evidenceCount) || Number(value.evidenceCount) < 0) return false;
  return (
    Array.isArray(value.opportunities) &&
    value.opportunities.length === 2 &&
    value.opportunities.every(isSameDayOpportunityValue) &&
    value.opportunities[0].ordinal === 1 &&
    value.opportunities[1].ordinal === 2
  );
}

function isRestorableItemStateValue(value: unknown): value is RestorableItemState {
  if (!isRecord(value)) return false;
  return (
    (value.status === "ordinary" || value.status === "weak" || value.status === "mastered") &&
    (value.stage === null || isStageValue(value.stage)) &&
    isNullableStudyDay(value.dueDay) &&
    isNullableStudyDay(value.masteredDay) &&
    isNullableStudyDay(value.maintenanceDueDay) &&
    (value.sameDayPlan === null || isSameDayPlanValue(value.sameDayPlan))
  );
}

function isStudyDayRecord(
  value: unknown,
  validValue: (entry: unknown) => boolean,
): value is Record<StudyDay, unknown> {
  return (
    isRecord(value) &&
    Object.entries(value).every(([day, entry]) => isStudyDayValue(day) && validValue(entry))
  );
}

function isRecallItemValue(value: unknown, key: string): value is RecallItemState {
  if (!isRecord(value)) return false;
  if (
    value.itemId !== key ||
    typeof value.targetAnswer !== "string" ||
    typeof value.meaning !== "string" ||
    !isItemStatusValue(value.status) ||
    !(value.stage === null || isStageValue(value.stage)) ||
    !isNullableStudyDay(value.dueDay) ||
    !isNullableStudyDay(value.latestWeakDay) ||
    !isNullableStudyDay(value.masteredDay) ||
    !isNullableStudyDay(value.maintenanceDueDay) ||
    !(value.sameDayPlan === null || isSameDayPlanValue(value.sameDayPlan)) ||
    !Number.isInteger(value.weakEvidenceCount) ||
    Number(value.weakEvidenceCount) < 0 ||
    !(value.lastAppearanceAt === null || typeof value.lastAppearanceAt === "string") ||
    !isNullableStudyDay(value.suppressedUntilDay)
  ) {
    return false;
  }
  if (
    !isRecord(value.cleanStageDays) ||
    !Object.entries(value.cleanStageDays).every(
      ([stage, day]) => (stage === "S1" || stage === "S2" || stage === "S3" || stage === "S4") && isStudyDayValue(day),
    ) ||
    !isStudyDayRecord(value.masteryBlockedDays, (entry) => entry === "weak-evidence" || entry === "assistance") ||
    !isStudyDayRecord(value.skipCountsByDay, (entry) => entry === 1 || entry === 2)
  ) {
    return false;
  }
  if (value.pause !== undefined) {
    if (!isRecord(value.pause) || !isStudyDayValue(value.pause.resumeDay) || !isRestorableItemStateValue(value.pause.previous)) {
      return false;
    }
  }
  if (value.dataException !== undefined) {
    if (
      !isRecord(value.dataException) ||
      !(value.dataException.code === "missing-item-id" ||
        value.dataException.code === "missing-answer" ||
        value.dataException.code === "missing-meaning" ||
        value.dataException.code === "invalid-due") ||
      typeof value.dataException.detail !== "string" ||
      !(value.dataException.previous === undefined || isRestorableItemStateValue(value.dataException.previous))
    ) {
      return false;
    }
  }
  return true;
}

function isRecallAttemptValue(value: unknown, key: string): value is RecallAttempt {
  if (!isRecord(value)) return false;
  return (
    value.attemptId === key &&
    typeof value.itemId === "string" &&
    typeof value.openedAt === "string" &&
    isStudyDayValue(value.studyDay) &&
    typeof value.learningTimeZone === "string" &&
    assertValidTimeZone(value.learningTimeZone) &&
    isAttemptContextValue(value.context) &&
    typeof value.usedHint === "boolean" &&
    typeof value.revealed === "boolean" &&
    typeof value.hadCompleteIncorrect === "boolean" &&
    (value.preRevealInput === undefined || typeof value.preRevealInput === "string") &&
    (value.standardAnswer === undefined || typeof value.standardAnswer === "string") &&
    (value.outcome === undefined || isAttemptOutcomeValue(value.outcome)) &&
    (value.settledAt === undefined || typeof value.settledAt === "string")
  );
}

function isRecallEventValue(value: unknown, key: string): value is RecallEvent {
  if (!isRecord(value)) return false;
  return (
    value.eventId === key &&
    value.effectKey === key &&
    typeof value.type === "string" &&
    typeof value.occurredAt === "string" &&
    isStudyDayValue(value.studyDay) &&
    typeof value.learningTimeZone === "string" &&
    assertValidTimeZone(value.learningTimeZone) &&
    isRecord(value.metadata) &&
    (value.itemId === undefined || typeof value.itemId === "string") &&
    (value.attemptId === undefined || typeof value.attemptId === "string")
  );
}

function isRecallSessionValue(value: unknown, key: string): value is RecallSession {
  if (!isRecord(value)) return false;
  return (
    value.sessionId === key &&
    isStudyDayValue(value.studyDay) &&
    Number.isInteger(value.basePlannedCount) &&
    Number(value.basePlannedCount) >= 0 &&
    Number.isInteger(value.sameDayExtraCap) &&
    Number(value.sameDayExtraCap) >= 0 &&
    Number(value.sameDayExtraCap) <= 8 &&
    Number.isInteger(value.sameDayExtrasUsed) &&
    Number(value.sameDayExtrasUsed) >= 0
  );
}

function isReminderSettingsValue(value: unknown): value is ReminderSettings {
  if (!isRecord(value)) return false;
  return (
    typeof value.enabled === "boolean" &&
    typeof value.paused === "boolean" &&
    isLocalTimeValue(value.localTime) &&
    isLocalTimeValue(value.quietStart) &&
    isLocalTimeValue(value.quietEnd)
  );
}

function isReminderRequestValue(value: unknown): value is ReminderRequestRecord {
  if (!isRecord(value)) return false;
  return (
    isStudyDayValue(value.studyDay) &&
    typeof value.timeZone === "string" &&
    assertValidTimeZone(value.timeZone) &&
    typeof value.requestedAt === "string"
  );
}

function isSpacedRecallState(value: unknown): value is SpacedRecallState {
  if (!isRecord(value)) return false;
  if (
    value.storageVersion !== SPACED_RECALL_STORAGE_VERSION ||
    !Number.isInteger(value.revision) ||
    Number(value.revision) < 0 ||
    typeof value.learningTimeZone !== "string" ||
    !assertValidTimeZone(value.learningTimeZone) ||
    !(value.pendingDeviceTimeZone === null ||
      (typeof value.pendingDeviceTimeZone === "string" && assertValidTimeZone(value.pendingDeviceTimeZone))) ||
    !isRecord(value.items) ||
    !Object.entries(value.items).every(([key, item]) => isRecallItemValue(item, key)) ||
    !isRecord(value.attempts) ||
    !Object.entries(value.attempts).every(([key, attempt]) => isRecallAttemptValue(attempt, key)) ||
    !isRecord(value.eventsByEffectKey) ||
    !Object.entries(value.eventsByEffectKey).every(([key, event]) => isRecallEventValue(event, key)) ||
    !isRecord(value.sessions) ||
    !Object.entries(value.sessions).every(([key, session]) => isRecallSessionValue(session, key)) ||
    !isReminderSettingsValue(value.reminderSettings) ||
    !Array.isArray(value.reminderRequests) ||
    !value.reminderRequests.every(isReminderRequestValue)
  ) {
    return false;
  }
  if (value.timeZoneGuard !== null) {
    if (
      !isRecord(value.timeZoneGuard) ||
      !isStudyDayValue(value.timeZoneGuard.fromStudyDay) ||
      !isStudyDayValue(value.timeZoneGuard.toStudyDay) ||
      typeof value.timeZoneGuard.changedAt !== "string"
    ) {
      return false;
    }
  }
  return true;
}

export function loadSpacedRecallState(
  storage: StorageLike,
  fallbackTimeZone: string,
  key = SPACED_RECALL_STORAGE_KEY,
): LoadResult {
  const raw = storage.getItem(key);
  if (raw === null) return { status: "empty", state: createInitialSpacedRecallState(fallbackTimeZone) };
  try {
    const parsed = JSON.parse(raw) as { storageVersion?: number };
    if (parsed.storageVersion !== SPACED_RECALL_STORAGE_VERSION) {
      return { status: "storage-error", reason: "unsupported-version", rawPreserved: true };
    }
    if (!isSpacedRecallState(parsed)) {
      return { status: "storage-error", reason: "corrupt", rawPreserved: true };
    }
    return { status: "loaded", state: parsed };
  } catch {
    return { status: "storage-error", reason: "corrupt", rawPreserved: true };
  }
}

export function saveSpacedRecallState(
  storage: StorageLike,
  state: SpacedRecallState,
  expectedPreviousRevision: number,
  key = SPACED_RECALL_STORAGE_KEY,
): "saved" | "revision-conflict" | "storage-error" {
  const raw = storage.getItem(key);
  if (raw !== null) {
    try {
      const stored = JSON.parse(raw) as Partial<SpacedRecallState>;
      if (stored.revision !== expectedPreviousRevision) return "revision-conflict";
    } catch {
      return "storage-error";
    }
  } else if (expectedPreviousRevision !== 0) {
    return "revision-conflict";
  }
  try {
    storage.setItem(key, JSON.stringify(state));
    return "saved";
  } catch {
    return "storage-error";
  }
}
