import { QueryClient } from '@tanstack/react-query'
import { cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import {
  handleAuthSessionExpiredError,
  sessionExpiredToastId,
} from '@/app/query-client'
import { AuthSessionExpiredError, ApiError } from '@/lib/api/client'
import { currentUserQueryKey } from '@/lib/auth/auth-queries'
import { messages } from '@/lib/i18n/messages'
import { useAppStore } from '@/stores/use-app-store'

const showToast = vi.fn(() => vi.fn())

afterEach(() => {
  cleanup()
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

  handleAuthSessionExpiredError(
    new AuthSessionExpiredError(),
    queryClient,
    showToast,
  )

  expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
  expect(showToast).toHaveBeenCalledWith({
    body: messages.ko.auth.sessionExpired,
    type: 'error',
    isAutoHide: true,
    autoHideDuration: 5000,
    uniqueID: sessionExpiredToastId,
    collisionBehavior: 'overwrite',
  })
})

it('clears current user cache without a toast when no signed-in state was known', () => {
  const queryClient = new QueryClient()

  handleAuthSessionExpiredError(
    new AuthSessionExpiredError(),
    queryClient,
    showToast,
  )

  expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
  expect(showToast).not.toHaveBeenCalled()
})

it('uses the active locale for expired session messages', () => {
  const queryClient = new QueryClient()

  useAppStore.getState().setLocale('en')
  queryClient.setQueryData(currentUserQueryKey, {
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })

  handleAuthSessionExpiredError(
    new AuthSessionExpiredError(),
    queryClient,
    showToast,
  )

  expect(showToast).toHaveBeenCalledWith({
    body: messages.en.auth.sessionExpired,
    type: 'error',
    isAutoHide: true,
    autoHideDuration: 5000,
    uniqueID: sessionExpiredToastId,
    collisionBehavior: 'overwrite',
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
    showToast,
  )

  expect(queryClient.getQueryData(currentUserQueryKey)).toEqual({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  })
  expect(showToast).not.toHaveBeenCalled()
})
