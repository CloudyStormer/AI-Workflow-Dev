import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RouteLoadingState } from './App'
import { RouteErrorPage, routes } from './router'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}

afterEach(() => cleanup())

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
})

afterEach(() => vi.unstubAllGlobals())

describe('Frontend Career Radar 应用壳', () => {
  it('展示完整中文快照条和首条职业方向内容', async () => {
    renderAt('/directions')

    expect(
      await screen.findByRole('heading', { name: '先看方向，再决定技术投入' }),
    ).toBeInTheDocument()
    expect(screen.getByText('产品型前端／应用工程师')).toBeInTheDocument()
    expect(
      screen.getByRole('status', {
        name: /10 个核心目的样本：国内 4、公开远程 6.*不是市场份额/,
      }),
    ).toBeInTheDocument()
  })

  it('六个桌面模块全部开放，移动端更多入口可达', async () => {
    const { container } = renderAt('/directions')

    expect(await screen.findByRole('link', { name: /01 职业方向总览/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /02 技术栈全景/ })).toHaveAttribute('href', '/stacks')
    expect(screen.getByRole('link', { name: /03 招聘证据/ })).toHaveAttribute('href', '/evidence')
    expect(screen.getByRole('link', { name: /04 AI 增量/ })).toHaveAttribute('href', '/ai-increment')
    expect(screen.getByRole('link', { name: /05 信息源工作台/ })).toHaveAttribute(
      'href',
      '/source-workbench',
    )
    expect(screen.getByRole('link', { name: /06 个人证据准备/ })).toHaveAttribute('href', '/personal-evidence')
    expect(container.querySelector('nav[aria-label="移动端一级导航"]')).toBeInTheDocument()
    expect(container.querySelector('a[href="/source-workbench"]')).toBeInTheDocument()
    expect(container.querySelector('a[href="/more"]')).toBeInTheDocument()
  })

  it.each([
    ['/stacks', '从真实材料汇总技术栈'],
    ['/evidence', '查看材料中的招聘与要求证据'],
    ['/ai-increment', '识别前端工作的 AI 能力增量'],
    ['/personal-evidence', '整理可回链的个人能力证据'],
  ])('%s 真实分析视图可达且不使用 Demo 补空', async (path, heading) => {
    renderAt(path)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(await screen.findByText('当前没有符合条件的真实证据')).toBeInTheDocument()
    expect(screen.getByText('这里不会用 Demo 补空。', { exact: false })).toBeInTheDocument()
  })

  it('移动端更多页提供其余真实分析模块入口', async () => {
    const { container } = renderAt('/more')

    expect(await screen.findByRole('heading', { name: '选择要查看的真实分析视图' })).toBeInTheDocument()
    expect(container.querySelector('main a[href="/evidence"]')).toBeInTheDocument()
    expect(container.querySelector('main a[href="/ai-increment"]')).toBeInTheDocument()
    expect(container.querySelector('main a[href="/personal-evidence"]')).toBeInTheDocument()
  })

  it('信息源工作台路由可达并显示完整中文输入入口', async () => {
    renderAt('/source-workbench')

    expect(
      await screen.findByRole('heading', { name: '把新材料带进职业研究' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('粘贴文章、招聘／面试要求、简历、项目材料或其他正文'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存并建议分类' })).toBeInTheDocument()
  })

  it('根路径重定向到职业方向总览', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] })
    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole('heading', { name: '先看方向，再决定技术投入' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/directions')
  })

  it('未知路径显示中文 404 和返回入口', async () => {
    renderAt('/unknown-route')

    expect(await screen.findByRole('heading', { name: '没有找到这个页面' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回职业方向总览' })).toHaveAttribute(
      'href',
      '/directions',
    )
  })

  it('加载状态使用中文且可被辅助技术感知', () => {
    render(<RouteLoadingState />)

    expect(screen.getByRole('status')).toHaveTextContent('正在加载页面内容')
  })

  it('错误状态保持中文并提供安全返回入口', () => {
    render(<RouteErrorPage />)

    expect(screen.getByRole('heading', { name: '页面加载失败' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回职业方向总览' })).toHaveAttribute(
      'href',
      '/directions',
    )
  })
})
