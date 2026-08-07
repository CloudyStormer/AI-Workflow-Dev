import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  Navigate,
} from 'react-router-dom'

import { App, RouteLoadingState } from './App'

const DirectionsPage = lazy(() =>
  import('../features/career-directions/DirectionsPage').then((module) => ({
    default: module.DirectionsPage,
  })),
)

const SourceWorkbenchPage = lazy(() =>
  import('../features/source-workbench/SourceWorkbenchPage').then((module) => ({
    default: module.SourceWorkbenchPage,
  })),
)

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title">
      <p>页面状态 · 404</p>
      <h1 id="not-found-title">没有找到这个页面</h1>
      <p>当前预览开放职业方向总览与信息源工作台，其他模块将在各自任务获批后实现。</p>
      <a href="/directions">返回职业方向总览</a>
    </section>
  )
}

export function RouteErrorPage() {
  return (
    <main className="route-error" lang="zh-CN">
      <p>内容状态 · 安全失败</p>
      <h1>页面加载失败</h1>
      <p>
        当前页面未完成加载或内容校验，因此没有展示可能失真的职业结论。请返回已验证页面后重试。
      </p>
      <a href="/directions">返回职业方向总览</a>
    </main>
  )
}

export const routes = [
  {
    path: '/',
    element: <App />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate replace to="/directions" /> },
      {
        path: 'directions',
        element: (
          <Suspense fallback={<RouteLoadingState />}>
            <DirectionsPage />
          </Suspense>
        ),
      },
      {
        path: 'source-workbench',
        element: (
          <Suspense fallback={<RouteLoadingState />}>
            <SourceWorkbenchPage />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
