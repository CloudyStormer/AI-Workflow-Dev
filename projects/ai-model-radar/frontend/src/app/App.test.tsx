import { render, screen } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createTestRouter } from './router'

const liveEnvelope = {
  schema_version: '1.0',
  data_mode: 'live',
  truth: 'stale',
  snapshot_id: 'snapshot-real-001',
  as_of: '2026-08-25T15:30:00.000Z',
  last_success_at: '2026-08-25T15:31:00.000Z',
  coverage: { approved: 6, runtime_enabled: 6, succeeded: 5, blocked: 1 },
  data: {
    events: [{ event_id: 'event-real-001', title: '真实来源事件', publisher: '官方来源', summary: '来自后端快照的事实摘要。', published_at: '2026-08-25T14:00:00.000Z', canonical_url: 'https://example.com/event' }],
  },
  errors: [],
}

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderApp(initialEntry = '/today') {
  return render(<RouterProvider router={createTestRouter([initialEntry])} />)
}

describe('AI Model Radar 真实数据应用壳', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(liveEnvelope)))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('展示完整中文导航、历史日期真相与真实事件', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { level: 1, name: '最近成功的 AI 模型事件' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '一级导航' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '全部事件' })).toHaveAttribute('href', '/events')
    expect(screen.getByRole('status', { name: '数据状态：当前仅有历史快照' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '真实来源事件' })).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('示例模型')
    expect(document.body.textContent).not.toContain('演示数据')
  })

  it('未知地址安全返回今日雷达，并保留跳转主内容入口', async () => {
    renderApp('/not-a-real-page')
    expect(screen.getByRole('link', { name: '跳到主要内容' })).toHaveAttribute('href', '#main-content')
    expect(await screen.findByRole('heading', { level: 1, name: '最近成功的 AI 模型事件' })).toBeInTheDocument()
  })

  it('网络失败时诚实显示错误且不回退静态事件', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    renderApp('/events')
    expect(await screen.findByRole('heading', { level: 2, name: '真实数据读取失败' })).toBeInTheDocument()
    expect(screen.getByText(/无法连接本地真实数据服务/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('示例模型')
  })

  it('来源、趋势和开源路由均调用真实 API', async () => {
    const fetchMock = vi.mocked(fetch)
    renderApp('/sources')
    await screen.findByRole('heading', { level: 1, name: '来源与质量' })
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/v1/radar/sources'))).toBe(true)
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/v1/radar/source-quality'))).toBe(true)
  })
})
