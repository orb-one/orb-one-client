import { queryOptions } from '@tanstack/react-query'

import { getCurrentUser } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'

export const currentUserQueryKey = ['auth', 'currentUser'] as const

const signedInUserStaleTime = 60_000

/** 현재 인증 사용자를 조회하고 인증 상태에 맞는 캐시 정책을 적용한다. */
export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => getAuthenticatedUser(signal),
    staleTime: (query) =>
      query.state.data === null
        ? Number.POSITIVE_INFINITY
        : signedInUserStaleTime,
    retry: false,
  })
}

/** 401 응답을 오류가 아닌 명시적인 비로그인 상태로 변환한다. */
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
