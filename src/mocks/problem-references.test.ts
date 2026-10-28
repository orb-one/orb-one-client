import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'

import { mockProblems } from '@/mocks/problem-handlers'
import { practiceHandlers } from '@/mocks/practice-handlers'
import { problemSetHandlers } from '@/mocks/problem-sets-handlers'
import { mockProblemSetDetails, mockProblemSetList } from '@/mocks/problem-sets'

const server = setupServer(...practiceHandlers, ...problemSetHandlers)
const base = window.location.origin
const groupId = 'reference-test-group'
const firstId = '10000000-0000-4000-8000-000000000001'
const secondId = '10000000-0000-4000-8000-000000000002'
const thirdId = '10000000-0000-4000-8000-000000000003'
const missingId = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const createdPaths: string[] = []

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE_URL', base)
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(async () => {
  for (const path of createdPaths.splice(0)) {
    await fetch(`${base}${path}`, { method: 'DELETE' })
  }
  server.resetHandlers()
})

afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

async function post(path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function createContainer(kind: 'practices' | 'problem-sets') {
  const path = `/groups/${groupId}/${kind}`
  const response = await post(path, {
    name: 'UUID 문제집',
    title: 'UUID 연습',
    startDate: '2030-01-01T00:00:00',
    endDate: '2030-01-03T23:59:59',
    problemIds: [firstId],
  })
  expect(response.status).toBe(201)
  const result = (await response.json()) as {
    id?: string
    problemSetId?: string
    problems: unknown[]
  }
  const id = kind === 'practices' ? result.id : result.problemSetId
  if (!id) throw new Error('Missing container ID')
  const detailPath = `${path}/${id}`
  createdPaths.push(detailPath)
  return { detailPath, result }
}

for (const kind of ['practices', 'problem-sets'] as const) {
  it(`${kind}: links catalog UUIDs and preserves catalog metadata`, async () => {
    const { detailPath, result } = await createContainer(kind)
    expect(result.problems).toEqual([mockProblems[0]])
    const response = await post(`${detailPath}/problems`, {
      problemIds: [secondId, thirdId],
    })
    expect(response.status).toBe(200)
    const detail = (await fetch(`${base}${detailPath}`).then((res) =>
      res.json(),
    )) as { problems?: unknown[]; items?: unknown[] }
    expect(detail.problems ?? detail.items).toEqual(mockProblems)
  })

  it(`${kind}: rejects mixed missing UUIDs and already linked UUIDs atomically`, async () => {
    const { detailPath } = await createContainer(kind)
    for (const [problemIds, status, code] of [
      [[secondId, missingId], 404, 'PROBLEM_NOT_FOUND'],
      [
        [secondId, firstId],
        409,
        kind === 'practices'
          ? 'PROBLEM_ALREADY_IN_PRACTICE'
          : 'PROBLEM_ALREADY_IN_SET',
      ],
    ] as const) {
      const response = await post(`${detailPath}/problems`, { problemIds })
      expect(response.status).toBe(status)
      expect(await response.json()).toMatchObject({ code })
      const detail = (await fetch(`${base}${detailPath}`).then((res) =>
        res.json(),
      )) as { problems?: unknown[]; items?: unknown[] }
      expect(detail.problems ?? detail.items).toEqual([mockProblems[0]])
    }
  })

  it(`${kind}: reports null UUID element validation errors on create and add`, async () => {
    const { detailPath } = await createContainer(kind)
    for (const path of [
      `/groups/${groupId}/${kind}`,
      `${detailPath}/problems`,
    ]) {
      const response = await post(path, {
        name: '이름',
        title: '연습',
        problemIds: [firstId, null, null],
      })
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({
        code: 'INVALID_FIELD',
        fieldErrors: [
          { field: 'problemIds[1]', reason: 'REQUIRED' },
          { field: 'problemIds[2]', reason: 'REQUIRED' },
        ],
      })
    }
  })

  it.each([
    [{ problemIds: [] }, 400, 'INVALID_FIELD'],
    [{}, 400, 'INVALID_FIELD'],
    [{ problemIds: [null] }, 400, 'INVALID_FIELD'],
    [{ problemIds: ['1000'] }, 400, 'MALFORMED_REQUEST'],
    [{ problemIds: [firstId, firstId] }, 400, 'DUPLICATE_PROBLEM_IN_REQUEST'],
    [{ problemIds: [missingId] }, 404, 'PROBLEM_NOT_FOUND'],
    [{ problems: [mockProblems[0]] }, 400, 'INVALID_FIELD'],
  ])(
    `${kind}: rejects invalid create and add references %j`,
    async (body, status, code) => {
      const { detailPath } = await createContainer(kind)
      const beforeSetCount = mockProblemSetList.length
      for (const path of [
        `/groups/${groupId}/${kind}`,
        `${detailPath}/problems`,
      ]) {
        const response = await post(path, {
          name: '잘못된 문제집',
          title: '잘못된 연습',
          ...body,
        })
        expect(response.status).toBe(status)
        expect(await response.json()).toMatchObject({ code })
      }
      expect(mockProblemSetList).toHaveLength(beforeSetCount)
      if (kind === 'problem-sets') {
        expect(
          mockProblemSetDetails[detailPath.split('/').at(-1) ?? '']?.problems,
        ).toEqual([mockProblems[0]])
      } else {
        const list = (await fetch(`${base}/groups/${groupId}/practices`).then(
          (res) => res.json(),
        )) as unknown[]
        expect(list).toHaveLength(1)
      }
    },
  )
}

it('practice editing preserves problem references and accepts camelCase dates', async () => {
  const { detailPath } = await createContainer('practices')
  const response = await fetch(`${base}${detailPath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '수정된 연습',
      startDate: '2030-01-02T00:00:00',
      endDate: '2030-01-05T23:59:59',
    }),
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    title: '수정된 연습',
    start_date: '2030-01-02T00:00:00',
    end_date: '2030-01-05T23:59:59',
    problems: [mockProblems[0]],
  })
})
