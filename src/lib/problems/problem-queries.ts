import { queryOptions } from '@tanstack/react-query'

import { getProblem } from '@/lib/api/problems'

export const problemQueryKeys = {
  all: ['problems'] as const,
  detail: (problemId: string) =>
    [...problemQueryKeys.all, 'detail', problemId] as const,
}

export function problemQueryOptions(problemId: string) {
  return queryOptions({
    queryKey: problemQueryKeys.detail(problemId),
    queryFn: () => getProblem(problemId),
  })
}
