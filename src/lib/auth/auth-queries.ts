import { queryOptions } from '@tanstack/react-query'

import { getCurrentUser } from '@/lib/api/auth'

export const currentUserQueryKey = ['auth', 'currentUser'] as const

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
    retry: false,
  })
}
