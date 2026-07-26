import {
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { createSolution } from '@/lib/api/solutions'
import { useCreateSolution } from '@/lib/solutions/solution-mutations'
import { solutionQueryKeys } from '@/lib/solutions/solution-queries'

vi.mock('@/lib/api/solutions', () => ({
  createSolution: vi.fn(),
}))

afterEach(() => {
  vi.resetAllMocks()
})

it('creates a solution and invalidates every solution list', async () => {
  const queryClient = createQueryClient()
  const allSolutionsKey = solutionQueryKeys.list()
  const problemSolutionsKey = solutionQueryKeys.list({
    problemId: 'problem-1',
  })
  const otherProblemSolutionsKey = solutionQueryKeys.list({
    problemId: 'problem-2',
  })
  const detailKey = solutionQueryKeys.detail('existing-solution')

  seedQuery(queryClient, allSolutionsKey)
  seedQuery(queryClient, problemSolutionsKey)
  seedQuery(queryClient, otherProblemSolutionsKey)
  seedQuery(queryClient, detailKey)
  vi.mocked(createSolution).mockResolvedValue({ id: 'solution-1' })

  const { result } = renderHook(() => useCreateSolution(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  const request = {
    problemId: 'problem-1',
    language: 'Java',
    code: 'class Main {}',
  }

  await act(async () => {
    await expect(result.current.mutateAsync(request)).resolves.toEqual({
      id: 'solution-1',
    })
  })

  expect(createSolution).toHaveBeenCalledWith(request)
  expect(isInvalidated(queryClient, allSolutionsKey)).toBe(true)
  expect(isInvalidated(queryClient, problemSolutionsKey)).toBe(true)
  expect(isInvalidated(queryClient, otherProblemSolutionsKey)).toBe(false)
  expect(isInvalidated(queryClient, detailKey)).toBe(false)
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  })
}

function seedQuery(queryClient: QueryClient, queryKey: QueryKey) {
  queryClient.setQueryData(queryKey, [])
}

function isInvalidated(queryClient: QueryClient, queryKey: QueryKey) {
  return queryClient.getQueryState(queryKey)?.isInvalidated
}
