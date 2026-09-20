import { LayerProvider } from '@astryxdesign/core/Layer'
import { Theme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { AuthSessionExpiredError } from '@/lib/api/client'
import { getProblem, getProblems } from '@/lib/api/problems'
import { createSolution } from '@/lib/api/solutions'
import { useAppStore } from '@/stores/use-app-store'

const navigate = vi.hoisted(() => vi.fn())
const routeSearch = vi.hoisted<{ current: { problemId?: string } }>(() => ({
  current: {},
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    <TOptions extends object>(options: TOptions) => ({
      ...options,
      useNavigate: () => navigate,
      useSearch: () => routeSearch.current,
    }),
}))

vi.mock('@/lib/api/solutions', () => ({
  createSolution: vi.fn(),
}))

vi.mock('@/lib/api/problems', () => ({
  getProblem: vi.fn(),
  getProblems: vi.fn(),
}))

import {
  normalizeSolutionCreateSearch,
  SolutionCreatePage,
} from '@/routes/solutions_.new'

beforeEach(() => {
  vi.mocked(getProblems).mockResolvedValue(problemPage)
})

afterEach(() => {
  cleanup()
  routeSearch.current = {}
  useAppStore.getState().setLocale('ko')
  vi.resetAllMocks()
})

it('connects required-field feedback to the problem picker', async () => {
  renderRoute(<SolutionCreatePage />)

  await userEvent.click(screen.getByRole('button', { name: '풀이 저장' }))

  const problemPicker = screen.getByRole('button', { name: '문제 선택' })

  expect(await screen.findByText('문제를 선택해 주세요.')).toHaveAttribute(
    'role',
    'alert',
  )
  expect(problemPicker).toHaveAttribute('aria-invalid', 'true')
  expect(problemPicker).toHaveAccessibleDescription(
    '제공처와 문제 번호를 확인하고 풀이를 연결할 문제를 선택해 주세요. 문제를 선택해 주세요.',
  )
  await waitFor(() => expect(problemPicker).toHaveFocus())
  expect(createSolution).not.toHaveBeenCalled()
})

it('normalizes the problem ID search parameter', () => {
  expect(normalizeSolutionCreateSearch({ problemId: ' problem-1 ' })).toEqual({
    problemId: 'problem-1',
  })
  expect(normalizeSolutionCreateSearch({ problemId: '' })).toEqual({})
  expect(normalizeSolutionCreateSearch({ problemId: ['problem-1'] })).toEqual(
    {},
  )
})

it('connects required-field feedback and focus to the code editor', async () => {
  renderRoute(<SolutionCreatePage />)

  await selectProblem('문제 1')
  await userEvent.click(
    screen.getByRole('combobox', { name: /프로그래밍 언어/ }),
  )
  await userEvent.click(screen.getByRole('option', { name: 'Java' }))
  await userEvent.click(screen.getByRole('button', { name: '풀이 저장' }))

  const codeEditor = await screen.findByRole('textbox', { name: /소스 코드/ })

  expect(await screen.findByText('소스 코드를 입력해 주세요.')).toHaveAttribute(
    'role',
    'alert',
  )
  expect(codeEditor).toHaveAttribute('aria-invalid', 'true')
  expect(codeEditor).toHaveAccessibleDescription(
    '제출할 소스 코드를 그대로 입력해 주세요. 소스 코드를 입력해 주세요.',
  )
  await waitFor(() => expect(codeEditor).toHaveFocus())
  expect(createSolution).not.toHaveBeenCalled()
})

it('submits the documented fields and navigates to the created solution', async () => {
  vi.mocked(createSolution).mockResolvedValue({ id: 'solution-1' })
  renderRoute(<SolutionCreatePage />)

  await fillCreateForm()
  await userEvent.type(
    screen.getByRole('textbox', { name: /풀이 설명/ }),
    '새 풀이 설명',
  )
  await userEvent.click(screen.getByRole('checkbox', { name: /풀이 완료/ }))
  await userEvent.type(
    screen.getByRole('spinbutton', { name: /메모리 사용량/ }),
    '12345',
  )
  await userEvent.type(
    screen.getByRole('spinbutton', { name: /실행 시간/ }),
    '67',
  )

  expect(
    screen.queryByRole('checkbox', { name: /임시 저장/ }),
  ).not.toBeInTheDocument()

  await waitFor(() => {
    expect(
      document.querySelector('.solution-code-syntax-function'),
    ).toBeInTheDocument()
  })
  expect(document.querySelector('.cm-content')?.textContent).toBe(
    'System.out.println(1);',
  )

  await userEvent.click(screen.getByRole('button', { name: '풀이 저장' }))

  await waitFor(() => {
    expect(createSolution).toHaveBeenCalledWith({
      problemId: 'problem-1',
      language: 'Java',
      code: 'System.out.println(1);',
      description: '새 풀이 설명',
      isSolved: true,
      isDraft: false,
      memoryUsage: 12_345,
      timeElapsed: 67,
    })
  })
  expect(navigate).toHaveBeenCalledWith({
    to: '/solutions/$solutionId',
    params: { solutionId: 'solution-1' },
  })
})

it('prefills a problem from the route search parameter', async () => {
  routeSearch.current = { problemId: 'problem-1' }
  vi.mocked(getProblem).mockResolvedValue(problemOne)

  renderRoute(<SolutionCreatePage />)

  expect(await screen.findByText('문제 1')).toBeVisible()
  expect(screen.getByText(/BOJ 1000/)).toBeVisible()
  expect(screen.getByRole('button', { name: '문제 변경' })).toBeVisible()
  expect(getProblem).toHaveBeenCalledWith('problem-1')
})

it('searches for a problem number and selects a result', async () => {
  vi.mocked(getProblems).mockImplementation(({ keyword }) =>
    Promise.resolve(
      keyword
        ? {
            problems: [problemTwo],
            page: 0,
            size: 10,
            totalElements: 1,
            totalPages: 1,
          }
        : problemPage,
    ),
  )
  renderRoute(<SolutionCreatePage />)

  await userEvent.click(screen.getByRole('button', { name: '문제 선택' }))
  await userEvent.type(
    screen.getByRole('textbox', { name: '문제 검색' }),
    '1204',
  )

  await waitFor(() => {
    expect(getProblems).toHaveBeenLastCalledWith({
      keyword: '1204',
      page: 0,
      size: 10,
    })
  })
  await userEvent.click(await screen.findByRole('button', { name: /문제 2/ }))

  expect(document.querySelector('input[name="problemId"]')).toHaveValue(
    'problem-2',
  )
  expect(screen.getByRole('button', { name: '문제 변경' })).toBeVisible()
})

it('shows a dedicated empty state when a problem search has no matches', async () => {
  vi.mocked(getProblems).mockImplementation(({ keyword }) =>
    Promise.resolve(
      keyword
        ? {
            problems: [],
            page: 0,
            size: 10,
            totalElements: 0,
            totalPages: 0,
          }
        : problemPage,
    ),
  )
  renderRoute(<SolutionCreatePage />)

  await userEvent.click(screen.getByRole('button', { name: '문제 선택' }))
  await userEvent.type(
    screen.getByRole('textbox', { name: '문제 검색' }),
    '없는 문제',
  )

  expect(await screen.findByText('검색 결과가 없습니다')).toBeVisible()
  expect(
    screen.getByText('다른 문제명 또는 문제 번호로 검색해 주세요.'),
  ).toBeVisible()
  expect(screen.queryByText('선택할 문제가 없습니다')).not.toBeInTheDocument()
})

it('shows localized optional labels', () => {
  renderRoute(<SolutionCreatePage />)

  expect(screen.queryByText('Optional')).not.toBeInTheDocument()
  expect(screen.getByLabelText('풀이 설명 (선택)')).toBeInTheDocument()
  expect(screen.getByLabelText('메모리 사용량 (선택)')).toBeInTheDocument()
  expect(screen.getByLabelText('실행 시간 (선택)')).toBeInTheDocument()
})

it.each([
  [
    '메모리 사용량',
    '-1',
    '메모리 사용량은 0부터 2,147,483,647 사이의 정수로 입력해 주세요.',
  ],
  [
    '실행 시간',
    '2147483648',
    '실행 시간은 0부터 2,147,483,647 사이의 정수로 입력해 주세요.',
  ],
] as const)(
  'rejects an invalid %s instead of silently submitting it',
  async (label, value, errorMessage) => {
    renderRoute(<SolutionCreatePage />)
    await fillCreateForm()

    await userEvent.type(
      screen.getByRole('spinbutton', { name: new RegExp(label) }),
      value,
    )
    await userEvent.click(screen.getByRole('button', { name: '풀이 저장' }))

    expect(await screen.findByText(errorMessage)).toHaveAttribute(
      'role',
      'alert',
    )
    expect(createSolution).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(
        screen.getByRole('spinbutton', { name: new RegExp(label) }),
      ).toHaveFocus(),
    )
    expect(screen.getByText(errorMessage)).toBeVisible()
  },
)

