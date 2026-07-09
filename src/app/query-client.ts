import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { currentUserQueryKey } from '@/lib/auth/auth-queries'
import { defaultLocale, messages } from '@/lib/i18n/messages'

export const sessionExpiredToastId = 'auth.session.expired'

export function createAppQueryClient() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        handleAuthSessionExpiredError(error, queryClient)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        handleAuthSessionExpiredError(error, queryClient)
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        retry: (failureCount, error) => {
          if (error instanceof AuthSessionExpiredError) {
            return false
          }

          return failureCount < 1
        },
      },
    },
  })

  return queryClient
}

export function handleAuthSessionExpiredError(
  error: unknown,
  queryClient: QueryClient,
) {
  if (!(error instanceof AuthSessionExpiredError)) {
    return
  }

  const previousCurrentUser = queryClient.getQueryData(currentUserQueryKey)

  queryClient.setQueryData(currentUserQueryKey, null)

  if (!previousCurrentUser) {
    return
  }

  toast.error(messages[defaultLocale].auth.sessionExpired, {
    id: sessionExpiredToastId,
  })
}
