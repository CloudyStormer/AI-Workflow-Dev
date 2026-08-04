export type ClozeUserLetters = Record<number, string>

export type ClozeInsertResult = {
  userLetters: ClozeUserLetters
  cursorIndex: number | null
  acceptedCount: number
  rejectedCount: number
}

export type ClozePasteResult = ClozeInsertResult & {
  mode: 'full' | 'remaining' | 'rejected'
}

function normalizeLetter(character: string) {
  return character.toLocaleLowerCase()
}

export function isClozeLetter(character: string) {
  return /^[a-z]$/i.test(character)
}

export function getLetterIndexes(answer: string) {
  return Array.from(answer)
    .map((character, index) => ({ character, index }))
    .filter(({ character }) => isClozeLetter(character))
    .map(({ index }) => index)
}

export function getSeparatorPattern(answer: string) {
  return Array.from(answer)
    .map((character) => isClozeLetter(character) ? '_' : character)
    .join('')
}

export function getEditableIndexes(answer: string, hintedIndexes: Iterable<number>) {
  const hintedSet = new Set(hintedIndexes)
  return getLetterIndexes(answer).filter((index) => !hintedSet.has(index))
}

export function getFilledIndexes(userLetters: ClozeUserLetters) {
  return Object.entries(userLetters)
    .filter(([, character]) => isClozeLetter(character))
    .map(([index]) => Number(index))
    .sort((left, right) => left - right)
}

export function getRemainingIndexes(
  answer: string,
  hintedIndexes: Iterable<number>,
  userLetters: ClozeUserLetters,
) {
  return getEditableIndexes(answer, hintedIndexes).filter((index) => !isClozeLetter(userLetters[index] ?? ''))
}

export function getFirstEditableIndex(
  answer: string,
  hintedIndexes: Iterable<number>,
  userLetters: ClozeUserLetters,
) {
  const remainingIndexes = getRemainingIndexes(answer, hintedIndexes, userLetters)
  if (remainingIndexes.length > 0) return remainingIndexes[0]

  return getEditableIndexes(answer, hintedIndexes)[0] ?? null
}

export function getAdjacentEditableIndex(
  answer: string,
  hintedIndexes: Iterable<number>,
  cursorIndex: number | null,
  direction: -1 | 1,
) {
  const editableIndexes = getEditableIndexes(answer, hintedIndexes)
  if (editableIndexes.length === 0) return null
  if (cursorIndex === null) return direction === 1 ? editableIndexes[0] : editableIndexes.at(-1) ?? null

  const cursorPosition = editableIndexes.indexOf(cursorIndex)
  if (cursorPosition === -1) {
    const directionalIndexes = direction === 1 ? editableIndexes : [...editableIndexes].reverse()
    return directionalIndexes.find((index) => direction === 1 ? index > cursorIndex : index < cursorIndex) ?? cursorIndex
  }

  return editableIndexes[cursorPosition + direction] ?? cursorIndex
}

function getNextRemainingIndex(
  answer: string,
  hintedIndexes: Iterable<number>,
  userLetters: ClozeUserLetters,
  afterIndex: number,
) {
  const remainingIndexes = getRemainingIndexes(answer, hintedIndexes, userLetters)
  return remainingIndexes.find((index) => index > afterIndex) ?? null
}

export function insertClozeLetters(
  answer: string,
  hintedIndexes: Iterable<number>,
  userLetters: ClozeUserLetters,
  cursorIndex: number | null,
  value: string,
): ClozeInsertResult {
  const characters = Array.from(value)
  const letters = characters.filter(isClozeLetter).map(normalizeLetter)
  const nextUserLetters = { ...userLetters }
  let insertionCursor: number | null = cursorIndex
    ?? getFirstEditableIndex(answer, hintedIndexes, nextUserLetters)
  let finalCursor = insertionCursor
  let acceptedCount = 0

  for (const letter of letters) {
    if (insertionCursor === null) break

    nextUserLetters[insertionCursor] = letter
    finalCursor = insertionCursor
    acceptedCount += 1
    insertionCursor = getNextRemainingIndex(answer, hintedIndexes, nextUserLetters, insertionCursor)
  }

  return {
    userLetters: nextUserLetters,
    cursorIndex: insertionCursor ?? finalCursor,
    acceptedCount,
    rejectedCount: characters.length - letters.length + (letters.length - acceptedCount),
  }
}

export function deleteClozeLetter(
  answer: string,
  hintedIndexes: Iterable<number>,
  userLetters: ClozeUserLetters,
  cursorIndex: number | null,
) {
  const editableIndexes = getEditableIndexes(answer, hintedIndexes)
  const resolvedCursor = cursorIndex ?? editableIndexes[0] ?? null
  if (resolvedCursor === null) return { userLetters, cursorIndex: null }

  const nextUserLetters = { ...userLetters }
  if (isClozeLetter(nextUserLetters[resolvedCursor] ?? '')) {
    delete nextUserLetters[resolvedCursor]
    return { userLetters: nextUserLetters, cursorIndex: resolvedCursor }
  }

  const previousUserIndex = [...editableIndexes]
    .reverse()
    .find((index) => index < resolvedCursor && isClozeLetter(nextUserLetters[index] ?? ''))

  if (previousUserIndex === undefined) {
    return { userLetters: nextUserLetters, cursorIndex: resolvedCursor }
  }

  delete nextUserLetters[previousUserIndex]
  return { userLetters: nextUserLetters, cursorIndex: previousUserIndex }
}