it('indents code with spaces when Tab is pressed in the editor', async () => {
  renderRoute(<SolutionCreatePage />)

  const codeEditor = await screen.findByRole('textbox', { name: /소스 코드/ })

  await userEvent.click(codeEditor)
  await userEvent.keyboard('{Tab}')

  expect(
    document.querySelector<HTMLInputElement>('input[name="code"]'),
  ).toHaveValue('  ')
  expect(codeEditor).toHaveFocus()
})

it('prevents another submission while a solution is being saved', async () => {
  vi.mocked(createSolution).mockReturnValue(new Promise(() => undefined))
  renderRoute(<SolutionCreatePage />)

  await fillCreateForm()
  const submitButton = screen.getByRole('button', { name: '풀이 저장' })

  await userEvent.dblClick(submitButton)

  expect(createSolution).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: '저장 중' })).toBeDisabled()
})

it('shows a login action when the authentication session expires', async () => {
  vi.mocked(createSolution).mockRejectedValue(new AuthSessionExpiredError())
  renderRoute(<SolutionCreatePage />)

  await fillCreateForm()
  await userEvent.click(screen.getByRole('button', { name: '풀이 저장' }))

  expect(
    await screen.findByText('풀이를 저장하려면 로그인해 주세요.'),
  ).toBeVisible()
  expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
    'href',
    '/login',
  )
})

