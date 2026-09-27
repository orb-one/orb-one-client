import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {
  createSolution,
  type CreateSolutionRequest,
  deleteSolution,
  restoreSolution,
  type UpdateSolutionRequest,
  updateSolution,
} from '@/lib/api/solutions'
import { solutionQueryKeys } from '@/lib/solutions/solution-queries'

export function useCreateSolution() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CreateSolutionRequest) => createSolution(request),
    onSuccess: async (_, request) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: solutionQueryKeys.list(),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: solutionQueryKeys.list({
            problemId: request.problemId,
          }),
          exact: true,
        }),
      ])
    },
  })
}

export function useUpdateSolution(solutionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: UpdateSolutionRequest) =>
      updateSolution(solutionId, request),
    onSuccess: async (solution) => {
      queryClient.setQueryData(solutionQueryKeys.detail(solutionId), solution)
      await queryClient.invalidateQueries({
        queryKey: [...solutionQueryKeys.all, 'list'],
      })
    },
  })
}

/** 풀이 삭제 후 모든 목록 cache를 갱신한다. */
export function useDeleteSolution(solutionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteSolution(solutionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...solutionQueryKeys.all, 'list'],
      })
    },
  })
}

/** toast처럼 route 밖에서 실행되는 복구 요청과 관련 cache 갱신을 함께 처리한다. */
export async function restoreDeletedSolution(
  queryClient: QueryClient,
  solutionId: string,
) {
  await restoreSolution(solutionId)
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: [...solutionQueryKeys.all, 'list'],
    }),
    queryClient.invalidateQueries({
      queryKey: solutionQueryKeys.detail(solutionId),
      exact: true,
    }),
  ])
}
