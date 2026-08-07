import { describe, expect, it } from 'vitest'

import {
  MAX_SOURCE_CHARACTERS,
  countUnicodeCodePoints,
  createPlainTextPreview,
  isUrlOnly,
  validateSourceInput,
} from './sourceInput'

describe('信息源正文校验', () => {
  it('按 Unicode 代码点计数复杂字符', () => {
    expect(countUnicodeCodePoints('前端😀e\u0301👩🏽‍💻')).toBe(9)
    expect(countUnicodeCodePoints('😀')).toBe(1)
  })

  it('拒绝空白并接受一个字符', () => {
    expect(validateSourceInput(' \n\t　').errorCode).toBe('EMPTY_INPUT')
    expect(validateSourceInput('前')).toMatchObject({
      errorCode: null,
      processableCharacterCount: 1,
    })
  })

  it('只拒绝 URL-only，网址加正文仍可继续', () => {
    expect(isUrlOnly('https://example.com/jobs?id=1#frontend')).toBe(true)
    expect(validateSourceInput('https://example.com/jobs?id=1#frontend').errorCode).toBe(
      'URL_ONLY',
    )
    expect(validateSourceInput('https://example.com/jobs\n这里还有招聘正文').errorCode).toBe(
      null,
    )
  })

  it('接受 100000 个代码点，保留并拒绝 100001 个代码点', () => {
    const maximumInput = '😀'.repeat(MAX_SOURCE_CHARACTERS)
    const oversizedInput = `${maximumInput}😀`

    expect(validateSourceInput(maximumInput)).toMatchObject({
      errorCode: null,
      processableCharacterCount: 100_000,
    })
    expect(validateSourceInput(oversizedInput)).toMatchObject({
      errorCode: 'INPUT_TOO_LARGE',
      processableCharacterCount: 100_001,
      message: expect.stringContaining('超出上限 1 个字符'),
    })
  })

  it('首尾空白仍计入 100000 字符总上限', () => {
    const value = ` ${'字'.repeat(99_999)} `

    expect(validateSourceInput(value)).toMatchObject({
      characterCount: 100_001,
      errorCode: 'INPUT_TOO_LARGE',
    })
  })

  it('HTML 只生成纯文本预览，不改变输入内容', () => {
    const htmlText = '<script>alert("x")</script><img src=x onerror=alert(2)>React'

    expect(createPlainTextPreview(htmlText)).toBe(htmlText)
  })
})
