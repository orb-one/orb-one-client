import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import type { ToastOptions } from '@astryxdesign/core/Toast'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { getCurrentUser } from '@/lib/api/auth'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import { getProblem } from '@/lib/api/problems'
import {
  deleteSolution,
  getSolution,
  getSolutions,
  restoreSolution,
} from '@/lib/api/solutions'
import type {
  SolutionDetail,
  SolutionSummary,
} from '@/lib/solutions/solution-model'
import { solutionQueryKeys } from '@/lib/solutions/solution-queries'
import { useAppStore } from '@/stores/use-app-store'

const { dismissToast, navigate, showToast } = vi.hoisted(() => ({
  dismissToast: vi.fn(),
  navigate: vi.fn(() => Promise.resolve()),
  showToast: vi.fn<(options: ToastOptions) => () => void>(),
}))

vi.mock('@astryxdesign/core/Toast', () => ({
  useToast: () => showToast,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) => ({
      ...options,
      useParams: () => ({ solutionId: 'solution-1' }),
      useNavigate: () => navigate,
    }),
}))

vi.mock('@/lib/api/solutions', () => ({
  deleteSolution: vi.fn(),
  getSolution: vi.fn(),
  getSolutions: vi.fn(),
  restoreSolution: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/api/problems', () => ({
  getProblem: vi.fn(),
}))

import { SolutionDetailPage } from '@/routes/solutions_.$solutionId'
import { normalizeSolutionsSearch, SolutionsPage } from '@/routes/solutions'

beforeEach(() => {
  showToast.mockReturnValue(dismissToast)
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: 'user-1',
    email: 'user@example.com',
    nickname: 'user',
  })
  vi.mocked(getProblem).mockResolvedValue(problemDetail)
})

afterEach(() => {
  cleanup()
  useAppStore.getState().setLocale('ko')
  vi.resetAllMocks()
})

it('renders solution rows that link to their detail pages', async () => {
  vi.mocked(getSolutions).mockResolvedValue(solutionSummaries)

  renderRoute(<SolutionsPage />)

  expect(
    await screen.findByRole('heading', { name: '풀이 목록', level: 1 }),
  ).toBeVisible()
  expect(await screen.findByRole('link', { name: /A\+B/ })).toHaveAttribute(
    'href',
    '/solutions/solution-1',
  )
  expect(screen.getByText('BOJ 1000 · BRONZE_5')).toBeVisible()
  expect(screen.getByRole('img', { name: '풀이 완료' })).toBeVisible()
  expect(screen.getByRole('img', { name: '작성 중' })).toBeVisible()
  expect(screen.getByText(/solution-author/)).toBeVisible()
  expect(screen.getByText(/user-2/)).toBeVisible()
  expect(screen.getByRole('link', { name: '새 풀이 작성' })).toHaveAttribute(
    'href',
    '/solutions/new',
  )
})

it('filters the solution list by language', async () => {
  vi.mocked(getSolutions).mockResolvedValue(solutionSummaries)

  renderRoute(<SolutionsPage />)

  await screen.findByRole('link', { name: /A\+B/ })
  await userEvent.click(screen.getByLabelText('언어 필터'))
  await userEvent.click(screen.getByRole('option', { name: 'Python' }))

  expect(screen.queryByRole('link', { name: /A\+B/ })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: /problem-2/ })).toBeVisible()

  await userEvent.click(screen.getByRole('button', { name: '필터 초기화' }))

  expect(screen.getByRole('link', { name: /A\+B/ })).toBeVisible()
})

it('shows an empty state when no solutions have been saved', async () => {
  vi.mocked(getSolutions).mockResolvedValue([])

  renderRoute(<SolutionsPage />)

  expect(
    await screen.findByRole('heading', { name: '저장된 풀이가 없습니다' }),
  ).toBeVisible()
  expect(screen.getByRole('link', { name: '새 풀이 작성' })).toHaveAttribute(
    'href',
    '/solutions/new',
  )
})

it('requests and identifies solutions scoped to a problem', async () => {
  vi.mocked(getSolutions).mockResolvedValue([solvedSolution])

  renderRoute(<SolutionsPage problemId="problem-1" />)

  expect(
    await screen.findByText('이 문제의 풀이만 표시하고 있습니다.'),
  ).toBeVisible()
  expect(getSolutions).toHaveBeenCalledWith({ problemId: 'problem-1' })
  expect(screen.getByRole('link', { name: '전체 풀이 보기' })).toHaveAttribute(
    'href',
    '/solutions',
  )
  await screen.findByRole('link', { name: /A\+B/ })
  expect(screen.getByRole('link', { name: '새 풀이 작성' })).toHaveAttribute(
    'href',
    '/solutions/new?problemId=problem-1',
  )
})

