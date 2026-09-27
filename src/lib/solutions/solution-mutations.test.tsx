import {
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import {
  createSolution,
  deleteSolution,
  restoreSolution,
  updateSolution,
} from '@/lib/api/solutions'
import {
  useCreateSolution,
  useDeleteSolution,
  restoreDeletedSolution,
  useUpdateSolution,
} from '@/lib/solutions/solution-mutations'
import { solutionQueryKeys } from '@/lib/solutions/solution-queries'

vi.mock('@/lib/api/solutions', () => ({
  createSolution: vi.fn(),
  deleteSolution: vi.fn(),
  restoreSolution: vi.fn(),
  updateSolution: vi.fn(),
}))

afterEach(() => {
  vi.resetAllMocks()
})

it('updates the detail cache and invalidates every solution list', async () => {
  const queryClient = createQueryClient()
  const solutionId = 'solution-1'
  const allSolutionsKey = solutionQueryKeys.list()
  const problemSolutionsKey = solutionQueryKeys.list({
    problemId: 'problem-1',
  })
  const detailKey = solutionQueryKeys.detail(solutionId)
  const request = {
    language: 'Python',
    code: 'print(1)',
    isSolved: true,
    isDraft: false,
    memoryUsage: 12_300,
    timeElapsed: 45,
    description: 'updated',
  }
  const updatedSolution = {
    id: solutionId,
    problemId: 'problem-1',
    userId: 'user-1',
    ...request,
    createdAt: '2026-08-01T01:00:00',
    updatedAt: '2026-08-01T02:00:00',
  }

  seedQuery(queryClient, allSolutionsKey)
  seedQuery(queryClient, problemSolutionsKey)
  seedQuery(queryClient, detailKey)
  vi.mocked(updateSolution).mockResolvedValue(updatedSolution)

  const { result } = renderHook(() => useUpdateSolution(solutionId), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })

  await act(async () => {
    await expect(result.current.mutateAsync(request)).resolves.toEqual(
      updatedSolution,
    )
  })

  expect(updateSolution).toHaveBeenCalledWith(solutionId, request)
  expect(queryClient.getQueryData(detailKey)).toEqual(updatedSolution)
  expect(isInvalidated(queryClient, allSolutionsKey)).toBe(true)
  expect(isInvalidated(queryClient, problemSolutionsKey)).toBe(true)
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
    isSolved: false,
    isDraft: false as const,
    memoryUsage: null,
    timeElapsed: null,
    description: null,
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

it('deletes a solution and invalidates every list', async () => {
  const queryClient = createQueryClient()
  const solutionId = 'solution-1'
  const allSolutionsKey = solutionQueryKeys.list()
  const problemSolutionsKey = solutionQueryKeys.list({
    problemId: 'problem-1',
  })
  const detailKey = solutionQueryKeys.detail(solutionId)

  seedQuery(queryClient, allSolutionsKey)
  seedQuery(queryClient, problemSolutionsKey)
  seedQuery(queryClient, detailKey)
  vi.mocked(deleteSolution).mockResolvedValue()

  const { result } = renderHook(() => useDeleteSolution(solutionId), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })

  await act(async () => {
    await expect(result.current.mutateAsync()).resolves.toBeUndefined()
  })

  expect(deleteSolution).toHaveBeenCalledWith(solutionId)
  expect(queryClient.getQueryData(detailKey)).toEqual([])
  expect(isInvalidated(queryClient, allSolutionsKey)).toBe(true)
  expect(isInvalidated(queryClient, problemSolutionsKey)).toBe(true)
})

it('restores a deleted solution and invalidates every list and its detail', async () => {
  const queryClient = createQueryClient()
  const solutionId = 'solution-1'
  const allSolutionsKey = solutionQueryKeys.list()
  const problemSolutionsKey = solutionQueryKeys.list({
    problemId: 'problem-1',
  })
  const detailKey = solutionQueryKeys.detail(solutionId)

  seedQuery(queryClient, allSolutionsKey)
  seedQuery(queryClient, problemSolutionsKey)
  seedQuery(queryClient, detailKey)
  vi.mocked(restoreSolution).mockResolvedValue()

  await expect(
    restoreDeletedSolution(queryClient, solutionId),
  ).resolves.toBeUndefined()

  expect(restoreSolution).toHaveBeenCalledWith(solutionId)
  expect(isInvalidated(queryClient, allSolutionsKey)).toBe(true)
  expect(isInvalidated(queryClient, problemSolutionsKey)).toBe(true)
  expect(isInvalidated(queryClient, detailKey)).toBe(true)
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
