import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { StrictMode, type ReactNode } from 'react'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { AddPracticeProblemModal } from '@/components/practice/AddPracticeProblemModal'
import { CreatePracticeModal } from '@/components/practice/CreatePracticeModal'
import { usePracticeDetail } from '@/lib/api/practice'
import { problemListQueryOptions } from '@/lib/problems/problem-queries'
import { problemHandlers, mockProblems } from '@/mocks/problem-handlers'

const apiBase = 'http://localhost:8080'
const practicePath = `${apiBase}/groups/group-1/practices`
const onClose = vi.fn()
const server = setupServer(
  ...problemHandlers,
  http.get(`${apiBase}/auth/csrf`, () =>
    HttpResponse.json({ token: 'csrf', headerName: 'X-XSRF-TOKEN' }),
  ),
)

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE_URL', apiBase)
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2030, 0, 1, 12))
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.clearAllMocks()
  vi.useRealTimers()
})

afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

function renderModal(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const view = render(children, {
    wrapper: ({ children }) => (
      <Theme theme={neutralTheme} mode="light">
        <LayerProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </LayerProvider>
      </Theme>
    ),
  })
  return { ...view, queryClient }
}

async function selectProblem(name = 'A+B') {
  const pickerButton = screen.queryByRole('textbox', { name: '문제 검색' })
    ? null
    : screen.queryByRole('button', { name: /문제 선택|문제 변경/ })
  if (pickerButton) await userEvent.click(pickerButton)
  await userEvent.click(
    await screen.findByText(name, { selector: 'button span' }),
  )
  if (pickerButton) {
    await userEvent.click(screen.getByRole('button', { name: '선택 완료' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '문제 변경' })).toBeVisible(),
    )
  }
}

async function fillDates() {
  await userEvent.type(
    screen.getByRole('textbox', { name: '연습 이름' }),
    '1주차 연습',
  )
  await userEvent.click(screen.getByRole('button', { name: /^연습 기간:/ }))
  const dateLabel = (day: number) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(2030, 0, day))
  await userEvent.click(screen.getByRole('button', { name: dateLabel(1) }))
  await userEvent.click(screen.getByRole('button', { name: dateLabel(3) }))
}

it('creates a practice with the selected catalog UUID and invalidates the list', async () => {
  let body: unknown
  server.use(
    http.post(practicePath, async ({ request }) => {
      body = await request.json()
      return HttpResponse.json(
        { practiceId: 'practice-1', title: '1주차 연습' },
        { status: 201 },
      )
    }),
  )
  const { queryClient } = renderModal(
    <CreatePracticeModal groupId="group-1" isOpen onClose={onClose} />,
  )
  const listKey = ['groups', 'group-1', 'practices']
  queryClient.setQueryData(listKey, [])

  expect(screen.getByRole('button', { name: '생성하기' })).toBeDisabled()
  expect(
    screen.queryByRole('textbox', { name: '문제 링크' }),
  ).not.toBeInTheDocument()
  await fillDates()
  await selectProblem()
  await userEvent.click(screen.getByRole('button', { name: '생성하기' }))

  await waitFor(() => {
    expect(onClose).toHaveBeenCalledOnce()
  })
  expect(body).toEqual({
    title: '1주차 연습',
    startDate: '2030-01-01T00:00:00',
    endDate: '2030-01-03T23:59:59',
    problemIds: [mockProblems[0]?.problemId],
  })
  expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
})

it('adds multiple catalog UUIDs in one request and invalidates practice detail and list', async () => {
  let body: unknown
  server.use(
    http.post(`${practicePath}/practice-1/problems`, async ({ request }) => {
      body = await request.json()
      return new HttpResponse(null, { status: 200 })
    }),
  )
  const { queryClient } = renderModal(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      isOpen
      onClose={onClose}
    />,
  )
  const listKey = ['groups', 'group-1', 'practices']
  const detailKey = [...listKey, 'practice-1']
  queryClient.setQueryData(listKey, [])
  queryClient.setQueryData(detailKey, {})

  expect(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  ).toBeDisabled()
  await selectProblem()
  await selectProblem('Hello World')
  expect(screen.getByText('2개 선택됨')).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  )

  await waitFor(() => {
    expect(onClose).toHaveBeenCalledOnce()
  })
  expect(body).toEqual({
    problemIds: [mockProblems[0]?.problemId, mockProblems[1]?.problemId],
  })
  expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
  expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true)
})

