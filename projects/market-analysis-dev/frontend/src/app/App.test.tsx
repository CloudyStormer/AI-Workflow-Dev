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

  it('开放 01 与 05，其他导航明确标为后续任务', async () => {
    const { container } = renderAt('/directions')

    expect(await screen.findByRole('link', { name: /01 职业方向总览/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /05 信息源工作台/ })).toHaveAttribute(
      'href',
      '/source-workbench',
    )
    expect(screen.getByRole('button', { name: '02 技术栈全景，后续任务' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '06 个人证据准备，后续任务' })).toBeDisabled()
    expect(container.querySelector('nav[aria-label="移动端一级导航"]')).toBeInTheDocument()
    expect(container.querySelector('a[href="/source-workbench"]')).toBeInTheDocument()
    expect(
      container.querySelector('button[aria-label="技术栈，后续任务"]'),
    ).toBeDisabled()
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
