import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { Toaster } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster closeButton richColors duration={5000} position="bottom-right" />
    </QueryClientProvider>
  )
}
