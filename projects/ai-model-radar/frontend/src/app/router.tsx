import {
  Navigate,
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from 'react-router-dom'

import { TodayRadarPage } from '../features/today-radar/TodayRadarPage'
import { App } from './App'

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/today" replace />,
      },
      {
        path: 'today',
        element: <TodayRadarPage />,
      },
      {
        path: '*',
        element: <Navigate to="/today" replace />,
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(appRoutes)
}

export function createTestRouter(initialEntries: string[] = ['/today']) {
  return createMemoryRouter(appRoutes, { initialEntries })
}
