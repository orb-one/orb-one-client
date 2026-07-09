import { QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { Toaster } from 'sonner'

import { createAppQueryClient } from '@/app/query-client'

const queryClient = createAppQueryClient()

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster closeButton richColors duration={5000} position="bottom-right" />
    </QueryClientProvider>
  )
}
