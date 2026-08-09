import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'

import { getProblem, getProblems } from '@/lib/api/problems'
import { problemHandlers } from '@/mocks/problem-handlers'

const server = setupServer(...problemHandlers)

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

it('returns a paginated problem list and problem detail', async () => {
  const firstPage = await getProblems({ page: 0, size: 2 })
  const secondPage = await getProblems({ page: 1, size: 2 })

  expect(firstPage).toMatchObject({
    page: 0,
    size: 2,
    totalElements: 3,
    totalPages: 2,
  })
  expect(firstPage.problems).toHaveLength(2)
  expect(secondPage.problems).toHaveLength(1)
  const firstProblem = firstPage.problems[0]

  expect(firstProblem).toBeDefined()
  if (firstProblem) {
    await expect(getProblem(firstProblem.id)).resolves.toEqual(firstProblem)
  }
})
