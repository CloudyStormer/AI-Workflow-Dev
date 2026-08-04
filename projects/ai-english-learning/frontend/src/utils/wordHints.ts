export type LetterHintCharacter = {
  character: string
  isHinted: boolean
  isSeparator: boolean
}

export type LetterHint = {
  characters: LetterHintCharacter[]
  revealedIndexes: number[]
  revealedCount: number
  letterCount: number
  level: number
  maxLevel: number
  pattern: string
  ariaLabel: string
  hasAlternatePattern: boolean
}

type HintPlan = {
  levels: number[][]
}

function hashText(value: string) {
  let hash = 2166136261

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function shuffleIndexes(indexes: number[], seed: number) {
  const shuffled = [...indexes]
  const random = createSeededRandom(seed)

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1))
    const currentIndex = shuffled[index]
    shuffled[index] = shuffled[targetIndex]
    shuffled[targetIndex] = currentIndex
  }

  return shuffled
}

function getLetterIndexes(characters: string[]) {
  return characters
    .map((character, index) => ({ character, index }))
    .filter(({ character }) => /[a-z]/i.test(character))
    .map(({ index }) => index)
}

function getMaxLevel(letterCount: number) {
  if (letterCount <= 2) return 1
  if (letterCount <= 6) return 2
  return 3
}

function getRevealLimit(letterCount: number) {
  if (letterCount <= 1) return 0
  return Math.max(1, Math.min(letterCount - 1, Math.ceil(letterCount * 0.45)))
}

function getSeedGroups(letterIndexes: number[]) {
  const letterCount = letterIndexes.length
  const middleIndex = Math.floor(letterCount / 2)
  const groups: number[][] = [
    [letterIndexes[0]],
    letterCount >= 4 ? letterIndexes.slice(-2) : [letterIndexes.at(-1) ?? letterIndexes[0]],
    letterCount >= 5
      ? [letterIndexes[middleIndex], letterIndexes[Math.min(middleIndex + 1, letterCount - 2)]]
      : [letterIndexes[middleIndex]],
    ...letterIndexes.slice(1, -1).map((index) => [index]),
  ]
  const uniqueGroups = new Map<string, number[]>()

  for (const group of groups) {
    const uniqueGroup = [...new Set(group.filter((index) => index !== undefined))]
    if (uniqueGroup.length > 0) uniqueGroups.set(uniqueGroup.join(','), uniqueGroup)
  }

  return [...uniqueGroups.values()]
}

function createHintPlan(word: string, letterIndexes: number[], seedGroup: number[]): HintPlan {
  const revealLimit = getRevealLimit(letterIndexes.length)
  const requestedMaxLevel = getMaxLevel(letterIndexes.length)

  if (revealLimit === 0) return { levels: [[]] }

  const maxLevel = Math.min(requestedMaxLevel, revealLimit)
  const initialCapacity = Math.max(1, revealLimit - (maxLevel - 1))
  const revealedIndexes = seedGroup.slice(0, initialCapacity)
  const remainingIndexes = shuffleIndexes(
    letterIndexes.filter((index) => !revealedIndexes.includes(index)),
    hashText(`${word.toLocaleLowerCase()}:${seedGroup.join(',')}`),
  )
  const levels = [[...revealedIndexes]]
  let remainingCursor = 0

  for (let level = 2; level <= maxLevel; level += 1) {
    const futureLevels = maxLevel - level
    const availableCapacity = revealLimit - revealedIndexes.length - futureLevels
    const addCount = Math.max(1, Math.min(2, availableCapacity))
    const nextIndexes = remainingIndexes.slice(remainingCursor, remainingCursor + addCount)

    revealedIndexes.push(...nextIndexes)
    remainingCursor += nextIndexes.length
    levels.push([...revealedIndexes])
  }

  return { levels }
}

function createHintContext(word: string) {
  const characters = Array.from(word)
  const letterIndexes = getLetterIndexes(characters)
  const plans = getSeedGroups(letterIndexes).map((seedGroup) => createHintPlan(word, letterIndexes, seedGroup))

  return {
    characters,
    letterIndexes,
    plans: plans.length > 0 ? plans : [{ levels: [[]] }],
  }
}

function normalizeVariant(variant: number, planCount: number) {
  const integerVariant = Number.isFinite(variant) ? Math.trunc(variant) : 0
  return ((integerVariant % planCount) + planCount) % planCount
}

function getPlanPattern(characters: string[], plan: HintPlan, requestedLevel: number) {
  const level = Math.min(Math.max(Math.round(requestedLevel), 1), plan.levels.length)
  const revealedSet = new Set(plan.levels[level - 1])

  return characters
    .map((character, index) => !/[a-z]/i.test(character) || revealedSet.has(index) ? character : '_')
    .join('')
}

export function createHintVariant() {
  return Math.floor(Math.random() * 1_000_000)
}

