import type { ClozeUserLetters } from './inlineCloze'

export const CLOZE_SESSION_STORAGE_KEY = 'ai-english-learning:cloze-session:v1'
export const REVEAL_REVIEW_STORAGE_KEY = 'ai-english-learning:reveal-reviews:v1'

export type AnswerResult = 'idle' | 'correct' | 'incorrect'

export type FeedbackKind =
  | 'idle'
  | 'incomplete'
  | 'incorrect'
  | 'correct'
  | 'editing'
  | 'filtered'
  | 'hint'
  | 'revealed'
  | 'retrying'
  | 'assisted-correct'

export type FeedbackState = {
  kind: FeedbackKind
  message: string
}

export type HintSnapshot = {
  level: number
  variant: number
  revealedIndexes: number[]
}

export type RevealBeforeState = 'unanswered' | 'partial' | 'incomplete' | 'incorrect'
export type LearningOutcome =
  | 'answering'
  | 'incorrect'
  | 'independent-correct'
  | 'revealed'
  | 'correct-after-reveal'

export type RevealAnswerRecord = {
  revealedAt: string
  beforeState: RevealBeforeState
  beforeInputSnapshot: ClozeUserLetters
  standardAnswer: string
  retryStarted: boolean
  retryResult: 'not-started' | 'in-progress' | 'incorrect' | 'correct'
}

export type SettledRevealReview = RevealAnswerRecord & {
  wordIndex: number
  wordKey: string
  settledAt: string
  finalOutcome: 'revealed' | 'correct-after-reveal'
  scoring: {
    accuracyDenominator: 1
    accuracyNumerator: 0
    masteryGain: 0
    breaksCorrectStreak: true
    reviewBaseline: 'incorrect'
  }
}

export type ClozeRecallContext = {
  kind: 'ordinary' | 'same-day' | 'cross-day' | 'maintenance'
  stage: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'M1' | null
  reason: string
  openedLearningDay: string
}

export type PersistedClozeSession = {
  version: 2
  wordIndex: number
  wordKey: string
  attemptId: string
  mode: 'study' | 'cloze'
  initialHintState: HintSnapshot
  hintState: HintSnapshot
  userLetters: ClozeUserLetters
  result: AnswerResult
  feedback: FeedbackState
  hasRevealedAnswer: boolean
  isAnswerRevealed: boolean
  revealRecord: RevealAnswerRecord | null
  hintUsed: boolean
  hadIncorrectSubmission: boolean
  recallContext: ClozeRecallContext | null
}

type RevealStateInput = {
  result: AnswerResult
  feedbackKind: FeedbackKind
  filledCount: number
}

