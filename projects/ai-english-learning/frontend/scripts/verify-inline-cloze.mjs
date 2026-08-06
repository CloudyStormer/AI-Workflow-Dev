import assert from 'node:assert/strict'
import {
  composeClozeAnswer,
  deleteClozeLetter,
  getAdjacentEditableIndex,
  getCompatibleAnswers,
  getRemainingIndexes,
  insertClozeLetters,
  pasteClozeValue,
} from '../src/utils/inlineCloze.ts'
import {
  buildLetterHint,
  getMoreCompatibleHint,
  getRerolledCompatibleHint,
} from '../src/utils/wordHints.ts'
import {
  clearClozeSession,
  classifyRevealBeforeState,
  createRevealRecord,
  formatAnswerForScreenReader,
  getLearningOutcome,
  isRevealAnswerAvailable,
  loadClozeSession,
  loadSettledRevealReviews,
  saveClozeSession,
  saveSettledRevealReview,
  setRevealRetryResult,
  settleRevealReview,
  shouldAwardMastery,
  startRevealRetry,
} from '../src/utils/revealAnswer.ts'

function insert(answer, hints, value, initialLetters = {}, cursor = null) {
  return insertClozeLetters(answer, hints, initialLetters, cursor, value)
}

function assertSeparatorFlow(answer) {
  const inserted = insert(answer, [], answer.replace(/[^a-z]/gi, ''))
  assert.equal(composeClozeAnswer(answer, [], inserted.userLetters), answer.toLowerCase())
  assert.equal(getRemainingIndexes(answer, [], inserted.userLetters).length, 0)
}

const noHintApple = insert('apple', [], 'apple')
assert.equal(composeClozeAnswer('apple', [], noHintApple.userLetters), 'apple')
assert.equal(noHintApple.acceptedCount, 5)

const hintedApple = insert('apple', [3, 4], 'app')
assert.equal(composeClozeAnswer('apple', [3, 4], hintedApple.userLetters), 'apple')
assert.deepEqual(Object.keys(hintedApple.userLetters).map(Number), [0, 1, 2])

const replacedApple = insert('apple', [3, 4], 'x', hintedApple.userLetters, 1)
assert.equal(composeClozeAnswer('apple', [3, 4], replacedApple.userLetters), 'axple')

assert.equal(getAdjacentEditableIndex('well-known', [1], 3, 1), 5)
assert.equal(getAdjacentEditableIndex("don't", [0], 2, 1), 4)

const deletedCurrent = deleteClozeLetter('apple', [3, 4], hintedApple.userLetters, 2)
assert.equal(deletedCurrent.cursorIndex, 2)
assert.equal(deletedCurrent.userLetters[2], undefined)
const deletedPrevious = deleteClozeLetter('apple', [3, 4], deletedCurrent.userLetters, 2)
assert.equal(deletedPrevious.cursorIndex, 1)
assert.equal(deletedPrevious.userLetters[1], undefined)

const fullPaste = pasteClozeValue('apple', [3, 4], {}, 0, 'apple')
assert.equal(fullPaste.mode, 'full')
assert.equal(composeClozeAnswer('apple', [3, 4], fullPaste.userLetters), 'apple')
const incompatiblePaste = pasteClozeValue('apple', [3, 4], { 0: 'a' }, 1, 'applx')
assert.equal(incompatiblePaste.mode, 'rejected')
assert.deepEqual(incompatiblePaste.userLetters, { 0: 'a' })
const remainingPaste = pasteClozeValue('apple', [3, 4], { 0: 'a' }, 1, 'pp')
assert.equal(remainingPaste.mode, 'remaining')
assert.equal(composeClozeAnswer('apple', [3, 4], remainingPaste.userLetters), 'apple')
const filteredPaste = pasteClozeValue('apple', [], {}, 0, 'a1🙂p')
assert.equal(filteredPaste.mode, 'remaining')
assert.equal(filteredPaste.acceptedCount, 2)
assert.equal(filteredPaste.rejectedCount, 2)
assert.equal(composeClozeAnswer('apple', [], filteredPaste.userLetters), 'ap')
for (const [answer, value] of [
  ["don't", 'don1t'],
  ['ice cream', 'ice1cream'],
  ['ice cream', 'ice🙂cream'],
  ['well-known', 'well1known'],
]) {
  const separatorFilteredPaste = pasteClozeValue(answer, [], {}, 0, value)
  assert.equal(separatorFilteredPaste.mode, 'remaining')
  assert.equal(composeClozeAnswer(answer, [], separatorFilteredPaste.userLetters), answer)
}
assert.equal(pasteClozeValue("don't", [], {}, 0, 'don-t').mode, 'rejected')
assert.equal(pasteClozeValue('well-known', [], {}, 0, "well'known").mode, 'rejected')

