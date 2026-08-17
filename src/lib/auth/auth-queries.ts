import { queryOptions } from '@tanstack/react-query'

import { getCurrentUser } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'

export const currentUserQueryKey = ['auth', 'currentUser'] as const

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => getAuthenticatedUser(signal),
    retry: false,
  })
}

async function getAuthenticatedUser(signal: AbortSignal) {
  try {
    return await getCurrentUser(signal)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }

    throw error
  }
}
