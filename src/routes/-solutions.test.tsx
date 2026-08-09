import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { getCurrentUser } from '@/lib/api/auth'
import { ApiError, AuthSessionExpiredError } from '@/lib/api/client'
import { getProblem } from '@/lib/api/problems'
import { getSolution, getSolutions } from '@/lib/api/solutions'
import type {
  SolutionDetail,
  SolutionSummary,
} from '@/lib/solutions/solution-model'
import { useAppStore } from '@/stores/use-app-store'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) => ({
      ...options,
      useParams: () => ({ solutionId: 'solution-1' }),
    }),
}))

vi.mock('@/lib/api/solutions', () => ({
  getSolution: vi.fn(),
  getSolutions: vi.fn(),
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
})

it('does not show the edit action to a different user', async () => {
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
})

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

  return render(
    <Theme theme={neutralTheme} mode="light">
      <LayerProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </LayerProvider>
    </Theme>,
  )
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
