import { afterEach, expect, it, vi } from 'vitest'

import { createSolution, getSolution, getSolutions } from '@/lib/api/solutions'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('gets and maps the solution list without a filter', async () => {
  const fetchMock = mockJsonResponse({
    solutions: [
      {
        solutionId: 'solution-1',
        problemId: 'problem-1',
        userId: 'user-1',
        isSolved: true,
        isDraft: false,
        language: 'Java',
        createdAt: '2026-07-18T09:00:00Z',
      },
    ],
  })

  await expect(getSolutions()).resolves.toEqual([
    {
      id: 'solution-1',
      problemId: 'problem-1',
      userId: 'user-1',
      isSolved: true,
      isDraft: false,
      language: 'Java',
      createdAt: '2026-07-18T09:00:00Z',
    },
  ])

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/solutions',
    expect.objectContaining({ credentials: 'include' }),
  )
})

it('encodes the optional problem filter', async () => {
  const fetchMock = mockJsonResponse({
    solutions: [
      {
        solutionId: 'solution-2',
        problemId: 'problem-2',
        userId: 'user-2',
        language: null,
        isSolved: null,
        isDraft: null,
        createdAt: null,
      },
    ],
  })

  await expect(getSolutions({ problemId: 'problem id/2' })).resolves.toEqual([
    {
      id: 'solution-2',
      problemId: 'problem-2',
      userId: 'user-2',
      isSolved: null,
      isDraft: null,
      language: null,
      createdAt: null,
    },
  ])

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/solutions?problemId=problem+id%2F2',
    expect.objectContaining({ credentials: 'include' }),
  )
})

it('gets a solution detail and normalizes nullable text fields', async () => {
  const fetchMock = mockJsonResponse({
    solutionId: 'solution/id',
    problemId: 'problem-1',
    userId: 'user-1',
    language: null,
    code: null,
    description: null,
    isSolved: null,
    isDraft: null,
    memoryUsage: null,
    timeElapsed: null,
    createdAt: null,
    updatedAt: null,
  })

  await expect(getSolution('solution/id')).resolves.toEqual({
    id: 'solution/id',
    problemId: 'problem-1',
    userId: 'user-1',
    isSolved: null,
    isDraft: null,
    language: null,
    memoryUsage: null,
    timeElapsed: null,
    createdAt: null,
    updatedAt: null,
    code: '',
    description: '',
  })

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/solutions/solution%2Fid',
    expect.objectContaining({ credentials: 'include' }),
  )
})

it('creates a solution with only the documented request fields', async () => {
  const request = {
    problemId: 'problem-1',
    language: 'Java',
    code: 'class Main {}',
  }
  const fetchMock = mockJsonResponse({ solutionId: 'solution-3' })

  await expect(createSolution(request)).resolves.toEqual({ id: 'solution-3' })

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/solutions',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    }),
  )

  const headers = fetchMock.mock.calls[0]?.[1]?.headers

  expect(headers).toBeInstanceOf(Headers)
  expect((headers as Headers).get('Content-Type')).toBe('application/json')
})

function mockJsonResponse(body: unknown) {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')

  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
    }),
  )

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}
