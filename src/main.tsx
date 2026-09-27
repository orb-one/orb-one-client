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

const appRootElement = rootElement

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MSW !== 'true') {
    return
  }

  const { worker } = await import('@/mocks/browser')

  await worker.start({
    onUnhandledRequest: 'bypass',
  })
}

async function bootstrap() {
  await enableMocking()

  createRoot(appRootElement).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
}

void bootstrap()
