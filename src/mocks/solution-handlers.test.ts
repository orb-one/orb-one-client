import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'

import { ApiError, apiClient } from '@/lib/api/client'
import { createSolution, getSolution, getSolutions } from '@/lib/api/solutions'
import { resetMockSolutions } from '@/mocks/solution-data'
import { solutionHandlers } from '@/mocks/solution-handlers'

const server = setupServer(...solutionHandlers)

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  resetMockSolutions()
})

afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

it('returns solution fixtures without detail-only fields', async () => {
  const solutions = await getSolutions()

  expect(solutions).toHaveLength(3)
  expect(solutions[0]).toMatchObject({
    id: '30000000-0000-4000-8000-000000000001',
    problem: {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'A+B',
      tier: 1,
      tags: [{ name: '수학' }],
    },
    isSolved: true,
    isDraft: false,
    language: 'Java',
  })
  expect(solutions[2]).toMatchObject({
    problem: { tier: null, url: null, tags: [] },
    memoryUsage: null,
    timeElapsed: null,
  })
  expect(solutions[0]).not.toHaveProperty('code')
  expect(solutions[0]).not.toHaveProperty('description')
})

it('filters the solution list by problemId', async () => {
  const problemId = '10000000-0000-4000-8000-000000000002'

  const solutions = await getSolutions({ problemId })

  expect(solutions).toHaveLength(1)
  expect(solutions[0]?.problem?.id).toBe(problemId)
})

it('returns the code and description from a solution detail', async () => {
  const solution = await getSolution('30000000-0000-4000-8000-000000000002')

  expect(solution.problem?.name).toBe('미로 탐색')
  expect(solution.code).toContain('from collections import deque')
  expect(solution.description).toContain('BFS')
})

it('returns a 404 response for an unknown solution', async () => {
  await expect(getSolution('unknown-solution')).rejects.toMatchObject({
    status: 404,
    message: 'Solution not found',
  })
})

it('creates a solution that subsequent list and detail requests can read', async () => {
  const request = {
    problemId: '10000000-0000-4000-8000-000000000001',
    language: 'TypeScript',
    code: 'console.log(input)',
  }

  const result = await createSolution(request)
  const solutions = await getSolutions({ problemId: request.problemId })
  const detail = await getSolution(result.id)

  expect(solutions).toHaveLength(2)
  expect(solutions[0]).toMatchObject({
    id: result.id,
    language: 'TypeScript',
    isSolved: false,
    isDraft: false,
  })
  expect(detail).toMatchObject({
    id: result.id,
    code: 'console.log(input)',
    description: '',
  })
})

it('rejects malformed requests and unknown problems', async () => {
  const invalidRequest = apiClient('/solutions', {
    method: 'POST',
    body: { problemId: '', language: 'Java', code: '' },
  })

  await expect(invalidRequest).rejects.toMatchObject({
    status: 400,
    message: 'Invalid solution request',
  })
  await expect(invalidRequest).rejects.toBeInstanceOf(ApiError)

  await expect(
    createSolution({
      problemId: 'unknown-problem',
      language: 'Java',
      code: 'class Main {}',
    }),
  ).rejects.toMatchObject({
    status: 404,
    message: 'Problem not found',
  })
})
