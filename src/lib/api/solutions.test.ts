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
        problem: {
          problemId: 'problem-1',
          name: '두 수의 합',
          tier: 3,
          url: 'https://example.com/problems/1',
          tags: [{ tagId: 'tag-1', name: '구현' }],
        },
        isSolved: true,
        isDraft: false,
        language: 'Java',
        memoryUsage: 128,
        timeElapsed: 24,
        createdAt: '2026-07-18T09:00:00Z',
        updatedAt: '2026-07-18T09:30:00Z',
      },
    ],
  })

  await expect(getSolutions()).resolves.toEqual([
    {
      id: 'solution-1',
      problem: {
        id: 'problem-1',
        name: '두 수의 합',
        tier: 3,
        url: 'https://example.com/problems/1',
        tags: [{ id: 'tag-1', name: '구현' }],
      },
      isSolved: true,
      isDraft: false,
      language: 'Java',
      memoryUsage: 128,
      timeElapsed: 24,
      createdAt: '2026-07-18T09:00:00Z',
      updatedAt: '2026-07-18T09:30:00Z',
    },
  ])

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/solutions',
    expect.objectContaining({ credentials: 'include' }),
  )
})

it('encodes the optional problem filter and tolerates minimal list items', async () => {
  const fetchMock = mockJsonResponse({
    solutions: [{ solutionId: 'solution-2' }],
  })

  await expect(getSolutions({ problemId: 'problem id/2' })).resolves.toEqual([
    {
      id: 'solution-2',
      problem: null,
      isSolved: null,
      isDraft: null,
      language: null,
      memoryUsage: null,
      timeElapsed: null,
      createdAt: null,
      updatedAt: null,
    },
  ])

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/solutions?problemId=problem+id%2F2',
    expect.objectContaining({ credentials: 'include' }),
  )
})

it('gets a solution detail and maps absent extension fields to null', async () => {
  const fetchMock = mockJsonResponse({
    solutionId: 'solution/id',
    code: 'class Main {}',
    description: '풀이 설명',
  })

  await expect(getSolution('solution/id')).resolves.toEqual({
    id: 'solution/id',
    problem: null,
    isSolved: null,
    isDraft: null,
    language: null,
    memoryUsage: null,
    timeElapsed: null,
    createdAt: null,
    updatedAt: null,
    code: 'class Main {}',
    description: '풀이 설명',
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
