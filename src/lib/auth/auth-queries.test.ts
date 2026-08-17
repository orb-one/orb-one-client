import { QueryClient } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'

import { getCurrentUser } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { currentUserQueryOptions } from '@/lib/auth/auth-queries'

vi.mock('@/lib/api/auth', () => ({
  getCurrentUser: vi.fn(),
}))

afterEach(() => {
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

it('keeps non-auth current user errors visible to callers', async () => {
  const error = apiError(501, 'Not Implemented')

  vi.mocked(getCurrentUser).mockRejectedValue(error)

  await expect(fetchCurrentUserQuery()).rejects.toBe(error)
})

function fetchCurrentUserQuery() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return queryClient.fetchQuery(currentUserQueryOptions())
}

function apiError(status: number, statusText: string) {
  return new ApiError(
    statusText,
    status,
    new Response(null, { status, statusText }),
    { message: statusText },
  )
}