const filtered = insert('apple', [], 'a1🙂p')
assert.equal(filtered.acceptedCount, 2)
assert.equal(filtered.rejectedCount, 2)
assert.equal(composeClozeAnswer('apple', [], filtered.userLetters), 'ap')

assertSeparatorFlow('well-known')
assertSeparatorFlow("don't")
assertSeparatorFlow('ice cream')

assert.equal(buildLetterHint('a', 1, 0).revealedCount, 0)
assert.equal(buildLetterHint('to', 1, 0).revealedCount, 1)
assert.equal(buildLetterHint('to', 1, 0).letterCount - buildLetterHint('to', 1, 0).revealedCount, 1)

assert.deepEqual(getCompatibleAnswers('color', ['caper', 'colon', 'short'], [0, 4]), ['color', 'caper'])

assert.equal(classifyRevealBeforeState({ result: 'idle', feedbackKind: 'idle', filledCount: 0 }), 'unanswered')
assert.equal(classifyRevealBeforeState({ result: 'idle', feedbackKind: 'idle', filledCount: 2 }), 'partial')
assert.equal(classifyRevealBeforeState({ result: 'idle', feedbackKind: 'incomplete', filledCount: 2 }), 'incomplete')
assert.equal(classifyRevealBeforeState({ result: 'incorrect', feedbackKind: 'incorrect', filledCount: 5 }), 'incorrect')

const revealInput = { 0: 'a', 1: 'p' }
const firstReveal = createRevealRecord({
  existingRecord: null,
  result: 'idle',
  feedbackKind: 'idle',
  filledCount: 2,
  userLetters: revealInput,
  standardAnswer: 'apple',
  revealedAt: '2026-08-04T08:00:00.000Z',
})
revealInput[0] = 'x'
assert.deepEqual(firstReveal.beforeInputSnapshot, { 0: 'a', 1: 'p' })
assert.equal(firstReveal.beforeState, 'partial')
assert.equal(firstReveal.standardAnswer, 'apple')

const idempotentReveal = createRevealRecord({
  existingRecord: firstReveal,
  result: 'incorrect',
  feedbackKind: 'incorrect',
  filledCount: 5,
  userLetters: { 0: 'x' },
  standardAnswer: 'changed',
  revealedAt: '2026-08-04T09:00:00.000Z',
})
assert.strictEqual(idempotentReveal, firstReveal)

const startedRetry = startRevealRetry(firstReveal)
assert.equal(startedRetry.retryStarted, true)
assert.equal(startedRetry.retryResult, 'in-progress')
assert.equal(setRevealRetryResult(startedRetry, 'incorrect').retryResult, 'incorrect')
assert.equal(setRevealRetryResult(startedRetry, 'correct').retryResult, 'correct')
assert.equal(formatAnswerForScreenReader('a'), 'A')
assert.equal(formatAnswerForScreenReader('to'), 'T、O')
assert.equal(formatAnswerForScreenReader("well-known don't ice cream"), 'W、E、L、L、连字符、K、N、O、W、N、空格、D、O、N、撇号、T、空格、I、C、E、空格、C、R、E、A、M')
assert.equal(getLearningOutcome('idle', false, false), 'answering')
assert.equal(getLearningOutcome('incorrect', false, false), 'incorrect')
assert.equal(getLearningOutcome('correct', false, false), 'independent-correct')
assert.equal(getLearningOutcome('idle', true, true), 'revealed')
assert.equal(getLearningOutcome('correct', true, false), 'correct-after-reveal')
assert.equal(isRevealAnswerAvailable('cloze', 'idle', false, false), true)
assert.equal(isRevealAnswerAvailable('study', 'idle', false, false), false)
assert.equal(isRevealAnswerAvailable('cloze', 'correct', false, false), false)
assert.equal(isRevealAnswerAvailable('cloze', 'idle', true, false), false)
assert.equal(shouldAwardMastery(true, false), true)
assert.equal(shouldAwardMastery(true, true), false)
assert.equal(shouldAwardMastery(false, false), false)
const settledReveal = settleRevealReview([], startedRetry, 0, 'word-0', '2026-08-04T08:05:00.000Z')
assert.equal(settledReveal.length, 1)
assert.equal(settledReveal[0].finalOutcome, 'revealed')
assert.deepEqual(settledReveal[0].scoring, {
  accuracyDenominator: 1,
  accuracyNumerator: 0,
  masteryGain: 0,
  breaksCorrectStreak: true,
  reviewBaseline: 'incorrect',
})
assert.strictEqual(
  settleRevealReview(settledReveal, startedRetry, 0, 'word-0', '2026-08-04T08:06:00.000Z'),
  settledReveal,
)
const settledCorrectAfterReveal = settleRevealReview(
  [],
  setRevealRetryResult(startedRetry, 'correct'),
  0,
  'word-0',
  '2026-08-04T08:07:00.000Z',
)
assert.equal(settledCorrectAfterReveal[0].finalOutcome, 'correct-after-reveal')