export function buildLetterHint(word: string, requestedLevel: number, variant: number): LetterHint {
  const { characters, letterIndexes, plans } = createHintContext(word)
  const letterCount = letterIndexes.length

  if (letterCount === 0) {
    return {
      characters: characters.map((character) => ({ character, isHinted: true, isSeparator: true })),
      revealedIndexes: [],
      revealedCount: 0,
      letterCount: 0,
      level: 1,
      maxLevel: 1,
      pattern: word,
      ariaLabel: '答案中没有需要提示的英文字母',
      hasAlternatePattern: false,
    }
  }

  const plan = plans[normalizeVariant(variant, plans.length)]
  const maxLevel = plan.levels.length
  const level = Math.min(Math.max(Math.round(requestedLevel), 1), maxLevel)
  const revealedIndexes = plan.levels[level - 1]
  const revealedSet = new Set(revealedIndexes)
  const hintCharacters = characters.map((character, index) => {
    const isSeparator = !/[a-z]/i.test(character)
    return {
      character,
      isHinted: isSeparator || revealedSet.has(index),
      isSeparator,
    }
  })
  const pattern = getPlanPattern(characters, plan, level)
  const alternatePatterns = new Set(plans.map((candidatePlan) => getPlanPattern(characters, candidatePlan, level)))
  const revealedPositions = letterIndexes
    .map((characterIndex, letterIndex) => ({ characterIndex, letterIndex }))
    .filter(({ characterIndex }) => revealedSet.has(characterIndex))
    .map(({ characterIndex, letterIndex }) => `第 ${letterIndex + 1} 位 ${characters[characterIndex].toUpperCase()}`)
  const ariaLabel = revealedPositions.length > 0
    ? `答案共 ${letterCount} 个字母，随机提示：${revealedPositions.join('、')}`
    : `答案共 ${letterCount} 个字母，当前不显示字母提示`

  return {
    characters: hintCharacters,
    revealedIndexes: [...revealedIndexes],
    revealedCount: revealedIndexes.length,
    letterCount,
    level,
    maxLevel,
    pattern,
    ariaLabel,
    hasAlternatePattern: alternatePatterns.size > 1,
  }
}

export function getNextHintVariant(word: string, level: number, currentVariant: number) {
  const { characters, plans } = createHintContext(word)
  const currentPlan = plans[normalizeVariant(currentVariant, plans.length)]
  const currentPattern = getPlanPattern(characters, currentPlan, level)

  for (let offset = 1; offset < plans.length; offset += 1) {
    const candidateVariant = currentVariant + offset
    const candidatePlan = plans[normalizeVariant(candidateVariant, plans.length)]

    if (getPlanPattern(characters, candidatePlan, level) !== currentPattern) {
      return candidateVariant
    }
  }

  return currentVariant
}

export type CompatibleHintUpdate = {
  revealedIndexes: number[]
  level: number
  variant: number
}

function getEffectiveMaxLevel(letterCount: number) {
  return Math.max(1, Math.min(getMaxLevel(letterCount), getRevealLimit(letterCount)))
}

function normalizeIndexes(indexes: Iterable<number>, allowedIndexes: number[], limit: number) {
  const allowedSet = new Set(allowedIndexes)
  return [...new Set(indexes)]
    .filter((index) => allowedSet.has(index))
    .sort((left, right) => left - right)
    .slice(0, limit)
}

function areSameIndexes(leftIndexes: Iterable<number>, rightIndexes: Iterable<number>) {
  const left = [...leftIndexes].sort((first, second) => first - second)
  const right = [...rightIndexes].sort((first, second) => first - second)
  return left.length === right.length && left.every((index, position) => index === right[position])
}

function getCompatibleCandidateOrder(word: string, variant: number) {
  const { letterIndexes, plans } = createHintContext(word)
  const plan = plans[normalizeVariant(variant, plans.length)]
  const planIndexes = plan.levels.at(-1) ?? []
  const fallbackIndexes = shuffleIndexes(letterIndexes, hashText(`${word.toLocaleLowerCase()}:${variant}:compatible`))

  return [...new Set([...planIndexes, ...fallbackIndexes])]
}

