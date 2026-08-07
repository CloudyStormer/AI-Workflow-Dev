export const MIN_SOURCE_CHARACTERS = 1
export const MAX_SOURCE_CHARACTERS = 100_000

export type SourceInputErrorCode = 'EMPTY_INPUT' | 'URL_ONLY' | 'INPUT_TOO_LARGE'

export interface SourceInputValidation {
  characterCount: number
  processableCharacterCount: number
  errorCode: SourceInputErrorCode | null
  message: string | null
}

export function countUnicodeCodePoints(value: string) {
  return Array.from(value).length
}

export function isUrlOnly(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue || /\s/u.test(trimmedValue)) {
    return false
  }

  if (/^www\.[^\s]+$/iu.test(trimmedValue)) {
    return true
  }

  try {
    const url = new URL(trimmedValue)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateSourceInput(value: string): SourceInputValidation {
  const characterCount = countUnicodeCodePoints(value)
  const trimmedValue = value.trim()
  const processableCharacterCount = countUnicodeCodePoints(trimmedValue)

  if (processableCharacterCount < MIN_SOURCE_CHARACTERS) {
    return {
      characterCount,
      processableCharacterCount,
      errorCode: 'EMPTY_INPUT',
      message: '请先粘贴可处理的正文。',
    }
  }

  if (isUrlOnly(trimmedValue)) {
    return {
      characterCount,
      processableCharacterCount,
      errorCode: 'URL_ONLY',
      message: '当前不会自动访问或抓取网址，请同时粘贴正文。',
    }
  }

  if (characterCount > MAX_SOURCE_CHARACTERS) {
    const excess = characterCount - MAX_SOURCE_CHARACTERS
    return {
      characterCount,
      processableCharacterCount,
      errorCode: 'INPUT_TOO_LARGE',
      message: `正文超出上限 ${excess.toLocaleString('zh-CN')} 个字符，请拆分后重试；原文不会被截断。`,
    }
  }

  return {
    characterCount,
    processableCharacterCount,
    errorCode: null,
    message: null,
  }
}

export function createPlainTextPreview(value: string, maximumCharacters = 240) {
  const characters = Array.from(value.trim())
  const preview = characters.slice(0, maximumCharacters).join('')

  return characters.length > maximumCharacters ? `${preview}…` : preview
}