it('confirms multiple creation problems without saving and discards cancelled selection edits', async () => {
  const requests: unknown[] = []
  server.use(
    http.post(practicePath, async ({ request }) => {
      requests.push(await request.json())
      return HttpResponse.json({ practiceId: 'practice-1' }, { status: 201 })
    }),
  )
  renderModal(
    <CreatePracticeModal groupId="group-1" isOpen onClose={onClose} />,
  )
  await fillDates()
  await userEvent.click(screen.getByRole('button', { name: '문제 선택' }))
  await selectProblem()
  await selectProblem('Hello World')
  await userEvent.click(screen.getByRole('button', { name: '선택 완료' }))
  expect(requests).toEqual([])
  expect(screen.getByText('2개 선택됨')).toBeVisible()

  await userEvent.click(screen.getByRole('button', { name: '문제 변경' }))
  await selectProblem()
  await selectProblem('최빈수 구하기')
  await userEvent.keyboard('{Escape}')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '문제 변경' })).toHaveFocus(),
  )
  expect(screen.getByRole('button', { name: 'A+B 선택 해제' })).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Hello World 선택 해제' }),
  ).toBeVisible()
  expect(screen.queryByText('최빈수 구하기')).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: '생성하기' }))
  await waitFor(() => {
    expect(onClose).toHaveBeenCalledOnce()
  })
  expect(requests).toEqual([
    {
      title: '1주차 연습',
      startDate: '2030-01-01T00:00:00',
      endDate: '2030-01-03T23:59:59',
      problemIds: [mockProblems[0]?.problemId, mockProblems[1]?.problemId],
    },
  ])
})

it('allows clearing a creation selection and requires at least one problem before saving', async () => {
  renderModal(
    <CreatePracticeModal groupId="group-1" isOpen onClose={onClose} />,
  )
  await fillDates()
  await selectProblem()
  await userEvent.click(screen.getByRole('button', { name: '문제 변경' }))
  await selectProblem()
  expect(screen.getByRole('button', { name: '선택 완료' })).toBeEnabled()
  await userEvent.click(screen.getByRole('button', { name: '선택 완료' }))
  expect(screen.getByRole('button', { name: '생성하기' })).toBeDisabled()
  await selectProblem('Hello World')
  await userEvent.click(
    screen.getByRole('button', { name: 'Hello World 선택 해제' }),
  )
  expect(screen.getByRole('button', { name: '문제 선택' })).toHaveFocus()
  expect(screen.getByRole('button', { name: '생성하기' })).toBeDisabled()
  expect(onClose).not.toHaveBeenCalled()
})

it('restores keyboard focus to the next selected problem or the list toggle after deselection', async () => {
  renderModal(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      isOpen
      onClose={onClose}
    />,
  )
  await selectProblem()
  await selectProblem('Hello World')
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제만 보기' }),
  )
  screen.getByRole('button', { name: /^A\+B/ }).focus()
  await userEvent.keyboard(' ')
  expect(screen.getByRole('button', { name: /^Hello World/ })).toHaveFocus()
  await userEvent.keyboard(' ')
  expect(screen.getByRole('button', { name: '전체 목록 보기' })).toHaveFocus()
  expect(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  ).toBeDisabled()
})

it('refreshes practice membership after a duplicate error and retries only the remaining selection', async () => {
  const requests: unknown[] = []
  let alreadyAdded = false
  server.use(
    http.get(`${practicePath}/practice-1`, () =>
      HttpResponse.json({
        practiceId: 'practice-1',
        problems: alreadyAdded ? [mockProblems[0]] : [],
      }),
    ),
    http.post(`${practicePath}/practice-1/problems`, async ({ request }) => {
      requests.push(await request.json())
      if (!alreadyAdded) {
        alreadyAdded = true
        return HttpResponse.json(
          {
            code: 'PROBLEM_ALREADY_IN_PRACTICE',
            message: '이미 연습에 포함된 문제가 있습니다.',
          },
          { status: 409 },
        )
      }
      return new HttpResponse(null, { status: 200 })
    }),
  )
  function PracticeProblemsModal() {
    const { data } = usePracticeDetail('group-1', 'practice-1')
    return (
      <AddPracticeProblemModal
        groupId="group-1"
        practiceId="practice-1"
        existingProblemIds={
          data?.problems?.map((problem) => problem.problemId) ?? []
        }
        isOpen
        onClose={onClose}
      />
    )
  }
  renderModal(<PracticeProblemsModal />)
  await selectProblem()
  await selectProblem('Hello World')
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  )
  expect(
    await screen.findByText('이미 연습에 포함된 문제가 있습니다.'),
  ).toBeVisible()
  expect(screen.getByRole('button', { name: /^A\+B/ })).toBeDisabled()
  expect(screen.getByText('1개 선택됨')).toBeVisible()
  expect(onClose).not.toHaveBeenCalled()
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  )
  await waitFor(() => {
    expect(onClose).toHaveBeenCalledOnce()
  })
  expect(requests).toEqual([
    { problemIds: [mockProblems[0]?.problemId, mockProblems[1]?.problemId] },
    { problemIds: [mockProblems[1]?.problemId] },
  ])
})

