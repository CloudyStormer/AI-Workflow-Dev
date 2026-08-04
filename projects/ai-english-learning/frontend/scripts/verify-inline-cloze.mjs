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

console.log('Inline cloze invariants passed (1,200 randomized hint cases plus input/edit/paste/separator boundaries).')
