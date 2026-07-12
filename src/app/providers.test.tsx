import { QueryClient } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { toast } from 'sonner'

import {
  handleAuthSessionExpiredError,
  sessionExpiredToastId,
} from '@/app/query-client'
import { AuthSessionExpiredError, ApiError } from '@/lib/api/client'
import { currentUserQueryKey } from '@/lib/auth/auth-queries'
import { messages } from '@/lib/i18n/messages'
import { useAppStore } from '@/stores/use-app-store'

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    error: vi.fn(),
  },
}))

afterEach(() => {
  useAppStore.getState().setLocale('ko')
  vi.clearAllMocks()
})

it('clears current user cache and shows a toast for expired sessions', () => {
  const queryClient = new QueryClient()

  queryClient.setQueryData(currentUserQueryKey, {
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  handleAuthSessionExpiredError(new AuthSessionExpiredError(), queryClient)

  expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
  expect(toast.error).toHaveBeenCalledWith(messages.ko.auth.sessionExpired, {
    id: sessionExpiredToastId,
  })
})

it('clears current user cache without a toast when no signed-in state was known', () => {
  const queryClient = new QueryClient()

  handleAuthSessionExpiredError(new AuthSessionExpiredError(), queryClient)

  expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
  expect(toast.error).not.toHaveBeenCalled()
})

it('uses the active locale for expired session messages', () => {
  const queryClient = new QueryClient()

  useAppStore.getState().setLocale('en')
  queryClient.setQueryData(currentUserQueryKey, {
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  handleAuthSessionExpiredError(new AuthSessionExpiredError(), queryClient)

  expect(toast.error).toHaveBeenCalledWith(messages.en.auth.sessionExpired, {
    id: sessionExpiredToastId,
  })
})

it('ignores non-session API errors', () => {
  const queryClient = new QueryClient()

  queryClient.setQueryData(currentUserQueryKey, {
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  handleAuthSessionExpiredError(
    new ApiError('Internal Server Error', 500, new Response(null), undefined),
    queryClient,
  )

  expect(queryClient.getQueryData(currentUserQueryKey)).toEqual({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })
  expect(toast.error).not.toHaveBeenCalled()
})
