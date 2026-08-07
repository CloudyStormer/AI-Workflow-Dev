import { render, screen } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createTestRouter } from './router'

function renderApp(initialEntry = '/today') {
  return render(<RouterProvider router={createTestRouter([initialEntry])} />)
}

describe('AI Model Radar 应用壳', () => {
  it('展示完整中文导航、真实性状态与首条演示事件', async () => {
    renderApp()

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '今天值得关注的 AI 模型事件',
      }),
    ).toBeInTheDocument()

    expect(screen.getByRole('navigation', { name: '一级导航' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '今日雷达' })).toHaveAttribute(
      'href',
      '/today',
    )

    const futureButtons = screen.getAllByRole('button', { name: /后续任务/ })
    expect(futureButtons).toHaveLength(4)
    futureButtons.forEach((button) => expect(button).toBeDisabled())

    expect(
      screen.getByRole('status', {
        name: /演示数据 · 人工快照 · 截至 2026年8月4日 17:25（北京时间） · 未连接自动采集服务/,
      }),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: '示例模型 A1 发布兼容性说明',
      }),
    ).toBeInTheDocument()
    expect(document.querySelectorAll('[data-demo-event="true"]')).toHaveLength(1)
  })

  it('提供跳到主要内容，并将未知地址安全带回今日雷达', async () => {
    renderApp('/not-a-real-page')

    expect(screen.getByRole('link', { name: '跳到主要内容' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: '今天值得关注的 AI 模型事件',
      }),
    ).toBeInTheDocument()
  })

  it('不展示会误解为已接入服务的运行文案', async () => {
    const { container } = renderApp()

    await screen.findByRole('heading', {
      level: 1,
      name: '今天值得关注的 AI 模型事件',
    })

    const content = container.textContent ?? ''
    expect(content).not.toContain('系统运行中')
    expect(content).not.toContain('活动源')
    expect(content).not.toContain('自动更新')
    expect(content).not.toContain('已云端保存')
  })
})
