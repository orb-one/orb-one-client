import { queryOptions } from '@tanstack/react-query'

import {
  getSolution,
  getSolutions,
  type GetSolutionsParams,
} from '@/lib/api/solutions'

export const solutionQueryKeys = {
  all: ['solutions'] as const,
  // problemId를 key에 포함해 전체 목록과 문제별 목록 cache가 섞이지 않게 한다.
  list: (params: GetSolutionsParams = {}) =>
    [...solutionQueryKeys.all, 'list', params.problemId ?? null] as const,
  // 상세 cache는 목록 cache와 별도 namespace를 사용한다.
  detail: (solutionId: string) =>
    [...solutionQueryKeys.all, 'detail', solutionId] as const,
}

// route에서 query key와 query function을 중복 선언하지 않도록 options를 공유한다.
export function solutionsQueryOptions(params: GetSolutionsParams = {}) {
  return queryOptions({
    queryKey: solutionQueryKeys.list(params),
    queryFn: () => getSolutions(params),
  })
}

// 동일한 상세 데이터를 여러 화면에서 조회해도 같은 cache entry를 재사용한다.
export function solutionQueryOptions(solutionId: string) {
  return queryOptions({
    queryKey: solutionQueryKeys.detail(solutionId),
    queryFn: () => getSolution(solutionId),
  })
}
