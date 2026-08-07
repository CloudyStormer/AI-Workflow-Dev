import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()

function readSources() {
  return globSync(`${projectRoot}/src/**/*.{ts,tsx,css}`)
    .filter((file) => !file.includes('.test.'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')
}

describe('CFR-FE-001 运行边界', () => {
  it('不加载远程脚本或字体', () => {
    const html = readFileSync(`${projectRoot}/index.html`, 'utf8')

    expect(html).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//i)
  })

  it('不请求后端、不注册 Service Worker、不写持久存储', () => {
    const sources = readSources()

    expect(sources).not.toMatch(/\bfetch\s*\(/)
    expect(sources).not.toMatch(/\bXMLHttpRequest\b|\bWebSocket\b/)
    expect(sources).not.toMatch(/navigator\.serviceWorker/)
    expect(sources).not.toMatch(/\b(?:localStorage|sessionStorage|indexedDB)\b/)
  })
})