it('shows a problem-specific empty state for an empty scoped list', async () => {
  vi.mocked(getSolutions).mockResolvedValue([])

  renderRoute(<SolutionsPage problemId="problem-1" />)

  expect(
    await screen.findByRole('heading', {
      name: '이 문제에 저장된 풀이가 없습니다',
    }),
  ).toBeVisible()
  expect(
    screen.getByText(
      '전체 풀이 목록으로 돌아가 다른 문제의 풀이를 확인해 주세요.',
    ),
  ).toBeVisible()
  expect(screen.getByRole('link', { name: '전체 풀이 보기' })).toHaveAttribute(
    'href',
    '/solutions',
  )
  expect(screen.getByRole('link', { name: '새 풀이 작성' })).toHaveAttribute(
    'href',
    '/solutions/new?problemId=problem-1',
  )
})

it('normalizes the problem ID search parameter', () => {
  expect(normalizeSolutionsSearch({ problemId: ' problem-1 ' })).toEqual({
    problemId: 'problem-1',
  })
  expect(normalizeSolutionsSearch({ problemId: '' })).toEqual({})
  expect(normalizeSolutionsSearch({ problemId: ['problem-1'] })).toEqual({})
})

it('announces the solution list loading state', () => {
  vi.mocked(getSolutions).mockReturnValue(new Promise(() => undefined))

  renderRoute(<SolutionsPage />)

  expect(screen.getByText('풀이 목록을 불러오는 중')).toBeInTheDocument()
})

it('shows a list error and retries the request', async () => {
  vi.mocked(getSolutions)
    .mockRejectedValueOnce(new Error('Unavailable'))
    .mockResolvedValueOnce(solutionSummaries)

  renderRoute(<SolutionsPage />)

  expect(
    await screen.findByText('풀이 목록을 불러오지 못했습니다.'),
  ).toBeVisible()
  expect(screen.getByRole('link', { name: '새 풀이 작성' })).toHaveAttribute(
    'href',
    '/solutions/new',
  )

  await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))

  expect(await screen.findByRole('link', { name: /A\+B/ })).toBeVisible()
  expect(getSolutions).toHaveBeenCalledTimes(2)
})

it('prompts signed-out users to log in instead of retrying the solution list', async () => {
  vi.mocked(getSolutions).mockRejectedValue(new AuthSessionExpiredError())

  renderRoute(<SolutionsPage />)

  expect(
    await screen.findByText('저장된 풀이를 확인하려면 로그인해 주세요.'),
  ).toBeVisible()
  expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
    'href',
    '/login',
  )
  expect(
    screen.queryByRole('button', { name: '다시 시도' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: '새 풀이 작성' }),
  ).not.toBeInTheDocument()
})

it('renders solution metadata, code, and Markdown notes', async () => {
  vi.mocked(getSolution).mockResolvedValue(solutionDetail)

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  expect(
    await screen.findByRole('heading', { name: 'A+B', level: 1 }),
  ).toBeVisible()
  expect(screen.getByText('BOJ 1000')).toBeVisible()
  expect(screen.getByText('BRONZE_5')).toBeVisible()
  expect(screen.getByRole('link', { name: /문제 원문 보기/ })).toHaveAttribute(
    'href',
    'https://www.acmicpc.net/problem/1000',
  )
  expect(await screen.findByTestId('solution-code')).toHaveTextContent(
    'class Main {}',
  )
  expect(
    await screen.findByRole('textbox', { name: '소스 코드' }),
  ).toHaveAttribute('aria-readonly', 'true')
  expect(
    await screen.findByRole('heading', { name: '접근 방법', level: 3 }),
  ).toBeVisible()
  expect(
    await screen.findAllByRole('button', { name: '코드 복사' }),
  ).toHaveLength(1)
  expect(screen.getByRole('listitem')).toHaveTextContent('두 수를 더한다.')
  expect(screen.getByText('O(1)')).toHaveStyle({ fontFamily: 'monospace' })
  expect(screen.getByText('14,128 KB')).toBeVisible()
  expect(screen.getByText('104 ms')).toBeVisible()
  expect(screen.getAllByText('풀이 완료')).toHaveLength(1)
  expect(screen.getByText('user (내 풀이)')).toBeVisible()
  expect(screen.queryByText('user-1')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: '풀이 수정' })).toHaveAttribute(
    'href',
    '/solutions/solution-1/edit',
  )
  expect(screen.getByRole('button', { name: '풀이 삭제' })).toBeVisible()
})