it('keeps creation input after a missing UUID and lets the user reselect and retry', async () => {
  const requests: unknown[] = []
  server.use(
    http.post(practicePath, async ({ request }) => {
      requests.push(await request.json())
      return requests.length === 1
        ? HttpResponse.json(
            { code: 'PROBLEM_NOT_FOUND', message: '문제를 찾을 수 없습니다.' },
            { status: 404 },
          )
        : HttpResponse.json(
            { practiceId: 'practice-1', title: '1주차 연습' },
            { status: 201 },
          )
    }),
  )
  renderModal(
    <CreatePracticeModal groupId="group-1" isOpen onClose={onClose} />,
  )
  await fillDates()
  await selectProblem()
  await userEvent.click(screen.getByRole('button', { name: '생성하기' }))

  expect(
    await screen.findByText(
      '선택한 문제를 찾을 수 없습니다. 다른 문제를 선택해 주세요.',
    ),
  ).toBeVisible()
  expect(screen.getByRole('textbox', { name: '연습 이름' })).toHaveValue(
    '1주차 연습',
  )
  expect(screen.getByText('BOJ 1000', { exact: true })).toBeVisible()
  expect(onClose).not.toHaveBeenCalled()

  await userEvent.click(screen.getByRole('button', { name: 'A+B 선택 해제' }))
  await selectProblem('Hello World')
  await userEvent.click(screen.getByRole('button', { name: '생성하기' }))
  await waitFor(() => {
    expect(onClose).toHaveBeenCalledOnce()
  })
  expect(requests[1]).toMatchObject({
    problemIds: [mockProblems[1]?.problemId],
  })
})

it.each([
  [400, 'INVALID_FIELD', '요청 값이 올바르지 않습니다.'],
  [409, 'PROBLEM_ALREADY_IN_PRACTICE', '이미 연습에 포함된 문제가 있습니다.'],
  [409, 'PRACTICE_ALREADY_ENDED', '종료된 연습에는 문제를 추가할 수 없습니다.'],
])(
  'keeps the selected problem after add failure %s %s',
  async (status, code, message) => {
    server.use(
      http.post(`${practicePath}/practice-1/problems`, () =>
        HttpResponse.json({ code, message }, { status }),
      ),
    )
    renderModal(
      <AddPracticeProblemModal
        groupId="group-1"
        practiceId="practice-1"
        isOpen
        onClose={onClose}
      />,
    )
    await selectProblem()
    await userEvent.click(
      screen.getByRole('button', { name: '선택한 문제 추가' }),
    )

    expect(await screen.findByText(message)).toBeVisible()
    expect(screen.getByText('1개 선택됨')).toBeVisible()
    expect(onClose).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: '선택한 문제 추가' }),
    ).toBeEnabled()
  },
)

it('refreshes catalog lists after a deleted UUID without invalidating a successful practice cache', async () => {
  server.use(
    http.post(`${practicePath}/practice-1/problems`, () =>
      HttpResponse.json(
        { code: 'PROBLEM_NOT_FOUND', message: '문제를 찾을 수 없습니다.' },
        { status: 404 },
      ),
    ),
  )
  const { queryClient } = renderModal(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      isOpen
      onClose={onClose}
    />,
  )
  await selectProblem()
  const catalogKey = problemListQueryOptions({
    page: 0,
    size: 20,
    keyword: 'old',
  }).queryKey
  const detailKey = ['groups', 'group-1', 'practices', 'practice-1']
  queryClient.setQueryData(catalogKey, {
    problems: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  })
  queryClient.setQueryData(detailKey, {})
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  )

  expect(
    await screen.findByText(
      '선택한 문제를 찾을 수 없습니다. 다른 문제를 선택해 주세요.',
    ),
  ).toBeVisible()
  expect(queryClient.getQueryState(catalogKey)?.isInvalidated).toBe(true)
  expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(false)
})