export function composeClozeAnswer(
  answer: string,
  hintedIndexes: Iterable<number>,
  userLetters: ClozeUserLetters,
) {
  const hintedSet = new Set(hintedIndexes)

  return Array.from(answer)
    .map((character, index) => {
      if (!isClozeLetter(character)) return character
      if (hintedSet.has(index)) return normalizeLetter(character)
      return normalizeLetter(userLetters[index] ?? '')
    })
    .join('')
}

export function isStructureCompatible(primaryAnswer: string, candidateAnswer: string) {
  const primaryCharacters = Array.from(primaryAnswer)
  const candidateCharacters = Array.from(candidateAnswer.trim())

  if (primaryCharacters.length !== candidateCharacters.length) return false

  return primaryCharacters.every((character, index) => {
    const candidateCharacter = candidateCharacters[index]
    return isClozeLetter(character)
      ? isClozeLetter(candidateCharacter)
      : candidateCharacter === character
  })
}

export function isHintCompatible(
  primaryAnswer: string,
  candidateAnswer: string,
  hintedIndexes: Iterable<number>,
) {
  if (!isStructureCompatible(primaryAnswer, candidateAnswer)) return false

  const primaryCharacters = Array.from(primaryAnswer)
  const candidateCharacters = Array.from(candidateAnswer.trim())
  return [...hintedIndexes].every(
    (index) => normalizeLetter(primaryCharacters[index] ?? '') === normalizeLetter(candidateCharacters[index] ?? ''),
  )
}

export function getCompatibleAnswers(
  primaryAnswer: string,
  acceptedAnswers: Iterable<string>,
  hintedIndexes: Iterable<number>,
) {
  const uniqueAnswers = new Map<string, string>()

  for (const candidate of [primaryAnswer, ...acceptedAnswers]) {
    const trimmedCandidate = candidate.trim()
    if (!trimmedCandidate || !isHintCompatible(primaryAnswer, trimmedCandidate, hintedIndexes)) continue
    uniqueAnswers.set(trimmedCandidate.toLocaleLowerCase(), trimmedCandidate)
  }

  return [...uniqueAnswers.values()]
}

function tryFullAnswerPaste(
  primaryAnswer: string,
  hintedIndexes: Iterable<number>,
  userLetters: ClozeUserLetters,
  pastedValue: string,
): ClozePasteResult | null {
  const normalizedPaste = pastedValue.trim()
  if (!isHintCompatible(primaryAnswer, normalizedPaste, hintedIndexes)) return null

  const hintedSet = new Set(hintedIndexes)
  const nextUserLetters = { ...userLetters }
  Array.from(normalizedPaste).forEach((character, index) => {
    if (isClozeLetter(character) && !hintedSet.has(index)) {
      nextUserLetters[index] = normalizeLetter(character)
    }
  })

  return {
    userLetters: nextUserLetters,
    cursorIndex: getFirstEditableIndex(primaryAnswer, hintedIndexes, nextUserLetters),
    acceptedCount: getEditableIndexes(primaryAnswer, hintedIndexes).length,
    rejectedCount: 0,
    mode: 'full',
  }
}

export function pasteClozeValue(
  primaryAnswer: string,
  hintedIndexes: Iterable<number>,
  userLetters: ClozeUserLetters,
  cursorIndex: number | null,
  pastedValue: string,
): ClozePasteResult {
  const fullPasteResult = tryFullAnswerPaste(
    primaryAnswer,
    hintedIndexes,
    userLetters,
    pastedValue,
  )
  if (fullPasteResult) return fullPasteResult

  const characters = Array.from(pastedValue)
  const primaryCharacters = Array.from(primaryAnswer)
  const looksLikeFullStructure = isStructureCompatible(primaryAnswer, pastedValue.trim())
  const hasExplicitSeparatorMismatch = characters.length === primaryCharacters.length
    && primaryCharacters.some((character, index) => {
      if (isClozeLetter(character)) return false
      const pastedCharacter = characters[index]
      const isSupportedSeparator = pastedCharacter === '-'
        || pastedCharacter === "'"
        || pastedCharacter === '’'
        || /^\s$/.test(pastedCharacter)
      return isSupportedSeparator && pastedCharacter !== character
    })

  if (hasExplicitSeparatorMismatch || looksLikeFullStructure) {
    return {
      userLetters,
      cursorIndex,
      acceptedCount: 0,
      rejectedCount: characters.length,
      mode: 'rejected',
    }
  }

  const insertion = insertClozeLetters(
    primaryAnswer,
    hintedIndexes,
    userLetters,
    cursorIndex,
    pastedValue,
  )

  return {
    ...insertion,
    mode: insertion.acceptedCount > 0 ? 'remaining' : 'rejected',
  }
}
