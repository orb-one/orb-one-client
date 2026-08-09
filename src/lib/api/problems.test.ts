import { afterEach, expect, it, vi } from 'vitest'

import { getProblem } from '@/lib/api/problems'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('gets and maps a problem detail', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        problemId: 'problem/id',
        provider: 'BOJ',
        externalProblemId: '1000',
        name: 'A+B',
        url: 'https://www.acmicpc.net/problem/1000',
        difficulty: 'BRONZE_5',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  )
  vi.stubGlobal('fetch', fetchMock)

  await expect(getProblem('problem/id')).resolves.toEqual({
    id: 'problem/id',
    provider: 'BOJ',
    externalId: '1000',
    name: 'A+B',
    url: 'https://www.acmicpc.net/problem/1000',
    difficulty: 'BRONZE_5',
  })
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/problems/problem%2Fid',
    expect.objectContaining({ credentials: 'include' }),
  )
})
