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
  expect(firstPage.problems.map((problem) => problem.externalId)).toEqual([
    '1000',
    '1204',
  ])
  expect(secondPage.problems.map((problem) => problem.externalId)).toEqual([
    '2557',
  ])
  const firstProblem = firstPage.problems[0]

  expect(firstProblem).toBeDefined()
  if (firstProblem) {
    await expect(getProblem(firstProblem.id)).resolves.toEqual(firstProblem)
  }
})

it('returns the server problem list response shape', async () => {
  const response = await fetch('http://localhost:8080/problems?page=0&size=1', {
    credentials: 'include',
  })

  await expect(response.json()).resolves.toEqual({
    problems: [
      {
        problemId: '10000000-0000-4000-8000-000000000001',
        provider: 'BOJ',
        externalProblemId: '1000',
        name: 'A+B',
        url: 'https://www.acmicpc.net/problem/1000',
        difficulty: 'BRONZE_5',
      },
    ],
    page: 0,
    size: 1,
    totalElements: 3,
    totalPages: 3,
  })
})

it('filters problems by name or external problem number', async () => {
  const nameResult = await getProblems({
    keyword: '최빈수',
    page: 0,
    size: 10,
  })
  const numberResult = await getProblems({
    keyword: '2557',
    page: 0,
    size: 10,
  })

  expect(nameResult.problems.map((problem) => problem.name)).toEqual([
    '최빈수 구하기',
  ])
  expect(numberResult.problems.map((problem) => problem.externalId)).toEqual([
    '2557',
  ])
})

it('filters problems by provider and difficulty', async () => {
  const result = await getProblems({
    difficulty: 'bronze_5',
    page: 0,
    provider: 'BOJ',
    size: 10,
  })

  expect(result).toEqual({
    problems: [
      {
        id: '10000000-0000-4000-8000-000000000001',
        provider: 'BOJ',
        externalId: '1000',
        name: 'A+B',
        url: 'https://www.acmicpc.net/problem/1000',
        difficulty: 'BRONZE_5',
      },
      {
        id: '10000000-0000-4000-8000-000000000002',
        provider: 'BOJ',
        externalId: '2557',
        name: 'Hello World',
        url: 'https://www.acmicpc.net/problem/2557',
        difficulty: 'BRONZE_5',
      },
    ],
    page: 0,
    size: 10,
    totalElements: 2,
    totalPages: 1,
  })
})
