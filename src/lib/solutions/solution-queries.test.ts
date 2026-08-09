import { QueryClient } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'

import { getSolution, getSolutions } from '@/lib/api/solutions'
import {
  solutionQueryKeys,
  solutionQueryOptions,
  solutionsQueryOptions,
} from '@/lib/solutions/solution-queries'

vi.mock('@/lib/api/solutions', () => ({
  getSolution: vi.fn(),
  getSolutions: vi.fn(),
}))

afterEach(() => {
  vi.resetAllMocks()
})

it('uses separate stable keys for all solution lists and filtered lists', () => {
  expect(solutionQueryKeys.list()).toEqual(['solutions', 'list', null])
  expect(solutionQueryKeys.list({ problemId: 'problem-1' })).toEqual([
    'solutions',
    'list',
    'problem-1',
  ])
})

it('fetches a solution list with its filter', async () => {
  const solutions = [
    {
      id: 'solution-1',
      problemId: 'problem-1',
      userId: 'user-1',
      isSolved: null,
      isDraft: null,
      language: null,
      createdAt: null,
    },
  ]

  vi.mocked(getSolutions).mockResolvedValue(solutions)

  await expect(
    createQueryClient().fetchQuery(
      solutionsQueryOptions({ problemId: 'problem-1' }),
    ),
  ).resolves.toEqual(solutions)
  expect(getSolutions).toHaveBeenCalledWith({ problemId: 'problem-1' })
})

it('fetches a solution detail by id', async () => {
  const solution = {
    id: 'solution-1',
    problemId: 'problem-1',
    userId: 'user-1',
    isSolved: null,
    isDraft: null,
    language: null,
    memoryUsage: null,
    timeElapsed: null,
    createdAt: null,
    updatedAt: null,
    code: 'class Main {}',
    description: '풀이 설명',
  }

  vi.mocked(getSolution).mockResolvedValue(solution)

  await expect(
    createQueryClient().fetchQuery(solutionQueryOptions('solution-1')),
  ).resolves.toEqual(solution)
  expect(getSolution).toHaveBeenCalledWith('solution-1')
})

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}