it('does not show edit or delete actions to a different user', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: 'different-user',
    email: 'different@example.com',
    nickname: 'different',
  })
  vi.mocked(getSolution).mockResolvedValue(solutionDetail)

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  expect(
    await screen.findByRole('heading', { name: 'A+B', level: 1 }),
  ).toBeVisible()
  expect(screen.getByText('solution-author')).toBeVisible()
  expect(screen.queryByText('user-1')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: '풀이 수정' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: '풀이 삭제' }),
  ).not.toBeInTheDocument()
})

it('confirms deletion, moves to the list, and restores from the toast', async () => {
  vi.mocked(getSolution).mockResolvedValue(solutionDetail)
  vi.mocked(deleteSolution).mockResolvedValue()
  vi.mocked(restoreSolution).mockResolvedValue()

  const { queryClient } = renderRoute(
    <SolutionDetailPage solutionId="solution-1" />,
  )

  await screen.findByRole('heading', { name: 'A+B', level: 1 })
  await userEvent.click(screen.getByRole('button', { name: '풀이 삭제' }))

  const dialog = screen.getByRole('alertdialog', {
    name: '풀이를 삭제할까요?',
  })

  expect(
    within(dialog).getByText(
      '풀이가 즉시 목록에서 숨겨집니다. 삭제 후 표시되는 실행 취소로 복구할 수 있습니다.',
    ),
  ).toBeVisible()

  await userEvent.click(
    within(dialog).getByRole('button', { name: '풀이 삭제' }),
  )

  await waitFor(() => {
    expect(deleteSolution).toHaveBeenCalledWith('solution-1')
    expect(navigate).toHaveBeenCalledWith({ to: '/solutions' })
    expect(
      queryClient.getQueryState(solutionQueryKeys.detail('solution-1')),
    ).toBeUndefined()
  })

  const deleteToast = showToast.mock.calls.find(
    ([options]) => options.body === '풀이를 삭제했습니다.',
  )?.[0]

  expect(deleteToast).toMatchObject({
    body: '풀이를 삭제했습니다.',
    uniqueID: 'solution.delete.solution-1',
  })

  renderRoute(deleteToast?.endContent)

  await userEvent.click(screen.getByRole('button', { name: '실행 취소' }))

  await waitFor(() => {
    expect(restoreSolution).toHaveBeenCalledWith('solution-1')
  })
  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({
      body: '풀이를 복구했습니다.',
      uniqueID: 'solution.restore.solution-1',
    }),
  )
  expect(dismissToast).toHaveBeenCalledOnce()
})

it('keeps restore available for retry after a transient failure', async () => {
  vi.mocked(getSolution).mockResolvedValue(solutionDetail)
  vi.mocked(deleteSolution).mockResolvedValue()
  vi.mocked(restoreSolution)
    .mockRejectedValueOnce(new Error('Temporary failure'))
    .mockResolvedValueOnce()

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  await screen.findByRole('heading', { name: 'A+B', level: 1 })
  await userEvent.click(screen.getByRole('button', { name: '풀이 삭제' }))
  await userEvent.click(
    within(
      screen.getByRole('alertdialog', { name: '풀이를 삭제할까요?' }),
    ).getByRole('button', { name: '풀이 삭제' }),
  )

  const deleteToast = showToast.mock.calls.find(
    ([options]) => options.body === '풀이를 삭제했습니다.',
  )?.[0]

  renderRoute(deleteToast?.endContent)
  await userEvent.click(screen.getByRole('button', { name: '실행 취소' }))

  expect(await screen.findByRole('button', { name: '다시 시도' })).toBeVisible()
  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({
      body: '풀이를 복구하지 못했습니다.',
      type: 'error',
    }),
  )
  expect(dismissToast).not.toHaveBeenCalled()

  await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))

  await waitFor(() => {
    expect(restoreSolution).toHaveBeenCalledTimes(2)
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ body: '풀이를 복구했습니다.' }),
    )
  })
  expect(dismissToast).toHaveBeenCalledOnce()
})

