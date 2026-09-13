import { QueryClient } from '@tanstack/react-query'
import { cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import {
  createAppQueryClient,
  handleAuthSessionExpiredError,
  handleRateLimitError,
  rateLimitToastId,
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

it('shows a localized rate limit toast without clearing the session', () => {
  const queryClient = new QueryClient()
  const currentUser = {
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'orb-user',
  }
  const error = rateLimitError()

  queryClient.setQueryData(currentUserQueryKey, currentUser)
  handleRateLimitError(error, showToast)

  expect(queryClient.getQueryData(currentUserQueryKey)).toEqual(currentUser)
  expect(showToast).toHaveBeenCalledWith({
    body: messages.ko.common.rateLimitError,
    type: 'error',
    isAutoHide: true,
    autoHideDuration: 5000,
    uniqueID: rateLimitToastId,
    collisionBehavior: 'overwrite',
  })
})

it('handles rate-limited mutations through the global mutation cache', async () => {
  const queryClient = createAppQueryClient(showToast)
  const error = rateLimitError()
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationFn: () => Promise.reject(error),
  })

  await expect(mutation.execute(undefined)).rejects.toBe(error)

  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({ uniqueID: rateLimitToastId }),
  )
})

it('does not retry rate-limited queries', async () => {
  const queryClient = createAppQueryClient(showToast)
  const queryFn = vi.fn().mockRejectedValue(rateLimitError())

  await expect(
    queryClient.fetchQuery({ queryKey: ['rate-limited'], queryFn }),
  ).rejects.toMatchObject({ status: 429 })

  expect(queryFn).toHaveBeenCalledOnce()
  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({ uniqueID: rateLimitToastId }),
  )
})

function rateLimitError() {
  return new ApiError(
    'Too Many Requests',
    429,
    new Response(null, { status: 429 }),
    undefined,
  )
}
