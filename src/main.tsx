import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import './index.css'

import { AppProviders } from '@/app/providers'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
