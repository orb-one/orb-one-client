import type { ShowToastFn } from '@astryxdesign/core/Toast'
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { isRateLimitError } from '@/lib/api/errors'
import { currentUserQueryKey } from '@/lib/auth/auth-queries'
import { messages } from '@/lib/i18n/messages'
import { useAppStore } from '@/stores/use-app-store'

export const sessionExpiredToastId = 'auth.session.expired'
export const rateLimitToastId = 'api.rate-limited'

export function createAppQueryClient(showToast: ShowToastFn) {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        handleAuthSessionExpiredError(error, queryClient, showToast)
        handleRateLimitError(error, showToast)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        handleAuthSessionExpiredError(error, queryClient, showToast)
        handleRateLimitError(error, showToast)
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        retry: (failureCount, error) => {
          if (error instanceof AuthSessionExpiredError) {
            return false
          }

          if (isRateLimitError(error)) {
            return false
          }

          return failureCount < 1
        },
      },
    },
  })

  return queryClient
}

/** Rate Limit 오류를 중복 없는 전역 Toast로 안내합니다. */
export function handleRateLimitError(error: unknown, showToast: ShowToastFn) {
  if (!isRateLimitError(error)) {
    return
  }

  const locale = useAppStore.getState().locale

  showToast({
    body: messages[locale].common.rateLimitError,
    type: 'error',
    isAutoHide: true,
    autoHideDuration: 5000,
    uniqueID: rateLimitToastId,
    collisionBehavior: 'overwrite',
  })
}

export function handleAuthSessionExpiredError(
  error: unknown,
  queryClient: QueryClient,
  showToast: ShowToastFn,
) {
  if (!(error instanceof AuthSessionExpiredError)) {
    return
  }

  const previousCurrentUser = queryClient.getQueryData(currentUserQueryKey)

  queryClient.setQueryData(currentUserQueryKey, null)

  if (!previousCurrentUser) {
    return
  }

  const locale = useAppStore.getState().locale

  showToast({
    body: messages[locale].auth.sessionExpired,
    type: 'error',
    isAutoHide: true,
    autoHideDuration: 5000,
    uniqueID: sessionExpiredToastId,
    collisionBehavior: 'overwrite',
  })
}
