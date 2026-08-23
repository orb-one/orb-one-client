import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryObserver,
} from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'

import { createAppQueryClient } from '@/app/query-client'
import { getCurrentUser } from '@/lib/api/auth'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import {
  currentUserQueryKey,
  currentUserQueryOptions,
} from '@/lib/auth/auth-queries'

vi.mock('@/lib/api/auth', () => ({
  getCurrentUser: vi.fn(),
}))

afterEach(() => {
  focusManager.setFocused(undefined)
  onlineManager.setOnline(true)
  vi.useRealTimers()
  vi.resetAllMocks()
})

it('returns the current user when the session is valid', async () => {
  const user = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    nickname: 'orbone-user',
  }

  vi.mocked(getCurrentUser).mockResolvedValue(user)

  await expect(fetchCurrentUserQuery()).resolves.toEqual(user)
  expect(getCurrentUser).toHaveBeenCalledWith(expect.any(AbortSignal))
})

it('treats 401 responses as a signed-out auth state', async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(apiError(401, 'Unauthorized'))

  await expect(fetchCurrentUserQuery()).resolves.toBeNull()
})

it('keeps the known signed-out state fresh across repeated query reads', async () => {
  const queryClient = createQueryClient()

  vi.mocked(getCurrentUser).mockRejectedValue(apiError(401, 'Unauthorized'))

  await expect(
    queryClient.fetchQuery(currentUserQueryOptions()),
  ).resolves.toBeNull()

  vi.mocked(getCurrentUser).mockResolvedValue({
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    nickname: 'orbone-user',
  })

  await expect(
    queryClient.fetchQuery(currentUserQueryOptions()),
  ).resolves.toBeNull()
  expect(getCurrentUser).toHaveBeenCalledTimes(1)
})

it('prevents automatic refetches after a failed session refresh marks the user signed out', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-17T00:00:00Z'))

  const showToast = vi.fn(() => vi.fn(() => undefined))
  const queryClient = createAppQueryClient(showToast)
  const observer = new QueryObserver(queryClient, currentUserQueryOptions())
  const additionalObserver = new QueryObserver(
    queryClient,
    currentUserQueryOptions(),
  )
  let unsubscribe: () => void = () => undefined
  let unsubscribeAdditionalObserver: () => void = () => undefined

  queryClient.mount()
  vi.mocked(getCurrentUser).mockRejectedValue(new AuthSessionExpiredError())

  try {
    await expect(
      queryClient.fetchQuery(currentUserQueryOptions()),
    ).rejects.toBeInstanceOf(AuthSessionExpiredError)

    expect(queryClient.getQueryData(currentUserQueryKey)).toBeNull()
    expect(showToast).not.toHaveBeenCalled()
    expect(getCurrentUser).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-08-17T00:01:01Z'))

    unsubscribe = observer.subscribe(() => undefined)
    await settleAutomaticQueryTriggers()
    expect(getCurrentUser).toHaveBeenCalledTimes(1)

    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await settleAutomaticQueryTriggers()
    expect(getCurrentUser).toHaveBeenCalledTimes(1)

    onlineManager.setOnline(false)
    onlineManager.setOnline(true)
    await settleAutomaticQueryTriggers()
    expect(getCurrentUser).toHaveBeenCalledTimes(1)

    unsubscribeAdditionalObserver = additionalObserver.subscribe(
      () => undefined,
    )
    await settleAutomaticQueryTriggers()
    expect(getCurrentUser).toHaveBeenCalledTimes(1)
  } finally {
    unsubscribeAdditionalObserver()
    unsubscribe()
    queryClient.unmount()
  }
})

it('revalidates a known signed-out state after explicit invalidation', async () => {
  const queryClient = createQueryClient()
  const user = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    nickname: 'orbone-user',
  }

  vi.mocked(getCurrentUser).mockRejectedValueOnce(apiError(401, 'Unauthorized'))
  await queryClient.fetchQuery(currentUserQueryOptions())

  vi.mocked(getCurrentUser).mockResolvedValue(user)
  await queryClient.invalidateQueries({
    queryKey: currentUserQueryOptions().queryKey,
    refetchType: 'none',
  })

  await expect(
    queryClient.fetchQuery(currentUserQueryOptions()),
  ).resolves.toEqual(user)
  expect(getCurrentUser).toHaveBeenCalledTimes(2)
})

it('keeps the existing revalidation interval for signed-in users', async () => {
  vi.useFakeTimers()

  try {
    const queryClient = createQueryClient()
    const initialUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      nickname: 'orbone-user',
    }
    const updatedUser = { ...initialUser, nickname: 'updated-user' }

    vi.setSystemTime(new Date('2026-08-17T00:00:00Z'))
    vi.mocked(getCurrentUser).mockResolvedValueOnce(initialUser)
    await queryClient.fetchQuery(currentUserQueryOptions())

    vi.setSystemTime(new Date('2026-08-17T00:01:01Z'))
    vi.mocked(getCurrentUser).mockResolvedValueOnce(updatedUser)

    await expect(
      queryClient.fetchQuery(currentUserQueryOptions()),
    ).resolves.toEqual(updatedUser)
    expect(getCurrentUser).toHaveBeenCalledTimes(2)
  } finally {
    vi.useRealTimers()
  }
})

it('keeps non-auth current user errors visible to callers', async () => {
  const error = apiError(501, 'Not Implemented')

  vi.mocked(getCurrentUser).mockRejectedValue(error)

  await expect(fetchCurrentUserQuery()).rejects.toBe(error)
})

function fetchCurrentUserQuery() {
  return createQueryClient().fetchQuery(currentUserQueryOptions())
}

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return queryClient
}

async function settleAutomaticQueryTriggers() {
  await Promise.resolve()
  await Promise.resolve()
}

function apiError(status: number, statusText: string) {
  return new ApiError(
    statusText,
    status,
    new Response(null, { status, statusText }),
    { message: statusText },
  )
}