type RevealRecordInput = RevealStateInput & {
  existingRecord: RevealAnswerRecord | null
  userLetters: ClozeUserLetters
  standardAnswer: string
  revealedAt?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHintSnapshot(value: unknown): value is HintSnapshot {
  return isRecord(value)
    && Number.isFinite(value.level)
    && Number.isFinite(value.variant)
    && Array.isArray(value.revealedIndexes)
    && value.revealedIndexes.every((index) => Number.isInteger(index) && index >= 0)
}

function isUserLetters(value: unknown): value is ClozeUserLetters {
  return isRecord(value)
    && Object.entries(value).every(([index, character]) => (
      Number.isInteger(Number(index))
      && Number(index) >= 0
      && typeof character === 'string'
      && /^[a-z]$/i.test(character)
    ))
}

function isAnswerResult(value: unknown): value is AnswerResult {
  return value === 'idle' || value === 'correct' || value === 'incorrect'
}

function isFeedback(value: unknown): value is FeedbackState {
  const validKinds: FeedbackKind[] = [
    'idle',
    'incomplete',
    'incorrect',
    'correct',
    'editing',
    'filtered',
    'hint',
    'revealed',
    'retrying',
    'assisted-correct',
  ]

  return isRecord(value)
    && validKinds.includes(value.kind as FeedbackKind)
    && typeof value.message === 'string'
}

function isRevealRecord(value: unknown): value is RevealAnswerRecord {
  if (!isRecord(value)) return false

  const validBeforeStates: RevealBeforeState[] = ['unanswered', 'partial', 'incomplete', 'incorrect']
  const validRetryResults: RevealAnswerRecord['retryResult'][] = [
    'not-started',
    'in-progress',
    'incorrect',
    'correct',
  ]

  return typeof value.revealedAt === 'string'
    && validBeforeStates.includes(value.beforeState as RevealBeforeState)
    && isUserLetters(value.beforeInputSnapshot)
    && typeof value.standardAnswer === 'string'
    && typeof value.retryStarted === 'boolean'
    && validRetryResults.includes(value.retryResult as RevealAnswerRecord['retryResult'])
}

function isRecallContext(value: unknown): value is ClozeRecallContext {
  if (!isRecord(value)) return false
  const validKinds: ClozeRecallContext['kind'][] = [
    'ordinary',
    'same-day',
    'cross-day',
    'maintenance',
  ]
  const validStages: Array<ClozeRecallContext['stage']> = [null, 'S0', 'S1', 'S2', 'S3', 'S4', 'M1']

  return validKinds.includes(value.kind as ClozeRecallContext['kind'])
    && validStages.includes(value.stage as ClozeRecallContext['stage'])
    && typeof value.reason === 'string'
    && typeof value.openedLearningDay === 'string'
}

function hashText(value: string) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function createAttemptId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `attempt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function migrateLegacySession(value: Record<string, unknown>, rawValue: string): PersistedClozeSession | null {
  if (
    value.version !== 1
    || !Number.isInteger(value.wordIndex)
    || Number(value.wordIndex) < 0
    || typeof value.wordKey !== 'string'
    || (value.mode !== 'study' && value.mode !== 'cloze')
    || !isHintSnapshot(value.initialHintState)
    || !isHintSnapshot(value.hintState)
    || !isUserLetters(value.userLetters)
    || !isAnswerResult(value.result)
    || !isFeedback(value.feedback)
    || typeof value.hasRevealedAnswer !== 'boolean'
    || typeof value.isAnswerRevealed !== 'boolean'
    || (value.revealRecord !== null && !isRevealRecord(value.revealRecord))
  ) return null

  if (value.isAnswerRevealed && (!value.hasRevealedAnswer || value.revealRecord === null)) return null
  if (value.hasRevealedAnswer && value.revealRecord === null) return null

  return {
    version: 2,
    wordIndex: Number(value.wordIndex),
    wordKey: value.wordKey,
    attemptId: `legacy-${hashText(rawValue)}`,
    mode: value.mode,
    initialHintState: value.initialHintState,
    hintState: value.hintState,
    userLetters: value.userLetters,
    result: value.result,
    feedback: value.feedback,
    hasRevealedAnswer: value.hasRevealedAnswer,
    isAnswerRevealed: value.isAnswerRevealed,
    revealRecord: value.revealRecord,
    hintUsed: value.hintState.revealedIndexes.length > 0,
    hadIncorrectSubmission: value.result === 'incorrect',
    recallContext: null,
  }
}

function isSettledRevealReview(value: unknown): value is SettledRevealReview {
  if (!isRecord(value)) return false
  const { wordIndex, wordKey, settledAt, finalOutcome } = value
  const scoring = value.scoring
  if (!isRevealRecord(value)) return false

  return Number.isInteger(wordIndex)
    && Number(wordIndex) >= 0
    && typeof wordKey === 'string'
    && typeof settledAt === 'string'
    && (finalOutcome === 'revealed' || finalOutcome === 'correct-after-reveal')
    && isRecord(scoring)
    && scoring.accuracyDenominator === 1
    && scoring.accuracyNumerator === 0
    && scoring.masteryGain === 0
    && scoring.breaksCorrectStreak === true
    && scoring.reviewBaseline === 'incorrect'
}

export function classifyRevealBeforeState({
  result,
  feedbackKind,
  filledCount,
}: RevealStateInput): RevealBeforeState {
  if (result === 'incorrect') return 'incorrect'
  if (feedbackKind === 'incomplete') return 'incomplete'
  return filledCount === 0 ? 'unanswered' : 'partial'
}

export function getLearningOutcome(
  result: AnswerResult,
  hasRevealedAnswer: boolean,
  isAnswerRevealed: boolean,
): LearningOutcome {
  if (isAnswerRevealed) return 'revealed'
  if (result === 'correct') return hasRevealedAnswer ? 'correct-after-reveal' : 'independent-correct'
  if (result === 'incorrect') return 'incorrect'
  return 'answering'
}

export function isRevealAnswerAvailable(
  mode: 'study' | 'cloze',
  result: AnswerResult,
  hasRevealedAnswer: boolean,
  isAnswerRevealed: boolean,
) {
  return mode === 'cloze'
    && result !== 'correct'
    && !hasRevealedAnswer
    && !isAnswerRevealed
}

export function shouldAwardMastery(requestedMastery: boolean, hasRevealedAnswer: boolean) {
  return requestedMastery && !hasRevealedAnswer
}

export function createRevealRecord({
  existingRecord,
  result,
  feedbackKind,
  filledCount,
  userLetters,
  standardAnswer,
  revealedAt = new Date().toISOString(),
}: RevealRecordInput): RevealAnswerRecord {
  if (existingRecord) return existingRecord

  return {
    revealedAt,
    beforeState: classifyRevealBeforeState({ result, feedbackKind, filledCount }),
    beforeInputSnapshot: { ...userLetters },
    standardAnswer,
    retryStarted: false,
    retryResult: 'not-started',
  }
}

export function startRevealRetry(record: RevealAnswerRecord): RevealAnswerRecord {
  return {
    ...record,
    retryStarted: true,
    retryResult: 'in-progress',
  }
}

export function setRevealRetryResult(
  record: RevealAnswerRecord,
  retryResult: 'in-progress' | 'incorrect' | 'correct',
): RevealAnswerRecord {
  return {
    ...record,
    retryStarted: true,
    retryResult,
  }
}

export function settleRevealReview(
  existingReviews: SettledRevealReview[],
  record: RevealAnswerRecord,
  wordIndex: number,
  wordKey: string,
  settledAt = new Date().toISOString(),
) {
  const existingReview = existingReviews.find(
    (review) => review.wordKey === wordKey && review.revealedAt === record.revealedAt,
  )
  if (existingReview) return existingReviews

  const settledReview: SettledRevealReview = {
    ...record,
    wordIndex,
    wordKey,
    settledAt,
    finalOutcome: record.retryResult === 'correct' ? 'correct-after-reveal' : 'revealed',
    scoring: {
      accuracyDenominator: 1,
      accuracyNumerator: 0,
      masteryGain: 0,
      breaksCorrectStreak: true,
      reviewBaseline: 'incorrect',
    },
  }

  return [...existingReviews, settledReview]
}

export function formatAnswerForScreenReader(answer: string) {
  return Array.from(answer)
    .map((character) => {
      if (/^[a-z]$/i.test(character)) return character.toUpperCase()
      if (character === ' ') return '空格'
      if (character === '-') return '连字符'
      if (character === "'" || character === '’') return '撇号'
      return character
    })
    .join('、')
}

export function loadClozeSession(): PersistedClozeSession | null {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.sessionStorage.getItem(CLOZE_SESSION_STORAGE_KEY)
    if (!rawValue) return null
    const value: unknown = JSON.parse(rawValue)

    if (!isRecord(value)) return null
    if (value.version === 1) return migrateLegacySession(value, rawValue)

    if (
      value.version !== 2
      || !Number.isInteger(value.wordIndex)
      || Number(value.wordIndex) < 0
      || typeof value.wordKey !== 'string'
      || typeof value.attemptId !== 'string'
      || value.attemptId.length < 8
      || (value.mode !== 'study' && value.mode !== 'cloze')
      || !isHintSnapshot(value.initialHintState)
      || !isHintSnapshot(value.hintState)
      || !isUserLetters(value.userLetters)
      || !isAnswerResult(value.result)
      || !isFeedback(value.feedback)
      || typeof value.hasRevealedAnswer !== 'boolean'
      || typeof value.isAnswerRevealed !== 'boolean'
      || (value.revealRecord !== null && !isRevealRecord(value.revealRecord))
      || typeof value.hintUsed !== 'boolean'
      || typeof value.hadIncorrectSubmission !== 'boolean'
      || (value.recallContext !== null && !isRecallContext(value.recallContext))
      || (value.isAnswerRevealed && (!value.hasRevealedAnswer || value.revealRecord === null))
      || (value.hasRevealedAnswer && value.revealRecord === null)
    ) {
      window.sessionStorage.removeItem(CLOZE_SESSION_STORAGE_KEY)
      return null
    }

    return value as PersistedClozeSession
  } catch {
    window.sessionStorage.removeItem(CLOZE_SESSION_STORAGE_KEY)
    return null
  }
}

export function saveClozeSession(session: PersistedClozeSession) {
  if (typeof window === 'undefined') return false

  try {
    window.sessionStorage.setItem(CLOZE_SESSION_STORAGE_KEY, JSON.stringify(session))
    return true
  } catch {
    return false
  }
}

export function clearClozeSession() {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.removeItem(CLOZE_SESSION_STORAGE_KEY)
  } catch {
    // The in-memory exercise can still advance safely.
  }
}

export function loadSettledRevealReviews(): SettledRevealReview[] {
  if (typeof window === 'undefined') return []

  try {
    const rawValue = window.sessionStorage.getItem(REVEAL_REVIEW_STORAGE_KEY)
    if (!rawValue) return []
    const value: unknown = JSON.parse(rawValue)

    if (!Array.isArray(value) || !value.every(isSettledRevealReview)) {
      window.sessionStorage.removeItem(REVEAL_REVIEW_STORAGE_KEY)
      return []
    }

    return value
  } catch {
    window.sessionStorage.removeItem(REVEAL_REVIEW_STORAGE_KEY)
    return []
  }
}

export function saveSettledRevealReview(
  record: RevealAnswerRecord,
  wordIndex: number,
  wordKey: string,
) {
  if (typeof window === 'undefined') return false

  try {
    const nextReviews = settleRevealReview(
      loadSettledRevealReviews(),
      record,
      wordIndex,
      wordKey,
    )
    window.sessionStorage.setItem(REVEAL_REVIEW_STORAGE_KEY, JSON.stringify(nextReviews))
    return true
  } catch {
    return false
  }
}
