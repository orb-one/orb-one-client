import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createSolution,
  type CreateSolutionRequest,
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