it('shows and clears generic creation errors', async () => {
  vi.mocked(createSolution).mockRejectedValue(new Error('Unavailable'))
  renderRoute(<SolutionCreatePage />)

  await fillCreateForm()
  await userEvent.click(screen.getByRole('button', { name: '풀이 저장' }))

  expect(
    await screen.findByText('풀이를 저장하지 못했습니다. 다시 시도해 주세요.'),
  ).toBeVisible()

  await userEvent.click(screen.getByRole('button', { name: '문제 변경' }))
  await userEvent.click(await screen.findByRole('button', { name: /문제 2/ }))

  expect(
    screen.queryByText('풀이를 저장하지 못했습니다. 다시 시도해 주세요.'),
  ).not.toBeInTheDocument()
})

function renderRoute(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
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

async function fillCreateForm() {
  await selectProblem('문제 1')
  await userEvent.click(
    screen.getByRole('combobox', { name: /프로그래밍 언어/ }),
  )
  await userEvent.click(screen.getByRole('option', { name: 'Java' }))
  await userEvent.click(
    await screen.findByRole('textbox', { name: /소스 코드/ }),
  )
  await userEvent.paste('System.out.println(1);')
}

async function selectProblem(name: string) {
  await userEvent.click(screen.getByRole('button', { name: '문제 선택' }))
  await userEvent.click(
    await screen.findByRole('button', { name: new RegExp(name) }),
  )
}

const problemOne = {
  id: 'problem-1',
  provider: 'BOJ' as const,
  externalId: '1000',
  name: '문제 1',
  url: 'https://example.com/problems/1',
  difficulty: 'BRONZE_5',
}

const problemTwo = {
  id: 'problem-2',
  provider: 'SWEA' as const,
  externalId: '1204',
  name: '문제 2',
  url: 'https://example.com/problems/2',
  difficulty: null,
}

const problemPage = {
  problems: [problemOne, problemTwo],
  page: 0,
  size: 10,
  totalElements: 2,
  totalPages: 1,
}