it('prevents duplicate restore requests while one is pending', async () => {
  let resolveRestore: (() => void) | undefined
  const pendingRestore = new Promise<void>((resolve) => {
    resolveRestore = resolve
  })

  vi.mocked(getSolution).mockResolvedValue(solutionDetail)
  vi.mocked(deleteSolution).mockResolvedValue()
  vi.mocked(restoreSolution).mockReturnValue(pendingRestore)

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  await screen.findByRole('heading', { name: 'A+B', level: 1 })
  await userEvent.click(screen.getByRole('button', { name: '풀이 삭제' }))
  await userEvent.click(
    within(
      screen.getByRole('alertdialog', { name: '풀이를 삭제할까요?' }),
    ).getByRole('button', { name: '풀이 삭제' }),
  )

  const deleteToast = showToast.mock.calls.find(
    ([options]) => options.body === '풀이를 삭제했습니다.',
  )?.[0]

  renderRoute(deleteToast?.endContent)
  const undoButton = screen.getByRole('button', { name: '실행 취소' })

  await userEvent.click(undoButton)
  await waitFor(() => {
    expect(restoreSolution).toHaveBeenCalledOnce()
    expect(undoButton).toBeDisabled()
  })

  await userEvent.click(undoButton)
  expect(restoreSolution).toHaveBeenCalledOnce()

  resolveRestore?.()
  await waitFor(() => {
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ body: '풀이를 복구했습니다.' }),
    )
  })
})

it('dismisses undo and reports an expired restore without offering retry', async () => {
  vi.mocked(getSolution).mockResolvedValue(solutionDetail)
  vi.mocked(deleteSolution).mockResolvedValue()
  vi.mocked(restoreSolution).mockRejectedValue(
    createApiError(404, 'Solution not found'),
  )

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  await screen.findByRole('heading', { name: 'A+B', level: 1 })
  await userEvent.click(screen.getByRole('button', { name: '풀이 삭제' }))
  await userEvent.click(
    within(
      screen.getByRole('alertdialog', { name: '풀이를 삭제할까요?' }),
    ).getByRole('button', { name: '풀이 삭제' }),
  )

  const deleteToast = showToast.mock.calls.find(
    ([options]) => options.body === '풀이를 삭제했습니다.',
  )?.[0]

  renderRoute(deleteToast?.endContent)
  await userEvent.click(screen.getByRole('button', { name: '실행 취소' }))

  await waitFor(() => {
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        body: '복구 가능 시간이 지났거나 풀이를 찾을 수 없습니다.',
        type: 'error',
      }),
    )
  })
  expect(dismissToast).toHaveBeenCalledOnce()
  expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull()
})

it('closes the delete dialog without sending a request', async () => {
  vi.mocked(getSolution).mockResolvedValue(solutionDetail)

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  await screen.findByRole('heading', { name: 'A+B', level: 1 })
  await userEvent.click(screen.getByRole('button', { name: '풀이 삭제' }))
  await userEvent.click(screen.getByRole('button', { name: '취소' }))

  expect(deleteSolution).not.toHaveBeenCalled()
  expect(
    screen.queryByRole('alertdialog', { name: '풀이를 삭제할까요?' }),
  ).not.toBeInTheDocument()
})

it('reports a forbidden delete without leaving the detail page', async () => {
  vi.mocked(getSolution).mockResolvedValue(solutionDetail)
  vi.mocked(deleteSolution).mockRejectedValue(
    new ApiError(
      'Solution forbidden',
      403,
      new Response(null, { status: 403 }),
      { message: 'Solution forbidden' },
    ),
  )

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  await screen.findByRole('heading', { name: 'A+B', level: 1 })
  await userEvent.click(screen.getByRole('button', { name: '풀이 삭제' }))
  await userEvent.click(
    within(
      screen.getByRole('alertdialog', { name: '풀이를 삭제할까요?' }),
    ).getByRole('button', { name: '풀이 삭제' }),
  )

  await waitFor(() => {
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        body: '이 풀이를 삭제할 권한이 없습니다.',
        type: 'error',
      }),
    )
  })
  expect(navigate).not.toHaveBeenCalled()
})

it.each([
  [404, '이미 삭제되었거나 찾을 수 없는 풀이입니다.'],
  [500, '풀이를 삭제하지 못했습니다. 다시 시도해 주세요.'],
])(
  'reports a %i delete failure without leaving the detail page',
  async (status, expectedMessage) => {
    vi.mocked(getSolution).mockResolvedValue(solutionDetail)
    vi.mocked(deleteSolution).mockRejectedValue(
      createApiError(status, 'Delete failed'),
    )

    renderRoute(<SolutionDetailPage solutionId="solution-1" />)

    await screen.findByRole('heading', { name: 'A+B', level: 1 })
    await userEvent.click(screen.getByRole('button', { name: '풀이 삭제' }))
    await userEvent.click(
      within(
        screen.getByRole('alertdialog', { name: '풀이를 삭제할까요?' }),
      ).getByRole('button', { name: '풀이 삭제' }),
    )

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ body: expectedMessage, type: 'error' }),
      )
    })
    expect(navigate).not.toHaveBeenCalled()
  },
)

