import { afterEach, beforeEach, expect, it, vi } from 'vitest'

let createSolution: typeof import('@/lib/api/solutions').createSolution
let deleteSolution: typeof import('@/lib/api/solutions').deleteSolution
let getSolution: typeof import('@/lib/api/solutions').getSolution
let getSolutions: typeof import('@/lib/api/solutions').getSolutions
let restoreSolution: typeof import('@/lib/api/solutions').restoreSolution
let updateSolution: typeof import('@/lib/api/solutions').updateSolution

beforeEach(async () => {
  vi.resetModules()
  const solutions = await import('@/lib/api/solutions')

  createSolution = solutions.createSolution
  deleteSolution = solutions.deleteSolution
  getSolution = solutions.getSolution
  getSolutions = solutions.getSolutions
  restoreSolution = solutions.restoreSolution
  updateSolution = solutions.updateSolution
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
})

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
        authorNickname: 'solution-author',
        problemName: 'A+B',
        problemProvider: 'BOJ',
        problemNumber: '1000',
        problemDifficulty: 'BRONZE_5',
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
      authorNickname: 'solution-author',
      problemName: 'A+B',
      problemProvider: 'BOJ',
      problemNumber: '1000',
      problemDifficulty: 'BRONZE_5',
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
        problemName: null,
        problemProvider: null,
        problemNumber: null,
        problemDifficulty: null,
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
      problemName: null,
      problemProvider: null,
      problemNumber: null,
      problemDifficulty: null,
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

it('creates a solution with every documented request field', async () => {
  const request = {
    problemId: 'problem-1',
    language: 'Java',
    code: 'class Main {}',
    isSolved: true,
    isDraft: false as const,
    memoryUsage: 12_345,
    timeElapsed: 67,
    description: '풀이 설명',
  }
  const fetchMock = mockJsonResponse(
    { solutionId: 'solution-3' },
    { withCsrf: true },
  )

  await expect(createSolution(request)).resolves.toEqual({ id: 'solution-3' })

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/solutions',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(request),
    }),
  )

  const headers = fetchMock.mock.calls[1]?.[1]?.headers

  expect(headers).toBeInstanceOf(Headers)
  expect((headers as Headers).get('Content-Type')).toBe('application/json')
  expect((headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-token')
})

it('updates every replaceable solution field and maps the detail response', async () => {
  const request = {
    language: 'Python',
    code: 'print(1)',
    isSolved: true,
    isDraft: false,
    memoryUsage: 12_300,
    timeElapsed: 45,
    description: null,
  }
  const fetchMock = mockJsonResponse(
    {
      solutionId: 'solution/id',
      problemId: 'problem-1',
      userId: 'user-1',
      ...request,
      createdAt: '2026-08-01T01:00:00',
      updatedAt: '2026-08-01T02:00:00',
    },
    { withCsrf: true },
  )

  await expect(updateSolution('solution/id', request)).resolves.toEqual({
    id: 'solution/id',
    problemId: 'problem-1',
    userId: 'user-1',
    language: 'Python',
    code: 'print(1)',
    isSolved: true,
    isDraft: false,
    memoryUsage: 12_300,
    timeElapsed: 45,
    description: '',
    createdAt: '2026-08-01T01:00:00',
    updatedAt: '2026-08-01T02:00:00',
  })

  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/solutions/solution%2Fid',
    expect.objectContaining({
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify(request),
    }),
  )
  expect(
    new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('X-XSRF-TOKEN'),
  ).toBe('csrf-token')
})

it('deletes an encoded solution path with CSRF protection', async () => {
  const fetchMock = mockEmptyResponseWithCsrf()

  await expect(deleteSolution('solution/id')).resolves.toBeUndefined()

  expect(fetchMock).toHaveBeenLastCalledWith(
    'http://localhost:8080/solutions/solution%2Fid',
    expect.objectContaining({
      method: 'DELETE',
      credentials: 'include',
    }),
  )
  expect(
    new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('X-XSRF-TOKEN'),
  ).toBe('csrf-token')
})

it('restores an encoded solution path with CSRF protection', async () => {
  const fetchMock = mockEmptyResponseWithCsrf()

  await expect(restoreSolution('solution/id')).resolves.toBeUndefined()

  expect(fetchMock).toHaveBeenLastCalledWith(
    'http://localhost:8080/solutions/solution%2Fid/restore',
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }),
  )
  expect(
    new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('X-XSRF-TOKEN'),
  ).toBe('csrf-token')
})

function mockJsonResponse(
  body: unknown,
  { withCsrf = false }: { withCsrf?: boolean } = {},
) {
  const responseBodies = withCsrf
    ? [{ token: 'csrf-token', headerName: 'X-XSRF-TOKEN' }, body]
    : [body]

  const fetchMock = vi.fn<typeof fetch>()

  for (const responseBody of responseBodies) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(responseBody), {
        headers: { 'content-type': 'application/json' },
      }),
    )
  }

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

function mockEmptyResponseWithCsrf() {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: 'csrf-token',
          headerName: 'X-XSRF-TOKEN',
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}
