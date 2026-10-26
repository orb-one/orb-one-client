import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { StrictMode, type ReactNode } from 'react'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AddPracticeProblemModal } from '@/components/practice/AddPracticeProblemModal'
import { CreatePracticeModal } from '@/components/practice/CreatePracticeModal'
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

afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.clearAllMocks()
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
  await userEvent.click(
    screen.getByRole('button', { name: /문제 선택|문제 변경/ }),
  )
  await userEvent.click(await screen.findByText(name))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '문제 변경' })).toBeVisible(),
  )
}

async function fillDates() {
  await userEvent.type(
    screen.getByRole('textbox', { name: '연습 이름' }),
    '1주차 연습',
  )
  await userEvent.type(
    screen.getByRole('textbox', { name: '시작 일시' }),
    '20300101',
  )
  await userEvent.type(
    screen.getByRole('textbox', { name: '종료 일시' }),
    '20300103',
  )
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

it('adds a catalog UUID and invalidates practice detail and list', async () => {
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

  expect(screen.getByRole('button', { name: '추가하기' })).toBeDisabled()
  await selectProblem()
  await userEvent.click(screen.getByRole('button', { name: '추가하기' }))

  await waitFor(() => {
    expect(onClose).toHaveBeenCalledOnce()
  })
  expect(body).toEqual({ problemIds: [mockProblems[0]?.problemId] })
  expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(true)
  expect(queryClient.getQueryState(detailKey)?.isInvalidated).toBe(true)
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
      '선택한 문제를 찾을 수 없습니다. 문제를 다시 선택해 주세요.',
    ),
  ).toBeVisible()
  expect(screen.getByRole('textbox', { name: '연습 이름' })).toHaveValue(
    '1주차 연습',
  )
  expect(screen.getByText('BOJ 1000', { exact: true })).toBeVisible()
  expect(onClose).not.toHaveBeenCalled()

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
  [409, 'PRACTICE_ALREADY_ENDED', '종료된 연습은 수정할 수 없습니다.'],
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
    await userEvent.click(screen.getByRole('button', { name: '추가하기' }))

    expect(await screen.findByText(message)).toBeVisible()
    expect(screen.getByText('BOJ 1000', { exact: true })).toBeVisible()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '추가하기' })).toBeEnabled()
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
  await userEvent.click(screen.getByRole('button', { name: '추가하기' }))

  expect(
    await screen.findByText(
      '선택한 문제를 찾을 수 없습니다. 문제를 다시 선택해 주세요.',
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
  expect(screen.getByRole('button', { name: '추가하기' })).toBeDisabled()
})

it.each(['create', 'add'] as const)(
  '%s: keeps the picker outside the form and preserves the draft on Escape',
  async (kind) => {
    renderModal(
      kind === 'create' ? (
        <CreatePracticeModal groupId="group-1" isOpen onClose={onClose} />
      ) : (
        <AddPracticeProblemModal
          groupId="group-1"
          practiceId="practice-1"
          isOpen
          onClose={onClose}
        />
      ),
    )
    if (kind === 'create') await fillDates()
    await selectProblem()
    await userEvent.click(screen.getByRole('button', { name: '문제 변경' }))
    const search = screen.getByRole<HTMLInputElement>('textbox', {
      name: '문제 검색',
    })
    expect(search.form).toBeNull()
    await userEvent.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '문제 변경' })).toHaveFocus()
    })
    expect(screen.getByText('BOJ 1000', { exact: true })).toBeVisible()
    expect(onClose).not.toHaveBeenCalled()
    if (kind === 'create') {
      expect(screen.getByRole('textbox', { name: '연습 이름' })).toHaveValue(
        '1주차 연습',
      )
      expect(screen.getByRole('textbox', { name: '시작 일시' })).toHaveValue(
        '2030-01-01',
      )
      expect(screen.getByRole('textbox', { name: '종료 일시' })).toHaveValue(
        '2030-01-03',
      )
    }
  },
)

it.each(['create', 'add'] as const)(
  '%s: restores the original body styles when both dialogs unmount together',
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
