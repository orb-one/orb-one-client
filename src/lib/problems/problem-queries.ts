import { queryOptions } from '@tanstack/react-query'

import {
  getProblem,
  getProblems,
  type GetProblemsParams,
} from '@/lib/api/problems'

export const problemQueryKeys = {
  all: ['problems'] as const,
  lists: () => [...problemQueryKeys.all, 'list'] as const,
  list: (params: GetProblemsParams) =>
    [
      ...problemQueryKeys.lists(),
      params.keyword?.trim() ?? '',
      params.provider ?? '',
      params.difficulty?.trim().toLowerCase() ?? '',
      params.page,
      params.size,
    ] as const,
  detail: (problemId: string) =>
    [...problemQueryKeys.all, 'detail', problemId] as const,
}

export function problemListQueryOptions(params: GetProblemsParams) {
  return queryOptions({
    queryKey: problemQueryKeys.list(params),
    queryFn: () => getProblems(params),
  })
}

export function problemQueryOptions(problemId: string) {
  return queryOptions({
    queryKey: problemQueryKeys.detail(problemId),
    queryFn: () => getProblem(problemId),
  })
}