export function buildLetterHintFromIndexes(
  word: string,
  revealedIndexes: Iterable<number>,
  requestedLevel: number,
): LetterHint {
  const characters = Array.from(word)
  const letterIndexes = getLetterIndexes(characters)
  const letterCount = letterIndexes.length

  if (letterCount === 0) {
    return {
      characters: characters.map((character) => ({ character, isHinted: true, isSeparator: true })),
      revealedIndexes: [],
      revealedCount: 0,
      letterCount: 0,
      level: 1,
      maxLevel: 1,
      pattern: word,
      ariaLabel: '答案中没有需要提示的英文字母',
      hasAlternatePattern: false,
    }
  }

  const revealLimit = getRevealLimit(letterCount)
  const normalizedRevealedIndexes = normalizeIndexes(revealedIndexes, letterIndexes, revealLimit)
  const revealedSet = new Set(normalizedRevealedIndexes)
  const maxLevel = getEffectiveMaxLevel(letterCount)
  const level = Math.min(Math.max(Math.round(requestedLevel), 1), maxLevel)
  const hintCharacters = characters.map((character, index) => {
    const isSeparator = !/[a-z]/i.test(character)
    return {
      character,
      isHinted: isSeparator || revealedSet.has(index),
      isSeparator,
    }
  })
  const pattern = characters
    .map((character, index) => !/[a-z]/i.test(character) || revealedSet.has(index) ? character : '_')
    .join('')
  const revealedPositions = letterIndexes
    .map((characterIndex, letterIndex) => ({ characterIndex, letterIndex }))
    .filter(({ characterIndex }) => revealedSet.has(characterIndex))
    .map(({ characterIndex, letterIndex }) => `第 ${letterIndex + 1} 位 ${characters[characterIndex].toUpperCase()}`)
  const ariaLabel = revealedPositions.length > 0
    ? `答案共 ${letterCount} 个字母，随机提示：${revealedPositions.join('、')}`
    : `答案共 ${letterCount} 个字母，当前不显示字母提示`

  return {
    characters: hintCharacters,
    revealedIndexes: normalizedRevealedIndexes,
    revealedCount: normalizedRevealedIndexes.length,
    letterCount,
    level,
    maxLevel,
    pattern,
    ariaLabel,
    hasAlternatePattern: normalizedRevealedIndexes.length > 0
      && letterIndexes.length > normalizedRevealedIndexes.length,
  }
}

export function getMoreCompatibleHint(
  word: string,
  currentRevealedIndexes: Iterable<number>,
  blockedIndexes: Iterable<number>,
  currentLevel: number,
  currentVariant: number,
): CompatibleHintUpdate | null {
  const characters = Array.from(word)
  const letterIndexes = getLetterIndexes(characters)
  const revealLimit = getRevealLimit(letterIndexes.length)
  const normalizedCurrentIndexes = normalizeIndexes(currentRevealedIndexes, letterIndexes, revealLimit)
  const maxLevel = getEffectiveMaxLevel(letterIndexes.length)

  if (normalizedCurrentIndexes.length >= revealLimit || currentLevel >= maxLevel) return null

  const blockedSet = new Set(blockedIndexes)
  const currentSet = new Set(normalizedCurrentIndexes)
  const nextLevel = currentLevel + 1
  const plannedCount = buildLetterHint(word, nextLevel, currentVariant).revealedCount
  const requestedAddCount = Math.max(1, plannedCount - normalizedCurrentIndexes.length)
  const availableCapacity = revealLimit - normalizedCurrentIndexes.length
  const candidates = getCompatibleCandidateOrder(word, currentVariant)
    .filter((index) => !blockedSet.has(index) && !currentSet.has(index))
  const addedIndexes = candidates.slice(0, Math.min(requestedAddCount, availableCapacity))

  if (addedIndexes.length === 0) return null

  return {
    revealedIndexes: [...normalizedCurrentIndexes, ...addedIndexes].sort((left, right) => left - right),
    level: nextLevel,
    variant: currentVariant,
  }
}

export function getRerolledCompatibleHint(
  word: string,
  currentRevealedIndexes: Iterable<number>,
  blockedIndexes: Iterable<number>,
  currentLevel: number,
  currentVariant: number,
): CompatibleHintUpdate | null {
  const { letterIndexes, plans } = createHintContext(word)
  const revealLimit = getRevealLimit(letterIndexes.length)
  const normalizedCurrentIndexes = normalizeIndexes(currentRevealedIndexes, letterIndexes, revealLimit)
  const blockedSet = new Set(blockedIndexes)
  const availableIndexes = letterIndexes.filter((index) => !blockedSet.has(index))

  if (normalizedCurrentIndexes.length === 0 || availableIndexes.length <= normalizedCurrentIndexes.length) return null

  for (let offset = 1; offset <= plans.length; offset += 1) {
    const candidateVariant = currentVariant + offset
    const candidateIndexes = buildLetterHint(word, currentLevel, candidateVariant).revealedIndexes
      .filter((index) => !blockedSet.has(index))

    if (
      candidateIndexes.length === normalizedCurrentIndexes.length
      && !areSameIndexes(candidateIndexes, normalizedCurrentIndexes)
    ) {
      return {
        revealedIndexes: candidateIndexes,
        level: currentLevel,
        variant: candidateVariant,
      }
    }
  }

  const fallbackOrder = shuffleIndexes(
    availableIndexes,
    hashText(`${word.toLocaleLowerCase()}:${currentVariant + 1}:reroll`),
  )
  let candidateIndexes = fallbackOrder.slice(0, normalizedCurrentIndexes.length).sort((left, right) => left - right)

  if (areSameIndexes(candidateIndexes, normalizedCurrentIndexes)) {
    candidateIndexes = [...fallbackOrder.slice(1), fallbackOrder[0]]
      .slice(0, normalizedCurrentIndexes.length)
      .sort((left, right) => left - right)
  }

  if (areSameIndexes(candidateIndexes, normalizedCurrentIndexes)) return null

  return {
    revealedIndexes: candidateIndexes,
    level: currentLevel,
    variant: currentVariant + 1,
  }
}
