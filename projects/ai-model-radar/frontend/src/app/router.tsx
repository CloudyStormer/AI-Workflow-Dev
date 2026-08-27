import {
  Navigate,
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from 'react-router-dom'

import { TodayRadarPage } from '../features/today-radar/TodayRadarPage'
import {
  EventDetailPage,
  EventsPage,
  HistoryPage,
  OpenSourcePage,
  SnapshotPage,
  SourcesPage,
  TrendsPage,
} from '../features/radar-pages/RadarPages'
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
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:eventId', element: <EventDetailPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'snapshots/:snapshotId', element: <SnapshotPage /> },
      { path: 'sources', element: <SourcesPage /> },
      { path: 'trends', element: <TrendsPage /> },
      { path: 'open-source', element: <OpenSourcePage /> },
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