it('falls back to the author UUID when the response has no nickname', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: 'different-user',
    email: 'different@example.com',
    nickname: 'different',
  })
  vi.mocked(getSolution).mockResolvedValue({
    ...solutionDetail,
    authorNickname: null,
  })

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  expect(await screen.findByText('user-1')).toBeVisible()
})

it('falls back to the problem UUID when problem details cannot be loaded', async () => {
  vi.mocked(getProblem).mockRejectedValue(new Error('Unavailable'))
  vi.mocked(getSolution).mockResolvedValue(solutionDetail)

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  expect(
    await screen.findByRole('heading', { name: 'problem-1', level: 1 }),
  ).toBeVisible()
})

it('allows long Markdown code blocks to be collapsed', async () => {
  const markdownCode = Array.from(
    { length: 10 },
    (_, index) => `line ${String(index + 1)}`,
  ).join('\n')

  vi.mocked(getSolution).mockResolvedValue({
    ...solutionDetail,
    description: `\`\`\`java\n${markdownCode}\n\`\`\``,
  })

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  const collapseButton = await screen.findByRole('button', { name: 'java' })

  expect(collapseButton).toHaveAttribute('aria-expanded', 'true')

  await userEvent.click(collapseButton)

  expect(collapseButton).toHaveAttribute('aria-expanded', 'false')
})

it('renders an empty solution description as supporting text', async () => {
  vi.mocked(getSolution).mockResolvedValue({
    ...solutionDetail,
    description: '   ',
  })

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  const emptyDescription =
    await screen.findByText('작성된 풀이 설명이 없습니다.')

  expect(emptyDescription).toHaveClass('astryx-text', 'supporting')
  expect(screen.queryByTestId('solution-description')).not.toBeInTheDocument()
})

it('uses the not-found message for a missing solution', async () => {
  vi.mocked(getSolution).mockRejectedValue(
    new ApiError(
      'Solution not found',
      404,
      new Response(null, { status: 404 }),
      { message: 'Solution not found' },
    ),
  )

  renderRoute(<SolutionDetailPage solutionId="missing" />)

  expect(await screen.findByText('풀이를 찾을 수 없습니다.')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: '다시 시도' }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: '풀이 목록으로 돌아가기' }),
  ).toHaveAttribute('href', '/solutions')
})

it('prompts signed-out users to log in from solution detail', async () => {
  vi.mocked(getSolution).mockRejectedValue(new AuthSessionExpiredError())

  renderRoute(<SolutionDetailPage solutionId="solution-1" />)

  expect(
    await screen.findByText('저장된 풀이를 확인하려면 로그인해 주세요.'),
  ).toBeVisible()
  expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
    'href',
    '/login',
  )
})

function renderRoute(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const renderResult = render(
    <Theme theme={neutralTheme} mode="light">
      <LayerProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </LayerProvider>
    </Theme>,
  )

  return { ...renderResult, queryClient }
}

function createApiError(status: number, message: string) {
  return new ApiError(message, status, new Response(null, { status }), {
    message,
  })
}

const solvedSolution: SolutionSummary = {
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
  createdAt: '2026-07-15T01:00:00.000Z',
}

const solutionSummaries: SolutionSummary[] = [
  solvedSolution,
  {
    id: 'solution-2',
    problemId: 'problem-2',
    userId: 'user-2',
    problemName: null,
    problemProvider: null,
    problemNumber: null,
    problemDifficulty: null,
    isSolved: false,
    isDraft: true,
    language: 'Python',
    createdAt: null,
  },
]

const solutionDetail: SolutionDetail = {
  ...solvedSolution,
  code: 'class Main {}',
  description: '# 접근 방법\n\n- 두 수를 더한다.\n\n복잡도는 `O(1)`이다.',
  memoryUsage: 14_128,
  timeElapsed: 104,
  updatedAt: '2026-07-15T01:05:00.000Z',
}

const problemDetail = {
  id: 'problem-1',
  provider: 'BOJ' as const,
  externalId: '1000',
  name: 'A+B',
  url: 'https://www.acmicpc.net/problem/1000',
  difficulty: 'BRONZE_5',
}
