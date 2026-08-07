import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { createAppRouter } from './app/router'
import './styles/global.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('未找到应用挂载节点。')
}

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={createAppRouter()} />
  </StrictMode>,
)