it('discards the selection when a modal is closed and reopened', async () => {
  const { rerender } = renderModal(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      isOpen
      onClose={onClose}
    />,
  )
  await selectProblem()
  // wrapper를 유지한 채 isOpen 변경을 검증합니다.
  rerender(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      isOpen={false}
      onClose={onClose}
    />,
  )
  rerender(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      isOpen
      onClose={onClose}
    />,
  )
  expect(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  ).toBeDisabled()
})

it('keeps the creation picker outside the form and preserves its draft on Escape', async () => {
  renderModal(
    <CreatePracticeModal groupId="group-1" isOpen onClose={onClose} />,
  )
  await fillDates()
  await selectProblem()
  await userEvent.click(screen.getByRole('button', { name: '문제 변경' }))
  const search = screen.getByRole<HTMLInputElement>('textbox', {
    name: '문제 검색',
  })
  expect(search.form).toBeNull()
  await userEvent.keyboard('{Escape}')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '문제 변경' })).toHaveFocus(),
  )
  expect(screen.getByText('BOJ 1000', { exact: true })).toBeVisible()
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: '연습 이름' })).toHaveValue(
    '1주차 연습',
  )
  const period = [1, 3]
    .map((day) =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(new Date(2030, 0, day)),
    )
    .join(' – ')
  expect(screen.getByRole('button', { name: /^연습 기간:/ })).toHaveTextContent(
    period,
  )
})

it('marks existing practice problems and only submits newly selected UUIDs', async () => {
  let body: unknown
  server.use(
    http.post(`${practicePath}/practice-1/problems`, async ({ request }) => {
      body = await request.json()
      return new HttpResponse(null, { status: 200 })
    }),
  )
  renderModal(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      existingProblemIds={[String(mockProblems[0]?.problemId)]}
      isOpen
      onClose={onClose}
    />,
  )
  const existing = await screen.findByRole('button', { name: /A\+B/ })
  expect(existing).toBeDisabled()
  expect(screen.getByText('이미 추가됨')).toBeVisible()
  await userEvent.click(existing)
  expect(screen.getByText('0개 선택됨')).toBeVisible()
  await selectProblem('Hello World')
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제만 보기' }),
  )
  expect(screen.queryByText('A+B')).not.toBeInTheDocument()
  expect(screen.getByText('1개 선택됨')).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  )
  await waitFor(() => {
    expect(onClose).toHaveBeenCalledOnce()
  })
  expect(body).toEqual({ problemIds: [mockProblems[1]?.problemId] })
})

it('removes a selected problem when it becomes part of the practice while the dialog is open', async () => {
  let body: unknown
  server.use(
    http.post(`${practicePath}/practice-1/problems`, async ({ request }) => {
      body = await request.json()
      return new HttpResponse(null, { status: 200 })
    }),
  )
  const { rerender } = renderModal(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      isOpen
      onClose={onClose}
    />,
  )
  await selectProblem()
  await selectProblem('Hello World')
  rerender(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      existingProblemIds={[String(mockProblems[0]?.problemId)]}
      isOpen
      onClose={onClose}
    />,
  )
  await waitFor(() => expect(screen.getByText('1개 선택됨')).toBeVisible())
  expect(screen.getByRole('button', { name: /A\+B/ })).toBeDisabled()
  rerender(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      existingProblemIds={[]}
      isOpen
      onClose={onClose}
    />,
  )
  expect(screen.getByText('1개 선택됨')).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  )
  await waitFor(() => {
    expect(onClose).toHaveBeenCalledOnce()
  })
  expect(body).toEqual({ problemIds: [mockProblems[1]?.problemId] })
})