const sessionStorageValues = new Map()
globalThis.window = {
  sessionStorage: {
    getItem: (key) => sessionStorageValues.get(key) ?? null,
    setItem: (key, value) => sessionStorageValues.set(key, value),
    removeItem: (key) => sessionStorageValues.delete(key),
  },
}
const persistedSession = {
  version: 1,
  wordIndex: 0,
  wordKey: 'word-0',
  mode: 'cloze',
  initialHintState: { level: 1, variant: 8, revealedIndexes: [0] },
  hintState: { level: 1, variant: 8, revealedIndexes: [0] },
  userLetters: { 1: 'p' },
  result: 'idle',
  feedback: { kind: 'revealed', message: '已查看答案' },
  hasRevealedAnswer: true,
  isAnswerRevealed: true,
  revealRecord: firstReveal,
}
assert.equal(saveClozeSession(persistedSession), true)
const migratedSession = loadClozeSession()
assert.equal(migratedSession.version, 2)
assert.equal(migratedSession.wordIndex, persistedSession.wordIndex)
assert.equal(migratedSession.wordKey, persistedSession.wordKey)
assert.match(migratedSession.attemptId, /^legacy-/)
assert.equal(migratedSession.hintUsed, true)
assert.equal(migratedSession.hadIncorrectSubmission, false)
assert.equal(migratedSession.recallContext, null)
assert.deepEqual(migratedSession.revealRecord, firstReveal)
assert.equal(saveClozeSession(migratedSession), true)
assert.deepEqual(loadClozeSession(), migratedSession)
clearClozeSession()
assert.equal(loadClozeSession(), null)
saveSettledRevealReview(firstReveal, 0, 'word-0')
saveSettledRevealReview(firstReveal, 0, 'word-0')
assert.equal(loadSettledRevealReviews().length, 1)
delete globalThis.window

for (const answer of ['ephemeral', 'serendipity', 'resilient', 'well-known', "don't", 'ice cream']) {
  for (let variant = 0; variant < 200; variant += 1) {
    const initialHint = buildLetterHint(answer, 1, variant)
    const editableIndex = initialHint.characters.findIndex(({ isHinted, isSeparator }) => !isHinted && !isSeparator)
    const blockedIndexes = editableIndex >= 0 ? [editableIndex] : []
    const moreHint = getMoreCompatibleHint(
      answer,
      initialHint.revealedIndexes,
      blockedIndexes,
      initialHint.level,
      variant,
    )

    if (moreHint) {
      assert(initialHint.revealedIndexes.every((index) => moreHint.revealedIndexes.includes(index)))
      assert(moreHint.revealedIndexes.every((index) => !blockedIndexes.includes(index)))
    }

    const rerolledHint = getRerolledCompatibleHint(
      answer,
      initialHint.revealedIndexes,
      blockedIndexes,
      initialHint.level,
      variant,
    )

    if (rerolledHint) {
      assert.equal(rerolledHint.revealedIndexes.length, initialHint.revealedIndexes.length)
      assert(rerolledHint.revealedIndexes.every((index) => !blockedIndexes.includes(index)))
      assert.notDeepEqual(rerolledHint.revealedIndexes, initialHint.revealedIndexes)
    }
  }
}

console.log('Inline cloze and reveal-answer invariants passed (1,200 randomized hint cases plus input/edit/paste/separator/reveal boundaries).')
