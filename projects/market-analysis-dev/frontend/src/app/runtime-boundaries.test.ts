import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()

function readSources() {
  return globSync(`${projectRoot}/src/**/*.{ts,tsx,css}`)
    .filter((file) => !file.includes('.test.'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')
}

describe('Career 真实本地服务运行边界', () => {
  it('不加载远程脚本或字体', () => {
    const html = readFileSync(`${projectRoot}/index.html`, 'utf8')

    expect(html).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=["']https?:\/\//i)
  })

  it('只允许 fetch 本地 API，不注册离线服务、不写浏览器持久存储或日志', () => {
    const sources = readSources()

    expect(sources).toContain("const DEFAULT_API_BASE = 'http://127.0.0.1:4318'")
    expect(sources).not.toMatch(/fetch\s*\(\s*['"]https?:\/\/(?!127\.0\.0\.1)/)
    expect(sources).not.toMatch(/\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b/)
    expect(sources).not.toMatch(/navigator\.sendBeacon/)
    expect(sources).not.toMatch(/navigator\.serviceWorker/)
    expect(sources).not.toMatch(/\b(?:localStorage|sessionStorage|indexedDB)\b/)
    expect(sources).not.toMatch(/\bcaches\.(?:open|match|put|delete)\s*\(/)
    expect(sources).not.toMatch(/\bconsole\.(?:log|info|warn|error|debug|trace)\s*\(/)
    expect(sources).not.toMatch(/dangerouslySetInnerHTML/)
  })
})
