import { setupServer } from 'msw/node'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'
import { practiceHandlers } from '@/mocks/practice-handlers'

const server = setupServer(...practiceHandlers)
const base = window.location.origin
const path = '/groups/time-contract/practices'
const created: string[] = []
const schedule = {
  startDate: '2030-01-02T09:30:00+09:00',
  endDate: '2030-01-02T18:45:00+09:00',
}
const body = {
  title: '시간 계약',
  ...schedule,
  problemIds: ['10000000-0000-4000-8000-000000000001'],
}

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE_URL', base)
  server.listen({ onUnhandledRequest: 'error' })
})
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
})
afterEach(async () => {
  for (const id of created.splice(0))
    await fetch(`${base}${path}/${id}`, { method: 'DELETE' })
  vi.useRealTimers()
})
afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

async function create(changes: Record<string, unknown> = {}) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, ...changes }),
  })
  const result = (await response.json()) as {
    practiceId: string
    startDate: string
    endDate: string
    code?: string
  }
  if (response.ok) created.push(result.practiceId)
  return { response, result }
}

it.each([
  schedule,
  { startDate: '2030-01-02T00:30:00Z', endDate: '2030-01-02T09:45:00Z' },
  { startDate: '2030-01-02T09:30:00', endDate: '2030-01-02T18:45:00' },
])(
  'normalizes offset, UTC and transitional KST requests to UTC responses: %j',
  async (input) => {
    const { response, result } = await create(input)
    expect(response.status).toBe(201)
    expect(result).toMatchObject({
      startDate: '2030-01-02T00:30:00.000Z',
      endDate: '2030-01-02T09:45:00.000Z',
    })
    expect(result).not.toHaveProperty('start_date')
    expect(result).not.toHaveProperty('id')
  },
)

it.each([
  { endDate: schedule.startDate },
  { endDate: '2030-01-02T09:29:00+09:00' },
  { startDate: '2029-12-31T00:00:00Z', endDate: '2030-01-01T00:00:00Z' },
])(
  'rejects invalid ranges on create and update without changing persisted dates: %j',
  async (changes) => {
    const { result } = await create()
    const invalid = await create(changes)
    expect(invalid.response.status).toBe(400)
    expect(invalid.result.code).toBe('PRACTICE_INVALID_END_DATE')
    const detail = `${base}${path}/${result.practiceId}`
    const update = await fetch(detail, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: body.title, ...schedule, ...changes }),
    })
    expect(update.status).toBe(400)
    expect(await update.json()).toMatchObject({
      code: 'PRACTICE_INVALID_END_DATE',
    })
    expect(await fetch(detail).then((res) => res.json())).toMatchObject({
      startDate: result.startDate,
      endDate: result.endDate,
    })
  },
)

it('returns normalized UTC dates on update and rejects editing at the existing end', async () => {
  const { result } = await create()
  const detail = `${base}${path}/${result.practiceId}`
  const updateBody = {
    title: body.title,
    ...schedule,
    endDate: '2030-01-03T00:00:00+09:00',
  }
  const update = () =>
    fetch(detail, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateBody),
    })
  expect(await (await update()).json()).toMatchObject({
    endDate: '2030-01-02T15:00:00.000Z',
  })
  vi.setSystemTime(new Date('2030-01-02T15:00:00Z'))
  const ended = await update()
  expect(ended.status).toBe(409)
  expect(await ended.json()).toMatchObject({ code: 'PRACTICE_ALREADY_ENDED' })
})

it.each([
  [-1, 204],
  [0, 409],
  [1, 409],
])(
  'checks problem deletion at end %+d ms without mutating rejected requests',
  async (offset, status) => {
    const firstId = body.problemIds[0]
    if (!firstId) throw new Error('Missing problem fixture')
    const secondId = '10000000-0000-4000-8000-000000000002'
    const { result } = await create({ problemIds: [firstId, secondId] })
    const detail = `${base}${path}/${result.practiceId}`
    const before = (await fetch(detail).then((response) =>
      response.json(),
    )) as {
      problems: { problemId: string }[]
      updatedAt: string
    }
    vi.setSystemTime(new Date(Date.parse(result.endDate) + offset))
    const response = await fetch(`${detail}/problems/${firstId}`, {
      method: 'DELETE',
    })
    expect(response.status).toBe(status)
    const after = (await fetch(detail).then((value) =>
      value.json(),
    )) as typeof before
    if (status === 409) {
      expect(await response.json()).toMatchObject({
        code: 'PRACTICE_ALREADY_ENDED',
      })
      expect(after.problems).toEqual(before.problems)
      expect(after.updatedAt).toBe(before.updatedAt)
    } else {
      expect(after.problems.map((problem) => problem.problemId)).toEqual([
        secondId,
      ])
    }
  },
)

it.each([
  [{ startDate: null }, 'INVALID_FIELD'],
  [{ endDate: '' }, 'INVALID_FIELD'],
  [{ startDate: '2030-02-30T00:00:00Z' }, 'MALFORMED_REQUEST'],
])(
  'rejects missing and malformed schedule fields: %j',
  async (changes, code) => {
    const { response, result } = await create(changes)
    expect(response.status).toBe(400)
    expect(result.code).toBe(code)
  },
)