it('keeps multiple selections across searches and allows deselection in the selected-only view', async () => {
  renderModal(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      isOpen
      onClose={onClose}
    />,
  )
  await selectProblem()
  const search = screen.getByRole('textbox', { name: '문제 검색' })
  await userEvent.type(search, '1204')
  await waitFor(() => expect(screen.queryByText('A+B')).not.toBeInTheDocument())
  await selectProblem('최빈수 구하기')
  expect(screen.getByText('2개 선택됨')).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제만 보기' }),
  )
  expect(screen.getByText('A+B')).toBeVisible()
  expect(screen.getByText('최빈수 구하기')).toBeVisible()
  expect(screen.queryByText('Hello World')).not.toBeInTheDocument()
  await userEvent.click(screen.getByText('A+B'))
  expect(screen.getByText('1개 선택됨')).toBeVisible()
  await userEvent.click(screen.getByText('최빈수 구하기'))
  expect(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  ).toBeDisabled()
})

it('keeps selections across catalog pages and submits both UUIDs together', async () => {
  const problems = Array.from({ length: 11 }, (_, index) => ({
    problemId: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    provider: 'BOJ',
    externalProblemId: String(index + 1),
    name: `페이지 문제 ${String(index + 1)}`,
    url: `https://www.acmicpc.net/problem/${String(index + 1)}`,
    difficulty: null,
  }))
  let body: unknown
  server.use(
    http.get(`${apiBase}/problems`, ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? 0)
      return HttpResponse.json({
        problems: problems.slice(page * 10, page * 10 + 10),
        page,
        size: 10,
        totalElements: 11,
        totalPages: 2,
      })
    }),
    http.post(`${practicePath}/practice-1/problems`, async ({ request }) => {
      body = await request.json()
      return new HttpResponse(null, { status: 200 })
    }),
  )
  renderModal(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      isOpen
      onClose={onClose}
    />,
  )
  await selectProblem('페이지 문제 1')
  await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
  await selectProblem('페이지 문제 11')
  expect(screen.getByText('2개 선택됨')).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제만 보기' }),
  )
  expect(screen.getByText('페이지 문제 1')).toBeVisible()
  expect(screen.getByText('페이지 문제 11')).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  )
  await waitFor(() => {
    expect(onClose).toHaveBeenCalledOnce()
  })
  expect(body).toEqual({
    problemIds: [problems[0]?.problemId, problems[10]?.problemId],
  })
})

it('locks selection and closing while a bulk addition is pending', async () => {
  let release: (() => void) | undefined
  server.use(
    http.post(`${practicePath}/practice-1/problems`, async () => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return new HttpResponse(null, { status: 200 })
    }),
  )
  renderModal(
    <AddPracticeProblemModal
      groupId="group-1"
      practiceId="practice-1"
      isOpen
      onClose={onClose}
    />,
  )
  await selectProblem()
  await selectProblem('Hello World')
  await userEvent.click(
    screen.getByRole('button', { name: '선택한 문제 추가' }),
  )
  try {
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '문제 검색' })).toBeDisabled(),
    )
    expect(
      screen.getByRole('button', { name: '선택한 문제만 보기' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('2개 선택됨')).toBeVisible()
  } finally {
    release?.()
  }
  await waitFor(() => {
    expect(onClose).toHaveBeenCalledOnce()
  })
})

it.each(['create', 'add'] as const)(
  '%s: restores the original body styles when its dialogs unmount',
  async (kind) => {
    const originalStyle = document.body.getAttribute('style')
    document.body.style.cssText =
      'position: relative; overflow: auto; top: 7px; left: 9px; right: 11px;'
    try {
      const { unmount } = renderModal(
        <StrictMode>
          {kind === 'create' ? (
            <CreatePracticeModal groupId="group-1" isOpen onClose={onClose} />
          ) : (
            <AddPracticeProblemModal
              groupId="group-1"
              practiceId="practice-1"
              isOpen
              onClose={onClose}
            />
          )}
        </StrictMode>,
      )
      if (kind === 'create')
        await userEvent.click(screen.getByRole('button', { name: '문제 선택' }))
      expect(document.body.style.position).toBe('fixed')
      unmount()
      expect(document.body.style).toMatchObject({
        position: 'relative',
        overflow: 'auto',
        top: '7px',
        left: '9px',
        right: '11px',
      })
    } finally {
      cleanup()
      if (originalStyle === null) document.body.removeAttribute('style')
      else document.body.setAttribute('style', originalStyle)
    }
  },
)
