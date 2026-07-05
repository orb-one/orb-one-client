import { queryOptions } from '@tanstack/react-query'

import { getCurrentUser } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'

export const currentUserQueryKey = ['auth', 'currentUser'] as const

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: currentUserQueryKey,
    queryFn: getAuthenticatedUser,
    retry: false,
  })
}

async function getAuthenticatedUser() {
  try {
    return await getCurrentUser()
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }

    throw error
  }
}
